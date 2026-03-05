import type { Todo } from "#shared/types";

interface SyncRequest {
    lastSyncAt?: string;
    changes: Todo[];
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
    const user = await requireAuth(event);
    const body = await readBody<SyncRequest>(event);

    const { lastSyncAt, changes = [] } = body;

    // Separate regular changes from deletes
    const deletions = changes.filter((todo) => todo.syncStatus === "deleted");
    const upserts = changes.filter((todo) => todo.syncStatus !== "deleted");

    // Process upserts with timestamp-based conflict resolution
    const upsertResults = await bulkUpsertTodos(
        upserts.filter((todo) => todo.userId === user.sub),
    );

    // Process deletions
    for (const todo of deletions) {
        if (todo.userId === user.sub) {
            await deleteTodo(todo.id, user.sub, todo.updatedAt);
        }
    }

    // Get server changes since last sync, excluding IDs just processed from this client
    const processedIds = [
        ...upsertResults.updated.map((t) => t.id),
        ...deletions.map((t) => t.id),
    ];

    const serverChanges = await getTodosModifiedAfter(
        user.sub,
        lastSyncAt ?? "1970-01-01T00:00:00.000Z",
        processedIds,
    );

    const timestamp = new Date().toISOString();

    return {
        serverChanges,
        processedChanges: upsertResults.updated,
        conflicts: upsertResults.conflicts,
        syncTimestamp: timestamp,
    };
});
