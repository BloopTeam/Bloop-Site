/**
 * Advanced code analysis utilities for the Bloop IDE
 * Provides syntax analysis, complexity metrics, and code quality insights
 */

interface CodeMetrics {
  lines: number
  nonEmptyLines: number
  commentLines: number
  codeLines: number
  complexity: number
  functions: number
  classes: number
  imports: number
}

interface SyntaxToken {
  type: 'keyword' | 'string' | 'comment' | 'number' | 'operator' | 'identifier' | 'function' | 'class'
  value: string
  line: number
  column: number
}

/**
 * Analyzes code and returns comprehensive metrics
 * Used for code statistics and quality assessment
 */
export function analyzeCode(code: string, language: string): CodeMetrics {
  const lines = code.split('\n')
  const metrics: CodeMetrics = {
    lines: lines.length,
    nonEmptyLines: 0,
    commentLines: 0,
    codeLines: 0,
    complexity: 1,
    functions: 0,
    classes: 0,
    imports: 0
  }

  let inBlockComment = false

  lines.forEach(line => {
    const trimmed = line.trim()
    
    if (trimmed.length > 0) {
      metrics.nonEmptyLines++
    }

    // Detect comments based on language
    if (language === 'javascript' || language === 'typescript') {
      if (inBlockComment) {
        metrics.commentLines++
        if (trimmed.includes('*/')) {
          inBlockComment = false
        }
      } else if (trimmed.startsWith('//')) {
        metrics.commentLines++
      } else if (trimmed.includes('/*')) {
        metrics.commentLines++
        inBlockComment = true
      } else if (trimmed.length > 0) {
        metrics.codeLines++
      }

      // Count functions
      if (/function\s+\w+|const\s+\w+\s*=\s*\(|=>\s*{/.test(trimmed)) {
        metrics.functions++
      }

      // Count classes
      if (/class\s+\w+/.test(trimmed)) {
        metrics.classes++
      }

      // Count imports
      if (/^import\s+/.test(trimmed)) {
        metrics.imports++
      }

      // Calculate cyclomatic complexity
      const complexityKeywords = ['if', 'else if', 'for', 'while', 'case', 'catch', '&&', '||', '?']
      complexityKeywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'g')
        const matches = trimmed.match(regex)
        if (matches) {
          metrics.complexity += matches.length
        }
      })
    } else if (language === 'python') {
      if (trimmed.startsWith('#')) {
        metrics.commentLines++
      } else if (trimmed.length > 0) {
        metrics.codeLines++
      }

      if (/^def\s+\w+/.test(trimmed)) {
        metrics.functions++
      }

      if (/^class\s+\w+/.test(trimmed)) {
        metrics.classes++
      }

      if (/^import\s+|^from\s+/.test(trimmed)) {
        metrics.imports++
      }
    }
  })

  return metrics
}

/**
 * Tokenizes code for advanced syntax highlighting and analysis
 * Returns an array of syntax tokens with position information
 */
export function tokenizeCode(code: string, language: string): SyntaxToken[] {
  const tokens: SyntaxToken[] = []
  const lines = code.split('\n')

  const keywords = {
    javascript: ['const', 'let', 'var', 'function', 'class', 'if', 'else', 'for', 'while', 'return', 'import', 'export', 'async', 'await'],
    typescript: ['const', 'let', 'var', 'function', 'class', 'if', 'else', 'for', 'while', 'return', 'import', 'export', 'async', 'await', 'interface', 'type', 'enum'],
    python: ['def', 'class', 'if', 'else', 'for', 'while', 'return', 'import', 'from', 'async', 'await', 'lambda']
  }

  const langKeywords = keywords[language as keyof typeof keywords] || []

  lines.forEach((line, lineIndex) => {
    let column = 0
    const words = line.split(/(\s+|[{}()[\];,.])/g)

    words.forEach(word => {
      if (word.trim().length === 0) {
        column += word.length
        return
      }

      let tokenType: SyntaxToken['type'] = 'identifier'

      if (langKeywords.includes(word)) {
        tokenType = 'keyword'
      } else if (/^['"`].*['"`]$/.test(word)) {
        tokenType = 'string'
      } else if (/^\/\/|^#/.test(word)) {
        tokenType = 'comment'
      } else if (/^\d+$/.test(word)) {
        tokenType = 'number'
      } else if (/^[+\-*/%=<>!&|]+$/.test(word)) {
        tokenType = 'operator'
      } else if (/^[A-Z][a-zA-Z]*$/.test(word)) {
        tokenType = 'class'
      } else if (/^\w+\s*\(/.test(word + ' ')) {
        tokenType = 'function'
      }

      tokens.push({
        type: tokenType,
        value: word,
        line: lineIndex,
        column
      })

      column += word.length
    })
  })

  return tokens
}

/**
 * Detects potential code issues and returns suggestions
 */
export function detectCodeIssues(code: string, language: string): string[] {
  const issues: string[] = []
  const lines = code.split('\n')

  lines.forEach((line, index) => {
    const trimmed = line.trim()

    // Check for long lines
    if (line.length > 120) {
      issues.push(`Line ${index + 1}: Line exceeds 120 characters`)
    }

    // Check for console.log in production code
    if (trimmed.includes('console.log')) {
      issues.push(`Line ${index + 1}: Remove console.log before production`)
    }

    // Check for var usage (JS/TS)
    if ((language === 'javascript' || language === 'typescript') && /\bvar\b/.test(trimmed)) {
      issues.push(`Line ${index + 1}: Use 'const' or 'let' instead of 'var'`)
    }

    // Check for == instead of ===
    if (trimmed.includes('==') && !trimmed.includes('===')) {
      issues.push(`Line ${index + 1}: Use '===' instead of '=='`)
    }
  })

  return issues
}

/**
 * Calculates code similarity score between two code snippets
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function calculateSimilarity(code1: string, code2: string): number {
  const normalize = (code: string) => {
    return code
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[{}()[\];,]/g, '')
      .trim()
  }

  const norm1 = normalize(code1)
  const norm2 = normalize(code2)

  if (norm1 === norm2) return 1

  const len1 = norm1.length
  const len2 = norm2.length
  const maxLen = Math.max(len1, len2)

  if (maxLen === 0) return 1

  let matches = 0
  const minLen = Math.min(len1, len2)

  for (let i = 0; i < minLen; i++) {
    if (norm1[i] === norm2[i]) {
      matches++
    }
  }

  return matches / maxLen
}
