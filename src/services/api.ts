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
  private readonly baseUrl: string

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

  // File operations
  async readFile(filePath: string): Promise<{ path: string; content: string; exists: boolean; size: number }> {
    const response = await fetch(`${this.baseUrl}/api/v1/files/read/${encodeURIComponent(filePath)}`)
    if (!response.ok) throw new Error(`Failed to read file: ${response.statusText}`)
    return await response.json()
  }

  async writeFile(path: string, content: string, createDirs = false): Promise<{ success: boolean; message: string; path: string }> {
    const response = await fetch(`${this.baseUrl}/api/v1/files/write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content, create_dirs: createDirs }),
    })
    if (!response.ok) throw new Error(`Failed to write file: ${response.statusText}`)
    return await response.json()
  }

  async deleteFile(filePath: string): Promise<{ success: boolean; message: string; path: string }> {
    const response = await fetch(`${this.baseUrl}/api/v1/files/delete/${encodeURIComponent(filePath)}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error(`Failed to delete file: ${response.statusText}`)
    return await response.json()
  }

  async listDirectory(dirPath: string): Promise<{ path: string; directories: any[]; files: any[] }> {
    const response = await fetch(`${this.baseUrl}/api/v1/files/list/${encodeURIComponent(dirPath)}`)
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
    const response = await fetch(`${this.baseUrl}/api/v1/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, args, working_dir: workingDir, timeout_seconds: timeoutSeconds }),
    })
    if (!response.ok) throw new Error(`Command execution failed: ${response.statusText}`)
    return await response.json()
  }

  // Codebase analysis
  async searchCodebase(query: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/codebase/search?query=${encodeURIComponent(query)}`)
    if (!response.ok) throw new Error(`Search failed: ${response.statusText}`)
    return await response.json()
  }

  async reviewCode(filePath: string, code: string, language: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/codebase/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: filePath, code, language }),
    })
    if (!response.ok) throw new Error(`Code review failed: ${response.statusText}`)
    return await response.json()
  }

  async generateTests(code: string, language: string, functionName?: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/codebase/tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, function_name: functionName }),
    })
    if (!response.ok) throw new Error(`Test generation failed: ${response.statusText}`)
    return await response.json()
  }

  async generateDocs(code: string, language: string, filePath: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/codebase/docs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, file_path: filePath }),
    })
    if (!response.ok) throw new Error(`Documentation generation failed: ${response.statusText}`)
    return await response.json()
  }
}

export const apiService = new ApiService()
