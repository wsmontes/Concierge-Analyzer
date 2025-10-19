import sys, os

# 1) aponte para o diretório do seu projeto
project_home = '/home/wsmontes/Concierge-Analyzer'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# 2) Add mysql_api to path
mysql_api_path = '/home/wsmontes/Concierge-Analyzer/mysql_api'
if mysql_api_path not in sys.path:
    sys.path.insert(0, mysql_api_path)

# 3) garanta que o cwd é o do projeto (para achar templates/static)
os.chdir(project_home)

# 4) Import the main concierge_parser app
from concierge_parser import app as application

# 5) Add MySQL API routes 
try:
    # Import and add MySQL API routes under /mysql-api prefix
    exec(open('/home/wsmontes/Concierge-Analyzer/mysql_api/add_routes.py').read())
    print("✅ MySQL API integrated successfully")
except Exception as e:
    print(f"❌ MySQL API integration failed: {e}")
    # App continues to work with just the original functionality