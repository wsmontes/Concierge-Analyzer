# 
# WSGI Configuration for PythonAnywhere Deployment
# Entry point for the Concierge Entities API
# Dependencies: sys, os for path management
#

import sys
import os

# Add the mysql_api directory to Python path
mysql_api_path = '/home/wsmontes/Concierge-Analyzer/mysql_api'
if mysql_api_path not in sys.path:
    sys.path.insert(0, mysql_api_path)

# Set the current working directory
os.chdir('/home/wsmontes/Concierge-Analyzer/mysql_api')

# Import the Flask application
from app import app as application

# The PythonAnywhere WSGI handler expects an object called 'application'
if __name__ == "__main__":
    application.run()