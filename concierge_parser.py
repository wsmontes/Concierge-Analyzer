import re
import json
import pandas as pd
from datetime import datetime
import ast
from flask import Flask, render_template, jsonify, request

# No need for duplicate Flask instance - moved to central location
# app = Flask(__name__, static_folder="static", template_folder="templates")

import plotly.express as px
import plotly.graph_objects as go
import networkx as nx
from collections import defaultdict
import logging

# Setup logging more appropriately for PythonAnywhere
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

import traceback
from flask_cors import CORS

# Load environment variables, but use os.environ.get for more reliability
from dotenv import load_dotenv
import os
import io
import sys
import psycopg2  # Added for PostgreSQL database connectivity

# Get the correct paths for PythonAnywhere
PYTHONANYWHERE = 'PYTHONANYWHERE_DOMAIN' in os.environ
if PYTHONANYWHERE:
    # When running on PythonAnywhere, use these paths
    BASE_DIR = '/home/wsmontes/Concierge-Analyzer'
else:
    # When running locally, use these paths
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# carrega variáveis de ambiente
load_dotenv(os.path.join(BASE_DIR, '.env'))
FLASK_SERVER_URL = os.environ.get('FLASK_SERVER_URL', 'https://wsmontes.pythonanywhere.com' if PYTHONANYWHERE else 'http://localhost:5000')

# Initialize the Flask application
app = Flask(__name__, static_folder="static", template_folder="templates")
app.logger.setLevel(logging.INFO)
CORS(app)

# Configure CORS to allow requests from the frontend
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload

# Define the /api/curation endpoint for restaurant data curation
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

@app.route('/status', methods=['GET'])
def status():
    """Health check endpoint to verify server is running"""
    return jsonify({
        "status": "ok", 
        "version": "1.1.2",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/')
def index():
    logger.info("→ Entrou no index() do concierge_parser")
    return render_template('index.html')

@app.route('/ping')
def ping():
    return 'pong', 200

# Set up logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class PersonaAnalyzer:
    def __init__(self, csv_path=None):
        self.personas = []
        self.persona_inputs = {}
        self.persona_recommendations = {}
        
        if csv_path:
            self.load_personas_from_csv(csv_path)
    
    def load_personas_from_csv(self, csv_path):
        """Load personas from CSV file"""
        try:
            logger.info(f"Loading personas from: {csv_path}")
            df = pd.read_csv(csv_path)
            
            # Process each row in the CSV
            for _, row in df.iterrows():
                persona_id = row.get('No.')
                if not isinstance(persona_id, str) or not persona_id:
                    continue
                    
                persona = row.get('PERSONA', '')
                input_text = row.get('Input', '')
                
                # Get the recommended options (up to 3)
                options = []
                for i in range(1, 4):
                    option_col = f'Anwar - Option {i}'
                    if option_col in row and pd.notna(row[option_col]):
                        options.append(row[option_col])
                
                # Store the persona information
                persona_info = {
                    'id': persona_id,
                    'description': persona,
                    'input': input_text,
                    'recommendations': options
                }
                
                self.personas.append(persona_info)
                
                # Create lookup dictionaries for faster matching
                if input_text:
                    self.persona_inputs[input_text.lower()] = persona_id
                
                # Store recommendations by persona ID
                self.persona_recommendations[persona_id] = options
            
            logger.info(f"Loaded {len(self.personas)} personas")
            return True
        except Exception as e:
            logger.error(f"Error loading personas from CSV: {str(e)}")
            logger.error(traceback.format_exc())
            return False
    
    def match_conversation_to_persona(self, conversation):
        """Match a conversation to a persona based on user request"""
        user_request = next((msg['content'] for msg in conversation if msg['type'] == 'user_request'), None)
        
        if not user_request:
            return None
            
        # Try exact match first
        user_request_lower = user_request.lower().strip()
        if user_request_lower in self.persona_inputs:
            return self.persona_inputs[user_request_lower]
            
        # If no exact match, try fuzzy matching
        for input_text, persona_id in self.persona_inputs.items():
            # Simple similarity check - percentage of input_text words in user_request
            input_words = set(input_text.lower().split())
            request_words = set(user_request_lower.split())
            
            common_words = input_words.intersection(request_words)
            
            # If more than 70% of the words match, consider it a match
            if len(common_words) >= 0.7 * len(input_words):
                return persona_id
                
        return None
    
    def evaluate_recommendations(self, conversation, persona_id):
        """Evaluate how well the recommendations match the expected ones for the persona"""
        if not persona_id or persona_id not in self.persona_recommendations:
            return {
                'matched': False,
                'expected_recommendations': [],
                'actual_recommendations': [],
                'accuracy': 0,
                'precision': 0,
                'recall': 0,
                'extra_count': 0,
                'missing_count': 0,
                'position_analysis': []
            }
            
        # Get expected recommendations for this persona
        expected = self.persona_recommendations.get(persona_id, [])
        
        # Extract actual recommendations from the conversation
        actual = []
        for msg in conversation:
            if msg['type'] == 'recommendation':
                content = msg['content']
                # Extract restaurant names using regex
                restaurant_pattern = r'- ([^:]+?)(?=\s*–|\s*-|\s*\n|$)'
                extracted = re.findall(restaurant_pattern, content)
                actual = [rest.strip() for rest in extracted]
                break
        
        # Calculate accuracy (percentage of expected recommendations present in actual)
        matches = 0
        matched_items = []
        position_analysis = []
        
        for i, exp in enumerate(expected):
            matched = False
            matched_position = -1
            for j, act in enumerate(actual):
                # More precise matching algorithm to avoid confusing similar restaurant names
                # Check for exact match (case-insensitive) or high similarity
                if self._is_same_restaurant(exp, act):
                    matched = True
                    matched_items.append(exp)
                    matched_position = j
                    break
            
            # Record position analysis
            position_analysis.append({
                'expected': exp,
                'found': matched,
                'position': matched_position,
                'position_score': 1.0 if matched_position == i else 
                                  0.67 if matched_position >= 0 and matched_position < len(expected) else
                                  0.33 if matched_position >= 0 else 0
            })
            
            if matched:
                matches += 1
        
        # Calculate metrics
        accuracy = matches / len(expected) if expected else 0
        precision = matches / len(actual) if actual else 0
        recall = matches / len(expected) if expected else 0
        
        # Count extra and missing recommendations
        extra_count = len(actual) - matches if len(actual) > matches else 0
        missing_count = len(expected) - matches
        
        # Get list of extra recommendations
        extra_recommendations = [rec for rec in actual if not any(
            self._is_same_restaurant(exp, rec) for exp in expected
        )]
        
        return {
            'matched': True,
            'expected_recommendations': expected,
            'actual_recommendations': actual,
            'matched_items': matched_items,
            'extra_recommendations': extra_recommendations,
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'extra_count': extra_count,
            'missing_count': missing_count,
            'position_analysis': position_analysis
        }
    
    def _is_same_restaurant(self, name1, name2):
        """
        More precise algorithm to determine if two restaurant names refer to the same place
        """
        # Convert to lowercase for case-insensitive comparison
        name1 = name1.lower().strip()
        name2 = name2.lower().strip()
        
        # Exact match
        if name1 == name2:
            return True
        
        # Special case for restaurants with special characters or common words
        # Split into words and check word similarity
        words1 = set(name1.split())
        words2 = set(name2.split())
        
        # Very common words in restaurant names that shouldn't determine a match by themselves
        common_words = {'the', 'restaurant', 'café', 'cafe', 'bar', 'grill', 'bistro', 'kitchen'}
        
        # Remove common words for comparison
        filtered_words1 = words1 - common_words
        filtered_words2 = words2 - common_words
        
        # Check if one is a subset of the other, but only if they share substantial words
        # This prevents "Parigi" from matching with "Bistrot Parigi"
        if filtered_words1 and filtered_words2:
            shared_words = filtered_words1.intersection(filtered_words2)
            # Only consider a match if they share significant unique words AND
            # the length difference isn't too great (to avoid matching distinct places like "Parigi" vs "Bistrot Parigi")
            if len(shared_words) >= min(len(filtered_words1), len(filtered_words2)) * 0.8:
                # Additional length check to distinguish "Parigi" from "Bistrot Parigi"
                shorter = name1 if len(name1) < len(name2) else name2
                longer = name2 if len(name1) < len(name2) else name1
                
                # If the longer name is significantly longer, it's probably a different restaurant
                # Unless the shorter name is fully contained as a distinct word in the longer name
                if len(longer) > len(shorter) * 1.5:
                    # Check if shorter name appears as a complete word in longer name
                    longer_words = longer.split()
                    # Not a match if shorter name is just one word in a multi-word longer name
                    if shorter in longer_words and len(longer_words) > 1:
                        return False
                    
                return True
        
        return False

class ConciergeParser:
    def __init__(self):
        self.conversations = []
        self.current_conversation = []
        self.debug_data = []
        self.persona_analyzer = None
        self.sheet_restaurants = []  # New property to store restaurant names from sheets
        
    def load_personas(self, csv_path):
        """Load personas from CSV file"""
        self.persona_analyzer = PersonaAnalyzer(csv_path)
        return len(self.persona_analyzer.personas) > 0
        
    def parse_whatsapp_chat(self, chat_text):
        """Parse WhatsApp chat text into structured conversations"""
        # Reset data
        self.conversations = []
        self.current_conversation = []
        self.debug_data = []
        
        logger.info(f"Starting to parse chat data of length {len(chat_text)}")
        
        try:
            # Regular expression to match WhatsApp message format
            message_pattern = r'\[(.*?)\] (.*?): (.*?)(?=\[\d{4}-\d{2}-\d{2}|$)'
            
            # Find all messages
            messages = re.findall(message_pattern, chat_text, re.DOTALL)
            logger.info(f"Found {len(messages)} messages in chat")
            
            # Process each message
            conversation_id = 0
            previous_sender = None
            
            for i, (timestamp_str, sender, content) in enumerate(messages):
                # Parse timestamp
                timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d, %I:%M:%S %p')
                
                # Create message object
                message = {
                    'timestamp': timestamp,
                    'sender': sender,
                    'content': content.strip(),
                    'type': self._determine_message_type(content.strip(), sender),
                    'conversation_id': conversation_id
                }
                
                # Extract debug data if present
                if message['type'] == 'debug':
                    debug_info = self._extract_debug_info(content.strip())
                    if debug_info:
                        message['debug_info'] = debug_info
                        self.debug_data.append({
                            'conversation_id': conversation_id,
                            'timestamp': timestamp,
                            'debug_type': debug_info['type'],
                            'data': debug_info['data']
                        })
                
                # Check if this is a new conversation
                if sender == 'Wagner' and (previous_sender != 'Wagner' or i == 0):
                    if i > 0:
                        self.conversations.append(self.current_conversation)
                        conversation_id += 1
                    self.current_conversation = []
                
                # Add message to current conversation
                self.current_conversation.append(message)
                previous_sender = sender
            
            # Add the last conversation
            if self.current_conversation:
                self.conversations.append(self.current_conversation)
                
            # Perform persona matching if persona data is loaded
            if self.persona_analyzer:
                self.analyze_personas()
                
            logger.info(f"Parsed {len(self.conversations)} conversations")
            return self.conversations
        except Exception as e:
            logger.error(f"Error parsing chat: {str(e)}")
            logger.error(traceback.format_exc())
            raise
    
    def _determine_message_type(self, content, sender):
        """Determine the type of message based on content and sender"""
        if sender == 'Wagner':
            return 'user_request'
        elif 'Please, wait' in content or 'Por favor, aguarde' in content:
            return 'processing'
        elif content.startswith('[DEBUG]'):
            return 'debug'
        elif '‎audio omitted' in content:
            return 'audio'
        else:
            return 'recommendation'
    
    def _extract_debug_info(self, content):
        """Extract structured information from debug messages"""
        if '[DEBUG] Metadados relacionados' in content:
            try:
                # Extract the metadata list
                metadata_str = content.replace('[DEBUG] Metadados relacionados ', '')
                metadata_data = ast.literal_eval(metadata_str)
                return {
                    'type': 'metadata',
                    'data': metadata_data
                }
            except:
                return None
                
        elif '[DEBUG] Contexto entendido' in content:
            try:
                # Extract the context dictionary
                context_str = content.replace('[DEBUG] Contexto entendido: ', '')
                context_data = ast.literal_eval(context_str)
                return {
                    'type': 'context',
                    'data': context_data
                }
            except:
                return None
                
        elif '[DEBUG] Restaurantes candidatos' in content:
            try:
                # Extract the restaurants dictionary
                restaurants_str = content.replace('[DEBUG] Restaurantes candidatos: ', '')
                restaurants_data = ast.literal_eval(restaurants_str)
                return {
                    'type': 'candidates',
                    'data': restaurants_data
                }
            except:
                return None
        
        return None
    
    def analyze_personas(self):
        """Match conversations to personas and evaluate recommendations"""
        if not self.persona_analyzer:
            logger.warning("No persona data loaded, skipping persona analysis")
            return
            
        for i, conversation in enumerate(self.conversations):
            # Match the conversation to a persona
            persona_id = self.persona_analyzer.match_conversation_to_persona(conversation)
            
            if persona_id:
                # Evaluate recommendation accuracy
                evaluation = self.persona_analyzer.evaluate_recommendations(conversation, persona_id)
                
                # If we have sheet restaurants, try to match expected recommendations to sheet names
                if self.sheet_restaurants and 'expected_recommendations' in evaluation:
                    matched_expected = []
                    for rec in evaluation['expected_recommendations']:
                        sheet_match = self.match_restaurant_to_sheet(rec)
                        matched_expected.append({
                            'original': rec,
                            'sheet_match': sheet_match,
                            'name': sheet_match if sheet_match else rec
                        })
                    evaluation['matched_expected'] = matched_expected
                
                # Find matching persona info
                persona_info = next((p for p in self.persona_analyzer.personas if p['id'] == persona_id), None)
                
                # Store the persona and evaluation information with the conversation
                for msg in conversation:
                    msg['persona_id'] = persona_id
                    if persona_info:
                        msg['persona_description'] = persona_info.get('description', '')
                
                # Store evaluation with the recommendation message
                for msg in conversation:
                    if msg['type'] == 'recommendation':
                        msg['recommendation_evaluation'] = evaluation
                        break
    
    def get_conversation_metrics(self):
        """Generate metrics for all conversations"""
        metrics = []
        
        for i, conversation in enumerate(self.conversations):
            # Extract request
            user_request = next((msg['content'] for msg in conversation if msg['type'] == 'user_request'), None)
            
            # Extract timestamps for different response time calculations
            request_time = next((msg['timestamp'] for msg in conversation if msg['type'] == 'user_request'), None)
            first_response_time = next((msg['timestamp'] for msg in conversation 
                                       if msg['type'] not in ['user_request'] and 
                                       msg['sender'] != 'Wagner'), None)
            processing_time = next((msg['timestamp'] for msg in conversation if msg['type'] == 'processing'), None)
            recommendation_time = next((msg['timestamp'] for msg in conversation if msg['type'] == 'recommendation'), None)
            last_message_time = conversation[-1]['timestamp'] if conversation else None
            
            # Calculate different response time metrics
            time_to_first_response = None
            time_to_processing = None
            time_to_recommendation = None
            total_conversation_time = None
            
            if request_time and first_response_time:
                time_to_first_response = (first_response_time - request_time).total_seconds()
                
            if request_time and processing_time:
                time_to_processing = (processing_time - request_time).total_seconds()
                
            if request_time and recommendation_time:
                time_to_recommendation = (recommendation_time - request_time).total_seconds()
                
            if request_time and last_message_time:
                total_conversation_time = (last_message_time - request_time).total_seconds()
            
            # Count debug messages
            debug_count = sum(1 for msg in conversation if msg['type'] == 'debug')
            
            # Extract metadata count if available
            metadata_count = 0
            context_keys = []
            for msg in conversation:
                if msg['type'] == 'debug' and 'debug_info' in msg:
                    if msg['debug_info']['type'] == 'metadata':
                        metadata_count = len(msg['debug_info']['data'])
                    elif msg['debug_info']['type'] == 'context':
                        if 'results' in msg['debug_info']['data']:
                            context_keys = list(msg['debug_info']['data']['results'].keys())
            
            # Add persona information if available
            persona_id = next((msg.get('persona_id') for msg in conversation if 'persona_id' in msg), None)
            persona_description = next((msg.get('persona_description') for msg in conversation if 'persona_description' in msg), None)
            
            # Add recommendation evaluation if available
            recommendation_accuracy = None
            for msg in conversation:
                if msg['type'] == 'recommendation' and 'recommendation_evaluation' in msg:
                    evaluation = msg['recommendation_evaluation']
                    recommendation_accuracy = evaluation.get('accuracy')
                    break
            
            metrics_item = {
                'conversation_id': i,
                'request': user_request,
                'time_to_first_response': time_to_first_response,
                'time_to_processing': time_to_processing,
                'time_to_recommendation': time_to_recommendation,
                'total_conversation_time': total_conversation_time,
                'debug_count': debug_count,
                'metadata_count': metadata_count,
                'context_keys': context_keys
            }
            
            # Add persona information if available
            if persona_id:
                metrics_item['persona_id'] = persona_id
                metrics_item['persona_description'] = persona_description
                
            # Add recommendation accuracy if available
            if recommendation_accuracy is not None:
                metrics_item['recommendation_accuracy'] = recommendation_accuracy
            
            metrics.append(metrics_item)
        
        return metrics
    
    def match_restaurant_to_sheet(self, restaurant_name):
        """Match a restaurant name to a sheet restaurant name using similarity matching"""
        if not self.sheet_restaurants or not restaurant_name:
            return None
            
        # First try exact match (case insensitive)
        for sheet_name in self.sheet_restaurants:
            if restaurant_name.lower().strip() == sheet_name.lower().strip():
                return sheet_name
                
        # If no exact match, try restaurant name similarity algorithm
        if self.persona_analyzer:
            for sheet_name in self.sheet_restaurants:
                if self.persona_analyzer._is_same_restaurant(restaurant_name, sheet_name):
                    return sheet_name
                    
        return None
    
    def extract_restaurant_recommendations(self):
        """Extract restaurant recommendations from all conversations"""
        recommendations = []
        
        for i, conversation in enumerate(self.conversations):
            # Get user request
            user_request = next((msg['content'] for msg in conversation if msg['type'] == 'user_request'), "No request")
            
            # Get recommendation content
            recommendation_msg = next((msg for msg in conversation if msg['type'] == 'recommendation'), None)
            
            if recommendation_msg:
                # Extract restaurant names (this is a simple extraction; might need refinement)
                content = recommendation_msg['content']
                # Look for restaurant names that are typically followed by a dash or hyphen
                restaurant_pattern = r'[-–]\s*(.*?)(?=\s*[-–]|\n|$)'
                potential_restaurants = re.findall(r'- ([^:]+?)(?=\s*–|\s*-|\s*\n|$)', content)
                
                # Match potential restaurants with sheet restaurants
                matched_restaurants = []
                for restaurant in potential_restaurants:
                    sheet_match = self.match_restaurant_to_sheet(restaurant)
                    matched_restaurants.append({
                        'extracted': restaurant,
                        'sheet_match': sheet_match,
                        'name': sheet_match if sheet_match else restaurant  # Use sheet name if matched
                    })
                
                # Add candidate restaurants from debug data if available
                candidate_restaurants = []
                for msg in conversation:
                    if msg['type'] == 'debug' and 'debug_info' in msg:
                        if msg['debug_info']['type'] == 'candidates' and 'results' in msg['debug_info']['data']:
                            for key, values in msg['debug_info']['data']['results'].items():
                                if isinstance(values, list):
                                    for value in values:
                                        if ' -> ' in value:
                                            parts = value.split(' -> ')
                                            if len(parts) > 1:
                                                candidate_name = parts[1]
                                                sheet_match = self.match_restaurant_to_sheet(candidate_name)
                                                candidate_restaurants.append({
                                                    'category': key,
                                                    'extracted': candidate_name,
                                                    'sheet_match': sheet_match,
                                                    'name': sheet_match if sheet_match else candidate_name
                                                })
                
                # Get persona information if available
                persona_id = next((msg.get('persona_id') for msg in conversation if 'persona_id' in msg), None)
                persona_description = next((msg.get('persona_description') for msg in conversation if 'persona_description' in msg), None)
                
                # Get recommendation evaluation if available
                evaluation = recommendation_msg.get('recommendation_evaluation', {})
                expected_recommendations = evaluation.get('expected_recommendations', [])
                accuracy = evaluation.get('accuracy', None)
                
                # If we have sheet restaurants and expected recommendations, match those too
                matched_expected = []
                if expected_recommendations and self.sheet_restaurants:
                    for rec in expected_recommendations:
                        sheet_match = self.match_restaurant_to_sheet(rec)
                        matched_expected.append({
                            'extracted': rec,
                            'sheet_match': sheet_match,
                            'name': sheet_match if sheet_match else rec
                        })
                
                recommendation_item = {
                    'conversation_id': i,
                    'request': user_request,
                    'potential_restaurants': potential_restaurants,  # Keep original for backward compatibility
                    'matched_restaurants': matched_restaurants,     # New field with matching information
                    'candidate_restaurants': candidate_restaurants,
                    'sheet_restaurants': self.sheet_restaurants,
                    'full_recommendation': content
                }
                
                # Add persona information if available
                if persona_id:
                    recommendation_item['persona_id'] = persona_id
                    recommendation_item['persona_description'] = persona_description
                    
                # Add recommendation evaluation if available
                if evaluation:
                    recommendation_item['expected_restaurants'] = expected_recommendations  # Keep original
                    recommendation_item['matched_expected'] = matched_expected              # Add matched version
                    recommendation_item['accuracy'] = accuracy
                
                recommendations.append(recommendation_item)
        
        return recommendations

    def extract_sheet_restaurants(self, file):
        """Extract restaurant names from sheet names in Excel files"""
        self.sheet_restaurants = []
        try:
            if file.filename.endswith(('.xlsx', '.xls')):
                # Save the file to a temporary in-memory file
                file_data = file.read()
                file.seek(0)  # Reset file pointer for future reads
                
                # Use pandas for both xlsx and xls files
                xls = pd.ExcelFile(io.BytesIO(file_data))
                all_sheet_names = xls.sheet_names
                
                # Known list of non-restaurant sheet names to filter out
                non_restaurant_sheets = {
                    'sheet1', 'sheet2', 'sheet3', 'sheet4', 'sheet5',
                    'index', 'data', 'info', 'summary', 'contents', 'cover'
                }
                
                # Filter out known non-restaurant sheets (case insensitive)
                self.sheet_restaurants = [
                    name for name in all_sheet_names 
                    if name.lower().strip() not in non_restaurant_sheets
                ]
                
                # Additional validation for known Excel structure
                # Sheet names with just numbers or special patterns are likely not restaurants
                self.sheet_restaurants = [
                    name for name in self.sheet_restaurants
                    if not name.strip().isdigit() and  # Exclude purely numeric names
                    not name.strip().startswith('_') and  # Exclude names starting with underscore
                    len(name.strip()) > 1  # Ensure name has more than 1 character
                ]
                
                # Sort alphabetically for consistent display
                self.sheet_restaurants.sort()
                
                logger.info(f"Extracted {len(self.sheet_restaurants)} restaurant names from sheets: {self.sheet_restaurants}")
                return self.sheet_restaurants
            return []
        except Exception as e:
            logger.error(f"Error extracting sheet restaurants with pandas: {str(e)}")
            logger.error(traceback.format_exc())
            return []

    def generate_metadata_network(self):
        """Generate network graph data from metadata relationships"""
        G = nx.Graph()
        
        # Process all debug metadata
        for debug in self.debug_data:
            if debug['debug_type'] == 'metadata':
                for item in debug['data']:
                    if ' -> ' in item:
                        category, value = item.split(' -> ')
                        G.add_node(category, type='category')
                        G.add_node(value, type='value')
                        G.add_edge(category, value)
        
        # Convert to format suitable for visualization
        nodes = [{'id': node, 'type': G.nodes[node]['type']} for node in G.nodes()]
        edges = [{'source': u, 'target': v} for u, v in G.edges()]
        
        return {'nodes': nodes, 'edges': edges}
    
    def get_persona_analysis_summary(self):
        """Generate summary statistics for persona analysis"""
        if not self.persona_analyzer:
            return {
                'persona_count': 0,
                'matched_conversations': 0,
                'avg_accuracy': 0,
                'avg_precision': 0,
                'avg_recall': 0,
                'accuracy_distribution': {},
                'recommendation_counts': {}
            }
            
        # Count matched conversations
        matched_conversations = 0
        accuracies = []
        precisions = []
        recalls = []
        recommendation_counts = defaultdict(int)
        
        for conversation in self.conversations:
            has_persona = any('persona_id' in msg for msg in conversation)
            if has_persona:
                matched_conversations += 1
                
                # Get accuracy if available
                for msg in conversation:
                    if msg['type'] == 'recommendation' and 'recommendation_evaluation' in msg:
                        eval_data = msg['recommendation_evaluation']
                        
                        # Add metrics
                        if 'accuracy' in eval_data:
                            accuracies.append(eval_data['accuracy'])
                        if 'precision' in eval_data:
                            precisions.append(eval_data['precision'])
                        if 'recall' in eval_data:
                            recalls.append(eval_data['recall'])
                        
                        # Count number of recommendations
                        actual_count = len(eval_data.get('actual_recommendations', []))
                        recommendation_counts[actual_count] += 1
        
        # Calculate averages
        avg_accuracy = sum(accuracies) / len(accuracies) if accuracies else 0
        avg_precision = sum(precisions) / len(precisions) if precisions else 0
        avg_recall = sum(recalls) / len(recalls) if recalls else 0
        
        # Create accuracy distribution
        accuracy_distribution = {
            '0-25%': len([a for a in accuracies if a <= 0.25]),
            '26-50%': len([a for a in accuracies if 0.25 < a <= 0.5]),
            '51-75%': len([a for a in accuracies if 0.5 < a <= 0.75]),
            '76-100%': len([a for a in accuracies if a > 0.75])
        }
        
        return {
            'persona_count': len(self.persona_analyzer.personas),
            'matched_conversations': matched_conversations,
            'avg_accuracy': avg_accuracy,
            'avg_precision': avg_precision,
            'avg_recall': avg_recall,
            'accuracy_distribution': accuracy_distribution,
            'recommendation_counts': dict(recommendation_counts)
        }

# Initialize the parser and debug analyzer 
parser = ConciergeParser()

# Import the DebugAnalyzer class
try:
    from debug_analyzer import DebugAnalyzer
    # Initialize a debug analyzer instance
    debug_analyzer = DebugAnalyzer()
    debug_analyzer_available = True
except ImportError:
    logger.warning("DebugAnalyzer module not found, debug analysis features will be disabled")
    debug_analyzer_available = False

@app.route('/dashboard')
def dashboard():
    """Route that renders the full dashboard application."""
    return render_template('index.html')

@app.route('/test', methods=['GET'])
def test():
    return jsonify({"status": "ok", "message": "Flask server is running", "environment": "PythonAnywhere" if PYTHONANYWHERE else "Local"})

@app.route('/upload', methods=['POST'])
def upload_chat():
    logger.info("Received upload request")
    
    if 'file' not in request.files:
        logger.warning("No file uploaded in request")
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        logger.warning("Empty filename in uploaded file")
        return jsonify({'error': 'Empty filename'}), 400
    
    try:
        logger.info(f"Processing uploaded file: {file.filename}")
        
        # Check file type and extract sheet names if it's an Excel file
        excel_file_processed = False
        if file.filename.endswith(('.xlsx', '.xls')):
            sheet_restaurants = parser.extract_sheet_restaurants(file)
            excel_file_processed = True
            # For Excel files, we need to convert the chat content to text
            # This assumes the chat is in the first sheet or you need to 
            # specify which sheet contains the chat content
            df = pd.read_excel(file)
            chat_text = df.to_csv(index=False)
        else:
            chat_text = file.read().decode('utf-8')
            
        logger.info(f"File decoded successfully, length: {len(chat_text)}")
        
        # Load persona data if not already loaded
        if not parser.persona_analyzer:
            # Updated path to use the BASE_DIR
            persona_csv_path = os.path.join(BASE_DIR, "Concierge - Personas.csv")
            parser.load_personas(persona_csv_path)
        
        conversations = parser.parse_whatsapp_chat(chat_text)
        logger.info(f"Parsed {len(conversations)} conversations")
        
        # Create a summary of conversations for PDF export
        conversation_summaries = []
        for i, conversation in enumerate(conversations):
            # Only include key information for the PDF summary
            summary = {
                'id': i,
                'request': next((msg['content'] for msg in conversation if msg['type'] == 'user_request'), 'No request'),
                'recommendation': next((msg['content'] for msg in conversation if msg['type'] == 'recommendation'), 'No recommendation'),
                'timestamp': next((msg['timestamp'].isoformat() for msg in conversation if msg['type'] == 'user_request'), None),
            }
            conversation_summaries.append(summary)
        
        metrics = parser.get_conversation_metrics()
        logger.info(f"Generated metrics for {len(metrics)} conversations")
        
        recommendations = parser.extract_restaurant_recommendations()
        logger.info(f"Extracted {len(recommendations)} recommendations")
        
        network_data = parser.generate_metadata_network()
        logger.info(f"Generated network with {len(network_data.get('nodes', []))} nodes and {len(network_data.get('edges', []))} edges")
        
        # Get persona analysis summary
        persona_summary = parser.get_persona_analysis_summary()
        logger.info(f"Generated persona analysis summary with {persona_summary.get('persona_count', 0)} personas")
        
        response_data = {
            'conversation_count': len(conversations),
            'metrics': metrics,
            'recommendations': recommendations,
            'network': network_data,
            'persona_summary': persona_summary,
            'conversation_summaries': conversation_summaries,  # Include summaries in the response
            'sheet_restaurants': parser.sheet_restaurants,  # Add sheet restaurants to the response
            'excel_file_processed': excel_file_processed  # Add flag to indicate Excel file was processed
        }
        
        # Verify the response can be serialized to JSON
        json_response = json.dumps(response_data)
        logger.info(f"Response JSON created successfully, length: {len(json_response)}")
        
        return jsonify(response_data)
    except Exception as e:
        logger.error(f"Error processing upload: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': f"Server error: {str(e)}"}), 500

@app.route('/conversation/<int:conversation_id>')
def get_conversation(conversation_id):
    try:
        if conversation_id < 0 or conversation_id >= len(parser.conversations):
            logger.warning(f"Invalid conversation ID requested: {conversation_id}")
            return jsonify({'error': 'Invalid conversation ID'}), 404
        
        # Convert complex objects like datetime to string for JSON serialization
        conversation_data = []
        for msg in parser.conversations[conversation_id]:
            msg_copy = msg.copy()
            if 'timestamp' in msg_copy:
                msg_copy['timestamp'] = msg_copy['timestamp'].isoformat()
            conversation_data.append(msg_copy)
        
        return jsonify(conversation_data)
    except Exception as e:
        logger.error(f"Error getting conversation: {str(e)}")
        return jsonify({'error': f"Server error: {str(e)}"}), 500

@app.route('/metrics')
def get_metrics():
    try:
        return jsonify(parser.get_conversation_metrics())
    except Exception as e:
        logger.error(f"Error getting metrics: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/recommendations')
def get_recommendations():
    try:
        return jsonify(parser.extract_restaurant_recommendations())
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/network')
def get_network():
    try:
        return jsonify(parser.generate_metadata_network())
    except Exception as e:
        logger.error(f"Error generating network: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/personas')
def get_personas():
    try:
        if not parser.persona_analyzer:
            # Updated path to use BASE_DIR
            persona_csv_path = os.path.join(BASE_DIR, "Concierge - Personas.csv")
            parser.load_personas(persona_csv_path)
            
        return jsonify(parser.persona_analyzer.personas)
    except Exception as e:
        logger.error(f"Error getting personas: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/persona_summary')
def get_persona_summary():
    try:
        return jsonify(parser.get_persona_analysis_summary())
    except Exception as e:
        logger.error(f"Error getting persona summary: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/debug_analysis')
def get_debug_analysis():
    """Get comprehensive debug data analysis."""
    try:
        if not debug_analyzer_available:
            return jsonify({'error': 'Debug analyzer not available'}), 501
            
        # Make sure the debug analyzer has the latest conversations
        debug_analyzer.load_conversations(parser.conversations)
        
        # Generate global insights
        global_insights = debug_analyzer.generate_global_insights()
        
        # Get network data
        network_data = debug_analyzer.generate_network_data()
        
        # Get cross-recommendation insights
        cross_insights = debug_analyzer.get_cross_recommendations_insights()
        
        return jsonify({
            'global_insights': global_insights,
            'network_data': network_data,
            'cross_insights': cross_insights
        })
    except Exception as e:
        logger.error(f"Error generating debug analysis: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/debug_analysis/<int:conversation_id>')
def get_conversation_debug_analysis(conversation_id):
    """Get debug analysis for a specific conversation."""
    try:
        if not debug_analyzer_available:
            return jsonify({'error': 'Debug analyzer not available'}), 501
            
        # Get analysis for the specified conversation
        analysis = debug_analyzer.analyze_conversation_debug(conversation_id)
        return jsonify(analysis)
    except Exception as e:
        logger.error(f"Error generating conversation debug analysis: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

# Add a new endpoint to get sheet restaurants
@app.route('/sheet_restaurants')
def get_sheet_restaurants():
    try:
        # If we don't have sheet restaurants yet but we have a persona_analyzer
        # that might have restaurant data, try to extract known restaurant names
        if not parser.sheet_restaurants and parser.persona_analyzer:
            # Look for restaurant names in existing data
            known_restaurants = set()
            
            # Try to find restaurant names in recommendation evaluations
            for conversation in parser.conversations:
                for msg in conversation:
                    if msg.get('type') == 'recommendation' and 'recommendation_evaluation' in msg:
                        eval_data = msg.get('recommendation_evaluation', {})
                        if 'expected_recommendations' in eval_data:
                            for restaurant in eval_data['expected_recommendations']:
                                if restaurant and len(restaurant) > 2:  # Basic validation
                                    known_restaurants.add(restaurant)
            
            # If we found any restaurants, add them to sheet_restaurants
            if known_restaurants:
                parser.sheet_restaurants = list(known_restaurants)
                parser.sheet_restaurants.sort()
                logger.info(f"Added {len(parser.sheet_restaurants)} known restaurants from evaluation data")
        
        return jsonify(parser.sheet_restaurants)
    except Exception as e:
        logger.error(f"Error getting sheet restaurants: {str(e)}")
        return jsonify({'error': str(e)}), 500

# This block won't run when imported by the WSGI file on PythonAnywhere
# but will run when executing the script directly during development
if __name__ == "__main__":
    # Only run the server directly when not on PythonAnywhere
    if not PYTHONANYWHERE:
        logger.info("Starting Flask server on http://localhost:5000")
        app.run(host='0.0.0.0', port=5000, debug=True)
    else:
        logger.info("Running on PythonAnywhere - server will be started by WSGI")
