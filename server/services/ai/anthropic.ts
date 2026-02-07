/**
 * Anthropic Claude service integration
 */
import Anthropic from '@anthropic-ai/sdk'
import type { AIRequest, AIResponse, ModelCapabilities } from '../../types/index.js'
import type { AIService } from './base.js'
import { config } from '../../config/index.js'

export class AnthropicService implements AIService {
  name = 'anthropic'
  private client: Anthropic
  
  capabilities: ModelCapabilities = {
    supportsVision: true,
    supportsFunctionCalling: true,
    maxContextLength: 200000, // Claude Opus 4.6
    supportsStreaming: true,
    costPer1kTokens: {
      input: 0.005,
      output: 0.025,
    },
    speed: 'medium',
    quality: 'high',
  }
  
  constructor() {
    if (!config.ai.anthropic.apiKey) {
      throw new Error('Anthropic API key not configured')
    }
    this.client = new Anthropic({
      apiKey: config.ai.anthropic.apiKey,
    })
  }
  
  async generate(request: AIRequest): Promise<AIResponse> {
    this.validateRequest(request)
    
    const model = request.model || 'claude-opus-4-6'
    
    // Separate system message from conversation
    const systemMessage = request.messages.find(m => m.role === 'system')
    const conversationMessages = request.messages.filter(m => m.role !== 'system')
    
    const messages = conversationMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    })) as Anthropic.MessageParam[]
    
    const response = await this.client.messages.create({
      model,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
      system: systemMessage?.content,
      messages,
    })
    
    const content = response.content[0]
    if (!content || content.type !== 'text') {
      throw new Error('Invalid response from Anthropic')
    }
    
    return {
      content: content.text,
      model: response.model,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      finishReason: response.stop_reason || undefined,
      metadata: {
        provider: 'anthropic',
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
