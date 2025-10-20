"""
Concierge Analyzer - V3 WSGI Entry Point
Purpose: PythonAnywhere-compatible WSGI application for V3 API
Dependencies: Works with both mysql-connector-python (local) and mysqlclient (PythonAnywhere)
Usage: Configure in PythonAnywhere Web tab as WSGI file
"""

import os
import sys

# Add project directory to path (adjust for your PythonAnywhere username)
project_home = os.path.dirname(os.path.abspath(__file__))
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# PythonAnywhere-specific: Add parent directory if needed
parent_dir = os.path.dirname(project_home)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import the application
from app_v3 import create_app

# PythonAnywhere configuration
# Set these in PythonAnywhere Web tab > Environment variables OR here:
config = {
    'DB_HOST': os.getenv('DB_HOST', 'wsmontes.mysql.pythonanywhere-services.com'),
    'DB_PORT': int(os.getenv('DB_PORT', 3306)),
    'DB_USER': os.getenv('DB_USER', 'wsmontes'),
    'DB_PASSWORD': os.getenv('DB_PASSWORD', ''),  # Set in environment!
    'DB_NAME': os.getenv('DB_NAME', 'wsmontes$concierge_db'),
}

# Create WSGI application
application = create_app(config)

# For local testing
if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    application.run(host='0.0.0.0', port=port, debug=False)
