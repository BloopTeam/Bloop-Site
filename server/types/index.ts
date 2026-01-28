/**
 * Shared types for Bloop backend
 */

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: Date
  metadata?: Record<string, unknown>
}

export interface AIRequest {
  messages: AIMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  context?: CodebaseContext
}

export interface AIResponse {
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason?: string
  metadata?: Record<string, unknown>
}

export interface CodebaseContext {
  files?: FileContext[]
  symbols?: SymbolContext[]
  dependencies?: DependencyContext[]
  structure?: ProjectStructure
}

export interface FileContext {
  path: string
  content: string
  language: string
  startLine?: number
  endLine?: number
}

export interface SymbolContext {
  name: string
  type: 'function' | 'class' | 'interface' | 'variable' | 'type'
  file: string
  line: number
  signature?: string
}

export interface DependencyContext {
  name: string
  version?: string
  type: 'import' | 'require' | 'dependency'
  file: string
}

export interface ProjectStructure {
  root: string
  files: string[]
  directories: string[]
  languages: string[]
}

export interface ModelCapabilities {
  supportsVision: boolean
  supportsFunctionCalling: boolean
  maxContextLength: number
  supportsStreaming: boolean
  costPer1kTokens: {
    input: number
    output: number
  }
  speed: 'fast' | 'medium' | 'slow'
  quality: 'high' | 'medium' | 'low'
}

export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'auto'

export interface ModelInfo {
  provider: ModelProvider
  model: string
  capabilities: ModelCapabilities
}
