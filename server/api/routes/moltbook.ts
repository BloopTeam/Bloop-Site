/**
 * Moltbook API Routes
 * Real integration with moltbook.com (Feb 2026)
 * Docs: https://www.moltbook.com/developers
 */
import { Router } from 'express'
import { getMoltbookService } from '../../services/moltbook/index.js'

export const moltbookRouter = Router()

// GET /api/v1/moltbook/status
moltbookRouter.get('/status', async (req, res) => {
  try {
    const service = getMoltbookService()
    res.json(service.getStatus())
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Status check failed' })
  }
})

// GET /api/v1/moltbook/profile
moltbookRouter.get('/profile', async (req, res) => {
  try {
    const service = getMoltbookService()
    const agent = await service.getProfile()

    if (agent) {
      res.json({ agent })
    } else {
      res.json({
        agent: null,
        message: 'Not registered on Moltbook. Use POST /api/v1/moltbook/register to create your agent profile.',
      })
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Profile fetch failed' })
  }
})

// POST /api/v1/moltbook/register
moltbookRouter.post('/register', async (req, res) => {
  try {
    const { name, description, capabilities, twitterHandle } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Agent name is required' })
    }

    const service = getMoltbookService()
    const result = await service.registerAgent({
      name,
      description: description || 'An AI agent powered by Bloop',
      capabilities: capabilities || ['code-generation', 'code-review'],
      twitterHandle,
    })

    if (result.error) {
      return res.status(400).json({ error: result.error })
    }

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Registration failed' })
  }
})

// POST /api/v1/moltbook/identity/token - Generate identity token
moltbookRouter.post('/identity/token', async (req, res) => {
  try {
    const service = getMoltbookService()
    const result = await service.generateIdentityToken()

    if (result.error) {
      return res.status(400).json({ error: result.error })
    }

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Token generation failed' })
  }
})

// POST /api/v1/moltbook/identity/verify - Verify an agent's identity token
moltbookRouter.post('/identity/verify', async (req, res) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ error: 'Identity token is required' })
    }

    const service = getMoltbookService()
    const result = await service.verifyIdentity(token)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Verification failed' })
  }
})

// GET /api/v1/moltbook/feed
moltbookRouter.get('/feed', async (req, res) => {
  try {
    const service = getMoltbookService()
    const result = await service.getFeed({
      submolt: req.query.submolt as string,
      sort: (req.query.sort as any) || 'hot',
      limit: parseInt(req.query.limit as string) || 20,
      offset: parseInt(req.query.offset as string) || 0,
    })

    res.json(result)
  } catch (error) {
    res.json({ posts: [], hasMore: false })
  }
})

// POST /api/v1/moltbook/posts
moltbookRouter.post('/posts', async (req, res) => {
  try {
    const { submolt, title, content, contentType, tags } = req.body

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' })
    }

    const service = getMoltbookService()
    const result = await service.createPost({
      submolt: submolt || 'developers',
      title,
      content,
      contentType,
      tags,
    })

    if (result.error) {
      return res.status(400).json({ error: result.error })
    }

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Post creation failed' })
  }
})

// POST /api/v1/moltbook/posts/:id/vote
moltbookRouter.post('/posts/:id/vote', async (req, res) => {
  try {
    const { direction } = req.body
    const service = getMoltbookService()
    const success = await service.vote(req.params.id, direction || 'up')
    res.json({ success })
  } catch {
    res.json({ success: false })
  }
})

// GET /api/v1/moltbook/skills/trending
moltbookRouter.get('/skills/trending', async (req, res) => {
  try {
    const service = getMoltbookService()
    const skills = await service.getTrendingSkills()
    res.json({ skills })
  } catch {
    res.json({ skills: [] })
  }
})

// POST /api/v1/moltbook/skills/share
moltbookRouter.post('/skills/share', async (req, res) => {
  try {
    const { name, description, skillMd, version, tags } = req.body

    if (!name || !skillMd) {
      return res.status(400).json({ error: 'Skill name and skillMd content are required' })
    }

    const service = getMoltbookService()
    const result = await service.shareSkill({
      name,
      description: description || '',
      skillMd,
      version: version || '1.0.0',
      tags,
    })

    if (result.error) {
      return res.status(400).json({ error: result.error })
    }

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Skill sharing failed' })
  }
})

// GET /api/v1/moltbook/discover
moltbookRouter.get('/discover', async (req, res) => {
  try {
    const service = getMoltbookService()
    const agents = await service.discoverAgents(req.query.q as string)
    res.json({ agents })
  } catch {
    res.json({ agents: [] })
  }
})

// GET /api/v1/moltbook/submolts
moltbookRouter.get('/submolts', async (req, res) => {
  try {
    const service = getMoltbookService()
    const submolts = await service.getSubmolts()
    res.json({ submolts })
  } catch {
    res.json({ submolts: [] })
  }
})

