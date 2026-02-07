/**
 * Bot Team Service
 * 
 * Enables users to create a full team of individually specialised AI bots
 * that work on their project 24/7 in the background via OpenClaw orchestration.
 * 
 * Each bot has a specialization, assigned AI model, task queue, and work log.
 * Bots execute autonomously on a configurable schedule using OpenClaw skills.
 */

import { openClawService } from './openclaw'

// ─── Types ───────────────────────────────────────────────────────────────────

export type BotSpecialization =
  | 'code-reviewer'
  | 'test-engineer'
  | 'security-auditor'
  | 'docs-writer'
  | 'optimizer'
  | 'debugger'
  | 'architect'

export type BotStatus = 'active' | 'idle' | 'working' | 'paused' | 'error'

export interface BotPreferences {
  targetPaths: string[]          // Files/dirs this bot focuses on
  excludePaths: string[]         // Files/dirs to ignore
  scheduleMinutes: number        // How often to run (in minutes)
  autoApprove: boolean           // Auto-apply suggestions or require approval
  maxTasksPerCycle: number       // Max tasks per execution cycle
  priority: 'low' | 'medium' | 'high'
  customInstructions?: string    // User's custom guidance for this bot
}

export interface BotTask {
  id: string
  botId: string
  description: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  result?: string
  error?: string
  startedAt?: string
  completedAt?: string
  duration?: number
  filesAffected?: string[]
  suggestions?: string[]
}

export interface BotWorkLogEntry {
  id: string
  timestamp: string
  action: string
  summary: string
  details?: string
  filesChanged?: string[]
  issuesFound?: number
  suggestionsGiven?: number
}

export interface TeamBot {
  id: string
  name: string
  specialization: BotSpecialization
  model: string                  // AI model ID (claude-opus-4-6, gpt-4o, etc.)
  status: BotStatus
  avatar: string                 // Emoji avatar
  description: string
  preferences: BotPreferences
  taskQueue: BotTask[]
  workLog: BotWorkLogEntry[]
  stats: {
    tasksCompleted: number
    tasksFailed: number
    issuesFound: number
    suggestionsGiven: number
    totalRuntime: number         // milliseconds
    lastRunAt?: string
    cyclesCompleted: number
  }
  createdAt: string
  updatedAt: string
}

export interface TeamConfig {
  teamName: string
  enabled: boolean               // Master switch for all bots
  projectPath: string            // Root project path
  maxConcurrentBots: number      // How many bots can run at once
  notifyOnComplete: boolean
  notifyOnError: boolean
}

// ─── Specialization Definitions ──────────────────────────────────────────────

export const BOT_SPECIALIZATIONS: Record<BotSpecialization, {
  name: string
  description: string
  avatar: string
  skill: string                   // OpenClaw skill to execute
  defaultModel: string
  defaultInstructions: string
  capabilities: string[]
}> = {
  'code-reviewer': {
    name: 'Code Reviewer',
    description: 'Reviews code quality, style consistency, and identifies bugs. Catches issues before they reach production.',
    avatar: '🔍',
    skill: 'bloop-code-review',
    defaultModel: 'claude-opus-4-6',
    defaultInstructions: 'Review all changed files for code quality, potential bugs, style issues, and adherence to project conventions. Provide specific, actionable feedback.',
    capabilities: ['code-analysis', 'bug-detection', 'style-review', 'best-practices']
  },
  'test-engineer': {
    name: 'Test Engineer',
    description: 'Generates and maintains test suites. Ensures coverage for new code and finds untested edge cases.',
    avatar: '🧪',
    skill: 'bloop-test-gen',
    defaultModel: 'gpt-4o',
    defaultInstructions: 'Generate comprehensive unit and integration tests for recently changed code. Cover edge cases, error paths, and ensure high coverage.',
    capabilities: ['unit-testing', 'integration-testing', 'edge-case-coverage', 'test-maintenance']
  },
  'security-auditor': {
    name: 'Security Auditor',
    description: 'Continuously scans for vulnerabilities, dependency risks, and security anti-patterns.',
    avatar: '🛡️',
    skill: 'bloop-security',
    defaultModel: 'claude-opus-4-6',
    defaultInstructions: 'Scan the codebase for security vulnerabilities including OWASP Top 10, dependency risks, exposed secrets, and insecure patterns. Prioritize by severity.',
    capabilities: ['vulnerability-scanning', 'dependency-audit', 'secret-detection', 'owasp-analysis']
  },
  'docs-writer': {
    name: 'Documentation Writer',
    description: 'Keeps documentation in sync with code changes. Generates API docs, README updates, and inline comments.',
    avatar: '📝',
    skill: 'bloop-docs',
    defaultModel: 'gemini-2.0-flash',
    defaultInstructions: 'Generate and update documentation for changed code. Create clear API references, update README sections, and add meaningful inline comments where missing.',
    capabilities: ['api-docs', 'readme-generation', 'inline-comments', 'changelog-updates']
  },
  'optimizer': {
    name: 'Performance Optimizer',
    description: 'Profiles code for performance bottlenecks and suggests optimizations for speed and memory usage.',
    avatar: '⚡',
    skill: 'bloop-optimize',
    defaultModel: 'gemini-2.0-flash',
    defaultInstructions: 'Analyze code for performance bottlenecks, unnecessary re-renders, memory leaks, and optimization opportunities. Suggest concrete improvements with benchmarks.',
    capabilities: ['performance-profiling', 'memory-optimization', 'render-optimization', 'bundle-analysis']
  },
  'debugger': {
    name: 'Bug Hunter',
    description: 'Proactively hunts for bugs, race conditions, and logic errors before users report them.',
    avatar: '🐛',
    skill: 'bloop-debug',
    defaultModel: 'claude-opus-4-6',
    defaultInstructions: 'Analyze code for potential bugs, race conditions, null pointer risks, logic errors, and edge cases. Think through execution paths and identify where things could go wrong.',
    capabilities: ['bug-detection', 'race-condition-analysis', 'logic-validation', 'error-path-analysis']
  },
  'architect': {
    name: 'Architect',
    description: 'Reviews code structure, suggests refactoring, and ensures the project follows clean architecture principles.',
    avatar: '🏗️',
    skill: 'bloop-refactor',
    defaultModel: 'mistral-large-2512',
    defaultInstructions: 'Analyze the project architecture for structural issues, code smells, and refactoring opportunities. Ensure clean separation of concerns, proper abstractions, and maintainability.',
    capabilities: ['architecture-review', 'refactoring', 'dependency-analysis', 'pattern-detection']
  }
}

// ─── Bot Team Service ────────────────────────────────────────────────────────

type EventCallback = (...args: any[]) => void

class BotTeamService {
  private bots: Map<string, TeamBot> = new Map()
  private config: TeamConfig
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map()
  private listeners: Map<string, EventCallback[]> = new Map()
  private executionLock: Set<string> = new Set()
  private readonly STORAGE_KEY = 'bloop-bot-team'
  private readonly CONFIG_KEY = 'bloop-bot-team-config'

  constructor() {
    this.config = this.loadConfig()
    this.loadBots()
    // Resume active bots on init
    if (this.config.enabled) {
      this.resumeActiveBots()
    }
  }

  // ─── Event System ────────────────────────────────────────────────────

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
    return () => {
      const cbs = this.listeners.get(event)
      if (cbs) {
        const idx = cbs.indexOf(callback)
        if (idx !== -1) cbs.splice(idx, 1)
      }
    }
  }

  private emit(event: string, ...args: any[]) {
    const cbs = this.listeners.get(event)
    if (cbs) cbs.forEach(cb => cb(...args))
  }

  // ─── Team Config ─────────────────────────────────────────────────────

  getConfig(): TeamConfig {
    return { ...this.config }
  }

  updateConfig(updates: Partial<TeamConfig>): TeamConfig {
    this.config = { ...this.config, ...updates }
    this.saveConfig()
    this.emit('config-updated', this.config)

    // If master switch toggled
    if (updates.enabled === false) {
      this.pauseAllBots()
    } else if (updates.enabled === true) {
      this.resumeActiveBots()
    }

    return this.config
  }

  // ─── Bot CRUD ────────────────────────────────────────────────────────

  getBots(): TeamBot[] {
    return Array.from(this.bots.values())
  }

  getBot(id: string): TeamBot | undefined {
    return this.bots.get(id)
  }

  getActiveBots(): TeamBot[] {
    return this.getBots().filter(b => b.status === 'active' || b.status === 'working')
  }

  createBot(spec: BotSpecialization, overrides?: {
    name?: string
    model?: string
    preferences?: Partial<BotPreferences>
  }): TeamBot {
    const specDef = BOT_SPECIALIZATIONS[spec]
    const id = `bot-${spec}-${Date.now()}`

    const bot: TeamBot = {
      id,
      name: overrides?.name || specDef.name,
      specialization: spec,
      model: overrides?.model || specDef.defaultModel,
      status: 'idle',
      avatar: specDef.avatar,
      description: specDef.description,
      preferences: {
        targetPaths: ['src/'],
        excludePaths: ['node_modules/', 'dist/', '.git/'],
        scheduleMinutes: 30,
        autoApprove: false,
        maxTasksPerCycle: 5,
        priority: 'medium',
        customInstructions: specDef.defaultInstructions,
        ...(overrides?.preferences || {})
      },
      taskQueue: [],
      workLog: [],
      stats: {
        tasksCompleted: 0,
        tasksFailed: 0,
        issuesFound: 0,
        suggestionsGiven: 0,
        totalRuntime: 0,
        cyclesCompleted: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.bots.set(id, bot)
    this.saveBots()
    this.emit('bot-created', bot)
    return bot
  }

  updateBot(id: string, updates: Partial<Pick<TeamBot, 'name' | 'model' | 'preferences'>>): TeamBot {
    const bot = this.bots.get(id)
    if (!bot) throw new Error(`Bot ${id} not found`)

    if (updates.name) bot.name = updates.name
    if (updates.model) bot.model = updates.model
    if (updates.preferences) {
      bot.preferences = { ...bot.preferences, ...updates.preferences }
    }
    bot.updatedAt = new Date().toISOString()

    this.saveBots()
    this.emit('bot-updated', bot)
    return bot
  }

  deleteBot(id: string): void {
    this.stopBot(id)
    this.bots.delete(id)
    this.saveBots()
    this.emit('bot-deleted', id)
  }

  // ─── Bot Lifecycle ───────────────────────────────────────────────────

  startBot(id: string): void {
    const bot = this.bots.get(id)
    if (!bot) throw new Error(`Bot ${id} not found`)
    if (bot.status === 'working') return // Already running a task

    bot.status = 'active'
    bot.updatedAt = new Date().toISOString()
    this.saveBots()
    this.emit('bot-status-changed', bot)

    // Schedule periodic execution
    this.scheduleBot(id)

    // Run immediately on start
    this.executeBot(id)
  }

  stopBot(id: string): void {
    const bot = this.bots.get(id)
    if (!bot) return

    // Clear interval
    const interval = this.intervals.get(id)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(id)
    }

    bot.status = 'paused'
    bot.updatedAt = new Date().toISOString()
    this.saveBots()
    this.emit('bot-status-changed', bot)
  }

  startAllBots(): void {
    this.bots.forEach((bot) => {
      if (bot.status !== 'working') {
        this.startBot(bot.id)
      }
    })
  }

  pauseAllBots(): void {
    this.bots.forEach((bot) => {
      if (bot.status !== 'paused') {
        this.stopBot(bot.id)
      }
    })
  }

  private resumeActiveBots(): void {
    this.bots.forEach((bot) => {
      // Resume bots that were active before (not explicitly paused)
      if (bot.status === 'active' || bot.status === 'idle') {
        this.scheduleBot(bot.id)
        bot.status = 'active'
      }
    })
    this.saveBots()
  }

  private scheduleBot(id: string): void {
    // Clear existing interval
    const existing = this.intervals.get(id)
    if (existing) clearInterval(existing)

    const bot = this.bots.get(id)
    if (!bot) return

    const intervalMs = bot.preferences.scheduleMinutes * 60 * 1000
    const interval = setInterval(() => {
      if (this.config.enabled && bot.status === 'active') {
        this.executeBot(id)
      }
    }, intervalMs)

    this.intervals.set(id, interval)
  }

  // ─── Bot Execution ───────────────────────────────────────────────────

  async executeBot(id: string): Promise<BotTask | null> {
    const bot = this.bots.get(id)
    if (!bot) return null
    if (this.executionLock.has(id)) return null // Already executing

    // Check concurrent limit
    const runningCount = Array.from(this.executionLock).length
    if (runningCount >= this.config.maxConcurrentBots) {
      this.addWorkLog(bot, 'queued', 'Waiting for execution slot — max concurrent bots reached')
      return null
    }

    this.executionLock.add(id)
    const previousStatus = bot.status
    bot.status = 'working'
    this.emit('bot-status-changed', bot)

    const task: BotTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      botId: id,
      description: `${BOT_SPECIALIZATIONS[bot.specialization].name} cycle`,
      status: 'running',
      startedAt: new Date().toISOString()
    }
    bot.taskQueue.push(task)
    this.emit('task-started', task)

    const startTime = Date.now()

    try {
      // Execute via backend API which routes through OpenClaw
      const response = await fetch('/api/v1/openclaw/team/bots/' + id + '/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialization: bot.specialization,
          model: bot.model,
          skill: BOT_SPECIALIZATIONS[bot.specialization].skill,
          preferences: bot.preferences,
          context: {
            targetPaths: bot.preferences.targetPaths,
            excludePaths: bot.preferences.excludePaths,
            customInstructions: bot.preferences.customInstructions,
            projectPath: this.config.projectPath
          }
        })
      })

      const result = await response.json()
      const duration = Date.now() - startTime

      if (result.error) {
        throw new Error(result.error)
      }

      // Update task
      task.status = 'completed'
      task.result = result.response || result.summary
      task.completedAt = new Date().toISOString()
      task.duration = duration
      task.filesAffected = result.filesAffected || []
      task.suggestions = result.suggestions || []

      // Update stats
      bot.stats.tasksCompleted++
      bot.stats.totalRuntime += duration
      bot.stats.cyclesCompleted++
      bot.stats.lastRunAt = new Date().toISOString()
      bot.stats.issuesFound += result.issuesFound || 0
      bot.stats.suggestionsGiven += result.suggestionsGiven || 0

      // Add work log
      this.addWorkLog(bot, 'completed', 
        result.summary || `${BOT_SPECIALIZATIONS[bot.specialization].name} completed analysis`,
        result.response,
        result.filesAffected,
        result.issuesFound,
        result.suggestionsGiven
      )

      this.emit('task-completed', task)
      if (this.config.notifyOnComplete) {
        this.emit('notification', { type: 'success', bot, task })
      }

    } catch (error) {
      const duration = Date.now() - startTime
      const errMsg = error instanceof Error ? error.message : 'Unknown error'

      task.status = 'failed'
      task.error = errMsg
      task.completedAt = new Date().toISOString()
      task.duration = duration

      bot.stats.tasksFailed++
      bot.stats.totalRuntime += duration

      this.addWorkLog(bot, 'error', `Execution failed: ${errMsg}`)

      this.emit('task-failed', task)
      if (this.config.notifyOnError) {
        this.emit('notification', { type: 'error', bot, task })
      }
    } finally {
      this.executionLock.delete(id)
      bot.status = previousStatus === 'working' ? 'active' : previousStatus
      if (bot.status !== 'paused') bot.status = 'active'
      bot.updatedAt = new Date().toISOString()

      // Trim task queue to last 50
      if (bot.taskQueue.length > 50) {
        bot.taskQueue = bot.taskQueue.slice(-50)
      }

      this.saveBots()
      this.emit('bot-status-changed', bot)
    }

    return task
  }

  // Manual trigger — run a specific bot right now regardless of schedule
  async runNow(id: string): Promise<BotTask | null> {
    return this.executeBot(id)
  }

  // ─── Work Log ────────────────────────────────────────────────────────

  private addWorkLog(
    bot: TeamBot,
    action: string,
    summary: string,
    details?: string,
    filesChanged?: string[],
    issuesFound?: number,
    suggestionsGiven?: number
  ) {
    const entry: BotWorkLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
      action,
      summary,
      details,
      filesChanged,
      issuesFound,
      suggestionsGiven
    }
    bot.workLog.push(entry)

    // Keep last 100 entries
    if (bot.workLog.length > 100) {
      bot.workLog = bot.workLog.slice(-100)
    }
  }

  getWorkLog(botId: string): BotWorkLogEntry[] {
    const bot = this.bots.get(botId)
    return bot ? [...bot.workLog].reverse() : []
  }

  // ─── Quick Setup — Create a full team in one call ────────────────────

  createDefaultTeam(): TeamBot[] {
    const specs: BotSpecialization[] = [
      'code-reviewer',
      'test-engineer',
      'security-auditor',
      'docs-writer',
      'optimizer',
      'debugger',
      'architect'
    ]

    const created: TeamBot[] = []
    for (const spec of specs) {
      // Don't duplicate
      const existing = this.getBots().find(b => b.specialization === spec)
      if (!existing) {
        created.push(this.createBot(spec))
      }
    }
    return created
  }

  // ─── Team Stats ──────────────────────────────────────────────────────

  getTeamStats() {
    const bots = this.getBots()
    return {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === 'active' || b.status === 'working').length,
      totalTasksCompleted: bots.reduce((sum, b) => sum + b.stats.tasksCompleted, 0),
      totalIssuesFound: bots.reduce((sum, b) => sum + b.stats.issuesFound, 0),
      totalSuggestions: bots.reduce((sum, b) => sum + b.stats.suggestionsGiven, 0),
      totalRuntime: bots.reduce((sum, b) => sum + b.stats.totalRuntime, 0),
      isEnabled: this.config.enabled
    }
  }

  // ─── Persistence ─────────────────────────────────────────────────────

  private saveBots(): void {
    try {
      const data = Array.from(this.bots.entries())
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
      console.warn('Failed to save bot team:', e)
    }
  }

  private loadBots(): void {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      if (data) {
        const entries: [string, TeamBot][] = JSON.parse(data)
        entries.forEach(([id, bot]) => {
          // Reset working status on load (server restarted)
          if (bot.status === 'working') bot.status = 'active'
          this.bots.set(id, bot)
        })
      }
    } catch (e) {
      console.warn('Failed to load bot team:', e)
    }
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config))
    } catch (e) {
      console.warn('Failed to save bot team config:', e)
    }
  }

  private loadConfig(): TeamConfig {
    try {
      const data = localStorage.getItem(this.CONFIG_KEY)
      if (data) return JSON.parse(data)
    } catch (e) {
      console.warn('Failed to load bot team config:', e)
    }
    return {
      teamName: 'My Bot Team',
      enabled: false,
      projectPath: '.',
      maxConcurrentBots: 3,
      notifyOnComplete: true,
      notifyOnError: true
    }
  }

  // Cleanup on destroy
  destroy(): void {
    this.intervals.forEach(interval => clearInterval(interval))
    this.intervals.clear()
    this.executionLock.clear()
    this.listeners.clear()
  }
}

export const botTeamService = new BotTeamService()
