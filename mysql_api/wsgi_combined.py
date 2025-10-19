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

# 4) Import both applications and combine them
from concierge_parser import app as main_app

# Import MySQL API app and register it as a blueprint
try:
    from mysql_api.app import app as mysql_api_app
    
    # Create a blueprint from the MySQL API
    from flask import Blueprint
    
    # Create blueprint for MySQL API at /mysql-api prefix
    mysql_blueprint = Blueprint('mysql_api', __name__, url_prefix='/mysql-api')
    
    # Register all MySQL API routes under the blueprint
    for rule in mysql_api_app.url_map.iter_rules():
        endpoint = rule.endpoint
        view_func = mysql_api_app.view_functions[endpoint]
        methods = rule.methods
        
        # Remove the default methods that Flask adds
        methods = methods - {'HEAD', 'OPTIONS'}
        
        mysql_blueprint.add_url_rule(
            rule.rule,
            endpoint=endpoint,
            view_func=view_func,
            methods=methods
        )
    
    # Register the blueprint with the main app
    main_app.register_blueprint(mysql_blueprint)
    
    print("MySQL API integrated successfully at /mysql-api/*")
    
except Exception as e:
    print(f"Failed to integrate MySQL API: {e}")

# 5) Export the main application
application = main_app