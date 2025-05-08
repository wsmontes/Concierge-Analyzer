/**
 * Restaurant Detail Module
 * Provides functionality for displaying and interacting with detailed restaurant data
 * Dependencies: Chart.js, Bootstrap
 */

// Global state for restaurant detail view
const restaurantDetailState = {
    restaurants: [],             // List of all restaurants
    currentRestaurant: null,     // Currently selected restaurant
    currentIndex: -1,            // Index of current restaurant in the array
    conceptFilter: '',           // Filter string for concepts
    charts: {},                  // Chart.js instances
    sheetRestaurants: []         // List of restaurant names from sheet data
};

// Initialize restaurant detail view when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Restaurant Detail module');
    initRestaurantDetailHandlers();
    
    // Load sheet restaurant data first
    fetchSheetRestaurants().then(() => {
        // Delay initialization to ensure DOM is fully rendered and sheet data is available
        setTimeout(initRestaurantDetail, 500);
    });
});

// Fetch sheet restaurant data from API with retry mechanism for consistent Excel files
function fetchSheetRestaurants() {
    return fetch('/sheet_restaurants', {
        // Add timeout to prevent long waiting on server issues
        signal: AbortSignal.timeout(5000)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch sheet restaurant data');
            }
            return response.json();
        })
        .then(data => {
            console.log(`Loaded ${data.length} restaurant names from sheets`);
            restaurantDetailState.sheetRestaurants = data;
            // Make the sheet restaurants available globally
            window.sheetRestaurants = data;
            
            // If we received no sheet restaurants but know the Excel files are consistent,
            // we might need to upload a file first or there might be an issue with the parser
            if (data.length === 0) {
                console.warn('No sheet restaurant names loaded. You may need to upload an Excel file first.');
            }
            
            return data;
        })
        .catch(error => {
            // Enhanced error handling with specific messages for connection issues
            if (error.name === 'TypeError' || error.name === 'AbortError') {
                console.error('Server connection issue when fetching sheet restaurant data:', error);
                showNotification('Unable to fetch restaurant data from server. The server may not be running.', 'error');
                
                // Fall back to an offline mode warning
                const emptyState = document.getElementById('restaurant-empty-state');
                if (emptyState) {
                    // Add a server connection warning to the empty state
                    const warning = document.createElement('div');
                    warning.className = 'alert alert-warning mt-3';
                    warning.innerHTML = `
                        <h5><i class="bi bi-exclamation-triangle-fill me-2"></i>Server Connection Issue</h5>
                        <p>Could not connect to the server to fetch restaurant data. 
                        Please check if the application backend is running.</p>
                    `;
                    emptyState.appendChild(warning);
                }
            } else {
                console.error('Error fetching sheet restaurant data:', error);
            }
            
            // Initialize with empty array in case of error
            restaurantDetailState.sheetRestaurants = [];
            return [];
        });
}

// Initialize restaurant detail view handlers
function initRestaurantDetailHandlers() {
    // Restaurant selector dropdown
    const restaurantSelector = document.getElementById('restaurant-selector');
    if (restaurantSelector) {
        restaurantSelector.addEventListener('change', function() {
            const restaurantId = this.value;
            if (restaurantId) {
                loadRestaurantDetail(restaurantId);
            } else {
                showEmptyState();
            }
        });
    }
    
    // Restaurant navigation buttons
    const prevButton = document.getElementById('restaurant-prev');
    if (prevButton) {
        prevButton.addEventListener('click', function() {
            navigateRestaurant(-1);
        });
    }
    
    const nextButton = document.getElementById('restaurant-next');
    if (nextButton) {
        nextButton.addEventListener('click', function() {
            navigateRestaurant(1);
        });
    }
    
    // Restaurant search input
    const searchInput = document.getElementById('restaurant-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterRestaurantDropdown(this.value);
        });
    }
    
    // Expand/Collapse category buttons
    const expandAllBtn = document.getElementById('restaurant-expand-all');
    if (expandAllBtn) {
        expandAllBtn.addEventListener('click', function() {
            toggleAllCategories(true);
        });
    }
    
    const collapseAllBtn = document.getElementById('restaurant-collapse-all');
    if (collapseAllBtn) {
        collapseAllBtn.addEventListener('click', function() {
            toggleAllCategories(false);
        });
    }
    
    // Concept filter input
    const conceptFilter = document.getElementById('concept-filter');
    if (conceptFilter) {
        conceptFilter.addEventListener('input', function() {
            restaurantDetailState.conceptFilter = this.value.toLowerCase();
            renderConceptsTable();
        });
    }
    
    // Clear concept filter button
    const clearConceptFilter = document.getElementById('clear-concept-filter');
    if (clearConceptFilter) {
        clearConceptFilter.addEventListener('click', function() {
            const conceptFilter = document.getElementById('concept-filter');
            if (conceptFilter) {
                conceptFilter.value = '';
                restaurantDetailState.conceptFilter = '';
                renderConceptsTable();
            }
        });
    }
    
    // Upload restaurant data button
    const uploadBtn = document.getElementById('restaurant-detail-upload');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', function() {
            // If restaurant-visualizer.js is loaded, trigger its folder upload functionality
            if (typeof tryInitFolderUpload === 'function') {
                tryInitFolderUpload();
            } else {
                showNotification('Restaurant data uploader not available', 'warning');
            }
        });
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshRestaurantDetail');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            if (restaurantDetailState.currentRestaurant) {
                loadRestaurantDetail(restaurantDetailState.currentRestaurant.id);
            } else {
                initRestaurantDetail();
            }
        });
    }
}

// Initialize restaurant detail view
function initRestaurantDetail() {
    console.log('Initializing restaurant detail view');
    
    // Check if we already have restaurant data in window.restaurantData from restaurant-visualizer.js
    if (window.restaurantData && window.restaurantData.restaurants) {
        // Enhance the restaurant data with sheet restaurant names if available
        if (restaurantDetailState.sheetRestaurants.length > 0) {
            enhanceRestaurantDataWithSheetNames(window.restaurantData.restaurants);
        }
        initRestaurantsList(window.restaurantData.restaurants);
    } else if (window.restaurantData && window.restaurantData.loaded) {
        // We have data but in a different format, process it
        processExistingRestaurantData();
    } else {
        // No data yet, show empty state
        showEmptyState();
        
        // Subscribe to window event for restaurant data loaded
        window.addEventListener('restaurantDataLoaded', function(e) {
            if (e.detail && e.detail.restaurants) {
                // Enhance restaurant data before initializing
                if (restaurantDetailState.sheetRestaurants.length > 0) {
                    enhanceRestaurantDataWithSheetNames(e.detail.restaurants);
                }
                initRestaurantsList(e.detail.restaurants);
            }
        });
    }
}

// Enhance restaurant data with sheet names for better accuracy
function enhanceRestaurantDataWithSheetNames(restaurants) {
    if (!restaurants || !Array.isArray(restaurants) || !restaurantDetailState.sheetRestaurants.length) {
        return;
    }
    
    restaurants.forEach(restaurant => {
        // Check if this restaurant name matches or is similar to a sheet restaurant name
        const matchedSheetName = findMatchingSheetRestaurant(restaurant.name);
        if (matchedSheetName && matchedSheetName !== restaurant.name) {
            // Add the matched sheet name as a property
            restaurant.sheetName = matchedSheetName;
            restaurant.displayName = matchedSheetName; // Prefer sheet name for display
        } else {
            restaurant.displayName = restaurant.name;
        }
    });
    
    console.log('Enhanced restaurant data with sheet restaurant names');
}

// Find matching sheet restaurant name using similarity matching for consistent Excel files
function findMatchingSheetRestaurant(restaurantName) {
    if (!restaurantName || !restaurantDetailState.sheetRestaurants.length) {
        return null;
    }
    
    // Normalize the restaurant name - remove common restaurant prefixes/suffixes
    // This helps with consistent Excel files where naming might be slightly different
    const normalizedName = normalizeRestaurantName(restaurantName);
    
    // Try exact match first (case-insensitive) with normalized names
    for (const sheetName of restaurantDetailState.sheetRestaurants) {
        if (normalizeRestaurantName(sheetName).toLowerCase() === normalizedName.toLowerCase()) {
            return sheetName;
        }
    }
    
    // Try similarity matching with higher threshold for consistent Excel files
    const similarityThreshold = 0.85; // 85% similarity required - higher for consistent data
    
    for (const sheetName of restaurantDetailState.sheetRestaurants) {
        if (calculateNameSimilarity(restaurantName, sheetName) >= similarityThreshold) {
            return sheetName;
        }
    }
    
    return null;
}

// Normalize restaurant name by removing common prefixes/suffixes and standardizing
function normalizeRestaurantName(name) {
    if (!name) return '';
    
    // Convert to lowercase for case-insensitive comparison
    let normalized = name.toLowerCase();
    
    // Remove common prefixes/suffixes and punctuation
    const prefixes = ['the ', 'restaurant ', 'cafe ', 'café ', 'bistro '];
    const suffixes = [' restaurant', ' cafe', ' café', ' bistro', ' kitchen', ' bar & grill', ' bar and grill'];
    
    // Remove prefixes
    for (const prefix of prefixes) {
        if (normalized.startsWith(prefix)) {
            normalized = normalized.substring(prefix.length);
            break; // Only remove one prefix
        }
    }
    
    // Remove suffixes
    for (const suffix of suffixes) {
        if (normalized.endsWith(suffix)) {
            normalized = normalized.substring(0, normalized.length - suffix.length);
            break; // Only remove one suffix
        }
    }
    
    // Standardize punctuation and whitespace
    normalized = normalized.replace(/[&,'\-]/g, ' ')  // Replace common punctuation with spaces
                          .replace(/\s+/g, ' ')      // Standardize spaces
                          .trim();                   // Remove leading/trailing spaces
    
    return normalized;
}

// Calculate similarity between two restaurant names
function calculateNameSimilarity(name1, name2) {
    // Convert to lowercase for case-insensitive comparison
    const n1 = name1.toLowerCase();
    const n2 = name2.toLowerCase();
    
    // For very different length names, reduce similarity
    const lengthRatio = Math.min(n1.length, n2.length) / Math.max(n1.length, n2.length);
    if (lengthRatio < 0.5) {
        return 0.0; // Too different in length
    }
    
    // Split into words and compare word sets
    const words1 = new Set(n1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(n2.split(/\s+/).filter(w => w.length > 2));
    
    if (words1.size === 0 || words2.size === 0) {
        // Handle short names directly
        return n1.includes(n2) || n2.includes(n1) ? 0.9 : 0.0;
    }
    
    // Count shared words
    let sharedWords = 0;
    for (const word of words1) {
        if (words2.has(word) || Array.from(words2).some(w2 => word.includes(w2) || w2.includes(word))) {
            sharedWords++;
        }
    }
    
    // Calculate Jaccard similarity plus length factor
    const similarity = (sharedWords / (words1.size + words2.size - sharedWords)) * lengthRatio;
    return similarity;
}

// Process data from restaurant-visualizer if it exists
function processExistingRestaurantData() {
    if (!window.restaurantData || !window.restaurantData.loaded) {
        return;
    }
    
    try {
        const { categories, labels } = window.restaurantData;
        
        if (!categories || Object.keys(categories).length === 0) {
            showEmptyState();
            return;
        }
        
        // Create a unified restaurant from all categories
        const restaurant = {
            id: 'all-categories',
            name: 'All Categories',
            categories: {}
        };
        
        Object.entries(categories).forEach(([categoryName, concepts]) => {
            if (Array.isArray(concepts) && concepts.length > 0) {
                restaurant.categories[categoryName] = concepts.map(concept => ({
                    name: concept,
                    confidence: 1.0
                }));
            }
        });
        
        // Create individual restaurants from label data if available
        const restaurants = [restaurant];
        
        // Try to extract restaurant information from labels if available
        if (Array.isArray(labels) && labels.length > 0) {
            const labelRestaurants = extractRestaurantsFromLabels(labels);
            if (labelRestaurants.length > 0) {
                restaurants.push(...labelRestaurants);
            }
        }
        
        // Enhance restaurant data with sheet restaurant names
        if (restaurantDetailState.sheetRestaurants.length > 0) {
            enhanceRestaurantDataWithSheetNames(restaurants);
        }
        
        initRestaurantsList(restaurants);
        
    } catch (error) {
        console.error('Error processing existing restaurant data:', error);
        showEmptyState();
    }
}

// Extract restaurant information from label data
function extractRestaurantsFromLabels(labels) {
    const restaurantMap = {};
    
    // First pass: prioritize sheet names from loaded sheet_restaurants
    labels.forEach(label => {
        if (typeof label === 'object') {
            // Try to get restaurant name in order of preference
            let restaurantName = null;
            
            // Check sheet_name first
            if (label.sheet_name) {
                restaurantName = label.sheet_name;
                
                // Check if this matches a known sheet restaurant
                if (restaurantDetailState.sheetRestaurants.length > 0) {
                    const matchedName = findMatchingSheetRestaurant(restaurantName);
                    if (matchedName) {
                        restaurantName = matchedName; // Use the exact sheet name
                    }
                }
            } 
            // Check explicit restaurant property
            else if (label.restaurant) {
                restaurantName = label.restaurant;
                
                // Check if this matches a known sheet restaurant
                if (restaurantDetailState.sheetRestaurants.length > 0) {
                    const matchedName = findMatchingSheetRestaurant(restaurantName);
                    if (matchedName) {
                        restaurantName = matchedName; // Use the exact sheet name
                    }
                }
            }
            
            if (restaurantName) {
                if (!restaurantMap[restaurantName]) {
                    restaurantMap[restaurantName] = {
                        id: `restaurant-${restaurantName.replace(/\s+/g, '-').toLowerCase()}`,
                        name: restaurantName,
                        categories: {},
                        source: label.sheet_name ? 'sheet_name' : 'explicit'
                    };
                }
            }
        }
    });

    // Second pass: process all labels and associate with restaurants
    labels.forEach((label, index) => {
        let category, concept, restaurantName;
        
        if (typeof label === 'object') {
            // Try to get category and concept
            category = label.category || extractCategoryFromLabel(label);
            concept = label.concept || extractConceptFromLabel(label);
            
            // Try to get restaurant name in order of preference
            restaurantName = label.sheet_name || label.restaurant || 
                             extractSheetNameFromLabel(label) || 
                             'Unnamed Restaurant';
                             
            // Check if this matches a known sheet restaurant
            if (restaurantDetailState.sheetRestaurants.length > 0) {
                const matchedName = findMatchingSheetRestaurant(restaurantName);
                if (matchedName) {
                    restaurantName = matchedName; // Use the exact sheet name
                }
            }
        } else if (typeof label === 'string' && label.includes(' -> ')) {
            // Process "category -> concept" format
            [category, concept] = label.split(' -> ');
            restaurantName = extractSheetNameFromString(label) || 'Category Group';
            
            // Check if this matches a known sheet restaurant
            if (restaurantDetailState.sheetRestaurants.length > 0) {
                const matchedName = findMatchingSheetRestaurant(restaurantName);
                if (matchedName) {
                    restaurantName = matchedName; // Use the exact sheet name
                }
            }
        } else {
            // Skip invalid labels
            return;
        }
        
        // Skip if missing critical data
        if (!category || !concept) return;
        
        // Create restaurant entry if it doesn't exist
        if (!restaurantMap[restaurantName]) {
            restaurantMap[restaurantName] = {
                id: `restaurant-${index}-${restaurantName.replace(/\s+/g, '-').toLowerCase()}`,
                name: restaurantName,
                categories: {}
            };
        }
        
        // Create category if it doesn't exist
        if (!restaurantMap[restaurantName].categories[category]) {
            restaurantMap[restaurantName].categories[category] = [];
        }
        
        // Add concept to category
        restaurantMap[restaurantName].categories[category].push({
            name: concept,
            confidence: (label.confidence !== undefined) ? label.confidence : 1.0
        });
    });
    
    return Object.values(restaurantMap);
}

// Helper function to extract sheet name from label metadata
function extractSheetNameFromLabel(label) {
    // Check various properties where sheet name might be stored
    if (label._source && label._source.sheet_name) return label._source.sheet_name;
    if (label.metadata && label.metadata.sheet_name) return label.metadata.sheet_name;
    if (label.file_metadata && label.file_metadata.sheet_name) return label.file_metadata.sheet_name;
    
    // Check for filename without extension as fallback
    if (label.filename) {
        const match = label.filename.match(/^(.+?)(?:\.[^.]*)?$/);
        return match ? match[1] : null;
    }
    
    return null;
}

// Extract sheet name from string label if available
function extractSheetNameFromString(labelStr) {
    // Check if label contains sheet name in format like [SheetName] Category -> Concept
    const match = labelStr.match(/^\[([^\]]+)\]/);
    return match ? match[1] : null;
}

// Extract category from complex label object
function extractCategoryFromLabel(label) {
    if (label.key && typeof label.key === 'string' && label.key.includes(' -> ')) {
        return label.key.split(' -> ')[0];
    }
    return null;
}

// Extract concept from complex label object
function extractConceptFromLabel(label) {
    if (label.key && typeof label.key === 'string' && label.key.includes(' -> ')) {
        return label.key.split(' -> ')[1];
    }
    return null;
}

// Initialize restaurants dropdown list
function initRestaurantsList(restaurants) {
    if (!restaurants || !Array.isArray(restaurants) || restaurants.length === 0) {
        showEmptyState();
        return;
    }
    
    restaurantDetailState.restaurants = restaurants;
    
    // Populate restaurant selector dropdown
    const selector = document.getElementById('restaurant-selector');
    if (selector) {
        // Clear previous options except the placeholder
        selector.innerHTML = '<option value="">Select a restaurant...</option>';
        
        // Add restaurant options
        restaurants.forEach(restaurant => {
            const option = document.createElement('option');
            option.value = restaurant.id;
            option.textContent = restaurant.displayName || restaurant.name;
            selector.appendChild(option);
        });
        
        // If there's at least one restaurant, select the first one
        if (restaurants.length > 0) {
            selector.value = restaurants[0].id;
            loadRestaurantDetail(restaurants[0].id);
        }
        
        // Enable restaurant navigation
        updateNavigationState();
    }
}

// Load restaurant detail information
function loadRestaurantDetail(restaurantId) {
    const restaurant = restaurantDetailState.restaurants.find(r => r.id === restaurantId);
    if (!restaurant) {
        console.error(`Restaurant with ID ${restaurantId} not found`);
        showEmptyState();
        return;
    }
    
    restaurantDetailState.currentRestaurant = restaurant;
    restaurantDetailState.currentIndex = restaurantDetailState.restaurants.findIndex(r => r.id === restaurantId);
    
    // Update UI to show restaurant details
    showRestaurantDetail();
    updateNavigationState();
}

// Show restaurant detail content
function showRestaurantDetail() {
    const emptyState = document.getElementById('restaurant-empty-state');
    const detailView = document.getElementById('restaurant-detail-view');
    
    if (emptyState) emptyState.classList.add('d-none');
    if (detailView) detailView.classList.remove('d-none');
    
    renderRestaurantHeader();
    renderCategoriesList();
    renderConceptsTable();
    renderCharts();
}

// Show empty state when no restaurant is selected
function showEmptyState() {
    const emptyState = document.getElementById('restaurant-empty-state');
    const detailView = document.getElementById('restaurant-detail-view');
    
    if (emptyState) emptyState.classList.remove('d-none');
    if (detailView) detailView.classList.add('d-none');
    
    restaurantDetailState.currentRestaurant = null;
    restaurantDetailState.currentIndex = -1;
}

// Update the navigation buttons state based on current index
function updateNavigationState() {
    const prevButton = document.getElementById('restaurant-prev');
    const nextButton = document.getElementById('restaurant-next');
    
    if (prevButton && nextButton) {
        const currentIndex = restaurantDetailState.currentIndex;
        const totalRestaurants = restaurantDetailState.restaurants.length;
        
        prevButton.disabled = currentIndex <= 0;
        nextButton.disabled = currentIndex >= totalRestaurants - 1 || currentIndex < 0;
    }
}

// Navigate between restaurants
function navigateRestaurant(direction) {
    const currentIndex = restaurantDetailState.currentIndex;
    const newIndex = currentIndex + direction;
    
    if (newIndex >= 0 && newIndex < restaurantDetailState.restaurants.length) {
        const newRestaurant = restaurantDetailState.restaurants[newIndex];
        
        // Update the selector to match
        const selector = document.getElementById('restaurant-selector');
        if (selector) {
            selector.value = newRestaurant.id;
        }
        
        loadRestaurantDetail(newRestaurant.id);
    }
}

// Filter restaurant dropdown by search term
function filterRestaurantDropdown(searchTerm) {
    const selector = document.getElementById('restaurant-selector');
    if (!selector) return;
    
    const term = searchTerm.toLowerCase();
    
    // Get all options (except the first placeholder)
    const options = Array.from(selector.options).slice(1);
    
    // Hide/show options based on search
    options.forEach(option => {
        const text = option.text.toLowerCase();
        const matches = text.includes(term);
        
        // Use option.style.display instead of hidden property for better browser compatibility
        option.style.display = matches ? '' : 'none';
    });
    
    // If there's an exact match, select it
    if (term) {
        const exactMatch = options.find(opt => opt.text.toLowerCase() === term);
        if (exactMatch) {
            selector.value = exactMatch.value;
            loadRestaurantDetail(exactMatch.value);
        }
    }
}

// Render restaurant header information
function renderRestaurantHeader() {
    const restaurant = restaurantDetailState.currentRestaurant;
    if (!restaurant) return;
    
    // Set restaurant name - prefer display name if available
    const nameElement = document.getElementById('restaurant-name');
    if (nameElement) {
        nameElement.textContent = restaurant.displayName || restaurant.name;
    }
    
    // Set restaurant ID
    const idElement = document.getElementById('restaurant-id-display');
    if (idElement) {
        idElement.textContent = `ID: ${restaurant.id}`;
        
        // Add sheet name badge if available and different from regular name
        if (restaurant.sheetName && restaurant.sheetName !== restaurant.name) {
            const sheetBadge = document.createElement('span');
            sheetBadge.className = 'badge bg-info ms-2';
            sheetBadge.title = 'Matched with sheet restaurant name';
            sheetBadge.textContent = 'Sheet Match';
            idElement.appendChild(sheetBadge);
        }
    }
    
    // Count categories and concepts
    let categoryCount = 0;
    let conceptCount = 0;
    
    if (restaurant.categories) {
        categoryCount = Object.keys(restaurant.categories).length;
        
        // Count concepts across all categories
        Object.values(restaurant.categories).forEach(concepts => {
            conceptCount += Array.isArray(concepts) ? concepts.length : 0;
        });
    }
    
    // Update badge counts
    const categoryCountElement = document.getElementById('restaurant-category-count');
    if (categoryCountElement) {
        categoryCountElement.textContent = `${categoryCount} Categories`;
    }
    
    const conceptCountElement = document.getElementById('restaurant-concept-count');
    if (conceptCountElement) {
        conceptCountElement.textContent = `${conceptCount} Concepts`;
    }
}

// Render categories list with concepts
function renderCategoriesList() {
    const restaurant = restaurantDetailState.currentRestaurant;
    const categoriesListElement = document.getElementById('restaurant-categories-list');
    
    if (!categoriesListElement || !restaurant || !restaurant.categories) return;
    
    categoriesListElement.innerHTML = '';
    
    // Sort categories alphabetically
    const sortedCategories = Object.keys(restaurant.categories).sort();
    
    sortedCategories.forEach((category, index) => {
        const concepts = restaurant.categories[category];
        if (!Array.isArray(concepts) || concepts.length === 0) return;
        
        // Create category item
        const categoryItem = document.createElement('div');
        categoryItem.className = 'list-group-item p-0';
        
        // Create accordion structure
        const accordionId = `category-accordion-${index}`;
        const headerId = `category-heading-${index}`;
        const collapseId = `category-collapse-${index}`;
        
        categoryItem.innerHTML = `
            <div class="accordion" id="${accordionId}">
                <div class="accordion-item border-0">
                    <h2 class="accordion-header" id="${headerId}">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" 
                                data-bs-target="#${collapseId}" aria-expanded="false" aria-controls="${collapseId}">
                            <span class="fw-bold">${category}</span>
                            <span class="badge bg-primary rounded-pill ms-2">${concepts.length}</span>
                        </button>
                    </h2>
                    <div id="${collapseId}" class="accordion-collapse collapse" 
                         aria-labelledby="${headerId}" data-bs-parent="#${accordionId}">
                        <div class="accordion-body p-0">
                            <ul class="list-group list-group-flush">
                                ${concepts.map(concept => `
                                    <li class="list-group-item d-flex justify-content-between align-items-center ps-4">
                                        <span>${concept.name || concept}</span>
                                        ${concept.confidence ? 
                                            `<span class="badge bg-info">${(concept.confidence * 100).toFixed(1)}%</span>` : ''}
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        categoriesListElement.appendChild(categoryItem);
    });
}

// Toggle all category accordions
function toggleAllCategories(expand) {
    // Get all accordion buttons
    const accordionButtons = document.querySelectorAll('#restaurant-categories-list .accordion-button');
    
    accordionButtons.forEach(button => {
        // Check current state
        const isCollapsed = button.classList.contains('collapsed');
        
        // Only toggle if needed
        if ((expand && isCollapsed) || (!expand && !isCollapsed)) {
            button.click();
        }
    });
}

// Render concepts table with filtering
function renderConceptsTable() {
    const restaurant = restaurantDetailState.currentRestaurant;
    const conceptsTableElement = document.getElementById('restaurant-concepts-table');
    
    if (!conceptsTableElement || !restaurant || !restaurant.categories) return;
    
    conceptsTableElement.innerHTML = '';
    
    // Flatten all concepts across categories
    const allConcepts = [];
    
    Object.entries(restaurant.categories).forEach(([category, concepts]) => {
        if (Array.isArray(concepts)) {
            concepts.forEach(concept => {
                // Handle both object and string formats
                const conceptObj = typeof concept === 'string' ? 
                    { name: concept, confidence: 1.0 } : concept;
                
                allConcepts.push({
                    name: conceptObj.name,
                    category,
                    confidence: conceptObj.confidence || 1.0
                });
            });
        }
    });
    
    // Sort concepts alphabetically 
    allConcepts.sort((a, b) => a.name.localeCompare(b.name));
    
    // Filter by search term if provided
    const filterTerm = restaurantDetailState.conceptFilter;
    const filteredConcepts = filterTerm ? 
        allConcepts.filter(c => 
            c.name.toLowerCase().includes(filterTerm) || 
            c.category.toLowerCase().includes(filterTerm)
        ) : allConcepts;
    
    // Render each concept row
    filteredConcepts.forEach(concept => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${concept.name}</td>
            <td><span class="badge bg-light text-dark">${concept.category}</span></td>
            <td>
                <div class="progress" style="height: 6px; width: 100px;">
                    <div class="progress-bar ${getConfidenceClass(concept.confidence)}" 
                         role="progressbar" 
                         style="width: ${concept.confidence * 100}%;"
                         aria-valuenow="${concept.confidence * 100}" 
                         aria-valuemin="0" 
                         aria-valuemax="100"></div>
                </div>
                <small class="ms-1">${(concept.confidence * 100).toFixed(1)}%</small>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-secondary">
                    <i class="bi bi-diagram-3"></i>
                </button>
            </td>
        `;
        
        conceptsTableElement.appendChild(row);
    });
    
    // Show a message if no concepts match filter
    if (filteredConcepts.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="4" class="text-center py-4">
                <div class="text-muted">
                    ${filterTerm ? 
                        `No concepts match the filter "${filterTerm}"` : 
                        'No concepts available for this restaurant'}
                </div>
            </td>
        `;
        conceptsTableElement.appendChild(emptyRow);
    }
}

// Get Bootstrap class based on confidence level
function getConfidenceClass(confidence) {
    if (confidence >= 0.8) return 'bg-success';
    if (confidence >= 0.5) return 'bg-info';
    if (confidence >= 0.3) return 'bg-warning';
    return 'bg-danger';
}

// Render charts for restaurant data
function renderCharts() {
    const restaurant = restaurantDetailState.currentRestaurant;
    if (!restaurant || !restaurant.categories) return;
    
    // Destroy existing charts to prevent memory leaks
    Object.values(restaurantDetailState.charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    
    // Reset charts object
    restaurantDetailState.charts = {};
    
    // Render category distribution chart
    renderCategoryDistributionChart();
    
    // Render concept strength chart
    renderConceptStrengthChart();
}

// Render category distribution chart
function renderCategoryDistributionChart() {
    const restaurant = restaurantDetailState.currentRestaurant;
    const chartCanvas = document.getElementById('restaurant-category-chart');
    
    if (!chartCanvas || !restaurant || !restaurant.categories) return;
    
    try {
        // Prepare data
        const categoryNames = Object.keys(restaurant.categories);
        const categoryCounts = categoryNames.map(cat => {
            const concepts = restaurant.categories[cat];
            return Array.isArray(concepts) ? concepts.length : 0;
        });
        
        // Generate colors
        const backgroundColors = generateChartColors(categoryNames.length);
        
        // Create chart
        const ctx = chartCanvas.getContext('2d');
        restaurantDetailState.charts.categoryDistribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categoryNames,
                datasets: [{
                    data: categoryCounts,
                    backgroundColor: backgroundColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${value} concepts (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error rendering category distribution chart:', error);
    }
}

// Render concept strength chart
function renderConceptStrengthChart() {
    const restaurant = restaurantDetailState.currentRestaurant;
    const chartCanvas = document.getElementById('restaurant-concept-strength-chart');
    
    if (!chartCanvas || !restaurant || !restaurant.categories) return;
    
    try {
        // Collect all concepts with their confidence
        const allConcepts = [];
        Object.entries(restaurant.categories).forEach(([category, concepts]) => {
            if (Array.isArray(concepts)) {
                concepts.forEach(concept => {
                    const conceptObj = typeof concept === 'string' ? 
                        { name: concept, confidence: 1.0 } : concept;
                    
                    allConcepts.push({
                        name: conceptObj.name,
                        category,
                        confidence: conceptObj.confidence || 1.0
                    });
                });
            }
        });
        
        // Sort by confidence and take top 10
        allConcepts.sort((a, b) => b.confidence - a.confidence);
        const topConcepts = allConcepts.slice(0, 10);
        
        // Prepare chart data
        const conceptNames = topConcepts.map(c => c.name);
        const confidenceValues = topConcepts.map(c => c.confidence * 100); // Convert to percentage
        const categoryColors = topConcepts.map((_, i) => generateChartColors(1)[0]);
        
        // Create chart
        const ctx = chartCanvas.getContext('2d');
        restaurantDetailState.charts.conceptStrength = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: conceptNames,
                datasets: [{
                    label: 'Confidence %',
                    data: confidenceValues,
                    backgroundColor: categoryColors,
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const concept = topConcepts[context.dataIndex];
                                return [
                                    `Confidence: ${context.raw.toFixed(1)}%`,
                                    `Category: ${concept.category}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Confidence (%)'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error rendering concept strength chart:', error);
    }
}

// Generate array of distinct colors for charts
function generateChartColors(count) {
    const baseColors = [
        '#4285F4', '#EA4335', '#FBBC05', '#34A853',  // Google colors
        '#FF6D01', '#46BDC6', '#AC7BEF', '#FF5252',  // More vibrant colors
        '#26A69A', '#FFC107', '#5C6BC0', '#66BB6A'   // Material design colors
    ];
    
    // If we need more colors than in our base array
    if (count <= baseColors.length) {
        return baseColors.slice(0, count);
    } else {
        // Generate additional colors with HSL to ensure they're distinct
        const colors = [...baseColors];
        const hueStep = 360 / (count - baseColors.length);
        
        for (let i = baseColors.length; i < count; i++) {
            const hue = (i - baseColors.length) * hueStep;
            colors.push(`hsl(${hue}, 70%, 60%)`);
        }
        
        return colors;
    }
}

// Helper function for showing notifications if available in the main app
function showNotification(message, type = 'info') {
    // Check if a global notification function exists that isn't this one
    if (typeof window.showNotification === 'function' && 
        window.showNotification !== showNotification) {
        window.showNotification(message, type);
    } else {
        // Fallback to creating our own notification or using console
        createLocalNotification(message, type);
    }
}

// Local implementation of notification to avoid dependency on global function
function createLocalNotification(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type}`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    
    // Toast content
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    // Add to container
    toastContainer.appendChild(toastEl);
    
    // Initialize and show toast using Bootstrap if available
    if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
        const toast = new bootstrap.Toast(toastEl, {
            delay: 5000
        });
        toast.show();
    }
    
    // Remove toast from DOM after it's hidden
    toastEl.addEventListener('hidden.bs.toast', function() {
        toastEl.remove();
    });
    
    // Fallback for when Bootstrap is not loaded - remove after timeout
    setTimeout(() => {
        if (toastEl.parentNode) {
            toastEl.remove();
        }
    }, 5000);
    
    // Log to console as well
    console.log(`${type.toUpperCase()}: ${message}`);
}
