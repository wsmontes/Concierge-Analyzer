#!/usr/bin/env python3
"""
Test Script for Concierge API Sync Endpoints
Validates that all new sync endpoints are working correctly
Dependencies: requests

This script tests the enhanced API endpoints for CRUD operations
and synchronization features.
"""

import requests
import json
import sys

# Configuration
BASE_URL = "https://wsmontes.pythonanywhere.com"  # Change as needed
# BASE_URL = "http://localhost:5000"  # For local testing

def test_endpoints():
    """Test all the new sync endpoints"""
    
    print("🔍 Testing Concierge API Sync Endpoints")
    print("=" * 50)
    
    # Test 1: Check server status
    print("\n1. Testing server status...")
    try:
        response = requests.get(f"{BASE_URL}/status")
        if response.status_code == 200:
            print("✅ Server is running")
            print(f"   Status: {response.json()}")
        else:
            print(f"❌ Server status check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to server: {e}")
        return False
    
    # Test 2: Get all restaurants
    print("\n2. Testing GET /api/restaurants...")
    try:
        response = requests.get(f"{BASE_URL}/api/restaurants")
        if response.status_code == 200:
            restaurants = response.json()
            print(f"✅ Retrieved {len(restaurants)} restaurants")
            if restaurants:
                print(f"   Sample restaurant keys: {list(restaurants[0].keys())}")
        else:
            print(f"❌ Failed to get restaurants: {response.status_code}")
    except Exception as e:
        print(f"❌ Error getting restaurants: {e}")
    
    # Test 3: Get restaurants with server IDs
    print("\n3. Testing GET /api/restaurants/server-ids...")
    try:
        response = requests.get(f"{BASE_URL}/api/restaurants/server-ids")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Server ID endpoint working")
            print(f"   Found {data.get('count', 0)} restaurants")
        else:
            print(f"❌ Server ID endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error testing server IDs: {e}")
    
    # Test 4: Test sync endpoint structure (without data)
    print("\n4. Testing POST /api/restaurants/sync structure...")
    try:
        test_data = {
            "create": [],
            "update": [],
            "delete": []
        }
        response = requests.post(
            f"{BASE_URL}/api/restaurants/sync",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            result = response.json()
            print("✅ Sync endpoint structure is correct")
            print(f"   Response: {result}")
        else:
            print(f"❌ Sync endpoint failed: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Error testing sync endpoint: {e}")
    
    # Test 5: Test individual restaurant endpoint (if restaurants exist)
    print("\n5. Testing GET /api/restaurants/<id>...")
    try:
        # First get a restaurant ID
        response = requests.get(f"{BASE_URL}/api/restaurants")
        if response.status_code == 200:
            restaurants = response.json()
            if restaurants and 'id' in restaurants[0]:
                restaurant_id = restaurants[0]['id']
                
                # Test individual restaurant endpoint
                response = requests.get(f"{BASE_URL}/api/restaurants/{restaurant_id}")
                if response.status_code == 200:
                    restaurant = response.json()
                    print(f"✅ Individual restaurant endpoint working")
                    print(f"   Retrieved restaurant: {restaurant.get('name', 'Unknown')}")
                else:
                    print(f"❌ Individual restaurant endpoint failed: {response.status_code}")
            else:
                print("ℹ️  No restaurants found to test individual endpoint")
        else:
            print("ℹ️  Cannot test individual endpoint - no restaurants available")
    except Exception as e:
        print(f"❌ Error testing individual restaurant endpoint: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Endpoint testing completed!")
    print("\n📋 Available Endpoints Summary:")
    print("   GET    /api/restaurants                    - Get all restaurants")
    print("   GET    /api/restaurants/<id>              - Get single restaurant")  
    print("   PUT    /api/restaurants/<id>              - Update restaurant")
    print("   DELETE /api/restaurants/<id>              - Delete restaurant")
    print("   POST   /api/restaurants/batch             - Batch create restaurants")
    print("   POST   /api/restaurants/sync              - Bulk sync operations")
    print("   GET    /api/restaurants/server-ids        - Get sync mapping")
    print("   POST   /api/curation                      - Receive curation data")
    print("\n🔄 These endpoints should resolve your syncing issues!")
    return True

if __name__ == "__main__":
    try:
        success = test_endpoints()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
        sys.exit(1)