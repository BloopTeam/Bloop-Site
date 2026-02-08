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
import { type RoleAllocation, DEFAULT_ROLES } from '../types/roles'

// Re-export for backward compatibility
export type { RoleAllocation } from '../types/roles'

// ─── Types ───────────────────────────────────────────────────────────────────

export type BotSpecialization =
  | 'ceo'
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
  role: RoleAllocation           // Specialized role allocation
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
  defaultRole: RoleAllocation     // Pre-configured role for this specialization
}> = {
  'ceo': {
    name: 'Engineering Director',
    description: 'L8 Engineering Director — operates like a VP Eng at Google. Decomposes tasks into parallelizable work, builds dependency graphs, risk-ranks priorities, matches specialists to sub-tasks, and synthesizes a unified report from all team outputs.',
    avatar: '👑',
    skill: 'bloop-delegate',
    defaultModel: 'claude-opus-4-6',
    defaultInstructions: 'You are an L8 Engineering Director running a world-class bot team on Opus 4.6. Your job: 1) Understand the full scope and blast radius of the task, 2) Decompose into parallelizable sub-tasks with explicit success criteria for each, 3) Match to the specialist whose domain expertise fits best — never assign security to the code reviewer or testing to the architect, 4) Set P0/P1/P2 with dependency ordering, 5) After all bots report: identify conflicts between specialist recommendations, synthesize a launch-readiness verdict, and flag anything that would block shipping.',
    capabilities: ['task-decomposition', 'dependency-graph-construction', 'specialist-matching', 'risk-weighted-prioritization', 'cross-domain-conflict-resolution', 'launch-readiness-assessment', 'post-mortem-synthesis'],
    defaultRole: DEFAULT_ROLES['ceo'],
  },
  'code-reviewer': {
    name: 'Readability Reviewer',
    description: 'L7 Staff SWE — conducts Google-style readability reviews. Proves correctness for all inputs, validates invariants, audits abstraction quality, catches performance cliffs, and enforces naming-as-documentation.',
    avatar: '🔍',
    skill: 'bloop-code-review',
    defaultModel: 'claude-opus-4-6',
    defaultInstructions: 'You are an L7 Staff SWE conducting a readability review on Opus 4.6. For every file: 1) Prove correctness — will postconditions hold for ALL valid inputs including boundaries and concurrent access? If you can\'t convince yourself by reading once, it needs to be simpler. 2) Trace every error path — does the caller get an actionable error or a generic message? 3) Assess abstraction quality — is the interface minimal, orthogonal, and hard to misuse? 4) Check naming precision — can you understand intent from signatures alone? 5) Detect performance cliffs — code that works at N=100 but breaks at N=100K. 6) Evaluate change safety — what will the next engineer get wrong? Rate as CRITICAL/WARNING/INFO with file and line.',
    capabilities: ['correctness-proof', 'invariant-verification', 'error-contract-audit', 'abstraction-quality', 'naming-review', 'performance-cliff-detection', 'change-safety-analysis', 'readability-enforcement'],
    defaultRole: DEFAULT_ROLES['code-reviewer'],
  },
  'test-engineer': {
    name: 'Test Infrastructure Lead',
    description: 'L7 Staff SETI — builds test infra like Google Testing Blog standards. Enforces hermetic tests, mutation resistance, boundary value analysis, and zero-flake determinism.',
    avatar: '🧪',
    skill: 'bloop-test-gen',
    defaultModel: 'claude-opus-4-6',
    defaultInstructions: 'You are an L7 Staff SETI running test infra on Opus 4.6. For the code: 1) Design the test suite as a behavior specification, not an implementation mirror. 2) Hermetic by default — no network, no filesystem, no system clock, no ordering deps. Comment every mock with "// Mock because: [reason]". 3) Boundary value analysis — systematically test 0, 1, N, N+1, MAX, empty, null, unicode. 4) For every happy path test, write the failure test. 5) Mutation resistance — if you delete the line being tested, does the assertion fail? Use toEqual not toBeTruthy. 6) Test names answer: what, under what conditions, expected outcome. 7) Output complete, runnable files.',
    capabilities: ['test-pyramid-enforcement', 'hermetic-test-design', 'mutation-resistance', 'boundary-value-analysis', 'error-injection', 'contract-testing', 'determinism-guarantees', 'CI-optimization'],
    defaultRole: DEFAULT_ROLES['test-engineer'],
  },
  'security-auditor': {
    name: 'Offensive Security Lead',
    description: 'L7 Staff Security Eng — Project Zero mindset applied to AppSec. Maps attack surfaces, traces input to sink, audits auth chains, reviews cryptographic hygiene, and assesses supply chain risk.',
    avatar: '🛡️',
    skill: 'bloop-security',
    defaultModel: 'claude-opus-4-6',
    defaultInstructions: 'You are an L7 Staff Security Engineer with a Project Zero mindset, running on Opus 4.6 with web search for CVE lookups. 1) Map every entry point where untrusted data enters — trace each to its sink (DB, file, shell, HTML, log). 2) For each data flow: is sanitization context-aware? Can encoding bypass it? 3) Trace the full auth chain: credential → session → token → validation. Constant-time? Sufficient entropy? 4) For every protected resource: how is ownership determined? Map horizontal and vertical escalation paths. 5) Crypto review: current algorithms? Key rotation? IV reuse? Timing side-channels? 6) Supply chain: install scripts? Maintenance status? Known compromises? 7) Information leakage: stack traces in errors? Secrets in logs? Rate as CRITICAL (exploitable)/WARNING (conditional)/INFO (hardening) with PoC and remediation.',
    capabilities: ['attack-surface-mapping', 'input-sink-tracing', 'auth-chain-analysis', 'authorization-model-audit', 'cryptographic-review', 'supply-chain-assessment', 'information-leakage-detection', 'CVE-cross-reference'],
    defaultRole: DEFAULT_ROLES['security-auditor'],
  },
  'docs-writer': {
    name: 'DevEx Writer',
    description: 'L6 Senior TW — writes docs to Google internal standards. API references with complete signatures, quickstarts under 5 minutes, error catalogs with resolutions, and progressive disclosure architecture.',
    avatar: '📝',
    skill: 'bloop-docs',
    defaultModel: 'claude-opus-4-6',
    defaultInstructions: 'You are an L6 Senior Technical Writer on Opus 4.6. 1) Every exported symbol gets JSDoc/TSDoc: what it does (one sentence), params with constraints, returns with possible values, throws with conditions, and a working example demonstrating the non-obvious case. 2) Progressive disclosure: Layer 1 = autocomplete summary, Layer 2 = the "why", Layer 3 = examples, Layer 4 = gotchas. 3) Quickstart gets a dev from zero to working in under 5 minutes — show code first, explain after. 4) Error catalog: every error code with cause, impact, and specific resolution. 5) Focus on WHY not WHAT — don\'t write "Gets the user" for getUser(), write what it actually does differently from alternatives.',
    capabilities: ['api-reference-generation', 'progressive-disclosure', 'quickstart-authoring', 'error-catalog', 'configuration-reference', 'migration-guides', 'inline-documentation', 'docs-as-code'],
    defaultRole: DEFAULT_ROLES['docs-writer'],
  },
  'optimizer': {
    name: 'Performance Engineer',
    description: 'L7 Staff Perf Eng — profiles like V8/Chrome DevTools team. Audits algorithmic complexity, detects memory churn, diagnoses React rendering pathology, analyzes I/O waterfalls, and catches tail latency issues.',
    avatar: '⚡',
    skill: 'bloop-optimize',
    defaultModel: 'claude-opus-4-6',
    defaultInstructions: 'You are an L7 Staff Performance Engineer on Opus 4.6. 1) Algorithmic audit: flag O(n²) that could be O(n) — provide the specific data structure change (e.g. "pre-built Map for O(1) lookup"). 2) Memory: object churn in hot paths, closures capturing more scope than needed, arrays growing without bound. 3) React pathology: context providers broadcasting on every change, missing memo on pure components, unstable deps in hooks, derived state stored instead of computed. 4) I/O waterfall: sequential fetches → Promise.all, missing streaming, unbatched requests. 5) Database: N+1 patterns, missing indexes on WHERE/ORDER BY, connection pool sizing. 6) Tail latency: p99 impact of GC pauses, cold starts, pool exhaustion. Rate as CRITICAL/WARNING/INFO with before/after code and complexity analysis.',
    capabilities: ['algorithmic-complexity-audit', 'memory-allocation-analysis', 'react-rendering-profiling', 'critical-path-optimization', 'IO-waterfall-analysis', 'cache-architecture', 'tail-latency-diagnosis', 'bundle-analysis'],
    defaultRole: DEFAULT_ROLES['optimizer'],
  },
  'debugger': {
    name: 'Oncall Debugger',
    description: 'L7 Staff SWE Oncall — debugs like a 3 AM production incident responder. Detects race conditions, traces null chains to source, identifies state consistency bugs, audits async correctness, and verifies resource lifecycle.',
    avatar: '🐛',
    skill: 'bloop-debug',
    defaultModel: 'claude-opus-4-6',
    defaultInstructions: 'You are an L7 Staff SWE on production oncall, running Opus 4.6. Think in failure modes, not happy paths. 1) Race conditions: shared mutable state — who reads, who writes, is ordering enforced or assumed? Flag check-then-act without atomicity. 2) Null chains: trace every property access backward to source — under what conditions is it undefined? 3) State consistency: stale closures, optimistic updates without rollback, multiple setState calls that should be atomic. 4) Async: unhandled rejections, missing awaits, Promise.all that should be allSettled, concurrent writes to same state. 5) Resource lifecycle: every addEventListener needs removeEventListener, every setInterval needs clearInterval, every connection needs cleanup on error path. 6) Edge combinatorics: empty + reduce, division by zero, DST transitions, emoji in string ops, JSON.parse on non-UTF8. For each: exact scenario, root cause, reproduction, fix. Rate CRITICAL/WARNING/INFO.',
    capabilities: ['race-condition-detection', 'null-chain-analysis', 'state-consistency-audit', 'async-correctness-verification', 'resource-lifecycle-audit', 'edge-case-combinatorics', 'regression-forensics', 'root-cause-methodology'],
    defaultRole: DEFAULT_ROLES['debugger'],
  },
  'architect': {
    name: 'Systems Architect',
    description: 'L8 Distinguished Eng — conducts design reviews at Google-scale. Evaluates design intent vs. implementation, verifies dependency DAGs, audits API contracts, runs scaling analysis, and catalogs failure modes.',
    avatar: '🏗️',
    skill: 'bloop-refactor',
    defaultModel: 'claude-opus-4-6',
    defaultInstructions: 'You are an L8 Distinguished Engineer conducting an architecture review on Opus 4.6. 1) Design intent vs. implementation — does the code reflect a coherent architecture or did it evolve through accretion? State each module\'s single responsibility in one sentence. 2) Interface quality — is the interface minimal, hard to misuse, and implementation-hiding? 3) Dependency graph — is it a DAG? Are cycles present? Is the direction correct (domain doesn\'t depend on infrastructure)? 4) State architecture — single source of truth? Derived state computed or stored? Side effects at edges or scattered? 5) API contracts — consistent naming/errors/pagination across endpoints? Backward compatible? Idempotent? 6) Scaling analysis — what bottlenecks at 10x, 100x, 1000x? 7) Operational readiness — health checks, structured logging, metrics, rollback in under 1 minute? Output prioritized refactoring plan with effort, risk, and dependencies.',
    capabilities: ['design-doc-review', 'interface-quality-audit', 'dependency-graph-verification', 'state-architecture-review', 'API-contract-design', 'scaling-analysis', 'failure-mode-catalog', 'operational-readiness-review'],
    defaultRole: DEFAULT_ROLES['architect'],
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
    role?: Partial<RoleAllocation>
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
      role: {
        ...specDef.defaultRole,
        ...(overrides?.role || {})
      },
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

  updateBot(id: string, updates: Partial<Pick<TeamBot, 'name' | 'model' | 'preferences'>> & { role?: Partial<RoleAllocation> }): TeamBot {
    const bot = this.bots.get(id)
    if (!bot) throw new Error(`Bot ${id} not found`)

    if (updates.name) bot.name = updates.name
    if (updates.model) bot.model = updates.model
    if (updates.preferences) {
      bot.preferences = { ...bot.preferences, ...updates.preferences }
    }
    if (updates.role) {
      bot.role = { ...bot.role, ...updates.role }
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
          role: bot.role,
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

  // ─── Advanced: Execute-and-Fix — bot analyzes AND writes fixes ──────
  async executeFix(id: string): Promise<{ task: BotTask | null; fixedFiles: { path: string; content: string; written: boolean }[] }> {
    const bot = this.bots.get(id)
    if (!bot) return { task: null, fixedFiles: [] }
    if (this.executionLock.has(id)) return { task: null, fixedFiles: [] }

    this.executionLock.add(id)
    const previousStatus = bot.status
    bot.status = 'working'
    this.emit('bot-status-changed', bot)

    const task: BotTask = {
      id: `task-fix-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      botId: id,
      description: `${BOT_SPECIALIZATIONS[bot.specialization].name} fix cycle`,
      status: 'running',
      startedAt: new Date().toISOString()
    }
    bot.taskQueue.push(task)
    this.emit('task-started', task)

    const startTime = Date.now()
    let fixedFiles: { path: string; content: string; written: boolean }[] = []

    try {
      const response = await fetch('/api/v1/openclaw/team/bots/' + id + '/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialization: bot.specialization,
          model: bot.model,
          skill: BOT_SPECIALIZATIONS[bot.specialization].skill,
          preferences: bot.preferences,
          role: bot.role,
          context: {
            targetPaths: bot.preferences.targetPaths,
            excludePaths: bot.preferences.excludePaths,
            customInstructions: bot.preferences.customInstructions,
          }
        })
      })

      const result = await response.json()
      const duration = Date.now() - startTime

      if (result.error) throw new Error(result.error)

      fixedFiles = result.fixedFiles || []

      task.status = 'completed'
      task.result = result.response
      task.completedAt = new Date().toISOString()
      task.duration = duration
      task.filesAffected = fixedFiles.filter(f => f.written).map(f => f.path)

      bot.stats.tasksCompleted++
      bot.stats.totalRuntime += duration
      bot.stats.cyclesCompleted++
      bot.stats.lastRunAt = new Date().toISOString()
      bot.stats.issuesFound += result.issuesFound || 0

      this.addWorkLog(bot, 'fixed',
        `Applied fixes to ${fixedFiles.filter(f => f.written).length} files`,
        result.response,
        fixedFiles.filter(f => f.written).map(f => f.path),
        result.issuesFound
      )

      this.emit('task-completed', task)
      this.emit('files-fixed', { botId: id, fixedFiles })

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Fix failed'
      task.status = 'failed'
      task.error = errMsg
      task.completedAt = new Date().toISOString()
      task.duration = Date.now() - startTime
      bot.stats.tasksFailed++
      this.addWorkLog(bot, 'error', `Fix failed: ${errMsg}`)
      this.emit('task-failed', task)
    } finally {
      this.executionLock.delete(id)
      bot.status = previousStatus === 'working' ? 'active' : previousStatus
      if (bot.status !== 'paused') bot.status = 'active'
      bot.updatedAt = new Date().toISOString()
      this.saveBots()
      this.emit('bot-status-changed', bot)
    }

    return { task, fixedFiles }
  }

  // ─── Advanced: Chain execution — multiple bots collaborate ──────────
  async executeChain(
    botIds: string[],
    onStepComplete?: (step: number, result: any) => void
  ): Promise<{
    chain: any[]
    totalFilesFixed: number
    completedSteps: number
  }> {
    const steps = botIds.map(id => {
      const bot = this.bots.get(id)
      if (!bot) return null
      return {
        botId: id,
        skill: BOT_SPECIALIZATIONS[bot.specialization].skill,
        specialization: bot.specialization,
        model: bot.model,
        role: bot.role,
      }
    }).filter(Boolean)

    if (steps.length === 0) {
      return { chain: [], totalFilesFixed: 0, completedSteps: 0 }
    }

    // Mark all chain bots as working
    botIds.forEach(id => {
      const bot = this.bots.get(id)
      if (bot) {
        bot.status = 'working'
        this.emit('bot-status-changed', bot)
      }
    })

    this.emit('chain-started', { botIds, steps: steps.length })

    try {
      const firstBot = this.bots.get(botIds[0])
      const response = await fetch('/api/v1/openclaw/team/chain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steps,
          preferences: firstBot?.preferences,
          context: {
            targetPaths: firstBot?.preferences.targetPaths || ['src/'],
            excludePaths: firstBot?.preferences.excludePaths || ['node_modules/', 'dist/'],
          }
        })
      })

      const result = await response.json()

      if (result.error) {
        const msg: string = result.error
        throw msg
      }

      // Update each bot's stats based on chain results
      (result.chain || []).forEach((stepResult: any, i: number) => {
        const bot = this.bots.get(botIds[i])
        if (bot && stepResult.status === 'completed') {
          bot.stats.tasksCompleted++
          bot.stats.cyclesCompleted++
          bot.stats.issuesFound += stepResult.issuesFound || 0
          bot.stats.lastRunAt = new Date().toISOString()
          this.addWorkLog(bot, 'chain',
            stepResult.summary || `Chain step ${i + 1} completed`,
            undefined,
            stepResult.fixedFiles,
            stepResult.issuesFound
          )
        }
        if (onStepComplete) onStepComplete(i, stepResult)
      })

      this.emit('chain-completed', result)
      return {
        chain: result.chain || [],
        totalFilesFixed: result.totalFilesFixed || 0,
        completedSteps: result.completedSteps || 0,
      }

    } catch (error) {
      this.emit('chain-failed', { error: error instanceof Error ? error.message : 'Chain failed' })
      return { chain: [], totalFilesFixed: 0, completedSteps: 0 }
    } finally {
      botIds.forEach(id => {
        const bot = this.bots.get(id)
        if (bot) {
          bot.status = 'active'
          bot.updatedAt = new Date().toISOString()
          this.emit('bot-status-changed', bot)
        }
      })
      this.saveBots()
    }
  }

  // ─── CEO Delegation — top-level task management ────────────────────
  getCEO(): TeamBot | null {
    for (const bot of this.bots.values()) {
      if (bot.specialization === 'ceo') return bot
    }
    return null
  }

  hasCEO(): boolean {
    return this.getCEO() !== null
  }

  getTeamBots(): TeamBot[] {
    // All bots except the CEO
    return this.getBots().filter(b => b.specialization !== 'ceo')
  }

  async delegateTask(
    task: string,
    callbacks?: {
      onPlanReady?: (plan: any) => void
      onBotStarted?: (botName: string, specialization: string) => void
      onBotCompleted?: (botName: string, result: any) => void
      onSynthesis?: (synthesis: string) => void
      onError?: (error: string) => void
    }
  ): Promise<{
    plan: any
    results: any[]
    synthesis: string
    stats: any
  }> {
    const ceo = this.getCEO()
    if (!ceo) {
      const error = 'No CEO bot found. Create a ClawdBot CEO first.'
      callbacks?.onError?.(error)
      return { plan: null, results: [], synthesis: '', stats: {} }
    }

    const teamBots = this.getTeamBots().filter(b => b.status !== 'error' && b.status !== 'paused')
    if (teamBots.length === 0) {
      const error = 'No team bots available. Add specialist bots to your team.'
      callbacks?.onError?.(error)
      return { plan: null, results: [], synthesis: '', stats: {} }
    }

    // Mark CEO as working
    ceo.status = 'working'
    this.emit('bot-status-changed', ceo)

    // Mark team bots as working
    teamBots.forEach(b => {
      b.status = 'working'
      this.emit('bot-status-changed', b)
    })

    this.emit('delegation-started', { ceoId: ceo.id, task, teamSize: teamBots.length })

    try {
      const response = await fetch('/api/v1/openclaw/team/delegate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          ceoBot: {
            id: ceo.id,
            name: ceo.name,
            model: ceo.model,
            role: ceo.role,
          },
          teamBots: teamBots.map(b => ({
            id: b.id,
            name: b.name,
            specialization: b.specialization,
            description: b.description,
            model: b.model,
            role: b.role,
            skill: BOT_SPECIALIZATIONS[b.specialization]?.skill,
            capabilities: BOT_SPECIALIZATIONS[b.specialization]?.capabilities || [],
          })),
          preferences: ceo.preferences,
          context: {
            targetPaths: ceo.preferences.targetPaths || ['src/'],
            excludePaths: ceo.preferences.excludePaths || ['node_modules/', 'dist/'],
          }
        })
      })

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      // Notify plan
      callbacks?.onPlanReady?.(result.plan)

      // Update CEO stats
      ceo.stats.tasksCompleted++
      ceo.stats.cyclesCompleted++
      this.addWorkLog(ceo, 'delegation',
        `Delegated: "${task}" → ${result.stats?.totalDelegated || 0} bots`,
        undefined, undefined, result.stats?.totalIssuesFound || 0
      )

      // Update individual bot stats
      for (const botResult of (result.fullResults || [])) {
        const bot = this.bots.get(botResult.botId)
        if (bot && botResult.status === 'completed') {
          bot.stats.tasksCompleted++
          bot.stats.cyclesCompleted++
          bot.stats.issuesFound += botResult.issuesFound || 0
          bot.stats.lastRunAt = new Date().toISOString()
          this.addWorkLog(bot, 'delegated-task',
            botResult.summary || `Task from CEO: ${botResult.instructions?.substring(0, 100) || 'analysis'}`,
            undefined, undefined, botResult.issuesFound
          )
          callbacks?.onBotCompleted?.(bot.name, botResult)
        }
      }

      // Notify synthesis
      if (result.synthesis) {
        callbacks?.onSynthesis?.(result.synthesis)
      }

      this.emit('delegation-completed', {
        ceoId: ceo.id,
        task,
        stats: result.stats,
      })

      return {
        plan: result.plan,
        results: result.fullResults || [],
        synthesis: result.synthesis || '',
        stats: result.stats || {},
      }

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Delegation failed'
      callbacks?.onError?.(msg)
      this.emit('delegation-failed', { ceoId: ceo.id, error: msg })
      return { plan: null, results: [], synthesis: '', stats: {} }
    } finally {
      // Reset bot statuses
      ceo.status = 'active'
      ceo.updatedAt = new Date().toISOString()
      this.emit('bot-status-changed', ceo)

      teamBots.forEach(b => {
        b.status = 'active'
        b.updatedAt = new Date().toISOString()
        this.emit('bot-status-changed', b)
      })
      this.saveBots()
    }
  }

  // ─── Advanced: Streaming execution — real-time bot activity feed ────
  async executeStream(
    id: string,
    callbacks: {
      onStatus?: (status: string, message: string) => void
      onMeta?: (provider: string, model: string) => void
      onContent?: (text: string) => void
      onDone?: (info: any) => void
      onError?: (error: string) => void
      onProgress?: (stage: string, percent: number, message: string) => void
      onMemory?: (data: { newFindings: number; deduped: number; totalOpen: number }) => void
    }
  ): Promise<void> {
    const bot = this.bots.get(id)
    if (!bot) {
      callbacks.onError?.('Bot not found')
      return
    }
    if (this.executionLock.has(id)) {
      callbacks.onError?.('Bot is already executing')
      return
    }

    this.executionLock.add(id)
    bot.status = 'working'
    this.emit('bot-status-changed', bot)

    try {
      const response = await fetch('/api/v1/openclaw/team/bots/' + id + '/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialization: bot.specialization,
          model: bot.model,
          skill: BOT_SPECIALIZATIONS[bot.specialization].skill,
          preferences: bot.preferences,
          role: bot.role,
          context: {
            targetPaths: bot.preferences.targetPaths,
            excludePaths: bot.preferences.excludePaths,
            customInstructions: bot.preferences.customInstructions,
          }
        })
      })

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            switch (event.type) {
              case 'status':
                callbacks.onStatus?.(event.status, event.message || '')
                break
              case 'meta':
                callbacks.onMeta?.(event.provider, event.model)
                break
              case 'content':
                callbacks.onContent?.(event.text)
                break
              case 'done':
                callbacks.onDone?.(event)
                break
              case 'progress':
                callbacks.onProgress?.(event.stage, event.percent, event.message)
                break
              case 'memory':
                callbacks.onMemory?.(event)
                break
              case 'error':
                callbacks.onError?.(event.error)
                break
            }
          } catch { /* skip malformed events */ }
        }
      }

      // Update stats
      bot.stats.tasksCompleted++
      bot.stats.cyclesCompleted++
      bot.stats.lastRunAt = new Date().toISOString()
      this.addWorkLog(bot, 'streamed', `${BOT_SPECIALIZATIONS[bot.specialization].name} analysis streamed`)
      this.saveBots()

    } catch (error) {
      callbacks.onError?.(error instanceof Error ? error.message : 'Stream failed')
    } finally {
      this.executionLock.delete(id)
      bot.status = 'active'
      bot.updatedAt = new Date().toISOString()
      this.saveBots()
      this.emit('bot-status-changed', bot)
    }
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
      'ceo',
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
          // Backfill role allocation for bots created before role system existed
          if (!bot.role && bot.specialization && BOT_SPECIALIZATIONS[bot.specialization]) {
            bot.role = { ...BOT_SPECIALIZATIONS[bot.specialization].defaultRole }
          }
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
