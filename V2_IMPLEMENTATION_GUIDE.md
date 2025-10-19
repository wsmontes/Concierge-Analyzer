# Concierge Collector V2 API Implementation Guide

## Overview

This guide outlines the steps needed to update your API and database to support the new Concierge Collector V2 data model with rich metadata structure.

## What's New in V2

### Data Structure Changes
- **Rich Metadata**: Restaurant data now includes multiple metadata sources (collector, michelin, google-places)
- **Curator Categories**: Categories are now at the root level as direct properties
- **Enhanced Location Data**: Latitude, longitude, and address with source tracking
- **Photos Support**: Base64 encoded photos with metadata
- **Sync Information**: Full sync status tracking with timestamps
- **External API Data**: Integrated Michelin and Google Places data

### API Changes
- **New Endpoint**: `/api/curation/v2` for the new data format
- **Legacy Support**: Original `/api/curation` endpoint remains for backward compatibility
- **Enhanced Error Handling**: Better validation and error responses

## Implementation Steps

### 1. Database Migration

Run the V2 database migration script to update your schema:

```sql
-- Execute the migration script
\i migrate_to_v2_schema.sql

-- Run the data migration function (if you have existing data)
SELECT migrate_to_v2();
```

The migration script will:
- Create new `restaurants_v2` table with comprehensive fields
- Add support tables for photos and reviews
- Create indexes for optimal performance
- Set up backward compatibility views
- Migrate existing data from old structure

### 2. API Implementation

The new V2 API endpoint has been added to `concierge_parser.py`:

- **Endpoint**: `POST /api/curation/v2`
- **Input**: Array of restaurant objects (as per V2 schema)
- **Output**: Success/error response with processing count

### 3. Key Features

#### Metadata Processing
The V2 processor handles multiple metadata types:
- `restaurant`: System metadata (IDs, sync status, timestamps)
- `collector`: Curator-entered data (descriptions, notes, photos)
- `michelin`: Michelin Guide data (stars, description, URL)
- `google-places`: Google Places API data (rating, reviews, hours)

#### Backward Compatibility
- Legacy `/api/curation` endpoint continues to work
- Data migration preserves existing relationships
- Views provide legacy-compatible data access

#### Enhanced Features
- **Location Tracking**: Knows who entered location data (curator, michelin, google-places)
- **Photo Storage**: Supports curator and Google Places photos
- **Sync Status**: Tracks synchronization state with server
- **Rich Search**: JSON storage enables complex queries

## Database Schema Overview

### Main Tables
- `restaurants_v2`: Primary restaurant data with all metadata
- `restaurant_photos`: Photo storage with source tracking
- `restaurant_reviews`: External reviews (Google Places, etc.)
- `concept_categories`: Curator category definitions
- `concepts`: Individual concept values
- `restaurant_concepts`: Many-to-many relationship

### Key Fields in `restaurants_v2`
```sql
-- Core Data
name, description, transcription
latitude, longitude, address, location_entered_by

-- Sync & System
local_id, server_id, sync_status, last_synced_at
created_timestamp, curator_id, curator_name

-- External Data
michelin_id, michelin_stars, michelin_description
google_place_id, google_rating, google_total_ratings

-- JSON Storage
metadata_json -- Complete external API responses
```

## Testing the Implementation

### 1. Health Check
```bash
curl https://wsmontes.pythonanywhere.com/api/health
```

### 2. Test V2 Endpoint
```bash
curl -X POST https://wsmontes.pythonanywhere.com/api/curation/v2 \
  -H "Content-Type: application/json" \
  -d @concierge_export_example_v2.json
```

### 3. Verify Data
```sql
-- Check restaurant data
SELECT name, sync_status, michelin_stars, google_rating 
FROM restaurants_v2 
LIMIT 5;

-- Check curator categories
SELECT r.name, cc.name as category, c.value
FROM restaurants_v2 r
JOIN restaurant_concepts rc ON r.id = rc.restaurant_id
JOIN concepts c ON rc.concept_id = c.id
JOIN concept_categories cc ON c.category_id = cc.id
WHERE r.name = 'Osteria Francescana';
```

## Migration Checklist

- [ ] **Backup Database**: Create full backup before migration
- [ ] **Run Migration Script**: Execute `migrate_to_v2_schema.sql`
- [ ] **Migrate Existing Data**: Run `SELECT migrate_to_v2();`
- [ ] **Update Application**: Deploy updated `concierge_parser.py`
- [ ] **Test V2 Endpoint**: Verify new API works with sample data
- [ ] **Test Legacy Endpoint**: Ensure backward compatibility
- [ ] **Update Collector App**: Switch to V2 export format
- [ ] **Monitor Logs**: Watch for any processing errors

## Rollback Plan

If issues arise, you can rollback:

1. **API Rollback**: Remove V2 endpoints from `concierge_parser.py`
2. **Database Rollback**: Use backup to restore previous state
3. **Application Rollback**: Revert Collector app to V1 format

## Performance Considerations

- **Indexes**: Migration creates optimized indexes for common queries
- **JSON Storage**: Enable efficient querying of metadata
- **Batch Processing**: V2 endpoint handles multiple restaurants efficiently
- **Connection Pooling**: Use database connection pooling for scale

## Security Notes

- **Input Validation**: V2 endpoint validates data structure
- **SQL Injection**: All queries use parameterized statements
- **Error Handling**: Sensitive information not exposed in errors
- **CORS**: Properly configured for cross-origin requests

## Monitoring

Key metrics to monitor post-migration:
- API response times for both V1 and V2 endpoints
- Database query performance
- Error rates in log files
- Storage usage (photos can be large)

## Support

For issues or questions:
1. Check application logs for errors
2. Verify database connectivity with `/api/health`
3. Test with sample data from `concierge_export_example_v2.json`
4. Review schema with provided SQL queries

## Next Steps

After successful implementation:
1. **Phase Out V1**: Plan deprecation of legacy endpoint
2. **Enhance Features**: Add new capabilities like review processing
3. **Analytics**: Leverage rich metadata for better insights
4. **Performance**: Monitor and optimize based on usage patterns