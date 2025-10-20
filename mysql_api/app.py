# 
# Concierge Entities API - Main Flask Application
# Simple MySQL-based API for entity management with JSON storage
# Dependencies: Flask, mysql-connector-python, flask-cors
#

import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional

from flask import Flask, request, jsonify
from flask_cors import CORS

from database import get_db
from models import EntityModel, CuratorModel, EntitySyncModel, EntityType, EntityStatus

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask application
app = Flask(__name__)

# CORS Configuration - Enable for all routes with explicit settings
CORS(app, 
     resources={
         r"/*": {
             "origins": "*",
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization"],
             "expose_headers": ["Content-Type"],
             "supports_credentials": False,
             "max_age": 3600
         }
     })

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload
app.config['JSON_SORT_KEYS'] = False

def create_api_response(status: str = "success", data: Any = None, 
                       message: str = None, error: str = None, 
                       status_code: int = 200) -> tuple:
    """Create standardized API response"""
    response = {
        "status": status,
        "timestamp": datetime.now().isoformat()
    }
    
    if data is not None:
        response["data"] = data
    if message:
        response["message"] = message
    if error:
        response["error"] = error
    
    return jsonify(response), status_code

def validate_entity_type(entity_type: str) -> bool:
    """Validate entity type against allowed values"""
    return entity_type in [e.value for e in EntityType]

# ===========================================
# HEALTH CHECK ENDPOINTS
# ===========================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint with database connectivity test"""
    try:
        db = get_db()
        health_result = db.health_check()
        
        if health_result['status'] == 'healthy':
            return create_api_response(
                status="healthy",
                data={
                    "database": health_result,
                    "api": "operational"
                }
            )
        else:
            return create_api_response(
                status="unhealthy",
                error=health_result.get('error', 'Database connection failed'),
                status_code=503
            )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return create_api_response(
            status="unhealthy",
            error=str(e),
            status_code=503
        )

@app.route('/api/info', methods=['GET'])
def api_info():
    """API information endpoint"""
    return create_api_response(
        data={
            "name": "Concierge Entities API",
            "version": "1.0.0",
            "description": "MySQL-based entity management API with JSON storage",
            "supported_entities": [e.value for e in EntityType],
            "endpoints": {
                "entities": "/api/entities",
                "curators": "/api/curators",
                "sync": "/api/sync",
                "import": "/api/import/concierge-v2",
                "export_all": "/api/export/concierge-v2",
                "export_single": "/api/export/concierge-v2/{entity_id}"
            },
            "features": {
                "two_way_sync": True,
                "v2_format": True,
                "bulk_operations": True
            }
        }
    )

# ===========================================
# ENTITY CRUD ENDPOINTS
# ===========================================

@app.route('/api/entities', methods=['GET'])
def get_entities():
    """Get entities with filtering and pagination"""
    try:
        db = get_db()
        
        # Query parameters
        entity_type = request.args.get('entity_type')
        status = request.args.get('status')
        search = request.args.get('search')
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)  # Max 100 per page
        
        # Build query
        where_conditions = []
        params = []
        
        if entity_type and validate_entity_type(entity_type):
            where_conditions.append("entity_type = %s")
            params.append(entity_type)
        
        if status:
            where_conditions.append("status = %s")
            params.append(status)
        
        if search:
            where_conditions.append("name LIKE %s")
            params.append(f"%{search}%")
        
        where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""
        
        # Count total records
        count_query = f"SELECT COUNT(*) as total FROM entities{where_clause}"
        count_result = db.execute_query(count_query, tuple(params), fetch_one=True)
        total_count = count_result['total']
        
        # Get paginated results
        offset = (page - 1) * per_page
        data_query = f"""
            SELECT id, entity_type, name, external_id, status, entity_data, 
                   created_at, updated_at, created_by, updated_by
            FROM entities{where_clause}
            ORDER BY updated_at DESC, id DESC
            LIMIT %s OFFSET %s
        """
        params.extend([per_page, offset])
        
        entities_data = db.execute_query(data_query, tuple(params))
        
        # Convert to EntityModel objects
        entities = []
        for row in entities_data:
            # Parse JSON entity_data
            if row['entity_data']:
                try:
                    row['entity_data'] = json.loads(row['entity_data'])
                except json.JSONDecodeError:
                    row['entity_data'] = {}
            
            entity = EntityModel.from_dict(row)
            entities.append(entity.to_json_response())
        
        return create_api_response(
            data={
                "entities": entities,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total_count,
                    "pages": (total_count + per_page - 1) // per_page
                },
                "filters": {
                    "entity_type": entity_type,
                    "status": status,
                    "search": search
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting entities: {e}")
        return create_api_response(
            status="error",
            error=str(e),
            status_code=500
        )

@app.route('/api/entities/<int:entity_id>', methods=['GET'])
def get_entity(entity_id):
    """Get specific entity by ID"""
    try:
        db = get_db()
        
        query = """
            SELECT id, entity_type, name, external_id, status, entity_data,
                   created_at, updated_at, created_by, updated_by
            FROM entities 
            WHERE id = %s
        """
        
        result = db.execute_query(query, (entity_id,), fetch_one=True)
        
        if not result:
            return create_api_response(
                status="error",
                error="Entity not found",
                status_code=404
            )
        
        # Parse JSON entity_data
        if result['entity_data']:
            try:
                result['entity_data'] = json.loads(result['entity_data'])
            except json.JSONDecodeError:
                result['entity_data'] = {}
        
        entity = EntityModel.from_dict(result)
        
        return create_api_response(data=entity.to_json_response())
        
    except Exception as e:
        logger.error(f"Error getting entity {entity_id}: {e}")
        return create_api_response(
            status="error",
            error=str(e),
            status_code=500
        )

@app.route('/api/entities', methods=['POST'])
def create_entity():
    """Create new entity"""
    try:
        data = request.get_json()
        if not data:
            return create_api_response(
                status="error",
                error="JSON data required",
                status_code=400
            )
        
        # Create EntityModel from request data
        entity = EntityModel(
            entity_type=data.get('entity_type', 'restaurant'),
            name=data.get('name', ''),
            external_id=data.get('external_id'),
            status=data.get('status', 'active'),
            entity_data=data.get('entity_data', {}),
            created_by=data.get('created_by', 'api'),
            updated_by=data.get('updated_by', 'api')
        )
        
        # Validate entity
        is_valid, errors = entity.validate()
        if not is_valid:
            return create_api_response(
                status="error",
                error="Validation failed",
                data={"validation_errors": errors},
                status_code=400
            )
        
        # Insert into database
        db = get_db()
        entity_dict = entity.to_dict(include_id=False)
        
        query = """
            INSERT INTO entities (entity_type, name, external_id, status, entity_data, 
                                created_by, updated_by)
            VALUES (%(entity_type)s, %(name)s, %(external_id)s, %(status)s, 
                   %(entity_data)s, %(created_by)s, %(updated_by)s)
        """
        
        entity_id = db.execute_insert(query, entity_dict)
        entity.id = entity_id
        
        return create_api_response(
            status="success",
            message="Entity created successfully",
            data={"entity_id": entity_id, "entity": entity.to_json_response()},
            status_code=201
        )
        
    except Exception as e:
        logger.error(f"Error creating entity: {e}")
        return create_api_response(
            status="error",
            error=str(e),
            status_code=500
        )

@app.route('/api/entities/<int:entity_id>', methods=['PUT'])
def update_entity(entity_id):
    """Update existing entity"""
    try:
        data = request.get_json()
        if not data:
            return create_api_response(
                status="error",
                error="JSON data required",
                status_code=400
            )
        
        db = get_db()
        
        # Check if entity exists
        existing = db.execute_query(
            "SELECT id FROM entities WHERE id = %s", 
            (entity_id,), 
            fetch_one=True
        )
        
        if not existing:
            return create_api_response(
                status="error",
                error="Entity not found",
                status_code=404
            )
        
        # Prepare update data
        update_fields = []
        params = []
        
        if 'entity_type' in data:
            if validate_entity_type(data['entity_type']):
                update_fields.append("entity_type = %s")
                params.append(data['entity_type'])
        
        if 'name' in data:
            update_fields.append("name = %s")
            params.append(data['name'])
        
        if 'external_id' in data:
            update_fields.append("external_id = %s")
            params.append(data['external_id'])
        
        if 'status' in data:
            update_fields.append("status = %s")
            params.append(data['status'])
        
        if 'entity_data' in data:
            update_fields.append("entity_data = %s")
            params.append(json.dumps(data['entity_data']))
        
        if 'updated_by' in data:
            update_fields.append("updated_by = %s")
            params.append(data['updated_by'])
        
        # Always update timestamp
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        
        if not update_fields:
            return create_api_response(
                status="error",
                error="No valid fields to update",
                status_code=400
            )
        
        # Execute update
        params.append(entity_id)
        query = f"UPDATE entities SET {', '.join(update_fields)} WHERE id = %s"
        
        rows_affected = db.execute_update(query, tuple(params))
        
        if rows_affected == 0:
            return create_api_response(
                status="error",
                error="No changes made",
                status_code=400
            )
        
        # Return updated entity
        updated_entity = db.execute_query(
            """SELECT id, entity_type, name, external_id, status, entity_data,
                      created_at, updated_at, created_by, updated_by
               FROM entities WHERE id = %s""",
            (entity_id,),
            fetch_one=True
        )
        
        if updated_entity['entity_data']:
            try:
                updated_entity['entity_data'] = json.loads(updated_entity['entity_data'])
            except json.JSONDecodeError:
                updated_entity['entity_data'] = {}
        
        entity = EntityModel.from_dict(updated_entity)
        
        return create_api_response(
            message="Entity updated successfully",
            data=entity.to_json_response()
        )
        
    except Exception as e:
        logger.error(f"Error updating entity {entity_id}: {e}")
        return create_api_response(
            status="error",
            error=str(e),
            status_code=500
        )

@app.route('/api/entities/<int:entity_id>', methods=['DELETE'])
def delete_entity(entity_id):
    """Delete entity"""
    try:
        db = get_db()
        
        # Check if entity exists
        existing = db.execute_query(
            "SELECT id, name FROM entities WHERE id = %s", 
            (entity_id,), 
            fetch_one=True
        )
        
        if not existing:
            return create_api_response(
                status="error",
                error="Entity not found",
                status_code=404
            )
        
        # Delete entity (this will cascade to entity_sync table)
        rows_affected = db.execute_delete("DELETE FROM entities WHERE id = %s", (entity_id,))
        
        if rows_affected == 0:
            return create_api_response(
                status="error",
                error="Failed to delete entity",
                status_code=500
            )
        
        return create_api_response(
            message=f"Entity '{existing['name']}' deleted successfully",
            data={"deleted_entity_id": entity_id}
        )
        
    except Exception as e:
        logger.error(f"Error deleting entity {entity_id}: {e}")
        return create_api_response(
            status="error",
            error=str(e),
            status_code=500
        )

# ===========================================
# IMPORT ENDPOINTS
# ===========================================

@app.route('/api/import/concierge-v2', methods=['POST'])
def import_concierge_v2():
    """Import entities from Concierge Collector V2 format"""
    try:
        data = request.get_json()
        if not data:
            return create_api_response(
                status="error",
                error="JSON data required",
                status_code=400
            )
        
        # Validate that it's an array
        if not isinstance(data, list):
            return create_api_response(
                status="error",
                error="Expected array of entities",
                status_code=400
            )
        
        db = get_db()
        imported_entities = []
        errors = []
        
        for i, entity_data in enumerate(data):
            try:
                # Create EntityModel from Concierge V2 data
                entity = EntityModel.from_concierge_v2(entity_data)
                entity.created_by = 'concierge-v2-import'
                entity.updated_by = 'concierge-v2-import'
                
                # Validate entity
                is_valid, validation_errors = entity.validate()
                if not is_valid:
                    errors.append({
                        "index": i,
                        "name": entity.name,
                        "errors": validation_errors
                    })
                    continue
                
                # Insert into database
                entity_dict = entity.to_dict(include_id=False)
                
                query = """
                    INSERT INTO entities (entity_type, name, external_id, status, entity_data, 
                                        created_by, updated_by)
                    VALUES (%(entity_type)s, %(name)s, %(external_id)s, %(status)s, 
                           %(entity_data)s, %(created_by)s, %(updated_by)s)
                """
                
                entity_id = db.execute_insert(query, entity_dict)
                entity.id = entity_id
                
                imported_entities.append({
                    "entity_id": entity_id,
                    "name": entity.name,
                    "entity_type": entity.entity_type
                })
                
            except Exception as e:
                logger.error(f"Error importing entity at index {i}: {e}")
                errors.append({
                    "index": i,
                    "name": entity_data.get('metadata', [{}])[0].get('data', {}).get('name', 'Unknown'),
                    "error": str(e)
                })
        
        return create_api_response(
            status="success",
            message=f"Import completed: {len(imported_entities)} entities imported, {len(errors)} errors",
            data={
                "imported": imported_entities,
                "errors": errors,
                "summary": {
                    "total_processed": len(data),
                    "successful": len(imported_entities),
                    "failed": len(errors)
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error in Concierge V2 import: {e}")
        return create_api_response(
            status="error",
            error=str(e),
            status_code=500
        )

@app.route('/api/export/concierge-v2', methods=['GET'])
def export_concierge_v2():
    """Export entities in Concierge Collector V2 format"""
    try:
        db = get_db()
        
        # Query parameters for filtering
        entity_type = request.args.get('entity_type', 'restaurant')
        status = request.args.get('status')
        limit = min(int(request.args.get('limit', 100)), 1000)  # Max 1000 entities
        
        # Build query
        where_conditions = ["entity_type = %s"]
        params = [entity_type]
        
        if status:
            where_conditions.append("status = %s")
            params.append(status)
        
        where_clause = " WHERE " + " AND ".join(where_conditions)
        
        # Get entities
        query = f"""
            SELECT id, entity_type, name, external_id, status, entity_data, 
                   created_at, updated_at, created_by, updated_by
            FROM entities{where_clause}
            ORDER BY updated_at DESC, id DESC
            LIMIT %s
        """
        params.append(limit)
        
        entities_data = db.execute_query(query, tuple(params))
        
        # Convert to V2 format
        v2_export = []
        for row in entities_data:
            # Parse JSON entity_data
            if row['entity_data']:
                try:
                    row['entity_data'] = json.loads(row['entity_data'])
                except json.JSONDecodeError:
                    row['entity_data'] = {}
            
            entity = EntityModel.from_dict(row)
            v2_export.append(entity.to_concierge_v2())
        
        # Return as JSON array (V2 format)
        return jsonify(v2_export), 200
        
    except Exception as e:
        logger.error(f"Error in Concierge V2 export: {e}")
        return create_api_response(
            status="error",
            error=str(e),
            status_code=500
        )

@app.route('/api/export/concierge-v2/<int:entity_id>', methods=['GET'])
def export_single_concierge_v2(entity_id):
    """Export a single entity in Concierge Collector V2 format"""
    try:
        db = get_db()
        
        # Get entity by ID
        query = """
            SELECT id, entity_type, name, external_id, status, entity_data, 
                   created_at, updated_at, created_by, updated_by
            FROM entities
            WHERE id = %s
        """
        
        entity_data = db.execute_query(query, (entity_id,), fetch_one=True)
        
        if not entity_data:
            return create_api_response(
                status="error",
                error="Entity not found",
                status_code=404
            )
        
        # Parse JSON entity_data
        if entity_data['entity_data']:
            try:
                entity_data['entity_data'] = json.loads(entity_data['entity_data'])
            except json.JSONDecodeError:
                entity_data['entity_data'] = {}
        
        entity = EntityModel.from_dict(entity_data)
        v2_data = entity.to_concierge_v2()
        
        # Return as single object wrapped in array (V2 format is always an array)
        return jsonify([v2_data]), 200
        
    except Exception as e:
        logger.error(f"Error exporting entity {entity_id}: {e}")
        return create_api_response(
            status="error",
            error=str(e),
            status_code=500
        )

# ===========================================
# CURATOR ENDPOINTS
# ===========================================

@app.route('/api/curators', methods=['GET'])
def get_curators():
    """Get all curators"""
    try:
        db = get_db()
        
        query = "SELECT id, name, email, role, active, created_at FROM curators ORDER BY name"
        curators_data = db.execute_query(query)
        
        curators = [CuratorModel.from_dict(row).to_dict() for row in curators_data]
        
        return create_api_response(data={"curators": curators})
        
    except Exception as e:
        logger.error(f"Error getting curators: {e}")
        return create_api_response(
            status="error",
            error=str(e),
            status_code=500
        )

# ===========================================
# ERROR HANDLERS
# ===========================================

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return create_api_response(
        status="error",
        error="Endpoint not found",
        status_code=404
    )

@app.errorhandler(405)
def method_not_allowed(error):
    """Handle 405 errors"""
    return create_api_response(
        status="error",
        error="Method not allowed",
        status_code=405
    )

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {error}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")
    return create_api_response(
        status="error",
        error="Internal server error. Check server logs for details.",
        status_code=500
    )

@app.errorhandler(Exception)
def handle_exception(error):
    """Handle all uncaught exceptions"""
    logger.error(f"Unhandled exception: {error}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")
    return create_api_response(
        status="error",
        error=str(error),
        status_code=500
    )

# Add OPTIONS method handler for CORS preflight
@app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
@app.route('/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    """Handle OPTIONS requests for CORS preflight"""
    return '', 204

if __name__ == '__main__':
    # This will only run when the file is executed directly
    # For PythonAnywhere, use the WSGI configuration
    app.run(debug=True, host='0.0.0.0', port=5001)