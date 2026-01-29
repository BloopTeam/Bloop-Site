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
    // Get all available models from router
    const providers = [
      { key: 'openai' as const, name: 'OpenAI', model: 'gpt-4-turbo-preview' },
      { key: 'anthropic' as const, name: 'Anthropic', model: 'claude-3-5-sonnet-20241022' },
      { key: 'google' as const, name: 'Google', model: 'gemini-1.5-pro' },
    ]

    const models = providers.map(provider => {
      const service = router.getService(provider.key)
      const available = !!service

      if (service) {
        const caps = service.capabilities()
        return {
          provider: provider.name,
          model: provider.model,
          available: true,
          capabilities: {
            supports_vision: caps.supports_vision,
            supports_function_calling: caps.supports_function_calling,
            max_context_length: caps.max_context_length,
            supports_streaming: caps.supports_streaming,
            cost_per_1k_tokens: {
              input: caps.cost_per_1k_tokens.input,
              output: caps.cost_per_1k_tokens.output,
            },
            speed: caps.speed,
            quality: caps.quality,
          }
        }
      } else {
        return {
          provider: provider.name,
          model: provider.model,
          available: false,
          capabilities: {
            supports_vision: false,
            supports_function_calling: false,
            max_context_length: 0,
            supports_streaming: false,
            cost_per_1k_tokens: { input: 0, output: 0 },
            speed: 'unknown',
            quality: 'unknown',
          }
        }
      }
    })

    // Add placeholder models for providers not yet implemented in Node.js backend
    const placeholderProviders = [
      { name: 'Moonshot', model: 'kimi-k2.5' },
      { name: 'DeepSeek', model: 'deepseek-chat' },
      { name: 'Mistral', model: 'mistral-large-latest' },
      { name: 'Cohere', model: 'command-r-plus' },
      { name: 'Perplexity', model: 'llama-3.1-sonar-large-128k-online' },
      { name: 'xAI', model: 'grok-beta' },
      { name: 'Together', model: 'meta-llama/Meta-Llama-3-70B-Instruct-Turbo' },
      { name: 'Anyscale', model: 'meta-llama/Meta-Llama-3.1-405B-Instruct' },
      { name: 'Qwen', model: 'qwen-plus' },
      { name: 'ZeroOne', model: 'yi-1.5-34b-chat' },
      { name: 'Baidu', model: 'ernie-4.0-8k' },
    ]

    placeholderProviders.forEach(provider => {
      models.push({
        provider: provider.name,
        model: provider.model,
        available: false,
        capabilities: {
          supports_vision: false,
          supports_function_calling: false,
          max_context_length: 0,
          supports_streaming: false,
          cost_per_1k_tokens: { input: 0, output: 0 },
          speed: 'unknown',
          quality: 'unknown',
        }
      })
    })

    const total_available = models.filter(m => m.available).length

    res.json({
      models,
      total_available,
      total_providers: models.length
    })
  } catch (error) {
    console.error('Error fetching models:', error)
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    })
  }
})
