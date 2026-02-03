/**
 * Collaboration Service
 * Handles real-time collaboration, presence, and session management
 */

export interface CollaboratorInfo {
  id: string
  name: string
  avatar?: string
  color: string
  cursor?: { file: string; line: number; column: number }
  selection?: { file: string; startLine: number; endLine: number }
  lastActive: Date
  isAgent: boolean
}

export interface CollaborationSession {
  id: string
  name: string
  createdAt: Date
  createdBy: string
  projectPath: string
  collaborators: CollaboratorInfo[]
  isActive: boolean
  shareLink?: string
}

export interface FileChange {
  id: string
  file: string
  type: 'insert' | 'delete' | 'replace'
  position: { line: number; column: number }
  content?: string
  length?: number
  author: string
  timestamp: Date
}

export interface ConflictInfo {
  id: string
  file: string
  localChange: FileChange
  remoteChange: FileChange
  resolved: boolean
  resolution?: 'local' | 'remote' | 'merge'
}

type EventCallback = (data: unknown) => void

class CollaborationService {
  private currentSession: CollaborationSession | null = null
  private localUser: CollaboratorInfo | null = null
  private eventListeners: Map<string, Set<EventCallback>> = new Map()
  private pendingChanges: FileChange[] = []
  private conflicts: ConflictInfo[] = []
  private syncInterval: ReturnType<typeof setInterval> | null = null
  
  // Simulated collaborators for demo
  private demoCollaborators: CollaboratorInfo[] = [
    {
      id: 'agent-claude',
      name: 'Claude Agent',
      color: '#FF00FF',
      lastActive: new Date(),
      isAgent: true,
      cursor: { file: 'App.tsx', line: 45, column: 12 }
    },
    {
      id: 'agent-analyzer',
      name: 'Code Analyzer',
      color: '#22c55e',
      lastActive: new Date(Date.now() - 30000),
      isAgent: true
    }
  ]

  constructor() {
    this.initLocalUser()
  }

  private initLocalUser() {
    const storedUser = localStorage.getItem('bloop-user')
    if (storedUser) {
      this.localUser = JSON.parse(storedUser)
    } else {
      this.localUser = {
        id: `user-${Date.now()}`,
        name: 'You',
        color: '#3b82f6',
        lastActive: new Date(),
        isAgent: false
      }
      localStorage.setItem('bloop-user', JSON.stringify(this.localUser))
    }
  }

  // Event system
  on(event: string, callback: EventCallback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(callback)
  }

  off(event: string, callback: EventCallback) {
    this.eventListeners.get(event)?.delete(callback)
  }

  private emit(event: string, data: unknown) {
    this.eventListeners.get(event)?.forEach(cb => cb(data))
  }

  // Session Management
  async createSession(name: string, projectPath: string): Promise<CollaborationSession> {
    const session: CollaborationSession = {
      id: `session-${Date.now()}`,
      name,
      createdAt: new Date(),
      createdBy: this.localUser?.id || 'unknown',
      projectPath,
      collaborators: [this.localUser!, ...this.demoCollaborators],
      isActive: true,
      shareLink: `bloop://session/${Date.now().toString(36)}`
    }

    this.currentSession = session
    this.startSync()
    this.emit('session:created', session)
    this.emit('collaborators:updated', session.collaborators)
    
    // Store session
    const sessions = this.getSavedSessions()
    sessions.push(session)
    localStorage.setItem('bloop-sessions', JSON.stringify(sessions))

    return session
  }

  async joinSession(sessionId: string): Promise<CollaborationSession | null> {
    const sessions = this.getSavedSessions()
    const session = sessions.find(s => s.id === sessionId)
    
    if (session) {
      session.collaborators.push(this.localUser!)
      this.currentSession = session
      this.startSync()
      this.emit('session:joined', session)
      this.emit('collaborators:updated', session.collaborators)
      return session
    }
    
    return null
  }

  async leaveSession(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.collaborators = this.currentSession.collaborators
        .filter(c => c.id !== this.localUser?.id)
      this.emit('session:left', this.currentSession)
      this.stopSync()
      this.currentSession = null
    }
  }

  getCurrentSession(): CollaborationSession | null {
    return this.currentSession
  }

  getSavedSessions(): CollaborationSession[] {
    const stored = localStorage.getItem('bloop-sessions')
    return stored ? JSON.parse(stored) : []
  }

  getCollaborators(): CollaboratorInfo[] {
    return this.currentSession?.collaborators || []
  }

  getLocalUser(): CollaboratorInfo | null {
    return this.localUser
  }

  // Real-time sync
  private startSync() {
    if (this.syncInterval) return
    
    this.syncInterval = setInterval(() => {
      this.simulateActivity()
    }, 3000)
  }

  private stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  private simulateActivity() {
    if (!this.currentSession) return

    // Simulate agent activity
    const agents = this.currentSession.collaborators.filter(c => c.isAgent)
    agents.forEach(agent => {
      const activity = Math.random()
      
      if (activity > 0.7) {
        // Simulate cursor movement
        agent.cursor = {
          file: ['App.tsx', 'index.ts', 'components/Header.tsx'][Math.floor(Math.random() * 3)],
          line: Math.floor(Math.random() * 100) + 1,
          column: Math.floor(Math.random() * 50) + 1
        }
        agent.lastActive = new Date()
        this.emit('cursor:moved', { collaborator: agent, cursor: agent.cursor })
      }
    })

    this.emit('collaborators:updated', this.currentSession.collaborators)
  }

  // Cursor & Selection
  updateCursor(file: string, line: number, column: number) {
    if (this.localUser) {
      this.localUser.cursor = { file, line, column }
      this.localUser.lastActive = new Date()
      this.emit('cursor:moved', { collaborator: this.localUser, cursor: this.localUser.cursor })
    }
  }

  updateSelection(file: string, startLine: number, endLine: number) {
    if (this.localUser) {
      this.localUser.selection = { file, startLine, endLine }
      this.emit('selection:changed', { collaborator: this.localUser, selection: this.localUser.selection })
    }
  }

  // File Changes
  applyChange(change: Omit<FileChange, 'id' | 'author' | 'timestamp'>): FileChange {
    const fullChange: FileChange = {
      ...change,
      id: `change-${Date.now()}`,
      author: this.localUser?.id || 'unknown',
      timestamp: new Date()
    }

    this.pendingChanges.push(fullChange)
    this.emit('change:applied', fullChange)

    // Simulate broadcasting to other collaborators
    setTimeout(() => {
      this.emit('change:synced', fullChange)
    }, 100)

    return fullChange
  }

  // Conflict handling
  detectConflict(localChange: FileChange, remoteChange: FileChange): ConflictInfo | null {
    if (localChange.file !== remoteChange.file) return null
    if (localChange.position.line !== remoteChange.position.line) return null
    if (localChange.author === remoteChange.author) return null

    const conflict: ConflictInfo = {
      id: `conflict-${Date.now()}`,
      file: localChange.file,
      localChange,
      remoteChange,
      resolved: false
    }

    this.conflicts.push(conflict)
    this.emit('conflict:detected', conflict)
    return conflict
  }

  resolveConflict(conflictId: string, resolution: 'local' | 'remote' | 'merge') {
    const conflict = this.conflicts.find(c => c.id === conflictId)
    if (conflict) {
      conflict.resolved = true
      conflict.resolution = resolution
      this.emit('conflict:resolved', conflict)
    }
  }

  getConflicts(): ConflictInfo[] {
    return this.conflicts.filter(c => !c.resolved)
  }

  // Generate share link
  generateShareLink(): string {
    if (!this.currentSession) return ''
    const link = `bloop://join/${this.currentSession.id}/${Date.now().toString(36)}`
    this.currentSession.shareLink = link
    return link
  }

  // Activity feed
  getRecentActivity(): { type: string; message: string; time: Date; collaborator: string }[] {
    if (!this.currentSession) return []
    
    return [
      { type: 'join', message: 'joined the session', time: new Date(Date.now() - 60000), collaborator: 'Claude Agent' },
      { type: 'edit', message: 'edited App.tsx', time: new Date(Date.now() - 45000), collaborator: 'Claude Agent' },
      { type: 'cursor', message: 'is viewing Header.tsx', time: new Date(Date.now() - 30000), collaborator: 'Code Analyzer' },
      { type: 'analysis', message: 'completed code review', time: new Date(Date.now() - 15000), collaborator: 'Code Analyzer' }
    ]
  }
}

export const collaborationService = new CollaborationService()
