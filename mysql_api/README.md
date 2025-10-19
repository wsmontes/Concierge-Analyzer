# Concierge Entities API Documentation

## Overview

The Concierge Entities API is a clean, simple MySQL-based REST API designed to manage entities (restaurants, hotels, attractions, etc.) with JSON storage for flexible data structures. Built specifically for PythonAnywhere hosting with MySQL backend.

### Key Features

- **Simple Design**: Minimal relational structure with JSON storage
- **Flexible Entity Types**: Support for restaurants, hotels, attractions, events
- **Redundant Identification**: IDs stored both in tables and JSON for future migration
- **Import Support**: Direct import from Concierge Collector V2 format
- **Full CRUD Operations**: Complete entity lifecycle management
- **Production Ready**: Error handling, validation, and health checks

## Base URL

```
Production: https://your-username.pythonanywhere.com/api
Development: http://localhost:5001/api
```

## API Endpoints

### Health Check

#### GET /api/health
Check API and database connectivity.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-18T10:30:00.000Z",
  "data": {
    "database": {
      "status": "healthy",
      "database": "connected"
    },
    "api": "operational"
  }
}
```

#### GET /api/info
Get API information and available endpoints.

**Response:**
```json
{
  "status": "success",
  "data": {
    "name": "Concierge Entities API",
    "version": "1.0.0",
    "description": "MySQL-based entity management API with JSON storage",
    "supported_entities": ["restaurant", "hotel", "attraction", "event"],
    "endpoints": {
      "entities": "/api/entities",
      "curators": "/api/curators",
      "sync": "/api/sync",
      "import": "/api/import/concierge-v2"
    }
  }
}
```

### Entity Management

#### GET /api/entities
Get entities with filtering and pagination.

**Query Parameters:**
- `entity_type` (string): Filter by entity type (restaurant, hotel, attraction, event)
- `status` (string): Filter by status (active, inactive, draft)
- `search` (string): Search in entity names
- `page` (integer): Page number (default: 1)
- `per_page` (integer): Items per page (default: 20, max: 100)

**Example Request:**
```bash
curl "https://your-username.pythonanywhere.com/api/entities?entity_type=restaurant&status=active&page=1&per_page=10"
```

**Response:**
```json
{
  "status": "success",
  "timestamp": "2025-10-18T10:30:00.000Z",
  "data": {
    "entities": [
      {
        "id": 1,
        "entity_type": "restaurant",
        "name": "Osteria Francescana",
        "external_id": null,
        "status": "active",
        "entity_data": {
          "concierge_v2": {
            "metadata": [...],
            "Cuisine": ["Italian", "Contemporary"],
            "Price Range": ["Expensive"]
          }
        },
        "created_at": "2025-10-18T10:00:00.000Z",
        "updated_at": "2025-10-18T10:00:00.000Z",
        "created_by": "concierge-v2-import",
        "updated_by": "concierge-v2-import"
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 10,
      "total": 25,
      "pages": 3
    },
    "filters": {
      "entity_type": "restaurant",
      "status": "active",
      "search": null
    }
  }
}
```

#### GET /api/entities/{id}
Get specific entity by ID.

**Example Request:**
```bash
curl "https://your-username.pythonanywhere.com/api/entities/1"
```

**Response:**
```json
{
  "status": "success",
  "timestamp": "2025-10-18T10:30:00.000Z",
  "data": {
    "id": 1,
    "entity_type": "restaurant",
    "name": "Osteria Francescana",
    "external_id": null,
    "status": "active",
    "entity_data": {
      "concierge_v2": {
        "metadata": [
          {
            "type": "collector",
            "source": "local",
            "data": {
              "name": "Osteria Francescana",
              "description": "Incredible three-star experience...",
              "location": {
                "latitude": 44.6467,
                "longitude": 10.9252,
                "address": "Via Stella, 22, 41121 Modena MO, Italy"
              }
            }
          }
        ],
        "Cuisine": ["Italian", "Contemporary"],
        "Price Range": ["Expensive"]
      }
    },
    "created_at": "2025-10-18T10:00:00.000Z",
    "updated_at": "2025-10-18T10:00:00.000Z"
  }
}
```

#### POST /api/entities
Create new entity.

**Request Body:**
```json
{
  "entity_type": "restaurant",
  "name": "New Restaurant",
  "external_id": "external-123",
  "status": "active",
  "entity_data": {
    "custom_data": "any JSON structure",
    "categories": ["Italian", "Pizza"]
  },
  "created_by": "curator-name",
  "updated_by": "curator-name"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Entity created successfully",
  "timestamp": "2025-10-18T10:30:00.000Z",
  "data": {
    "entity_id": 42,
    "entity": {
      "id": 42,
      "entity_type": "restaurant",
      "name": "New Restaurant",
      "status": "active",
      "entity_data": {...},
      "created_at": "2025-10-18T10:30:00.000Z"
    }
  }
}
```

#### PUT /api/entities/{id}
Update existing entity.

**Request Body:** (partial updates supported)
```json
{
  "name": "Updated Restaurant Name",
  "status": "inactive",
  "entity_data": {
    "updated_field": "new_value"
  },
  "updated_by": "curator-name"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Entity updated successfully",
  "timestamp": "2025-10-18T10:30:00.000Z",
  "data": {
    "id": 42,
    "entity_type": "restaurant",
    "name": "Updated Restaurant Name",
    "status": "inactive",
    "updated_at": "2025-10-18T10:30:00.000Z"
  }
}
```

#### DELETE /api/entities/{id}
Delete entity.

**Example Request:**
```bash
curl -X DELETE "https://your-username.pythonanywhere.com/api/entities/42"
```

**Response:**
```json
{
  "status": "success",
  "message": "Entity 'Restaurant Name' deleted successfully",
  "timestamp": "2025-10-18T10:30:00.000Z",
  "data": {
    "deleted_entity_id": 42
  }
}
```

### Import Operations

#### POST /api/import/concierge-v2
Import entities from Concierge Collector V2 format.

**Request Body:** (Array of entities in Concierge V2 format)
```json
[
  {
    "metadata": [
      {
        "type": "collector",
        "source": "local",
        "data": {
          "name": "Restaurant Name",
          "description": "Description text",
          "location": {
            "latitude": 40.7128,
            "longitude": -74.0060
          }
        }
      }
    ],
    "Cuisine": ["Italian"],
    "Price Range": ["Expensive"]
  }
]
```

**Response:**
```json
{
  "status": "success",
  "message": "Import completed: 3 entities imported, 0 errors",
  "timestamp": "2025-10-18T10:30:00.000Z",
  "data": {
    "imported": [
      {
        "entity_id": 43,
        "name": "Restaurant Name",
        "entity_type": "restaurant"
      }
    ],
    "errors": [],
    "summary": {
      "total_processed": 1,
      "successful": 1,
      "failed": 0
    }
  }
}
```

### Curator Management

#### GET /api/curators
Get all curators.

**Response:**
```json
{
  "status": "success",
  "timestamp": "2025-10-18T10:30:00.000Z",
  "data": {
    "curators": [
      {
        "id": 1,
        "name": "System Admin",
        "email": "admin@concierge.local",
        "role": "admin",
        "active": true,
        "created_at": "2025-10-18T10:00:00.000Z"
      }
    ]
  }
}
```

## Entity Data Structure

The `entity_data` field stores complete entity information as JSON. For entities imported from Concierge Collector V2, the structure is:

```json
{
  "concierge_v2": {
    "metadata": [
      {
        "type": "collector",
        "source": "local",
        "data": {
          "name": "Restaurant Name",
          "description": "Description text",
          "location": {
            "latitude": 40.7128,
            "longitude": -74.0060,
            "address": "Full address"
          },
          "photos": [...],
          "notes": {
            "private": "Internal notes",
            "public": "Public information"
          }
        }
      },
      {
        "type": "michelin",
        "source": "michelin-api",
        "data": {
          "michelinId": "restaurant-id",
          "rating": {"stars": 2, "year": 2025}
        }
      }
    ],
    "Cuisine": ["Italian", "Contemporary"],
    "Menu": ["Pasta", "Risotto"],
    "Price Range": ["Expensive"],
    "Mood": ["Sophisticated", "Romantic"],
    "Setting": ["Modern", "Elegant"]
  },
  "format_version": "2.0",
  "imported_at": "2025-10-18T10:30:00.000Z"
}
```

## Error Responses

All error responses follow this format:

```json
{
  "status": "error",
  "error": "Error description",
  "timestamp": "2025-10-18T10:30:00.000Z"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created successfully
- `400` - Bad request (validation errors)
- `404` - Resource not found
- `405` - Method not allowed
- `500` - Internal server error
- `503` - Service unavailable (database issues)

## Database Schema

### Tables

#### entities
Main entity storage table:
- `id` (INT, AUTO_INCREMENT, PRIMARY KEY)
- `entity_type` (ENUM: restaurant, hotel, attraction, event)
- `name` (VARCHAR(255), NOT NULL)
- `external_id` (VARCHAR(100)) - For sync with external systems
- `status` (ENUM: active, inactive, draft)
- `entity_data` (JSON, NOT NULL) - Complete entity data
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- `created_by` (VARCHAR(100))
- `updated_by` (VARCHAR(100))

#### curators
User management:
- `id` (INT, AUTO_INCREMENT, PRIMARY KEY)
- `name` (VARCHAR(255), NOT NULL)
- `email` (VARCHAR(255), UNIQUE)
- `role` (ENUM: admin, curator, viewer)
- `active` (BOOLEAN)
- `created_at` (TIMESTAMP)

#### entity_sync
Synchronization tracking:
- `id` (INT, AUTO_INCREMENT, PRIMARY KEY)
- `entity_id` (INT, FOREIGN KEY)
- `sync_source` (VARCHAR(100))
- `external_reference` (VARCHAR(255))
- `last_sync_at` (TIMESTAMP)
- `sync_status` (ENUM: synced, pending, error, conflict)
- `sync_data` (JSON)

## Setup Instructions

### 1. Database Setup
Execute the SQL schema file in your MySQL database:
```sql
-- Run the contents of schema.sql in your MySQL console
```

### 2. Environment Configuration
Create `.env` file with your database credentials:
```bash
cp .env.template .env
# Edit .env with your actual MySQL password
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. PythonAnywhere Deployment
1. Upload files to `/home/yourusername/Concierge-Analyzer/mysql_api/`
2. Configure WSGI file to point to `mysql_api/wsgi.py`
3. Set environment variables in PythonAnywhere dashboard
4. Restart web app

### 5. Local Development
```bash
cd mysql_api
python app.py
# API will be available at http://localhost:5001/api
```

## Example Usage

### Import Concierge V2 Data
```bash
curl -X POST "https://your-username.pythonanywhere.com/api/import/concierge-v2" \
  -H "Content-Type: application/json" \
  -d @concierge_export_example_v2.json
```

### Search Restaurants
```bash
curl "https://your-username.pythonanywhere.com/api/entities?entity_type=restaurant&search=osteria"
```

### Create New Entity
```bash
curl -X POST "https://your-username.pythonanywhere.com/api/entities" \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "restaurant",
    "name": "My Restaurant",
    "entity_data": {"cuisine": ["Italian"]},
    "created_by": "my-curator"
  }'
```

## Migration Strategy

The API is designed for easy migration to NoSQL databases:

1. **Entity IDs**: Available in both table `id` field and within JSON data
2. **Complete Data**: All entity information stored in JSON `entity_data` field
3. **Redundant Structure**: No critical data exists only in relational fields
4. **JSON Export**: Entire entities can be exported as pure JSON

For migration, simply export the `entity_data` column from each entity along with the table `id` for reference.

## Support

For issues and questions:
- Check the health endpoint first: `/api/health`
- Review error responses for detailed error information
- Validate JSON data structure against Concierge V2 schema
- Ensure environment variables are correctly set