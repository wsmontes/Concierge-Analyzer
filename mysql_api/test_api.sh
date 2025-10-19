#!/bin/bash
# 
# Simple API test script using curl
# Tests the MySQL API endpoints while server runs in background
#

echo "Testing Concierge Entities API..."
echo "=================================="

# Test 1: API Info
echo "1. Testing API Info:"
curl -s http://127.0.0.1:5001/api/info | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f'   ✅ API: {data[\"data\"][\"name\"]} v{data[\"data\"][\"version\"]}')
except:
    print('   ❌ Failed to parse API info')
"

echo ""

# Test 2: Health Check  
echo "2. Testing Health Check:"
curl -s http://127.0.0.1:5001/api/health | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f'   Status: {data[\"status\"]}')
    if 'data' in data and 'database' in data['data']:
        db_status = data['data']['database']['status']
        print(f'   Database: {db_status}')
except Exception as e:
    print(f'   ❌ Failed to parse health check: {e}')
"

echo ""

# Test 3: Try to get entities
echo "3. Testing Get Entities:"
response=$(curl -s -w "\n%{http_code}" http://127.0.0.1:5001/api/entities)
http_code=$(echo "$response" | tail -n1)
json_response=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    echo "$json_response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    total = data['data']['pagination']['total']
    print(f'   ✅ Found {total} entities in database')
except:
    print('   ❌ Failed to parse entities response')
"
else
    echo "   ❌ Get entities failed with HTTP $http_code"
    echo "   Response: $json_response"
fi

echo ""
echo "=================================="
echo "Test completed!"