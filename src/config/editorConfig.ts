/**
 * Comprehensive editor configuration system for Bloop IDE
 * Manages themes, keybindings, editor settings, and user preferences
 */

export interface EditorTheme {
  name: string
  colors: ThemeColors
  syntax: SyntaxHighlighting
  ui: UIColors
}

export interface ThemeColors {
  background: string
  foreground: string
  selection: string
  cursor: string
  lineHighlight: string
  gutter: string
  gutterForeground: string
}

export interface SyntaxHighlighting {
  keyword: string
  string: string
  number: string
  comment: string
  function: string
  class: string
  variable: string
  operator: string
  type: string
}

export interface UIColors {
  primary: string
  secondary: string
  accent: string
  border: string
  hover: string
  active: string
  error: string
  warning: string
  success: string
  info: string
}

export interface EditorSettings {
  fontSize: number
  fontFamily: string
  lineHeight: number
  tabSize: number
  insertSpaces: boolean
  wordWrap: 'off' | 'on' | 'wordWrapColumn' | 'bounded'
  lineNumbers: 'on' | 'off' | 'relative'
  minimap: boolean
  cursorStyle: 'line' | 'block' | 'underline'
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid'
  autoSave: 'off' | 'afterDelay' | 'onFocusChange' | 'onWindowChange'
  autoSaveDelay: number
  formatOnSave: boolean
  formatOnPaste: boolean
  trimTrailingWhitespace: boolean
  insertFinalNewline: boolean
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'all'
  bracketPairColorization: boolean
  guides: {
    indentation: boolean
    highlightActiveIndentation: boolean
    bracketPairs: boolean
  }
}

export interface KeyBinding {
  key: string
  command: string
  when?: string
  args?: unknown
}

/**
 * Default Bloop theme configuration
 */
export const defaultTheme: EditorTheme = {
  name: 'Bloop Dark',
  colors: {
    background: '#0a0a0a',
    foreground: '#cccccc',
    selection: 'rgba(255, 0, 255, 0.2)',
    cursor: '#FF00FF',
    lineHighlight: '#1a1a1a',
    gutter: '#0a0a0a',
    gutterForeground: '#444444'
  },
  syntax: {
    keyword: '#FF00FF',
    string: '#a5d6ff',
    number: '#79c0ff',
    comment: '#6e7681',
    function: '#d2a8ff',
    class: '#ffa657',
    variable: '#ffa657',
    operator: '#ff7b72',
    type: '#ffa657'
  },
  ui: {
    primary: '#000000',
    secondary: '#0a0a0a',
    accent: '#FF00FF',
    border: '#1a1a1a',
    hover: 'rgba(255, 0, 255, 0.1)',
    active: 'rgba(255, 0, 255, 0.15)',
    error: '#f85149',
    warning: '#f0883e',
    success: '#3fb950',
    info: '#58a6ff'
  }
}

/**
 * Default editor settings
 */
export const defaultSettings: EditorSettings = {
  fontSize: 14,
  fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
  lineHeight: 1.7,
  tabSize: 2,
  insertSpaces: true,
  wordWrap: 'off',
  lineNumbers: 'on',
  minimap: false,
  cursorStyle: 'line',
  cursorBlinking: 'blink',
  autoSave: 'afterDelay',
  autoSaveDelay: 1000,
  formatOnSave: true,
  formatOnPaste: false,
  trimTrailingWhitespace: true,
  insertFinalNewline: true,
  renderWhitespace: 'selection',
  bracketPairColorization: true,
  guides: {
    indentation: true,
    highlightActiveIndentation: true,
    bracketPairs: true
  }
}

/**
 * Default keybindings for Bloop IDE
 */
export const defaultKeyBindings: KeyBinding[] = [
  { key: 'ctrl+s', command: 'save' },
  { key: 'ctrl+shift+s', command: 'saveAll' },
  { key: 'ctrl+k', command: 'showCommandPalette' },
  { key: 'ctrl+p', command: 'quickOpen' },
  { key: 'ctrl+shift+p', command: 'showCommands' },
  { key: 'ctrl+b', command: 'toggleSidebar' },
  { key: 'ctrl+\\', command: 'splitEditor' },
  { key: 'ctrl+w', command: 'closeEditor' },
  { key: 'ctrl+shift+w', command: 'closeAll' },
  { key: 'ctrl+tab', command: 'nextEditor' },
  { key: 'ctrl+shift+tab', command: 'previousEditor' },
  { key: 'ctrl+/', command: 'toggleComment' },
  { key: 'ctrl+d', command: 'duplicateLine' },
  { key: 'alt+up', command: 'moveLinesUp' },
  { key: 'alt+down', command: 'moveLinesDown' },
  { key: 'ctrl+shift+k', command: 'deleteLines' },
  { key: 'ctrl+f', command: 'find' },
  { key: 'ctrl+h', command: 'replace' },
  { key: 'ctrl+shift+f', command: 'findInFiles' },
  { key: 'f2', command: 'rename' },
  { key: 'f5', command: 'run' },
  { key: 'ctrl+shift+b', command: 'build' },
  { key: 'ctrl+`', command: 'toggleTerminal' }
]

/**
 * Configuration manager class for handling user preferences
 */
export class ConfigurationManager {
  private theme: EditorTheme
  private settings: EditorSettings
  private keyBindings: KeyBinding[]
  private listeners: Set<(config: Configuration) => void> = new Set()

  constructor() {
    this.theme = defaultTheme
    this.settings = defaultSettings
    this.keyBindings = defaultKeyBindings
    this.loadFromStorage()
  }

  getTheme(): EditorTheme {
    return { ...this.theme }
  }

  getSettings(): EditorSettings {
    return { ...this.settings }
  }

  getKeyBindings(): KeyBinding[] {
    return [...this.keyBindings]
  }

  updateTheme(theme: Partial<EditorTheme>): void {
    this.theme = { ...this.theme, ...theme }
    this.saveToStorage()
    this.notifyListeners()
  }

  updateSettings(settings: Partial<EditorSettings>): void {
    this.settings = { ...this.settings, ...settings }
    this.saveToStorage()
    this.notifyListeners()
  }

  updateKeyBindings(keyBindings: KeyBinding[]): void {
    this.keyBindings = keyBindings
    this.saveToStorage()
    this.notifyListeners()
  }

  resetToDefaults(): void {
    this.theme = defaultTheme
    this.settings = defaultSettings
    this.keyBindings = defaultKeyBindings
    this.saveToStorage()
    this.notifyListeners()
  }

  subscribe(callback: (config: Configuration) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('bloop-config')
      if (stored) {
        const parsed = JSON.parse(stored)
        this.theme = parsed.theme || defaultTheme
        this.settings = parsed.settings || defaultSettings
        this.keyBindings = parsed.keyBindings || defaultKeyBindings
      }
    } catch (error) {
      console.warn('Failed to load configuration from storage:', error)
    }
  }

  private saveToStorage(): void {
    try {
      const config = {
        theme: this.theme,
        settings: this.settings,
        keyBindings: this.keyBindings
      }
      localStorage.setItem('bloop-config', JSON.stringify(config))
    } catch (error) {
      console.warn('Failed to save configuration to storage:', error)
    }
  }

  private notifyListeners(): void {
    const config = {
      theme: this.theme,
      settings: this.settings,
      keyBindings: this.keyBindings
    }
    this.listeners.forEach(listener => listener(config))
  }
}

export interface Configuration {
  theme: EditorTheme
  settings: EditorSettings
  keyBindings: KeyBinding[]
}

// Global configuration instance
export const config = new ConfigurationManager()
