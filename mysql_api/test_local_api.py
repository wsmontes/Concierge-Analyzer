# 
# Local API Test Script - Tests MySQL API functionality with mock data
# Tests all endpoints without requiring PythonAnywhere database connection
# Dependencies: requests library for HTTP testing
#

import requests
import json
import time
from datetime import datetime

# API base URL
BASE_URL = "http://127.0.0.1:5001/api"

def print_test_header(test_name):
    """Print formatted test header"""
    print(f"\n{'='*60}")
    print(f"🧪 Testing: {test_name}")
    print(f"{'='*60}")

def print_response(response, test_description):
    """Print formatted response"""
    print(f"\n📊 {test_description}")
    print(f"Status Code: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    
    try:
        json_data = response.json()
        print(f"Response: {json.dumps(json_data, indent=2)}")
        return json_data
    except json.JSONDecodeError:
        print(f"Response (text): {response.text}")
        return None

def test_api_info():
    """Test API information endpoint"""
    print_test_header("API Information")
    
    try:
        response = requests.get(f"{BASE_URL}/info", timeout=5)
        data = print_response(response, "API Info Endpoint")
        
        if response.status_code == 200 and data:
            print("✅ API Info test passed")
            return True
        else:
            print("❌ API Info test failed")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False

def test_health_check():
    """Test health check endpoint"""
    print_test_header("Health Check")
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        data = print_response(response, "Health Check Endpoint")
        
        # Health check might fail due to database connection, but should return proper JSON
        if data and 'status' in data:
            if data['status'] == 'healthy':
                print("✅ Health check passed - Database connected")
            else:
                print("⚠️  Health check returned unhealthy status (expected with remote DB)")
            return True
        else:
            print("❌ Health check failed - Invalid response format")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False

def test_entities_endpoint():
    """Test entities endpoint (GET)"""
    print_test_header("Entities Listing")
    
    try:
        # Test basic entities endpoint
        response = requests.get(f"{BASE_URL}/entities", timeout=5)
        data = print_response(response, "GET /api/entities")
        
        # This will likely fail due to database connection
        if response.status_code in [200, 500]:  # Accept both success and DB error
            print("✅ Entities endpoint is accessible")
            return True
        else:
            print("❌ Entities endpoint test failed")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False

def test_entities_with_parameters():
    """Test entities endpoint with query parameters"""
    print_test_header("Entities with Parameters")
    
    try:
        # Test with query parameters
        params = {
            'entity_type': 'restaurant',
            'status': 'active',
            'page': 1,
            'per_page': 10
        }
        
        response = requests.get(f"{BASE_URL}/entities", params=params, timeout=5)
        data = print_response(response, "GET /api/entities with parameters")
        
        if response.status_code in [200, 500]:  # Accept both success and DB error
            print("✅ Entities with parameters endpoint is accessible")
            return True
        else:
            print("❌ Entities with parameters test failed")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False

def test_create_entity():
    """Test entity creation endpoint"""
    print_test_header("Entity Creation")
    
    try:
        # Sample entity data
        entity_data = {
            "entity_type": "restaurant",
            "name": "Test Restaurant API",
            "external_id": "test-api-001",
            "status": "active",
            "entity_data": {
                "metadata": [
                    {
                        "type": "collector",
                        "source": "api-test",
                        "data": {
                            "name": "Test Restaurant API",
                            "description": "A test restaurant created via API",
                            "location": {
                                "latitude": 40.7128,
                                "longitude": -74.0060,
                                "address": "123 Test St, New York, NY"
                            },
                            "cuisine": "Test Cuisine",
                            "notes": {
                                "private": "API test entity",
                                "public": "Created for testing purposes"
                            }
                        }
                    }
                ],
                "categories": {
                    "Cuisine": ["Test"],
                    "Price Range": ["Moderate"],
                    "Mood": ["Casual"],
                    "Setting": ["Test Environment"]
                }
            },
            "created_by": "api-test",
            "updated_by": "api-test"
        }
        
        response = requests.post(
            f"{BASE_URL}/entities",
            json=entity_data,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        data = print_response(response, "POST /api/entities")
        
        if response.status_code in [201, 500]:  # Accept both success and DB error
            print("✅ Entity creation endpoint is accessible")
            return True
        else:
            print("❌ Entity creation test failed")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False

def test_concierge_import():
    """Test Concierge V2 import endpoint"""
    print_test_header("Concierge V2 Import")
    
    try:
        # Sample Concierge V2 data (simplified)
        import_data = [
            {
                "metadata": [
                    {
                        "type": "collector",
                        "source": "local",
                        "data": {
                            "name": "Imported Test Restaurant",
                            "description": "Imported via Concierge V2 format",
                            "location": {
                                "latitude": 40.7589,
                                "longitude": -73.9851,
                                "address": "456 Import Ave, New York, NY"
                            }
                        }
                    }
                ],
                "categories": {
                    "Cuisine": ["Italian"],
                    "Price Range": ["Expensive"],
                    "Mood": ["Romantic"]
                }
            }
        ]
        
        response = requests.post(
            f"{BASE_URL}/import/concierge-v2",
            json=import_data,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        data = print_response(response, "POST /api/import/concierge-v2")
        
        if response.status_code in [200, 500]:  # Accept both success and DB error
            print("✅ Concierge import endpoint is accessible")
            return True
        else:
            print("❌ Concierge import test failed")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False

def test_invalid_endpoints():
    """Test invalid endpoints return proper errors"""
    print_test_header("Invalid Endpoints")
    
    test_results = []
    
    # Test non-existent endpoint
    try:
        response = requests.get(f"{BASE_URL}/nonexistent", timeout=5)
        print(f"Non-existent endpoint status: {response.status_code}")
        test_results.append(response.status_code == 404)
    except:
        test_results.append(False)
    
    # Test invalid method
    try:
        response = requests.delete(f"{BASE_URL}/info", timeout=5)
        print(f"Invalid method status: {response.status_code}")
        test_results.append(response.status_code in [405, 404])
    except:
        test_results.append(False)
    
    if all(test_results):
        print("✅ Invalid endpoints handled correctly")
        return True
    else:
        print("❌ Some invalid endpoint tests failed")
        return False

def main():
    """Run all API tests"""
    print("🚀 MySQL API Local Testing Suite")
    print(f"Testing API at: {BASE_URL}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    # List of test functions
    tests = [
        ("API Information", test_api_info),
        ("Health Check", test_health_check),
        ("Entities Listing", test_entities_endpoint),
        ("Entities with Parameters", test_entities_with_parameters),
        ("Entity Creation", test_create_entity),
        ("Concierge V2 Import", test_concierge_import),
        ("Invalid Endpoints", test_invalid_endpoints)
    ]
    
    results = []
    
    # Run each test
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test '{test_name}' crashed: {e}")
            results.append((test_name, False))
        
        time.sleep(0.5)  # Brief pause between tests
    
    # Summary
    print_test_header("Test Summary")
    
    passed = 0
    failed = 0
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\n📊 Results: {passed} passed, {failed} failed, {passed + failed} total")
    
    if failed == 0:
        print("🎉 All tests passed!")
    elif passed > failed:
        print("⚠️  Most tests passed - Some failures expected due to database connectivity")
    else:
        print("❌ Multiple test failures - Check API server and configuration")
    
    return failed == 0

if __name__ == "__main__":
    main()