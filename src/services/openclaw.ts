/**
 * OpenClaw Gateway Service
 * Connects to OpenClaw Gateway for multi-agent orchestration and skills
 */

import type {
  OpenClawGatewayStatus,
  OpenClawSession,
  OpenClawMessage,
  OpenClawSkill,
  SkillExecutionRequest,
  SkillExecutionResult,
  GatewayMessage,
  ThinkingLevel,
  OpenClawConfig,
  CodeContext,
  OpenClawNode,
  BrowserAction,
  BrowserSnapshot
} from '../types/openclaw'

const DEFAULT_GATEWAY_URL = 'ws://127.0.0.1:18789'

// Set to true to enable OpenClaw error logging
const DEBUG_OPENCLAW = false

const logOpenClawError = (context: string, error: unknown) => {
  if (DEBUG_OPENCLAW) {
    console.error(`[OpenClaw] ${context}:`, error)
  }
}

class OpenClawService {
  private ws: WebSocket | null = null
  private readonly config: OpenClawConfig
  private readonly messageHandlers: Map<string, (response: unknown) => void> = new Map()
  private readonly eventListeners: Map<string, Set<(data: unknown) => void>> = new Map()
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 5
  private readonly reconnectDelay = 1000
  private messageId = 0

  constructor(config?: Partial<OpenClawConfig>) {
    this.config = {
      enabled: true,
      gatewayUrl: DEFAULT_GATEWAY_URL,
      autoConnect: false,
      defaultThinkingLevel: 'medium',
      skills: {
        enabled: true,
        workspacePath: '~/.openclaw/workspace/skills',
        autoDiscover: true
      },
      browser: {
        enabled: false,
        headless: true
      },
      canvas: {
        enabled: false
      },
      ...config
    }
  }

  // Connection management
  async connect(): Promise<boolean> {
    if (!this.config.enabled) {
      console.log('[OpenClaw] Service disabled')
      return false
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      return true
    }

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(this.config.gatewayUrl)

        this.ws.onopen = () => {
          console.log('[OpenClaw] Connected to Gateway')
          this.reconnectAttempts = 0
          this.emit('connected', { url: this.config.gatewayUrl })
          resolve(true)
        }

        this.ws.onclose = () => {
          console.log('[OpenClaw] Disconnected from Gateway')
          this.emit('disconnected', {})
          this.handleReconnect()
        }

        this.ws.onerror = (error) => {
          logOpenClawError(' WebSocket error:', error)
          this.emit('error', { error })
          resolve(false)
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }
      } catch (error) {
        logOpenClawError(' Failed to connect:', error)
        resolve(false)
      }
    })
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.config.autoConnect) {
      this.reconnectAttempts++
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
      console.log(`[OpenClaw] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
      setTimeout(() => this.connect(), delay)
    }
  }

  private handleMessage(data: string): void {
    try {
      // Validate message size (max 1MB)
      if (data.length > 1024 * 1024) {
        logOpenClawError(' Message too large:', data.length)
        return
      }

      // Parse and validate JSON
      const message: GatewayMessage = JSON.parse(data)
      
      // Validate message structure
      if (!message.type) {
        logOpenClawError(' Invalid message: missing type', null)
        return
      }

      // Sanitize payload if it's a string
      if (typeof message.payload === 'string' && message.payload.length > 10000) {
        console.warn('[OpenClaw] Payload too large, truncating')
        message.payload = message.payload.substring(0, 10000)
      }
      
      // Handle response to a request
      if (message.id && this.messageHandlers.has(message.id)) {
        const handler = this.messageHandlers.get(message.id)
        handler?.(message.payload)
        this.messageHandlers.delete(message.id)
      }

      // Emit events for message types
      this.emit(message.type, message.payload)
    } catch (error) {
      logOpenClawError(' Failed to parse message:', error)
      // Don't emit invalid messages
    }
  }

  private send(type: string, payload?: unknown): string {
    if (!this.isConnected()) {
      throw new Error('Not connected to OpenClaw Gateway')
    }

    // Validate payload size
    const payloadStr = JSON.stringify(payload)
    if (payloadStr.length > 10000) {
      throw new Error('Payload too large (max 10KB)')
    }

    // Sanitize payload if it's a string
    let sanitizedPayload = payload
    if (typeof payload === 'string') {
      sanitizedPayload = payload
        .replace(/<script/gi, '')
        .replace(/<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .substring(0, 10000)
    }

    const id = `msg_${++this.messageId}_${Date.now()}`
    const message: GatewayMessage = { type: type as GatewayMessage['type'], id, payload: sanitizedPayload }
    
    try {
      this.ws?.send(JSON.stringify(message))
    } catch (error) {
      logOpenClawError(' Failed to send message:', error)
      throw error
    }
    
    return id
  }

  private async request<T>(type: string, payload?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      try {
        const id = this.send(type, payload)
        
        const timeout = setTimeout(() => {
          this.messageHandlers.delete(id)
          reject(new Error('Request timeout'))
        }, 30000)

        this.messageHandlers.set(id, (response) => {
          clearTimeout(timeout)
          resolve(response as T)
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  // Event system
  on(event: string, callback: (data: unknown) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)?.add(callback)
    
    return () => {
      this.eventListeners.get(event)?.delete(callback)
    }
  }

  private emit(event: string, data: unknown): void {
    this.eventListeners.get(event)?.forEach(callback => callback(data))
  }

  // Gateway status
  async getStatus(): Promise<OpenClawGatewayStatus> {
    if (!this.isConnected()) {
      return {
        connected: false,
        url: this.config.gatewayUrl,
        port: Number.parseInt(this.config.gatewayUrl.split(':').pop() || '18789'),
        sessions: 0,
        uptime: 0
      }
    }

    try {
      const status = await this.request<OpenClawGatewayStatus>('status')
      return {
        ...status,
        connected: true,
        url: this.config.gatewayUrl
      }
    } catch {
      return {
        connected: true,
        url: this.config.gatewayUrl,
        port: Number.parseInt(this.config.gatewayUrl.split(':').pop() || '18789'),
        sessions: 0,
        uptime: 0
      }
    }
  }

  // Session management (Agent-to-Agent)
  async listSessions(): Promise<OpenClawSession[]> {
    if (!this.isConnected()) return []
    
    try {
      return await this.request<OpenClawSession[]>('sessions.list')
    } catch (error) {
      logOpenClawError(' Failed to list sessions:', error)
      return []
    }
  }

  async getSessionHistory(sessionId: string): Promise<OpenClawMessage[]> {
    if (!this.isConnected()) return []
    
    try {
      return await this.request<OpenClawMessage[]>('sessions.history', { sessionId })
    } catch (error) {
      logOpenClawError(' Failed to get session history:', error)
      return []
    }
  }

  async sendToSession(sessionId: string, message: string, options?: {
    replyBack?: boolean
    announce?: boolean
  }): Promise<OpenClawMessage | null> {
    if (!this.isConnected()) return null
    
    try {
      return await this.request<OpenClawMessage>('sessions.send', {
        sessionId,
        message,
        ...options
      })
    } catch (error) {
      logOpenClawError(' Failed to send to session:', error)
      return null
    }
  }

  // Agent messaging
  async sendMessage(message: string, options?: {
    thinkingLevel?: ThinkingLevel
    model?: string
    sessionId?: string
  }): Promise<OpenClawMessage | null> {
    if (!this.isConnected()) return null
    
    try {
      return await this.request<OpenClawMessage>('agent.message', {
        message,
        thinkingLevel: options?.thinkingLevel || this.config.defaultThinkingLevel,
        model: options?.model,
        sessionId: options?.sessionId
      })
    } catch (error) {
      logOpenClawError(' Failed to send message:', error)
      return null
    }
  }

  // Skills
  async listSkills(): Promise<OpenClawSkill[]> {
    if (!this.isConnected() || !this.config.skills.enabled) return []
    
    try {
      return await this.request<OpenClawSkill[]>('skills.list')
    } catch (error) {
      logOpenClawError(' Failed to list skills:', error)
      return []
    }
  }

  async executeSkill(request: SkillExecutionRequest): Promise<SkillExecutionResult> {
    if (!this.isConnected()) {
      return { success: false, error: 'Not connected to OpenClaw Gateway' }
    }

    if (!this.config.skills.enabled) {
      return { success: false, error: 'Skills are disabled' }
    }
    
    try {
      return await this.request<SkillExecutionResult>('skills.execute', request)
    } catch (error) {
      logOpenClawError(' Failed to execute skill:', error)
      return { success: false, error: String(error) }
    }
  }

  // Nodes (device capabilities)
  async listNodes(): Promise<OpenClawNode[]> {
    if (!this.isConnected()) return []
    
    try {
      return await this.request<OpenClawNode[]>('nodes.list')
    } catch (error) {
      logOpenClawError(' Failed to list nodes:', error)
      return []
    }
  }

  async invokeNode(nodeId: string, capability: string, params?: unknown): Promise<unknown> {
    if (!this.isConnected()) {
      throw new Error('Not connected to OpenClaw Gateway')
    }
    
    return await this.request('node.invoke', { nodeId, capability, params })
  }

  // Browser control
  async browserNavigate(url: string): Promise<BrowserSnapshot | null> {
    if (!this.isConnected() || !this.config.browser.enabled) return null
    
    try {
      return await this.request<BrowserSnapshot>('browser.navigate', { url })
    } catch (error) {
      logOpenClawError(' Browser navigate failed:', error)
      return null
    }
  }

  async browserAction(action: BrowserAction): Promise<BrowserSnapshot | null> {
    if (!this.isConnected() || !this.config.browser.enabled) return null
    
    try {
      return await this.request<BrowserSnapshot>('browser.action', action)
    } catch (error) {
      logOpenClawError(' Browser action failed:', error)
      return null
    }
  }

  async browserScreenshot(): Promise<string | null> {
    if (!this.isConnected() || !this.config.browser.enabled) return null
    
    try {
      const result = await this.request<{ screenshot: string }>('browser.screenshot')
      return result.screenshot
    } catch (error) {
      logOpenClawError(' Browser screenshot failed:', error)
      return null
    }
  }

  // Bloop-specific skill helpers
  async reviewCode(context: CodeContext): Promise<SkillExecutionResult> {
    return this.executeSkill({
      skillName: 'bloop-code-review',
      params: {},
      context
    })
  }

  async generateTests(context: CodeContext): Promise<SkillExecutionResult> {
    return this.executeSkill({
      skillName: 'bloop-test-gen',
      params: {},
      context
    })
  }

  async generateDocs(context: CodeContext): Promise<SkillExecutionResult> {
    return this.executeSkill({
      skillName: 'bloop-docs',
      params: {},
      context
    })
  }

  async refactorCode(context: CodeContext, suggestions?: string[]): Promise<SkillExecutionResult> {
    return this.executeSkill({
      skillName: 'bloop-refactor',
      params: { suggestions },
      context
    })
  }

  async debugCode(context: CodeContext, error?: string): Promise<SkillExecutionResult> {
    return this.executeSkill({
      skillName: 'bloop-debug',
      params: { error },
      context
    })
  }

  async optimizeCode(context: CodeContext): Promise<SkillExecutionResult> {
    return this.executeSkill({
      skillName: 'bloop-optimize',
      params: {},
      context
    })
  }

  async scanSecurity(context: CodeContext): Promise<SkillExecutionResult> {
    return this.executeSkill({
      skillName: 'bloop-security',
      params: {},
      context
    })
  }

  // Canvas operations (A2UI)
  async createCanvas(): Promise<string | null> {
    if (!this.isConnected() || !this.config.canvas.enabled) return null
    
    try {
      const result = await this.request<{ canvasId: string }>('canvas.create')
      return result.canvasId
    } catch (error) {
      logOpenClawError(' Failed to create canvas:', error)
      return null
    }
  }

  async updateCanvas(canvasId: string, elements: unknown[]): Promise<boolean> {
    if (!this.isConnected() || !this.config.canvas.enabled) return false
    
    try {
      await this.request('canvas.update', { canvasId, elements })
      return true
    } catch (error) {
      logOpenClawError(' Failed to update canvas:', error)
      return false
    }
  }

  // Streaming responses
  streamMessage(message: string, options?: {
    thinkingLevel?: ThinkingLevel
    model?: string
    onChunk?: (chunk: string) => void
    onComplete?: (response: OpenClawMessage) => void
    onError?: (error: Error) => void
  }): () => void {
    if (!this.isConnected()) {
      options?.onError?.(new Error('Not connected to OpenClaw Gateway'))
      return () => {}
    }

    const id = this.send('agent.stream', {
      message,
      thinkingLevel: options?.thinkingLevel || this.config.defaultThinkingLevel,
      model: options?.model
    })

    const chunkHandler = (data: unknown) => {
      const chunk = data as { id: string; chunk?: string; complete?: boolean; message?: OpenClawMessage; error?: string }
      if (chunk.id !== id) return
      
      if (chunk.error) {
        options?.onError?.(new Error(chunk.error))
        return
      }
      
      if (chunk.chunk) {
        options?.onChunk?.(chunk.chunk)
      }
      
      if (chunk.complete && chunk.message) {
        options?.onComplete?.(chunk.message)
      }
    }

    const unsubscribe = this.on('agent.stream.chunk', chunkHandler)
    
    return () => {
      unsubscribe()
      this.send('agent.stream.cancel', { id })
    }
  }

  // Batch skill execution
  async executeBatch(skills: SkillExecutionRequest[]): Promise<SkillExecutionResult[]> {
    if (!this.isConnected()) {
      return skills.map(() => ({ success: false, error: 'Not connected' }))
    }

    try {
      return await this.request<SkillExecutionResult[]>('skills.batch', { skills })
    } catch (error) {
      logOpenClawError(' Batch execution failed:', error)
      return skills.map(() => ({ success: false, error: String(error) }))
    }
  }

  // Agent collaboration
  async collaborateWith(agentId: string, task: string): Promise<{
    sessionId: string
    response: OpenClawMessage
  } | null> {
    if (!this.isConnected()) return null

    try {
      return await this.request<{ sessionId: string; response: OpenClawMessage }>('agent.collaborate', {
        agentId,
        task
      })
    } catch (error) {
      logOpenClawError(' Collaboration failed:', error)
      return null
    }
  }

  // Get skill details
  async getSkillInfo(skillName: string): Promise<{
    name: string
    description: string
    version: string
    parameters: Array<{ name: string; type: string; required: boolean; description: string }>
    examples: string[]
  } | null> {
    if (!this.isConnected()) return null

    try {
      return await this.request('skills.info', { skillName })
    } catch (error) {
      logOpenClawError(' Failed to get skill info:', error)
      return null
    }
  }

  // Install skill from Moltbook
  async installSkill(skillMd: string, name: string): Promise<boolean> {
    if (!this.isConnected()) return false

    try {
      await this.request('skills.install', { skillMd, name })
      return true
    } catch (error) {
      logOpenClawError(' Failed to install skill:', error)
      return false
    }
  }

  // Configuration
  getConfig(): OpenClawConfig {
    return { ...this.config }
  }

  updateConfig(updates: Partial<OpenClawConfig>): void {
    Object.assign(this.config, updates)
  }
}

// Singleton instance
export const openClawService = new OpenClawService()

// Export class for custom instances
export { OpenClawService }
