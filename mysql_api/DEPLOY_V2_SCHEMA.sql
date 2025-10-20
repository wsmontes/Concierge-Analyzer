# 
# Quick MySQL Commands - V2 Schema Deployment
# Copy-paste these commands in PythonAnywhere MySQL console
#

-- ===========================================
-- STEP 1: CHECK CURRENT STATE
-- ===========================================

-- See what tables currently exist
SHOW TABLES;

-- Check if there's any data (skip if you don't care about old data)
SELECT COUNT(*) as entity_count FROM entities;
SELECT COUNT(*) as curator_count FROM curators;
SELECT COUNT(*) as sync_count FROM entity_sync;


-- ===========================================
-- STEP 2: DROP OLD TABLES (CLEAN SLATE)
-- ===========================================

DROP TABLE IF EXISTS entity_sync;
DROP TABLE IF EXISTS entities;
DROP TABLE IF EXISTS curators;


-- ===========================================
-- STEP 3: CREATE NEW V2 TABLE
-- ===========================================

CREATE TABLE restaurants_v2 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    entity_type ENUM('restaurant', 'hotel', 'attraction', 'event') DEFAULT 'restaurant',
    v2_data JSON NOT NULL,
    server_id INT DEFAULT NULL COMMENT 'Server-assigned ID for sync',
    sync_status ENUM('synced', 'pending', 'conflict', 'error') DEFAULT 'pending',
    last_synced_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_name (name),
    INDEX idx_entity_type (entity_type),
    INDEX idx_sync_status (sync_status),
    INDEX idx_updated_at (updated_at),
    INDEX idx_deleted_at (deleted_at),
    INDEX idx_server_id (server_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ===========================================
-- STEP 4: ADD VIRTUAL COLUMNS (OPTIONAL)
-- ===========================================

ALTER TABLE restaurants_v2
    ADD COLUMN cuisine_list JSON 
    GENERATED ALWAYS AS (JSON_EXTRACT(v2_data, '$.Cuisine')) STORED,
    
    ADD COLUMN price_range JSON
    GENERATED ALWAYS AS (JSON_EXTRACT(v2_data, '$."Price Range"')) STORED,
    
    ADD COLUMN has_michelin_stars BOOLEAN
    GENERATED ALWAYS AS (
        JSON_CONTAINS_PATH(v2_data, 'one', '$.metadata[*].type', 'michelin')
    ) STORED;


-- ===========================================
-- STEP 5: VERIFY NEW SCHEMA
-- ===========================================

-- Check tables
SHOW TABLES;

-- Should show only: restaurants_v2

-- Check structure
DESCRIBE restaurants_v2;

-- Verify it's empty
SELECT COUNT(*) FROM restaurants_v2;


-- ===========================================
-- DONE! Ready for application code update
-- ===========================================

-- Next: Update Python code to use new schema
-- Then: Deploy to PythonAnywhere
-- Then: Test with client
