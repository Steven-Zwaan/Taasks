import type { Todo } from '#shared/types'
import { db, generateId, now, today, getNextDay, isPastDate } from '~/utils/db'

let _rolledOverThisSession = false

/**
 * Process rollover for uncompleted todos
 * This should be called on app focus/load (foreground only)
 */
export async function processRollover(userId: string): Promise<number> {
  if (_rolledOverThisSession) return 0
  _rolledOverThisSession = true

  const todayStr = today()
  let rolledOverCount = 0

  // Find uncompleted daily todos from past dates
  const uncompletedPastTodos = await db.todos
    .where('userId')
    .equals(userId)
    .filter(todo => 
      todo.scope === 'day' &&
      !todo.completed &&
      todo.dueDate !== undefined &&
      isPastDate(todo.dueDate) &&
      todo.rolloverRule !== 'none'
    )
    .toArray()

  for (const todo of uncompletedPastTodos) {
    if (!todo.dueDate) continue

    let newDueDate: string

    switch (todo.rolloverRule) {
      case 'next-day':
        // Roll over to today
        newDueDate = todayStr
        break
      case 'next-week':
        // Roll over to start of next week (Monday)
        const currentDate = new Date(todayStr + 'T00:00:00')
        const dayOfWeek = currentDate.getDay()
        const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
        currentDate.setDate(currentDate.getDate() + daysUntilMonday)
        newDueDate = currentDate.toISOString().split('T')[0]!
        break
      default:
        continue
    }

    // Create a new todo as rollover (preserves history)
    const rolledOverTodo: Todo = {
      ...todo,
      id: generateId(),
      dueDate: newDueDate,
      rolloverFromId: todo.id,
      createdAt: now(),
      updatedAt: now(),
      syncStatus: 'pending',
      version: 1,
    }

    // Mark original as completed (rolled over)
    await db.todos.update(todo.id, {
      completed: true,
      completedAt: now(),
      updatedAt: now(),
      syncStatus: 'pending',
    })

    // Add the rolled over todo
    await db.todos.add(rolledOverTodo)
    rolledOverCount++
  }

  return rolledOverCount
}

/**
 * Check if rollover should be processed
 * Returns true if there are uncompleted past todos
 */
export async function hasUncompletedPastTodos(userId: string): Promise<boolean> {
  const count = await db.todos
    .where('userId')
    .equals(userId)
    .filter(todo => 
      todo.scope === 'day' &&
      !todo.completed &&
      todo.dueDate !== undefined &&
      isPastDate(todo.dueDate) &&
      todo.rolloverRule !== 'none'
    )
    .count()

  return count > 0
}

/**
 * Get rollover chain for a todo
 * Returns all todos in the rollover history
 */
export async function getRolloverChain(todoId: string): Promise<Todo[]> {
  const chain: Todo[] = []
  let currentId: string | undefined = todoId

  while (currentId) {
    const foundTodo: Todo | undefined = await db.todos.get(currentId)
    if (!foundTodo) break
    
    chain.unshift(foundTodo) // Add to beginning
    currentId = foundTodo.rolloverFromId
  }

  return chain
}
