/**
 * Plugin Marketplace Service
 * 
 * Phase 8: Platform & Ecosystem - Plugin Marketplace
 * 
 * Features:
 * - Browse and search plugins
 * - Plugin ratings and reviews
 * - Categories and tags
 * - Featured plugins
 * - Trending plugins
 * - Plugin recommendations
 * - Version history
 * - Publisher profiles
 * - Plugin analytics
 * - Download statistics
 */

import { PluginManifest, Plugin } from './pluginSystem'

export interface MarketplacePlugin {
  id: string
  manifest: PluginManifest
  publisher: MarketplacePublisher
  statistics: PluginStatistics
  reviews: PluginReview[]
  rating: number
  reviewCount: number
  downloadCount: number
  weeklyDownloadCount: number
  featured: boolean
  verified: boolean
  trending: boolean
  categories: string[]
  tags: string[]
  screenshots: string[]
  readme?: string
  changelog?: string
  publishedAt: Date
  updatedAt: Date
  versions: PluginVersion[]
  latestVersion: string
  compatibility: {
    minBloopVersion: string
    maxBloopVersion?: string
    testedVersions: string[]
  }
  pricing?: PluginPricing
  license: string
  repository?: {
    type: 'github' | 'gitlab' | 'bitbucket' | 'other'
    url: string
    stars?: number
    forks?: number
  }
}

export interface MarketplacePublisher {
  id: string
  name: string
  displayName: string
  avatar?: string
  verified: boolean
  pluginCount: number
  totalDownloads: number
  rating: number
  joinedAt: Date
  website?: string
  bio?: string
}

export interface PluginStatistics {
  totalDownloads: number
  weeklyDownloads: number
  monthlyDownloads: number
  activeInstalls: number
  rating: number
  reviewCount: number
  lastUpdated: Date
  firstPublished: Date
}

export interface PluginReview {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  rating: number
  title?: string
  comment: string
  helpful: number
  verifiedPurchase: boolean
  createdAt: Date
  updatedAt?: Date
  version?: string
}

export interface PluginVersion {
  version: string
  changelog: string
  publishedAt: Date
  downloadCount: number
  compatibility: {
    minBloopVersion: string
    maxBloopVersion?: string
  }
}

export interface PluginPricing {
  model: 'free' | 'one-time' | 'subscription' | 'freemium'
  price?: number
  currency?: string
  subscriptionPeriod?: 'monthly' | 'yearly'
  trialDays?: number
  features?: {
    free: string[]
    paid: string[]
  }
}

export interface MarketplaceSearchFilters {
  query?: string
  category?: string
  tags?: string[]
  minRating?: number
  verified?: boolean
  featured?: boolean
  trending?: boolean
  pricing?: 'free' | 'paid' | 'all'
  sortBy?: 'relevance' | 'rating' | 'downloads' | 'updated' | 'published'
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface MarketplaceSearchResult {
  plugins: MarketplacePlugin[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

type EventCallback = (data: unknown) => void

/**
 * Advanced Plugin Marketplace Service
 * 
 * Provides marketplace functionality for discovering, browsing,
 * and installing plugins from the Bloop ecosystem
 */
class PluginMarketplaceService {
  private plugins: Map<string, MarketplacePlugin> = new Map()
  private publishers: Map<string, MarketplacePublisher> = new Map()
  private categories: Set<string> = new Set()
  private tags: Set<string> = new Set()
  private listeners: Map<string, EventCallback[]> = new Map()
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  constructor() {
    this.initializeMarketplace()
  }

  /**
   * Initialize marketplace with sample data
   */
  private initializeMarketplace(): void {
    // Initialize categories
    this.categories.add('Language Support')
    this.categories.add('Linters & Formatters')
    this.categories.add('Git Integration')
    this.categories.add('API Tools')
    this.categories.add('Themes')
    this.categories.add('Productivity')
    this.categories.add('Debugging')
    this.categories.add('Testing')
    this.categories.add('Deployment')
    this.categories.add('AI & ML')
    
    // Initialize sample publishers
    this.initializePublishers()
    
    // Initialize sample plugins
    this.initializeSamplePlugins()
  }

  /**
   * Initialize sample publishers
   */
  private initializePublishers(): void {
    const publishers: MarketplacePublisher[] = [
      {
        id: 'microsoft',
        name: 'Microsoft',
        displayName: 'Microsoft',
        verified: true,
        pluginCount: 15,
        totalDownloads: 5000000,
        rating: 4.8,
        joinedAt: new Date('2020-01-01')
      },
      {
        id: 'bloop-team',
        name: 'bloop-team',
        displayName: 'Bloop Team',
        verified: true,
        pluginCount: 8,
        totalDownloads: 2000000,
        rating: 4.9,
        joinedAt: new Date('2023-01-01')
      },
      {
        id: 'community',
        name: 'community',
        displayName: 'Community Contributors',
        verified: false,
        pluginCount: 150,
        totalDownloads: 1000000,
        rating: 4.2,
        joinedAt: new Date('2023-06-01')
      }
    ]
    
    publishers.forEach(pub => {
      this.publishers.set(pub.id, pub)
    })
  }

  /**
   * Initialize sample plugins
   */
  private initializeSamplePlugins(): void {
    // This would load from marketplace API in production
    // For now, we create sample data
  }

  /**
   * Search plugins in marketplace
   */
  async searchPlugins(filters: MarketplaceSearchFilters = {}): Promise<MarketplaceSearchResult> {
    const cacheKey = `search:${JSON.stringify(filters)}`
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }

    let results = Array.from(this.plugins.values())
    
    // Apply filters
    if (filters.query) {
      const query = filters.query.toLowerCase()
      results = results.filter(plugin => 
        plugin.manifest.name.toLowerCase().includes(query) ||
        plugin.manifest.description.toLowerCase().includes(query) ||
        plugin.manifest.keywords?.some(k => k.toLowerCase().includes(query)) ||
        plugin.tags.some(t => t.toLowerCase().includes(query))
      )
    }
    
    if (filters.category) {
      results = results.filter(plugin => 
        plugin.categories.includes(filters.category!)
      )
    }
    
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(plugin =>
        filters.tags!.some(tag => plugin.tags.includes(tag))
      )
    }
    
    if (filters.minRating) {
      results = results.filter(plugin => plugin.rating >= filters.minRating!)
    }
    
    if (filters.verified) {
      results = results.filter(plugin => plugin.verified)
    }
    
    if (filters.featured) {
      results = results.filter(plugin => plugin.featured)
    }
    
    if (filters.trending) {
      results = results.filter(plugin => plugin.trending)
    }
    
    if (filters.pricing) {
      if (filters.pricing === 'free') {
        results = results.filter(plugin => !plugin.pricing || plugin.pricing.model === 'free')
      } else if (filters.pricing === 'paid') {
        results = results.filter(plugin => plugin.pricing && plugin.pricing.model !== 'free')
      }
    }
    
    // Sort
    const sortBy = filters.sortBy || 'relevance'
    const sortOrder = filters.sortOrder || 'desc'
    
    results.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'rating':
          comparison = a.rating - b.rating
          break
        case 'downloads':
          comparison = a.downloadCount - b.downloadCount
          break
        case 'updated':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime()
          break
        case 'published':
          comparison = a.publishedAt.getTime() - b.publishedAt.getTime()
          break
        default: // relevance
          // Combine rating and downloads for relevance
          comparison = (a.rating * 1000 + a.downloadCount / 1000) - (b.rating * 1000 + b.downloadCount / 1000)
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
    
    // Paginate
    const page = filters.page || 1
    const pageSize = filters.pageSize || 20
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paginatedResults = results.slice(start, end)
    
    const result: MarketplaceSearchResult = {
      plugins: paginatedResults,
      total: results.length,
      page,
      pageSize,
      totalPages: Math.ceil(results.length / pageSize)
    }
    
    // Cache result
    this.cache.set(cacheKey, { data: result, timestamp: Date.now() })
    
    return result
  }

  /**
   * Get plugin details
   */
  async getPlugin(pluginId: string): Promise<MarketplacePlugin | undefined> {
    const cacheKey = `plugin:${pluginId}`
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }

    const plugin = this.plugins.get(pluginId)
    
    if (plugin) {
      this.cache.set(cacheKey, { data: plugin, timestamp: Date.now() })
    }
    
    return plugin
  }

  /**
   * Get featured plugins
   */
  async getFeaturedPlugins(limit: number = 10): Promise<MarketplacePlugin[]> {
    const cacheKey = `featured:${limit}`
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }

    const featured = Array.from(this.plugins.values())
      .filter(p => p.featured)
      .sort((a, b) => b.downloadCount - a.downloadCount)
      .slice(0, limit)
    
    this.cache.set(cacheKey, { data: featured, timestamp: Date.now() })
    
    return featured
  }

  /**
   * Get trending plugins
   */
  async getTrendingPlugins(limit: number = 10): Promise<MarketplacePlugin[]> {
    const cacheKey = `trending:${limit}`
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }

    const trending = Array.from(this.plugins.values())
      .filter(p => p.trending)
      .sort((a, b) => b.weeklyDownloadCount - a.weeklyDownloadCount)
      .slice(0, limit)
    
    this.cache.set(cacheKey, { data: trending, timestamp: Date.now() })
    
    return trending
  }

  /**
   * Get recommended plugins
   */
  async getRecommendedPlugins(installedPluginIds: string[], limit: number = 10): Promise<MarketplacePlugin[]> {
    // In production, this would use ML/AI to recommend based on:
    // - Installed plugins
    // - User behavior
    // - Popular combinations
    // - Categories
    
    const installed = installedPluginIds.map(id => this.plugins.get(id)).filter(Boolean) as MarketplacePlugin[]
    const categories = new Set(installed.flatMap(p => p.categories))
    
    const recommended = Array.from(this.plugins.values())
      .filter(p => !installedPluginIds.includes(p.id))
      .filter(p => p.categories.some(c => categories.has(c)))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit)
    
    return recommended
  }

  /**
   * Get plugin reviews
   */
  async getPluginReviews(pluginId: string, page: number = 1, pageSize: number = 20): Promise<{
    reviews: PluginReview[]
    total: number
    page: number
    pageSize: number
  }> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      return { reviews: [], total: 0, page, pageSize }
    }
    
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paginatedReviews = plugin.reviews.slice(start, end)
    
    return {
      reviews: paginatedReviews,
      total: plugin.reviews.length,
      page,
      pageSize
    }
  }

  /**
   * Submit a plugin review
   */
  async submitReview(pluginId: string, review: Omit<PluginReview, 'id' | 'createdAt' | 'updatedAt'>): Promise<PluginReview> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) throw new Error(`Plugin ${pluginId} not found`)
    
    const newReview: PluginReview = {
      ...review,
      id: `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    plugin.reviews.push(newReview)
    
    // Recalculate rating
    const totalRating = plugin.reviews.reduce((sum, r) => sum + r.rating, 0)
    plugin.rating = totalRating / plugin.reviews.length
    plugin.reviewCount = plugin.reviews.length
    
    // Update statistics
    plugin.statistics.rating = plugin.rating
    plugin.statistics.reviewCount = plugin.reviewCount
    
    this.saveToStorage()
    this.emit('review-submitted', { pluginId, review: newReview })
    
    return newReview
  }

  /**
   * Get categories
   */
  getCategories(): string[] {
    return Array.from(this.categories).sort()
  }

  /**
   * Get popular tags
   */
  getPopularTags(limit: number = 20): string[] {
    const tagCounts = new Map<string, number>()
    
    this.plugins.forEach(plugin => {
      plugin.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })
    })
    
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag]) => tag)
  }

  /**
   * Get publisher information
   */
  async getPublisher(publisherId: string): Promise<MarketplacePublisher | undefined> {
    return this.publishers.get(publisherId)
  }

  /**
   * Get publisher's plugins
   */
  async getPublisherPlugins(publisherId: string): Promise<MarketplacePlugin[]> {
    return Array.from(this.plugins.values())
      .filter(p => p.publisher.id === publisherId)
  }

  /**
   * Install plugin from marketplace
   */
  async installFromMarketplace(pluginId: string): Promise<void> {
    const marketplacePlugin = this.plugins.get(pluginId)
    if (!marketplacePlugin) throw new Error(`Plugin ${pluginId} not found in marketplace`)
    
    // In production, this would:
    // 1. Download plugin package
    // 2. Verify signature
    // 3. Extract and validate
    // 4. Install via pluginSystemService
    
    // Update download count
    marketplacePlugin.downloadCount++
    marketplacePlugin.weeklyDownloadCount++
    marketplacePlugin.statistics.totalDownloads++
    marketplacePlugin.statistics.weeklyDownloads++
    
    this.saveToStorage()
    this.emit('plugin-installed-from-marketplace', { pluginId })
  }

  /**
   * Event system
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
    
    return () => {
      const callbacks = this.listeners.get(event)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) callbacks.splice(index, 1)
      }
    }
  }

  private emit(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event) || []
    callbacks.forEach(callback => callback(data))
  }

  /**
   * Persistence
   */
  private saveToStorage(): void {
    try {
      const pluginsData = Array.from(this.plugins.entries()).map(([id, plugin]) => [
        id,
        {
          ...plugin,
          publishedAt: plugin.publishedAt.toISOString(),
          updatedAt: plugin.updatedAt.toISOString(),
          reviews: plugin.reviews.map(r => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt?.toISOString()
          })),
          versions: plugin.versions.map(v => ({
            ...v,
            publishedAt: v.publishedAt.toISOString()
          }))
        }
      ])
      localStorage.setItem('bloop-marketplace-plugins', JSON.stringify(pluginsData))
    } catch (error) {
      console.warn('Failed to save marketplace data to localStorage:', error)
    }
  }

  private loadFromStorage(): void {
    try {
      const pluginsData = localStorage.getItem('bloop-marketplace-plugins')
      if (pluginsData) {
        const entries = JSON.parse(pluginsData)
        entries.forEach(([id, plugin]: [string, any]) => {
          this.plugins.set(id, {
            ...plugin,
            publishedAt: new Date(plugin.publishedAt),
            updatedAt: new Date(plugin.updatedAt),
            reviews: plugin.reviews.map((r: any) => ({
              ...r,
              createdAt: new Date(r.createdAt),
              updatedAt: r.updatedAt ? new Date(r.updatedAt) : undefined
            })),
            versions: plugin.versions.map((v: any) => ({
              ...v,
              publishedAt: new Date(v.publishedAt)
            }))
          })
        })
      }
    } catch (error) {
      console.warn('Failed to load marketplace data from localStorage:', error)
    }
  }
}

export const pluginMarketplaceService = new PluginMarketplaceService()
