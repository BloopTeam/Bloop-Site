/**
 * Security Middleware — headers, CORS, and request sanitization
 */
import helmet from 'helmet'
import cors from 'cors'
import { Request, Response, NextFunction } from 'express'

// ─── Helmet (security headers) ──────────────────────────────────────────────

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // needed for Vite HMR in dev
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'ws:', 'wss:', 'https://api.openai.com', 'https://api.anthropic.com', 'https://generativelanguage.googleapis.com', 'https://api.mistral.ai'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow loading external resources
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
})

// ─── CORS — environment-specific ─────────────────────────────────────────────

const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5174', 'http://localhost:5173', 'http://localhost:3000']

export const productionCors = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, CLI tools)
    if (!origin) return callback(null, true)

    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true)
    } else if (process.env.NODE_ENV !== 'production') {
      // In development, allow all localhost origins
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        callback(null, true)
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`))
      }
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Workspace', 'X-Request-ID'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 600, // Preflight cache for 10 minutes
})

// ─── Request ID ──────────────────────────────────────────────────────────────

export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = req.headers['x-request-id'] as string || `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  res.setHeader('X-Request-ID', id)
  ;(req as any).requestId = id
  next()
}

// ─── Request logging (non-sensitive) ─────────────────────────────────────────

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    const userId = req.user?.id || 'anon'
    // Only log API requests, not static files
    if (req.path.startsWith('/api/')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms user=${userId}`)
    }
  })
  next()
}

// ─── Sanitize request body (strip prototype pollution vectors) ───────────────

export function sanitizeBody(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    stripDangerousKeys(req.body)
  }
  next()
}

function stripDangerousKeys(obj: any, depth = 0): void {
  if (depth > 10 || !obj || typeof obj !== 'object') return
  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      delete obj[key]
    } else if (typeof obj[key] === 'object') {
      stripDangerousKeys(obj[key], depth + 1)
    }
  }
}
