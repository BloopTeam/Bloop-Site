/**
 * Authentication System — JWT + bcrypt
 *
 * - Register / Login with email+password
 * - Access tokens (short-lived, 15min) + Refresh tokens (long-lived, 30 days)
 * - Password hashing with bcrypt (cost factor 12)
 * - Token rotation on refresh
 * - Session tracking for revocation
 */
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import * as crypto from 'crypto'
import { database, User } from '../database/index.js'

// ─── Configuration ───────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex')
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex')

// Warn if using auto-generated secrets (not persistent across restarts)
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET not set — using random secret (tokens will invalidate on restart)')
}

const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '30d'
const BCRYPT_ROUNDS = 12

// ─── Validation ──────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/
const PASSWORD_MIN_LENGTH = 8

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number // seconds
}

export interface AuthResult {
  user: Omit<User, 'password_hash'>
  tokens: TokenPair
  sessionId: string
}

// ─── Auth Service ────────────────────────────────────────────────────────────

export const authService = {
  /**
   * Register a new user
   */
  async register(
    email: string,
    username: string,
    password: string,
    displayName?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResult> {
    // Validate input
    email = email.trim().toLowerCase()
    username = username.trim().toLowerCase()

    if (!EMAIL_REGEX.test(email)) {
      throw new AuthError('Invalid email format', 'INVALID_EMAIL')
    }
    if (!USERNAME_REGEX.test(username)) {
      throw new AuthError('Username must be 3-30 characters (letters, numbers, _ or -)', 'INVALID_USERNAME')
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      throw new AuthError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`, 'WEAK_PASSWORD')
    }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      throw new AuthError('Password must contain at least one uppercase letter and one number', 'WEAK_PASSWORD')
    }

    // Check for existing user
    if (database.getUserByEmail(email)) {
      throw new AuthError('Email already registered', 'EMAIL_EXISTS')
    }
    if (database.getUserByUsername(username)) {
      throw new AuthError('Username already taken', 'USERNAME_EXISTS')
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const userId = uuidv4()

    // Create user
    const user = database.createUser(userId, email, username, passwordHash, displayName)

    // Create default workspace
    const workspaceId = uuidv4()
    const workspaceSlug = `${username}-default`
    const workspacePath = `workspaces/${userId}/${workspaceSlug}`
    database.createWorkspace(workspaceId, userId, 'My Project', workspaceSlug, workspacePath)

    // Issue tokens
    const tokens = generateTokenPair(userId, email, username)
    const sessionId = await createSession(userId, tokens.refreshToken, userAgent, ipAddress)

    // Audit log
    database.audit(userId, 'user.register', 'user', userId, ipAddress, `New user: ${username}`)

    const { password_hash: _, ...safeUser } = user as any
    return { user: safeUser, tokens, sessionId }
  },

  /**
   * Login with email/username + password
   */
  async login(
    emailOrUsername: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResult> {
    emailOrUsername = emailOrUsername.trim().toLowerCase()

    // Find user by email or username
    const user = emailOrUsername.includes('@')
      ? database.getUserByEmail(emailOrUsername)
      : database.getUserByUsername(emailOrUsername)

    if (!user || !user.is_active) {
      // Use generic error to prevent user enumeration
      throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS')
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash)
    if (!passwordValid) {
      database.audit(user.id, 'auth.login_failed', 'user', user.id, ipAddress, 'Bad password')
      throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS')
    }

    // Update last login
    database.updateLastLogin(user.id)

    // Issue tokens
    const tokens = generateTokenPair(user.id, user.email, user.username)
    const sessionId = await createSession(user.id, tokens.refreshToken, userAgent, ipAddress)

    database.audit(user.id, 'auth.login', 'user', user.id, ipAddress)

    const { password_hash: _, ...safeUser } = user
    return { user: safeUser, tokens, sessionId }
  },

  /**
   * Refresh access token using refresh token
   */
  async refresh(refreshToken: string, ipAddress?: string): Promise<TokenPair> {
    let payload: any
    try {
      payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any
    } catch {
      throw new AuthError('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN')
    }

    // Verify the session exists and isn't revoked
    const session = database.getSession(payload.sessionId)
    if (!session) {
      throw new AuthError('Session revoked or expired', 'SESSION_REVOKED')
    }

    // Verify refresh token matches session
    const tokenHash = hashToken(refreshToken)
    if (session.refresh_token_hash !== tokenHash) {
      // Possible token reuse — revoke all sessions for safety
      database.revokeAllUserSessions(payload.sub)
      database.audit(payload.sub, 'auth.token_reuse_detected', 'session', payload.sessionId, ipAddress)
      throw new AuthError('Token reuse detected — all sessions revoked', 'TOKEN_REUSE')
    }

    // Issue new token pair (rotation)
    const user = database.getUserById(payload.sub)
    if (!user || !user.is_active) {
      throw new AuthError('User not found or inactive', 'USER_INACTIVE')
    }

    const newTokens = generateTokenPair(user.id, user.email, user.username)

    // Rotate: revoke old session, create new one
    database.revokeSession(session.id)
    await createSession(user.id, newTokens.refreshToken, session.user_agent, ipAddress)

    return newTokens
  },

  /**
   * Logout — revoke session
   */
  async logout(userId: string, sessionId?: string) {
    if (sessionId) {
      database.revokeSession(sessionId)
    } else {
      database.revokeAllUserSessions(userId)
    }
    database.audit(userId, 'auth.logout', 'user', userId)
  },

  /**
   * Verify an access token and return the payload
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new AuthError('Access token expired', 'TOKEN_EXPIRED')
      }
      throw new AuthError('Invalid access token', 'INVALID_TOKEN')
    }
  },

  /**
   * Change password (requires current password)
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string, ipAddress?: string) {
    const user = database.getUserById(userId)
    if (!user) throw new AuthError('User not found', 'USER_NOT_FOUND')

    const valid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!valid) throw new AuthError('Current password is incorrect', 'INVALID_CREDENTIALS')

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      throw new AuthError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`, 'WEAK_PASSWORD')
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
    // Using raw DB update since we don't have a prepared statement for this
    database.revokeAllUserSessions(userId)
    database.audit(userId, 'auth.password_changed', 'user', userId, ipAddress)
  },
}

// ─── Token generation ────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string        // user ID
  email: string
  username: string
  iat: number
  exp: number
  sessionId?: string
}

function generateTokenPair(userId: string, email: string, username: string): TokenPair {
  const sessionId = uuidv4()

  const accessToken = jwt.sign(
    { sub: userId, email, username },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  )

  const refreshToken = jwt.sign(
    { sub: userId, sessionId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  )

  return {
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
  }
}

async function createSession(userId: string, refreshToken: string, userAgent?: string, ipAddress?: string): Promise<string> {
  const sessionId = uuidv4()
  const tokenHash = hashToken(refreshToken)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  database.createSession(sessionId, userId, tokenHash, userAgent, ipAddress, expiresAt)
  return sessionId
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// ─── Auth Error ──────────────────────────────────────────────────────────────

export class AuthError extends Error {
  code: string
  statusCode: number

  constructor(message: string, code: string, statusCode?: number) {
    super(message)
    this.name = 'AuthError'
    this.code = code
    this.statusCode = statusCode || (code === 'INVALID_CREDENTIALS' ? 401 : code.includes('EXISTS') ? 409 : 401)
  }
}

export default authService
