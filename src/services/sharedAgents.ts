/**
 * Shared Agents & Tooling Service
 * 
 * Phase 8: Platform & Ecosystem - Shared Agents and Tooling
 * 
 * Features:
 * - Agent marketplace and sharing
 * - Shared tooling library
 * - Agent templates and presets
 * - Agent collaboration features
 * - Agent versioning
 * - Agent ratings and reviews
 * - Agent discovery and search
 * - Organization agent libraries
 * - Public and private agents
 * - Agent analytics
 */

import { teamOrganizationService } from './teamOrganization'

export interface SharedAgent {
  id: string
  name: string
  description: string
  version: string
  author: {
    id: string
    name: string
    avatar?: string
  }
  organizationId?: string
  category: AgentCategory
  tags: string[]
  icon?: string
  thumbnail?: string
  visibility: 'public' | 'private' | 'organization'
  agent: AgentDefinition
  tools: AgentTool[]
  dependencies: string[] // IDs of other agents or tools
  prerequisites?: string[]
  estimatedCost?: {
    perRequest: number
    currency: string
  }
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
  examples?: AgentExample[]
  metadata: {
    language?: string
    framework?: string
    model?: string
    [key: string]: any
  }
}

export type AgentCategory =
  | 'code-generation'
  | 'code-review'
  | 'testing'
  | 'debugging'
  | 'refactoring'
  | 'documentation'
  | 'security'
  | 'performance'
  | 'deployment'
  | 'data-analysis'
  | 'custom'

export interface AgentDefinition {
  name: string
  description: string
  model: string // AI model to use
  temperature?: number
  maxTokens?: number
  systemPrompt: string
  instructions: string[]
  capabilities: AgentCapability[]
  constraints?: AgentConstraint[]
  errorHandling?: AgentErrorHandling
  retryPolicy?: AgentRetryPolicy
}

export interface AgentCapability {
  name: string
  description: string
  type: 'code-generation' | 'code-analysis' | 'code-review' | 'testing' | 'debugging' | 'refactoring' | 'documentation' | 'custom'
  parameters?: Record<string, any>
}

export interface AgentConstraint {
  type: 'token-limit' | 'time-limit' | 'cost-limit' | 'resource-limit'
  value: number
  unit: string
}

export interface AgentErrorHandling {
  strategy: 'retry' | 'fallback' | 'fail' | 'notify'
  maxRetries?: number
  fallbackAgentId?: string
  notificationChannels?: ('email' | 'slack' | 'webhook')[]
}

export interface AgentRetryPolicy {
  maxAttempts: number
  backoff: 'linear' | 'exponential' | 'fixed'
  initialDelay: number // Seconds
  maxDelay?: number // Seconds
}

export interface AgentTool {
  id: string
  name: string
  description: string
  type: 'function' | 'api' | 'command' | 'script' | 'plugin'
  definition: {
    function?: {
      name: string
      parameters: Record<string, any>
      returns: string
    }
    api?: {
      endpoint: string
      method: 'GET' | 'POST' | 'PUT' | 'DELETE'
      headers?: Record<string, string>
      auth?: {
        type: 'api-key' | 'oauth' | 'bearer'
        config: Record<string, any>
      }
    }
    command?: string
    script?: string
    plugin?: string
  }
  permissions: string[]
  cost?: {
    perCall: number
    currency: string
  }
}

export interface AgentExample {
  name: string
  description: string
  input: string
  output: string
  context?: Record<string, any>
}

export interface AgentExecution {
  id: string
  agentId: string
  agentVersion: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  input: string
  output?: string
  context?: Record<string, any>
  toolsUsed: string[]
  startedAt: Date
  completedAt?: Date
  duration?: number // Milliseconds
  cost?: {
    amount: number
    currency: string
  }
  error?: string
  executedBy: {
    userId: string
    userName: string
  }
}

export interface AgentSearchFilters {
  query?: string
  category?: AgentCategory
  tags?: string[]
  author?: string
  organizationId?: string
  visibility?: 'public' | 'private' | 'organization'
  difficulty?: SharedAgent['difficulty']
  minRating?: number
  verified?: boolean
  featured?: boolean
  model?: string
  sortBy?: 'relevance' | 'rating' | 'usage' | 'updated' | 'created'
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface AgentSearchResult {
  agents: SharedAgent[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface AgentReview {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  rating: number
  title?: string
  comment: string
  helpful: number
  verifiedUsage: boolean
  createdAt: Date
  updatedAt?: Date
  agentVersion?: string
}

type EventCallback = (data: unknown) => void

/**
 * Advanced Shared Agents & Tooling Service
 * 
 * Manages shared agents, tooling library, and agent marketplace
 */
class SharedAgentsService {
  private agents: Map<string, SharedAgent> = new Map()
  private tools: Map<string, AgentTool> = new Map()
  private executions: Map<string, AgentExecution> = new Map()
  private reviews: Map<string, AgentReview> = new Map()
  private listeners: Map<string, EventCallback[]> = new Map()
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  constructor() {
    this.loadFromStorage()
    this.initializeSampleAgents()
  }

  /**
   * Initialize sample agents
   */
  private initializeSampleAgents(): void {
    // Sample code review agent
    const codeReviewAgent: SharedAgent = {
      id: 'code-review-agent',
      name: 'Code Review Agent',
      description: 'AI-powered code review agent that analyzes code quality, security, and best practices',
      version: '1.0.0',
      author: {
        id: 'bloop-team',
        name: 'Bloop Team'
      },
      category: 'code-review',
      tags: ['code-review', 'security', 'quality', 'best-practices'],
      visibility: 'public',
      agent: {
        name: 'Code Review Agent',
        description: 'Comprehensive code review with security and quality analysis',
        model: 'gpt-4-turbo',
        temperature: 0.3,
        maxTokens: 4000,
        systemPrompt: 'You are an expert code reviewer. Analyze code for quality, security, performance, and best practices.',
        instructions: [
          'Review code for security vulnerabilities',
          'Check for code quality issues',
          'Suggest improvements',
          'Identify potential bugs',
          'Verify best practices'
        ],
        capabilities: [
          {
            name: 'security-analysis',
            description: 'Analyze code for security vulnerabilities',
            type: 'code-analysis'
          },
          {
            name: 'quality-check',
            description: 'Check code quality and style',
            type: 'code-review'
          }
        ],
        constraints: [
          {
            type: 'token-limit',
            value: 4000,
            unit: 'tokens'
          }
        ],
        errorHandling: {
          strategy: 'retry',
          maxRetries: 3
        }
      },
      tools: [
        {
          id: 'security-scanner',
          name: 'Security Scanner',
          description: 'Scan code for security vulnerabilities',
          type: 'function',
          definition: {
            function: {
              name: 'scanSecurity',
              parameters: {
                code: 'string',
                language: 'string'
              },
              returns: 'SecurityReport'
            }
          },
          permissions: ['code-read']
        }
      ],
      dependencies: [],
      difficulty: 'intermediate',
      rating: 4.7,
      reviewCount: 45,
      usageCount: 1200,
      favoriteCount: 320,
      verified: true,
      featured: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
      publishedAt: new Date('2024-01-01'),
      license: 'MIT',
      examples: [
        {
          name: 'Review React Component',
          description: 'Review a React component for security and quality',
          input: 'function Component() { ... }',
          output: 'Security: No XSS vulnerabilities found. Quality: Good component structure.'
        }
      ],
      metadata: {
        language: 'typescript',
        framework: 'react'
      }
    }
    
    this.agents.set(codeReviewAgent.id, codeReviewAgent)
  }

  /**
   * Create a new shared agent
   */
  async createAgent(agent: Omit<SharedAgent, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'favoriteCount' | 'rating' | 'reviewCount'>): Promise<SharedAgent> {
    // Validate agent
    this.validateAgent(agent)
    
    const newAgent: SharedAgent = {
      ...agent,
      id: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      favoriteCount: 0,
      rating: 0,
      reviewCount: 0
    }
    
    this.agents.set(newAgent.id, newAgent)
    this.saveToStorage()
    this.emit('agent-created', { agentId: newAgent.id, agent: newAgent })
    
    return newAgent
  }

  /**
   * Update a shared agent
   */
  async updateAgent(agentId: string, updates: Partial<SharedAgent>): Promise<SharedAgent> {
    const agent = this.agents.get(agentId)
    if (!agent) throw new Error(`Agent ${agentId} not found`)
    
    // Create new version if agent definition changed
    if (updates.agent && JSON.stringify(updates.agent) !== JSON.stringify(agent.agent)) {
      const versionParts = agent.version.split('.')
      versionParts[2] = String(parseInt(versionParts[2]) + 1)
      updates.version = versionParts.join('.')
    }
    
    const updated = {
      ...agent,
      ...updates,
      updatedAt: new Date()
    }
    
    this.agents.set(agentId, updated)
    this.saveToStorage()
    this.emit('agent-updated', { agentId, agent: updated })
    
    return updated
  }

  /**
   * Delete a shared agent
   */
  async deleteAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) throw new Error(`Agent ${agentId} not found`)
    
    this.agents.delete(agentId)
    this.saveToStorage()
    this.emit('agent-deleted', { agentId })
  }

  /**
   * Search shared agents
   */
  async searchAgents(filters: AgentSearchFilters = {}): Promise<AgentSearchResult> {
    const cacheKey = `search:${JSON.stringify(filters)}`
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }

    let results = Array.from(this.agents.values())
    
    // Apply filters
    if (filters.query) {
      const query = filters.query.toLowerCase()
      results = results.filter(agent =>
        agent.name.toLowerCase().includes(query) ||
        agent.description.toLowerCase().includes(query) ||
        agent.tags.some(t => t.toLowerCase().includes(query))
      )
    }
    
    if (filters.category) {
      results = results.filter(a => a.category === filters.category)
    }
    
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(a =>
        filters.tags!.some(tag => a.tags.includes(tag))
      )
    }
    
    if (filters.author) {
      results = results.filter(a => a.author.id === filters.author || a.author.name === filters.author)
    }
    
    if (filters.organizationId) {
      results = results.filter(a => a.organizationId === filters.organizationId)
    }
    
    if (filters.visibility) {
      results = results.filter(a => a.visibility === filters.visibility)
    }
    
    if (filters.difficulty) {
      results = results.filter(a => a.difficulty === filters.difficulty)
    }
    
    if (filters.minRating) {
      results = results.filter(a => a.rating >= filters.minRating!)
    }
    
    if (filters.verified) {
      results = results.filter(a => a.verified)
    }
    
    if (filters.featured) {
      results = results.filter(a => a.featured)
    }
    
    if (filters.model) {
      results = results.filter(a => a.agent.model === filters.model)
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
    
    const result: AgentSearchResult = {
      agents: paginatedResults,
      total: results.length,
      page,
      pageSize,
      totalPages: Math.ceil(results.length / pageSize)
    }
    
    this.cache.set(cacheKey, { data: result, timestamp: Date.now() })
    
    return result
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<SharedAgent | undefined> {
    return this.agents.get(agentId)
  }

  /**
   * Execute a shared agent
   */
  async executeAgent(agentId: string, input: string, context: Record<string, any> = {}, executedBy: { userId: string; userName: string }): Promise<AgentExecution> {
    const agent = this.agents.get(agentId)
    if (!agent) throw new Error(`Agent ${agentId} not found`)
    
    // Check visibility permissions
    if (agent.visibility === 'private' && agent.author.id !== executedBy.userId) {
      throw new Error('Agent is private')
    }
    
    if (agent.visibility === 'organization' && agent.organizationId) {
      // Check organization membership
      const userOrgs = teamOrganizationService.getUserOrganizations(executedBy.userId)
      if (!userOrgs.some(org => org.id === agent.organizationId)) {
        throw new Error('Agent is restricted to organization members')
      }
    }
    
    // Create execution
    const execution: AgentExecution = {
      id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      agentVersion: agent.version,
      status: 'pending',
      input,
      context,
      toolsUsed: [],
      startedAt: new Date(),
      executedBy
    }
    
    this.executions.set(execution.id, execution)
    
    // Start execution (async)
    this.runExecution(execution, agent)
    
    // Update usage count
    agent.usageCount++
    
    this.saveToStorage()
    this.emit('execution-started', { executionId: execution.id, execution })
    
    return execution
  }

  /**
   * Run agent execution
   */
  private async runExecution(execution: AgentExecution, agent: SharedAgent): Promise<void> {
    execution.status = 'running'
    
    try {
      // Simulate agent execution
      // In production, this would:
      // 1. Call AI model with agent definition
      // 2. Execute tools as needed
      // 3. Handle errors and retries
      // 4. Calculate costs
      
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate tool usage
      agent.tools.forEach(tool => {
        execution.toolsUsed.push(tool.id)
      })
      
      // Generate output (simulated)
      execution.output = `Agent ${agent.name} processed: ${execution.input.substring(0, 100)}...`
      
      // Calculate cost (simulated)
      if (agent.estimatedCost) {
        execution.cost = {
          amount: agent.estimatedCost.perRequest,
          currency: agent.estimatedCost.currency
        }
      }
      
      execution.status = 'completed'
      execution.completedAt = new Date()
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime()
    } catch (error) {
      execution.status = 'failed'
      execution.error = error instanceof Error ? error.message : String(error)
      execution.completedAt = new Date()
    }
    
    this.saveToStorage()
    this.emit('execution-completed', { executionId: execution.id, execution })
  }

  /**
   * Get agent reviews
   */
  async getAgentReviews(agentId: string, page: number = 1, pageSize: number = 20): Promise<{
    reviews: AgentReview[]
    total: number
    page: number
    pageSize: number
  }> {
    const agentReviews = Array.from(this.reviews.values())
      .filter(r => r.agentId === agentId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paginatedReviews = agentReviews.slice(start, end)
    
    return {
      reviews: paginatedReviews,
      total: agentReviews.length,
      page,
      pageSize
    }
  }

  /**
   * Submit agent review
   */
  async submitReview(agentId: string, review: Omit<AgentReview, 'id' | 'createdAt' | 'updatedAt' | 'agentId'>): Promise<AgentReview> {
    const agent = this.agents.get(agentId)
    if (!agent) throw new Error(`Agent ${agentId} not found`)
    
    const newReview: AgentReview = {
      ...review,
      id: `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    this.reviews.set(newReview.id, newReview)
    
    // Recalculate rating
    const agentReviews = Array.from(this.reviews.values()).filter(r => r.agentId === agentId)
    const totalRating = agentReviews.reduce((sum, r) => sum + r.rating, 0)
    agent.rating = totalRating / agentReviews.length
    agent.reviewCount = agentReviews.length
    
    this.saveToStorage()
    this.emit('review-submitted', { agentId, review: newReview })
    
    return newReview
  }

  /**
   * Get featured agents
   */
  async getFeaturedAgents(limit: number = 10): Promise<SharedAgent[]> {
    return Array.from(this.agents.values())
      .filter(a => a.featured)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit)
  }

  /**
   * Get trending agents
   */
  async getTrendingAgents(limit: number = 10): Promise<SharedAgent[]> {
    // In production, this would use recent usage data
    return Array.from(this.agents.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit)
  }

  /**
   * Get recommended agents
   */
  async getRecommendedAgents(userId: string, limit: number = 10): Promise<SharedAgent[]> {
    // In production, this would use ML/AI based on:
    // - User's past agent usage
    // - User's projects and code
    // - Similar users' preferences
    
    return Array.from(this.agents.values())
      .filter(a => a.visibility === 'public')
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit)
  }

  /**
   * Add tool to library
   */
  async addTool(tool: AgentTool): Promise<AgentTool> {
    if (this.tools.has(tool.id)) {
      throw new Error(`Tool ${tool.id} already exists`)
    }
    
    this.tools.set(tool.id, tool)
    this.saveToStorage()
    this.emit('tool-added', { toolId: tool.id, tool })
    
    return tool
  }

  /**
   * Get tool by ID
   */
  getTool(toolId: string): AgentTool | undefined {
    return this.tools.get(toolId)
  }

  /**
   * Get all tools
   */
  getAllTools(): AgentTool[] {
    return Array.from(this.tools.values())
  }

  /**
   * Get execution by ID
   */
  getExecution(executionId: string): AgentExecution | undefined {
    return this.executions.get(executionId)
  }

  /**
   * Get agent executions
   */
  getAgentExecutions(agentId: string): AgentExecution[] {
    return Array.from(this.executions.values())
      .filter(e => e.agentId === agentId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
  }

  /**
   * Validate agent
   */
  private validateAgent(agent: Omit<SharedAgent, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'favoriteCount' | 'rating' | 'reviewCount'>): void {
    if (!agent.name || !agent.agent) {
      throw new Error('Agent must have name and agent definition')
    }
    
    if (!agent.agent.systemPrompt || !agent.agent.model) {
      throw new Error('Agent definition must have systemPrompt and model')
    }
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
      const agentsData = Array.from(this.agents.entries()).map(([id, agent]) => [
        id,
        {
          ...agent,
          createdAt: agent.createdAt.toISOString(),
          updatedAt: agent.updatedAt.toISOString(),
          publishedAt: agent.publishedAt?.toISOString()
        }
      ])
      localStorage.setItem('bloop-shared-agents', JSON.stringify(agentsData))
      
      const toolsData = Array.from(this.tools.entries())
      localStorage.setItem('bloop-agent-tools', JSON.stringify(toolsData))
    } catch (error) {
      console.warn('Failed to save shared agents to localStorage:', error)
    }
  }

  private loadFromStorage(): void {
    try {
      const agentsData = localStorage.getItem('bloop-shared-agents')
      if (agentsData) {
        const entries = JSON.parse(agentsData)
        entries.forEach(([id, agent]: [string, any]) => {
          this.agents.set(id, {
            ...agent,
            createdAt: new Date(agent.createdAt),
            updatedAt: new Date(agent.updatedAt),
            publishedAt: agent.publishedAt ? new Date(agent.publishedAt) : undefined
          })
        })
      }
      
      const toolsData = localStorage.getItem('bloop-agent-tools')
      if (toolsData) {
        const entries = JSON.parse(toolsData)
        this.tools = new Map(entries)
      }
    } catch (error) {
      console.warn('Failed to load shared agents from localStorage:', error)
    }
  }
}

export const sharedAgentsService = new SharedAgentsService()
