/**
 * GET /api/todos - Get all todos for authenticated user
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const todos = await getTodosByUserId(user.sub)
  
  return {
    todos,
    timestamp: new Date().toISOString(),
  }
})
