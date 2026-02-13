import { liveQuery } from 'dexie'
import { from, type Observable as RxObservable } from 'rxjs'
import type { Ref } from 'vue'
import type { Todo, CreateTodoInput, UpdateTodoInput, TodoScope } from '#shared/types'
import { db, generateId, now, today } from '~/utils/db'
import { processRollover } from '~/utils/rollover'

/**
 * Composable for todo CRUD operations with offline-first support
 * Triggers immediate sync after each action
 */
export function useTodos() {
  const { user } = useAuth()
  const { syncImmediate, isOnline } = useOfflineSync()
  const userId = computed(() => user.value?.id ?? '')

  // Reactive state
  const isProcessingRollover = ref(false)

  /**
   * Create a live query observable for todos
   * Returns RxJS Observable for compatibility with @vueuse/rxjs
   */
  function createTodosQuery(
    scope?: TodoScope,
    dueDate?: string
  ): RxObservable<Todo[]> {
    const dexieObservable = liveQuery(async () => {
      if (!userId.value) return []

      let query = db.todos.where('userId').equals(userId.value)

      const todos = await query.toArray()

      // Filter by scope and date if provided
      return todos
        .filter(todo => {
          if (todo.syncStatus === 'deleted') return false
          if (scope && todo.scope !== scope) return false
          if (dueDate && todo.dueDate !== dueDate) return false
          return true
        })
        .sort((a, b) => a.sortOrder - b.sortOrder)
    })
    
    // Convert Dexie Observable to RxJS Observable for @vueuse/rxjs compatibility
    return from(dexieObservable)
  }

  /**
   * Get todos grouped by date for a specific date range (for paginated calendar view)
   * Returns RxJS Observable for compatibility with @vueuse/rxjs
   */
  function createDateRangeTodosQuery(
    startDate: Ref<string>,
    endDate: Ref<string>
  ): RxObservable<Map<string, Todo[]>> {
    const dexieObservable = liveQuery(async () => {
      if (!userId.value) return new Map()

      const todos = await db.todos
        .where('[userId+dueDate]')
        .between(
          [userId.value, startDate.value],
          [userId.value, endDate.value],
          true, // include lower bound
          true  // include upper bound
        )
        .filter(todo =>
          todo.syncStatus !== 'deleted' &&
          todo.scope === 'day'
        )
        .toArray()

      // Group by date
      const grouped = new Map<string, Todo[]>()

      for (const todo of todos) {
        if (!todo.dueDate) continue
        const existing = grouped.get(todo.dueDate) ?? []
        existing.push(todo)
        grouped.set(todo.dueDate, existing)
      }

      // Sort todos within each group
      for (const [date, dateTodos] of grouped) {
        grouped.set(date, dateTodos.sort((a, b) => a.sortOrder - b.sortOrder))
      }

      return grouped
    })

    return from(dexieObservable)
  }

  /**
   * Get todos grouped by date (for calendar view) — loads ALL todos
   * Returns RxJS Observable for compatibility with @vueuse/rxjs
   */
  function createGroupedTodosQuery(): RxObservable<Map<string, Todo[]>> {
    const dexieObservable = liveQuery(async () => {
      if (!userId.value) return new Map()

      const todos = await db.todos
        .where('userId')
        .equals(userId.value)
        .filter(todo => 
          todo.syncStatus !== 'deleted' &&
          todo.scope === 'day' &&
          todo.dueDate !== undefined
        )
        .toArray()

      // Group by date
      const grouped = new Map<string, Todo[]>()
      
      for (const todo of todos) {
        if (!todo.dueDate) continue
        
        const existing = grouped.get(todo.dueDate) ?? []
        existing.push(todo)
        grouped.set(todo.dueDate, existing)
      }

      // Sort todos within each group
      for (const [date, dateTodos] of grouped) {
        grouped.set(date, dateTodos.sort((a, b) => a.sortOrder - b.sortOrder))
      }

      return grouped
    })
    
    // Convert Dexie Observable to RxJS Observable
    return from(dexieObservable)
  }

  /**
   * Get global todos (no date)
   * Returns RxJS Observable for compatibility with @vueuse/rxjs
   */
  function createGlobalTodosQuery(): RxObservable<Todo[]> {
    const dexieObservable = liveQuery(async () => {
      if (!userId.value) return []

      return db.todos
        .where('userId')
        .equals(userId.value)
        .filter(todo => 
          todo.syncStatus !== 'deleted' &&
          todo.scope === 'global'
        )
        .sortBy('sortOrder')
    })
    
    // Convert Dexie Observable to RxJS Observable
    return from(dexieObservable)
  }

  /**
   * Create a new todo
   */
  async function createTodo(input: CreateTodoInput): Promise<Todo> {
    const id = generateId()
    const timestamp = now()

    // Get max sort order for position
    const existingTodos = await db.todos
      .where('userId')
      .equals(userId.value)
      .filter(todo => 
        todo.scope === input.scope &&
        (input.scope === 'global' || todo.dueDate === input.dueDate)
      )
      .toArray()

    const maxSortOrder = existingTodos.reduce(
      (max, todo) => Math.max(max, todo.sortOrder),
      0
    )

    const todo: Todo = {
      id,
      title: input.title,
      completed: false,
      scope: input.scope,
      dueDate: input.scope === 'global' ? undefined : (input.dueDate ?? today()),
      color: input.color ?? 'blue',
      rolloverRule: input.rolloverRule ?? 'next-day',
      userId: userId.value,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'pending',
      version: 1,
      sortOrder: maxSortOrder + 1,
    }

    await db.todos.add(todo)

    // Queue for sync
    await db.syncQueue.add({
      id: generateId(),
      type: 'create',
      todoId: id,
      data: todo,
      timestamp,
      retryCount: 0,
    })

    // Trigger immediate sync
    if (isOnline.value) {
      syncImmediate()
    }

    return todo
  }

  /**
   * Update an existing todo
   */
  async function updateTodo(input: UpdateTodoInput): Promise<Todo | null> {
    const existing = await db.todos.get(input.id)
    if (!existing) return null

    const timestamp = now()
    const updates: Partial<Todo> = {
      ...input,
      updatedAt: timestamp,
      syncStatus: 'pending',
      version: existing.version + 1,
    }

    // Handle completion state changes
    if (input.completed !== undefined && input.completed !== existing.completed) {
      updates.completedAt = input.completed ? timestamp : undefined
    }

    await db.todos.update(input.id, updates)

    // Queue for sync
    await db.syncQueue.add({
      id: generateId(),
      type: 'update',
      todoId: input.id,
      data: updates,
      timestamp,
      retryCount: 0,
    })

    // Trigger immediate sync
    if (isOnline.value) {
      syncImmediate()
    }

    return { ...existing, ...updates } as Todo
  }

  /**
   * Toggle todo completion
   */
  async function toggleTodo(id: string): Promise<Todo | null> {
    const existing = await db.todos.get(id)
    if (!existing) return null

    return updateTodo({
      id,
      completed: !existing.completed,
    })
  }

  /**
   * Delete a todo
   */
  async function deleteTodo(id: string): Promise<boolean> {
    const existing = await db.todos.get(id)
    if (!existing) return false

    const timestamp = now()

    // Soft delete - mark as deleted for sync
    await db.todos.update(id, {
      syncStatus: 'deleted',
      updatedAt: timestamp,
    })

    // Queue for sync
    await db.syncQueue.add({
      id: generateId(),
      type: 'delete',
      todoId: id,
      timestamp,
      retryCount: 0,
    })

    // Trigger immediate sync
    if (isOnline.value) {
      syncImmediate()
    }

    return true
  }

  /**
   * Move todo to a different date
   */
  async function moveTodoToDate(id: string, newDate: string): Promise<Todo | null> {
    return updateTodo({
      id,
      dueDate: newDate,
      scope: 'day',
    })
  }

  /**
   * Move todo to global scope
   */
  async function moveTodoToGlobal(id: string): Promise<Todo | null> {
    return updateTodo({
      id,
      scope: 'global',
      dueDate: undefined,
    })
  }

  /**
   * Change todo color
   */
  async function changeTodoColor(id: string, color: Todo['color']): Promise<Todo | null> {
    return updateTodo({ id, color })
  }

  /**
   * Reorder todos
   */
  async function reorderTodos(ids: string[]): Promise<void> {
    const timestamp = now()

    await db.transaction('rw', db.todos, db.syncQueue, async () => {
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]!
        await db.todos.update(id, {
          sortOrder: i,
          updatedAt: timestamp,
          syncStatus: 'pending',
        })

        await db.syncQueue.add({
          id: generateId(),
          type: 'update',
          todoId: id,
          data: { sortOrder: i },
          timestamp,
          retryCount: 0,
        })
      }
    })

    // Trigger immediate sync
    if (isOnline.value) {
      syncImmediate()
    }
  }

  /**
   * Process rollover for uncompleted past todos
   */
  async function doRollover(): Promise<number> {
    if (isProcessingRollover.value || !userId.value) return 0

    isProcessingRollover.value = true
    try {
      return await processRollover(userId.value)
    } finally {
      isProcessingRollover.value = false
    }
  }

  /**
   * Get a single todo by ID
   */
  async function getTodo(id: string): Promise<Todo | undefined> {
    return db.todos.get(id)
  }

  /**
   * Clear all local todos (for logout)
   */
  async function clearLocalTodos(): Promise<void> {
    await db.todos.clear()
    await db.syncQueue.clear()
  }

  return {
    // Queries
    createTodosQuery,
    createDateRangeTodosQuery,
    createGroupedTodosQuery,
    createGlobalTodosQuery,
    getTodo,

    // Mutations
    createTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    moveTodoToDate,
    moveTodoToGlobal,
    changeTodoColor,
    reorderTodos,

    // Rollover
    doRollover,
    isProcessingRollover,

    // Cleanup
    clearLocalTodos,
  }
}
