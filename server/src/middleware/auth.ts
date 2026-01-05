import type { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'

import { isPasswordSet, isValidSession } from '../auth'

const SESSION_COOKIE_NAME = 'evm_portfolio_session'

/**
 * Authentication middleware
 * Checks if password is set and if so, requires valid session
 * If password is not set, allows access (for initial setup)
 */
export async function authMiddleware(c: Context, next: Next) {
  const passwordSet = await isPasswordSet()

  // If password is not set, allow access (user needs to set it up)
  if (!passwordSet) {
    return next()
  }

  // Password is set, check for valid session
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME)

  if (!isValidSession(sessionToken)) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  return next()
}
