/**
 * Chat API route handler
 * Supports both standard and streaming responses
 */
import { Router } from 'express'
import { ModelRouter } from '../../services/ai/router.js'
import type { AIRequest } from '../../types/index.js'

export const chatRouter = Router()
const router = new ModelRouter()

// Standard chat endpoint with automatic fallback
chatRouter.post('/', async (req, res) => {
  try {
    const request: AIRequest = req.body
    
    // Validate request
    if (!request.messages || !Array.isArray(request.messages) || request.messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required and cannot be empty' })
    }
    
    const providers = router.getAvailableProviders()
    if (providers.length === 0) {
      return res.status(503).json({ 
        error: 'No AI service available. Please configure at least one API key in your .env file.',
      })
    }
    
    // Select best model
    const modelInfo = router.selectBestModel(request)
    
    // Try the selected provider first, then fall back to others
    const tryOrder = [modelInfo.provider, ...providers.filter(p => p !== modelInfo.provider)]
    const errors: string[] = []
    
    for (const provider of tryOrder) {
      const service = router.getService(provider)
      if (!service) continue
      
      try {
        const startTime = Date.now()
        const response = await service.generate({
          ...request,
          model: provider === modelInfo.provider ? modelInfo.model : undefined,
        })
        const duration = Date.now() - startTime
        
        return res.json({
          ...response,
          provider,
          selectedModel: response.model,
          duration,
          fallback: provider !== modelInfo.provider ? { originalProvider: modelInfo.provider, reason: errors[errors.length - 1] } : undefined,
        })
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        errors.push(`${provider}: ${errMsg.slice(0, 100)}`)
        console.warn(`  ✗ ${provider} failed, trying next...`, errMsg.slice(0, 100))
      }
    }
    
    // All providers failed
    res.status(503).json({ 
      error: 'All AI providers failed',
      details: errors,
    })
  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    })
  }
})

// Streaming chat endpoint (SSE) — real token-by-token streaming with fallback
chatRouter.post('/stream', async (req, res) => {
  try {
    const request: AIRequest = req.body
    
    if (!request.messages || !Array.isArray(request.messages) || request.messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required and cannot be empty' })
    }
    
    const providers = router.getAvailableProviders()
    if (providers.length === 0) {
      return res.status(503).json({ error: 'No AI service available.' })
    }
    
    const modelInfo = router.selectBestModel(request)
    
    // Build provider try order — selected first, then fallbacks
    const tryOrder = [modelInfo.provider, ...providers.filter(p => p !== modelInfo.provider)]
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    
    // Try each provider in order until one succeeds
    let streamed = false
    
    for (const provider of tryOrder) {
      const service = router.getService(provider)
      if (!service) continue
      
      const modelName = provider === modelInfo.provider ? modelInfo.model : undefined
      
      // Send meta for the current attempt
      res.write(`data: ${JSON.stringify({ type: 'meta', provider, model: modelName || 'default' })}\n\n`)
      
      try {
        if (service.generateStream) {
          // Real streaming — wrap in a promise to await completion
          await new Promise<void>((resolve, reject) => {
            service.generateStream!(
              { ...request, model: modelName },
              {
                onToken: (text: string) => {
                  res.write(`data: ${JSON.stringify({ type: 'content', text })}\n\n`)
                },
                onDone: (info: any) => {
                  res.write(`data: ${JSON.stringify({ type: 'done', ...info })}\n\n`)
                  resolve()
                },
                onError: (error: string) => {
                  reject(new Error(error))
                },
              }
            ).catch(reject)
          })
          streamed = true
          break
        } else {
          // Non-streaming fallback — generate full then chunk
          const response = await service.generate({ ...request, model: modelName })
          const content = response.content
          const chunkSize = 12
          for (let i = 0; i < content.length; i += chunkSize) {
            res.write(`data: ${JSON.stringify({ type: 'content', text: content.slice(i, i + chunkSize) })}\n\n`)
          }
          res.write(`data: ${JSON.stringify({ type: 'done', usage: response.usage, model: response.model, finishReason: response.finishReason })}\n\n`)
          streamed = true
          break
        }
      } catch (err) {
        console.warn(`  ✗ ${provider} stream failed, trying next...`, err instanceof Error ? err.message.slice(0, 100) : String(err).slice(0, 100))
        // Continue to next provider
      }
    }
    
    if (!streamed) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'All AI providers failed' })}\n\n`)
    }
    res.end()
  } catch (error) {
    console.error('Stream error:', error)
    
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Stream error' })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' })
    }
  }
})

// Health check for AI services
chatRouter.get('/health', async (req, res) => {
  const providers = router.getAvailableProviders()
  res.json({
    status: providers.length > 0 ? 'healthy' : 'degraded',
    providers,
    providerCount: providers.length,
    message: providers.length > 0 
      ? `${providers.length} AI provider(s) ready` 
      : 'No AI providers configured. Add API keys to .env',
  })
})
