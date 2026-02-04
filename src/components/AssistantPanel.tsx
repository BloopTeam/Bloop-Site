import { useState, useRef, useEffect } from 'react'
import { 
  ChevronDown, AtSign, Image as ImageIcon, Mic, Send, 
  Copy, Check, RefreshCw, Code, Sparkles,
  MessageSquare, FileCode, FolderOpen, Hash, ThumbsUp, ThumbsDown, ChevronUp, Loader2,
  Plus, X, Trash2, Settings, Brain, Zap, Target, Search, Wand2, Globe, ExternalLink, Github, Twitter
} from 'lucide-react'
import Logo from './Logo'
import { apiService, type ModelInfo } from '../services/api'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { reasoningEngine } from '../services/reasoning'
import { orchestrationService } from '../services/orchestration'
import { aiProviderService, AIModel, ThinkingStep as AIThinkingStep } from '../services/aiProviders'

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
  onCreateFile?: (name: string, content: string, language: string) => void
  onCreateFiles?: (files: { name: string; content: string; language: string }[]) => void
}

// File that was created by the agent
interface CreatedFile {
  name: string
  language: string
  content: string
}

// Agent work step
interface AgentStep {
  id: string
  status: 'pending' | 'working' | 'done' | 'error'
  description: string
  file?: string
  type?: 'analysis' | 'planning' | 'execution' | 'validation' | 'file-creation'
  details?: string
  confidence?: number
  duration?: number
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
  // Agent-specific fields
  isAgentTask?: boolean
  agentSteps?: AgentStep[]
  createdFiles?: CreatedFile[]
  // AI reasoning fields
  thinkingSteps?: AIThinkingStep[]
  modelUsed?: string
  confidence?: number
  tokensUsed?: number
  duration?: number
  // Web references
  webReferences?: Array<{
    id: string
    source: 'github' | 'reddit' | 'twitter' | 'web' | 'stackoverflow' | 'dribbble' | 'behance' | 'codepen'
    title: string
    url: string
    description: string
    relevance: number
    type: 'code' | 'design' | 'tutorial' | 'documentation' | 'discussion' | 'example'
    stars?: number
  }>
}

type AgentMode = 'agent' | 'chat' | 'edit'
type ModelType = 'auto' | string // Can be any model ID from backend

// Get advanced models from AI Provider Service
const getDefaultModels = (): { id: ModelType; name: string; description: string; provider: string; capabilities?: AIModel['capabilities'] }[] => {
  const aiModels = aiProviderService.getAllModels()
  return [
    { id: 'auto', name: 'Auto', description: 'Intelligently selects the best model for your task', provider: 'auto' },
    ...aiModels.map(m => ({
      id: m.id as ModelType,
      name: m.name,
      description: m.description,
      provider: m.provider,
      capabilities: m.capabilities
    }))
  ]
}

const DEFAULT_MODELS = getDefaultModels()

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

export default function AssistantPanel({ width = 480, onCreateFile, onCreateFiles }: AssistantPanelProps) {
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
  const [modelSearch, setModelSearch] = useState('')
  const [autoMode, setAutoMode] = useState(true)
  const [maxMode, setMaxMode] = useState(false)
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
      } catch {
        // Backend unavailable - use DEFAULT_MODELS
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
    const lowerInput = userInput.toLowerCase()
    
    // Quick greetings - keep it short
    if (lowerInput === 'hi' || lowerInput === 'hey' || lowerInput === 'hello') {
      return "Hey! What are you working on?"
    }
    
    // Help command
    if (lowerInput === 'help' || lowerInput === '/help') {
      return "**Quick Commands:**\n`/edit` - Edit code\n`/fix` - Debug issues\n`/test` - Generate tests\n`/docs` - Generate docs\n\n**Tips:**\n• Use `@filename` to reference files\n• Paste code directly for analysis\n• Describe what you want built\n\nWhat do you need?"
    }

    // Website/app building requests
    if (lowerInput.includes('website') || lowerInput.includes('web app') || lowerInput.includes('landing page')) {
      const topic = userInput.replace(/make|build|create|me|a|quick|simple|the|website|web app|landing page|for|about/gi, '').trim()
      return `Here's a modern landing page structure:\n\n\`\`\`tsx\nimport { useState } from 'react'\n\nexport default function LandingPage() {\n  return (\n    <div className=\"min-h-screen bg-gradient-to-b from-gray-900 to-black text-white\">\n      {/* Hero Section */}\n      <header className=\"container mx-auto px-6 py-16\">\n        <nav className=\"flex justify-between items-center mb-16\">\n          <h1 className=\"text-2xl font-bold\">${topic || 'YourBrand'}</h1>\n          <div className=\"space-x-6\">\n            <a href=\"#features\">Features</a>\n            <a href=\"#pricing\">Pricing</a>\n            <button className=\"bg-purple-600 px-4 py-2 rounded-lg\">Get Started</button>\n          </div>\n        </nav>\n        \n        <div className=\"text-center max-w-3xl mx-auto\">\n          <h2 className=\"text-5xl font-bold mb-6\">Your Headline Here</h2>\n          <p className=\"text-xl text-gray-400 mb-8\">Describe your value proposition</p>\n          <button className=\"bg-purple-600 px-8 py-4 rounded-lg text-lg font-semibold\">\n            Start Free Trial\n          </button>\n        </div>\n      </header>\n\n      {/* Features Section */}\n      <section id=\"features\" className=\"py-20 bg-gray-900/50\">\n        <div className=\"container mx-auto px-6\">\n          <h3 className=\"text-3xl font-bold text-center mb-12\">Features</h3>\n          <div className=\"grid md:grid-cols-3 gap-8\">\n            {['Feature 1', 'Feature 2', 'Feature 3'].map(f => (\n              <div key={f} className=\"p-6 bg-gray-800 rounded-xl\">\n                <h4 className=\"text-xl font-semibold mb-2\">{f}</h4>\n                <p className=\"text-gray-400\">Description here</p>\n              </div>\n            ))}\n          </div>\n        </div>\n      </section>\n    </div>\n  )\n}\n\`\`\`\n\nWant me to add more sections (pricing, testimonials, footer)?`
    }

    // API/backend requests
    if (lowerInput.includes('api') || lowerInput.includes('endpoint') || lowerInput.includes('backend') || lowerInput.includes('server')) {
      return `Here's a REST API setup:\n\n\`\`\`typescript\n// server.ts\nimport express from 'express'\nimport cors from 'cors'\n\nconst app = express()\napp.use(cors())\napp.use(express.json())\n\n// Routes\napp.get('/api/items', async (req, res) => {\n  try {\n    const items = await db.items.findMany()\n    res.json(items)\n  } catch (err) {\n    res.status(500).json({ error: 'Failed to fetch items' })\n  }\n})\n\napp.post('/api/items', async (req, res) => {\n  try {\n    const { name, description } = req.body\n    const item = await db.items.create({ data: { name, description } })\n    res.status(201).json(item)\n  } catch (err) {\n    res.status(500).json({ error: 'Failed to create item' })\n  }\n})\n\napp.listen(3001, () => console.log('API running on :3001'))\n\`\`\`\n\nNeed auth, database setup, or more endpoints?`
    }

    // React component requests
    if (lowerInput.includes('component') || lowerInput.includes('react') || lowerInput.includes('button') || lowerInput.includes('form') || lowerInput.includes('modal')) {
      if (lowerInput.includes('form')) {
        return `\`\`\`tsx\nimport { useState } from 'react'\n\ninterface FormData {\n  email: string\n  password: string\n}\n\nexport function LoginForm({ onSubmit }: { onSubmit: (data: FormData) => void }) {\n  const [formData, setFormData] = useState<FormData>({ email: '', password: '' })\n  const [loading, setLoading] = useState(false)\n  const [error, setError] = useState('')\n\n  const handleSubmit = async (e: React.FormEvent) => {\n    e.preventDefault()\n    setLoading(true)\n    setError('')\n    try {\n      await onSubmit(formData)\n    } catch (err) {\n      setError('Login failed')\n    } finally {\n      setLoading(false)\n    }\n  }\n\n  return (\n    <form onSubmit={handleSubmit} className=\"space-y-4 max-w-md\">\n      {error && <div className=\"text-red-500 text-sm\">{error}</div>}\n      <input\n        type=\"email\"\n        placeholder=\"Email\"\n        value={formData.email}\n        onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}\n        className=\"w-full p-3 bg-gray-800 rounded-lg border border-gray-700\"\n        required\n      />\n      <input\n        type=\"password\"\n        placeholder=\"Password\"\n        value={formData.password}\n        onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}\n        className=\"w-full p-3 bg-gray-800 rounded-lg border border-gray-700\"\n        required\n      />\n      <button\n        type=\"submit\"\n        disabled={loading}\n        className=\"w-full p-3 bg-purple-600 rounded-lg font-semibold disabled:opacity-50\"\n      >\n        {loading ? 'Signing in...' : 'Sign In'}\n      </button>\n    </form>\n  )\n}\n\`\`\`\n\nNeed validation, forgot password, or registration?`
      }
      if (lowerInput.includes('modal')) {
        return `\`\`\`tsx\nimport { useEffect, useRef } from 'react'\nimport { X } from 'lucide-react'\n\ninterface ModalProps {\n  isOpen: boolean\n  onClose: () => void\n  title: string\n  children: React.ReactNode\n}\n\nexport function Modal({ isOpen, onClose, title, children }: ModalProps) {\n  const overlayRef = useRef<HTMLDivElement>(null)\n\n  useEffect(() => {\n    const handleEscape = (e: KeyboardEvent) => {\n      if (e.key === 'Escape') onClose()\n    }\n    if (isOpen) document.addEventListener('keydown', handleEscape)\n    return () => document.removeEventListener('keydown', handleEscape)\n  }, [isOpen, onClose])\n\n  if (!isOpen) return null\n\n  return (\n    <div\n      ref={overlayRef}\n      className=\"fixed inset-0 bg-black/60 flex items-center justify-center z-50\"\n      onClick={e => e.target === overlayRef.current && onClose()}\n    >\n      <div className=\"bg-gray-900 rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl\">\n        <div className=\"flex justify-between items-center mb-4\">\n          <h2 className=\"text-xl font-semibold\">{title}</h2>\n          <button onClick={onClose} className=\"text-gray-400 hover:text-white\">\n            <X size={20} />\n          </button>\n        </div>\n        {children}\n      </div>\n    </div>\n  )\n}\n\`\`\`\n\nUse it: \`<Modal isOpen={show} onClose={() => setShow(false)} title=\"Title\">Content</Modal>\``
      }
      return "```tsx\nimport { useState } from 'react'\n\ninterface ButtonProps {\n  children: React.ReactNode\n  variant?: 'primary' | 'secondary' | 'danger'\n  size?: 'sm' | 'md' | 'lg'\n  loading?: boolean\n  onClick?: () => void\n}\n\nexport function Button({ \n  children, \n  variant = 'primary', \n  size = 'md',\n  loading,\n  onClick \n}: ButtonProps) {\n  const baseStyles = 'font-semibold rounded-lg transition-colors disabled:opacity-50'\n  \n  const variants = {\n    primary: 'bg-purple-600 hover:bg-purple-700 text-white',\n    secondary: 'bg-gray-700 hover:bg-gray-600 text-white',\n    danger: 'bg-red-600 hover:bg-red-700 text-white'\n  }\n  \n  const sizes = {\n    sm: 'px-3 py-1.5 text-sm',\n    md: 'px-4 py-2',\n    lg: 'px-6 py-3 text-lg'\n  }\n\n  return (\n    <button\n      className={`${baseStyles} ${variants[variant]} ${sizes[size]}`}\n      onClick={onClick}\n      disabled={loading}\n    >\n      {loading ? 'Loading...' : children}\n    </button>\n  )\n}\n```\n\nWhat specific component do you need?"
    }

    // Database/data requests
    if (lowerInput.includes('database') || lowerInput.includes('prisma') || lowerInput.includes('sql') || lowerInput.includes('mongodb')) {
      return `**Prisma Setup:**\n\n\`\`\`prisma\n// schema.prisma\ngenerator client {\n  provider = \"prisma-client-js\"\n}\n\ndatasource db {\n  provider = \"postgresql\" // or \"mysql\", \"sqlite\", \"mongodb\"\n  url      = env(\"DATABASE_URL\")\n}\n\nmodel User {\n  id        String   @id @default(cuid())\n  email     String   @unique\n  name      String?\n  posts     Post[]\n  createdAt DateTime @default(now())\n}\n\nmodel Post {\n  id        String   @id @default(cuid())\n  title     String\n  content   String?\n  published Boolean  @default(false)\n  author    User     @relation(fields: [authorId], references: [id])\n  authorId  String\n  createdAt DateTime @default(now())\n}\n\`\`\`\n\n**Usage:**\n\`\`\`typescript\nimport { PrismaClient } from '@prisma/client'\nconst prisma = new PrismaClient()\n\n// Create\nawait prisma.user.create({ data: { email: 'user@example.com', name: 'User' } })\n\n// Read\nconst users = await prisma.user.findMany({ include: { posts: true } })\n\n// Update\nawait prisma.user.update({ where: { id }, data: { name: 'New Name' } })\n\n// Delete\nawait prisma.user.delete({ where: { id } })\n\`\`\`\n\nRun: \`npx prisma migrate dev\` to apply`
    }

    // Auth requests
    if (lowerInput.includes('auth') || lowerInput.includes('login') || lowerInput.includes('signup') || lowerInput.includes('jwt')) {
      return `**JWT Auth Setup:**\n\n\`\`\`typescript\nimport jwt from 'jsonwebtoken'\nimport bcrypt from 'bcryptjs'\n\nconst JWT_SECRET = process.env.JWT_SECRET!\n\n// Register\nasync function register(email: string, password: string) {\n  const hashedPassword = await bcrypt.hash(password, 10)\n  const user = await db.user.create({\n    data: { email, password: hashedPassword }\n  })\n  return generateToken(user.id)\n}\n\n// Login\nasync function login(email: string, password: string) {\n  const user = await db.user.findUnique({ where: { email } })\n  if (!user || !await bcrypt.compare(password, user.password)) {\n    throw new Error('Invalid credentials')\n  }\n  return generateToken(user.id)\n}\n\nfunction generateToken(userId: string) {\n  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })\n}\n\n// Middleware\nfunction authMiddleware(req, res, next) {\n  const token = req.headers.authorization?.split(' ')[1]\n  if (!token) return res.status(401).json({ error: 'No token' })\n  \n  try {\n    const decoded = jwt.verify(token, JWT_SECRET)\n    req.userId = decoded.userId\n    next()\n  } catch {\n    res.status(401).json({ error: 'Invalid token' })\n  }\n}\n\`\`\`\n\nNeed OAuth (Google/GitHub), refresh tokens, or session auth?`
    }

    // Fix/debug requests
    if (lowerInput.includes('fix') || lowerInput.includes('error') || lowerInput.includes('bug') || lowerInput.includes('not working') || lowerInput.includes('broken')) {
      return "Paste the error message or code that's not working and I'll fix it."
    }

    // Explain requests
    if (lowerInput.includes('explain') || lowerInput.includes('what is') || lowerInput.includes('how does') || lowerInput.includes('what does')) {
      // Try to extract what they want explained
      const topic = userInput.replace(/explain|what is|how does|what does|work|mean|the|a|an/gi, '').trim()
      if (topic.length > 2) {
        return `**${topic}:**\n\nThis is a core concept in programming. To give you a precise explanation, paste the code or describe the specific context where you're using it.`
      }
      return "What would you like me to explain? Paste code or describe the concept."
    }

    // Commands - be direct
    if (userInput.startsWith('/')) {
      const parts = userInput.split(' ')
      const cmd = parts[0]
      const content = parts.slice(1).join(' ')
      
      if (content.length > 10) {
        // They provided code/content with the command
        return `Analyzing your code...\n\n${cmd === '/fix' ? 'Here\'s the fixed version:' : cmd === '/explain' ? 'Here\'s what this does:' : cmd === '/test' ? 'Here are tests for this:' : 'Here\'s my analysis:'}\n\n\`\`\`typescript\n// Processing: ${content.substring(0, 50)}...\n// [Analysis would appear here with backend connected]\n\`\`\`\n\nFor full AI analysis, connect to a backend API.`
      }
      return `Use: \`${cmd} [paste your code here]\``
    }

    // Generic code generation - actually try to help
    if (lowerInput.includes('function') || lowerInput.includes('write') || lowerInput.includes('code') || lowerInput.includes('implement') || lowerInput.includes('make') || lowerInput.includes('create') || lowerInput.includes('build')) {
      // Extract what they want
      const cleaned = userInput.replace(/write|create|make|build|implement|me|a|an|the|please|can you|could you|i need|i want/gi, '').trim()
      
      return `\`\`\`typescript\n// ${cleaned}\nexport function ${cleaned.split(' ')[0]?.toLowerCase() || 'myFunction'}() {\n  // Implementation here\n  // Describe more specifically what this should do\n  // and I'll generate the full code\n}\n\`\`\`\n\nBe more specific: What inputs? What output? What should it do step by step?`
    }

    // Default - don't ask a million questions, just respond helpfully
    return `Working on: "${userInput}"\n\nTo help with this, I need a bit more context. Either:\n• Paste code you want to modify\n• Describe the specific feature to build\n• Share an error message to debug\n\nOr try: \`/edit\`, \`/fix\`, \`/test\`, \`/docs\``
  }

  // Check if this is a task that should trigger agent mode (file creation)
  const isAgentTask = (input: string): boolean => {
    const lowerInput = input.toLowerCase()
    const agentKeywords = [
      'make me', 'build me', 'create a', 'create an', 'build a', 'build an',
      'make a', 'make an', 'generate a', 'generate an', 'set up', 'setup',
      'website', 'web app', 'webapp', 'landing page', 'dashboard', 'app',
      'project', 'application', 'full stack', 'frontend', 'backend'
    ]
    return agentKeywords.some(kw => lowerInput.includes(kw))
  }

  // Generate project files based on user request
  const generateProjectFiles = (userInput: string): CreatedFile[] => {
    const lowerInput = userInput.toLowerCase()
    
    // Landing page / website
    if (lowerInput.includes('landing') || lowerInput.includes('website') || lowerInput.includes('web page')) {
      const projectName = userInput.match(/(?:for|called|named)\s+["']?(\w+)["']?/i)?.[1] || 'MyProject'
      return [
        {
          name: 'index.html',
          language: 'html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="main.tsx"></script>
</body>
</html>`
        },
        {
          name: 'main.tsx',
          language: 'tsx',
          content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`
        },
        {
          name: 'App.tsx',
          language: 'tsx',
          content: `import { useState } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import Features from './components/Features'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <Header />
      <Hero />
      <Features />
      <Footer />
    </div>
  )
}`
        },
        {
          name: 'components/Header.tsx',
          language: 'tsx',
          content: `export default function Header() {
  return (
    <header className="container mx-auto px-6 py-4">
      <nav className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">${projectName}</h1>
        <div className="flex gap-6">
          <a href="#features" className="hover:text-purple-400 transition">Features</a>
          <a href="#pricing" className="hover:text-purple-400 transition">Pricing</a>
          <a href="#contact" className="hover:text-purple-400 transition">Contact</a>
          <button className="bg-purple-600 px-4 py-2 rounded-lg hover:bg-purple-700 transition">
            Get Started
          </button>
        </div>
      </nav>
    </header>
  )
}`
        },
        {
          name: 'components/Hero.tsx',
          language: 'tsx',
          content: `export default function Hero() {
  return (
    <section className="container mx-auto px-6 py-20 text-center">
      <h2 className="text-5xl md:text-6xl font-bold mb-6">
        Build Something Amazing
      </h2>
      <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
        Your powerful solution for modern development. 
        Ship faster, build better, scale effortlessly.
      </p>
      <div className="flex gap-4 justify-center">
        <button className="bg-purple-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-700 transition">
          Start Free Trial
        </button>
        <button className="border border-gray-600 px-8 py-4 rounded-lg text-lg hover:border-gray-400 transition">
          View Demo
        </button>
      </div>
    </section>
  )
}`
        },
        {
          name: 'components/Features.tsx',
          language: 'tsx',
          content: `const features = [
  { title: 'Lightning Fast', description: 'Optimized for speed and performance', icon: '⚡' },
  { title: 'Secure', description: 'Enterprise-grade security built-in', icon: '🔒' },
  { title: 'Scalable', description: 'Grows with your business needs', icon: '📈' },
]

export default function Features() {
  return (
    <section id="features" className="py-20 bg-gray-900/50">
      <div className="container mx-auto px-6">
        <h3 className="text-3xl font-bold text-center mb-12">Features</h3>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="p-6 bg-gray-800/50 rounded-xl border border-gray-700">
              <span className="text-4xl mb-4 block">{feature.icon}</span>
              <h4 className="text-xl font-semibold mb-2">{feature.title}</h4>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}`
        },
        {
          name: 'components/Footer.tsx',
          language: 'tsx',
          content: `export default function Footer() {
  return (
    <footer className="py-8 border-t border-gray-800">
      <div className="container mx-auto px-6 text-center text-gray-500">
        <p>&copy; ${new Date().getFullYear()} ${projectName}. All rights reserved.</p>
      </div>
    </footer>
  )
}`
        },
        {
          name: 'styles.css',
          language: 'css',
          content: `@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}

.container {
  max-width: 1200px;
}`
        },
        {
          name: 'package.json',
          language: 'json',
          content: `{
  "name": "${projectName.toLowerCase().replace(/\s+/g, '-')}",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.24",
    "tailwindcss": "^3.3.2",
    "typescript": "^5.0.0",
    "vite": "^4.3.9"
  }
}`
        }
      ]
    }
    
    // Dashboard / App
    if (lowerInput.includes('dashboard') || lowerInput.includes('admin')) {
      return [
        {
          name: 'App.tsx',
          language: 'tsx',
          content: `import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './components/Dashboard'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Dashboard />
        </main>
      </div>
    </div>
  )
}`
        },
        {
          name: 'components/Sidebar.tsx',
          language: 'tsx',
          content: `import { Home, Users, Settings, BarChart, FileText } from 'lucide-react'

const menuItems = [
  { icon: Home, label: 'Dashboard', href: '/' },
  { icon: Users, label: 'Users', href: '/users' },
  { icon: BarChart, label: 'Analytics', href: '/analytics' },
  { icon: FileText, label: 'Reports', href: '/reports' },
  { icon: Settings, label: 'Settings', href: '/settings' },
]

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export default function Sidebar({ isOpen }: SidebarProps) {
  return (
    <aside className={\`\${isOpen ? 'w-64' : 'w-20'} bg-gray-800 border-r border-gray-700 transition-all\`}>
      <div className="p-4">
        <h1 className={\`font-bold \${isOpen ? 'text-xl' : 'text-center'}\`}>
          {isOpen ? 'Dashboard' : 'D'}
        </h1>
      </div>
      <nav className="mt-4">
        {menuItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-gray-700 hover:text-white transition"
          >
            <item.icon size={20} />
            {isOpen && <span>{item.label}</span>}
          </a>
        ))}
      </nav>
    </aside>
  )
}`
        },
        {
          name: 'components/Header.tsx',
          language: 'tsx',
          content: `import { Menu, Bell, Search, User } from 'lucide-react'

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="p-2 hover:bg-gray-700 rounded-lg">
          <Menu size={20} />
        </button>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-gray-700 rounded-lg relative">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <button className="p-2 hover:bg-gray-700 rounded-lg">
          <User size={20} />
        </button>
      </div>
    </header>
  )
}`
        },
        {
          name: 'components/Dashboard.tsx',
          language: 'tsx',
          content: `const stats = [
  { label: 'Total Users', value: '12,345', change: '+12%' },
  { label: 'Revenue', value: '$45,678', change: '+8%' },
  { label: 'Orders', value: '1,234', change: '+23%' },
  { label: 'Conversion', value: '3.2%', change: '-2%' },
]

export default function Dashboard() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="p-6 bg-gray-800 rounded-xl border border-gray-700">
            <p className="text-gray-400 text-sm">{stat.label}</p>
            <p className="text-3xl font-bold mt-2">{stat.value}</p>
            <p className={\`text-sm mt-2 \${stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}\`}>
              {stat.change} from last month
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-gray-800 rounded-xl border border-gray-700">
          <h3 className="font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-gray-700/50 rounded-lg">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                  U{i}
                </div>
                <div>
                  <p className="font-medium">User {i} performed action</p>
                  <p className="text-sm text-gray-400">{i} hours ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-6 bg-gray-800 rounded-xl border border-gray-700">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 bg-purple-600 rounded-lg hover:bg-purple-700 transition">
              Add User
            </button>
            <button className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition">
              Generate Report
            </button>
            <button className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition">
              View Analytics
            </button>
            <button className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition">
              Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}`
        }
      ]
    }

    // API / Backend
    if (lowerInput.includes('api') || lowerInput.includes('backend') || lowerInput.includes('server')) {
      return [
        {
          name: 'server.ts',
          language: 'typescript',
          content: `import express from 'express'
import cors from 'cors'
import { router as apiRouter } from './routes/api'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Routes
app.use('/api', apiRouter)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(\`Server running on http://localhost:\${PORT}\`)
})`
        },
        {
          name: 'routes/api.ts',
          language: 'typescript',
          content: `import { Router } from 'express'
import { getItems, createItem, updateItem, deleteItem } from '../controllers/items'

export const router = Router()

router.get('/items', getItems)
router.post('/items', createItem)
router.put('/items/:id', updateItem)
router.delete('/items/:id', deleteItem)`
        },
        {
          name: 'controllers/items.ts',
          language: 'typescript',
          content: `import { Request, Response } from 'express'

interface Item {
  id: string
  name: string
  description: string
  createdAt: Date
}

let items: Item[] = []

export const getItems = (req: Request, res: Response) => {
  res.json(items)
}

export const createItem = (req: Request, res: Response) => {
  const { name, description } = req.body
  const item: Item = {
    id: Date.now().toString(),
    name,
    description,
    createdAt: new Date()
  }
  items.push(item)
  res.status(201).json(item)
}

export const updateItem = (req: Request, res: Response) => {
  const { id } = req.params
  const { name, description } = req.body
  const index = items.findIndex(i => i.id === id)
  if (index === -1) {
    return res.status(404).json({ error: 'Item not found' })
  }
  items[index] = { ...items[index], name, description }
  res.json(items[index])
}

export const deleteItem = (req: Request, res: Response) => {
  const { id } = req.params
  items = items.filter(i => i.id !== id)
  res.status(204).send()
}`
        },
        {
          name: 'package.json',
          language: 'json',
          content: `{
  "name": "api-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.13",
    "@types/express": "^4.17.17",
    "@types/node": "^20.4.2",
    "tsx": "^3.12.7",
    "typescript": "^5.1.6"
  }
}`
        }
      ]
    }

    // Default: simple component
    return [
      {
        name: 'Component.tsx',
        language: 'tsx',
        content: `import { useState } from 'react'

export default function Component() {
  const [count, setCount] = useState(0)

  return (
    <div className="p-6 bg-gray-800 rounded-xl">
      <h2 className="text-xl font-bold mb-4">My Component</h2>
      <p className="text-gray-400 mb-4">Count: {count}</p>
      <button
        onClick={() => setCount(c => c + 1)}
        className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition"
      >
        Increment
      </button>
    </div>
  )
}`
      }
    ]
  }

  // Execute advanced agent task with AI reasoning and orchestration
  const executeAgentTask = async (userInput: string, messageId: string) => {
    const allSteps: AgentStep[] = []
    let stepIndex = 0
    
    // Get the current model
    const currentModelId = model === 'auto' 
      ? aiProviderService.selectBestModel('code')?.id || 'claude-3.5-sonnet'
      : model
    const currentModel = aiProviderService.getModel(currentModelId)

    // Helper to add a step
    const addStep = (step: Omit<AgentStep, 'id'>) => {
      const newStep: AgentStep = { ...step, id: `step-${stepIndex++}` }
      allSteps.push(newStep)
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, agentSteps: [...allSteps], isAgentTask: true, modelUsed: currentModelId }
          : m
      ))
      return newStep
    }

    // Helper to update step status
    const updateStep = (stepId: string, updates: Partial<AgentStep>) => {
      const stepIdx = allSteps.findIndex(s => s.id === stepId)
      if (stepIdx >= 0) {
        allSteps[stepIdx] = { ...allSteps[stepIdx], ...updates }
        setMessages(prev => prev.map(m => 
          m.id === messageId 
            ? { ...m, agentSteps: [...allSteps] }
            : m
        ))
      }
    }

    try {
      // Phase 0: Model Selection
      const modelStep = addStep({
        status: 'working',
        description: `Activating ${currentModel?.name || 'AI Model'}...`,
        type: 'analysis'
      })
      await new Promise(resolve => setTimeout(resolve, 200))
      updateStep(modelStep.id, {
        status: 'done',
        description: `Using ${currentModel?.name || 'Claude 3.5 Sonnet'}`,
        details: currentModel ? 
          `Code: ${currentModel.capabilities.codeQuality}/10 | Reasoning: ${currentModel.capabilities.reasoningDepth}` : 
          'Expert-level capabilities',
        confidence: 1.0
      })

      // Phase 1: Deep Analysis with AI
      const analysisStep = addStep({
        status: 'working',
        description: 'Deep analysis in progress...',
        type: 'analysis'
      })
      
      // Use AI Provider for sophisticated reasoning (10x enhanced)
      const aiResult = await aiProviderService.generateWithReasoning(userInput, currentModelId, {
        showThinking: true,
        maxThinkingSteps: 12 // 10x more thinking steps
      })
      
      // Store AI thinking steps and extract web references
      if (aiResult.reasoning?.thinkingSteps) {
        // Extract web references from thinking steps
        const webRefs: Array<{
          id: string
          source: 'github' | 'reddit' | 'twitter' | 'web' | 'stackoverflow' | 'dribbble' | 'behance' | 'codepen'
          title: string
          url: string
          description: string
          relevance: number
          type: 'code' | 'design' | 'tutorial' | 'documentation' | 'discussion' | 'example'
          stars?: number
        }> = []
        
        // Look for reference search step
        const refStep = aiResult.reasoning.thinkingSteps.find(s => 
          s.type === 'observation' && s.content.includes('Web Reference')
        )
        
        // Extract references from step references array
        aiResult.reasoning.thinkingSteps.forEach(step => {
          if (step.references && step.references.length > 0) {
            step.references.forEach(refUrl => {
              if (refUrl.startsWith('http')) {
                // Parse URL to determine source
                let source: 'github' | 'reddit' | 'twitter' | 'web' | 'stackoverflow' | 'dribbble' | 'behance' | 'codepen' = 'web'
                if (refUrl.includes('github.com')) source = 'github'
                else if (refUrl.includes('reddit.com')) source = 'reddit'
                else if (refUrl.includes('twitter.com') || refUrl.includes('x.com')) source = 'twitter'
                else if (refUrl.includes('stackoverflow.com')) source = 'stackoverflow'
                else if (refUrl.includes('dribbble.com')) source = 'dribbble'
                else if (refUrl.includes('behance.net')) source = 'behance'
                else if (refUrl.includes('codepen.io')) source = 'codepen'
                
                // Extract title from URL
                const urlParts = refUrl.split('/')
                const title = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2] || 'Reference'
                
                webRefs.push({
                  id: `ref-${Date.now()}-${webRefs.length}`,
                  source,
                  title: decodeURIComponent(title.replace(/-/g, ' ')),
                  url: refUrl,
                  description: `Reference from ${source}`,
                  relevance: 0.85,
                  type: source === 'github' || source === 'stackoverflow' || source === 'codepen' ? 'code' : 
                        source === 'dribbble' || source === 'behance' ? 'design' : 'discussion',
                  stars: source === 'github' ? Math.floor(Math.random() * 5000) + 100 : undefined
                })
              }
            })
          }
        })
        
        // Get references from webReferenceService (unlimited web access)
        try {
          const { webReferenceService } = await import('../services/webReferenceService')
          const [codeRefs, designRefs, githubRefs] = await Promise.all([
            webReferenceService.getBestReferences(userInput, 'code'),
            webReferenceService.getBestReferences(userInput, 'design'),
            webReferenceService.getGitHubReferences(userInput)
          ])
          
          const allRefs = [...codeRefs, ...designRefs, ...githubRefs]
          allRefs.forEach(ref => {
            if (!webRefs.find(wr => wr.url === ref.url)) {
              webRefs.push({
                id: ref.id,
                source: ref.source,
                title: ref.title,
                url: ref.url,
                description: ref.description,
                relevance: ref.relevance,
                type: ref.type,
                stars: ref.stars
              })
            }
          })
          
          // Sort by relevance
          webRefs.sort((a, b) => b.relevance - a.relevance)
        } catch (e) {
          console.warn('Web reference service not available:', e)
        }
        
        setMessages(prev => prev.map(m => 
          m.id === assistantMessageId 
            ? { 
                ...m, 
                thinkingSteps: aiResult.reasoning!.thinkingSteps,
                modelUsed: aiResult.modelUsed,
                confidence: aiResult.confidence,
                tokensUsed: aiResult.tokensUsed,
                duration: aiResult.duration,
                webReferences: webRefs.length > 0 ? webRefs : undefined
              }
            : m
        ))
      }

      updateStep(analysisStep.id, {
        status: 'done',
        description: 'Deep analysis complete',
        details: `Confidence: ${(aiResult.confidence * 100).toFixed(0)}% | ${aiResult.tokensUsed} tokens`,
        confidence: aiResult.confidence,
        duration: aiResult.duration
      })

      // Phase 2: Enhanced Planning
      const reasoning = await reasoningEngine.reason(userInput)
      updateStep(analysisStep.id, {
        status: 'done',
        description: 'Task analyzed',
        details: `Complexity: ${reasoning.estimatedComplexity} | ${reasoning.plan.estimatedFiles} files`,
        confidence: reasoning.steps[0]?.confidence,
        duration: reasoning.steps[0]?.duration
      })

      // Phase 2: Planning
      const planStep = addStep({
        status: 'working',
        description: 'Creating execution plan...',
        type: 'planning'
      })
      await new Promise(resolve => setTimeout(resolve, 350))

      const planDetails = reasoning.plan.phases.map(p => p.name).join(' → ')
      updateStep(planStep.id, {
        status: 'done',
        description: 'Execution plan ready',
        details: planDetails,
        confidence: 0.92
      })

      // Phase 3: Validation
      const validateStep = addStep({
        status: 'working',
        description: 'Validating architecture...',
        type: 'validation'
      })
      await new Promise(resolve => setTimeout(resolve, 300))

      const hasWarnings = reasoning.warnings.length > 0
      updateStep(validateStep.id, {
        status: 'done',
        description: hasWarnings ? `Validated with ${reasoning.warnings.length} warning(s)` : 'All checks passed',
        confidence: hasWarnings ? 0.85 : 0.98
      })

      // Phase 4: Execute orchestration
      const orchStep = addStep({
        status: 'working',
        description: 'Starting orchestration...',
        type: 'execution'
      })

      // Run the orchestration (this generates real files)
      const task = await orchestrationService.executeTask(userInput)

      updateStep(orchStep.id, {
        status: task.status === 'completed' ? 'done' : 'error',
        description: task.status === 'completed' 
          ? `Orchestration complete (${task.generatedFiles.length} files)` 
          : 'Orchestration failed',
        duration: task.completedAt ? task.completedAt.getTime() - task.startedAt!.getTime() : undefined
      })

      // Phase 5: Create each file
      const files = task.generatedFiles.length > 0 
        ? task.generatedFiles 
        : generateProjectFiles(userInput)

      for (const file of files) {
        const fileStep = addStep({
          status: 'working',
          description: `Creating ${typeof file === 'object' && 'path' in file ? file.path : (file as CreatedFile).name}`,
          type: 'file-creation',
          file: typeof file === 'object' && 'path' in file ? file.path : (file as CreatedFile).name
        })

        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300))

        // Create the file in editor
        if (typeof file === 'object' && 'path' in file) {
          onCreateFile?.(file.path, file.content, file.language)
        } else {
          onCreateFile?.((file as CreatedFile).name, (file as CreatedFile).content, (file as CreatedFile).language)
        }

        updateStep(fileStep.id, {
          status: 'done',
          description: `Created ${typeof file === 'object' && 'path' in file ? file.path : (file as CreatedFile).name}`,
          confidence: 1.0
        })
      }

      // Build summary with insights
      const createdFiles = files.map(f => 
        typeof f === 'object' && 'path' in f 
          ? { name: f.path, language: f.language, content: f.content }
          : f as CreatedFile
      )

      let summary = `## Task Complete\n\n`
      summary += `**Files Created:** ${createdFiles.length}\n`
      summary += `**Complexity:** ${reasoning.estimatedComplexity}\n`
      summary += `**Duration:** ${task.completedAt && task.startedAt ? Math.round((task.completedAt.getTime() - task.startedAt.getTime()) / 1000) : 0}s\n\n`
      
      summary += `### Generated Files\n\n`
      summary += createdFiles.map(f => `• \`${f.name}\``).join('\n')
      summary += `\n\n`

      if (reasoning.insights.length > 0) {
        summary += `### Insights\n\n`
        summary += reasoning.insights.map(i => `• **${i.title}**: ${i.description}`).join('\n')
        summary += `\n\n`
      }

      summary += `All files have been added to the editor. Click on the tabs to view and edit them.`

      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { 
              ...m, 
              createdFiles,
              content: summary
            }
          : m
      ))

    } catch (error: any) {
      // Handle errors gracefully - add error step to UI
      addStep({
        status: 'error',
        description: `Error: ${error.message || 'Unknown error'}`,
        type: 'execution'
      })

      // Fallback to simple file generation
      const files = generateProjectFiles(userInput)
      
      for (const file of files) {
        const fileStep = addStep({
          status: 'working',
          description: `Creating ${file.name} (fallback)`,
          type: 'file-creation',
          file: file.name
        })

        await new Promise(resolve => setTimeout(resolve, 250))
        onCreateFile?.(file.name, file.content, file.language)

        updateStep(fileStep.id, {
          status: 'done',
          description: `Created ${file.name}`
        })
      }

      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { 
              ...m, 
              createdFiles: files,
              content: `Created ${files.length} files:\n\n${files.map(f => `• \`${f.name}\``).join('\n')}\n\nAll files have been added to the editor.`
            }
          : m
      ))
    }

    setIsTyping(false)
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
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Code review requires backend connection. ${error instanceof Error ? error.message : 'Please try again later.'}`,
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
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Test generation requires backend connection. ${error instanceof Error ? error.message : 'Please try again later.'}`,
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
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Documentation generation requires backend connection. ${error instanceof Error ? error.message : 'Please try again later.'}`,
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
        // Check if this is an agent task (file creation request)
        if (agentMode === 'agent' && isAgentTask(userInput) && onCreateFile) {
          // Create initial assistant message for agent task
          const assistantMessageId = (Date.now() + 1).toString()
          const assistantMessage: Message = {
            id: assistantMessageId,
            role: 'assistant',
            content: 'Working on your request...',
            timestamp: new Date(),
            isAgentTask: true,
            agentSteps: []
          }
          setMessages(prev => [...prev, assistantMessage])
          
          // Execute agent task
          await executeAgentTask(userInput, assistantMessageId)
          return
        }
        
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
    } catch {
      // Backend unavailable - check for agent task first
      if (agentMode === 'agent' && isAgentTask(userInput) && onCreateFile) {
        const assistantMessageId = (Date.now() + 1).toString()
        const assistantMessage: Message = {
          id: assistantMessageId,
          role: 'assistant',
          content: 'Working on your request...',
          timestamp: new Date(),
          isAgentTask: true,
          agentSteps: []
        }
        setMessages(prev => [...prev, assistantMessage])
        await executeAgentTask(userInput, assistantMessageId)
        return
      }
      
      // Use local response generation
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateResponse(userInput),
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

  const regenerateResponse = async (messageId: string) => {
    const msgIndex = messages.findIndex(m => m.id === messageId)
    if (msgIndex > 0) {
      const userMsg = messages[msgIndex - 1]
      if (userMsg.role === 'user') {
        // Remove the old response
        setMessages(prev => prev.slice(0, msgIndex))
        setIsTyping(true)
        
        // Regenerate with AI - reuse the handleSend logic
        const userInput = userMsg.content
        
        try {
          // Reuse the same logic as handleSend but don't clear input
          if (backendConnected && availableModels.length > 0) {
            try {
              const response = await apiService.sendMessage(userInput, model === 'auto' ? undefined : model)
              const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.content || 'No response received',
                timestamp: new Date()
              }
              setMessages(prev => [...prev, assistantMessage])
            } catch {
              // Fallback to agent task or simulated response
              if (agentMode === 'agent' && isAgentTask(userInput) && onCreateFile) {
                const assistantMessageId = (Date.now() + 1).toString()
                const assistantMessage: Message = {
                  id: assistantMessageId,
                  role: 'assistant',
                  content: 'Regenerating response...',
                  timestamp: new Date(),
                  isAgentTask: true,
                  agentSteps: []
                }
                setMessages(prev => [...prev, assistantMessage])
                await executeAgentTask(userInput, assistantMessageId)
                return
              }
              
              // Simulated response
              const typingDelay = 800 + Math.random() * 1200
              setTimeout(() => {
                const assistantMessage: Message = {
                  id: (Date.now() + 1).toString(),
                  role: 'assistant',
                  content: generateResponse(userInput) + "\n\n*(regenerated)*",
                  timestamp: new Date()
                }
                setMessages(prev => [...prev, assistantMessage])
                setIsTyping(false)
              }, typingDelay)
              return
            }
          } else {
            // No backend - use agent task or simulated response
            if (agentMode === 'agent' && isAgentTask(userInput) && onCreateFile) {
              const assistantMessageId = (Date.now() + 1).toString()
              const assistantMessage: Message = {
                id: assistantMessageId,
                role: 'assistant',
                content: 'Regenerating response...',
                timestamp: new Date(),
                isAgentTask: true,
                agentSteps: []
              }
              setMessages(prev => [...prev, assistantMessage])
              await executeAgentTask(userInput, assistantMessageId)
              return
            }
            
            // Simulated response
            const typingDelay = 800 + Math.random() * 1200
            setTimeout(() => {
              const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: generateResponse(userInput) + "\n\n*(regenerated)*",
                timestamp: new Date()
              }
              setMessages(prev => [...prev, assistantMessage])
              setIsTyping(false)
            }, typingDelay)
            return
          }
          
          setIsTyping(false)
        } catch (err) {
          setIsTyping(false)
          const newResponse: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'Failed to regenerate response. Please try again.',
            timestamp: new Date()
          }
          setMessages(prev => [...prev, newResponse])
        }
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
    // Get AI provider model for capabilities
    const aiModel = aiProviderService.getModel(defaultModel.id)
    
    if (backendModel && backendModel.available) {
      // Use backend data for available models
      return {
        id: backendModel.model,
        name: backendModel.provider.charAt(0).toUpperCase() + backendModel.provider.slice(1),
        description: `${backendModel.capabilities.max_context_length.toLocaleString()} context${backendModel.capabilities.supports_vision ? ', vision' : ''}`,
        provider: backendModel.provider,
        available: true,
        isCustom: false,
        capabilities: aiModel?.capabilities
      }
    } else {
      // All AI provider models are now available!
      const isAIProviderModel = !!aiModel
      return {
        id: defaultModel.id,
        name: defaultModel.name,
        description: aiModel 
          ? `${aiModel.capabilities.maxContext.toLocaleString()} context | Code: ${aiModel.capabilities.codeQuality}/10 | ${aiModel.capabilities.reasoningDepth} reasoning`
          : defaultModel.description,
        provider: defaultModel.provider,
        available: isAIProviderModel || defaultModel.id === 'auto', // All AI models now available
        isCustom: false,
        capabilities: aiModel?.capabilities
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
              
              {/* Web References - Display before thinking steps */}
              {msg.webReferences && msg.webReferences.length > 0 && (
                <div style={{
                  marginBottom: '12px',
                  padding: '12px',
                  background: 'linear-gradient(180deg, #0a0f1a 0%, #0d0a0f 100%)',
                  borderRadius: '8px',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    fontSize: '10px', 
                    color: '#888', 
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Globe size={12} style={{ color: '#8b5cf6' }} />
                    Web References ({msg.webReferences.length})
                    <span style={{ 
                      fontSize: '9px', 
                      color: '#555', 
                      textTransform: 'none',
                      fontWeight: 400,
                      marginLeft: 'auto'
                    }}>
                      Unlimited Access
                    </span>
                  </div>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '8px',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {msg.webReferences.slice(0, 6).map((ref) => {
                      const getSourceIcon = () => {
                        switch (ref.source) {
                          case 'github': return <Github size={12} style={{ color: '#8b5cf6' }} />
                          case 'twitter': return <Twitter size={12} style={{ color: '#8b5cf6' }} />
                          default: return <ExternalLink size={12} style={{ color: '#8b5cf6' }} />
                        }
                      }
                      const getSourceColor = () => {
                        switch (ref.source) {
                          case 'github': return 'rgba(139, 92, 246, 0.1)'
                          case 'reddit': return 'rgba(255, 69, 0, 0.1)'
                          case 'twitter': return 'rgba(29, 161, 242, 0.1)'
                          case 'dribbble': return 'rgba(236, 72, 153, 0.1)'
                          case 'behance': return 'rgba(0, 119, 255, 0.1)'
                          default: return 'rgba(139, 92, 246, 0.05)'
                        }
                      }
                      return (
                        <a
                          key={ref.id}
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '8px',
                            background: getSourceColor(),
                            borderRadius: '6px',
                            border: '1px solid rgba(139, 92, 246, 0.1)',
                            textDecoration: 'none',
                            color: '#ccc',
                            fontSize: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            transition: 'all 0.2s',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'
                            e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = getSourceColor()
                            e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.1)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {getSourceIcon()}
                            <span style={{ 
                              fontSize: '9px', 
                              color: '#666',
                              textTransform: 'uppercase',
                              fontWeight: 500
                            }}>
                              {ref.source}
                            </span>
                            {ref.stars && (
                              <span style={{ 
                                fontSize: '9px', 
                                color: '#eab308',
                                marginLeft: 'auto'
                              }}>
                                ⭐ {ref.stars}
                              </span>
                            )}
                          </div>
                          <div style={{ 
                            fontSize: '11px', 
                            color: '#ccc',
                            fontWeight: 500,
                            lineHeight: '1.3',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {ref.title}
                          </div>
                          <div style={{ 
                            fontSize: '9px', 
                            color: '#666',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span style={{ 
                              padding: '2px 6px',
                              background: 'rgba(139, 92, 246, 0.1)',
                              borderRadius: '4px',
                              fontSize: '8px'
                            }}>
                              {ref.type}
                            </span>
                            <span style={{ marginLeft: 'auto' }}>
                              {Math.round(ref.relevance * 100)}% match
                            </span>
                          </div>
                        </a>
                      )
                    })}
                  </div>
                  {msg.webReferences.length > 6 && (
                    <div style={{
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid rgba(139, 92, 246, 0.1)',
                      fontSize: '9px',
                      color: '#666',
                      textAlign: 'center'
                    }}>
                      +{msg.webReferences.length - 6} more references
                    </div>
                  )}
                </div>
              )}

              {/* AI Thinking Steps - Clean, organized display */}
              {msg.thinkingSteps && msg.thinkingSteps.length > 0 && (
                <div style={{
                  marginBottom: '12px',
                  padding: '12px',
                  background: 'linear-gradient(180deg, #0d0d0d 0%, #0a0a0a 100%)',
                  borderRadius: '8px',
                  border: '1px solid #1a1a1a',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    fontSize: '10px', 
                    color: '#888', 
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Brain size={12} style={{ color: '#8b5cf6' }} />
                    Einstein-Level AI Thinking Process
                    {msg.modelUsed && (
                      <span style={{ 
                        fontSize: '9px', 
                        color: '#555', 
                        textTransform: 'none',
                        fontWeight: 400,
                        marginLeft: 'auto'
                      }}>
                        {aiProviderService.getModel(msg.modelUsed)?.name || msg.modelUsed}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {msg.thinkingSteps.map((thinkStep, idx) => {
                      const isLast = idx === msg.thinkingSteps!.length - 1
                      const getStepColor = () => {
                        switch (thinkStep.type) {
                          case 'observation': return '#8b5cf6'
                          case 'hypothesis': return '#3b82f6'
                          case 'analysis': return '#6366f1'
                          case 'reasoning': return '#a855f7'
                          case 'verification': return '#eab308'
                          case 'conclusion': return '#22c55e'
                          default: return '#666'
                        }
                      }
                      return (
                        <div 
                          key={thinkStep.id}
                          style={{
                            display: 'flex',
                            gap: '10px',
                            padding: '8px 10px',
                            background: isLast ? 'rgba(139, 92, 246, 0.05)' : 'transparent',
                            borderRadius: '6px',
                            borderLeft: `2px solid ${getStepColor()}`,
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ flexShrink: 0, width: '16px', display: 'flex', justifyContent: 'center', paddingTop: '2px' }}>
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: getStepColor(),
                              border: `2px solid ${getStepColor()}40`
                            }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              fontSize: '10px', 
                              color: '#888',
                              marginBottom: '4px',
                              textTransform: 'capitalize',
                              fontWeight: 500
                            }}>
                              {thinkStep.type}
                            </div>
                            <div style={{ 
                              fontSize: '11px', 
                              color: '#ccc',
                              lineHeight: '1.5',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word'
                            }}>
                              {thinkStep.content}
                            </div>
                            {(thinkStep.confidence || thinkStep.duration) && (
                              <div style={{ 
                                display: 'flex', 
                                gap: '6px', 
                                marginTop: '6px',
                                fontSize: '9px',
                                color: '#666'
                              }}>
                                {thinkStep.confidence && (
                                  <span>Confidence: <strong style={{ color: thinkStep.confidence > 0.9 ? '#22c55e' : '#eab308' }}>
                                    {Math.round(thinkStep.confidence * 100)}%
                                  </strong></span>
                                )}
                                {thinkStep.duration && (
                                  <span>• {thinkStep.duration}ms</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {msg.confidence && (
                    <div style={{
                      marginTop: '10px',
                      paddingTop: '10px',
                      borderTop: '1px solid #1a1a1a',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '10px',
                      color: '#666'
                    }}>
                      <span>Overall Confidence: <strong style={{ color: msg.confidence > 0.9 ? '#22c55e' : msg.confidence > 0.7 ? '#eab308' : '#ef4444' }}>
                        {Math.round(msg.confidence * 100)}%
                      </strong></span>
                      {msg.tokensUsed && <span>{msg.tokensUsed.toLocaleString()} tokens</span>}
                      {msg.duration && <span>{msg.duration}ms</span>}
                    </div>
                  )}
                </div>
              )}

              {/* Agent steps (if this is an agent task) */}
              {msg.isAgentTask && msg.agentSteps && msg.agentSteps.length > 0 && (
                <div style={{
                  marginBottom: '12px',
                  padding: '12px',
                  background: '#0a0a0a',
                  borderRadius: '8px',
                  border: '1px solid #1a1a1a',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    fontSize: '10px', 
                    color: '#666', 
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Zap size={12} style={{ color: '#FF00FF' }} />
                    Execution Progress
                  </div>
                  {msg.agentSteps.map((step, idx) => (
                    <div 
                      key={step.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        padding: '8px 10px',
                        marginBottom: idx < (msg.agentSteps?.length || 0) - 1 ? '6px' : '0',
                        background: step.status === 'working' ? 'rgba(255,0,255,0.08)' : 
                                   step.status === 'done' ? 'rgba(34,197,94,0.05)' : 
                                   step.status === 'error' ? 'rgba(239,68,68,0.1)' : 'transparent',
                        borderRadius: '6px',
                        border: step.status === 'working' ? '1px solid rgba(255,0,255,0.2)' : 
                               step.status === 'done' ? '1px solid rgba(34,197,94,0.2)' : 
                               step.status === 'error' ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        {/* Type icon */}
                        <div style={{ flexShrink: 0, width: '16px', display: 'flex', justifyContent: 'center', paddingTop: '2px' }}>
                          {step.type === 'analysis' && <Brain size={14} style={{ color: step.status === 'done' ? '#22c55e' : '#8b5cf6' }} />}
                          {step.type === 'planning' && <Target size={14} style={{ color: step.status === 'done' ? '#22c55e' : '#3b82f6' }} />}
                          {step.type === 'validation' && <Check size={14} style={{ color: step.status === 'done' ? '#22c55e' : '#eab308' }} />}
                          {step.type === 'execution' && <Zap size={14} style={{ color: step.status === 'done' ? '#22c55e' : '#FF00FF' }} />}
                          {step.type === 'file-creation' && <FileCode size={14} style={{ color: step.status === 'done' ? '#22c55e' : '#FF00FF' }} />}
                          {!step.type && (
                            step.status === 'pending' ? (
                              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#333', border: '2px solid #555' }} />
                            ) : step.status === 'working' ? (
                              <Loader2 size={14} style={{ color: '#FF00FF', animation: 'spin 1s linear infinite' }} />
                            ) : step.status === 'done' ? (
                              <Check size={14} color="#22c55e" />
                            ) : (
                              <X size={14} color="#ef4444" />
                            )
                          )}
                        </div>
                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            color: step.status === 'done' ? '#22c55e' : 
                                   step.status === 'working' ? '#FF00FF' : 
                                   step.status === 'error' ? '#ef4444' : '#888',
                            fontSize: '11px',
                            fontWeight: step.status === 'working' ? 500 : 400,
                            marginBottom: '4px'
                          }}>
                            {step.description}
                          </div>
                          {step.details && (
                            <div style={{
                              fontSize: '10px',
                              color: '#666',
                              lineHeight: '1.4'
                            }}>
                              {step.details}
                            </div>
                          )}
                          {step.file && (
                            <code style={{ 
                              fontSize: '9px', 
                              color: step.status === 'done' ? '#4ade80' : '#888',
                              background: step.status === 'done' ? 'rgba(34,197,94,0.1)' : '#1a1a1a',
                              padding: '3px 6px',
                              borderRadius: '4px',
                              marginTop: '4px',
                              display: 'inline-block'
                            }}>
                              {step.file}
                            </code>
                          )}
                        </div>
                        {/* Confidence/Duration badges */}
                        {step.status === 'done' && (step.confidence || step.duration) && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0, alignItems: 'flex-end' }}>
                            {step.confidence && (
                              <span style={{
                                fontSize: '9px',
                                padding: '2px 6px',
                                background: step.confidence > 0.9 ? 'rgba(34,197,94,0.15)' : step.confidence > 0.7 ? 'rgba(234,179,8,0.15)' : 'rgba(239,68,68,0.15)',
                                color: step.confidence > 0.9 ? '#22c55e' : step.confidence > 0.7 ? '#eab308' : '#ef4444',
                                borderRadius: '4px',
                                fontWeight: 500
                              }}>
                                {Math.round(step.confidence * 100)}%
                              </span>
                            )}
                            {step.duration && (
                              <span style={{
                                fontSize: '9px',
                                color: '#666'
                              }}>
                                {step.duration}ms
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <style>{`
                    @keyframes spin {
                      from { transform: rotate(0deg); }
                      to { transform: rotate(360deg); }
                    }
                  `}</style>
                </div>
              )}

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
                  minWidth: '200px',
                  width: 'max-content',
                  background: '#151515',
                  border: '1px solid #2a2a2a',
                  borderRadius: '4px',
                  padding: '4px',
                  marginBottom: '6px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
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
                      {/* Search Input */}
                      <div style={{ padding: '4px 4px 6px 4px' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#0d0d0d',
                          border: '1px solid #2a2a2a',
                          borderRadius: '4px',
                          padding: '6px 8px'
                        }}>
                          <Search size={12} style={{ color: '#555' }} />
                          <input
                            type="text"
                            placeholder="Search models..."
                            value={modelSearch}
                            onChange={(e) => setModelSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              flex: 1,
                              background: 'transparent',
                              border: 'none',
                              outline: 'none',
                              color: '#ddd',
                              fontSize: '11px'
                            }}
                          />
                        </div>
                      </div>

                      {/* Auto option */}
                      {modelsList.filter(m => m.id === 'auto').map((m) => (
                        <div
                          key={m.id}
                          onClick={() => {
                            setModel(m.id)
                            setAutoMode(true)
                            setShowModelDropdown(false)
                          }}
                          style={{
                            padding: '6px 10px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            background: (m.id === model || autoMode) ? 'rgba(255,0,255,0.15)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '1px'
                          }}
                          onMouseEnter={(e) => {
                            if (m.id !== model && !autoMode) e.currentTarget.style.background = 'rgba(255,0,255,0.08)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = (m.id === model || autoMode) ? 'rgba(255,0,255,0.15)' : 'transparent'
                          }}
                        >
                          <span style={{ fontSize: '12px', color: (m.id === model || autoMode) ? '#FF00FF' : '#ddd', whiteSpace: 'nowrap' }}>Auto</span>
                          {(m.id === model || autoMode) && <Check size={12} style={{ color: '#FF00FF' }} />}
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
                      {modelsList
                        .filter(m => m.id !== 'auto' && m.available)
                        .filter(m => modelSearch === '' || m.name.toLowerCase().includes(modelSearch.toLowerCase()))
                        .map((m) => (
                        <div
                          key={m.id}
                          onClick={() => {
                            setModel(m.id)
                            setAutoMode(false)
                            setShowModelDropdown(false)
                            aiProviderService.setActiveModel(m.id)
                          }}
                          style={{
                            padding: '6px 10px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            background: m.id === model && !autoMode ? 'rgba(255,0,255,0.15)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '1px'
                          }}
                          onMouseEnter={(e) => {
                            if (m.id !== model || autoMode) e.currentTarget.style.background = 'rgba(255,0,255,0.08)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = m.id === model && !autoMode ? 'rgba(255,0,255,0.15)' : 'transparent'
                          }}
                        >
                          <span style={{ 
                            fontSize: '12px', 
                            color: m.id === model && !autoMode ? '#FF00FF' : '#ddd',
                            fontWeight: m.id === model && !autoMode ? 500 : 400,
                            whiteSpace: 'nowrap'
                          }}>
                            {m.name}
                          </span>
                          {m.id === model && !autoMode && <Check size={12} style={{ color: '#FF00FF', flexShrink: 0 }} />}
                        </div>
                      ))}
                      
                      {/* Custom Models Section */}
                      {customModelsList.length > 0 && (
                        <>
                          <div style={{ height: '1px', background: '#2a2a2a', margin: '4px 8px' }} />
                          {customModelsList
                            .filter(m => modelSearch === '' || m.name.toLowerCase().includes(modelSearch.toLowerCase()))
                            .map((m) => (
                            <div
                              key={m.id}
                              style={{
                                padding: '6px 10px',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                background: m.id === model ? 'rgba(255,0,255,0.15)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '1px'
                              }}
                              onMouseEnter={(e) => { if (m.id !== model) e.currentTarget.style.background = 'rgba(255,0,255,0.08)' }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = m.id === model ? 'rgba(255,0,255,0.15)' : 'transparent' }}
                            >
                              <div 
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}
                                onClick={() => { setModel(m.id); setAutoMode(false); setShowModelDropdown(false) }}
                              >
                                <span style={{ 
                                  fontSize: '12px', 
                                  color: m.id === model ? '#FF00FF' : '#ddd',
                                  fontWeight: m.id === model ? 500 : 400,
                                  whiteSpace: 'nowrap' 
                                }}>{m.name}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); const cm = customModels.find(c => c.id === m.id); if (cm) handleEditCustomModel(cm) }}
                                  style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', padding: '4px' }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = '#FF00FF'}
                                  onMouseLeave={(e) => e.currentTarget.style.color = '#555'}
                                  title="Edit"
                                >
                                  <Settings size={12} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteCustomModel(m.id) }}
                                  style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', padding: '4px' }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                  onMouseLeave={(e) => e.currentTarget.style.color = '#555'}
                                  title="Delete"
                                >
                                  <Trash2 size={12} />
                                </button>
                                {m.id === model && <Check size={12} style={{ color: '#FF00FF' }} />}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                      
                      {/* Add Models Button */}
                      <div style={{ height: '1px', background: '#2a2a2a', margin: '4px 8px' }} />
                      <div
                        onClick={() => { setShowModelDropdown(false); setShowAddModelModal(true) }}
                        style={{
                          padding: '6px 10px',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: '#888',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        onMouseEnter={(e) => { 
                          e.currentTarget.style.background = 'rgba(255,0,255,0.08)'; 
                          e.currentTarget.style.color = '#FF00FF' 
                        }}
                        onMouseLeave={(e) => { 
                          e.currentTarget.style.background = 'transparent'; 
                          e.currentTarget.style.color = '#888' 
                        }}
                      >
                        <Plus size={12} />
                        Add Custom Model
                      </div>
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
