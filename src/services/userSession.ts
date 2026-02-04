/**
 * User Session Management
 * 
 * Handles user-specific session data for multi-user scalability
 * All data is scoped to user ID to support 1000+ concurrent users
 */

interface UserSession {
  userId: string
  sessionId: string
  createdAt: number
  lastActivity: number
  projectId?: string
}

class UserSessionService {
  private currentUserId: string | null = null
  private currentSession: UserSession | null = null

  /**
   * Initialize user session
   * In production, this would get userId from authentication
   */
  initializeSession(userId?: string): string {
    if (userId) {
      this.currentUserId = userId
    } else {
      // Generate temporary session ID for anonymous users
      // In production, this should come from auth system
      this.currentUserId = this.generateSessionId()
    }

    this.currentSession = {
      userId: this.currentUserId,
      sessionId: this.generateSessionId(),
      createdAt: Date.now(),
      lastActivity: Date.now()
    }

    // Store in sessionStorage (scoped to browser tab, not shared across users)
    sessionStorage.setItem('bloop-user-id', this.currentUserId)
    sessionStorage.setItem('bloop-session-id', this.currentSession.sessionId)

    return this.currentUserId
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    if (!this.currentUserId) {
      // Try to restore from sessionStorage
      const stored = sessionStorage.getItem('bloop-user-id')
      if (stored) {
        this.currentUserId = stored
      } else {
        // Initialize new session
        this.initializeSession()
      }
    }
    return this.currentUserId
  }

  /**
   * Get current session
   */
  getCurrentSession(): UserSession | null {
    if (!this.currentSession) {
      const userId = this.getCurrentUserId()
      const sessionId = sessionStorage.getItem('bloop-session-id')
      if (userId && sessionId) {
        this.currentSession = {
          userId,
          sessionId,
          createdAt: parseInt(sessionStorage.getItem('bloop-session-created') || '0'),
          lastActivity: Date.now()
        }
      }
    }
    return this.currentSession
  }

  /**
   * Update last activity timestamp
   */
  updateActivity(): void {
    if (this.currentSession) {
      this.currentSession.lastActivity = Date.now()
      sessionStorage.setItem('bloop-session-activity', this.currentSession.lastActivity.toString())
    }
  }

  /**
   * Set active project for current user
   */
  setActiveProject(projectId: string): void {
    if (this.currentSession) {
      this.currentSession.projectId = projectId
      // Store with user-specific key
      const userId = this.getCurrentUserId()
      if (userId) {
        sessionStorage.setItem(`bloop-project-${userId}`, projectId)
      }
    }
  }

  /**
   * Get active project for current user
   */
  getActiveProject(): string | null {
    const userId = this.getCurrentUserId()
    if (userId) {
      return sessionStorage.getItem(`bloop-project-${userId}`)
    }
    return null
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Clear session (on logout)
   */
  clearSession(): void {
    this.currentUserId = null
    this.currentSession = null
    sessionStorage.removeItem('bloop-user-id')
    sessionStorage.removeItem('bloop-session-id')
    sessionStorage.removeItem('bloop-session-created')
    sessionStorage.removeItem('bloop-session-activity')
    
    // Clear user-specific project
    const userId = sessionStorage.getItem('bloop-user-id')
    if (userId) {
      sessionStorage.removeItem(`bloop-project-${userId}`)
    }
  }

  /**
   * Get user-specific storage key
   * Ensures data isolation between users
   */
  getUserStorageKey(key: string): string {
    const userId = this.getCurrentUserId()
    return userId ? `bloop-${userId}-${key}` : `bloop-${key}`
  }
}

export const userSessionService = new UserSessionService()
