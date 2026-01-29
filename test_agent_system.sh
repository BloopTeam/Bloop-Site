#!/bin/bash
# Agent System Test Script

BASE_URL="http://localhost:3001"

echo "🧪 Testing Phase 2 Agent System"
echo "================================"
echo ""

# Test 1: Health Check
echo "1. Testing health check..."
curl -s "$BASE_URL/health" | jq '.'
echo ""

# Test 2: List Agents (should be empty initially)
echo "2. Listing agents..."
curl -s "$BASE_URL/api/v1/agents" | jq '.'
echo ""

# Test 3: Create Agent
echo "3. Creating code generator agent..."
AGENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/agents/create?agent_type=code_generator&name=TestAgent")
echo "$AGENT_RESPONSE" | jq '.'
AGENT_ID=$(echo "$AGENT_RESPONSE" | jq -r '.id')
echo "Agent ID: $AGENT_ID"
echo ""

# Test 4: Get Agent Status
echo "4. Getting agent status..."
curl -s "$BASE_URL/api/v1/agents/$AGENT_ID" | jq '.'
echo ""

# Test 5: Create Task
echo "5. Creating task..."
TASK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/agents/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "code_generation",
    "description": "Create a simple REST API endpoint for user authentication",
    "priority": "high"
  }')
echo "$TASK_RESPONSE" | jq '.'
TASK_ID=$(echo "$TASK_RESPONSE" | jq -r '.id')
echo "Task ID: $TASK_ID"
echo ""

# Test 6: Get Task Status
echo "6. Getting task status..."
sleep 2
curl -s "$BASE_URL/api/v1/agents/tasks/$TASK_ID" | jq '.'
echo ""

# Test 7: List All Tasks
echo "7. Listing all tasks..."
curl -s "$BASE_URL/api/v1/agents/tasks" | jq '.'
echo ""

# Test 8: Get Metrics
echo "8. Getting system metrics..."
curl -s "$BASE_URL/api/v1/agents/metrics" | jq '.'
echo ""

# Test 9: Security Test - Invalid file path
echo "9. Testing security (invalid file path)..."
curl -s -X POST "$BASE_URL/api/v1/agents/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "code_generation",
    "description": "Test",
    "priority": "medium",
    "context": {
      "files": [{
        "path": "../../etc/passwd",
        "content": "test",
        "language": "text"
      }]
    }
  }' | jq '.'
echo ""

# Test 10: Security Test - Too long description
echo "10. Testing security (too long description)..."
LONG_DESC=$(python3 -c "print('a' * 20000)")
curl -s -X POST "$BASE_URL/api/v1/agents/tasks" \
  -H "Content-Type: application/json" \
  -d "{
    \"task_type\": \"code_generation\",
    \"description\": \"$LONG_DESC\",
    \"priority\": \"medium\"
  }" | jq '.'
echo ""

echo "✅ Tests complete!"
