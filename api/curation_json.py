"""
Concierge Collector JSON API Endpoint
Handles requests from the Concierge Collector using complete JSON storage approach.
Stores each restaurant as a complete JSON document for maximum flexibility.
Dependencies: psycopg2, json
"""

import os
import psycopg2
import logging
import json
from datetime import datetime
from flask import request, jsonify, Blueprint

# Configure logging
logger = logging.getLogger(__name__)

# Create blueprint for API routes
curation_json_bp = Blueprint('curation_json', __name__)

@curation_json_bp.route('/api/curation/json', methods=['POST'])
def receive_curation_json():
    """
    Endpoint to receive curation data from Concierge Collector.
    Accepts array of restaurant JSON objects and stores each as a complete document.
    """
    try:
        # Check if content type is JSON
        if not request.is_json:
            return jsonify({"status": "error", "message": "Content-Type must be application/json"}), 400
            
        data = request.get_json()
        
        # Basic validation
        if not isinstance(data, list):
            return jsonify({"status": "error", "message": "Expected array of restaurant objects"}), 400
            
        if len(data) == 0:
            return jsonify({"status": "error", "message": "Empty restaurant array"}), 400
            
        # Process the data
        success, message, processed_count = process_restaurants_json(data)
        
        if success:
            return jsonify({
                "status": "success", 
                "processed": processed_count,
                "message": message
            }), 200
        else:
            logger.error(f"JSON processing failed: {message}")
            return jsonify({"status": "error", "message": message}), 500
            
    except Exception as e:
        logger.error(f"Error in JSON curation endpoint: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500


def process_restaurants_json(restaurants_data):
    """
    Process restaurant JSON data and store each restaurant as a complete document.
    
    Args:
        restaurants_data (list): Array of restaurant JSON objects
        
    Returns:
        tuple: (success, message, processed_count)
    """
    conn = None
    cursor = None
    processed_count = 0
    
    try:
        # Connect to the database
        conn = psycopg2.connect(
            host=os.environ.get("DB_HOST"),
            database=os.environ.get("DB_NAME"),
            user=os.environ.get("DB_USER"),
            password=os.environ.get("DB_PASSWORD")
        )
        cursor = conn.cursor()
        
        for restaurant_json in restaurants_data:
            # Extract basic info for indexing
            name = extract_restaurant_name_from_json(restaurant_json)
            restaurant_id = extract_restaurant_id_from_json(restaurant_json)
            server_id = extract_server_id_from_json(restaurant_json)
            
            if not name:
                logger.warning("Skipping restaurant without name")
                continue
            
            # Store the complete JSON document
            cursor.execute("""
                INSERT INTO restaurants_json (name, restaurant_id, server_id, restaurant_data)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (name) DO UPDATE SET
                    restaurant_id = EXCLUDED.restaurant_id,
                    server_id = EXCLUDED.server_id,
                    restaurant_data = EXCLUDED.restaurant_data,
                    updated_at = NOW()
            """, (name, restaurant_id, server_id, json.dumps(restaurant_json)))
            
            processed_count += 1
        
        # Commit the transaction
        conn.commit()
        
        return True, f"Successfully processed {processed_count} restaurants", processed_count
        
    except Exception as e:
        logger.error(f"Error processing JSON restaurant data: {str(e)}")
        if conn:
            conn.rollback()
        return False, str(e), processed_count
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def extract_restaurant_name_from_json(restaurant_json):
    """
    Extract restaurant name from JSON structure.
    Looks in collector metadata for the name field.
    """
    try:
        if 'metadata' not in restaurant_json:
            return None
            
        for metadata_item in restaurant_json['metadata']:
            if metadata_item.get('type') == 'collector':
                data = metadata_item.get('data', {})
                name = data.get('name')
                if name:
                    return name.strip()
        
        return None
    except Exception as e:
        logger.error(f"Error extracting restaurant name: {str(e)}")
        return None


def extract_restaurant_id_from_json(restaurant_json):
    """
    Extract restaurant ID from JSON structure.
    Looks in restaurant metadata for the id field.
    """
    try:
        if 'metadata' not in restaurant_json:
            return None
            
        for metadata_item in restaurant_json['metadata']:
            if metadata_item.get('type') == 'restaurant':
                restaurant_id = metadata_item.get('id')
                if restaurant_id:
                    return int(restaurant_id)
        
        return None
    except Exception as e:
        logger.error(f"Error extracting restaurant ID: {str(e)}")
        return None


def extract_server_id_from_json(restaurant_json):
    """
    Extract server ID from JSON structure.
    Looks in restaurant metadata for the serverId field.
    """
    try:
        if 'metadata' not in restaurant_json:
            return None
            
        for metadata_item in restaurant_json['metadata']:
            if metadata_item.get('type') == 'restaurant':
                server_id = metadata_item.get('serverId')
                if server_id:
                    return int(server_id)
        
        return None
    except Exception as e:
        logger.error(f"Error extracting server ID: {str(e)}")
        return None


@curation_json_bp.route('/api/restaurants/json', methods=['GET'])
def get_restaurants_json():
    """
    Endpoint to retrieve restaurants in JSON format.
    Supports query parameters for filtering.
    """
    try:
        # Get query parameters
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        name_filter = request.args.get('name', '')
        
        # Limit protection
        if limit > 1000:
            limit = 1000
            
        conn = psycopg2.connect(
            host=os.environ.get("DB_HOST"),
            database=os.environ.get("DB_NAME"),
            user=os.environ.get("DB_USER"),
            password=os.environ.get("DB_PASSWORD")
        )
        cursor = conn.cursor()
        
        # Build query
        base_query = """
            SELECT id, name, restaurant_id, server_id, restaurant_data, created_at, updated_at
            FROM restaurants_json
        """
        
        params = []
        where_conditions = []
        
        if name_filter:
            where_conditions.append("name ILIKE %s")
            params.append(f"%{name_filter}%")
        
        if where_conditions:
            base_query += " WHERE " + " AND ".join(where_conditions)
        
        base_query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        cursor.execute(base_query, params)
        rows = cursor.fetchall()
        
        # Format response
        restaurants = []
        for row in rows:
            restaurants.append({
                "id": row[0],
                "name": row[1],
                "restaurant_id": row[2],
                "server_id": row[3],
                "restaurant_data": row[4],  # This is already parsed JSON
                "created_at": row[5].isoformat() if row[5] else None,
                "updated_at": row[6].isoformat() if row[6] else None
            })
        
        # Get total count for pagination
        count_query = "SELECT COUNT(*) FROM restaurants_json"
        count_params = []
        
        if where_conditions:
            count_query += " WHERE " + " AND ".join(where_conditions[:-2] if name_filter else [])
            if name_filter:
                count_params.append(f"%{name_filter}%")
        
        cursor.execute(count_query, count_params)
        total_count = cursor.fetchone()[0]
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "status": "success",
            "restaurants": restaurants,
            "pagination": {
                "limit": limit,
                "offset": offset,
                "total": total_count,
                "count": len(restaurants)
            }
        })
        
    except Exception as e:
        logger.error(f"Error retrieving restaurants: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500


@curation_json_bp.route('/api/restaurants/json/<int:restaurant_id>', methods=['GET'])
def get_restaurant_json(restaurant_id):
    """
    Get a specific restaurant by ID.
    """
    try:
        conn = psycopg2.connect(
            host=os.environ.get("DB_HOST"),
            database=os.environ.get("DB_NAME"),
            user=os.environ.get("DB_USER"),
            password=os.environ.get("DB_PASSWORD")
        )
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, name, restaurant_id, server_id, restaurant_data, created_at, updated_at
            FROM restaurants_json
            WHERE id = %s
        """, (restaurant_id,))
        
        row = cursor.fetchone()
        
        if not row:
            return jsonify({"status": "error", "message": "Restaurant not found"}), 404
        
        restaurant = {
            "id": row[0],
            "name": row[1],
            "restaurant_id": row[2],
            "server_id": row[3],
            "restaurant_data": row[4],
            "created_at": row[5].isoformat() if row[5] else None,
            "updated_at": row[6].isoformat() if row[6] else None
        }
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "status": "success",
            "restaurant": restaurant
        })
        
    except Exception as e:
        logger.error(f"Error retrieving restaurant {restaurant_id}: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500


@curation_json_bp.route('/api/restaurants/json/search', methods=['POST'])
def search_restaurants_json():
    """
    Advanced search endpoint for restaurants using JSON queries.
    Supports complex filtering on any JSON field.
    """
    try:
        if not request.is_json:
            return jsonify({"status": "error", "message": "Content-Type must be application/json"}), 400
            
        search_params = request.get_json()
        limit = search_params.get('limit', 50)
        offset = search_params.get('offset', 0)
        
        # Limit protection
        if limit > 1000:
            limit = 1000
            
        conn = psycopg2.connect(
            host=os.environ.get("DB_HOST"),
            database=os.environ.get("DB_NAME"),
            user=os.environ.get("DB_USER"),
            password=os.environ.get("DB_PASSWORD")
        )
        cursor = conn.cursor()
        
        # Build JSON query
        base_query = """
            SELECT id, name, restaurant_id, server_id, restaurant_data, created_at, updated_at
            FROM restaurants_json
            WHERE 1=1
        """
        
        params = []
        
        # Example JSON queries (extend as needed)
        if 'cuisine' in search_params:
            base_query += " AND restaurant_data->'Cuisine' ? %s"
            params.append(search_params['cuisine'])
        
        if 'price_range' in search_params:
            base_query += " AND restaurant_data->'Price Range' ? %s"
            params.append(search_params['price_range'])
        
        if 'michelin_stars' in search_params:
            base_query += """ AND EXISTS (
                SELECT 1 FROM jsonb_array_elements(restaurant_data->'metadata') AS metadata_item
                WHERE metadata_item->>'type' = 'michelin'
                AND (metadata_item->'data'->'rating'->>'stars')::INTEGER = %s
            )"""
            params.append(search_params['michelin_stars'])
        
        if 'name' in search_params:
            base_query += " AND name ILIKE %s"
            params.append(f"%{search_params['name']}%")
        
        base_query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        cursor.execute(base_query, params)
        rows = cursor.fetchall()
        
        # Format response
        restaurants = []
        for row in rows:
            restaurants.append({
                "id": row[0],
                "name": row[1],
                "restaurant_id": row[2],
                "server_id": row[3],
                "restaurant_data": row[4],
                "created_at": row[5].isoformat() if row[5] else None,
                "updated_at": row[6].isoformat() if row[6] else None
            })
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "status": "success",
            "restaurants": restaurants,
            "count": len(restaurants)
        })
        
    except Exception as e:
        logger.error(f"Error in restaurant search: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500