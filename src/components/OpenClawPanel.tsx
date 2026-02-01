/**
 * OpenClaw Panel Component
 * Displays OpenClaw skills, sessions, and provides skill execution UI
 */
import { useState, useEffect, useCallback } from 'react'
import { 
  Zap, Play, RefreshCw, Search, Code, TestTube, FileText, 
  Wrench, Bug, Gauge, Shield, CheckCircle, 
  XCircle, Clock, Loader2, Copy, Terminal,
  Users, MessageSquare, Plug
} from 'lucide-react'
import { openClawService } from '../services/openclaw'
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
  const [activeTab, setActiveTab] = useState<'skills' | 'sessions' | 'execute'>('skills')
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

  const handleCopyResult = () => {
    if (executionResult?.output) {
      navigator.clipboard.writeText(executionResult.output)
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
      background: '#1e1e1e',
      color: '#cccccc'
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid #2a2a2a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#252526'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: connected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Zap size={18} color={connected ? "#22c55e" : "#ef4444"} />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '14px' }}>OpenClaw</div>
            <div style={{ fontSize: '11px', color: '#888888', marginTop: '2px' }}>
              {connected ? 'Gateway connected' : 'Not connected'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {!connected && (
            <button
              onClick={handleConnect}
              disabled={loading}
              style={{
                padding: '6px 14px',
                background: loading ? '#3c3c3c' : '#22c55e',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                cursor: loading ? 'wait' : 'pointer',
                fontSize: '12px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                opacity: loading ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = '#16a34a'
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.background = '#22c55e'
              }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Plug size={14} />}
              Connect
            </button>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              padding: '6px',
              background: 'transparent',
              border: '1px solid #3c3c3c',
              borderRadius: '6px',
              color: '#888888',
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.borderColor = '#22c55e'
                e.currentTarget.style.color = '#22c55e'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.borderColor = '#3c3c3c'
                e.currentTarget.style.color = '#888888'
              }
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #2a2a2a',
        background: '#252526',
        padding: '0 8px'
      }}>
        <button 
          onClick={() => setActiveTab('skills')} 
          style={{
            ...tabStyle(activeTab === 'skills'),
            padding: '10px 16px',
            marginTop: '4px',
            borderRadius: '6px 6px 0 0'
          }}
        >
          <Zap size={14} />
          <span>Skills</span>
          <span style={{
            marginLeft: '6px',
            padding: '2px 6px',
            borderRadius: '10px',
            background: activeTab === 'skills' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            fontSize: '10px',
            fontWeight: 500
          }}>
            {displaySkills.length}
          </span>
        </button>
        <button 
          onClick={() => setActiveTab('sessions')} 
          style={{
            ...tabStyle(activeTab === 'sessions'),
            padding: '10px 16px',
            marginTop: '4px',
            borderRadius: '6px 6px 0 0'
          }}
        >
          <Users size={14} />
          <span>Sessions</span>
          <span style={{
            marginLeft: '6px',
            padding: '2px 6px',
            borderRadius: '10px',
            background: activeTab === 'sessions' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            fontSize: '10px',
            fontWeight: 500
          }}>
            {sessions.length}
          </span>
        </button>
        <button 
          onClick={() => setActiveTab('execute')} 
          style={{
            ...tabStyle(activeTab === 'execute'),
            padding: '10px 16px',
            marginTop: '4px',
            borderRadius: '6px 6px 0 0'
          }}
        >
          <Terminal size={14} />
          Execute
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'skills' && (
          <div style={{ padding: '16px' }}>
            {/* Search */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px',
              padding: '10px 14px',
              background: '#252526',
              borderRadius: '8px',
              marginBottom: '16px',
              border: '1px solid #2a2a2a',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#22c55e'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#2a2a2a'}
            >
              <Search size={16} color="#888888" />
              <input
                type="text"
                placeholder="Search skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none',
                  fontWeight: 400
                }}
              />
            </div>

            {/* Skills List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {displaySkills.map((skill) => (
                <div
                  key={skill.name}
                  style={{
                    padding: '16px',
                    background: '#252526',
                    borderRadius: '10px',
                    border: '1px solid #2a2a2a',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = SKILL_COLORS[skill.name] || '#007acc'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = `0 4px 12px ${SKILL_COLORS[skill.name]}20`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#2a2a2a'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: `${SKILL_COLORS[skill.name] || '#007acc'}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: SKILL_COLORS[skill.name] || '#007acc',
                        flexShrink: 0
                      }}>
                        {SKILL_ICONS[skill.name] || <Zap size={20} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          color: '#ffffff', 
                          fontSize: '14px', 
                          fontWeight: 600,
                          marginBottom: '4px',
                          lineHeight: 1.3
                        }}>
                          {skill.name.replace('bloop-', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </div>
                        <div style={{ color: '#999999', fontSize: '12px', lineHeight: 1.5 }}>
                          {skill.description}
                        </div>
                        
                        {/* Capabilities */}
                        <div style={{ 
                          display: 'flex', 
                          gap: '6px', 
                          marginTop: '12px',
                          flexWrap: 'wrap'
                        }}>
                          {skill.capabilities.slice(0, 4).map(cap => (
                            <span
                              key={cap}
                              style={{
                                padding: '4px 10px',
                                background: '#1e1e1e',
                                borderRadius: '12px',
                                fontSize: '10px',
                                color: '#888888',
                                fontWeight: 500,
                                border: '1px solid #2a2a2a'
                              }}
                            >
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleExecuteSkill(skill.name)}
                      disabled={executing}
                      style={{
                        padding: '8px 16px',
                        background: SKILL_COLORS[skill.name] || '#007acc',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#ffffff',
                        cursor: executing ? 'wait' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s',
                        opacity: executing ? 0.6 : 1,
                        flexShrink: 0
                      }}
                      onMouseEnter={(e) => {
                        if (!executing) {
                          e.currentTarget.style.transform = 'scale(1.05)'
                          e.currentTarget.style.boxShadow = `0 4px 12px ${SKILL_COLORS[skill.name]}40`
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!executing) {
                          e.currentTarget.style.transform = 'scale(1)'
                          e.currentTarget.style.boxShadow = 'none'
                        }
                      }}
                    >
                      <Play size={14} />
                      Run
                    </button>
                  </div>
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
                color: '#888888',
                fontSize: '13px'
              }}>
                <MessageSquare size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <p>No active sessions</p>
                <p style={{ fontSize: '11px', marginTop: '8px' }}>
                  Sessions are created when collaborating with other agents
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    style={{
                      padding: '12px',
                      background: '#252526',
                      borderRadius: '8px',
                      border: '1px solid #3c3c3c'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: session.status === 'active' ? '#22c55e' : '#888888'
                        }} />
                        <span style={{ color: '#ffffff', fontSize: '13px' }}>
                          {session.channel}
                        </span>
                      </div>
                      <span style={{ color: '#888888', fontSize: '11px' }}>
                        {session.status}
                      </span>
                    </div>
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
              padding: '12px',
              background: '#252526',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ 
                fontSize: '11px', 
                color: '#888888', 
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Current Context
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: '#888888' }}>File: </span>
                  <span style={{ color: '#ffffff' }}>{currentFilePath || 'None'}</span>
                </div>
                <div>
                  <span style={{ color: '#888888' }}>Language: </span>
                  <span style={{ color: '#ffffff' }}>{currentLanguage || 'Unknown'}</span>
                </div>
                <div>
                  <span style={{ color: '#888888' }}>Code: </span>
                  <span style={{ color: '#ffffff' }}>
                    {currentCode ? `${currentCode.split('\n').length} lines` : 'None'}
                  </span>
                </div>
              </div>
            </div>

            {/* Execution Result */}
            {(executing || executionResult) && (
              <div style={{
                padding: '12px',
                background: '#252526',
                borderRadius: '8px',
                marginBottom: '16px',
                border: `1px solid ${executionResult?.success ? '#22c55e' : executionResult?.error ? '#ef4444' : '#3c3c3c'}`
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {executing ? (
                      <Loader2 size={16} color="#007acc" className="animate-spin" />
                    ) : executionResult?.success ? (
                      <CheckCircle size={16} color="#22c55e" />
                    ) : (
                      <XCircle size={16} color="#ef4444" />
                    )}
                    <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: 500 }}>
                      {executing ? 'Executing...' : selectedSkill?.replace('bloop-', '').replace(/-/g, ' ')}
                    </span>
                  </div>
                  {executionResult?.duration && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      color: '#888888',
                      fontSize: '11px'
                    }}>
                      <Clock size={12} />
                      {executionResult.duration}ms
                    </div>
                  )}
                </div>

                {executionResult && (
                  <div style={{ position: 'relative' }}>
                    <pre style={{
                      margin: 0,
                      padding: '12px',
                      background: '#1e1e1e',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontFamily: "'JetBrains Mono', monospace",
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: '300px',
                      overflow: 'auto',
                      color: executionResult.error ? '#ef4444' : '#cccccc'
                    }}>
                      {executionResult.output || executionResult.error}
                    </pre>
                    {executionResult.output && (
                      <button
                        onClick={handleCopyResult}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          padding: '4px',
                          background: '#3c3c3c',
                          border: 'none',
                          borderRadius: '4px',
                          color: '#888888',
                          cursor: 'pointer'
                        }}
                        title="Copy to clipboard"
                      >
                        <Copy size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Execution History */}
            {executionHistory.length > 0 && (
              <div>
                <div style={{ 
                  fontSize: '11px', 
                  color: '#888888', 
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  History
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {executionHistory.map((entry, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '8px 12px',
                        background: '#252526',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {entry.result.success ? (
                          <CheckCircle size={12} color="#22c55e" />
                        ) : (
                          <XCircle size={12} color="#ef4444" />
                        )}
                        <span style={{ color: '#cccccc' }}>
                          {entry.skill.replace('bloop-', '')}
                        </span>
                      </div>
                      <span style={{ color: '#666666', fontSize: '10px' }}>
                        {entry.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
