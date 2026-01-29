/**
 * API service for communicating with Bloop backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface ModelInfo {
  provider: string
  model: string
  available: boolean
  capabilities: {
    supports_vision: boolean
    supports_function_calling: boolean
    max_context_length: number
    supports_streaming: boolean
    cost_per_1k_tokens: {
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
  private baseUrl: string

  constructor() {
    this.baseUrl = API_BASE_URL
  }

  async fetchModels(): Promise<ModelsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/models`)
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching models:', error)
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

      const response = await fetch(`${this.baseUrl}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      console.error('Error sending chat message:', error)
      throw error
    }
  }

  async checkHealth(): Promise<{ status: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`)
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Health check failed:', error)
      throw error
    }
  }
}

export const apiService = new ApiService()
