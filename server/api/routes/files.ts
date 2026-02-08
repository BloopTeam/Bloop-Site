/**
 * File operations API — all files scoped to the user's workspace directory.
 * 
 * Every path is sandboxed inside req.workspace.diskPath.
 * Path traversal (../) is blocked.
 */
import { Router, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'

export const filesRouter = Router()

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Resolve a user-provided path safely inside the workspace. Returns null if path escapes. */
function safePath(workspace: string, userPath: string): string | null {
  // Normalize and remove leading slashes
  const cleaned = userPath.replace(/\\/g, '/').replace(/^\/+/, '')
  const resolved = path.resolve(workspace, cleaned)
  // Must stay inside workspace
  if (!resolved.startsWith(path.resolve(workspace))) return null
  return resolved
}

/** Ensure the workspace root directory exists */
function ensureWorkspace(diskPath: string) {
  const abs = path.resolve(diskPath)
  if (!fs.existsSync(abs)) {
    fs.mkdirSync(abs, { recursive: true })
  }
}

// ── List directory ──────────────────────────────────────────────────────────

filesRouter.get('/list', (req: Request, res: Response) => {
  const ws = req.workspace!
  ensureWorkspace(ws.diskPath)

  const dirParam = (req.query.path as string) || '.'
  const absDir = safePath(ws.diskPath, dirParam)
  if (!absDir) return res.status(400).json({ error: 'Invalid path' })

  if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
    return res.json({ path: dirParam, directories: [], files: [] })
  }

  const entries = fs.readdirSync(absDir, { withFileTypes: true })
  const directories: any[] = []
  const files: any[] = []

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue // skip dotfiles
    const entryPath = path.join(absDir, entry.name)
    const stat = fs.statSync(entryPath)
    const relativePath = path.relative(path.resolve(ws.diskPath), entryPath).replace(/\\/g, '/')

    if (entry.isDirectory()) {
      directories.push({
        name: entry.name,
        path: relativePath,
        modifiedAt: stat.mtime.toISOString(),
      })
    } else {
      files.push({
        name: entry.name,
        path: relativePath,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      })
    }
  }

  res.json({ path: dirParam, directories, files })
})

// ── List all files recursively (flat) ───────────────────────────────────────

filesRouter.get('/tree', (req: Request, res: Response) => {
  const ws = req.workspace!
  ensureWorkspace(ws.diskPath)

  const allFiles: any[] = []
  const root = path.resolve(ws.diskPath)

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else {
        const stat = fs.statSync(full)
        allFiles.push({
          name: entry.name,
          path: path.relative(root, full).replace(/\\/g, '/'),
          size: stat.size,
          modifiedAt: stat.mtime.toISOString(),
        })
      }
    }
  }
  walk(root)

  res.json({ files: allFiles, total: allFiles.length })
})

// ── Read file ───────────────────────────────────────────────────────────────

filesRouter.get('/read', (req: Request, res: Response) => {
  const ws = req.workspace!
  ensureWorkspace(ws.diskPath)

  const filePath = req.query.path as string
  if (!filePath) return res.status(400).json({ error: 'path query param required' })

  const abs = safePath(ws.diskPath, filePath)
  if (!abs) return res.status(400).json({ error: 'Invalid path' })

  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    return res.json({ path: filePath, content: '', exists: false, size: 0 })
  }

  const content = fs.readFileSync(abs, 'utf-8')
  const stat = fs.statSync(abs)
  res.json({ path: filePath, content, exists: true, size: stat.size })
})

// ── Write file ──────────────────────────────────────────────────────────────

filesRouter.post('/write', (req: Request, res: Response) => {
  const ws = req.workspace!
  ensureWorkspace(ws.diskPath)

  const { path: filePath, content, create_dirs } = req.body
  if (!filePath || typeof content !== 'string') {
    return res.status(400).json({ error: 'path and content are required' })
  }

  const abs = safePath(ws.diskPath, filePath)
  if (!abs) return res.status(400).json({ error: 'Invalid path' })

  // Optionally create parent directories
  if (create_dirs !== false) {
    const dir = path.dirname(abs)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  fs.writeFileSync(abs, content, 'utf-8')
  res.json({ success: true, message: `Written ${filePath}`, path: filePath })
})

// ── Write multiple files at once ────────────────────────────────────────────

filesRouter.post('/write-batch', (req: Request, res: Response) => {
  const ws = req.workspace!
  ensureWorkspace(ws.diskPath)

  const { files } = req.body
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'files array is required' })
  }

  const results: any[] = []
  for (const file of files) {
    if (!file.path || typeof file.content !== 'string') {
      results.push({ path: file.path, success: false, error: 'Missing path or content' })
      continue
    }
    const abs = safePath(ws.diskPath, file.path)
    if (!abs) {
      results.push({ path: file.path, success: false, error: 'Invalid path' })
      continue
    }
    const dir = path.dirname(abs)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(abs, file.content, 'utf-8')
    results.push({ path: file.path, success: true })
  }

  res.json({ success: true, results, total: results.length })
})

// ── Delete file ─────────────────────────────────────────────────────────────

filesRouter.delete('/delete', (req: Request, res: Response) => {
  const ws = req.workspace!
  const filePath = req.query.path as string
  if (!filePath) return res.status(400).json({ error: 'path query param required' })

  const abs = safePath(ws.diskPath, filePath)
  if (!abs) return res.status(400).json({ error: 'Invalid path' })

  if (!fs.existsSync(abs)) {
    return res.status(404).json({ error: 'File not found' })
  }

  fs.unlinkSync(abs)
  res.json({ success: true, message: `Deleted ${filePath}`, path: filePath })
})

// ── Rename / move file ──────────────────────────────────────────────────────

filesRouter.post('/rename', (req: Request, res: Response) => {
  const ws = req.workspace!
  const { from, to } = req.body
  if (!from || !to) return res.status(400).json({ error: 'from and to are required' })

  const absFrom = safePath(ws.diskPath, from)
  const absTo = safePath(ws.diskPath, to)
  if (!absFrom || !absTo) return res.status(400).json({ error: 'Invalid path' })

  if (!fs.existsSync(absFrom)) {
    return res.status(404).json({ error: 'Source file not found' })
  }

  const toDir = path.dirname(absTo)
  if (!fs.existsSync(toDir)) fs.mkdirSync(toDir, { recursive: true })

  fs.renameSync(absFrom, absTo)
  res.json({ success: true, from, to })
})
