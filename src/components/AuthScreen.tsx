/**
 * Authentication Screen — Login / Register
 *
 * Premium landing + auth screen for Bloop.
 */
import React, { useState, useEffect } from 'react'
import { authService, AuthError, AuthUser } from '../services/auth'

interface AuthScreenProps {
  onAuthenticated: (user: AuthUser) => void
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

  useEffect(() => {
    const user = authService.getUser()
    if (user && authService.isAuthenticated()) {
      onAuthenticated(user)
    }
  }, [onAuthenticated])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const result = await authService.login(email || username, password)
        onAuthenticated(result.user)
      } else {
        if (!email || !username || !password) {
          setError('All fields are required')
          setLoading(false)
          return
        }
        const result = await authService.register(email, username, password, displayName || undefined)
        onAuthenticated(result.user)
      }
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#06060b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* Animated background orbs */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-20%', right: '-10%',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'float 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', left: '-10%',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'float 10s ease-in-out infinite reverse',
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px', height: '800px',
          background: 'radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 60%)',
          borderRadius: '50%',
        }} />
        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .auth-input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          color: #fff;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          transition: all 0.2s ease;
        }
        .auth-input::placeholder { color: rgba(255,255,255,0.25); }
        .auth-input:focus {
          border-color: rgba(139,92,246,0.5);
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1), 0 0 20px rgba(139,92,246,0.05);
          background: rgba(255,255,255,0.05);
        }
        .auth-btn {
          width: 100%;
          padding: 14px 24px;
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%);
          color: #fff;
          font-weight: 600;
          font-size: 15px;
          font-family: inherit;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .auth-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 30px rgba(139,92,246,0.3), 0 0 60px rgba(139,92,246,0.1);
        }
        .auth-btn:active:not(:disabled) { transform: translateY(0); }
        .auth-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .mode-btn {
          flex: 1;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 500;
          font-family: inherit;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
      `}</style>

      <div style={{
        width: '100%',
        maxWidth: '440px',
        position: 'relative',
        zIndex: 10,
        animation: 'fadeUp 0.6s ease-out',
      }}>
        {/* Logo & Branding */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
            marginBottom: '20px',
            boxShadow: '0 8px 32px rgba(139,92,246,0.3)',
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 8px 0',
            letterSpacing: '-0.02em',
          }}>
            Bloop
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '15px',
            margin: 0,
            lineHeight: 1.5,
          }}>
            {mode === 'login'
              ? 'Welcome back. Sign in to your workspace.'
              : 'Build with AI. Create your account.'}
          </p>
        </div>

        {/* Auth Card */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4), 0 0 1px rgba(255,255,255,0.1) inset',
        }}>
          {/* Mode Toggle */}
          <div style={{
            display: 'flex',
            gap: '4px',
            padding: '4px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '12px',
            marginBottom: '28px',
          }}>
            <button
              className="mode-btn"
              onClick={() => { setMode('login'); setError('') }}
              style={{
                background: mode === 'login'
                  ? 'linear-gradient(135deg, rgba(139,92,246,0.9), rgba(99,102,241,0.9))'
                  : 'transparent',
                color: mode === 'login' ? '#fff' : 'rgba(255,255,255,0.4)',
                boxShadow: mode === 'login' ? '0 4px 12px rgba(139,92,246,0.3)' : 'none',
              }}
            >
              Sign In
            </button>
            <button
              className="mode-btn"
              onClick={() => { setMode('register'); setError('') }}
              style={{
                background: mode === 'register'
                  ? 'linear-gradient(135deg, rgba(139,92,246,0.9), rgba(99,102,241,0.9))'
                  : 'transparent',
                color: mode === 'register' ? '#fff' : 'rgba(255,255,255,0.4)',
                boxShadow: mode === 'register' ? '0 4px 12px rgba(139,92,246,0.3)' : 'none',
              }}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {mode === 'register' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
                    Display Name
                  </label>
                  <input
                    className="auth-input"
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Your name (optional)"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
                    Username
                  </label>
                  <input
                    className="auth-input"
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    required
                    autoComplete="username"
                  />
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
                {mode === 'login' ? 'Email or Username' : 'Email'}
              </label>
              <input
                className="auth-input"
                type={mode === 'register' ? 'email' : 'text'}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={mode === 'login' ? 'you@example.com or username' : 'you@example.com'}
                required
                autoComplete={mode === 'login' ? 'username' : 'email'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="auth-input"
                  style={{ paddingRight: '48px' }}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Min 8 chars, 1 uppercase, 1 number' : 'Enter your password'}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '14px', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.3)',
                    padding: '4px',
                    display: 'flex',
                    transition: 'color 0.2s',
                  }}
                  onMouseOver={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                  onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '12px',
                color: '#f87171',
                fontSize: '13px',
              }}>
                {error}
              </div>
            )}

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <svg style={{ animation: 'spin 1s linear infinite' }} width="16" height="16" viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {mode === 'register' && (
            <p style={{
              marginTop: '16px',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.25)',
              textAlign: 'center',
              lineHeight: 1.5,
            }}>
              Password: 8+ characters, 1 uppercase, 1 number
            </p>
          )}
        </div>

        {/* Feature pills */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          marginTop: '28px',
          flexWrap: 'wrap',
        }}>
          {[
            { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', label: 'End-to-End Encrypted' },
            { icon: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0022 16z', label: 'Isolated Workspaces' },
            { icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75', label: '24/7 AI Bot Team' },
          ].map(({ icon, label }) => (
            <div key={label} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(139,92,246,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={icon} />
              </svg>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Tagline */}
        <p style={{
          textAlign: 'center',
          marginTop: '24px',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.15)',
          letterSpacing: '0.05em',
        }}>
          THE FUTURE OF AI-POWERED DEVELOPMENT
        </p>
      </div>
    </div>
  )
}
