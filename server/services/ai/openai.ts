/**
 * OpenAI service integration
 */
import OpenAI from 'openai'
import type { AIRequest, AIResponse, ModelCapabilities } from '../../types/index.js'
import type { AIService } from './base.js'
import { config } from '../../config/index.js'

export class OpenAIService implements AIService {
  name = 'openai'
  private client: OpenAI
  
  capabilities: ModelCapabilities = {
    supportsVision: true,
    supportsFunctionCalling: true,
    maxContextLength: 128000, // GPT-4 Turbo
    supportsStreaming: true,
    costPer1kTokens: {
      input: 0.01,
      output: 0.03,
    },
    speed: 'medium',
    quality: 'high',
  }
  
  constructor() {
    if (!config.ai.openai.apiKey) {
      throw new Error('OpenAI API key not configured')
    }
    this.client = new OpenAI({
      apiKey: config.ai.openai.apiKey,
    })
  }
  
  async generate(request: AIRequest): Promise<AIResponse> {
    this.validateRequest(request)
    
    const model = request.model || 'gpt-4-turbo-preview'
    
    const messages = request.messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }))
    
    const completion = await this.client.chat.completions.create({
      model,
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4000,
    })
    
    const choice = completion.choices[0]
    if (!choice || !choice.message) {
      throw new Error('No response from OpenAI')
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
        provider: 'openai',
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
