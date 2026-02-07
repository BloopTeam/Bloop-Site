/**
 * OpenClaw Panel Component
 * Displays OpenClaw skills, sessions, skill execution, and Bot Team management
 */
import { useState, useEffect, useCallback } from 'react'
import { 
  Zap, Play, RefreshCw, Search, Code, TestTube, FileText, 
  Wrench, Bug, Gauge, Shield, CheckCircle, 
  XCircle, Clock, Loader2, Copy, Terminal,
  Users, MessageSquare, Plug, Plus, Pause, Trash2, 
  Settings, Activity, Bot
} from 'lucide-react'
import { openClawService } from '../services/openclaw'
import { botTeamService, BOT_SPECIALIZATIONS, type TeamBot, type BotSpecialization } from '../services/botTeam'
import type { OpenClawSkill, SkillExecutionResult, OpenClawSession } from '../types/openclaw'

interface OpenClawPanelProps {
  readonly onClose?: () => void
  readonly currentCode?: string
  readonly currentLanguage?: string
  readonly currentFilePath?: string
}

// Skill icons mapping
const SKILL_ICONS: Record<string, React.ReactNode> = {
  'bloop-code-review': <Code size={16} />,
  'bloop-test-gen': <TestTube size={16} />,
  'bloop-docs': <FileText size={16} />,
  'bloop-refactor': <Wrench size={16} />,
  'bloop-debug': <Bug size={16} />,
  'bloop-optimize': <Gauge size={16} />,
  'bloop-security': <Shield size={16} />
}

// Skill colors
const SKILL_COLORS: Record<string, string> = {
  'bloop-code-review': '#3b82f6',
  'bloop-test-gen': '#22c55e',
  'bloop-docs': '#a855f7',
  'bloop-refactor': '#f59e0b',
  'bloop-debug': '#ef4444',
  'bloop-optimize': '#06b6d4',
  'bloop-security': '#ec4899'
}

export default function OpenClawPanel({ 
  onClose, 
  currentCode, 
  currentLanguage, 
  currentFilePath 
}: OpenClawPanelProps) {
  const [activeTab, setActiveTab] = useState<'skills' | 'sessions' | 'execute' | 'team'>('team')
  const [connected, setConnected] = useState(false)
  const [skills, setSkills] = useState<OpenClawSkill[]>([])
  const [sessions, setSessions] = useState<OpenClawSession[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Execution state
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
  const [executing, setExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<SkillExecutionResult | null>(null)
  const [executionHistory, setExecutionHistory] = useState<Array<{
    skill: string
    result: SkillExecutionResult
    timestamp: Date
  }>>([])

  // Bot Team state
  const [bots, setBots] = useState<TeamBot[]>([])
  const [teamEnabled, setTeamEnabled] = useState(false)
  const [showCreateBot, setShowCreateBot] = useState(false)
  const [selectedBot, setSelectedBot] = useState<TeamBot | null>(null)
  const [botRunning, setBotRunning] = useState<Record<string, boolean>>({})
  const teamStats = botTeamService.getTeamStats()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      setConnected(openClawService.isConnected())
      if (openClawService.isConnected()) {
        const [skillsList, sessionsList] = await Promise.all([
          openClawService.listSkills(),
          openClawService.listSessions()
        ])
        setSkills(skillsList)
        setSessions(sessionsList)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()

    // Listen for connection changes
    const unsubConnect = openClawService.on('connected', () => {
      setConnected(true)
      loadData()
    })
    const unsubDisconnect = openClawService.on('disconnected', () => {
      setConnected(false)
    })

    return () => {
      unsubConnect()
      unsubDisconnect()
    }
  }, [loadData])

  const handleConnect = async () => {
    setLoading(true)
    try {
      await openClawService.connect()
    } finally {
      setLoading(false)
    }
  }

  const handleExecuteSkill = async (skillName: string) => {
    if (!currentCode && !currentFilePath) {
      setExecutionResult({
        success: false,
        error: 'No code or file selected. Please select code in the editor.'
      })
      return
    }

    setExecuting(true)
    setSelectedSkill(skillName)
    setActiveTab('execute')

    try {
      const result = await openClawService.executeSkill({
        skillName,
        params: {},
        context: {
          code: currentCode,
          language: currentLanguage,
          filePath: currentFilePath
        }
      })

      setExecutionResult(result)
      setExecutionHistory(prev => [{
        skill: skillName,
        result,
        timestamp: new Date()
      }, ...prev.slice(0, 9)])
    } catch (error) {
      setExecutionResult({
        success: false,
        error: String(error)
      })
    } finally {
      setExecuting(false)
    }
  }

  // Load bot team data
  useEffect(() => {
    const refreshBots = () => {
      setBots(botTeamService.getBots())
      setTeamEnabled(botTeamService.getConfig().enabled)
    }
    refreshBots()

    const unsub1 = botTeamService.on('bot-created', refreshBots)
    const unsub2 = botTeamService.on('bot-updated', refreshBots)
    const unsub3 = botTeamService.on('bot-deleted', refreshBots)
    const unsub4 = botTeamService.on('bot-status-changed', refreshBots)
    const unsub5 = botTeamService.on('task-completed', refreshBots)
    const unsub6 = botTeamService.on('task-failed', refreshBots)
    const unsub7 = botTeamService.on('config-updated', refreshBots)

    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); unsub7() }
  }, [])

  const handleToggleTeam = () => {
    const newEnabled = !teamEnabled
    botTeamService.updateConfig({ enabled: newEnabled })
    setTeamEnabled(newEnabled)
    if (newEnabled) {
      botTeamService.startAllBots()
    } else {
      botTeamService.pauseAllBots()
    }
    setBots(botTeamService.getBots())
  }

  const handleCreateBot = (spec: BotSpecialization) => {
    botTeamService.createBot(spec)
    setBots(botTeamService.getBots())
    setShowCreateBot(false)
  }

  const handleCreateFullTeam = () => {
    botTeamService.createDefaultTeam()
    setBots(botTeamService.getBots())
    setShowCreateBot(false)
  }

  const handleToggleBot = (botId: string) => {
    const bot = botTeamService.getBot(botId)
    if (!bot) return
    if (bot.status === 'active' || bot.status === 'working') {
      botTeamService.stopBot(botId)
    } else {
      botTeamService.startBot(botId)
    }
    setBots(botTeamService.getBots())
  }

  const handleRunBotNow = async (botId: string) => {
    setBotRunning(prev => ({ ...prev, [botId]: true }))
    try {
      await botTeamService.runNow(botId)
    } finally {
      setBotRunning(prev => ({ ...prev, [botId]: false }))
      setBots(botTeamService.getBots())
    }
  }

  const handleDeleteBot = (botId: string) => {
    botTeamService.deleteBot(botId)
    setBots(botTeamService.getBots())
    if (selectedBot?.id === botId) setSelectedBot(null)
  }

  const handleCopyResult = () => {
    if (executionResult?.output) {
      navigator.clipboard.writeText(executionResult.output)
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'never'
    const diff = Date.now() - new Date(dateStr).getTime()
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return '#22c55e'
      case 'working': return '#f59e0b'
      case 'paused': return '#666'
      case 'error': return '#ef4444'
      default: return '#888'
    }
  }

  const filteredSkills = skills.filter(skill =>
    skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    skill.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Use default Bloop skills if not connected
  const displaySkills = filteredSkills.length > 0 ? filteredSkills : [
    { name: 'bloop-code-review', description: 'AI-powered code review with security analysis', path: '', enabled: true, type: 'workspace' as const, capabilities: ['syntax', 'security', 'quality'] },
    { name: 'bloop-test-gen', description: 'Generate comprehensive test suites', path: '', enabled: true, type: 'workspace' as const, capabilities: ['unit', 'integration', 'edge-cases'] },
    { name: 'bloop-docs', description: 'Auto-generate documentation from code', path: '', enabled: true, type: 'workspace' as const, capabilities: ['api', 'examples', 'types'] },
    { name: 'bloop-refactor', description: 'Intelligent code refactoring suggestions', path: '', enabled: true, type: 'workspace' as const, capabilities: ['extract', 'rename', 'simplify'] },
    { name: 'bloop-debug', description: 'AI-assisted debugging and error analysis', path: '', enabled: true, type: 'workspace' as const, capabilities: ['error', 'trace', 'fix'] },
    { name: 'bloop-optimize', description: 'Performance optimization suggestions', path: '', enabled: true, type: 'workspace' as const, capabilities: ['complexity', 'memory', 'speed'] },
    { name: 'bloop-security', description: 'Security vulnerability scanning', path: '', enabled: true, type: 'workspace' as const, capabilities: ['vulnerabilities', 'audit', 'compliance'] }
  ]

  const tabStyle = (isActive: boolean) => ({
    padding: '8px 12px',
    background: isActive ? '#3c3c3c' : 'transparent',
    border: 'none',
    color: isActive ? '#ffffff' : '#888888',
    cursor: 'pointer',
    fontSize: '12px',
    borderBottom: isActive ? '2px solid #007acc' : '2px solid transparent',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s'
  })

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#0a0a0a',
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
          <Zap size={16} color={connected ? "#cccccc" : "#666"} />
          <span style={{ fontSize: '13px', color: '#cccccc' }}>OpenClaw</span>
          {connected && (
            <span style={{ fontSize: '11px', color: '#666', marginLeft: '4px' }}>
              ({displaySkills.length})
            </span>
          )}
        </div>
        {!connected && (
          <button
            onClick={handleConnect}
            disabled={loading}
            style={{
              padding: '4px 12px',
              background: 'transparent',
              border: '1px solid #1a1a1a',
              borderRadius: '4px',
              color: '#cccccc',
              cursor: loading ? 'wait' : 'pointer',
              fontSize: '11px'
            }}
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : 'Connect'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #1a1a1a'
      }}>
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
          onClick={() => setActiveTab('sessions')} 
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'sessions' ? '1px solid #cccccc' : '1px solid transparent',
            color: activeTab === 'sessions' ? '#cccccc' : '#666',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Sessions
        </button>
        <button 
          onClick={() => setActiveTab('execute')} 
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'execute' ? '1px solid #cccccc' : '1px solid transparent',
            color: activeTab === 'execute' ? '#cccccc' : '#666',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Execute
        </button>
        <button 
          onClick={() => setActiveTab('team')} 
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'team' ? '1px solid #FF00FF' : '1px solid transparent',
            color: activeTab === 'team' ? '#FF00FF' : '#666',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Bot size={12} />
          Team
          {bots.filter(b => b.status === 'active' || b.status === 'working').length > 0 && (
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: '#22c55e', display: 'inline-block'
            }} />
          )}
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
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
              {displaySkills.map((skill) => (
                <div
                  key={skill.name}
                  style={{
                    padding: '12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#141414'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    {SKILL_ICONS[skill.name] || <Zap size={16} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        color: '#cccccc', 
                        fontSize: '13px',
                        marginBottom: '2px'
                      }}>
                        {skill.name.replace('bloop-', '').replace(/-/g, ' ')}
                      </div>
                      <div style={{ color: '#666', fontSize: '11px' }}>
                        {skill.description}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleExecuteSkill(skill.name)}
                    disabled={executing}
                    style={{
                      padding: '4px 12px',
                      background: 'transparent',
                      border: '1px solid #1a1a1a',
                      borderRadius: '4px',
                      color: '#cccccc',
                      cursor: executing ? 'wait' : 'pointer',
                      fontSize: '11px',
                      opacity: executing ? 0.5 : 1
                    }}
                  >
                    Run
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div style={{ padding: '12px' }}>
            {sessions.length === 0 ? (
              <div style={{ 
                padding: '40px', 
                textAlign: 'center', 
                color: '#666',
                fontSize: '12px'
              }}>
                No active sessions
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    style={{
                      padding: '12px',
                      background: 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      color: '#cccccc'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#141414'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span>{session.channel}</span>
                    <span style={{ color: '#666', fontSize: '11px' }}>
                      {session.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'execute' && (
          <div style={{ padding: '12px' }}>
            {/* Current context */}
            <div style={{
              padding: '10px 12px',
              background: '#141414',
              borderRadius: '4px',
              marginBottom: '12px',
              border: '1px solid #1a1a1a',
              fontSize: '11px',
              color: '#999'
            }}>
              <div style={{ marginBottom: '4px' }}>
                <span style={{ color: '#666' }}>File: </span>
                {currentFilePath || 'None'}
              </div>
              <div>
                <span style={{ color: '#666' }}>Language: </span>
                {currentLanguage || 'Unknown'}
              </div>
            </div>

            {/* Execution Result */}
            {(executing || executionResult) && (
              <div style={{
                padding: '12px',
                background: '#141414',
                borderRadius: '4px',
                marginBottom: '12px',
                border: '1px solid #1a1a1a'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '10px',
                  fontSize: '12px',
                  color: '#cccccc'
                }}>
                  {executing ? (
                    <Loader2 size={14} color="#cccccc" className="animate-spin" />
                  ) : executionResult?.success ? (
                    <CheckCircle size={14} color="#cccccc" />
                  ) : (
                    <XCircle size={14} color="#666" />
                  )}
                  <span>
                    {executing ? 'Executing...' : selectedSkill?.replace('bloop-', '').replace(/-/g, ' ')}
                  </span>
                </div>

                {executionResult && (
                  <pre style={{
                    margin: 0,
                    padding: '10px',
                    background: '#0a0a0a',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: "'JetBrains Mono', monospace",
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: '300px',
                    overflow: 'auto',
                    color: executionResult.error ? '#999' : '#cccccc',
                    border: '1px solid #1a1a1a'
                  }}>
                    {executionResult.output || executionResult.error}
                  </pre>
                )}
              </div>
            )}

            {/* Execution History */}
            {executionHistory.length > 0 && (
              <div>
                <div style={{ 
                  fontSize: '11px', 
                  color: '#666', 
                  marginBottom: '8px'
                }}>
                  History
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  {executionHistory.map((entry, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '8px 12px',
                        background: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '11px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#141414'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {entry.result.success ? (
                          <CheckCircle size={12} color="#cccccc" />
                        ) : (
                          <XCircle size={12} color="#666" />
                        )}
                        <span style={{ color: '#cccccc' }}>
                          {entry.skill.replace('bloop-', '')}
                        </span>
                      </div>
                      <span style={{ color: '#666', fontSize: '10px' }}>
                        {entry.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'team' && (
          <div style={{ padding: '12px' }}>
            {/* Team Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <div style={{ fontSize: '12px', color: '#cccccc' }}>
                24/7 Bot Team
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {bots.length > 0 && (
                  <button
                    onClick={handleToggleTeam}
                    style={{
                      padding: '4px 10px', fontSize: '11px', cursor: 'pointer',
                      background: teamEnabled ? 'rgba(34,197,94,0.15)' : 'transparent',
                      border: `1px solid ${teamEnabled ? '#22c55e' : '#333'}`,
                      borderRadius: '4px',
                      color: teamEnabled ? '#22c55e' : '#888'
                    }}
                  >
                    {teamEnabled ? 'Active' : 'Paused'}
                  </button>
                )}
                <button
                  onClick={() => setShowCreateBot(!showCreateBot)}
                  style={{
                    padding: '4px 10px', fontSize: '11px', cursor: 'pointer',
                    background: 'transparent', border: '1px solid #333',
                    borderRadius: '4px', color: '#cccccc',
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  <Plus size={12} /> Add
                </button>
              </div>
            </div>

            {/* Team Stats Bar */}
            {bots.length > 0 && (
              <div style={{
                display: 'flex', gap: '12px', padding: '8px 12px',
                background: '#141414', borderRadius: '4px', marginBottom: '12px',
                border: '1px solid #1a1a1a', fontSize: '11px'
              }}>
                <div><span style={{ color: '#666' }}>Bots: </span><span style={{ color: '#cccccc' }}>{bots.length}</span></div>
                <div><span style={{ color: '#666' }}>Active: </span><span style={{ color: '#22c55e' }}>{bots.filter(b => b.status === 'active' || b.status === 'working').length}</span></div>
                <div><span style={{ color: '#666' }}>Tasks: </span><span style={{ color: '#cccccc' }}>{bots.reduce((s, b) => s + b.stats.tasksCompleted, 0)}</span></div>
                <div><span style={{ color: '#666' }}>Issues: </span><span style={{ color: '#f59e0b' }}>{bots.reduce((s, b) => s + b.stats.issuesFound, 0)}</span></div>
              </div>
            )}

            {/* Create Bot Panel */}
            {showCreateBot && (
              <div style={{
                padding: '12px', background: '#141414', borderRadius: '4px',
                marginBottom: '12px', border: '1px solid #1a1a1a'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#cccccc' }}>Add Specialist Bot</span>
                  <button
                    onClick={handleCreateFullTeam}
                    style={{
                      padding: '4px 10px', fontSize: '11px', cursor: 'pointer',
                      background: 'rgba(255,0,255,0.1)', border: '1px solid rgba(255,0,255,0.3)',
                      borderRadius: '4px', color: '#FF00FF'
                    }}
                  >
                    Create Full Team
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {(Object.entries(BOT_SPECIALIZATIONS) as [BotSpecialization, typeof BOT_SPECIALIZATIONS[BotSpecialization]][]).map(([key, spec]) => {
                    const exists = bots.some(b => b.specialization === key)
                    return (
                      <div
                        key={key}
                        onClick={() => !exists && handleCreateBot(key)}
                        style={{
                          padding: '8px 10px', cursor: exists ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: '10px',
                          borderRadius: '4px', opacity: exists ? 0.4 : 1
                        }}
                        onMouseEnter={(e) => { if (!exists) e.currentTarget.style.background = '#1a1a1a' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <span style={{ fontSize: '16px' }}>{spec.avatar}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '12px', color: '#cccccc' }}>{spec.name}</div>
                          <div style={{ fontSize: '10px', color: '#666' }}>{spec.description.substring(0, 60)}...</div>
                        </div>
                        <span style={{ fontSize: '10px', color: '#666' }}>
                          {exists ? 'Added' : spec.defaultModel.split('-')[0]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Bot List */}
            {bots.length === 0 && !showCreateBot ? (
              <div style={{
                padding: '40px 20px', textAlign: 'center', color: '#666', fontSize: '12px'
              }}>
                <Bot size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <div style={{ marginBottom: '8px' }}>No bots in your team yet</div>
                <div style={{ fontSize: '11px', color: '#555', marginBottom: '16px' }}>
                  Create a team of specialized AI bots that work on your project 24/7
                </div>
                <button
                  onClick={() => setShowCreateBot(true)}
                  style={{
                    padding: '8px 16px', fontSize: '12px', cursor: 'pointer',
                    background: 'rgba(255,0,255,0.1)', border: '1px solid rgba(255,0,255,0.3)',
                    borderRadius: '4px', color: '#FF00FF'
                  }}
                >
                  Build Your Team
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {bots.map(bot => (
                  <div key={bot.id}>
                    {/* Bot Card */}
                    <div
                      style={{
                        padding: '10px 12px', cursor: 'pointer',
                        background: selectedBot?.id === bot.id ? '#1a1a1a' : 'transparent',
                        borderRadius: '4px',
                        display: 'flex', alignItems: 'center', gap: '10px'
                      }}
                      onClick={() => setSelectedBot(selectedBot?.id === bot.id ? null : bot)}
                      onMouseEnter={(e) => { if (selectedBot?.id !== bot.id) e.currentTarget.style.background = '#141414' }}
                      onMouseLeave={(e) => { if (selectedBot?.id !== bot.id) e.currentTarget.style.background = 'transparent' }}
                    >
                      <span style={{ fontSize: '18px' }}>{bot.avatar}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '12px', color: '#cccccc' }}>{bot.name}</span>
                          <span style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: statusColor(bot.status), display: 'inline-block'
                          }} />
                        </div>
                        <div style={{ fontSize: '10px', color: '#666' }}>
                          {bot.stats.tasksCompleted} tasks | Last: {formatTimeAgo(bot.stats.lastRunAt)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRunBotNow(bot.id) }}
                          disabled={botRunning[bot.id] || bot.status === 'working'}
                          title="Run now"
                          style={{
                            padding: '4px', background: 'transparent', border: 'none',
                            color: botRunning[bot.id] ? '#666' : '#cccccc', cursor: 'pointer'
                          }}
                        >
                          {botRunning[bot.id] ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleBot(bot.id) }}
                          title={bot.status === 'active' ? 'Pause' : 'Resume'}
                          style={{
                            padding: '4px', background: 'transparent', border: 'none',
                            color: bot.status === 'active' ? '#22c55e' : '#666', cursor: 'pointer'
                          }}
                        >
                          {bot.status === 'active' || bot.status === 'working' ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Bot Detail (expanded) */}
                    {selectedBot?.id === bot.id && (
                      <div style={{
                        padding: '10px 12px', marginLeft: '28px',
                        borderLeft: '1px solid #1a1a1a', fontSize: '11px'
                      }}>
                        {/* Status & Model */}
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '10px', color: '#888' }}>
                          <div><span style={{ color: '#555' }}>Model: </span>{bot.model}</div>
                          <div><span style={{ color: '#555' }}>Every: </span>{bot.preferences.scheduleMinutes}m</div>
                          <div><span style={{ color: '#555' }}>Status: </span>
                            <span style={{ color: statusColor(bot.status) }}>{bot.status}</span>
                          </div>
                        </div>

                        {/* Stats */}
                        <div style={{
                          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px',
                          padding: '8px', background: '#0a0a0a', borderRadius: '4px',
                          marginBottom: '10px', border: '1px solid #1a1a1a'
                        }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ color: '#cccccc', fontSize: '14px' }}>{bot.stats.tasksCompleted}</div>
                            <div style={{ color: '#555', fontSize: '10px' }}>Tasks</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ color: '#f59e0b', fontSize: '14px' }}>{bot.stats.issuesFound}</div>
                            <div style={{ color: '#555', fontSize: '10px' }}>Issues</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ color: '#3b82f6', fontSize: '14px' }}>{bot.stats.suggestionsGiven}</div>
                            <div style={{ color: '#555', fontSize: '10px' }}>Suggestions</div>
                          </div>
                        </div>

                        {/* Capabilities */}
                        <div style={{ marginBottom: '10px' }}>
                          <div style={{ color: '#555', marginBottom: '4px' }}>Capabilities</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {BOT_SPECIALIZATIONS[bot.specialization].capabilities.map(cap => (
                              <span key={cap} style={{
                                padding: '2px 8px', background: '#1a1a1a', borderRadius: '3px',
                                fontSize: '10px', color: '#888'
                              }}>{cap}</span>
                            ))}
                          </div>
                        </div>

                        {/* Recent Work Log */}
                        {bot.workLog.length > 0 && (
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ color: '#555', marginBottom: '4px' }}>Recent Activity</div>
                            {bot.workLog.slice(-5).reverse().map(entry => (
                              <div key={entry.id} style={{
                                padding: '4px 0', borderBottom: '1px solid #0d0d0d',
                                display: 'flex', justifyContent: 'space-between'
                              }}>
                                <span style={{ color: entry.action === 'error' ? '#ef4444' : '#888' }}>
                                  {entry.summary.substring(0, 50)}{entry.summary.length > 50 ? '...' : ''}
                                </span>
                                <span style={{ color: '#555', fontSize: '10px', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                                  {formatTimeAgo(entry.timestamp)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleRunBotNow(bot.id)}
                            disabled={botRunning[bot.id]}
                            style={{
                              padding: '4px 10px', fontSize: '11px', cursor: 'pointer',
                              background: 'transparent', border: '1px solid #333',
                              borderRadius: '4px', color: '#cccccc',
                              display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            {botRunning[bot.id] ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                            Run Now
                          </button>
                          <button
                            onClick={() => handleDeleteBot(bot.id)}
                            style={{
                              padding: '4px 10px', fontSize: '11px', cursor: 'pointer',
                              background: 'transparent', border: '1px solid #333',
                              borderRadius: '4px', color: '#ef4444',
                              display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            <Trash2 size={10} /> Remove
                          </button>
                        </div>
                      </div>
                    )}
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
