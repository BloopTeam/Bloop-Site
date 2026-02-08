/**
 * Bot Memory System
 * 
 * Persistent memory for bots — stores findings, tracks issues,
 * deduplicates across runs, and injects historical context into
 * future executions. This is what makes bots smarter over time.
 */
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BotFinding {
  id: string
  botId: string
  specialization: string
  severity: 'critical' | 'warning' | 'info'
  category: string                 // e.g. "security", "performance", "style"
  title: string                    // Short description
  detail: string                   // Full explanation
  file?: string                    // File path where found
  line?: number                    // Line number (approximate)
  status: 'open' | 'resolved' | 'ignored' | 'duplicate'
  firstFoundAt: string
  lastSeenAt: string
  occurrences: number              // How many times this was found
  resolvedAt?: string
  hash: string                     // Content hash for deduplication
}

export interface BotMemoryEntry {
  botId: string
  specialization: string
  runAt: string
  filesAnalyzed: number
  issuesFound: number
  findings: BotFinding[]
  summary: string
  provider: string
  model?: string
  durationMs?: number
}

export interface BotKnowledge {
  botId: string
  specialization: string
  totalRuns: number
  totalFindings: number
  openFindings: BotFinding[]
  resolvedFindings: number
  lastRunAt: string | null
  patterns: string[]               // Recurring patterns detected
}

// ─── Memory Store ───────────────────────────────────────────────────────────

const MEMORY_DIR = path.resolve(process.cwd(), '.bloop', 'memory')
const MAX_FINDINGS_PER_BOT = 200
const MAX_HISTORY_PER_BOT = 50

// Ensure memory directory exists
function ensureMemoryDir(): void {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true })
  }
}

function memoryPath(botId: string): string {
  return path.join(MEMORY_DIR, `${botId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`)
}

function simpleHash(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex').slice(0, 16)
}

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Load all memory for a specific bot.
 */
export function loadBotMemory(botId: string): {
  history: BotMemoryEntry[]
  findings: BotFinding[]
} {
  ensureMemoryDir()
  const filePath = memoryPath(botId)

  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(raw)
    }
  } catch {
    console.warn(`[BotMemory] Failed to load memory for ${botId}`)
  }

  return { history: [], findings: [] }
}

/**
 * Save bot memory to disk.
 */
function saveBotMemory(botId: string, data: { history: BotMemoryEntry[]; findings: BotFinding[] }): void {
  ensureMemoryDir()
  const filePath = memoryPath(botId)

  // Trim old entries
  data.history = data.history.slice(-MAX_HISTORY_PER_BOT)
  data.findings = data.findings.slice(-MAX_FINDINGS_PER_BOT)

  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.warn(`[BotMemory] Failed to save memory for ${botId}:`, err)
  }
}

/**
 * Parse AI response to extract structured findings.
 * Uses multiple heuristics to pull out issues from free-text responses.
 */
export function extractFindings(
  botId: string,
  specialization: string,
  response: string,
): BotFinding[] {
  const findings: BotFinding[] = []
  const now = new Date().toISOString()

  // Pattern 1: Lines with severity markers
  const severityPatterns = [
    { pattern: /\*\*(?:critical|CRITICAL)[:\s*]*\*?\*?\s*(.+)/gi, severity: 'critical' as const },
    { pattern: /\*\*(?:warning|WARNING|WARN)[:\s*]*\*?\*?\s*(.+)/gi, severity: 'warning' as const },
    { pattern: /\*\*(?:info|INFO|note|NOTE)[:\s*]*\*?\*?\s*(.+)/gi, severity: 'info' as const },
    { pattern: /\b(?:critical|CRITICAL):\s*(.+)/gi, severity: 'critical' as const },
    { pattern: /\b(?:warning|WARNING):\s*(.+)/gi, severity: 'warning' as const },
  ]

  for (const { pattern, severity } of severityPatterns) {
    let match
    while ((match = pattern.exec(response)) !== null) {
      const title = match[1].replace(/\*+/g, '').trim().substring(0, 200)
      if (title.length < 5) continue

      // Try to extract file path from nearby context
      const contextStart = Math.max(0, match.index - 200)
      const context = response.substring(contextStart, match.index + match[0].length + 200)
      const fileMatch = context.match(/[`']?([a-zA-Z0-9_\-/.]+\.(ts|tsx|js|jsx|rs|py|css|json|md))[`']?/)

      const hash = simpleHash(`${specialization}:${severity}:${title.toLowerCase().substring(0, 50)}`)

      findings.push({
        id: `finding-${hash}-${Date.now()}`,
        botId,
        specialization,
        severity,
        category: categorizeFromSpecialization(specialization),
        title,
        detail: context.trim().substring(0, 500),
        file: fileMatch?.[1],
        status: 'open',
        firstFoundAt: now,
        lastSeenAt: now,
        occurrences: 1,
        hash,
      })
    }
  }

  // Pattern 2: Numbered issues (1. Issue description, 2. Issue description, etc.)
  const numberedPattern = /^\s*\d+\.\s+\*?\*?(.+?)$/gm
  let numMatch
  while ((numMatch = numberedPattern.exec(response)) !== null) {
    const title = numMatch[1].replace(/\*+/g, '').trim().substring(0, 200)
    if (title.length < 10) continue
    // Skip if it's a generic header or instruction
    if (/^(summary|findings|recommendations|analysis|overview|key|note|step|next)/i.test(title)) continue

    // Determine severity from content
    const lower = title.toLowerCase()
    let severity: 'critical' | 'warning' | 'info' = 'info'
    if (lower.includes('critical') || lower.includes('vulnerability') || lower.includes('security')) {
      severity = 'critical'
    } else if (lower.includes('warning') || lower.includes('bug') || lower.includes('error')) {
      severity = 'warning'
    }

    const hash = simpleHash(`${specialization}:${severity}:${title.toLowerCase().substring(0, 50)}`)

    // Deduplicate within this extraction
    if (findings.some(f => f.hash === hash)) continue

    findings.push({
      id: `finding-${hash}-${Date.now()}`,
      botId,
      specialization,
      severity,
      category: categorizeFromSpecialization(specialization),
      title,
      detail: '',
      status: 'open',
      firstFoundAt: now,
      lastSeenAt: now,
      occurrences: 1,
      hash,
    })
  }

  return findings
}

function categorizeFromSpecialization(spec: string): string {
  const map: Record<string, string> = {
    'code-reviewer': 'quality',
    'test-engineer': 'testing',
    'security-auditor': 'security',
    'docs-writer': 'documentation',
    'optimizer': 'performance',
    'debugger': 'bugs',
    'architect': 'architecture',
    'ceo': 'management',
  }
  return map[spec] || 'general'
}

/**
 * Record a bot run and its findings. Deduplicates with existing findings.
 */
export function recordBotRun(
  botId: string,
  specialization: string,
  response: string,
  meta: {
    filesAnalyzed: number
    provider: string
    model?: string
    durationMs?: number
    summary: string
  }
): {
  entry: BotMemoryEntry
  newFindings: number
  deduplicatedFindings: number
  totalOpenFindings: number
} {
  const memory = loadBotMemory(botId)
  const extracted = extractFindings(botId, specialization, response)

  // Deduplicate against existing findings
  let newCount = 0
  let dedupCount = 0

  for (const finding of extracted) {
    const existing = memory.findings.find(f => f.hash === finding.hash && f.status === 'open')
    if (existing) {
      // Update existing
      existing.lastSeenAt = finding.lastSeenAt
      existing.occurrences++
      dedupCount++
    } else {
      // New finding
      memory.findings.push(finding)
      newCount++
    }
  }

  // Create history entry
  const entry: BotMemoryEntry = {
    botId,
    specialization,
    runAt: new Date().toISOString(),
    filesAnalyzed: meta.filesAnalyzed,
    issuesFound: extracted.length,
    findings: extracted,
    summary: meta.summary,
    provider: meta.provider,
    model: meta.model,
    durationMs: meta.durationMs,
  }

  memory.history.push(entry)
  saveBotMemory(botId, memory)

  const totalOpen = memory.findings.filter(f => f.status === 'open').length

  return {
    entry,
    newFindings: newCount,
    deduplicatedFindings: dedupCount,
    totalOpenFindings: totalOpen,
  }
}

/**
 * Build a context string from bot memory to inject into future prompts.
 * This gives bots awareness of their previous findings.
 */
export function buildMemoryContext(botId: string, maxTokens: number = 4000): string {
  const memory = loadBotMemory(botId)

  if (memory.findings.length === 0 && memory.history.length === 0) {
    return ''
  }

  const parts: string[] = [
    '\n--- HISTORICAL CONTEXT (from your previous runs) ---\n',
  ]

  // Open findings summary
  const openFindings = memory.findings.filter(f => f.status === 'open')
  if (openFindings.length > 0) {
    parts.push(`You have ${openFindings.length} open findings from previous runs:\n`)

    // Group by severity
    const critical = openFindings.filter(f => f.severity === 'critical')
    const warnings = openFindings.filter(f => f.severity === 'warning')
    const info = openFindings.filter(f => f.severity === 'info')

    if (critical.length > 0) {
      parts.push(`CRITICAL (${critical.length}):`)
      for (const f of critical.slice(0, 5)) {
        parts.push(`  - ${f.title}${f.file ? ` (${f.file})` : ''} [seen ${f.occurrences}x]`)
      }
    }
    if (warnings.length > 0) {
      parts.push(`WARNING (${warnings.length}):`)
      for (const f of warnings.slice(0, 5)) {
        parts.push(`  - ${f.title}${f.file ? ` (${f.file})` : ''} [seen ${f.occurrences}x]`)
      }
    }
    if (info.length > 0) {
      parts.push(`INFO (${info.length}):`)
      for (const f of info.slice(0, 3)) {
        parts.push(`  - ${f.title}${f.file ? ` (${f.file})` : ''}`)
      }
    }

    parts.push('')
    parts.push('IMPORTANT: Do NOT re-report findings you\'ve already found unless the code has changed.')
    parts.push('Focus on NEW issues or check if previous findings have been resolved.')
  }

  // Recent run summaries
  const recentRuns = memory.history.slice(-3)
  if (recentRuns.length > 0) {
    parts.push(`\nRecent runs (${recentRuns.length}):`)
    for (const run of recentRuns) {
      parts.push(`  - ${run.runAt}: ${run.filesAnalyzed} files, ${run.issuesFound} issues — "${run.summary.substring(0, 100)}"`)
    }
  }

  parts.push('\n--- END HISTORICAL CONTEXT ---\n')

  // Trim to token budget (conservative: ~3.5 chars per token for mixed text)
  const result = parts.join('\n')
  const maxChars = Math.floor(maxTokens * 3.5)
  if (result.length > maxChars) {
    // Truncate gracefully at a newline boundary instead of mid-line
    const truncated = result.substring(0, maxChars)
    const lastNewline = truncated.lastIndexOf('\n')
    return (lastNewline > maxChars * 0.5 ? truncated.substring(0, lastNewline) : truncated) + '\n[... memory truncated to fit token budget]'
  }

  return result
}

/**
 * Get knowledge summary for a bot (for UI display).
 */
export function getBotKnowledge(botId: string, specialization: string): BotKnowledge {
  const memory = loadBotMemory(botId)
  const openFindings = memory.findings.filter(f => f.status === 'open')
  const resolvedFindings = memory.findings.filter(f => f.status === 'resolved').length

  // Detect recurring patterns
  const patterns: string[] = []
  const recurring = openFindings.filter(f => f.occurrences >= 3)
  if (recurring.length > 0) {
    patterns.push(`${recurring.length} recurring issues (found 3+ times)`)
  }
  const bySeverity = {
    critical: openFindings.filter(f => f.severity === 'critical').length,
    warning: openFindings.filter(f => f.severity === 'warning').length,
    info: openFindings.filter(f => f.severity === 'info').length,
  }
  if (bySeverity.critical > 0) patterns.push(`${bySeverity.critical} critical issues`)
  if (bySeverity.warning > 0) patterns.push(`${bySeverity.warning} warnings`)

  return {
    botId,
    specialization,
    totalRuns: memory.history.length,
    totalFindings: memory.findings.length,
    openFindings,
    resolvedFindings,
    lastRunAt: memory.history.length > 0 ? memory.history[memory.history.length - 1].runAt : null,
    patterns,
  }
}

/**
 * Mark a finding as resolved (when the user fixes it or ignores it).
 */
export function resolveFinding(botId: string, findingId: string, status: 'resolved' | 'ignored' = 'resolved'): boolean {
  const memory = loadBotMemory(botId)
  const finding = memory.findings.find(f => f.id === findingId)
  if (!finding) return false

  finding.status = status
  finding.resolvedAt = new Date().toISOString()
  saveBotMemory(botId, memory)
  return true
}

/**
 * Get all open findings across all bots (for dashboard).
 */
export function getAllOpenFindings(): BotFinding[] {
  ensureMemoryDir()
  const allFindings: BotFinding[] = []

  try {
    const files = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.json'))
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(MEMORY_DIR, file), 'utf-8')
        const data = JSON.parse(raw)
        if (Array.isArray(data.findings)) {
          allFindings.push(...data.findings.filter((f: BotFinding) => f.status === 'open'))
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  return allFindings.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3)
  })
}
