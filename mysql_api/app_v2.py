"""
app_v2.py - Simplified Flask API for Concierge V2 format

Purpose: REST API for storing/retrieving restaurants in pure V2 JSON format
Dependencies: Flask, Flask-CORS, mysql.connector, models_v2.RestaurantV2
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from datetime import datetime
from database import DatabaseManager
from models_v2 import RestaurantV2

# Initialize database manager
db_manager = DatabaseManager()

app = Flask(__name__)

# Enable CORS for all routes
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type"],
        "supports_credentials": False
    }
})


# ============================================
# HEALTH CHECK
# ============================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        conn.close()
        return jsonify({"status": "healthy", "database": "connected"}), 200
    except Exception as e:
        return jsonify({"status": "unhealthy", "error": str(e)}), 500


# ============================================
# V2 RESTAURANT ENDPOINTS
# ============================================

@app.route('/api/v2/restaurants', methods=['GET'])
def get_restaurants():
    """
    Get all restaurants in V2 format.
    Query params:
        - entity_type: Filter by type (restaurant, hotel, etc.)
        - limit: Max results (default 100)
        - offset: Pagination offset (default 0)
        - format: 'full' (with metadata) or 'v2' (pure V2 JSON, default)
    """
    try:
        entity_type = request.args.get('entity_type')
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))
        format_type = request.args.get('format', 'v2')
        
        conn = db_manager.get_connection()
        restaurants = RestaurantV2.get_all(conn, entity_type, limit, offset)
        conn.close()
        
        if format_type == 'full':
            # Return with database metadata
            return jsonify({
                'count': len(restaurants),
                'restaurants': [r.to_dict() for r in restaurants]
            }), 200
        else:
            # Return pure V2 format (default)
            return jsonify({
                'count': len(restaurants),
                'restaurants': [r.to_v2_format() for r in restaurants]
            }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/v2/restaurants/<int:restaurant_id>', methods=['GET'])
def get_restaurant(restaurant_id):
    """
    Get single restaurant by ID.
    Query params:
        - format: 'full' (with metadata) or 'v2' (pure V2 JSON, default)
    """
    try:
        format_type = request.args.get('format', 'v2')
        
        conn = db_manager.get_connection()
        restaurant = RestaurantV2.get_by_id(conn, restaurant_id)
        conn.close()
        
        if not restaurant:
            return jsonify({'error': 'Restaurant not found'}), 404
        
        if format_type == 'full':
            return jsonify(restaurant.to_dict()), 200
        else:
            return jsonify(restaurant.to_v2_format()), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/v2/restaurants', methods=['POST'])
def create_restaurant():
    """
    Create new restaurant from V2 JSON format.
    Body: Pure V2 JSON object
    """
    try:
        v2_data = request.get_json()
        
        if not v2_data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        # Create restaurant from V2 format
        restaurant = RestaurantV2.from_v2_format(v2_data)
        
        # Save to database
        conn = db_manager.get_connection()
        restaurant_id = restaurant.save(conn)
        
        # Retrieve saved restaurant
        saved = RestaurantV2.get_by_id(conn, restaurant_id)
        conn.close()
        
        return jsonify({
            'message': 'Restaurant created successfully',
            'id': restaurant_id,
            'restaurant': saved.to_v2_format()
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/v2/restaurants/<int:restaurant_id>', methods=['PUT'])
def update_restaurant(restaurant_id):
    """
    Update existing restaurant with V2 JSON format.
    Body: Pure V2 JSON object
    """
    try:
        v2_data = request.get_json()
        
        if not v2_data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        conn = db_manager.get_connection()
        
        # Check if exists
        restaurant = RestaurantV2.get_by_id(conn, restaurant_id)
        if not restaurant:
            conn.close()
            return jsonify({'error': 'Restaurant not found'}), 404
        
        # Update V2 data
        restaurant.v2_data = v2_data
        restaurant.name = v2_data.get('Name', v2_data.get('name', restaurant.name))
        restaurant.entity_type = v2_data.get('Type', restaurant.entity_type).lower()
        
        # Save changes
        restaurant.save(conn)
        
        # Retrieve updated restaurant
        updated = RestaurantV2.get_by_id(conn, restaurant_id)
        conn.close()
        
        return jsonify({
            'message': 'Restaurant updated successfully',
            'restaurant': updated.to_v2_format()
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/v2/restaurants/<int:restaurant_id>', methods=['DELETE'])
def delete_restaurant(restaurant_id):
    """Soft delete restaurant."""
    try:
        conn = db_manager.get_connection()
        restaurant = RestaurantV2.get_by_id(conn, restaurant_id)
        
        if not restaurant:
            conn.close()
            return jsonify({'error': 'Restaurant not found'}), 404
        
        restaurant.soft_delete(conn)
        conn.close()
        
        return jsonify({'message': 'Restaurant deleted successfully'}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/v2/restaurants/bulk', methods=['POST'])
def bulk_create_restaurants():
    """
    Bulk create restaurants from V2 JSON array.
    Body: Array of V2 JSON objects
    """
    try:
        v2_array = request.get_json()
        
        if not isinstance(v2_array, list):
            return jsonify({'error': 'Expected JSON array'}), 400
        
        conn = db_manager.get_connection()
        created_ids = []
        
        for v2_data in v2_array:
            restaurant = RestaurantV2.from_v2_format(v2_data)
            restaurant_id = restaurant.save(conn)
            created_ids.append(restaurant_id)
        
        conn.close()
        
        return jsonify({
            'message': f'Created {len(created_ids)} restaurants',
            'ids': created_ids
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/v2/restaurants/search', methods=['GET'])
def search_restaurants():
    """
    Search restaurants by name.
    Query params:
        - q: Search term (required)
        - limit: Max results (default 20)
        - format: 'full' or 'v2' (default)
    """
    try:
        search_term = request.args.get('q')
        if not search_term:
            return jsonify({'error': 'Missing search term (q parameter)'}), 400
        
        limit = int(request.args.get('limit', 20))
        format_type = request.args.get('format', 'v2')
        
        conn = db_manager.get_connection()
        restaurants = RestaurantV2.search_by_name(conn, search_term, limit)
        conn.close()
        
        if format_type == 'full':
            return jsonify({
                'count': len(restaurants),
                'restaurants': [r.to_dict() for r in restaurants]
            }), 200
        else:
            return jsonify({
                'count': len(restaurants),
                'restaurants': [r.to_v2_format() for r in restaurants]
            }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# METADATA EXTRACTION ENDPOINTS
# ============================================

@app.route('/api/v2/restaurants/<int:restaurant_id>/metadata', methods=['GET'])
def get_restaurant_metadata(restaurant_id):
    """Get all metadata arrays from restaurant."""
    try:
        conn = db_manager.get_connection()
        restaurant = RestaurantV2.get_by_id(conn, restaurant_id)
        conn.close()
        
        if not restaurant:
            return jsonify({'error': 'Restaurant not found'}), 404
        
        metadata = restaurant.v2_data.get('metadata', [])
        return jsonify({'metadata': metadata}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/v2/restaurants/<int:restaurant_id>/metadata/<metadata_type>', methods=['GET'])
def get_restaurant_metadata_by_type(restaurant_id, metadata_type):
    """
    Get specific metadata type from restaurant.
    Example: /api/v2/restaurants/1/metadata/michelin
    """
    try:
        conn = db_manager.get_connection()
        restaurant = RestaurantV2.get_by_id(conn, restaurant_id)
        conn.close()
        
        if not restaurant:
            return jsonify({'error': 'Restaurant not found'}), 404
        
        metadata = restaurant.v2_data.get('metadata', [])
        filtered = [m for m in metadata if m.get('type') == metadata_type]
        
        return jsonify({
            'type': metadata_type,
            'count': len(filtered),
            'metadata': filtered
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# ERROR HANDLERS
# ============================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({'error': 'Method not allowed'}), 405


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500


# ============================================
# OPTIONS HANDLER (CORS PREFLIGHT)
# ============================================

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
        return response, 200


if __name__ == '__main__':
    app.run(debug=True)
