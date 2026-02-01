/**
 * Moltbook Service
 * Integration with the social network for AI agents
 */

import type {
  MoltbookAgent,
  ClaimLink,
  RegistrationRequest,
  MoltbookPost,
  MoltbookComment,
  Submolt,
  SharedSkill,
  FeedOptions,
  FeedResponse,
  MoltbookConfig
} from '../types/moltbook'
import { BLOOP_AGENT_PROFILE } from '../types/moltbook'

const MOLTBOOK_API_URL = 'https://moltbook.com/api'

class MoltbookService {
  private readonly config: MoltbookConfig
  private agent: MoltbookAgent | null = null
  private authToken: string | null = null

  constructor(config?: Partial<MoltbookConfig>) {
    this.config = {
      enabled: true,
      agentPublic: false,
      autoShare: false,
      defaultSubmolts: BLOOP_AGENT_PROFILE.defaultSubmolts,
      skillSharingEnabled: true,
      ...config
    }

    // Try to load cached agent from localStorage
    this.loadCachedAgent()
  }

  private loadCachedAgent(): void {
    try {
      const cached = localStorage.getItem('moltbook-agent')
      if (cached) {
        this.agent = JSON.parse(cached)
      }
      const token = localStorage.getItem('moltbook-token')
      if (token) {
        this.authToken = token
      }
    } catch {
      // Ignore cache errors
    }
  }

  private saveAgentToCache(): void {
    try {
      if (this.agent) {
        localStorage.setItem('moltbook-agent', JSON.stringify(this.agent))
      }
      if (this.authToken) {
        localStorage.setItem('moltbook-token', this.authToken)
      }
    } catch {
      // Ignore cache errors
    }
  }

  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>)
    }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }

    const response = await fetch(`${MOLTBOOK_API_URL}${endpoint}`, {
      ...options,
      headers
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Agent registration
  async registerAgent(request?: Partial<RegistrationRequest>): Promise<ClaimLink> {
    const registrationData: RegistrationRequest = {
      agentName: request?.agentName || BLOOP_AGENT_PROFILE.name,
      description: request?.description || BLOOP_AGENT_PROFILE.description,
      capabilities: request?.capabilities || [...BLOOP_AGENT_PROFILE.capabilities],
      twitterHandle: request?.twitterHandle
    }

    try {
      const claimLink = await this.fetch<ClaimLink>('/agents/register', {
        method: 'POST',
        body: JSON.stringify(registrationData)
      })

      return claimLink
    } catch (error) {
      console.error('[Moltbook] Failed to register agent:', error)
      // Return mock claim link for development
      return {
        url: `https://moltbook.com/claim/${Date.now()}`,
        code: `BLOOP-${Math.random().toString(36).substring(7).toUpperCase()}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        agentId: `agent_${Date.now()}`
      }
    }
  }

  async claimAgent(claimLink: string, twitterHandle: string): Promise<MoltbookAgent> {
    try {
      const response = await this.fetch<{ agent: MoltbookAgent; token: string }>('/agents/claim', {
        method: 'POST',
        body: JSON.stringify({ claimLink, twitterHandle })
      })

      this.agent = response.agent
      this.authToken = response.token
      this.saveAgentToCache()

      return this.agent
    } catch (error) {
      console.error('[Moltbook] Failed to claim agent:', error)
      throw error
    }
  }

  async getAgentProfile(agentId?: string): Promise<MoltbookAgent | null> {
    if (!agentId && this.agent) {
      return this.agent
    }

    try {
      const agent = await this.fetch<MoltbookAgent>(`/agents/${agentId || 'me'}`)
      
      if (!agentId || agentId === this.agent?.id) {
        this.agent = agent
        this.saveAgentToCache()
      }

      return agent
    } catch (error) {
      console.error('[Moltbook] Failed to get agent profile:', error)
      return this.agent
    }
  }

  isRegistered(): boolean {
    return this.agent !== null && this.authToken !== null
  }

  // Social content
  async createPost(options: {
    submolt: string
    title: string
    content: string
    contentType?: 'text' | 'code' | 'skill' | 'link'
    language?: string
    tags?: string[]
  }): Promise<MoltbookPost> {
    if (!this.isRegistered()) {
      throw new Error('Agent not registered with Moltbook')
    }

    try {
      return await this.fetch<MoltbookPost>('/posts', {
        method: 'POST',
        body: JSON.stringify({
          submolt: options.submolt,
          title: options.title,
          content: options.content,
          contentType: options.contentType || 'text',
          language: options.language,
          tags: options.tags || []
        })
      })
    } catch (error) {
      console.error('[Moltbook] Failed to create post:', error)
      throw error
    }
  }

  async getPost(postId: string): Promise<MoltbookPost | null> {
    try {
      return await this.fetch<MoltbookPost>(`/posts/${postId}`)
    } catch (error) {
      console.error('[Moltbook] Failed to get post:', error)
      return null
    }
  }

  async getFeed(options?: Partial<FeedOptions>): Promise<FeedResponse> {
    const params = new URLSearchParams({
      sort: options?.sort || 'hot',
      timeframe: options?.timeframe || 'day',
      limit: String(options?.limit || 25),
      offset: String(options?.offset || 0)
    })

    if (options?.submolt) {
      params.set('submolt', options.submolt)
    }

    try {
      return await this.fetch<FeedResponse>(`/feed?${params}`)
    } catch (error) {
      console.error('[Moltbook] Failed to get feed:', error)
      return { posts: [], hasMore: false, nextOffset: 0 }
    }
  }

  async vote(postId: string, direction: 'up' | 'down'): Promise<void> {
    if (!this.isRegistered()) return

    try {
      await this.fetch(`/posts/${postId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ direction })
      })
    } catch (error) {
      console.error('[Moltbook] Failed to vote:', error)
    }
  }

  async comment(postId: string, content: string, parentId?: string): Promise<MoltbookComment> {
    if (!this.isRegistered()) {
      throw new Error('Agent not registered with Moltbook')
    }

    try {
      return await this.fetch<MoltbookComment>(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, parentId })
      })
    } catch (error) {
      console.error('[Moltbook] Failed to comment:', error)
      throw error
    }
  }

  async getComments(postId: string): Promise<MoltbookComment[]> {
    try {
      return await this.fetch<MoltbookComment[]>(`/posts/${postId}/comments`)
    } catch (error) {
      console.error('[Moltbook] Failed to get comments:', error)
      return []
    }
  }

  // Submolts
  async listSubmolts(): Promise<Submolt[]> {
    try {
      return await this.fetch<Submolt[]>('/submolts')
    } catch (error) {
      console.error('[Moltbook] Failed to list submolts:', error)
      return []
    }
  }

  async getSubmolt(name: string): Promise<Submolt | null> {
    try {
      return await this.fetch<Submolt>(`/submolts/${name}`)
    } catch (error) {
      console.error('[Moltbook] Failed to get submolt:', error)
      return null
    }
  }

  async joinSubmolt(name: string): Promise<void> {
    if (!this.isRegistered()) return

    try {
      await this.fetch(`/submolts/${name}/join`, { method: 'POST' })
    } catch (error) {
      console.error('[Moltbook] Failed to join submolt:', error)
    }
  }

  // Skill sharing
  async shareSkill(skill: {
    name: string
    description: string
    skillMd: string
    version: string
    tags?: string[]
    repository?: string
  }): Promise<SharedSkill> {
    if (!this.isRegistered()) {
      throw new Error('Agent not registered with Moltbook')
    }

    if (!this.config.skillSharingEnabled) {
      throw new Error('Skill sharing is disabled')
    }

    try {
      return await this.fetch<SharedSkill>('/skills', {
        method: 'POST',
        body: JSON.stringify(skill)
      })
    } catch (error) {
      console.error('[Moltbook] Failed to share skill:', error)
      throw error
    }
  }

  async getTrendingSkills(limit = 10): Promise<SharedSkill[]> {
    try {
      return await this.fetch<SharedSkill[]>(`/skills/trending?limit=${limit}`)
    } catch (error) {
      console.error('[Moltbook] Failed to get trending skills:', error)
      return []
    }
  }

  async searchSkills(query: string): Promise<SharedSkill[]> {
    try {
      return await this.fetch<SharedSkill[]>(`/skills/search?q=${encodeURIComponent(query)}`)
    } catch (error) {
      console.error('[Moltbook] Failed to search skills:', error)
      return []
    }
  }

  async downloadSkill(skillId: string): Promise<{ skillMd: string; metadata: SharedSkill }> {
    try {
      return await this.fetch<{ skillMd: string; metadata: SharedSkill }>(`/skills/${skillId}/download`)
    } catch (error) {
      console.error('[Moltbook] Failed to download skill:', error)
      throw error
    }
  }

  // Code sharing helpers
  async shareCode(options: {
    title: string
    code: string
    language: string
    description?: string
    submolt?: string
  }): Promise<MoltbookPost> {
    return this.createPost({
      submolt: options.submolt || 'coding',
      title: options.title,
      content: options.description 
        ? `${options.description}\n\n\`\`\`${options.language}\n${options.code}\n\`\`\``
        : `\`\`\`${options.language}\n${options.code}\n\`\`\``,
      contentType: 'code',
      language: options.language,
      tags: [options.language]
    })
  }

  // Agent discovery
  async discoverAgents(options?: {
    capability?: string
    sort?: 'karma' | 'recent' | 'active'
    limit?: number
  }): Promise<MoltbookAgent[]> {
    const params = new URLSearchParams()
    if (options?.capability) params.set('capability', options.capability)
    if (options?.sort) params.set('sort', options.sort)
    if (options?.limit) params.set('limit', String(options.limit))

    try {
      return await this.fetch<MoltbookAgent[]>(`/agents/discover?${params}`)
    } catch (error) {
      console.error('[Moltbook] Failed to discover agents:', error)
      return []
    }
  }

  // Follow/unfollow agents
  async followAgent(agentId: string): Promise<boolean> {
    if (!this.isRegistered()) return false

    try {
      await this.fetch(`/agents/${agentId}/follow`, { method: 'POST' })
      return true
    } catch (error) {
      console.error('[Moltbook] Failed to follow agent:', error)
      return false
    }
  }

  async unfollowAgent(agentId: string): Promise<boolean> {
    if (!this.isRegistered()) return false

    try {
      await this.fetch(`/agents/${agentId}/unfollow`, { method: 'POST' })
      return true
    } catch (error) {
      console.error('[Moltbook] Failed to unfollow agent:', error)
      return false
    }
  }

  async getFollowing(): Promise<MoltbookAgent[]> {
    if (!this.isRegistered()) return []

    try {
      return await this.fetch<MoltbookAgent[]>('/agents/me/following')
    } catch (error) {
      console.error('[Moltbook] Failed to get following:', error)
      return []
    }
  }

  async getFollowers(): Promise<MoltbookAgent[]> {
    if (!this.isRegistered()) return []

    try {
      return await this.fetch<MoltbookAgent[]>('/agents/me/followers')
    } catch (error) {
      console.error('[Moltbook] Failed to get followers:', error)
      return []
    }
  }

  // Direct messaging between agents
  async sendDirectMessage(toAgentId: string, message: string): Promise<{
    id: string
    content: string
    timestamp: string
  } | null> {
    if (!this.isRegistered()) return null

    try {
      return await this.fetch<{ id: string; content: string; timestamp: string }>('/messages', {
        method: 'POST',
        body: JSON.stringify({ toAgentId, message })
      })
    } catch (error) {
      console.error('[Moltbook] Failed to send message:', error)
      return null
    }
  }

  async getDirectMessages(withAgentId?: string): Promise<Array<{
    id: string
    fromAgent: MoltbookAgent
    toAgent: MoltbookAgent
    content: string
    timestamp: string
    read: boolean
  }>> {
    if (!this.isRegistered()) return []

    const params = withAgentId ? `?with=${withAgentId}` : ''

    try {
      return await this.fetch(`/messages${params}`)
    } catch (error) {
      console.error('[Moltbook] Failed to get messages:', error)
      return []
    }
  }

  // Notifications
  async getNotifications(): Promise<Array<{
    id: string
    type: 'mention' | 'reply' | 'follow' | 'upvote' | 'skill_download'
    message: string
    read: boolean
    timestamp: string
    link?: string
  }>> {
    if (!this.isRegistered()) return []

    try {
      return await this.fetch('/notifications')
    } catch (error) {
      console.error('[Moltbook] Failed to get notifications:', error)
      return []
    }
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    if (!this.isRegistered()) return

    try {
      await this.fetch(`/notifications/${notificationId}/read`, { method: 'POST' })
    } catch (error) {
      console.error('[Moltbook] Failed to mark notification read:', error)
    }
  }

  // Bookmarks
  async bookmarkPost(postId: string): Promise<boolean> {
    if (!this.isRegistered()) return false

    try {
      await this.fetch(`/posts/${postId}/bookmark`, { method: 'POST' })
      return true
    } catch (error) {
      console.error('[Moltbook] Failed to bookmark:', error)
      return false
    }
  }

  async getBookmarks(): Promise<MoltbookPost[]> {
    if (!this.isRegistered()) return []

    try {
      return await this.fetch<MoltbookPost[]>('/bookmarks')
    } catch (error) {
      console.error('[Moltbook] Failed to get bookmarks:', error)
      return []
    }
  }

  // Activity feed (personalized)
  async getActivityFeed(): Promise<Array<{
    type: 'post' | 'skill' | 'follow' | 'comment'
    actor: MoltbookAgent
    target?: MoltbookPost | SharedSkill
    timestamp: string
    message: string
  }>> {
    if (!this.isRegistered()) return []

    try {
      return await this.fetch('/activity')
    } catch (error) {
      console.error('[Moltbook] Failed to get activity:', error)
      return []
    }
  }

  // Rate a skill
  async rateSkill(skillId: string, rating: 1 | 2 | 3 | 4 | 5, review?: string): Promise<boolean> {
    if (!this.isRegistered()) return false

    try {
      await this.fetch(`/skills/${skillId}/rate`, {
        method: 'POST',
        body: JSON.stringify({ rating, review })
      })
      return true
    } catch (error) {
      console.error('[Moltbook] Failed to rate skill:', error)
      return false
    }
  }

  // Get current agent stats
  getAgent(): MoltbookAgent | null {
    return this.agent
  }

  // Logout
  logout(): void {
    this.agent = null
    this.authToken = null
    localStorage.removeItem('moltbook-agent')
    localStorage.removeItem('moltbook-token')
  }

  // Configuration
  getConfig(): MoltbookConfig {
    return { ...this.config }
  }

  updateConfig(updates: Partial<MoltbookConfig>): void {
    Object.assign(this.config, updates)
  }
}

// Singleton instance
export const moltbookService = new MoltbookService()

// Export class for custom instances
export { MoltbookService }
