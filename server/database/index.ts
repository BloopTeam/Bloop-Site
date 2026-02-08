/**
 * Database Layer — SQLite (production-migratable to PostgreSQL)
 *
 * Stores users, sessions, workspaces, API keys, and audit logs.
 * Each user gets an isolated workspace directory for their project files.
 */
import Database from 'better-sqlite3'
import * as path from 'path'
import * as fs from 'fs'
import * as crypto from 'crypto'

// ─── Database file location ──────────────────────────────────────────────────
const DB_DIR = path.resolve(process.cwd(), 'data')
const DB_PATH = path.join(DB_DIR, 'bloop.db')

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
}

// ─── Initialize database ─────────────────────────────────────────────────────
const db = new Database(DB_PATH)

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ─── Schema ──────────────────────────────────────────────────────────────────
db.exec(`
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    plan TEXT DEFAULT 'free' CHECK(plan IN ('free', 'pro', 'team', 'enterprise')),
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    last_login_at TEXT
  );

  -- Sessions / refresh tokens
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    revoked_at TEXT
  );

  -- User workspaces (project isolation)
  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    disk_path TEXT NOT NULL,
    max_storage_bytes INTEGER DEFAULT 524288000, -- 500MB default
    used_storage_bytes INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, slug)
  );

  -- Per-user API keys (encrypted at rest)
  CREATE TABLE IF NOT EXISTS user_api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    encrypted_key TEXT NOT NULL,
    key_hint TEXT, -- last 4 chars for display
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, provider)
  );

  -- Bot team state (per-user)
  CREATE TABLE IF NOT EXISTS user_bots (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    specialization TEXT NOT NULL,
    model TEXT NOT NULL,
    status TEXT DEFAULT 'idle',
    preferences TEXT DEFAULT '{}',
    stats TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Bot execution log (audit trail)
  CREATE TABLE IF NOT EXISTS bot_executions (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL REFERENCES user_bots(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id TEXT,
    status TEXT NOT NULL,
    files_analyzed INTEGER DEFAULT 0,
    issues_found INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    summary TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Persistent agents (survive server restarts)
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'idle',
    capabilities TEXT DEFAULT '[]',
    model TEXT,
    system_prompt TEXT NOT NULL,
    memory TEXT DEFAULT '[]',
    tasks TEXT DEFAULT '[]',
    metrics TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    last_active_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_agents_user ON agents(user_id);

  -- Audit log (all sensitive operations)
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    ip_address TEXT,
    details TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Rate limit tracking
  CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0,
    window_start TEXT DEFAULT (datetime('now'))
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_workspaces_user ON workspaces(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_api_keys_user ON user_api_keys(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_bots_user ON user_bots(user_id);
  CREATE INDEX IF NOT EXISTS idx_bot_executions_user ON bot_executions(user_id);
  CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
  CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
`)

// ─── Encryption helpers for API keys ─────────────────────────────────────────
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')
const ALGORITHM = 'aes-256-gcm'

function encryptApiKey(plaintext: string): string {
  const iv = crypto.randomBytes(16)
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex')
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}:${tag}:${encrypted}`
}

function decryptApiKey(ciphertext: string): string {
  const [ivHex, tagHex, encrypted] = ciphertext.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// ─── User operations ─────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  username: string
  display_name: string | null
  plan: string
  is_active: number
  created_at: string
  updated_at: string
  last_login_at: string | null
}

export interface UserWithPassword extends User {
  password_hash: string
}

const stmts = {
  createUser: db.prepare(`
    INSERT INTO users (id, email, username, password_hash, display_name)
    VALUES (?, ?, ?, ?, ?)
  `),
  getUserById: db.prepare(`SELECT * FROM users WHERE id = ?`),
  getUserByEmail: db.prepare(`SELECT * FROM users WHERE email = ?`),
  getUserByUsername: db.prepare(`SELECT * FROM users WHERE username = ?`),
  updateLastLogin: db.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`),

  // Sessions
  createSession: db.prepare(`
    INSERT INTO sessions (id, user_id, refresh_token_hash, user_agent, ip_address, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  getSession: db.prepare(`SELECT * FROM sessions WHERE id = ? AND revoked_at IS NULL`),
  revokeSession: db.prepare(`UPDATE sessions SET revoked_at = datetime('now') WHERE id = ?`),
  revokeUserSessions: db.prepare(`UPDATE sessions SET revoked_at = datetime('now') WHERE user_id = ?`),
  cleanExpiredSessions: db.prepare(`DELETE FROM sessions WHERE expires_at < datetime('now')`),

  // Workspaces
  createWorkspace: db.prepare(`
    INSERT INTO workspaces (id, user_id, name, slug, disk_path)
    VALUES (?, ?, ?, ?, ?)
  `),
  getUserWorkspaces: db.prepare(`SELECT * FROM workspaces WHERE user_id = ? AND is_active = 1`),
  getWorkspaceById: db.prepare(`SELECT * FROM workspaces WHERE id = ? AND is_active = 1`),
  getWorkspaceBySlug: db.prepare(`SELECT * FROM workspaces WHERE user_id = ? AND slug = ? AND is_active = 1`),

  // API keys
  upsertApiKey: db.prepare(`
    INSERT INTO user_api_keys (id, user_id, provider, encrypted_key, key_hint)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, provider) DO UPDATE SET
      encrypted_key = excluded.encrypted_key,
      key_hint = excluded.key_hint,
      is_active = 1,
      updated_at = datetime('now')
  `),
  getUserApiKeys: db.prepare(`
    SELECT id, user_id, provider, key_hint, is_active, created_at
    FROM user_api_keys WHERE user_id = ? AND is_active = 1
  `),
  getUserApiKey: db.prepare(`
    SELECT * FROM user_api_keys WHERE user_id = ? AND provider = ? AND is_active = 1
  `),
  deleteApiKey: db.prepare(`
    UPDATE user_api_keys SET is_active = 0, updated_at = datetime('now')
    WHERE user_id = ? AND provider = ?
  `),

  // Bots
  createBot: db.prepare(`
    INSERT INTO user_bots (id, user_id, workspace_id, name, specialization, model, preferences)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  getUserBots: db.prepare(`SELECT * FROM user_bots WHERE user_id = ?`),
  getBot: db.prepare(`SELECT * FROM user_bots WHERE id = ? AND user_id = ?`),
  updateBotStatus: db.prepare(`UPDATE user_bots SET status = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`),
  deleteBot: db.prepare(`DELETE FROM user_bots WHERE id = ? AND user_id = ?`),

  // Bot executions
  logExecution: db.prepare(`
    INSERT INTO bot_executions (id, bot_id, user_id, workspace_id, status, files_analyzed, issues_found, execution_time_ms, summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  getBotExecutions: db.prepare(`
    SELECT * FROM bot_executions WHERE bot_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT ?
  `),

  // Agents (persistent)
  createAgent: db.prepare(`
    INSERT INTO agents (id, user_id, name, type, capabilities, model, system_prompt, memory, tasks, metrics)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  getAgentById: db.prepare(`SELECT * FROM agents WHERE id = ?`),
  getAgentByIdAndUser: db.prepare(`SELECT * FROM agents WHERE id = ? AND user_id = ?`),
  getUserAgents: db.prepare(`SELECT * FROM agents WHERE user_id = ? ORDER BY last_active_at DESC`),
  updateAgent: db.prepare(`
    UPDATE agents SET status = ?, memory = ?, tasks = ?, metrics = ?, last_active_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `),
  deleteAgent: db.prepare(`DELETE FROM agents WHERE id = ? AND user_id = ?`),

  // Audit log
  logAudit: db.prepare(`
    INSERT INTO audit_log (user_id, action, resource_type, resource_id, ip_address, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
}

// ─── Exported database service ───────────────────────────────────────────────

export const database = {
  // Users
  createUser(id: string, email: string, username: string, passwordHash: string, displayName?: string) {
    stmts.createUser.run(id, email, username, passwordHash, displayName || username)
    return stmts.getUserById.get(id) as User
  },
  getUserById(id: string) {
    return stmts.getUserById.get(id) as UserWithPassword | undefined
  },
  getUserByEmail(email: string) {
    return stmts.getUserByEmail.get(email) as UserWithPassword | undefined
  },
  getUserByUsername(username: string) {
    return stmts.getUserByUsername.get(username) as UserWithPassword | undefined
  },
  updateLastLogin(userId: string) {
    stmts.updateLastLogin.run(userId)
  },

  // Sessions
  createSession(id: string, userId: string, refreshTokenHash: string, userAgent?: string, ipAddress?: string, expiresAt?: string) {
    const expires = expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    stmts.createSession.run(id, userId, refreshTokenHash, userAgent || '', ipAddress || '', expires)
  },
  getSession(id: string) {
    return stmts.getSession.get(id) as any
  },
  revokeSession(id: string) {
    stmts.revokeSession.run(id)
  },
  revokeAllUserSessions(userId: string) {
    stmts.revokeUserSessions.run(userId)
  },
  cleanExpiredSessions() {
    stmts.cleanExpiredSessions.run()
  },

  // Workspaces
  createWorkspace(id: string, userId: string, name: string, slug: string, diskPath: string) {
    stmts.createWorkspace.run(id, userId, name, slug, diskPath)
    return stmts.getWorkspaceById.get(id) as any
  },
  getUserWorkspaces(userId: string) {
    return stmts.getUserWorkspaces.all(userId) as any[]
  },
  getWorkspaceById(id: string) {
    return stmts.getWorkspaceById.get(id) as any
  },
  getWorkspaceBySlug(userId: string, slug: string) {
    return stmts.getWorkspaceBySlug.get(userId, slug) as any
  },

  // API Keys (encrypted)
  setApiKey(id: string, userId: string, provider: string, apiKey: string) {
    const encrypted = encryptApiKey(apiKey)
    const hint = apiKey.slice(-4)
    stmts.upsertApiKey.run(id, userId, provider, encrypted, hint)
  },
  getUserApiKeys(userId: string) {
    return stmts.getUserApiKeys.all(userId) as any[]
  },
  getDecryptedApiKey(userId: string, provider: string): string | null {
    const row = stmts.getUserApiKey.get(userId, provider) as any
    if (!row) return null
    try {
      return decryptApiKey(row.encrypted_key)
    } catch {
      return null
    }
  },
  deleteApiKey(userId: string, provider: string) {
    stmts.deleteApiKey.run(userId, provider)
  },

  // Bots
  createBot(id: string, userId: string, workspaceId: string | null, name: string, specialization: string, model: string, preferences: object) {
    stmts.createBot.run(id, userId, workspaceId, name, specialization, model, JSON.stringify(preferences))
    return stmts.getBot.get(id, userId) as any
  },
  getUserBots(userId: string) {
    return stmts.getUserBots.all(userId) as any[]
  },
  getBot(id: string, userId: string) {
    return stmts.getBot.get(id, userId) as any
  },
  updateBotStatus(id: string, userId: string, status: string) {
    stmts.updateBotStatus.run(status, id, userId)
  },
  deleteBot(id: string, userId: string) {
    stmts.deleteBot.run(id, userId)
  },

  // Executions
  logExecution(id: string, botId: string, userId: string, workspaceId: string | null, status: string, filesAnalyzed: number, issuesFound: number, executionTimeMs: number, summary: string) {
    stmts.logExecution.run(id, botId, userId, workspaceId, status, filesAnalyzed, issuesFound, executionTimeMs, summary)
  },
  getBotExecutions(botId: string, userId: string, limit = 20) {
    return stmts.getBotExecutions.all(botId, userId, limit) as any[]
  },

  // Agents (persistent)
  createAgent(id: string, userId: string, name: string, type: string, capabilities: string[], model: string | undefined, systemPrompt: string) {
    stmts.createAgent.run(id, userId, name, type, JSON.stringify(capabilities), model || null, systemPrompt, '[]', '[]', JSON.stringify({
      tasksCompleted: 0, tasksTotal: 0, avgResponseTime: 0, successRate: 100,
    }))
    return stmts.getAgentById.get(id) as any
  },
  getAgent(id: string, userId: string) {
    return stmts.getAgentByIdAndUser.get(id, userId) as any
  },
  getAgentById(id: string) {
    return stmts.getAgentById.get(id) as any
  },
  getUserAgents(userId: string) {
    return stmts.getUserAgents.all(userId) as any[]
  },
  updateAgent(id: string, userId: string, status: string, memory: any[], tasks: any[], metrics: any) {
    stmts.updateAgent.run(status, JSON.stringify(memory), JSON.stringify(tasks), JSON.stringify(metrics), id, userId)
  },
  deleteAgent(id: string, userId: string) {
    return stmts.deleteAgent.run(id, userId)
  },

  // Audit
  audit(userId: string | null, action: string, resourceType?: string, resourceId?: string, ipAddress?: string, details?: string) {
    stmts.logAudit.run(userId, action, resourceType || null, resourceId || null, ipAddress || null, details || null)
  },

  // Cleanup
  close() {
    db.close()
  },
}

export default database
