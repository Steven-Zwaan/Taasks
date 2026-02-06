import Dexie, { type EntityTable } from 'dexie'
import type { Todo, SyncOperation, AppSettings } from '#shared/types'

/**
 * TodoDatabase - Dexie database for offline-first todo storage
 */
class TodoDatabase extends Dexie {
  todos!: EntityTable<Todo, 'id'>
  syncQueue!: EntityTable<SyncOperation, 'id'>
  settings!: EntityTable<AppSettings, 'userId'>

  constructor() {
    super('TodoAppDatabase')

    this.version(1).stores({
      // Todos indexed by id, with secondary indexes for queries
      todos: 'id, userId, scope, dueDate, completed, syncStatus, [userId+scope], [userId+dueDate], [userId+scope+dueDate], sortOrder, updatedAt',
      // Sync queue for pending operations
      syncQueue: 'id, todoId, type, timestamp, retryCount',
      // User settings
      settings: 'userId',
    })
  }
}

// Singleton database instance
export const db = new TodoDatabase()

/**
 * Generate a UUID v4
 */
export function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Get current ISO timestamp
 */
export function now(): string {
  return new Date().toISOString()
}

/**
 * Get today's date as YYYY-MM-DD
 */
export function today(): string {
  return new Date().toISOString().split('T')[0]!
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00')
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)
  
  const diff = Math.floor((date.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).toUpperCase()
}

/**
 * Get the next day's date string
 */
export function getNextDay(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00')
  date.setDate(date.getDate() + 1)
  return date.toISOString().split('T')[0]!
}

/**
 * Check if a date is in the past
 */
export function isPastDate(dateString: string): boolean {
  const date = new Date(dateString + 'T23:59:59')
  return date < new Date()
}

/**
 * Check if a date is today or in the future
 */
export function isTodayOrFuture(dateString: string): boolean {
  return dateString >= today()
}
