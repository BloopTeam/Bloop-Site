/**
 * Public API Service
 * 
 * Phase 8: Platform & Ecosystem - Public APIs
 * 
 * Features:
 * - RESTful API client
 * - GraphQL client
 * - WebSocket API client
 * - API authentication (API keys, OAuth)
 * - Rate limiting handling
 * - Request/response interceptors
 * - Error handling and retries
 * - Request caching
 * - API versioning
 * - Comprehensive API documentation
 */

export interface APIConfig {
  baseUrl: string
  apiKey?: string
  accessToken?: string
  version?: string
  timeout?: number
  retries?: number
  retryDelay?: number
  enableCache?: boolean
  cacheTTL?: number
}

export interface APIRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  params?: Record<string, any>
  body?: any
  headers?: Record<string, string>
  timeout?: number
}

export interface APIResponse<T = any> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
  request: APIRequest
  timestamp: Date
}

export interface APIError {
  message: string
  status?: number
  statusText?: string
  code?: string
  details?: any
  request?: APIRequest
  response?: APIResponse
  timestamp: Date
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: Date
  retryAfter?: number
}

export interface APIKey {
  id: string
  name: string
  key: string
  scopes: string[]
  rateLimit?: {
    requestsPerMinute: number
    requestsPerHour: number
    requestsPerDay: number
  }
  createdAt: Date
  lastUsedAt?: Date
  expiresAt?: Date
  metadata?: Record<string, any>
}

export interface GraphQLRequest {
  query: string
  variables?: Record<string, any>
  operationName?: string
}

export interface GraphQLResponse<T = any> {
  data?: T
  errors?: Array<{
    message: string
    locations?: Array<{ line: number; column: number }>
    path?: (string | number)[]
    extensions?: Record<string, any>
  }>
  extensions?: Record<string, any>
}

export interface WebSocketMessage {
  type: string
  payload: any
  id?: string
  timestamp: Date
}

export interface WebSocketSubscription {
  id: string
  channel: string
  callback: (message: WebSocketMessage) => void
  unsubscribe: () => void
}

type EventCallback = (data: unknown) => void

/**
 * Advanced Public API Service
 * 
 * Provides comprehensive API client for REST, GraphQL, and WebSocket
 */
class PublicAPIService {
  private config: APIConfig
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map()
  private requestInterceptors: Array<(request: APIRequest) => APIRequest | Promise<APIRequest>> = []
  private responseInterceptors: Array<(response: APIResponse) => APIResponse | Promise<APIResponse>> = []
  private errorInterceptors: Array<(error: APIError) => APIError | Promise<APIError>> = []
  private rateLimitInfo?: RateLimitInfo
  private listeners: Map<string, EventCallback[]> = new Map()
  private websocket?: WebSocket
  private websocketSubscriptions: Map<string, WebSocketSubscription> = new Map()
  private requestQueue: Array<{ request: APIRequest; resolve: (value: any) => void; reject: (error: any) => void }> = []
  private isProcessingQueue: boolean = false

  constructor(config: APIConfig) {
    this.config = {
      ...config,
      version: config.version || 'v1',
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000,
      enableCache: config.enableCache !== false,
      cacheTTL: config.cacheTTL || 5 * 60 * 1000 // 5 minutes
    }
    
    this.setupInterceptors()
  }

  /**
   * Setup default interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor: Add auth headers
    this.addRequestInterceptor((request) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...request.headers
      }
      
      if (this.config.apiKey) {
        headers['X-API-Key'] = this.config.apiKey
      }
      
      if (this.config.accessToken) {
        headers['Authorization'] = `Bearer ${this.config.accessToken}`
      }
      
      if (this.config.version) {
        headers['X-API-Version'] = this.config.version
      }
      
      return {
        ...request,
        headers
      }
    })
    
    // Response interceptor: Handle rate limits
    this.addResponseInterceptor((response) => {
      const rateLimitHeader = response.headers['x-ratelimit-limit']
      const rateLimitRemaining = response.headers['x-ratelimit-remaining']
      const rateLimitReset = response.headers['x-ratelimit-reset']
      
      if (rateLimitHeader && rateLimitRemaining && rateLimitReset) {
        this.rateLimitInfo = {
          limit: parseInt(rateLimitHeader),
          remaining: parseInt(rateLimitRemaining),
          reset: new Date(parseInt(rateLimitReset) * 1000)
        }
      }
      
      return response
    })
    
    // Error interceptor: Handle rate limit errors
    this.addErrorInterceptor((error) => {
      if (error.status === 429) {
        const retryAfter = error.response?.headers['retry-after']
        if (retryAfter) {
          this.rateLimitInfo = {
            limit: 0,
            remaining: 0,
            reset: new Date(Date.now() + parseInt(retryAfter) * 1000),
            retryAfter: parseInt(retryAfter)
          }
        }
      }
      
      return error
    })
  }

  /**
   * Make REST API request
   */
  async request<T = any>(request: APIRequest): Promise<APIResponse<T>> {
    // Check cache for GET requests
    if (request.method === 'GET' && this.config.enableCache) {
      const cacheKey = this.getCacheKey(request)
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.data
      }
    }
    
    // Apply request interceptors
    let processedRequest = request
    for (const interceptor of this.requestInterceptors) {
      processedRequest = await interceptor(processedRequest)
    }
    
    // Check rate limits
    if (this.rateLimitInfo && this.rateLimitInfo.remaining === 0) {
      const waitTime = this.rateLimitInfo.retryAfter || 
        (this.rateLimitInfo.reset.getTime() - Date.now())
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
    
    // Build URL
    const url = this.buildURL(processedRequest.path, processedRequest.params)
    
    // Make request with retries
    let lastError: APIError | undefined
    for (let attempt = 0; attempt <= (this.config.retries || 0); attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), processedRequest.timeout || this.config.timeout)
        
        const response = await fetch(url, {
          method: processedRequest.method,
          headers: processedRequest.headers,
          body: processedRequest.body ? JSON.stringify(processedRequest.body) : undefined,
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        const responseData = await response.json().catch(() => ({}))
        
        const apiResponse: APIResponse<T> = {
          data: responseData,
          status: response.status,
          statusText: response.statusText,
          headers: this.parseHeaders(response.headers),
          request: processedRequest,
          timestamp: new Date()
        }
        
        // Apply response interceptors
        let processedResponse = apiResponse
        for (const interceptor of this.responseInterceptors) {
          processedResponse = await interceptor(processedResponse)
        }
        
        // Handle errors
        if (!response.ok) {
          const error: APIError = {
            message: responseData.message || response.statusText,
            status: response.status,
            statusText: response.statusText,
            code: responseData.code,
            details: responseData.details,
            request: processedRequest,
            response: processedResponse,
            timestamp: new Date()
          }
          
          // Apply error interceptors
          let processedError = error
          for (const interceptor of this.errorInterceptors) {
            processedError = await interceptor(processedError)
          }
          
          // Retry on certain errors
          if (this.shouldRetry(error, attempt)) {
            await this.delay(this.config.retryDelay! * Math.pow(2, attempt))
            continue
          }
          
          throw processedError
        }
        
        // Cache GET responses
        if (request.method === 'GET' && this.config.enableCache) {
          const cacheKey = this.getCacheKey(request)
          this.cache.set(cacheKey, {
            data: processedResponse,
            timestamp: Date.now(),
            ttl: this.config.cacheTTL!
          })
        }
        
        return processedResponse
      } catch (error) {
        lastError = {
          message: error instanceof Error ? error.message : String(error),
          request: processedRequest,
          timestamp: new Date()
        }
        
        if (attempt < (this.config.retries || 0) && this.shouldRetry(lastError, attempt)) {
          await this.delay(this.config.retryDelay! * Math.pow(2, attempt))
          continue
        }
        
        throw lastError
      }
    }
    
    throw lastError!
  }

  /**
   * GraphQL query
   */
  async query<T = any>(request: GraphQLRequest): Promise<GraphQLResponse<T>> {
    const response = await this.request<GraphQLResponse<T>>({
      method: 'POST',
      path: '/graphql',
      body: {
        query: request.query,
        variables: request.variables,
        operationName: request.operationName
      }
    })
    
    if (response.data.errors && response.data.errors.length > 0) {
      throw new Error(`GraphQL errors: ${response.data.errors.map(e => e.message).join(', ')}`)
    }
    
    return response.data
  }

  /**
   * GraphQL mutation
   */
  async mutate<T = any>(request: GraphQLRequest): Promise<GraphQLResponse<T>> {
    return this.query<T>(request)
  }

  /**
   * WebSocket connection
   */
  connectWebSocket(url?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = url || this.config.baseUrl.replace(/^http/, 'ws') + '/ws'
      
      this.websocket = new WebSocket(wsUrl)
      
      this.websocket.onopen = () => {
        // Authenticate if needed
        if (this.config.apiKey) {
          this.websocket!.send(JSON.stringify({
            type: 'auth',
            payload: { apiKey: this.config.apiKey }
          }))
        }
        
        resolve()
        this.emit('websocket-connected', {})
      }
      
      this.websocket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.handleWebSocketMessage(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }
      
      this.websocket.onerror = (error) => {
        reject(error)
        this.emit('websocket-error', { error })
      }
      
      this.websocket.onclose = () => {
        this.emit('websocket-disconnected', {})
      }
    })
  }

  /**
   * Subscribe to WebSocket channel
   */
  subscribe(channel: string, callback: (message: WebSocketMessage) => void): WebSocketSubscription {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }
    
    const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Send subscribe message
    this.websocket.send(JSON.stringify({
      type: 'subscribe',
      payload: { channel },
      id: subscriptionId
    }))
    
    const subscription: WebSocketSubscription = {
      id: subscriptionId,
      channel,
      callback,
      unsubscribe: () => {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
          this.websocket.send(JSON.stringify({
            type: 'unsubscribe',
            payload: { channel },
            id: subscriptionId
          }))
        }
        this.websocketSubscriptions.delete(subscriptionId)
      }
    }
    
    this.websocketSubscriptions.set(subscriptionId, subscription)
    
    return subscription
  }

  /**
   * Handle WebSocket message
   */
  private handleWebSocketMessage(message: WebSocketMessage): void {
    // Route to subscriptions
    this.websocketSubscriptions.forEach(sub => {
      if (message.type === sub.channel || message.type.startsWith(`${sub.channel}:`)) {
        sub.callback(message)
      }
    })
    
    this.emit('websocket-message', { message })
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: (request: APIRequest) => APIRequest | Promise<APIRequest>): void {
    this.requestInterceptors.push(interceptor)
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor: (response: APIResponse) => APIResponse | Promise<APIResponse>): void {
    this.responseInterceptors.push(interceptor)
  }

  /**
   * Add error interceptor
   */
  addErrorInterceptor(interceptor: (error: APIError) => APIError | Promise<APIError>): void {
    this.errorInterceptors.push(interceptor)
  }

  /**
   * Get rate limit info
   */
  getRateLimitInfo(): RateLimitInfo | undefined {
    return this.rateLimitInfo
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Update config
   */
  updateConfig(updates: Partial<APIConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  /**
   * Helper methods
   */
  private buildURL(path: string, params?: Record<string, any>): string {
    const baseUrl = this.config.baseUrl.replace(/\/$/, '')
    const version = this.config.version ? `/${this.config.version}` : ''
    const url = `${baseUrl}${version}${path.startsWith('/') ? path : `/${path}`}`
    
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      })
      const queryString = searchParams.toString()
      return queryString ? `${url}?${queryString}` : url
    }
    
    return url
  }

  private getCacheKey(request: APIRequest): string {
    return `${request.method}:${request.path}:${JSON.stringify(request.params || {})}`
  }

  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {}
    headers.forEach((value, key) => {
      result[key] = value
    })
    return result
  }

  private shouldRetry(error: APIError, attempt: number): boolean {
    if (attempt >= (this.config.retries || 0)) return false
    
    // Retry on network errors or 5xx errors
    if (!error.status) return true
    if (error.status >= 500) return true
    if (error.status === 429) return true // Rate limit
    
    return false
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Event system
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
    
    return () => {
      const callbacks = this.listeners.get(event)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) callbacks.splice(index, 1)
      }
    }
  }

  private emit(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event) || []
    callbacks.forEach(callback => callback(data))
  }
}

// Create default instance
export const publicAPIService = new PublicAPIService({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  version: 'v1',
  enableCache: true
})
