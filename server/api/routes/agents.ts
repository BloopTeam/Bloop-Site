/**
 * Agent API route handlers
 * Full agent lifecycle: create, get, list, execute, delete
 */
import { Router } from 'express'
import { ModelRouter } from '../../services/ai/router.js'
import { v4 as uuidv4 } from 'uuid'

export const agentRouter = Router()
const router = new ModelRouter()

// In-memory agent store (persists for server lifetime)
interface Agent {
  id: string
  name: string
  type: string
  status: 'idle' | 'running' | 'completed' | 'failed'
  capabilities: string[]
  model?: string
  systemPrompt: string
  memory: Array<{ role: string; content: string; timestamp: string }>
  tasks: AgentTask[]
  metrics: {
    tasksCompleted: number
    tasksTotal: number
    avgResponseTime: number
    successRate: number
  }
  createdAt: string
  lastActiveAt: string
}

interface AgentTask {
  id: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: string
  startedAt?: string
  completedAt?: string
  duration?: number
}

const agents = new Map<string, Agent>()

// Default agent types
const defaultAgentTypes: Record<string, { name: string; systemPrompt: string; capabilities: string[] }> = {
  'code-reviewer': {
    name: 'Code Reviewer',
    systemPrompt: 'You are an expert code reviewer. Analyze code for bugs, performance issues, security vulnerabilities, and adherence to best practices. Provide specific, actionable feedback with line-level suggestions.',
    capabilities: ['code-analysis', 'bug-detection', 'security-review', 'performance-review'],
  },
  'debugger': {
    name: 'Debugger Agent',
    systemPrompt: 'You are an expert debugging agent. Analyze error messages, stack traces, and code to identify root causes of bugs. Suggest specific fixes with code examples.',
    capabilities: ['error-analysis', 'stack-trace-parsing', 'root-cause-analysis', 'fix-suggestions'],
  },
  'architect': {
    name: 'Software Architect',
    systemPrompt: 'You are a senior software architect. Design scalable, maintainable system architectures. Evaluate trade-offs between different approaches and provide detailed technical recommendations.',
    capabilities: ['system-design', 'architecture-review', 'tech-stack-evaluation', 'scalability-analysis'],
  },
  'test-writer': {
    name: 'Test Writer',
    systemPrompt: 'You are a testing expert. Write comprehensive unit tests, integration tests, and end-to-end tests. Ensure high code coverage and test edge cases.',
    capabilities: ['unit-testing', 'integration-testing', 'e2e-testing', 'test-coverage'],
  },
  'doc-generator': {
    name: 'Documentation Generator',
    systemPrompt: 'You are a technical writing expert. Generate clear, comprehensive documentation including API docs, README files, inline comments, and architectural decision records.',
    capabilities: ['api-docs', 'readme-generation', 'inline-comments', 'adr-writing'],
  },
  'security-auditor': {
    name: 'Security Auditor',
    systemPrompt: 'You are a cybersecurity expert. Audit code for security vulnerabilities including OWASP Top 10, injection attacks, authentication flaws, and data exposure risks. Provide remediation steps.',
    capabilities: ['vulnerability-scanning', 'owasp-analysis', 'auth-review', 'data-protection'],
  },
  'perplexity-researcher': {
    name: 'Perplexity Research Agent',
    systemPrompt: 'You are a research agent powered by Perplexity with real-time web search. Find the latest documentation, best practices, library updates, and solutions to technical problems. Always cite sources.',
    capabilities: ['web-search', 'documentation-lookup', 'library-research', 'best-practices'],
  },
}

// Create agent
agentRouter.post('/create', async (req, res) => {
  try {
    const { type, name, model, systemPrompt } = req.body

    if (!type && !systemPrompt) {
      return res.status(400).json({ error: 'Either "type" (predefined) or "systemPrompt" (custom) is required' })
    }

    const agentType = defaultAgentTypes[type]
    const agent: Agent = {
      id: uuidv4(),
      name: name || agentType?.name || 'Custom Agent',
      type: type || 'custom',
      status: 'idle',
      capabilities: agentType?.capabilities || ['general'],
      model: model || undefined,
      systemPrompt: systemPrompt || agentType?.systemPrompt || 'You are a helpful AI assistant.',
      memory: [],
      tasks: [],
      metrics: {
        tasksCompleted: 0,
        tasksTotal: 0,
        avgResponseTime: 0,
        successRate: 100,
      },
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    }

    agents.set(agent.id, agent)

    res.status(201).json({ agent })
  } catch (error) {
    console.error('Agent creation error:', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create agent' })
  }
})

// List all agents
agentRouter.get('/', async (req, res) => {
  try {
    const agentList = Array.from(agents.values()).map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      status: a.status,
      capabilities: a.capabilities,
      metrics: a.metrics,
      createdAt: a.createdAt,
      lastActiveAt: a.lastActiveAt,
    }))

    res.json({
      agents: agentList,
      total: agentList.length,
      available_types: Object.keys(defaultAgentTypes),
    })
  } catch (error) {
    console.error('Agent list error:', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to list agents' })
  }
})

// Get agent by ID
agentRouter.get('/:id', async (req, res) => {
  try {
    const agent = agents.get(req.params.id)
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    res.json({ agent })
  } catch (error) {
    console.error('Agent fetch error:', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch agent' })
  }
})

// Execute a task on an agent
agentRouter.post('/:id/execute', async (req, res) => {
  try {
    const agent = agents.get(req.params.id)
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    const { task, context } = req.body
    if (!task) {
      return res.status(400).json({ error: 'Task description is required' })
    }

    const taskId = uuidv4()
    const agentTask: AgentTask = {
      id: taskId,
      description: task,
      status: 'running',
      startedAt: new Date().toISOString(),
    }

    agent.status = 'running'
    agent.tasks.push(agentTask)
    agent.metrics.tasksTotal++
    agent.lastActiveAt = new Date().toISOString()

    // Build messages with agent's system prompt and memory
    const messages = [
      { role: 'system' as const, content: agent.systemPrompt },
      ...agent.memory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: context ? `Context:\n${context}\n\nTask: ${task}` : task },
    ]

    // Determine which provider to use
    // For perplexity-researcher type, prefer Perplexity
    let modelOverride = agent.model
    if (agent.type === 'perplexity-researcher' && !modelOverride) {
      modelOverride = 'perplexity'
    }

    const startTime = Date.now()

    // Select model and generate
    const modelInfo = router.selectBestModel({
      messages,
      model: modelOverride,
    })

    const service = router.getService(modelInfo.provider)
    if (!service) {
      throw new Error('No AI service available for this agent')
    }

    const response = await service.generate({
      messages,
      model: modelInfo.model,
      temperature: 0.7,
      maxTokens: 4000,
    })

    const duration = Date.now() - startTime

    // Update task
    agentTask.status = 'completed'
    agentTask.result = response.content
    agentTask.completedAt = new Date().toISOString()
    agentTask.duration = duration

    // Update agent memory
    agent.memory.push(
      { role: 'user', content: task, timestamp: new Date().toISOString() },
      { role: 'assistant', content: response.content, timestamp: new Date().toISOString() }
    )

    // Keep memory bounded (last 20 exchanges)
    if (agent.memory.length > 40) {
      agent.memory = agent.memory.slice(-40)
    }

    // Update metrics
    agent.status = 'idle'
    agent.metrics.tasksCompleted++
    agent.metrics.avgResponseTime = (
      (agent.metrics.avgResponseTime * (agent.metrics.tasksCompleted - 1) + duration) /
      agent.metrics.tasksCompleted
    )
    agent.metrics.successRate = (agent.metrics.tasksCompleted / agent.metrics.tasksTotal) * 100

    res.json({
      task: agentTask,
      response: response.content,
      model: modelInfo.model,
      provider: modelInfo.provider,
      usage: response.usage,
      duration,
    })
  } catch (error) {
    console.error('Agent execution error:', error)

    // Mark task as failed
    const agent = agents.get(req.params.id)
    if (agent) {
      agent.status = 'idle'
      const lastTask = agent.tasks[agent.tasks.length - 1]
      if (lastTask) {
        lastTask.status = 'failed'
        lastTask.completedAt = new Date().toISOString()
      }
    }

    res.status(500).json({ error: error instanceof Error ? error.message : 'Agent execution failed' })
  }
})

// Delete agent
agentRouter.delete('/:id', async (req, res) => {
  try {
    const existed = agents.delete(req.params.id)
    if (!existed) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    res.json({ message: 'Agent deleted', id: req.params.id })
  } catch (error) {
    console.error('Agent delete error:', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete agent' })
  }
})

// Get available agent types
agentRouter.get('/types/list', async (req, res) => {
  res.json({
    types: Object.entries(defaultAgentTypes).map(([key, value]) => ({
      type: key,
      name: value.name,
      capabilities: value.capabilities,
    })),
  })
})
