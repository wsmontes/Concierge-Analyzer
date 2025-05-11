"""
Concierge Analyzer Flask Application
Main application file for the Concierge Analyzer service that processes restaurant data.
Dependencies: Flask, psycopg2, dotenv
"""

import psycopg2
from flask import request, jsonify, current_app

@app.route('/status', methods=['GET'])
def status():
    """Health check endpoint to verify server is running"""
    return jsonify({
        "status": "ok",
        "version": "1.1.2",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/curation', methods=['POST'])
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
            
        # Process the data
        success, message = process_curation_data(data)
        
        if success:
            return jsonify({"status": "success"}), 200
        else:
            app.logger.error(f"Data processing failed: {message}")
            return jsonify({"status": "error", "message": message}), 500
            
    except Exception as e:
        app.logger.error(f"Error in curation endpoint: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

def process_curation_data(data):
    """
    Process the curation data and insert it into the database.
    
    Args:
        data (dict): The JSON data received from the client
        
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
        
        # Process restaurants
        for restaurant in data.get("restaurants", []):
            name = restaurant.get("name")
            if not name:
                continue  # Skip entries without a name
                
            # Insert restaurant if not exists
            cursor.execute(
                """
                INSERT INTO restaurants (name, description, transcription, timestamp)
                VALUES (%s, %s, %s, NOW())
                ON CONFLICT (name) DO NOTHING
                """,
                (
                    name,
                    restaurant.get("description"),
                    restaurant.get("transcription")
                )
            )
        
        # Process concepts
        for concept in data.get("concepts", []):
            category_name = concept.get("category")
            value = concept.get("value")
            
            if not category_name or not value:
                continue  # Skip entries without category or value
                
            # Get category_id from concept_categories
            cursor.execute(
                """
                SELECT id FROM concept_categories WHERE name = %s
                """,
                (category_name,)
            )
            category_result = cursor.fetchone()
            
            if category_result:
                category_id = category_result[0]
                
                # Insert concept if not exists
                cursor.execute(
                    """
                    INSERT INTO concepts (category_id, value)
                    VALUES (%s, %s)
                    ON CONFLICT (category_id, value) DO NOTHING
                    """,
                    (category_id, value)
                )
            else:
                app.logger.warning(
                    f"Category '{category_name}' not found in concept_categories"
                )
        
        # Process restaurant concepts
        for rel in data.get("restaurantConcepts", []):
            restaurant_name = rel.get("restaurantName")
            concept_value = rel.get("conceptValue")
            
            if not restaurant_name or not concept_value:
                continue  # Skip entries without restaurant name or concept value
                
            # Get restaurant_id
            cursor.execute(
                """
                SELECT id FROM restaurants WHERE name = %s
                """,
                (restaurant_name,)
            )
            restaurant_result = cursor.fetchone()
            
            if restaurant_result:
                restaurant_id = restaurant_result[0]
                
                # Get concept_id
                cursor.execute(
                    """
                    SELECT c.id FROM concepts c
                    JOIN concept_categories cc ON c.category_id = cc.id
                    WHERE c.value = %s
                    """,
                    (concept_value,)
                )
                concept_result = cursor.fetchone()
                
                if concept_result:
                    concept_id = concept_result[0]
                    
                    # Insert restaurant_concept if not exists
                    cursor.execute(
                        """
                        INSERT INTO restaurant_concepts (restaurant_id, concept_id)
                        VALUES (%s, %s)
                        ON CONFLICT (restaurant_id, concept_id) DO NOTHING
                        """,
                        (restaurant_id, concept_id)
                    )
                else:
                    app.logger.warning(
                        f"Concept '{concept_value}' not found"
                    )
            else:
                app.logger.warning(
                    f"Restaurant '{restaurant_name}' not found"
                )
        
        # Commit the transaction
        conn.commit()
        
        return True, "Data processed successfully"
        
    except Exception as e:
        app.logger.error(f"Error processing curation data: {str(e)}")
        if conn:
            conn.rollback()
        return False, str(e)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
