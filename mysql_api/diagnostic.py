# 
# PythonAnywhere Diagnostic Script
# Run this in PythonAnywhere bash console to diagnose MySQL API issues
# Checks dependencies, file structure, database connection, and WSGI integration
#

import sys
import os
from pathlib import Path

def check_file_structure():
    """Check if all required files are present"""
    print("🔍 Checking file structure...")
    
    base_path = Path('/home/wsmontes/Concierge-Analyzer/mysql_api')
    required_files = [
        '__init__.py',
        'app.py',
        'database.py',
        'models.py',
        'schema.sql',
        '.env',
        'requirements.txt'
    ]
    
    missing_files = []
    for file in required_files:
        file_path = base_path / file
        if file_path.exists():
            print(f"✅ {file} - Present")
        else:
            print(f"❌ {file} - Missing")
            missing_files.append(file)
    
    return len(missing_files) == 0

def check_dependencies():
    """Check if required Python packages are installed"""
    print("\n🔍 Checking dependencies...")
    
    dependencies = [
        ('flask', 'Flask'),
        ('mysql.connector', 'mysql-connector-python'),
        ('dotenv', 'python-dotenv')
    ]
    
    missing_deps = []
    for module_name, package_name in dependencies:
        try:
            __import__(module_name)
            print(f"✅ {package_name} - Installed")
        except ImportError:
            print(f"❌ {package_name} - Missing")
            missing_deps.append(package_name)
    
    if missing_deps:
        print(f"\nInstall missing dependencies:")
        print(f"pip3.10 install --user {' '.join(missing_deps)}")
    
    return len(missing_deps) == 0

def check_environment():
    """Check environment variables"""
    print("\n🔍 Checking environment configuration...")
    
    # Add path for imports
    sys.path.insert(0, '/home/wsmontes/Concierge-Analyzer/mysql_api')
    
    try:
        from dotenv import load_dotenv
        load_dotenv('/home/wsmontes/Concierge-Analyzer/mysql_api/.env')
        
        required_vars = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE']
        missing_vars = []
        
        for var in required_vars:
            value = os.getenv(var)
            if value:
                display_value = value if var != 'MYSQL_PASSWORD' else '*' * 8
                print(f"✅ {var}: {display_value}")
            else:
                print(f"❌ {var}: Not set")
                missing_vars.append(var)
        
        return len(missing_vars) == 0
        
    except Exception as e:
        print(f"❌ Environment check failed: {e}")
        return False

def test_database_connection():
    """Test database connection"""
    print("\n🔍 Testing database connection...")
    
    try:
        sys.path.insert(0, '/home/wsmontes/Concierge-Analyzer/mysql_api')
        from database import get_db
        
        db = get_db()
        health = db.health_check()
        
        if health['status'] == 'healthy':
            print("✅ Database connection successful")
            
            # Test basic queries
            try:
                result = db.execute_query("SELECT COUNT(*) as count FROM entities", fetch_one=True)
                entity_count = result['count'] if result else 0
                print(f"✅ Entities table accessible: {entity_count} entities")
                
                curators = db.execute_query("SELECT COUNT(*) as count FROM curators", fetch_one=True)
                curator_count = curators['count'] if curators else 0
                print(f"✅ Curators table accessible: {curator_count} curators")
                
                return True
                
            except Exception as e:
                print(f"❌ Database query failed: {e}")
                return False
                
        else:
            print(f"❌ Database connection failed: {health.get('error', 'Unknown error')}")
            return False
            
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

def check_wsgi_integration():
    """Check WSGI file for MySQL API integration"""
    print("\n🔍 Checking WSGI integration...")
    
    wsgi_files = [
        '/var/www/wsmontes_pythonanywhere_com_wsgi.py',
        '/home/wsmontes/mysite/wsgi.py'
    ]
    
    mysql_api_found = False
    
    for wsgi_file in wsgi_files:
        if os.path.exists(wsgi_file):
            print(f"📁 Found WSGI file: {wsgi_file}")
            
            try:
                with open(wsgi_file, 'r') as f:
                    content = f.read()
                
                # Check for MySQL API integration
                if '/mysql-api/' in content or 'mysql_api' in content:
                    print("✅ MySQL API integration found in WSGI file")
                    mysql_api_found = True
                    
                    # Check for specific route patterns
                    if '@application.route(\'/mysql-api/' in content:
                        print("✅ MySQL API routes found")
                    else:
                        print("⚠️ MySQL API routes may not be properly configured")
                else:
                    print("❌ MySQL API integration NOT found in WSGI file")
                    
            except Exception as e:
                print(f"❌ Could not read WSGI file: {e}")
        else:
            print(f"❌ WSGI file not found: {wsgi_file}")
    
    return mysql_api_found

def test_api_imports():
    """Test if API modules can be imported"""
    print("\n🔍 Testing API module imports...")
    
    sys.path.insert(0, '/home/wsmontes/Concierge-Analyzer/mysql_api')
    
    modules_to_test = [
        ('database', 'get_db'),
        ('models', 'EntityModel'),
        ('app', 'create_api_response')
    ]
    
    all_imports_ok = True
    
    for module_name, class_name in modules_to_test:
        try:
            module = __import__(module_name)
            if hasattr(module, class_name):
                print(f"✅ {module_name}.{class_name} - Import successful")
            else:
                print(f"❌ {module_name}.{class_name} - Class not found")
                all_imports_ok = False
        except Exception as e:
            print(f"❌ {module_name} - Import failed: {e}")
            all_imports_ok = False
    
    return all_imports_ok

def main():
    """Run all diagnostic checks"""
    print("🚀 MySQL API PythonAnywhere Diagnostic")
    print("=" * 60)
    
    checks = [
        ("File Structure", check_file_structure),
        ("Dependencies", check_dependencies),
        ("Environment", check_environment),
        ("Database Connection", test_database_connection),
        ("API Imports", test_api_imports),
        ("WSGI Integration", check_wsgi_integration)
    ]
    
    results = []
    
    for check_name, check_func in checks:
        try:
            result = check_func()
            results.append((check_name, result))
        except Exception as e:
            print(f"❌ {check_name} check crashed: {e}")
            results.append((check_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 DIAGNOSTIC SUMMARY")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for check_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {check_name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\nResults: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("\n🎉 All checks passed! MySQL API should be working.")
        print("Test endpoints:")
        print("- https://wsmontes.pythonanywhere.com/mysql-api/health")
        print("- https://wsmontes.pythonanywhere.com/mysql-api/info")
    else:
        print(f"\n⚠️ {failed} issues found. Fix these before testing API.")
        if failed > 3:
            print("Major configuration issues detected.")
        else:
            print("Minor issues detected - API might work with limitations.")

if __name__ == "__main__":
    main()