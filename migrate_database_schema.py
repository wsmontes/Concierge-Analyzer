"""
Database Schema Migration Script
Adds the missing server_id column to the restaurants table
"""

import os
import psycopg2
from datetime import datetime

def run_migration():
    """Add server_id column to restaurants table with proper indexing"""
    
    print("🔧 Starting Database Schema Migration...")
    print(f"📅 Migration Time: {datetime.now().isoformat()}")
    
    try:
        # Connect to database
        conn = psycopg2.connect(
            host=os.environ.get("DB_HOST"),
            database=os.environ.get("DB_NAME"),
            user=os.environ.get("DB_USER"),
            password=os.environ.get("DB_PASSWORD"),
            connect_timeout=10
        )
        
        cursor = conn.cursor()
        
        # Check if server_id column already exists
        print("🔍 Checking current schema...")
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'restaurants' 
            AND column_name = 'server_id';
        """)
        
        if cursor.fetchone():
            print("✅ server_id column already exists")
            cursor.close()
            conn.close()
            return True
            
        print("📝 Adding server_id column...")
        
        # Add server_id column
        cursor.execute("""
            ALTER TABLE restaurants 
            ADD COLUMN server_id VARCHAR(255);
        """)
        
        # Create index for better performance
        print("📊 Creating index for server_id...")
        cursor.execute("""
            CREATE INDEX idx_restaurants_server_id 
            ON restaurants(server_id);
        """)
        
        # Commit changes
        conn.commit()
        print("✅ Database migration completed successfully!")
        
        # Verify the change
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'restaurants' 
            AND column_name = 'server_id';
        """)
        
        result = cursor.fetchone()
        if result:
            col_name, data_type, nullable = result
            print(f"✅ Verified: {col_name} ({data_type}, nullable: {nullable})")
        
        cursor.close()
        conn.close()
        
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Database error: {str(e)}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        return False

def check_schema():
    """Check current restaurants table schema"""
    try:
        conn = psycopg2.connect(
            host=os.environ.get("DB_HOST"),
            database=os.environ.get("DB_NAME"),
            user=os.environ.get("DB_USER"),
            password=os.environ.get("DB_PASSWORD")
        )
        
        cursor = conn.cursor()
        
        print("📋 Current restaurants table schema:")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'restaurants'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        for col_name, data_type, nullable, default in columns:
            print(f"  • {col_name}: {data_type} (nullable: {nullable}, default: {default})")
            
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error checking schema: {str(e)}")

if __name__ == "__main__":
    print("=" * 60)
    print("🗄️  DATABASE SCHEMA MIGRATION")
    print("=" * 60)
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Check current schema
    check_schema()
    
    print("\n" + "=" * 60)
    
    # Run migration
    if run_migration():
        print("\n🎉 Migration completed successfully!")
        print("\n📋 Updated schema:")
        check_schema()
    else:
        print("\n❌ Migration failed!")
        
    print("\n" + "=" * 60)