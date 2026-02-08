/**
 * Advanced Agent Service
 * Handles specialized agents, memory, chaining, and performance tracking
 */
import { type RoleAllocation, DEFAULT_ROLES, getDefaultRole } from '../types/roles'

export type { RoleAllocation } from '../types/roles'

export type AgentType = 
  | 'code-reviewer' 
  | 'debugger' 
  | 'architect' 
  | 'test-writer' 
  | 'doc-generator'
  | 'optimizer'
  | 'security-auditor'
  | 'refactorer'

export interface AgentCapability {
  id: string
  name: string
  description: string
  enabled: boolean
}

export interface AgentConfig {
  id: string
  type: AgentType
  name: string
  description: string
  icon: string
  color: string
  role: RoleAllocation               // Specialized role allocation
  capabilities: AgentCapability[]
  permissions: {
    canRead: boolean
    canWrite: boolean
    canExecute: boolean
    canAccessNetwork: boolean
  }
  memory: {
    enabled: boolean
    maxContextSize: number
    retentionDays: number
  }
  behavior: {
    autoTrigger: boolean
    triggerPatterns: string[]
    priority: 'low' | 'medium' | 'high'
    maxConcurrent: number
  }
}

export interface AgentMemoryEntry {
  id: string
  agentId: string
  type: 'context' | 'decision' | 'preference' | 'pattern'
  content: string
  metadata: Record<string, unknown>
  createdAt: Date
  expiresAt?: Date
}

export interface AgentTask {
  id: string
  agentId: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  input: unknown
  output?: unknown
  error?: string
  startedAt?: Date
  completedAt?: Date
  duration?: number
  tokens?: number
}

export interface AgentChain {
  id: string
  name: string
  description: string
  steps: {
    agentType: AgentType
    condition?: string
    input?: string
    output?: string
  }[]
  triggers: string[]
}

export interface AgentMetrics {
  agentId: string
  totalTasks: number
  successfulTasks: number
  failedTasks: number
  averageResponseTime: number
  totalTokensUsed: number
  lastActive: Date
}

// Default agent configurations
const DEFAULT_AGENTS: AgentConfig[] = [
  {
    id: 'code-reviewer',
    type: 'code-reviewer',
    name: 'Code Reviewer',
    description: 'Reviews code for quality, best practices, and potential issues',
    icon: '🔍',
    color: '#3b82f6',
    role: DEFAULT_ROLES['code-reviewer'],
    capabilities: [
      { id: 'syntax-check', name: 'Syntax Analysis', description: 'Check for syntax issues', enabled: true },
      { id: 'style-check', name: 'Style Guide', description: 'Enforce coding style', enabled: true },
      { id: 'security-scan', name: 'Security Scan', description: 'Find security vulnerabilities', enabled: true },
      { id: 'performance-hints', name: 'Performance Hints', description: 'Suggest optimizations', enabled: false }
    ],
    permissions: { canRead: true, canWrite: false, canExecute: false, canAccessNetwork: false },
    memory: { enabled: true, maxContextSize: 50000, retentionDays: 30 },
    behavior: { autoTrigger: true, triggerPatterns: ['*.ts', '*.tsx', '*.js'], priority: 'medium', maxConcurrent: 3 }
  },
  {
    id: 'debugger',
    type: 'debugger',
    name: 'Debug Assistant',
    description: 'Helps identify and fix bugs in your code',
    icon: '🐛',
    color: '#ef4444',
    role: DEFAULT_ROLES['debugger'],
    capabilities: [
      { id: 'error-analysis', name: 'Error Analysis', description: 'Analyze error messages', enabled: true },
      { id: 'stack-trace', name: 'Stack Trace Parser', description: 'Parse and explain stack traces', enabled: true },
      { id: 'variable-tracking', name: 'Variable Tracking', description: 'Track variable values', enabled: true },
      { id: 'breakpoint-suggest', name: 'Breakpoint Suggestions', description: 'Suggest debugging breakpoints', enabled: true }
    ],
    permissions: { canRead: true, canWrite: true, canExecute: true, canAccessNetwork: false },
    memory: { enabled: true, maxContextSize: 100000, retentionDays: 7 },
    behavior: { autoTrigger: true, triggerPatterns: ['error', 'exception', 'bug'], priority: 'high', maxConcurrent: 1 }
  },
  {
    id: 'architect',
    type: 'architect',
    name: 'System Architect',
    description: 'Designs system architecture and provides structural guidance',
    icon: '🏗️',
    color: '#8b5cf6',
    role: DEFAULT_ROLES['architect'],
    capabilities: [
      { id: 'design-patterns', name: 'Design Patterns', description: 'Suggest appropriate patterns', enabled: true },
      { id: 'dependency-analysis', name: 'Dependency Analysis', description: 'Analyze module dependencies', enabled: true },
      { id: 'scalability-review', name: 'Scalability Review', description: 'Evaluate scaling concerns', enabled: true },
      { id: 'api-design', name: 'API Design', description: 'Guide API structure', enabled: true }
    ],
    permissions: { canRead: true, canWrite: false, canExecute: false, canAccessNetwork: true },
    memory: { enabled: true, maxContextSize: 200000, retentionDays: 90 },
    behavior: { autoTrigger: false, triggerPatterns: [], priority: 'low', maxConcurrent: 1 }
  },
  {
    id: 'test-writer',
    type: 'test-writer',
    name: 'Test Generator',
    description: 'Automatically generates comprehensive test suites',
    icon: '🧪',
    color: '#22c55e',
    role: DEFAULT_ROLES['test-writer'],
    capabilities: [
      { id: 'unit-tests', name: 'Unit Tests', description: 'Generate unit tests', enabled: true },
      { id: 'integration-tests', name: 'Integration Tests', description: 'Generate integration tests', enabled: true },
      { id: 'edge-cases', name: 'Edge Cases', description: 'Test edge cases', enabled: true },
      { id: 'mocking', name: 'Mock Generation', description: 'Create test mocks', enabled: true }
    ],
    permissions: { canRead: true, canWrite: true, canExecute: true, canAccessNetwork: false },
    memory: { enabled: true, maxContextSize: 50000, retentionDays: 14 },
    behavior: { autoTrigger: false, triggerPatterns: ['*.test.ts', '*.spec.ts'], priority: 'medium', maxConcurrent: 2 }
  },
  {
    id: 'doc-generator',
    type: 'doc-generator',
    name: 'Documentation Writer',
    description: 'Generates and maintains documentation',
    icon: '📝',
    color: '#f59e0b',
    role: DEFAULT_ROLES['doc-generator'],
    capabilities: [
      { id: 'jsdoc', name: 'JSDoc Comments', description: 'Generate JSDoc comments', enabled: true },
      { id: 'readme', name: 'README Generation', description: 'Create README files', enabled: true },
      { id: 'api-docs', name: 'API Documentation', description: 'Document APIs', enabled: true },
      { id: 'changelog', name: 'Changelog Updates', description: 'Update changelogs', enabled: false }
    ],
    permissions: { canRead: true, canWrite: true, canExecute: false, canAccessNetwork: false },
    memory: { enabled: true, maxContextSize: 30000, retentionDays: 30 },
    behavior: { autoTrigger: false, triggerPatterns: [], priority: 'low', maxConcurrent: 1 }
  },
  {
    id: 'security-auditor',
    type: 'security-auditor',
    name: 'Security Auditor',
    description: 'Scans for security vulnerabilities and suggests fixes',
    icon: '🔒',
    color: '#dc2626',
    role: DEFAULT_ROLES['security-auditor'],
    capabilities: [
      { id: 'vuln-scan', name: 'Vulnerability Scan', description: 'Detect known vulnerabilities', enabled: true },
      { id: 'secrets-detection', name: 'Secrets Detection', description: 'Find exposed secrets', enabled: true },
      { id: 'dependency-audit', name: 'Dependency Audit', description: 'Audit npm packages', enabled: true },
      { id: 'owasp-check', name: 'OWASP Compliance', description: 'Check OWASP guidelines', enabled: true }
    ],
    permissions: { canRead: true, canWrite: false, canExecute: false, canAccessNetwork: true },
    memory: { enabled: true, maxContextSize: 100000, retentionDays: 60 },
    behavior: { autoTrigger: true, triggerPatterns: ['*.env', 'package.json', 'config.*'], priority: 'high', maxConcurrent: 1 }
  }
]

class AdvancedAgentService {
  private agents: Map<string, AgentConfig> = new Map()
  private memory: Map<string, AgentMemoryEntry[]> = new Map()
  private tasks: AgentTask[] = []
  private chains: AgentChain[] = []
  private metrics: Map<string, AgentMetrics> = new Map()

  constructor() {
    this.loadAgents()
    this.loadMemory()
    this.loadMetrics()
  }

  private loadAgents() {
    const stored = localStorage.getItem('bloop-agents')
    if (stored) {
      const agents: AgentConfig[] = JSON.parse(stored)
      agents.forEach(a => {
        // Backfill role for agents created before role system existed
        if (!a.role) {
          a.role = getDefaultRole(a.type)
        }
        this.agents.set(a.id, a)
      })
    } else {
      DEFAULT_AGENTS.forEach(a => this.agents.set(a.id, a))
      this.saveAgents()
    }
  }

  private saveAgents() {
    localStorage.setItem('bloop-agents', JSON.stringify(Array.from(this.agents.values())))
  }

  private loadMemory() {
    const stored = localStorage.getItem('bloop-agent-memory')
    if (stored) {
      const entries: AgentMemoryEntry[] = JSON.parse(stored)
      entries.forEach(e => {
        if (!this.memory.has(e.agentId)) {
          this.memory.set(e.agentId, [])
        }
        this.memory.get(e.agentId)!.push(e)
      })
    }
  }

  private saveMemory() {
    const allMemory: AgentMemoryEntry[] = []
    this.memory.forEach(entries => allMemory.push(...entries))
    localStorage.setItem('bloop-agent-memory', JSON.stringify(allMemory))
  }

  private loadMetrics() {
    const stored = localStorage.getItem('bloop-agent-metrics')
    if (stored) {
      const metrics: AgentMetrics[] = JSON.parse(stored)
      metrics.forEach(m => this.metrics.set(m.agentId, m))
    } else {
      // Initialize metrics for all agents
      this.agents.forEach((agent, id) => {
        this.metrics.set(id, {
          agentId: id,
          totalTasks: Math.floor(Math.random() * 100) + 10,
          successfulTasks: Math.floor(Math.random() * 80) + 10,
          failedTasks: Math.floor(Math.random() * 10),
          averageResponseTime: Math.floor(Math.random() * 2000) + 500,
          totalTokensUsed: Math.floor(Math.random() * 100000) + 10000,
          lastActive: new Date(Date.now() - Math.random() * 86400000)
        })
      })
      this.saveMetrics()
    }
  }

  private saveMetrics() {
    localStorage.setItem('bloop-agent-metrics', JSON.stringify(Array.from(this.metrics.values())))
  }

  // Agent Management
  getAllAgents(): AgentConfig[] {
    return Array.from(this.agents.values())
  }

  getAgent(id: string): AgentConfig | undefined {
    return this.agents.get(id)
  }

  updateAgent(id: string, updates: Partial<AgentConfig>): AgentConfig | undefined {
    const agent = this.agents.get(id)
    if (agent) {
      const updated = { ...agent, ...updates }
      this.agents.set(id, updated)
      this.saveAgents()
      return updated
    }
    return undefined
  }

  updateAgentRole(id: string, roleUpdates: Partial<RoleAllocation>): AgentConfig | undefined {
    const agent = this.agents.get(id)
    if (agent) {
      agent.role = { ...agent.role, ...roleUpdates }
      this.agents.set(id, agent)
      this.saveAgents()
      return agent
    }
    return undefined
  }

  updateAgentCapability(agentId: string, capabilityId: string, enabled: boolean) {
    const agent = this.agents.get(agentId)
    if (agent) {
      agent.capabilities = agent.capabilities.map(c => 
        c.id === capabilityId ? { ...c, enabled } : c
      )
      this.saveAgents()
    }
  }

  // Memory Management
  addMemory(agentId: string, entry: Omit<AgentMemoryEntry, 'id' | 'agentId' | 'createdAt'>): AgentMemoryEntry {
    const fullEntry: AgentMemoryEntry = {
      ...entry,
      id: `mem-${Date.now()}`,
      agentId,
      createdAt: new Date()
    }

    if (!this.memory.has(agentId)) {
      this.memory.set(agentId, [])
    }
    this.memory.get(agentId)!.push(fullEntry)
    this.saveMemory()
    return fullEntry
  }

  getMemory(agentId: string): AgentMemoryEntry[] {
    return this.memory.get(agentId) || []
  }

  clearMemory(agentId: string) {
    this.memory.set(agentId, [])
    this.saveMemory()
  }

  // Task Execution
  async executeTask(agentId: string, input: unknown): Promise<AgentTask> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`)
    }

    const task: AgentTask = {
      id: `task-${Date.now()}`,
      agentId,
      type: agent.type,
      status: 'running',
      input,
      startedAt: new Date()
    }

    this.tasks.push(task)

    // Simulate task execution
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500))

    task.status = Math.random() > 0.1 ? 'completed' : 'failed'
    task.completedAt = new Date()
    task.duration = task.completedAt.getTime() - task.startedAt!.getTime()
    task.tokens = Math.floor(Math.random() * 1000) + 100

    if (task.status === 'completed') {
      task.output = this.generateTaskOutput(agent.type, input)
    } else {
      task.error = 'Simulated error for demonstration'
    }

    // Update metrics
    const metrics = this.metrics.get(agentId)
    if (metrics) {
      metrics.totalTasks++
      if (task.status === 'completed') metrics.successfulTasks++
      else metrics.failedTasks++
      metrics.averageResponseTime = (metrics.averageResponseTime + task.duration) / 2
      metrics.totalTokensUsed += task.tokens || 0
      metrics.lastActive = new Date()
      this.saveMetrics()
    }

    return task
  }

  private generateTaskOutput(type: AgentType, _input: unknown): unknown {
    switch (type) {
      case 'code-reviewer':
        return {
          score: Math.floor(Math.random() * 30) + 70,
          issues: [
            { severity: 'warning', message: 'Consider using const instead of let', line: 15 },
            { severity: 'info', message: 'Function could be simplified', line: 42 }
          ],
          suggestions: ['Add error handling', 'Consider extracting to a utility function']
        }
      case 'debugger':
        return {
          diagnosis: 'Null reference detected in user input processing',
          rootCause: 'Missing null check before accessing property',
          fix: 'Add optional chaining operator (?.) before property access',
          confidence: 0.92
        }
      case 'test-writer':
        return {
          testsGenerated: 5,
          coverage: 85,
          testCode: '// Generated test code...'
        }
      default:
        return { result: 'Task completed successfully' }
    }
  }

  getRecentTasks(limit = 10): AgentTask[] {
    return this.tasks.slice(-limit).reverse()
  }

  // Chain Management
  createChain(chain: Omit<AgentChain, 'id'>): AgentChain {
    const fullChain: AgentChain = {
      ...chain,
      id: `chain-${Date.now()}`
    }
    this.chains.push(fullChain)
    localStorage.setItem('bloop-agent-chains', JSON.stringify(this.chains))
    return fullChain
  }

  getChains(): AgentChain[] {
    return this.chains
  }

  async executeChain(chainId: string, initialInput: unknown): Promise<AgentTask[]> {
    const chain = this.chains.find(c => c.id === chainId)
    if (!chain) {
      throw new Error(`Chain ${chainId} not found`)
    }

    const results: AgentTask[] = []
    let currentInput = initialInput

    for (const step of chain.steps) {
      const agent = Array.from(this.agents.values()).find(a => a.type === step.agentType)
      if (agent) {
        const task = await this.executeTask(agent.id, currentInput)
        results.push(task)
        if (task.status === 'completed') {
          currentInput = task.output
        } else {
          break
        }
      }
    }

    return results
  }

  // Metrics
  getMetrics(agentId: string): AgentMetrics | undefined {
    return this.metrics.get(agentId)
  }

  getAllMetrics(): AgentMetrics[] {
    return Array.from(this.metrics.values())
  }

  getAggregateMetrics(): {
    totalTasks: number
    successRate: number
    averageResponseTime: number
    totalTokens: number
    activeAgents: number
  } {
    const all = this.getAllMetrics()
    const totalTasks = all.reduce((sum, m) => sum + m.totalTasks, 0)
    const successfulTasks = all.reduce((sum, m) => sum + m.successfulTasks, 0)
    
    return {
      totalTasks,
      successRate: totalTasks > 0 ? (successfulTasks / totalTasks) * 100 : 0,
      averageResponseTime: all.reduce((sum, m) => sum + m.averageResponseTime, 0) / all.length,
      totalTokens: all.reduce((sum, m) => sum + m.totalTokensUsed, 0),
      activeAgents: all.filter(m => (Date.now() - new Date(m.lastActive).getTime()) < 3600000).length
    }
  }
}

export const advancedAgentService = new AdvancedAgentService()
