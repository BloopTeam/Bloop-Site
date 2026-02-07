/**
 * Frontend Authentication Service
 *
 * Manages JWT tokens, auto-refresh, and auth state.
 * All API requests go through this service's getAuthHeaders() method.
 */

const API_BASE = import.meta.env.VITE_API_URL || ''
const TOKEN_KEY = 'bloop-access-token'
const REFRESH_KEY = 'bloop-refresh-token'
const USER_KEY = 'bloop-user'

export interface AuthUser {
  id: string
  email: string
  username: string
  display_name: string | null
  plan: string
  created_at: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface LoginResponse {
  user: AuthUser
  tokens: AuthTokens
}

export interface ApiKeyInfo {
  provider: string
  hint: string
  isActive: boolean
  createdAt?: string
}

type AuthChangeCallback = (user: AuthUser | null) => void

class AuthService {
  private refreshTimer: ReturnType<typeof setTimeout> | null = null
  private listeners: AuthChangeCallback[] = []
  private refreshPromise: Promise<AuthTokens> | null = null

  // ─── Token management ────────────────────────────────────────────────────

  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY)
  }

  private setTokens(tokens: AuthTokens) {
    localStorage.setItem(TOKEN_KEY, tokens.accessToken)
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken)

    // Schedule auto-refresh 1 minute before expiry
    this.scheduleRefresh(tokens.expiresIn)
  }

  private clearTokens() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  // ─── User state ──────────────────────────────────────────────────────────

  getUser(): AuthUser | null {
    const stored = localStorage.getItem(USER_KEY)
    if (!stored) return null
    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  }

  private setUser(user: AuthUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    this.notifyListeners(user)
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken() && !!this.getUser()
  }

  // ─── Auth header for API requests ────────────────────────────────────────

  getAuthHeaders(): Record<string, string> {
    const token = this.getAccessToken()
    if (!token) return {}
    return { Authorization: `Bearer ${token}` }
  }

  // ─── Register ────────────────────────────────────────────────────────────

  async register(email: string, username: string, password: string, displayName?: string): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password, displayName }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Registration failed' }))
      throw new AuthError(err.error || 'Registration failed', err.code)
    }

    const data: LoginResponse = await res.json()
    this.setTokens(data.tokens)
    this.setUser(data.user)
    return data
  }

  // ─── Login ───────────────────────────────────────────────────────────────

  async login(emailOrUsername: string, password: string): Promise<LoginResponse> {
    const body = emailOrUsername.includes('@')
      ? { email: emailOrUsername, password }
      : { username: emailOrUsername, password }

    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }))
      throw new AuthError(err.error || 'Login failed', err.code)
    }

    const data: LoginResponse = await res.json()
    this.setTokens(data.tokens)
    this.setUser(data.user)
    return data
  }

  // ─── Logout ──────────────────────────────────────────────────────────────

  async logout() {
    try {
      const token = this.getAccessToken()
      if (token) {
        await fetch(`${API_BASE}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        }).catch(() => {})
      }
    } finally {
      this.clearTokens()
      this.notifyListeners(null)
    }
  }

  // ─── Token refresh ───────────────────────────────────────────────────────

  private scheduleRefresh(expiresIn: number) {
    if (this.refreshTimer) clearTimeout(this.refreshTimer)

    // Refresh 60 seconds before expiry, minimum 10 seconds
    const refreshIn = Math.max(10, expiresIn - 60) * 1000
    this.refreshTimer = setTimeout(() => this.refresh(), refreshIn)
  }

  async refresh(): Promise<AuthTokens | null> {
    // Dedup concurrent refresh calls
    if (this.refreshPromise) return this.refreshPromise

    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      this.clearTokens()
      this.notifyListeners(null)
      return null
    }

    this.refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })

        if (!res.ok) {
          throw new Error('Refresh failed')
        }

        const data = await res.json()
        this.setTokens(data.tokens)
        return data.tokens
      } catch {
        // Refresh failed — force re-login
        this.clearTokens()
        this.notifyListeners(null)
        return null
      } finally {
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }

  // ─── Authenticated fetch wrapper ─────────────────────────────────────────

  async authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers)
    const token = this.getAccessToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    let res = await fetch(url, { ...options, headers })

    // Auto-refresh on 401
    if (res.status === 401 && this.getRefreshToken()) {
      const newTokens = await this.refresh()
      if (newTokens) {
        headers.set('Authorization', `Bearer ${newTokens.accessToken}`)
        res = await fetch(url, { ...options, headers })
      }
    }

    return res
  }

  // ─── API Key management ──────────────────────────────────────────────────

  async getApiKeys(): Promise<ApiKeyInfo[]> {
    const res = await this.authFetch(`${API_BASE}/api/v1/auth/api-keys`)
    if (!res.ok) return []
    const data = await res.json()
    return data.keys || []
  }

  async setApiKey(provider: string, apiKey: string): Promise<void> {
    const res = await this.authFetch(`${API_BASE}/api/v1/auth/api-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to save API key' }))
      throw new Error(err.error)
    }
  }

  async deleteApiKey(provider: string): Promise<void> {
    await this.authFetch(`${API_BASE}/api/v1/auth/api-keys/${provider}`, {
      method: 'DELETE',
    })
  }

  // ─── Profile ─────────────────────────────────────────────────────────────

  async getProfile() {
    const res = await this.authFetch(`${API_BASE}/api/v1/auth/me`)
    if (!res.ok) return null
    return res.json()
  }

  // ─── Listeners ───────────────────────────────────────────────────────────

  onAuthChange(callback: AuthChangeCallback): () => void {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }

  private notifyListeners(user: AuthUser | null) {
    for (const cb of this.listeners) {
      try { cb(user) } catch {}
    }
  }

  // ─── Init (call on app startup) ──────────────────────────────────────────

  init() {
    // If we have a refresh token, try to refresh on startup
    if (this.getRefreshToken()) {
      this.refresh()
    }
  }
}

export class AuthError extends Error {
  code: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = 'AuthError'
    this.code = code || 'UNKNOWN'
  }
}

export const authService = new AuthService()
export default authService
