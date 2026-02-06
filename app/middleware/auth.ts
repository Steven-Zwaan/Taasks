/**
 * Auth middleware - protects routes requiring authentication
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // Skip on server
  if (import.meta.server) return

  const { isAuthenticated, isLoading } = useAuth()

  // Wait for auth to initialize
  if (isLoading.value) {
    // Poll until auth is ready (max 5 seconds)
    let attempts = 0
    while (isLoading.value && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
  }

  // Public routes that don't require auth
  const publicRoutes = ['/login', '/callback']
  if (publicRoutes.includes(to.path)) {
    return
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated.value) {
    return navigateTo('/login')
  }
})
