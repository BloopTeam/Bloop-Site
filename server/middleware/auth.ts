/**
 * Authentication Middleware
 *
 * Extracts JWT from Authorization header, verifies it,
 * and attaches user context to every request.
 */
import { Request, Response, NextFunction } from 'express'
import { authService, AuthError, JwtPayload } from '../auth/index.js'
import database from '../database/index.js'

// ─── Extend Express Request to carry user context ────────────────────────────

declare global {
  namespace Express {
    interface Request {
      /** Authenticated user context — always present after requireAuth */
      user?: {
        id: string
        email: string
        username: string
      }
      /** Active workspace for this request */
      workspace?: {
        id: string
        userId: string
        diskPath: string
        slug: string
      }
    }
  }
}

/**
 * Require authentication — rejects with 401 if no valid token.
 * Attaches req.user for downstream handlers.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NO_TOKEN',
    })
  }

  const token = authHeader.slice(7) // strip "Bearer "

  try {
    const payload = authService.verifyAccessToken(token)
    req.user = {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
    }
    next()
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.statusCode).json({
        error: err.message,
        code: err.code,
      })
    }
    return res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN',
    })
  }
}

/**
 * Optional auth — populates req.user if valid token present, but doesn't reject.
 * Useful for endpoints that work for both anonymous and authenticated users.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const payload = authService.verifyAccessToken(token)
      req.user = {
        id: payload.sub,
        email: payload.email,
        username: payload.username,
      }
    } catch {
      // Silently continue without user context
    }
  }
  next()
}

/**
 * Require workspace context — attaches req.workspace.
 * Must be used AFTER requireAuth.
 * Uses workspace from query param ?workspace=slug, or defaults to the user's first workspace.
 */
export function requireWorkspace(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'NO_TOKEN' })
  }

  const workspaceSlug = req.query.workspace as string || req.headers['x-workspace'] as string

  let workspace: any
  if (workspaceSlug) {
    workspace = database.getWorkspaceBySlug(req.user.id, workspaceSlug)
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found', code: 'WORKSPACE_NOT_FOUND' })
    }
  } else {
    // Default to user's first active workspace
    const workspaces = database.getUserWorkspaces(req.user.id)
    workspace = workspaces[0]
    if (!workspace) {
      return res.status(404).json({ error: 'No workspace configured', code: 'NO_WORKSPACE' })
    }
  }

  // Verify workspace belongs to this user
  if (workspace.user_id !== req.user.id) {
    database.audit(req.user.id, 'auth.workspace_access_denied', 'workspace', workspace.id, getIp(req))
    return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' })
  }

  req.workspace = {
    id: workspace.id,
    userId: workspace.user_id,
    diskPath: workspace.disk_path,
    slug: workspace.slug,
  }
  next()
}

/**
 * Extract client IP from request (handles proxies)
 */
export function getIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket.remoteAddress
    || 'unknown'
}
