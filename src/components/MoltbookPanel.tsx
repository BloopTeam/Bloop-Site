/**
 * Team Discussion Panel (formerly Moltbook)
 * 
 * Real-time team room where OpenClaw bots/agents discuss code,
 * strategize approaches, and adapt to user preferences.
 * Think of it as the engineering team's Slack channel.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  Users, MessageSquare, Send, RefreshCw,
  Search, Bot, Loader2, Zap, Settings,
  ChevronDown, ChevronRight, Lightbulb, Code,
  Shield, Bug, FileText, Wrench, TestTube, Gauge,
  Target, Sparkles, X, Hash, AtSign, Plus
} from 'lucide-react'
import { botTeamService, BOT_SPECIALIZATIONS, type TeamBot, type BotSpecialization } from '../services/botTeam'
import { type RoleAllocation } from '../types/roles'

// ─── Types ───────────────────────────────────────────────────────────────────

interface TeamMessage {
  id: string
  botId: string | 'user' | 'system'
  botName: string
  botAvatar: string
  botColor: string
  botSpecialization?: string
  content: string
  type: 'discussion' | 'analysis' | 'suggestion' | 'decision' | 'question' | 'system' | 'preference'
  replyTo?: string
  timestamp: number
  codeSnippets?: { language: string; code: string; file?: string }[]
  reactions?: Record<string, string[]>  // emoji -> botIds
}

interface TeamThread {
  id: string
  topic: string
  startedBy: string
  messages: TeamMessage[]
  status: 'active' | 'resolved' | 'archived'
  createdAt: number
}

interface MoltbookPanelProps {
  readonly onClose?: () => void
  readonly onInstallSkill?: (skillMd: string, name: string) => void
  readonly onCreateFile?: (name: string, content: string, language?: string) => void
}

// ─── Bot icon mapping ────────────────────────────────────────────────────────

const BOT_ICONS: Record<string, React.ReactNode> = {
  'code-reviewer': <Code size={14} />,
  'test-engineer': <TestTube size={14} />,
  'security-auditor': <Shield size={14} />,
  'docs-writer': <FileText size={14} />,
  'optimizer': <Gauge size={14} />,
  'debugger': <Bug size={14} />,
  'architect': <Wrench size={14} />,
}

const BOT_COLORS: Record<string, string> = {
  'code-reviewer': '#3b82f6',
  'test-engineer': '#22c55e',
  'security-auditor': '#ef4444',
  'docs-writer': '#f59e0b',
  'optimizer': '#06b6d4',
  'debugger': '#a855f7',
  'architect': '#ec4899',
}

// ─── Discussion prompt templates ─────────────────────────────────────────────

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
  const [thinkingBots, setThinkingBots] = useState<string[]>([])
  const [expandedThread, setExpandedThread] = useState<string | null>(null)
  const [showPrompts, setShowPrompts] = useState(false)
  const [selectedBots, setSelectedBots] = useState<Set<string>>(new Set())

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load bots from botTeamService
  useEffect(() => {
    const loadBots = () => {
      const teamBots = botTeamService.getBots()
      setBots(teamBots)
      // Auto-select all active bots
      setSelectedBots(new Set(teamBots.filter(b => b.status === 'active' || b.status === 'idle').map(b => b.id)))
    }
    loadBots()
    const interval = setInterval(loadBots, 5000)
    return () => clearInterval(interval)
  }, [])

  // Load saved messages from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bloop-team-messages')
      if (saved) setMessages(JSON.parse(saved))
      const savedThreads = localStorage.getItem('bloop-team-threads')
      if (savedThreads) setThreads(JSON.parse(savedThreads))
    } catch { /* ignore */ }
  }, [])

  // Save messages on change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('bloop-team-messages', JSON.stringify(messages.slice(-200)))
    }
  }, [messages])

  useEffect(() => {
    if (threads.length > 0) {
      localStorage.setItem('bloop-team-threads', JSON.stringify(threads.slice(-50)))
    }
  }, [threads])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinkingBots])

  // Add a welcome message if no messages exist
  useEffect(() => {
    if (messages.length === 0 && bots.length > 0) {
      const welcomeMsg: TeamMessage = {
        id: 'welcome',
        botId: 'system',
        botName: 'Team',
        botAvatar: '',
        botColor: '#FF00FF',
        content: `Your engineering team is online. ${bots.length} bot${bots.length !== 1 ? 's' : ''} ready. Ask a question, start a discussion, or pick a topic below.`,
        type: 'system',
        timestamp: Date.now(),
      }
      setMessages([welcomeMsg])
    }
  }, [bots.length])

  // ─── Generate bot discussion responses ─────────────────────────────────

  const generateBotResponse = useCallback(async (
    bot: TeamBot,
    topic: string,
    previousMessages: TeamMessage[],
    isFollowUp = false
  ): Promise<TeamMessage> => {
    const spec = BOT_SPECIALIZATIONS[bot.specialization]
    const role = bot.role

    // Build context from recent messages
    const recentContext = previousMessages.slice(-8).map(m => 
      `${m.botName}: ${m.content.substring(0, 300)}`
    ).join('\n')

    // Build the prompt based on the bot's role
    const systemPrompt = `You are ${spec.name} (${role.title}) on an engineering team inside the Bloop IDE. 
Your focus areas: ${role.focusAreas.join(', ')}.
Behavior mode: ${role.behaviorMode}. Response style: ${role.responseStyle}.
Languages: ${role.languages.join(', ')}. Frameworks: ${role.frameworks.join(', ')}.
${role.customDirective ? `Custom directive: ${role.customDirective}` : ''}

You're in a team discussion. Be ${role.responseStyle === 'concise' ? 'brief and to the point' : role.responseStyle === 'tutorial' ? 'educational and thorough' : 'clear and detailed'}.
Speak naturally as a team member. Use "I think", "From my analysis", "In my experience".
${isFollowUp ? 'Build on what others have said. Agree, disagree, or add a different angle. Reference specific points from teammates.' : 'Give your perspective on the topic. Be specific and actionable.'}
If relevant, include short code examples using \`\`\`language blocks.
Keep responses under 200 words — this is a conversation, not a report.`

    const userMessage = isFollowUp 
      ? `Team discussion so far:\n${recentContext}\n\nThe topic: "${topic}"\n\nGive your follow-up perspective as ${spec.name}. What would you add, challenge, or build on?`
      : `Topic for team discussion: "${topic}"\n\nGive your initial perspective as ${spec.name}. What's your take on this?`

    try {
      const response = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.8,
          maxTokens: 500,
          role: bot.role,
        })
      })

      const result = await response.json()
      const content = result.content || result.choices?.[0]?.message?.content || 'I need more context to contribute here.'

      // Extract code snippets from response
      const codeSnippets: { language: string; code: string; file?: string }[] = []
      const codeRegex = /```(\w*)\n([\s\S]*?)```/g
      let match
      while ((match = codeRegex.exec(content)) !== null) {
        codeSnippets.push({ language: match[1] || 'text', code: match[2].trim() })
      }

      return {
        id: `msg-${Date.now()}-${bot.id}-${Math.random().toString(36).substring(2, 7)}`,
        botId: bot.id,
        botName: spec.name,
        botAvatar: spec.avatar,
        botColor: BOT_COLORS[bot.specialization] || '#888',
        botSpecialization: bot.specialization,
        content: content.replace(/```\w*\n[\s\S]*?```/g, '').trim() || content,
        type: isFollowUp ? 'discussion' : 'analysis',
        timestamp: Date.now(),
        codeSnippets: codeSnippets.length > 0 ? codeSnippets : undefined,
      }
    } catch {
      return {
        id: `msg-${Date.now()}-${bot.id}`,
        botId: bot.id,
        botName: spec.name,
        botAvatar: spec.avatar,
        botColor: BOT_COLORS[bot.specialization] || '#888',
        botSpecialization: bot.specialization,
        content: `I'm having trouble connecting right now. My ${role.focusAreas[0]?.toLowerCase() || 'analysis'} perspective: this is worth investigating further.`,
        type: 'discussion',
        timestamp: Date.now(),
      }
    }
  }, [])

  // ─── Start a team discussion ───────────────────────────────────────────

  const startDiscussion = useCallback(async (topic: string) => {
    const activeBots = bots.filter(b => selectedBots.has(b.id))
    if (activeBots.length === 0) return

    // Add user message
    const userMsg: TeamMessage = {
      id: `msg-user-${Date.now()}`,
      botId: 'user',
      botName: 'You',
      botAvatar: '',
      botColor: '#FF00FF',
      content: topic,
      type: 'question',
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, userMsg])
    setIsThinking(true)

    // Create a thread
    const thread: TeamThread = {
      id: `thread-${Date.now()}`,
      topic,
      startedBy: 'user',
      messages: [userMsg],
      status: 'active',
      createdAt: Date.now(),
    }

    const allNewMessages: TeamMessage[] = []

    // First round — each bot gives their initial take (staggered)
    for (const bot of activeBots) {
      setThinkingBots(prev => [...prev, bot.id])

      const response = await generateBotResponse(bot, topic, [userMsg, ...allNewMessages])
      allNewMessages.push(response)

      setMessages(prev => [...prev, response])
      setThinkingBots(prev => prev.filter(id => id !== bot.id))

      // Small delay between responses for natural feel
      await new Promise(r => setTimeout(r, 300))
    }

    // Second round — bots respond to each other (if 2+ bots)
    if (activeBots.length >= 2) {
      // Pick 1-2 bots to do follow-ups
      const followUpBots = activeBots.slice(0, Math.min(2, activeBots.length))
      
      for (const bot of followUpBots) {
        setThinkingBots(prev => [...prev, bot.id])
        
        const followUp = await generateBotResponse(bot, topic, [userMsg, ...allNewMessages], true)
        allNewMessages.push(followUp)

        setMessages(prev => [...prev, followUp])
        setThinkingBots(prev => prev.filter(id => id !== bot.id))

        await new Promise(r => setTimeout(r, 300))
      }
    }

    // Update thread
    thread.messages = [userMsg, ...allNewMessages]
    setThreads(prev => [thread, ...prev])
    setIsThinking(false)
  }, [bots, selectedBots, generateBotResponse])

  // ─── Handle user input ─────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const text = userInput.trim()
    if (!text || isThinking) return
    setUserInput('')
    await startDiscussion(text)
  }, [userInput, isThinking, startDiscussion])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handlePromptSelect = useCallback((topic: string) => {
    setShowPrompts(false)
    startDiscussion(topic)
  }, [startDiscussion])

  const toggleBotSelection = useCallback((botId: string) => {
    setSelectedBots(prev => {
      const next = new Set(prev)
      if (next.has(botId)) next.delete(botId)
      else next.add(botId)
      return next
    })
  }, [])

  const clearChat = useCallback(() => {
    setMessages([])
    localStorage.removeItem('bloop-team-messages')
  }, [])

  // ─── Render helpers ────────────────────────────────────────────────────

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    const now = new Date()
    const diff = now.getTime() - ts
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const renderMessage = (msg: TeamMessage, idx: number) => {
    const isUser = msg.botId === 'user'
    const isSystem = msg.botId === 'system'

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
        background: isUser ? 'rgba(255,0,255,0.06)' : '#141414',
        borderRadius: '10px',
        borderLeft: `3px solid ${msg.botColor}`,
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
              {msg.botAvatar || BOT_ICONS[msg.botSpecialization || ''] || <Bot size={12} />}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: isUser ? '#FF00FF' : msg.botColor }}>
              {msg.botName}
            </span>
            {msg.botSpecialization && (
              <span style={{ fontSize: '10px', color: '#555', marginLeft: '6px' }}>
                {msg.type === 'analysis' ? 'initial take' : msg.type === 'suggestion' ? 'suggestion' : ''}
              </span>
            )}
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

        {/* Code snippets */}
        {msg.codeSnippets && msg.codeSnippets.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            {msg.codeSnippets.map((snippet, i) => (
              <div key={i} style={{
                background: '#0a0a0a', borderRadius: '6px', padding: '10px 12px',
                marginTop: '6px', border: '1px solid #1a1a1a',
                fontFamily: "'Fira Code', monospace", fontSize: '11px',
                color: '#d4d4d4', whiteSpace: 'pre-wrap', overflow: 'auto',
                maxHeight: '200px',
              }}>
                {snippet.file && (
                  <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px' }}>
                    {snippet.file}
                  </div>
                )}
                {snippet.code}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─── Main render ───────────────────────────────────────────────────────

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
          <span style={{
            padding: '2px 8px', background: '#22c55e15', borderRadius: '10px',
            fontSize: '10px', color: '#22c55e', border: '1px solid #22c55e25',
          }}>
            {bots.filter(b => selectedBots.has(b.id)).length} active
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

      {/* Tab bar */}
      <div style={{
        display: 'flex', borderBottom: '1px solid #2a2a2a',
        padding: '0 12px',
      }}>
        {([
          { id: 'team' as const, label: 'Chat', icon: <MessageSquare size={12} /> },
          { id: 'threads' as const, label: 'Threads', icon: <Hash size={12} /> },
          { id: 'preferences' as const, label: 'Preferences', icon: <Settings size={12} /> },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 14px', fontSize: '11px', cursor: 'pointer',
              background: 'transparent', border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #FF00FF' : '2px solid transparent',
              color: activeTab === tab.id ? '#FF00FF' : '#666',
              display: 'flex', alignItems: 'center', gap: '4px',
              transition: 'all 0.15s',
            }}
          >
            {tab.icon} {tab.label}
            {tab.id === 'threads' && threads.length > 0 && (
              <span style={{
                fontSize: '9px', background: '#FF00FF20', color: '#FF00FF',
                padding: '1px 5px', borderRadius: '8px', marginLeft: '2px',
              }}>{threads.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Bot selector bar */}
      <div style={{
        padding: '8px 12px', borderBottom: '1px solid #1a1a1a',
        display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center',
      }}>
        <span style={{ fontSize: '10px', color: '#555', marginRight: '4px' }}>In room:</span>
        {bots.map(bot => {
          const spec = BOT_SPECIALIZATIONS[bot.specialization]
          const isSelected = selectedBots.has(bot.id)
          return (
            <button
              key={bot.id}
              onClick={() => toggleBotSelection(bot.id)}
              title={`${spec?.name || bot.name} — click to ${isSelected ? 'remove from' : 'add to'} discussion`}
              style={{
                padding: '3px 8px', fontSize: '10px', cursor: 'pointer',
                background: isSelected ? `${BOT_COLORS[bot.specialization] || '#888'}15` : 'transparent',
                border: `1px solid ${isSelected ? (BOT_COLORS[bot.specialization] || '#888') + '40' : '#333'}`,
                borderRadius: '12px',
                color: isSelected ? (BOT_COLORS[bot.specialization] || '#888') : '#555',
                display: 'flex', alignItems: 'center', gap: '4px',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '12px' }}>{spec?.avatar || '?'}</span>
              {spec?.name || bot.name}
            </button>
          )
        })}
        {bots.length === 0 && (
          <span style={{ fontSize: '10px', color: '#555', fontStyle: 'italic' }}>
            No bots configured — add bots in the OpenClaw panel
          </span>
        )}
      </div>

      {/* ─── Tab Content ─────────────────────────────────────────────── */}

      {activeTab === 'team' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Messages area */}
          <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
            {messages.map((msg, idx) => renderMessage(msg, idx))}

            {/* Thinking indicators */}
            {thinkingBots.map(botId => {
              const bot = bots.find(b => b.id === botId)
              if (!bot) return null
              const spec = BOT_SPECIALIZATIONS[bot.specialization]
              return (
                <div key={`thinking-${botId}`} style={{
                  padding: '10px 16px', margin: '6px 0',
                  background: '#141414', borderRadius: '10px',
                  borderLeft: `3px solid ${BOT_COLORS[bot.specialization] || '#888'}`,
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: `${BOT_COLORS[bot.specialization] || '#888'}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px',
                  }}>
                    {spec?.avatar || '?'}
                  </div>
                  <span style={{ fontSize: '12px', color: BOT_COLORS[bot.specialization] || '#888', fontWeight: 500 }}>
                    {spec?.name || 'Bot'}
                  </span>
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: '4px', height: '4px', borderRadius: '50%',
                        background: BOT_COLORS[bot.specialization] || '#888',
                        animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                        opacity: 0.6,
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '10px', color: '#555' }}>thinking...</span>
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
              {DISCUSSION_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handlePromptSelect(prompt.topic)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '8px 10px', marginBottom: '4px',
                    background: '#1a1a1a', border: '1px solid #2a2a2a',
                    borderRadius: '6px', cursor: 'pointer',
                    color: '#ccc', fontSize: '11px',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#222'
                    e.currentTarget.style.borderColor = '#FF00FF33'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#1a1a1a'
                    e.currentTarget.style.borderColor = '#2a2a2a'
                  }}
                >
                  <div style={{ fontWeight: 500, marginBottom: '2px' }}>{prompt.label}</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>{prompt.topic.substring(0, 80)}...</div>
                </button>
              ))}
            </div>
          )}

          {/* Input area */}
          <div style={{
            padding: '12px', borderTop: '1px solid #2a2a2a',
            background: '#1a1a1a',
          }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <button
                onClick={() => setShowPrompts(!showPrompts)}
                title="Discussion topics"
                style={{
                  padding: '6px', background: showPrompts ? '#FF00FF15' : 'transparent',
                  border: `1px solid ${showPrompts ? '#FF00FF33' : '#333'}`,
                  borderRadius: '6px', cursor: 'pointer',
                  color: showPrompts ? '#FF00FF' : '#666',
                  flexShrink: 0,
                }}
              >
                <Lightbulb size={14} />
              </button>
              <textarea
                ref={inputRef}
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isThinking ? 'Team is discussing...' : 'Ask your team something...'}
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
              <button
                onClick={handleSend}
                disabled={!userInput.trim() || isThinking}
                style={{
                  padding: '8px', background: userInput.trim() && !isThinking ? '#FF00FF' : '#333',
                  border: 'none', borderRadius: '8px', cursor: userInput.trim() && !isThinking ? 'pointer' : 'default',
                  color: '#fff', flexShrink: 0,
                  transition: 'background 0.15s',
                }}
              >
                {isThinking ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <span style={{ fontSize: '10px', color: '#444' }}>
                {selectedBots.size} bot{selectedBots.size !== 1 ? 's' : ''} will respond
              </span>
              <span style={{ fontSize: '10px', color: '#444' }}>
                Shift+Enter for new line
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Threads Tab ─────────────────────────────────────────────── */}

      {activeTab === 'threads' && (
        <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
          {threads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#555' }}>
              <Hash size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <div style={{ fontSize: '13px', marginBottom: '4px' }}>No threads yet</div>
              <div style={{ fontSize: '11px', color: '#444' }}>
                Start a discussion in the Chat tab to create threads
              </div>
            </div>
          ) : (
            threads.map(thread => (
              <div key={thread.id} style={{
                marginBottom: '8px', background: '#141414', borderRadius: '8px',
                border: '1px solid #1a1a1a', overflow: 'hidden',
              }}>
                <button
                  onClick={() => setExpandedThread(expandedThread === thread.id ? null : thread.id)}
                  style={{
                    width: '100%', padding: '12px', background: 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    color: '#ccc',
                  }}
                >
                  {expandedThread === thread.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '2px' }}>
                      {thread.topic.substring(0, 60)}{thread.topic.length > 60 ? '...' : ''}
                    </div>
                    <div style={{ fontSize: '10px', color: '#555' }}>
                      {thread.messages.length} messages &middot; {formatTime(thread.createdAt)}
                    </div>
                  </div>
                  <span style={{
                    padding: '2px 6px', fontSize: '9px', borderRadius: '4px',
                    background: thread.status === 'active' ? '#22c55e15' : '#555',
                    color: thread.status === 'active' ? '#22c55e' : '#888',
                  }}>
                    {thread.status}
                  </span>
                </button>

                {expandedThread === thread.id && (
                  <div style={{ padding: '0 12px 12px', borderTop: '1px solid #1a1a1a' }}>
                    {thread.messages.map((msg, idx) => renderMessage(msg, idx))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Preferences Tab ─────────────────────────────────────────── */}

      {activeTab === 'preferences' && (
        <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#ccc', marginBottom: '8px' }}>
              Team Composition
            </div>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px', lineHeight: '1.5' }}>
              Select which bots participate in team discussions. Each brings their specialized perspective.
            </div>

            {bots.map(bot => {
              const spec = BOT_SPECIALIZATIONS[bot.specialization]
              const isSelected = selectedBots.has(bot.id)
              return (
                <div key={bot.id} style={{
                  padding: '12px', marginBottom: '6px',
                  background: isSelected ? `${BOT_COLORS[bot.specialization]}08` : '#141414',
                  borderRadius: '8px',
                  border: `1px solid ${isSelected ? BOT_COLORS[bot.specialization] + '30' : '#1a1a1a'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onClick={() => toggleBotSelection(bot.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: `${BOT_COLORS[bot.specialization]}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px',
                    }}>
                      {spec?.avatar || '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '12px', fontWeight: 600,
                        color: isSelected ? BOT_COLORS[bot.specialization] : '#888',
                      }}>
                        {bot.role?.title || spec?.name || bot.name}
                      </div>
                      <div style={{ fontSize: '10px', color: '#555' }}>
                        {bot.role?.behaviorMode} &middot; {bot.role?.responseStyle} &middot; {bot.role?.outputFormat}
                      </div>
                    </div>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '4px',
                      border: `2px solid ${isSelected ? BOT_COLORS[bot.specialization] : '#333'}`,
                      background: isSelected ? BOT_COLORS[bot.specialization] : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>
                      {isSelected && <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>&#10003;</span>}
                    </div>
                  </div>
                  {isSelected && bot.role && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #1a1a1a' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {bot.role.focusAreas.map((area, i) => (
                          <span key={i} style={{
                            padding: '2px 6px', background: `${BOT_COLORS[bot.specialization]}10`,
                            borderRadius: '3px', fontSize: '9px',
                            color: BOT_COLORS[bot.specialization],
                          }}>{area}</span>
                        ))}
                      </div>
                      {bot.role.languages.length > 0 && (
                        <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>
                          Languages: {bot.role.languages.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#ccc', marginBottom: '8px' }}>
              Quick Discussions
            </div>
            {DISCUSSION_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => { setActiveTab('team'); handlePromptSelect(prompt.topic) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 12px', marginBottom: '4px',
                  background: '#141414', border: '1px solid #1a1a1a',
                  borderRadius: '6px', cursor: 'pointer', color: '#ccc',
                  fontSize: '11px', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF00FF33' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a1a' }}
              >
                <div style={{ fontWeight: 500, marginBottom: '2px' }}>{prompt.label}</div>
                <div style={{ fontSize: '10px', color: '#555' }}>{prompt.topic.substring(0, 100)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}
