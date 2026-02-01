-- Database schema for OpenClaw and Moltbook integrations
-- Run with: sqlx migrate run

-- OpenClaw sessions table
CREATE TABLE IF NOT EXISTS openclaw_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL UNIQUE,
    channel VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    model VARCHAR(100),
    thinking_level VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB,
    CONSTRAINT valid_channel CHECK (channel IN ('whatsapp', 'telegram', 'slack', 'discord', 'webchat', 'signal', 'imessage', 'teams', 'main')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'idle', 'paused'))
);

-- OpenClaw skills table
CREATE TABLE IF NOT EXISTS openclaw_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    skill_type VARCHAR(50) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    capabilities TEXT[] NOT NULL DEFAULT '{}',
    version VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_skill_type CHECK (skill_type IN ('bundled', 'managed', 'workspace'))
);

-- OpenClaw skill executions (audit log)
CREATE TABLE IF NOT EXISTS openclaw_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_name VARCHAR(255) NOT NULL,
    session_id UUID REFERENCES openclaw_sessions(id) ON DELETE SET NULL,
    success BOOLEAN NOT NULL,
    output TEXT,
    error TEXT,
    duration_ms INTEGER,
    params JSONB,
    context JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_skill FOREIGN KEY (skill_name) REFERENCES openclaw_skills(name) ON DELETE RESTRICT
);

-- Moltbook agents table
CREATE TABLE IF NOT EXISTS moltbook_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url TEXT,
    karma INTEGER NOT NULL DEFAULT 0,
    verified BOOLEAN NOT NULL DEFAULT false,
    capabilities TEXT[] NOT NULL DEFAULT '{}',
    submolts TEXT[] NOT NULL DEFAULT '{}',
    auth_token_hash VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Moltbook posts table
CREATE TABLE IF NOT EXISTS moltbook_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id VARCHAR(255) NOT NULL UNIQUE,
    author_id UUID NOT NULL REFERENCES moltbook_agents(id) ON DELETE CASCADE,
    submolt VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL DEFAULT 'text',
    language VARCHAR(50),
    karma INTEGER NOT NULL DEFAULT 0,
    upvotes INTEGER NOT NULL DEFAULT 0,
    downvotes INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    tags TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_content_type CHECK (content_type IN ('text', 'code', 'skill', 'link'))
);

-- Moltbook skills table
CREATE TABLE IF NOT EXISTS moltbook_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES moltbook_agents(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    downloads INTEGER NOT NULL DEFAULT 0,
    rating DECIMAL(3,2) NOT NULL DEFAULT 0.0,
    rating_count INTEGER NOT NULL DEFAULT 0,
    skill_md TEXT NOT NULL,
    repository_url TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_rating CHECK (rating >= 0.0 AND rating <= 5.0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_openclaw_sessions_status ON openclaw_sessions(status);
CREATE INDEX IF NOT EXISTS idx_openclaw_sessions_channel ON openclaw_sessions(channel);
CREATE INDEX IF NOT EXISTS idx_openclaw_executions_skill ON openclaw_executions(skill_name);
CREATE INDEX IF NOT EXISTS idx_openclaw_executions_created ON openclaw_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moltbook_agents_username ON moltbook_agents(username);
CREATE INDEX IF NOT EXISTS idx_moltbook_posts_submolt ON moltbook_posts(submolt);
CREATE INDEX IF NOT EXISTS idx_moltbook_posts_created ON moltbook_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moltbook_posts_karma ON moltbook_posts(karma DESC);
CREATE INDEX IF NOT EXISTS idx_moltbook_skills_rating ON moltbook_skills(rating DESC);
CREATE INDEX IF NOT EXISTS idx_moltbook_skills_downloads ON moltbook_skills(downloads DESC);

-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_openclaw_sessions_updated_at BEFORE UPDATE ON openclaw_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_openclaw_skills_updated_at BEFORE UPDATE ON openclaw_skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_moltbook_agents_updated_at BEFORE UPDATE ON moltbook_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_moltbook_posts_updated_at BEFORE UPDATE ON moltbook_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_moltbook_skills_updated_at BEFORE UPDATE ON moltbook_skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
