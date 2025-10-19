-- Enhanced JSON Schema with Duplicate Prevention
-- Uses composite key: restaurant_name + city + curator_id to prevent duplicates
-- Allows multiple curators per restaurant but prevents duplicate entries

-- Create the main restaurants JSON table with composite unique constraint
CREATE TABLE IF NOT EXISTS restaurants_json (
    id SERIAL PRIMARY KEY,
    
    -- Composite key components for duplicate prevention
    restaurant_name VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    curator_id INTEGER NOT NULL,
    curator_name VARCHAR(255),
    
    -- Additional extracted fields for indexing
    restaurant_id INTEGER, -- Local ID from collector if available
    server_id INTEGER, -- Server ID for sync if available
    
    -- Complete JSON document for the restaurant
    restaurant_data JSONB NOT NULL,
    
    -- Location data extracted for querying
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    full_address TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Composite unique constraint: same restaurant + city + curator = duplicate
    UNIQUE(restaurant_name, city, curator_id)
);

-- Create indexes for performance and querying
CREATE INDEX IF NOT EXISTS idx_restaurants_json_name ON restaurants_json(restaurant_name);
CREATE INDEX IF NOT EXISTS idx_restaurants_json_city ON restaurants_json(city);
CREATE INDEX IF NOT EXISTS idx_restaurants_json_curator ON restaurants_json(curator_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_json_name_city ON restaurants_json(restaurant_name, city);
CREATE INDEX IF NOT EXISTS idx_restaurants_json_restaurant_id ON restaurants_json(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_json_server_id ON restaurants_json(server_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_json_location ON restaurants_json(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_restaurants_json_created_at ON restaurants_json(created_at);

-- GIN index for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_restaurants_json_data ON restaurants_json USING GIN(restaurant_data);

-- Specialized indexes for common JSON queries
CREATE INDEX IF NOT EXISTS idx_restaurants_json_cuisine ON restaurants_json USING GIN((restaurant_data->'Cuisine'));
CREATE INDEX IF NOT EXISTS idx_restaurants_json_price_range ON restaurants_json USING GIN((restaurant_data->'Price Range'));

-- Function to extract city from multiple sources with priority order
CREATE OR REPLACE FUNCTION extract_city_from_json(restaurant_data JSONB) 
RETURNS VARCHAR(255) AS $$
DECLARE
    city_value VARCHAR(255);
    metadata_item JSONB;
    address_text TEXT;
BEGIN
    -- Priority 1: Michelin Guide city (most reliable for restaurant identification)
    FOR metadata_item IN SELECT * FROM jsonb_array_elements(restaurant_data->'metadata') LOOP
        IF metadata_item->>'type' = 'michelin' THEN
            city_value := metadata_item->'data'->'guide'->>'city';
            IF city_value IS NOT NULL AND city_value != '' THEN
                RETURN TRIM(city_value);
            END IF;
        END IF;
    END LOOP;
    
    -- Priority 2: Google Places vicinity or city extraction
    FOR metadata_item IN SELECT * FROM jsonb_array_elements(restaurant_data->'metadata') LOOP
        IF metadata_item->>'type' = 'google-places' THEN
            -- Try vicinity first
            city_value := metadata_item->'data'->'location'->>'vicinity';
            IF city_value IS NOT NULL AND city_value != '' THEN
                -- Extract city from vicinity (e.g., "Via Stella, 22, Modena" -> "Modena")
                city_value := TRIM(SPLIT_PART(city_value, ',', -1));
                IF city_value IS NOT NULL AND city_value != '' THEN
                    RETURN city_value;
                END IF;
            END IF;
            
            -- Try formatted address
            address_text := metadata_item->'data'->'location'->>'formattedAddress';
            IF address_text IS NOT NULL THEN
                -- Extract city from formatted address (basic extraction)
                -- This is a simple approach; you can enhance with more sophisticated parsing
                city_value := extract_city_from_address(address_text);
                IF city_value IS NOT NULL THEN
                    RETURN city_value;
                END IF;
            END IF;
        END IF;
    END LOOP;
    
    -- Priority 3: Collector address extraction
    FOR metadata_item IN SELECT * FROM jsonb_array_elements(restaurant_data->'metadata') LOOP
        IF metadata_item->>'type' = 'collector' THEN
            address_text := metadata_item->'data'->'location'->>'address';
            IF address_text IS NOT NULL THEN
                city_value := extract_city_from_address(address_text);
                IF city_value IS NOT NULL THEN
                    RETURN city_value;
                END IF;
            END IF;
        END IF;
    END LOOP;
    
    -- Fallback: return 'Unknown' to ensure we always have a value
    RETURN 'Unknown';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract city from address string
CREATE OR REPLACE FUNCTION extract_city_from_address(address_text TEXT) 
RETURNS VARCHAR(255) AS $$
DECLARE
    parts TEXT[];
    city_candidate TEXT;
BEGIN
    IF address_text IS NULL OR address_text = '' THEN
        RETURN NULL;
    END IF;
    
    -- Split address by commas and try to find city
    parts := string_to_array(address_text, ',');
    
    -- For addresses like "Via Stella, 22, 41121 Modena MO, Italy"
    -- City is usually before the postal code or country
    FOR i IN 1..array_length(parts, 1) LOOP
        city_candidate := TRIM(parts[i]);
        
        -- Skip if it's clearly not a city (contains numbers for street addresses)
        IF city_candidate ~ '^[0-9]' THEN
            CONTINUE;
        END IF;
        
        -- Skip if it's clearly a postal code (mostly numbers)
        IF city_candidate ~ '^[0-9]{3,6}' THEN
            CONTINUE;
        END IF;
        
        -- Skip if it's a country (common country names)
        IF UPPER(city_candidate) IN ('ITALY', 'FRANCE', 'USA', 'UNITED STATES', 'UK', 'GERMANY', 'SPAIN', 'JAPAN') THEN
            CONTINUE;
        END IF;
        
        -- If we find something that looks like a city, clean it up
        IF length(city_candidate) > 1 AND city_candidate !~ '^[0-9]+$' THEN
            -- Remove common postal code patterns from the city name
            city_candidate := TRIM(regexp_replace(city_candidate, '^[0-9]{3,6}\s+', ''));
            city_candidate := TRIM(regexp_replace(city_candidate, '\s+[A-Z]{2,3}$', ''));
            
            IF length(city_candidate) > 1 THEN
                RETURN city_candidate;
            END IF;
        END IF;
    END LOOP;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract curator information from JSON
CREATE OR REPLACE FUNCTION extract_curator_info(restaurant_data JSONB) 
RETURNS TABLE(curator_id INTEGER, curator_name VARCHAR(255)) AS $$
DECLARE
    metadata_item JSONB;
BEGIN
    -- Look for curator information in restaurant metadata
    FOR metadata_item IN SELECT * FROM jsonb_array_elements(restaurant_data->'metadata') LOOP
        IF metadata_item->>'type' = 'restaurant' THEN
            -- Try created curator first
            IF metadata_item->'created'->'curator' IS NOT NULL THEN
                curator_id := (metadata_item->'created'->'curator'->>'id')::INTEGER;
                curator_name := metadata_item->'created'->'curator'->>'name';
                RETURN NEXT;
                RETURN;
            END IF;
            
            -- Try modified curator
            IF metadata_item->'modified'->'curator' IS NOT NULL THEN
                curator_id := (metadata_item->'modified'->'curator'->>'id')::INTEGER;
                curator_name := metadata_item->'modified'->'curator'->>'name';
                RETURN NEXT;
                RETURN;
            END IF;
        END IF;
    END LOOP;
    
    -- Fallback: return unknown curator
    curator_id := 0;
    curator_name := 'Unknown';
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract restaurant name from JSON
CREATE OR REPLACE FUNCTION extract_restaurant_name_from_json(restaurant_data JSONB) 
RETURNS VARCHAR(255) AS $$
DECLARE
    metadata_item JSONB;
    restaurant_name VARCHAR(255);
BEGIN
    -- Look for name in collector data
    FOR metadata_item IN SELECT * FROM jsonb_array_elements(restaurant_data->'metadata') LOOP
        IF metadata_item->>'type' = 'collector' THEN
            restaurant_name := metadata_item->'data'->>'name';
            IF restaurant_name IS NOT NULL AND restaurant_name != '' THEN
                RETURN TRIM(restaurant_name);
            END IF;
        END IF;
    END LOOP;
    
    RETURN 'Unknown Restaurant';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract location data from JSON
CREATE OR REPLACE FUNCTION extract_location_from_json(restaurant_data JSONB) 
RETURNS TABLE(latitude DECIMAL(10,8), longitude DECIMAL(11,8), full_address TEXT) AS $$
DECLARE
    metadata_item JSONB;
BEGIN
    -- Try collector location first
    FOR metadata_item IN SELECT * FROM jsonb_array_elements(restaurant_data->'metadata') LOOP
        IF metadata_item->>'type' = 'collector' AND metadata_item->'data'->'location' IS NOT NULL THEN
            latitude := (metadata_item->'data'->'location'->>'latitude')::DECIMAL(10,8);
            longitude := (metadata_item->'data'->'location'->>'longitude')::DECIMAL(11,8);
            full_address := metadata_item->'data'->'location'->>'address';
            RETURN NEXT;
            RETURN;
        END IF;
    END LOOP;
    
    -- Try Google Places location
    FOR metadata_item IN SELECT * FROM jsonb_array_elements(restaurant_data->'metadata') LOOP
        IF metadata_item->>'type' = 'google-places' AND metadata_item->'data'->'location' IS NOT NULL THEN
            latitude := (metadata_item->'data'->'location'->>'latitude')::DECIMAL(10,8);
            longitude := (metadata_item->'data'->'location'->>'longitude')::DECIMAL(11,8);
            full_address := metadata_item->'data'->'location'->>'formattedAddress';
            RETURN NEXT;
            RETURN;
        END IF;
    END LOOP;
    
    -- Return nulls if no location found
    latitude := NULL;
    longitude := NULL;
    full_address := NULL;
    RETURN NEXT;
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

-- Create useful views for querying

-- View for unique restaurants (one row per restaurant+city combination)
CREATE OR REPLACE VIEW unique_restaurants AS
SELECT DISTINCT ON (restaurant_name, city)
    restaurant_name,
    city,
    latitude,
    longitude,
    full_address,
    restaurant_data->'Cuisine' as cuisine,
    restaurant_data->'Price Range' as price_range,
    MIN(created_at) as first_created,
    COUNT(*) OVER (PARTITION BY restaurant_name, city) as curator_count
FROM restaurants_json
ORDER BY restaurant_name, city, created_at;

-- View for restaurants with multiple curators
CREATE OR REPLACE VIEW restaurants_multiple_curators AS
SELECT 
    restaurant_name,
    city,
    COUNT(*) as curator_count,
    array_agg(curator_name ORDER BY created_at) as curators,
    array_agg(curator_id ORDER BY created_at) as curator_ids,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM restaurants_json
GROUP BY restaurant_name, city
HAVING COUNT(*) > 1
ORDER BY curator_count DESC, restaurant_name;

-- View for potential duplicates (same name, different cities - might be chains or data issues)
CREATE OR REPLACE VIEW potential_restaurant_chains AS
SELECT 
    restaurant_name,
    COUNT(DISTINCT city) as city_count,
    array_agg(DISTINCT city ORDER BY city) as cities,
    COUNT(*) as total_entries
FROM restaurants_json
GROUP BY restaurant_name
HAVING COUNT(DISTINCT city) > 1
ORDER BY city_count DESC, restaurant_name;

-- View for data quality - restaurants with missing or unclear city information
CREATE OR REPLACE VIEW restaurants_unclear_cities AS
SELECT 
    id,
    restaurant_name,
    city,
    full_address,
    created_at
FROM restaurants_json
WHERE city = 'Unknown' OR city IS NULL
ORDER BY created_at DESC;

-- Add comments for documentation
COMMENT ON TABLE restaurants_json IS 'Main table storing restaurant JSON documents with duplicate prevention using composite key (name + city + curator)';
COMMENT ON COLUMN restaurants_json.restaurant_name IS 'Restaurant name extracted from collector data';
COMMENT ON COLUMN restaurants_json.city IS 'City extracted from Michelin Guide, Google Places, or address parsing';
COMMENT ON COLUMN restaurants_json.curator_id IS 'ID of the curator who created this entry';
COMMENT ON COLUMN restaurants_json.restaurant_data IS 'Complete JSON document containing all restaurant data and metadata';
COMMENT ON CONSTRAINT restaurants_json_restaurant_name_city_curator_id_key ON restaurants_json IS 'Prevents duplicate entries: same restaurant + city + curator';

-- Display setup completion
SELECT 'Enhanced JSON Schema with Duplicate Prevention Created Successfully' as status;
SELECT 'Composite key prevents duplicates: restaurant_name + city + curator_id' as duplicate_prevention;
SELECT 'Use the helper functions to extract city and curator information automatically' as usage;