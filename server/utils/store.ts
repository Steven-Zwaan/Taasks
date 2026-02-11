import { eq, and, gt } from 'drizzle-orm'
import type { Todo } from '#shared/types'
import { db, todos as todosTable } from '../db'

/**
 * Convert database row to Todo type
 */
function toTodo(row: typeof todosTable.$inferSelect): Todo {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed,
    completedAt: row.completedAt ?? undefined,
    scope: row.scope as Todo['scope'],
    dueDate: row.dueDate ?? undefined,
    color: row.color as Todo['color'],
    rolloverRule: row.rolloverRule as Todo['rolloverRule'],
    rolloverFromId: row.rolloverFromId ?? undefined,
    userId: row.userId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    syncStatus: row.syncStatus as Todo['syncStatus'],
    version: row.version,
    sortOrder: row.sortOrder,
  }
}

/**
 * Get all todos for a user
 */
export async function getTodosByUserId(userId: string): Promise<Todo[]> {
  const rows = await db
    .select()
    .from(todosTable)
    .where(eq(todosTable.userId, userId))
    .orderBy(todosTable.sortOrder)
  
  return rows.map(toTodo)
}

/**
 * Get a single todo
 */
export async function getTodoById(id: string): Promise<Todo | undefined> {
  const rows = await db
    .select()
    .from(todosTable)
    .where(eq(todosTable.id, id))
    .limit(1)
  
  return rows[0] ? toTodo(rows[0]) : undefined
}

/**
 * Create or update a todo with timestamp-based conflict resolution
 * Newest updatedAt wins - if incoming is newer, update DB; otherwise return DB version
 */
export async function upsertTodo(todo: Todo): Promise<{ todo: Todo; wasUpdated: boolean }> {
  const existing = await getTodoById(todo.id)
  
  // Timestamp-based conflict resolution: newest updatedAt wins
  if (existing) {
    const incomingTime = new Date(todo.updatedAt).getTime()
    const existingTime = new Date(existing.updatedAt).getTime()
    
    if (existingTime > incomingTime) {
      // Database has newer data - return database version (server wins)
      return { todo: existing, wasUpdated: false }
    }
  }

  // Incoming is newer or new record - update/insert
  const now = new Date().toISOString()
  const todoToSave = {
    id: todo.id,
    title: todo.title,
    completed: todo.completed,
    completedAt: todo.completedAt ?? null,
    scope: todo.scope,
    dueDate: todo.dueDate ?? null,
    color: todo.color,
    rolloverRule: todo.rolloverRule,
    rolloverFromId: todo.rolloverFromId ?? null,
    userId: todo.userId,
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt, // Preserve original timestamp
    syncStatus: 'synced' as const,
    version: todo.version,
    sortOrder: todo.sortOrder,
  }

  if (existing) {
    await db
      .update(todosTable)
      .set(todoToSave)
      .where(eq(todosTable.id, todo.id))
  } else {
    await db.insert(todosTable).values(todoToSave)
  }

  return { 
    todo: { ...todo, syncStatus: 'synced' }, 
    wasUpdated: true 
  }
}

/**
 * Delete a todo with timestamp check
 * Only deletes if the delete request is newer than the current DB record
 */
export async function deleteTodo(id: string, userId: string, deleteTimestamp?: string): Promise<boolean> {
  const existing = await getTodoById(id)
  
  if (!existing) {
    return true // Already deleted, idempotent
  }
  
  if (existing.userId !== userId) {
    return false // Not owner
  }

  // If timestamp provided, check if delete is newer than DB record
  if (deleteTimestamp) {
    const deleteTime = new Date(deleteTimestamp).getTime()
    const existingTime = new Date(existing.updatedAt).getTime()
    
    if (existingTime > deleteTime) {
      // DB was updated after delete request - don't delete
      return false
    }
  }

  await db.delete(todosTable).where(eq(todosTable.id, id))
  return true
}

/**
 * Get todos modified after a timestamp (for sync)
 */
export async function getTodosModifiedAfter(userId: string, timestamp: string): Promise<Todo[]> {
  const rows = await db
    .select()
    .from(todosTable)
    .where(
      and(
        eq(todosTable.userId, userId),
        gt(todosTable.updatedAt, timestamp)
      )
    )
  
  return rows.map(toTodo)
}

/**
 * Bulk upsert todos with timestamp-based conflict resolution
 * Returns { updated: Todo[], conflicts: Todo[] }
 * - updated: todos that were successfully written to DB
 * - conflicts: todos where DB had newer data (server wins)
 */
export async function bulkUpsertTodos(todosToUpsert: Todo[]): Promise<{
  updated: Todo[]
  conflicts: Todo[]
}> {
  const updated: Todo[] = []
  const conflicts: Todo[] = []

  for (const todo of todosToUpsert) {
    const result = await upsertTodo(todo)
    if (result.wasUpdated) {
      updated.push(result.todo)
    } else {
      // Server had newer data
      conflicts.push(result.todo)
    }
  }

  return { updated, conflicts }
}
