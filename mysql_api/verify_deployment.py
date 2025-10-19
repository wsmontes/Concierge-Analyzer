# 
# MySQL API Deployment Verification Script
# Verifies database connection and table structure on PythonAnywhere
# Dependencies: mysql-connector-python, python-dotenv
#

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

try:
    import mysql.connector
    from mysql.connector import Error
    print("✅ MySQL connector imported successfully")
except ImportError as e:
    print(f"❌ Failed to import mysql.connector: {e}")
    print("Run: pip3.10 install --user mysql-connector-python")
    sys.exit(1)

def verify_database_connection():
    """Verify database connection and table structure"""
    try:
        # Database connection parameters
        config = {
            'host': os.getenv('MYSQL_HOST', 'wsmontes.mysql.pythonanywhere-services.com'),
            'user': os.getenv('MYSQL_USER', 'wsmontes'),
            'password': os.getenv('MYSQL_PASSWORD'),
            'database': os.getenv('MYSQL_DATABASE', 'wsmontes$concierge_db'),
            'port': int(os.getenv('MYSQL_PORT', 3306)),
            'charset': 'utf8mb4',
            'use_unicode': True,
            'autocommit': True
        }
        
        print(f"🔗 Connecting to: {config['host']}:{config['port']}/{config['database']}")
        
        # Create connection
        connection = mysql.connector.connect(**config)
        cursor = connection.cursor(dictionary=True)
        
        print("✅ Database connection successful")
        
        # Verify tables exist
        tables_to_check = ['entities', 'curators', 'entity_sync']
        
        cursor.execute("SHOW TABLES")
        existing_tables = [row[f'Tables_in_{config["database"].split("$")[1]}'] for row in cursor.fetchall()]
        
        print(f"\n📋 Existing tables: {existing_tables}")
        
        for table in tables_to_check:
            if table in existing_tables:
                print(f"✅ Table '{table}' exists")
                
                # Check table structure
                cursor.execute(f"DESCRIBE {table}")
                columns = cursor.fetchall()
                print(f"   Columns: {[col['Field'] for col in columns]}")
            else:
                print(f"❌ Table '{table}' missing")
        
        # Check curators data
        cursor.execute("SELECT COUNT(*) as count FROM curators")
        curator_count = cursor.fetchone()['count']
        print(f"\n👥 Curators in database: {curator_count}")
        
        if curator_count > 0:
            cursor.execute("SELECT name, email, role FROM curators")
            curators = cursor.fetchall()
            for curator in curators:
                print(f"   - {curator['name']} ({curator['email']}) - {curator['role']}")
        
        # Test JSON functionality
        print(f"\n🧪 Testing JSON functionality...")
        test_json = '{"test": "data", "number": 123, "array": [1,2,3]}'
        cursor.execute("SELECT JSON_VALID(%s) as valid", (test_json,))
        json_valid = cursor.fetchone()['valid']
        
        if json_valid:
            print("✅ JSON support working")
        else:
            print("❌ JSON support not working")
        
        connection.close()
        print("\n🎉 Database verification completed successfully!")
        return True
        
    except Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def check_environment():
    """Check environment configuration"""
    print("🔧 Checking environment configuration...")
    
    required_vars = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE']
    missing_vars = []
    
    for var in required_vars:
        value = os.getenv(var)
        if value:
            # Mask password for security
            display_value = value if var != 'MYSQL_PASSWORD' else '*' * len(value)
            print(f"✅ {var}: {display_value}")
        else:
            missing_vars.append(var)
            print(f"❌ {var}: Not set")
    
    if missing_vars:
        print(f"\n❌ Missing environment variables: {missing_vars}")
        print("Create a .env file with the required variables")
        return False
    
    return True

if __name__ == "__main__":
    print("🚀 MySQL API Deployment Verification")
    print("=" * 50)
    
    # Check environment
    env_ok = check_environment()
    if not env_ok:
        sys.exit(1)
    
    print("\n" + "=" * 50)
    
    # Check database
    db_ok = verify_database_connection()
    if not db_ok:
        sys.exit(1)
    
    print("\n" + "=" * 50)
    print("🎯 Next Steps:")
    print("1. Upload mysql_api folder to PythonAnywhere")
    print("2. Install dependencies: pip3.10 install --user mysql-connector-python python-dotenv") 
    print("3. Update WSGI configuration file")
    print("4. Reload web application")
    print("5. Test endpoints at /mysql-api/*")