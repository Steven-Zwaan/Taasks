import { createAuth0 } from '@auth0/auth0-vue'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()

  // Only initialize on client
  if (import.meta.server) return

  const auth0 = createAuth0({
    domain: config.public.auth0.domain,
    clientId: config.public.auth0.clientId,
    authorizationParams: {
      redirect_uri: typeof window !== 'undefined' ? window.location.origin : '',
      audience: config.public.auth0.audience,
    },
    cacheLocation: 'localstorage',
    useRefreshTokens: true,
    useRefreshTokensFallback: true,
  })

  nuxtApp.vueApp.use(auth0)
})
