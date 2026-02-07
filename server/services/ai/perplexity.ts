/**
 * Perplexity AI service integration
 * Uses OpenAI-compatible API with search-enhanced models
 */
import OpenAI from 'openai'
import type { AIRequest, AIResponse, ModelCapabilities } from '../../types/index.js'
import type { AIService } from './base.js'
import { config } from '../../config/index.js'

export class PerplexityService implements AIService {
  name = 'perplexity'
  private client: OpenAI
  
  capabilities: ModelCapabilities = {
    supportsVision: false,
    supportsFunctionCalling: false,
    maxContextLength: 128000,
    supportsStreaming: true,
    costPer1kTokens: {
      input: 0.001,
      output: 0.001,
    },
    speed: 'fast',
    quality: 'high',
  }
  
  constructor() {
    if (!config.ai.perplexity.apiKey) {
      throw new Error('Perplexity API key not configured')
    }
    this.client = new OpenAI({
      apiKey: config.ai.perplexity.apiKey,
      baseURL: 'https://api.perplexity.ai',
    })
  }
  
  async generate(request: AIRequest): Promise<AIResponse> {
    this.validateRequest(request)
    
    const model = request.model || 'llama-3.1-sonar-large-128k-online'
    
    const messages = request.messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }))
    
    // Ensure there's a system message for Perplexity's search context
    const hasSystem = messages.some(m => m.role === 'system')
    if (!hasSystem) {
      messages.unshift({
        role: 'system',
        content: 'You are Bloop AI, a powerful coding assistant with real-time web search capabilities. Provide accurate, up-to-date information with citations when available. Be precise and helpful.',
      })
    }
    
    const completion = await this.client.chat.completions.create({
      model,
      messages,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 4000,
    })
    
    const choice = completion.choices[0]
    if (!choice || !choice.message) {
      throw new Error('No response from Perplexity')
    }
    
    return {
      content: choice.message.content || '',
      model: completion.model,
      usage: completion.usage ? {
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens,
      } : undefined,
      finishReason: choice.finish_reason || undefined,
      metadata: {
        provider: 'perplexity',
        searchEnhanced: true,
      },
    }
  }
  
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }
  
  validateRequest(request: AIRequest): void {
    if (!request.messages || request.messages.length === 0) {
      throw new Error('Messages array cannot be empty')
    }
    
    const totalLength = request.messages.reduce(
      (acc, msg) => acc + this.estimateTokens(msg.content),
      0
    )
    
    if (totalLength > this.capabilities.maxContextLength) {
      throw new Error(
        `Request exceeds maximum context length of ${this.capabilities.maxContextLength} tokens`
      )
    }
  }
}
