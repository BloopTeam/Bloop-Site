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

// Streaming chat endpoint (SSE)
chatRouter.post('/stream', async (req, res) => {
  try {
    const request: AIRequest = req.body
    
    if (!request.messages || !Array.isArray(request.messages) || request.messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required and cannot be empty' })
    }
    
    const modelInfo = router.selectBestModel(request)
    const service = router.getService(modelInfo.provider)
    
    if (!service) {
      return res.status(503).json({ 
        error: 'No AI service available.',
        available_providers: router.getAvailableProviders(),
      })
    }
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    
    // Send model info first
    res.write(`data: ${JSON.stringify({ type: 'meta', provider: modelInfo.provider, model: modelInfo.model })}\n\n`)
    
    // Generate full response (streaming at the service level would need per-provider implementation)
    // For now, we chunk the response to simulate streaming for better UX
    const response = await service.generate({
      ...request,
      model: modelInfo.model,
    })
    
    // Stream the response in chunks
    const content = response.content
    const chunkSize = 20 // characters per chunk
    
    for (let i = 0; i < content.length; i += chunkSize) {
      const chunk = content.slice(i, i + chunkSize)
      res.write(`data: ${JSON.stringify({ type: 'content', text: chunk })}\n\n`)
    }
    
    // Send completion event
    res.write(`data: ${JSON.stringify({ 
      type: 'done', 
      usage: response.usage,
      model: response.model,
      finishReason: response.finishReason,
    })}\n\n`)
    
    res.end()
  } catch (error) {
    console.error('Stream error:', error)
    
    // If headers already sent, send error as SSE event
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
