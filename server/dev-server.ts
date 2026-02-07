/**
 * Unified Development Server
 * Runs both frontend (Vite) and backend (Express) on the SAME port
 *
 * Security layers:
 *  1. Helmet (security headers)
 *  2. CORS (origin whitelist)
 *  3. Rate limiting (per-user, per-endpoint)
 *  4. JWT authentication (on protected routes)
 *  5. Workspace isolation (per-user file sandboxing)
 *  6. Body size limits
 *  7. Request logging & audit trail
 */
import express from 'express'
import dotenv from 'dotenv'
import { createServer as createViteServer } from 'vite'

// Load environment variables
dotenv.config()

// Route imports
import { chatRouter } from './api/routes/chat.js'
import { agentRouter } from './api/routes/agents.js'
import { contextRouter } from './api/routes/context.js'
import { modelsRouter } from './api/routes/models.js'
import { openclawRouter } from './api/routes/openclaw.js'
import { moltbookRouter } from './api/routes/moltbook.js'
import { authRouter } from './api/routes/auth.js'

// Middleware imports
import { requireAuth, optionalAuth, requireWorkspace } from './middleware/auth.js'
import { generalLimiter, aiLimiter, botExecutionLimiter } from './middleware/rateLimiter.js'
import { securityHeaders, productionCors, requestId, requestLogger, sanitizeBody } from './middleware/security.js'

// Database (initializes schema on first load)
import './database/index.js'

const PORT = parseInt(process.env.PORT || '5174', 10)
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

async function createServer() {
  const app = express()

  // ─── Security middleware (applies to ALL requests) ──────────────────────────
  app.use(requestId)
  if (IS_PRODUCTION) {
    app.use(securityHeaders)
  }
  app.use(productionCors)
  app.use(express.json({ limit: '1mb' }))
  app.use(sanitizeBody)
  app.use(requestLogger)
  app.use(generalLimiter)

  // ─── Public routes (no auth required) ──────────────────────────────────────

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '0.3.0',
      auth: true,
    })
  })

  // Auth routes (register, login, refresh — some are rate-limited internally)
  app.use('/api/v1/auth', authRouter)

  // Models list is public (shows what's available)
  app.use('/api/v1/models', modelsRouter)

  // ─── Protected routes (require valid JWT) ──────────────────────────────────

  // AI Chat — requires auth + AI-specific rate limit
  app.use('/api/v1/chat', requireAuth, aiLimiter, chatRouter)

  // Agents — requires auth
  app.use('/api/v1/agents', requireAuth, agentRouter)

  // Context analysis — requires auth
  app.use('/api/v1/context', requireAuth, contextRouter)

  // OpenClaw — requires auth; bot execution also requires workspace
  app.use('/api/v1/openclaw/team/bots', requireAuth, requireWorkspace, botExecutionLimiter)
  app.use('/api/v1/openclaw', requireAuth, openclawRouter)

  // Moltbook — requires auth
  app.use('/api/v1/moltbook', requireAuth, moltbookRouter)

  // ─── Protected: Collaboration ──────────────────────────────────────────────

  app.post('/api/v1/collaboration/sessions', requireAuth, (req, res) => {
    const sessionId = `session-${Date.now()}`
    res.json({
      session: {
        id: sessionId,
        name: req.body.name || 'New Session',
        ownerId: req.user!.id,
        projectPath: req.body.projectPath,
        createdAt: new Date().toISOString()
      }
    })
  })

  app.get('/api/v1/collaboration/sessions/:id', requireAuth, (req, res) => {
    res.json({
      session: {
        id: req.params.id,
        name: 'Session',
        participants: [],
        createdAt: new Date().toISOString()
      }
    })
  })

  // ─── Protected: File operations ────────────────────────────────────────────

  app.get('/api/v1/files', requireAuth, (req, res) => {
    res.json({ files: [], message: 'Virtual filesystem — use workspace' })
  })

  app.post('/api/v1/files/read', requireAuth, (req, res) => {
    res.json({ content: '', message: 'Use workspace filesystem' })
  })

  app.post('/api/v1/files/write', requireAuth, (req, res) => {
    res.json({ success: true, message: 'Use workspace filesystem' })
  })

  // ─── Protected: Security scan ──────────────────────────────────────────────

  app.get('/api/v1/security/scan', requireAuth, (req, res) => {
    res.json({
      vulnerabilities: [],
      score: 95,
      lastScan: new Date().toISOString(),
      message: 'No active scan — configure in Security Dashboard',
    })
  })

  // ─── Code analysis ─────────────────────────────────────────────────────────

  app.post('/api/v1/code/analyze', requireAuth, (req, res) => {
    req.url = '/analyze'
    contextRouter.handle(req, res, () => {})
  })

  // ─── Vite frontend middleware ──────────────────────────────────────────────

  if (!IS_PRODUCTION) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    })
    app.use(vite.middlewares)
  } else {
    // In production, serve static files
    app.use(express.static('dist'))
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/')) {
        res.sendFile('dist/index.html', { root: process.cwd() })
      }
    })
  }

  app.listen(PORT, () => {
    console.log('')
    console.log('╔════════════════════════════════════════════════════════════════╗')
    console.log('║                                                                ║')
    console.log('║   🚀 Bloop Server v0.3.0                                       ║')
    console.log(`║   ➜  Local:   http://localhost:${PORT}/                            ║`)
    console.log(`║   ➜  API:     http://localhost:${PORT}/api/health                  ║`)
    console.log(`║   ➜  Mode:    ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'}                                       ║`)
    console.log('║                                                                ║')
    console.log('║   🔐 Auth:     JWT + bcrypt (register/login/refresh)           ║')
    console.log('║   🛡️  Security: Helmet + CORS + Rate Limiting                   ║')
    console.log('║   📦 Database: SQLite (data/bloop.db)                           ║')
    console.log('║   🏠 Isolation: Per-user workspaces                             ║')
    console.log('║                                                                ║')
    console.log('║   Public endpoints:                                            ║')
    console.log('║     POST /api/v1/auth/register   - Create account              ║')
    console.log('║     POST /api/v1/auth/login      - Login                       ║')
    console.log('║     POST /api/v1/auth/refresh    - Refresh token               ║')
    console.log('║     GET  /api/v1/models          - List AI models              ║')
    console.log('║                                                                ║')
    console.log('║   Protected endpoints (require Bearer token):                  ║')
    console.log('║     GET  /api/v1/auth/me         - Profile + keys              ║')
    console.log('║     POST /api/v1/auth/api-keys   - Save AI API key             ║')
    console.log('║     POST /api/v1/chat            - AI chat                     ║')
    console.log('║     POST /api/v1/openclaw/team/* - Bot team (workspace-scoped) ║')
    console.log('║     *    /api/v1/agents          - Agent CRUD                  ║')
    console.log('║                                                                ║')
    console.log('╚════════════════════════════════════════════════════════════════╝')
    console.log('')
  })
}

createServer().catch(console.error)
