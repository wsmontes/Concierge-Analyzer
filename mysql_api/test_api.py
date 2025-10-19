# 
# Test Script for Concierge Entities API
# Demonstrates API functionality using the provided Concierge V2 example data
# Dependencies: requests, json
#

import json
import requests
from typing import Dict, Any

class ConciergeAPITester:
    """Test class for the Concierge Entities API"""
    
    def __init__(self, base_url: str = "http://localhost:5001/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_health_check(self) -> Dict[str, Any]:
        """Test the health check endpoint"""
        print("Testing health check...")
        try:
            response = self.session.get(f"{self.base_url}/health")
            result = response.json()
            print(f"Health check: {result['status']}")
            return result
        except Exception as e:
            print(f"Health check failed: {e}")
            return {"status": "error", "error": str(e)}
    
    def test_api_info(self) -> Dict[str, Any]:
        """Test the API info endpoint"""
        print("Testing API info...")
        try:
            response = self.session.get(f"{self.base_url}/info")
            result = response.json()
            print(f"API: {result['data']['name']} v{result['data']['version']}")
            return result
        except Exception as e:
            print(f"API info failed: {e}")
            return {"status": "error", "error": str(e)}
    
    def load_concierge_example_data(self) -> list:
        """Load the example Concierge V2 data"""
        try:
            # Load the example data file
            with open('../concierge_export_example_v2.json', 'r') as f:
                data = json.load(f)
            print(f"Loaded {len(data)} entities from example data")
            return data
        except Exception as e:
            print(f"Failed to load example data: {e}")
            return []
    
    def test_import_concierge_v2(self, data: list) -> Dict[str, Any]:
        """Test importing Concierge V2 data"""
        print("Testing Concierge V2 import...")
        try:
            response = self.session.post(
                f"{self.base_url}/import/concierge-v2",
                json=data
            )
            result = response.json()
            
            if response.status_code == 200:
                summary = result['data']['summary']
                print(f"Import successful: {summary['successful']}/{summary['total_processed']} entities imported")
                if result['data']['errors']:
                    print(f"Errors: {len(result['data']['errors'])}")
                    for error in result['data']['errors'][:3]:  # Show first 3 errors
                        print(f"  - {error}")
            else:
                print(f"Import failed: {result.get('error', 'Unknown error')}")
            
            return result
        except Exception as e:
            print(f"Import test failed: {e}")
            return {"status": "error", "error": str(e)}
    
    def test_get_entities(self, entity_type: str = "restaurant") -> Dict[str, Any]:
        """Test getting entities with filters"""
        print(f"Testing get entities (type: {entity_type})...")
        try:
            response = self.session.get(
                f"{self.base_url}/entities",
                params={"entity_type": entity_type, "per_page": 5}
            )
            result = response.json()
            
            if response.status_code == 200:
                entities = result['data']['entities']
                pagination = result['data']['pagination']
                print(f"Found {pagination['total']} entities, showing {len(entities)}")
                
                for entity in entities:
                    print(f"  - {entity['name']} (ID: {entity['id']})")
            else:
                print(f"Get entities failed: {result.get('error', 'Unknown error')}")
            
            return result
        except Exception as e:
            print(f"Get entities test failed: {e}")
            return {"status": "error", "error": str(e)}
    
    def test_get_entity_detail(self, entity_id: int) -> Dict[str, Any]:
        """Test getting a specific entity"""
        print(f"Testing get entity detail (ID: {entity_id})...")
        try:
            response = self.session.get(f"{self.base_url}/entities/{entity_id}")
            result = response.json()
            
            if response.status_code == 200:
                entity = result['data']
                print(f"Entity: {entity['name']} ({entity['entity_type']})")
                
                # Show categories if available
                if 'concierge_v2' in entity.get('entity_data', {}):
                    categories = {k: v for k, v in entity['entity_data']['concierge_v2'].items() 
                                if k != 'metadata' and isinstance(v, list)}
                    if categories:
                        print("  Categories:")
                        for cat, values in categories.items():
                            print(f"    {cat}: {', '.join(values)}")
            else:
                print(f"Get entity detail failed: {result.get('error', 'Unknown error')}")
            
            return result
        except Exception as e:
            print(f"Get entity detail test failed: {e}")
            return {"status": "error", "error": str(e)}
    
    def test_create_entity(self) -> Dict[str, Any]:
        """Test creating a new entity"""
        print("Testing create entity...")
        try:
            new_entity = {
                "entity_type": "restaurant",
                "name": "Test Restaurant API",
                "status": "active",
                "entity_data": {
                    "test_data": True,
                    "categories": {
                        "Cuisine": ["Test Cuisine"],
                        "Price Range": ["Mid-range"],
                        "Mood": ["Casual"]
                    }
                },
                "created_by": "api-test",
                "updated_by": "api-test"
            }
            
            response = self.session.post(
                f"{self.base_url}/entities",
                json=new_entity
            )
            result = response.json()
            
            if response.status_code == 201:
                entity_id = result['data']['entity_id']
                print(f"Created entity with ID: {entity_id}")
                return result
            else:
                print(f"Create entity failed: {result.get('error', 'Unknown error')}")
                return result
        except Exception as e:
            print(f"Create entity test failed: {e}")
            return {"status": "error", "error": str(e)}
    
    def test_update_entity(self, entity_id: int) -> Dict[str, Any]:
        """Test updating an entity"""
        print(f"Testing update entity (ID: {entity_id})...")
        try:
            update_data = {
                "name": "Updated Test Restaurant",
                "status": "inactive",
                "entity_data": {
                    "test_data": True,
                    "updated": True,
                    "categories": {
                        "Cuisine": ["Updated Cuisine"],
                        "Price Range": ["Expensive"]
                    }
                },
                "updated_by": "api-test-update"
            }
            
            response = self.session.put(
                f"{self.base_url}/entities/{entity_id}",
                json=update_data
            )
            result = response.json()
            
            if response.status_code == 200:
                print(f"Updated entity: {result['data']['name']}")
            else:
                print(f"Update entity failed: {result.get('error', 'Unknown error')}")
            
            return result
        except Exception as e:
            print(f"Update entity test failed: {e}")
            return {"status": "error", "error": str(e)}
    
    def test_delete_entity(self, entity_id: int) -> Dict[str, Any]:
        """Test deleting an entity"""
        print(f"Testing delete entity (ID: {entity_id})...")
        try:
            response = self.session.delete(f"{self.base_url}/entities/{entity_id}")
            result = response.json()
            
            if response.status_code == 200:
                print(f"Deleted entity ID: {entity_id}")
            else:
                print(f"Delete entity failed: {result.get('error', 'Unknown error')}")
            
            return result
        except Exception as e:
            print(f"Delete entity test failed: {e}")
            return {"status": "error", "error": str(e)}
    
    def test_search_entities(self, search_term: str = "osteria") -> Dict[str, Any]:
        """Test searching entities"""
        print(f"Testing search entities (term: '{search_term}')...")
        try:
            response = self.session.get(
                f"{self.base_url}/entities",
                params={"search": search_term, "per_page": 10}
            )
            result = response.json()
            
            if response.status_code == 200:
                entities = result['data']['entities']
                print(f"Found {len(entities)} entities matching '{search_term}'")
                for entity in entities:
                    print(f"  - {entity['name']}")
            else:
                print(f"Search failed: {result.get('error', 'Unknown error')}")
            
            return result
        except Exception as e:
            print(f"Search test failed: {e}")
            return {"status": "error", "error": str(e)}
    
    def run_full_test_suite(self):
        """Run the complete test suite"""
        print("=" * 60)
        print("CONCIERGE ENTITIES API - FULL TEST SUITE")
        print("=" * 60)
        
        # 1. Health check
        health = self.test_health_check()
        if health.get('status') != 'healthy':
            print("API is not healthy, stopping tests")
            return
        
        print()
        
        # 2. API info
        self.test_api_info()
        print()
        
        # 3. Load and import example data
        example_data = self.load_concierge_example_data()
        if example_data:
            import_result = self.test_import_concierge_v2(example_data)
            print()
        else:
            print("Skipping import test due to missing example data")
            print()
        
        # 4. Get entities
        entities_result = self.test_get_entities()
        print()
        
        # 5. Get entity detail (if we have entities)
        if (entities_result.get('status') == 'success' and 
            entities_result.get('data', {}).get('entities')):
            first_entity_id = entities_result['data']['entities'][0]['id']
            self.test_get_entity_detail(first_entity_id)
            print()
        
        # 6. Create new entity
        create_result = self.test_create_entity()
        print()
        
        # 7. Update the created entity
        if (create_result.get('status') == 'success' and 
            create_result.get('data', {}).get('entity_id')):
            created_id = create_result['data']['entity_id']
            self.test_update_entity(created_id)
            print()
            
            # 8. Delete the created entity
            self.test_delete_entity(created_id)
            print()
        
        # 9. Search test
        self.test_search_entities()
        print()
        
        print("=" * 60)
        print("TEST SUITE COMPLETED")
        print("=" * 60)

def main():
    """Main function to run tests"""
    import sys
    
    # Default to localhost, but allow override
    base_url = "http://localhost:5001/api"
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    
    print(f"Testing API at: {base_url}")
    print()
    
    tester = ConciergeAPITester(base_url)
    tester.run_full_test_suite()

if __name__ == "__main__":
    main()