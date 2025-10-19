import sys, os

# 1) aponte para o diretório do seu projeto
project_home = '/home/wsmontes/Concierge-Analyzer'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# 2) Add mysql_api to path
mysql_api_path = '/home/wsmontes/Concierge-Analyzer/mysql_api'
if mysql_api_path not in sys.path:
    sys.path.insert(0, mysql_api_path)

# 3) garanta que o cwd é o do projeto (para achar templates/static)
os.chdir(project_home)

# 4) Import the main concierge_parser app
from concierge_parser import app as application

# 5) Add MySQL API routes to the existing app
try:
    # Import MySQL API components
    from mysql_api.app import create_api_response, validate_entity_type
    from mysql_api.database import get_db
    from mysql_api.models import EntityModel, CuratorModel, EntitySyncModel, EntityType, EntityStatus
    from flask import request, jsonify
    import json
    from datetime import datetime
    
    # ===========================================
    # MYSQL API HEALTH CHECK ENDPOINTS
    # ===========================================
    
    @application.route('/mysql-api/health', methods=['GET'])
    def mysql_health_check():
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
            application.logger.error(f"MySQL API health check failed: {e}")
            return create_api_response(
                status="unhealthy",
                error=str(e),
                status_code=503
            )

    @application.route('/mysql-api/info', methods=['GET'])
    def mysql_api_info():
        """MySQL API information endpoint"""
        return create_api_response(
            data={
                "name": "Concierge Entities API",
                "version": "1.0.0",
                "description": "MySQL-based entity management API with JSON storage",
                "supported_entities": [e.value for e in EntityType],
                "endpoints": {
                    "entities": "/mysql-api/entities",
                    "curators": "/mysql-api/curators",
                    "import": "/mysql-api/import/concierge-v2"
                }
            }
        )

    # ===========================================
    # MYSQL API ENTITY CRUD ENDPOINTS
    # ===========================================

    @application.route('/mysql-api/entities', methods=['GET'])
    def mysql_get_entities():
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
            application.logger.error(f"Error getting entities: {e}")
            return create_api_response(
                status="error",
                error=str(e),
                status_code=500
            )

    @application.route('/mysql-api/entities', methods=['POST'])
    def mysql_create_entity():
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
            application.logger.error(f"Error creating entity: {e}")
            return create_api_response(
                status="error",
                error=str(e),
                status_code=500
            )

    @application.route('/mysql-api/import/concierge-v2', methods=['POST'])
    def mysql_import_concierge_v2():
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
                    application.logger.error(f"Error importing entity at index {i}: {e}")
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
            application.logger.error(f"Error in Concierge V2 import: {e}")
            return create_api_response(
                status="error",
                error=str(e),
                status_code=500
            )

    print("✅ MySQL API routes successfully integrated at /mysql-api/*")
    
except Exception as e:
    print(f"❌ Failed to integrate MySQL API: {e}")
    # Continue with just the main app if MySQL API fails to load