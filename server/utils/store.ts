import type { Todo } from '#shared/types'

/**
 * In-memory store for demo purposes
 * In production, replace with a real database (Drizzle, Prisma, etc.)
 */
const todos = new Map<string, Todo>()

/**
 * Get all todos for a user
 */
export function getTodosByUserId(userId: string): Todo[] {
  return Array.from(todos.values())
    .filter(todo => todo.userId === userId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

/**
 * Get a single todo
 */
export function getTodoById(id: string): Todo | undefined {
  return todos.get(id)
}

/**
 * Create or update a todo (upsert)
 */
export function upsertTodo(todo: Todo): Todo {
  const existing = todos.get(todo.id)
  
  // Last-write-wins conflict resolution
  if (existing && existing.version > todo.version) {
    // Server version is newer, return server version
    return existing
  }

  const updatedTodo: Todo = {
    ...todo,
    version: (existing?.version ?? 0) + 1,
    updatedAt: new Date().toISOString(),
    syncStatus: 'synced',
  }

  todos.set(todo.id, updatedTodo)
  return updatedTodo
}

/**
 * Delete a todo
 */
export function deleteTodo(id: string): boolean {
  return todos.delete(id)
}

/**
 * Get todos modified after a timestamp (for sync)
 */
export function getTodosModifiedAfter(userId: string, timestamp: string): Todo[] {
  return Array.from(todos.values())
    .filter(todo => 
      todo.userId === userId && 
      todo.updatedAt > timestamp
    )
}

/**
 * Bulk upsert todos
 */
export function bulkUpsertTodos(todosToUpsert: Todo[]): Todo[] {
  return todosToUpsert.map(todo => upsertTodo(todo))
}
