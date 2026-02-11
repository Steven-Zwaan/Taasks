import { pgTable, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core'

/**
 * Todos table - stores all user todos
 * Uses timestamp-based conflict resolution (newest updatedAt wins)
 */
export const todos = pgTable('todos', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  completed: boolean('completed').notNull().default(false),
  completedAt: text('completed_at'),
  scope: text('scope').notNull().default('day'), // 'day' | 'week' | 'global'
  dueDate: text('due_date'),
  color: text('color').notNull().default('blue'),
  rolloverRule: text('rollover_rule').notNull().default('next-day'), // 'next-day' | 'next-week' | 'none'
  rolloverFromId: text('rollover_from_id'),
  userId: text('user_id').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  syncStatus: text('sync_status').notNull().default('synced'),
  version: integer('version').notNull().default(1),
  sortOrder: integer('sort_order').notNull().default(0),
})

export type DbTodo = typeof todos.$inferSelect
export type NewDbTodo = typeof todos.$inferInsert
