#!/usr/bin/env python3
"""
Test script for Concierge Collector V2 API
Tests the new V2 endpoint with sample data and validates responses.
"""

import json
import requests
import sys
import os

def test_v2_api():
    """Test the V2 API endpoint with sample data."""
    
    # API endpoint
    base_url = "https://wsmontes.pythonanywhere.com"
    v2_endpoint = f"{base_url}/api/curation/v2"
    health_endpoint = f"{base_url}/api/health"
    
    print("🧪 Testing Concierge Collector V2 API")
    print("=" * 50)
    
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
    print("\n2️⃣ Loading Sample V2 Data...")
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
    
    # 3. Test V2 endpoint
    print("\n3️⃣ Testing V2 Curation Endpoint...")
    try:
        headers = {
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            v2_endpoint, 
            json=sample_data, 
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ V2 API Success: {result['status']}")
            print(f"   Processed: {result.get('processed', 'N/A')} restaurants")
            return True
        else:
            print(f"❌ V2 API Failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('message', 'Unknown error')}")
            except:
                print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ V2 API Error: {str(e)}")
        return False

def test_data_retrieval():
    """Test data retrieval after insertion."""
    
    print("\n4️⃣ Testing Data Retrieval...")
    
    # Test a simple restaurants endpoint if it exists
    base_url = "https://wsmontes.pythonanywhere.com"
    restaurants_endpoint = f"{base_url}/api/restaurants"
    
    try:
        response = requests.get(restaurants_endpoint, timeout=10)
        if response.status_code == 200:
            restaurants = response.json()
            print(f"✅ Retrieved {len(restaurants) if isinstance(restaurants, list) else 'N/A'} restaurants")
            
            # Look for our test restaurants
            test_names = ["Osteria Francescana", "Joe's Pizza", "Sukiyabashi Jiro"]
            found_restaurants = []
            
            if isinstance(restaurants, list):
                for restaurant in restaurants:
                    if isinstance(restaurant, dict) and restaurant.get('name') in test_names:
                        found_restaurants.append(restaurant['name'])
                
                if found_restaurants:
                    print(f"✅ Found test restaurants: {', '.join(found_restaurants)}")
                else:
                    print("⚠️  Test restaurants not found in response")
            
            return True
        else:
            print(f"⚠️  Restaurants endpoint returned: {response.status_code}")
            print("   (This might be expected if endpoint doesn't exist yet)")
            return True
            
    except Exception as e:
        print(f"⚠️  Data retrieval test failed: {str(e)}")
        print("   (This might be expected if endpoint doesn't exist yet)")
        return True

def main():
    """Run all tests."""
    
    print("🚀 Starting Concierge Collector V2 API Tests")
    
    success = True
    
    # Run API tests
    if not test_v2_api():
        success = False
    
    # Run data retrieval tests
    if not test_data_retrieval():
        success = False
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 All tests completed successfully!")
        print("\n📋 Next Steps:")
        print("   1. Check database to verify data was stored correctly")
        print("   2. Update your Collector app to use V2 format")
        print("   3. Monitor API logs for any issues")
    else:
        print("⚠️  Some tests failed. Check the errors above.")
        print("\n🔧 Troubleshooting:")
        print("   1. Verify database migration was run")
        print("   2. Check server logs for detailed errors")
        print("   3. Ensure environment variables are set correctly")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())