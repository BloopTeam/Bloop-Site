/**
 * Context API route handlers
 * Analyzes code context for AI-assisted development
 */
import { Router } from 'express'
import { ModelRouter } from '../../services/ai/router.js'

export const contextRouter = Router()
const router = new ModelRouter()

// Analyze code context
contextRouter.post('/analyze', async (req, res) => {
  try {
    const { code, language, filePath, analysisType } = req.body

    if (!code) {
      return res.status(400).json({ error: 'Code content is required' })
    }

    const type = analysisType || 'general'

    // Build analysis prompt based on type
    const prompts: Record<string, string> = {
      general: `Analyze this ${language || 'code'} and provide a comprehensive summary including:
1. Purpose and functionality
2. Key functions/classes/components
3. Dependencies and imports
4. Potential issues or improvements
5. Code quality assessment (1-10)`,

      security: `Perform a security audit on this ${language || 'code'}. Check for:
1. Injection vulnerabilities (SQL, XSS, command injection)
2. Authentication/authorization issues
3. Data exposure risks
4. Input validation gaps
5. Hardcoded secrets or credentials
6. Insecure dependencies
Provide specific line references and remediation steps.`,

      performance: `Analyze the performance characteristics of this ${language || 'code'}:
1. Time complexity of key operations
2. Memory usage patterns
3. Potential bottlenecks
4. Unnecessary allocations or copies
5. Caching opportunities
6. Async/concurrency improvements
Provide specific optimization suggestions.`,

      review: `Review this ${language || 'code'} as a senior developer:
1. Code style and consistency
2. Error handling completeness
3. Edge case coverage
4. Documentation quality
5. Test coverage gaps
6. Architecture concerns
7. SOLID principle adherence
Rate each area 1-10 and provide actionable feedback.`,

      dependencies: `Analyze the dependency structure of this ${language || 'code'}:
1. List all imports and dependencies
2. Identify unused imports
3. Check for circular dependencies
4. Evaluate dependency health (outdated, deprecated, security issues)
5. Suggest lighter alternatives where applicable`,

      refactor: `Suggest refactoring improvements for this ${language || 'code'}:
1. Code duplication opportunities
2. Extract method/function candidates
3. Design pattern applications
4. Type safety improvements
5. Readability enhancements
Provide before/after code examples.`,
    }

    const systemPrompt = prompts[type] || prompts.general

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: `${filePath ? `File: ${filePath}\n\n` : ''}\`\`\`${language || ''}\n${code}\n\`\`\`` },
    ]

    // Use the model router to select best provider
    let modelInfo, service
    try {
      modelInfo = router.selectBestModel({ messages })
      service = router.getService(modelInfo.provider)
    } catch {
      // No AI provider available
    }

    if (!service || !modelInfo) {
      // Return basic static analysis if no AI service available
      return res.json({
        analysis: {
          type,
          language: language || 'unknown',
          lineCount: code.split('\n').length,
          charCount: code.length,
          estimatedTokens: Math.ceil(code.length / 4),
          note: 'AI analysis unavailable - configure an API key in .env for detailed analysis',
        },
      })
    }

    const response = await service.generate({
      messages,
      model: modelInfo.model,
      temperature: 0.3, // Lower temp for analysis accuracy
      maxTokens: 4000,
    })

    res.json({
      analysis: {
        type,
        language: language || 'unknown',
        filePath: filePath || undefined,
        content: response.content,
        model: modelInfo.model,
        provider: modelInfo.provider,
        lineCount: code.split('\n').length,
        charCount: code.length,
      },
      usage: response.usage,
    })
  } catch (error) {
    console.error('Context analysis error:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Analysis failed',
    })
  }
})

// Quick symbol extraction (lightweight, no AI needed)
contextRouter.post('/symbols', async (req, res) => {
  try {
    const { code, language } = req.body

    if (!code) {
      return res.status(400).json({ error: 'Code content is required' })
    }

    // Basic regex-based symbol extraction
    const symbols: Array<{ name: string; type: string; line: number }> = []
    const lines = code.split('\n')

    lines.forEach((line: string, index: number) => {
      const lineNum = index + 1
      const trimmed = line.trim()

      // Functions
      const funcMatch = trimmed.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/)
      if (funcMatch) symbols.push({ name: funcMatch[1], type: 'function', line: lineNum })

      // Arrow functions assigned to const/let/var
      const arrowMatch = trimmed.match(/(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/)
      if (arrowMatch) symbols.push({ name: arrowMatch[1], type: 'function', line: lineNum })

      // Classes
      const classMatch = trimmed.match(/(?:export\s+)?class\s+(\w+)/)
      if (classMatch) symbols.push({ name: classMatch[1], type: 'class', line: lineNum })

      // Interfaces (TS)
      const ifaceMatch = trimmed.match(/(?:export\s+)?interface\s+(\w+)/)
      if (ifaceMatch) symbols.push({ name: ifaceMatch[1], type: 'interface', line: lineNum })

      // Types (TS)
      const typeMatch = trimmed.match(/(?:export\s+)?type\s+(\w+)\s*=/)
      if (typeMatch) symbols.push({ name: typeMatch[1], type: 'type', line: lineNum })

      // Enums
      const enumMatch = trimmed.match(/(?:export\s+)?enum\s+(\w+)/)
      if (enumMatch) symbols.push({ name: enumMatch[1], type: 'enum', line: lineNum })
    })

    res.json({
      symbols,
      total: symbols.length,
      language: language || 'unknown',
    })
  } catch (error) {
    console.error('Symbol extraction error:', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Symbol extraction failed' })
  }
})
