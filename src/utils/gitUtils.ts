/**
 * Git utilities for visual git integration
 */

export interface GitBranch {
  name: string
  current: boolean
  ahead: number
  behind: number
  lastCommit: string
  author: string
  date: Date
}

export interface GitCommit {
  hash: string
  message: string
  author: string
  date: Date
  branch: string
}

export interface GitDiff {
  file: string
  additions: number
  deletions: number
  changes: DiffLine[]
}

export interface DiffLine {
  lineNumber: number
  type: 'added' | 'removed' | 'modified' | 'context'
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

export interface GitConflict {
  file: string
  conflicts: ConflictMarker[]
}

export interface ConflictMarker {
  start: number
  end: number
  ours: string[]
  theirs: string[]
  base?: string[]
}

/**
 * Generate mock git branch graph
 */
export function generateBranchGraph(): GitBranch[] {
  return [
    {
      name: 'main',
      current: true,
      ahead: 0,
      behind: 0,
      lastCommit: 'a1b2c3d',
      author: 'Bloop Team',
      date: new Date(Date.now() - 3600000),
    },
    {
      name: 'feature/ai-assistant',
      current: false,
      ahead: 3,
      behind: 1,
      lastCommit: 'e4f5g6h',
      author: 'Developer',
      date: new Date(Date.now() - 7200000),
    },
    {
      name: 'bugfix/terminal',
      current: false,
      ahead: 2,
      behind: 0,
      lastCommit: 'i7j8k9l',
      author: 'Developer',
      date: new Date(Date.now() - 10800000),
    },
  ]
}

/**
 * Generate mock git commits
 */
export function generateCommits(branch: string = 'main'): GitCommit[] {
  return [
    {
      hash: 'a1b2c3d',
      message: 'feat: add visual git integration',
      author: 'Bloop Team',
      date: new Date(Date.now() - 3600000),
      branch,
    },
    {
      hash: 'b2c3d4e',
      message: 'fix: resolve white screen issue',
      author: 'Bloop Team',
      date: new Date(Date.now() - 7200000),
      branch,
    },
    {
      hash: 'c3d4e5f',
      message: 'chore: update dependencies',
      author: 'Bloop Team',
      date: new Date(Date.now() - 10800000),
      branch,
    },
  ]
}

/**
 * Generate mock git diff
 */
export function generateDiff(file: string): GitDiff {
  return {
    file,
    additions: 15,
    deletions: 8,
    changes: [
      { lineNumber: 1, type: 'context', content: 'import { useState } from \'react\'' },
      { lineNumber: 2, type: 'context', content: '' },
      { lineNumber: 3, type: 'removed', content: 'export default function App() {', oldLineNumber: 3 },
      { lineNumber: 3, type: 'added', content: 'export default function BloopApp() {', newLineNumber: 3 },
      { lineNumber: 4, type: 'context', content: '  const [count, setCount] = useState(0)' },
      { lineNumber: 5, type: 'context', content: '' },
      { lineNumber: 6, type: 'added', content: '  // New feature', newLineNumber: 6 },
      { lineNumber: 7, type: 'context', content: '  return (' },
    ],
  }
}

/**
 * Generate commit message templates
 */
export function getCommitTemplates(): string[] {
  return [
    'feat: add new feature',
    'fix: resolve bug',
    'docs: update documentation',
    'style: format code',
    'refactor: restructure code',
    'test: add tests',
    'chore: update dependencies',
    'perf: improve performance',
    'ci: update CI/CD',
    'build: update build config',
  ]
}

/**
 * Detect git conflicts in file content
 */
export function detectConflicts(content: string): ConflictMarker[] {
  const conflicts: ConflictMarker[] = []
  const lines = content.split('\n')
  let conflictStart = -1
  let oursStart = -1
  let theirsStart = -1
  let baseStart = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    if (line.includes('<<<<<<<')) {
      conflictStart = i
      oursStart = i + 1
    } else if (line.includes('=======')) {
      if (conflictStart >= 0) {
        theirsStart = i + 1
      }
    } else if (line.includes('>>>>>>>')) {
      if (conflictStart >= 0 && theirsStart >= 0) {
        conflicts.push({
          start: conflictStart,
          end: i,
          ours: lines.slice(oursStart, theirsStart - 1),
          theirs: lines.slice(theirsStart, i),
        })
        conflictStart = -1
        oursStart = -1
        theirsStart = -1
      }
    }
  }

  return conflicts
}

/**
 * Resolve conflict by choosing ours or theirs
 */
export function resolveConflict(
  content: string,
  conflictIndex: number,
  choice: 'ours' | 'theirs' | 'both'
): string {
  const conflicts = detectConflicts(content)
  if (conflictIndex >= conflicts.length) return content

  const conflict = conflicts[conflictIndex]
  const lines = content.split('\n')
  
  let replacement: string[]
  if (choice === 'ours') {
    replacement = conflict.ours
  } else if (choice === 'theirs') {
    replacement = conflict.theirs
  } else {
    replacement = [...conflict.ours, ...conflict.theirs]
  }

  const before = lines.slice(0, conflict.start)
  const after = lines.slice(conflict.end + 1)
  
  return [...before, ...replacement, ...after].join('\n')
}
