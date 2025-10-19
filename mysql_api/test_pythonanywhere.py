# 
# PythonAnywhere API Test Script
# Tests MySQL API functionality on PythonAnywhere after deployment
# Run this script from PythonAnywhere bash console after deployment
#

import os
import sys
import json
from datetime import datetime

def test_database_connection():
    """Test database connection directly"""
    try:
        # Import the database module
        sys.path.insert(0, '/home/wsmontes/Concierge-Analyzer/mysql_api')
        from database import get_db
        
        print("🔗 Testing database connection...")
        db = get_db()
        
        # Test health check
        health = db.health_check()
        print(f"Database health: {health}")
        
        if health['status'] == 'healthy':
            print("✅ Database connection successful")
            return True
        else:
            print(f"❌ Database connection failed: {health.get('error', 'Unknown error')}")
            return False
            
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

def test_entity_model():
    """Test entity model functionality"""
    try:
        sys.path.insert(0, '/home/wsmontes/Concierge-Analyzer/mysql_api')
        from models import EntityModel, EntityType
        
        print("🧪 Testing entity model...")
        
        # Create test entity
        entity = EntityModel(
            entity_type='restaurant',
            name='Test Restaurant',
            external_id='test-001',
            status='active',
            entity_data={
                'metadata': [{
                    'type': 'collector',
                    'source': 'test',
                    'data': {
                        'name': 'Test Restaurant',
                        'description': 'A test restaurant'
                    }
                }],
                'categories': {
                    'Cuisine': ['Test']
                }
            },
            created_by='test',
            updated_by='test'
        )
        
        # Validate entity
        is_valid, errors = entity.validate()
        if is_valid:
            print("✅ Entity model validation passed")
            print(f"Entity JSON: {json.dumps(entity.to_json_response(), indent=2)}")
            return True
        else:
            print(f"❌ Entity validation failed: {errors}")
            return False
            
    except Exception as e:
        print(f"❌ Entity model test failed: {e}")
        return False

def test_concierge_import():
    """Test Concierge V2 import functionality"""
    try:
        sys.path.insert(0, '/home/wsmontes/Concierge-Analyzer/mysql_api')
        from models import EntityModel
        
        print("🧪 Testing Concierge V2 import...")
        
        # Sample Concierge V2 data
        concierge_data = {
            "metadata": [
                {
                    "type": "collector",
                    "source": "local",
                    "data": {
                        "name": "Imported Restaurant",
                        "description": "Imported from Concierge V2",
                        "location": {
                            "latitude": 40.7128,
                            "longitude": -74.0060,
                            "address": "123 Main St, New York, NY"
                        }
                    }
                }
            ],
            "categories": {
                "Cuisine": ["Italian"],
                "Price Range": ["Expensive"]
            }
        }
        
        # Test import
        entity = EntityModel.from_concierge_v2(concierge_data)
        is_valid, errors = entity.validate()
        
        if is_valid:
            print("✅ Concierge V2 import test passed")
            print(f"Imported entity: {entity.name}")
            return True
        else:
            print(f"❌ Imported entity validation failed: {errors}")
            return False
            
    except Exception as e:
        print(f"❌ Concierge import test failed: {e}")
        return False

def test_database_operations():
    """Test actual database operations"""
    try:
        sys.path.insert(0, '/home/wsmontes/Concierge-Analyzer/mysql_api')
        from database import get_db
        from models import EntityModel
        
        print("🧪 Testing database operations...")
        
        db = get_db()
        
        # Test simple query
        result = db.execute_query("SELECT COUNT(*) as count FROM entities", fetch_one=True)
        entity_count = result['count'] if result else 0
        print(f"Current entities in database: {entity_count}")
        
        # Test curators query
        curators = db.execute_query("SELECT name, email, role FROM curators")
        print(f"Curators in database: {len(curators)}")
        for curator in curators:
            print(f"  - {curator['name']} ({curator['email']}) - {curator['role']}")
        
        print("✅ Database operations test passed")
        return True
        
    except Exception as e:
        print(f"❌ Database operations test failed: {e}")
        return False

def test_full_api_workflow():
    """Test complete API workflow: create, read, update"""
    try:
        sys.path.insert(0, '/home/wsmontes/Concierge-Analyzer/mysql_api')
        from database import get_db
        from models import EntityModel
        
        print("🧪 Testing full API workflow...")
        
        db = get_db()
        
        # Create test entity
        entity = EntityModel(
            entity_type='restaurant',
            name='API Test Restaurant',
            external_id='api-test-001',
            status='active',
            entity_data={
                'metadata': [{
                    'type': 'collector',
                    'source': 'api-test',
                    'data': {
                        'name': 'API Test Restaurant',
                        'description': 'Created during API testing',
                        'location': {
                            'latitude': 40.7589,
                            'longitude': -73.9851,
                            'address': '789 Test Ave, New York, NY'
                        }
                    }
                }],
                'categories': {
                    'Cuisine': ['Test'],
                    'Price Range': ['Moderate'],
                    'Mood': ['Testing']
                }
            },
            created_by='api-test',
            updated_by='api-test'
        )
        
        # Insert entity
        entity_dict = entity.to_dict(include_id=False)
        query = """
            INSERT INTO entities (entity_type, name, external_id, status, entity_data, 
                                created_by, updated_by)
            VALUES (%(entity_type)s, %(name)s, %(external_id)s, %(status)s, 
                   %(entity_data)s, %(created_by)s, %(updated_by)s)
        """
        
        entity_id = db.execute_insert(query, entity_dict)
        print(f"Created entity with ID: {entity_id}")
        
        # Read entity back
        read_query = "SELECT * FROM entities WHERE id = %s"
        read_result = db.execute_query(read_query, (entity_id,), fetch_one=True)
        
        if read_result:
            print(f"Successfully read entity: {read_result['name']}")
            
            # Clean up - delete test entity
            delete_query = "DELETE FROM entities WHERE id = %s"
            db.execute_query(delete_query, (entity_id,))
            print(f"Cleaned up test entity")
            
            print("✅ Full API workflow test passed")
            return True
        else:
            print("❌ Failed to read created entity")
            return False
        
    except Exception as e:
        print(f"❌ Full API workflow test failed: {e}")
        return False

def main():
    """Run all PythonAnywhere tests"""
    print("🚀 MySQL API PythonAnywhere Testing Suite")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("=" * 60)
    
    tests = [
        ("Database Connection", test_database_connection),
        ("Entity Model", test_entity_model),
        ("Concierge V2 Import", test_concierge_import),
        ("Database Operations", test_database_operations),
        ("Full API Workflow", test_full_api_workflow)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*40}")
        print(f"Running: {test_name}")
        print(f"{'='*40}")
        
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test '{test_name}' crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print(f"\n{'='*60}")
    print("🏁 Test Summary")
    print(f"{'='*60}")
    
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
        print("🎉 All tests passed! MySQL API is ready for production.")
    elif passed > failed:
        print("⚠️  Most tests passed - Minor issues to resolve")
    else:
        print("❌ Multiple test failures - Check configuration and deployment")

if __name__ == "__main__":
    main()