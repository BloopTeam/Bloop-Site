/**
 * Team Room Panel
 * 
 * Live feed of autonomous bot-to-bot discussions. Bots talk to each other
 * as they work — the user drops in and sees an active engineering team.
 * User can also join the conversation at any time.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  Users, MessageSquare, Send, RefreshCw,
  Bot, Loader2, Zap, Settings,
  ChevronDown, ChevronRight, Lightbulb, Code,
  Shield, Bug, FileText, Wrench, TestTube, Gauge,
  Sparkles, X, Hash, Activity
} from 'lucide-react'
import { botTeamService, BOT_SPECIALIZATIONS, type TeamBot } from '../services/botTeam'
import { teamDiscussionService, type TeamMessage, type TeamThread } from '../services/teamDiscussion'

// ─── Props ───────────────────────────────────────────────────────────────────

interface MoltbookPanelProps {
  readonly onClose?: () => void
  readonly onInstallSkill?: (skillMd: string, name: string) => void
  readonly onCreateFile?: (name: string, content: string, language?: string) => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BOT_COLORS: Record<string, string> = {
  'code-reviewer': '#3b82f6',
  'test-engineer': '#22c55e',
  'security-auditor': '#ef4444',
  'docs-writer': '#f59e0b',
  'optimizer': '#06b6d4',
  'debugger': '#a855f7',
  'architect': '#ec4899',
}

const DISCUSSION_PROMPTS = [
  { label: 'Code Review Strategy', topic: 'How should we approach reviewing the current codebase? What patterns should we enforce?' },
  { label: 'Architecture Decisions', topic: 'What architectural improvements should we prioritize? Any design pattern changes needed?' },
  { label: 'Security Audit Plan', topic: 'What security concerns should we focus on? Are there any immediate vulnerabilities to address?' },
  { label: 'Testing Coverage', topic: 'Where are the gaps in our test coverage? What testing strategies should we adopt?' },
  { label: 'Performance Bottlenecks', topic: 'What are the main performance issues? How should we optimize the critical paths?' },
  { label: 'Adapt to My Style', topic: 'Based on the code you\'ve seen, how can you all better adapt to my coding style and preferences?' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function MoltbookPanel({ onClose, onCreateFile }: MoltbookPanelProps) {
  const [activeTab, setActiveTab] = useState<'team' | 'threads' | 'preferences'>('team')
  const [bots, setBots] = useState<TeamBot[]>([])
  const [messages, setMessages] = useState<TeamMessage[]>([])
  const [threads, setThreads] = useState<TeamThread[]>([])
  const [userInput, setUserInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [thinkingBots, setThinkingBots] = useState<Set<string>>(new Set())
  const [expandedThread, setExpandedThread] = useState<string | null>(null)
  const [showPrompts, setShowPrompts] = useState(false)
  const [selectedBots, setSelectedBots] = useState<Set<string>>(new Set())
  const [liveIndicator, setLiveIndicator] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)

  // ─── Subscribe to live messages from the service ─────────────────────

  useEffect(() => {
    // Load existing messages
    setMessages(teamDiscussionService.getMessages())
    setThreads(teamDiscussionService.getThreads())

    // Subscribe to new messages
    const unsubMsg = teamDiscussionService.onMessage((msg) => {
      setMessages(prev => [...prev, msg])
      // Flash the live indicator
      setLiveIndicator(true)
      setTimeout(() => setLiveIndicator(false), 2000)
    })

    // Subscribe to new threads
    const unsubThread = teamDiscussionService.onThread((thread) => {
      setThreads(prev => [thread, ...prev.filter(t => t.id !== thread.id)])
    })

    // Subscribe to thinking state
    const unsubThinking = teamDiscussionService.onThinking((botId, thinking) => {
      setThinkingBots(prev => {
        const next = new Set(prev)
        if (thinking) next.add(botId)
        else next.delete(botId)
        return next
      })
    })

    return () => { unsubMsg(); unsubThread(); unsubThinking() }
  }, [])

  // Load bots
  useEffect(() => {
    const loadBots = () => {
      const teamBots = botTeamService.getBots()
      setBots(teamBots)
      setSelectedBots(prev => {
        if (prev.size === 0) return new Set(teamBots.filter(b => b.status === 'active' || b.status === 'idle').map(b => b.id))
        return prev
      })
    }
    loadBots()
    const interval = setInterval(loadBots, 5000)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinkingBots])

  // Welcome message
  useEffect(() => {
    if (messages.length === 0 && bots.length > 0) {
      const welcomeMsg: TeamMessage = {
        id: 'welcome',
        botId: 'system',
        botName: 'Team',
        botAvatar: '',
        botColor: '#FF00FF',
        content: `Team room is live. ${bots.length} bot${bots.length !== 1 ? 's' : ''} online. They'll talk here automatically as they work — or ask them something directly.`,
        type: 'system',
        timestamp: Date.now(),
      }
      setMessages([welcomeMsg])
    }
  }, [bots.length])

  // ─── Handlers ────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const text = userInput.trim()
    if (!text || isThinking) return
    setUserInput('')
    setIsThinking(true)
    try {
      await teamDiscussionService.startDiscussion(text, Array.from(selectedBots))
    } finally {
      setIsThinking(false)
    }
  }, [userInput, isThinking, selectedBots])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handlePromptSelect = useCallback(async (topic: string) => {
    setShowPrompts(false)
    setIsThinking(true)
    try {
      await teamDiscussionService.startDiscussion(topic, Array.from(selectedBots))
    } finally {
      setIsThinking(false)
    }
  }, [selectedBots])

  const toggleBot = useCallback((botId: string) => {
    setSelectedBots(prev => {
      const next = new Set(prev)
      if (next.has(botId)) next.delete(botId)
      else next.add(botId)
      return next
    })
  }, [])

  const clearChat = useCallback(() => {
    teamDiscussionService.clearMessages()
    setMessages([])
    setThreads([])
  }, [])

  // ─── Render helpers ────────────────────────────────────────────────

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    const now = new Date()
    const diff = now.getTime() - ts
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const renderMessage = (msg: TeamMessage) => {
    const isUser = msg.botId === 'user'
    const isSystem = msg.botId === 'system'
    const isAlert = msg.type === 'alert'
    const isReport = msg.type === 'report'

    if (isSystem) {
      return (
        <div key={msg.id} style={{
          padding: '10px 16px', margin: '8px 0',
          background: 'rgba(255,0,255,0.04)', borderRadius: '8px',
          borderLeft: '3px solid #FF00FF33',
          fontSize: '12px', color: '#888', lineHeight: '1.5',
        }}>
          <Sparkles size={12} style={{ display: 'inline', marginRight: '6px', color: '#FF00FF' }} />
          {msg.content}
        </div>
      )
    }

    return (
      <div key={msg.id} style={{
        padding: '12px 16px', margin: '6px 0',
        background: isUser ? 'rgba(255,0,255,0.06)' : isAlert ? 'rgba(239,68,68,0.04)' : isReport ? 'rgba(34,197,94,0.03)' : '#141414',
        borderRadius: '10px',
        borderLeft: `3px solid ${isAlert ? '#ef4444' : msg.botColor}`,
        transition: 'background 0.15s',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          {isUser ? (
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #FF00FF, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700, color: '#fff',
            }}>U</div>
          ) : (
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: `${msg.botColor}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px',
            }}>
              {msg.botAvatar || <Bot size={12} />}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: isUser ? '#FF00FF' : msg.botColor }}>
              {msg.botName}
            </span>
            {isReport && <span style={{ fontSize: '9px', color: '#22c55e', marginLeft: '6px', background: '#22c55e15', padding: '1px 5px', borderRadius: '3px' }}>report</span>}
            {isAlert && <span style={{ fontSize: '9px', color: '#ef4444', marginLeft: '6px', background: '#ef444415', padding: '1px 5px', borderRadius: '3px' }}>alert</span>}
            {msg.replyTo && <span style={{ fontSize: '9px', color: '#555', marginLeft: '6px' }}>replying</span>}
          </div>
          <span style={{ fontSize: '10px', color: '#444' }}>{formatTime(msg.timestamp)}</span>
        </div>

        {/* Content */}
        <div style={{
          fontSize: '12px', color: '#ccc', lineHeight: '1.6',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {msg.content}
        </div>

        {/* Files affected */}
        {msg.filesAffected && msg.filesAffected.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
            {msg.filesAffected.map((f, i) => (
              <span key={i} style={{
                padding: '2px 6px', background: '#0a0a0a', borderRadius: '3px',
                fontSize: '10px', color: '#888', fontFamily: "'Fira Code', monospace",
              }}>{f}</span>
            ))}
          </div>
        )}

        {/* Code snippets */}
        {msg.codeSnippets && msg.codeSnippets.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            {msg.codeSnippets.map((snippet, i) => (
              <div key={i} style={{
                background: '#0a0a0a', borderRadius: '6px', padding: '10px 12px',
                marginTop: '6px', border: '1px solid #1a1a1a',
                fontFamily: "'Fira Code', monospace", fontSize: '11px',
                color: '#d4d4d4', whiteSpace: 'pre-wrap', overflow: 'auto',
                maxHeight: '150px',
              }}>
                {snippet.code}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─── Main render ───────────────────────────────────────────────────

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: '#1e1e1e', color: '#cccccc',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid #2a2a2a',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={16} style={{ color: '#FF00FF' }} />
          <span style={{ fontWeight: 600, fontSize: '13px' }}>Team Room</span>
          {liveIndicator && (
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: '#22c55e', display: 'inline-block',
              animation: 'pulse 1s ease-in-out',
            }} />
          )}
          <span style={{
            padding: '2px 8px', background: '#22c55e15', borderRadius: '10px',
            fontSize: '10px', color: '#22c55e', border: '1px solid #22c55e25',
          }}>
            {bots.filter(b => b.status === 'active' || b.status === 'idle' || b.status === 'working').length} online
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={clearChat} title="Clear chat"
            style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', padding: '4px' }}>
            <RefreshCw size={14} />
          </button>
          {onClose && (
            <button onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', padding: '4px' }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #2a2a2a', padding: '0 12px' }}>
        {([
          { id: 'team' as const, label: 'Live', icon: <Activity size={12} /> },
          { id: 'threads' as const, label: 'Threads', icon: <Hash size={12} /> },
          { id: 'preferences' as const, label: 'Team', icon: <Settings size={12} /> },
        ]).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '8px 14px', fontSize: '11px', cursor: 'pointer',
            background: 'transparent', border: 'none',
            borderBottom: activeTab === tab.id ? '2px solid #FF00FF' : '2px solid transparent',
            color: activeTab === tab.id ? '#FF00FF' : '#666',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            {tab.icon} {tab.label}
            {tab.id === 'team' && thinkingBots.size > 0 && (
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 1s infinite' }} />
            )}
          </button>
        ))}
      </div>

      {/* Bot bar */}
      <div style={{
        padding: '8px 12px', borderBottom: '1px solid #1a1a1a',
        display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center',
      }}>
        <span style={{ fontSize: '10px', color: '#555', marginRight: '2px' }}>Team:</span>
        {bots.map(bot => {
          const spec = BOT_SPECIALIZATIONS[bot.specialization]
          const isSelected = selectedBots.has(bot.id)
          const isWorking = bot.status === 'working' || thinkingBots.has(bot.id)
          return (
            <button key={bot.id} onClick={() => toggleBot(bot.id)}
              title={`${spec?.name} — ${isSelected ? 'in room' : 'not in room'}`}
              style={{
                padding: '3px 8px', fontSize: '10px', cursor: 'pointer',
                background: isSelected ? `${BOT_COLORS[bot.specialization]}15` : 'transparent',
                border: `1px solid ${isSelected ? BOT_COLORS[bot.specialization] + '40' : '#333'}`,
                borderRadius: '12px',
                color: isSelected ? BOT_COLORS[bot.specialization] : '#555',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}>
              {isWorking && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 1s infinite' }} />}
              <span style={{ fontSize: '12px' }}>{spec?.avatar}</span>
              {spec?.name}
            </button>
          )
        })}
        {bots.length === 0 && (
          <span style={{ fontSize: '10px', color: '#555', fontStyle: 'italic' }}>
            No bots — add some in the OpenClaw panel
          </span>
        )}
      </div>

      {/* ═══ LIVE TAB ═══ */}
      {activeTab === 'team' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
            {messages.map(msg => renderMessage(msg))}

            {/* Thinking indicators */}
            {Array.from(thinkingBots).map(botId => {
              const bot = bots.find(b => b.id === botId)
              if (!bot) return null
              const spec = BOT_SPECIALIZATIONS[bot.specialization]
              return (
                <div key={`think-${botId}`} style={{
                  padding: '10px 16px', margin: '6px 0', background: '#141414',
                  borderRadius: '10px', borderLeft: `3px solid ${BOT_COLORS[bot.specialization]}`,
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: `${BOT_COLORS[bot.specialization]}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px',
                  }}>{spec?.avatar}</div>
                  <span style={{ fontSize: '12px', color: BOT_COLORS[bot.specialization], fontWeight: 500 }}>
                    {spec?.name}
                  </span>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: '4px', height: '4px', borderRadius: '50%',
                        background: BOT_COLORS[bot.specialization],
                        animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`, opacity: 0.6,
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '10px', color: '#555' }}>typing...</span>
                </div>
              )
            })}

            <div ref={chatEndRef} />
          </div>

          {/* Quick prompts */}
          {showPrompts && (
            <div style={{
              padding: '8px 12px', borderTop: '1px solid #1a1a1a',
              background: '#141414', maxHeight: '200px', overflow: 'auto',
            }}>
              <div style={{ fontSize: '10px', color: '#555', marginBottom: '6px' }}>Start a discussion:</div>
              {DISCUSSION_PROMPTS.map((p, i) => (
                <button key={i} onClick={() => handlePromptSelect(p.topic)} style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '8px 10px', marginBottom: '4px',
                  background: '#1a1a1a', border: '1px solid #2a2a2a',
                  borderRadius: '6px', cursor: 'pointer', color: '#ccc', fontSize: '11px',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF00FF33' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a' }}
                >
                  <div style={{ fontWeight: 500, marginBottom: '2px' }}>{p.label}</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>{p.topic.substring(0, 80)}...</div>
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '12px', borderTop: '1px solid #2a2a2a', background: '#1a1a1a' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <button onClick={() => setShowPrompts(!showPrompts)} style={{
                padding: '6px', background: showPrompts ? '#FF00FF15' : 'transparent',
                border: `1px solid ${showPrompts ? '#FF00FF33' : '#333'}`,
                borderRadius: '6px', cursor: 'pointer',
                color: showPrompts ? '#FF00FF' : '#666', flexShrink: 0,
              }}>
                <Lightbulb size={14} />
              </button>
              <textarea
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isThinking ? 'Team is discussing...' : 'Jump in — or let them talk...'}
                disabled={isThinking}
                rows={1}
                style={{
                  flex: 1, padding: '8px 12px', fontSize: '12px',
                  background: '#252526', border: '1px solid #333',
                  borderRadius: '8px', color: '#ccc', resize: 'none',
                  outline: 'none', fontFamily: 'inherit',
                  minHeight: '36px', maxHeight: '100px',
                  opacity: isThinking ? 0.5 : 1,
                }}
              />
              <button onClick={handleSend} disabled={!userInput.trim() || isThinking} style={{
                padding: '8px',
                background: userInput.trim() && !isThinking ? '#FF00FF' : '#333',
                border: 'none', borderRadius: '8px',
                cursor: userInput.trim() && !isThinking ? 'pointer' : 'default',
                color: '#fff', flexShrink: 0,
              }}>
                {isThinking ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <span style={{ fontSize: '10px', color: '#444' }}>
                {thinkingBots.size > 0
                  ? `${thinkingBots.size} bot${thinkingBots.size > 1 ? 's' : ''} typing...`
                  : `${selectedBots.size} in room`}
              </span>
              <span style={{ fontSize: '10px', color: '#444' }}>Shift+Enter for new line</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ THREADS TAB ═══ */}
      {activeTab === 'threads' && (
        <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
          {threads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#555' }}>
              <Hash size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <div style={{ fontSize: '13px', marginBottom: '4px' }}>No threads yet</div>
              <div style={{ fontSize: '11px', color: '#444' }}>
                Discussions auto-thread when the team talks. Or ask them something in Live.
              </div>
            </div>
          ) : (
            threads.map(thread => (
              <div key={thread.id} style={{
                marginBottom: '8px', background: '#141414', borderRadius: '8px',
                border: '1px solid #1a1a1a', overflow: 'hidden',
              }}>
                <button onClick={() => setExpandedThread(expandedThread === thread.id ? null : thread.id)} style={{
                  width: '100%', padding: '12px', background: 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc',
                }}>
                  {expandedThread === thread.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '2px' }}>
                      {thread.topic.substring(0, 60)}{thread.topic.length > 60 ? '...' : ''}
                    </div>
                    <div style={{ fontSize: '10px', color: '#555' }}>
                      {thread.messages.length} messages &middot; {formatTime(thread.createdAt)}
                    </div>
                  </div>
                </button>
                {expandedThread === thread.id && (
                  <div style={{ padding: '0 12px 12px', borderTop: '1px solid #1a1a1a' }}>
                    {thread.messages.map(msg => renderMessage(msg))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══ TEAM TAB ═══ */}
      {activeTab === 'preferences' && (
        <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#ccc', marginBottom: '4px' }}>
            Your Engineering Team
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '12px', lineHeight: '1.5' }}>
            These bots discuss code autonomously as they work. Toggle who participates in user-initiated discussions.
          </div>

          {bots.map(bot => {
            const spec = BOT_SPECIALIZATIONS[bot.specialization]
            const isSelected = selectedBots.has(bot.id)
            const color = BOT_COLORS[bot.specialization] || '#888'
            return (
              <div key={bot.id} onClick={() => toggleBot(bot.id)} style={{
                padding: '12px', marginBottom: '6px', cursor: 'pointer',
                background: isSelected ? `${color}08` : '#141414',
                borderRadius: '8px',
                border: `1px solid ${isSelected ? color + '30' : '#1a1a1a'}`,
                transition: 'all 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: `${color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px',
                  }}>{spec?.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? color : '#888' }}>
                      {bot.role?.title || spec?.name}
                    </div>
                    <div style={{ fontSize: '10px', color: '#555' }}>
                      {bot.role?.behaviorMode} &middot; {bot.role?.responseStyle} &middot; {bot.status}
                    </div>
                  </div>
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '4px',
                    border: `2px solid ${isSelected ? color : '#333'}`,
                    background: isSelected ? color : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSelected && <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>&#10003;</span>}
                  </div>
                </div>
                {isSelected && bot.role && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #1a1a1a' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {bot.role.focusAreas.map((area, i) => (
                        <span key={i} style={{
                          padding: '2px 6px', background: `${color}10`, borderRadius: '3px',
                          fontSize: '9px', color,
                        }}>{area}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Quick starters */}
          <div style={{ marginTop: '16px', fontSize: '12px', fontWeight: 600, color: '#ccc', marginBottom: '8px' }}>
            Quick Discussion Starters
          </div>
          {DISCUSSION_PROMPTS.map((p, i) => (
            <button key={i} onClick={() => { setActiveTab('team'); handlePromptSelect(p.topic) }} style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '10px 12px', marginBottom: '4px',
              background: '#141414', border: '1px solid #1a1a1a',
              borderRadius: '6px', cursor: 'pointer', color: '#ccc', fontSize: '11px',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF00FF33' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a1a' }}
            >
              <div style={{ fontWeight: 500 }}>{p.label}</div>
              <div style={{ fontSize: '10px', color: '#555' }}>{p.topic.substring(0, 80)}</div>
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}
