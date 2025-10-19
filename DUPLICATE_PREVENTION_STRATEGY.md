# Duplicate Prevention Strategy for Concierge Collector

## Problem Statement

We need to prevent duplicate restaurant entries while allowing multiple curators to contribute to the same restaurant. The challenge is creating a reliable unique identifier without relying solely on potentially unreliable ID numbers.

## Proposed Solution: Composite Key Approach

### Unique Key: `restaurant_name + city + curator_id`

This approach ensures:
- ✅ **Same restaurant, same curator** = Update existing entry (no duplicate)
- ✅ **Same restaurant, different curator** = New entry allowed (multiple curator perspectives)
- ✅ **Chain restaurants** = Differentiated by city (McDonald's NYC ≠ McDonald's LA)
- ✅ **Neighborhood restaurants** = Must include identifier in name ("Joe's Pizza - Greenwich Village")

## City Extraction Strategy

### Priority Order for City Detection

1. **Michelin Guide City** (Highest Priority)
   ```json
   "michelin": {
     "data": {
       "guide": {
         "city": "Modena"  ← Most reliable for restaurant identification
       }
     }
   }
   ```

2. **Google Places Vicinity/Address**
   ```json
   "google-places": {
     "data": {
       "location": {
         "vicinity": "Via Stella, 22, Modena",  ← Extract "Modena"
         "formattedAddress": "Via Stella, 22, 41121 Modena MO, Italy"
       }
     }
   }
   ```

3. **Collector Address Parsing**
   ```json
   "collector": {
     "data": {
       "location": {
         "address": "Via Stella, 22, 41121 Modena MO, Italy"  ← Parse city
       }
     }
   }
   ```

### Address Parsing Logic

The system intelligently extracts city from various address formats:

```
"Via Stella, 22, 41121 Modena MO, Italy" → "Modena"
"7 Carmine St, New York, NY 10014" → "New York"  
"Tsukamoto Building B1F, 4-2-15 Ginza, Tokyo" → "Tokyo"
```

**Parsing Rules**:
- Skip street numbers and postal codes
- Skip common country names
- Clean postal codes from city names
- Handle various international address formats

## Database Schema

```sql
CREATE TABLE restaurants_json (
    id SERIAL PRIMARY KEY,
    
    -- Composite unique key components
    restaurant_name VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    curator_id INTEGER NOT NULL,
    curator_name VARCHAR(255),
    
    -- Complete restaurant data
    restaurant_data JSONB NOT NULL,
    
    -- Additional extracted fields
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    full_address TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Composite unique constraint
    UNIQUE(restaurant_name, city, curator_id)
);
```

## How Duplicates Are Prevented

### Scenario 1: Same Restaurant, Same Curator
```
Input: Maria Santos adds "Osteria Francescana" in "Modena"
Result: Updates existing entry (no duplicate created)
```

### Scenario 2: Same Restaurant, Different Curator
```
Input: John Smith adds "Osteria Francescana" in "Modena"  
Result: Creates new entry (different curator perspective allowed)
```

### Scenario 3: Chain Restaurant
```
Input: "McDonald's" in "New York" vs "McDonald's" in "Los Angeles"
Result: Two separate entries (different cities = different restaurants)
```

### Scenario 4: Neighborhood Differentiation
```
Input: "Joe's Pizza - Greenwich Village" vs "Joe's Pizza - SoHo"
Result: Two separate entries (name includes identifier)
```

## Implementation Benefits

### 1. Flexible Duplicate Prevention
- Prevents true duplicates (same restaurant + curator)
- Allows multiple curator perspectives
- Handles chain restaurants naturally

### 2. Intelligent City Detection
- Multi-source city extraction with priority
- Robust address parsing for international formats
- Fallback to "Unknown" ensures processing continues

### 3. Data Quality Views
```sql
-- Restaurants with multiple curators
SELECT * FROM restaurants_multiple_curators;

-- Potential chain restaurants
SELECT * FROM potential_restaurant_chains;

-- Data quality issues
SELECT * FROM restaurants_unclear_cities;
```

### 4. Query Examples

```sql
-- Get all entries for a specific restaurant
SELECT curator_name, created_at, restaurant_data 
FROM restaurants_json 
WHERE restaurant_name = 'Osteria Francescana' AND city = 'Modena';

-- Find restaurants with most curator contributions
SELECT restaurant_name, city, COUNT(*) as curator_count
FROM restaurants_json 
GROUP BY restaurant_name, city 
ORDER BY curator_count DESC;

-- Get unique restaurants (one per restaurant+city)
SELECT DISTINCT restaurant_name, city 
FROM restaurants_json;
```

## Edge Cases Handled

### 1. Missing City Information
- **Fallback**: Uses "Unknown" as city
- **Impact**: All entries with unknown cities are grouped together
- **Resolution**: Manual city assignment or address improvement

### 2. Ambiguous Restaurant Names
- **Example**: "Joe's Pizza" without location identifier
- **Solution**: Curator should include neighborhood ("Joe's Pizza - Village")
- **Alternative**: System could suggest adding location identifier

### 3. Address Format Variations
- **International**: Different address formats handled
- **Incomplete**: Partial addresses parsed best-effort
- **Malformed**: Graceful fallback to "Unknown"

### 4. Curator Information Missing
- **Fallback**: Uses curator ID 0 with name "Unknown"
- **Impact**: All entries without curator info grouped together
- **Resolution**: Ensure proper curator metadata in exports

## Restaurant Name Best Practices

### For Chain Restaurants
```
✅ Good: "McDonald's - Times Square"
✅ Good: "Starbucks #1247 - Union Square"  
❌ Avoid: "McDonald's" (too generic)
```

### For Neighborhood Places
```
✅ Good: "Joe's Pizza - Greenwich Village"
✅ Good: "Corner Bistro - West Village"
❌ Avoid: "Joe's Pizza" (ambiguous)
```

### For Unique Names
```
✅ Good: "Osteria Francescana" (unique name)
✅ Good: "Le Bernardin" (unique name)
```

## Migration Strategy

### For New Installations
1. Run `create_enhanced_json_schema.sql`
2. Deploy updated API code
3. Start using `/api/curation/json` endpoint

### For Existing Data
1. **Backup** existing data
2. Run enhanced schema creation
3. **Data Migration**: Convert existing entries to new format
4. Update curator guidelines for naming conventions

## Monitoring and Maintenance

### Regular Queries to Run

```sql
-- Check for potential duplicates (similar names, same city)
SELECT restaurant_name, city, COUNT(*) 
FROM restaurants_json 
GROUP BY restaurant_name, city 
HAVING COUNT(*) > 3;  -- More than 3 curators might indicate issues

-- Find restaurants needing city information
SELECT COUNT(*) as unknown_cities 
FROM restaurants_json 
WHERE city = 'Unknown';

-- Check data quality
SELECT city, COUNT(*) as restaurant_count 
FROM restaurants_json 
GROUP BY city 
ORDER BY restaurant_count DESC;
```

### Alerts to Set Up
- High number of "Unknown" cities
- Suspicious duplicate patterns
- Missing curator information

## Conclusion

This composite key approach provides robust duplicate prevention while maintaining flexibility for legitimate multiple entries. The intelligent city extraction ensures reliable restaurant identification across various data sources and address formats.

**Key Success Factors**:
1. Clear curator guidelines for restaurant naming
2. Regular monitoring of data quality
3. Continuous improvement of address parsing
4. Proper curator metadata in exports