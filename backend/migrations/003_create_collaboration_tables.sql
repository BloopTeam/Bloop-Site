-- Database schema for Real-Time Collaboration (Phase 4)
-- Run with: sqlx migrate run

-- Collaboration sessions table
CREATE TABLE IF NOT EXISTS collaboration_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL,
    project_path VARCHAR(500) NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}',
    is_public BOOLEAN NOT NULL DEFAULT false,
    share_token VARCHAR(255) UNIQUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Collaboration participants table
CREATE TABLE IF NOT EXISTS collaboration_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
    user_id UUID,
    agent_id UUID,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cursor_position JSONB,
    active_file VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'online',
    CONSTRAINT valid_role CHECK (role IN ('owner', 'editor', 'viewer', 'agent')),
    CONSTRAINT valid_status CHECK (status IN ('online', 'away', 'idle')),
    CONSTRAINT has_identity CHECK (user_id IS NOT NULL OR agent_id IS NOT NULL)
);

-- Collaboration edits table (for Operational Transform)
CREATE TABLE IF NOT EXISTS collaboration_edits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES collaboration_participants(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    edit_type VARCHAR(20) NOT NULL,
    position INTEGER NOT NULL,
    length INTEGER NOT NULL DEFAULT 0,
    content TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    parent_version INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_edit_type CHECK (edit_type IN ('insert', 'delete', 'replace'))
);

-- Collaboration conflicts table
CREATE TABLE IF NOT EXISTS collaboration_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    conflict_type VARCHAR(50) NOT NULL,
    conflict_data JSONB NOT NULL,
    resolution_strategy VARCHAR(50),
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMPTZ,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_conflict_type CHECK (conflict_type IN ('simultaneous_edit', 'concurrent_modification', 'dependency_conflict'))
);

-- Collaboration presence snapshots (for analytics)
CREATE TABLE IF NOT EXISTS collaboration_presence_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES collaboration_participants(id) ON DELETE CASCADE,
    cursor_position JSONB,
    active_file VARCHAR(500),
    status VARCHAR(20) NOT NULL,
    snapshot_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_owner ON collaboration_sessions(owner_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_share_token ON collaboration_sessions(share_token);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_created ON collaboration_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collaboration_participants_session ON collaboration_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_participants_user ON collaboration_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_participants_agent ON collaboration_participants(agent_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_edits_session ON collaboration_edits(session_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_edits_file ON collaboration_edits(file_path);
CREATE INDEX IF NOT EXISTS idx_collaboration_edits_version ON collaboration_edits(session_id, file_path, version);
CREATE INDEX IF NOT EXISTS idx_collaboration_conflicts_session ON collaboration_conflicts(session_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_conflicts_resolved ON collaboration_conflicts(resolved);
CREATE INDEX IF NOT EXISTS idx_collaboration_presence_session ON collaboration_presence_snapshots(session_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_presence_time ON collaboration_presence_snapshots(snapshot_time DESC);

-- Update triggers
CREATE TRIGGER update_collaboration_sessions_updated_at BEFORE UPDATE ON collaboration_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collaboration_participants_updated_at BEFORE UPDATE ON collaboration_participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
