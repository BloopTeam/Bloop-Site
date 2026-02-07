/**
 * Server configuration
 * Centralizes all environment variables with production validation.
 */
import dotenv from 'dotenv'
dotenv.config()

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// ─── Validate required secrets in production ─────────────────────────────────

if (IS_PRODUCTION) {
  const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY']
  const missing = required.filter(k => !process.env[k])
  if (missing.length > 0) {
    console.error(`FATAL: Missing required environment variables for production: ${missing.join(', ')}`)
    console.error('Generate them with: openssl rand -hex 64')
    process.exit(1)
  }
}

export const config = {
  port: parseInt(process.env.PORT || '5174', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: IS_PRODUCTION,

  // Security
  jwtSecret: process.env.JWT_SECRET || '',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
  encryptionKey: process.env.ENCRYPTION_KEY || '',

  // AI API Keys
  ai: {
    openai: { apiKey: process.env.OPENAI_API_KEY || '' },
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY || '' },
    google: { apiKey: process.env.GOOGLE_GEMINI_API_KEY || '' },
    perplexity: { apiKey: process.env.PERPLEXITY_API_KEY || '' },
    deepseek: { apiKey: process.env.DEEPSEEK_API_KEY || '' },
    moonshot: { apiKey: process.env.MOONSHOT_API_KEY || '' },
    mistral: { apiKey: process.env.MISTRAL_API_KEY || '' },
  },

  // CORS
  cors: {
    origins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
      : IS_PRODUCTION
        ? [] // Must be explicitly set in production
        : ['http://localhost:5174', 'http://localhost:5173', 'http://localhost:3000'],
  },

  // Solana
  solana: {
    network: process.env.SOLANA_NETWORK || 'devnet',
    rpcUrl: process.env.SOLANA_RPC_URL || '',
  },

  // Database
  database: {
    url: process.env.DATABASE_URL || '',
    sqlitePath: process.env.SQLITE_PATH || 'data/bloop.db',
  },
} as const
