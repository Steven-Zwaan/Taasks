import type { Todo } from '#shared/types'

/**
 * PUT /api/todos/:id - Update a todo (idempotent)
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody<Partial<Todo>>(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Todo ID is required',
    })
  }

  const existing = await getTodoById(id)

  // Allow creating if doesn't exist (idempotent)
  if (!existing) {
    if (!body.title) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Title is required for new todo',
      })
    }

    const newTodo: Todo = {
      id,
      title: body.title,
      completed: body.completed ?? false,
      scope: body.scope ?? 'day',
      dueDate: body.dueDate,
      color: body.color ?? 'blue',
      rolloverRule: body.rolloverRule ?? 'next-day',
      userId: user.sub,
      createdAt: body.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'synced',
      version: body.version ?? 1,
      sortOrder: body.sortOrder ?? 0,
    }

    const result = await upsertTodo(newTodo)
    return { todo: result.todo, timestamp: new Date().toISOString() }
  }

  // Verify ownership
  if (existing.userId !== user.sub) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  }

  const updatedTodo: Todo = {
    ...existing,
    ...body,
    id, // Preserve ID
    userId: user.sub, // Preserve ownership
  }

  const result = await upsertTodo(updatedTodo)

  return {
    todo: result.todo,
    timestamp: new Date().toISOString(),
  }
})
