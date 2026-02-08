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
  role?: import('../types/roles').RoleAllocation  // Specialized role allocation
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
  agentId: string
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
   * Initialize default agents for active providers
   */
  private initializeSampleAgents(): void {
    // Clear stale agents that reference old model IDs no longer available
    const activeModelIds = ['claude-opus-4-6', 'gpt-4o', 'gemini-2.0-flash', 'mistral-large-2512']
    const staleIds: string[] = []
    this.agents.forEach((agent, id) => {
      if (agent.agent?.model && !activeModelIds.includes(agent.agent.model) && agent.author.id === 'bloop-team') {
        staleIds.push(id)
      }
    })
    staleIds.forEach(id => this.agents.delete(id))

    const defaultAgents: SharedAgent[] = [
      {
        id: 'claude-opus-code-reviewer',
        name: 'Claude Opus 4.6 — Code Reviewer',
        description: 'Expert code review powered by Claude Opus 4.6. Analyzes quality, security, performance, and best practices with deep reasoning.',
        version: '1.0.0',
        author: { id: 'bloop-team', name: 'Bloop Team' },
        category: 'code-review',
        tags: ['code-review', 'security', 'quality', 'anthropic', 'claude'],
        visibility: 'public',
        agent: {
          name: 'Claude Opus 4.6 — Code Reviewer',
          description: 'Deep code review with expert-level reasoning',
          model: 'claude-opus-4-6',
          temperature: 0.3,
          maxTokens: 8192,
          systemPrompt: 'You are an expert code reviewer powered by Claude Opus 4.6. Analyze code for quality, security, performance, and best practices. Provide specific, actionable feedback with line-level suggestions.',
          instructions: [
            'Review code for security vulnerabilities (OWASP Top 10)',
            'Check for code quality and maintainability issues',
            'Suggest performance improvements',
            'Identify potential bugs and edge cases',
            'Verify adherence to best practices'
          ],
          capabilities: [
            { name: 'security-analysis', description: 'Deep security vulnerability analysis', type: 'code-analysis' },
            { name: 'quality-review', description: 'Code quality and style review', type: 'code-review' },
            { name: 'bug-detection', description: 'Identify potential bugs and edge cases', type: 'debugging' }
          ],
          constraints: [{ type: 'token-limit', value: 8192, unit: 'tokens' }],
          errorHandling: { strategy: 'retry', maxRetries: 3 }
        },
        tools: [
          {
            id: 'security-scanner',
            name: 'Security Scanner',
            description: 'Scan code for security vulnerabilities',
            type: 'function',
            definition: { function: { name: 'scanSecurity', parameters: { code: 'string', language: 'string' }, returns: 'SecurityReport' } },
            permissions: ['code-read']
          }
        ],
        dependencies: [],
        difficulty: 'intermediate',
        rating: 4.9,
        reviewCount: 128,
        usageCount: 3400,
        favoriteCount: 890,
        verified: true,
        featured: true,
        createdAt: new Date('2026-01-15'),
        updatedAt: new Date('2026-02-01'),
        publishedAt: new Date('2026-01-15'),
        license: 'MIT',
        examples: [
          { name: 'Review React Component', description: 'Review a React component for security and quality', input: 'function UserProfile({ user }) { ... }', output: 'Security: No XSS vulnerabilities. Quality: Add prop types, memoize expensive renders.' }
        ],
        metadata: { language: 'typescript', framework: 'react', model: 'claude-opus-4-6' }
      },
      {
        id: 'gpt4o-coder',
        name: 'GPT-4o — Code Generator',
        description: 'Versatile code generation agent powered by GPT-4o. Generates clean, production-ready code across languages and frameworks.',
        version: '1.0.0',
        author: { id: 'bloop-team', name: 'Bloop Team' },
        category: 'code-generation',
        tags: ['code-generation', 'openai', 'gpt-4o', 'full-stack', 'multimodal'],
        visibility: 'public',
        agent: {
          name: 'GPT-4o — Code Generator',
          description: 'Fast, versatile code generation with multimodal understanding',
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 4096,
          systemPrompt: 'You are a senior software engineer powered by GPT-4o. Generate clean, well-documented, production-ready code. Follow modern best practices, use proper typing, and include error handling.',
          instructions: [
            'Generate production-ready code with proper structure',
            'Include TypeScript types and interfaces',
            'Add comprehensive error handling',
            'Write clean, self-documenting code',
            'Follow SOLID principles'
          ],
          capabilities: [
            { name: 'code-generation', description: 'Generate production-ready code', type: 'code-generation' },
            { name: 'refactoring', description: 'Refactor and improve existing code', type: 'refactoring' },
            { name: 'api-design', description: 'Design and implement APIs', type: 'code-generation' }
          ],
          constraints: [{ type: 'token-limit', value: 4096, unit: 'tokens' }],
          errorHandling: { strategy: 'retry', maxRetries: 2 }
        },
        tools: [
          {
            id: 'code-formatter',
            name: 'Code Formatter',
            description: 'Format generated code',
            type: 'function',
            definition: { function: { name: 'formatCode', parameters: { code: 'string', language: 'string' }, returns: 'string' } },
            permissions: ['code-read', 'code-write']
          }
        ],
        dependencies: [],
        difficulty: 'beginner',
        rating: 4.7,
        reviewCount: 95,
        usageCount: 2800,
        favoriteCount: 720,
        verified: true,
        featured: true,
        createdAt: new Date('2026-01-15'),
        updatedAt: new Date('2026-02-01'),
        publishedAt: new Date('2026-01-15'),
        license: 'MIT',
        examples: [
          { name: 'Create REST API', description: 'Generate a REST API endpoint with validation', input: 'Create a user registration endpoint with email validation', output: 'Complete Express route with validation, error handling, and TypeScript types.' }
        ],
        metadata: { language: 'typescript', framework: 'express', model: 'gpt-4o' }
      },
      {
        id: 'gemini-researcher',
        name: 'Gemini 2.0 Flash — Research Agent',
        description: 'Ultra-fast research and analysis agent with 1M token context. Ideal for analyzing large codebases, documents, and complex problems.',
        version: '1.0.0',
        author: { id: 'bloop-team', name: 'Bloop Team' },
        category: 'data-analysis',
        tags: ['research', 'analysis', 'google', 'gemini', 'long-context', 'fast'],
        visibility: 'public',
        agent: {
          name: 'Gemini 2.0 Flash — Research Agent',
          description: 'Ultra-fast analysis with massive 1M token context window',
          model: 'gemini-2.0-flash',
          temperature: 0.5,
          maxTokens: 8192,
          systemPrompt: 'You are a research and analysis agent powered by Gemini 2.0 Flash with a 1M token context window. Analyze large codebases, documentation, and complex technical problems. Provide thorough analysis with actionable insights.',
          instructions: [
            'Analyze large codebases and documentation',
            'Identify architectural patterns and anti-patterns',
            'Provide comprehensive technical reports',
            'Cross-reference multiple sources',
            'Suggest evidence-based improvements'
          ],
          capabilities: [
            { name: 'codebase-analysis', description: 'Analyze entire codebases with massive context', type: 'code-analysis' },
            { name: 'doc-analysis', description: 'Analyze documentation and technical specs', type: 'documentation' },
            { name: 'pattern-detection', description: 'Detect architectural patterns and issues', type: 'code-analysis' }
          ],
          constraints: [{ type: 'token-limit', value: 8192, unit: 'tokens' }],
          errorHandling: { strategy: 'retry', maxRetries: 2 }
        },
        tools: [
          {
            id: 'context-analyzer',
            name: 'Context Analyzer',
            description: 'Analyze project context and dependencies',
            type: 'function',
            definition: { function: { name: 'analyzeContext', parameters: { projectPath: 'string', depth: 'number' }, returns: 'ContextReport' } },
            permissions: ['code-read']
          }
        ],
        dependencies: [],
        difficulty: 'intermediate',
        rating: 4.8,
        reviewCount: 67,
        usageCount: 1950,
        favoriteCount: 510,
        verified: true,
        featured: true,
        createdAt: new Date('2026-01-20'),
        updatedAt: new Date('2026-02-01'),
        publishedAt: new Date('2026-01-20'),
        license: 'MIT',
        examples: [
          { name: 'Analyze Codebase Architecture', description: 'Analyze a full codebase for patterns and issues', input: 'Analyze the src/ directory for architectural patterns', output: 'Comprehensive report on component structure, data flow, and improvement areas.' }
        ],
        metadata: { language: 'typescript', model: 'gemini-2.0-flash' }
      },
      {
        id: 'mistral-creative',
        name: 'Mistral Large — Creative Engineer',
        description: 'Creative coding agent powered by Mistral Large. Excels at innovative solutions, UI/UX design implementation, and multilingual projects.',
        version: '1.0.0',
        author: { id: 'bloop-team', name: 'Bloop Team' },
        category: 'code-generation',
        tags: ['creative', 'ui-design', 'mistral', 'multilingual', 'css', 'frontend'],
        visibility: 'public',
        agent: {
          name: 'Mistral Large — Creative Engineer',
          description: 'Creative solutions with a balance of innovation and precision',
          model: 'mistral-large-2512',
          temperature: 0.8,
          maxTokens: 4096,
          systemPrompt: 'You are a creative software engineer powered by Mistral Large. You excel at innovative solutions, beautiful UI implementations, and elegant code architecture. Balance creativity with production-quality code.',
          instructions: [
            'Design creative and elegant solutions',
            'Implement modern, beautiful UI components',
            'Write clean, creative code architecture',
            'Support multilingual projects',
            'Balance innovation with maintainability'
          ],
          capabilities: [
            { name: 'ui-generation', description: 'Generate modern UI components and layouts', type: 'code-generation' },
            { name: 'creative-architecture', description: 'Design creative yet practical architectures', type: 'code-generation' },
            { name: 'css-mastery', description: 'Advanced CSS and styling solutions', type: 'code-generation' }
          ],
          constraints: [{ type: 'token-limit', value: 4096, unit: 'tokens' }],
          errorHandling: { strategy: 'retry', maxRetries: 2 }
        },
        tools: [
          {
            id: 'design-system',
            name: 'Design System',
            description: 'Access design tokens and component patterns',
            type: 'function',
            definition: { function: { name: 'getDesignTokens', parameters: { theme: 'string' }, returns: 'DesignTokens' } },
            permissions: ['code-read']
          }
        ],
        dependencies: [],
        difficulty: 'intermediate',
        rating: 4.6,
        reviewCount: 52,
        usageCount: 1600,
        favoriteCount: 420,
        verified: true,
        featured: true,
        createdAt: new Date('2026-01-18'),
        updatedAt: new Date('2026-02-01'),
        publishedAt: new Date('2026-01-18'),
        license: 'MIT',
        examples: [
          { name: 'Design Dashboard', description: 'Create a modern analytics dashboard', input: 'Design a dark-theme analytics dashboard with charts', output: 'Complete React dashboard with Tailwind styling, chart components, and responsive layout.' }
        ],
        metadata: { language: 'typescript', framework: 'react', model: 'mistral-large-2512' }
      },
      {
        id: 'claude-debugger',
        name: 'Claude Opus 4.6 — Debugger',
        description: 'Advanced debugging agent with expert reasoning. Analyzes errors, traces root causes, and provides precise fixes.',
        version: '1.0.0',
        author: { id: 'bloop-team', name: 'Bloop Team' },
        category: 'debugging',
        tags: ['debugging', 'error-analysis', 'anthropic', 'claude', 'root-cause'],
        visibility: 'public',
        agent: {
          name: 'Claude Opus 4.6 — Debugger',
          description: 'Expert-level debugging with deep reasoning',
          model: 'claude-opus-4-6',
          temperature: 0.2,
          maxTokens: 8192,
          systemPrompt: 'You are an expert debugging agent powered by Claude Opus 4.6. Analyze error messages, stack traces, and code to identify root causes. Think step by step, consider multiple hypotheses, and provide precise fixes with code examples.',
          instructions: [
            'Analyze error messages and stack traces',
            'Identify root causes through step-by-step reasoning',
            'Consider multiple failure hypotheses',
            'Provide precise code fixes',
            'Suggest preventive measures'
          ],
          capabilities: [
            { name: 'error-analysis', description: 'Analyze errors and stack traces', type: 'debugging' },
            { name: 'root-cause', description: 'Identify root causes of bugs', type: 'debugging' },
            { name: 'fix-generation', description: 'Generate precise code fixes', type: 'debugging' }
          ],
          constraints: [{ type: 'token-limit', value: 8192, unit: 'tokens' }],
          errorHandling: { strategy: 'retry', maxRetries: 3 }
        },
        tools: [
          {
            id: 'stack-trace-parser',
            name: 'Stack Trace Parser',
            description: 'Parse and analyze stack traces',
            type: 'function',
            definition: { function: { name: 'parseStackTrace', parameters: { trace: 'string', language: 'string' }, returns: 'ParsedTrace' } },
            permissions: ['code-read']
          }
        ],
        dependencies: [],
        difficulty: 'advanced',
        rating: 4.8,
        reviewCount: 73,
        usageCount: 2100,
        favoriteCount: 650,
        verified: true,
        featured: true,
        createdAt: new Date('2026-01-15'),
        updatedAt: new Date('2026-02-01'),
        publishedAt: new Date('2026-01-15'),
        license: 'MIT',
        examples: [
          { name: 'Debug TypeError', description: 'Analyze and fix a TypeError', input: 'TypeError: Cannot read properties of undefined (reading "map")', output: 'Root cause: API response is undefined when network fails. Fix: Add null check and loading state.' }
        ],
        metadata: { language: 'typescript', model: 'claude-opus-4-6' }
      },
      {
        id: 'gpt4o-test-writer',
        name: 'GPT-4o — Test Writer',
        description: 'Comprehensive test generation agent. Writes unit tests, integration tests, and edge case coverage with high quality.',
        version: '1.0.0',
        author: { id: 'bloop-team', name: 'Bloop Team' },
        category: 'testing',
        tags: ['testing', 'unit-tests', 'openai', 'gpt-4o', 'coverage'],
        visibility: 'public',
        agent: {
          name: 'GPT-4o — Test Writer',
          description: 'Generate comprehensive test suites with edge case coverage',
          model: 'gpt-4o',
          temperature: 0.5,
          maxTokens: 4096,
          systemPrompt: 'You are a testing expert powered by GPT-4o. Write comprehensive, well-structured tests including unit tests, integration tests, and edge case coverage. Use modern testing frameworks and follow testing best practices.',
          instructions: [
            'Generate unit tests with full coverage',
            'Write integration tests for API endpoints',
            'Cover edge cases and error scenarios',
            'Use describe/it blocks with clear names',
            'Include setup and teardown helpers'
          ],
          capabilities: [
            { name: 'unit-testing', description: 'Generate unit tests', type: 'testing' },
            { name: 'integration-testing', description: 'Generate integration tests', type: 'testing' },
            { name: 'edge-case-coverage', description: 'Cover edge cases and error paths', type: 'testing' }
          ],
          constraints: [{ type: 'token-limit', value: 4096, unit: 'tokens' }],
          errorHandling: { strategy: 'retry', maxRetries: 2 }
        },
        tools: [
          {
            id: 'test-runner',
            name: 'Test Runner',
            description: 'Run generated tests',
            type: 'function',
            definition: { function: { name: 'runTests', parameters: { testFile: 'string', framework: 'string' }, returns: 'TestResults' } },
            permissions: ['code-read', 'code-write']
          }
        ],
        dependencies: [],
        difficulty: 'beginner',
        rating: 4.6,
        reviewCount: 41,
        usageCount: 1400,
        favoriteCount: 380,
        verified: true,
        featured: true,
        createdAt: new Date('2026-01-20'),
        updatedAt: new Date('2026-02-01'),
        publishedAt: new Date('2026-01-20'),
        license: 'MIT',
        examples: [
          { name: 'Test API Service', description: 'Generate tests for an API service module', input: 'Write tests for the apiService.fetchModels() function', output: 'Complete test suite with mocked fetch, success/error cases, and response validation.' }
        ],
        metadata: { language: 'typescript', framework: 'vitest', model: 'gpt-4o' }
      },
      {
        id: 'gemini-doc-generator',
        name: 'Gemini 2.0 Flash — Doc Generator',
        description: 'Fast documentation generator with massive context. Reads entire codebases and produces clear, comprehensive docs.',
        version: '1.0.0',
        author: { id: 'bloop-team', name: 'Bloop Team' },
        category: 'documentation',
        tags: ['documentation', 'readme', 'google', 'gemini', 'api-docs'],
        visibility: 'public',
        agent: {
          name: 'Gemini 2.0 Flash — Doc Generator',
          description: 'Ultra-fast documentation with full codebase context',
          model: 'gemini-2.0-flash',
          temperature: 0.4,
          maxTokens: 8192,
          systemPrompt: 'You are a technical documentation expert powered by Gemini 2.0 Flash. Generate clear, comprehensive documentation including API docs, README files, inline comments, and architecture guides. Leverage your massive context window to understand entire codebases.',
          instructions: [
            'Generate comprehensive API documentation',
            'Create clear README files with examples',
            'Write meaningful inline code comments',
            'Produce architecture decision records',
            'Create setup and deployment guides'
          ],
          capabilities: [
            { name: 'api-docs', description: 'Generate API documentation', type: 'documentation' },
            { name: 'readme-generation', description: 'Create README files', type: 'documentation' },
            { name: 'architecture-docs', description: 'Write architecture documentation', type: 'documentation' }
          ],
          constraints: [{ type: 'token-limit', value: 8192, unit: 'tokens' }],
          errorHandling: { strategy: 'retry', maxRetries: 2 }
        },
        tools: [
          {
            id: 'doc-formatter',
            name: 'Doc Formatter',
            description: 'Format documentation in markdown',
            type: 'function',
            definition: { function: { name: 'formatDocs', parameters: { content: 'string', format: 'string' }, returns: 'string' } },
            permissions: ['code-read']
          }
        ],
        dependencies: [],
        difficulty: 'beginner',
        rating: 4.7,
        reviewCount: 38,
        usageCount: 1100,
        favoriteCount: 290,
        verified: true,
        featured: true,
        createdAt: new Date('2026-01-22'),
        updatedAt: new Date('2026-02-01'),
        publishedAt: new Date('2026-01-22'),
        license: 'MIT',
        examples: [
          { name: 'Generate API Docs', description: 'Generate documentation for REST API routes', input: 'Document all endpoints in server/api/routes/', output: 'Complete API reference with endpoint descriptions, request/response schemas, and examples.' }
        ],
        metadata: { language: 'markdown', model: 'gemini-2.0-flash' }
      }
    ]

    // Only add defaults that aren't already present (preserves user modifications)
    defaultAgents.forEach(agent => {
      if (!this.agents.has(agent.id)) {
        this.agents.set(agent.id, agent)
      }
    })
    this.saveToStorage()
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
