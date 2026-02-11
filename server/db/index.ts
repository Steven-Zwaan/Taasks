import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

/**
 * Get database connection
 * Uses Neon serverless driver for edge compatibility
 */
function getDb() {
  const databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const sql = neon(databaseUrl)
  return drizzle(sql, { schema })
}

// Export singleton instance
export const db = getDb()

// Re-export schema for convenience
export { todos } from './schema'
export type { DbTodo, NewDbTodo } from './schema'
