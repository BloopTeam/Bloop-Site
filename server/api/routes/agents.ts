/**
 * Agent API route handlers
 */
import { Router } from 'express'

export const agentRouter = Router()

agentRouter.post('/create', async (req, res) => {
  // TODO: Implement agent creation
  res.status(501).json({ error: 'Not implemented yet' })
})

agentRouter.get('/:id', async (req, res) => {
  // TODO: Implement agent status retrieval
  res.status(501).json({ error: 'Not implemented yet' })
})
