/**
 * File Intelligence Service
 * 
 * Smart file selection, content caching, and relevance scoring.
 * Ensures bots analyze the most important files first and don't
 * waste tokens on unchanged or irrelevant code.
 */
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

// ─── File Cache ─────────────────────────────────────────────────────────────

interface CachedFile {
  path: string
  content: string
  hash: string
  size: number
  mtime: number
  cachedAt: number
}

const CACHE_TTL_MS = 30_000  // 30 seconds — files don't change that fast
const MAX_CACHE_ENTRIES = 500
const fileCache = new Map<string, CachedFile>()

function hashContent(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex').substring(0, 12)
}

function getCached(filePath: string): CachedFile | null {
  const entry = fileCache.get(filePath)
  if (!entry) return null
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    fileCache.delete(filePath)
    return null
  }
  // Check mtime hasn't changed
  try {
    const stat = fs.statSync(filePath)
    if (stat.mtimeMs !== entry.mtime) {
      fileCache.delete(filePath)
      return null
    }
  } catch {
    fileCache.delete(filePath)
    return null
  }
  return entry
}

function cacheFile(filePath: string, content: string, mtime: number): CachedFile {
  // Evict oldest entries if cache is full
  if (fileCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = [...fileCache.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt)
    for (let i = 0; i < 50 && i < oldest.length; i++) {
      fileCache.delete(oldest[i][0])
    }
  }

  const entry: CachedFile = {
    path: filePath,
    content,
    hash: hashContent(content),
    size: content.length,
    mtime,
    cachedAt: Date.now(),
  }
  fileCache.set(filePath, entry)
  return entry
}

// ─── File Relevance Scoring ─────────────────────────────────────────────────

interface ScoredFile {
  path: string
  relPath: string
  score: number
  reasons: string[]
  size: number
  mtime: number
}

const SCORE_WEIGHTS = {
  RECENTLY_MODIFIED: 20,    // Changed in last hour
  FAIRLY_RECENT: 10,        // Changed in last day
  ENTRY_POINT: 15,          // index.ts, main.ts, App.tsx, etc.
  CONFIG_FILE: 8,           // package.json, tsconfig, etc.
  TEST_FILE: 5,             // *.test.ts, *.spec.ts
  SERVICE_FILE: 12,         // In services/ directory
  COMPONENT_FILE: 10,       // In components/ directory
  TYPE_FILE: 8,             // In types/ directory
  ROUTE_FILE: 12,           // In routes/ or api/ directory
  SMALL_FILE: 5,            // Under 5KB (full context)
  MEDIUM_FILE: 2,           // Under 20KB
  LARGE_FILE: -5,           // Over 20KB (expensive)
  HAS_IMPORTS: 3,           // Is imported by other files
}

function scoreFile(filePath: string, relPath: string, stat: fs.Stats): ScoredFile {
  let score = 0
  const reasons: string[] = []
  const now = Date.now()
  const name = path.basename(filePath).toLowerCase()
  const dir = path.dirname(relPath).toLowerCase()

  // Recency
  const ageMs = now - stat.mtimeMs
  if (ageMs < 3600000) { // 1 hour
    score += SCORE_WEIGHTS.RECENTLY_MODIFIED
    reasons.push('recently-modified')
  } else if (ageMs < 86400000) { // 1 day
    score += SCORE_WEIGHTS.FAIRLY_RECENT
    reasons.push('recent')
  }

  // Entry points
  if (/^(index|main|app|server|dev-server)\.(ts|tsx|js|jsx|mjs)$/i.test(name)) {
    score += SCORE_WEIGHTS.ENTRY_POINT
    reasons.push('entry-point')
  }

  // Config files
  if (/^(package\.json|tsconfig.*\.json|vite\.config.*|next\.config.*|\.eslintrc.*)$/i.test(name)) {
    score += SCORE_WEIGHTS.CONFIG_FILE
    reasons.push('config')
  }

  // Test files
  if (/\.(test|spec)\.(ts|tsx|js|jsx)$/i.test(name)) {
    score += SCORE_WEIGHTS.TEST_FILE
    reasons.push('test')
  }

  // Directory-based scoring
  if (dir.includes('service') || dir.includes('api')) {
    score += SCORE_WEIGHTS.SERVICE_FILE
    reasons.push('service/api')
  }
  if (dir.includes('component')) {
    score += SCORE_WEIGHTS.COMPONENT_FILE
    reasons.push('component')
  }
  if (dir.includes('type')) {
    score += SCORE_WEIGHTS.TYPE_FILE
    reasons.push('types')
  }
  if (dir.includes('route') || dir.includes('api')) {
    score += SCORE_WEIGHTS.ROUTE_FILE
    reasons.push('route')
  }

  // Size scoring
  if (stat.size < 5000) {
    score += SCORE_WEIGHTS.SMALL_FILE
    reasons.push('small')
  } else if (stat.size < 20000) {
    score += SCORE_WEIGHTS.MEDIUM_FILE
    reasons.push('medium')
  } else {
    score += SCORE_WEIGHTS.LARGE_FILE
    reasons.push('large')
  }

  return { path: filePath, relPath, score, reasons, size: stat.size, mtime: stat.mtimeMs }
}

// ─── Smart File Collection ──────────────────────────────────────────────────

const SAFE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.rs', '.py', '.go', '.java', '.rb', '.swift',
  '.css', '.scss', '.html', '.json', '.toml', '.yaml', '.yml',
  '.md', '.txt', '.sql', '.sh', '.dockerfile'
])

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'target', '.next',
  '.cache', 'coverage', '.turbo', '__pycache__'
])

const BLOCKED_FILES = [
  '.env', '.env.local', '.env.production', '.env.development',
  '.git/config', 'id_rsa', 'id_ed25519', '.pem', '.key', '.p12',
  'credentials.json', 'service-account.json', '.npmrc', '.pypirc'
]

const MAX_FILE_SIZE = 100_000      // 100KB per file
const MAX_TOTAL_CHARS = 400_000    // ~100K tokens — Opus 4.6 handles 200K context

function isBlockedFile(filePath: string): boolean {
  const lower = filePath.toLowerCase()
  return BLOCKED_FILES.some(blocked => lower.endsWith(blocked) || lower.includes(blocked))
}

function safePath(userPath: string, projectRoot: string): string {
  const resolved = path.resolve(projectRoot, userPath)
  if (!resolved.startsWith(projectRoot + path.sep) && resolved !== projectRoot) {
    throw new Error(`Path outside project: ${userPath}`)
  }
  return resolved
}

/**
 * Collect and score all eligible files, returning them sorted by relevance.
 */
export function collectAndScoreFiles(
  targetPaths: string[],
  excludePaths: string[],
  projectRoot: string,
): ScoredFile[] {
  const allFiles: ScoredFile[] = []

  function walk(dir: string): void {
    if (!dir.startsWith(projectRoot)) return
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        const relPath = path.relative(projectRoot, fullPath)

        if (isBlockedFile(relPath)) continue

        if (entry.isDirectory()) {
          if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.')) continue
          if (excludePaths.some(ex => relPath.startsWith(ex.replace(/\/$/, '')))) continue
          walk(fullPath)
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase()
          if (!SAFE_EXTENSIONS.has(ext)) continue
          if (excludePaths.some(ex => relPath.startsWith(ex.replace(/\/$/, '')))) continue

          try {
            const stat = fs.statSync(fullPath)
            if (stat.size > MAX_FILE_SIZE) continue
            allFiles.push(scoreFile(fullPath, relPath, stat))
          } catch { /* skip */ }
        }
      }
    } catch { /* skip unreadable dirs */ }
  }

  for (const target of targetPaths) {
    let targetFull: string
    try {
      targetFull = safePath(target, projectRoot)
    } catch {
      continue
    }

    try {
      const stat = fs.statSync(targetFull)
      if (stat.isFile() && !isBlockedFile(targetFull)) {
        const relPath = path.relative(projectRoot, targetFull)
        allFiles.push(scoreFile(targetFull, relPath, stat))
      } else if (stat.isDirectory()) {
        walk(targetFull)
      }
    } catch { /* skip */ }
  }

  // Sort by score descending — most relevant files first
  return allFiles.sort((a, b) => b.score - a.score)
}

/**
 * Read project files using smart prioritization and caching.
 * Returns files sorted by relevance, using cached content when unchanged.
 */
export function readProjectFilesSmart(
  targetPaths: string[],
  excludePaths: string[],
  projectRoot: string,
): {
  content: string
  fileCount: number
  fileList: string[]
  scoredFiles: Array<{ relPath: string; score: number; reasons: string[]; cached: boolean }>
  cacheHits: number
  cacheMisses: number
} {
  const scoredFiles = collectAndScoreFiles(targetPaths, excludePaths, projectRoot)

  let totalChars = 0
  const parts: string[] = []
  const includedFiles: string[] = []
  const fileDetails: Array<{ relPath: string; score: number; reasons: string[]; cached: boolean }> = []
  let cacheHits = 0
  let cacheMisses = 0

  for (const file of scoredFiles) {
    if (totalChars >= MAX_TOTAL_CHARS) break

    // Try cache first
    const cached = getCached(file.path)
    let content: string

    if (cached) {
      content = cached.content
      cacheHits++
    } else {
      try {
        content = fs.readFileSync(file.path, 'utf-8')
        cacheFile(file.path, content, file.mtime)
        cacheMisses++
      } catch {
        continue
      }
    }

    if (totalChars + content.length > MAX_TOTAL_CHARS) {
      const remaining = MAX_TOTAL_CHARS - totalChars
      if (remaining > 200) {
        parts.push(`\n--- ${file.relPath} (relevance: ${file.score}, truncated) ---\n${content.substring(0, remaining)}\n[... truncated]`)
        includedFiles.push(file.relPath)
        fileDetails.push({ relPath: file.relPath, score: file.score, reasons: file.reasons, cached: !!cached })
        totalChars += remaining
      }
      break
    }

    parts.push(`\n--- ${file.relPath} (relevance: ${file.score}) ---\n${content}`)
    includedFiles.push(file.relPath)
    fileDetails.push({ relPath: file.relPath, score: file.score, reasons: file.reasons, cached: !!cached })
    totalChars += content.length
  }

  return {
    content: parts.join('\n'),
    fileCount: includedFiles.length,
    fileList: includedFiles,
    scoredFiles: fileDetails,
    cacheHits,
    cacheMisses,
  }
}

// ─── Cache Management ───────────────────────────────────────────────────────

export function clearFileCache(): void {
  fileCache.clear()
}

export function getFileCacheStats(): { entries: number; totalSize: number } {
  let totalSize = 0
  for (const entry of fileCache.values()) {
    totalSize += entry.size
  }
  return { entries: fileCache.size, totalSize }
}
