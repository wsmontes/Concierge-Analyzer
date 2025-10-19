# Concierge Collector JSON Storage Implementation Guide

## Overview

This implementation uses a **JSON-first approach** for storing restaurant data from your Concierge Collector V2 export format. Instead of normalizing data across multiple tables, we store each restaurant as a complete JSON document.

## Why This Approach is Better

✅ **Future-Proof**: New properties don't require database schema changes  
✅ **Flexible**: Can handle any data structure from your export format  
✅ **Simple**: One table, one JSON document per restaurant  
✅ **Fast**: No complex joins needed for retrieval  
✅ **Scalable**: PostgreSQL JSONB provides excellent performance and indexing  

## Implementation Steps

### 1. Database Setup

Run the JSON schema creation script:

```sql
-- Execute the JSON schema setup
\i create_json_schema.sql
```

This creates:
- `restaurants_json` table with JSONB storage
- Indexes for efficient JSON queries
- Helper functions for extracting common fields
- Useful views for common access patterns

### 2. API Endpoint

**New endpoint**: `POST /api/curation/json`

- **Input**: Array of restaurant objects (exactly your V2 export format)
- **Output**: Success response with count of processed restaurants
- **Storage**: Each restaurant stored as complete JSON document

### 3. Database Schema

```sql
CREATE TABLE restaurants_json (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,        -- Extracted for indexing
    restaurant_id INTEGER,                    -- Local ID from collector
    server_id INTEGER,                        -- Server ID for sync
    restaurant_data JSONB NOT NULL,           -- Complete JSON document
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## How It Works

### 1. Data Flow

```
Collector V2 Export → POST /api/curation/json → restaurants_json table
     [Array]              [JSON Endpoint]         [JSONB Storage]
```

### 2. Processing Logic

For each restaurant in the array:
1. Extract `name` from collector metadata for indexing
2. Extract `restaurant_id` and `server_id` if available
3. Store the **complete JSON** in `restaurant_data` field
4. Use `ON CONFLICT` to update existing restaurants

### 3. Sample Storage

**Input** (your V2 format):
```json
[
  {
    "metadata": [
      {"type": "restaurant", "id": 42, "serverId": 789},
      {"type": "collector", "data": {"name": "Osteria Francescana", ...}},
      {"type": "michelin", "data": {"michelinId": "...", "stars": 3}},
      {"type": "google-places", "data": {"placeId": "...", "rating": 4.6}}
    ],
    "Cuisine": ["Italian", "Contemporary"],
    "Menu": ["Pasta", "Risotto"],
    "Price Range": ["Expensive"]
  }
]
```

**Stored** in database:
```sql
INSERT INTO restaurants_json (
    name,           -- "Osteria Francescana" 
    restaurant_id,  -- 42
    server_id,      -- 789
    restaurant_data -- Complete JSON above
) VALUES (...);
```

## Querying the Data

### Basic Queries

```sql
-- Get all restaurants
SELECT name, restaurant_data FROM restaurants_json;

-- Get restaurants with specific cuisine
SELECT name FROM restaurants_json 
WHERE restaurant_data->'Cuisine' ? 'Italian';

-- Get Michelin starred restaurants
SELECT name FROM restaurants_json
WHERE restaurant_data->'metadata' @> '[{"type": "michelin"}]'
AND restaurant_data->'metadata'->0->'data'->'rating'->>'stars' = '3';

-- Get restaurants by price range
SELECT name FROM restaurants_json
WHERE restaurant_data->'Price Range' ? 'Expensive';
```

### Advanced JSON Queries

```sql
-- Find restaurants with location data
SELECT name, 
       metadata_item->'data'->>'latitude' as lat,
       metadata_item->'data'->>'longitude' as lng
FROM restaurants_json,
     jsonb_array_elements(restaurant_data->'metadata') as metadata_item
WHERE metadata_item->>'type' = 'collector'
  AND metadata_item->'data'->'location' IS NOT NULL;

-- Get all curator categories for a restaurant
SELECT restaurant_data->'Cuisine' as cuisine,
       restaurant_data->'Mood' as mood,
       restaurant_data->'Setting' as setting
FROM restaurants_json 
WHERE name = 'Osteria Francescana';
```

## API Usage

### Store Restaurants

```bash
curl -X POST https://wsmontes.pythonanywhere.com/api/curation/json \
  -H "Content-Type: application/json" \
  -d @concierge_export_example_v2.json
```

**Response**:
```json
{
  "status": "success",
  "processed": 3,
  "message": "Successfully processed 3 restaurants"
}
```

### Error Handling

The API handles various scenarios:
- **Invalid JSON**: Returns 400 with error message
- **Empty array**: Returns 400 with error message
- **Missing name**: Skips restaurant with warning
- **Database errors**: Returns 500 with error details

## Benefits Over Normalized Approach

| Aspect | JSON Approach | Normalized Approach |
|--------|---------------|-------------------|
| **Schema Changes** | None needed | Requires migrations |
| **New Properties** | Automatic support | Need new columns/tables |
| **Query Complexity** | Simple JSON queries | Complex JOINs |
| **Development Speed** | Fast | Slower (schema design) |
| **Flexibility** | Maximum | Limited by schema |
| **Performance** | Excellent with indexes | Good but complex |

## Performance Considerations

1. **JSONB Indexes**: Created for efficient querying
2. **GIN Indexes**: Support complex JSON operations
3. **Extracted Fields**: Common fields indexed separately
4. **PostgreSQL**: Excellent JSONB performance and features

## Migration Strategy

### For New Deployments
1. Run `create_json_schema.sql`
2. Deploy updated `concierge_parser.py`
3. Use `/api/curation/json` endpoint

### For Existing Deployments
1. **Backup existing data**
2. Run JSON schema creation
3. **Optional**: Migrate existing data to JSON format
4. Update Collector to use new endpoint
5. Keep legacy endpoint for transition period

## Testing

Run the test script:
```bash
python test_json_api.py
```

This tests:
- Health check
- JSON endpoint with sample data
- Simple data validation
- Error handling

## Future Enhancements

With JSON storage, you can easily add:
- **Full-text search** on JSON content
- **Analytics** on curator categories
- **API endpoints** for specific queries
- **Data exports** in any format
- **Schema validation** without table changes

## Conclusion

This JSON approach gives you maximum flexibility while maintaining simplicity. Your Collector can evolve its data format without requiring database migrations, and you can add new features quickly.

The key insight is: **Store the data as you export it, query it as you need it.**