import { db } from './db'

/**
 * Hash a password using Bun's built-in password hashing (bcrypt-compatible)
 */
export async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, {
    algorithm: 'bcrypt',
    cost: 10,
  })
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await Bun.password.verify(password, hash)
}

/**
 * Check if a password has been set up
 */
export async function isPasswordSet(): Promise<boolean> {
  const auth = await db
    .selectFrom('auth')
    .select('passwordHash')
    .where('id', '=', 1)
    .executeTakeFirst()

  return auth?.passwordHash !== null
}

/**
 * Set the password (for first-time setup or password change)
 */
export async function setPassword(password: string): Promise<void> {
  const hash = await hashPassword(password)

  await db
    .updateTable('auth')
    .set({
      passwordHash: hash,
      updatedAt: new Date().toISOString(),
    })
    .where('id', '=', 1)
    .execute()
}

/**
 * Verify login credentials
 */
export async function verifyLogin(password: string): Promise<boolean> {
  const auth = await db
    .selectFrom('auth')
    .select('passwordHash')
    .where('id', '=', 1)
    .executeTakeFirst()

  if (!auth?.passwordHash) {
    return false
  }

  return await verifyPassword(password, auth.passwordHash)
}

/**
 * Simple in-memory session store
 * In production, you might want to use Redis or a database table
 */
const sessions = new Set<string>()

/**
 * Generate a random session token
 */
export function generateSessionToken(): string {
  return crypto.randomUUID()
}

/**
 * Create a new session
 */
export function createSession(token: string): void {
  sessions.add(token)
}

/**
 * Validate a session token
 */
export function isValidSession(token: string | undefined): boolean {
  if (!token) return false
  return sessions.has(token)
}

/**
 * Destroy a session
 */
export function destroySession(token: string): void {
  sessions.delete(token)
}
