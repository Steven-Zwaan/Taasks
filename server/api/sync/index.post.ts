import type { Todo } from '#shared/types'

interface SyncRequest {
  lastSyncAt?: string
  changes: Todo[]
}

/**
 * POST /api/sync - Sync todos between client and server
 * 
 * Implements timestamp-based conflict resolution:
 * - Newest updatedAt wins regardless of source
 * - Client sends local changes with original timestamps
 * - Server compares timestamps and returns conflicts
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<SyncRequest>(event)

  const { lastSyncAt, changes = [] } = body

  // Separate regular changes from deletes
  const deletions = changes.filter(todo => todo.syncStatus === 'deleted')
  const upserts = changes.filter(todo => todo.syncStatus !== 'deleted')

  // Process upserts with timestamp-based conflict resolution
  const upsertResults = await bulkUpsertTodos(
    upserts.filter(todo => todo.userId === user.sub)
  )

  // Process deletions
  for (const todo of deletions) {
    if (todo.userId === user.sub) {
      await deleteTodo(todo.id, user.sub, todo.updatedAt)
    }
  }

  // Get server changes since last sync
  // These are todos that were modified on server that client needs
  const serverChanges = lastSyncAt
    ? await getTodosModifiedAfter(user.sub, lastSyncAt)
    : await getTodosModifiedAfter(user.sub, '1970-01-01T00:00:00.000Z')

  const timestamp = new Date().toISOString()

  return {
    // Server changes for client to merge
    serverChanges,
    // Todos that were successfully synced to DB
    processedChanges: upsertResults.updated,
    // Todos where server had newer data - client should update with these
    conflicts: upsertResults.conflicts,
    // New sync timestamp
    syncTimestamp: timestamp,
  }
})
