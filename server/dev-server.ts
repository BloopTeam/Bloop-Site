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

  // API Routes - must come BEFORE Vite middleware
  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() })
  })

  app.use('/api/v1/chat', chatRouter)
  app.use('/api/v1/models', modelsRouter)
  app.use('/api/v1/agents', agentRouter)
  app.use('/api/v1/context', contextRouter)

  // Collaboration endpoints (mock for now)
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

  // Use Vite's connect instance as middleware for frontend
  app.use(vite.middlewares)

  app.listen(PORT, () => {
    console.log('')
    console.log('╔═══════════════════════════════════════════════════════════╗')
    console.log('║                                                           ║')
    console.log('║   🚀 Bloop Development Server                             ║')
    console.log('║                                                           ║')
    console.log(`║   ➜  Local:   http://localhost:${PORT}/                      ║`)
    console.log('║                                                           ║')
    console.log('║   Frontend + Backend running on SAME port                 ║')
    console.log('║                                                           ║')
    console.log('╚═══════════════════════════════════════════════════════════╝')
    console.log('')
  })
}

createServer().catch(console.error)
