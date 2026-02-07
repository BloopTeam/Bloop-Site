/**
 * OpenClaw API Routes
 * Protocol v3 (v2026.1.21)
 * WebSocket Gateway + OpenResponses HTTP API + Bot Team Orchestration
 */
import { Router } from 'express'
import { getOpenClawService } from '../../services/openclaw/index.js'
import { ModelRouter } from '../../services/ai/router.js'
import { anchorExecutionProof, getProofPublicKey, getProofBalance, ExecutionData } from '../../services/solana/proofOfExecution.js'
import * as fs from 'fs'
import * as path from 'path'

export const openclawRouter = Router()
const aiRouter = new ModelRouter()

// ─── File reading utilities for bot team ─────────────────────────────────────

const MAX_FILE_SIZE = 50_000       // 50KB per file
const MAX_TOTAL_CHARS = 120_000    // ~30K tokens budget for file contents

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
  'bloop-code-review': 'You are an expert code reviewer. Analyze the following code for quality issues, potential bugs, security vulnerabilities, style inconsistencies, and adherence to best practices. Provide specific, actionable feedback with severity ratings (critical/warning/info). Format your findings as a structured report.',
  'bloop-test-gen': 'You are a testing expert. Generate comprehensive test cases for the following code. Include unit tests, edge case coverage, and error path testing. Use modern testing patterns with describe/it blocks, clear naming, and proper setup/teardown.',
  'bloop-security': 'You are a cybersecurity expert. Audit the following code for security vulnerabilities including OWASP Top 10 risks, injection attacks, authentication flaws, data exposure, insecure dependencies, and hardcoded secrets. Prioritize findings by severity and provide remediation steps.',
  'bloop-docs': 'You are a technical documentation expert. Generate clear, comprehensive documentation for the following code. Include function descriptions, parameter documentation, return types, usage examples, and any important caveats or edge cases.',
  'bloop-optimize': 'You are a performance optimization expert. Analyze the following code for performance bottlenecks, unnecessary computations, memory leaks, inefficient algorithms, and optimization opportunities. Provide specific suggestions with estimated impact.',
  'bloop-debug': 'You are a debugging expert. Analyze the following code for potential bugs, race conditions, null pointer risks, logic errors, off-by-one errors, and unhandled edge cases. Think through execution paths and identify where failures could occur.',
  'bloop-refactor': 'You are a software architect. Review the following code for architectural issues, code smells, coupling problems, SOLID violations, and refactoring opportunities. Suggest specific improvements to structure, naming, and abstractions.'
}

// POST /api/v1/openclaw/team/bots/:id/execute — Execute a bot task
// Auth middleware is applied at the router level in dev-server.ts
openclawRouter.post('/team/bots/:id/execute', async (req, res) => {
  try {
    const { specialization, model, skill, preferences, context } = req.body
    const botId = req.params.id
    const userId = req.user?.id || 'anonymous'

    if (!skill || !specialization) {
      return res.status(400).json({ error: 'skill and specialization are required' })
    }

    const systemPrompt = skillPrompts[skill] || skillPrompts['bloop-code-review']
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

    const projectFiles = readProjectFiles(targetPaths, excludePaths, projectPath)
    console.log(`Bot ${botId} [user=${userId}]: Read ${projectFiles.fileCount} files (${projectFiles.content.length} chars) from ${targetPaths.join(', ')}`)

    const userMessage = [
      userInstructions ? `**Instructions:** ${userInstructions}\n\n` : '',
      `**Target paths:** ${targetPaths.join(', ')}\n`,
      excludePaths.length ? `**Exclude:** ${excludePaths.join(', ')}\n` : '',
      `**Files analyzed:** ${projectFiles.fileCount} (${projectFiles.fileList.join(', ')})\n`,
      '\nAnalyze the code below according to your specialization. Provide a structured report with:',
      '\n1. Summary of findings',
      '\n2. Specific issues found (with file path, line reference, and severity: critical/warning/info)',
      '\n3. Actionable suggestions with code examples where relevant',
      '\n4. Files that need the most attention',
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
      } catch {
        // Fall through to direct AI execution
        responseContent = ''
      }
    }

    if (!responseContent) {
      // Direct AI execution through available providers — with fallback
      const availableProviders = aiRouter.getAvailableProviders()
      let lastError: Error | null = null

      // Try requested model first, then fallback to others
      const modelInfo = aiRouter.selectBestModel({ messages, model })
      const tryOrder = [modelInfo.provider, ...availableProviders.filter(p => p !== modelInfo.provider)]

      for (const providerKey of tryOrder) {
        const service = aiRouter.getService(providerKey)
        if (!service) continue

        try {
          const aiResponse = await service.generate({
            messages,
            model: modelInfo.provider === providerKey ? modelInfo.model : undefined as any,
            temperature: 0.3,
            maxTokens: 4000,
          })

          responseContent = aiResponse.content
          provider = providerKey
          break
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err))
          console.warn(`Bot execution: ${providerKey} failed, trying next provider...`, lastError.message)
          continue
        }
      }

      if (!responseContent) {
        throw lastError || new Error('All AI providers failed')
      }
    }

    // Parse the response for structured data
    const issuesFound = (responseContent.match(/critical|warning|vulnerability|bug|error|issue/gi) || []).length
    const suggestionsGiven = (responseContent.match(/suggest|recommend|consider|should|improve/gi) || []).length
    const filesMatch = responseContent.match(/[a-zA-Z0-9_\-/.]+\.(ts|tsx|js|jsx|rs|py|css|html|json|md)/g)
    const filesAffected = filesMatch ? [...new Set(filesMatch)].slice(0, 20) : []

    // Build summary
    const firstLine = responseContent.split('\n').find(l => l.trim().length > 10)
    const summary = firstLine
      ? firstLine.replace(/^[#*\->\s]+/, '').substring(0, 200)
      : `${specialization} analysis completed`

    // ─── Anchor execution proof to Solana ─────────────────────────────────
    const executionData: ExecutionData = {
      botId,
      userId,
      specialization,
      skill,
      filesAnalyzed: projectFiles.fileCount,
      fileList: projectFiles.fileList,
      issuesFound,
      executionTimeMs: Date.now() - Date.now(), // placeholder
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
      suggestionsGiven,
      filesAffected,
      executedAt: new Date().toISOString(),
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
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get team status' })
  }
})
