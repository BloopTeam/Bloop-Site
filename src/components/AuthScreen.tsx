/**
 * Authentication Screen — Login / Register
 *
 * Matches the Bloop IDE design system:
 *   - Magenta (#FF00FF) accent
 *   - Near-black backgrounds (#000, #0a0a0a, #141414)
 *   - Inter font, 13px base
 *   - Sharp corners (4px radius)
 *   - Inline styles (works without Tailwind CSS loaded)
 *
 * Security:
 *   - Client-side input sanitization
 *   - Rate limit feedback
 *   - No credentials in URL/logs
 *   - Autofill-safe input names
 *   - Secure password field handling
 */
import React, { useState, useEffect, useCallback } from 'react'
import { authService, AuthError, AuthUser } from '../services/auth'

interface AuthScreenProps {
  onAuthenticated: (user: AuthUser) => void
}

// ─── Input sanitization ──────────────────────────────────────────────────────

function sanitize(input: string): string {
  return input
    .replace(/[<>]/g, '') // Strip angle brackets (XSS vectors)
    .trim()
    .slice(0, 200) // Cap length
}

function sanitizeEmail(input: string): string {
  return sanitize(input).toLowerCase()
}

function sanitizeUsername(input: string): string {
  return sanitize(input).replace(/[^a-zA-Z0-9_\-@.]/g, '')
}

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [attempts, setAttempts] = useState(0)

  const checkAuth = useCallback(() => {
    const user = authService.getUser()
    if (user && authService.isAuthenticated()) {
      onAuthenticated(user)
    }
  }, [onAuthenticated])

  useEffect(() => { checkAuth() }, [checkAuth])

  // Client-side rate limiting (supplements server-side)
  const isClientLocked = attempts >= 5

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (isClientLocked) {
      setError('Too many attempts. Please wait a moment before trying again.')
      return
    }

    setLoading(true)

    try {
      if (mode === 'login') {
        const identifier = email.includes('@') ? sanitizeEmail(email) : sanitizeUsername(email)
        if (!identifier || !password) {
          setError('Please enter your credentials.')
          setLoading(false)
          return
        }
        const result = await authService.login(identifier, password)
        setAttempts(0)
        onAuthenticated(result.user)
      } else {
        const cleanEmail = sanitizeEmail(email)
        const cleanUsername = sanitizeUsername(username)
        const cleanDisplayName = sanitize(displayName)

        if (!cleanEmail || !cleanUsername || !password) {
          setError('Email, username, and password are required.')
          setLoading(false)
          return
        }
        if (password.length < 8) {
          setError('Password must be at least 8 characters.')
          setLoading(false)
          return
        }
        if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
          setError('Password needs at least 1 uppercase letter and 1 number.')
          setLoading(false)
          return
        }

        const result = await authService.register(cleanEmail, cleanUsername, password, cleanDisplayName || undefined)
        setAttempts(0)
        onAuthenticated(result.user)
      }
    } catch (err) {
      setAttempts(a => a + 1)
      if (err instanceof AuthError) {
        setError(err.message)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Decay attempt counter
  useEffect(() => {
    if (attempts > 0) {
      const timer = setTimeout(() => setAttempts(a => Math.max(0, a - 1)), 30000)
      return () => clearTimeout(timer)
    }
  }, [attempts])

  const MAGENTA = '#FF00FF'
  const BG_BODY = '#000000'
  const BG_CARD = '#0a0a0a'
  const BG_INPUT = '#141414'
  const BORDER = '#1a1a1a'
  const BORDER_HOVER = '#2a2a2a'
  const TEXT_PRIMARY = '#cccccc'
  const TEXT_MUTED = '#666666'
  const TEXT_DIM = '#444444'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #090909 0%, #0d0b12 50%, #090909 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontSize: '13px',
      color: TEXT_PRIMARY,
    }}>
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .bloop-input {
          width: 100%;
          padding: 10px 12px;
          background: ${BG_INPUT};
          border: 1px solid ${BORDER};
          border-radius: 4px;
          color: #fff;
          font-size: 13px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
        }
        .bloop-input::placeholder {
          color: rgba(212, 165, 255, 0.4);
        }
        .bloop-input:focus {
          border-color: ${MAGENTA};
          box-shadow: 0 0 8px rgba(255, 0, 255, 0.15);
        }
        .bloop-input:hover:not(:focus) {
          border-color: ${BORDER_HOVER};
        }
      `}</style>

      {/* Background accents */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-200px', right: '-200px',
          width: '500px', height: '500px',
          background: `radial-gradient(circle, rgba(255,0,255,0.04) 0%, transparent 70%)`,
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', bottom: '-200px', left: '-200px',
          width: '400px', height: '400px',
          background: `radial-gradient(circle, rgba(255,0,255,0.03) 0%, transparent 70%)`,
          borderRadius: '50%',
        }} />
      </div>

      <div style={{
        width: '100%',
        maxWidth: '380px',
        position: 'relative',
        zIndex: 10,
        animation: 'fade-in 0.4s ease-out',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img
            src="/blooplogo.png"
            alt="Bloop"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '12px',
              marginBottom: '16px',
              objectFit: 'cover',
            }}
          />
          <h1 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#fff',
            margin: '0 0 6px 0',
            letterSpacing: '-0.02em',
          }}>
            Bloop
          </h1>
          <p style={{
            color: TEXT_MUTED,
            fontSize: '12px',
            margin: 0,
          }}>
            {mode === 'login' ? 'Sign in to your workspace' : 'Create your account'}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: BG_CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: '8px',
          padding: '24px',
        }}>
          {/* Mode Toggle */}
          <div style={{
            display: 'flex',
            gap: '2px',
            marginBottom: '24px',
            borderBottom: `1px solid ${BORDER}`,
          }}>
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  fontSize: '12px',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${mode === m ? MAGENTA : 'transparent'}`,
                  color: mode === m ? '#fff' : TEXT_MUTED,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  marginBottom: '-1px',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mode === 'register' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: TEXT_MUTED, marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Display Name
                  </label>
                  <input
                    className="bloop-input"
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Optional"
                    autoComplete="name"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: TEXT_MUTED, marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Username
                  </label>
                  <input
                    className="bloop-input"
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="your-username"
                    required
                    autoComplete="username"
                    maxLength={30}
                  />
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: TEXT_MUTED, marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {mode === 'login' ? 'Email or Username' : 'Email'}
              </label>
              <input
                className="bloop-input"
                type={mode === 'register' ? 'email' : 'text'}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={mode === 'login' ? 'you@example.com' : 'you@example.com'}
                required
                autoComplete={mode === 'login' ? 'username' : 'email'}
                maxLength={200}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: TEXT_MUTED, marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="bloop-input"
                  style={{ paddingRight: '40px' }}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? '8+ chars, 1 upper, 1 number' : 'Enter password'}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  maxLength={128}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '10px', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: TEXT_DIM,
                    padding: '2px',
                    display: 'flex',
                    transition: 'color 0.15s',
                  }}
                  onMouseOver={e => (e.currentTarget.style.color = TEXT_MUTED)}
                  onMouseOut={e => (e.currentTarget.style.color = TEXT_DIM)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '10px 12px',
                background: 'rgba(255, 0, 0, 0.06)',
                border: '1px solid rgba(255, 60, 60, 0.15)',
                borderRadius: '4px',
                color: '#ff4444',
                fontSize: '12px',
                lineHeight: 1.4,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isClientLocked}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: loading || isClientLocked ? '#333' : MAGENTA,
                color: '#fff',
                fontWeight: 600,
                fontSize: '13px',
                fontFamily: 'inherit',
                border: 'none',
                borderRadius: '4px',
                cursor: loading || isClientLocked ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                opacity: loading || isClientLocked ? 0.5 : 1,
              }}
              onMouseOver={e => {
                if (!loading && !isClientLocked) {
                  e.currentTarget.style.boxShadow = `0 0 12px rgba(255, 0, 255, 0.4)`
                }
              }}
              onMouseOut={e => {
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {loading ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          marginTop: '20px',
        }}>
          {[
            { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', label: 'Encrypted' },
            { icon: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0022 16z', label: 'Isolated' },
            { icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', label: 'Bot Team' },
          ].map(({ icon, label }) => (
            <span key={label} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11px',
              color: TEXT_DIM,
              letterSpacing: '0.02em',
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={TEXT_DIM} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={icon} />
              </svg>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
