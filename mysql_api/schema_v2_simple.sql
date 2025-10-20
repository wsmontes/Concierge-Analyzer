-- 
-- Simplified Schema for Concierge V2 Format - Single Table
-- Stores restaurants in pure V2 JSON format for maximum flexibility
-- Dependencies: MySQL 8.0+ for JSON support
--

-- Drop existing tables (clean slate)
DROP TABLE IF EXISTS entity_sync;
DROP TABLE IF EXISTS entities;
DROP TABLE IF EXISTS curators;

-- Single table: restaurants stored in V2 format
CREATE TABLE restaurants_v2 (
    -- Primary key
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Basic indexable fields extracted from V2 for queries
    name VARCHAR(255) NOT NULL,
    entity_type ENUM('restaurant', 'hotel', 'attraction', 'event') DEFAULT 'restaurant',
    
    -- Full V2 JSON data (the complete restaurant object)
    v2_data JSON NOT NULL,
    
    -- Server metadata
    server_id INT DEFAULT NULL COMMENT 'Server-assigned ID for sync',
    sync_status ENUM('synced', 'pending', 'conflict', 'error') DEFAULT 'pending',
    last_synced_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Soft delete support
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Indexes for common queries
    INDEX idx_name (name),
    INDEX idx_entity_type (entity_type),
    INDEX idx_sync_status (sync_status),
    INDEX idx_updated_at (updated_at),
    INDEX idx_deleted_at (deleted_at),
    INDEX idx_server_id (server_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add check constraint to ensure v2_data is valid JSON
ALTER TABLE restaurants_v2 
    ADD CONSTRAINT chk_v2_data_valid 
    CHECK (JSON_VALID(v2_data));

-- Virtual generated columns for better querying (optional, but useful)
ALTER TABLE restaurants_v2
    ADD COLUMN cuisine_list JSON 
    GENERATED ALWAYS AS (JSON_EXTRACT(v2_data, '$.Cuisine')) STORED,
    
    ADD COLUMN price_range JSON
    GENERATED ALWAYS AS (JSON_EXTRACT(v2_data, '$."Price Range"')) STORED,
    
    ADD COLUMN has_michelin_stars BOOLEAN
    GENERATED ALWAYS AS (
        JSON_CONTAINS_PATH(v2_data, 'one', '$.metadata[*].type', 'michelin')
    ) STORED;

-- Index on generated columns for faster filtering
CREATE INDEX idx_cuisine ON restaurants_v2 ((CAST(cuisine_list AS CHAR(255) ARRAY)));
CREATE INDEX idx_has_michelin ON restaurants_v2 (has_michelin_stars);

-- Comments for documentation
ALTER TABLE restaurants_v2 
    COMMENT = 'Single table storing restaurants in Concierge V2 JSON format';

-- Show the table structure
DESCRIBE restaurants_v2;

-- Example: Insert a restaurant in V2 format
-- INSERT INTO restaurants_v2 (name, entity_type, v2_data, server_id, sync_status) 
-- VALUES (
--     'Osteria Francescana',
--     'restaurant',
--     '{"metadata": [...], "Cuisine": ["Italian"], ...}',
--     789,
--     'synced'
-- );

-- Example: Query restaurants by cuisine
-- SELECT id, name, cuisine_list 
-- FROM restaurants_v2 
-- WHERE JSON_CONTAINS(cuisine_list, '"Italian"')
-- AND deleted_at IS NULL;

-- Example: Get all Michelin-starred restaurants
-- SELECT id, name
-- FROM restaurants_v2
-- WHERE has_michelin_stars = TRUE
-- AND deleted_at IS NULL;

-- Example: Export all restaurants in V2 format
-- SELECT v2_data FROM restaurants_v2 WHERE deleted_at IS NULL;
