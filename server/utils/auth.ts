import * as jose from 'jose'
import type { H3Event } from 'h3'

interface TokenPayload {
  sub: string
  email?: string
  name?: string
  [key: string]: unknown
}

/**
 * Verify JWT token from Auth0
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  const config = useRuntimeConfig()
  const domain = config.auth0.domain

  if (!domain) {
    console.error('Auth0 domain not configured')
    return null
  }

  try {
    const JWKS = jose.createRemoteJWKSet(
      new URL(`https://${domain}/.well-known/jwks.json`)
    )

    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: `https://${domain}/`,
      audience: config.auth0.audience || undefined,
    })

    return payload as TokenPayload
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

/**
 * Extract user from request
 */
export async function getUserFromRequest(event: H3Event): Promise<TokenPayload | null> {
  const authHeader = getHeader(event, 'authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)
  return verifyToken(token)
}

/**
 * Require authenticated user - throws 401 if not authenticated
 */
export async function requireAuth(event: H3Event): Promise<TokenPayload> {
  const user = await getUserFromRequest(event)
  
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  return user
}
