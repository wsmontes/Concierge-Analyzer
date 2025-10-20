"""
wsgi_v2.py - WSGI entry point for V2 API on PythonAnywhere

Purpose: Production WSGI configuration for simplified V2 API
Dependencies: app_v2.app (Flask application)
"""

import sys
import os

# Add project directory to path
project_home = '/home/wsmontes/Concierge-Analyzer/mysql_api'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Load environment variables
from dotenv import load_dotenv
env_path = os.path.join(project_home, '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)

# Import Flask app
try:
    from app_v2 import app as application
except Exception as e:
    # Create error response app
    from flask import Flask, jsonify
    application = Flask(__name__)
    
    error_message = str(e)
    error_type = type(e).__name__
    
    @application.route('/')
    @application.route('/api/health')
    def error_handler():
        return jsonify({
            'error': 'Failed to load application',
            'type': error_type,
            'message': error_message
        }), 500
