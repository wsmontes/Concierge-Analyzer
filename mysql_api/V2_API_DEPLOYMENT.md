# V2 API Deployment Guide

## Overview

This guide covers deploying the simplified V2 API to PythonAnywhere. The new API uses a single-table schema storing pure Concierge V2 JSON format.

## Files Created

1. **models_v2.py** - RestaurantV2 model class
2. **app_v2.py** - Simplified Flask API with V2 endpoints
3. **wsgi_v2.py** - Production WSGI configuration

## Deployment Steps

### Step 1: Upload Files to PythonAnywhere

```bash
# Navigate to mysql_api directory on PythonAnywhere
cd /home/wsmontes/Concierge-Analyzer/mysql_api

# Upload new files via PythonAnywhere Files tab:
# - models_v2.py
# - app_v2.py  
# - wsgi_v2.py
```

### Step 2: Update WSGI Configuration

1. Go to PythonAnywhere **Web** tab
2. Click on **WSGI configuration file** link
3. Replace entire content with content from `wsgi_v2.py`
4. Click **Save**

### Step 3: Reload Web App

1. Scroll to top of **Web** tab
2. Click green **Reload** button
3. Wait for reload to complete (~10 seconds)

### Step 4: Test Endpoints

```bash
# Health check
curl https://wsmontes.pythonanywhere.com/api/health

# Should return:
# {"status":"healthy","database":"connected"}

# Get all restaurants (should be empty initially)
curl https://wsmontes.pythonanywhere.com/api/v2/restaurants

# Should return:
# {"count":0,"restaurants":[]}
```

## New API Endpoints

### Core CRUD Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/restaurants` | Get all restaurants |
| GET | `/api/v2/restaurants/{id}` | Get single restaurant |
| POST | `/api/v2/restaurants` | Create restaurant from V2 JSON |
| PUT | `/api/v2/restaurants/{id}` | Update restaurant with V2 JSON |
| DELETE | `/api/v2/restaurants/{id}` | Soft delete restaurant |
| POST | `/api/v2/restaurants/bulk` | Bulk create from V2 JSON array |
| GET | `/api/v2/restaurants/search?q=name` | Search by name |

### Metadata Extraction

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/restaurants/{id}/metadata` | Get all metadata arrays |
| GET | `/api/v2/restaurants/{id}/metadata/{type}` | Get specific metadata type |

### Query Parameters

**GET /api/v2/restaurants**
- `entity_type` - Filter by type (restaurant, hotel, etc.)
- `limit` - Max results (default 100)
- `offset` - Pagination offset (default 0)
- `format` - Response format: 'v2' (pure JSON, default) or 'full' (with DB metadata)

**GET /api/v2/restaurants/search**
- `q` - Search term (required)
- `limit` - Max results (default 20)
- `format` - Response format: 'v2' or 'full'

## Example Usage

### Import Single Restaurant

```bash
curl -X POST https://wsmontes.pythonanywhere.com/api/v2/restaurants \
  -H "Content-Type: application/json" \
  -d @concierge_export_example_v2.json
```

### Import Multiple Restaurants

```bash
curl -X POST https://wsmontes.pythonanywhere.com/api/v2/restaurants/bulk \
  -H "Content-Type: application/json" \
  -d '[
    {"Name": "Restaurant 1", "Type": "restaurant", "metadata": []},
    {"Name": "Restaurant 2", "Type": "restaurant", "metadata": []}
  ]'
```

### Export All Restaurants (V2 Format)

```bash
curl https://wsmontes.pythonanywhere.com/api/v2/restaurants
```

### Export Single Restaurant

```bash
curl https://wsmontes.pythonanywhere.com/api/v2/restaurants/1
```

### Get Michelin Metadata

```bash
curl https://wsmontes.pythonanywhere.com/api/v2/restaurants/1/metadata/michelin
```

## Response Formats

### V2 Format (Default)

Pure Concierge V2 JSON - exactly as stored:

```json
{
  "count": 1,
  "restaurants": [
    {
      "Name": "La Bernalda",
      "Type": "restaurant",
      "metadata": [
        {
          "type": "michelin",
          "stars": 2,
          "year": 2024
        }
      ]
    }
  ]
}
```

### Full Format (with Database Metadata)

Includes sync tracking and timestamps:

```json
{
  "count": 1,
  "restaurants": [
    {
      "id": 1,
      "name": "La Bernalda",
      "entity_type": "restaurant",
      "v2_data": { "Name": "La Bernalda", ... },
      "server_id": null,
      "sync_status": "pending",
      "last_synced_at": null,
      "created_at": "2025-10-20T12:00:00",
      "updated_at": "2025-10-20T12:00:00",
      "deleted_at": null
    }
  ]
}
```

## CORS Configuration

All endpoints support CORS:
- **Origins**: `*` (all origins)
- **Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization

## Error Handling

All errors return JSON format:

```json
{
  "error": "Error description"
}
```

HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad request (invalid input)
- `404` - Not found
- `405` - Method not allowed
- `500` - Server error

## Rollback Plan

If issues occur, revert to old API:

1. Go to **Web** tab → **WSGI configuration file**
2. Change import line:
   ```python
   from app import app as application
   ```
3. Click **Save** and **Reload**

## Benefits of V2 API

1. ✅ **Simpler**: Single table, no joins, direct JSON storage
2. ✅ **True Two-Way Sync**: Import = INSERT JSON, Export = SELECT JSON
3. ✅ **Flexible**: No schema changes needed for new V2 fields
4. ✅ **Clean**: Pure V2 format responses match client expectations
5. ✅ **Fast**: Direct JSON operations, no complex transformations
6. ✅ **Maintainable**: Less code, fewer files, clearer purpose

## Next Steps

1. Deploy V2 API to PythonAnywhere (follow steps above)
2. Test all endpoints
3. Update client code to use `/api/v2/restaurants` endpoints
4. Test full two-way sync workflow
5. Remove old files (app.py, models.py, wsgi_fixed.py) once verified

## Support

If errors occur:
- Check `/var/log/wsmontes.pythonanywhere.com.error.log` in PythonAnywhere
- Verify environment variables are set (MYSQL_PASSWORD, etc.)
- Ensure virtualenv has all packages: `pip list | grep -E "flask|mysql|cors"`
- Test database connection: Visit `/api/health` endpoint
