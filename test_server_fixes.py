#!/usr/bin/env python3
"""
Server Fix Validation Script
Tests the enhanced error handling and database connectivity locally
"""

import requests
import json
from datetime import datetime

def test_endpoint(url, expected_status=200, description=""):
    """Test an endpoint and return results"""
    print(f"\n🧪 Testing: {description}")
    print(f"📍 URL: {url}")
    
    try:
        response = requests.get(url, timeout=10)
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == expected_status:
            print("✅ Status code matches expected")
        else:
            print(f"❌ Expected {expected_status}, got {response.status_code}")
        
        # Try to parse JSON response
        try:
            data = response.json()
            print(f"📄 Response Type: {type(data).__name__}")
            
            if isinstance(data, list):
                print(f"📋 Array Length: {len(data)}")
                if len(data) > 0:
                    print(f"🔍 First Item Keys: {list(data[0].keys())}")
            elif isinstance(data, dict):
                print(f"🔑 Object Keys: {list(data.keys())}")
                if 'status' in data:
                    print(f"📈 Status: {data['status']}")
                    
        except json.JSONDecodeError:
            print("⚠️ Response is not valid JSON")
            print(f"📝 Response Text: {response.text[:200]}...")
            
        return response.status_code == expected_status
        
    except requests.exceptions.Timeout:
        print("⏰ Request timed out")
        return False
    except requests.exceptions.ConnectionError:
        print("🔌 Connection error - server may be down")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def main():
    """Run comprehensive server tests"""
    print("🔧 Server Fix Validation")
    print("=" * 50)
    print(f"🕐 Test Time: {datetime.now().isoformat()}")
    
    base_url = "https://wsmontes.pythonanywhere.com"
    
    tests = [
        (f"{base_url}/api/health", 200, "Health Check Endpoint"),
        (f"{base_url}/api/restaurants", 200, "Main Restaurants Endpoint (was 500)"),
        (f"{base_url}/api/restaurants/server-ids", 200, "Server IDs Endpoint"),
        (f"{base_url}/api/nonexistent", 404, "404 Error Handler"),
    ]
    
    passed = 0
    total = len(tests)
    
    for url, expected_status, description in tests:
        if test_endpoint(url, expected_status, description):
            passed += 1
    
    print("\n" + "=" * 50)
    print(f"📊 TEST RESULTS: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! Server fixes are working correctly.")
    else:
        print("⚠️ Some tests failed. Check the output above for details.")
        
    print("\n🔍 NEXT STEPS:")
    if passed == total:
        print("✅ Server is ready for Collector app integration")
        print("✅ Run the migration script in Collector to fix source fields")
    else:
        print("🔧 Review server logs and ensure deployment was successful")
        print("🔧 Check database connectivity and environment variables")

if __name__ == "__main__":
    main()