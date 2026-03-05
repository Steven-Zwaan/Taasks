/**
 * Auth middleware - protects routes requiring authentication
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // Skip on server
  if (import.meta.server) return

  const { isAuthenticated, isLoading } = useAuth()

  // Wait for auth to initialize
  if (isLoading.value) {
    await new Promise<void>((resolve) => {
      const stop = watch(isLoading, (loading) => {
        if (!loading) {
          stop()
          resolve()
        }
      }, { immediate: true })
      // Safety timeout after 5 seconds
      setTimeout(() => { stop(); resolve() }, 5000)
    })
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
