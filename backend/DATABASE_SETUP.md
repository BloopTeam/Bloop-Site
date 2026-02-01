# Database Setup Guide

This guide explains how to set up the PostgreSQL database for Bloop's OpenClaw and Moltbook integrations.

## Prerequisites

- PostgreSQL 12+ installed and running
- Rust toolchain with `sqlx-cli` installed

## Installation

### 1. Install sqlx-cli

```bash
cargo install sqlx-cli --features postgres
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE bloop;

# Create user (optional)
CREATE USER bloop_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE bloop TO bloop_user;
```

### 3. Configure Environment

Add to your `.env` file:

```env
DATABASE_URL=postgresql://bloop_user:your_password@localhost:5432/bloop
```

### 4. Run Migrations

```bash
cd backend
sqlx migrate run
```

This will create all necessary tables:
- `openclaw_sessions` - OpenClaw agent sessions
- `openclaw_skills` - Available skills
- `openclaw_executions` - Skill execution audit log
- `moltbook_agents` - Registered agents
- `moltbook_posts` - Shared posts
- `moltbook_skills` - Shared skills

## Verification

Check that tables were created:

```bash
psql -U bloop_user -d bloop -c "\dt"
```

You should see all the tables listed above.

## Security Features

The database setup includes:

1. **Input Validation**: All inputs are validated before insertion
2. **SQL Injection Prevention**: Using parameterized queries via sqlx
3. **Transaction Support**: All writes use transactions for data integrity
4. **Audit Logging**: Skill executions are logged for security auditing
5. **Constraints**: Database constraints prevent invalid data
6. **Indexes**: Optimized indexes for performance

## Troubleshooting

### Migration Errors

If migrations fail, check:
- Database connection string is correct
- User has proper permissions
- PostgreSQL version is 12+

### Connection Errors

Ensure PostgreSQL is running:
```bash
# Linux/Mac
sudo systemctl status postgresql

# Windows
# Check Services panel
```

### Reset Database (Development Only)

```bash
# WARNING: This deletes all data!
sqlx migrate revert
sqlx migrate run
```

## Production Considerations

1. **Backup**: Set up regular database backups
2. **Connection Pooling**: Already configured via sqlx
3. **Monitoring**: Monitor query performance
4. **Encryption**: Use SSL connections in production
5. **Access Control**: Restrict database access to backend only
