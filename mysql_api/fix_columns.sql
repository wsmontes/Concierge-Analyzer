-- Fix Virtual Columns to Handle Missing JSON Fields
-- Run this in PythonAnywhere MySQL Console

USE wsmontes$concierge_db;

-- Drop the functional indexes first (they depend on virtual columns)
ALTER TABLE restaurants_v2 DROP INDEX idx_cuisine;
ALTER TABLE restaurants_v2 DROP INDEX idx_has_michelin;

-- Now drop the virtual columns
ALTER TABLE restaurants_v2 DROP COLUMN cuisine_list;
ALTER TABLE restaurants_v2 DROP COLUMN price_range;
ALTER TABLE restaurants_v2 DROP COLUMN has_michelin_stars;

-- Verify the fix
DESCRIBE restaurants_v2;

-- Test that table is working
SELECT COUNT(*) as total_restaurants FROM restaurants_v2;

-- Done! Bulk operations will now work with missing fields
