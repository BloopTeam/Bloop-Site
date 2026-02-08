/**
 * Role Allocation System — Platform-wide
 *
 * Every AI agent, bot, assistant, or chat interaction can be assigned a role.
 * The role controls focus areas, behavior, output format, severity thresholds,
 * expertise domains, and more. This shapes how the AI actually responds.
 */

// ─── Core Role Types ──────────────────────────────────────────────────────────

export interface RoleAllocation {
  title: string                       // e.g. "Senior Code Reviewer"
  focusAreas: string[]                // What this role zeroes in on
  behaviorMode: 'strict' | 'balanced' | 'lenient'
  outputFormat: 'report' | 'inline-comments' | 'diff-patches' | 'checklist'
  severityThreshold: 'all' | 'warning+' | 'critical-only'
  expertise: string[]                 // Domain expertise tags
  responseStyle: 'concise' | 'detailed' | 'tutorial'
  languages: string[]                 // Programming languages this role targets
  frameworks: string[]                // Frameworks/tools this role knows
  customDirective?: string            // User's custom role instructions

  // ─── Resources & Capabilities ────────────────────────────────────
  preferredModel?: string             // AI model to use (claude-opus-4-6, gpt-4o, etc.)
  webSearchEnabled?: boolean          // Can this bot search the web for context?
  userPreferences?: string            // User's coding style / conventions / preferences
}

// ─── Default Roles for Every Agent Type ───────────────────────────────────────

export const DEFAULT_ROLES: Record<string, RoleAllocation> = {
  'code-reviewer': {
    title: 'Senior Code Reviewer',
    focusAreas: ['Code quality', 'Bug detection', 'Style consistency', 'Best practices', 'DRY violations', 'Error handling'],
    behaviorMode: 'balanced',
    outputFormat: 'report',
    severityThreshold: 'all',
    expertise: ['clean-code', 'design-patterns', 'code-smells', 'naming-conventions'],
    responseStyle: 'detailed',
    languages: ['TypeScript', 'JavaScript', 'Python', 'Rust', 'Go'],
    frameworks: ['React', 'Node.js', 'Express', 'Next.js'],
  },
  'test-engineer': {
    title: 'QA Test Architect',
    focusAreas: ['Unit tests', 'Integration tests', 'Edge case coverage', 'Error path testing', 'Mocking strategies', 'Assertion quality'],
    behaviorMode: 'strict',
    outputFormat: 'diff-patches',
    severityThreshold: 'all',
    expertise: ['test-design', 'coverage-analysis', 'mocking', 'fixture-management'],
    responseStyle: 'detailed',
    languages: ['TypeScript', 'JavaScript', 'Python'],
    frameworks: ['Jest', 'Vitest', 'Mocha', 'Pytest', 'React Testing Library'],
  },
  'test-writer': {
    title: 'QA Test Architect',
    focusAreas: ['Unit tests', 'Integration tests', 'Edge case coverage', 'Error path testing', 'Mocking strategies', 'Assertion quality'],
    behaviorMode: 'strict',
    outputFormat: 'diff-patches',
    severityThreshold: 'all',
    expertise: ['test-design', 'coverage-analysis', 'mocking', 'fixture-management'],
    responseStyle: 'detailed',
    languages: ['TypeScript', 'JavaScript', 'Python'],
    frameworks: ['Jest', 'Vitest', 'Mocha', 'Pytest', 'React Testing Library'],
  },
  'security-auditor': {
    title: 'Chief Security Analyst',
    focusAreas: ['OWASP Top 10', 'Injection attacks', 'Authentication flaws', 'Data exposure', 'Dependency vulnerabilities', 'Hardcoded secrets', 'CSRF/XSS'],
    behaviorMode: 'strict',
    outputFormat: 'report',
    severityThreshold: 'warning+',
    expertise: ['appsec', 'penetration-testing', 'threat-modeling', 'compliance'],
    responseStyle: 'detailed',
    languages: ['TypeScript', 'JavaScript', 'Python', 'SQL'],
    frameworks: ['Express', 'Node.js', 'Django', 'Flask'],
  },
  'docs-writer': {
    title: 'Technical Documentation Lead',
    focusAreas: ['API documentation', 'README generation', 'Inline comments', 'Usage examples', 'Type documentation', 'Architecture guides'],
    behaviorMode: 'balanced',
    outputFormat: 'inline-comments',
    severityThreshold: 'all',
    expertise: ['technical-writing', 'api-design', 'jsdoc', 'markdown'],
    responseStyle: 'tutorial',
    languages: ['TypeScript', 'JavaScript', 'Python', 'Markdown'],
    frameworks: ['React', 'Node.js', 'OpenAPI', 'Swagger'],
  },
  'doc-generator': {
    title: 'Technical Documentation Lead',
    focusAreas: ['API documentation', 'README generation', 'Inline comments', 'Usage examples', 'Type documentation', 'Architecture guides'],
    behaviorMode: 'balanced',
    outputFormat: 'inline-comments',
    severityThreshold: 'all',
    expertise: ['technical-writing', 'api-design', 'jsdoc', 'markdown'],
    responseStyle: 'tutorial',
    languages: ['TypeScript', 'JavaScript', 'Python', 'Markdown'],
    frameworks: ['React', 'Node.js', 'OpenAPI', 'Swagger'],
  },
  'optimizer': {
    title: 'Performance Engineering Lead',
    focusAreas: ['Algorithm complexity', 'Memory leaks', 'Render optimization', 'Bundle size', 'Lazy loading', 'Caching strategies', 'Database queries'],
    behaviorMode: 'balanced',
    outputFormat: 'checklist',
    severityThreshold: 'warning+',
    expertise: ['big-o-analysis', 'profiling', 'web-vitals', 'react-performance'],
    responseStyle: 'concise',
    languages: ['TypeScript', 'JavaScript', 'SQL'],
    frameworks: ['React', 'Node.js', 'Webpack', 'Vite'],
  },
  'debugger': {
    title: 'Principal Debug Engineer',
    focusAreas: ['Race conditions', 'Null/undefined risks', 'Off-by-one errors', 'State mutation bugs', 'Async/await pitfalls', 'Memory leaks', 'Type coercion'],
    behaviorMode: 'strict',
    outputFormat: 'report',
    severityThreshold: 'all',
    expertise: ['root-cause-analysis', 'stack-trace-reading', 'async-debugging', 'state-management'],
    responseStyle: 'detailed',
    languages: ['TypeScript', 'JavaScript', 'Python', 'Rust'],
    frameworks: ['React', 'Node.js', 'Express'],
  },
  'architect': {
    title: 'Principal Software Architect',
    focusAreas: ['SOLID principles', 'Separation of concerns', 'Dependency management', 'Module boundaries', 'API design', 'Scalability patterns'],
    behaviorMode: 'balanced',
    outputFormat: 'report',
    severityThreshold: 'warning+',
    expertise: ['system-design', 'microservices', 'monolith-decomposition', 'event-driven-architecture'],
    responseStyle: 'detailed',
    languages: ['TypeScript', 'JavaScript', 'Go', 'Rust', 'Python'],
    frameworks: ['React', 'Node.js', 'Express', 'Next.js', 'Docker'],
  },
  'perplexity-researcher': {
    title: 'Technical Research Lead',
    focusAreas: ['Documentation lookup', 'Library research', 'Best practices', 'API reference', 'Migration guides', 'Comparison analysis'],
    behaviorMode: 'balanced',
    outputFormat: 'report',
    severityThreshold: 'all',
    expertise: ['web-search', 'technical-research', 'api-reference', 'library-evaluation'],
    responseStyle: 'detailed',
    languages: ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust'],
    frameworks: ['React', 'Node.js', 'Express', 'Next.js'],
  },
  // Generic fallback for chat / custom agents
  'assistant': {
    title: 'AI Development Assistant',
    focusAreas: ['Code generation', 'Problem solving', 'Explanation', 'Debugging', 'Refactoring'],
    behaviorMode: 'balanced',
    outputFormat: 'report',
    severityThreshold: 'all',
    expertise: ['full-stack', 'problem-solving', 'code-generation'],
    responseStyle: 'detailed',
    languages: ['TypeScript', 'JavaScript', 'Python'],
    frameworks: ['React', 'Node.js', 'Express'],
  },
  'custom': {
    title: 'Custom Agent',
    focusAreas: ['General analysis'],
    behaviorMode: 'balanced',
    outputFormat: 'report',
    severityThreshold: 'all',
    expertise: ['general'],
    responseStyle: 'detailed',
    languages: ['TypeScript', 'JavaScript'],
    frameworks: [],
  },
}

// ─── Helper: Build a role-aware system prompt ─────────────────────────────────

export function buildRolePrompt(basePrompt: string, role?: RoleAllocation | null): string {
  if (!role) return basePrompt
  const parts: string[] = [basePrompt, '']
  if (role.title) parts.push(`Your assigned role: ${role.title}.`)
  if (role.focusAreas?.length) parts.push(`Focus areas: ${role.focusAreas.join(', ')}.`)
  if (role.behaviorMode) {
    const desc = role.behaviorMode === 'strict'
      ? 'flag everything, no tolerance for potential issues'
      : role.behaviorMode === 'lenient'
        ? 'only flag clear, confirmed issues'
        : 'use reasonable judgment, flag likely issues'
    parts.push(`Behavior mode: ${role.behaviorMode} — ${desc}.`)
  }
  if (role.outputFormat) {
    const fmt: Record<string, string> = {
      'report': 'Provide a structured report with sections and severity ratings.',
      'inline-comments': 'Format your output as inline code comments at the relevant locations.',
      'diff-patches': 'Output concrete code diffs/patches that can be applied directly.',
      'checklist': 'Format findings as a prioritized checklist with checkboxes.',
    }
    parts.push(`Output format: ${fmt[role.outputFormat] || role.outputFormat}`)
  }
  if (role.severityThreshold && role.severityThreshold !== 'all') {
    parts.push(`Severity filter: only report ${role.severityThreshold === 'critical-only' ? 'critical issues' : 'warnings and above'}.`)
  }
  if (role.expertise?.length) parts.push(`Your expertise domains: ${role.expertise.join(', ')}.`)
  if (role.responseStyle) parts.push(`Response style: ${role.responseStyle}.`)
  if (role.languages?.length) parts.push(`Target languages: ${role.languages.join(', ')}.`)
  if (role.frameworks?.length) parts.push(`Known frameworks: ${role.frameworks.join(', ')}.`)
  if (role.webSearchEnabled) parts.push(`You have web search access. When relevant, search for current best practices, documentation, CVE databases, or package info to inform your analysis.`)
  if (role.userPreferences) parts.push(`User preferences and coding conventions:\n${role.userPreferences}`)
  if (role.customDirective) parts.push(`Custom directive: ${role.customDirective}`)
  return parts.join('\n')
}

// ─── Helper: Get default role for any agent type ──────────────────────────────

export function getDefaultRole(agentType: string): RoleAllocation {
  return DEFAULT_ROLES[agentType] || DEFAULT_ROLES['custom']
}
