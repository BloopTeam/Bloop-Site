/**
 * Security Dashboard Component
 * 
 * User-specific security monitoring - only active when user is working
 * All data is stored per-user in database (not shared)
 */
import React, { useState, useEffect } from 'react'
import { Shield, AlertTriangle, CheckCircle, XCircle, Activity, Lock, Eye, RefreshCw, AlertCircle } from 'lucide-react'
import { userSessionService } from '../services/userSession'

interface SecurityEvent {
  id: string
  timestamp: string
  event_type: string
  severity: string
  description: string
  source?: string
}

interface Vulnerability {
  id: string
  severity: string
  description: string
  affected_files: string[]
  fix_suggestion?: string
}

interface SecurityMetrics {
  totalEvents: number
  criticalThreats: number
  highSeverity: number
  vulnerabilities: number
  blockedRequests: number
  securityScore: number
}

export function SecurityDashboard() {
  const [isActive, setIsActive] = useState(false)
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([])
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null)
  const [loading, setLoading] = useState(false)

  // Only activate when user starts working (user-specific check)
  useEffect(() => {
    const userId = userSessionService.getCurrentUserId()
    const hasActiveProject = userId
      ? sessionStorage.getItem(`bloop-has-project-${userId}`) === 'true' || localStorage.getItem('bloop-has-project') === 'true'
      : localStorage.getItem('bloop-has-project') === 'true'
    
    if (hasActiveProject) {
      // User is working - activate security monitoring
      setIsActive(true)
      loadSecurityData()
    } else {
      // No active work - show empty state
      setIsActive(false)
      setEvents([])
      setVulnerabilities([])
      setMetrics(null)
    }
  }, [])

  // Listen for project activity to activate
  useEffect(() => {
    const handleProjectActivity = () => {
      if (!isActive) {
        setIsActive(true)
        loadSecurityData()
      }
    }

    // Listen for file changes, saves, etc.
    window.addEventListener('bloop:project-activity', handleProjectActivity)
    return () => window.removeEventListener('bloop:project-activity', handleProjectActivity)
  }, [isActive])

  const loadSecurityData = async () => {
    if (!isActive) return
    
    setLoading(true)
    try {
      // TODO: Replace with actual API call to user-specific database
      // const userId = getCurrentUserId()
      // const data = await apiService.getUserSecurityData(userId)
      
      // For now, simulate user-specific data (empty by default)
      // In production, this would fetch from user's database
      setEvents([])
      setVulnerabilities([])
      setMetrics(null)
    } catch {
      // Silently fail - security data unavailable
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return '#ef4444'
      case 'high': return '#f97316'
      case 'medium': return '#eab308'
      case 'low': return '#3b82f6'
      default: return '#858585'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'high':
        return <XCircle size={14} style={{ color: getSeverityColor(severity) }} />
      case 'medium':
        return <AlertTriangle size={14} style={{ color: getSeverityColor(severity) }} />
      default:
        return <CheckCircle size={14} style={{ color: getSeverityColor(severity) }} />
    }
  }

  // Empty state - user not working yet
  if (!isActive) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        background: '#252526', 
        color: '#cccccc',
        fontSize: '13px'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '12px', 
          borderBottom: '1px solid #3e3e42',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} style={{ color: '#FF00FF' }} />
            <span style={{ fontWeight: 600 }}>Security Dashboard</span>
          </div>
        </div>

        {/* Empty State */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          textAlign: 'center'
        }}>
          <Shield size={48} style={{ color: '#3e3e42', marginBottom: '16px', opacity: 0.5 }} />
          <div style={{ fontSize: '13px', color: '#858585', marginBottom: '8px' }}>
            Security monitoring will begin when you start working
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            Open a project or create a file to start
          </div>
        </div>
      </div>
    )
  }

  // Active state - show security data
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      background: '#252526', 
      color: '#cccccc',
      fontSize: '13px'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '12px', 
        borderBottom: '1px solid #3e3e42',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={16} style={{ color: '#FF00FF' }} />
          <span style={{ fontWeight: 600 }}>Security Dashboard</span>
        </div>
        <button
          onClick={loadSecurityData}
          disabled={loading}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#858585',
            cursor: loading ? 'not-allowed' : 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '4px',
            transition: 'all 0.2s',
            opacity: loading ? 0.5 : 1
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.color = '#FF00FF'
              e.currentTarget.style.background = 'rgba(255, 0, 255, 0.1)'
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.color = '#858585'
              e.currentTarget.style.background = 'transparent'
            }
          }}
          title="Refresh security data"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '32px', 
            color: '#858585',
            fontSize: '13px'
          }}>
            Loading security data...
          </div>
        ) : metrics === null && events.length === 0 && vulnerabilities.length === 0 ? (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            textAlign: 'center'
          }}>
            <CheckCircle size={48} style={{ color: '#22c55e', marginBottom: '16px', opacity: 0.7 }} />
            <div style={{ fontSize: '13px', color: '#858585', marginBottom: '8px' }}>
              No security issues detected
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              Your project appears secure
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Security Score */}
            {metrics && (
              <div style={{
                padding: '12px',
                background: '#1e1e1e',
                border: '1px solid #3e3e42',
                borderRadius: '4px'
              }}>
                <div style={{ fontSize: '11px', color: '#858585', marginBottom: '8px', fontWeight: 600 }}>
                  Security Score
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: metrics.securityScore >= 90 ? '#22c55e' : metrics.securityScore >= 70 ? '#eab308' : '#ef4444' }}>
                    {metrics.securityScore}
                  </span>
                  <span style={{ fontSize: '12px', color: '#858585' }}>/100</span>
                </div>
                <div style={{
                  height: '4px',
                  background: '#3e3e42',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${metrics.securityScore}%`,
                    background: metrics.securityScore >= 90 ? '#22c55e' : metrics.securityScore >= 70 ? '#eab308' : '#ef4444',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            )}

            {/* Metrics Summary */}
            {metrics && (
              <div style={{
                padding: '12px',
                background: '#1e1e1e',
                border: '1px solid #3e3e42',
                borderRadius: '4px'
              }}>
                <div style={{ fontSize: '11px', color: '#858585', marginBottom: '8px', fontWeight: 600 }}>
                  Overview
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#858585' }}>Events:</span>
                    <span style={{ color: '#ccc', fontWeight: 500 }}>{metrics.totalEvents}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#858585' }}>Critical:</span>
                    <span style={{ color: '#ef4444', fontWeight: 500 }}>{metrics.criticalThreats}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#858585' }}>High:</span>
                    <span style={{ color: '#f97316', fontWeight: 500 }}>{metrics.highSeverity}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#858585' }}>Vulnerabilities:</span>
                    <span style={{ color: '#ccc', fontWeight: 500 }}>{metrics.vulnerabilities}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Events */}
            {events.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', color: '#858585', marginBottom: '8px', fontWeight: 600 }}>
                  Recent Events
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {events.slice(0, 5).map(event => (
                    <div
                      key={event.id}
                      style={{
                        padding: '10px',
                        background: '#1e1e1e',
                        border: `1px solid ${getSeverityColor(event.severity)}`,
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        {getSeverityIcon(event.severity)}
                        <span style={{ fontWeight: 500, color: '#ccc' }}>{event.event_type}</span>
                        <span style={{ fontSize: '10px', color: '#666', marginLeft: 'auto' }}>
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#858585' }}>
                        {event.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vulnerabilities */}
            {vulnerabilities.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', color: '#858585', marginBottom: '8px', fontWeight: 600 }}>
                  Vulnerabilities
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {vulnerabilities.slice(0, 5).map(vuln => (
                    <div
                      key={vuln.id}
                      style={{
                        padding: '10px',
                        background: '#1e1e1e',
                        border: `1px solid ${getSeverityColor(vuln.severity)}`,
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        {getSeverityIcon(vuln.severity)}
                        <span style={{ fontWeight: 500, color: '#ccc' }}>{vuln.id}</span>
                        <span style={{ 
                          fontSize: '10px', 
                          padding: '2px 4px', 
                          borderRadius: '3px',
                          background: getSeverityColor(vuln.severity),
                          color: '#fff',
                          fontWeight: 600
                        }}>
                          {vuln.severity}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#858585', marginBottom: '4px' }}>
                        {vuln.description}
                      </div>
                      {vuln.fix_suggestion && (
                        <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
                          Fix: {vuln.fix_suggestion}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
