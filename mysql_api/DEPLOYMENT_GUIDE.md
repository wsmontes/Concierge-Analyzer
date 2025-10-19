# 
# PythonAnywhere Deployment Guide for MySQL API Integration
# Step-by-step instructions for deploying the MySQL API as part of the existing application
#

## 1. Upload Files to PythonAnywhere

1. Access your PythonAnywhere dashboard and open the "Files" section
2. Navigate to `/home/wsmontes/Concierge-Analyzer/`
3. Create a new directory called `mysql_api`
4. Upload the following files to `/home/wsmontes/Concierge-Analyzer/mysql_api/`:
   - `__init__.py` (empty file)
   - `app.py` (MySQL API Flask application)
   - `database.py` (Database connection manager)
   - `models.py` (Entity and Curator models)
   - `schema.sql` (MySQL database schema)
   - `.env` (Environment configuration)
   - `requirements.txt` (Dependencies)
   - `add_routes.py` (Route addition script)

## 2. Install Dependencies

1. Open a bash console from your PythonAnywhere dashboard
2. Navigate to your project directory:
   ```bash
   cd /home/wsmontes/Concierge-Analyzer
   ```
3. Install the new dependencies:
   ```bash
   pip3.10 install --user mysql-connector-python python-dotenv
   ```
4. Verify installation:
   ```bash
   python3.10 -c "import mysql.connector; import dotenv; print('Dependencies installed successfully')"
   ```

## 3. Set Up MySQL Database

1. From your PythonAnywhere dashboard, go to the "Databases" section
2. Open the MySQL console
3. Switch to your database:
   ```sql
   USE wsmontes$concierge_db;
   ```
4. Execute the schema creation script:
   ```sql
   -- Copy and paste the contents of mysql_api/schema.sql here
   -- This will create the entities, curators, and entity_sync tables
   ```
5. Verify tables were created:
   ```sql
   SHOW TABLES;
   DESCRIBE entities;
   ```

## 4. Update WSGI Configuration

1. From your PythonAnywhere dashboard, go to the "Web" section
2. Click on your web app (wsmontes.pythonanywhere.com)
3. Go to the "Code" section and click on the WSGI configuration file link
4. Add the MySQL API integration at the end of your existing WSGI file:

```python
# Add this at the end of your existing WSGI file

# MySQL API Integration
import os
import sys

# Add the mysql_api directory to the Python path
mysql_api_path = '/home/wsmontes/Concierge-Analyzer/mysql_api'
if mysql_api_path not in sys.path:
    sys.path.insert(0, mysql_api_path)

# Import and register MySQL API routes
try:
    from mysql_api.app import create_api_response, validate_entity_type
    from mysql_api.database import get_db
    from mysql_api.models import EntityModel, EntityType
    from flask import request
    import json
    
    # Define the MySQL API routes
    @application.route('/mysql-api/health', methods=['GET'])
    def mysql_health_check():
        try:
            db = get_db()
            health_result = db.health_check()
            
            if health_result['status'] == 'healthy':
                return create_api_response(
                    status="healthy",
                    data={"database": health_result, "api": "operational"}
                )
            else:
                return create_api_response(
                    status="unhealthy",
                    error=health_result.get('error', 'Database connection failed'),
                    status_code=503
                )
        except Exception as e:
            return create_api_response(status="unhealthy", error=str(e), status_code=503)

    @application.route('/mysql-api/info', methods=['GET'])
    def mysql_api_info():
        return create_api_response(
            data={
                "name": "Concierge Entities API",
                "version": "1.0.0",
                "description": "MySQL-based entity management API",
                "supported_entities": [e.value for e in EntityType],
                "endpoints": {
                    "entities": "/mysql-api/entities",
                    "import": "/mysql-api/import/concierge-v2"
                }
            }
        )

    @application.route('/mysql-api/entities', methods=['GET'])
    def mysql_get_entities():
        try:
            db = get_db()
            
            # Query parameters
            entity_type = request.args.get('entity_type')
            status = request.args.get('status')
            search = request.args.get('search')
            page = int(request.args.get('page', 1))
            per_page = min(int(request.args.get('per_page', 20)), 100)
            
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
                    }
                }
            )
            
        except Exception as e:
            return create_api_response(status="error", error=str(e), status_code=500)

    @application.route('/mysql-api/entities', methods=['POST'])
    def mysql_create_entity():
        try:
            data = request.get_json()
            if not data:
                return create_api_response(status="error", error="JSON data required", status_code=400)
            
            entity = EntityModel(
                entity_type=data.get('entity_type', 'restaurant'),
                name=data.get('name', ''),
                external_id=data.get('external_id'),
                status=data.get('status', 'active'),
                entity_data=data.get('entity_data', {}),
                created_by=data.get('created_by', 'api'),
                updated_by=data.get('updated_by', 'api')
            )
            
            is_valid, errors = entity.validate()
            if not is_valid:
                return create_api_response(
                    status="error",
                    error="Validation failed",
                    data={"validation_errors": errors},
                    status_code=400
                )
            
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
                data={"entity_id": entity_id},
                status_code=201
            )
            
        except Exception as e:
            return create_api_response(status="error", error=str(e), status_code=500)

    @application.route('/mysql-api/import/concierge-v2', methods=['POST'])
    def mysql_import_concierge_v2():
        try:
            data = request.get_json()
            if not data or not isinstance(data, list):
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
                    entity = EntityModel.from_concierge_v2(entity_data)
                    entity.created_by = 'concierge-v2-import'
                    entity.updated_by = 'concierge-v2-import'
                    
                    is_valid, validation_errors = entity.validate()
                    if not is_valid:
                        errors.append({"index": i, "name": entity.name, "errors": validation_errors})
                        continue
                    
                    entity_dict = entity.to_dict(include_id=False)
                    query = """
                        INSERT INTO entities (entity_type, name, external_id, status, entity_data, 
                                            created_by, updated_by)
                        VALUES (%(entity_type)s, %(name)s, %(external_id)s, %(status)s, 
                               %(entity_data)s, %(created_by)s, %(updated_by)s)
                    """
                    
                    entity_id = db.execute_insert(query, entity_dict)
                    imported_entities.append({
                        "entity_id": entity_id,
                        "name": entity.name,
                        "entity_type": entity.entity_type
                    })
                    
                except Exception as e:
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
            return create_api_response(status="error", error=str(e), status_code=500)
    
    print("MySQL API routes registered successfully")
    
except Exception as e:
    print(f"Error loading MySQL API: {e}")
    # MySQL API will not be available if there's an error
```

## 5. Reload Web App

1. After saving the WSGI configuration file, go back to the "Web" section
2. Click the green "Reload" button to restart your web app
3. Monitor the error log for any issues

## 6. Test the Integration

Once deployed, test the MySQL API endpoints:

1. **Health Check:**
   ```
   GET https://wsmontes.pythonanywhere.com/mysql-api/health
   ```

2. **API Info:**
   ```
   GET https://wsmontes.pythonanywhere.com/mysql-api/info
   ```

3. **List Entities:**
   ```
   GET https://wsmontes.pythonanywhere.com/mysql-api/entities
   ```

4. **Create Entity:**
   ```
   POST https://wsmontes.pythonanywhere.com/mysql-api/entities
   Content-Type: application/json
   
   {
     "entity_type": "restaurant",
     "name": "Test Restaurant",
     "external_id": "test-001",
     "status": "active",
     "entity_data": {
       "cuisine": "Italian",
       "location": "Downtown"
     }
   }
   ```

## 7. Environment Variables

Ensure your `.env` file in the mysql_api directory contains:

```
# MySQL Database Configuration
MYSQL_HOST=wsmontes.mysql.pythonanywhere-services.com
MYSQL_USER=wsmontes
MYSQL_PASSWORD=Concierge@1983
MYSQL_DATABASE=wsmontes$concierge_db
MYSQL_PORT=3306

# API Configuration
API_DEBUG=false
API_LOG_LEVEL=INFO
```

## 8. Troubleshooting

If you encounter issues:

1. **Check the error log** in the Web section of your PythonAnywhere dashboard
2. **Verify dependencies** are installed for Python 3.10
3. **Test database connection** from a console:
   ```python
   from mysql_api.database import get_db
   db = get_db()
   print(db.health_check())
   ```
4. **Verify file paths** are correct in the WSGI configuration

## 9. Monitoring

- Monitor the error logs regularly for database connection issues
- Check the health endpoint periodically to ensure the API is operational
- Use the MySQL console to monitor database performance and storage

Your MySQL API should now be integrated with your existing Concierge Analyzer application and accessible at the `/mysql-api/*` endpoints!