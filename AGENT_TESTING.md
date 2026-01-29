# Agent System Testing Guide

## Quick Test

### Start the Backend
```bash
cd backend
cargo run
# Or use Node.js fallback:
cd server
npm run dev
```

### Run Test Script
**PowerShell:**
```powershell
.\test_phase2.ps1
```

**Bash:**
```bash
chmod +x test_phase2.sh
./test_phase2.sh
```

## Manual API Testing

### 1. Health Check
```bash
curl http://localhost:3001/health
```

### 2. Create Agent
```bash
curl -X POST "http://localhost:3001/api/v1/agents/create?agent_type=code_generator&name=MyAgent"
```

### 3. List Agents
```bash
curl http://localhost:3001/api/v1/agents
```

### 4. Create Task
```bash
curl -X POST http://localhost:3001/api/v1/agents/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "code_generation",
    "description": "Create a REST API endpoint",
    "priority": "high"
  }'
```

### 5. Get Task Status
```bash
curl http://localhost:3001/api/v1/agents/tasks/{TASK_ID}
```

### 6. Get Metrics
```bash
curl http://localhost:3001/api/v1/agents/metrics
```

## Security Testing

### Test Path Traversal Protection
```bash
curl -X POST http://localhost:3001/api/v1/agents/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "code_generation",
    "description": "Test",
    "context": {
      "files": [{
        "path": "../../etc/passwd",
        "content": "test",
        "language": "text"
      }]
    }
  }'
# Should return error: "Invalid file path"
```

### Test Input Length Limit
```bash
# Create a task with description > 10,000 chars
# Should return error: "Task description too long"
```

### Test Rate Limiting
```bash
# Make 31 requests in 1 minute to /api/v1/agents
# 31st request should return 429 Too Many Requests
```

## Expected Results

### Successful Task Creation
- Task is created with status "pending"
- Task is automatically decomposed into subtasks
- Subtasks are assigned to appropriate agents
- Agents start executing tasks in parallel

### Security Validation
- Invalid file paths are rejected
- Too long descriptions are rejected
- Path traversal attempts are blocked
- Rate limits are enforced

### Metrics
- Metrics endpoint shows:
  - Total agents created
  - Total tasks executed
  - Success rate
  - Average execution time
  - Active agents/tasks

## Troubleshooting

### Backend not starting
- Check if port 3001 is available
- Verify Rust is installed (or use Node.js fallback)
- Check `.env` file for API keys

### Agents not executing
- Verify at least one AI provider API key is configured
- Check backend logs for errors
- Verify task was created successfully

### Security tests passing when they shouldn't
- Check security validation is enabled
- Verify security config is loaded
- Check error handling in routes
