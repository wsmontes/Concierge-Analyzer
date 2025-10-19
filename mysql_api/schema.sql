-- 
-- Concierge Entities API - MySQL Database Schema
-- Simple relational structure with JSON storage for flexible entity data
-- Dependencies: MySQL 8.0+ for JSON support
--

-- Entities table: Core table for all entity types (restaurants, hotels, etc.)
CREATE TABLE entities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entity_type ENUM('restaurant', 'hotel', 'attraction', 'event') NOT NULL DEFAULT 'restaurant',
    name VARCHAR(255) NOT NULL,
    external_id VARCHAR(100), -- For sync with external systems
    status ENUM('active', 'inactive', 'draft') NOT NULL DEFAULT 'active',
    
    -- JSON storage for complete entity data
    entity_data JSON NOT NULL,
    
    -- Metadata tracking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Indexes for performance
    INDEX idx_entity_type (entity_type),
    INDEX idx_name (name),
    INDEX idx_external_id (external_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Curators table: Simple user management for tracking who creates/modifies entities
CREATE TABLE curators (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    role ENUM('admin', 'curator', 'viewer') NOT NULL DEFAULT 'curator',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- Entity sync tracking: For synchronization with external systems
CREATE TABLE entity_sync (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entity_id INT NOT NULL,
    sync_source VARCHAR(100) NOT NULL, -- 'concierge-collector', 'michelin-api', etc.
    external_reference VARCHAR(255),
    last_sync_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status ENUM('synced', 'pending', 'error', 'conflict') DEFAULT 'synced',
    sync_data JSON, -- Store sync-specific metadata
    
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    UNIQUE KEY unique_entity_source (entity_id, sync_source),
    INDEX idx_sync_source (sync_source),
    INDEX idx_sync_status (sync_status)
);

-- Insert default admin curator
INSERT INTO curators (name, email, role) VALUES 
('System Admin', 'admin@concierge.local', 'admin'),
('Default Curator', 'curator@concierge.local', 'curator');

-- Example entity data structure (not inserted, just for reference)
/*
Example JSON structure for entity_data field:

{
  "metadata": [
    {
      "type": "collector",
      "source": "local",
      "data": {
        "name": "Restaurant Name",
        "description": "Description text",
        "location": {
          "latitude": 40.7128,
          "longitude": -74.0060,
          "address": "123 Main St, New York, NY"
        },
        "photos": [],
        "notes": {
          "private": "Internal notes",
          "public": "Public information"
        }
      }
    },
    {
      "type": "michelin",
      "source": "michelin-api",
      "data": {
        "michelinId": "restaurant-id",
        "rating": {"stars": 2, "year": 2025},
        "awards": ["Two MICHELIN Stars 2025"]
      }
    }
  ],
  "categories": {
    "Cuisine": ["Italian", "Contemporary"],
    "Price Range": ["Expensive"],
    "Mood": ["Sophisticated", "Romantic"],
    "Setting": ["Modern", "Elegant"]
  }
}
*/