#!/usr/bin/env python3
"""
Database Schema Checker and Migration Script
Checks current database schema and adds server_id column if needed
Dependencies: psycopg2

This script ensures the database schema supports the server_id field
required for proper synchronization functionality.
"""

import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'))

def check_and_add_server_id():
    """Check if server_id column exists and add it if missing"""
    
    print("🔍 Checking database schema for server_id column...")
    
    try:
        # Connect to database
        conn = psycopg2.connect(
            host=os.environ.get("DB_HOST"),
            database=os.environ.get("DB_NAME"),
            user=os.environ.get("DB_USER"),
            password=os.environ.get("DB_PASSWORD")
        )
        cursor = conn.cursor()
        
        # Check if server_id column exists in restaurants table
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'restaurants' AND column_name = 'server_id'
        """)
        
        server_id_exists = cursor.fetchone() is not None
        
        if server_id_exists:
            print("✅ server_id column already exists in restaurants table")
        else:
            print("⚠️  server_id column missing - adding it now...")
            
            # Add server_id column
            cursor.execute("""
                ALTER TABLE restaurants 
                ADD COLUMN server_id VARCHAR(255)
            """)
            
            # Add index for better performance
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_restaurants_server_id 
                ON restaurants(server_id)
            """)
            
            conn.commit()
            print("✅ server_id column added successfully with index")
        
        # Show current restaurants table schema
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'restaurants'
            ORDER BY ordinal_position
        """)
        
        print("\n📋 Current restaurants table schema:")
        print("   Column Name          | Data Type      | Nullable")
        print("   " + "-" * 50)
        for row in cursor.fetchall():
            column_name, data_type, is_nullable = row
            print(f"   {column_name:<20} | {data_type:<14} | {is_nullable}")
        
        # Check existing data
        cursor.execute("SELECT COUNT(*) FROM restaurants")
        total_restaurants = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM restaurants WHERE server_id IS NOT NULL")
        synced_restaurants = cursor.fetchone()[0]
        
        print(f"\n📊 Restaurant sync status:")
        print(f"   Total restaurants: {total_restaurants}")
        print(f"   Synced (have server_id): {synced_restaurants}")
        print(f"   Unsynced (no server_id): {total_restaurants - synced_restaurants}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking/updating database schema: {e}")
        return False

if __name__ == "__main__":
    success = check_and_add_server_id()
    if success:
        print("\n🎉 Database schema is ready for sync operations!")
    else:
        print("\n💥 Failed to prepare database schema")
        exit(1)