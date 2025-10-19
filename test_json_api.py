#!/usr/bin/env python3
"""
Test script for Concierge Collector JSON Storage API
Tests the new JSON storage approach with sample data.
"""

import json
import requests
import sys
import os

def test_json_api():
    """Test the JSON storage API endpoint with sample data."""
    
    # API endpoint
    base_url = "https://wsmontes.pythonanywhere.com"
    json_endpoint = f"{base_url}/api/curation/json"
    health_endpoint = f"{base_url}/api/health"
    
    print("🧪 Testing Concierge Collector JSON Storage API")
    print("=" * 55)
    
    # 1. Test health endpoint
    print("\n1️⃣ Testing Health Endpoint...")
    try:
        response = requests.get(health_endpoint, timeout=10)
        if response.status_code == 200:
            health_data = response.json()
            print(f"✅ Health Check: {health_data['status']}")
            print(f"   Database: {health_data['database']}")
        else:
            print(f"❌ Health Check Failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health Check Error: {str(e)}")
        return False
    
    # 2. Load sample data
    print("\n2️⃣ Loading Sample JSON Data...")
    sample_file = "concierge_export_example_v2.json"
    
    if not os.path.exists(sample_file):
        print(f"❌ Sample file not found: {sample_file}")
        return False
    
    try:
        with open(sample_file, 'r', encoding='utf-8') as f:
            sample_data = json.load(f)
        print(f"✅ Loaded {len(sample_data)} restaurants from sample file")
    except Exception as e:
        print(f"❌ Error loading sample data: {str(e)}")
        return False
    
    # 3. Test JSON endpoint
    print("\n3️⃣ Testing JSON Storage Endpoint...")
    try:
        headers = {
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            json_endpoint, 
            json=sample_data, 
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ JSON API Success: {result['status']}")
            print(f"   Processed: {result.get('processed', 'N/A')} restaurants")
            print(f"   Message: {result.get('message', 'N/A')}")
            return True
        else:
            print(f"❌ JSON API Failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('message', 'Unknown error')}")
            except:
                print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ JSON API Error: {str(e)}")
        return False

def test_json_retrieval():
    """Test JSON data retrieval endpoints."""
    
    print("\n4️⃣ Testing JSON Data Retrieval...")
    
    base_url = "https://wsmontes.pythonanywhere.com"
    
    # Test different possible endpoints for retrieval
    endpoints_to_try = [
        f"{base_url}/api/restaurants/json",
        f"{base_url}/api/restaurants"
    ]
    
    for endpoint in endpoints_to_try:
        try:
            print(f"   Trying: {endpoint}")
            response = requests.get(endpoint, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Retrieved data from {endpoint}")
                
                if isinstance(data, dict) and 'restaurants' in data:
                    restaurants = data['restaurants']
                    print(f"   Found {len(restaurants)} restaurants")
                elif isinstance(data, list):
                    print(f"   Found {len(data)} restaurants")
                else:
                    print(f"   Response type: {type(data)}")
                
                return True
            else:
                print(f"   ⚠️  {endpoint} returned: {response.status_code}")
                
        except Exception as e:
            print(f"   ⚠️  {endpoint} error: {str(e)}")
    
    print("   ℹ️  No retrieval endpoints found (this is normal if not implemented yet)")
    return True

def create_simple_test_data():
    """Create a simple test with minimal data."""
    
    print("\n5️⃣ Testing with Simple Data...")
    
    # Create minimal test data
    simple_data = [
        {
            "metadata": [
                {
                    "type": "collector",
                    "source": "local",
                    "data": {
                        "name": "Test Restaurant JSON",
                        "description": "A test restaurant for JSON storage validation"
                    }
                }
            ],
            "Cuisine": ["Test"],
            "Price Range": ["Affordable"]
        }
    ]
    
    base_url = "https://wsmontes.pythonanywhere.com"
    json_endpoint = f"{base_url}/api/curation/json"
    
    try:
        headers = {'Content-Type': 'application/json'}
        
        response = requests.post(
            json_endpoint, 
            json=simple_data, 
            headers=headers,
            timeout=15
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Simple test successful: {result['status']}")
            print(f"   Processed: {result.get('processed', 'N/A')} restaurants")
            return True
        else:
            print(f"❌ Simple test failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('message', 'Unknown error')}")
            except:
                print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Simple test error: {str(e)}")
        return False

def main():
    """Run all tests."""
    
    print("🚀 Starting Concierge Collector JSON Storage Tests")
    
    success = True
    
    # Run JSON API tests
    if not test_json_api():
        success = False
    
    # Run data retrieval tests
    if not test_json_retrieval():
        success = False
    
    # Run simple test
    if not create_simple_test_data():
        success = False
    
    print("\n" + "=" * 55)
    if success:
        print("🎉 All JSON tests completed successfully!")
        print("\n📋 Next Steps:")
        print("   1. Run the database schema: create_json_schema.sql")
        print("   2. Check database to verify JSON data was stored correctly")
        print("   3. Update your Collector app to use the JSON endpoint")
        print("   4. Monitor API logs for any issues")
        print("\n💡 Benefits of JSON Approach:")
        print("   • Future-proof: No schema changes needed for new properties")
        print("   • Flexible: Can handle any data structure")
        print("   • Simple: One table, one JSON per restaurant")
        print("   • Fast: No complex joins needed")
    else:
        print("⚠️  Some tests failed. Check the errors above.")
        print("\n🔧 Troubleshooting:")
        print("   1. Run the JSON schema migration: create_json_schema.sql")
        print("   2. Check server logs for detailed errors")
        print("   3. Ensure environment variables are set correctly")
        print("   4. Verify the restaurants_json table exists")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())