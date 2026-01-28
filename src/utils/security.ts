/**
 * Security utilities for Bloop UI
 * All input sanitization and security helpers
 */

/**
 * Sanitize HTML string to prevent XSS attacks
 * Removes all HTML tags and encodes special characters
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Sanitize input for use in file paths
 * Prevents path traversal attacks
 */
export function sanitizePath(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input
    .replace(/\.\./g, '')
    .replace(/[<>:"|?*]/g, '')
    .replace(/^\/+/, '')
    .trim()
}

/**
 * Sanitize input for use in terminal commands
 * Prevents command injection
 */
export function sanitizeCommand(input: string): string {
  if (typeof input !== 'string') return ''
  
  // Remove dangerous shell characters
  return input
    .replace(/[;&|`$(){}[\]!#]/g, '')
    .replace(/\r?\n/g, ' ')
    .trim()
}

/**
 * Validate and sanitize URL
 * Only allows http, https protocols
 */
export function sanitizeUrl(input: string): string | null {
  if (typeof input !== 'string') return null
  
  try {
    const url = new URL(input)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null
    }
    return url.href
  } catch {
    return null
  }
}

/**
 * Sanitize user-provided JSON
 * Prevents prototype pollution
 */
export function safeJsonParse<T>(input: string, fallback: T): T {
  try {
    const parsed = JSON.parse(input)
    
    // Prevent prototype pollution
    if (parsed && typeof parsed === 'object') {
      delete parsed.__proto__
      delete parsed.constructor
      delete parsed.prototype
    }
    
    return parsed as T
  } catch {
    return fallback
  }
}

/**
 * Rate limiter for preventing abuse
 */
export class RateLimiter {
  private timestamps: number[] = []
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests: number = 10, windowMs: number = 1000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  canProceed(): boolean {
    const now = Date.now()
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs)
    
    if (this.timestamps.length >= this.maxRequests) {
      return false
    }
    
    this.timestamps.push(now)
    return true
  }

  reset(): void {
    this.timestamps = []
  }
}

/**
 * Secure storage wrapper with encryption placeholder
 */
export const secureStorage = {
  set(key: string, value: string): void {
    const sanitizedKey = sanitizePath(key)
    try {
      localStorage.setItem(`bloop_${sanitizedKey}`, value)
    } catch (e) {
      console.warn('Storage unavailable')
    }
  },

  get(key: string): string | null {
    const sanitizedKey = sanitizePath(key)
    try {
      return localStorage.getItem(`bloop_${sanitizedKey}`)
    } catch {
      return null
    }
  },

  remove(key: string): void {
    const sanitizedKey = sanitizePath(key)
    try {
      localStorage.removeItem(`bloop_${sanitizedKey}`)
    } catch {
      // Ignore
    }
  },

  clear(): void {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('bloop_'))
      keys.forEach(k => localStorage.removeItem(k))
    } catch {
      // Ignore
    }
  }
}

/**
 * Content validation
 */
export function isValidFileName(name: string): boolean {
  if (!name || typeof name !== 'string') return false
  if (name.length > 255) return false
  
  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*\x00-\x1F]/
  if (invalidChars.test(name)) return false
  
  // Check for reserved names (Windows)
  const reserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i
  if (reserved.test(name)) return false
  
  return true
}

/**
 * Generate cryptographically secure random ID
 */
export function generateSecureId(length: number = 16): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Validate and sanitize email addresses
 * Prevents email injection attacks
 */
export function sanitizeEmail(input: string): string | null {
  if (typeof input !== 'string') return null
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const sanitized = input.trim().toLowerCase()
  
  if (!emailRegex.test(sanitized)) return null
  
  // Additional checks for dangerous patterns
  if (sanitized.includes('..') || sanitized.includes('--')) return null
  if (sanitized.length > 254) return null
  
  return sanitized
}

/**
 * Content Security Policy helper
 * Generates CSP header string
 */
export function generateCSPHeader(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for Vite HMR in dev
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ]
  
  return directives.join('; ')
}

/**
 * Validate file size to prevent DoS attacks
 */
export function validateFileSize(size: number, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return size >= 0 && size <= maxSizeBytes
}

/**
 * Sanitize file content based on file type
 * Prevents malicious file uploads
 */
export function sanitizeFileContent(content: string, mimeType: string): string {
  if (typeof content !== 'string') return ''
  
  // Text files - sanitize HTML/JS
  if (mimeType.startsWith('text/') || mimeType.includes('javascript') || mimeType.includes('json')) {
    return sanitizeHtml(content)
  }
  
  // For binary files, we can't sanitize - should be validated instead
  return content
}

/**
 * Check for suspicious patterns in code
 * Detects potential security issues
 */
export function detectSuspiciousPatterns(code: string): string[] {
  const warnings: string[] = []
  
  if (!code || typeof code !== 'string') return warnings
  
  // Check for eval usage
  if (/eval\s*\(/i.test(code)) {
    warnings.push('Potential security risk: eval() usage detected')
  }
  
  // Check for Function constructor
  if (/new\s+Function\s*\(/i.test(code)) {
    warnings.push('Potential security risk: Function() constructor detected')
  }
  
  // Check for innerHTML without sanitization
  if (/\.innerHTML\s*=/i.test(code) && !/sanitize/i.test(code)) {
    warnings.push('Potential XSS risk: innerHTML assignment without sanitization')
  }
  
  // Check for dangerous URL patterns
  if (/javascript:/i.test(code)) {
    warnings.push('Potential XSS risk: javascript: protocol detected')
  }
  
  // Check for data URLs with scripts
  if (/data:text\/html/i.test(code)) {
    warnings.push('Potential XSS risk: data URL with HTML content')
  }
  
  return warnings
}

/**
 * Secure token generation for sessions
 */
export function generateSessionToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  return `bloop_${token}_${Date.now()}`
}

/**
 * Validate session token format
 */
export function isValidSessionToken(token: string): boolean {
  if (typeof token !== 'string') return false
  if (!token.startsWith('bloop_')) return false
  if (token.length < 50 || token.length > 200) return false
  return /^bloop_[a-f0-9]+_\d+$/.test(token)
}

/**
 * Enhanced rate limiter with IP tracking simulation
 */
export class EnhancedRateLimiter {
  private requests: Map<string, number[]> = new Map()
  private readonly maxRequests: number
  private readonly windowMs: number
  private readonly maxIPs: number

  constructor(maxRequests: number = 10, windowMs: number = 1000, maxIPs: number = 1000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
    this.maxIPs = maxIPs
  }

  canProceed(identifier: string = 'default'): boolean {
    const now = Date.now()
    
    // Clean up old entries
    if (this.requests.size > this.maxIPs) {
      this.cleanup(now)
    }
    
    const timestamps = this.requests.get(identifier) || []
    const recent = timestamps.filter(t => now - t < this.windowMs)
    
    if (recent.length >= this.maxRequests) {
      return false
    }
    
    recent.push(now)
    this.requests.set(identifier, recent)
    return true
  }

  private cleanup(now: number): void {
    for (const [key, timestamps] of this.requests.entries()) {
      const recent = timestamps.filter(t => now - t < this.windowMs)
      if (recent.length === 0) {
        this.requests.delete(key)
      } else {
        this.requests.set(key, recent)
      }
    }
  }

  reset(identifier?: string): void {
    if (identifier) {
      this.requests.delete(identifier)
    } else {
      this.requests.clear()
    }
  }

  getRemainingRequests(identifier: string = 'default'): number {
    const timestamps = this.requests.get(identifier) || []
    const now = Date.now()
    const recent = timestamps.filter(t => now - t < this.windowMs)
    return Math.max(0, this.maxRequests - recent.length)
  }
}
