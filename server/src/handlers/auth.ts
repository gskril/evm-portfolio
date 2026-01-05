import type { Context } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'

import {
  createSession,
  destroySession,
  generateSessionToken,
  isPasswordSet,
  isValidSession,
  setPassword,
  verifyLogin,
} from '../auth'

const SESSION_COOKIE_NAME = 'evm_portfolio_session'

/**
 * GET /auth/status
 * Check if password is set up and if user is authenticated
 */
export async function getAuthStatus(c: Context) {
  const passwordSet = await isPasswordSet()
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME)
  const authenticated = isValidSession(sessionToken)

  return c.json({
    passwordSet,
    authenticated,
  })
}

/**
 * POST /auth/setup
 * Set up the password for the first time
 * Body: { password: string }
 */
export async function setupPassword(c: Context) {
  const passwordSet = await isPasswordSet()

  if (passwordSet) {
    return c.json({ error: 'Password already set up' }, 400)
  }

  const body = await c.req.json()
  const { password } = body

  if (!password || typeof password !== 'string' || password.length < 8) {
    return c.json(
      { error: 'Password must be at least 8 characters long' },
      400
    )
  }

  await setPassword(password)

  // Automatically log in after setup
  const sessionToken = generateSessionToken()
  createSession(sessionToken)

  setCookie(c, SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  return c.json({ success: true })
}

/**
 * POST /auth/login
 * Login with password
 * Body: { password: string }
 */
export async function login(c: Context) {
  const passwordSet = await isPasswordSet()

  if (!passwordSet) {
    return c.json({ error: 'Password not set up yet' }, 400)
  }

  const body = await c.req.json()
  const { password } = body

  if (!password || typeof password !== 'string') {
    return c.json({ error: 'Password is required' }, 400)
  }

  const valid = await verifyLogin(password)

  if (!valid) {
    return c.json({ error: 'Invalid password' }, 401)
  }

  const sessionToken = generateSessionToken()
  createSession(sessionToken)

  setCookie(c, SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  return c.json({ success: true })
}

/**
 * POST /auth/logout
 * Logout and destroy session
 */
export async function logout(c: Context) {
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME)

  if (sessionToken) {
    destroySession(sessionToken)
  }

  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: '/',
  })

  return c.json({ success: true })
}
