# 
# WSGI Configuration for PythonAnywhere Deployment - Enhanced Version
# Entry point for the Concierge Entities API with error handling and logging
# Dependencies: sys, os, logging for robust deployment
#

import sys
import os
import logging

# Configure logging BEFORE importing the app
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('/home/wsmontes/logs/mysql_api.log') if os.path.exists('/home/wsmontes/logs') else logging.StreamHandler(sys.stdout)
    ]
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
    
    # Log environment check
    logger.info("Checking environment variables...")
    has_password = 'MYSQL_PASSWORD' in os.environ
    logger.info(f"MYSQL_PASSWORD is {'set' if has_password else 'NOT SET'}")
    
    # Import the Flask application
    logger.info("Importing Flask application...")
    from app import app as application
    logger.info("Flask application imported successfully")
    
    # Log application configuration
    logger.info(f"Application name: {application.name}")
    logger.info(f"Debug mode: {application.debug}")
    
    # The PythonAnywhere WSGI handler expects an object called 'application'
    if __name__ == "__main__":
        application.run()

except Exception as e:
    logger.error(f"WSGI initialization failed: {e}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")
    
    # Create a minimal error app
    from flask import Flask, jsonify
    application = Flask(__name__)
    
    @application.route('/')
    @application.route('/<path:path>')
    def error_handler(path=''):
        return jsonify({
            'status': 'error',
            'error': 'Server initialization failed',
            'details': str(e),
            'message': 'Check server logs for more information'
        }), 500
