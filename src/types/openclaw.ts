/**
 * OpenClaw Integration Types
 * Based on OpenClaw Gateway WebSocket protocol
 */

// Gateway connection status
export interface OpenClawGatewayStatus {
  connected: boolean
  url: string
  port: number
  sessions: number
  uptime: number
  version?: string
}

// Session types (Agent-to-Agent communication)
export interface OpenClawSession {
  id: string
  channel: 'whatsapp' | 'telegram' | 'slack' | 'discord' | 'webchat' | 'signal' | 'imessage' | 'teams' | 'main'
  status: 'active' | 'idle' | 'paused'
  model?: string
  thinkingLevel?: ThinkingLevel
  createdAt: string
  lastActivity?: string
  metadata?: Record<string, unknown>
}

export type ThinkingLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'

// Message types
export interface OpenClawMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
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

// Skill types
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

// Code context for skills
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

// Gateway WebSocket message types
export type GatewayMessageType = 
  | 'connect'
  | 'disconnect'
  | 'sessions.list'
  | 'sessions.history'
  | 'sessions.send'
  | 'skills.list'
  | 'skills.execute'
  | 'agent.message'
  | 'agent.response'
  | 'ping'
  | 'pong'
  | 'error'

export interface GatewayMessage {
  type: GatewayMessageType
  id?: string
  payload?: unknown
  error?: string
}

// Browser control types (OpenClaw browser feature)
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

// Canvas/A2UI types
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

// Node types (device capabilities)
export interface OpenClawNode {
  id: string
  name: string
  type: 'macos' | 'ios' | 'android' | 'linux' | 'windows'
  capabilities: NodeCapability[]
  status: 'online' | 'offline' | 'busy'
  permissions: Record<string, boolean>
}

export type NodeCapability = 
  | 'system.run'
  | 'system.notify'
  | 'camera.snap'
  | 'camera.clip'
  | 'screen.record'
  | 'location.get'
  | 'canvas'

// Configuration
export interface OpenClawConfig {
  enabled: boolean
  gatewayUrl: string
  autoConnect: boolean
  defaultThinkingLevel: ThinkingLevel
  defaultModel?: string
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
}
