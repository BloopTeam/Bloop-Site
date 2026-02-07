/**
 * API service for communicating with Bloop backend
 */
import { authService } from './auth.js'

// Use relative URL when proxying through Vite, or absolute when VITE_API_URL is set
const API_BASE_URL = import.meta.env.VITE_API_URL || ''

// Set to true to enable API error logging (useful for debugging)
const DEBUG_API = false

// Silent error handler - only logs in debug mode
const logApiError = (context: string, error: unknown) => {
  if (DEBUG_API) {
    console.error(`[API] ${context}:`, error)
  }
}

export interface ModelInfo {
  provider: string
  model: string
  available: boolean
  capabilities: {
    supportsVision: boolean
    supportsFunctionCalling: boolean
    maxContextLength: number
    supportsStreaming: boolean
    costPer1kTokens: {
      input: number
      output: number
    }
    speed: string
    quality: string
  }
}

export interface ModelsResponse {
  models: ModelInfo[]
  total_available: number
  total_providers: number
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

export interface AIRequest {
  messages: AIMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  max_tokens?: number
  stream?: boolean
}

export interface AIResponse {
  content: string
  model: string
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  finishReason?: string
  finish_reason?: string
}

class ApiService {
  private readonly baseUrl: string

  constructor() {
    this.baseUrl = API_BASE_URL
  }

  /**
   * Authenticated fetch — automatically attaches JWT and retries on 401.
   */
  private async authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers)
    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json')
    }

    // Attach auth token
    const authHeaders = authService.getAuthHeaders()
    for (const [key, value] of Object.entries(authHeaders)) {
      headers.set(key, value)
    }

    let res = await fetch(url, { ...options, headers })

    // Auto-refresh on 401
    if (res.status === 401) {
      const newTokens = await authService.refresh()
      if (newTokens) {
        headers.set('Authorization', `Bearer ${newTokens.accessToken}`)
        res = await fetch(url, { ...options, headers })
      }
    }

    return res
  }

  async fetchModels(): Promise<ModelsResponse> {
    try {
      const response = await this.authFetch(`${this.baseUrl}/api/v1/models`)
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      logApiError('Error fetching models', error)
      // Return empty models list if backend is unavailable
      return {
        models: [],
        total_available: 0,
        total_providers: 0
      }
    }
  }

  async sendChatMessage(request: AIRequest): Promise<AIResponse> {
    try {
      // Convert to backend format
      const backendRequest = {
        messages: request.messages,
        model: request.model,
        temperature: request.temperature,
        maxTokens: request.maxTokens || request.max_tokens,
        stream: request.stream
      }

      const response = await this.authFetch(`${this.baseUrl}/api/v1/chat`, {
        method: 'POST',
        body: JSON.stringify(backendRequest),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(error.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      
      // Normalize response format
      return {
        content: data.content,
        model: data.model,
        usage: data.usage ? {
          promptTokens: data.usage.promptTokens || data.usage.prompt_tokens,
          completionTokens: data.usage.completionTokens || data.usage.completion_tokens,
          totalTokens: data.usage.totalTokens || data.usage.total_tokens,
        } : undefined,
        finishReason: data.finishReason || data.finish_reason,
      }
    } catch (error) {
      logApiError('Error sending chat message', error)
      throw error
    }
  }

  async checkHealth(): Promise<{ status: string }> {
    try {
      const response = await this.authFetch(`${this.baseUrl}/health`)
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      logApiError('Health check failed', error)
      throw error
    }
  }

  // File operations
  async readFile(filePath: string): Promise<{ path: string; content: string; exists: boolean; size: number }> {
    const response = await this.authFetch(`${this.baseUrl}/api/v1/files/read/${encodeURIComponent(filePath)}`)
    if (!response.ok) throw new Error(`Failed to read file: ${response.statusText}`)
    return await response.json()
  }

  async writeFile(path: string, content: string, createDirs = false): Promise<{ success: boolean; message: string; path: string }> {
    const response = await this.authFetch(`${this.baseUrl}/api/v1/files/write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content, create_dirs: createDirs }),
    })
    if (!response.ok) throw new Error(`Failed to write file: ${response.statusText}`)
    return await response.json()
  }

  async deleteFile(filePath: string): Promise<{ success: boolean; message: string; path: string }> {
    const response = await this.authFetch(`${this.baseUrl}/api/v1/files/delete/${encodeURIComponent(filePath)}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error(`Failed to delete file: ${response.statusText}`)
    return await response.json()
  }

  async listDirectory(dirPath: string): Promise<{ path: string; directories: any[]; files: any[] }> {
    const response = await this.authFetch(`${this.baseUrl}/api/v1/files/list/${encodeURIComponent(dirPath)}`)
    if (!response.ok) throw new Error(`Failed to list directory: ${response.statusText}`)
    return await response.json()
  }

  // Code execution
  async executeCommand(command: string, args?: string[], workingDir?: string, timeoutSeconds?: number): Promise<{
    success: boolean
    stdout: string
    stderr: string
    exit_code?: number
    execution_time_ms: number
  }> {
    const response = await this.authFetch(`${this.baseUrl}/api/v1/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, args, working_dir: workingDir, timeout_seconds: timeoutSeconds }),
    })
    if (!response.ok) throw new Error(`Command execution failed: ${response.statusText}`)
    return await response.json()
  }

  // Codebase analysis

  async reviewCode(filePath: string, code: string, language: string): Promise<any> {
    const response = await this.authFetch(`${this.baseUrl}/api/v1/codebase/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: filePath, code, language }),
    })
    if (!response.ok) throw new Error(`Code review failed: ${response.statusText}`)
    return await response.json()
  }

  async generateTests(code: string, language: string, functionName?: string): Promise<any> {
    const response = await this.authFetch(`${this.baseUrl}/api/v1/codebase/tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, function_name: functionName }),
    })
    if (!response.ok) throw new Error(`Test generation failed: ${response.statusText}`)
    return await response.json()
  }

  async generateDocs(code: string, language: string, filePath: string): Promise<any> {
    const response = await this.authFetch(`${this.baseUrl}/api/v1/codebase/docs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, file_path: filePath }),
    })
    if (!response.ok) throw new Error(`Documentation generation failed: ${response.statusText}`)
    return await response.json()
  }

  // Agent metrics and monitoring (Phase 2)
  async getAgentMetrics(): Promise<{
    total_agents_created: number
    total_tasks_executed: number
    successful_tasks: number
    failed_tasks: number
    success_rate: number
    total_execution_time_ms: number
    average_execution_time_ms: number
    total_tokens_used: number
    active_agents: number
    active_tasks: number
    queue_status: {
      queue_size: number
      queue_capacity: number
      concurrent_tasks: number
      max_concurrent: number
      circuit_breaker_open: boolean
    }
    health_status: {
      unhealthy_agents: number
      unhealthy_agent_ids: string[]
    }
  }> {
    try {
      const response = await this.authFetch(`${this.baseUrl}/api/v1/agents/metrics`)
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`)
      }
      return await response.json()
    } catch {
      // Backend not available - return default values silently
      return {
        total_agents_created: 0,
        total_tasks_executed: 0,
        successful_tasks: 0,
        failed_tasks: 0,
        success_rate: 0,
        total_execution_time_ms: 0,
        average_execution_time_ms: 0,
        total_tokens_used: 0,
        active_agents: 0,
        active_tasks: 0,
        queue_status: {
          queue_size: 0,
          queue_capacity: 2000,
          concurrent_tasks: 0,
          max_concurrent: 200,
          circuit_breaker_open: false
        },
        health_status: {
          unhealthy_agents: 0,
          unhealthy_agent_ids: []
        }
      }
    }
  }

  async getQueueStatus(): Promise<{
    queue_size: number
    queue_capacity: number
    concurrent_tasks: number
    max_concurrent: number
    circuit_breaker_open: boolean
  }> {
    try {
      const response = await this.authFetch(`${this.baseUrl}/api/v1/agents/queue/status`)
      if (!response.ok) {
        throw new Error(`Failed to fetch queue status: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      logApiError('Error fetching queue status', error)
      return {
        queue_size: 0,
        queue_capacity: 2000,
        concurrent_tasks: 0,
        max_concurrent: 200,
        circuit_breaker_open: false
      }
    }
  }

  async getHealthStatus(): Promise<{
    unhealthy_agents: number
    unhealthy_agent_ids: string[]
  }> {
    try {
      const response = await this.authFetch(`${this.baseUrl}/api/v1/agents/health`)
      if (!response.ok) {
        throw new Error(`Failed to fetch health status: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      logApiError('Error fetching health status', error)
      return {
        unhealthy_agents: 0,
        unhealthy_agent_ids: []
      }
    }
  }

  // OpenClaw Integration
  async getOpenClawStatus(): Promise<{
    enabled: boolean
    connected: boolean
    gateway_url: string
    sessions: number
    skills: number
    uptime: number
  }> {
    try {
      const response = await this.authFetch(`${this.baseUrl}/api/v1/openclaw/status`)
      if (!response.ok) {
        throw new Error(`Failed to fetch OpenClaw status: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      logApiError('Error fetching OpenClaw status', error)
      return {
        enabled: false,
        connected: false,
        gateway_url: 'ws://127.0.0.1:18789',
        sessions: 0,
        skills: 0,
        uptime: 0
      }
    }
  }

  async getOpenClawSkills(): Promise<{
    skills: Array<{
      name: string
      description: string
      skill_type: string
      enabled: boolean
      capabilities: string[]
    }>
    total: number
  }> {
    try {
      const response = await this.authFetch(`${this.baseUrl}/api/v1/openclaw/skills`)
      if (!response.ok) {
        throw new Error(`Failed to fetch OpenClaw skills: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      logApiError('Error fetching OpenClaw skills', error)
      return { skills: [], total: 0 }
    }
  }

  async executeOpenClawSkill(skillName: string, params?: Record<string, unknown>, context?: {
    file_path?: string
    code?: string
    language?: string
  }): Promise<{
    success: boolean
    output?: string
    error?: string
    duration?: number
  }> {
    try {
      const response = await this.authFetch(`${this.baseUrl}/api/v1/openclaw/skills/${encodeURIComponent(skillName)}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params, context })
      })
      if (!response.ok) {
        throw new Error(`Failed to execute skill: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      logApiError('Error executing OpenClaw skill', error)
      return { success: false, error: String(error) }
    }
  }

  async sendOpenClawMessage(message: string, options?: {
    thinking_level?: string
    model?: string
    session_id?: string
  }): Promise<{
    id: string
    role: string
    content: string
    timestamp: string
    model?: string
  }> {
    const response = await this.authFetch(`${this.baseUrl}/api/v1/openclaw/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, ...options })
    })
    if (!response.ok) {
      throw new Error(`Failed to send OpenClaw message: ${response.statusText}`)
    }
    return await response.json()
  }

  // Moltbook Integration
  async getMoltbookStatus(): Promise<{
    enabled: boolean
    registered: boolean
    agent_id?: string
    username?: string
    karma: number
  }> {
    try {
      const response = await this.authFetch(`${this.baseUrl}/api/v1/moltbook/status`)
      if (!response.ok) {
        throw new Error(`Failed to fetch Moltbook status: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      logApiError('Error fetching Moltbook status', error)
      return { enabled: false, registered: false, karma: 0 }
    }
  }

  async getMoltbookProfile(): Promise<{
    id: string
    username: string
    display_name: string
    description: string
    karma: number
    verified: boolean
    capabilities: string[]
    submolts: string[]
  } | null> {
    try {
      const response = await this.authFetch(`${this.baseUrl}/api/v1/moltbook/profile`)
      if (!response.ok) {
        throw new Error(`Failed to fetch Moltbook profile: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      logApiError('Error fetching Moltbook profile', error)
      return null
    }
  }

  async registerWithMoltbook(options?: {
    agent_name?: string
    description?: string
    capabilities?: string[]
    twitter_handle?: string
  }): Promise<{
    url: string
    code: string
    expires_at: string
    agent_id: string
  }> {
    const response = await this.authFetch(`${this.baseUrl}/api/v1/moltbook/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {})
    })
    if (!response.ok) {
      throw new Error(`Failed to register with Moltbook: ${response.statusText}`)
    }
    return await response.json()
  }

  async shareCodeToMoltbook(options: {
    title: string
    code: string
    language: string
    description?: string
    submolt?: string
  }): Promise<{
    id: string
    title: string
    content: string
    submolt: string
    karma: number
    created_at: string
  }> {
    const response = await this.authFetch(`${this.baseUrl}/api/v1/moltbook/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    })
    if (!response.ok) {
      throw new Error(`Failed to share code to Moltbook: ${response.statusText}`)
    }
    return await response.json()
  }

  async getMoltbookFeed(): Promise<{
    posts: Array<{
      id: string
      title: string
      content: string
      submolt: string
      karma: number
      created_at: string
    }>
    has_more: boolean
    next_offset: number
  }> {
    try {
      const response = await this.authFetch(`${this.baseUrl}/api/v1/moltbook/feed`)
      if (!response.ok) {
        throw new Error(`Failed to fetch Moltbook feed: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      logApiError('Error fetching Moltbook feed', error)
      return { posts: [], has_more: false, next_offset: 0 }
    }
  }

  // Code Intelligence APIs
  async searchCodebase(query: string): Promise<any[]> {
    try {
      const response = await this.authFetch(`${this.baseUrl}/api/v1/codebase/search?q=${encodeURIComponent(query)}`)
      if (!response.ok) {
        throw new Error(`Failed to search codebase: ${response.statusText}`)
      }
      const data = await response.json()
      return data.results || []
    } catch (error) {
      logApiError('Error searching codebase', error)
      return []
    }
  }

  async findSymbolUsages(symbolName: string): Promise<any[]> {
    try {
      const response = await this.authFetch(`${this.baseUrl}/api/v1/codebase/references/${encodeURIComponent(symbolName)}`)
      if (!response.ok) {
        throw new Error(`Failed to find usages: ${response.statusText}`)
      }
      const data = await response.json()
      return data.usages || []
    } catch (error) {
      logApiError('Error finding usages', error)
      return []
    }
  }

  async getFileDependencies(filePath: string): Promise<string[]> {
    try {
      const response = await this.authFetch(`${this.baseUrl}/api/v1/codebase/dependencies/${encodeURIComponent(filePath)}`)
      if (!response.ok) {
        throw new Error(`Failed to get dependencies: ${response.statusText}`)
      }
      const data = await response.json()
      return data.dependencies || []
    } catch (error) {
      logApiError('Error getting dependencies', error)
      return []
    }
  }

  async detectPatterns(filePath: string): Promise<any[]> {
    try {
      const response = await this.authFetch(`${this.baseUrl}/api/v1/codebase/patterns/${encodeURIComponent(filePath)}`)
      if (!response.ok) {
        throw new Error(`Failed to detect patterns: ${response.statusText}`)
      }
      const data = await response.json()
      return data.patterns || []
    } catch (error) {
      logApiError('Error detecting patterns', error)
      return []
    }
  }

  async indexFile(filePath: string, content: string, language: string): Promise<void> {
    try {
      const response = await this.authFetch(`${this.baseUrl}/api/v1/codebase/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath, content, language })
      })
      if (!response.ok) {
        throw new Error(`Failed to index file: ${response.statusText}`)
      }
    } catch (error) {
      logApiError('Error indexing file', error)
    }
  }

  // Security APIs
  async getSecurityEvents(): Promise<any[]> {
    try {
      const response = await this.authFetch(`${this.baseUrl}/api/v1/security/events`)
      if (!response.ok) {
        throw new Error(`Failed to fetch security events: ${response.statusText}`)
      }
      const data = await response.json()
      return data.events || []
    } catch (error) {
      logApiError('Error fetching security events', error)
      return []
    }
  }

  async getVulnerabilities(): Promise<any[]> {
    try {
      const response = await this.authFetch(`${this.baseUrl}/api/v1/security/vulnerabilities`)
      if (!response.ok) {
        throw new Error(`Failed to fetch vulnerabilities: ${response.statusText}`)
      }
      const data = await response.json()
      return data.vulnerabilities || []
    } catch (error) {
      logApiError('Error fetching vulnerabilities', error)
      return []
    }
  }

  async scanCodeForVulnerabilities(code: string, language: string): Promise<any[]> {
    try {
      const response = await this.authFetch(`${this.baseUrl}/api/v1/security/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language })
      })
      if (!response.ok) {
        throw new Error(`Failed to scan code: ${response.statusText}`)
      }
      const data = await response.json()
      return data.vulnerabilities || []
    } catch (error) {
      logApiError('Error scanning code', error)
      return []
    }
  }
}

export const apiService = new ApiService()
