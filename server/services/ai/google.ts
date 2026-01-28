/**
 * Google Gemini service integration
 */
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIRequest, AIResponse, ModelCapabilities } from '../../types/index.js'
import type { AIService } from './base.js'
import { config } from '../../config/index.js'

export class GoogleService implements AIService {
  name = 'google'
  private client: GoogleGenerativeAI
  
  capabilities: ModelCapabilities = {
    supportsVision: true,
    supportsFunctionCalling: true,
    maxContextLength: 1000000, // Gemini 1.5 Pro
    supportsStreaming: true,
    costPer1kTokens: {
      input: 0.00125,
      output: 0.005,
    },
    speed: 'fast',
    quality: 'high',
  }
  
  constructor() {
    if (!config.ai.google.apiKey) {
      throw new Error('Google Gemini API key not configured')
    }
    this.client = new GoogleGenerativeAI(config.ai.google.apiKey)
  }
  
  async generate(request: AIRequest): Promise<AIResponse> {
    this.validateRequest(request)
    
    const modelName = request.model || 'gemini-1.5-pro'
    const model = this.client.getGenerativeModel({ model: modelName })
    
    // Build prompt from messages
    const systemMessage = request.messages.find(m => m.role === 'system')
    const conversationMessages = request.messages.filter(m => m.role !== 'system')
    
    let prompt = ''
    if (systemMessage) {
      prompt += `System: ${systemMessage.content}\n\n`
    }
    
    for (const msg of conversationMessages) {
      const role = msg.role === 'assistant' ? 'Assistant' : 'User'
      prompt += `${role}: ${msg.content}\n\n`
    }
    prompt += 'Assistant:'
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 4096,
      },
    })
    
    const response = result.response
    const text = response.text()
    
    return {
      content: text,
      model: modelName,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0,
      },
      finishReason: response.candidates?.[0]?.finishReason || undefined,
      metadata: {
        provider: 'google',
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
