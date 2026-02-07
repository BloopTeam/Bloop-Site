/**
 * Unified Development Server
 * Runs both frontend (Vite) and backend (Express) on the SAME port
 */
import express from 'express'
import cors from 'cors'
import compression from 'compression'
import dotenv from 'dotenv'
import { createServer as createViteServer } from 'vite'
import { chatRouter } from './api/routes/chat.js'
import { agentRouter } from './api/routes/agents.js'
import { contextRouter } from './api/routes/context.js'
import { modelsRouter } from './api/routes/models.js'
import { openclawRouter } from './api/routes/openclaw.js'
import { moltbookRouter } from './api/routes/moltbook.js'

// Load environment variables
dotenv.config()

const PORT = 5174 // Unified dev server port

async function createServer() {
  const app = express()

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  })

  // Middleware
  app.use(compression())
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }))
  app.use(express.json())

  // ─── API Routes (must come BEFORE Vite middleware) ───

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '0.2.0',
    })
  })

  // Core API routes
  app.use('/api/v1/chat', chatRouter)
  app.use('/api/v1/models', modelsRouter)
  app.use('/api/v1/agents', agentRouter)
  app.use('/api/v1/context', contextRouter)

  // Integration routes (OpenClaw + Moltbook)
  app.use('/api/v1/openclaw', openclawRouter)
  app.use('/api/v1/moltbook', moltbookRouter)

  // Collaboration endpoints
  app.post('/api/v1/collaboration/sessions', (req, res) => {
    const sessionId = `session-${Date.now()}`
    res.json({
      session: {
        id: sessionId,
        name: req.body.name || 'New Session',
        ownerId: req.body.ownerId,
        projectPath: req.body.projectPath,
        createdAt: new Date().toISOString()
      }
    })
  })

  app.get('/api/v1/collaboration/sessions/:id', (req, res) => {
    res.json({
      session: {
        id: req.params.id,
        name: 'Session',
        participants: [],
        createdAt: new Date().toISOString()
      }
    })
  })

  // File operations (for frontend file system)
  app.get('/api/v1/files', (req, res) => {
    res.json({ files: [], message: 'Virtual filesystem - files stored in browser' })
  })

  app.post('/api/v1/files/read', (req, res) => {
    res.json({ content: '', message: 'Use browser filesystem' })
  })

  app.post('/api/v1/files/write', (req, res) => {
    res.json({ success: true, message: 'Use browser filesystem' })
  })

  // Security endpoints
  app.get('/api/v1/security/scan', (req, res) => {
    res.json({
      vulnerabilities: [],
      score: 95,
      lastScan: new Date().toISOString(),
      message: 'No active scan - configure in Security Dashboard',
    })
  })

  // Code intelligence endpoints
  app.post('/api/v1/code/analyze', (req, res) => {
    // Forward to context analyzer
    req.url = '/analyze'
    contextRouter.handle(req, res, () => {})
  })

  // ─── Vite frontend middleware ───
  app.use(vite.middlewares)

  app.listen(PORT, () => {
    console.log('')
    console.log('╔═══════════════════════════════════════════════════════════╗')
    console.log('║                                                           ║')
    console.log('║   🚀 Bloop Development Server v0.2.0                      ║')
    console.log('║                                                           ║')
    console.log(`║   ➜  Local:   http://localhost:${PORT}/                      ║`)
    console.log('║   ➜  API:     http://localhost:' + PORT + '/api/health              ║')
    console.log('║                                                           ║')
    console.log('║   Frontend + Backend running on SAME port                 ║')
    console.log('║                                                           ║')
    console.log('║   Endpoints:                                              ║')
    console.log('║     POST /api/v1/chat          - AI chat                  ║')
    console.log('║     POST /api/v1/chat/stream   - Streaming chat           ║')
    console.log('║     GET  /api/v1/models        - List models              ║')
    console.log('║     POST /api/v1/agents/create - Create agent             ║')
    console.log('║     GET  /api/v1/agents        - List agents              ║')
    console.log('║     POST /api/v1/context/analyze    - Analyze code        ║')
    console.log('║                                                           ║')
    console.log('║   OpenClaw (Protocol v3):                                 ║')
    console.log('║     GET  /api/v1/openclaw/status    - Gateway status      ║')
    console.log('║     POST /api/v1/openclaw/connect   - Connect to Gateway  ║')
    console.log('║     GET  /api/v1/openclaw/skills    - List skills         ║')
    console.log('║     POST /api/v1/openclaw/responses - OpenResponses API   ║')
    console.log('║     GET  /api/v1/openclaw/presence  - Device presence     ║')
    console.log('║                                                           ║')
    console.log('║   Moltbook (1.6M+ agents):                               ║')
    console.log('║     GET  /api/v1/moltbook/status   - Platform status      ║')
    console.log('║     POST /api/v1/moltbook/register - Register agent       ║')
    console.log('║     POST /api/v1/moltbook/identity/verify - Verify agent  ║')
    console.log('║     GET  /api/v1/moltbook/feed     - Agent feed           ║')
    console.log('║     GET  /api/v1/moltbook/discover - Discover agents      ║')
    console.log('║                                                           ║')
    console.log('╚═══════════════════════════════════════════════════════════╝')
    console.log('')
  })
}

createServer().catch(console.error)
