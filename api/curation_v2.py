"""
Curation API V2 Endpoint
Handles requests from the Concierge Collector V2 to store restaurant data with new metadata structure.
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
curation_v2_bp = Blueprint('curation_v2', __name__)

@curation_v2_bp.route('/api/curation/v2', methods=['POST'])
def receive_curation_data_v2():
    """
    Endpoint to receive curation data from Concierge Collector V2.
    Processes and stores restaurant data with rich metadata structure.
    """
    try:
        # Check if content type is JSON
        if not request.is_json:
            return jsonify({"status": "error", "message": "Content-Type must be application/json"}), 400
            
        data = request.get_json()
        
        # Basic validation
        if not isinstance(data, list):
            return jsonify({"status": "error", "message": "Expected array of restaurants"}), 400
            
        # Process the data
        success, message = process_curation_data_v2(data)
        
        if success:
            return jsonify({"status": "success", "processed": len(data)}), 200
        else:
            logger.error(f"Data processing failed: {message}")
            return jsonify({"status": "error", "message": message}), 500
            
    except Exception as e:
        logger.error(f"Error in curation V2 endpoint: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500


def process_curation_data_v2(restaurants_data):
    """
    Process the V2 curation data and insert it into the database.
    
    Args:
        restaurants_data (list): Array of restaurant objects with metadata and categories
        
    Returns:
        tuple: (success, message) indicating success or failure and a message
    """
    conn = None
    cursor = None
    
    try:
        # Connect to the database
        conn = psycopg2.connect(
            host=os.environ.get("DB_HOST"),
            database=os.environ.get("DB_NAME"),
            user=os.environ.get("DB_USER"),
            password=os.environ.get("DB_PASSWORD")
        )
        cursor = conn.cursor()
        
        for restaurant_data in restaurants_data:
            if 'metadata' not in restaurant_data:
                continue
                
            # Extract metadata components
            restaurant_metadata = None
            collector_data = None
            michelin_data = None
            google_places_data = None
            
            for metadata_item in restaurant_data['metadata']:
                metadata_type = metadata_item.get('type')
                if metadata_type == 'restaurant':
                    restaurant_metadata = metadata_item
                elif metadata_type == 'collector':
                    collector_data = metadata_item.get('data', {})
                elif metadata_type == 'michelin':
                    michelin_data = metadata_item.get('data', {})
                elif metadata_type == 'google-places':
                    google_places_data = metadata_item.get('data', {})
            
            # Skip if no collector data (required for restaurant name)
            if not collector_data or not collector_data.get('name'):
                continue
                
            # Insert/update restaurant
            restaurant_id = upsert_restaurant_v2(
                cursor, 
                collector_data, 
                restaurant_metadata, 
                michelin_data, 
                google_places_data
            )
            
            if restaurant_id:
                # Process curator categories
                process_curator_categories_v2(cursor, restaurant_id, restaurant_data)
                
                # Process photos if they exist
                if 'photos' in collector_data:
                    process_photos_v2(cursor, restaurant_id, collector_data['photos'])
        
        # Commit the transaction
        conn.commit()
        
        return True, "V2 data processed successfully"
        
    except Exception as e:
        logger.error(f"Error processing V2 curation data: {str(e)}")
        if conn:
            conn.rollback()
        return False, str(e)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def upsert_restaurant_v2(cursor, collector_data, restaurant_metadata, michelin_data, google_places_data):
    """
    Insert or update restaurant with V2 data structure.
    
    Returns:
        int: restaurant_id if successful, None otherwise
    """
    try:
        name = collector_data.get('name')
        description = collector_data.get('description')
        transcription = collector_data.get('transcription')
        
        # Location data
        location = collector_data.get('location', {})
        latitude = location.get('latitude')
        longitude = location.get('longitude')
        address = location.get('address')
        location_entered_by = location.get('enteredBy')
        
        # Notes
        notes = collector_data.get('notes', {})
        private_notes = notes.get('private')
        public_notes = notes.get('public')
        
        # Restaurant metadata (if exists)
        local_id = restaurant_metadata.get('id') if restaurant_metadata else None
        server_id = restaurant_metadata.get('serverId') if restaurant_metadata else None
        created_timestamp = restaurant_metadata.get('created', {}).get('timestamp') if restaurant_metadata else None
        curator_id = restaurant_metadata.get('created', {}).get('curator', {}).get('id') if restaurant_metadata else None
        curator_name = restaurant_metadata.get('created', {}).get('curator', {}).get('name') if restaurant_metadata else None
        
        # Sync data
        sync_data = restaurant_metadata.get('sync', {}) if restaurant_metadata else {}
        sync_status = sync_data.get('status')
        last_synced_at = sync_data.get('lastSyncedAt')
        deleted_locally = sync_data.get('deletedLocally', False)
        
        # Michelin data
        michelin_id = michelin_data.get('michelinId') if michelin_data else None
        michelin_stars = michelin_data.get('rating', {}).get('stars') if michelin_data else None
        michelin_distinction = michelin_data.get('rating', {}).get('distinction') if michelin_data else None
        michelin_description = michelin_data.get('michelinDescription') if michelin_data else None
        michelin_url = michelin_data.get('michelinUrl') if michelin_data else None
        
        # Google Places data
        google_place_id = google_places_data.get('placeId') if google_places_data else None
        google_rating = google_places_data.get('rating', {}).get('average') if google_places_data else None
        google_total_ratings = google_places_data.get('rating', {}).get('totalRatings') if google_places_data else None
        google_price_level = google_places_data.get('rating', {}).get('priceLevel') if google_places_data else None
        
        # Insert or update restaurant
        cursor.execute("""
            INSERT INTO restaurants_v2 (
                name, description, transcription, 
                latitude, longitude, address, location_entered_by,
                private_notes, public_notes,
                local_id, server_id, created_timestamp, curator_id, curator_name,
                sync_status, last_synced_at, deleted_locally,
                michelin_id, michelin_stars, michelin_distinction, michelin_description, michelin_url,
                google_place_id, google_rating, google_total_ratings, google_price_level,
                metadata_json, created_at, updated_at
            ) VALUES (
                %s, %s, %s, 
                %s, %s, %s, %s,
                %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, NOW(), NOW()
            )
            ON CONFLICT (name) DO UPDATE SET
                description = EXCLUDED.description,
                transcription = EXCLUDED.transcription,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                address = EXCLUDED.address,
                location_entered_by = EXCLUDED.location_entered_by,
                private_notes = EXCLUDED.private_notes,
                public_notes = EXCLUDED.public_notes,
                server_id = EXCLUDED.server_id,
                sync_status = EXCLUDED.sync_status,
                last_synced_at = EXCLUDED.last_synced_at,
                deleted_locally = EXCLUDED.deleted_locally,
                michelin_id = EXCLUDED.michelin_id,
                michelin_stars = EXCLUDED.michelin_stars,
                michelin_distinction = EXCLUDED.michelin_distinction,
                michelin_description = EXCLUDED.michelin_description,
                michelin_url = EXCLUDED.michelin_url,
                google_place_id = EXCLUDED.google_place_id,
                google_rating = EXCLUDED.google_rating,
                google_total_ratings = EXCLUDED.google_total_ratings,
                google_price_level = EXCLUDED.google_price_level,
                metadata_json = EXCLUDED.metadata_json,
                updated_at = NOW()
            RETURNING id
        """, (
            name, description, transcription,
            latitude, longitude, address, location_entered_by,
            private_notes, public_notes,
            local_id, server_id, created_timestamp, curator_id, curator_name,
            sync_status, last_synced_at, deleted_locally,
            michelin_id, michelin_stars, michelin_distinction, michelin_description, michelin_url,
            google_place_id, google_rating, google_total_ratings, google_price_level,
            json.dumps({'michelin': michelin_data, 'google_places': google_places_data}) if (michelin_data or google_places_data) else None
        ))
        
        result = cursor.fetchone()
        return result[0] if result else None
        
    except Exception as e:
        logger.error(f"Error upserting restaurant: {str(e)}")
        return None


def process_curator_categories_v2(cursor, restaurant_id, restaurant_data):
    """
    Process curator categories for a restaurant in V2 format.
    """
    # Category mappings from V2 format
    category_fields = [
        'Cuisine', 'Menu', 'Price Range', 'Mood', 'Setting', 
        'Crowd', 'Suitable For', 'Food Style', 'Drinks', 'Special Features'
    ]
    
    for category_name in category_fields:
        if category_name in restaurant_data:
            values = restaurant_data[category_name]
            if isinstance(values, list):
                for value in values:
                    if value and value.strip():
                        # Get or create concept category
                        cursor.execute("""
                            INSERT INTO concept_categories (name) 
                            VALUES (%s) 
                            ON CONFLICT (name) DO NOTHING
                            RETURNING id
                        """, (category_name,))
                        
                        result = cursor.fetchone()
                        if result:
                            category_id = result[0]
                        else:
                            cursor.execute("SELECT id FROM concept_categories WHERE name = %s", (category_name,))
                            category_id = cursor.fetchone()[0]
                        
                        # Get or create concept
                        cursor.execute("""
                            INSERT INTO concepts (category_id, value) 
                            VALUES (%s, %s) 
                            ON CONFLICT (category_id, value) DO NOTHING
                            RETURNING id
                        """, (category_id, value.strip()))
                        
                        result = cursor.fetchone()
                        if result:
                            concept_id = result[0]
                        else:
                            cursor.execute(
                                "SELECT id FROM concepts WHERE category_id = %s AND value = %s", 
                                (category_id, value.strip())
                            )
                            concept_id = cursor.fetchone()[0]
                        
                        # Link restaurant to concept
                        cursor.execute("""
                            INSERT INTO restaurant_concepts (restaurant_id, concept_id) 
                            VALUES (%s, %s) 
                            ON CONFLICT (restaurant_id, concept_id) DO NOTHING
                        """, (restaurant_id, concept_id))


def process_photos_v2(cursor, restaurant_id, photos):
    """
    Process and store photos for a restaurant.
    """
    for photo in photos:
        photo_id = photo.get('id')
        photo_data = photo.get('photoData')
        captured_by = photo.get('capturedBy')
        timestamp = photo.get('timestamp')
        
        if photo_data:
            cursor.execute("""
                INSERT INTO restaurant_photos (
                    restaurant_id, photo_id, photo_data, captured_by, timestamp, created_at
                ) VALUES (%s, %s, %s, %s, %s, NOW())
                ON CONFLICT (restaurant_id, photo_id) DO UPDATE SET
                    photo_data = EXCLUDED.photo_data,
                    captured_by = EXCLUDED.captured_by,
                    timestamp = EXCLUDED.timestamp
            """, (restaurant_id, photo_id, photo_data, captured_by, timestamp))