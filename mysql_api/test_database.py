#!/usr/bin/env python3
"""
Quick database connection test for Concierge MySQL API
Tests database connectivity and schema setup
"""

import sys
import os

# Add the mysql_api directory to Python path
sys.path.insert(0, '/Users/wagnermontes/Documents/GitHub/Concierge-Analyzer/mysql_api')

from database import get_db

def test_database_connection():
    """Test database connection and check if tables exist"""
    print("Testing MySQL database connection...")
    
    try:
        db = get_db()
        
        # Test basic connectivity
        health = db.health_check()
        print(f"Health check result: {health}")
        
        if health['status'] == 'healthy':
            print("✅ Database connection successful!")
            
            # Check if tables exist
            print("\nChecking database schema...")
            try:
                tables = db.execute_query("SHOW TABLES")
                print(f"Found {len(tables)} tables:")
                for table in tables:
                    table_name = list(table.values())[0]
                    print(f"  - {table_name}")
                
                # Check specific tables
                required_tables = ['entities', 'curators', 'entity_sync']
                existing_tables = [list(table.values())[0] for table in tables]
                
                missing_tables = [t for t in required_tables if t not in existing_tables]
                if missing_tables:
                    print(f"\n⚠️  Missing required tables: {missing_tables}")
                    print("You need to run the schema.sql file in your MySQL database.")
                else:
                    print("\n✅ All required tables exist!")
                    
                    # Test a simple query on entities table
                    try:
                        count = db.execute_query("SELECT COUNT(*) as count FROM entities", fetch_one=True)
                        print(f"Entities table has {count['count']} records")
                    except Exception as e:
                        print(f"Error querying entities table: {e}")
                        
            except Exception as e:
                print(f"Error checking schema: {e}")
        else:
            print("❌ Database connection failed!")
            print(f"Error: {health.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        print("Make sure your MySQL credentials are correct in the .env file")

if __name__ == "__main__":
    test_database_connection()