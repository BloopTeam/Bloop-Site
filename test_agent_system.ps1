# Agent System Test Script (PowerShell)

$BASE_URL = "http://localhost:3001"

Write-Host "🧪 Testing Agent System" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "1. Testing health check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/health" -Method Get
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: List Agents
Write-Host "2. Listing agents..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/v1/agents" -Method Get
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 3: Create Agent
Write-Host "3. Creating code generator agent..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/v1/agents/create?agent_type=code_generator&name=TestAgent" -Method Post
    $response | ConvertTo-Json -Depth 10
    $AGENT_ID = $response.id
    Write-Host "Agent ID: $AGENT_ID" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 4: Get Agent Status
if ($AGENT_ID) {
    Write-Host "4. Getting agent status..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/api/v1/agents/$AGENT_ID" -Method Get
        $response | ConvertTo-Json -Depth 10
    } catch {
        Write-Host "Error: $_" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 5: Create Task
Write-Host "5. Creating task..." -ForegroundColor Yellow
try {
    $body = @{
        task_type = "code_generation"
        description = "Create a simple REST API endpoint for user authentication"
        priority = "high"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BASE_URL/api/v1/agents/tasks" -Method Post -Body $body -ContentType "application/json"
    $response | ConvertTo-Json -Depth 10
    $TASK_ID = $response.id
    Write-Host "Task ID: $TASK_ID" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 6: Get Task Status
if ($TASK_ID) {
    Write-Host "6. Getting task status..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/api/v1/agents/tasks/$TASK_ID" -Method Get
        $response | ConvertTo-Json -Depth 10
    } catch {
        Write-Host "Error: $_" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 7: List All Tasks
Write-Host "7. Listing all tasks..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/v1/agents/tasks" -Method Get
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 8: Get Metrics
Write-Host "8. Getting system metrics..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/v1/agents/metrics" -Method Get
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 9: Security Test - Invalid file path
Write-Host "9. Testing security (invalid file path)..." -ForegroundColor Yellow
try {
    $body = @{
        task_type = "code_generation"
        description = "Test"
        priority = "medium"
        context = @{
            files = @(
                @{
                    path = "../../etc/passwd"
                    content = "test"
                    language = "text"
                }
            )
        }
    } | ConvertTo-Json -Depth 10

    $response = Invoke-RestMethod -Uri "$BASE_URL/api/v1/agents/tasks" -Method Post -Body $body -ContentType "application/json"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Security validation working! Error: $_" -ForegroundColor Green
}
Write-Host ""

Write-Host "✅ Tests complete!" -ForegroundColor Green
