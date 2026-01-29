import { useState, useRef, useEffect } from 'react'
import { 
  ChevronDown, AtSign, Image as ImageIcon, Mic, Send, 
  Copy, Check, RefreshCw, Code, Sparkles,
  MessageSquare, FileCode, FolderOpen, Hash, ThumbsUp, ThumbsDown, ChevronUp, Loader2
} from 'lucide-react'
import Logo from './Logo'
import { apiService, type ModelInfo } from '../services/api'

interface AssistantPanelProps {
  onCollapse: () => void
  width?: number
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  attachments?: string[]
  codeBlocks?: { language: string; code: string }[]
  reactions?: { emoji: string; count: number }[]
  collapsed?: boolean
}

type AgentMode = 'agent' | 'chat' | 'edit'
type ModelType = 'auto' | string // Can be any model ID from backend

// Default models if backend is unavailable
const DEFAULT_MODELS: { id: ModelType; name: string; description: string; provider: string }[] = [
  { id: 'auto', name: 'Auto', description: 'Automatically selects the best model', provider: 'auto' },
  { id: 'kimi-k2.5', name: 'Kimi K2.5', description: '1T param multimodal (256K context)', provider: 'moonshot' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'High quality, safety-focused', provider: 'anthropic' },
  { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', description: 'Versatile, well-tested', provider: 'openai' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Massive 1M context', provider: 'google' },
  { id: 'deepseek-chat', name: 'DeepSeek', description: 'Code-focused, ultra-fast', provider: 'deepseek' },
  { id: 'mistral-large-latest', name: 'Mistral Large', description: 'Creativity + code balance', provider: 'mistral' },
  { id: 'grok-beta', name: 'Grok (xAI)', description: 'Fast, creative', provider: 'xai' },
]

const AGENT_MODES: { id: AgentMode; name: string; icon: React.ReactNode; description: string }[] = [
  { id: 'agent', name: 'Agent', icon: <Sparkles size={14} />, description: 'Autonomous coding agent' },
  { id: 'chat', name: 'Chat', icon: <MessageSquare size={14} />, description: 'Conversational assistant' },
  { id: 'edit', name: 'Edit', icon: <Code size={14} />, description: 'Quick code edits' },
]

const CONTEXT_ITEMS = [
  { type: 'file', name: 'App.tsx', path: 'src/components/App.tsx', icon: <FileCode size={14} /> },
  { type: 'file', name: 'Header.tsx', path: 'src/components/Header.tsx', icon: <FileCode size={14} /> },
  { type: 'file', name: 'styles.css', path: 'src/styles.css', icon: <FileCode size={14} /> },
  { type: 'folder', name: 'components', path: 'src/components', icon: <FolderOpen size={14} /> },
  { type: 'symbol', name: 'handleSubmit', path: 'App.tsx:42', icon: <Hash size={14} /> },
]

const SLASH_COMMANDS = [
  { command: '/edit', description: 'Edit selected code' },
  { command: '/explain', description: 'Explain this code' },
  { command: '/fix', description: 'Fix bugs in selection' },
  { command: '/test', description: 'Generate tests' },
  { command: '/docs', description: 'Generate documentation' },
  { command: '/optimize', description: 'Optimize performance' },
  { command: '/refactor', description: 'Refactor code' },
]

export default function AssistantPanel({ width = 480 }: AssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [agentMode, setAgentMode] = useState<AgentMode>('agent')
  const [model, setModel] = useState<ModelType>('auto')
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([])
  const [modelsLoading, setModelsLoading] = useState(true)
  const [backendConnected, setBackendConnected] = useState(false)
  const [showAgentDropdown, setShowAgentDropdown] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [showCommandMenu, setShowCommandMenu] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [contextFilter, setContextFilter] = useState('')
  const [commandFilter, setCommandFilter] = useState('')
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  const [collapsedMessages, setCollapsedMessages] = useState<Set<string>>(new Set())
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch available models from backend
  useEffect(() => {
    const fetchModels = async () => {
      try {
        setModelsLoading(true)
        const response = await apiService.fetchModels()
        if (response.models.length > 0) {
          setAvailableModels(response.models)
          setBackendConnected(true)
        } else {
          // Use default models if backend unavailable
          setAvailableModels(DEFAULT_MODELS.map(m => ({
            provider: m.provider,
            model: m.id,
            available: false,
            capabilities: {
              supports_vision: false,
              supports_function_calling: true,
              max_context_length: 0,
              supports_streaming: true,
              cost_per_1k_tokens: { input: 0, output: 0 },
              speed: 'medium',
              quality: 'medium'
            }
          })))
        }
      } catch (error) {
        console.error('Failed to fetch models:', error)
        // Use default models on error
        setAvailableModels(DEFAULT_MODELS.map(m => ({
          provider: m.provider,
          model: m.id,
          available: false,
          capabilities: {
            supports_vision: false,
            supports_function_calling: true,
            max_context_length: 0,
            supports_streaming: true,
            cost_per_1k_tokens: { input: 0, output: 0 },
            speed: 'medium',
            quality: 'medium'
          }
        })))
      } finally {
        setModelsLoading(false)
      }
    }

    fetchModels()
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle @ and / triggers
  useEffect(() => {
    if (input.endsWith('@')) {
      setShowContextMenu(true)
      setShowCommandMenu(false)
      setContextFilter('')
    } else if (input.startsWith('/')) {
      setShowCommandMenu(true)
      setShowContextMenu(false)
      setCommandFilter(input.slice(1))
    } else if (!input.includes('@')) {
      setShowContextMenu(false)
    }
    
    if (!input.startsWith('/')) {
      setShowCommandMenu(false)
    }
  }, [input])

  const generateResponse = (userInput: string): string => {
    // Fallback response if backend is unavailable
    if (userInput.toLowerCase().includes('hello') || userInput.toLowerCase().includes('hi')) {
      return "Hello! I'm your AI coding assistant. How can I help you today? You can ask me to:\n\n• Explain code\n• Fix bugs\n• Write new features\n• Optimize performance\n• Generate tests"
    }
    if (userInput.toLowerCase().includes('help')) {
      return "Here's what I can do:\n\n**Commands:**\n• `/edit` - Edit selected code\n• `/explain` - Explain code\n• `/fix` - Fix bugs\n• `/test` - Generate tests\n\n**Context:**\n• Use `@` to reference files\n• Drag & drop images\n• Paste code snippets"
    }
    if (userInput.startsWith('/')) {
      const cmd = userInput.split(' ')[0]
      return `Executing ${cmd}...\n\nI'll analyze the code and provide suggestions based on your request.`
    }
    return "I understand. Let me analyze that and provide a helpful response.\n\n```typescript\n// Here's a code example\nconst result = await processRequest(input);\nconsole.log(result);\n```\n\nWould you like me to explain this further?"
  }

  const handleSend = async () => {
    if (!input.trim() || isTyping) return

    const userInput = input.trim()
    
    // Add to command history
    setCommandHistory(prev => [...prev, userInput])
    setHistoryIndex(-1)

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)
    setShowContextMenu(false)
    setShowCommandMenu(false)

    try {
      // Try to use backend API if available
      if (backendConnected) {
        const response = await apiService.sendChatMessage({
          messages: [
            ...messages.map(m => ({
              role: m.role as 'user' | 'assistant' | 'system',
              content: m.content
            })),
            {
              role: 'user',
              content: userInput
            }
          ],
          model: model === 'auto' ? undefined : model,
          temperature: 0.7,
          maxTokens: 4000
        })

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.content || 'No response received',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        // Fallback to simulated response
        const typingDelay = 800 + Math.random() * 1200
        setTimeout(() => {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: generateResponse(userInput),
            timestamp: new Date()
          }
          setMessages(prev => [...prev, assistantMessage])
          setIsTyping(false)
        }, typingDelay)
        return
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Fallback to simulated response on error
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'm having trouble connecting to the backend. ${generateResponse(userInput)}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    } else if (e.key === 'ArrowUp' && !showContextMenu && !showCommandMenu) {
      e.preventDefault()
      if (commandHistory.length > 0 && input === '') {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '')
      }
    } else if (e.key === 'ArrowDown' && !showContextMenu && !showCommandMenu) {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '')
      } else {
        setHistoryIndex(-1)
        setInput('')
      }
    } else if (e.key === 'Escape') {
      setShowContextMenu(false)
      setShowCommandMenu(false)
      setShowAgentDropdown(false)
      setShowModelDropdown(false)
    }
  }

  const selectContext = (item: typeof CONTEXT_ITEMS[0]) => {
    setInput(prev => prev.replace(/@$/, `@${item.name} `))
    setShowContextMenu(false)
    inputRef.current?.focus()
  }

  const selectCommand = (cmd: typeof SLASH_COMMANDS[0]) => {
    setInput(cmd.command + ' ')
    setShowCommandMenu(false)
    inputRef.current?.focus()
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const regenerateResponse = (messageId: string) => {
    const msgIndex = messages.findIndex(m => m.id === messageId)
    if (msgIndex > 0) {
      const userMsg = messages[msgIndex - 1]
      if (userMsg.role === 'user') {
        setMessages(prev => prev.slice(0, msgIndex))
        setIsTyping(true)
        setTimeout(() => {
          const newResponse: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: generateResponse(userMsg.content) + "\n\n*(regenerated)*",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, newResponse])
          setIsTyping(false)
        }, 1000)
      }
    }
  }

  const handleVoiceInput = () => {
    setIsRecording(!isRecording)
    if (!isRecording) {
      // Simulate voice recording
      setTimeout(() => {
        setIsRecording(false)
        setInput(prev => prev + "How do I fix this bug?")
      }, 2000)
    }
  }

  const handleImageUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setInput(prev => prev + ` [Attached: ${file.name}]`)
    }
  }

  const filteredContextItems = CONTEXT_ITEMS.filter(item =>
    item.name.toLowerCase().includes(contextFilter.toLowerCase())
  )

  const filteredCommands = SLASH_COMMANDS.filter(cmd =>
    cmd.command.toLowerCase().includes(commandFilter.toLowerCase()) ||
    cmd.description.toLowerCase().includes(cmd.description.toLowerCase())
  )

  const currentAgent = AGENT_MODES.find(m => m.id === agentMode)!
  
  // Get current model info from available models or defaults
  const currentModelInfo = availableModels.find(m => m.model === model) || 
    DEFAULT_MODELS.find(m => m.id === model)
  const currentModel = currentModelInfo ? {
    id: currentModelInfo.model,
    name: currentModelInfo.provider === 'auto' ? 'Auto' : 
          currentModelInfo.provider.charAt(0).toUpperCase() + currentModelInfo.provider.slice(1),
    description: currentModelInfo.available 
      ? `${currentModelInfo.capabilities.max_context_length.toLocaleString()} context, ${currentModelInfo.capabilities.speed} speed`
      : 'Not configured',
    provider: currentModelInfo.provider
  } : { id: 'auto', name: 'Auto', description: 'Auto-select best model', provider: 'auto' }
  
  // Get list of models for dropdown (available + auto)
  const modelsList = [
    { id: 'auto', name: 'Auto', description: 'Automatically selects the best model', provider: 'auto', available: true },
    ...availableModels.filter(m => m.available).map(m => ({
      id: m.model,
      name: m.provider.charAt(0).toUpperCase() + m.provider.slice(1),
      description: `${m.capabilities.max_context_length.toLocaleString()} context${m.capabilities.supports_vision ? ', vision' : ''}`,
      provider: m.provider,
      available: m.available
    }))
  ]

  const renderMessageContent = (content: string) => {
    // Simple markdown-like rendering
    const parts = content.split(/(```[\s\S]*?```)/g)
    
    return parts.map((part, idx) => {
      if (part.startsWith('```')) {
        const match = part.match(/```(\w*)\n?([\s\S]*?)```/)
        if (match) {
          const [, lang, code] = match
          return (
            <div key={idx} style={{
              background: '#0a0a0a',
              borderRadius: '6px',
              margin: '8px 0',
              overflow: 'hidden'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px',
                background: '#151515',
                borderBottom: '1px solid #1a1a1a'
              }}>
                <span style={{ fontSize: '11px', color: '#666' }}>{lang || 'code'}</span>
                <button
                  onClick={() => copyToClipboard(code.trim(), `code-${idx}`)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: copiedId === `code-${idx}` ? '#22c55e' : '#666',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px'
                  }}
                >
                  {copiedId === `code-${idx}` ? <Check size={12} /> : <Copy size={12} />}
                  {copiedId === `code-${idx}` ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre style={{
                margin: 0,
                padding: '12px',
                fontSize: '12px',
                fontFamily: "'Fira Code', monospace",
                color: '#ccc',
                overflowX: 'auto'
              }}>
                {code.trim()}
              </pre>
            </div>
          )
        }
      }
      
      // Bold text
      const formatted = part.split(/(\*\*[\s\S]*?\*\*)/g).map((text, i) => {
        if (text.startsWith('**') && text.endsWith('**')) {
          return <strong key={i} style={{ color: '#fff' }}>{text.slice(2, -2)}</strong>
        }
        // Bullet points
        return text.split('\n').map((line, j) => {
          if (line.startsWith('• ')) {
            return <div key={j} style={{ paddingLeft: '12px' }}>{line}</div>
          }
          return <span key={j}>{line}{j < text.split('\n').length - 1 && <br />}</span>
        })
      })
      
      return <span key={idx}>{formatted}</span>
    })
  }

  return (
    <div style={{
      width: `${width}px`,
      minWidth: '300px',
      maxWidth: '800px',
      background: '#0a0a0a',
      borderLeft: '1px solid #1a1a1a',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      flexShrink: 0,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          flex: 1,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {messages.length === 0 && (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#555',
              textAlign: 'center',
              padding: '40px'
            }}>
              <Logo size={32} variant="icon" />
              <div style={{ fontSize: '14px', marginBottom: '8px', color: '#888' }}>
                How can I help you?
              </div>
              <div style={{ fontSize: '12px', lineHeight: 1.6 }}>
                Try typing <code style={{ 
                  background: '#1a1a1a', 
                  padding: '2px 6px', 
                  borderRadius: '4px',
                  color: '#FF00FF'
                }}>@</code> to add context or <code style={{ 
                  background: '#1a1a1a', 
                  padding: '2px 6px', 
                  borderRadius: '4px',
                  color: '#FF00FF'
                }}>/</code> for commands
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const isCollapsed = collapsedMessages.has(msg.id)
            const isLongMessage = msg.content.length > 500
            const shouldShowCollapse = isLongMessage && msg.role === 'assistant'
            
            return (
            <div
              key={msg.id}
              onMouseEnter={() => setHoveredMessageId(msg.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
              style={{
                padding: '12px',
                background: msg.role === 'assistant' ? '#141414' : 'transparent',
                borderRadius: '8px',
                color: '#cccccc',
                fontSize: '13px',
                lineHeight: '1.6',
                position: 'relative',
                transition: 'all 0.2s'
              }}
            >
              {/* Role indicator with timestamp */}
              <div style={{
                fontSize: '11px',
                color: msg.role === 'assistant' ? '#FF00FF' : '#666',
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {msg.role === 'assistant' ? (
                    <>
                      <Logo size={12} variant="icon" />
                      <span>Assistant</span>
                    </>
                  ) : (
                    <span>You</span>
                  )}
                </div>
                {hoveredMessageId === msg.id && (
                  <span style={{ fontSize: '10px', color: '#666' }}>
                    {msg.timestamp.toLocaleTimeString()}
                  </span>
                )}
              </div>
              
              {/* Message content */}
              <div style={{ 
                maxHeight: isCollapsed ? '200px' : 'none',
                overflow: isCollapsed ? 'hidden' : 'visible',
                transition: 'max-height 0.3s'
              }}>
                {renderMessageContent(msg.content)}
              </div>
              
              {/* Collapse button for long messages */}
              {shouldShowCollapse && (
                <button
                  onClick={() => {
                    const newCollapsed = new Set(collapsedMessages)
                    if (newCollapsed.has(msg.id)) {
                      newCollapsed.delete(msg.id)
                    } else {
                      newCollapsed.add(msg.id)
                    }
                    setCollapsedMessages(newCollapsed)
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#666',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    marginTop: '8px',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'color 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#FF00FF'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
                >
                  {isCollapsed ? (
                    <>
                      <ChevronDown size={12} />
                      Show more
                    </>
                  ) : (
                    <>
                      <ChevronUp size={12} />
                      Show less
                    </>
                  )}
                </button>
              )}
              
              {/* Assistant message actions */}
              {msg.role === 'assistant' && (
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '12px',
                  paddingTop: '8px',
                  borderTop: '1px solid #1a1a1a',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Reactions */}
                    <button
                      onClick={() => {
                        // Toggle reaction
                        const reactions = msg.reactions || []
                        const thumbsUpIndex = reactions.findIndex(r => r.emoji === '👍')
                        if (thumbsUpIndex >= 0) {
                          reactions[thumbsUpIndex].count--
                          if (reactions[thumbsUpIndex].count === 0) {
                            reactions.splice(thumbsUpIndex, 1)
                          }
                        } else {
                          reactions.push({ emoji: '👍', count: 1 })
                        }
                        setMessages(prev => prev.map(m => 
                          m.id === msg.id ? { ...m, reactions } : m
                        ))
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#555',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        borderRadius: '4px',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                        e.currentTarget.style.color = '#FF00FF'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = '#555'
                      }}
                      title="Like"
                    >
                      <ThumbsUp size={14} />
                      {msg.reactions?.find(r => r.emoji === '👍')?.count || 0}
                    </button>
                    
                    <button
                      onClick={() => {
                        const reactions = msg.reactions || []
                        const thumbsDownIndex = reactions.findIndex(r => r.emoji === '👎')
                        if (thumbsDownIndex >= 0) {
                          reactions[thumbsDownIndex].count--
                          if (reactions[thumbsDownIndex].count === 0) {
                            reactions.splice(thumbsDownIndex, 1)
                          }
                        } else {
                          reactions.push({ emoji: '👎', count: 1 })
                        }
                        setMessages(prev => prev.map(m => 
                          m.id === msg.id ? { ...m, reactions } : m
                        ))
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#555',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        borderRadius: '4px',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                        e.currentTarget.style.color = '#FF00FF'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = '#555'
                      }}
                      title="Dislike"
                    >
                      <ThumbsDown size={14} />
                      {msg.reactions?.find(r => r.emoji === '👎')?.count || 0}
                    </button>
                    
                    <button
                      onClick={() => copyToClipboard(msg.content, msg.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: copiedId === msg.id ? '#22c55e' : '#555',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        transition: 'all 0.1s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#1a1a1a'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                      {copiedId === msg.id ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={() => regenerateResponse(msg.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#555',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        transition: 'all 0.1s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#1a1a1a'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <RefreshCw size={12} />
                      Regenerate
                    </button>
                  </div>
                </div>
              )}
            </div>
            )
          })}
          
          {isTyping && (
            <div style={{
              padding: '12px',
              background: '#141414',
              borderRadius: '8px',
              color: '#858585',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                display: 'flex',
                gap: '4px'
              }}>
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#FF00FF',
                      animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`
                    }}
                  />
                ))}
              </div>
              <span>Thinking...</span>
              <style>{`
                @keyframes pulse {
                  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
                  40% { opacity: 1; transform: scale(1); }
                }
              `}</style>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div style={{
        borderTop: '1px solid #1a1a1a',
        padding: '12px',
        background: '#0a0a0a',
        position: 'relative'
      }}>
        {/* Context Menu (@) */}
        {showContextMenu && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '12px',
            right: '12px',
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: '8px',
            padding: '4px',
            marginBottom: '8px',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
            maxHeight: '200px',
            overflow: 'auto'
          }}>
            <div style={{ padding: '6px 10px', fontSize: '11px', color: '#666', borderBottom: '1px solid #2a2a2a', marginBottom: '4px' }}>
              Add context
            </div>
            {filteredContextItems.map((item, idx) => (
              <div
                key={idx}
                onClick={() => selectContext(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  transition: 'background 0.1s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,0,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ color: '#666' }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: '13px', color: '#ccc' }}>{item.name}</div>
                  <div style={{ fontSize: '11px', color: '#555' }}>{item.path}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Command Menu (/) */}
        {showCommandMenu && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '12px',
            right: '12px',
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: '8px',
            padding: '4px',
            marginBottom: '8px',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
            maxHeight: '200px',
            overflow: 'auto'
          }}>
            <div style={{ padding: '6px 10px', fontSize: '11px', color: '#666', borderBottom: '1px solid #2a2a2a', marginBottom: '4px' }}>
              Commands
            </div>
            {filteredCommands.map((cmd, idx) => (
              <div
                key={idx}
                onClick={() => selectCommand(cmd)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  transition: 'background 0.1s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,0,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: '13px', color: '#FF00FF', fontFamily: 'monospace' }}>{cmd.command}</span>
                <span style={{ fontSize: '12px', color: '#666' }}>{cmd.description}</span>
              </div>
            ))}
          </div>
        )}

        {/* Input Box */}
        <div style={{
          background: '#141414',
          border: '1px solid #2a2a2a',
          borderRadius: '8px',
          padding: '10px 12px',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Plan, @ for context, / for commands"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#cccccc',
              fontSize: '13px',
              outline: 'none'
            }}
          />
          {input.trim() && (
            <button
              onClick={handleSend}
              disabled={isTyping}
              style={{
                background: '#FF00FF',
                border: 'none',
                color: '#fff',
                cursor: isTyping ? 'not-allowed' : 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                opacity: isTyping ? 0.5 : 1,
                transition: 'opacity 0.15s'
              }}
            >
              <Send size={14} />
            </button>
          )}
        </div>

        {/* Bottom Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Agent & Model Selectors */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            position: 'relative'
          }}>
            {/* Agent Mode Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  setShowAgentDropdown(!showAgentDropdown)
                  setShowModelDropdown(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  background: showAgentDropdown ? 'rgba(255,0,255,0.1)' : 'transparent',
                  border: '1px solid',
                  borderColor: showAgentDropdown ? '#FF00FF' : '#2a2a2a',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  color: showAgentDropdown ? '#FF00FF' : '#888',
                  transition: 'all 0.15s',
                  fontWeight: 500
                }}
                onMouseEnter={(e) => {
                  if (!showAgentDropdown) {
                    e.currentTarget.style.borderColor = '#444'
                    e.currentTarget.style.color = '#aaa'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showAgentDropdown) {
                    e.currentTarget.style.borderColor = '#2a2a2a'
                    e.currentTarget.style.color = '#888'
                  }
                }}
              >
                <Logo size={12} variant="icon" />
                <span>{currentAgent.name}</span>
                <ChevronDown size={10} style={{ 
                  transform: showAgentDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s'
                }} />
              </button>

              {showAgentDropdown && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  background: '#151515',
                  border: '1px solid #2a2a2a',
                  borderRadius: '6px',
                  padding: '2px',
                  marginBottom: '6px',
                  minWidth: '200px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  zIndex: 100
                }}>
                  {AGENT_MODES.map((mode) => (
                    <div
                      key={mode.id}
                      onClick={() => {
                        setAgentMode(mode.id)
                        setShowAgentDropdown(false)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        background: mode.id === agentMode ? 'rgba(255,0,255,0.15)' : 'transparent',
                        borderLeft: mode.id === agentMode ? '2px solid #FF00FF' : '2px solid transparent',
                        marginBottom: '1px'
                      }}
                      onMouseEnter={(e) => {
                        if (mode.id !== agentMode) {
                          e.currentTarget.style.background = 'rgba(255,0,255,0.08)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = mode.id === agentMode ? 'rgba(255,0,255,0.15)' : 'transparent'
                      }}
                    >
                      <span style={{ color: mode.id === agentMode ? '#FF00FF' : '#888' }}>{mode.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontSize: '12px', 
                          color: mode.id === agentMode ? '#FF00FF' : '#ddd',
                          fontWeight: mode.id === agentMode ? 500 : 400
                        }}>
                          {mode.name}
                        </div>
                        <div style={{ fontSize: '10px', color: '#777', marginTop: '2px' }}>
                          {mode.description}
                        </div>
                      </div>
                      {mode.id === agentMode && <Check size={12} style={{ color: '#FF00FF' }} />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Model Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  setShowModelDropdown(!showModelDropdown)
                  setShowAgentDropdown(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#666'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ccc'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
              >
                <span>{currentModel.name}</span>
                {modelsLoading && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                <ChevronDown size={12} />
              </button>

              {showModelDropdown && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '6px',
                  padding: '4px',
                  marginBottom: '4px',
                  minWidth: '250px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
                  zIndex: 100
                }}>
                  {modelsLoading ? (
                    <div style={{ padding: '12px', textAlign: 'center', color: '#666' }}>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: '8px' }} />
                      Loading models...
                    </div>
                  ) : (
                    modelsList.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => {
                          setModel(m.id)
                          setShowModelDropdown(false)
                        }}
                        style={{
                          padding: '8px 10px',
                          cursor: m.available ? 'pointer' : 'not-allowed',
                          borderRadius: '4px',
                          background: m.id === model ? 'rgba(255,0,255,0.1)' : 'transparent',
                          opacity: m.available ? 1 : 0.5
                        }}
                        onMouseEnter={(e) => {
                          if (m.available) {
                            e.currentTarget.style.background = 'rgba(255,0,255,0.1)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = m.id === model ? 'rgba(255,0,255,0.1)' : 'transparent'
                        }}
                      >
                        <div style={{ 
                          fontSize: '12px', 
                          color: m.id === model ? '#FF00FF' : m.available ? '#ccc' : '#666',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          {m.id === model && <Check size={12} />}
                          {m.name}
                          {!m.available && <span style={{ fontSize: '10px', color: '#555' }}>(not configured)</span>}
                        </div>
                        <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>{m.description}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Icons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <button 
              onClick={() => setInput(prev => prev + '@')}
              title="Add context (@)"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.1s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#FF00FF'
                e.currentTarget.style.background = 'rgba(255,0,255,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#666'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <AtSign size={16} />
            </button>
            <button 
              onClick={handleImageUpload}
              title="Upload image"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.1s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#FF00FF'
                e.currentTarget.style.background = 'rgba(255,0,255,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#666'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <ImageIcon size={16} />
            </button>
            <button 
              onClick={handleVoiceInput}
              title={isRecording ? "Stop recording" : "Voice input"}
              style={{
                background: isRecording ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                border: 'none',
                color: isRecording ? '#ef4444' : '#666',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.1s',
                animation: isRecording ? 'pulse 1s infinite' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isRecording) {
                  e.currentTarget.style.color = '#FF00FF'
                  e.currentTarget.style.background = 'rgba(255,0,255,0.1)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isRecording) {
                  e.currentTarget.style.color = '#666'
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <Mic size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
