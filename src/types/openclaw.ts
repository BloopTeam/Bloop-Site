/**
 * OpenClaw Integration Types
 * Updated for Gateway Protocol v3 (v2026.1.21)
 * Docs: https://docs.clawd.bot/gateway/protocol
 */

// ─── Protocol v3 Framing ───

export type GatewayFrameType = 'req' | 'res' | 'event'

export interface GatewayRequest {
  type: 'req'
  id: string
  method: string
  params?: Record<string, unknown>
}

export interface GatewayResponse {
  type: 'res'
  id: string
  ok: boolean
  payload?: Record<string, unknown>
  error?: string
}

export interface GatewayEvent {
  type: 'event'
  event: string
  payload?: Record<string, unknown>
  seq?: number
  stateVersion?: number
}

export type GatewayFrame = GatewayRequest | GatewayResponse | GatewayEvent

// ─── Handshake (Protocol v3) ───

export interface ConnectChallenge {
  nonce: string
  ts: number
}

export interface ConnectParams {
  minProtocol: number
  maxProtocol: number
  client: {
    id: string
    version: string
    platform: string
    mode: 'operator' | 'node'
  }
  role: GatewayRole
  scopes: GatewayScope[]
  caps: NodeCapability[]
  commands: string[]
  permissions: Record<string, boolean>
  auth?: {
    token?: string
    deviceToken?: string
  }
  locale: string
  userAgent: string
  device?: DeviceIdentity
}

export interface HelloOkPayload {
  type: 'hello-ok'
  protocol: number
  policy: {
    tickIntervalMs: number
  }
  auth?: {
    deviceToken: string
    role: GatewayRole
    scopes: GatewayScope[]
  }
}

export interface DeviceIdentity {
  id: string
  publicKey?: string
  signature?: string
  signedAt?: number
  nonce?: string
}

// ─── Roles & Scopes ───

export type GatewayRole = 'operator' | 'node'

export type GatewayScope =
  | 'operator.read'
  | 'operator.write'
  | 'operator.admin'
  | 'operator.approvals'
  | 'operator.pairing'

// ─── Presence ───

export interface PresenceEntry {
  deviceId: string
  roles: GatewayRole[]
  scopes: GatewayScope[]
  clientId: string
  platform: string
  connectedAt: string
  lastSeen: string
}

// ─── Channels (formerly "providers") ───

export type ChannelType =
  | 'whatsapp' | 'telegram' | 'slack' | 'discord'
  | 'webchat' | 'signal' | 'imessage' | 'teams'
  | 'main' | 'sms' | 'email'

// ─── Gateway Status ───

export interface OpenClawGatewayStatus {
  connected: boolean
  url: string
  port?: number
  protocol?: number
  sessions?: number
  uptime?: number
  version?: string
  role?: GatewayRole
  scopes?: GatewayScope[]
  presence?: PresenceEntry[]
  activeChannels?: ChannelType[]
}

// ─── Sessions ───

export interface OpenClawSession {
  id: string
  sessionKey: string
  channel: ChannelType
  status: 'active' | 'idle' | 'paused'
  model?: string
  agentId?: string
  thinkingLevel?: ThinkingLevel
  createdAt: string
  lastActivity?: string
  idleMinutes?: number
  metadata?: Record<string, unknown>
}

export type ThinkingLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'

// ─── Messages ───

export interface OpenClawMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'developer'
  content: string
  timestamp: string
  sessionId?: string
  thinkingLevel?: ThinkingLevel
  model?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

// ─── OpenResponses API (HTTP) ───

export interface OpenResponsesRequest {
  model: string // "openclaw:<agentId>" or "agent:<agentId>"
  input: string | OpenResponsesItem[]
  instructions?: string
  tools?: OpenResponsesTool[]
  tool_choice?: string
  stream?: boolean
  max_output_tokens?: number
  user?: string // stable session routing
}

export type OpenResponsesItem =
  | { type: 'message'; role: 'system' | 'developer' | 'user' | 'assistant'; content: string }
  | { type: 'function_call_output'; call_id: string; output: string }
  | { type: 'input_image'; source: { type: 'url'; url: string } | { type: 'base64'; media_type: string; data: string } }
  | { type: 'input_file'; source: { type: 'base64'; media_type: string; data: string; filename: string } | { type: 'url'; url: string } }

export interface OpenResponsesTool {
  type: 'function'
  function: {
    name: string
    description?: string
    parameters?: Record<string, unknown>
  }
}

export interface OpenResponsesResponse {
  id: string
  output: OpenResponsesOutputItem[]
  usage?: { input_tokens: number; output_tokens: number; total_tokens: number }
  status: 'completed' | 'failed'
}

export type OpenResponsesOutputItem =
  | { type: 'message'; role: 'assistant'; content: Array<{ type: 'output_text'; text: string }> }
  | { type: 'function_call'; call_id: string; name: string; arguments: string }

// SSE streaming events
export type OpenResponsesStreamEvent =
  | 'response.created'
  | 'response.in_progress'
  | 'response.output_item.added'
  | 'response.content_part.added'
  | 'response.output_text.delta'
  | 'response.output_text.done'
  | 'response.content_part.done'
  | 'response.output_item.done'
  | 'response.completed'
  | 'response.failed'

// ─── Exec Approvals ───

export interface ExecApprovalRequest {
  id: string
  command: string
  args: string[]
  cwd: string
  mode: 'ask' | 'full'
  requestedAt: string
}

// ─── Skills ───

export interface OpenClawSkill {
  name: string
  description: string
  path: string
  enabled: boolean
  type: 'bundled' | 'managed' | 'workspace'
  capabilities: string[]
  version?: string
}

export interface SkillExecutionRequest {
  skillName: string
  params: Record<string, unknown>
  sessionId?: string
  context?: CodeContext
}

export interface SkillExecutionResult {
  success: boolean
  output?: string
  error?: string
  duration?: number
  artifacts?: SkillArtifact[]
}

export interface SkillArtifact {
  type: 'code' | 'file' | 'image' | 'data'
  name: string
  content: string
  language?: string
}

// ─── Code Context ───

export interface CodeContext {
  filePath?: string
  code?: string
  language?: string
  selection?: {
    start: { line: number; column: number }
    end: { line: number; column: number }
  }
  projectRoot?: string
}

// ─── Gateway Methods (Protocol v3) ───

export type GatewayMethod =
  | 'connect'
  | 'system.presence'
  | 'sessions.list'
  | 'sessions.history'
  | 'sessions.send'
  | 'sessions.idle'
  | 'skills.list'
  | 'skills.bins'
  | 'skills.execute'
  | 'agent.message'
  | 'agent.stream'
  | 'agent.collaborate'
  | 'models.list'
  | 'channels.list'
  | 'exec.approval.resolve'
  | 'device.token.rotate'
  | 'device.token.revoke'
  | 'node.invoke'
  | 'browser.navigate'
  | 'browser.action'
  | 'canvas.create'
  | 'canvas.navigate'

// ─── Browser Control ───

export interface BrowserAction {
  type: 'navigate' | 'click' | 'type' | 'screenshot' | 'scroll' | 'wait'
  selector?: string
  url?: string
  text?: string
  duration?: number
}

export interface BrowserSnapshot {
  url: string
  title: string
  screenshot?: string
  html?: string
  timestamp: string
}

// ─── Canvas ───

export interface CanvasState {
  id: string
  elements: CanvasElement[]
  viewport: { x: number; y: number; zoom: number }
}

export interface CanvasElement {
  id: string
  type: 'text' | 'code' | 'image' | 'shape' | 'connection'
  position: { x: number; y: number }
  size: { width: number; height: number }
  content?: string
  style?: Record<string, unknown>
}

// ─── Node Capabilities ───

export interface OpenClawNode {
  id: string
  name: string
  type: 'macos' | 'ios' | 'android' | 'linux' | 'windows'
  capabilities: NodeCapability[]
  status: 'online' | 'offline' | 'busy'
  permissions: Record<string, boolean>
  deviceId: string
}

export type NodeCapability =
  | 'system.run'
  | 'system.notify'
  | 'camera'
  | 'camera.snap'
  | 'camera.clip'
  | 'screen'
  | 'screen.record'
  | 'location'
  | 'location.get'
  | 'canvas'
  | 'voice'

// ─── Configuration ───

export interface OpenClawConfig {
  enabled: boolean
  gatewayUrl: string
  gatewayToken?: string
  autoConnect: boolean
  protocolVersion?: number
  defaultThinkingLevel: ThinkingLevel
  defaultModel?: string
  defaultAgentId?: string
  skills: {
    enabled: boolean
    workspacePath: string
    autoDiscover: boolean
  }
  browser: {
    enabled: boolean
    headless: boolean
  }
  canvas: {
    enabled: boolean
  }
  channels?: {
    idle_minutes: Record<string, number>
  }
  openResponses?: {
    enabled: boolean
  }
}

// Legacy message type (compat)
export type GatewayMessageType = GatewayMethod
export interface GatewayMessage {
  type: GatewayMessageType
  id?: string
  payload?: unknown
  error?: string
}
