/**
 * Team & Organization Service
 * 
 * Phase 8: Platform & Ecosystem - Team and Organization Features
 * 
 * Features:
 * - Multi-tenant organization support
 * - Role-based access control (RBAC)
 * - Team workspaces and projects
 * - Shared resources (plugins, workflows, agents)
 * - Organization settings and policies
 * - Member management
 * - Billing and subscription management
 * - Audit logs
 * - SSO integration
 * - Team analytics
 */

import { userSessionService } from './userSession'

export interface Organization {
  id: string
  name: string
  slug: string
  description?: string
  avatar?: string
  plan: OrganizationPlan
  billing: OrganizationBilling
  settings: OrganizationSettings
  limits: OrganizationLimits
  usage: OrganizationUsage
  createdAt: Date
  updatedAt: Date
  ownerId: string
  memberCount: number
  projectCount: number
  verified: boolean
  metadata: Record<string, any>
}

export type OrganizationPlan = 
  | 'free'
  | 'starter'
  | 'professional'
  | 'enterprise'
  | 'custom'

export interface OrganizationBilling {
  plan: OrganizationPlan
  status: 'active' | 'cancelled' | 'past_due' | 'trialing'
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  subscriptionId?: string
  paymentMethod?: {
    type: 'card' | 'bank_account'
    last4?: string
    brand?: string
  }
  billingEmail?: string
  billingAddress?: {
    line1: string
    line2?: string
    city: string
    state: string
    postalCode: string
    country: string
  }
}

export interface OrganizationSettings {
  allowPublicPlugins: boolean
  allowPublicWorkflows: boolean
  allowPublicAgents: boolean
  requireApprovalForPublicResources: boolean
  defaultMemberRole: OrganizationRole
  allowedDomains?: string[] // For SSO
  ssoEnabled: boolean
  ssoProvider?: 'okta' | 'auth0' | 'azure-ad' | 'google-workspace' | 'custom'
  ssoConfig?: Record<string, any>
  dataRetentionDays: number
  auditLogRetentionDays: number
  ipWhitelist?: string[]
  mfaRequired: boolean
  passwordPolicy?: {
    minLength: number
    requireUppercase: boolean
    requireLowercase: boolean
    requireNumbers: boolean
    requireSpecialChars: boolean
  }
}

export interface OrganizationLimits {
  maxMembers: number
  maxProjects: number
  maxPlugins: number
  maxWorkflows: number
  maxAgents: number
  maxStorageGB: number
  maxApiRequestsPerMonth: number
  maxConcurrentExecutions: number
  maxTeamWorkspaces: number
}

export interface OrganizationUsage {
  members: number
  projects: number
  plugins: number
  workflows: number
  agents: number
  storageGB: number
  apiRequestsThisMonth: number
  concurrentExecutions: number
  teamWorkspaces: number
}

export type OrganizationRole = 
  | 'owner'
  | 'admin'
  | 'member'
  | 'viewer'
  | 'guest'

export interface OrganizationMember {
  id: string
  organizationId: string
  userId: string
  email: string
  name: string
  avatar?: string
  role: OrganizationRole
  permissions: OrganizationPermission[]
  joinedAt: Date
  invitedBy?: string
  lastActiveAt?: Date
  status: 'active' | 'pending' | 'suspended' | 'removed'
  metadata: Record<string, any>
}

export type OrganizationPermission =
  | 'manage-organization'
  | 'manage-members'
  | 'manage-billing'
  | 'manage-settings'
  | 'create-projects'
  | 'delete-projects'
  | 'share-resources'
  | 'install-plugins'
  | 'create-workflows'
  | 'execute-workflows'
  | 'create-agents'
  | 'manage-agents'
  | 'view-analytics'
  | 'view-audit-logs'
  | 'manage-api-keys'
  | 'export-data'

export interface TeamWorkspace {
  id: string
  organizationId: string
  name: string
  description?: string
  members: string[] // Member IDs
  projects: string[] // Project IDs
  sharedResources: {
    plugins: string[]
    workflows: string[]
    agents: string[]
  }
  settings: {
    visibility: 'private' | 'organization' | 'public'
    defaultPermissions: OrganizationPermission[]
  }
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

export interface OrganizationProject {
  id: string
  organizationId: string
  workspaceId?: string
  name: string
  description?: string
  visibility: 'private' | 'organization' | 'public'
  members: ProjectMember[]
  settings: ProjectSettings
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

export interface ProjectMember {
  userId: string
  role: 'owner' | 'admin' | 'developer' | 'viewer'
  permissions: OrganizationPermission[]
  joinedAt: Date
}

export interface ProjectSettings {
  allowExternalCollaborators: boolean
  requireApprovalForChanges: boolean
  autoSave: boolean
  versionControl: {
    enabled: boolean
    provider?: 'git' | 'svn'
    repository?: string
  }
  notifications: {
    email: boolean
    slack?: string
    webhook?: string
  }
}

export interface OrganizationInvitation {
  id: string
  organizationId: string
  email: string
  role: OrganizationRole
  invitedBy: string
  invitedAt: Date
  expiresAt: Date
  acceptedAt?: Date
  token: string
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
}

export interface AuditLog {
  id: string
  organizationId: string
  userId: string
  userName: string
  action: string
  resourceType: string
  resourceId?: string
  details: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: Date
}

export interface OrganizationAnalytics {
  organizationId: string
  period: {
    start: Date
    end: Date
  }
  metrics: {
    activeUsers: number
    projectsCreated: number
    workflowsExecuted: number
    pluginsInstalled: number
    agentsCreated: number
    apiRequests: number
    storageUsed: number
    collaborationEvents: number
  }
  trends: {
    userGrowth: { date: string; count: number }[]
    projectGrowth: { date: string; count: number }[]
    usageGrowth: { date: string; count: number }[]
  }
}

type EventCallback = (data: unknown) => void

/**
 * Advanced Team & Organization Service
 * 
 * Manages organizations, teams, members, permissions, and shared resources
 */
class TeamOrganizationService {
  private organizations: Map<string, Organization> = new Map()
  private members: Map<string, OrganizationMember> = new Map()
  private workspaces: Map<string, TeamWorkspace> = new Map()
  private projects: Map<string, OrganizationProject> = new Map()
  private invitations: Map<string, OrganizationInvitation> = new Map()
  private auditLogs: Map<string, AuditLog> = new Map()
  private listeners: Map<string, EventCallback[]> = new Map()

  constructor() {
    this.loadFromStorage()
  }

  /**
   * Create a new organization
   */
  async createOrganization(data: {
    name: string
    slug: string
    description?: string
    ownerId: string
    plan?: OrganizationPlan
  }): Promise<Organization> {
    const organization: Organization = {
      id: `org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      slug: data.slug,
      description: data.description,
      plan: data.plan || 'free',
      billing: {
        plan: data.plan || 'free',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      },
      settings: {
        allowPublicPlugins: false,
        allowPublicWorkflows: false,
        allowPublicAgents: false,
        requireApprovalForPublicResources: true,
        defaultMemberRole: 'member',
        ssoEnabled: false,
        dataRetentionDays: 90,
        auditLogRetentionDays: 365,
        mfaRequired: false
      },
      limits: this.getPlanLimits(data.plan || 'free'),
      usage: {
        members: 1,
        projects: 0,
        plugins: 0,
        workflows: 0,
        agents: 0,
        storageGB: 0,
        apiRequestsThisMonth: 0,
        concurrentExecutions: 0,
        teamWorkspaces: 0
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      ownerId: data.ownerId,
      memberCount: 1,
      projectCount: 0,
      verified: false,
      metadata: {}
    }
    
    this.organizations.set(organization.id, organization)
    
    // Add owner as member
    await this.addMember(organization.id, {
      userId: data.ownerId,
      role: 'owner'
    })
    
    this.saveToStorage()
    this.emit('organization-created', { organizationId: organization.id, organization })
    
    return organization
  }

  /**
   * Get organization by ID
   */
  getOrganization(organizationId: string): Organization | undefined {
    return this.organizations.get(organizationId)
  }

  /**
   * Get organization by slug
   */
  getOrganizationBySlug(slug: string): Organization | undefined {
    return Array.from(this.organizations.values()).find(org => org.slug === slug)
  }

  /**
   * Update organization
   */
  async updateOrganization(organizationId: string, updates: Partial<Organization>): Promise<Organization> {
    const org = this.organizations.get(organizationId)
    if (!org) throw new Error(`Organization ${organizationId} not found`)
    
    const updated = {
      ...org,
      ...updates,
      updatedAt: new Date()
    }
    
    this.organizations.set(organizationId, updated)
    this.saveToStorage()
    this.emit('organization-updated', { organizationId, organization: updated })
    
    return updated
  }

  /**
   * Add member to organization
   */
  async addMember(organizationId: string, data: {
    userId: string
    email: string
    name: string
    role: OrganizationRole
    invitedBy?: string
  }): Promise<OrganizationMember> {
    const org = this.organizations.get(organizationId)
    if (!org) throw new Error(`Organization ${organizationId} not found`)
    
    // Check limits
    if (org.usage.members >= org.limits.maxMembers) {
      throw new Error('Organization member limit reached')
    }
    
    const member: OrganizationMember = {
      id: `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      organizationId,
      userId: data.userId,
      email: data.email,
      name: data.name,
      role: data.role,
      permissions: this.getRolePermissions(data.role),
      joinedAt: new Date(),
      invitedBy: data.invitedBy,
      status: 'active',
      metadata: {}
    }
    
    this.members.set(member.id, member)
    org.usage.members++
    org.memberCount++
    
    this.saveToStorage()
    this.logAudit(organizationId, data.invitedBy || data.userId, 'member-added', {
      memberId: member.id,
      memberEmail: data.email,
      role: data.role
    })
    this.emit('member-added', { organizationId, member })
    
    return member
  }

  /**
   * Remove member from organization
   */
  async removeMember(organizationId: string, memberId: string, removedBy: string): Promise<void> {
    const member = this.members.get(memberId)
    if (!member || member.organizationId !== organizationId) {
      throw new Error(`Member ${memberId} not found`)
    }
    
    const org = this.organizations.get(organizationId)
    if (!org) throw new Error(`Organization ${organizationId} not found`)
    
    // Can't remove owner
    if (member.role === 'owner') {
      throw new Error('Cannot remove organization owner')
    }
    
    member.status = 'removed'
    org.usage.members--
    org.memberCount--
    
    this.saveToStorage()
    this.logAudit(organizationId, removedBy, 'member-removed', {
      memberId,
      memberEmail: member.email
    })
    this.emit('member-removed', { organizationId, memberId })
  }

  /**
   * Update member role
   */
  async updateMemberRole(organizationId: string, memberId: string, newRole: OrganizationRole, updatedBy: string): Promise<OrganizationMember> {
    const member = this.members.get(memberId)
    if (!member || member.organizationId !== organizationId) {
      throw new Error(`Member ${memberId} not found`)
    }
    
    const oldRole = member.role
    member.role = newRole
    member.permissions = this.getRolePermissions(newRole)
    
    this.saveToStorage()
    this.logAudit(organizationId, updatedBy, 'member-role-updated', {
      memberId,
      oldRole,
      newRole
    })
    this.emit('member-role-updated', { organizationId, memberId, oldRole, newRole })
    
    return member
  }

  /**
   * Create team workspace
   */
  async createWorkspace(organizationId: string, data: {
    name: string
    description?: string
    createdBy: string
  }): Promise<TeamWorkspace> {
    const org = this.organizations.get(organizationId)
    if (!org) throw new Error(`Organization ${organizationId} not found`)
    
    if (org.usage.teamWorkspaces >= org.limits.maxTeamWorkspaces) {
      throw new Error('Organization workspace limit reached')
    }
    
    const workspace: TeamWorkspace = {
      id: `workspace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      organizationId,
      name: data.name,
      description: data.description,
      members: [data.createdBy],
      projects: [],
      sharedResources: {
        plugins: [],
        workflows: [],
        agents: []
      },
      settings: {
        visibility: 'private',
        defaultPermissions: this.getRolePermissions('member')
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: data.createdBy
    }
    
    this.workspaces.set(workspace.id, workspace)
    org.usage.teamWorkspaces++
    
    this.saveToStorage()
    this.emit('workspace-created', { organizationId, workspace })
    
    return workspace
  }

  /**
   * Create organization project
   */
  async createProject(organizationId: string, data: {
    name: string
    description?: string
    workspaceId?: string
    createdBy: string
  }): Promise<OrganizationProject> {
    const org = this.organizations.get(organizationId)
    if (!org) throw new Error(`Organization ${organizationId} not found`)
    
    if (org.usage.projects >= org.limits.maxProjects) {
      throw new Error('Organization project limit reached')
    }
    
    const project: OrganizationProject = {
      id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      organizationId,
      workspaceId: data.workspaceId,
      name: data.name,
      description: data.description,
      visibility: 'private',
      members: [{
        userId: data.createdBy,
        role: 'owner',
        permissions: this.getRolePermissions('owner'),
        joinedAt: new Date()
      }],
      settings: {
        allowExternalCollaborators: false,
        requireApprovalForChanges: false,
        autoSave: true,
        versionControl: {
          enabled: false
        },
        notifications: {
          email: true
        }
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: data.createdBy
    }
    
    this.projects.set(project.id, project)
    org.usage.projects++
    org.projectCount++
    
    if (data.workspaceId) {
      const workspace = this.workspaces.get(data.workspaceId)
      if (workspace) {
        workspace.projects.push(project.id)
      }
    }
    
    this.saveToStorage()
    this.emit('project-created', { organizationId, project })
    
    return project
  }

  /**
   * Check if user has permission
   */
  hasPermission(organizationId: string, userId: string, permission: OrganizationPermission): boolean {
    const member = Array.from(this.members.values())
      .find(m => m.organizationId === organizationId && m.userId === userId && m.status === 'active')
    
    if (!member) return false
    
    return member.permissions.includes(permission) || member.role === 'owner'
  }

  /**
   * Get role permissions
   */
  private getRolePermissions(role: OrganizationRole): OrganizationPermission[] {
    const permissions: Record<OrganizationRole, OrganizationPermission[]> = {
      owner: [
        'manage-organization',
        'manage-members',
        'manage-billing',
        'manage-settings',
        'create-projects',
        'delete-projects',
        'share-resources',
        'install-plugins',
        'create-workflows',
        'execute-workflows',
        'create-agents',
        'manage-agents',
        'view-analytics',
        'view-audit-logs',
        'manage-api-keys',
        'export-data'
      ],
      admin: [
        'manage-members',
        'create-projects',
        'delete-projects',
        'share-resources',
        'install-plugins',
        'create-workflows',
        'execute-workflows',
        'create-agents',
        'manage-agents',
        'view-analytics',
        'view-audit-logs',
        'manage-api-keys'
      ],
      member: [
        'create-projects',
        'install-plugins',
        'create-workflows',
        'execute-workflows',
        'create-agents',
        'view-analytics'
      ],
      viewer: [
        'view-analytics'
      ],
      guest: []
    }
    
    return permissions[role] || []
  }

  /**
   * Get plan limits
   */
  private getPlanLimits(plan: OrganizationPlan): OrganizationLimits {
    const limits: Record<OrganizationPlan, OrganizationLimits> = {
      free: {
        maxMembers: 5,
        maxProjects: 3,
        maxPlugins: 10,
        maxWorkflows: 5,
        maxAgents: 3,
        maxStorageGB: 1,
        maxApiRequestsPerMonth: 1000,
        maxConcurrentExecutions: 1,
        maxTeamWorkspaces: 1
      },
      starter: {
        maxMembers: 25,
        maxProjects: 20,
        maxPlugins: 50,
        maxWorkflows: 25,
        maxAgents: 15,
        maxStorageGB: 10,
        maxApiRequestsPerMonth: 10000,
        maxConcurrentExecutions: 5,
        maxTeamWorkspaces: 5
      },
      professional: {
        maxMembers: 100,
        maxProjects: 100,
        maxPlugins: 200,
        maxWorkflows: 100,
        maxAgents: 50,
        maxStorageGB: 100,
        maxApiRequestsPerMonth: 100000,
        maxConcurrentExecutions: 20,
        maxTeamWorkspaces: 20
      },
      enterprise: {
        maxMembers: Infinity,
        maxProjects: Infinity,
        maxPlugins: Infinity,
        maxWorkflows: Infinity,
        maxAgents: Infinity,
        maxStorageGB: Infinity,
        maxApiRequestsPerMonth: Infinity,
        maxConcurrentExecutions: Infinity,
        maxTeamWorkspaces: Infinity
      },
      custom: {
        maxMembers: Infinity,
        maxProjects: Infinity,
        maxPlugins: Infinity,
        maxWorkflows: Infinity,
        maxAgents: Infinity,
        maxStorageGB: Infinity,
        maxApiRequestsPerMonth: Infinity,
        maxConcurrentExecutions: Infinity,
        maxTeamWorkspaces: Infinity
      }
    }
    
    return limits[plan]
  }

  /**
   * Log audit event
   */
  private logAudit(organizationId: string, userId: string, action: string, details: Record<string, any>): void {
    const log: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      organizationId,
      userId,
      userName: 'User', // Would fetch from user service
      action,
      resourceType: 'organization',
      details,
      timestamp: new Date()
    }
    
    this.auditLogs.set(log.id, log)
    
    // Keep only last 1000 logs per organization
    const orgLogs = Array.from(this.auditLogs.values())
      .filter(l => l.organizationId === organizationId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(1000)
    
    // Remove old logs
    const keepIds = new Set(orgLogs.map(l => l.id))
    this.auditLogs.forEach((log, id) => {
      if (log.organizationId === organizationId && !keepIds.has(id)) {
        this.auditLogs.delete(id)
      }
    })
    
    this.saveToStorage()
  }

  /**
   * Get audit logs
   */
  getAuditLogs(organizationId: string, limit: number = 100): AuditLog[] {
    return Array.from(this.auditLogs.values())
      .filter(l => l.organizationId === organizationId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  /**
   * Get organization members
   */
  getOrganizationMembers(organizationId: string): OrganizationMember[] {
    return Array.from(this.members.values())
      .filter(m => m.organizationId === organizationId && m.status === 'active')
  }

  /**
   * Get user's organizations
   */
  getUserOrganizations(userId: string): Organization[] {
    const memberIds = Array.from(this.members.values())
      .filter(m => m.userId === userId && m.status === 'active')
      .map(m => m.organizationId)
    
    return Array.from(this.organizations.values())
      .filter(org => memberIds.includes(org.id))
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

  /**
   * Persistence
   */
  private saveToStorage(): void {
    try {
      // Save organizations
      const orgsData = Array.from(this.organizations.entries()).map(([id, org]) => [
        id,
        {
          ...org,
          createdAt: org.createdAt.toISOString(),
          updatedAt: org.updatedAt.toISOString(),
          billing: {
            ...org.billing,
            currentPeriodStart: org.billing.currentPeriodStart.toISOString(),
            currentPeriodEnd: org.billing.currentPeriodEnd.toISOString()
          }
        }
      ])
      localStorage.setItem('bloop-organizations', JSON.stringify(orgsData))
      
      // Save members
      const membersData = Array.from(this.members.entries()).map(([id, member]) => [
        id,
        {
          ...member,
          joinedAt: member.joinedAt.toISOString(),
          lastActiveAt: member.lastActiveAt?.toISOString()
        }
      ])
      localStorage.setItem('bloop-organization-members', JSON.stringify(membersData))
    } catch (error) {
      console.warn('Failed to save organization data to localStorage:', error)
    }
  }

  private loadFromStorage(): void {
    try {
      const orgsData = localStorage.getItem('bloop-organizations')
      if (orgsData) {
        const entries = JSON.parse(orgsData)
        entries.forEach(([id, org]: [string, any]) => {
          this.organizations.set(id, {
            ...org,
            createdAt: new Date(org.createdAt),
            updatedAt: new Date(org.updatedAt),
            billing: {
              ...org.billing,
              currentPeriodStart: new Date(org.billing.currentPeriodStart),
              currentPeriodEnd: new Date(org.billing.currentPeriodEnd)
            }
          })
        })
      }
      
      const membersData = localStorage.getItem('bloop-organization-members')
      if (membersData) {
        const entries = JSON.parse(membersData)
        entries.forEach(([id, member]: [string, any]) => {
          this.members.set(id, {
            ...member,
            joinedAt: new Date(member.joinedAt),
            lastActiveAt: member.lastActiveAt ? new Date(member.lastActiveAt) : undefined
          })
        })
      }
    } catch (error) {
      console.warn('Failed to load organization data from localStorage:', error)
    }
  }
}

export const teamOrganizationService = new TeamOrganizationService()
