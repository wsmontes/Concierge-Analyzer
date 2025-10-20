# 
# Server Diagnostics Script for PythonAnywhere Deployment
# Tests database connectivity, imports, and configuration
# Dependencies: mysql-connector-python, python-dotenv
#

import sys
import os

def check_python_version():
    """Check Python version"""
    print(f"✓ Python version: {sys.version}")
    return True

def check_imports():
    """Test all required imports"""
    print("\nChecking imports...")
    try:
        import flask
        print(f"✓ Flask version: {flask.__version__}")
    except ImportError as e:
        print(f"✗ Flask import failed: {e}")
        return False
    
    try:
        import flask_cors
        print(f"✓ Flask-CORS available")
    except ImportError as e:
        print(f"✗ Flask-CORS import failed: {e}")
        return False
    
    try:
        import mysql.connector
        print(f"✓ MySQL connector version: {mysql.connector.__version__}")
    except ImportError as e:
        print(f"✗ MySQL connector import failed: {e}")
        return False
    
    try:
        import dotenv
        print(f"✓ python-dotenv available")
    except ImportError as e:
        print(f"✗ python-dotenv import failed: {e}")
        return False
    
    return True

def check_environment():
    """Check environment variables"""
    print("\nChecking environment variables...")
    from dotenv import load_dotenv
    load_dotenv()
    
    required_vars = ['MYSQL_PASSWORD']
    optional_vars = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_DATABASE']
    
    all_good = True
    for var in required_vars:
        value = os.environ.get(var)
        if value:
            print(f"✓ {var}: {'*' * 8} (set)")
        else:
            print(f"✗ {var}: NOT SET (REQUIRED)")
            all_good = False
    
    for var in optional_vars:
        value = os.environ.get(var)
        if value:
            print(f"✓ {var}: {value}")
        else:
            print(f"⚠ {var}: not set (using default)")
    
    return all_good

def check_database_connection():
    """Test database connection"""
    print("\nTesting database connection...")
    try:
        from database import DatabaseManager
        db = DatabaseManager()
        
        # Try to get a connection
        conn = db.get_connection()
        print(f"✓ Database connection successful")
        
        # Try a simple query
        cursor = conn.cursor()
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()
        print(f"✓ MySQL version: {version[0]}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        return False

def check_app_initialization():
    """Test Flask app initialization"""
    print("\nTesting Flask app initialization...")
    try:
        from app import app
        print(f"✓ Flask app created successfully")
        print(f"✓ App name: {app.name}")
        print(f"✓ Debug mode: {app.debug}")
        
        # List registered routes
        print("\nRegistered routes:")
        for rule in app.url_map.iter_rules():
            methods = ','.join(rule.methods - {'HEAD', 'OPTIONS'})
            print(f"  {rule.endpoint:30s} {methods:20s} {rule.rule}")
        
        return True
    except Exception as e:
        print(f"✗ Flask app initialization failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def run_diagnostics():
    """Run all diagnostic checks"""
    print("=" * 60)
    print("PythonAnywhere Server Diagnostics")
    print("=" * 60)
    
    results = {
        'python_version': check_python_version(),
        'imports': check_imports(),
        'environment': check_environment(),
        'database': check_database_connection(),
        'app': check_app_initialization()
    }
    
    print("\n" + "=" * 60)
    print("DIAGNOSTIC SUMMARY")
    print("=" * 60)
    
    for check, passed in results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{check:20s}: {status}")
    
    all_passed = all(results.values())
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✓ ALL CHECKS PASSED - Server should be operational")
    else:
        print("✗ SOME CHECKS FAILED - Server may not work correctly")
        print("\nRecommended actions:")
        if not results['imports']:
            print("  - Install missing packages: pip install -r requirements.txt")
        if not results['environment']:
            print("  - Set MYSQL_PASSWORD in .env file or environment variables")
        if not results['database']:
            print("  - Check database credentials and connectivity")
        if not results['app']:
            print("  - Review app.py for syntax or import errors")
    print("=" * 60)

if __name__ == "__main__":
    run_diagnostics()
