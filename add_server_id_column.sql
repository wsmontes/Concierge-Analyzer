-- Database Schema Migration SQL
-- Adds server_id column to restaurants table for sync functionality

-- Check if server_id column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'restaurants' 
AND column_name = 'server_id';

-- Add server_id column if it doesn't exist
ALTER TABLE restaurants 
ADD COLUMN server_id VARCHAR(255);

-- Create index for better performance
CREATE INDEX idx_restaurants_server_id 
ON restaurants(server_id);

-- Verify the change
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'restaurants' 
AND column_name = 'server_id';

-- Show updated table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'restaurants'
ORDER BY ordinal_position;