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
    maxContextLength: 1000000, // Gemini 2.0 Flash
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
    
    const modelName = request.model || 'gemini-2.0-flash'
    
    // Extract system instruction and conversation messages
    const systemMessage = request.messages.find(m => m.role === 'system')
    const conversationMessages = request.messages.filter(m => m.role !== 'system')
    
    const model = this.client.getGenerativeModel({
      model: modelName,
      systemInstruction: systemMessage?.content || undefined,
    })
    
    // Build proper multi-turn chat history (all messages except the last user message)
    const history = conversationMessages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }))
    
    // Get the last message as the current prompt
    const lastMessage = conversationMessages[conversationMessages.length - 1]
    
    const chat = model.startChat({
      history: history as any,
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 4096,
      },
    })
    
    const result = await chat.sendMessage(lastMessage.content)
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
