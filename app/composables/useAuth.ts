import { useAuth0 } from '@auth0/auth0-vue'
import type { User } from '#shared/types'

/**
 * Composable for authentication state and actions
 */
export function useAuth() {
  const auth0 = import.meta.client ? useAuth0() : null

  const isAuthenticated = computed(() => auth0?.isAuthenticated.value ?? false)
  const isLoading = computed(() => auth0?.isLoading.value ?? true)
  const user = computed<User | null>(() => {
    if (!auth0?.user.value) return null
    return {
      id: auth0.user.value.sub ?? '',
      email: auth0.user.value.email ?? '',
      name: auth0.user.value.name ?? '',
      picture: auth0.user.value.picture,
    }
  })

  /**
   * Login with redirect to Auth0
   */
  async function login() {
    if (!auth0) return
    await auth0.loginWithRedirect({
      appState: { target: '/' },
    })
  }

  /**
   * Login with popup (better for PWA)
   */
  async function loginWithPopup() {
    if (!auth0) return
    try {
      await auth0.loginWithPopup()
    } catch (error) {
      // Fallback to redirect if popup blocked
      console.warn('Popup blocked, falling back to redirect')
      await login()
    }
  }

  /**
   * Logout and clear local data
   */
  async function logout() {
    if (!auth0) return
    await auth0.logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    })
  }

  /**
   * Get access token for API calls
   */
  async function getAccessToken(): Promise<string | null> {
    if (!auth0 || !auth0.isAuthenticated.value) return null
    try {
      return await auth0.getAccessTokenSilently()
    } catch (error) {
      console.error('Failed to get access token:', error)
      return null
    }
  }

  /**
   * Check if token is valid and refresh if needed
   */
  async function ensureValidToken(): Promise<boolean> {
    const token = await getAccessToken()
    return token !== null
  }

  return {
    isAuthenticated,
    isLoading,
    user,
    login,
    loginWithPopup,
    logout,
    getAccessToken,
    ensureValidToken,
  }
}
