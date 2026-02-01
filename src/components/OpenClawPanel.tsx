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
      </div>
    </div>
  )
}
