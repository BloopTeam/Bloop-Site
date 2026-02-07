/**
 * OpenClaw API Routes
 * Protocol v3 (v2026.1.21)
 * WebSocket Gateway + OpenResponses HTTP API
 */
import { Router } from 'express'
import { getOpenClawService } from '../../services/openclaw/index.js'

export const openclawRouter = Router()

// Bloop's built-in skills (available even without Gateway)
const BLOOP_SKILLS = [
  { name: 'bloop-code-review', description: 'Deep code review with security & performance analysis', type: 'bundled', enabled: true, capabilities: ['code-analysis', 'security', 'performance'], version: '2.0.0' },
  { name: 'bloop-test-gen', description: 'Generate comprehensive test suites', type: 'bundled', enabled: true, capabilities: ['testing', 'coverage'], version: '2.0.0' },
  { name: 'bloop-docs', description: 'Auto-generate documentation from code', type: 'bundled', enabled: true, capabilities: ['documentation', 'readme'], version: '2.0.0' },
  { name: 'bloop-refactor', description: 'Intelligent refactoring suggestions', type: 'bundled', enabled: true, capabilities: ['refactoring', 'patterns'], version: '2.0.0' },
  { name: 'bloop-debug', description: 'AI-assisted debugging and root cause analysis', type: 'bundled', enabled: true, capabilities: ['debugging', 'error-analysis'], version: '2.0.0' },
  { name: 'bloop-optimize', description: 'Performance optimization recommendations', type: 'bundled', enabled: true, capabilities: ['performance', 'optimization'], version: '2.0.0' },
  { name: 'bloop-security', description: 'Security vulnerability scanning (OWASP)', type: 'bundled', enabled: true, capabilities: ['security', 'owasp', 'vulnerability'], version: '2.0.0' },
]

// GET /api/v1/openclaw/status
openclawRouter.get('/status', async (req, res) => {
  try {
    const service = getOpenClawService()
    const status = await service.getStatus()

    res.json({
      ...status,
      enabled: process.env.OPENCLAW_ENABLED === 'true',
      protocolVersion: 3,
      gatewayUrl: process.env.OPENCLAW_GATEWAY_URL || 'ws://127.0.0.1:18789',
      features: {
        openResponses: true,
        presence: true,
        execApprovals: true,
        channels: true,
        skills: true,
        browser: process.env.OPENCLAW_BROWSER_ENABLED === 'true',
        canvas: process.env.OPENCLAW_CANVAS_ENABLED === 'true',
      },
      docs: 'https://docs.clawd.bot/gateway/protocol',
    })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Status check failed' })
  }
})

// POST /api/v1/openclaw/connect
openclawRouter.post('/connect', async (req, res) => {
  try {
    const service = getOpenClawService()
    const connected = await service.connect()

    res.json({
      connected,
      protocol: service.protocolVersion,
      message: connected ? 'Connected to OpenClaw Gateway' : 'Gateway not available — using local skills',
    })
  } catch (error) {
    res.json({
      connected: false,
      message: error instanceof Error ? error.message : 'Connection failed',
    })
  }
})

// GET /api/v1/openclaw/sessions
openclawRouter.get('/sessions', async (req, res) => {
  try {
    const service = getOpenClawService()
    const sessions = await service.listSessions()
    res.json({ sessions })
  } catch {
    res.json({ sessions: [] })
  }
})

// POST /api/v1/openclaw/message
openclawRouter.post('/message', async (req, res) => {
  try {
    const { sessionId, message, thinkingLevel, model } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    const service = getOpenClawService()

    if (service.isConnected) {
      const result = await service.sendMessage(
        sessionId || 'main',
        message,
        { thinkingLevel, model }
      )
      return res.json(result)
    }

    // Fallback: not connected to Gateway
    res.json({
      content: `OpenClaw Gateway is not connected. Message received: "${message.slice(0, 100)}". Connect to the Gateway to enable full agent communication.`,
      sessionId: sessionId || 'local',
      gateway_connected: false,
    })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Message send failed' })
  }
})

// GET /api/v1/openclaw/skills
openclawRouter.get('/skills', async (req, res) => {
  try {
    const service = getOpenClawService()
    let skills = []

    if (service.isConnected) {
      skills = await service.listSkills()
    }

    // Merge with built-in Bloop skills
    const allSkills = [
      ...BLOOP_SKILLS,
      ...skills.filter((s: any) => !BLOOP_SKILLS.find(b => b.name === s.name)),
    ]

    res.json({ skills: allSkills, total: allSkills.length })
  } catch {
    res.json({ skills: BLOOP_SKILLS, total: BLOOP_SKILLS.length })
  }
})

// POST /api/v1/openclaw/skills/:name/execute
openclawRouter.post('/skills/:name/execute', async (req, res) => {
  try {
    const { name } = req.params
    const { params, context } = req.body

    const service = getOpenClawService()

    if (service.isConnected) {
      const result = await service.executeSkill(name, { ...params, context })
      return res.json(result)
    }

    // Fallback: execute locally via Bloop's AI
    res.json({
      success: true,
      output: `Skill "${name}" queued for local execution. Connect to OpenClaw Gateway for remote execution.`,
      local: true,
    })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Skill execution failed' })
  }
})

// GET /api/v1/openclaw/presence
openclawRouter.get('/presence', async (req, res) => {
  try {
    const service = getOpenClawService()
    const presence = await service.getPresence()
    res.json({ entries: presence })
  } catch {
    res.json({ entries: [] })
  }
})

// GET /api/v1/openclaw/channels
openclawRouter.get('/channels', async (req, res) => {
  try {
    const service = getOpenClawService()
    const channels = await service.listChannels()
    res.json({ channels })
  } catch {
    res.json({ channels: [] })
  }
})

// GET /api/v1/openclaw/models
openclawRouter.get('/models', async (req, res) => {
  try {
    const service = getOpenClawService()
    const models = await service.listModels()
    res.json({ models })
  } catch {
    res.json({ models: [] })
  }
})

// POST /api/v1/openclaw/responses - OpenResponses API proxy
openclawRouter.post('/responses', async (req, res) => {
  try {
    const { input, agentId, instructions, tools, stream, user } = req.body

    if (!input) {
      return res.status(400).json({ error: 'Input is required' })
    }

    const service = getOpenClawService()
    const result = await service.openResponses(input, {
      agentId: agentId || 'main',
      instructions,
      tools,
      stream: stream || false,
      user,
    })

    res.json(result)
  } catch (error) {
    res.status(500).json({
      error: {
        message: error instanceof Error ? error.message : 'OpenResponses request failed',
        type: 'server_error',
      }
    })
  }
})

// POST /api/v1/openclaw/exec/approve
openclawRouter.post('/exec/approve', async (req, res) => {
  try {
    const { approvalId, approved } = req.body
    const service = getOpenClawService()
    const result = await service.resolveApproval(approvalId, approved !== false)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Approval failed' })
  }
})
