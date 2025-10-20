# 
# WSGI Configuration Fix - Copy this to PythonAnywhere WSGI config
# This is the corrected version that fixes the NameError
# Dependencies: sys, os, logging, flask, flask-cors
#

import sys
import os
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

try:
    # Add the mysql_api directory to Python path
    mysql_api_path = '/home/wsmontes/Concierge-Analyzer/mysql_api'
    if mysql_api_path not in sys.path:
        sys.path.insert(0, mysql_api_path)
        logger.info(f"Added {mysql_api_path} to Python path")

    # Set the current working directory
    os.chdir('/home/wsmontes/Concierge-Analyzer/mysql_api')
    logger.info(f"Changed working directory to {os.getcwd()}")

    # Check environment variables
    has_password = 'MYSQL_PASSWORD' in os.environ
    logger.info(f"MYSQL_PASSWORD is {'set' if has_password else 'NOT SET'}")

    # Import the Flask application
    logger.info("Importing Flask application...")
    from app import app as application
    logger.info("Flask application imported successfully")

except Exception as init_error:
    # Store error details BEFORE creating the error handler
    error_message = str(init_error)
    error_type = type(init_error).__name__
    
    logger.error(f"WSGI initialization failed: {error_message}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")
    
    # Create a minimal error app with CORS
    from flask import Flask, jsonify
    from flask_cors import CORS
    
    application = Flask(__name__)
    CORS(application, resources={r"/*": {"origins": "*"}})
    
    @application.route('/', methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    @application.route('/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    def error_handler(path=''):
        """Error handler when app initialization fails"""
        return jsonify({
            'status': 'error',
            'error': 'Server initialization failed',
            'error_type': error_type,
            'details': error_message,
            'message': 'Check server logs for more information. Common issues: missing MYSQL_PASSWORD, import errors, database connectivity.'
        }), 500
