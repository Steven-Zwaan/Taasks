import type { Todo } from '#shared/types'

/**
 * POST /api/todos - Create a new todo (idempotent with ID)
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<Todo>(event)

  // Validate required fields
  if (!body.id || !body.title) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: id, title',
    })
  }

  // Ensure todo belongs to authenticated user
  const todo: Todo = {
    ...body,
    userId: user.sub,
    syncStatus: 'synced',
  }

  const result = await upsertTodo(todo)

  return {
    todo: result.todo,
    timestamp: new Date().toISOString(),
  }
})
