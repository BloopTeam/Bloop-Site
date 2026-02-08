/**
 * AI Execution Resilience Layer
 * 
 * Provides retry with exponential backoff, circuit breaker,
 * and request timeout for all AI provider calls.
 */
import type { AIRequest, AIResponse } from '../../types/index.js'
import type { AIService, StreamCallbacks } from './base.js'

// ─── Configuration ──────────────────────────────────────────────────────────

export interface RetryConfig {
  maxRetries: number             // Maximum number of retry attempts
  baseDelayMs: number            // Base delay in ms (doubled each retry)
  maxDelayMs: number             // Maximum delay cap
  jitter: boolean                // Add random jitter to prevent thundering herd
  timeoutMs: number              // Per-request timeout
  retryableErrors: string[]      // Error substrings that trigger retry
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 15000,
  jitter: true,
  timeoutMs: 60000,              // 60s per request
  retryableErrors: [
    'rate_limit', 'rate limit', '429', 'too many requests',
    'timeout', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED',
    'overloaded', 'capacity', '503', '502', '500',
    'network', 'socket hang up', 'EPIPE',
  ],
}

// ─── Circuit Breaker ────────────────────────────────────────────────────────

interface CircuitState {
  failures: number
  lastFailure: number
  state: 'closed' | 'open' | 'half-open'
}

const CIRCUIT_THRESHOLD = 5         // Open circuit after 5 consecutive failures
const CIRCUIT_RESET_MS = 60000      // Try again after 60s

const circuits = new Map<string, CircuitState>()

function getCircuit(provider: string): CircuitState {
  if (!circuits.has(provider)) {
    circuits.set(provider, { failures: 0, lastFailure: 0, state: 'closed' })
  }
  return circuits.get(provider)!
}

function recordSuccess(provider: string): void {
  const circuit = getCircuit(provider)
  circuit.failures = 0
  circuit.state = 'closed'
  halfOpenProbes.delete(provider) // Clear probe flag on success
}

function recordFailure(provider: string): void {
  const circuit = getCircuit(provider)
  circuit.failures++
  circuit.lastFailure = Date.now()
  halfOpenProbes.delete(provider) // Clear probe flag — it failed
  if (circuit.failures >= CIRCUIT_THRESHOLD) {
    circuit.state = 'open'
    console.warn(`[Circuit Breaker] ${provider} circuit OPENED after ${circuit.failures} failures`)
  }
}

// Track whether a half-open probe is in flight to prevent races
const halfOpenProbes = new Set<string>()

function isCircuitOpen(provider: string): boolean {
  const circuit = getCircuit(provider)
  if (circuit.state === 'closed') return false
  if (circuit.state === 'open') {
    // Check if enough time has passed to try a single probe request
    if (Date.now() - circuit.lastFailure > CIRCUIT_RESET_MS) {
      // Only allow ONE request through in half-open — block others
      if (halfOpenProbes.has(provider)) return true  // another probe already in flight
      halfOpenProbes.add(provider)
      circuit.state = 'half-open'
      return false // Allow this one request through as the probe
    }
    return true
  }
  // half-open: block additional requests while the probe is in flight
  return halfOpenProbes.has(provider)
}

// ─── Retry with Backoff ─────────────────────────────────────────────────────

function isRetryable(error: Error | string, config: RetryConfig): boolean {
  const msg = typeof error === 'string' ? error : error.message
  const lower = msg.toLowerCase()
  return config.retryableErrors.some(term => lower.includes(term))
}

function calculateDelay(attempt: number, config: RetryConfig): number {
  // Exponential backoff: baseDelay * 2^attempt
  let delay = config.baseDelayMs * Math.pow(2, attempt)
  delay = Math.min(delay, config.maxDelayMs)

  if (config.jitter) {
    // Add ±25% random jitter
    const jitterRange = delay * 0.25
    delay += (Math.random() * jitterRange * 2) - jitterRange
  }

  return Math.max(0, Math.round(delay))
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    promise
      .then(val => { clearTimeout(timer); resolve(val) })
      .catch(err => { clearTimeout(timer); reject(err) })
  })
}

// ─── Resilient Generate ─────────────────────────────────────────────────────

/**
 * Execute an AI generate call with retry, backoff, timeout, and circuit breaker.
 */
export async function resilientGenerate(
  service: AIService,
  request: AIRequest,
  config: Partial<RetryConfig> = {},
): Promise<AIResponse & { attempts: number; totalLatencyMs: number }> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config }
  const provider = service.name
  const startTime = Date.now()

  // Circuit breaker check
  if (isCircuitOpen(provider)) {
    throw new Error(`[Circuit Open] ${provider} is temporarily unavailable (too many failures)`)
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      const response = await withTimeout(
        service.generate(request),
        cfg.timeoutMs,
        `${provider} generate`
      )

      recordSuccess(provider)

      return {
        ...response,
        attempts: attempt + 1,
        totalLatencyMs: Date.now() - startTime,
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      // Don't retry non-retryable errors (auth, validation, etc.)
      if (!isRetryable(lastError, cfg)) {
        recordFailure(provider)
        throw lastError
      }

      // Don't retry on last attempt
      if (attempt < cfg.maxRetries) {
        const delay = calculateDelay(attempt, cfg)
        console.warn(
          `[Retry] ${provider} attempt ${attempt + 1}/${cfg.maxRetries + 1} failed: ${lastError.message.substring(0, 80)}. ` +
          `Retrying in ${delay}ms...`
        )
        await sleep(delay)
      }
    }
  }

  // All retries exhausted
  recordFailure(provider)
  throw lastError || new Error(`${provider}: all ${cfg.maxRetries + 1} attempts failed`)
}

// ─── Resilient Stream ───────────────────────────────────────────────────────

/**
 * Execute an AI streaming call with retry and timeout.
 * Streaming is harder to retry mid-stream, so we retry the whole call on failure.
 */
export async function resilientStream(
  service: AIService,
  request: AIRequest,
  callbacks: StreamCallbacks,
  config: Partial<RetryConfig> = {},
): Promise<{ attempts: number }> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config, maxRetries: Math.min(config.maxRetries ?? 2, 2) }
  const provider = service.name

  if (isCircuitOpen(provider)) {
    callbacks.onError(`[Circuit Open] ${provider} is temporarily unavailable`)
    return { attempts: 0 }
  }

  if (!service.generateStream) {
    callbacks.onError(`${provider} does not support streaming`)
    return { attempts: 0 }
  }

  let lastError = ''

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      await withTimeout(
        service.generateStream(request, callbacks),
        cfg.timeoutMs * 2, // Streams get double timeout
        `${provider} stream`
      )
      recordSuccess(provider)
      return { attempts: attempt + 1 }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)

      if (!isRetryable(lastError, cfg)) {
        recordFailure(provider)
        callbacks.onError(lastError)
        return { attempts: attempt + 1 }
      }

      if (attempt < cfg.maxRetries) {
        const delay = calculateDelay(attempt, cfg)
        console.warn(`[Retry Stream] ${provider} attempt ${attempt + 1} failed. Retrying in ${delay}ms...`)
        await sleep(delay)
      }
    }
  }

  recordFailure(provider)
  callbacks.onError(lastError || 'All retry attempts failed')
  return { attempts: cfg.maxRetries + 1 }
}

// ─── Multi-Provider Resilient Execute ───────────────────────────────────────

/**
 * Try multiple providers with resilient retry per provider.
 * This is the top-level function used by bot execution routes.
 */
export async function resilientMultiProviderGenerate(
  services: Array<{ provider: string; service: AIService; model?: string }>,
  request: AIRequest,
  config: Partial<RetryConfig> = {},
): Promise<AIResponse & { provider: string; attempts: number; totalLatencyMs: number; providersAttempted: number }> {
  const startTime = Date.now()
  let lastError: Error | null = null
  let totalAttempts = 0

  for (let i = 0; i < services.length; i++) {
    const { provider, service, model } = services[i]

    // Skip providers with open circuits
    if (isCircuitOpen(provider)) {
      console.warn(`[Multi-Provider] Skipping ${provider} (circuit open)`)
      continue
    }

    try {
      const response = await resilientGenerate(
        service,
        { ...request, model: model || request.model },
        config,
      )

      return {
        ...response,
        provider,
        attempts: totalAttempts + response.attempts,
        totalLatencyMs: Date.now() - startTime,
        providersAttempted: i + 1,
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      totalAttempts += (config.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries) + 1
      console.warn(`[Multi-Provider] ${provider} exhausted. Moving to next provider...`)
    }
  }

  throw lastError || new Error(`All ${services.length} providers failed after ${totalAttempts} total attempts`)
}

// ─── Health Check ───────────────────────────────────────────────────────────

export function getProviderHealth(): Record<string, { state: string; failures: number; lastFailure: string | null }> {
  const health: Record<string, any> = {}
  for (const [provider, circuit] of circuits.entries()) {
    health[provider] = {
      state: circuit.state,
      failures: circuit.failures,
      lastFailure: circuit.lastFailure ? new Date(circuit.lastFailure).toISOString() : null,
    }
  }
  return health
}

export { DEFAULT_RETRY_CONFIG }
