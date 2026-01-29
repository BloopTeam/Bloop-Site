/**
 * Chat API route handler
 */
import { Router } from 'express'
import { ModelRouter } from '../../services/ai/router.js'
import type { AIRequest } from '../../types/index.js'

export const chatRouter = Router()
const router = new ModelRouter()

chatRouter.post('/', async (req, res) => {
  try {
    const request: AIRequest = req.body
    
    // Validate request
    if (!request.messages || !Array.isArray(request.messages) || request.messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required and cannot be empty' })
    }
    
    // Select best model
    const modelInfo = router.selectBestModel(request)
    
    // Get service
    const service = router.getService(modelInfo.provider)
    if (!service) {
      return res.status(503).json({ 
        error: 'No AI service available. Please configure at least one API key in your .env file.' 
      })
    }
    
    // Generate response
    const response = await service.generate(request)
    
    res.json(response)
  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    })
  }
})
