/**
 * Rate Limiting Middleware — per-user, per-endpoint
 *
 * Uses express-rate-limit with user ID as the key.
 * Different limits for different endpoint categories.
 */
import rateLimit from 'express-rate-limit'
import { Request } from 'express'

/**
 * Key generator: uses authenticated user ID if available, falls back to IP.
 * This ensures rate limits are per-user, not per-IP (which would be shared on NATs).
 */
function keyGenerator(req: Request): string {
  if (req.user?.id) return `user:${req.user.id}`
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket.remoteAddress || 'unknown'
  return `ip:${ip}`
}

/**
 * General API rate limit — 100 requests per minute per user
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,  // Return rate limit info in headers
  legacyHeaders: false,
  keyGenerator,
  message: {
    error: 'Too many requests',
    code: 'RATE_LIMITED',
    retryAfter: 60,
  },
})

/**
 * Auth endpoints — stricter: 10 attempts per 15 minutes
 * Prevents brute-force login attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress || 'unknown'
    return `auth:${ip}`
  },
  message: {
    error: 'Too many authentication attempts. Please wait 15 minutes.',
    code: 'AUTH_RATE_LIMITED',
    retryAfter: 900,
  },
})

/**
 * AI/Chat endpoints — 30 requests per minute (expensive operations)
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  message: {
    error: 'AI request rate limit exceeded',
    code: 'AI_RATE_LIMITED',
    retryAfter: 60,
  },
})

/**
 * Bot execution — 10 per minute (very expensive, involves AI + file I/O)
 */
export const botExecutionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  message: {
    error: 'Bot execution rate limit exceeded',
    code: 'BOT_RATE_LIMITED',
    retryAfter: 60,
  },
})

/**
 * File upload — 20 per minute
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  message: {
    error: 'Upload rate limit exceeded',
    code: 'UPLOAD_RATE_LIMITED',
    retryAfter: 60,
  },
})
