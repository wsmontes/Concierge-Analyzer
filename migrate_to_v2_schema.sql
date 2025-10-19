-- Concierge Collector V2 Database Migration
-- Migrates database schema to support the new V2 data model with rich metadata
-- Run this script to update your database structure

-- Create new restaurants_v2 table with comprehensive fields
CREATE TABLE IF NOT EXISTS restaurants_v2 (
    id SERIAL PRIMARY KEY,
    
    -- Core restaurant data (from collector)
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    transcription TEXT,
    
    -- Location data
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    location_entered_by VARCHAR(50), -- 'curator', 'michelin', 'google-places'
    
    -- Notes
    private_notes TEXT,
    public_notes TEXT,
    
    -- Restaurant metadata (system/sync data)
    local_id INTEGER, -- Original local ID from Collector
    server_id INTEGER, -- Server-assigned ID for sync
    created_timestamp TIMESTAMP WITH TIME ZONE,
    curator_id INTEGER,
    curator_name VARCHAR(255),
    
    -- Sync information
    sync_status VARCHAR(50), -- 'synced', 'pending', 'conflict', 'error'
    last_synced_at TIMESTAMP WITH TIME ZONE,
    deleted_locally BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Michelin data
    michelin_id VARCHAR(255),
    michelin_stars INTEGER CHECK (michelin_stars >= 0 AND michelin_stars <= 3),
    michelin_distinction VARCHAR(255),
    michelin_description TEXT,
    michelin_url TEXT,
    michelin_pricing_range VARCHAR(10),
    michelin_average_price DECIMAL(10, 2),
    
    -- Google Places data
    google_place_id VARCHAR(255),
    google_rating DECIMAL(3, 2) CHECK (google_rating >= 0 AND google_rating <= 5),
    google_total_ratings INTEGER,
    google_price_level INTEGER CHECK (google_price_level >= 0 AND google_price_level <= 4),
    google_business_status VARCHAR(50),
    google_phone_number VARCHAR(50),
    google_website TEXT,
    
    -- JSON storage for complete metadata
    metadata_json JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurants_v2_name ON restaurants_v2(name);
CREATE INDEX IF NOT EXISTS idx_restaurants_v2_server_id ON restaurants_v2(server_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_v2_local_id ON restaurants_v2(local_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_v2_sync_status ON restaurants_v2(sync_status);
CREATE INDEX IF NOT EXISTS idx_restaurants_v2_location ON restaurants_v2(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_restaurants_v2_michelin_id ON restaurants_v2(michelin_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_v2_google_place_id ON restaurants_v2(google_place_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_v2_metadata_json ON restaurants_v2 USING GIN(metadata_json);

-- Create photos table for restaurant images
CREATE TABLE IF NOT EXISTS restaurant_photos (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER REFERENCES restaurants_v2(id) ON DELETE CASCADE,
    photo_id INTEGER, -- Original photo ID from source
    photo_data TEXT, -- Base64 encoded image or URL
    captured_by VARCHAR(50), -- 'curator', 'google-places'
    timestamp TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(restaurant_id, photo_id)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_photos_restaurant_id ON restaurant_photos(restaurant_id);

-- Create table for Google Places reviews
CREATE TABLE IF NOT EXISTS restaurant_reviews (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER REFERENCES restaurants_v2(id) ON DELETE CASCADE,
    source VARCHAR(50) DEFAULT 'google-places',
    author VARCHAR(255),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    review_time INTEGER, -- Unix timestamp
    relative_time VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_reviews_restaurant_id ON restaurant_reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_reviews_source ON restaurant_reviews(source);

-- Extend concept_categories if it doesn't exist
CREATE TABLE IF NOT EXISTS concept_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert V2 categories if they don't exist
INSERT INTO concept_categories (name) VALUES 
    ('Cuisine'),
    ('Menu'),
    ('Price Range'),
    ('Mood'),
    ('Setting'),
    ('Crowd'),
    ('Suitable For'),
    ('Food Style'),
    ('Drinks'),
    ('Special Features')
ON CONFLICT (name) DO NOTHING;

-- Extend concepts table if it doesn't exist
CREATE TABLE IF NOT EXISTS concepts (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES concept_categories(id) ON DELETE CASCADE,
    value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(category_id, value)
);

CREATE INDEX IF NOT EXISTS idx_concepts_category_id ON concepts(category_id);
CREATE INDEX IF NOT EXISTS idx_concepts_value ON concepts(value);

-- Extend restaurant_concepts table if it doesn't exist
CREATE TABLE IF NOT EXISTS restaurant_concepts (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER REFERENCES restaurants_v2(id) ON DELETE CASCADE,
    concept_id INTEGER REFERENCES concepts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(restaurant_id, concept_id)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_concepts_restaurant_id ON restaurant_concepts(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_concepts_concept_id ON restaurant_concepts(concept_id);

-- Create migration function to move data from old structure to new
CREATE OR REPLACE FUNCTION migrate_to_v2() RETURNS VOID AS $$
DECLARE
    old_restaurant RECORD;
    new_restaurant_id INTEGER;
BEGIN
    -- Check if old restaurants table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'restaurants') THEN
        -- Migrate existing restaurants
        FOR old_restaurant IN SELECT * FROM restaurants LOOP
            INSERT INTO restaurants_v2 (
                name, description, transcription, server_id, created_at
            ) VALUES (
                old_restaurant.name, 
                old_restaurant.description, 
                old_restaurant.transcription,
                old_restaurant.server_id,
                COALESCE(old_restaurant.timestamp, NOW())
            ) ON CONFLICT (name) DO UPDATE SET
                description = EXCLUDED.description,
                transcription = EXCLUDED.transcription,
                server_id = EXCLUDED.server_id
            RETURNING id INTO new_restaurant_id;
            
            -- Migrate restaurant_concepts relationships
            IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'restaurant_concepts') THEN
                INSERT INTO restaurant_concepts (restaurant_id, concept_id)
                SELECT new_restaurant_id, rc.concept_id
                FROM restaurant_concepts rc
                WHERE rc.restaurant_id = old_restaurant.id
                ON CONFLICT (restaurant_id, concept_id) DO NOTHING;
            END IF;
        END LOOP;
        
        RAISE NOTICE 'Migration completed successfully';
    ELSE
        RAISE NOTICE 'No old restaurants table found, skipping migration';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for restaurants_v2
DROP TRIGGER IF EXISTS update_restaurants_v2_updated_at ON restaurants_v2;
CREATE TRIGGER update_restaurants_v2_updated_at
    BEFORE UPDATE ON restaurants_v2
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create view for backward compatibility
CREATE OR REPLACE VIEW restaurants_legacy AS
SELECT 
    id,
    name,
    description,
    transcription,
    server_id,
    created_at as timestamp
FROM restaurants_v2;

-- Create view for API responses
CREATE OR REPLACE VIEW restaurants_api_view AS
SELECT 
    r.id,
    r.name,
    r.description,
    r.transcription,
    r.latitude,
    r.longitude,
    r.address,
    r.private_notes,
    r.public_notes,
    r.server_id,
    r.sync_status,
    r.last_synced_at,
    r.michelin_stars,
    r.michelin_distinction,
    r.google_rating,
    r.google_total_ratings,
    r.created_at,
    r.updated_at,
    -- Aggregate curator categories
    COALESCE(
        json_object_agg(
            cc.name, 
            concept_values.values
        ) FILTER (WHERE cc.name IS NOT NULL),
        '{}'::json
    ) as curator_categories
FROM restaurants_v2 r
LEFT JOIN restaurant_concepts rc ON r.id = rc.restaurant_id
LEFT JOIN concepts c ON rc.concept_id = c.id
LEFT JOIN concept_categories cc ON c.category_id = cc.id
LEFT JOIN (
    SELECT 
        r2.id as restaurant_id,
        cc2.name as category_name,
        json_agg(c2.value) as values
    FROM restaurants_v2 r2
    JOIN restaurant_concepts rc2 ON r2.id = rc2.restaurant_id
    JOIN concepts c2 ON rc2.concept_id = c2.id
    JOIN concept_categories cc2 ON c2.category_id = cc2.id
    GROUP BY r2.id, cc2.name
) concept_values ON r.id = concept_values.restaurant_id AND cc.name = concept_values.category_name
GROUP BY r.id, r.name, r.description, r.transcription, r.latitude, r.longitude, 
         r.address, r.private_notes, r.public_notes, r.server_id, r.sync_status, 
         r.last_synced_at, r.michelin_stars, r.michelin_distinction, 
         r.google_rating, r.google_total_ratings, r.created_at, r.updated_at;

-- Add comments for documentation
COMMENT ON TABLE restaurants_v2 IS 'Main restaurants table supporting Concierge Collector V2 data model with rich metadata';
COMMENT ON TABLE restaurant_photos IS 'Restaurant photos from various sources (curator, Google Places)';
COMMENT ON TABLE restaurant_reviews IS 'Restaurant reviews from external sources like Google Places';
COMMENT ON COLUMN restaurants_v2.metadata_json IS 'Complete JSON metadata from sources (Michelin, Google Places)';
COMMENT ON COLUMN restaurants_v2.sync_status IS 'Synchronization status: synced, pending, conflict, error';
COMMENT ON COLUMN restaurants_v2.location_entered_by IS 'Source of location data: curator, michelin, google-places';

-- Display migration information
SELECT 'V2 Migration Script Completed' as status;
SELECT 'Run SELECT migrate_to_v2(); to migrate existing data' as next_step;