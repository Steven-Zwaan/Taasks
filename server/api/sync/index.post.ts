import type { Todo } from '#shared/types'

interface SyncRequest {
  lastSyncAt?: string
  changes: Todo[]
}

/**
 * POST /api/sync - Sync todos between client and server
 * 
 * Implements last-write-wins conflict resolution:
 * - Client sends local changes
 * - Server returns changes since lastSyncAt
 * - Both sides merge with version comparison
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<SyncRequest>(event)

  const { lastSyncAt, changes = [] } = body

  // Process incoming changes from client
  const processedChanges: Todo[] = []
  for (const todo of changes) {
    // Ensure ownership
    if (todo.userId !== user.sub) {
      continue
    }
    
    const saved = bulkUpsertTodos([todo])
    processedChanges.push(...saved)
  }

  // Get server changes since last sync
  const serverChanges = lastSyncAt
    ? getTodosModifiedAfter(user.sub, lastSyncAt)
    : getTodosModifiedAfter(user.sub, '1970-01-01T00:00:00.000Z')

  const timestamp = new Date().toISOString()

  return {
    // Server changes for client to merge
    serverChanges,
    // Processed client changes (with updated versions)
    processedChanges,
    // New sync timestamp
    syncTimestamp: timestamp,
  }
})
