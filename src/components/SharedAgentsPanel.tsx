/**
 * Shared Agents Panel
 * Browse, execute, and manage shared AI agents and tooling
 */

import { useState, useEffect } from 'react'
import { 
  X, Play, Star, Download, Search, TrendingUp, Award,
  Filter, ExternalLink, Shield, Zap, Clock, Loader2
} from 'lucide-react'
import { 
  sharedAgentsService, 
  SharedAgent, 
  AgentSearchFilters,
  AgentExecution,
  AgentReview 
} from '../services/sharedAgents'

interface SharedAgentsPanelProps {
  onClose: () => void
}

export default function SharedAgentsPanel({ onClose }: SharedAgentsPanelProps) {
  const [agents, setAgents] = useState<SharedAgent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<SharedAgent | null>(null)
  const [executions, setExecutions] = useState<AgentExecution[]>([])
  const [reviews, setReviews] = useState<AgentReview[]>([])
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'relevance' | 'rating' | 'usage' | 'updated'>('relevance')
  const [activeTab, setActiveTab] = useState<'featured' | 'trending' | 'all'>('featured')
  const [executeInput, setExecuteInput] = useState('')

  const currentUserId = 'current-user'
  const currentUserName = 'Current User'

  useEffect(() => {
    loadAgents()
  }, [searchQuery, selectedCategory, sortBy, activeTab])

  useEffect(() => {
    if (selectedAgent) {
      loadReviews(selectedAgent.id)
    }
  }, [selectedAgent])

  const loadAgents = async () => {
    setLoading(true)
    try {
      let result: SharedAgent[]
      
      if (activeTab === 'featured') {
        result = await sharedAgentsService.getFeaturedAgents(20)
      } else if (activeTab === 'trending') {
        result = await sharedAgentsService.getTrendingAgents(20)
      } else {
        const filters: AgentSearchFilters = {
          query: searchQuery || undefined,
          category: selectedCategory !== 'all' ? selectedCategory as any : undefined,
          sortBy,
          verified: true,
          visibility: 'public'
        }
        const searchResult = await sharedAgentsService.searchAgents(filters)
        result = searchResult.agents
      }
      
      setAgents(result)
    } catch (error) {
      console.error('Failed to load agents:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadReviews = async (agentId: string) => {
    try {
      const reviewsData = await sharedAgentsService.getAgentReviews(agentId)
      setReviews(reviewsData.reviews)
    } catch (error) {
      console.error('Failed to load reviews:', error)
    }
  }

  const handleExecuteAgent = async (agent: SharedAgent) => {
    if (!executeInput.trim()) {
      alert('Please enter a prompt for the agent')
      return
    }

    setExecuting({ ...executing, [agent.id]: true })
    
    try {
      const execution = await sharedAgentsService.executeAgent(
        agent.id,
        executeInput,
        {},
        { userId: currentUserId, userName: currentUserName }
      )
      setExecutions([execution, ...executions])
      setExecuteInput('')
    } catch (error) {
      console.error('Failed to execute agent:', error)
      alert('Failed to execute agent. Please try again.')
    } finally {
      setExecuting({ ...executing, [agent.id]: false })
    }
  }

  const categories = [
    'all',
    'code-generation',
    'code-review',
    'testing',
    'debugging',
    'refactoring',
    'documentation',
    'security',
    'performance',
    'deployment',
    'data-analysis'
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
        <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#ddd' }}>Shared Agents</h2>
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
              flex: 1,
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
            {tab === 'all' && <Zap size={12} />}
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
              placeholder="Search agents..."
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
            <option value="rating">Rating</option>
            <option value="usage">Usage</option>
            <option value="updated">Updated</option>
          </select>
        </div>
      )}

      {/* Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Agents Grid */}
        <div style={{ flex: selectedAgent ? '0 0 400px' : 1, overflow: 'auto', padding: '16px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '32px' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#FF00FF' }} />
            </div>
          ) : agents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#666', fontSize: '12px' }}>
              <Zap size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <div>No agents found</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: selectedAgent ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {agents.map(agent => (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  style={{
                    padding: '16px',
                    background: selectedAgent?.id === agent.id ? '#1a1a1a' : '#1a1a1a',
                    border: `1px solid ${selectedAgent?.id === agent.id ? '#FF00FF' : '#2a2a2a'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedAgent?.id !== agent.id) {
                      e.currentTarget.style.borderColor = '#3e3e42'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedAgent?.id !== agent.id) {
                      e.currentTarget.style.borderColor = '#2a2a2a'
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#ddd', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {agent.name}
                        {agent.verified && (
                          <Shield size={12} style={{ color: '#22c55e' }} />
                        )}
                      </div>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px' }}>
                        by {agent.author.name}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: '#999', lineHeight: '1.5', marginBottom: '12px' }}>
                    {agent.description}
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {agent.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        style={{
                          padding: '2px 8px',
                          background: '#2a2a2a',
                          borderRadius: '4px',
                          fontSize: '9px',
                          color: '#888'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: '#666' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Star size={11} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                        {agent.rating.toFixed(1)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Download size={11} />
                        {agent.usageCount >= 1000 
                          ? `${(agent.usageCount / 1000).toFixed(1)}K` 
                          : agent.usageCount}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agent Details */}
        {selectedAgent && (
          <div style={{ flex: 1, overflow: 'auto', padding: '16px', borderLeft: '1px solid #2a2a2a' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedAgent.name}
                    {selectedAgent.verified && (
                      <Shield size={14} style={{ color: '#22c55e' }} />
                    )}
                  </h3>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>
                    by {selectedAgent.author.name}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAgent(null)}
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

              <div style={{ fontSize: '12px', color: '#ddd', lineHeight: '1.6', marginBottom: '16px' }}>
                {selectedAgent.description}
              </div>

              {/* Execute Form */}
              <div style={{ marginBottom: '24px', padding: '16px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '12px', fontWeight: 600, color: '#ddd' }}>
                  Execute Agent
                </h4>
                <textarea
                  value={executeInput}
                  onChange={(e) => setExecuteInput(e.target.value)}
                  placeholder="Enter your prompt or task for the agent..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#252526',
                    border: '1px solid #2a2a2a',
                    borderRadius: '6px',
                    color: '#ddd',
                    fontSize: '11px',
                    outline: 'none',
                    minHeight: '100px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    marginBottom: '12px'
                  }}
                />
                <button
                  onClick={() => handleExecuteAgent(selectedAgent)}
                  disabled={!executeInput.trim() || executing[selectedAgent.id]}
                  style={{
                    padding: '8px 16px',
                    background: (!executeInput.trim() || executing[selectedAgent.id]) ? '#666' : '#FF00FF',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: (!executeInput.trim() || executing[selectedAgent.id]) ? 'not-allowed' : 'pointer',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {executing[selectedAgent.id] ? (
                    <>
                      <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play size={12} />
                      Execute
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
              <div style={{ padding: '12px', background: '#1a1a1a', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Rating</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#f59e0b' }}>
                  {selectedAgent.rating.toFixed(1)}
                </div>
                <div style={{ fontSize: '9px', color: '#666' }}>
                  {selectedAgent.reviewCount} reviews
                </div>
              </div>
              <div style={{ padding: '12px', background: '#1a1a1a', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Usage</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#ddd' }}>
                  {selectedAgent.usageCount >= 1000000 
                    ? `${(selectedAgent.usageCount / 1000000).toFixed(1)}M`
                    : selectedAgent.usageCount >= 1000 
                    ? `${(selectedAgent.usageCount / 1000).toFixed(1)}K` 
                    : selectedAgent.usageCount}
                </div>
              </div>
              <div style={{ padding: '12px', background: '#1a1a1a', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Version</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#ddd' }}>
                  {selectedAgent.version}
                </div>
              </div>
            </div>

            {/* Capabilities */}
            {selectedAgent.agent.capabilities.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: '#ddd' }}>
                  Capabilities
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedAgent.agent.capabilities.map((cap, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '8px 12px',
                        background: '#1a1a1a',
                        border: '1px solid #2a2a2a',
                        borderRadius: '4px',
                        fontSize: '10px'
                      }}
                    >
                      <div style={{ fontWeight: 500, marginBottom: '4px', color: '#ddd' }}>
                        {cap.name}
                      </div>
                      <div style={{ color: '#666' }}>
                        {cap.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tools */}
            {selectedAgent.tools.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: '#ddd' }}>
                  Tools ({selectedAgent.tools.length})
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedAgent.tools.map(tool => (
                    <span
                      key={tool.id}
                      style={{
                        padding: '4px 10px',
                        background: '#1a1a1a',
                        border: '1px solid #2a2a2a',
                        borderRadius: '4px',
                        fontSize: '10px',
                        color: '#999'
                      }}
                    >
                      {tool.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

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
