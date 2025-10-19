#!/usr/bin/env python3
"""
Quick API test script
Tests the running API endpoints via HTTP requests
"""

import requests
import json
import sys

API_BASE = "http://127.0.0.1:5001/api"

def test_api_endpoints():
    """Test various API endpoints"""
    print("Testing Concierge Entities API...")
    print("=" * 50)
    
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Test 1: API Info
    print("1. Testing API Info...")
    try:
        response = session.get(f"{API_BASE}/info")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ API: {data['data']['name']} v{data['data']['version']}")
        else:
            print(f"   ❌ API Info failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ API Info error: {e}")
    
    # Test 2: Health Check
    print("\n2. Testing Health Check...")
    try:
        response = session.get(f"{API_BASE}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Health: {data['status']}")
            if 'data' in data and 'database' in data['data']:
                db_status = data['data']['database']['status']
                print(f"   📊 Database: {db_status}")
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"   ❌ Health check error: {e}")
    
    # Test 3: Try to get entities (will test database schema)
    print("\n3. Testing Get Entities...")
    try:
        response = session.get(f"{API_BASE}/entities")
        if response.status_code == 200:
            data = response.json()
            total = data['data']['pagination']['total']
            print(f"   ✅ Found {total} entities in database")
        else:
            print(f"   ❌ Get entities failed: {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
    except Exception as e:
        print(f"   ❌ Get entities error: {e}")
    
    # Test 4: Try to create a test entity
    print("\n4. Testing Create Entity...")
    test_entity = {
        "entity_type": "restaurant",
        "name": "API Test Restaurant",
        "status": "active",
        "entity_data": {
            "test": True,
            "created_via": "api_test_script"
        },
        "created_by": "api-test-script"
    }
    
    try:
        response = session.post(f"{API_BASE}/entities", json=test_entity)
        if response.status_code == 201:
            data = response.json()
            entity_id = data['data']['entity_id']
            print(f"   ✅ Created test entity with ID: {entity_id}")
            
            # Test 5: Get the created entity
            print("\n5. Testing Get Created Entity...")
            response = session.get(f"{API_BASE}/entities/{entity_id}")
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Retrieved entity: {data['data']['name']}")
            else:
                print(f"   ❌ Get entity failed: {response.status_code}")
                
        else:
            print(f"   ❌ Create entity failed: {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
    except Exception as e:
        print(f"   ❌ Create entity error: {e}")
    
    print("\n" + "=" * 50)
    print("API Testing Complete!")

if __name__ == "__main__":
    test_api_endpoints()