/**
 * Agent Orchestration Service
 * Coordinates multiple agents, manages complex multi-step tasks, and provides intelligent routing
 */

import { reasoningEngine, ReasoningResult, ExecutionPhase, ExecutionTask } from './reasoning'
import { advancedAgentService, AgentConfig, AgentTask } from './advancedAgents'

export interface OrchestrationTask {
  id: string
  name: string
  description: string
  status: 'pending' | 'reasoning' | 'planning' | 'executing' | 'completed' | 'failed'
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  reasoning?: ReasoningResult
  phases: OrchestrationPhase[]
  agentTasks: AgentTask[]
  generatedFiles: GeneratedFile[]
  errors: OrchestrationError[]
  progress: number
  logs: OrchestrationLog[]
}

export interface OrchestrationPhase {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  tasks: PhaseTask[]
  startedAt?: Date
  completedAt?: Date
  duration?: number
}

export interface PhaseTask {
  id: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  agentId?: string
  output?: unknown
  error?: string
  file?: string
  code?: string
}

export interface GeneratedFile {
  path: string
  content: string
  language: string
  createdAt: Date
  size: number
  hash: string
}

export interface OrchestrationError {
  phase: string
  task: string
  message: string
  timestamp: Date
  recoverable: boolean
}

export interface OrchestrationLog {
  timestamp: Date
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  data?: unknown
}

type EventCallback = (data: unknown) => void

class OrchestrationService {
  private currentTask: OrchestrationTask | null = null
  private taskHistory: OrchestrationTask[] = []
  private eventListeners: Map<string, Set<EventCallback>> = new Map()
  private abortController: AbortController | null = null

  constructor() {
    this.loadHistory()
  }

  private loadHistory() {
    const stored = localStorage.getItem('bloop-orchestration-history')
    if (stored) {
      this.taskHistory = JSON.parse(stored)
    }
  }

  private saveHistory() {
    // Keep only last 20 tasks
    const toSave = this.taskHistory.slice(-20)
    localStorage.setItem('bloop-orchestration-history', JSON.stringify(toSave))
  }

  // Event system
  on(event: string, callback: EventCallback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(callback)
  }

  off(event: string, callback: EventCallback) {
    this.eventListeners.get(event)?.delete(callback)
  }

  private emit(event: string, data: unknown) {
    this.eventListeners.get(event)?.forEach(cb => cb(data))
  }

  private log(level: OrchestrationLog['level'], message: string, data?: unknown) {
    const log: OrchestrationLog = { timestamp: new Date(), level, message, data }
    if (this.currentTask) {
      this.currentTask.logs.push(log)
      this.emit('log', log)
    }
  }

  /**
   * Main entry point - orchestrates a complete task from user input
   */
  async executeTask(input: string): Promise<OrchestrationTask> {
    this.abortController = new AbortController()

    // Initialize task
    const task: OrchestrationTask = {
      id: `orch-${Date.now()}`,
      name: this.extractTaskName(input),
      description: input,
      status: 'pending',
      createdAt: new Date(),
      phases: [],
      agentTasks: [],
      generatedFiles: [],
      errors: [],
      progress: 0,
      logs: []
    }

    this.currentTask = task
    this.emit('task:started', task)
    this.log('info', 'Starting orchestration', { input })

    try {
      // Phase 1: Reasoning
      task.status = 'reasoning'
      task.startedAt = new Date()
      this.emit('status:changed', { status: 'reasoning', progress: 5 })
      this.log('info', 'Beginning reasoning phase')

      const reasoning = await reasoningEngine.reason(input)
      task.reasoning = reasoning
      task.progress = 20
      this.emit('reasoning:complete', reasoning)
      this.log('info', 'Reasoning complete', { 
        steps: reasoning.steps.length, 
        complexity: reasoning.estimatedComplexity 
      })

      // Phase 2: Planning
      task.status = 'planning'
      this.emit('status:changed', { status: 'planning', progress: 25 })
      this.log('info', 'Creating execution phases')

      task.phases = this.createPhases(reasoning)
      task.progress = 30
      this.emit('phases:created', task.phases)

      // Phase 3: Execution
      task.status = 'executing'
      this.emit('status:changed', { status: 'executing', progress: 35 })
      this.log('info', 'Beginning execution', { phases: task.phases.length })

      await this.executePhases(task)

      // Complete
      task.status = 'completed'
      task.completedAt = new Date()
      task.progress = 100
      this.emit('task:completed', task)
      this.log('info', 'Task completed successfully', {
        files: task.generatedFiles.length,
        duration: task.completedAt.getTime() - task.startedAt!.getTime()
      })

    } catch (error: any) {
      task.status = 'failed'
      task.completedAt = new Date()
      task.errors.push({
        phase: 'orchestration',
        task: 'main',
        message: error.message || 'Unknown error',
        timestamp: new Date(),
        recoverable: false
      })
      this.emit('task:failed', { task, error })
      this.log('error', 'Task failed', { error: error.message })
    }

    this.taskHistory.push(task)
    this.saveHistory()
    this.currentTask = null

    return task
  }

  /**
   * Execute all phases sequentially
   */
  private async executePhases(task: OrchestrationTask) {
    const totalPhases = task.phases.length
    let completedPhases = 0

    for (const phase of task.phases) {
      if (this.abortController?.signal.aborted) {
        throw new Error('Task aborted by user')
      }

      phase.status = 'running'
      phase.startedAt = new Date()
      this.emit('phase:started', phase)
      this.log('info', `Starting phase: ${phase.name}`)

      try {
        await this.executePhase(phase, task)
        
        phase.status = 'completed'
        phase.completedAt = new Date()
        phase.duration = phase.completedAt.getTime() - phase.startedAt.getTime()
        
        completedPhases++
        task.progress = 35 + Math.floor((completedPhases / totalPhases) * 60)
        
        this.emit('phase:completed', phase)
        this.log('info', `Phase completed: ${phase.name}`, { duration: phase.duration })
        
      } catch (error: any) {
        phase.status = 'failed'
        phase.completedAt = new Date()
        task.errors.push({
          phase: phase.id,
          task: 'phase-execution',
          message: error.message,
          timestamp: new Date(),
          recoverable: true
        })
        this.emit('phase:failed', { phase, error })
        this.log('error', `Phase failed: ${phase.name}`, { error: error.message })
        
        // Try to continue with remaining phases
        continue
      }
    }
  }

  /**
   * Execute a single phase with all its tasks
   */
  private async executePhase(phase: OrchestrationPhase, task: OrchestrationTask) {
    for (const phaseTask of phase.tasks) {
      if (this.abortController?.signal.aborted) {
        throw new Error('Task aborted by user')
      }

      phaseTask.status = 'running'
      this.emit('phase-task:started', { phase, task: phaseTask })

      try {
        // Route to appropriate agent
        const agent = this.selectAgent(phaseTask)
        if (agent) {
          phaseTask.agentId = agent.id
          this.log('debug', `Routing to agent: ${agent.name}`, { task: phaseTask.id })

          // Execute with agent
          const agentTask = await advancedAgentService.executeTask(agent.id, {
            description: phaseTask.description,
            file: phaseTask.file
          })
          
          task.agentTasks.push(agentTask)
          phaseTask.output = agentTask.output
        }

        // Generate file if needed
        if (phaseTask.file) {
          const generatedFile = await this.generateFile(phaseTask, task)
          if (generatedFile) {
            task.generatedFiles.push(generatedFile)
            this.emit('file:generated', generatedFile)
            this.log('info', `Generated file: ${generatedFile.path}`)
          }
        }

        phaseTask.status = 'completed'
        this.emit('phase-task:completed', { phase, task: phaseTask })

      } catch (error: any) {
        phaseTask.status = 'failed'
        phaseTask.error = error.message
        this.emit('phase-task:failed', { phase, task: phaseTask, error })
        this.log('warn', `Task failed: ${phaseTask.description}`, { error: error.message })
      }

      // Small delay between tasks for better UX
      await this.delay(150)
    }
  }

  /**
   * Select the best agent for a task
   */
  private selectAgent(phaseTask: PhaseTask): AgentConfig | undefined {
    const agents = advancedAgentService.getAllAgents()
    const description = phaseTask.description.toLowerCase()

    // Route based on task type
    if (description.includes('test')) {
      return agents.find(a => a.type === 'test-writer')
    }
    if (description.includes('review') || description.includes('check')) {
      return agents.find(a => a.type === 'code-reviewer')
    }
    if (description.includes('document') || description.includes('doc')) {
      return agents.find(a => a.type === 'doc-generator')
    }
    if (description.includes('debug') || description.includes('fix')) {
      return agents.find(a => a.type === 'debugger')
    }
    if (description.includes('architect') || description.includes('design')) {
      return agents.find(a => a.type === 'architect')
    }
    if (description.includes('security') || description.includes('audit')) {
      return agents.find(a => a.type === 'security-auditor')
    }

    // Default to code reviewer for general tasks
    return agents.find(a => a.type === 'code-reviewer')
  }

  /**
   * Generate a file based on task requirements
   */
  private async generateFile(phaseTask: PhaseTask, _task: OrchestrationTask): Promise<GeneratedFile | null> {
    if (!phaseTask.file) return null

    const path = phaseTask.file
    const language = this.detectLanguage(path)
    const content = phaseTask.code || this.generateFileContent(path, language)

    return {
      path,
      content,
      language,
      createdAt: new Date(),
      size: content.length,
      hash: this.generateHash(content)
    }
  }

  /**
   * Generate appropriate file content based on path and language
   */
  private generateFileContent(path: string, language: string): string {
    const name = path.split('/').pop()?.replace(/\.\w+$/, '') || 'Component'
    const pascalName = name.charAt(0).toUpperCase() + name.slice(1)

    if (language === 'typescript' || language === 'tsx') {
      if (path.includes('components')) {
        return this.generateComponentCode(pascalName)
      }
      if (path.includes('hooks')) {
        return this.generateHookCode(name)
      }
      if (path.includes('services')) {
        return this.generateServiceCode(pascalName)
      }
      if (path.includes('types')) {
        return this.generateTypesCode(pascalName)
      }
    }

    return `// ${path}\n// Generated by Bloop Agent\n\nexport {}`
  }

  private generateComponentCode(name: string): string {
    return `import { useState } from 'react'

interface ${name}Props {
  title?: string
  onAction?: () => void
}

export default function ${name}({ title = '${name}', onAction }: ${name}Props) {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    setIsLoading(true)
    try {
      onAction?.()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      padding: '24px',
      background: '#1a1a1a',
      borderRadius: '12px',
      border: '1px solid #2a2a2a'
    }}>
      <h2 style={{ 
        fontSize: '20px', 
        fontWeight: 600, 
        color: '#fff',
        marginBottom: '16px'
      }}>
        {title}
      </h2>
      
      <button
        onClick={handleClick}
        disabled={isLoading}
        style={{
          padding: '12px 24px',
          background: isLoading ? '#333' : '#FF00FF',
          border: 'none',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '14px',
          fontWeight: 500,
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? 'Loading...' : 'Take Action'}
      </button>
    </div>
  )
}
`
  }

  private generateHookCode(name: string): string {
    const hookName = name.startsWith('use') ? name : `use${name.charAt(0).toUpperCase() + name.slice(1)}`
    
    return `import { useState, useEffect, useCallback } from 'react'

interface ${hookName.replace('use', '')}State {
  data: unknown
  loading: boolean
  error: Error | null
}

export function ${hookName}() {
  const [state, setState] = useState<${hookName.replace('use', '')}State>({
    data: null,
    loading: false,
    error: null
  })

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      // Implement your data fetching logic here
      const result = await Promise.resolve({ message: 'Success' })
      setState(prev => ({ ...prev, data: result, loading: false }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error : new Error('Unknown error'),
        loading: false 
      }))
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refresh = useCallback(() => {
    fetchData()
  }, [fetchData])

  return {
    ...state,
    refresh
  }
}
`
  }

  private generateServiceCode(name: string): string {
    return `/**
 * ${name} Service
 * Handles all ${name.toLowerCase()}-related API operations
 */

interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

class ${name}Service {
  private baseUrl: string

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || '/api'
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(\`\${this.baseUrl}\${endpoint}\`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      })

      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`)
      }

      const data = await response.json()
      return { data, success: true }
    } catch (error) {
      return {
        data: null as T,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getAll<T>(): Promise<ApiResponse<T[]>> {
    return this.request<T[]>('/')
  }

  async getById<T>(id: string): Promise<ApiResponse<T>> {
    return this.request<T>(\`/\${id}\`)
  }

  async create<T>(data: Partial<T>): Promise<ApiResponse<T>> {
    return this.request<T>('/', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async update<T>(id: string, data: Partial<T>): Promise<ApiResponse<T>> {
    return this.request<T>(\`/\${id}\`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(\`/\${id}\`, {
      method: 'DELETE'
    })
  }
}

export const ${name.toLowerCase()}Service = new ${name}Service()
`
  }

  private generateTypesCode(name: string): string {
    return `/**
 * Type definitions for ${name}
 */

export interface ${name} {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface ${name}CreateInput {
  name: string
}

export interface ${name}UpdateInput {
  name?: string
}

export interface ${name}Filter {
  search?: string
  sortBy?: keyof ${name}
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export type ${name}ListResponse = PaginatedResponse<${name}>
`
  }

  private detectLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase()
    const langMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'tsx',
      js: 'javascript',
      jsx: 'jsx',
      css: 'css',
      scss: 'scss',
      json: 'json',
      md: 'markdown'
    }
    return langMap[ext || ''] || 'typescript'
  }

  private generateHash(content: string): string {
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16)
  }

  private extractTaskName(input: string): string {
    const words = input.split(' ').slice(0, 5)
    return words.join(' ') + (input.split(' ').length > 5 ? '...' : '')
  }

  private createPhases(reasoning: ReasoningResult): OrchestrationPhase[] {
    return reasoning.plan.phases.map((phase: ExecutionPhase) => ({
      id: phase.id,
      name: phase.name,
      status: 'pending' as const,
      tasks: phase.tasks.map((task: ExecutionTask) => ({
        id: task.id,
        description: task.description,
        status: 'pending' as const,
        file: task.file,
        code: task.code
      }))
    }))
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Public methods
  getCurrentTask(): OrchestrationTask | null {
    return this.currentTask
  }

  getHistory(): OrchestrationTask[] {
    return this.taskHistory
  }

  abort() {
    if (this.abortController) {
      this.abortController.abort()
      this.log('warn', 'Task aborted by user')
      this.emit('task:aborted', this.currentTask)
    }
  }

  clearHistory() {
    this.taskHistory = []
    localStorage.removeItem('bloop-orchestration-history')
  }
}

export const orchestrationService = new OrchestrationService()
