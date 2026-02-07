/**
 * Moltbook API Service
 * Real client for moltbook.com Developer Platform (Feb 2026)
 * Docs: https://www.moltbook.com/developers
 * 1.6M+ AI agents
 */

const MOLTBOOK_API_BASE = 'https://www.moltbook.com/api'

// ─── Types ───

interface MoltbookAgent {
  id: string
  name: string
  description: string
  karma: number
  avatar_url?: string
  is_claimed: boolean
  created_at: string
  follower_count?: number
  stats?: { posts: number; comments: number }
  owner?: {
    x_handle?: string
    x_name?: string
    x_verified?: boolean
    x_follower_count?: number
  }
}

// ─── Moltbook Service ───

export class MoltbookService {
  private apiKey: string
  private appKey: string
  private agentToken: string | null = null
  private agent: MoltbookAgent | null = null

  constructor() {
    this.apiKey = process.env.MOLTBOOK_API_KEY || ''
    this.appKey = process.env.MOLTBOOK_APP_KEY || ''
  }

  get isConfigured(): boolean {
    return !!(this.apiKey || this.appKey)
  }

  get isRegistered(): boolean {
    return !!this.agent
  }

  // ─── Identity & Authentication ───

  /**
   * Register Bloop as an agent on Moltbook
   */
  async registerAgent(profile: {
    name: string
    description: string
    capabilities: string[]
    twitterHandle?: string
  }): Promise<{ agent?: MoltbookAgent; claimUrl?: string; error?: string }> {
    try {
      const response = await fetch(`${MOLTBOOK_API_BASE}/v1/agents/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          name: profile.name,
          description: profile.description,
          capabilities: profile.capabilities,
          twitter_handle: profile.twitterHandle,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        return { error: (err as any).error || `Registration failed: ${response.status}` }
      }

      const data = await response.json() as any
      this.agent = data.agent
      return data
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Registration failed' }
    }
  }

  /**
   * Generate identity token for authentication with third-party apps
   * POST /api/v1/agents/me/identity-token
   */
  async generateIdentityToken(): Promise<{ token?: string; expires_at?: string; error?: string }> {
    if (!this.apiKey) {
      return { error: 'API key required for identity token generation' }
    }

    try {
      const response = await fetch(`${MOLTBOOK_API_BASE}/v1/agents/me/identity-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        return { error: `Token generation failed: ${response.status}` }
      }

      const data = await response.json() as any
      this.agentToken = data.token
      return data
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Token generation failed' }
    }
  }

  /**
   * Verify an identity token (for apps verifying agents)
   * POST /api/v1/agents/verify-identity
   */
  async verifyIdentity(token: string): Promise<{
    success: boolean
    valid: boolean
    agent: MoltbookAgent | null
    error?: string
  }> {
    if (!this.appKey) {
      return { success: false, valid: false, agent: null, error: 'App key (moltdev_...) required for verification' }
    }

    try {
      const response = await fetch(`${MOLTBOOK_API_BASE}/v1/agents/verify-identity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Moltbook-App-Key': this.appKey,
        },
        body: JSON.stringify({ token }),
      })

      if (!response.ok) {
        return { success: false, valid: false, agent: null, error: `Verification failed: ${response.status}` }
      }

      return await response.json() as any
    } catch (error) {
      return {
        success: false,
        valid: false,
        agent: null,
        error: error instanceof Error ? error.message : 'Verification failed',
      }
    }
  }

  // ─── Agent Profile ───

  async getProfile(): Promise<MoltbookAgent | null> {
    if (!this.apiKey) return this.agent

    try {
      const response = await fetch(`${MOLTBOOK_API_BASE}/v1/agents/me`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      })

      if (response.ok) {
        this.agent = await response.json() as MoltbookAgent
        return this.agent
      }
    } catch { /* silent */ }

    return this.agent
  }

  // ─── Social Features ───

  async getFeed(options: {
    submolt?: string
    sort?: 'new' | 'top' | 'hot' | 'discussed'
    limit?: number
    offset?: number
  } = {}): Promise<{ posts: any[]; hasMore: boolean }> {
    try {
      const params = new URLSearchParams()
      if (options.submolt) params.set('submolt', options.submolt)
      if (options.sort) params.set('sort', options.sort)
      if (options.limit) params.set('limit', String(options.limit))
      if (options.offset) params.set('offset', String(options.offset))

      const response = await fetch(`${MOLTBOOK_API_BASE}/v1/feed?${params}`, {
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
      })

      if (response.ok) {
        return await response.json() as any
      }
    } catch { /* silent */ }

    return { posts: [], hasMore: false }
  }

  async createPost(post: {
    submolt: string
    title: string
    content: string
    contentType?: string
    tags?: string[]
  }): Promise<{ post?: any; error?: string }> {
    if (!this.apiKey) return { error: 'API key required' }

    try {
      const response = await fetch(`${MOLTBOOK_API_BASE}/v1/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(post),
      })

      if (response.ok) {
        return await response.json() as any
      }
      return { error: `Post creation failed: ${response.status}` }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Post creation failed' }
    }
  }

  async vote(postId: string, direction: 'up' | 'down'): Promise<boolean> {
    if (!this.apiKey) return false

    try {
      const response = await fetch(`${MOLTBOOK_API_BASE}/v1/posts/${postId}/vote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ direction }),
      })
      return response.ok
    } catch { return false }
  }

  // ─── Skills ───

  async getTrendingSkills(): Promise<any[]> {
    try {
      const response = await fetch(`${MOLTBOOK_API_BASE}/v1/skills/trending`, {
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
      })

      if (response.ok) {
        const data = await response.json() as any
        return data.skills || []
      }
    } catch { /* silent */ }

    return []
  }

  async shareSkill(skill: {
    name: string
    description: string
    skillMd: string
    version: string
    tags?: string[]
  }): Promise<{ skill?: any; error?: string }> {
    if (!this.apiKey) return { error: 'API key required' }

    try {
      const response = await fetch(`${MOLTBOOK_API_BASE}/v1/skills`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(skill),
      })

      if (response.ok) {
        return await response.json() as any
      }
      return { error: `Skill sharing failed: ${response.status}` }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Skill sharing failed' }
    }
  }

  // ─── Discovery ───

  async discoverAgents(query?: string): Promise<any[]> {
    try {
      const params = query ? `?q=${encodeURIComponent(query)}` : ''
      const response = await fetch(`${MOLTBOOK_API_BASE}/v1/agents/discover${params}`, {
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
      })

      if (response.ok) {
        const data = await response.json() as any
        return data.agents || []
      }
    } catch { /* silent */ }

    return []
  }

  async getSubmolts(): Promise<any[]> {
    try {
      const response = await fetch(`${MOLTBOOK_API_BASE}/v1/submolts`, {
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
      })

      if (response.ok) {
        const data = await response.json() as any
        return data.submolts || []
      }
    } catch { /* silent */ }

    return []
  }

  // ─── Status ───

  getStatus() {
    return {
      enabled: process.env.MOLTBOOK_ENABLED === 'true',
      configured: this.isConfigured,
      registered: this.isRegistered,
      agent: this.agent,
      platformUrl: 'https://www.moltbook.com',
      developerDocs: 'https://www.moltbook.com/developers',
      agentCount: '1.6M+',
    }
  }
}

// Singleton
let instance: MoltbookService | null = null

export function getMoltbookService(): MoltbookService {
  if (!instance) {
    instance = new MoltbookService()
  }
  return instance
}
