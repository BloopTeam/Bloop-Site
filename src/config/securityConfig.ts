/**
 * Security configuration for Bloop UI
 * Centralized security settings and policies
 */

export interface SecurityConfig {
  csp: {
    enabled: boolean
    strict: boolean
  }
  rateLimiting: {
    enabled: boolean
    maxRequests: number
    windowMs: number
  }
  inputValidation: {
    enabled: boolean
    maxLength: number
    sanitizeHtml: boolean
  }
  storage: {
    encrypted: boolean
    namespace: string
  }
  headers: {
    xssProtection: boolean
    frameOptions: string
    contentTypeOptions: boolean
  }
}

/**
 * Default security configuration
 * Can be overridden via environment variables
 */
export const defaultSecurityConfig: SecurityConfig = {
  csp: {
    enabled: true,
    strict: import.meta.env.PROD, // Strict mode in production only
  },
  rateLimiting: {
    enabled: true,
    maxRequests: 10,
    windowMs: 1000,
  },
  inputValidation: {
    enabled: true,
    maxLength: 10000,
    sanitizeHtml: true,
  },
  storage: {
    encrypted: false, // Can be enabled with encryption library
    namespace: 'bloop_',
  },
  headers: {
    xssProtection: true,
    frameOptions: 'DENY',
    contentTypeOptions: true,
  },
}

/**
 * Get security configuration with environment overrides
 */
export function getSecurityConfig(): SecurityConfig {
  const config = { ...defaultSecurityConfig }

  // Override with environment variables if available
  if (import.meta.env.VITE_CSP_ENABLED !== undefined) {
    config.csp.enabled = import.meta.env.VITE_CSP_ENABLED === 'true'
  }

  if (import.meta.env.VITE_RATE_LIMIT_ENABLED !== undefined) {
    config.rateLimiting.enabled = import.meta.env.VITE_RATE_LIMIT_ENABLED === 'true'
  }

  if (import.meta.env.VITE_RATE_LIMIT_MAX !== undefined) {
    config.rateLimiting.maxRequests = parseInt(import.meta.env.VITE_RATE_LIMIT_MAX, 10)
  }

  return config
}

/**
 * Security policy checker
 * Validates that security measures are properly configured
 */
export function validateSecurityConfig(config: SecurityConfig): string[] {
  const warnings: string[] = []

  if (config.csp.enabled && !config.csp.strict && import.meta.env.PROD) {
    warnings.push('CSP is enabled but not in strict mode for production')
  }

  if (config.rateLimiting.enabled && config.rateLimiting.maxRequests > 100) {
    warnings.push('Rate limit max requests is very high, consider lowering it')
  }

  if (!config.inputValidation.enabled) {
    warnings.push('Input validation is disabled - security risk')
  }

  if (config.storage.encrypted === false && import.meta.env.PROD) {
    warnings.push('Storage encryption is disabled in production')
  }

  return warnings
}
