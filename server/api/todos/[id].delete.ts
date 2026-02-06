/**
 * DELETE /api/todos/:id - Delete a todo (idempotent)
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Todo ID is required',
    })
  }

  const existing = getTodoById(id)

  // Idempotent: return success even if not found
  if (!existing) {
    return {
      success: true,
      timestamp: new Date().toISOString(),
    }
  }

  // Verify ownership
  if (existing.userId !== user.sub) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  }

  deleteTodo(id)

  return {
    success: true,
    timestamp: new Date().toISOString(),
  }
})
