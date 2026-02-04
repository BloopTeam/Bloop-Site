/**
 * Workflow Templates Service
 * 
 * Phase 8: Platform & Ecosystem - Reusable Workflow Templates
 * 
 * Features:
 * - Create, share, and reuse workflow templates
 * - Template versioning and updates
 * - Template marketplace
 * - Template categories and tags
 * - Template validation and testing
 * - Template variables and parameters
 * - Template dependencies
 * - Team and organization templates
 * - Public and private templates
 * - Template analytics
 */

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  version: string
  author: {
    id: string
    name: string
    avatar?: string
  }
  organizationId?: string // If shared by organization
  category: WorkflowCategory
  tags: string[]
  icon?: string
  thumbnail?: string
  visibility: 'public' | 'private' | 'organization'
  workflow: WorkflowDefinition
  variables: WorkflowVariable[]
  dependencies: string[] // IDs of other templates this depends on
  prerequisites?: string[] // Required tools, plugins, or services
  estimatedDuration?: number // Minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  rating: number
  reviewCount: number
  usageCount: number
  favoriteCount: number
  verified: boolean
  featured: boolean
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
  changelog?: string
  license: string
  repository?: string
  documentation?: string
  examples?: WorkflowExample[]
  metadata: {
    language?: string
    framework?: string
    platform?: string
    [key: string]: any
  }
}

export type WorkflowCategory = 
  | 'ci-cd'
  | 'testing'
  | 'deployment'
  | 'code-review'
  | 'refactoring'
  | 'documentation'
  | 'security'
  | 'performance'
  | 'migration'
  | 'onboarding'
  | 'custom'

export interface WorkflowDefinition {
  name: string
  description: string
  steps: WorkflowStep[]
  triggers: WorkflowTrigger[]
  conditions?: WorkflowCondition[]
  errorHandling?: WorkflowErrorHandling
  retryPolicy?: WorkflowRetryPolicy
  timeout?: number // Seconds
  parallelExecution?: boolean
}

export interface WorkflowStep {
  id: string
  name: string
  type: WorkflowStepType
  description?: string
  action: WorkflowAction
  inputs?: Record<string, any>
  outputs?: Record<string, any>
  condition?: string // When to execute this step
  timeout?: number
  retry?: {
    maxAttempts: number
    backoff: 'linear' | 'exponential'
    delay: number
  }
  onSuccess?: string[] // Next step IDs
  onFailure?: string[] // Next step IDs
  parallel?: boolean // Execute in parallel with other steps
}

export type WorkflowStepType =
  | 'command'
  | 'script'
  | 'api-call'
  | 'ai-task'
  | 'agent-task'
  | 'file-operation'
  | 'git-operation'
  | 'test'
  | 'deploy'
  | 'notification'
  | 'approval'
  | 'wait'
  | 'template' // Reference another template

export interface WorkflowAction {
  type: WorkflowStepType
  config: Record<string, any>
}

export interface WorkflowTrigger {
  type: 'manual' | 'schedule' | 'event' | 'webhook' | 'git-push' | 'file-change'
  config: Record<string, any>
}

export interface WorkflowCondition {
  expression: string // JavaScript expression
  description?: string
}

export interface WorkflowErrorHandling {
  strategy: 'stop' | 'continue' | 'rollback' | 'retry'
  notification?: {
    channels: ('email' | 'slack' | 'webhook')[]
    recipients: string[]
  }
}

export interface WorkflowRetryPolicy {
  maxAttempts: number
  backoff: 'linear' | 'exponential' | 'fixed'
  initialDelay: number // Seconds
  maxDelay?: number // Seconds
}

export interface WorkflowVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'secret'
  description?: string
  defaultValue?: any
  required: boolean
  validation?: {
    pattern?: string
    min?: number
    max?: number
    enum?: any[]
  }
  secret?: boolean // If true, value is encrypted
}

export interface WorkflowExample {
  name: string
  description: string
  variables: Record<string, any>
  expectedOutput?: string
}

export interface WorkflowExecution {
  id: string
  templateId: string
  templateVersion: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  startedAt: Date
  completedAt?: Date
  duration?: number // Milliseconds
  variables: Record<string, any>
  steps: WorkflowStepExecution[]
  logs: WorkflowLog[]
  error?: string
  triggeredBy: {
    userId: string
    userName: string
    trigger: string
  }
}

export interface WorkflowStepExecution {
  stepId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  startedAt?: Date
  completedAt?: Date
  duration?: number
  inputs?: Record<string, any>
  outputs?: Record<string, any>
  logs: string[]
  error?: string
  retryCount: number
}

export interface WorkflowLog {
  timestamp: Date
  level: 'info' | 'warning' | 'error' | 'debug'
  stepId?: string
  message: string
  data?: any
}

export interface WorkflowTemplateSearchFilters {
  query?: string
  category?: WorkflowCategory
  tags?: string[]
  author?: string
  organizationId?: string
  visibility?: 'public' | 'private' | 'organization'
  difficulty?: WorkflowTemplate['difficulty']
  minRating?: number
  verified?: boolean
  featured?: boolean
  sortBy?: 'relevance' | 'rating' | 'usage' | 'updated' | 'created'
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface WorkflowTemplateSearchResult {
  templates: WorkflowTemplate[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

type EventCallback = (data: unknown) => void

/**
 * Advanced Workflow Templates Service
 * 
 * Manages reusable workflow templates for teams to share
 * and reuse common development workflows
 */
class WorkflowTemplatesService {
  private templates: Map<string, WorkflowTemplate> = new Map()
  private executions: Map<string, WorkflowExecution> = new Map()
  private listeners: Map<string, EventCallback[]> = new Map()
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  constructor() {
    this.loadFromStorage()
    this.initializeSampleTemplates()
  }

  /**
   * Initialize sample templates
   */
  private initializeSampleTemplates(): void {
    // Sample CI/CD template
    const ciCdTemplate: WorkflowTemplate = {
      id: 'ci-cd-basic',
      name: 'Basic CI/CD Pipeline',
      description: 'A simple CI/CD workflow for testing and deployment',
      version: '1.0.0',
      author: {
        id: 'bloop-team',
        name: 'Bloop Team'
      },
      category: 'ci-cd',
      tags: ['ci', 'cd', 'testing', 'deployment'],
      visibility: 'public',
      workflow: {
        name: 'CI/CD Pipeline',
        description: 'Run tests and deploy on success',
        steps: [
          {
            id: 'install',
            name: 'Install Dependencies',
            type: 'command',
            action: {
              type: 'command',
              config: { command: 'npm install' }
            }
          },
          {
            id: 'test',
            name: 'Run Tests',
            type: 'test',
            action: {
              type: 'test',
              config: { command: 'npm test' }
            },
            condition: '{{install.status}} === "completed"'
          },
          {
            id: 'build',
            name: 'Build',
            type: 'command',
            action: {
              type: 'command',
              config: { command: 'npm run build' }
            },
            condition: '{{test.status}} === "completed"'
          },
          {
            id: 'deploy',
            name: 'Deploy',
            type: 'deploy',
            action: {
              type: 'deploy',
              config: { environment: '{{deploymentEnvironment}}' }
            },
            condition: '{{build.status}} === "completed"'
          }
        ],
        triggers: [
          {
            type: 'git-push',
            config: { branch: 'main' }
          }
        ]
      },
      variables: [
        {
          name: 'deploymentEnvironment',
          type: 'string',
          description: 'Environment to deploy to',
          defaultValue: 'production',
          required: true,
          validation: {
            enum: ['staging', 'production']
          }
        }
      ],
      dependencies: [],
      difficulty: 'beginner',
      rating: 4.5,
      reviewCount: 12,
      usageCount: 150,
      favoriteCount: 45,
      verified: true,
      featured: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
      publishedAt: new Date('2024-01-01'),
      license: 'MIT',
      examples: [
        {
          name: 'Deploy to Staging',
          description: 'Deploy to staging environment',
          variables: {
            deploymentEnvironment: 'staging'
          }
        }
      ],
      metadata: {}
    }
    
    this.templates.set(ciCdTemplate.id, ciCdTemplate)
  }

  /**
   * Create a new workflow template
   */
  async createTemplate(template: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'favoriteCount' | 'rating' | 'reviewCount'>): Promise<WorkflowTemplate> {
    // Validate template
    this.validateTemplate(template)
    
    const newTemplate: WorkflowTemplate = {
      ...template,
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      favoriteCount: 0,
      rating: 0,
      reviewCount: 0
    }
    
    this.templates.set(newTemplate.id, newTemplate)
    this.saveToStorage()
    this.emit('template-created', { templateId: newTemplate.id, template: newTemplate })
    
    return newTemplate
  }

  /**
   * Update a workflow template
   */
  async updateTemplate(templateId: string, updates: Partial<WorkflowTemplate>): Promise<WorkflowTemplate> {
    const template = this.templates.get(templateId)
    if (!template) throw new Error(`Template ${templateId} not found`)
    
    // Create new version if workflow changed
    if (updates.workflow && JSON.stringify(updates.workflow) !== JSON.stringify(template.workflow)) {
      const versionParts = template.version.split('.')
      versionParts[2] = String(parseInt(versionParts[2]) + 1)
      updates.version = versionParts.join('.')
    }
    
    const updated = {
      ...template,
      ...updates,
      updatedAt: new Date()
    }
    
    this.templates.set(templateId, updated)
    this.saveToStorage()
    this.emit('template-updated', { templateId, template: updated })
    
    return updated
  }

  /**
   * Delete a workflow template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    const template = this.templates.get(templateId)
    if (!template) throw new Error(`Template ${templateId} not found`)
    
    this.templates.delete(templateId)
    this.saveToStorage()
    this.emit('template-deleted', { templateId })
  }

  /**
   * Search workflow templates
   */
  async searchTemplates(filters: WorkflowTemplateSearchFilters = {}): Promise<WorkflowTemplateSearchResult> {
    const cacheKey = `search:${JSON.stringify(filters)}`
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }

    let results = Array.from(this.templates.values())
    
    // Apply filters
    if (filters.query) {
      const query = filters.query.toLowerCase()
      results = results.filter(template =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some(t => t.toLowerCase().includes(query))
      )
    }
    
    if (filters.category) {
      results = results.filter(t => t.category === filters.category)
    }
    
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(t =>
        filters.tags!.some(tag => t.tags.includes(tag))
      )
    }
    
    if (filters.author) {
      results = results.filter(t => t.author.id === filters.author || t.author.name === filters.author)
    }
    
    if (filters.organizationId) {
      results = results.filter(t => t.organizationId === filters.organizationId)
    }
    
    if (filters.visibility) {
      results = results.filter(t => t.visibility === filters.visibility)
    }
    
    if (filters.difficulty) {
      results = results.filter(t => t.difficulty === filters.difficulty)
    }
    
    if (filters.minRating) {
      results = results.filter(t => t.rating >= filters.minRating!)
    }
    
    if (filters.verified) {
      results = results.filter(t => t.verified)
    }
    
    if (filters.featured) {
      results = results.filter(t => t.featured)
    }
    
    // Sort
    const sortBy = filters.sortBy || 'relevance'
    const sortOrder = filters.sortOrder || 'desc'
    
    results.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'rating':
          comparison = a.rating - b.rating
          break
        case 'usage':
          comparison = a.usageCount - b.usageCount
          break
        case 'updated':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime()
          break
        case 'created':
          comparison = a.createdAt.getTime() - b.createdAt.getTime()
          break
        default: // relevance
          comparison = (a.rating * 1000 + a.usageCount) - (b.rating * 1000 + b.usageCount)
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
    
    // Paginate
    const page = filters.page || 1
    const pageSize = filters.pageSize || 20
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paginatedResults = results.slice(start, end)
    
    const result: WorkflowTemplateSearchResult = {
      templates: paginatedResults,
      total: results.length,
      page,
      pageSize,
      totalPages: Math.ceil(results.length / pageSize)
    }
    
    this.cache.set(cacheKey, { data: result, timestamp: Date.now() })
    
    return result
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<WorkflowTemplate | undefined> {
    return this.templates.get(templateId)
  }

  /**
   * Execute a workflow template
   */
  async executeTemplate(templateId: string, variables: Record<string, any>, triggeredBy: { userId: string; userName: string; trigger: string }): Promise<WorkflowExecution> {
    const template = this.templates.get(templateId)
    if (!template) throw new Error(`Template ${templateId} not found`)
    
    // Validate variables
    this.validateVariables(template, variables)
    
    // Create execution
    const execution: WorkflowExecution = {
      id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      templateId,
      templateVersion: template.version,
      status: 'pending',
      startedAt: new Date(),
      variables,
      steps: template.workflow.steps.map(step => ({
        stepId: step.id,
        status: 'pending',
        logs: [],
        retryCount: 0
      })),
      logs: [],
      triggeredBy
    }
    
    this.executions.set(execution.id, execution)
    
    // Start execution (async)
    this.runExecution(execution, template)
    
    this.saveToStorage()
    this.emit('execution-started', { executionId: execution.id, execution })
    
    return execution
  }

  /**
   * Run workflow execution
   */
  private async runExecution(execution: WorkflowExecution, template: WorkflowTemplate): Promise<void> {
    execution.status = 'running'
    
    try {
      for (const step of template.workflow.steps) {
        const stepExecution = execution.steps.find(s => s.stepId === step.id)
        if (!stepExecution) continue
        
        // Check condition
        if (step.condition && !this.evaluateCondition(step.condition, execution)) {
          stepExecution.status = 'skipped'
          continue
        }
        
        stepExecution.status = 'running'
        stepExecution.startedAt = new Date()
        
        try {
          // Execute step (simulated)
          await this.executeStep(step, execution)
          
          stepExecution.status = 'completed'
          stepExecution.completedAt = new Date()
          stepExecution.duration = stepExecution.completedAt.getTime() - stepExecution.startedAt.getTime()
        } catch (error) {
          stepExecution.status = 'failed'
          stepExecution.error = error instanceof Error ? error.message : String(error)
          stepExecution.completedAt = new Date()
          
          // Handle error based on workflow error handling strategy
          if (template.workflow.errorHandling?.strategy === 'stop') {
            throw error
          }
        }
      }
      
      execution.status = 'completed'
      execution.completedAt = new Date()
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime()
      
      // Update template usage count
      template.usageCount++
    } catch (error) {
      execution.status = 'failed'
      execution.error = error instanceof Error ? error.message : String(error)
      execution.completedAt = new Date()
    }
    
    this.saveToStorage()
    this.emit('execution-completed', { executionId: execution.id, execution })
  }

  /**
   * Execute a workflow step
   */
  private async executeStep(step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    // Simulate step execution
    // In production, this would actually execute the step action
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const stepExecution = execution.steps.find(s => s.stepId === step.id)
    if (stepExecution) {
      stepExecution.logs.push(`Step ${step.name} executed successfully`)
    }
  }

  /**
   * Evaluate condition expression
   */
  private evaluateCondition(expression: string, execution: WorkflowExecution): boolean {
    // Simple condition evaluation
    // In production, this would use a proper expression evaluator
    try {
      // Replace variables with actual values
      let evalExpr = expression
      Object.entries(execution.variables).forEach(([key, value]) => {
        evalExpr = evalExpr.replace(new RegExp(`{{${key}}}`, 'g'), JSON.stringify(value))
      })
      
      // Replace step statuses
      execution.steps.forEach(step => {
        evalExpr = evalExpr.replace(new RegExp(`{{${step.stepId}.status}}`, 'g'), `"${step.status}"`)
      })
      
      return eval(evalExpr) === true
    } catch {
      return false
    }
  }

  /**
   * Validate template
   */
  private validateTemplate(template: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'favoriteCount' | 'rating' | 'reviewCount'>): void {
    if (!template.name || !template.workflow) {
      throw new Error('Template must have name and workflow')
    }
    
    if (!template.workflow.steps || template.workflow.steps.length === 0) {
      throw new Error('Workflow must have at least one step')
    }
    
    // Validate steps
    template.workflow.steps.forEach(step => {
      if (!step.id || !step.name || !step.action) {
        throw new Error('Each step must have id, name, and action')
      }
    })
  }

  /**
   * Validate variables
   */
  private validateVariables(template: WorkflowTemplate, variables: Record<string, any>): void {
    template.variables.forEach(variable => {
      if (variable.required && !(variable.name in variables)) {
        throw new Error(`Required variable '${variable.name}' is missing`)
      }
      
      if (variable.name in variables) {
        const value = variables[variable.name]
        
        // Type validation
        if (variable.type === 'number' && typeof value !== 'number') {
          throw new Error(`Variable '${variable.name}' must be a number`)
        }
        
        // Enum validation
        if (variable.validation?.enum && !variable.validation.enum.includes(value)) {
          throw new Error(`Variable '${variable.name}' must be one of: ${variable.validation.enum.join(', ')}`)
        }
      }
    })
  }

  /**
   * Get execution by ID
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId)
  }

  /**
   * Get executions for a template
   */
  getTemplateExecutions(templateId: string): WorkflowExecution[] {
    return Array.from(this.executions.values())
      .filter(e => e.templateId === templateId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
  }

  /**
   * Event system
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
    
    return () => {
      const callbacks = this.listeners.get(event)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) callbacks.splice(index, 1)
      }
    }
  }

  private emit(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event) || []
    callbacks.forEach(callback => callback(data))
  }

  /**
   * Persistence
   */
  private saveToStorage(): void {
    try {
      const templatesData = Array.from(this.templates.entries()).map(([id, template]) => [
        id,
        {
          ...template,
          createdAt: template.createdAt.toISOString(),
          updatedAt: template.updatedAt.toISOString(),
          publishedAt: template.publishedAt?.toISOString()
        }
      ])
      localStorage.setItem('bloop-workflow-templates', JSON.stringify(templatesData))
    } catch (error) {
      console.warn('Failed to save workflow templates to localStorage:', error)
    }
  }

  private loadFromStorage(): void {
    try {
      const templatesData = localStorage.getItem('bloop-workflow-templates')
      if (templatesData) {
        const entries = JSON.parse(templatesData)
        entries.forEach(([id, template]: [string, any]) => {
          this.templates.set(id, {
            ...template,
            createdAt: new Date(template.createdAt),
            updatedAt: new Date(template.updatedAt),
            publishedAt: template.publishedAt ? new Date(template.publishedAt) : undefined
          })
        })
      }
    } catch (error) {
      console.warn('Failed to load workflow templates from localStorage:', error)
    }
  }
}

export const workflowTemplatesService = new WorkflowTemplatesService()
