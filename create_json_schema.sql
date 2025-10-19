-- Concierge Collector JSON Storage Approach
-- Simple, flexible schema that stores complete restaurant JSON documents
-- Future-proof design that handles any data structure changes

-- Create the main restaurants JSON table
CREATE TABLE IF NOT EXISTS restaurants_json (
    id SERIAL PRIMARY KEY,
    
    -- Basic identifiers for indexing and queries
    name VARCHAR(255) NOT NULL,
    restaurant_id INTEGER, -- Local ID from collector if available
    server_id INTEGER, -- Server ID for sync if available
    
    -- Complete JSON document for the restaurant
    restaurant_data JSONB NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique restaurants by name (can be changed to other criteria if needed)
    UNIQUE(name)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_restaurants_json_name ON restaurants_json(name);
CREATE INDEX IF NOT EXISTS idx_restaurants_json_restaurant_id ON restaurants_json(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_json_server_id ON restaurants_json(server_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_json_created_at ON restaurants_json(created_at);

-- GIN index for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_restaurants_json_data ON restaurants_json USING GIN(restaurant_data);

-- Specialized indexes for common JSON queries
CREATE INDEX IF NOT EXISTS idx_restaurants_json_cuisine ON restaurants_json USING GIN((restaurant_data->'Cuisine'));
CREATE INDEX IF NOT EXISTS idx_restaurants_json_price_range ON restaurants_json USING GIN((restaurant_data->'Price Range'));
CREATE INDEX IF NOT EXISTS idx_restaurants_json_sync_status ON restaurants_json USING GIN((restaurant_data->'metadata'));

-- Function to extract restaurant name from JSON (fallback if name field is missing)
CREATE OR REPLACE FUNCTION extract_restaurant_name(restaurant_data JSONB) 
RETURNS VARCHAR(255) AS $$
BEGIN
    -- Try to get name from collector data first
    RETURN COALESCE(
        restaurant_data->'metadata'->0->'data'->>'name',
        restaurant_data->'metadata'->1->'data'->>'name',
        restaurant_data->'metadata'->2->'data'->>'name',
        'Unknown Restaurant'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract restaurant ID from JSON metadata
CREATE OR REPLACE FUNCTION extract_restaurant_id(restaurant_data JSONB) 
RETURNS INTEGER AS $$
BEGIN
    -- Look for restaurant metadata type
    FOR i IN 0..jsonb_array_length(restaurant_data->'metadata')-1 LOOP
        IF restaurant_data->'metadata'->i->>'type' = 'restaurant' THEN
            RETURN (restaurant_data->'metadata'->i->>'id')::INTEGER;
        END IF;
    END LOOP;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract server ID from JSON metadata
CREATE OR REPLACE FUNCTION extract_server_id(restaurant_data JSONB) 
RETURNS INTEGER AS $$
BEGIN
    -- Look for restaurant metadata type with serverId
    FOR i IN 0..jsonb_array_length(restaurant_data->'metadata')-1 LOOP
        IF restaurant_data->'metadata'->i->>'type' = 'restaurant' THEN
            RETURN (restaurant_data->'metadata'->i->>'serverId')::INTEGER;
        END IF;
    END LOOP;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_restaurants_json_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_restaurants_json_updated_at ON restaurants_json;
CREATE TRIGGER update_restaurants_json_updated_at
    BEFORE UPDATE ON restaurants_json
    FOR EACH ROW
    EXECUTE FUNCTION update_restaurants_json_updated_at();

-- Create useful views for common queries

-- View for basic restaurant info
CREATE OR REPLACE VIEW restaurants_basic AS
SELECT 
    id,
    name,
    restaurant_id,
    server_id,
    extract_restaurant_name(restaurant_data) as extracted_name,
    restaurant_data->'Cuisine' as cuisine,
    restaurant_data->'Price Range' as price_range,
    restaurant_data->'Mood' as mood,
    created_at,
    updated_at
FROM restaurants_json;

-- View for restaurants with location data
CREATE OR REPLACE VIEW restaurants_with_location AS
SELECT 
    id,
    name,
    (metadata_item->'data'->>'latitude')::DECIMAL as latitude,
    (metadata_item->'data'->>'longitude')::DECIMAL as longitude,
    metadata_item->'data'->>'address' as address,
    created_at
FROM restaurants_json,
     jsonb_array_elements(restaurant_data->'metadata') as metadata_item
WHERE metadata_item->>'type' = 'collector'
  AND metadata_item->'data'->'location' IS NOT NULL;

-- View for Michelin restaurants
CREATE OR REPLACE VIEW restaurants_michelin AS
SELECT 
    id,
    name,
    (metadata_item->'data'->'rating'->>'stars')::INTEGER as michelin_stars,
    metadata_item->'data'->'rating'->>'distinction' as distinction,
    metadata_item->'data'->>'michelinDescription' as description,
    metadata_item->'data'->>'michelinUrl' as url,
    created_at
FROM restaurants_json,
     jsonb_array_elements(restaurant_data->'metadata') as metadata_item
WHERE metadata_item->>'type' = 'michelin';

-- View for Google Places restaurants
CREATE OR REPLACE VIEW restaurants_google AS
SELECT 
    id,
    name,
    metadata_item->'data'->>'placeId' as place_id,
    (metadata_item->'data'->'rating'->>'average')::DECIMAL as google_rating,
    (metadata_item->'data'->'rating'->>'totalRatings')::INTEGER as total_ratings,
    (metadata_item->'data'->'rating'->>'priceLevel')::INTEGER as price_level,
    created_at
FROM restaurants_json,
     jsonb_array_elements(restaurant_data->'metadata') as metadata_item
WHERE metadata_item->>'type' = 'google-places';

-- Add comments for documentation
COMMENT ON TABLE restaurants_json IS 'Main table storing complete restaurant JSON documents from Concierge Collector';
COMMENT ON COLUMN restaurants_json.restaurant_data IS 'Complete JSON document containing all restaurant data, metadata, and curator categories';
COMMENT ON COLUMN restaurants_json.name IS 'Restaurant name extracted for indexing and unique constraints';
COMMENT ON COLUMN restaurants_json.restaurant_id IS 'Local restaurant ID from collector metadata if available';
COMMENT ON COLUMN restaurants_json.server_id IS 'Server restaurant ID for sync operations if available';

-- Display setup completion
SELECT 'JSON Storage Schema Created Successfully' as status;
SELECT 'Use INSERT INTO restaurants_json (name, restaurant_data) VALUES (...) to store restaurants' as usage;