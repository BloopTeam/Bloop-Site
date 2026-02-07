/**
 * Models API route handler
 * Lists all available models and their capabilities
 */
import { Router } from 'express'
import { ModelRouter } from '../../services/ai/router.js'

export const modelsRouter = Router()
const router = new ModelRouter()

modelsRouter.get('/', async (req, res) => {
  try {
    const allProviders = [
      { key: 'openai' as const, name: 'OpenAI', model: 'gpt-4o', category: 'general' },
      { key: 'anthropic' as const, name: 'Anthropic', model: 'claude-opus-4-6', category: 'general' },
      { key: 'google' as const, name: 'Google', model: 'gemini-2.0-flash', category: 'general' },
      { key: 'mistral' as const, name: 'Mistral', model: 'mistral-large-2512', category: 'general' },
    ]

    const models = allProviders.map(provider => {
      const service = router.getService(provider.key)

      if (service) {
        const caps = service.capabilities
        return {
          provider: provider.name,
          model: provider.model,
          category: provider.category,
          available: true,
          capabilities: {
            supportsVision: caps.supportsVision,
            supportsFunctionCalling: caps.supportsFunctionCalling,
            maxContextLength: caps.maxContextLength,
            supportsStreaming: caps.supportsStreaming,
            costPer1kTokens: caps.costPer1kTokens,
            speed: caps.speed,
            quality: caps.quality,
          }
        }
      } else {
        return {
          provider: provider.name,
          model: provider.model,
          category: provider.category,
          available: false,
          capabilities: null,
          hint: `Set ${provider.key.toUpperCase()}_API_KEY in .env to enable`,
        }
      }
    })

    // Providers that can be added later (keys not configured yet)
    const inactiveProviders = [
      { name: 'Perplexity', model: 'llama-3.1-sonar-large-128k-online', category: 'search', hint: 'Set PERPLEXITY_API_KEY — search-enhanced AI' },
      { name: 'DeepSeek', model: 'deepseek-chat', category: 'code', hint: 'Set DEEPSEEK_API_KEY — code-specialized AI' },
      { name: 'Moonshot (Kimi)', model: 'moonshot-v1-128k', category: 'general', hint: 'Set MOONSHOT_API_KEY — coming soon' },
    ]

    inactiveProviders.forEach(provider => {
      models.push({
        provider: provider.name,
        model: provider.model,
        category: provider.category,
        available: false,
        capabilities: null,
        hint: provider.hint,
      } as any)
    })

    const totalAvailable = models.filter(m => m.available).length

    res.json({
      models,
      total_available: totalAvailable,
      total_providers: models.length,
      active_providers: router.getAvailableProviders(),
    })
  } catch (error) {
    console.error('Error fetching models:', error)
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    })
  }
})
