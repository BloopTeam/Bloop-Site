/**
 * OpenClaw Gateway Service
 * Protocol v3 (v2026.1.21)
 * WebSocket client + OpenResponses HTTP client
 * Docs: https://docs.clawd.bot/gateway/protocol
 */
import WebSocket from 'ws'
import { v4 as uuidv4 } from 'uuid'

// ─── Types ───

interface GatewayRequest {
  type: 'req'
  id: string
  method: string
  params?: Record<string, unknown>
}

interface GatewayResponse {
  type: 'res'
  id: string
  ok: boolean
  payload?: Record<string, unknown>
  error?: string
}

interface GatewayEvent {
  type: 'event'
  event: string
  payload?: Record<string, unknown>
  seq?: number
}

type GatewayFrame = GatewayRequest | GatewayResponse | GatewayEvent

interface PendingRequest {
  resolve: (payload: any) => void
  reject: (error: Error) => void
  timeout: NodeJS.Timeout
}

// ─── OpenClaw Service ───

export class OpenClawService {
  private ws: WebSocket | null = null
  private connected = false
  private protocol = 3
  private pendingRequests = new Map<string, PendingRequest>()
  private eventHandlers = new Map<string, Array<(payload: any) => void>>()
  private presence: any[] = []
  private deviceToken: string | null = null
  private reconnectTimer: NodeJS.Timeout | null = null

  private gatewayUrl: string
  private gatewayToken: string
  private clientId: string
  private clientVersion = '0.2.0'

  constructor() {
    this.gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'ws://127.0.0.1:18789'
    this.gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN || ''
    this.clientId = `bloop-${uuidv4().slice(0, 8)}`
  }

  // ─── Connection ───

  async connect(): Promise<boolean> {
    if (this.connected) return true

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(this.gatewayUrl)

        this.ws.on('open', async () => {
          console.log('  ✓ OpenClaw Gateway WebSocket opened')
          // Wait for challenge, then handshake
        })

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const frame: GatewayFrame = JSON.parse(data.toString())
            this.handleFrame(frame)
          } catch (err) {
            console.warn('  ✗ OpenClaw: invalid frame', err)
          }
        })

        this.ws.on('close', () => {
          this.connected = false
          this.pendingRequests.forEach(req => req.reject(new Error('Connection closed')))
          this.pendingRequests.clear()
          console.log('  ✗ OpenClaw Gateway disconnected')
          this.scheduleReconnect()
        })

        this.ws.on('error', (err) => {
          console.warn('  ✗ OpenClaw Gateway error:', err.message)
          this.connected = false
          resolve(false)
        })

        // Timeout for initial connection
        setTimeout(() => {
          if (!this.connected) {
            resolve(false)
          }
        }, 5000)
      } catch {
        resolve(false)
      }
    })
  }

  private handleFrame(frame: GatewayFrame) {
    switch (frame.type) {
      case 'event':
        this.handleEvent(frame as GatewayEvent)
        break
      case 'res':
        this.handleResponse(frame as GatewayResponse)
        break
    }
  }

  private async handleEvent(event: GatewayEvent) {
    // Handle connect challenge (Protocol v3)
    if (event.event === 'connect.challenge') {
      await this.handleChallenge(event.payload as { nonce: string; ts: number })
      return
    }

    // Handle exec approval requests
    if (event.event === 'exec.approval.requested') {
      this.emit('exec.approval', event.payload)
      return
    }

    // Handle presence updates
    if (event.event === 'system.presence') {
      this.presence = (event.payload as any)?.entries || []
      return
    }

    // Forward to event handlers
    this.emit(event.event, event.payload)
  }

  private async handleChallenge(challenge: { nonce: string; ts: number }) {
    // Respond with Protocol v3 connect handshake
    const connectRequest: GatewayRequest = {
      type: 'req',
      id: uuidv4(),
      method: 'connect',
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: this.clientId,
          version: this.clientVersion,
          platform: process.platform,
          mode: 'operator',
        },
        role: 'operator',
        scopes: ['operator.read', 'operator.write'],
        caps: [],
        commands: [],
        permissions: {},
        auth: {
          token: this.gatewayToken || undefined,
          deviceToken: this.deviceToken || undefined,
        },
        locale: 'en-US',
        userAgent: `bloop-site/${this.clientVersion}`,
      },
    }

    // Register pending request for connect response
    const promise = new Promise<any>((resolve, reject) => {
      this.pendingRequests.set(connectRequest.id, {
        resolve,
        reject,
        timeout: setTimeout(() => {
          this.pendingRequests.delete(connectRequest.id)
          reject(new Error('Connect timeout'))
        }, 10000),
      })
    })

    this.ws?.send(JSON.stringify(connectRequest))

    try {
      const payload = await promise
      if (payload?.type === 'hello-ok') {
        this.connected = true
        this.protocol = payload.protocol || 3
        if (payload.auth?.deviceToken) {
          this.deviceToken = payload.auth.deviceToken
        }
        console.log(`  ✓ OpenClaw Gateway connected (protocol v${this.protocol})`)
      }
    } catch (err) {
      console.warn('  ✗ OpenClaw handshake failed:', err)
    }
  }

  private handleResponse(response: GatewayResponse) {
    const pending = this.pendingRequests.get(response.id)
    if (pending) {
      clearTimeout(pending.timeout)
      this.pendingRequests.delete(response.id)
      if (response.ok) {
        pending.resolve(response.payload)
      } else {
        pending.reject(new Error(response.error || 'Request failed'))
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (process.env.OPENCLAW_AUTO_CONNECT === 'true') {
        this.connect()
      }
    }, 5000)
  }

  // ─── Request/Response ───

  async request(method: string, params?: Record<string, unknown>): Promise<any> {
    if (!this.connected || !this.ws) {
      throw new Error('Not connected to OpenClaw Gateway')
    }

    const id = uuidv4()
    const frame: GatewayRequest = { type: 'req', id, method, params }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve,
        reject,
        timeout: setTimeout(() => {
          this.pendingRequests.delete(id)
          reject(new Error(`Request timeout: ${method}`))
        }, 30000),
      })
      this.ws!.send(JSON.stringify(frame))
    })
  }

  // ─── Event System ───

  on(event: string, handler: (payload: any) => void) {
    const handlers = this.eventHandlers.get(event) || []
    handlers.push(handler)
    this.eventHandlers.set(event, handlers)
  }

  private emit(event: string, payload: any) {
    const handlers = this.eventHandlers.get(event) || []
    handlers.forEach(h => h(payload))
  }

  // ─── Public API ───

  get isConnected() { return this.connected }
  get protocolVersion() { return this.protocol }
  get currentPresence() { return this.presence }

  async getStatus() {
    if (!this.connected) {
      return {
        connected: false,
        url: this.gatewayUrl,
        protocol: 3,
        sessions: 0,
        uptime: 0,
        version: 'unknown',
        presence: [],
        activeChannels: [],
      }
    }
    try {
      const status = await this.request('system.status')
      return { connected: true, url: this.gatewayUrl, protocol: this.protocol, ...status }
    } catch {
      return { connected: false, url: this.gatewayUrl, protocol: this.protocol }
    }
  }

  async listSessions() {
    if (!this.connected) return []
    try {
      const result = await this.request('sessions.list')
      return result?.sessions || []
    } catch { return [] }
  }

  async sendMessage(sessionId: string, message: string, options?: { thinkingLevel?: string; model?: string }) {
    return this.request('sessions.send', { sessionId, message, ...options })
  }

  async listSkills() {
    if (!this.connected) return []
    try {
      const result = await this.request('skills.list')
      return result?.skills || []
    } catch { return [] }
  }

  async executeSkill(name: string, params: Record<string, unknown>) {
    return this.request('skills.execute', { name, params })
  }

  async getPresence() {
    if (!this.connected) return []
    try {
      const result = await this.request('system.presence')
      this.presence = result?.entries || []
      return this.presence
    } catch { return [] }
  }

  async listChannels() {
    if (!this.connected) return []
    try {
      const result = await this.request('channels.list')
      return result?.channels || []
    } catch { return [] }
  }

  async listModels() {
    if (!this.connected) return []
    try {
      const result = await this.request('models.list')
      return result?.models || []
    } catch { return [] }
  }

  async resolveApproval(approvalId: string, approved: boolean) {
    return this.request('exec.approval.resolve', { id: approvalId, approved })
  }

  // ─── OpenResponses HTTP API ───

  async openResponses(input: string | any[], options?: {
    agentId?: string
    stream?: boolean
    instructions?: string
    tools?: any[]
    user?: string
  }) {
    const baseUrl = this.gatewayUrl.replace('ws://', 'http://').replace('wss://', 'https://')
    const url = `${baseUrl}/v1/responses`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.gatewayToken) {
      headers['Authorization'] = `Bearer ${this.gatewayToken}`
    }
    if (options?.agentId) {
      headers['x-openclaw-agent-id'] = options.agentId
    }

    const body = {
      model: options?.agentId ? `openclaw:${options.agentId}` : 'openclaw:main',
      input,
      instructions: options?.instructions,
      tools: options?.tools,
      stream: options?.stream || false,
      user: options?.user,
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
      throw new Error((error as any).error?.message || `OpenResponses error: ${response.status}`)
    }

    return response.json()
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.connected = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}

// Singleton
let instance: OpenClawService | null = null

export function getOpenClawService(): OpenClawService {
  if (!instance) {
    instance = new OpenClawService()
  }
  return instance
}
