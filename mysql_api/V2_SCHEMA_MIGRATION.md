# 
# V2 Schema Migration Guide
# Switch from complex multi-table schema to simple single-table V2 format
#

## Overview

This migration simplifies the database to a **single table** that stores restaurants in pure V2 JSON format. This is:
- ✅ **Simpler** - One table instead of three
- ✅ **Flexible** - Full V2 format preserved
- ✅ **Queryable** - Generated columns for filtering
- ✅ **Future-proof** - Easy to add new endpoints

## Step 1: Backup Existing Data (if any)

```sql
-- Connect to MySQL
mysql -u wsmontes -h wsmontes.mysql.pythonanywhere-services.com -p wsmontes$concierge_db

-- Check if there's any data
SELECT COUNT(*) FROM entities;
SELECT COUNT(*) FROM curators;
SELECT COUNT(*) FROM entity_sync;

-- If you have data you want to keep, export it first
-- (Skip if database is empty)
SELECT * FROM entities INTO OUTFILE '/tmp/entities_backup.json';
```

## Step 2: Apply New Schema

On PythonAnywhere:

1. Go to **Databases** tab
2. Click on **wsmontes$concierge_db** to open MySQL console
3. Copy and paste the entire contents of `schema_v2_simple.sql`
4. Execute

**OR** via command line:

```bash
# Upload schema_v2_simple.sql to PythonAnywhere
# Then in bash console:
mysql -u wsmontes -h wsmontes.mysql.pythonanywhere-services.com -p wsmontes$concierge_db < /home/wsmontes/Concierge-Analyzer/mysql_api/schema_v2_simple.sql
```

## Step 3: Verify New Schema

```sql
-- Check the new table exists
SHOW TABLES;

-- Should show:
-- +----------------------------------+
-- | Tables_in_wsmontes$concierge_db |
-- +----------------------------------+
-- | restaurants_v2                   |
-- +----------------------------------+

-- Check table structure
DESCRIBE restaurants_v2;

-- Verify it's empty
SELECT COUNT(*) FROM restaurants_v2;
```

## Step 4: Update Application Code

After schema is deployed, you'll update:
1. `models.py` - Simplified model for V2 table
2. `app.py` - New endpoints for V2 operations
3. `database.py` - No changes needed

## New Table Structure

```sql
restaurants_v2
├── id (INT, AUTO_INCREMENT, PRIMARY KEY)
├── name (VARCHAR(255), NOT NULL) - Extracted for indexing
├── entity_type (ENUM) - restaurant, hotel, attraction, event
├── v2_data (JSON, NOT NULL) - Full V2 format object
├── server_id (INT, NULL) - Server sync ID
├── sync_status (ENUM) - synced, pending, conflict, error
├── last_synced_at (TIMESTAMP, NULL)
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
├── deleted_at (TIMESTAMP, NULL) - Soft delete
├── cuisine_list (JSON, GENERATED) - Virtual column
├── price_range (JSON, GENERATED) - Virtual column
└── has_michelin_stars (BOOLEAN, GENERATED) - Virtual column
```

## Benefits of New Schema

### 1. **Simplicity**
- One table instead of three
- No complex joins
- No foreign key constraints

### 2. **Flexibility**
- Full V2 format preserved
- Easy to add new metadata types
- No schema changes for new fields

### 3. **Performance**
- Virtual columns for fast filtering
- Indexes on common queries
- JSON native operations

### 4. **Sync-Friendly**
- Direct V2 import/export
- Server ID tracking built-in
- Sync status management

## Example Operations

### Insert Restaurant (V2 Format)
```sql
INSERT INTO restaurants_v2 (name, entity_type, v2_data, server_id, sync_status) 
VALUES (
    'Osteria Francescana',
    'restaurant',
    JSON_OBJECT(
        'metadata', JSON_ARRAY(
            JSON_OBJECT(
                'type', 'collector',
                'source', 'local',
                'data', JSON_OBJECT('name', 'Osteria Francescana')
            )
        ),
        'Cuisine', JSON_ARRAY('Italian', 'Contemporary'),
        'Price Range', JSON_ARRAY('Expensive')
    ),
    789,
    'synced'
);
```

### Query by Cuisine
```sql
SELECT id, name, cuisine_list 
FROM restaurants_v2 
WHERE JSON_CONTAINS(cuisine_list, '"Italian"')
AND deleted_at IS NULL;
```

### Export All in V2 Format
```sql
SELECT v2_data 
FROM restaurants_v2 
WHERE deleted_at IS NULL
ORDER BY updated_at DESC;
```

### Get Michelin-Starred Restaurants
```sql
SELECT id, name, v2_data
FROM restaurants_v2
WHERE has_michelin_stars = TRUE
AND deleted_at IS NULL;
```

### Update Restaurant (Preserves V2 Format)
```sql
UPDATE restaurants_v2
SET v2_data = JSON_SET(
    v2_data,
    '$.Cuisine',
    JSON_ARRAY('Italian', 'Contemporary', 'Molecular')
),
sync_status = 'pending'
WHERE id = 1;
```

### Soft Delete
```sql
UPDATE restaurants_v2
SET deleted_at = CURRENT_TIMESTAMP,
    sync_status = 'pending'
WHERE id = 1;
```

## Migration Checklist

- [ ] Backup existing data (if any)
- [ ] Execute `schema_v2_simple.sql` on MySQL
- [ ] Verify new table structure
- [ ] Test insert/query operations
- [ ] Update application code (next phase)
- [ ] Deploy updated API to PythonAnywhere
- [ ] Test import/export endpoints
- [ ] Update client code to use new endpoints

## Rollback Plan

If you need to rollback:

```sql
-- Drop the new table
DROP TABLE IF EXISTS restaurants_v2;

-- Recreate old schema
SOURCE schema.sql;  -- Your original schema file
```

## Next Steps

After schema migration:
1. ✅ Simplify `models.py` - Single `RestaurantV2` model
2. ✅ Update `app.py` - Clean V2 endpoints
3. ✅ Add granular endpoints for metadata access
4. ✅ Test two-way sync
5. ✅ Update client code

---

**Status**: Ready to deploy
**Risk**: Low (database is currently empty)
**Time**: 5 minutes
