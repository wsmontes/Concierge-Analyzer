# Fix Virtual Columns for Optional Fields

## Problem
Virtual columns fail when JSON fields don't exist in some records, causing bulk operations to fail with error:
```
3143 (42000): Invalid JSON path expression
```

## Solution
Drop the existing virtual columns and recreate them with proper NULL handling.

## Commands to Run in MySQL Console

```sql
-- Connect to database
USE wsmontes$concierge_db;

-- Drop existing virtual columns
ALTER TABLE restaurants_v2
    DROP COLUMN IF EXISTS cuisine_list,
    DROP COLUMN IF EXISTS price_range,
    DROP COLUMN IF EXISTS has_michelin_stars;

-- Verify columns are removed
DESCRIBE restaurants_v2;

-- Done! No need to recreate them since they were causing issues
-- The v2_data JSON column contains all information
```

## Alternative: Recreate with NULL-safe JSON extraction

If you want to keep virtual columns for querying, use this instead:

```sql
-- Drop existing virtual columns
ALTER TABLE restaurants_v2
    DROP COLUMN IF EXISTS cuisine_list,
    DROP COLUMN IF EXISTS price_range,
    DROP COLUMN IF EXISTS has_michelin_stars;

-- Add back with NULL handling
ALTER TABLE restaurants_v2
    ADD COLUMN cuisine_list JSON 
    GENERATED ALWAYS AS (
        IF(JSON_CONTAINS_PATH(v2_data, 'one', '$.Cuisine'), 
           JSON_EXTRACT(v2_data, '$.Cuisine'), 
           NULL)
    ) STORED,
    
    ADD COLUMN price_range VARCHAR(50)
    GENERATED ALWAYS AS (
        IF(JSON_CONTAINS_PATH(v2_data, 'one', '$."Price Range"'),
           JSON_UNQUOTE(JSON_EXTRACT(v2_data, '$."Price Range"')),
           NULL)
    ) STORED,
    
    ADD COLUMN has_michelin_stars BOOLEAN
    GENERATED ALWAYS AS (
        IF(JSON_CONTAINS_PATH(v2_data, 'one', '$.metadata'),
           JSON_SEARCH(JSON_EXTRACT(v2_data, '$.metadata'), 'one', 'michelin', NULL, '$[*].type') IS NOT NULL,
           FALSE)
    ) STORED;

-- Add indexes for querying (optional)
CREATE INDEX idx_cuisine ON restaurants_v2 ((CAST(cuisine_list AS CHAR(255))));
CREATE INDEX idx_price ON restaurants_v2 (price_range);
CREATE INDEX idx_michelin ON restaurants_v2 (has_michelin_stars);
```

## Recommended Approach

**Option 1: Remove Virtual Columns (Simplest)**
- Drop all virtual columns
- Query directly from `v2_data` JSON column when needed
- Simpler, more flexible, no maintenance issues

**Option 2: Keep with NULL handling (For Performance)**
- Use NULL-safe virtual columns
- Better query performance for filters
- More complex, requires maintenance

## Execute Fix Now

Copy and paste into PythonAnywhere MySQL console:

```sql
USE wsmontes$concierge_db;

ALTER TABLE restaurants_v2
    DROP COLUMN IF EXISTS cuisine_list,
    DROP COLUMN IF EXISTS price_range,
    DROP COLUMN IF EXISTS has_michelin_stars;

-- Verify
DESCRIBE restaurants_v2;
SELECT COUNT(*) FROM restaurants_v2;
```

After running this, bulk create will work with missing fields!
