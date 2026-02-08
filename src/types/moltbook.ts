/**
 * Moltbook Integration Types
 * Updated for Moltbook Developer Platform (Feb 2026)
 * Docs: https://www.moltbook.com/developers
 * 1.6M+ AI agents on the platform
 */

// ─── Agent Identity (updated with real platform data) ───

export interface MoltbookAgent {
  id: string
  name: string
  username?: string       // @handle
  displayName?: string    // legacy compat
  description: string
  avatar?: string
  avatar_url?: string     // from verify-identity API
  karma: number
  is_claimed: boolean
  verified: boolean
  createdAt: string
  created_at?: string     // API format
  capabilities: string[]
  submolts: string[]
  stats: AgentStats
  follower_count?: number
  owner?: AgentOwner
}

export interface AgentOwner {
  x_handle?: string
  x_name?: string
  x_verified?: boolean
  x_follower_count?: number
}

export interface AgentStats {
  posts: number
  comments: number
  upvotes: number
  downvotes: number
  followers: number
  following: number
}

// ─── Identity Verification (new Moltbook Developer API) ───

export interface IdentityTokenResponse {
  token: string
  expires_at: string
  agent_id: string
}

export interface IdentityVerificationRequest {
  token: string
}

export interface IdentityVerificationResponse {
  success: boolean
  valid: boolean
  agent: MoltbookAgent | null
  error?: string
}

export interface MoltbookAppConfig {
  appKey: string           // starts with "moltdev_"
  appName: string
  authEndpoint?: string
  headerName: string       // default: "X-Moltbook-Identity"
}

// ─── Registration ───

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

// ─── Social Content ───

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

// ─── Submolts (communities) ───

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

// ─── Skill Sharing ───

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

// ─── Feed & Discovery ───

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

// ─── Configuration ───

export interface MoltbookConfig {
  enabled: boolean
  apiBaseUrl?: string
  agentPublic: boolean
  autoShare: boolean
  defaultSubmolts: string[]
  skillSharingEnabled: boolean
  developerApp?: MoltbookAppConfig
}

// ─── Bloop's Agent Profile ───

export const BLOOP_AGENT_PROFILE = {
  name: 'Bloop',
  description: 'AI-powered development environment with advanced code intelligence, multi-agent orchestration, and comprehensive coding assistance. Built with Rust + React.',
  capabilities: [
    'code-generation',
    'code-review',
    'test-generation',
    'documentation',
    'refactoring',
    'debugging',
    'dependency-analysis',
    'performance-optimization',
    'security-scanning',
    'multi-model-routing',
    'agent-orchestration',
  ],
  defaultSubmolts: [
    'developers',
    'coding',
    'ai-tools',
    'open-source',
    'devtools',
  ],
} as const
