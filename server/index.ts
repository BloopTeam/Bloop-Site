/**
 * Bloop Backend Server - Node.js/TypeScript
 * Easy to run, no Rust installation required
 */
import express from 'express'
import cors from 'cors'
import compression from 'compression'
import dotenv from 'dotenv'
import { chatRouter } from './api/routes/chat.js'
import { agentRouter } from './api/routes/agents.js'
import { contextRouter } from './api/routes/context.js'
import { modelsRouter } from './api/routes/models.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(compression())
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Bloop Backend API',
    version: '0.1.0',
    endpoints: {
      health: '/health',
      chat: '/api/v1/chat',
      agents: '/api/v1/agents',
      context: '/api/v1/context'
    },
    docs: 'See README.md for API documentation'
  })
})

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

app.use('/api/v1/chat', chatRouter)
app.use('/api/v1/models', modelsRouter)
app.use('/api/v1/agents', agentRouter)
app.use('/api/v1/context', contextRouter)

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Bloop Backend running on http://localhost:${PORT}`)
  console.log(`✅ Health check: http://localhost:${PORT}/health`)
})
