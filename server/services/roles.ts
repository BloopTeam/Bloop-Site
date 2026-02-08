/**
 * Role Allocation System — Server-side
 *
 * Builds role-aware system prompts from a RoleAllocation object.
 * Used by agents, bots, and chat endpoints.
 */

export interface RoleAllocation {
  title: string
  focusAreas: string[]
  behaviorMode: 'strict' | 'balanced' | 'lenient'
  outputFormat: 'report' | 'inline-comments' | 'diff-patches' | 'checklist'
  severityThreshold: 'all' | 'warning+' | 'critical-only'
  expertise: string[]
  responseStyle: 'concise' | 'detailed' | 'tutorial'
  languages: string[]
  frameworks: string[]
  customDirective?: string
  preferredModel?: string
  webSearchEnabled?: boolean
  userPreferences?: string
}

const DEFAULT_ROLES: Record<string, RoleAllocation> = {
  'code-reviewer': { title: 'Senior Code Reviewer', focusAreas: ['Code quality', 'Bug detection', 'Style consistency', 'Best practices'], behaviorMode: 'balanced', outputFormat: 'report', severityThreshold: 'all', expertise: ['clean-code', 'design-patterns'], responseStyle: 'detailed', languages: ['TypeScript', 'JavaScript', 'Python'], frameworks: ['React', 'Node.js'] },
  'test-writer': { title: 'QA Test Architect', focusAreas: ['Unit tests', 'Integration tests', 'Edge cases'], behaviorMode: 'strict', outputFormat: 'diff-patches', severityThreshold: 'all', expertise: ['test-design', 'coverage'], responseStyle: 'detailed', languages: ['TypeScript', 'JavaScript'], frameworks: ['Jest', 'Vitest'] },
  'security-auditor': { title: 'Chief Security Analyst', focusAreas: ['OWASP Top 10', 'Injection attacks', 'Data exposure'], behaviorMode: 'strict', outputFormat: 'report', severityThreshold: 'warning+', expertise: ['appsec', 'threat-modeling'], responseStyle: 'detailed', languages: ['TypeScript', 'JavaScript', 'SQL'], frameworks: ['Express', 'Node.js'] },
  'doc-generator': { title: 'Technical Documentation Lead', focusAreas: ['API docs', 'README', 'Inline comments'], behaviorMode: 'balanced', outputFormat: 'inline-comments', severityThreshold: 'all', expertise: ['technical-writing', 'jsdoc'], responseStyle: 'tutorial', languages: ['TypeScript', 'JavaScript'], frameworks: ['React', 'Node.js'] },
  'debugger': { title: 'Principal Debug Engineer', focusAreas: ['Race conditions', 'Null risks', 'Logic errors'], behaviorMode: 'strict', outputFormat: 'report', severityThreshold: 'all', expertise: ['root-cause-analysis', 'async-debugging'], responseStyle: 'detailed', languages: ['TypeScript', 'JavaScript'], frameworks: ['React', 'Node.js'] },
  'architect': { title: 'Principal Software Architect', focusAreas: ['SOLID', 'Separation of concerns', 'API design'], behaviorMode: 'balanced', outputFormat: 'report', severityThreshold: 'warning+', expertise: ['system-design', 'microservices'], responseStyle: 'detailed', languages: ['TypeScript', 'JavaScript', 'Go'], frameworks: ['React', 'Node.js', 'Docker'] },
  'perplexity-researcher': { title: 'Technical Research Lead', focusAreas: ['Documentation lookup', 'Library research'], behaviorMode: 'balanced', outputFormat: 'report', severityThreshold: 'all', expertise: ['web-search', 'api-reference'], responseStyle: 'detailed', languages: ['TypeScript', 'JavaScript'], frameworks: ['React', 'Node.js'] },
  'custom': { title: 'Custom Agent', focusAreas: ['General analysis'], behaviorMode: 'balanced', outputFormat: 'report', severityThreshold: 'all', expertise: ['general'], responseStyle: 'detailed', languages: ['TypeScript', 'JavaScript'], frameworks: [] },
}

export function getDefaultRole(agentType: string): RoleAllocation {
  return DEFAULT_ROLES[agentType] || DEFAULT_ROLES['custom']
}

export function buildRolePrompt(basePrompt: string, role?: RoleAllocation | any | null): string {
  if (!role) return basePrompt
  const parts: string[] = [basePrompt, '']
  if (role.title) parts.push(`Your assigned role: ${role.title}.`)
  if (role.focusAreas?.length) parts.push(`Focus areas: ${role.focusAreas.join(', ')}.`)
  if (role.behaviorMode) {
    const desc = role.behaviorMode === 'strict' ? 'flag everything, no tolerance for potential issues' : role.behaviorMode === 'lenient' ? 'only flag clear, confirmed issues' : 'use reasonable judgment, flag likely issues'
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
  if (role.severityThreshold && role.severityThreshold !== 'all') parts.push(`Severity filter: only report ${role.severityThreshold === 'critical-only' ? 'critical issues' : 'warnings and above'}.`)
  if (role.expertise?.length) parts.push(`Your expertise domains: ${role.expertise.join(', ')}.`)
  if (role.responseStyle) parts.push(`Response style: ${role.responseStyle}.`)
  if (role.languages?.length) parts.push(`Target languages: ${role.languages.join(', ')}.`)
  if (role.frameworks?.length) parts.push(`Known frameworks: ${role.frameworks.join(', ')}.`)
  if (role.webSearchEnabled) parts.push(`You have web search access. When relevant, search for current best practices, documentation, CVE databases, or package info to inform your analysis.`)
  if (role.userPreferences) parts.push(`User preferences and coding conventions:\n${role.userPreferences}`)
  if (role.customDirective) parts.push(`Custom directive: ${role.customDirective}`)
  return parts.join('\n')
}
