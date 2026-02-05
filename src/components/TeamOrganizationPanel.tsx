/**
 * Team & Organization Panel
 * Manage organizations, teams, members, and permissions
 */

import { useState, useEffect } from 'react'
import { 
  X, Plus, Users, Settings, Shield, Crown, Trash2, 
  UserPlus, Mail, Check, AlertCircle, Search, Building
} from 'lucide-react'
import { 
  teamOrganizationService, 
  Organization, 
  OrganizationMember,
  TeamWorkspace,
  OrganizationProject 
} from '../services/teamOrganization'

interface TeamOrganizationPanelProps {
  onClose: () => void
}

type ViewMode = 'list' | 'org-details' | 'create-org'

export default function TeamOrganizationPanel({ onClose }: TeamOrganizationPanelProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [workspaces, setWorkspaces] = useState<TeamWorkspace[]>([])
  const [projects, setProjects] = useState<OrganizationProject[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [activeTab, setActiveTab] = useState<'members' | 'workspaces' | 'projects' | 'settings'>('members')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    plan: 'free' as Organization['plan']
  })

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<OrganizationMember['role']>('member')

  const currentUserId = 'current-user' // In production, get from auth

  useEffect(() => {
    loadOrganizations()
  }, [])

  useEffect(() => {
    if (selectedOrg) {
      loadOrgData(selectedOrg.id)
    }
  }, [selectedOrg])

  const loadOrganizations = () => {
    const orgs = teamOrganizationService.getUserOrganizations(currentUserId)
    setOrganizations(orgs)
  }

  const loadOrgData = (orgId: string) => {
    setMembers(teamOrganizationService.getOrganizationMembers(orgId))
    // In a real app, would load workspaces and projects here
    setWorkspaces([])
    setProjects([])
  }

  const handleCreateOrganization = async () => {
    try {
      const org = await teamOrganizationService.createOrganization({
        ...formData,
        ownerId: currentUserId
      })
      setOrganizations([...organizations, org])
      setViewMode('list')
      setFormData({ name: '', slug: '', description: '', plan: 'free' })
    } catch (error) {
      console.error('Failed to create organization:', error)
      alert('Failed to create organization. Please try again.')
    }
  }

  const handleInviteMember = async () => {
    if (!selectedOrg || !inviteEmail) return

    try {
      await teamOrganizationService.addMember(selectedOrg.id, {
        userId: 'invited-user-id', // In production, lookup or create user
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        role: inviteRole
      })
      setInviteEmail('')
      loadOrgData(selectedOrg.id)
    } catch (error) {
      console.error('Failed to invite member:', error)
      alert('Failed to invite member. Please try again.')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedOrg) return
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      await teamOrganizationService.removeMember(selectedOrg.id, memberId, currentUserId)
      loadOrgData(selectedOrg.id)
    } catch (error) {
      console.error('Failed to remove member:', error)
    }
  }

  const handleUpdateMemberRole = async (memberId: string, newRole: OrganizationMember['role']) => {
    if (!selectedOrg) return

    try {
      await teamOrganizationService.updateMemberRole(selectedOrg.id, memberId, newRole, currentUserId)
      loadOrgData(selectedOrg.id)
    } catch (error) {
      console.error('Failed to update member role:', error)
    }
  }

  const getRoleColor = (role: OrganizationMember['role']) => {
    switch (role) {
      case 'owner': return '#FF00FF'
      case 'admin': return '#f59e0b'
      case 'member': return '#22c55e'
      default: return '#666'
    }
  }

  const getRoleIcon = (role: OrganizationMember['role']) => {
    switch (role) {
      case 'owner': return <Crown size={12} />
      case 'admin': return <Shield size={12} />
      default: return <Users size={12} />
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#151515',
      color: '#ddd'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #2a2a2a'
      }}>
        <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#ddd' }}>
          {viewMode === 'list' ? 'Organizations' : viewMode === 'create-org' ? 'Create Organization' : selectedOrg?.name}
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {viewMode === 'list' && (
            <button
              onClick={() => setViewMode('create-org')}
              style={{
                padding: '6px 12px',
                background: '#FF00FF',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={12} />
              New Organization
            </button>
          )}
          {viewMode !== 'list' && (
            <button
              onClick={() => {
                setViewMode('list')
                setSelectedOrg(null)
              }}
              style={{
                padding: '6px 12px',
                background: '#1a1a1a',
                color: '#ddd',
                border: '1px solid #2a2a2a',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              ← Back
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {organizations.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#666', fontSize: '12px' }}>
              <Building size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <div>No organizations yet</div>
              <button
                onClick={() => setViewMode('create-org')}
                style={{
                  marginTop: '12px',
                  padding: '6px 12px',
                  background: '#FF00FF',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                Create Your First Organization
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {organizations.map(org => {
                const userMember = teamOrganizationService.getOrganizationMembers(org.id).find(m => m.userId === currentUserId)
                
                return (
                  <div
                    key={org.id}
                    onClick={() => {
                      setSelectedOrg(org)
                      setViewMode('org-details')
                    }}
                    style={{
                      padding: '16px',
                      background: '#1a1a1a',
                      border: '1px solid #2a2a2a',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3e3e42'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2a2a2a'}
                  >
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#ddd', marginBottom: '4px' }}>
                        {org.name}
                      </div>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px' }}>
                        @{org.slug}
                      </div>
                      {org.description && (
                        <div style={{ fontSize: '11px', color: '#999', lineHeight: '1.5' }}>
                          {org.description}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#666' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div
                          style={{
                            padding: '4px 8px',
                            background: getRoleColor(userMember?.role || 'member') + '22',
                            border: `1px solid ${getRoleColor(userMember?.role || 'member')}`,
                            borderRadius: '4px',
                            color: getRoleColor(userMember?.role || 'member'),
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '9px',
                            textTransform: 'capitalize'
                          }}
                        >
                          {getRoleIcon(userMember?.role || 'member')}
                          {userMember?.role}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={11} />
                        {teamOrganizationService.getOrganizationMembers(org.id).length}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Organization View */}
      {viewMode === 'create-org' && (
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px' }}>
                Organization Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value
                  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                  setFormData({ ...formData, name, slug })
                }}
                placeholder="Acme Inc."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '4px',
                  color: '#ddd',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px' }}>
                URL Slug
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#666' }}>bloop.ai/</span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="acme"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    borderRadius: '4px',
                    color: '#ddd',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px' }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does your organization do?"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '4px',
                  color: '#ddd',
                  fontSize: '11px',
                  outline: 'none',
                  minHeight: '80px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px' }}>
                Plan
              </label>
              <select
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '4px',
                  color: '#ddd',
                  fontSize: '11px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <button
              onClick={handleCreateOrganization}
              disabled={!formData.name || !formData.slug}
              style={{
                padding: '8px 16px',
                background: (!formData.name || !formData.slug) ? '#666' : '#FF00FF',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: (!formData.name || !formData.slug) ? 'not-allowed' : 'pointer',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={12} />
              Create Organization
            </button>
          </div>
        </div>
      )}

      {/* Organization Details View */}
      {viewMode === 'org-details' && selectedOrg && (
        <>
          {/* Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #2a2a2a',
            background: '#1a1a1a'
          }}>
            {(['members', 'workspaces', 'projects', 'settings'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: activeTab === tab ? '#151515' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid #FF00FF' : '2px solid transparent',
                  color: activeTab === tab ? '#FF00FF' : '#888',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: activeTab === tab ? 500 : 400,
                  textTransform: 'capitalize'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600 }}>
                  Invite Member
                </h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@example.com"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#1a1a1a',
                        border: '1px solid #2a2a2a',
                        borderRadius: '4px',
                        color: '#ddd',
                        fontSize: '11px',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    style={{
                      padding: '8px 12px',
                      background: '#1a1a1a',
                      border: '1px solid #2a2a2a',
                      borderRadius: '4px',
                      color: '#ddd',
                      fontSize: '11px',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={handleInviteMember}
                    disabled={!inviteEmail}
                    style={{
                      padding: '8px 16px',
                      background: !inviteEmail ? '#666' : '#FF00FF',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: !inviteEmail ? 'not-allowed' : 'pointer',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <UserPlus size={12} />
                    Invite
                  </button>
                </div>
              </div>

              <div style={{ marginTop: '24px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600 }}>
                  Members ({members.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {members.map(member => (
                    <div
                      key={member.id}
                      style={{
                        padding: '12px',
                        background: '#1a1a1a',
                        border: '1px solid #2a2a2a',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 500, color: '#ddd', marginBottom: '4px' }}>
                          {member.name}
                        </div>
                        <div style={{ fontSize: '10px', color: '#666' }}>
                          {member.email}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateMemberRole(member.userId, e.target.value as any)}
                          disabled={member.role === 'owner'}
                          style={{
                            padding: '4px 8px',
                            background: '#252526',
                            border: '1px solid #2a2a2a',
                            borderRadius: '4px',
                            color: getRoleColor(member.role),
                            fontSize: '10px',
                            cursor: member.role === 'owner' ? 'not-allowed' : 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                        </select>
                        {member.role !== 'owner' && (
                          <button
                            onClick={() => handleRemoveMember(member.userId)}
                            style={{
                              padding: '4px',
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Workspaces Tab */}
          {activeTab === 'workspaces' && (
            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
              <div style={{ padding: '32px', textAlign: 'center', color: '#666', fontSize: '12px' }}>
                <Users size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <div>No workspaces yet</div>
                <div style={{ fontSize: '10px', marginTop: '8px' }}>
                  Create workspaces to organize your teams and projects
                </div>
              </div>
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
              <div style={{ padding: '32px', textAlign: 'center', color: '#666', fontSize: '12px' }}>
                <Building size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <div>No projects yet</div>
                <div style={{ fontSize: '10px', marginTop: '8px' }}>
                  Start your first project to get going
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
              <div style={{ maxWidth: '600px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 600 }}>
                  Organization Settings
                </h3>
                <div style={{ padding: '16px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#ddd', marginBottom: '12px' }}>
                    <strong>Plan:</strong> {selectedOrg.plan}
                  </div>
                  <div style={{ fontSize: '11px', color: '#ddd', marginBottom: '12px' }}>
                    <strong>Members:</strong> {members.length}
                  </div>
                  <div style={{ fontSize: '11px', color: '#ddd' }}>
                    <strong>Created:</strong> {new Date(selectedOrg.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
