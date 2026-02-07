/**
 * Server configuration
 * dotenv is loaded here so env vars are available before any service initializes
 */
import dotenv from 'dotenv'
dotenv.config()

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // AI API Keys
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    },
    google: {
      apiKey: process.env.GOOGLE_GEMINI_API_KEY || '',
    },
    perplexity: {
      apiKey: process.env.PERPLEXITY_API_KEY || '',
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
    },
    moonshot: {
      apiKey: process.env.MOONSHOT_API_KEY || '',
    },
    mistral: {
      apiKey: process.env.MISTRAL_API_KEY || '',
    },
  },
  
  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
} as const
