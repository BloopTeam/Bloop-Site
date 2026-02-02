-- Company state persistence tables
-- Run with: sqlx migrate run

-- Company members table
CREATE TABLE IF NOT EXISTS company_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL,
    team VARCHAR(100) NOT NULL,
    skills TEXT[] NOT NULL DEFAULT '{}',
    performance_score DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    tasks_completed BIGINT NOT NULL DEFAULT 0,
    tasks_failed BIGINT NOT NULL DEFAULT 0,
    average_task_time_ms BIGINT NOT NULL DEFAULT 0,
    last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    openclaw_id VARCHAR(255),
    moltbook_id VARCHAR(255),
    agent_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_role CHECK (role IN ('ceo', 'cto', 'product_manager', 'backend_engineer', 'frontend_engineer', 'devops_engineer', 'qa_engineer', 'ui_designer', 'ux_designer', 'visual_designer', 'content_creator', 'documentation_specialist', 'customer_support'))
);

-- Company teams table
CREATE TABLE IF NOT EXISTS company_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    members TEXT[] NOT NULL DEFAULT '{}',
    lead VARCHAR(255),
    capacity INTEGER NOT NULL DEFAULT 10,
    current_load INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Visual creative requests table
CREATE TABLE IF NOT EXISTS visual_creative_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(255) NOT NULL UNIQUE,
    request_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    requirements JSONB NOT NULL DEFAULT '{}',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    assigned_agent VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT valid_type CHECK (request_type IN ('image_generation', 'ui_mockup', 'icon_design', 'logo_design', 'illustration', 'banner_design', 'asset_optimization')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'review', 'completed', 'failed'))
);

-- Collaboration requests table
CREATE TABLE IF NOT EXISTS collaboration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaboration_id VARCHAR(255) NOT NULL UNIQUE,
    from_agent VARCHAR(255) NOT NULL,
    to_agents TEXT[] NOT NULL DEFAULT '{}',
    task TEXT NOT NULL,
    context JSONB NOT NULL DEFAULT '{}',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'completed', 'failed'))
);

-- Company metrics snapshot table
CREATE TABLE IF NOT EXISTS company_metrics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_agents INTEGER NOT NULL,
    active_agents INTEGER NOT NULL,
    total_tasks_completed BIGINT NOT NULL,
    total_tasks_failed BIGINT NOT NULL,
    success_rate DECIMAL(5,4) NOT NULL,
    average_task_time_ms BIGINT NOT NULL,
    total_tokens_used BIGINT NOT NULL,
    uptime_seconds BIGINT NOT NULL,
    visual_creatives_completed BIGINT NOT NULL DEFAULT 0,
    collaborations_count BIGINT NOT NULL DEFAULT 0,
    snapshot_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_company_members_role ON company_members(role);
CREATE INDEX IF NOT EXISTS idx_company_members_team ON company_members(team);
CREATE INDEX IF NOT EXISTS idx_company_members_active ON company_members(is_active);
CREATE INDEX IF NOT EXISTS idx_visual_creatives_status ON visual_creative_requests(status);
CREATE INDEX IF NOT EXISTS idx_visual_creatives_type ON visual_creative_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_collaborations_status ON collaboration_requests(status);
CREATE INDEX IF NOT EXISTS idx_metrics_snapshot_time ON company_metrics_snapshots(snapshot_time DESC);

-- Update triggers
CREATE TRIGGER update_company_members_updated_at BEFORE UPDATE ON company_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_teams_updated_at BEFORE UPDATE ON company_teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
