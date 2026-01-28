/**
 * Intelligent model router - selects the best AI model for each request
 * This is what makes Bloop superior to KIMI and Claude
 */
import type { AIRequest, ModelProvider, ModelInfo } from '../../types/index.js'
import { OpenAIService } from './openai.js'
import { AnthropicService } from './anthropic.js'
import { GoogleService } from './google.js'
import type { AIService } from './base.js'
import { config } from '../../config/index.js'

export class ModelRouter {
  private services: Map<ModelProvider, AIService>
  
  constructor() {
    this.services = new Map()
    
    // Initialize available services
    try {
      if (config.ai.openai.apiKey) {
        this.services.set('openai', new OpenAIService())
      }
    } catch (error) {
      console.warn('OpenAI service not available:', error)
    }
    
    try {
      if (config.ai.anthropic.apiKey) {
        this.services.set('anthropic', new AnthropicService())
      }
    } catch (error) {
      console.warn('Anthropic service not available:', error)
    }
    
    try {
      if (config.ai.google.apiKey) {
        this.services.set('google', new GoogleService())
      }
    } catch (error) {
      console.warn('Google service not available:', error)
    }
  }
  
  /**
   * Intelligently selects the best model for a given request
   */
  selectBestModel(request: AIRequest): ModelInfo {
    const requestedProvider = request.model?.split('-')[0] as ModelProvider | undefined
    
    // If specific model requested, use it
    if (requestedProvider && this.services.has(requestedProvider)) {
      const service = this.services.get(requestedProvider)!
      return {
        provider: requestedProvider,
        model: request.model || this.getDefaultModel(requestedProvider),
        capabilities: service.capabilities,
      }
    }
    
    // Auto-select based on request characteristics
    const contextLength = this.estimateContextLength(request)
    const requiresVision = this.requiresVision(request)
    const requiresSpeed = this.requiresSpeed(request)
    const requiresQuality = this.requiresQuality(request)
    
    // Score each available service
    const scores: Array<{ provider: ModelProvider; service: AIService; score: number }> = []
    
    for (const [provider, service] of this.services.entries()) {
      const score = this.scoreService(service, contextLength, requiresVision, requiresSpeed, requiresQuality)
      scores.push({ provider, service, score })
    }
    
    if (scores.length === 0) {
      throw new Error('No AI services available')
    }
    
    // Sort by score and select best
    scores.sort((a, b) => b.score - a.score)
    const best = scores[0]
    
    return {
      provider: best.provider,
      model: this.getDefaultModel(best.provider),
      capabilities: best.service.capabilities,
    }
  }
  
  private scoreService(
    service: AIService,
    contextLength: number,
    requiresVision: boolean,
    requiresSpeed: boolean,
    requiresQuality: boolean,
  ): number {
    const caps = service.capabilities
    let score = 0
    
    // Context length match
    if (caps.maxContextLength >= contextLength) {
      score += 10
    } else {
      score -= 20
    }
    
    // Vision support
    if (requiresVision && caps.supportsVision) {
      score += 5
    }
    
    // Speed preference
    if (requiresSpeed) {
      if (caps.speed === 'fast') score += 5
      else if (caps.speed === 'medium') score += 2
    }
    
    // Quality preference
    if (requiresQuality) {
      if (caps.quality === 'high') score += 5
      else if (caps.quality === 'medium') score += 2
    }
    
    // Cost efficiency
    const avgCost = (caps.costPer1kTokens.input + caps.costPer1kTokens.output) / 2
    score += (0.01 / avgCost) * 2
    
    return score
  }
  
  private estimateContextLength(request: AIRequest): number {
    let length = 0
    
    for (const msg of request.messages) {
      length += Math.ceil(msg.content.length / 4)
    }
    
    if (request.context?.files) {
      for (const file of request.context.files) {
        length += Math.ceil(file.content.length / 4)
      }
    }
    
    return length
  }
  
  private requiresVision(request: AIRequest): boolean {
    const content = request.messages.map(m => m.content.toLowerCase()).join(' ')
    return content.includes('image') || 
           content.includes('screenshot') || 
           content.includes('visual') ||
           content.includes('design') ||
           (request.context?.files?.some(f => 
             f.path.match(/\.(png|jpg|jpeg|gif|svg)$/i)
           ) ?? false)
  }
  
  private requiresSpeed(request: AIRequest): boolean {
    const content = request.messages.map(m => m.content.toLowerCase()).join(' ')
    const simpleTasks = ['explain', 'summarize', 'translate', 'format', 'refactor simple']
    return simpleTasks.some(task => content.includes(task))
  }
  
  private requiresQuality(request: AIRequest): boolean {
    const content = request.messages.map(m => m.content.toLowerCase()).join(' ')
    const complexTasks = ['architecture', 'design', 'complex', 'critical', 'production', 'security']
    return complexTasks.some(task => content.includes(task))
  }
  
  private getDefaultModel(provider: ModelProvider): string {
    const defaults: Record<ModelProvider, string> = {
      openai: 'gpt-4-turbo-preview',
      anthropic: 'claude-3-5-sonnet-20241022',
      google: 'gemini-1.5-pro',
      auto: 'gpt-4-turbo-preview',
    }
    return defaults[provider]
  }
  
  getService(provider: ModelProvider): AIService | undefined {
    return this.services.get(provider)
  }
  
  getAvailableProviders(): ModelProvider[] {
    return Array.from(this.services.keys())
  }
}
