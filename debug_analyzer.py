"""
Debug Analyzer Module
Purpose: Extract advanced insights from conversation debug data
Dependencies: pandas, numpy, networkx, collections, logging
"""

import pandas as pd
import numpy as np
from collections import defaultdict, Counter
import networkx as nx
import logging
import traceback
from typing import List, Dict, Any, Optional, Tuple, Union
import matplotlib.pyplot as plt
from io import BytesIO
import base64
import json

# Set up logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DebugAnalyzer:
    """Class for analyzing and extracting insights from debug messages in conversations."""
    
    def __init__(self):
        self.conversations = []
        self.debug_messages = []
        self.concept_network = nx.Graph()
        self.restaurant_network = nx.Graph()
        self.category_counts = Counter()
        self.concept_counts = Counter()
        self.restaurant_counts = Counter()
        self.category_concept_map = defaultdict(list)
        self.conversation_concepts = defaultdict(list)
        
    def load_conversations(self, conversations):
        """Load conversations for analysis."""
        self.conversations = conversations
        self.extract_debug_data()
        self.build_networks()
        logger.info(f"Loaded {len(self.conversations)} conversations with {len(self.debug_messages)} debug messages")
        
    def extract_debug_data(self):
        """Extract and structure all debug data from conversations."""
        self.debug_messages = []
        
        for conv_idx, conversation in enumerate(self.conversations):
            # Extract all debug messages from the conversation
            conv_debug = []
            
            for msg_idx, message in enumerate(conversation):
                if message['type'] == 'debug' and 'debug_info' in message:
                    debug_info = message['debug_info'].copy()
                    debug_info['conversation_id'] = conv_idx
                    debug_info['message_idx'] = msg_idx
                    debug_info['timestamp'] = message['timestamp']
                    conv_debug.append(debug_info)
            
            # Sort debug messages by their order in the conversation
            conv_debug.sort(key=lambda x: x['message_idx'])
            
            # Add to the main debug messages list
            self.debug_messages.extend(conv_debug)
            
    def build_networks(self):
        """Build network graphs from debug data for analysis."""
        # Reset networks and counters
        self.concept_network = nx.Graph()
        self.restaurant_network = nx.Graph()
        self.category_counts = Counter()
        self.concept_counts = Counter()
        self.restaurant_counts = Counter()
        self.category_concept_map = defaultdict(list)
        self.conversation_concepts = defaultdict(list)
        
        # Process metadata relationships (first debug messages)
        for debug in self.debug_messages:
            if debug['type'] == 'metadata' and 'data' in debug:
                conv_id = debug['conversation_id']
                
                for item in debug['data']:
                    if ' -> ' in item:
                        category, value = item.split(' -> ')
                        
                        # Add to category counts
                        self.category_counts[category] += 1
                        
                        # Add to concept counts
                        self.concept_counts[value] += 1
                        
                        # Add to category-concept map
                        if value not in self.category_concept_map[category]:
                            self.category_concept_map[category].append(value)
                        
                        # Add to conversation-concept map
                        self.conversation_concepts[conv_id].append((category, value))
                        
                        # Add to network
                        self.concept_network.add_node(category, type='category')
                        self.concept_network.add_node(value, type='concept')
                        self.concept_network.add_edge(category, value)
            
            # Process restaurant candidates (third debug messages)
            elif debug['type'] == 'candidates' and 'data' in debug:
                if 'results' in debug['data']:
                    for category, restaurants in debug['data']['results'].items():
                        if isinstance(restaurants, list):
                            # Add category as a node
                            self.restaurant_network.add_node(category, type='category')
                            
                            # Process restaurants
                            for restaurant_entry in restaurants:
                                if ' -> ' in restaurant_entry:
                                    score, restaurant = restaurant_entry.split(' -> ')
                                    
                                    # Extract just the score number
                                    try:
                                        score = float(score.strip())
                                    except ValueError:
                                        score = 0.0
                                    
                                    # Add restaurant to counts
                                    self.restaurant_counts[restaurant] += 1
                                    
                                    # Add to network
                                    self.restaurant_network.add_node(restaurant, type='restaurant')
                                    self.restaurant_network.add_edge(category, restaurant, weight=score)
                                    
    def get_conversation_debug_sequence(self, conversation_id):
        """Get the full debug sequence for a specific conversation."""
        conv_debug = [d for d in self.debug_messages if d['conversation_id'] == conversation_id]
        return sorted(conv_debug, key=lambda x: x['message_idx'])
    
    def analyze_concept_evolution(self, conversation_id):
        """Analyze how concepts evolve through the debug sequence in a conversation."""
        debug_sequence = self.get_conversation_debug_sequence(conversation_id)
        
        # Track concepts through the debug sequence
        concepts_evolution = {
            'metadata': [],
            'context': {},
            'candidates': []
        }
        
        for debug in debug_sequence:
            debug_type = debug['type']
            
            if debug_type == 'metadata':
                # Extract concepts from metadata
                concepts = []
                for item in debug.get('data', []):
                    if ' -> ' in item:
                        category, value = item.split(' -> ')
                        concepts.append({
                            'category': category,
                            'value': value
                        })
                    else:
                        concepts.append({
                            'category': 'uncategorized',
                            'value': item
                        })
                concepts_evolution['metadata'] = concepts
                
            elif debug_type == 'context':
                # Extract context information
                if 'results' in debug.get('data', {}):
                    context_data = debug['data']['results']
                    concepts_evolution['context'] = context_data
                    
            elif debug_type == 'candidates':
                # Extract candidate restaurants
                candidates = []
                if 'results' in debug.get('data', {}):
                    for category, restaurants in debug['data']['results'].items():
                        category_candidates = []
                        if isinstance(restaurants, list):
                            for restaurant_entry in restaurants:
                                if ' -> ' in restaurant_entry:
                                    score_str, name = restaurant_entry.split(' -> ')
                                    try:
                                        score = float(score_str.strip())
                                    except ValueError:
                                        score = 0.0
                                    category_candidates.append({
                                        'name': name,
                                        'score': score
                                    })
                        
                        candidates.append({
                            'category': category,
                            'restaurants': category_candidates
                        })
                concepts_evolution['candidates'] = candidates
        
        return concepts_evolution
    
    def get_category_hierarchy(self):
        """Extract a hierarchical structure of categories and their concepts."""
        hierarchy = {}
        
        for category, concepts in self.category_concept_map.items():
            # Get frequency count for each concept
            concept_freq = [(c, self.concept_counts[c]) for c in concepts]
            # Sort by frequency
            concept_freq.sort(key=lambda x: x[1], reverse=True)
            
            hierarchy[category] = concept_freq
            
        return hierarchy
    
    def get_top_restaurants(self, n=10):
        """Get the top N most frequently suggested restaurants."""
        return self.restaurant_counts.most_common(n)
    
    def get_top_categories(self, n=10):
        """Get the top N most frequently used categories."""
        return self.category_counts.most_common(n)
    
    def get_top_concepts(self, n=10):
        """Get the top N most frequently mentioned concepts."""
        return self.concept_counts.most_common(n)
    
    def analyze_concept_relationships(self):
        """Analyze relationships between concepts based on co-occurrence patterns."""
        # Count pairs of concepts that appear in the same conversation
        concept_pairs = Counter()
        
        # For each conversation, find all unique concept pairs
        for conv_id, concept_list in self.conversation_concepts.items():
            # Get unique concepts in this conversation
            unique_concepts = list(set((cat, val) for cat, val in concept_list))
            
            # Count all pairs (only count each pair once per conversation)
            for i in range(len(unique_concepts)):
                for j in range(i+1, len(unique_concepts)):
                    # Make concept pair order consistent
                    pair = (
                        f"{unique_concepts[i][0]}: {unique_concepts[i][1]}",
                        f"{unique_concepts[j][0]}: {unique_concepts[j][1]}"
                    )
                    concept_pairs[pair] += 1
        
        # Return most common pairs
        return concept_pairs.most_common(20)
    
    def analyze_conversation_debug(self, conversation_id):
        """Generate a comprehensive analysis of debug data for a specific conversation."""
        debug_sequence = self.get_conversation_debug_sequence(conversation_id)
        if not debug_sequence:
            return {'error': 'No debug data found for this conversation'}
            
        # Get user request from the conversation
        request = None
        if conversation_id < len(self.conversations):
            for msg in self.conversations[conversation_id]:
                if msg['type'] == 'user_request':
                    request = msg['content']
                    break
        
        # Initialize analysis object
        analysis = {
            'conversation_id': conversation_id,
            'request': request,
            'debug_count': len(debug_sequence),
            'concept_evolution': self.analyze_concept_evolution(conversation_id),
            'insights': []
        }
        
        # Extract metadata insights
        metadata_concepts = analysis['concept_evolution'].get('metadata', [])
        if metadata_concepts:
            # Count concepts by category
            categories_count = Counter()
            for concept in metadata_concepts:
                categories_count[concept['category']] += 1
                
            analysis['insights'].append({
                'type': 'metadata_summary',
                'title': 'Initial Concepts',
                'description': f'Found {len(metadata_concepts)} initial concepts related to the request',
                'data': {
                    'count': len(metadata_concepts),
                    'categories': dict(categories_count),
                    'top_categories': categories_count.most_common(5)
                }
            })
            
        # Extract concept insights
        context_data = analysis['concept_evolution'].get('context', {})
        if context_data:
            # Count context keys and their values
            context_keys = list(context_data.keys())
            context_values_count = sum(len(values) for values in context_data.values() if isinstance(values, list))
            
            analysis['insights'].append({
                'type': 'context_summary',
                'title': 'Refined Context',
                'description': f'Request was refined to {len(context_keys)} context categories with {context_values_count} total values',
                'data': {
                    'categories': context_keys,
                    'values_count': context_values_count
                }
            })
            
        # Extract restaurant candidate insights
        candidate_data = analysis['concept_evolution'].get('candidates', [])
        if candidate_data:
            # Total candidates
            total_candidates = sum(len(c['restaurants']) for c in candidate_data)
            
            # Calculate average score per category
            avg_scores = []
            for category_data in candidate_data:
                if category_data['restaurants']:
                    avg = sum(r['score'] for r in category_data['restaurants']) / len(category_data['restaurants'])
                    avg_scores.append((category_data['category'], avg))
            
            # Sort by average score
            avg_scores.sort(key=lambda x: x[1], reverse=True)
            
            analysis['insights'].append({
                'type': 'candidates_summary',
                'title': 'Recommendation Candidates',
                'description': f'Found {total_candidates} restaurant candidates across {len(candidate_data)} categories',
                'data': {
                    'total_candidates': total_candidates,
                    'category_count': len(candidate_data),
                    'categories': [c['category'] for c in candidate_data],
                    'candidate_distribution': [(c['category'], len(c['restaurants'])) for c in candidate_data],
                    'avg_scores': avg_scores
                }
            })
            
            # Add top candidates by score
            all_candidates = []
            for category_data in candidate_data:
                for restaurant in category_data['restaurants']:
                    all_candidates.append({
                        'category': category_data['category'],
                        'name': restaurant['name'],
                        'score': restaurant['score']
                    })
            
            # Sort by score
            all_candidates.sort(key=lambda x: x['score'], reverse=True)
            
            analysis['insights'].append({
                'type': 'top_candidates',
                'title': 'Top Candidates by Score',
                'description': f'Highest scoring restaurant candidates across all categories',
                'data': {
                    'top_candidates': all_candidates[:5]  # Top 5
                }
            })
            
        return analysis
    
    def generate_global_insights(self):
        """Generate insights about the entire dataset."""
        insights = []
        
        # Basic statistics
        insights.append({
            'type': 'basic_stats',
            'title': 'Debug Data Overview',
            'description': 'Summary statistics about the debug information',
            'data': {
                'conversation_count': len(self.conversations),
                'debug_message_count': len(self.debug_messages),
                'unique_categories': len(self.category_counts),
                'unique_concepts': len(self.concept_counts),
                'unique_restaurants': len(self.restaurant_counts)
            }
        })
        
        # Category distribution
        if self.category_counts:
            top_categories = self.get_top_categories(10)
            insights.append({
                'type': 'category_distribution',
                'title': 'Top 10 Categories',
                'description': 'Most frequently used categories in debug data',
                'data': {
                    'categories': top_categories
                }
            })
            
        # Concept distribution
        if self.concept_counts:
            top_concepts = self.get_top_concepts(10)
            insights.append({
                'type': 'concept_distribution',
                'title': 'Top 10 Concepts',
                'description': 'Most frequently mentioned concepts in debug data',
                'data': {
                    'concepts': top_concepts
                }
            })
            
        # Restaurant distribution
        if self.restaurant_counts:
            top_restaurants = self.get_top_restaurants(10)
            insights.append({
                'type': 'restaurant_distribution',
                'title': 'Top 10 Restaurants',
                'description': 'Most frequently suggested restaurants',
                'data': {
                    'restaurants': top_restaurants
                }
            })
            
        # Concept relationships
        if self.conversation_concepts:
            concept_relationships = self.analyze_concept_relationships()
            if concept_relationships:
                insights.append({
                    'type': 'concept_relationships',
                    'title': 'Concept Co-occurrence Patterns',
                    'description': 'Concepts that frequently appear together in the same conversation',
                    'data': {
                        'relationships': [
                            {
                                'concept1': pair[0][0],
                                'concept2': pair[0][1],
                                'frequency': pair[1]
                            } for pair in concept_relationships[:10]  # Top 10
                        ]
                    }
                })
            
        # Category richness (how many concepts per category)
        if self.category_concept_map:
            category_richness = [(cat, len(concepts)) for cat, concepts in self.category_concept_map.items()]
            category_richness.sort(key=lambda x: x[1], reverse=True)
            
            insights.append({
                'type': 'category_richness',
                'title': 'Category Richness',
                'description': 'Number of unique concepts per category',
                'data': {
                    'richness': category_richness[:10]  # Top 10
                }
            })
        
        return insights
    
    def generate_network_data(self):
        """Generate network data for visualization."""
        # Concept network
        concept_nodes = []
        for node in self.concept_network.nodes():
            node_type = self.concept_network.nodes[node].get('type', 'unknown')
            size = 5  # Default size
            
            # Make categories larger
            if node_type == 'category':
                size = 10 + self.category_counts.get(node, 0)
            # Scale concepts by frequency
            elif node_type == 'concept':
                size = 5 + self.concept_counts.get(node, 0) * 0.5
                
            concept_nodes.append({
                'id': node,
                'type': node_type,
                'size': min(size, 30),  # Cap size
                'count': self.concept_counts.get(node, self.category_counts.get(node, 0))
            })
            
        concept_edges = [{'source': u, 'target': v} for u, v in self.concept_network.edges()]
        
        # Restaurant network (simplified for visualization)
        restaurant_nodes = []
        for node in self.restaurant_network.nodes():
            node_type = self.restaurant_network.nodes[node].get('type', 'unknown')
            size = 5  # Default size
            
            # Make categories larger
            if node_type == 'category':
                size = 10
            # Scale restaurants by frequency
            elif node_type == 'restaurant':
                size = 5 + self.restaurant_counts.get(node, 0)
                
            restaurant_nodes.append({
                'id': node,
                'type': node_type,
                'size': min(size, 30),  # Cap size
                'count': self.restaurant_counts.get(node, 0)
            })
            
        # Limit edges for visualization (only show for top restaurants)
        top_restaurants = set(r for r, _ in self.restaurant_counts.most_common(30))
        restaurant_edges = []
        
        for u, v in self.restaurant_network.edges():
            # Only include edges for top restaurants or all categories
            if (u in top_restaurants or v in top_restaurants or 
                self.restaurant_network.nodes[u].get('type') == 'category' or 
                self.restaurant_network.nodes[v].get('type') == 'category'):
                
                # Get edge weight
                weight = self.restaurant_network.edges[u, v].get('weight', 1.0)
                restaurant_edges.append({
                    'source': u, 
                    'target': v,
                    'weight': weight
                })
        
        return {
            'concept_network': {
                'nodes': concept_nodes,
                'edges': concept_edges
            },
            'restaurant_network': {
                'nodes': restaurant_nodes,
                'edges': restaurant_edges
            }
        }
    
    def get_cross_recommendations_insights(self):
        """Analyze which concepts lead to which restaurant recommendations."""
        # Map concepts to restaurant recommendations
        concept_to_restaurants = defaultdict(Counter)
        category_to_restaurants = defaultdict(Counter)
        
        for conv_id in range(len(self.conversations)):
            # Get concepts for this conversation
            concept_list = self.conversation_concepts.get(conv_id, [])
            
            # Get restaurant recommendations for this conversation
            recommended_restaurants = []
            for msg in self.conversations[conv_id]:
                if msg['type'] == 'recommendation':
                    # Extract restaurant names using regex
                    import re
                    restaurant_pattern = r'- ([^:]+?)(?=\s*–|\s*-|\s*\n|$)'
                    extracted = re.findall(restaurant_pattern, msg['content'])
                    recommended_restaurants = [rest.strip() for rest in extracted]
                    break
            
            # Link concepts to restaurants
            for category, concept in concept_list:
                for restaurant in recommended_restaurants:
                    concept_to_restaurants[(category, concept)][restaurant] += 1
                    category_to_restaurants[category][restaurant] += 1
        
        # Find strongest associations
        concept_restaurant_associations = []
        for (category, concept), restaurants in concept_to_restaurants.items():
            if restaurants:
                top_restaurant, count = restaurants.most_common(1)[0]
                concept_restaurant_associations.append({
                    'category': category,
                    'concept': concept,
                    'restaurant': top_restaurant,
                    'count': count
                })
        
        # Sort by count
        concept_restaurant_associations.sort(key=lambda x: x['count'], reverse=True)
        
        # Find top restaurants by category
        category_restaurant_associations = []
        for category, restaurants in category_to_restaurants.items():
            if restaurants:
                top_3 = restaurants.most_common(3)
                category_restaurant_associations.append({
                    'category': category,
                    'top_restaurants': [{'name': r, 'count': c} for r, c in top_3]
                })
        
        return {
            'concept_restaurant_associations': concept_restaurant_associations[:20],  # Top 20
            'category_restaurant_associations': category_restaurant_associations
        }
