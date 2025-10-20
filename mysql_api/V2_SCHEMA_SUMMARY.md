# V2 Schema Simplification - Summary

## What We're Doing

**Simplifying from:**
- 3 tables (entities, curators, entity_sync)
- Complex relationships and joins
- Multiple data formats

**To:**
- 1 table (restaurants_v2)
- Pure V2 JSON format
- Simple, flexible, fast

## The New Schema

```sql
restaurants_v2
├── id                  - Primary key
├── name                - Restaurant name (indexed for search)
├── entity_type         - restaurant/hotel/attraction/event
├── v2_data             - Complete V2 JSON (the entire restaurant object)
├── server_id           - For sync with server
├── sync_status         - synced/pending/conflict/error
├── last_synced_at      - Last sync timestamp
├── created_at          - Creation timestamp
├── updated_at          - Last update timestamp
├── deleted_at          - Soft delete timestamp
└── Virtual Columns (auto-generated from v2_data):
    ├── cuisine_list           - Extracted Cuisine array
    ├── price_range            - Extracted Price Range
    └── has_michelin_stars     - Boolean flag
```

## Files Created

1. **`schema_v2_simple.sql`** - Complete schema with comments
2. **`DEPLOY_V2_SCHEMA.sql`** - Quick copy-paste commands
3. **`V2_SCHEMA_MIGRATION.md`** - Detailed migration guide

## Deployment Steps

### On PythonAnywhere MySQL Console:

```bash
# 1. Open MySQL console (Databases tab → click wsmontes$concierge_db)

# 2. Run these commands (from DEPLOY_V2_SCHEMA.sql):
SHOW TABLES;                           # Check current state
DROP TABLE IF EXISTS entity_sync;      # Clean slate
DROP TABLE IF EXISTS entities;
DROP TABLE IF EXISTS curators;

# 3. Create new table (copy entire CREATE TABLE statement)

# 4. Verify
DESCRIBE restaurants_v2;
SELECT COUNT(*) FROM restaurants_v2;  # Should be 0
```

## Benefits

### 1. **Simplicity**
- ✅ One table instead of three
- ✅ No joins needed
- ✅ Easier to understand

### 2. **V2 Native**
- ✅ Stores complete V2 format
- ✅ Import = direct insert
- ✅ Export = direct select

### 3. **Flexible**
- ✅ No schema changes for new fields
- ✅ Supports any V2 metadata type
- ✅ Easy to extend

### 4. **Fast**
- ✅ Virtual columns for filtering
- ✅ Indexes on common queries
- ✅ JSON native operations

## What Happens Next

### Phase 1: Database (This Step)
1. Execute SQL commands on PythonAnywhere
2. Verify new table exists
3. Old data is gone (database was empty anyway)

### Phase 2: API Code (Next Step)
1. Simplify `models.py` - Single RestaurantV2 model
2. Update `app.py` - New V2-native endpoints
3. Remove old entity/curator code
4. Add granular metadata endpoints

### Phase 3: Client Code (After API)
1. Update to use new endpoints
2. Test import/export
3. Verify two-way sync

## Example Usage

### Import V2 Restaurant:
```python
# API receives V2 JSON array
POST /api/v2/restaurants

# Backend does:
INSERT INTO restaurants_v2 (name, v2_data)
SELECT 
    JSON_UNQUOTE(JSON_EXTRACT(v2_json, '$.metadata[0].data.name')),
    v2_json
FROM imported_data;
```

### Export All Restaurants:
```python
# API endpoint
GET /api/v2/restaurants

# Backend does:
SELECT v2_data FROM restaurants_v2 WHERE deleted_at IS NULL;
# Returns array of V2 objects
```

### Query by Cuisine:
```python
GET /api/v2/restaurants?cuisine=Italian

# Backend does:
SELECT v2_data 
FROM restaurants_v2 
WHERE JSON_CONTAINS(cuisine_list, '"Italian"')
AND deleted_at IS NULL;
```

## Risk Assessment

**Risk Level:** ✅ **VERY LOW**
- Database is currently empty
- No data loss possible
- Easy to rollback
- Single table = simpler

**Time Required:** 
- Database migration: 5 minutes
- API code update: 1-2 hours
- Testing: 30 minutes

## Current Status

- ✅ Schema designed
- ✅ SQL files created
- ✅ Migration guide written
- ⏳ Awaiting deployment to MySQL
- ⏳ API code to be updated
- ⏳ Client code to be updated

---

## Ready to Deploy?

**Just run the commands from `DEPLOY_V2_SCHEMA.sql` in your MySQL console!**

The database will be ready, then we'll update the Python API code to match.
