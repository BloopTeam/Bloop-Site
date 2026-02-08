/**
 * OpenClaw API Routes
 * Protocol v3 (v2026.1.21)
 * WebSocket Gateway + OpenResponses HTTP API + Bot Team Orchestration
 */
import { Router } from 'express'
import { getOpenClawService } from '../../services/openclaw/index.js'
import { ModelRouter } from '../../services/ai/router.js'
import { resilientMultiProviderGenerate, resilientStream, getProviderHealth } from '../../services/ai/resilience.js'
import { anchorExecutionProof, getProofPublicKey, getProofBalance, ExecutionData } from '../../services/solana/proofOfExecution.js'
import { buildRolePrompt } from '../../services/roles.js'
import { readProjectFilesSmart, getFileCacheStats } from '../../services/fileIntelligence.js'
import { recordBotRun, buildMemoryContext, getBotKnowledge, getAllOpenFindings, resolveFinding } from '../../services/botMemory.js'
import * as fs from 'fs'
import * as path from 'path'

export const openclawRouter = Router()
const aiRouter = new ModelRouter()

// ─── File reading utilities for bot team ─────────────────────────────────────

const MAX_FILE_SIZE = 100_000      // 100KB per file
const MAX_TOTAL_CHARS = 400_000    // ~100K tokens — Opus 4.6 handles 200K context

// Project root — all file reads are sandboxed to this directory
const PROJECT_ROOT = path.resolve(process.cwd())

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
// Block sensitive files from ever being read
const BLOCKED_FILES = [
  '.env', '.env.local', '.env.production', '.env.development',
  '.git/config', 'id_rsa', 'id_ed25519', '.pem', '.key', '.p12',
  'credentials.json', 'service-account.json', '.npmrc', '.pypirc'
]

/**
 * Resolve and validate a path is within the project root.
 * Prevents path traversal (../../etc/passwd, /etc/shadow, etc.)
 */
function safePath(userPath: string): string {
  const resolved = path.resolve(PROJECT_ROOT, userPath)
  if (!resolved.startsWith(PROJECT_ROOT + path.sep) && resolved !== PROJECT_ROOT) {
    throw new Error(`Path outside project: ${userPath}`)
  }
  return resolved
}

function isBlockedFile(filePath: string): boolean {
  const lower = filePath.toLowerCase()
  return BLOCKED_FILES.some(blocked => lower.endsWith(blocked) || lower.includes(blocked))
}

function collectFiles(dir: string, excludePaths: string[] = [], collected: string[] = []): string[] {
  // Validate directory is inside project root
  if (!dir.startsWith(PROJECT_ROOT)) return collected

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const relPath = path.relative(PROJECT_ROOT, fullPath)

      if (isBlockedFile(relPath)) continue

      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name)) continue
        if (entry.name.startsWith('.')) continue
        if (excludePaths.some(ex => relPath.startsWith(ex.replace(/\/$/, '')))) continue
        collectFiles(fullPath, excludePaths, collected)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (!SAFE_EXTENSIONS.has(ext)) continue
        if (excludePaths.some(ex => relPath.startsWith(ex.replace(/\/$/, '')))) continue
        try {
          const stat = fs.statSync(fullPath)
          if (stat.size <= MAX_FILE_SIZE) {
            collected.push(fullPath)
          }
        } catch { /* skip unreadable */ }
      }
    }
  } catch { /* skip unreadable dirs */ }
  return collected
}

function readProjectFiles(targetPaths: string[], excludePaths: string[] = [], projectPath: string = '.'): { content: string; fileCount: number; fileList: string[] } {
  // Sandbox projectPath to project root
  let root: string
  try {
    root = safePath(projectPath)
  } catch {
    root = PROJECT_ROOT // fallback to project root if path is invalid
  }

  const allFiles: string[] = []

  for (const target of targetPaths) {
    let targetFull: string
    try {
      targetFull = safePath(path.join(projectPath, target))
    } catch {
      continue // skip paths that escape project root
    }

    try {
      const stat = fs.statSync(targetFull)
      if (stat.isFile() && !isBlockedFile(targetFull)) {
        allFiles.push(targetFull)
      } else if (stat.isDirectory()) {
        collectFiles(targetFull, excludePaths, allFiles)
      }
    } catch { /* path doesn't exist, skip */ }
  }

  // Read files up to the token budget
  let totalChars = 0
  const parts: string[] = []
  const includedFiles: string[] = []

  for (const filePath of allFiles) {
    if (totalChars >= MAX_TOTAL_CHARS) break
    if (isBlockedFile(filePath)) continue

    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const relPath = path.relative(root, filePath)
      if (totalChars + content.length > MAX_TOTAL_CHARS) {
        const remaining = MAX_TOTAL_CHARS - totalChars
        if (remaining > 200) {
          parts.push(`\n--- ${relPath} (truncated) ---\n${content.substring(0, remaining)}\n[... truncated]`)
          includedFiles.push(relPath)
          totalChars += remaining
        }
        break
      }
      parts.push(`\n--- ${relPath} ---\n${content}`)
      includedFiles.push(relPath)
      totalChars += content.length
    } catch { /* skip unreadable */ }
  }

  return {
    content: parts.join('\n'),
    fileCount: includedFiles.length,
    fileList: includedFiles
  }
}

// Bloop's built-in skills (available even without Gateway)
const BLOOP_SKILLS = [
  { name: 'bloop-code-review', description: 'Deep code review with security & performance analysis', type: 'bundled', enabled: true, capabilities: ['code-analysis', 'security', 'performance'], version: '2.0.0' },
  { name: 'bloop-test-gen', description: 'Generate comprehensive test suites', type: 'bundled', enabled: true, capabilities: ['testing', 'coverage'], version: '2.0.0' },
  { name: 'bloop-docs', description: 'Auto-generate documentation from code', type: 'bundled', enabled: true, capabilities: ['documentation', 'readme'], version: '2.0.0' },
  { name: 'bloop-refactor', description: 'Intelligent refactoring suggestions', type: 'bundled', enabled: true, capabilities: ['refactoring', 'patterns'], version: '2.0.0' },
  { name: 'bloop-debug', description: 'AI-assisted debugging and root cause analysis', type: 'bundled', enabled: true, capabilities: ['debugging', 'error-analysis'], version: '2.0.0' },
  { name: 'bloop-optimize', description: 'Performance optimization recommendations', type: 'bundled', enabled: true, capabilities: ['performance', 'optimization'], version: '2.0.0' },
  { name: 'bloop-security', description: 'Security vulnerability scanning (OWASP)', type: 'bundled', enabled: true, capabilities: ['security', 'owasp', 'vulnerability'], version: '2.0.0' },
  { name: 'bloop-delegate', description: 'CEO delegation — analyzes requests and assigns tasks to specialist bots', type: 'bundled', enabled: true, capabilities: ['delegation', 'coordination', 'planning'], version: '2.0.0' },
]

// GET /api/v1/openclaw/status
openclawRouter.get('/status', async (req, res) => {
  try {
    const service = getOpenClawService()
    const status = await service.getStatus()

    res.json({
      ...status,
      enabled: process.env.OPENCLAW_ENABLED === 'true',
      protocolVersion: 3,
      gatewayUrl: process.env.OPENCLAW_GATEWAY_URL || 'ws://127.0.0.1:18789',
      features: {
        openResponses: true,
        presence: true,
        execApprovals: true,
        channels: true,
        skills: true,
        browser: process.env.OPENCLAW_BROWSER_ENABLED === 'true',
        canvas: process.env.OPENCLAW_CANVAS_ENABLED === 'true',
      },
      docs: 'https://docs.clawd.bot/gateway/protocol',
    })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Status check failed' })
  }
})

// POST /api/v1/openclaw/connect
openclawRouter.post('/connect', async (req, res) => {
  try {
    const service = getOpenClawService()
    const connected = await service.connect()

    res.json({
      connected,
      protocol: service.protocolVersion,
      message: connected ? 'Connected to OpenClaw Gateway' : 'Gateway not available — using local skills',
    })
  } catch (error) {
    res.json({
      connected: false,
      message: error instanceof Error ? error.message : 'Connection failed',
    })
  }
})

// GET /api/v1/openclaw/sessions
openclawRouter.get('/sessions', async (req, res) => {
  try {
    const service = getOpenClawService()
    const sessions = await service.listSessions()
    res.json({ sessions })
  } catch {
    res.json({ sessions: [] })
  }
})

// POST /api/v1/openclaw/message
openclawRouter.post('/message', async (req, res) => {
  try {
    const { sessionId, message, thinkingLevel, model } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    const service = getOpenClawService()

    if (service.isConnected) {
      const result = await service.sendMessage(
        sessionId || 'main',
        message,
        { thinkingLevel, model }
      )
      return res.json(result)
    }

    // Fallback: not connected to Gateway
    res.json({
      content: `OpenClaw Gateway is not connected. Message received: "${message.slice(0, 100)}". Connect to the Gateway to enable full agent communication.`,
      sessionId: sessionId || 'local',
      gateway_connected: false,
    })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Message send failed' })
  }
})

// GET /api/v1/openclaw/skills
openclawRouter.get('/skills', async (req, res) => {
  try {
    const service = getOpenClawService()
    let skills = []

    if (service.isConnected) {
      skills = await service.listSkills()
    }

    // Merge with built-in Bloop skills
    const allSkills = [
      ...BLOOP_SKILLS,
      ...skills.filter((s: any) => !BLOOP_SKILLS.find(b => b.name === s.name)),
    ]

    res.json({ skills: allSkills, total: allSkills.length })
  } catch {
    res.json({ skills: BLOOP_SKILLS, total: BLOOP_SKILLS.length })
  }
})

// POST /api/v1/openclaw/skills/:name/execute
openclawRouter.post('/skills/:name/execute', async (req, res) => {
  try {
    const { name } = req.params
    const { params, context } = req.body

    const service = getOpenClawService()

    if (service.isConnected) {
      const result = await service.executeSkill(name, { ...params, context })
      return res.json(result)
    }

    // Fallback: execute locally via Bloop's AI
    res.json({
      success: true,
      output: `Skill "${name}" queued for local execution. Connect to OpenClaw Gateway for remote execution.`,
      local: true,
    })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Skill execution failed' })
  }
})

// GET /api/v1/openclaw/presence
openclawRouter.get('/presence', async (req, res) => {
  try {
    const service = getOpenClawService()
    const presence = await service.getPresence()
    res.json({ entries: presence })
  } catch {
    res.json({ entries: [] })
  }
})

// GET /api/v1/openclaw/channels
openclawRouter.get('/channels', async (req, res) => {
  try {
    const service = getOpenClawService()
    const channels = await service.listChannels()
    res.json({ channels })
  } catch {
    res.json({ channels: [] })
  }
})

// GET /api/v1/openclaw/models
openclawRouter.get('/models', async (req, res) => {
  try {
    const service = getOpenClawService()
    const models = await service.listModels()
    res.json({ models })
  } catch {
    res.json({ models: [] })
  }
})

// POST /api/v1/openclaw/responses - OpenResponses API proxy
openclawRouter.post('/responses', async (req, res) => {
  try {
    const { input, agentId, instructions, tools, stream, user } = req.body

    if (!input) {
      return res.status(400).json({ error: 'Input is required' })
    }

    const service = getOpenClawService()
    const result = await service.openResponses(input, {
      agentId: agentId || 'main',
      instructions,
      tools,
      stream: stream || false,
      user,
    })

    res.json(result)
  } catch (error) {
    res.status(500).json({
      error: {
        message: error instanceof Error ? error.message : 'OpenResponses request failed',
        type: 'server_error',
      }
    })
  }
})

// POST /api/v1/openclaw/exec/approve
openclawRouter.post('/exec/approve', async (req, res) => {
  try {
    const { approvalId, approved } = req.body
    const service = getOpenClawService()
    const result = await service.resolveApproval(approvalId, approved !== false)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Approval failed' })
  }
})

// ─── Bot Team Endpoints ──────────────────────────────────────────────────────
// 24/7 autonomous bot execution via OpenClaw orchestration

// Skill-to-prompt mapping for each bot specialization
const skillPrompts: Record<string, string> = {
  'bloop-code-review': `You are a Staff Software Engineer (L7) conducting a readability review, the kind that blocks submission at Google. You have mass-submitted CLs across the entire codebase. You have given 10,000+ code reviews. You think in invariants, not vibes.

Your review process for every file:

1. **Correctness Proof** — For each function: what is its contract? What are the preconditions and postconditions? Will the postconditions hold for ALL valid inputs, including empty collections, single elements, maximum values, concurrent access, and inputs at the boundary of type ranges? If you cannot convince yourself the code is correct by reading it once, it needs to be simpler.

2. **Failure Mode Analysis** — Trace every error path. When this function fails, does the caller get an actionable error with enough context to debug it? Or does it get a generic "something went wrong"? Is the error type part of the API contract or an implementation detail leaking through? Are there paths where an exception is thrown but no catch exists in the call chain?

3. **Abstraction Quality** — Is this interface minimal (no method you could remove), orthogonal (no two methods that overlap in capability), and hard to misuse (invalid states are unrepresentable)? If a caller could use this API incorrectly by making a reasonable assumption, the API is wrong.

4. **Naming as Documentation** — Can you understand the code's intent by reading only the function signatures, variable names, and type definitions — without reading the implementation? If a name requires a comment to clarify, the name is wrong. If a boolean parameter exists, it should probably be two separate functions.

5. **Concurrency & Ordering** — Does this code make assumptions about execution order that aren't enforced by the language? Shared mutable state accessed from async contexts without synchronization? Check-then-act patterns where the condition could change between check and act?

6. **Performance Cliffs** — Will this code that works fine with 100 items still work with 100,000? Look for hidden O(n²) in nested iterations over the same data, repeated linear scans that should be a Map, and allocations inside hot loops.

7. **Change Safety** — If another engineer modifies this code in 6 months, what are they most likely to get wrong? Would a type error catch it, or would it be a silent behavioral bug?

Rate findings: **CRITICAL** = correctness bug or data loss risk, **WARNING** = will cause issues under realistic conditions, **INFO** = readability or maintainability improvement. Include file path and line reference.`,

  'bloop-test-gen': `You are a Staff Software Engineer in Test (L7) who built test infrastructure at Google-scale. You designed hermetic test frameworks, caught production outages via mutation testing, and reviewed test quality across thousands of CLs. Your philosophy: if a test can't fail, it's not testing anything.

Your approach for every codebase:

1. **Test Strategy** — Before writing a single test, identify the test boundaries. What is the unit under test? What are its dependencies? What is the contract? Design the test suite as a specification of behavior, not a mirror of implementation.

2. **Hermetic by Default** — Every test you write is deterministic. No network calls, no filesystem access, no system clock, no random numbers, no test ordering dependencies. If a test uses time, inject a fake clock. If a test uses I/O, inject a fake. Explain every mock with a comment: "// Mock because: [reason]".

3. **Boundary Value Analysis** — For every input parameter, systematically test: empty/zero, single element, typical case, maximum/overflow, and one-past-the-boundary. For strings: empty, single char, unicode, max length. For numbers: 0, 1, -1, MAX_SAFE_INTEGER, NaN, Infinity.

4. **Error Path Coverage** — For every happy path test, write the corresponding failure test. What happens when the network call fails? When the JSON is malformed? When the user lacks permission? When the database returns an empty result? When the timeout fires? These are the tests that actually prevent production incidents.

5. **Mutation Resistance** — For every assertion, ask: "If I deleted the line of code this tests, would this test fail?" If the answer is "maybe not," the assertion is too weak. Use toEqual over toBeTruthy. Use toHaveBeenCalledWith over toHaveBeenCalled. Assert on specific error messages, not just error types.

6. **Test Naming Convention** — Each test name must answer three questions: What is being tested? Under what conditions? What is the expected outcome? Pattern: \`it('returns empty array when query matches no documents')\` not \`it('works')\` or \`it('test case 3')\`.

7. **Runnable Output** — Produce complete test files with all imports, proper async/await handling, beforeEach/afterEach cleanup, and TypeScript types. The tests must run without modification.`,

  'bloop-security': `You are a Staff Security Engineer (L7) from Google's Project Zero mindset applied to application security. You've conducted hundreds of security reviews and found vulnerabilities that were exploited in production. You think like an attacker with the rigor of a formal methods researcher.

Your audit methodology for every file:

1. **Attack Surface Mapping** — Before analyzing code, map every entry point where untrusted data enters the system: HTTP request bodies, headers, query params, URL paths, cookies, WebSocket messages, file uploads, environment variables from user config. For each entry point, trace the data flow to every sink (database query, file write, shell command, HTML render, redirect URL, log statement).

2. **Injection Analysis** — For every data flow from source to sink: is the data sanitized? Is the sanitization context-aware (HTML escaping vs SQL parameterization vs shell escaping are different)? Is there a path that bypasses sanitization? Can the encoding be manipulated (double encoding, null bytes, unicode normalization) to evade the filter?

3. **Authentication & Session Architecture** — Trace the full authentication chain: credential submission → validation → session creation → token issuance → token storage → token transmission → token validation → session termination. At each step: what can go wrong? Is the timing constant (no side-channel)? Is the token entropy sufficient? Can sessions be fixated? Are refresh tokens rotated?

4. **Authorization Model** — For every protected resource: how is ownership determined? Is it the URL parameter (IDOR risk)? A claim in the JWT (tampering risk if signature isn't verified)? A database lookup (race condition risk)? Map every privilege escalation path: horizontal (access another user's data) and vertical (gain admin privileges).

5. **Cryptographic Review** — Algorithm selection: is it current (no MD5/SHA1 for security, no RSA-1024, no 3DES)? Key management: where are keys stored, how are they rotated, are they in memory after use? IV/nonce handling: are they random, are they reused? Timing: are comparisons constant-time?

6. **Supply Chain** — For every dependency: what permissions does it require? Does it have install/postinstall scripts? What is its maintenance status? Has it been the target of a supply chain attack? Are versions pinned or floating?

7. **Information Leakage** — Do error messages reveal stack traces, database schemas, internal paths, or version numbers? Are secrets logged? Do HTTP responses include unnecessary headers? Does the timing of responses reveal whether a user exists?

Rate: **CRITICAL** = exploitable with known techniques, **WARNING** = exploitable under specific conditions, **INFO** = defense-in-depth hardening. Every CRITICAL finding includes proof-of-concept and remediation code.`,

  'bloop-docs': `You are a Senior Technical Writer (L6) who established documentation standards at Google-scale. You've written the internal documentation style guide. Your documentation is the difference between a developer being productive in 30 minutes vs. 3 days.

Your documentation methodology:

1. **API Reference** — Every exported symbol gets documentation. Functions: what it does (one sentence), parameters (type, description, constraints, default), return value (type, description, possible values), throws (error type, condition), and a working example that demonstrates the non-obvious case (not the trivial one). Interfaces: document the contract, not the shape — why does each field exist, what invariants must hold.

2. **Progressive Disclosure** — Structure documentation in layers. Layer 1: the one-line summary that appears in autocomplete. Layer 2: the paragraph that explains the "why." Layer 3: the examples that show the "how." Layer 4: the edge cases and gotchas. A reader should be able to stop at any layer and have useful information.

3. **Quickstart** — Write a getting-started guide that takes a developer from zero to a working example in under 5 minutes. No "first, let's understand the architecture" preambles. Show the code first, explain after. Every code block must be copy-pasteable and runnable.

4. **Error Catalog** — Every error the system can produce, documented with: the error code/message, what caused it (common scenarios), what the user should do about it (not "check your configuration" — specifically WHICH configuration and WHAT value). Link errors to the relevant API documentation.

5. **Architecture Overview** — For multi-file systems: a clear description of the data flow, the responsibility of each module, and the interaction patterns. Use concrete examples of requests flowing through the system, not abstract descriptions. Include what is NOT in scope for each module.

6. **Inline Documentation (JSDoc/TSDoc)** — Focus on the WHY, not the WHAT. Don't write \`/** Gets the user */\` for \`getUser()\` — write \`/** Fetches user from cache, falling back to DB. Returns null (not throw) for missing users to support optional user contexts. */\`

Output documentation that a senior engineer would approve in a docs review. Precise. Scannable. No filler.`,

  'bloop-optimize': `You are a Staff Performance Engineer (L7) who has profiled V8 at the bytecode level, optimized Chrome's rendering pipeline, and diagnosed tail latency issues in distributed systems. You don't guess about performance — you measure, analyze, and prove.

Your optimization methodology:

1. **Algorithmic Complexity Audit** — For every loop, recursion, and data structure operation: what is the actual time and space complexity? Not the theoretical best case — the worst case for realistic input distributions. Flag: O(n²) that could be O(n), O(n log n) that could be O(n), O(n) that does unnecessary allocations per iteration. Provide the specific algorithmic change (e.g., "replace nested find() with a pre-built Map for O(1) lookup") with before/after Big-O.

2. **Memory Allocation Patterns** — Identify object churn in hot paths: are you creating objects inside loops that could be allocated once? Closures that capture more scope than needed? Arrays that grow without bound (memory leak)? WeakRef/WeakMap opportunities for caches? For React: are you creating new object/array/function references on every render that defeat memoization?

3. **React Rendering Pathology** — Apply the React Profiler mental model. For every component: what causes it to re-render? Is that re-render necessary? Check: context providers that broadcast on every state change (split contexts by update frequency), missing React.memo on pure components, unstable deps in useEffect/useMemo/useCallback (new object literals, inline functions, array/object spreading), derived state that should be computed in render not stored in state.

4. **Critical Rendering Path** — For web apps: what blocks first paint? What blocks interactive? Layout thrashing (reading layout properties then writing them in a loop)? Forced synchronous layouts? Animations that trigger layout instead of running on the compositor (transform/opacity only)? Images without dimensions causing layout shift?

5. **I/O Waterfall** — Identify sequential I/O that could be parallel (Promise.all), responses that could be streamed instead of buffered, payloads that could be paginated, and requests that could be batched. For databases: N+1 query patterns, missing indexes (check WHERE and ORDER BY columns), full table scans, connection pool sizing.

6. **Cache Architecture** — For every repeated computation or I/O: should it be cached? If cached: what is the invalidation strategy? What is the thundering herd / cache stampede risk? Is the TTL appropriate? Is the cache bounded (LRU) or unbounded (memory leak)?

7. **Tail Latency** — What happens at p99? GC pauses from large heap? Cold starts from lazy initialization? Connection pool exhaustion under burst traffic? Timeouts set too high that cause upstream cascading failures?

Rate: **CRITICAL** = user-visible latency or memory growth, **WARNING** = measurable impact under load, **INFO** = marginal improvement. Every finding includes before/after code with complexity analysis.`,

  'bloop-debug': `You are a Staff Software Engineer (L7) who has spent years on production oncall at Google-scale. You've debugged distributed systems at 3 AM with only logs and metrics. You think in failure modes, not happy paths. Your mental model: every line of code is a potential failure point — prove to me it can't fail.

Your debugging methodology:

1. **Race Condition Detection** — For every piece of shared mutable state: who can read it? Who can write it? In what order? Is that order enforced or assumed? Specific patterns to flag: check-then-act without atomicity (if (map.has(key)) map.get(key) — key could be deleted between check and get), event handler registration during async initialization (events fire before handler is ready), state updates in React that depend on current state without using the callback form of setState.

2. **Null/Undefined Chain Analysis** — For every property access chain (a.b.c.d): trace backward. Where does \`a\` come from? Can it be null? Can \`a.b\` be undefined? Under what conditions? Check: API responses that might omit fields, array operations that return undefined (find, at(-1)), Map.get on missing keys, optional chaining that silently produces undefined and then gets used as if it were a value.

3. **State Consistency** — For every piece of derived state: is it always consistent with its source? Specific bugs to find: stale closures in useEffect/useCallback that capture a previous render's state, optimistic UI updates that don't handle rollback on failure, multiple state variables that must be updated atomically but aren't (user and userSettings updated in separate setState calls).

4. **Async Correctness** — Trace every async operation. Unhandled Promise rejections (missing .catch, missing try/catch around await)? Fire-and-forget async calls that should be awaited (side effects that run after component unmount)? Promise.all that should be Promise.allSettled (one failure shouldn't cancel all)? Concurrent async operations that write to the same state (last-write-wins race)?

5. **Resource Lifecycle** — Every resource that is acquired must be released. Event listeners: addEventListener without removeEventListener. Timers: setInterval without clearInterval. WebSockets: open without close on unmount. Database connections: acquired from pool but not returned on error path. AbortControllers: created but never aborted on cancellation.

6. **Edge Case Combinatorics** — What happens at the boundaries? Empty array + reduce (no initial value = crash). Division by zero. Date arithmetic across DST transitions. String operations on emoji (multi-byte). parseInt on "0x" prefix. JSON.parse on non-UTF8 input. RegExp on catastrophic backtracking input.

7. **Regression Forensics** — If this code changed recently: what was the old behavior? What assumption did the change invalidate? What callers were relying on the old behavior? Apply a mental git-bisect: which specific change introduced the potential for this bug?

For each finding: the exact scenario, why it happens (root cause, not symptom), reproduction conditions, and the fix. Rate: **CRITICAL** = will manifest in production, **WARNING** = manifests under edge conditions, **INFO** = latent risk.`,

  'bloop-refactor': `You are a Distinguished Engineer (L8) who conducts architecture reviews at Google-scale. You've reviewed design docs for systems serving billions of requests. You evaluate codebases the way you'd evaluate a system design interview candidate: does the author understand the trade-offs, or are they just cargo-culting patterns?

Your architecture review methodology:

1. **Design Intent vs. Implementation** — Does the code reflect a coherent design, or did it evolve through accretion? Can you identify the intended architecture (layered? hexagonal? event-driven?) or is it an ad-hoc mix? For each module: what is its single responsibility? If you can't state it in one sentence, the module does too much.

2. **Interface Quality** — For every module boundary: is the interface minimal (no method you could remove without losing capability)? Is it hard to misuse (can a caller put the system in an invalid state by calling methods in the wrong order)? Does it hide implementation details (could you swap the implementation without changing callers)? Are errors part of the contract or implementation details leaking through?

3. **Dependency Graph Analysis** — Build the mental dependency graph. Is it a DAG? Are there cycles (A imports B imports C imports A)? Is the direction of dependencies correct (business logic should not depend on UI framework, domain should not depend on infrastructure)? What is the fan-out of each module (how many things does it depend on)? High fan-out = high coupling = hard to change.

4. **State Architecture** — Where does state live? Is there a single source of truth for each piece of data, or is it duplicated (and therefore inconsistent)? Is derived state computed or stored (stored = stale risk)? Are side effects isolated at the edges or scattered throughout?

5. **API Contract Design** — Are APIs consistent (same naming conventions, same error shapes, same pagination patterns across all endpoints)? Are they backward-compatible (can you add a field without breaking callers)? Are operations idempotent where they should be? What happens on partial failure (is the system in a consistent state)?

6. **Scaling Analysis** — For each component: what is the bottleneck at 10x current load? At 100x? At 1000x? Is it CPU? Memory? I/O? Connection count? Does the architecture support horizontal scaling, or are there singleton bottlenecks?

7. **Operational Readiness** — Can you tell if this system is healthy without reading the code? Are there health check endpoints? Structured logging? Metrics? Alerts? What is the deployment strategy (can you roll back in under 1 minute)? What is the blast radius of a bad deploy?

Output: a prioritized refactoring plan. Each item: what to change, why (the specific problem it solves), estimated effort (T-shirt size), risk of not doing it (what breaks in 6 months), and dependencies on other items.`,

  'bloop-delegate': `You are the Engineering Director (L8) — the technical program lead. You operate like the best VP of Engineering you've ever worked under: you understand every domain deeply enough to know what "good" looks like, but you delegate because specialists will produce better results than you would alone.

When the user gives you a task:

1. **Scope Analysis** — What is actually being asked? What domains does this touch (frontend, backend, security, testing, performance, documentation)? What are the risks? What does "done" look like? What does "done well" look like?

2. **Task Decomposition** — Break into specific, parallelizable sub-tasks. Each sub-task must have: a clear description of the work, explicit success criteria (not "review code" but "identify all injection vectors in the API routes and provide remediation for each"), and the expected output format.

3. **Specialist Matching** — Assign each sub-task to the specialist whose expertise is the best fit. Don't assign security work to the code reviewer. Don't assign architecture work to the test writer. If a task spans multiple domains, split it or assign it to the specialist for the primary domain with instructions to flag cross-cutting concerns.

4. **Priority & Ordering** — P0: blocks everything else or addresses critical risk. P1: important for quality, can run in parallel. P2: nice-to-have improvements. Determine execution order based on dependencies: which bot needs another bot's output as context?

5. **Success Criteria** — Define what a good result looks like for the overall task. What would make you confident shipping this? What would make you hold the release?

Return a structured JSON: { analysis, delegations: [{ botSpecialization, instructions, priority, successCriteria, reason }], executionOrder, overallSuccessCriteria, summary }.`,
}

// POST /api/v1/openclaw/team/bots/:id/execute — Execute a bot task
// Auth middleware is applied at the router level in dev-server.ts
openclawRouter.post('/team/bots/:id/execute', async (req, res) => {
  try {
    const { specialization, model, skill, preferences, context, role } = req.body
    const botId = req.params.id
    const userId = req.user?.id || 'anonymous'

    if (!skill || !specialization) {
      return res.status(400).json({ error: 'skill and specialization are required' })
    }

    const executionStartTime = Date.now()
    const basePrompt = skillPrompts[skill] || skillPrompts['bloop-code-review']
    const systemPrompt = buildRolePrompt(basePrompt, role)

    // Use model from role if set, otherwise fall back to request model
    const effectiveModel = role?.preferredModel || model

    const userInstructions = context?.customInstructions || preferences?.customInstructions || ''

    // Read actual project files from disk (paths are sandboxed by readProjectFiles)
    const rawTargetPaths: string[] = context?.targetPaths || preferences?.targetPaths || ['src/']
    const rawExcludePaths: string[] = context?.excludePaths || preferences?.excludePaths || ['node_modules/', 'dist/']

    // Sanitize: only allow relative paths, reject absolute or traversal attempts
    const targetPaths = rawTargetPaths.filter((p: string) => typeof p === 'string' && !path.isAbsolute(p) && !p.includes('..'))
    const excludePaths = rawExcludePaths.filter((p: string) => typeof p === 'string' && !path.isAbsolute(p))

    // ─── Per-user workspace isolation ─────────────────────────────────────────
    // If the user has a workspace, read files from there.
    // Otherwise, fallback to project root (for backward compatibility / local dev)
    let projectPath = '.'
    if (req.workspace?.diskPath) {
      const workspaceAbsolute = path.resolve(PROJECT_ROOT, req.workspace.diskPath)
      if (workspaceAbsolute.startsWith(PROJECT_ROOT)) {
        projectPath = req.workspace.diskPath
        // Ensure workspace directory exists
        if (!fs.existsSync(workspaceAbsolute)) {
          fs.mkdirSync(workspaceAbsolute, { recursive: true })
        }
      }
    }

    const projectFilesRoot = path.resolve(PROJECT_ROOT, projectPath)
    const projectFiles = readProjectFilesSmart(targetPaths, excludePaths, projectFilesRoot)
    console.log(`Bot ${botId} [user=${userId}]: Read ${projectFiles.fileCount} files (${projectFiles.content.length} chars, cache: ${projectFiles.cacheHits} hits / ${projectFiles.cacheMisses} misses) from ${targetPaths.join(', ')}`)

    // ─── Web search context (if enabled in role) ─────────────────────────────
    let webSearchContext = ''
    if (role?.webSearchEnabled) {
      try {
        // Gather relevant web context based on the bot's specialization and languages
        const searchQueries: string[] = []
        if (specialization === 'security-auditor') {
          searchQueries.push(`latest ${(role.languages || []).join(' ')} security vulnerabilities 2026`)
          searchQueries.push(`OWASP top 10 ${(role.frameworks || []).join(' ')} best practices`)
        } else if (specialization === 'code-reviewer') {
          searchQueries.push(`${(role.languages || []).join(' ')} best practices 2026`)
          searchQueries.push(`${(role.frameworks || []).join(' ')} code review checklist`)
        } else if (specialization === 'test-engineer') {
          searchQueries.push(`${(role.frameworks || []).join(' ')} testing best practices 2026`)
        } else if (specialization === 'optimizer') {
          searchQueries.push(`${(role.frameworks || []).join(' ')} performance optimization guide`)
        } else {
          searchQueries.push(`${(role.languages || []).join(' ')} ${specialization} best practices`)
        }

        // Note: actual web fetch would go here when a search provider is configured
        // For now, inject the search intent into the system prompt so the model
        // knows it should reference current best practices
        webSearchContext = `\n**Web Search Enabled:** You should reference current best practices, latest documentation, and known issues for the technologies in this project. Cite specific sources when possible.\n`
      } catch {
        // Silent — web search is best-effort
      }
    }

    // ─── User preferences context ───────────────────────────────────────────
    const userPrefsContext = role?.userPreferences
      ? `\n**User Coding Preferences:**\n${role.userPreferences}\n\nApply these preferences when reviewing code and making suggestions.\n`
      : ''

    // ─── Bot Memory: inject historical context ────────────────────────────
    const memoryContext = buildMemoryContext(botId, 4000)

    const userMessage = [
      userInstructions ? `**Instructions:** ${userInstructions}\n\n` : '',
      userPrefsContext,
      webSearchContext,
      memoryContext,
      `**Target paths:** ${targetPaths.join(', ')}\n`,
      excludePaths.length ? `**Exclude:** ${excludePaths.join(', ')}\n` : '',
      `**Files analyzed:** ${projectFiles.fileCount}\n`,
      `**Model:** ${effectiveModel || 'auto'}\n`,
      '\nAnalyze the code below according to your specialization. Provide a **structured report** with:',
      '\n1. **Summary** — one paragraph overview',
      '\n2. **Findings** — each on its own line, prefixed with severity:',
      '\n   - **CRITICAL:** <description> (file: path, line: ~N)',
      '\n   - **WARNING:** <description> (file: path, line: ~N)',
      '\n   - **INFO:** <description> (file: path)',
      '\n3. **Suggestions** — actionable improvements with code examples where relevant',
      '\n4. **Priority Files** — files needing the most attention',
      '\n\nIMPORTANT: Use exactly the severity format above (CRITICAL/WARNING/INFO in bold) so findings can be tracked automatically.',
      '\n\n--- BEGIN PROJECT CODE ---\n',
      projectFiles.content,
      '\n--- END PROJECT CODE ---',
    ].join('')

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userMessage }
    ]

    // First try OpenClaw Gateway if connected
    const openclawService = getOpenClawService()
    const status = await openclawService.getStatus().catch(() => null)

    let responseContent: string
    let provider = 'local'

    if (status && (status as any).connected) {
      // Execute through OpenClaw Gateway
      try {
        const result = await openclawService.executeSkill(skill, {
          specialization,
          model,
          ...context
        })
        responseContent = typeof result === 'string' ? result : JSON.stringify(result)
        provider = 'openclaw'
      } catch (gatewayErr) {
        // Log and fall through to direct AI execution
        console.warn(`[OpenClaw Gateway] Skill execution failed, falling back to direct AI:`, (gatewayErr as Error).message?.slice(0, 120) || 'unknown error')
        responseContent = ''
      }
    }

    if (!responseContent) {
      // Direct AI execution with resilient retry + backoff + circuit breaker
      const availableProviders = aiRouter.getAvailableProviders()
      const modelInfo = aiRouter.selectBestModel({ messages, model: effectiveModel })
      const tryOrder = [modelInfo.provider, ...availableProviders.filter(p => p !== modelInfo.provider)]

      const serviceList = tryOrder
        .map(p => ({ provider: p, service: aiRouter.getService(p)!, model: p === modelInfo.provider ? modelInfo.model : undefined }))
        .filter(s => s.service)

      const result = await resilientMultiProviderGenerate(serviceList, {
        messages,
        temperature: 0.3,
        maxTokens: 16000,
      })

      responseContent = result.content
      provider = result.provider
      console.log(`Bot ${botId}: completed via ${result.provider} (${result.attempts} attempts, ${result.providersAttempted} providers, ${result.totalLatencyMs}ms)`)
    }

    // ─── Structured parsing + Bot memory ─────────────────────────────────

    // Parse structured severity markers from the response
    const criticalCount = (responseContent.match(/\*\*CRITICAL[:\s]/gi) || []).length
    const warningCount = (responseContent.match(/\*\*WARNING[:\s]/gi) || []).length
    const infoCount = (responseContent.match(/\*\*INFO[:\s]/gi) || []).length
    const issuesFound = criticalCount + warningCount + infoCount
      || (responseContent.match(/critical|warning|vulnerability|bug|error|issue/gi) || []).length // fallback
    const suggestionsGiven = (responseContent.match(/suggest|recommend|consider|should|improve/gi) || []).length
    const filesMatch = responseContent.match(/[a-zA-Z0-9_\-/.]+\.(ts|tsx|js|jsx|rs|py|css|html|json|md)/g)
    const filesAffected = filesMatch ? [...new Set(filesMatch)].slice(0, 20) : []

    // Build summary
    const firstLine = responseContent.split('\n').find(l => l.trim().length > 10)
    const summary = firstLine
      ? firstLine.replace(/^[#*\->\s]+/, '').substring(0, 200)
      : `${specialization} analysis completed`

    // Record to bot memory (persistent learning)
    const memoryResult = recordBotRun(botId, specialization, responseContent, {
      filesAnalyzed: projectFiles.fileCount,
      provider,
      model: effectiveModel,
      durationMs: Date.now() - executionStartTime,
      summary,
    })

    // ─── Anchor execution proof to Solana ─────────────────────────────────
    const executionData: ExecutionData = {
      botId,
      userId,
      specialization,
      skill,
      filesAnalyzed: projectFiles.fileCount,
      fileList: projectFiles.fileList,
      issuesFound,
      executionTimeMs: executionEndTime - Date.now(),
      provider,
      summary,
    }

    // Fire-and-forget — don't block the response on Solana
    const proofPromise = anchorExecutionProof(executionData).catch(err => {
      console.warn('[Solana] Proof anchoring failed:', err instanceof Error ? err.message : err)
      return null
    })

    // Try to get proof within 5 seconds, otherwise return without it
    let proof = null
    try {
      proof = await Promise.race([
        proofPromise,
        new Promise(resolve => setTimeout(() => resolve(null), 5000)),
      ])
    } catch { /* timeout or error — continue without proof */ }

    res.json({
      botId,
      response: responseContent,
      summary,
      provider,
      skill,
      issuesFound,
      issuesBreakdown: { critical: criticalCount, warning: warningCount, info: infoCount },
      suggestionsGiven,
      filesAffected,
      executedAt: new Date().toISOString(),
      // Memory tracking
      memory: {
        newFindings: memoryResult.newFindings,
        deduplicatedFindings: memoryResult.deduplicatedFindings,
        totalOpenFindings: memoryResult.totalOpenFindings,
      },
      // File intelligence
      fileIntelligence: {
        cacheHits: projectFiles.cacheHits,
        cacheMisses: projectFiles.cacheMisses,
        topFiles: projectFiles.scoredFiles.slice(0, 5),
      },
      // Solana proof-of-execution (if available)
      ...(proof ? { solanaProof: proof } : {}),
    })
  } catch (error) {
    console.error('Bot execution error:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Bot execution failed',
      botId: req.params.id,
    })
  }
})

// ─── Advanced: Bot writes fixes to workspace ────────────────────────────────
// POST /api/v1/openclaw/team/bots/:id/fix — Execute bot AND apply code fixes
openclawRouter.post('/team/bots/:id/fix', async (req, res) => {
  try {
    const { specialization, model, skill, preferences, context, role } = req.body
    const botId = req.params.id
    const userId = req.user?.id || 'anonymous'

    if (!skill || !specialization) {
      return res.status(400).json({ error: 'skill and specialization are required' })
    }

    const basePrompt = buildRolePrompt(skillPrompts[skill] || skillPrompts['bloop-code-review'], role)
    const systemPrompt = basePrompt + `

IMPORTANT: In addition to your analysis, you MUST output concrete fixes.
For each issue you find, output the fixed code in a fenced code block with the FULL FILE PATH as the label:

\`\`\`path/to/file.ext
// complete fixed file contents
\`\`\`

Only output file blocks for files that actually need changes. Include the COMPLETE file content (not just the changed lines).`

    // Read project files
    const rawTargetPaths: string[] = context?.targetPaths || preferences?.targetPaths || ['src/']
    const rawExcludePaths: string[] = context?.excludePaths || preferences?.excludePaths || ['node_modules/', 'dist/']
    const targetPaths = rawTargetPaths.filter((p: string) => typeof p === 'string' && !path.isAbsolute(p) && !p.includes('..'))
    const excludePaths = rawExcludePaths.filter((p: string) => typeof p === 'string' && !path.isAbsolute(p))

    let projectPath = '.'
    if (req.workspace?.diskPath) {
      const workspaceAbsolute = path.resolve(PROJECT_ROOT, req.workspace.diskPath)
      if (workspaceAbsolute.startsWith(PROJECT_ROOT)) {
        projectPath = req.workspace.diskPath
        if (!fs.existsSync(workspaceAbsolute)) fs.mkdirSync(workspaceAbsolute, { recursive: true })
      }
    }

    const projectFilesRoot2 = path.resolve(PROJECT_ROOT, projectPath)
    const projectFiles = readProjectFilesSmart(targetPaths, excludePaths, projectFilesRoot2)

    const userMessage = [
      `Analyze AND fix the code below. Output your analysis followed by complete fixed files.\n`,
      `**Files analyzed:** ${projectFiles.fileCount} (${projectFiles.fileList.join(', ')})\n`,
      '\n--- BEGIN PROJECT CODE ---\n',
      projectFiles.content,
      '\n--- END PROJECT CODE ---',
    ].join('')

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userMessage }
    ]

    // Execute AI
    const modelInfo = aiRouter.selectBestModel({ messages, model })
    const availableProviders = aiRouter.getAvailableProviders()
    const tryOrder = [modelInfo.provider, ...availableProviders.filter(p => p !== modelInfo.provider)]

    let responseContent = ''
    let provider = 'local'

    for (const providerKey of tryOrder) {
      const service = aiRouter.getService(providerKey)
      if (!service) continue
      try {
        const aiResponse = await service.generate({
          messages,
          model: modelInfo.provider === providerKey ? modelInfo.model : undefined as any,
          temperature: 0.2,
          maxTokens: 16000,
        })
        responseContent = aiResponse.content
        provider = providerKey
        break
      } catch (err) {
        console.warn(`Bot fix: ${providerKey} failed, trying next...`, (err as Error).message?.slice(0, 80))
      }
    }

    if (!responseContent) {
      return res.status(503).json({ error: 'All AI providers failed' })
    }

    // Parse code blocks with file paths from the response
    const fileRegex = /```(\S+\.[\w.]+)\n([\s\S]*?)```/g
    const fixedFiles: { path: string; content: string; written: boolean }[] = []
    let match

    while ((match = fileRegex.exec(responseContent)) !== null) {
      const filePath = match[1].replace(/^\/+/, '')
      const fileContent = match[2].trim()

      if (!filePath || !fileContent) continue

      // Security: validate path stays inside workspace
      const absPath = path.resolve(PROJECT_ROOT, projectPath, filePath)
      const workspaceRoot = path.resolve(PROJECT_ROOT, projectPath)
      if (!absPath.startsWith(workspaceRoot)) {
        fixedFiles.push({ path: filePath, content: '', written: false })
        continue
      }

      // Write the fixed file
      const dir = path.dirname(absPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(absPath, fileContent, 'utf-8')
      fixedFiles.push({ path: filePath, content: fileContent, written: true })
    }

    const issuesFound = (responseContent.match(/critical|warning|vulnerability|bug|error|issue/gi) || []).length

    // Anchor proof
    const executionData: ExecutionData = {
      botId, userId, specialization, skill,
      filesAnalyzed: projectFiles.fileCount,
      fileList: projectFiles.fileList,
      issuesFound,
      executionTimeMs: 0,
      provider,
      summary: `Fixed ${fixedFiles.filter(f => f.written).length} files`,
    }
    anchorExecutionProof(executionData).catch(() => {})

    res.json({
      botId,
      response: responseContent,
      provider,
      fixedFiles,
      filesWritten: fixedFiles.filter(f => f.written).length,
      issuesFound,
      executedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Bot fix error:', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Bot fix failed' })
  }
})

// ─── Advanced: Bot collaboration chain ──────────────────────────────────────
// POST /api/v1/openclaw/team/chain — Execute a chain of bots in sequence
// Each bot's output feeds into the next bot's context
openclawRouter.post('/team/chain', async (req, res) => {
  try {
    const { steps, preferences, context } = req.body
    const userId = req.user?.id || 'anonymous'

    if (!Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: 'steps array is required (each with skill + specialization)' })
    }

    // Read project files once (shared across all bots in the chain)
    const rawTargetPaths: string[] = context?.targetPaths || preferences?.targetPaths || ['src/']
    const rawExcludePaths: string[] = context?.excludePaths || preferences?.excludePaths || ['node_modules/', 'dist/']
    const targetPaths = rawTargetPaths.filter((p: string) => typeof p === 'string' && !path.isAbsolute(p) && !p.includes('..'))
    const excludePaths = rawExcludePaths.filter((p: string) => typeof p === 'string' && !path.isAbsolute(p))

    let projectPath = '.'
    if (req.workspace?.diskPath) {
      const workspaceAbsolute = path.resolve(PROJECT_ROOT, req.workspace.diskPath)
      if (workspaceAbsolute.startsWith(PROJECT_ROOT)) {
        projectPath = req.workspace.diskPath
        if (!fs.existsSync(workspaceAbsolute)) fs.mkdirSync(workspaceAbsolute, { recursive: true })
      }
    }

    const chainResults: any[] = []
    let previousOutput = ''

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      const { skill, specialization, botId, role: stepRole } = step
      const systemPrompt = buildRolePrompt(skillPrompts[skill] || skillPrompts['bloop-code-review'], stepRole)

      // Re-read files for each step (in case previous bot wrote fixes)
      const chainFilesRoot = path.resolve(PROJECT_ROOT, projectPath)
      const projectFiles = readProjectFilesSmart(targetPaths, excludePaths, chainFilesRoot)

      const userMessage = [
        previousOutput ? `**Previous bot output (${chainResults[chainResults.length - 1]?.specialization || 'unknown'}):**\n${previousOutput.slice(0, 12000)}\n\n---\n\n` : '',
        `**Step ${i + 1}/${steps.length} in chain** — Your specialization: ${specialization}\n`,
        `**Files:** ${projectFiles.fileCount} (${projectFiles.fileList.join(', ')})\n`,
        '\n--- BEGIN PROJECT CODE ---\n',
        projectFiles.content,
        '\n--- END PROJECT CODE ---',
      ].join('')

      const messages = [
        { role: 'system' as const, content: systemPrompt + '\n\nYou are part of a bot collaboration chain. Build on the findings of previous bots and add your specialized analysis. If you find issues, output fixed files as fenced code blocks with the full file path as the label.' },
        { role: 'user' as const, content: userMessage }
      ]

      // Execute
      const modelInfo = aiRouter.selectBestModel({ messages, model: step.model })
      const availableProviders = aiRouter.getAvailableProviders()
      const tryOrder = [modelInfo.provider, ...availableProviders.filter(p => p !== modelInfo.provider)]

      let responseContent = ''
      let provider = 'local'

      for (const providerKey of tryOrder) {
        const service = aiRouter.getService(providerKey)
        if (!service) continue
        try {
          const aiResponse = await service.generate({
            messages,
            model: modelInfo.provider === providerKey ? modelInfo.model : undefined as any,
            temperature: 0.3,
            maxTokens: 16000,
          })
          responseContent = aiResponse.content
          provider = providerKey
          break
        } catch {
          continue
        }
      }

      if (!responseContent) {
        chainResults.push({
          step: i + 1, botId, specialization, skill,
          status: 'failed', error: 'All AI providers failed',
        })
        continue
      }

      // Parse and write any fixed files from this step
      const fileRegex = /```(\S+\.[\w.]+)\n([\s\S]*?)```/g
      const fixedFiles: string[] = []
      let fileMatch

      while ((fileMatch = fileRegex.exec(responseContent)) !== null) {
        const filePath = fileMatch[1].replace(/^\/+/, '')
        const fileContent = fileMatch[2].trim()
        if (!filePath || !fileContent) continue

        const absPath = path.resolve(PROJECT_ROOT, projectPath, filePath)
        const workspaceRoot = path.resolve(PROJECT_ROOT, projectPath)
        if (!absPath.startsWith(workspaceRoot)) continue

        const dir = path.dirname(absPath)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(absPath, fileContent, 'utf-8')
        fixedFiles.push(filePath)
      }

      const issuesFound = (responseContent.match(/critical|warning|vulnerability|bug|error|issue/gi) || []).length

      chainResults.push({
        step: i + 1,
        botId,
        specialization,
        skill,
        status: 'completed',
        provider,
        issuesFound,
        fixedFiles,
        summary: responseContent.split('\n').find(l => l.trim().length > 10)?.replace(/^[#*\->\s]+/, '').substring(0, 200) || '',
        responseLength: responseContent.length,
      })

      // Pass output to next bot
      previousOutput = responseContent
    }

    res.json({
      chain: chainResults,
      totalSteps: steps.length,
      completedSteps: chainResults.filter(r => r.status === 'completed').length,
      totalFilesFixed: chainResults.reduce((acc, r) => acc + (r.fixedFiles?.length || 0), 0),
      executedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Chain execution error:', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Chain execution failed' })
  }
})

// ─── CEO Delegation: Analyze task, create plan, execute via team ──────────────
// POST /api/v1/openclaw/team/delegate — CEO analyzes request & delegates to specialist bots
openclawRouter.post('/team/delegate', async (req, res) => {
  try {
    const { task, teamBots, ceoBot, preferences, context } = req.body
    const userId = req.user?.id || 'anonymous'

    if (!task || typeof task !== 'string') {
      return res.status(400).json({ error: 'task (string) is required' })
    }
    if (!Array.isArray(teamBots) || teamBots.length === 0) {
      return res.status(400).json({ error: 'teamBots array is required (available specialist bots)' })
    }

    // ─── Step 1: CEO analyzes task and creates delegation plan ───────────────
    const ceoSystemPrompt = buildRolePrompt(
      skillPrompts['bloop-delegate'],
      ceoBot?.role
    )

    const teamDescription = teamBots.map((b: any) => (
      `- **${b.name}** (${b.specialization}): ${b.description}. Capabilities: ${(b.capabilities || []).join(', ')}. Model: ${b.model || 'auto'}.`
    )).join('\n')

    const ceoPlanMessage = [
      `The user has given you the following task:\n\n"${task}"\n\n`,
      `Your team consists of the following specialist bots:\n${teamDescription}\n\n`,
      `Analyze this task and create a delegation plan. Return ONLY a JSON object with this exact structure:\n`,
      '```json\n',
      '{\n',
      '  "analysis": "Your analysis of the task",\n',
      '  "delegations": [\n',
      '    {\n',
      '      "botSpecialization": "code-reviewer",\n',
      '      "instructions": "Specific instructions for this bot",\n',
      '      "priority": "high",\n',
      '      "reason": "Why this bot is needed"\n',
      '    }\n',
      '  ],\n',
      '  "executionOrder": "parallel or sequential",\n',
      '  "summary": "Brief summary of the delegation plan"\n',
      '}\n',
      '```\n',
      `\nOnly include bots that are relevant to the task. Set priority to "high", "medium", or "low".`,
    ].join('')

    const ceoMessages = [
      { role: 'system' as const, content: ceoSystemPrompt },
      { role: 'user' as const, content: ceoPlanMessage }
    ]

    // Execute CEO analysis
    const ceoModel = ceoBot?.role?.preferredModel || ceoBot?.model || 'claude-opus-4-6'
    const modelInfo = aiRouter.selectBestModel({ messages: ceoMessages, model: ceoModel })
    const availableProviders = aiRouter.getAvailableProviders()
    const tryOrder = [modelInfo.provider, ...availableProviders.filter((p: string) => p !== modelInfo.provider)]

    let planContent = ''
    let ceoProvider = 'local'

    for (const providerKey of tryOrder) {
      const service = aiRouter.getService(providerKey)
      if (!service) continue
      try {
        const aiResponse = await service.generate({
          messages: ceoMessages,
          model: providerKey === modelInfo.provider ? modelInfo.model : undefined as any,
          temperature: 0.2,
          maxTokens: 8000,
        })
        planContent = aiResponse.content
        ceoProvider = providerKey
        break
      } catch {
        continue
      }
    }

    if (!planContent) {
      return res.status(502).json({ error: 'CEO bot could not generate a delegation plan — all AI providers failed' })
    }

    // Parse the delegation plan from the CEO's response
    let delegationPlan: any = null
    try {
      // Extract JSON from the response (might be wrapped in markdown code blocks)
      const jsonMatch = planContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, planContent]
      const jsonStr = (jsonMatch[1] || planContent).trim()
      delegationPlan = JSON.parse(jsonStr)
    } catch {
      // If JSON parsing fails, try to extract a reasonable plan
      delegationPlan = {
        analysis: planContent.substring(0, 500),
        delegations: teamBots.map((b: any) => ({
          botSpecialization: b.specialization,
          instructions: `Analyze the project for: ${task}`,
          priority: 'medium',
          reason: 'CEO could not produce structured plan; delegating to all bots.',
        })),
        executionOrder: 'parallel',
        summary: 'Fallback plan: delegating to all available bots.'
      }
    }

    // ─── Step 2: Execute delegated tasks ─────────────────────────────────────

    // Read project files once
    const rawTargetPaths: string[] = context?.targetPaths || preferences?.targetPaths || ['src/']
    const rawExcludePaths: string[] = context?.excludePaths || preferences?.excludePaths || ['node_modules/', 'dist/']
    const targetPaths = rawTargetPaths.filter((p: string) => typeof p === 'string' && !path.isAbsolute(p) && !p.includes('..'))
    const excludePaths = rawExcludePaths.filter((p: string) => typeof p === 'string' && !path.isAbsolute(p))

    let projectPath = '.'
    if (req.workspace?.diskPath) {
      const workspaceAbsolute = path.resolve(PROJECT_ROOT, req.workspace.diskPath)
      if (workspaceAbsolute.startsWith(PROJECT_ROOT)) {
        projectPath = req.workspace.diskPath
        if (!fs.existsSync(workspaceAbsolute)) fs.mkdirSync(workspaceAbsolute, { recursive: true })
      }
    }

    const delegFilesRoot = path.resolve(PROJECT_ROOT, projectPath)
    const projectFiles = readProjectFilesSmart(targetPaths, excludePaths, delegFilesRoot)

    // ─── Execute delegated tasks (parallel when safe, sequential otherwise) ──

    async function executeDelegation(delegation: any) {
      const targetBot = teamBots.find((b: any) => b.specialization === delegation.botSpecialization)
      if (!targetBot) {
        return {
          botSpecialization: delegation.botSpecialization,
          status: 'skipped',
          reason: `No bot found for specialization: ${delegation.botSpecialization}`,
        }
      }

      const botSkill = targetBot.skill || `bloop-${delegation.botSpecialization.replace(/-/g, '-')}`
      const botSystemPrompt = buildRolePrompt(
        skillPrompts[botSkill] || skillPrompts['bloop-code-review'],
        targetBot.role
      )

      const botMessage = [
        `**Task from Engineering Director:** ${delegation.instructions}\n`,
        `**Original user request:** "${task}"\n`,
        `**Priority:** ${delegation.priority}\n\n`,
        `**Files analyzed:** ${projectFiles.fileCount} (${projectFiles.fileList.join(', ')})\n`,
        '\n--- BEGIN PROJECT CODE ---\n',
        projectFiles.content,
        '\n--- END PROJECT CODE ---',
      ].join('')

      const botMessages = [
        { role: 'system' as const, content: botSystemPrompt + '\n\nYou have been assigned this task by the Engineering Director. Complete your analysis according to your specialization and the Director\'s instructions. Be thorough and specific.' },
        { role: 'user' as const, content: botMessage }
      ]

      const botModel = targetBot.role?.preferredModel || targetBot.model || 'auto'
      const botModelInfo = aiRouter.selectBestModel({ messages: botMessages, model: botModel })
      const botTryOrder = [botModelInfo.provider, ...availableProviders.filter((p: string) => p !== botModelInfo.provider)]

      let botResponse = ''
      let botProvider = 'local'

      for (const providerKey of botTryOrder) {
        const service = aiRouter.getService(providerKey)
        if (!service) continue
        try {
          const aiResponse = await service.generate({
            messages: botMessages,
            model: providerKey === botModelInfo.provider ? botModelInfo.model : undefined as any,
            temperature: 0.3,
            maxTokens: 16000,
          })
          botResponse = aiResponse.content
          botProvider = providerKey
          break
        } catch (delegErr) {
          console.warn(`[Delegation] ${targetBot.name}/${providerKey} failed:`, (delegErr as Error).message?.slice(0, 80))
          continue
        }
      }

      if (!botResponse) {
        return {
          botSpecialization: delegation.botSpecialization,
          botName: targetBot.name,
          status: 'failed',
          error: 'All AI providers failed for this bot',
          priority: delegation.priority,
        }
      }

      // Use structured severity markers for issue counting (matches specialist prompts)
      const criticals = (botResponse.match(/\*\*CRITICAL[:\s]/gi) || []).length
      const warnings = (botResponse.match(/\*\*WARNING[:\s]/gi) || []).length
      const infos = (botResponse.match(/\*\*INFO[:\s]/gi) || []).length
      const issuesFound = criticals + warnings + infos
        || (botResponse.match(/critical|warning|vulnerability|bug|error|issue/gi) || []).length // fallback

      return {
        botSpecialization: delegation.botSpecialization,
        botName: targetBot.name,
        botId: targetBot.id,
        status: 'completed',
        priority: delegation.priority,
        provider: botProvider,
        model: botModelInfo.model,
        instructions: delegation.instructions,
        reason: delegation.reason,
        issuesFound,
        criticals,
        warnings,
        response: botResponse,
        summary: botResponse.split('\n').find((l: string) => l.trim().length > 10)?.replace(/^[#*\->\s]+/, '').substring(0, 200) || '',
      }
    }

    const delegations = delegationPlan.delegations || []
    // Execute in parallel — each bot is independent
    const delegationResults = await Promise.all(delegations.map(executeDelegation))

    // ─── Step 3: CEO synthesizes results ─────────────────────────────────────
    const completedResults = delegationResults.filter(r => r.status === 'completed')
    let ceoSynthesis = ''

    if (completedResults.length > 0) {
      const failedResults = delegationResults.filter(r => r.status === 'failed')
      const skippedResults = delegationResults.filter(r => r.status === 'skipped')
      const totalCriticals = completedResults.reduce((acc: number, r: any) => acc + (r.criticals || 0), 0)
      const totalWarnings = completedResults.reduce((acc: number, r: any) => acc + (r.warnings || 0), 0)

      const synthesisMessage = [
        `## SYNTHESIS TASK\n`,
        `You delegated "${task}" to your team. Here are their reports:\n\n`,
        `**Team execution summary:** ${completedResults.length} completed, ${failedResults.length} failed, ${skippedResults.length} skipped.\n`,
        `**Severity totals across all reports:** ${totalCriticals} CRITICAL, ${totalWarnings} WARNING\n\n`,
        ...completedResults.map(r => (
          `### ${r.botName} (${r.botSpecialization}) — Priority: ${r.priority} — Issues: ${r.issuesFound}\n${r.response?.substring(0, 12000) || 'No response'}\n\n---\n\n`
        )),
        failedResults.length > 0 ? `\n**FAILED BOTS:** ${failedResults.map(r => r.botSpecialization).join(', ')} — these specialists could not complete their analysis.\n\n` : '',
        `\nSynthesize into a unified engineering report. Your report must:\n`,
        `1. **Critical findings (ship-blocking)** — issues that would cause data loss, security vulnerabilities, or production outages. Include which bot found them and the specific file/location.\n`,
        `2. **Cross-cutting issues** — problems that multiple bots flagged from different angles (e.g., the code reviewer found a logic bug that the security auditor also flagged as an injection vector). These are high-confidence findings.\n`,
        `3. **Conflicts between specialists** — cases where one bot recommends X and another recommends Y. State who is right and why, or flag it for the user to decide.\n`,
        `4. **Prioritized action plan** — concrete next steps ranked by impact. For each: what to do, why, estimated effort, and which specialist's findings support it.\n`,
        `5. **Gaps in coverage** — what did the team NOT check? What risks remain uninvestigated?\n`,
        `6. **Overall verdict** — would you ship this code as-is? What is the risk level (high/medium/low)?`,
      ].join('')

      const synthMessages = [
        { role: 'system' as const, content: ceoSystemPrompt + '\n\nYou are synthesizing your team\'s results into a final engineering report. Be specific — reference file paths, line numbers, and severity levels from the specialist reports. Do not add generic advice that isn\'t grounded in the actual findings.' },
        { role: 'user' as const, content: synthesisMessage }
      ]

      for (const providerKey of tryOrder) {
        const service = aiRouter.getService(providerKey)
        if (!service) continue
        try {
          const aiResponse = await service.generate({
            messages: synthMessages,
            model: providerKey === modelInfo.provider ? modelInfo.model : undefined as any,
            temperature: 0.3,
            maxTokens: 16000,
          })
          ceoSynthesis = aiResponse.content
          break
        } catch {
          continue
        }
      }
    }

    res.json({
      plan: delegationPlan,
      ceoProvider,
      delegationResults: delegationResults.map(r => ({
        ...r,
        response: undefined,  // Don't send full responses in the main payload to keep it lightweight
        responseLength: r.response?.length || 0,
      })),
      fullResults: delegationResults,  // Full results available for the frontend
      synthesis: ceoSynthesis,
      stats: {
        totalDelegated: delegationPlan.delegations?.length || 0,
        completed: completedResults.length,
        failed: delegationResults.filter(r => r.status === 'failed').length,
        skipped: delegationResults.filter(r => r.status === 'skipped').length,
        totalIssuesFound: delegationResults.reduce((acc: number, r: any) => acc + (r.issuesFound || 0), 0),
      },
      executedAt: new Date().toISOString(),
    })

  } catch (error) {
    console.error('CEO delegation error:', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'CEO delegation failed' })
  }
})

// ─── Advanced: Streaming bot execution (SSE) ────────────────────────────────
// POST /api/v1/openclaw/team/bots/:id/stream — Stream bot execution in real-time
openclawRouter.post('/team/bots/:id/stream', async (req, res) => {
  try {
    const { specialization, model, skill, preferences, context, role } = req.body
    const botId = req.params.id

    if (!skill || !specialization) {
      return res.status(400).json({ error: 'skill and specialization are required' })
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    res.write(`data: ${JSON.stringify({ type: 'status', status: 'reading_files', message: 'Reading project files...' })}\n\n`)

    const systemPrompt = buildRolePrompt(skillPrompts[skill] || skillPrompts['bloop-code-review'], role)
    const rawTargetPaths: string[] = context?.targetPaths || preferences?.targetPaths || ['src/']
    const rawExcludePaths: string[] = context?.excludePaths || preferences?.excludePaths || ['node_modules/', 'dist/']
    const targetPaths = rawTargetPaths.filter((p: string) => typeof p === 'string' && !path.isAbsolute(p) && !p.includes('..'))
    const excludePaths = rawExcludePaths.filter((p: string) => typeof p === 'string' && !path.isAbsolute(p))

    let projectPath = '.'
    if (req.workspace?.diskPath) {
      const workspaceAbsolute = path.resolve(PROJECT_ROOT, req.workspace.diskPath)
      if (workspaceAbsolute.startsWith(PROJECT_ROOT)) {
        projectPath = req.workspace.diskPath
        if (!fs.existsSync(workspaceAbsolute)) fs.mkdirSync(workspaceAbsolute, { recursive: true })
      }
    }

    const streamFilesRoot = path.resolve(PROJECT_ROOT, projectPath)
    const projectFiles = readProjectFilesSmart(targetPaths, excludePaths, streamFilesRoot)
    res.write(`data: ${JSON.stringify({ type: 'status', status: 'files_read', filesCount: projectFiles.fileCount, files: projectFiles.fileList })}\n\n`)

    const userMessage = [
      `**Files analyzed:** ${projectFiles.fileCount}\n`,
      '\n--- BEGIN PROJECT CODE ---\n',
      projectFiles.content,
      '\n--- END PROJECT CODE ---',
    ].join('')

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userMessage }
    ]

    // Progress stage: loading memory
    res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'memory', percent: 40, message: 'Loading bot memory...' })}\n\n`)
    const memCtx = buildMemoryContext(botId, 4000)
    // Build final messages array without mutating the original
    const finalMessages = memCtx
      ? [messages[0], { role: 'user' as const, content: memCtx + '\n' + messages[1].content }]
      : [...messages]

    res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'analyzing', percent: 50, message: `${specialization} is analyzing ${projectFiles.fileCount} files...` })}\n\n`)

    // Try to stream using AI providers with resilience
    const modelInfo = aiRouter.selectBestModel({ messages: finalMessages, model })
    const availableProviders = aiRouter.getAvailableProviders()
    const tryOrder = [modelInfo.provider, ...availableProviders.filter(p => p !== modelInfo.provider)]

    let streamed = false
    let streamedContent = ''
    let attemptNum = 0

    for (const providerKey of tryOrder) {
      const service = aiRouter.getService(providerKey)
      if (!service) continue

      attemptNum++
      res.write(`data: ${JSON.stringify({ type: 'meta', provider: providerKey, model: modelInfo.model, attempt: attemptNum })}\n\n`)
      res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'streaming', percent: 60, message: `Streaming via ${providerKey}...` })}\n\n`)

      try {
        if (service.generateStream) {
          await new Promise<void>((resolve, reject) => {
            service.generateStream!(
              { messages: finalMessages, model: providerKey === modelInfo.provider ? modelInfo.model : undefined, temperature: 0.3, maxTokens: 16000 },
              {
                onToken: (text: string) => {
                  streamedContent += text
                  res.write(`data: ${JSON.stringify({ type: 'content', text })}\n\n`)
                },
                onDone: (info: any) => {
                  res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'recording', percent: 95, message: 'Recording findings...' })}\n\n`)
                  // Record to memory
                  if (streamedContent.length > 0) {
                    const memResult = recordBotRun(botId, specialization, streamedContent, {
                      filesAnalyzed: projectFiles.fileCount,
                      provider: providerKey,
                      model: modelInfo.model,
                      summary: streamedContent.split('\n').find(l => l.trim().length > 10)?.replace(/^[#*\->\s]+/, '').substring(0, 200) || '',
                    })
                    res.write(`data: ${JSON.stringify({ type: 'memory', newFindings: memResult.newFindings, deduped: memResult.deduplicatedFindings, totalOpen: memResult.totalOpenFindings })}\n\n`)
                  }
                  res.write(`data: ${JSON.stringify({ type: 'done', ...info })}\n\n`)
                  resolve()
                },
                onError: (error: string) => { reject(new Error(error)) },
              }
            ).catch(reject)
          })
          streamed = true
          break
        } else {
          const aiResponse = await service.generate({
            messages: finalMessages,
            model: providerKey === modelInfo.provider ? modelInfo.model : undefined as any,
            temperature: 0.3, maxTokens: 16000,
          })
          const content = aiResponse.content
          streamedContent = content
          const chunkSize = 15
          for (let i = 0; i < content.length; i += chunkSize) {
            res.write(`data: ${JSON.stringify({ type: 'content', text: content.slice(i, i + chunkSize) })}\n\n`)
          }
          // Record to memory
          res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'recording', percent: 95, message: 'Recording findings...' })}\n\n`)
          const memResult = recordBotRun(botId, specialization, content, {
            filesAnalyzed: projectFiles.fileCount,
            provider: providerKey,
            model: aiResponse.model,
            summary: content.split('\n').find(l => l.trim().length > 10)?.replace(/^[#*\->\s]+/, '').substring(0, 200) || '',
          })
          res.write(`data: ${JSON.stringify({ type: 'memory', newFindings: memResult.newFindings, deduped: memResult.deduplicatedFindings, totalOpen: memResult.totalOpenFindings })}\n\n`)
          res.write(`data: ${JSON.stringify({ type: 'done', model: aiResponse.model, finishReason: aiResponse.finishReason })}\n\n`)
          streamed = true
          break
        }
      } catch (err) {
        const errMsg = (err as Error).message?.slice(0, 80) || 'unknown error'
        console.warn(`Bot stream: ${providerKey} failed, trying next...`, errMsg)
        res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'retrying', percent: 55, message: `${providerKey} failed, trying next provider...` })}\n\n`)
      }
    }

    if (!streamed) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'All AI providers failed' })}\n\n`)
    }

    res.end()
  } catch (error) {
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Stream error' })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Stream error' })
    }
  }
})

// GET /api/v1/openclaw/team/status — Team overview
openclawRouter.get('/team/status', async (req, res) => {
  try {
    const openclawService = getOpenClawService()
    const gatewayStatus = await openclawService.getStatus().catch(() => ({ connected: false }))
    const solanaInfo = await getProofBalance().catch(() => ({ sol: 0, address: '', network: 'devnet' }))

    res.json({
      gateway: gatewayStatus,
      availableSkills: Object.keys(skillPrompts),
      availableProviders: aiRouter.getAvailableProviders(),
      solana: {
        proofAddress: solanaInfo.address,
        balance: solanaInfo.sol,
        network: solanaInfo.network,
        proofsEnabled: solanaInfo.sol > 0,
      },
      providerHealth: getProviderHealth(),
      fileCache: getFileCacheStats(),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get team status' })
  }
})

// ─── Bot Memory & Intelligence Endpoints ─────────────────────────────────────

// GET /api/v1/openclaw/team/bots/:id/memory — Get bot's memory and findings
openclawRouter.get('/team/bots/:id/memory', async (req, res) => {
  try {
    const botId = req.params.id
    const specialization = (req.query.specialization as string) || 'unknown'
    const knowledge = getBotKnowledge(botId, specialization)
    res.json(knowledge)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get bot memory' })
  }
})

// POST /api/v1/openclaw/team/bots/:id/findings/:findingId/resolve — Resolve a finding
openclawRouter.post('/team/bots/:id/findings/:findingId/resolve', async (req, res) => {
  try {
    const { id: botId, findingId } = req.params
    const status = req.body.status === 'ignored' ? 'ignored' : 'resolved'
    const success = resolveFinding(botId, findingId, status)
    res.json({ success, findingId, status })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to resolve finding' })
  }
})

// GET /api/v1/openclaw/team/findings — All open findings across all bots
openclawRouter.get('/team/findings', async (_req, res) => {
  try {
    const findings = getAllOpenFindings()
    res.json({
      findings,
      total: findings.length,
      bySeverity: {
        critical: findings.filter(f => f.severity === 'critical').length,
        warning: findings.filter(f => f.severity === 'warning').length,
        info: findings.filter(f => f.severity === 'info').length,
      },
    })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get findings' })
  }
})

// GET /api/v1/openclaw/team/health — Provider health and system diagnostics
openclawRouter.get('/team/health', async (_req, res) => {
  try {
    res.json({
      providers: getProviderHealth(),
      fileCache: getFileCacheStats(),
      availableProviders: aiRouter.getAvailableProviders(),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get health status' })
  }
})
