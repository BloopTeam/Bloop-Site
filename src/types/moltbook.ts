/**
 * Moltbook Integration Types
 * Social network for AI agents
 */

// Agent identity
export interface MoltbookAgent {
  id: string
  username: string
  displayName: string
  description: string
  avatar?: string
  karma: number
  createdAt: string
  verified: boolean
  capabilities: string[]
  submolts: string[]
  stats: AgentStats
}

export interface AgentStats {
  posts: number
  comments: number
  upvotes: number
  downvotes: number
  followers: number
  following: number
}

// Registration flow
export interface ClaimLink {
  url: string
  code: string
  expiresAt: string
  agentId: string
}

export interface RegistrationRequest {
  agentName: string
  description: string
  capabilities: string[]
  twitterHandle?: string
}

// Social content
export interface MoltbookPost {
  id: string
  author: MoltbookAgent
  submolt: string
  title: string
  content: string
  contentType: 'text' | 'code' | 'skill' | 'link'
  language?: string
  createdAt: string
  updatedAt?: string
  karma: number
  upvotes: number
  downvotes: number
  commentCount: number
  tags: string[]
}

export interface MoltbookComment {
  id: string
  postId: string
  author: MoltbookAgent
  content: string
  createdAt: string
  karma: number
  upvotes: number
  downvotes: number
  parentId?: string
  replies?: MoltbookComment[]
}

// Submolts (communities)
export interface Submolt {
  id: string
  name: string
  description: string
  memberCount: number
  postCount: number
  createdAt: string
  moderators: string[]
  rules: string[]
  icon?: string
  banner?: string
}

// Skill sharing
export interface SharedSkill {
  id: string
  name: string
  description: string
  author: MoltbookAgent
  version: string
  downloads: number
  rating: number
  ratingCount: number
  skillMd: string
  repository?: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

// Feed and discovery
export interface FeedOptions {
  submolt?: string
  sort: 'new' | 'top' | 'hot' | 'discussed'
  timeframe: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all'
  limit: number
  offset: number
}

export interface FeedResponse {
  posts: MoltbookPost[]
  hasMore: boolean
  nextOffset: number
}

// Configuration
export interface MoltbookConfig {
  enabled: boolean
  agentPublic: boolean
  autoShare: boolean
  defaultSubmolts: string[]
  skillSharingEnabled: boolean
}

// Bloop's agent profile
export const BLOOP_AGENT_PROFILE = {
  name: 'Bloop',
  description: 'AI-powered development environment with advanced code intelligence, multi-agent orchestration, and comprehensive coding assistance.',
  capabilities: [
    'code-generation',
    'code-review',
    'test-generation',
    'documentation',
    'refactoring',
    'debugging',
    'dependency-analysis',
    'performance-optimization',
    'security-scanning'
  ],
  defaultSubmolts: [
    'developers',
    'coding',
    'ai-tools',
    'open-source'
  ]
} as const
