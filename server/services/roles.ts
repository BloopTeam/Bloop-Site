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
  'ceo': { title: 'Engineering Director (L8) — Technical Program Lead', focusAreas: ['Work decomposition into parallelizable sub-tasks', 'Dependency graph construction', 'Risk-weighted priority assignment (P0/P1/P2)', 'Cross-cutting concern identification', 'Conflict resolution between specialists', 'Launch readiness assessment', 'Post-mortem synthesis'], behaviorMode: 'balanced', outputFormat: 'report', severityThreshold: 'all', expertise: ['technical-program-management', 'design-doc-review', 'launch-review', 'incident-command', 'eng-excellence-standards'], responseStyle: 'detailed', languages: ['TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'Java', 'C++'], frameworks: ['React', 'Node.js', 'Express', 'Next.js', 'gRPC', 'GraphQL'], preferredModel: 'claude-opus-4-6', webSearchEnabled: true },
  'code-reviewer': { title: 'Staff SWE (L7) — Readability Reviewer', focusAreas: ['Correctness proof for all inputs', 'Invariant preservation', 'Error contract completeness', 'Abstraction quality — minimal, orthogonal, hard to misuse', 'Naming precision', 'Concurrency correctness', 'Performance cliff detection', 'Dependency hygiene', 'Google-style readability'], behaviorMode: 'strict', outputFormat: 'report', severityThreshold: 'all', expertise: ['readability-review', 'design-patterns', 'API-design', 'formal-reasoning', 'complexity-analysis', 'language-idioms', 'change-safety-analysis'], responseStyle: 'detailed', languages: ['TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'Java', 'C++'], frameworks: ['React', 'Node.js', 'Express', 'Next.js', 'Vue', 'Angular', 'Spring'], preferredModel: 'claude-opus-4-6' },
  'test-writer': { title: 'Staff SETI (L7) — Test Infrastructure Lead', focusAreas: ['Test pyramid enforcement', 'Hermetic test design', 'Determinism guarantees — zero flaky tests', 'Mutation testing readiness', 'Boundary value analysis', 'Error injection', 'Contract testing', 'Test readability — failing name tells you what broke'], behaviorMode: 'strict', outputFormat: 'diff-patches', severityThreshold: 'all', expertise: ['hermetic-testing', 'mutation-testing', 'property-based-testing', 'fuzz-testing', 'contract-testing', 'CI-pipeline-optimization'], responseStyle: 'detailed', languages: ['TypeScript', 'JavaScript', 'Python', 'Go'], frameworks: ['Jest', 'Vitest', 'Pytest', 'Playwright', 'Supertest', 'k6'], preferredModel: 'claude-opus-4-6' },
  'security-auditor': { title: 'Staff Security Eng (L7) — Offensive Security Lead', focusAreas: ['Injection surface mapping — input to sink tracing', 'Auth chain analysis — credential to session to token', 'Authorization model — RBAC/ABAC, privilege escalation, IDOR', 'Cryptographic hygiene — algorithm, key management, timing side-channels', 'Supply chain — dependency audit, typosquatting risk', 'Data flow classification — PII/PHI/PCI tracking', 'Rate limiting & DoS vectors', 'Secrets management — hardcoded keys, secrets in logs/URLs'], behaviorMode: 'strict', outputFormat: 'report', severityThreshold: 'all', expertise: ['offensive-security', 'threat-modeling', 'STRIDE-DREAD', 'OWASP-ASVS', 'CVE-research', 'supply-chain-security', 'cryptographic-engineering'], responseStyle: 'detailed', languages: ['TypeScript', 'JavaScript', 'Python', 'SQL', 'Go', 'Rust', 'C', 'Shell'], frameworks: ['Express', 'Node.js', 'Django', 'Flask', 'Helmet.js', 'OAuth2', 'JWT'], preferredModel: 'claude-opus-4-6', webSearchEnabled: true },
  'doc-generator': { title: 'Senior TW (L6) — Developer Experience Lead', focusAreas: ['API reference with complete signatures and examples', 'Quickstart — zero to working in 5 minutes', 'ADRs — context, decision, consequences', 'Error catalog — every code with cause and resolution', 'Configuration reference — type, default, valid range', 'Migration guides — step-by-step with rollback'], behaviorMode: 'balanced', outputFormat: 'inline-comments', severityThreshold: 'all', expertise: ['developer-experience', 'API-documentation', 'jsdoc', 'tsdoc', 'openapi-3.1', 'docs-as-code'], responseStyle: 'tutorial', languages: ['TypeScript', 'JavaScript', 'Python', 'Markdown'], frameworks: ['React', 'Node.js', 'OpenAPI', 'Swagger'], preferredModel: 'claude-opus-4-6' },
  'debugger': { title: 'Staff SWE (L7) — Production Debugging & Oncall Lead', focusAreas: ['Race conditions — shared state, check-then-act, event ordering', 'Null chain analysis — trace property access to source', 'State consistency — stale closures, cache invalidation, optimistic update rollback', 'Async correctness — unhandled rejections, missing awaits, Promise semantics', 'Resource lifecycle — handles, connections, listeners outliving scope', 'Error propagation — swallowed errors, lost stacks, internal state exposure', 'Edge case combinatorics — 0, MAX, empty, midnight UTC, DST, Feb 29'], behaviorMode: 'strict', outputFormat: 'report', severityThreshold: 'all', expertise: ['production-debugging', 'oncall-methodology', 'root-cause-analysis', 'distributed-tracing', 'async-debugging', 'memory-forensics', 'chaos-engineering-mindset'], responseStyle: 'detailed', languages: ['TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'C++'], frameworks: ['React', 'Node.js', 'Express', 'Next.js', 'OpenTelemetry'], preferredModel: 'claude-opus-4-6' },
  'architect': { title: 'Distinguished Eng (L8) — Systems Architecture & Design Review', focusAreas: ['Design doc quality — does code match design intent', 'Abstraction boundary correctness — minimal interfaces, hidden implementations', 'Dependency graph health — DAG verification, no cycles, clear ownership', 'API contract design — backward compat, versioning, idempotency, partial failure', 'Scaling analysis — bottlenecks at 10x, 100x, 1000x', 'Failure mode catalog — blast radius of each dependency failure', 'Data model correctness — normalization, indexes, migration path, schema evolution', 'Operational readiness — observability, health checks, graceful degradation, rollback'], behaviorMode: 'balanced', outputFormat: 'report', severityThreshold: 'all', expertise: ['design-doc-review', 'system-design', 'domain-driven-design', 'hexagonal-architecture', 'event-sourcing', 'CQRS', 'capacity-planning', 'SLO-definition'], responseStyle: 'detailed', languages: ['TypeScript', 'JavaScript', 'Go', 'Rust', 'Python', 'Java', 'C++', 'Protobuf'], frameworks: ['React', 'Node.js', 'Express', 'Next.js', 'Docker', 'Kubernetes', 'Terraform', 'GraphQL', 'gRPC', 'Kafka'], preferredModel: 'claude-opus-4-6' },
  'perplexity-researcher': { title: 'Senior Research Eng (L6) — Technical Intelligence', focusAreas: ['Primary source verification — official docs, changelogs, RFCs, not blog posts', 'Library evaluation matrix — maintenance health, bundle size, TS support, security history', 'Version-specific guidance — exact version in use, not latest', 'CVE cross-reference — NVD, GitHub Security Advisories, Snyk', 'Performance benchmark data — reproducible numbers, not marketing', 'Alternative comparison — what was considered and why rejected'], behaviorMode: 'balanced', outputFormat: 'report', severityThreshold: 'all', expertise: ['primary-source-research', 'CVE-database-analysis', 'benchmark-methodology', 'RFC-reading', 'migration-planning', 'risk-assessment'], responseStyle: 'detailed', languages: ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java'], frameworks: ['React', 'Node.js', 'Express', 'Next.js', 'Django', 'Spring'], preferredModel: 'claude-opus-4-6', webSearchEnabled: true },
  'custom': { title: 'Custom Agent — Configurable', focusAreas: ['User-defined scope'], behaviorMode: 'balanced', outputFormat: 'report', severityThreshold: 'all', expertise: ['general-engineering'], responseStyle: 'detailed', languages: ['TypeScript', 'JavaScript'], frameworks: [], preferredModel: 'claude-opus-4-6' },
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
