# Phase 4: Real-Time Collaboration

## Overview
Phase 4 brings **shared context** - users and agents operate inside the same live environment instead of isolated sessions. Everyone sees the same state as it evolves in real-time.

## Core Features

### 1. Real-Time Synchronization
- **WebSocket Infrastructure**: Bidirectional real-time communication
- **State Synchronization**: File changes, cursor positions, selections sync instantly
- **Event Broadcasting**: All changes broadcast to all participants
- **Delta Updates**: Only send changes, not full state
- **Connection Management**: Auto-reconnect, connection state tracking
- **Message Queue**: Queue messages when disconnected, replay on reconnect

### 2. Shared Project Sessions
- **Session Management**: Create, join, leave, and manage shared sessions
- **Session Persistence**: Store session state in PostgreSQL
- **Session Metadata**: Track participants, permissions, settings
- **Session History**: Log all session events for audit
- **Session Recovery**: Restore sessions after disconnection
- **Multi-Session Support**: Users can be in multiple sessions simultaneously

### 3. Live Agent Activity Updates
- **Agent Presence**: Show which agents are active in the session
- **Agent Actions**: Real-time updates when agents make changes
- **Agent Status**: Show what agents are working on (editing, reviewing, testing)
- **Agent Communication**: Agents can communicate with users in real-time
- **Agent Collaboration**: Multiple agents can work together in same session
- **Agent Activity Feed**: Timeline of agent actions and decisions

### 4. Presence Indicators
- **User Presence**: Show who's online, who's viewing what file
- **Cursor Tracking**: See other users' cursors in real-time
- **Selection Highlighting**: Highlight other users' selections
- **Active File Indicators**: Show which files users are viewing/editing
- **Typing Indicators**: Show when users are typing
- **Away/Idle Status**: Track user activity status

### 5. Conflict Handling for Simultaneous Edits
- **Operational Transforms (OT)**: Transform operations to resolve conflicts
- **CRDT Support**: Conflict-free replicated data types for complex merges
- **Conflict Detection**: Detect when multiple users edit same region
- **Conflict Resolution UI**: Visual conflict resolution interface
- **Automatic Merging**: Auto-merge non-conflicting changes
- **Manual Resolution**: User-guided conflict resolution
- **Version History**: Track all versions for conflict analysis
- **Lock Mechanism**: Optional file locking for critical sections

### 6. Session Links for Collaboration
- **Shareable Links**: Generate secure links to join sessions
- **Access Control**: Read-only, edit, admin permissions
- **Link Expiration**: Time-limited or permanent links
- **Password Protection**: Optional password for session access
- **Invite System**: Invite specific users/agents via email/ID
- **Session Discovery**: Browse and discover public sessions
- **Session Templates**: Pre-configured session templates

---

## Integration with Phase 2 & 3 Features

### Security Integration (Phase 2)
- **Collaboration Audit Logging**: Log all collaboration events (joins, leaves, edits)
- **Access Control**: Role-based permissions (owner, editor, viewer, agent)
- **Session Encryption**: Encrypt session data in transit and at rest
- **Rate Limiting**: Prevent abuse of collaboration features
- **Threat Detection**: Monitor for suspicious collaboration patterns
- **Input Validation**: Validate all collaborative edits for security
- **Vulnerability Scanning**: Scan shared code in real-time

### Database Integration (Phase 2)
- **Session Storage**: PostgreSQL tables for sessions, participants, events
- **State Persistence**: Persist session state for recovery
- **History Tracking**: Store all edits and changes
- **Analytics**: Track collaboration metrics and usage
- **Connection Pooling**: Efficient database access for real-time updates

### Autonomous Agent Company Integration (Phase 3)
- **Agent Participation**: Agents can join sessions as participants
- **Agent Visibility**: Users see agent activity in real-time
- **Agent Collaboration**: Multiple agents work together in sessions
- **Agent Communication**: Agents communicate with users and other agents
- **Agent Task Assignment**: Assign tasks to agents within sessions
- **Agent Status Updates**: Real-time updates when agents complete tasks
- **Agent Company Integration**: Company orchestrator manages agent participation

### Code Intelligence Integration (Phase 3)
- **Shared Symbol Index**: All participants see same symbol index
- **Live Reference Updates**: Reference tracking updates in real-time
- **Shared Dependency Graph**: All participants see same dependencies
- **Live Pattern Detection**: Pattern detection results shared instantly
- **Collaborative Code Review**: Multiple users review code together
- **Shared Semantic Search**: Search results visible to all participants
- **Live Impact Analysis**: Show impact of changes to all participants

### OpenClaw Integration (Phase 3)
- **Agent Communication**: Use OpenClaw for agent-to-agent communication in sessions
- **Skill Execution**: Agents execute skills visible to all participants
- **Browser Control Sharing**: Share browser control sessions
- **Multi-Agent Coordination**: Coordinate multiple agents via OpenClaw

### Moltbook Integration (Phase 3)
- **Session Sharing**: Share sessions on Moltbook
- **Collaboration Posts**: Post collaboration highlights to Moltbook
- **Skill Discovery**: Discover collaboration skills from Moltbook
- **Agent Social Network**: Agents share collaboration experiences

### Visual Creative Integration (Phase 3)
- **Shared Visual Assets**: All participants see generated images/mockups
- **Live Design Updates**: Design changes visible in real-time
- **Collaborative Design**: Multiple users/agents design together
- **Asset Versioning**: Track visual asset versions in sessions

---

## Technical Architecture

**Rust-First Implementation (75%+ Rust)**
- All collaboration services built in Rust following existing patterns
- Uses same architecture as Phase 2 & 3 services
- Compatible with existing `Arc<RwLock<T>>` patterns
- Integrates with existing database, security, and agent systems
- Uses `tokio-tungstenite` for WebSockets (already in dependencies)

### Backend Components (Rust)

**Module Structure**: `backend/src/services/collaboration/mod.rs`
```rust
pub mod websocket;
pub mod session;
pub mod conflict;
pub mod presence;
pub mod agent;
pub mod codeintel;

pub use websocket::CollaborationWebSocket;
pub use session::SessionManager;
pub use conflict::ConflictResolver;
pub use presence::PresenceTracker;
pub use agent::AgentCollaborator;
pub use codeintel::CodeIntelligenceSync;
```

#### 1. WebSocket Server (`backend/src/services/collaboration/websocket.rs`)
- **Pattern**: Follows `backend/src/services/integrations/openclaw_ws.rs` pattern
- **Structure**: Uses `Arc<Self>` like existing services
- **Connection Manager**: `Arc<RwLock<HashMap<Uuid, WebSocketConnection>>>`
- **Message Router**: Uses `axum::extract::ws::Message` (already in dependencies)
- **State Synchronizer**: Uses `Arc<RwLock<SessionState>>` pattern
- **Event Broadcaster**: Uses `tokio::sync::broadcast::Sender` (built-in)
- **Integration**: Uses existing `database::Database` for persistence
- **Error Handling**: Uses `anyhow::Result` like existing services

#### 2. Session Manager (`backend/src/services/collaboration/session.rs`)
- **Pattern**: Follows `backend/src/services/company/orchestrator.rs` structure
- **Structure**: 
  ```rust
  pub struct SessionManager {
      database: Option<Arc<database::Database>>,
      sessions: Arc<RwLock<HashMap<Uuid, Session>>>,
      audit_logger: Arc<security::AuditLogger>,
  }
  ```
- **Session Creation**: Uses `sqlx::query_as!` like existing database code
- **Session Joining**: Integrates with existing `security::AuditLogger::log()`
- **Session State**: Uses `Arc<RwLock<SessionState>>` for shared state
- **Session Cleanup**: Uses existing database connection pooling
- **Session Recovery**: Uses existing PostgreSQL persistence patterns
- **Types**: Uses `chrono::DateTime<Utc>` and `uuid::Uuid` like existing code

#### 3. Conflict Resolver (`backend/src/services/collaboration/conflict.rs`)
- **Pattern**: Pure Rust implementation, no external OT libraries initially
- **Operational Transforms**: Custom Rust implementation using existing patterns
- **CRDT Support**: Optional Rust CRDT library integration
- **Conflict Detection**: Uses existing `services::codebase` for code analysis
- **Merge Strategies**: Leverages existing code intelligence features
- **Integration**: Uses `CodebaseIndexer` from Phase 3 for conflict analysis

#### 4. Presence Tracker (`backend/src/services/collaboration/presence.rs`)
- **Pattern**: Uses `Arc<RwLock<HashMap>>` like existing services
- **User Presence**: Stores in memory with Redis cache (already configured)
- **Cursor Tracking**: Lightweight structs, broadcast via channels
- **Selection Tracking**: Uses existing `Location` struct from codebase
- **File Tracking**: Integrates with existing `CodebaseIndexer`
- **Activity Monitoring**: Uses existing `security::AuditLogger`

#### 5. Agent Collaborator (`backend/src/services/collaboration/agent.rs`)
- **Pattern**: Extends `backend/src/services/company/collaboration.rs`
- **Structure**:
  ```rust
  pub struct AgentCollaborator {
      agent_manager: Arc<services::agent::AgentManager>,
      company_orchestrator: Arc<services::company::CompanyOrchestrator>,
      openclaw_client: Option<Arc<services::integrations::OpenClawWebSocketClient>>,
  }
  ```
- **Agent Integration**: Uses existing `AgentManager` from Phase 2 (no changes)
- **Agent Activity Tracking**: Integrates with `CompanyOrchestrator` (extends existing)
- **Agent Communication**: Uses existing `OpenClawWebSocketClient` (reuse, don't duplicate)
- **Agent Status Updates**: Extends existing agent status system
- **Agent Task Management**: Uses existing task queue from Phase 2
- **No Duplication**: All agent logic reused from existing modules

#### 6. Code Intelligence Sync (`backend/src/services/collaboration/codeintel.rs`)
- **Pattern**: Wraps existing `services::codebase` modules
- **Symbol Sync**: Uses existing `CodebaseIndexer` and `SymbolExtractor`
- **Reference Sync**: Uses existing `ReferenceTracker`
- **Dependency Sync**: Uses existing `DependencyAnalyzer`
- **Pattern Sync**: Uses existing `PatternDetector`
- **Search Sync**: Uses existing `SemanticSearch`
- **No Duplication**: All code intelligence logic reused from Phase 3

### Database Schema

**Migration File**: `backend/migrations/003_create_collaboration_tables.sql`

**Uses Existing Patterns**:
- Follows same migration pattern as `002_create_company_tables.sql`
- Uses `sqlx` migrations (already configured)
- Uses `chrono::DateTime<Utc>` for timestamps (like existing tables)
- Uses `uuid::Uuid` for IDs (like existing tables)
- Uses `serde_json::Value` for JSONB (like existing company tables)

```sql
-- Sessions table (compatible with existing schema)
CREATE TABLE collaboration_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL,
    project_path TEXT NOT NULL,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_public BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255),
    -- Audit fields (like existing tables)
    created_by UUID,
    updated_by UUID
);

-- Session participants (references existing patterns)
CREATE TABLE session_participants (
    session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
    user_id UUID,
    agent_id UUID,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'editor', 'viewer', 'agent')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cursor_position JSONB,
    active_file TEXT,
    status VARCHAR(50) DEFAULT 'online' CHECK (status IN ('online', 'away', 'idle')),
    -- Ensure either user_id or agent_id is set
    CHECK ((user_id IS NOT NULL AND agent_id IS NULL) OR (user_id IS NULL AND agent_id IS NOT NULL)),
    PRIMARY KEY (session_id, COALESCE(user_id, agent_id))
);

-- Session events (for history and recovery)
CREATE TABLE session_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
    user_id UUID,
    agent_id UUID,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Index for fast queries
    CHECK ((user_id IS NOT NULL AND agent_id IS NULL) OR (user_id IS NULL AND agent_id IS NOT NULL))
);

-- File locks (for conflict prevention)
CREATE TABLE file_locks (
    session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    user_id UUID,
    agent_id UUID,
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (session_id, file_path),
    CHECK ((user_id IS NOT NULL AND agent_id IS NULL) OR (user_id IS NULL AND agent_id IS NOT NULL))
);

-- Conflict resolutions (uses existing audit patterns)
CREATE TABLE conflict_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    conflict_data JSONB NOT NULL,
    resolution_strategy VARCHAR(50) NOT NULL,
    resolved_by UUID NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance (following existing patterns)
CREATE INDEX idx_session_participants_session ON session_participants(session_id);
CREATE INDEX idx_session_participants_user ON session_participants(user_id);
CREATE INDEX idx_session_participants_agent ON session_participants(agent_id);
CREATE INDEX idx_session_events_session ON session_events(session_id, timestamp);
CREATE INDEX idx_file_locks_session ON file_locks(session_id);
CREATE INDEX idx_conflict_resolutions_session ON conflict_resolutions(session_id, file_path);
```

### Frontend Components

#### 1. Collaboration Provider (`src/components/CollaborationProvider.tsx`)
- **WebSocket Connection**: Manage WebSocket connection
- **State Management**: Manage collaboration state
- **Event Handlers**: Handle collaboration events
- **Reconnection Logic**: Auto-reconnect on disconnect

#### 2. Session Manager UI (`src/components/SessionManager.tsx`)
- **Create Session**: Create new collaboration session
- **Join Session**: Join existing session via link
- **Session List**: List active sessions
- **Session Settings**: Configure session settings
- **Leave Session**: Leave current session

#### 3. Presence Panel (`src/components/PresencePanel.tsx`)
- **User List**: Show all participants
- **Presence Indicators**: Show online/away/idle status
- **Active Files**: Show what files users are viewing
- **Cursors**: Show other users' cursors
- **Selections**: Highlight other users' selections

#### 4. Agent Activity Panel (`src/components/AgentActivityPanel.tsx`)
- **Agent List**: Show active agents in session
- **Agent Status**: Show what agents are doing
- **Agent Actions**: Show recent agent actions
- **Agent Communication**: Chat with agents
- **Agent Controls**: Control agent behavior

#### 5. Conflict Resolution UI (`src/components/ConflictResolver.tsx`)
- **Conflict Display**: Show conflicts visually
- **Resolution Options**: Present resolution options
- **Merge Preview**: Preview merged result
- **Manual Editing**: Manual conflict resolution
- **Accept/Reject**: Accept or reject resolutions

#### 6. Collaboration Status Bar (`src/components/CollaborationStatusBar.tsx`)
- **Session Info**: Show current session info
- **Participant Count**: Show number of participants
- **Connection Status**: Show connection status
- **Quick Actions**: Quick access to collaboration features

---

## API Endpoints

**Route File**: `backend/src/api/routes/collaboration.rs`
**Pattern**: Follows existing route patterns from `backend/src/api/routes/`

### Session Management (REST API)
- `POST /api/v1/collaboration/sessions` - Create session
- `GET /api/v1/collaboration/sessions` - List sessions
- `GET /api/v1/collaboration/sessions/:id` - Get session details
- `POST /api/v1/collaboration/sessions/:id/join` - Join session
- `POST /api/v1/collaboration/sessions/:id/leave` - Leave session
- `DELETE /api/v1/collaboration/sessions/:id` - Delete session
- `POST /api/v1/collaboration/sessions/:id/invite` - Invite users
- `GET /api/v1/collaboration/sessions/:id/participants` - Get participants
- `GET /api/v1/collaboration/sessions/:id/history` - Get session history

**Implementation Pattern**:
```rust
// Follows existing route handler patterns
pub async fn create_session(
    Extension(session_manager): Extension<Arc<SessionManager>>,
    Extension(audit_logger): Extension<Arc<security::AuditLogger>>,
    Json(request): Json<CreateSessionRequest>,
) -> Result<Json<SessionResponse>, StatusCode>
```

### WebSocket Endpoint
- `WS /api/v1/collaboration/ws/:session_id` - WebSocket connection

**Implementation Pattern**:
```rust
// Uses existing axum WebSocket patterns
pub async fn collaboration_websocket_handler(
    ws: WebSocketUpgrade,
    Path(session_id): Path<Uuid>,
    Extension(websocket_server): Extension<Arc<CollaborationWebSocket>>,
) -> Response
```

### WebSocket Events
- `session:join` - User/agent joined session
- `session:leave` - User/agent left session
- `file:open` - File opened
- `file:close` - File closed
- `file:edit` - File edited
- `cursor:move` - Cursor moved
- `selection:change` - Selection changed
- `agent:action` - Agent performed action
- `agent:status` - Agent status changed
- `conflict:detected` - Conflict detected
- `conflict:resolved` - Conflict resolved
- `codeintel:update` - Code intelligence updated
- `presence:update` - Presence updated

---

## Security Considerations

### Access Control
- **Role-Based Permissions**: Owner, editor, viewer, agent roles
- **File-Level Permissions**: Per-file read/write permissions
- **Session-Level Permissions**: Session-wide permissions
- **Agent Permissions**: Control what agents can do

### Data Protection
- **Session Encryption**: Encrypt session data
- **Message Encryption**: Encrypt WebSocket messages
- **Access Logging**: Log all access attempts
- **Audit Trail**: Complete audit trail of all actions

### Rate Limiting
- **Message Rate Limits**: Limit messages per second
- **Connection Limits**: Limit concurrent connections
- **Session Limits**: Limit sessions per user
- **Edit Rate Limits**: Limit edits per second

### Threat Detection
- **Suspicious Activity**: Detect suspicious collaboration patterns
- **Abuse Prevention**: Prevent session abuse
- **Malicious Edits**: Detect potentially malicious edits
- **Agent Misbehavior**: Detect agent misbehavior

---

## Performance Optimizations

### Caching
- **Session State Cache**: Cache session state in Redis
- **Presence Cache**: Cache presence data
- **Code Intelligence Cache**: Cache code intelligence results
- **Message Queue**: Queue messages for batch processing

### Optimization Strategies
- **Delta Compression**: Only send changes, not full state
- **Debouncing**: Debounce frequent updates
- **Throttling**: Throttle high-frequency events
- **Batching**: Batch multiple updates together
- **Lazy Loading**: Load session data on demand

### Scalability
- **Horizontal Scaling**: Scale WebSocket servers horizontally
- **Load Balancing**: Load balance WebSocket connections
- **Session Sharding**: Shard sessions across servers
- **Database Sharding**: Shard session data across databases

---

## Testing Requirements

### Unit Tests
- **Conflict Resolution**: Test conflict resolution algorithms
- **State Synchronization**: Test state sync logic
- **Presence Tracking**: Test presence tracking
- **Session Management**: Test session management

### Integration Tests
- **WebSocket Communication**: Test WebSocket events
- **Database Integration**: Test database operations
- **Agent Integration**: Test agent participation
- **Code Intelligence Integration**: Test code intelligence sync

### End-to-End Tests
- **Multi-User Sessions**: Test multiple users in session
- **Agent Participation**: Test agent participation
- **Conflict Resolution**: Test conflict resolution flow
- **Session Recovery**: Test session recovery

### Performance Tests
- **Concurrent Users**: Test with many concurrent users
- **Message Throughput**: Test message throughput
- **State Sync Performance**: Test state sync performance
- **Database Performance**: Test database performance

---

## Implementation Phases

### Phase 4.1: Foundation (Rust-First)
- [ ] Create `backend/src/services/collaboration/mod.rs` following existing patterns
- [ ] WebSocket server using `tokio-tungstenite` (already in dependencies)
- [ ] Basic session management using existing `database::Database`
- [ ] Database migration `003_create_collaboration_tables.sql` (follows existing pattern)
- [ ] Basic presence tracking using `Arc<RwLock<HashMap>>` pattern
- [ ] Simple state synchronization using existing `tokio::sync::broadcast`
- [ ] Integration with existing `security::AuditLogger` for all events

### Phase 4.2: Core Collaboration
- [ ] Real-time file editing sync
- [ ] Cursor and selection tracking
- [ ] Presence indicators
- [ ] Session links and sharing
- [ ] Basic conflict detection

### Phase 4.3: Conflict Resolution
- [ ] Operational transforms implementation
- [ ] CRDT support
- [ ] Conflict resolution UI
- [ ] Automatic merging
- [ ] Manual resolution tools

### Phase 4.4: Agent Integration (Extend Existing)
- [ ] Extend `services::company::collaboration.rs` (don't duplicate)
- [ ] Agent participation using existing `AgentManager` (no changes to Phase 2)
- [ ] Agent activity tracking via `CompanyOrchestrator` (extend existing)
- [ ] Agent communication using existing `OpenClawWebSocketClient` (reuse)
- [ ] Agent status updates extending existing status system
- [ ] Agent company integration - extend `CompanyOrchestrator`, don't modify core

### Phase 4.5: Code Intelligence Sync (Reuse Phase 3)
- [ ] Wrap existing `CodebaseIndexer` for sync (don't duplicate logic)
- [ ] Symbol index sync using existing `SymbolExtractor` (reuse)
- [ ] Reference tracking sync using existing `ReferenceTracker` (reuse)
- [ ] Dependency graph sync using existing `DependencyAnalyzer` (reuse)
- [ ] Pattern detection sync using existing `PatternDetector` (reuse)
- [ ] Search result sharing using existing `SemanticSearch` (reuse)
- **No new code intelligence features** - only sync existing Phase 3 features

### Phase 4.6: Advanced Features
- [ ] Session history and recovery
- [ ] Advanced conflict resolution
- [ ] Performance optimizations
- [ ] Security hardening
- [ ] Analytics and monitoring

---

## Success Criteria

1. ✅ Multiple users can edit same file simultaneously
2. ✅ Conflicts are detected and resolved automatically or manually
3. ✅ Agents can participate in sessions
4. ✅ Presence indicators show real-time user/agent activity
5. ✅ Code intelligence is synchronized across participants
6. ✅ Sessions are secure and access-controlled
7. ✅ Performance handles 100+ concurrent users per session
8. ✅ All Phase 2 & 3 features work in collaborative mode
9. ✅ Session recovery works after disconnection
10. ✅ Complete audit trail of all collaboration events

---

## Timeline

- **Week 1-2**: Foundation (WebSocket, sessions, database)
- **Week 3-4**: Core collaboration (editing sync, presence)
- **Week 5-6**: Conflict resolution (OT, CRDT, UI)
- **Week 7-8**: Agent integration (agent participation, activity)
- **Week 9-10**: Code intelligence sync (symbols, references, patterns)
- **Week 11-12**: Advanced features (history, recovery, optimization)
- **Week 13-14**: Testing, security hardening, documentation

---

## Dependencies

### Existing Dependencies (Already in Cargo.toml)
- **WebSocket**: `tokio-tungstenite = "0.21"` ✅ Already added
- **Database**: `sqlx = "0.7"` ✅ Already configured
- **Async Runtime**: `tokum = "1"` ✅ Already configured
- **Channels**: `tokio::sync::broadcast` ✅ Built-in
- **UUID**: `uuid = "1.6"` ✅ Already added
- **Chrono**: `chrono = "0.4"` ✅ Already added
- **Serde JSON**: `serde_json = "1.0"` ✅ Already added
- **Redis**: `redis = "0.24"` ✅ Already configured

### No New Dependencies Required
- **OT/CRDT**: Custom Rust implementation initially (no external libraries)
- **All other dependencies**: Already available from Phase 2 & 3

### Integration with Existing Modules
- **Security**: `backend/src/security/` - Use existing modules
- **Database**: `backend/src/database.rs` - Use existing `Database` struct
- **Agent Manager**: `backend/src/services/agent/` - Use existing `AgentManager`
- **Company Orchestrator**: `backend/src/services/company/` - Extend existing
- **Code Intelligence**: `backend/src/services/codebase/` - Reuse all modules
- **OpenClaw**: `backend/src/services/integrations/openclaw_ws.rs` - Extend existing
- **Moltbook**: `backend/src/services/integrations/moltbook_api.rs` - Extend existing

---

## Integration with Main Application

**File**: `backend/src/main.rs`

**Initialization Pattern** (follows existing structure):
```rust
// Initialize collaboration services (after Phase 2 & 3 services)
let session_manager = Arc::new(SessionManager::new(
    database.clone(),
    Arc::clone(&audit_logger),
));
let collaboration_websocket = Arc::new(CollaborationWebSocket::new(
    Arc::clone(&session_manager),
    Arc::clone(&agent_manager),
    Arc::clone(&codebase_indexer),
));

// Add to router layers
.layer(Extension(session_manager))
.layer(Extension(collaboration_websocket))
```

**Route Registration** (follows existing pattern):
```rust
// In create_app() function
.route("/api/v1/collaboration/ws/:session_id", 
    get(api::routes::collaboration::collaboration_websocket_handler))
.route("/api/v1/collaboration/sessions", 
    post(api::routes::collaboration::create_session))
// ... other routes
```

**Module Registration**:
```rust
// In backend/src/api/routes/mod.rs
pub mod collaboration;
```

## Compatibility Guarantees

### No Breaking Changes
- ✅ All Phase 2 services remain unchanged
- ✅ All Phase 3 services remain unchanged
- ✅ Only additions, no modifications to existing code
- ✅ Existing APIs continue to work
- ✅ Existing agent system continues to work
- ✅ Existing code intelligence continues to work

### Extension Points
- Collaboration services extend existing services
- Use existing interfaces and patterns
- Reuse existing database connections
- Reuse existing security modules
- Reuse existing agent infrastructure
- Reuse existing code intelligence modules

### Code Reuse
- **100% reuse** of Phase 2 security modules
- **100% reuse** of Phase 3 code intelligence modules
- **100% reuse** of Phase 3 agent company modules
- **Extend, don't duplicate** existing functionality

## Status: Planning Complete

Phase 4 plan is complete and ready for implementation. 
- ✅ All code will be Rust (75%+ architecture maintained)
- ✅ Compatible with existing Phase 2 & 3 code
- ✅ No breaking changes to existing systems
- ✅ Reuses all existing modules and patterns
- ✅ Follows existing code structure and conventions
