/**
 * Collaboration Panel
 * Shows real-time collaboration features, presence, and session management
 */

import { useState, useEffect } from 'react'
import { 
  Users, Link, Copy, Check, Plus, X, Circle, 
  Activity, Eye, Edit3, MessageSquare, Clock,
  Share2, UserPlus, Settings, Zap
} from 'lucide-react'
import { collaborationService, CollaborationSession, CollaboratorInfo } from '../services/collaboration'

interface CollaborationPanelProps {
  onClose: () => void
}

export default function CollaborationPanel({ onClose }: CollaborationPanelProps) {
  const [session, setSession] = useState<CollaborationSession | null>(null)
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [sessionName, setSessionName] = useState('')
  const [copied, setCopied] = useState(false)
  const [activity, setActivity] = useState<{ type: string; message: string; time: Date; collaborator: string }[]>([])

  useEffect(() => {
    // Get current session
    setSession(collaborationService.getCurrentSession())
    setCollaborators(collaborationService.getCollaborators())
    setActivity(collaborationService.getRecentActivity())

    // Listen for updates
    const handleCollaboratorsUpdate = (collabs: CollaboratorInfo[]) => {
      setCollaborators([...collabs])
    }

    const handleSessionUpdate = (sess: CollaborationSession) => {
      setSession(sess)
    }

    collaborationService.on('collaborators:updated', handleCollaboratorsUpdate as any)
    collaborationService.on('session:created', handleSessionUpdate as any)
    collaborationService.on('session:joined', handleSessionUpdate as any)

    return () => {
      collaborationService.off('collaborators:updated', handleCollaboratorsUpdate as any)
      collaborationService.off('session:created', handleSessionUpdate as any)
      collaborationService.off('session:joined', handleSessionUpdate as any)
    }
  }, [])

  const createSession = async () => {
    if (!sessionName.trim()) return
    const newSession = await collaborationService.createSession(sessionName, '/project')
    setSession(newSession)
    setCollaborators(newSession.collaborators)
    setActivity(collaborationService.getRecentActivity())
    setShowCreateModal(false)
    setSessionName('')
  }

  const copyShareLink = async () => {
    if (session?.shareLink) {
      await navigator.clipboard.writeText(session.shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const leaveSession = async () => {
    await collaborationService.leaveSession()
    setSession(null)
    setCollaborators([])
    setActivity([])
  }

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    return `${Math.floor(seconds / 3600)}h ago`
  }

  const getStatusColor = (lastActive: Date) => {
    const seconds = (Date.now() - new Date(lastActive).getTime()) / 1000
    if (seconds < 30) return '#22c55e' // Online
    if (seconds < 120) return '#eab308' // Away
    return '#666' // Offline
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#0a0a0a',
      color: '#ccc'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} style={{ color: '#FF00FF' }} />
          <span style={{ fontWeight: 600 }}>Collaboration</span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {!session ? (
          /* No Session View */
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #FF00FF20, #FF00FF10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Users size={32} style={{ color: '#FF00FF' }} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: '#fff' }}>
              Start Collaborating
            </h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '24px' }}>
              Create a session to work with others and AI agents in real-time
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: '#FF00FF',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                margin: '0 auto'
              }}
            >
              <Plus size={18} />
              Create Session
            </button>

            {/* Recent Sessions */}
            {collaborationService.getSavedSessions().length > 0 && (
              <div style={{ marginTop: '32px', textAlign: 'left' }}>
                <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Recent Sessions
                </div>
                {collaborationService.getSavedSessions().slice(-3).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => collaborationService.joinSession(s.id).then(sess => {
                      if (sess) {
                        setSession(sess)
                        setCollaborators(sess.collaborators)
                      }
                    })}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: '#141414',
                      border: '1px solid #1a1a1a',
                      borderRadius: '8px',
                      color: '#ccc',
                      cursor: 'pointer',
                      marginBottom: '8px',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: '#1a1a1a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Users size={18} style={{ color: '#666' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{s.name}</div>
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        {s.collaborators.length} collaborators
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Active Session View */
          <div>
            {/* Session Info */}
            <div style={{
              padding: '16px',
              background: '#141414',
              borderRadius: '12px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{session.name}</div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                    Created {getTimeAgo(session.createdAt)}
                  </div>
                </div>
                <div style={{
                  padding: '4px 10px',
                  background: '#22c55e20',
                  borderRadius: '12px',
                  fontSize: '11px',
                  color: '#22c55e',
                  fontWeight: 500
                }}>
                  Live
                </div>
              </div>

              {/* Share Link */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                background: '#0a0a0a',
                borderRadius: '8px',
                marginTop: '12px'
              }}>
                <Link size={14} style={{ color: '#666' }} />
                <code style={{ flex: 1, fontSize: '11px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {session.shareLink}
                </code>
                <button
                  onClick={copyShareLink}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: copied ? '#22c55e' : '#666',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex'
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Collaborators */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <span style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>
                  Collaborators ({collaborators.length})
                </span>
                <button style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#FF00FF',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px'
                }}>
                  <UserPlus size={12} />
                  Invite
                </button>
              </div>

              {collaborators.map((collab) => (
                <div
                  key={collab.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    background: '#141414',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}
                >
                  {/* Avatar with status */}
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: collab.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#fff'
                    }}>
                      {collab.isAgent ? <Zap size={14} /> : collab.name.charAt(0)}
                    </div>
                    <div style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: getStatusColor(collab.lastActive),
                      border: '2px solid #141414'
                    }} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#fff' }}>
                      {collab.name}
                      {collab.isAgent && (
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '10px',
                          padding: '2px 6px',
                          background: '#FF00FF20',
                          color: '#FF00FF',
                          borderRadius: '4px'
                        }}>
                          Agent
                        </span>
                      )}
                    </div>
                    {collab.cursor && (
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Eye size={10} />
                        {collab.cursor.file}:{collab.cursor.line}
                      </div>
                    )}
                  </div>

                  {/* Activity indicator */}
                  <div style={{ fontSize: '10px', color: '#555' }}>
                    {getTimeAgo(collab.lastActive)}
                  </div>
                </div>
              ))}
            </div>

            {/* Activity Feed */}
            <div>
              <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', marginBottom: '12px' }}>
                Activity
              </div>
              {activity.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 0',
                    borderBottom: '1px solid #1a1a1a'
                  }}
                >
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#1a1a1a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {item.type === 'join' && <UserPlus size={12} style={{ color: '#22c55e' }} />}
                    {item.type === 'edit' && <Edit3 size={12} style={{ color: '#FF00FF' }} />}
                    {item.type === 'cursor' && <Eye size={12} style={{ color: '#3b82f6' }} />}
                    {item.type === 'analysis' && <Activity size={12} style={{ color: '#eab308' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: '#ccc' }}>
                      <span style={{ color: '#fff', fontWeight: 500 }}>{item.collaborator}</span>
                      {' '}{item.message}
                    </div>
                    <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
                      {getTimeAgo(item.time)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Leave Session */}
            <button
              onClick={leaveSession}
              style={{
                width: '100%',
                marginTop: '24px',
                padding: '12px',
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Leave Session
            </button>
          </div>
        )}
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowCreateModal(false)}>
          <div
            style={{
              background: '#1a1a1a',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '400px',
              margin: '16px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#fff' }}>
              Create Collaboration Session
            </h3>
            <input
              type="text"
              value={sessionName}
              onChange={e => setSessionName(e.target.value)}
              placeholder="Session name..."
              style={{
                width: '100%',
                padding: '12px',
                background: '#0a0a0a',
                border: '1px solid #2a2a2a',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                marginBottom: '16px',
                outline: 'none'
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'transparent',
                  border: '1px solid #2a2a2a',
                  borderRadius: '8px',
                  color: '#888',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={createSession}
                disabled={!sessionName.trim()}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: sessionName.trim() ? '#FF00FF' : '#333',
                  border: 'none',
                  borderRadius: '8px',
                  color: sessionName.trim() ? '#fff' : '#666',
                  cursor: sessionName.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: 500
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
