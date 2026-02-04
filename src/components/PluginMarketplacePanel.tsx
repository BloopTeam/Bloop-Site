/**
 * Plugin Marketplace Panel
 * Browse, search, and install plugins from the marketplace
 */

import { useState, useEffect } from 'react'
import { 
  X, Search, Download, Star, TrendingUp, Award, Filter,
  ChevronDown, ExternalLink, Shield, Package, Loader2
} from 'lucide-react'
import { 
  pluginMarketplaceService, 
  MarketplacePlugin, 
  MarketplaceSearchFilters,
  PluginReview 
} from '../services/pluginMarketplace'
import { pluginSystemService } from '../services/pluginSystem'

interface PluginMarketplacePanelProps {
  onClose: () => void
  onPluginInstalled?: () => void
}

export default function PluginMarketplacePanel({ onClose, onPluginInstalled }: PluginMarketplacePanelProps) {
  const [plugins, setPlugins] = useState<MarketplacePlugin[]>([])
  const [selectedPlugin, setSelectedPlugin] = useState<MarketplacePlugin | null>(null)
  const [reviews, setReviews] = useState<PluginReview[]>([])
  const [loading, setLoading] = useState(false)
  const [installing, setInstalling] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'relevance' | 'downloads' | 'rating' | 'updated'>('relevance')
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState<'featured' | 'trending' | 'all'>('featured')

  useEffect(() => {
    loadPlugins()
  }, [searchQuery, selectedCategory, sortBy, activeTab])

  useEffect(() => {
    if (selectedPlugin) {
      loadReviews(selectedPlugin.id)
    }
  }, [selectedPlugin])

  const loadPlugins = async () => {
    setLoading(true)
    try {
      let result: MarketplacePlugin[]
      
      if (activeTab === 'featured') {
        result = await pluginMarketplaceService.getFeaturedPlugins()
      } else if (activeTab === 'trending') {
        result = await pluginMarketplaceService.getTrendingPlugins()
      } else {
        const filters: MarketplaceSearchFilters = {
          query: searchQuery || undefined,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          sortBy,
          verified: true
        }
        const searchResult = await pluginMarketplaceService.searchPlugins(filters)
        result = searchResult.plugins
      }
      
      setPlugins(result)
    } catch (error) {
      console.error('Failed to load plugins:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadReviews = async (pluginId: string) => {
    try {
      const reviewsData = await pluginMarketplaceService.getPluginReviews(pluginId)
      setReviews(reviewsData)
    } catch (error) {
      console.error('Failed to load reviews:', error)
    }
  }

  const handleInstall = async (plugin: MarketplacePlugin) => {
    setInstalling({ ...installing, [plugin.id]: true })
    
    try {
      await pluginMarketplaceService.installFromMarketplace(plugin.id)
      onPluginInstalled?.()
    } catch (error) {
      console.error('Failed to install plugin:', error)
      alert('Failed to install plugin. Please try again.')
    } finally {
      setInstalling({ ...installing, [plugin.id]: false })
    }
  }

  const isInstalled = (pluginId: string) => {
    const installedPlugins = pluginSystemService.getAllPlugins()
    return installedPlugins.some(p => p.id === pluginId)
  }

  const categories = [
    'all',
    'code-generation',
    'linting',
    'formatting',
    'testing',
    'debugging',
    'documentation',
    'theme',
    'language-support',
    'productivity',
    'security',
    'collaboration'
  ]

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#151515',
      color: '#ddd'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #2a2a2a'
      }}>
        <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#ddd' }}>Plugin Marketplace</h2>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #2a2a2a',
        background: '#1a1a1a'
      }}>
        {(['featured', 'trending', 'all'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: activeTab === 'all' ? 0 : 1,
              padding: '10px 16px',
              background: activeTab === tab ? '#151515' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #FF00FF' : '2px solid transparent',
              color: activeTab === tab ? '#FF00FF' : '#888',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: activeTab === tab ? 500 : 400,
              textTransform: 'capitalize',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              justifyContent: 'center'
            }}
          >
            {tab === 'featured' && <Award size={12} />}
            {tab === 'trending' && <TrendingUp size={12} />}
            {tab === 'all' && <Package size={12} />}
            {tab}
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      {activeTab === 'all' && (
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #2a2a2a',
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
            <input
              type="text"
              placeholder="Search plugins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px 6px 32px',
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: '4px',
                color: '#ddd',
                fontSize: '11px',
                outline: 'none'
              }}
            />
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '6px 12px',
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: '4px',
              color: '#ddd',
              fontSize: '11px',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat.replace('-', ' ')}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: '6px 12px',
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: '4px',
              color: '#ddd',
              fontSize: '11px',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="relevance">Relevance</option>
            <option value="downloads">Downloads</option>
            <option value="rating">Rating</option>
            <option value="updated">Updated</option>
          </select>
        </div>
      )}

      {/* Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Plugin Grid */}
        <div style={{ flex: selectedPlugin ? '0 0 400px' : 1, overflow: 'auto', padding: '16px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '32px' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#FF00FF' }} />
            </div>
          ) : plugins.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#666', fontSize: '12px' }}>
              <Package size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <div>No plugins found</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: selectedPlugin ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {plugins.map(plugin => (
                <div
                  key={plugin.id}
                  onClick={() => setSelectedPlugin(plugin)}
                  style={{
                    padding: '16px',
                    background: selectedPlugin?.id === plugin.id ? '#1a1a1a' : '#1a1a1a',
                    border: `1px solid ${selectedPlugin?.id === plugin.id ? '#FF00FF' : '#2a2a2a'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedPlugin?.id !== plugin.id) {
                      e.currentTarget.style.borderColor = '#3e3e42'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedPlugin?.id !== plugin.id) {
                      e.currentTarget.style.borderColor = '#2a2a2a'
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#ddd', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {plugin.displayName}
                        {plugin.verified && (
                          <Shield size={12} style={{ color: '#22c55e' }} />
                        )}
                      </div>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px' }}>
                        by {plugin.publisher.displayName}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: '#999', lineHeight: '1.5', marginBottom: '12px' }}>
                    {plugin.shortDescription}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: '#666' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Star size={11} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                        {plugin.statistics.rating.toFixed(1)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Download size={11} />
                        {plugin.statistics.installs >= 1000 
                          ? `${(plugin.statistics.installs / 1000).toFixed(1)}K` 
                          : plugin.statistics.installs}
                      </div>
                    </div>

                    {isInstalled(plugin.id) ? (
                      <div style={{ color: '#22c55e', fontSize: '10px' }}>Installed</div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleInstall(plugin)
                        }}
                        disabled={installing[plugin.id]}
                        style={{
                          padding: '4px 10px',
                          background: '#FF00FF',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: installing[plugin.id] ? 'not-allowed' : 'pointer',
                          fontSize: '10px',
                          opacity: installing[plugin.id] ? 0.6 : 1
                        }}
                      >
                        {installing[plugin.id] ? 'Installing...' : 'Install'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Plugin Details */}
        {selectedPlugin && (
          <div style={{ flex: 1, overflow: 'auto', padding: '16px', borderLeft: '1px solid #2a2a2a' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedPlugin.displayName}
                    {selectedPlugin.verified && (
                      <Shield size={14} style={{ color: '#22c55e' }} />
                    )}
                  </h3>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>
                    by {selectedPlugin.publisher.displayName}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPlugin(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {isInstalled(selectedPlugin.id) ? (
                  <div style={{
                    padding: '8px 16px',
                    background: '#22c55e22',
                    border: '1px solid #22c55e',
                    borderRadius: '4px',
                    color: '#22c55e',
                    fontSize: '11px',
                    fontWeight: 500
                  }}>
                    ✓ Installed
                  </div>
                ) : (
                  <button
                    onClick={() => handleInstall(selectedPlugin)}
                    disabled={installing[selectedPlugin.id]}
                    style={{
                      padding: '8px 16px',
                      background: '#FF00FF',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: installing[selectedPlugin.id] ? 'not-allowed' : 'pointer',
                      fontSize: '11px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {installing[selectedPlugin.id] ? (
                      <>
                        <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                        Installing...
                      </>
                    ) : (
                      <>
                        <Download size={12} />
                        Install
                      </>
                    )}
                  </button>
                )}
              </div>

              <div style={{ fontSize: '12px', color: '#ddd', lineHeight: '1.6', marginBottom: '24px' }}>
                {selectedPlugin.description}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
              <div style={{ padding: '12px', background: '#1a1a1a', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Rating</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#f59e0b' }}>
                  {selectedPlugin.statistics.rating.toFixed(1)}
                </div>
                <div style={{ fontSize: '9px', color: '#666' }}>
                  {selectedPlugin.statistics.ratingCount} reviews
                </div>
              </div>
              <div style={{ padding: '12px', background: '#1a1a1a', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Downloads</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#ddd' }}>
                  {selectedPlugin.statistics.installs >= 1000000 
                    ? `${(selectedPlugin.statistics.installs / 1000000).toFixed(1)}M`
                    : selectedPlugin.statistics.installs >= 1000 
                    ? `${(selectedPlugin.statistics.installs / 1000).toFixed(1)}K` 
                    : selectedPlugin.statistics.installs}
                </div>
              </div>
              <div style={{ padding: '12px', background: '#1a1a1a', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Version</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#ddd' }}>
                  {selectedPlugin.version}
                </div>
              </div>
            </div>

            {/* Categories */}
            {selectedPlugin.categories.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: '#ddd' }}>
                  Categories
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedPlugin.categories.map(cat => (
                    <span
                      key={cat}
                      style={{
                        padding: '4px 10px',
                        background: '#1a1a1a',
                        border: '1px solid #2a2a2a',
                        borderRadius: '4px',
                        fontSize: '10px',
                        color: '#999'
                      }}
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: '#ddd' }}>
                Links
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedPlugin.homepage && (
                  <a
                    href={selectedPlugin.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      color: '#FF00FF',
                      textDecoration: 'none'
                    }}
                  >
                    <ExternalLink size={12} />
                    Homepage
                  </a>
                )}
                {selectedPlugin.repository && (
                  <a
                    href={selectedPlugin.repository}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      color: '#FF00FF',
                      textDecoration: 'none'
                    }}
                  >
                    <ExternalLink size={12} />
                    Repository
                  </a>
                )}
              </div>
            </div>

            {/* Reviews */}
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: 600, marginBottom: '12px', color: '#ddd' }}>
                Reviews ({reviews.length})
              </h4>
              {reviews.length === 0 ? (
                <div style={{ padding: '16px', background: '#1a1a1a', borderRadius: '6px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
                  No reviews yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {reviews.slice(0, 5).map(review => (
                    <div
                      key={review.id}
                      style={{
                        padding: '12px',
                        background: '#1a1a1a',
                        borderRadius: '6px',
                        border: '1px solid #2a2a2a'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 500, color: '#ddd', marginBottom: '4px' }}>
                            {review.userName}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={10}
                                style={{
                                  color: i < review.rating ? '#f59e0b' : '#666',
                                  fill: i < review.rating ? '#f59e0b' : 'none'
                                }}
                              />
                            ))}
                          </div>
                        </div>
                        <div style={{ fontSize: '9px', color: '#666' }}>
                          {new Date(review.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      {review.title && (
                        <div style={{ fontSize: '11px', fontWeight: 500, color: '#ddd', marginBottom: '6px' }}>
                          {review.title}
                        </div>
                      )}
                      <div style={{ fontSize: '10px', color: '#999', lineHeight: '1.5' }}>
                        {review.comment}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
