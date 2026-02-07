/**
 * Intelligent model router - selects the best AI model for each request
 * Supports 7+ providers with automatic selection based on task requirements
 */
import type { AIRequest, ModelProvider, ModelInfo } from '../../types/index.js'
import { OpenAIService } from './openai.js'
import { AnthropicService } from './anthropic.js'
import { GoogleService } from './google.js'
import { PerplexityService } from './perplexity.js'
import { DeepSeekService } from './deepseek.js'
import { MoonshotService } from './moonshot.js'
import { MistralService } from './mistral.js'
import type { AIService } from './base.js'
import { config } from '../../config/index.js'

export class ModelRouter {
  private services: Map<ModelProvider, AIService>
  
  constructor() {
    this.services = new Map()
    
    // Initialize available services based on configured API keys
    const providerConfigs: Array<{ key: ModelProvider; apiKey: string; ServiceClass: new () => AIService }> = [
      { key: 'openai', apiKey: config.ai.openai.apiKey, ServiceClass: OpenAIService },
      { key: 'anthropic', apiKey: config.ai.anthropic.apiKey, ServiceClass: AnthropicService },
      { key: 'google', apiKey: config.ai.google.apiKey, ServiceClass: GoogleService },
      { key: 'perplexity', apiKey: config.ai.perplexity.apiKey, ServiceClass: PerplexityService },
      { key: 'deepseek', apiKey: config.ai.deepseek.apiKey, ServiceClass: DeepSeekService },
      { key: 'moonshot', apiKey: config.ai.moonshot.apiKey, ServiceClass: MoonshotService },
      { key: 'mistral', apiKey: config.ai.mistral.apiKey, ServiceClass: MistralService },
    ]
    
    for (const { key, apiKey, ServiceClass } of providerConfigs) {
      try {
        if (apiKey) {
          this.services.set(key, new ServiceClass())
          console.log(`  ✓ ${key} provider initialized`)
        }
      } catch (error) {
        console.warn(`  ✗ ${key} service not available:`, error instanceof Error ? error.message : error)
      }
    }
    
    console.log(`  → ${this.services.size} AI provider(s) active`)
  }
  
  /**
   * Intelligently selects the best model for a given request
   */
  selectBestModel(request: AIRequest): ModelInfo {
    // Check for specific provider request (e.g. model="perplexity-..." or "deepseek-...")
    const requestedProvider = this.detectProvider(request.model)
    
    // If specific model requested and available, use it
    if (requestedProvider && requestedProvider !== 'auto' && this.services.has(requestedProvider)) {
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
    const requiresSearch = this.requiresSearch(request)
    const requiresCoding = this.requiresCoding(request)
    
    // Score each available service
    const scores: Array<{ provider: ModelProvider; service: AIService; score: number }> = []
    
    for (const [provider, service] of this.services.entries()) {
      const score = this.scoreService(
        provider, service, contextLength,
        requiresVision, requiresSpeed, requiresQuality,
        requiresSearch, requiresCoding
      )
      scores.push({ provider, service, score })
    }
    
    if (scores.length === 0) {
      throw new Error('No AI services available. Please configure at least one API key in .env')
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
  
  private detectProvider(model?: string): ModelProvider | undefined {
    if (!model) return undefined
    
    const modelLower = model.toLowerCase()
    
    if (modelLower.includes('gpt') || modelLower.includes('openai')) return 'openai'
    if (modelLower.includes('claude') || modelLower.includes('anthropic')) return 'anthropic'
    if (modelLower.includes('gemini') || modelLower.includes('google')) return 'google'
    if (modelLower.includes('sonar') || modelLower.includes('perplexity')) return 'perplexity'
    if (modelLower.includes('deepseek')) return 'deepseek'
    if (modelLower.includes('moonshot') || modelLower.includes('kimi')) return 'moonshot'
    if (modelLower.includes('mistral') || modelLower.includes('mixtral')) return 'mistral'
    
    return undefined
  }
  
  private scoreService(
    provider: ModelProvider,
    service: AIService,
    contextLength: number,
    requiresVision: boolean,
    requiresSpeed: boolean,
    requiresQuality: boolean,
    requiresSearch: boolean,
    requiresCoding: boolean,
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
    } else if (requiresVision && !caps.supportsVision) {
      score -= 10
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
    
    // Search-enhanced tasks -> prefer Perplexity
    if (requiresSearch && provider === 'perplexity') {
      score += 15
    }
    
    // Coding tasks -> prefer DeepSeek (code-specialized) or Anthropic (excellent at code)
    if (requiresCoding) {
      if (provider === 'deepseek') score += 10
      if (provider === 'anthropic') score += 8
    }
    
    // Cost efficiency
    const avgCost = (caps.costPer1kTokens.input + caps.costPer1kTokens.output) / 2
    if (avgCost > 0) {
      score += (0.01 / avgCost) * 2
    }
    
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
    const complexTasks = ['architecture', 'design system', 'complex', 'critical', 'production', 'security audit']
    return complexTasks.some(task => content.includes(task))
  }
  
  private requiresSearch(request: AIRequest): boolean {
    const content = request.messages.map(m => m.content.toLowerCase()).join(' ')
    const searchTerms = [
      'search', 'find online', 'latest', 'current', 'today', 'news',
      'documentation', 'look up', 'what is the latest', 'recent',
      'up to date', 'real-time', 'web search', 'browse',
    ]
    return searchTerms.some(term => content.includes(term))
  }
  
  private requiresCoding(request: AIRequest): boolean {
    const content = request.messages.map(m => m.content.toLowerCase()).join(' ')
    const codeTerms = [
      'code', 'function', 'class', 'implement', 'debug', 'fix bug',
      'refactor', 'optimize', 'typescript', 'javascript', 'python',
      'rust', 'algorithm', 'api', 'endpoint', 'component',
    ]
    return codeTerms.some(term => content.includes(term))
  }
  
  private getDefaultModel(provider: ModelProvider): string {
    const defaults: Record<string, string> = {
      openai: 'gpt-4o',
      anthropic: 'claude-opus-4-6',
      google: 'gemini-2.0-flash',
      perplexity: 'llama-3.1-sonar-large-128k-online',
      deepseek: 'deepseek-chat',
      moonshot: 'moonshot-v1-128k',
      mistral: 'mistral-large-2512',
      auto: 'gpt-4o',
    }
    return defaults[provider] || 'gpt-4o'
  }
  
  getService(provider: ModelProvider): AIService | undefined {
    return this.services.get(provider)
  }
  
  getAvailableProviders(): ModelProvider[] {
    return Array.from(this.services.keys())
  }
  
  getProviderCount(): number {
    return this.services.size
  }
}
