import type { Todo, SyncOperation, AppSettings } from '#shared/types'
import { db, generateId, now } from '~/utils/db'

type SyncState = 'idle' | 'syncing' | 'offline' | 'error'

/**
 * Composable for offline-first sync operations
 */
export function useOfflineSync() {
  const { getAccessToken, user } = useAuth()

  // Reactive state
  const syncState = ref<SyncState>('idle')
  const lastSyncAt = ref<string | null>(null)
  const pendingCount = ref(0)
  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)

  // Initialize online status listeners
  if (import.meta.client) {
    window.addEventListener('online', () => {
      isOnline.value = true
      // Trigger sync when coming back online
      sync()
    })

    window.addEventListener('offline', () => {
      isOnline.value = false
      syncState.value = 'offline'
    })

    // Sync on visibility change (app focus)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && isOnline.value) {
        sync()
      }
    })
  }

  /**
   * Get pending sync operations count
   */
  async function updatePendingCount(): Promise<void> {
    pendingCount.value = await db.syncQueue.count()
  }

  /**
   * Get last sync timestamp from settings
   */
  async function loadLastSyncAt(): Promise<void> {
    if (!user.value?.id) return
    
    const settings = await db.settings.get(user.value.id)
    lastSyncAt.value = settings?.lastSyncAt ?? null
  }

  /**
   * Save last sync timestamp
   */
  async function saveLastSyncAt(timestamp: string): Promise<void> {
    if (!user.value?.id) return

    const existing = await db.settings.get(user.value.id)
    
    if (existing) {
      await db.settings.update(user.value.id, { lastSyncAt: timestamp })
    } else {
      await db.settings.add({
        userId: user.value.id,
        dailyReminderEnabled: false,
        dailyReminderTime: '09:00',
        lastSyncAt: timestamp,
        theme: 'system',
      })
    }

    lastSyncAt.value = timestamp
  }

  /**
   * Perform sync with server
   */
  async function sync(): Promise<boolean> {
    if (!isOnline.value || syncState.value === 'syncing') {
      return false
    }

    const token = await getAccessToken()
    if (!token || !user.value?.id) {
      syncState.value = 'idle'
      return false
    }

    syncState.value = 'syncing'

    try {
      await updatePendingCount()
      await loadLastSyncAt()

      // Get local changes from sync queue
      const pendingOperations = await db.syncQueue.toArray()
      
      // Prepare changes to send
      const localChanges: Todo[] = []
      
      for (const op of pendingOperations) {
        const todo = await db.todos.get(op.todoId)
        if (todo) {
          localChanges.push(todo)
        }
      }

      // Send sync request
      const response = await $fetch('/api/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: {
          lastSyncAt: lastSyncAt.value,
          changes: localChanges,
        },
      })

      // Process server response
      const { serverChanges, syncTimestamp } = response as {
        serverChanges: Todo[]
        processedChanges: Todo[]
        syncTimestamp: string
      }

      // Merge server changes into local DB
      await db.transaction('rw', db.todos, db.syncQueue, async () => {
        for (const serverTodo of serverChanges) {
          const localTodo = await db.todos.get(serverTodo.id)

          if (!localTodo) {
            // New todo from server
            await db.todos.add(serverTodo)
          } else if (serverTodo.version > localTodo.version) {
            // Server has newer version - accept server's
            await db.todos.update(serverTodo.id, serverTodo)
          }
          // Otherwise keep local version (client wins for same version)
        }

        // Clear processed sync queue items
        for (const op of pendingOperations) {
          await db.syncQueue.delete(op.id)
        }
      })

      // Clean up soft-deleted todos
      await db.todos
        .filter(todo => todo.syncStatus === 'deleted')
        .delete()

      // Save sync timestamp
      await saveLastSyncAt(syncTimestamp)
      await updatePendingCount()

      syncState.value = 'idle'
      return true
    } catch (error) {
      console.error('Sync failed:', error)
      syncState.value = 'error'
      
      // Retry failed operations
      await incrementRetryCount()
      
      return false
    }
  }

  /**
   * Increment retry count for failed operations
   */
  async function incrementRetryCount(): Promise<void> {
    const operations = await db.syncQueue.toArray()
    
    for (const op of operations) {
      if (op.retryCount >= 5) {
        // Max retries reached, remove from queue
        await db.syncQueue.delete(op.id)
      } else {
        await db.syncQueue.update(op.id, {
          retryCount: op.retryCount + 1,
        })
      }
    }
  }

  /**
   * Force full sync (re-download all todos)
   */
  async function fullSync(): Promise<boolean> {
    if (!isOnline.value) return false

    const token = await getAccessToken()
    if (!token || !user.value?.id) return false

    syncState.value = 'syncing'

    try {
      // Fetch all todos from server
      const response = await $fetch('/api/todos', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const { todos, timestamp } = response as {
        todos: Todo[]
        timestamp: string
      }

      // Replace local todos with server data
      await db.transaction('rw', db.todos, async () => {
        // Clear existing todos for this user
        await db.todos
          .where('userId')
          .equals(user.value!.id)
          .delete()

        // Add all todos from server
        await db.todos.bulkAdd(todos)
      })

      // Clear sync queue
      await db.syncQueue.clear()

      await saveLastSyncAt(timestamp)
      await updatePendingCount()

      syncState.value = 'idle'
      return true
    } catch (error) {
      console.error('Full sync failed:', error)
      syncState.value = 'error'
      return false
    }
  }

  /**
   * Queue a sync operation
   */
  async function queueOperation(
    type: SyncOperation['type'],
    todoId: string,
    data?: Partial<Todo>
  ): Promise<void> {
    await db.syncQueue.add({
      id: generateId(),
      type,
      todoId,
      data,
      timestamp: now(),
      retryCount: 0,
    })

    await updatePendingCount()

    // Attempt immediate sync if online
    if (isOnline.value) {
      // Debounce to batch rapid changes
      await new Promise(resolve => setTimeout(resolve, 1000))
      sync()
    }
  }

  /**
   * Initialize sync on mount
   */
  async function initialize(): Promise<void> {
    await loadLastSyncAt()
    await updatePendingCount()
    
    if (isOnline.value) {
      await sync()
    }
  }

  return {
    // State
    syncState,
    lastSyncAt,
    pendingCount,
    isOnline,

    // Actions
    sync,
    fullSync,
    queueOperation,
    initialize,
  }
}
