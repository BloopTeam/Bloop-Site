/**
 * Auth Routes — Register, Login, Refresh, Logout, Profile
 */
import { Router, Request, Response } from 'express'
import { authService, AuthError } from '../../auth/index.js'
import { requireAuth, getIp } from '../../middleware/auth.js'
import { authLimiter } from '../../middleware/rateLimiter.js'
import database from '../../database/index.js'
import { v4 as uuidv4 } from 'uuid'

export const authRouter = Router()

// ─── Register ────────────────────────────────────────────────────────────────

authRouter.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, username, password, displayName } = req.body

    if (!email || !username || !password) {
      return res.status(400).json({
        error: 'Email, username, and password are required',
        code: 'MISSING_FIELDS',
      })
    }

    const result = await authService.register(
      email,
      username,
      password,
      displayName,
      getIp(req),
      req.headers['user-agent']
    )

    res.status(201).json({
      user: result.user,
      tokens: result.tokens,
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code })
    }
    console.error('Register error:', err)
    res.status(500).json({ error: 'Registration failed', code: 'INTERNAL_ERROR' })
  }
})

// ─── Login ───────────────────────────────────────────────────────────────────

authRouter.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body
    const identifier = email || username

    if (!identifier || !password) {
      return res.status(400).json({
        error: 'Email/username and password are required',
        code: 'MISSING_FIELDS',
      })
    }

    const result = await authService.login(
      identifier,
      password,
      getIp(req),
      req.headers['user-agent']
    )

    res.json({
      user: result.user,
      tokens: result.tokens,
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code })
    }
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed', code: 'INTERNAL_ERROR' })
  }
})

// ─── Refresh Token ───────────────────────────────────────────────────────────

authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required', code: 'MISSING_TOKEN' })
    }

    const tokens = await authService.refresh(refreshToken, getIp(req))
    res.json({ tokens })
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code })
    }
    console.error('Refresh error:', err)
    res.status(500).json({ error: 'Token refresh failed', code: 'INTERNAL_ERROR' })
  }
})

// ─── Logout ──────────────────────────────────────────────────────────────────

authRouter.post('/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    const { allDevices } = req.body
    if (allDevices) {
      await authService.logout(req.user!.id)
    } else {
      await authService.logout(req.user!.id)
    }
    res.json({ message: 'Logged out successfully' })
  } catch (err) {
    console.error('Logout error:', err)
    res.status(500).json({ error: 'Logout failed', code: 'INTERNAL_ERROR' })
  }
})

// ─── Get Profile ─────────────────────────────────────────────────────────────

authRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = database.getUserById(req.user!.id)
  if (!user) {
    return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' })
  }

  const { password_hash: _, ...safeUser } = user
  const workspaces = database.getUserWorkspaces(req.user!.id)
  const apiKeys = database.getUserApiKeys(req.user!.id)

  res.json({
    user: safeUser,
    workspaces: workspaces.map((w: any) => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      createdAt: w.created_at,
    })),
    apiKeys: apiKeys.map((k: any) => ({
      provider: k.provider,
      hint: k.key_hint,
      isActive: !!k.is_active,
    })),
  })
})

// ─── API Key Management ──────────────────────────────────────────────────────

const SUPPORTED_PROVIDERS = ['openai', 'anthropic', 'google', 'mistral', 'perplexity', 'deepseek']

authRouter.post('/api-keys', requireAuth, async (req: Request, res: Response) => {
  try {
    const { provider, apiKey } = req.body

    if (!provider || !apiKey) {
      return res.status(400).json({ error: 'Provider and apiKey are required', code: 'MISSING_FIELDS' })
    }
    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      return res.status(400).json({ error: `Unsupported provider. Supported: ${SUPPORTED_PROVIDERS.join(', ')}`, code: 'INVALID_PROVIDER' })
    }
    if (typeof apiKey !== 'string' || apiKey.length < 10 || apiKey.length > 200) {
      return res.status(400).json({ error: 'Invalid API key format', code: 'INVALID_KEY' })
    }

    const id = uuidv4()
    database.setApiKey(id, req.user!.id, provider, apiKey)
    database.audit(req.user!.id, 'api_key.set', 'api_key', provider, getIp(req))

    res.json({
      message: `${provider} API key saved`,
      provider,
      hint: apiKey.slice(-4),
    })
  } catch (err) {
    console.error('Set API key error:', err)
    res.status(500).json({ error: 'Failed to save API key', code: 'INTERNAL_ERROR' })
  }
})

authRouter.get('/api-keys', requireAuth, (req: Request, res: Response) => {
  const keys = database.getUserApiKeys(req.user!.id)
  res.json({
    keys: keys.map((k: any) => ({
      provider: k.provider,
      hint: k.key_hint,
      isActive: !!k.is_active,
      createdAt: k.created_at,
    })),
  })
})

authRouter.delete('/api-keys/:provider', requireAuth, (req: Request, res: Response) => {
  const { provider } = req.params
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: 'Invalid provider', code: 'INVALID_PROVIDER' })
  }

  database.deleteApiKey(req.user!.id, provider)
  database.audit(req.user!.id, 'api_key.deleted', 'api_key', provider, getIp(req))

  res.json({ message: `${provider} API key removed` })
})

// ─── Workspace Management ────────────────────────────────────────────────────

authRouter.get('/workspaces', requireAuth, (req: Request, res: Response) => {
  const workspaces = database.getUserWorkspaces(req.user!.id)
  res.json({
    workspaces: workspaces.map((w: any) => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      maxStorage: w.max_storage_bytes,
      usedStorage: w.used_storage_bytes,
      createdAt: w.created_at,
    })),
  })
})

authRouter.post('/workspaces', requireAuth, (req: Request, res: Response) => {
  try {
    const { name } = req.body
    if (!name || typeof name !== 'string' || name.length < 1 || name.length > 100) {
      return res.status(400).json({ error: 'Workspace name required (1-100 chars)', code: 'INVALID_NAME' })
    }

    // Max 5 workspaces per user (free tier)
    const existing = database.getUserWorkspaces(req.user!.id)
    if (existing.length >= 5) {
      return res.status(403).json({ error: 'Maximum workspaces reached (5)', code: 'WORKSPACE_LIMIT' })
    }

    const id = uuidv4()
    const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 50)
    const diskPath = `workspaces/${req.user!.id}/${slug}`

    const workspace = database.createWorkspace(id, req.user!.id, name, slug, diskPath)
    database.audit(req.user!.id, 'workspace.created', 'workspace', id, getIp(req))

    res.status(201).json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        createdAt: workspace.created_at,
      },
    })
  } catch (err) {
    console.error('Create workspace error:', err)
    res.status(500).json({ error: 'Failed to create workspace', code: 'INTERNAL_ERROR' })
  }
})
