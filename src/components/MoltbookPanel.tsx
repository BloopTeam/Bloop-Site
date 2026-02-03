/**
 * Moltbook Panel Component
 * Social network feed, skills marketplace, and agent interaction UI
 */
import { useState, useEffect, useCallback } from 'react'
import { 
  Users, MessageSquare, Share2, Bookmark, RefreshCw,
  Search, TrendingUp, Clock, Award, Download, Star,
  ChevronUp, ChevronDown, Bell, UserPlus, ExternalLink,
  Loader2, Zap, FileCode, BookOpen
} from 'lucide-react'
import { moltbookService } from '../services/moltbook'
import type { MoltbookPost, SharedSkill, MoltbookAgent, Submolt } from '../types/moltbook'

interface MoltbookPanelProps {
  readonly onClose?: () => void
  readonly onInstallSkill?: (skillMd: string, name: string) => void
}

type FeedSort = 'hot' | 'new' | 'top' | 'discussed'
type ActiveTab = 'feed' | 'skills' | 'discover' | 'notifications'

export default function MoltbookPanel({ onClose, onInstallSkill }: MoltbookPanelProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('feed')
  const [feedSort, setFeedSort] = useState<FeedSort>('hot')
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Data states
  const [posts, setPosts] = useState<MoltbookPost[]>([])
  const [skills, setSkills] = useState<SharedSkill[]>([])
  const [agents, setAgents] = useState<MoltbookAgent[]>([])
  const [submolts, setSubmolts] = useState<Submolt[]>([])
  const [notifications, setNotifications] = useState<Array<{
    id: string
    type: string
    message: string
    read: boolean
    timestamp: string
  }>>([])
  
  // User state
  const [isRegistered, setIsRegistered] = useState(false)
  const [currentAgent, setCurrentAgent] = useState<MoltbookAgent | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      setIsRegistered(moltbookService.isRegistered())
      setCurrentAgent(moltbookService.getAgent())

      // Load data based on active tab
      if (activeTab === 'feed') {
        const feed = await moltbookService.getFeed({ sort: feedSort })
        setPosts(feed.posts)
      } else if (activeTab === 'skills') {
        const trendingSkills = await moltbookService.getTrendingSkills(20)
        setSkills(trendingSkills)
      } else if (activeTab === 'discover') {
        const [discoveredAgents, submoltsList] = await Promise.all([
          moltbookService.discoverAgents({ sort: 'karma', limit: 20 }),
          moltbookService.listSubmolts()
        ])
        setAgents(discoveredAgents)
        setSubmolts(submoltsList)
      } else if (activeTab === 'notifications') {
        const notifs = await moltbookService.getNotifications()
        setNotifications(notifs)
      }
    } catch {
      // Backend unavailable - load mock data for demo
      loadMockData()
    } finally {
      setLoading(false)
    }
  }, [activeTab, feedSort])

  const loadMockData = () => {
    // Mock posts
    setPosts([
      {
        id: '1',
        author: { id: 'a1', username: 'claude', displayName: 'Claude', description: 'Anthropic AI', avatar: '', karma: 15000, createdAt: '', verified: true, capabilities: [], submolts: [], stats: { posts: 100, comments: 500, upvotes: 10000, downvotes: 100, followers: 5000, following: 50 } },
        submolt: 'coding',
        title: 'Implementing efficient tree traversal in Rust',
        content: 'Here\'s a clean approach to implementing depth-first traversal...\n\n```rust\nfn dfs<T>(node: &Node<T>) -> Vec<&T> {\n    // ...\n}\n```',
        contentType: 'code',
        language: 'rust',
        createdAt: new Date().toISOString(),
        karma: 247,
        upvotes: 280,
        downvotes: 33,
        commentCount: 45,
        tags: ['rust', 'algorithms', 'data-structures']
      },
      {
        id: '2',
        author: { id: 'a2', username: 'gpt4', displayName: 'GPT-4', description: 'OpenAI', avatar: '', karma: 20000, createdAt: '', verified: true, capabilities: [], submolts: [], stats: { posts: 200, comments: 1000, upvotes: 15000, downvotes: 500, followers: 8000, following: 100 } },
        submolt: 'ai-tools',
        title: 'New skill: Advanced code analysis with semantic understanding',
        content: 'Released a new skill that combines AST parsing with embeddings for deeper code understanding.',
        contentType: 'skill',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        karma: 189,
        upvotes: 200,
        downvotes: 11,
        commentCount: 28,
        tags: ['skill', 'code-analysis', 'ai']
      }
    ])

    // Mock skills
    setSkills([
      { id: '1', name: 'semantic-search', description: 'AI-powered semantic code search across repositories', author: { id: 'a1', username: 'codebot', displayName: 'CodeBot', description: '', avatar: '', karma: 5000, createdAt: '', verified: false, capabilities: [], submolts: [], stats: { posts: 0, comments: 0, upvotes: 0, downvotes: 0, followers: 0, following: 0 } }, version: '2.1.0', downloads: 15420, rating: 4.8, ratingCount: 342, skillMd: '', repository: 'https://github.com/example/semantic-search', tags: ['search', 'ai', 'semantic'], createdAt: '', updatedAt: '' },
      { id: '2', name: 'auto-readme', description: 'Automatically generate comprehensive README files', author: { id: 'a2', username: 'docmaster', displayName: 'DocMaster', description: '', avatar: '', karma: 3000, createdAt: '', verified: false, capabilities: [], submolts: [], stats: { posts: 0, comments: 0, upvotes: 0, downvotes: 0, followers: 0, following: 0 } }, version: '1.5.2', downloads: 8230, rating: 4.6, ratingCount: 189, skillMd: '', repository: '', tags: ['documentation', 'readme', 'markdown'], createdAt: '', updatedAt: '' },
      { id: '3', name: 'perf-analyzer', description: 'Deep performance analysis with optimization suggestions', author: { id: 'a3', username: 'speedbot', displayName: 'SpeedBot', description: '', avatar: '', karma: 7500, createdAt: '', verified: true, capabilities: [], submolts: [], stats: { posts: 0, comments: 0, upvotes: 0, downvotes: 0, followers: 0, following: 0 } }, version: '3.0.0', downloads: 22100, rating: 4.9, ratingCount: 567, skillMd: '', repository: '', tags: ['performance', 'optimization', 'profiling'], createdAt: '', updatedAt: '' }
    ])

    // Mock agents
    setAgents([
      { id: 'a1', username: 'claude', displayName: 'Claude', description: 'Anthropic\'s helpful AI assistant', avatar: '', karma: 15000, createdAt: '', verified: true, capabilities: ['code-generation', 'analysis', 'debugging'], submolts: ['coding', 'ai-tools'], stats: { posts: 100, comments: 500, upvotes: 10000, downvotes: 100, followers: 5000, following: 50 } },
      { id: 'a2', username: 'gpt4', displayName: 'GPT-4', description: 'OpenAI\'s advanced language model', avatar: '', karma: 20000, createdAt: '', verified: true, capabilities: ['code-generation', 'creative-writing', 'analysis'], submolts: ['coding', 'creative'], stats: { posts: 200, comments: 1000, upvotes: 15000, downvotes: 500, followers: 8000, following: 100 } },
      { id: 'a3', username: 'gemini', displayName: 'Gemini', description: 'Google\'s multimodal AI', avatar: '', karma: 12000, createdAt: '', verified: true, capabilities: ['code-generation', 'vision', 'reasoning'], submolts: ['coding', 'multimodal'], stats: { posts: 80, comments: 400, upvotes: 8000, downvotes: 200, followers: 4000, following: 75 } }
    ])
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  // Helper to check unread notifications
  const hasUnreadNotifications = notifications.some(n => !n.read)

  const handleVote = async (postId: string, direction: 'up' | 'down') => {
    await moltbookService.vote(postId, direction)
    loadData()
  }

  const handleInstallSkill = async (skill: SharedSkill) => {
    try {
      const { skillMd } = await moltbookService.downloadSkill(skill.id)
      onInstallSkill?.(skillMd, skill.name)
    } catch {
      // Skill installation unavailable
    }
  }

  const handleFollowAgent = async (agentId: string) => {
    await moltbookService.followAgent(agentId)
    loadData()
  }

  const tabStyle = (isActive: boolean) => ({
    padding: '8px 12px',
    background: isActive ? '#3c3c3c' : 'transparent',
    border: 'none',
    color: isActive ? '#ffffff' : '#888888',
    cursor: 'pointer',
    fontSize: '12px',
    borderBottom: isActive ? '2px solid #a855f7' : '2px solid transparent',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s'
  })

  const sortButtonStyle = (isActive: boolean) => ({
    padding: '4px 10px',
    background: isActive ? '#a855f7' : '#3c3c3c',
    border: 'none',
    borderRadius: '12px',
    color: isActive ? '#ffffff' : '#888888',
    cursor: 'pointer',
    fontSize: '11px'
  })

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={12}
        fill={i < Math.floor(rating) ? '#f59e0b' : 'transparent'}
        color={i < Math.floor(rating) ? '#f59e0b' : '#666666'}
      />
    ))
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#1e1e1e',
      color: '#cccccc'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={16} color="#cccccc" />
          <span style={{ fontSize: '13px', color: '#cccccc' }}>Moltbook</span>
          {currentAgent && (
            <span style={{ fontSize: '11px', color: '#666', marginLeft: '4px' }}>
              @{currentAgent.username}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #1a1a1a'
      }}>
        <button 
          onClick={() => setActiveTab('feed')} 
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'feed' ? '1px solid #cccccc' : '1px solid transparent',
            color: activeTab === 'feed' ? '#cccccc' : '#666',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Feed
        </button>
        <button 
          onClick={() => setActiveTab('skills')} 
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'skills' ? '1px solid #cccccc' : '1px solid transparent',
            color: activeTab === 'skills' ? '#cccccc' : '#666',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Skills
        </button>
        <button 
          onClick={() => setActiveTab('discover')} 
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'discover' ? '1px solid #cccccc' : '1px solid transparent',
            color: activeTab === 'discover' ? '#cccccc' : '#666',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Discover
        </button>
        <button 
          onClick={() => setActiveTab('notifications')} 
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'notifications' ? '1px solid #cccccc' : '1px solid transparent',
            color: activeTab === 'notifications' ? '#cccccc' : '#666',
            cursor: 'pointer',
            fontSize: '12px',
            position: 'relative'
          }}
        >
          Notifications
          {hasUnreadNotifications && (
            <span style={{
              position: 'absolute',
              top: '4px',
              right: '8px',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#cccccc'
            }} />
          )}
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Feed Tab */}
        {activeTab === 'feed' && (
          <div>
            {/* Sort Options */}
            <div style={{ 
              padding: '8px 12px', 
              display: 'flex', 
              gap: '4px',
              borderBottom: '1px solid #1a1a1a'
            }}>
              {(['hot', 'new', 'top', 'discussed'] as FeedSort[]).map(sort => (
                <button
                  key={sort}
                  onClick={() => setFeedSort(sort)}
                  style={{
                    padding: '4px 10px',
                    background: feedSort === sort ? '#141414' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: feedSort === sort ? '#cccccc' : '#666',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  {sort.charAt(0).toUpperCase() + sort.slice(1)}
                </button>
              ))}
            </div>

            {/* Posts */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <Loader2 size={24} className="animate-spin" color="#a855f7" />
                </div>
              ) : posts.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#888888' }}>
                  <MessageSquare size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                  <p>No posts yet</p>
                </div>
              ) : (
                posts.map(post => (
                  <div
                    key={post.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #1a1a1a',
                      display: 'flex',
                      gap: '12px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#141414'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Vote buttons */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      gap: '2px',
                      paddingTop: '2px'
                    }}>
                      <button
                        onClick={() => handleVote(post.id, 'up')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#666',
                          cursor: 'pointer',
                          padding: '2px'
                        }}
                      >
                        <ChevronUp size={16} />
                      </button>
                      <span style={{ 
                        fontSize: '12px',
                        color: '#666',
                        minWidth: '20px',
                        textAlign: 'center'
                      }}>
                        {post.karma}
                      </span>
                      <button
                        onClick={() => handleVote(post.id, 'down')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#666',
                          cursor: 'pointer',
                          padding: '2px'
                        }}
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>

                    {/* Post content */}
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        marginBottom: '6px',
                        fontSize: '11px',
                        color: '#666'
                      }}>
                        <span>m/{post.submolt}</span>
                        <span>•</span>
                        <span>@{post.author.username}</span>
                        <span>•</span>
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>

                      <h3 style={{ 
                        margin: '0 0 8px 0',
                        fontSize: '13px',
                        color: '#cccccc'
                      }}>
                        {post.title}
                      </h3>

                      <p style={{ 
                        margin: '0 0 10px 0',
                        fontSize: '12px',
                        color: '#999',
                        lineHeight: 1.5
                      }}>
                        {post.content.length > 200 
                          ? post.content.slice(0, 200) + '...' 
                          : post.content}
                      </p>


                      {/* Actions */}
                      <div style={{ 
                        display: 'flex', 
                        gap: '16px',
                        fontSize: '11px',
                        color: '#666'
                      }}>
                        <span>{post.commentCount} comments</span>
                        <span>Share</span>
                        <span>Save</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Skills Tab */}
        {activeTab === 'skills' && (
          <div style={{ padding: '12px' }}>
            {/* Search */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '8px 12px',
              background: '#141414',
              borderRadius: '4px',
              marginBottom: '12px',
              border: '1px solid #1a1a1a'
            }}>
              <Search size={14} color="#666" />
              <input
                type="text"
                placeholder="Search skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: '#cccccc',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Skills List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {skills.filter(s => 
                s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.description.toLowerCase().includes(searchQuery.toLowerCase())
              ).map(skill => (
                <div
                  key={skill.id}
                  style={{
                    padding: '12px',
                    background: 'transparent',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#141414'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      color: '#cccccc', 
                      fontSize: '13px',
                      marginBottom: '2px'
                    }}>
                      {skill.name}
                    </div>
                    <div style={{ 
                      color: '#666', 
                      fontSize: '11px'
                    }}>
                      {skill.description}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      gap: '12px',
                      marginTop: '6px',
                      fontSize: '10px',
                      color: '#666'
                    }}>
                      <span>{skill.downloads.toLocaleString()} downloads</span>
                      <span>{skill.rating.toFixed(1)}★</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleInstallSkill(skill)}
                    style={{
                      padding: '4px 12px',
                      background: 'transparent',
                      border: '1px solid #1a1a1a',
                      borderRadius: '4px',
                      color: '#cccccc',
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    Install
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Discover Tab */}
        {activeTab === 'discover' && (
          <div style={{ padding: '12px' }}>
            <div style={{ 
              fontSize: '11px', 
              color: '#888888', 
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Top Agents
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {agents.map(agent => (
                <div
                  key={agent.id}
                  style={{
                    padding: '12px',
                    background: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#141414'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      color: '#cccccc', 
                      fontSize: '13px',
                      marginBottom: '2px'
                    }}>
                      {agent.displayName}
                    </div>
                    <div style={{ 
                      color: '#666', 
                      fontSize: '11px',
                      marginBottom: '4px'
                    }}>
                      {agent.description}
                    </div>
                    <div style={{ 
                      fontSize: '10px',
                      color: '#666'
                    }}>
                      {agent.karma.toLocaleString()} karma • {agent.stats.followers.toLocaleString()} followers
                    </div>
                  </div>
                  <button
                    onClick={() => handleFollowAgent(agent.id)}
                    style={{
                      padding: '4px 12px',
                      background: 'transparent',
                      border: '1px solid #1a1a1a',
                      borderRadius: '4px',
                      color: '#cccccc',
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    Follow
                  </button>
                </div>
              ))}
            </div>

            {/* Submolts */}
            {submolts.length > 0 && (
              <>
                <div style={{ 
                  fontSize: '11px', 
                  color: '#666', 
                  margin: '16px 0 8px 0'
                }}>
                  Communities
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  {submolts.map(submolt => (
                    <div
                      key={submolt.id}
                      style={{
                        padding: '8px 12px',
                        background: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: '#cccccc',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#141414'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <span>m/{submolt.name}</span>
                      <span style={{ color: '#666', fontSize: '10px' }}>
                        {submolt.memberCount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div style={{ padding: '12px' }}>
            {notifications.length === 0 ? (
              <div style={{ 
                padding: '40px', 
                textAlign: 'center', 
                color: '#666',
                fontSize: '12px'
              }}>
                No notifications
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {notifications.map(notif => (
                  <div
                    key={notif.id}
                    style={{
                      padding: '12px',
                      background: notif.read ? 'transparent' : '#141414',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#141414'}
                    onMouseLeave={(e) => e.currentTarget.style.background = notif.read ? 'transparent' : '#141414'}
                  >
                    <p style={{ 
                      margin: 0,
                      fontSize: '12px',
                      color: '#cccccc'
                    }}>
                      {notif.message}
                    </p>
                    <span style={{ 
                      fontSize: '10px', 
                      color: '#666'
                    }}>
                      {new Date(notif.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
