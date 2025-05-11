"""
Concierge Analyzer Flask Application
Main application file for the Concierge Analyzer service that processes restaurant data.
Dependencies: Flask, psycopg2, dotenv

Note: This file is maintained for development purposes but the application
is actually served through concierge_parser.py when deployed on PythonAnywhere.
"""

from flask import Flask, jsonify, request
from datetime import datetime
import os
import logging
from dotenv import load_dotenv
import psycopg2
import traceback
from flask_cors import CORS

# Load environment variables
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'))

# NOTE: This app instance is NOT used in production
# For PythonAnywhere, use the app from concierge_parser.py
# This is only for local development separate from the parser
dev_app = Flask(__name__, static_folder="static", template_folder="templates")

# Configure logging
logging.basicConfig(level=logging.INFO,
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Update the CORS configuration to specifically target API routes
CORS(dev_app, resources={r"/api/*": {"origins": "*"}})

# Check if we're running this file directly
if __name__ == "__main__":
    @dev_app.route('/status', methods=['GET'])
    def status():
        """Health check endpoint to verify server is running"""
        return jsonify({
            "status": "ok",
            "version": "1.1.2",
            "timestamp": datetime.now().isoformat(),
            "mode": "development"
        })

    @dev_app.route('/api/curation', methods=['POST'])
    def receive_curation_data():
        """
        Endpoint to receive curation data from Concierge Collector.
        Processes and stores restaurant data, concepts, and their relationships.
        """
        try:
            # Check if content type is JSON
            if not request.is_json:
                return jsonify({"status": "error", "message": "Content-Type must be application/json"}), 400
                
            data = request.get_json()
            
            # Basic validation
            if not isinstance(data, dict):
                return jsonify({"status": "error", "message": "Invalid JSON format"}), 400
                
            if not all(key in data for key in ["restaurants", "concepts", "restaurantConcepts"]):
                return jsonify({"status": "error", "message": "Missing required fields"}), 400
                
            # Process the data (using the same function as in concierge_parser.py)
            from concierge_parser import process_curation_data
            success, message = process_curation_data(data)
            
            if success:
                return jsonify({"status": "success"}), 200
            else:
                logger.error(f"Data processing failed: {message}")
                return jsonify({"status": "error", "message": message}), 500
                
        except Exception as e:
            logger.error(f"Error in curation endpoint: {str(e)}")
            return jsonify({"status": "error", "message": str(e)}), 500

    # Only run the development server if this file is executed directly
    dev_app.run(host='0.0.0.0', port=5000, debug=True)
