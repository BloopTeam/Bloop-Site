import { useState, useRef, useEffect } from 'react'
import { 
  ChevronDown, AtSign, Image as ImageIcon, Mic, Send, 
  Copy, Check, RefreshCw, Code, Sparkles,
  MessageSquare, FileCode, FolderOpen, Hash, ThumbsUp, ThumbsDown, ChevronUp, Loader2,
  Plus, X, Trash2, Settings
} from 'lucide-react'
import Logo from './Logo'
import { apiService, type ModelInfo } from '../services/api'
import { useLocalStorage } from '../hooks/useLocalStorage'

// Interface for custom user-defined models
interface CustomModel {
  id: string
  name: string
  provider: string
  apiEndpoint: string
  apiKey?: string // Optional - user may use env vars
  description: string
  maxContextLength?: number
  supportsVision?: boolean
  supportsStreaming?: boolean
}

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
  { command: '/review', description: 'Review code for issues' },
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
  
  // Custom models state (persisted to localStorage)
  const [customModels, setCustomModels] = useLocalStorage<CustomModel[]>('bloop-custom-models', [])
  const [showAddModelModal, setShowAddModelModal] = useState(false)
  const [editingModel, setEditingModel] = useState<CustomModel | null>(null)
  const [newModelForm, setNewModelForm] = useState<Partial<CustomModel>>({
    name: '',
    provider: '',
    apiEndpoint: '',
    apiKey: '',
    description: '',
    maxContextLength: 8192,
    supportsVision: false,
    supportsStreaming: true
  })
  
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
          // Backend returned empty - mark as not connected
          setAvailableModels([])
          setBackendConnected(false)
        }
      } catch (error) {
        console.error('Failed to fetch models:', error)
        // On error, set empty array - modelsList will use DEFAULT_MODELS
        setAvailableModels([])
        setBackendConnected(false)
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
      return "Here's what I can do:\n\n**Commands:**\n• `/edit` - Edit selected code\n• `/explain` - Explain code\n• `/fix` - Fix bugs\n• `/review` - Review code for issues\n• `/test` - Generate tests\n• `/docs` - Generate documentation\n\n**Context:**\n• Use `@` to reference files\n• Drag & drop images\n• Paste code snippets"
    }
    if (userInput.startsWith('/')) {
      const cmd = userInput.split(' ')[0]
      return `Executing ${cmd}...\n\nI'll analyze the code and provide suggestions based on your request.`
    }
    return "I understand. Let me analyze that and provide a helpful response.\n\n```typescript\n// Here's a code example\nconst result = await processRequest(input);\nconsole.log(result);\n```\n\nWould you like me to explain this further?"
  }

  const handleCodeReview = async (code: string, language: string, filePath: string) => {
    setIsTyping(true)
    try {
      const result = await apiService.reviewCode(filePath, code, language)
      const reviewMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `## Code Review Results\n\n**Score**: ${result.score}/100\n\n**Summary**: ${result.summary}\n\n**Issues Found**: ${result.issues.length}\n\n${result.issues.map((issue: any, idx: number) => 
          `### ${idx + 1}. ${issue.severity} - ${issue.category}\n` +
          `**Location**: ${issue.file_path}:${issue.line}:${issue.column}\n` +
          `**Message**: ${issue.message}\n` +
          `**Suggestion**: ${issue.suggestion}\n`
        ).join('\n')}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, reviewMessage])
    } catch (error) {
      console.error('Code review failed:', error)
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Code review failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsTyping(false)
    }
  }

  const handleGenerateTests = async (code: string, language: string, functionName?: string) => {
    setIsTyping(true)
    try {
      const result = await apiService.generateTests(code, language, functionName)
      const testMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `## Generated Tests\n\n**Framework**: ${result.test_framework}\n**Coverage Estimate**: ${result.coverage_estimate}%\n\n**Test Cases**: ${result.test_cases.length}\n\n\`\`\`${language}\n${result.test_cases.map((tc: any) => tc.code).join('\n\n')}\n\`\`\`\n\n${result.setup_code ? `**Setup**:\n\`\`\`${language}\n${result.setup_code}\n\`\`\`` : ''}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, testMessage])
    } catch (error) {
      console.error('Test generation failed:', error)
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Test generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsTyping(false)
    }
  }

  const handleGenerateDocs = async (code: string, language: string, filePath: string) => {
    setIsTyping(true)
    try {
      const result = await apiService.generateDocs(code, language, filePath)
      const docsMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `## Generated Documentation\n\n**Overview**:\n${result.overview}\n\n**API Reference**:\n${result.api_reference.map((api: any) => 
          `### ${api.name}\n\`\`\`\n${api.signature}\n\`\`\`\n${api.description}\n`
        ).join('\n')}\n\n**Usage Guide**:\n${result.usage_guide}\n\n**Examples**:\n${result.examples.map((ex: any) => 
          `### ${ex.title}\n${ex.description}\n\`\`\`${ex.language}\n${ex.code}\n\`\`\`\n`
        ).join('\n')}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, docsMessage])
    } catch (error) {
      console.error('Documentation generation failed:', error)
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Documentation generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsTyping(false)
    }
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
      // Check for special commands
      if (userInput.startsWith('/review') && backendConnected) {
        // Extract code from message or use placeholder
        const codeMatch = userInput.match(/\/review\s+(.*)/s)
        const code = codeMatch ? codeMatch[1] : '// No code provided'
        const language = 'typescript' // Could be detected or passed
        const filePath = 'current-file.ts' // Could be from context
        await handleCodeReview(code, language, filePath)
        return
      } else if (userInput.startsWith('/test') && backendConnected) {
        const codeMatch = userInput.match(/\/test\s+(.*)/s)
        const code = codeMatch ? codeMatch[1] : '// No code provided'
        const language = 'typescript'
        await handleGenerateTests(code, language)
        return
      } else if (userInput.startsWith('/docs') && backendConnected) {
        const codeMatch = userInput.match(/\/docs\s+(.*)/s)
        const code = codeMatch ? codeMatch[1] : '// No code provided'
        const language = 'typescript'
        const filePath = 'current-file.ts'
        await handleGenerateDocs(code, language, filePath)
        return
      }

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
  
  // Custom model management functions
  const handleAddCustomModel = () => {
    if (!newModelForm.name || !newModelForm.provider || !newModelForm.apiEndpoint) {
      return // Basic validation
    }
    
    const modelId = `custom-${Date.now()}-${newModelForm.name.toLowerCase().replace(/\s+/g, '-')}`
    const newModel: CustomModel = {
      id: modelId,
      name: newModelForm.name,
      provider: newModelForm.provider,
      apiEndpoint: newModelForm.apiEndpoint,
      apiKey: newModelForm.apiKey,
      description: newModelForm.description || `Custom ${newModelForm.provider} model`,
      maxContextLength: newModelForm.maxContextLength || 8192,
      supportsVision: newModelForm.supportsVision || false,
      supportsStreaming: newModelForm.supportsStreaming ?? true
    }
    
    if (editingModel) {
      // Update existing model
      setCustomModels(prev => prev.map(m => m.id === editingModel.id ? { ...newModel, id: editingModel.id } : m))
    } else {
      // Add new model
      setCustomModels(prev => [...prev, newModel])
    }
    
    // Reset form and close modal
    setNewModelForm({
      name: '',
      provider: '',
      apiEndpoint: '',
      apiKey: '',
      description: '',
      maxContextLength: 8192,
      supportsVision: false,
      supportsStreaming: true
    })
    setEditingModel(null)
    setShowAddModelModal(false)
  }
  
  const handleEditCustomModel = (model: CustomModel) => {
    setEditingModel(model)
    setNewModelForm({
      name: model.name,
      provider: model.provider,
      apiEndpoint: model.apiEndpoint,
      apiKey: model.apiKey || '',
      description: model.description,
      maxContextLength: model.maxContextLength,
      supportsVision: model.supportsVision,
      supportsStreaming: model.supportsStreaming
    })
    setShowAddModelModal(true)
  }
  
  const handleDeleteCustomModel = (modelId: string) => {
    setCustomModels(prev => prev.filter(m => m.id !== modelId))
    // If the deleted model was selected, switch to auto
    if (model === modelId) {
      setModel('auto')
    }
  }
  
  // Get current model info from available models, custom models, or defaults
  const customModelInfo = customModels.find(m => m.id === model)
  const currentModelInfo = customModelInfo || availableModels.find(m => m.model === model) || 
    DEFAULT_MODELS.find(m => m.id === model)
  const currentModel = customModelInfo ? {
    id: customModelInfo.id,
    name: customModelInfo.name,
    description: customModelInfo.description,
    provider: customModelInfo.provider,
    isCustom: true
  } : currentModelInfo ? {
    id: currentModelInfo.model || currentModelInfo.id,
    name: currentModelInfo.provider === 'auto' ? 'Auto' : 
          (currentModelInfo.provider?.charAt(0).toUpperCase() + currentModelInfo.provider.slice(1)) || DEFAULT_MODELS.find(m => m.id === model)?.name || 'Auto',
    description: currentModelInfo.available 
      ? `${currentModelInfo.capabilities?.max_context_length?.toLocaleString() || 0} context, ${currentModelInfo.capabilities?.speed || 'medium'} speed`
      : DEFAULT_MODELS.find(m => m.id === model)?.description || 'Not configured',
    provider: currentModelInfo.provider || 'auto',
    isCustom: false
  } : { id: 'auto', name: 'Auto', description: 'Auto-select best model', provider: 'auto', isCustom: false }
  
  // Build comprehensive models list - always show all models
  // Start with all default models, then update with backend data if available
  const modelsList = DEFAULT_MODELS.map(defaultModel => {
    // Check if this model is available from backend
    const backendModel = availableModels.find(m => m.model === defaultModel.id)
    
    if (backendModel && backendModel.available) {
      // Use backend data for available models
      return {
        id: backendModel.model,
        name: backendModel.provider.charAt(0).toUpperCase() + backendModel.provider.slice(1),
        description: `${backendModel.capabilities.max_context_length.toLocaleString()} context${backendModel.capabilities.supports_vision ? ', vision' : ''}`,
        provider: backendModel.provider,
        available: true,
        isCustom: false
      }
    } else {
      // Use default model data (either not in backend or not available)
      return {
        id: defaultModel.id,
        name: defaultModel.name,
        description: defaultModel.description,
        provider: defaultModel.provider,
        available: backendModel?.available || false,
        isCustom: false
      }
    }
  })
  
  // Add custom models to the list
  const customModelsList = customModels.map(cm => ({
    id: cm.id,
    name: cm.name,
    description: cm.description,
    provider: cm.provider,
    available: true, // Custom models are always available
    isCustom: true,
    apiEndpoint: cm.apiEndpoint,
    maxContextLength: cm.maxContextLength
  }))

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

      {/* Add Custom Model Modal */}
      {showAddModelModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }} onClick={() => setShowAddModelModal(false)}>
          <div 
            style={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '480px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 48px rgba(0,0,0,0.5)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 600,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Settings size={18} style={{ color: '#FF00FF' }} />
                {editingModel ? 'Edit Custom Model' : 'Add Custom Model'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModelModal(false)
                  setEditingModel(null)
                  setNewModelForm({
                    name: '',
                    provider: '',
                    apiEndpoint: '',
                    apiKey: '',
                    description: '',
                    maxContextLength: 8192,
                    supportsVision: false,
                    supportsStreaming: true
                  })
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#666',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex'
                }}
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Model Name */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                  Model Name *
                </label>
                <input
                  type="text"
                  value={newModelForm.name || ''}
                  onChange={e => setNewModelForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., My Custom GPT"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#0a0a0a',
                    border: '1px solid #2a2a2a',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                    transition: 'border-color 0.15s'
                  }}
                  onFocus={e => e.target.style.borderColor = '#FF00FF'}
                  onBlur={e => e.target.style.borderColor = '#2a2a2a'}
                />
              </div>
              
              {/* Provider */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                  Provider Name *
                </label>
                <input
                  type="text"
                  value={newModelForm.provider || ''}
                  onChange={e => setNewModelForm(prev => ({ ...prev, provider: e.target.value }))}
                  placeholder="e.g., OpenAI, Anthropic, Custom"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#0a0a0a',
                    border: '1px solid #2a2a2a',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                    transition: 'border-color 0.15s'
                  }}
                  onFocus={e => e.target.style.borderColor = '#FF00FF'}
                  onBlur={e => e.target.style.borderColor = '#2a2a2a'}
                />
              </div>
              
              {/* API Endpoint */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                  API Endpoint *
                </label>
                <input
                  type="text"
                  value={newModelForm.apiEndpoint || ''}
                  onChange={e => setNewModelForm(prev => ({ ...prev, apiEndpoint: e.target.value }))}
                  placeholder="e.g., https://api.example.com/v1/chat/completions"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#0a0a0a',
                    border: '1px solid #2a2a2a',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    outline: 'none',
                    transition: 'border-color 0.15s'
                  }}
                  onFocus={e => e.target.style.borderColor = '#FF00FF'}
                  onBlur={e => e.target.style.borderColor = '#2a2a2a'}
                />
              </div>
              
              {/* API Key (Optional) */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                  API Key <span style={{ color: '#555' }}>(Optional - can use env vars)</span>
                </label>
                <input
                  type="password"
                  value={newModelForm.apiKey || ''}
                  onChange={e => setNewModelForm(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="sk-..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#0a0a0a',
                    border: '1px solid #2a2a2a',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    outline: 'none',
                    transition: 'border-color 0.15s'
                  }}
                  onFocus={e => e.target.style.borderColor = '#FF00FF'}
                  onBlur={e => e.target.style.borderColor = '#2a2a2a'}
                />
              </div>
              
              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                  Description
                </label>
                <input
                  type="text"
                  value={newModelForm.description || ''}
                  onChange={e => setNewModelForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g., Fast inference, great for coding"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#0a0a0a',
                    border: '1px solid #2a2a2a',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                    transition: 'border-color 0.15s'
                  }}
                  onFocus={e => e.target.style.borderColor = '#FF00FF'}
                  onBlur={e => e.target.style.borderColor = '#2a2a2a'}
                />
              </div>
              
              {/* Max Context Length */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                  Max Context Length
                </label>
                <input
                  type="number"
                  value={newModelForm.maxContextLength || 8192}
                  onChange={e => setNewModelForm(prev => ({ ...prev, maxContextLength: parseInt(e.target.value) || 8192 }))}
                  placeholder="8192"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#0a0a0a',
                    border: '1px solid #2a2a2a',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                    transition: 'border-color 0.15s'
                  }}
                  onFocus={e => e.target.style.borderColor = '#FF00FF'}
                  onBlur={e => e.target.style.borderColor = '#2a2a2a'}
                />
              </div>
              
              {/* Checkboxes */}
              <div style={{ display: 'flex', gap: '24px' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  fontSize: '12px', 
                  color: '#888',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={newModelForm.supportsVision || false}
                    onChange={e => setNewModelForm(prev => ({ ...prev, supportsVision: e.target.checked }))}
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: '#FF00FF',
                      cursor: 'pointer'
                    }}
                  />
                  Supports Vision
                </label>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  fontSize: '12px', 
                  color: '#888',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={newModelForm.supportsStreaming ?? true}
                    onChange={e => setNewModelForm(prev => ({ ...prev, supportsStreaming: e.target.checked }))}
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: '#FF00FF',
                      cursor: 'pointer'
                    }}
                  />
                  Supports Streaming
                </label>
              </div>
            </div>
            
            {/* Actions */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '24px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowAddModelModal(false)
                  setEditingModel(null)
                  setNewModelForm({
                    name: '',
                    provider: '',
                    apiEndpoint: '',
                    apiKey: '',
                    description: '',
                    maxContextLength: 8192,
                    supportsVision: false,
                    supportsStreaming: true
                  })
                }}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '1px solid #2a2a2a',
                  borderRadius: '6px',
                  color: '#888',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#444'
                  e.currentTarget.style.color = '#aaa'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#2a2a2a'
                  e.currentTarget.style.color = '#888'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomModel}
                disabled={!newModelForm.name || !newModelForm.provider || !newModelForm.apiEndpoint}
                style={{
                  padding: '10px 20px',
                  background: (!newModelForm.name || !newModelForm.provider || !newModelForm.apiEndpoint) 
                    ? '#333' 
                    : '#FF00FF',
                  border: 'none',
                  borderRadius: '6px',
                  color: (!newModelForm.name || !newModelForm.provider || !newModelForm.apiEndpoint) 
                    ? '#666' 
                    : '#fff',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: (!newModelForm.name || !newModelForm.provider || !newModelForm.apiEndpoint) 
                    ? 'not-allowed' 
                    : 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {editingModel ? 'Save Changes' : 'Add Model'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  gap: '6px',
                  padding: '4px 10px',
                  background: showModelDropdown ? 'rgba(255,0,255,0.1)' : 'transparent',
                  border: '1px solid',
                  borderColor: showModelDropdown ? '#FF00FF' : '#2a2a2a',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  color: showModelDropdown ? '#FF00FF' : '#888',
                  transition: 'all 0.15s',
                  fontWeight: 500
                }}
                onMouseEnter={(e) => {
                  if (!showModelDropdown) {
                    e.currentTarget.style.borderColor = '#444'
                    e.currentTarget.style.color = '#aaa'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showModelDropdown) {
                    e.currentTarget.style.borderColor = '#2a2a2a'
                    e.currentTarget.style.color = '#888'
                  }
                }}
              >
                <span>{currentModel.name}</span>
                {modelsLoading && <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />}
                <ChevronDown size={10} style={{ 
                  transform: showModelDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s'
                }} />
              </button>

              {showModelDropdown && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  background: '#151515',
                  border: '1px solid #2a2a2a',
                  borderRadius: '6px',
                  padding: '2px',
                  marginBottom: '6px',
                  minWidth: '280px',
                  maxWidth: '320px',
                  maxHeight: '500px',
                  overflowY: 'auto',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  zIndex: 100
                }}>
                  {modelsLoading ? (
                    <div style={{ 
                      padding: '16px', 
                      textAlign: 'center', 
                      color: '#666',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}>
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      Loading models...
                    </div>
                  ) : (
                    <>
                      {/* Auto option - always first */}
                      {modelsList.filter(m => m.id === 'auto').map((m) => (
                        <div
                          key={m.id}
                          onClick={() => {
                            setModel(m.id)
                            setShowModelDropdown(false)
                          }}
                          style={{
                            padding: '6px 10px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            background: m.id === model ? 'rgba(255,0,255,0.15)' : 'transparent',
                            borderLeft: m.id === model ? '2px solid #FF00FF' : '2px solid transparent',
                            marginBottom: '2px'
                          }}
                          onMouseEnter={(e) => {
                            if (m.id !== model) {
                              e.currentTarget.style.background = 'rgba(255,0,255,0.08)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = m.id === model ? 'rgba(255,0,255,0.15)' : 'transparent'
                          }}
                        >
                          <div style={{ 
                            fontSize: '12px', 
                            color: m.id === model ? '#FF00FF' : '#ddd',
                            fontWeight: m.id === model ? 500 : 400,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            {m.id === model && <Check size={12} style={{ color: '#FF00FF' }} />}
                            <span>{m.name}</span>
                          </div>
                          <div style={{ fontSize: '10px', color: '#777', marginTop: '2px', marginLeft: m.id === model ? '18px' : '0' }}>
                            {m.description}
                          </div>
                        </div>
                      ))}
                      
                      {/* Divider */}
                      {modelsList.filter(m => m.id !== 'auto').length > 0 && (
                        <div style={{
                          height: '1px',
                          background: '#2a2a2a',
                          margin: '4px 8px'
                        }} />
                      )}
                      
                      {/* Available models */}
                      {modelsList.filter(m => m.id !== 'auto' && m.available).map((m) => (
                        <div
                          key={m.id}
                          onClick={() => {
                            setModel(m.id)
                            setShowModelDropdown(false)
                          }}
                          style={{
                            padding: '6px 10px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            background: m.id === model ? 'rgba(255,0,255,0.15)' : 'transparent',
                            borderLeft: m.id === model ? '2px solid #FF00FF' : '2px solid transparent',
                            marginBottom: '1px'
                          }}
                          onMouseEnter={(e) => {
                            if (m.id !== model) {
                              e.currentTarget.style.background = 'rgba(255,0,255,0.08)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = m.id === model ? 'rgba(255,0,255,0.15)' : 'transparent'
                          }}
                        >
                          <div style={{ 
                            fontSize: '12px', 
                            color: m.id === model ? '#FF00FF' : '#ddd',
                            fontWeight: m.id === model ? 500 : 400,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            {m.id === model && <Check size={12} style={{ color: '#FF00FF' }} />}
                            <span>{m.name}</span>
                          </div>
                          <div style={{ fontSize: '10px', color: '#777', marginTop: '2px', marginLeft: m.id === model ? '18px' : '0' }}>
                            {m.description}
                          </div>
                        </div>
                      ))}
                      
                      {/* Custom Models Section */}
                      {customModelsList.length > 0 && (
                        <>
                          <div style={{
                            height: '1px',
                            background: '#2a2a2a',
                            margin: '6px 8px'
                          }} />
                          <div style={{
                            padding: '6px 10px',
                            fontSize: '10px',
                            color: '#22c55e',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <Plus size={10} />
                            Custom Models
                          </div>
                          {customModelsList.map((m) => (
                            <div
                              key={m.id}
                              style={{
                                padding: '6px 10px',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                background: m.id === model ? 'rgba(34,197,94,0.15)' : 'transparent',
                                borderLeft: m.id === model ? '2px solid #22c55e' : '2px solid transparent',
                                marginBottom: '1px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}
                              onMouseEnter={(e) => {
                                if (m.id !== model) {
                                  e.currentTarget.style.background = 'rgba(34,197,94,0.08)'
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = m.id === model ? 'rgba(34,197,94,0.15)' : 'transparent'
                              }}
                            >
                              <div 
                                style={{ flex: 1 }}
                                onClick={() => {
                                  setModel(m.id)
                                  setShowModelDropdown(false)
                                }}
                              >
                                <div style={{ 
                                  fontSize: '12px', 
                                  color: m.id === model ? '#22c55e' : '#ddd',
                                  fontWeight: m.id === model ? 500 : 400,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}>
                                  {m.id === model && <Check size={12} style={{ color: '#22c55e' }} />}
                                  <span>{m.name}</span>
                                  <span style={{ 
                                    fontSize: '9px', 
                                    background: 'rgba(34,197,94,0.2)', 
                                    color: '#22c55e',
                                    padding: '1px 4px',
                                    borderRadius: '3px'
                                  }}>
                                    {m.provider}
                                  </span>
                                </div>
                                <div style={{ fontSize: '10px', color: '#777', marginTop: '2px', marginLeft: m.id === model ? '18px' : '0' }}>
                                  {m.description}
                                </div>
                              </div>
                              {/* Edit and Delete buttons */}
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const customModel = customModels.find(cm => cm.id === m.id)
                                    if (customModel) handleEditCustomModel(customModel)
                                  }}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#666',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = '#22c55e'}
                                  onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
                                  title="Edit model"
                                >
                                  <Settings size={12} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteCustomModel(m.id)
                                  }}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#666',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                  onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
                                  title="Delete model"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                      
                      {/* Add Custom Model Button */}
                      <div style={{
                        height: '1px',
                        background: '#2a2a2a',
                        margin: '6px 8px'
                      }} />
                      <button
                        onClick={() => {
                          setShowModelDropdown(false)
                          setShowAddModelModal(true)
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '12px',
                          color: '#888',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(34,197,94,0.1)'
                          e.currentTarget.style.color = '#22c55e'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = '#888'
                        }}
                      >
                        <Plus size={14} />
                        Add Custom Model
                      </button>
                      
                      {/* Unavailable models - collapsed section */}
                      {modelsList.filter(m => m.id !== 'auto' && !m.available).length > 0 && (
                        <>
                          <div style={{
                            height: '1px',
                            background: '#2a2a2a',
                            margin: '6px 8px'
                          }} />
                          <div style={{
                            padding: '6px 10px',
                            fontSize: '10px',
                            color: '#555',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            fontWeight: 600
                          }}>
                            Not Configured
                          </div>
                          {modelsList.filter(m => m.id !== 'auto' && !m.available).map((m) => (
                            <div
                              key={m.id}
                              style={{
                                padding: '5px 10px 5px 20px',
                                cursor: 'not-allowed',
                                borderRadius: '4px',
                                opacity: 0.4,
                                fontSize: '11px',
                                color: '#666'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{m.name}</span>
                              </div>
                              <div style={{ fontSize: '9px', color: '#555', marginTop: '1px' }}>
                                {m.description}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </>
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
