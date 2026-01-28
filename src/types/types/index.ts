/**
 * Global type definitions for Bloop UI
 */

// File system types
export interface FileNode {
  name: string
  type: 'file' | 'folder'
  path?: string
  children?: FileNode[]
  modified?: boolean
}

// Editor types
export interface EditorTab {
  id: string
  name: string
  path: string[]
  content: string
  modified: boolean
  language?: string
}

// Message types for AI assistant
export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  attachments?: Attachment[]
  metadata?: MessageMetadata
}

export interface Attachment {
  id: string
  type: 'file' | 'image' | 'code'
  name: string
  content?: string
  url?: string
}

export interface MessageMetadata {
  model?: string
  tokens?: number
  duration?: number
}

// Command types
export interface Command {
  id: string
  label: string
  category: string
  shortcut?: string
  icon?: string
  action: () => void | Promise<void>
  disabled?: boolean
}

// Extension types
export interface Extension {
  id: string
  name: string
  author: string
  description: string
  version: string
  installed: boolean
  enabled: boolean
  downloads?: string
  rating?: number
  logo?: string
}

// Git types
export interface GitChange {
  file: string
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked'
  staged: boolean
}

export interface GitBranch {
  name: string
  current: boolean
  remote?: string
  ahead?: number
  behind?: number
}

// Toast notification types
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

// Panel types
export type PanelPosition = 'left' | 'right' | 'bottom'

export interface PanelConfig {
  id: string
  position: PanelPosition
  width?: number
  height?: number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  collapsed: boolean
}

// Theme types
export interface Theme {
  name: string
  type: 'dark' | 'light'
  colors: {
    background: string
    foreground: string
    accent: string
    border: string
    error: string
    warning: string
    success: string
    info: string
  }
}

// Context menu types
export interface ContextMenuItem {
  label: string
  icon?: React.ReactNode
  shortcut?: string
  divider?: boolean
  disabled?: boolean
  danger?: boolean
  action?: () => void
  submenu?: ContextMenuItem[]
}

// Keyboard shortcut types
export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  meta?: boolean
  action: () => void
  description: string
  category: string
}

// Search types
export interface SearchResult {
  file: string
  line: number
  column?: number
  text: string
  match: string
  context?: {
    before: string
    after: string
  }
}

// Terminal types
export interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'system'
  content: string
  timestamp: Date
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

// User preferences
export interface UserPreferences {
  theme: string
  fontSize: number
  tabSize: number
  wordWrap: boolean
  minimap: boolean
  lineNumbers: boolean
  autoSave: boolean
  telemetry: boolean
}
