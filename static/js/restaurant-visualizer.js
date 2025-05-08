/**
 * Restaurant Visualizer Module
 * Provides functionality for visualizing restaurant data through embedding analysis
 * Dependencies: Plotly.js for visualization
 */

// Restaurant data object to store processed embeddings
window.restaurantData = {
    raw: null,
    vectors: [],
    labels: [],
    categories: {},
    loaded: false,
    currentVisualization: null,
    sheetRestaurants: [] // Added sheetRestaurants property
};

// Wait for the document to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Restaurant Visualizer module');
    
    // Initialize UI components without waiting for sheet restaurants
    setTimeout(safeInit, 800);
    
    // Listen for Excel file upload events
    window.addEventListener('excelFileProcessed', function(event) {
        console.log('Excel file processed, fetching sheet restaurants');
        fetchSheetRestaurants().then(() => {
            console.log('Sheet restaurants updated from Excel file');
            
            // Notify any pending processes that sheet restaurants are now available
            window.dispatchEvent(new CustomEvent('sheetRestaurantsReady'));
        });
    });
});

// Fetch sheet restaurant data from API with enhanced handling for consistent Excel files
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
            window.restaurantData.sheetRestaurants = data;
            
            // If sheet names are available, use them to enhance existing data
            if (data.length > 0 && window.restaurantData.restaurants) {
                enhanceRestaurantsWithSheetNames(window.restaurantData.restaurants, data);
            }
            
            // Make the sheet restaurants available globally
            window.sheetRestaurants = data;
            
            // Dispatch event to notify other components
            if (data.length > 0) {
                window.dispatchEvent(new CustomEvent('sheetRestaurantsLoaded', { 
                    detail: { restaurants: data } 
                }));
            }
            return data;
        })
        .catch(error => {
            // Enhanced error handling with specific messages for connection issues
            if (error.name === 'TypeError' || error.name === 'AbortError') {
                console.error('Server connection issue when fetching sheet restaurant data:', error);
                showServerConnectionError('Failed to fetch restaurant data from server. The server may not be running.');
            } else {
                // More graceful error handling - log but don't alert
                console.error('Error fetching sheet restaurant data:', error);
            }
            window.restaurantData.sheetRestaurants = [];
            return [];
        });
}

// Helper function to show server connection error
function showServerConnectionError(message) {
    // Use notification system if available
    if (typeof showNotification === 'function') {
        showNotification(message, 'error');
    } else {
        console.error(message);
    }
    
    // Update server status indicator if it exists
    const serverIndicator = document.getElementById('server-status-indicator');
    if (serverIndicator) {
        serverIndicator.classList.remove('unknown', 'available');
        serverIndicator.classList.add('unavailable');
        serverIndicator.title = 'Server status: Not responding';
        serverIndicator.innerHTML = '<i class="bi bi-exclamation-circle"></i>';
    }
}

// Add a public method to refresh sheet restaurants after Excel file upload
window.refreshSheetRestaurants = function() {
    console.log('Manual refresh of sheet restaurants requested');
    return fetchSheetRestaurants();
};

// Enhance existing restaurant data with sheet names
function enhanceRestaurantsWithSheetNames(restaurants, sheetNames) {
    if (!restaurants || !Array.isArray(restaurants) || !sheetNames.length) return;
    
    restaurants.forEach(restaurant => {
        // Find matching sheet name
        const matchedName = findMatchingSheetRestaurant(restaurant.name, sheetNames);
        if (matchedName && matchedName !== restaurant.name) {
            restaurant.sheetName = matchedName;
            restaurant.displayName = matchedName; // Use sheet name for display
            restaurant.isSheetName = true;
        }
    });
    
    console.log('Enhanced restaurant data with sheet restaurant names');
}

// Find matching sheet restaurant name for consistent Excel files
function findMatchingSheetRestaurant(restaurantName, sheetNames) {
    if (!restaurantName || !sheetNames || !sheetNames.length) {
        return null;
    }
    
    // Normalize names to improve matching for consistent sheet structures
    const normalizedRestaurantName = normalizeRestaurantName(restaurantName);
    
    // Try exact match first (case-insensitive) with normalized names
    for (const sheetName of sheetNames) {
        if (normalizeRestaurantName(sheetName).toLowerCase() === normalizedRestaurantName.toLowerCase()) {
            return sheetName;
        }
    }
    
    // Try partial match with higher threshold for consistent data
    for (const sheetName of sheetNames) {
        if (sheetName.toLowerCase().includes(normalizedRestaurantName.toLowerCase()) ||
            normalizedRestaurantName.toLowerCase().includes(normalizeRestaurantName(sheetName).toLowerCase())) {
            // Check if one is significantly longer than the other
            const lengthRatio = Math.min(sheetName.length, restaurantName.length) / 
                               Math.max(sheetName.length, restaurantName.length);
            if (lengthRatio > 0.6) { // Increased threshold for consistent Excel files
                return sheetName;
            }
        }
    }
    
    // Try word similarity match with higher threshold
    const similarityThreshold = 0.75; // 75% word similarity required
    for (const sheetName of sheetNames) {
        if (calculateWordSimilarity(restaurantName, sheetName) >= similarityThreshold) {
            return sheetName;
        }
    }
    
    return null;
}

// Calculate word similarity between restaurant names
function calculateWordSimilarity(name1, name2) {
    // Normalize names first
    const n1 = normalizeRestaurantName(name1);
    const n2 = normalizeRestaurantName(name2);
    
    // Split into words
    const words1 = new Set(n1.split(/\s+/).filter(w => w.length > 1));
    const words2 = new Set(n2.split(/\s+/).filter(w => w.length > 1));
    
    if (words1.size === 0 || words2.size === 0) {
        return 0.0;
    }
    
    // Count shared words
    let sharedWords = 0;
    for (const word of words1) {
        if (words2.has(word)) {
            sharedWords++;
        }
    }
    
    // Calculate Jaccard similarity
    return sharedWords / (words1.size + words2.size - sharedWords);
}

// Normalize restaurant name for consistent comparison
function normalizeRestaurantName(name) {
    if (!name) return '';
    
    // Convert to lowercase for case-insensitive comparison
    let normalized = name.toLowerCase();
    
    // Remove common prefixes/suffixes for consistent Excel files
    const prefixes = ['the ', 'restaurant ', 'cafe ', 'café '];
    const suffixes = [' restaurant', ' cafe', ' café', ' kitchen', ' bar & grill'];
    
    // Remove prefixes
    for (const prefix of prefixes) {
        if (normalized.startsWith(prefix)) {
            normalized = normalized.substring(prefix.length);
        }
    }
    
    // Remove suffixes
    for (const suffix of suffixes) {
        if (normalized.endsWith(suffix)) {
            normalized = normalized.substring(0, normalized.length - suffix.length);
        }
    }
    
    // Standardize common patterns in restaurant names for consistent Excel files
    normalized = normalized.replace(/&/g, 'and')  // Replace & with 'and'
                          .replace(/[',\-]/g, '') // Remove common punctuation
                          .replace(/\s+/g, ' ')   // Standardize spaces
                          .trim();                // Remove leading/trailing spaces
    
    return normalized;
}

// Safe initialization with multiple fallbacks
function safeInit() {
    // Check if Plotly is available before proceeding
    if (typeof Plotly === 'undefined') {
        console.warn('Plotly.js is not loaded. Some visualizations may not work properly.');
        // Continue anyway, individual visualizations will check again
    }
    
    // Explicitly initialize visualizations first (doesn't depend on uploads)
    initRestaurantVisualization();
    
    // Query with multiple selector strategies for better element finding
    tryInitFolderUpload();

    // Listen for integrated data events
    document.addEventListener('integratedDataReady', handleIntegratedDataReady);
}

/**
 * Handle when integrated data is available from main app
 * @param {CustomEvent} event - The integration event with detail containing integrated data
 */
function handleIntegratedDataReady(event) {
    if (event.detail) {
        console.log("Restaurant visualizer received integrated data");
        const data = event.detail;
        
        // Update restaurant metrics to include conversation counts
        updateRestaurantMetricsWithIntegratedData(data);
        
        // Add relationship counts to restaurant elements
        updateRestaurantRelationshipCounts(data);
    }
}

/**
 * Update restaurant metrics with conversation data from integration
 * @param {Object} data - The integrated data object
 */
function updateRestaurantMetricsWithIntegratedData(data) {
    // Check if we have a restaurant metrics panel to update
    const metricsContainer = document.getElementById('restaurantMetricsPanel');
    if (!metricsContainer) return;
    
    if (data.relationships && data.relationships.length > 0) {
        // Count unique conversations per restaurant
        const conversationCounts = {};
        data.relationships.forEach(rel => {
            if (!conversationCounts[rel.restaurant]) {
                conversationCounts[rel.restaurant] = new Set();
            }
            conversationCounts[rel.restaurant].add(rel.conversationId);
        });
        
        // Update metrics display if elements exist
        const conversationsCountEl = document.getElementById('restaurantConversationsCount');
        if (conversationsCountEl) {
            const totalRestaurants = Object.keys(conversationCounts).length;
            conversationsCountEl.textContent = totalRestaurants;
        }
        
        // Update relationship counts
        const relationshipsCountEl = document.getElementById('restaurantRelationshipsCount');
        if (relationshipsCountEl) {
            relationshipsCountEl.textContent = data.relationships.length;
        }
    }
}

/**
 * Update restaurant elements with relationship counts from integrated data
 * @param {Object} data - The integrated data object
 */
function updateRestaurantRelationshipCounts(data) {
    if (!data.restaurants || !data.relationships) return;
    
    const relationshipsByRestaurant = {};
    data.relationships.forEach(rel => {
        if (!relationshipsByRestaurant[rel.restaurant]) {
            relationshipsByRestaurant[rel.restaurant] = 0;
        }
        relationshipsByRestaurant[rel.restaurant]++;
    });
    
    // Update restaurant list items with relationship counts if they exist
    document.querySelectorAll('[data-restaurant-name]').forEach(el => {
        const restaurantName = el.dataset.restaurantName;
        if (restaurantName && relationshipsByRestaurant[restaurantName]) {
            // Find or create the badge element
            let badge = el.querySelector('.relationship-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'badge bg-info relationship-badge ms-1';
                el.appendChild(badge);
            }
            badge.textContent = relationshipsByRestaurant[restaurantName];
        }
    });
}

// Try multiple strategies to find upload elements
function tryInitFolderUpload() {
    // Strategy 1: Direct ID lookup - most common approach
    let uploadArea = document.getElementById('folder-upload-area');
    let folderInput = document.getElementById('folder-input');
    
    // If direct lookup fails, try query selector for more specific matching
    if (!uploadArea || !folderInput) {
        console.log('First attempt to find upload elements failed, trying alternative selectors...');
        uploadArea = document.querySelector('.header-upload-item #folder-upload-area') || 
                     document.querySelector('.simple-drop-area#folder-upload-area');
                     
        folderInput = document.querySelector('.header-upload-item #folder-input') ||
                       document.querySelector('input#folder-input');
    }
    
    // If we still don't have both elements, try one final approach with a delay
    if (!uploadArea || !folderInput) {
        console.warn('Folder upload elements not found, will retry with broader selectors in 1 second');
        setTimeout(() => {
            // Final attempt with very broad selectors
            uploadArea = document.querySelector('[id="folder-upload-area"]');
            folderInput = document.querySelector('[id="folder-input"]');
            
            // Last resort - log what elements actually exist
            if (!uploadArea || !folderInput) {
                console.error('Folder upload elements still not found after retry attempts');
                logAvailableElements();
                return;
            }
            
            console.log('Found folder upload elements on final retry');
            setupFolderUploadHandlers(uploadArea, folderInput);
        }, 1000);
        return;
    }
    
    console.log('Found folder upload elements');
    setupFolderUploadHandlers(uploadArea, folderInput);
}

// Log available elements for debugging
function logAvailableElements() {
    const allElements = document.querySelectorAll('*[id]');
    console.log('Available elements with IDs:', Array.from(allElements).map(el => el.id));
    
    // Check if we at least have the container
    const headerContainer = document.querySelector('.header-uploads-container');
    if (headerContainer) {
        console.log('Header uploads container exists, but specific elements not found');
    } else {
        console.log('Header uploads container not found');
    }
}

// Set up event handlers for folder upload
function setupFolderUploadHandlers(uploadArea, folderInput) {
    const selectedFileEl = document.getElementById('folder-selected-file');
    const uploadPlaceholder = uploadArea.querySelector('.upload-placeholder');
    const fileNameEl = selectedFileEl ? selectedFileEl.querySelector('.file-name') : null;
    const removeButton = document.getElementById('folder-remove-file');
    const statusElement = document.getElementById('folder-status');
    const statusText = statusElement ? statusElement.querySelector('#folder-status-text') : null;
    const fileCountEl = document.getElementById('folder-file-count');

    // Handle file selection with validation
    folderInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            const fileCount = this.files.length;
            
            // Show selected file info
            showSelectedFolder('Selected folder', fileCount);
            
            // Process the files
            processRestaurantFiles(this.files);
        }
    });
    
    // Handle drag and drop
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            // Use DataTransferItemList interface to access the files
            const items = e.dataTransfer.items;
            const files = [];
            
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.kind === 'file') {
                    const entry = item.webkitGetAsEntry();
                    if (entry && entry.isFile) {
                        files.push(item.getAsFile());
                    }
                }
            }
            
            if (files.length > 0) {
                // Set the file input value
                // This is just a visual indicator; we'll process the dropped files directly
                showSelectedFolder('Dropped files', files.length);
                
                // Process the files
                processRestaurantFiles(files);
            }
        }
    });
    
    // Handle remove file button
    if (removeButton) {
        removeButton.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Clear the file input
            folderInput.value = '';
            
            // Reset restaurant data
            window.restaurantData = {
                raw: null,
                vectors: [],
                labels: [],
                categories: {},
                loaded: false,
                currentVisualization: null,
                sheetRestaurants: window.restaurantData.sheetRestaurants // Keep sheet restaurants data
            };
            
            // Hide selected file info
            selectedFileEl.classList.add('d-none');
            uploadPlaceholder.classList.remove('d-none');
            
            // Hide status
            if (statusElement) {
                statusElement.classList.add('d-none');
            }
            
            // Reset metrics
            document.getElementById('dimensions').textContent = '-';
            document.getElementById('dataPoints').textContent = '-';
            document.getElementById('categoryCount').textContent = '-';
            document.getElementById('conceptCount').textContent = '-';
            
            // Hide category breakdown
            const categoryBreakdown = document.getElementById('categoryBreakdownSection');
            if (categoryBreakdown) {
                categoryBreakdown.classList.add('d-none');
            }
            
            console.log('Restaurant data cleared');
        });
    }
    
    // Show selected folder information
    function showSelectedFolder(folderName, fileCount) {
        if (fileNameEl) {
            fileNameEl.textContent = folderName;
            fileNameEl.title = folderName; // Add tooltip for full name on hover
        }
        
        if (fileCountEl) {
            fileCountEl.textContent = `${fileCount} file${fileCount !== 1 ? 's' : ''}`;
        }
        
        selectedFileEl.classList.remove('d-none');
        uploadPlaceholder.classList.add('d-none');
        
        // Show status if it exists
        if (statusElement) {
            statusElement.classList.remove('d-none');
            statusText.textContent = 'Ready to process';
            statusElement.querySelector('.progress-bar').style.width = '0%';
        }
    }
    
    // Process restaurant files
    function processRestaurantFiles(files) {
        // Check if we have any JSON files
        const jsonFiles = Array.from(files).filter(file => 
            file.type === 'application/json' || file.name.endsWith('.json')
        );
        
        if (jsonFiles.length === 0) {
            showRestaurantError('No JSON files found in the selected folder');
            return;
        }
        
        console.log(`Processing ${jsonFiles.length} JSON files`);
        statusText.textContent = `Processing ${jsonFiles.length} files...`;
        
        // Check if we need to wait for sheet restaurants
        if (window.restaurantData.sheetRestaurants.length === 0) {
            statusText.textContent = `Waiting for restaurant data...`;
            console.log('No sheet restaurants available. Please upload an Excel file first or waiting for data to load.');
            showRestaurantNotification('Waiting for restaurant data from Excel file. If you haven\'t uploaded an Excel file yet, please do so.', 'info');
            
            // Set up a one-time event listener to continue processing after sheet restaurants are loaded
            const processAfterSheetRestaurants = function() {
                window.removeEventListener('sheetRestaurantsReady', processAfterSheetRestaurants);
                window.removeEventListener('sheetRestaurantsLoaded', processAfterSheetRestaurants);
                console.log('Sheet restaurants now available, continuing with JSON processing');
                processJsonFiles(jsonFiles);
            };
            
            window.addEventListener('sheetRestaurantsReady', processAfterSheetRestaurants);
            window.addEventListener('sheetRestaurantsLoaded', processAfterSheetRestaurants);
            
            // Try to fetch sheet restaurants in case they exist but weren't loaded yet
            fetchSheetRestaurants();
        } else {
            // We already have sheet restaurants, proceed immediately
            processJsonFiles(jsonFiles);
        }
    }
    
    // Show notification with multiple types
    function showRestaurantNotification(message, type = 'info') {
        // Use notification system if available
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            console.log(`[${type}] ${message}`);
            if (type === 'error') {
                alert(message);
            }
        }
    }
    
    // New helper function to process JSON files after we have sheet restaurants
    function processJsonFiles(jsonFiles) {
        // Get references to status elements since this is now called from different contexts
        const statusElement = document.getElementById('folder-status');
        const statusText = statusElement ? statusElement.querySelector('#folder-status-text') : null;
        
        if (!statusText) {
            console.error('Status text element not found');
            return;
        }
        
        statusText.textContent = `Processing ${jsonFiles.length} files...`;
        
        // Process each JSON file
        const categories = {};
        const vectors = [];
        const labels = [];
        let processedCount = 0;
        
        jsonFiles.forEach(file => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                // ... existing code for reading and processing JSON files ...
                try {
                    const content = e.target.result;
                    const data = JSON.parse(content);
                    
                    // Extract embeddings and categorized labels
                    if (Array.isArray(data)) {
                        data.forEach(item => {
                            // Find the embedding field (the one that's not "_id")
                            const keys = Object.keys(item);
                            const embeddingKey = keys.find(key => key !== "_id" && Array.isArray(item[key]));
                            
                            if (embeddingKey && Array.isArray(item[embeddingKey])) {
                                // Check if key follows pattern "category -> concept"
                                if (embeddingKey.includes(' -> ')) {
                                    const [category, concept] = embeddingKey.split(' -> ');
                                    
                                    // Store the category for later use
                                    if (!categories[category]) {
                                        categories[category] = [];
                                    }
                                    if (!categories[category].includes(concept)) {
                                        categories[category].push(concept);
                                    }
                                    
                                    // Add to vectors and labels
                                    vectors.push(item[embeddingKey]);
                                    labels.push({
                                        category: category,
                                        concept: concept,
                                        fullLabel: embeddingKey
                                    });
                                } else {
                                    // Handle non-categorized labels
                                    vectors.push(item[embeddingKey]);
                                    labels.push(embeddingKey);
                                }
                            }
                        });
                    }
                } catch (error) {
                    console.error(`Error processing file ${file.name}:`, error);
                }
                
                processedCount++;
                const progress = Math.floor((processedCount / jsonFiles.length) * 100);
                if (statusElement && statusElement.querySelector('.progress-bar')) {
                    statusElement.querySelector('.progress-bar').style.width = `${progress}%`;
                }
                statusText.textContent = `Processed ${processedCount}/${jsonFiles.length} files`;
                
                // Check if all files have been processed
                if (processedCount === jsonFiles.length) {
                    finishJsonProcessing(vectors, labels, categories);
                }
            };
            
            reader.onerror = function() {
                console.error(`Error reading file ${file.name}`);
                processedCount++;
                // Check if all files have been processed
                if (processedCount === jsonFiles.length) {
                    finishJsonProcessing(vectors, labels, categories);
                }
            };
            
            reader.readAsText(file);
        });
    }
    
    // New helper function to finalize JSON processing
    function finishJsonProcessing(vectors, labels, categories) {
        if (vectors.length > 0) {
            console.log(`Finished processing with ${vectors.length} vectors from ${Object.keys(categories).length} categories`);
            
            window.restaurantData = {
                raw: null,
                vectors: vectors,
                labels: labels,
                categories: categories,
                loaded: true,
                currentVisualization: null,
                sheetRestaurants: window.restaurantData.sheetRestaurants // Keep sheet restaurants data
            };
            
            updateRestaurantMetrics();
            renderCategoryHierarchy();
            showRestaurantSuccess(`Loaded ${vectors.length} embeddings from ${Object.keys(categories).length} categories`);
            
            // Process restaurant data from labels
            const restaurants = processRestaurantsFromLabels(labels, categories);
            window.restaurantData.restaurants = restaurants;
            
            // Dispatch event for other modules that need restaurant data
            window.dispatchEvent(new CustomEvent('restaurantDataLoaded', {
                detail: { restaurants }
            }));
        } else {
            showRestaurantError('No valid embedding vectors found in the uploaded files');
        }
    }
    
    // Helper function to process restaurant data from labels with improved sheet name matching
    function processRestaurantsFromLabels(labels, categories) {
        // This function extracts restaurant information from embeddings data
        const restaurants = [];
        const { sheetRestaurants } = window.restaurantData;
        
        try {
            // Group by restaurant if possible
            const restaurantMap = {};
            
            // First pass: prioritize known sheet restaurant names from Excel
            if (sheetRestaurants && sheetRestaurants.length > 0) {
                sheetRestaurants.forEach((sheetName, index) => {
                    restaurantMap[sheetName] = {
                        id: `restaurant-sheet-${index}`,
                        name: sheetName,
                        displayName: sheetName,
                        categories: {},
                        isSheetName: true,
                        source: 'sheet_name'
                    };
                });
            }
            
            // ...existing code for processing labels...
            
            // Merge any found categories into sheet restaurant entries
            labels.forEach((label) => {
                if (typeof label === 'object' && label.category && label.concept) {
                    // Get restaurant name and find best match in sheet names
                    let restaurantName = label.restaurant || 'Unknown Restaurant';
                    let matchedSheetName = null;
                    
                    // Explicitly look for sheet name match
                    if (sheetRestaurants && sheetRestaurants.length > 0) {
                        matchedSheetName = findMatchingSheetRestaurant(restaurantName, sheetRestaurants);
                    }
                    
                    // Use matched sheet name if found, otherwise use original name
                    const finalRestaurantName = matchedSheetName || restaurantName;
                    
                    // Add to restaurant map
                    if (!restaurantMap[finalRestaurantName]) {
                        restaurantMap[finalRestaurantName] = {
                            id: `restaurant-${finalRestaurantName.replace(/\s+/g, '-').toLowerCase()}`,
                            name: finalRestaurantName,
                            displayName: finalRestaurantName,
                            categories: {},
                            isSheetName: !!matchedSheetName,
                            source: matchedSheetName ? 'matched_sheet_name' : 'label'
                        };
                    }
                    
                    // Add category and concept
                    if (!restaurantMap[finalRestaurantName].categories[label.category]) {
                        restaurantMap[finalRestaurantName].categories[label.category] = [];
                    }
                    
                    restaurantMap[finalRestaurantName].categories[label.category].push({
                        name: label.concept,
                        confidence: label.confidence || 1.0
                    });
                }
                // ...existing code for other label formats...
            });
            
            // ...rest of existing function...
        } catch (error) {
            console.error('Error processing restaurants from labels:', error);
        }
        
        return restaurants;
    }
    
    // Extract sheet name from string label if available
    function extractSheetNameFromString(labelStr) {
        // Check if label contains sheet name in format like [SheetName] Category -> Concept
        const match = labelStr.match(/^\[([^\]]+)\]/);
        return match ? match[1] : null;
    }
    
    // Show error message
    function showRestaurantError(message) {
        statusText.textContent = 'Error';
        statusText.className = 'badge bg-danger';
        
        // Use notification system if available
        if (typeof showNotification === 'function') {
            showNotification(message, 'error');
        } else {
            console.error(message);
            alert(message);
        }
    }
    
    // Show success message
    function showRestaurantSuccess(message) {
        statusText.textContent = 'Success';
        statusText.className = 'badge bg-success';
        
        // Use notification system if available
        if (typeof showNotification === 'function') {
            showNotification(message, 'success');
        } else {
            console.log(message);
        }
    }
}

// Initialize restaurant visualization components
function initRestaurantVisualization() {
    console.log('Setting up restaurant visualization components');
    
    try {
        // First check if the visualization tabs exist at all
        const tabsContainer = document.getElementById('restaurantVisualizationTabs');
        if (!tabsContainer) {
            console.warn('Restaurant visualization tabs not found in the DOM');
            return; // Exit early if the container isn't available
        }
        
        // Initialize tabs with proper error handling
        initVisualizationTabs();
        
        // Set up event handlers for the similarity visualization options
        const updateSimilarityBtn = document.getElementById('updateSimilarityViz');
        if (updateSimilarityBtn) {
            updateSimilarityBtn.addEventListener('click', renderSimilarityVisualization);
        }
        
        // Set up event handlers for the clustering visualization options
        const updateClusteringBtn = document.getElementById('updateClusteringViz');
        if (updateClusteringBtn) {
            updateClusteringBtn.addEventListener('click', function() {
                const method = document.getElementById('clusteringMethod')?.value || 'automatic';
                if (method === 'category') {
                    renderClusteringByCategoryVisualization();
                } else {
                    renderClusteringVisualization();
                }
            });
        }
        
        // Set up clustering method change handler
        const clusteringMethod = document.getElementById('clusteringMethod');
        if (clusteringMethod) {
            clusteringMethod.addEventListener('change', function() {
                if (this.value === 'category') {
                    renderClusteringByCategoryVisualization();
                } else {
                    renderClusteringVisualization();
                }
            });
        }
        
        // Set up initial visualization based on active tab
        const activeTab = document.querySelector('#restaurantVisualizationTabs .nav-link.active');
        if (activeTab) {
            const targetId = activeTab.getAttribute('data-bs-target')?.substring(1);
            if (targetId === 'hierarchy') {
                renderCategoryHierarchy();
            } else if (targetId === 'similarity') {
                renderSimilarityVisualization();
            } else if (targetId === 'distribution') {
                renderDistributionVisualization();
            } else if (targetId === 'clustering') {
                renderClusteringVisualization();
            }
        }
        
        console.log('Restaurant visualization components initialized successfully');
    } catch (error) {
        console.error('Error initializing restaurant visualization:', error);
    }
}

// Initialize visualization tabs
function initVisualizationTabs() {
    // Set up tab change handlers
    const tabs = document.querySelectorAll('#restaurantVisualizationTabs button');
    if (!tabs.length) return;
    
    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(event) {
            const targetId = event.target.getAttribute('data-bs-target').substring(1);
            
            if (targetId === 'hierarchy') {
                renderCategoryHierarchy();
            } else if (targetId === 'similarity') {
                renderSimilarityVisualization();
            } else if (targetId === 'distribution') {
                renderDistributionVisualization();
            } else if (targetId === 'clustering') {
                renderClusteringVisualization();
            }
        });
    });
    
    // Add refresh button event
    const refreshBtn = document.getElementById('refreshRestaurantViz');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            const activeTab = document.querySelector('#restaurantVisualizationTabs .nav-link.active');
            if (activeTab) {
                // Trigger tab event to refresh visualization
                activeTab.dispatchEvent(new Event('shown.bs.tab'));
                showNotification('Visualization refreshed', 'success');
            }
        });
    }
    
    // Add update hierarchy visualization button event
    const updateBtn = document.getElementById('updateHierarchyViz');
    if (updateBtn) {
        updateBtn.addEventListener('click', renderCategoryHierarchy);
    }
    
    // Add color scheme change event
    const colorSchemeSelect = document.getElementById('hierarchyColorScheme');
    if (colorSchemeSelect) {
        colorSchemeSelect.addEventListener('change', function() {
            const hierarchyType = document.getElementById('hierarchyType')?.value || 'sunburst';
            if (hierarchyType === document.getElementById('hierarchyType')?.value) {
                renderCategoryHierarchy();
            }
        });
    }
}

// Update restaurant metrics
function updateRestaurantMetrics() {
    if (!window.restaurantData.loaded) return;
    
    try {
        const { vectors, categories } = window.restaurantData;
        
        // Get element references
        const dimensionsEl = document.getElementById('dimensions');
        const dataPointsEl = document.getElementById('dataPoints');
        const categoryCountEl = document.getElementById('categoryCount');
        const conceptCountEl = document.getElementById('conceptCount');
        
        // Update metrics with null checks
        if (vectors && vectors.length > 0 && vectors[0]) {
            if (dimensionsEl) dimensionsEl.textContent = vectors[0].length || '-';
            if (dataPointsEl) dataPointsEl.textContent = vectors.length || '-';
        }
        
        if (categories) {
            if (categoryCountEl) categoryCountEl.textContent = Object.keys(categories).length || '-';
            
            // Count total concepts with error checking
            let totalConcepts = 0;
            try {
                totalConcepts = Object.values(categories).reduce((sum, arr) => {
                    // Check if the value is an array before adding its length
                    return sum + (Array.isArray(arr) ? arr.length : 0);
                }, 0);
            } catch (e) {
                console.warn('Error calculating total concepts:', e);
            }
            
            if (conceptCountEl) conceptCountEl.textContent = totalConcepts || '-';
            
            // Show category breakdown section
            const breakdownSection = document.getElementById('categoryBreakdownSection');
            if (breakdownSection) {
                if (totalConcepts > 0) {
                    breakdownSection.classList.remove('d-none');
                } else {
                    breakdownSection.classList.add('d-none');
                    return; // Exit early if no concepts to display
                }
            }
            
            // Populate category table
            const categoryTable = document.getElementById('categoryTable');
            if (categoryTable) {
                categoryTable.innerHTML = '';
                
                Object.entries(categories).forEach(([category, concepts]) => {
                    if (!Array.isArray(concepts)) {
                        console.warn(`Concepts for category ${category} is not an array`);
                        return; // Skip this category
                    }
                    
                    const percentage = ((concepts.length / totalConcepts) * 100).toFixed(1);
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${category}</td>
                        <td>${concepts.length}</td>
                        <td>
                            <div class="d-flex align-items-center">
                                <div class="progress flex-grow-1 me-2" style="height: 6px;">
                                    <div class="progress-bar" role="progressbar" style="width: ${percentage}%" 
                                        aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100"></div>
                                </div>
                                <span>${percentage}%</span>
                            </div>
                        </td>
                    `;
                    categoryTable.appendChild(row);
                });
            }
        }
    } catch (error) {
        console.error('Error updating restaurant metrics:', error);
    }
}

// Render category hierarchy visualization
function renderCategoryHierarchy() {
    if (!window.restaurantData.loaded) {
        const vizContainer = document.getElementById('hierarchyViz');
        if (vizContainer) {
            vizContainer.innerHTML = '<div class="alert alert-info">No restaurant data loaded. Please upload restaurant data files first.</div>';
        }
        return;
    }
    
    const vizContainer = document.getElementById('hierarchyViz');
    if (!vizContainer) {
        console.error('Hierarchy visualization container not found');
        return;
    }
    
    // Show loading indicator
    vizContainer.innerHTML = '<div class="d-flex justify-content-center align-items-center h-100"><div class="spinner-border text-primary" role="status"></div><span class="ms-2">Loading visualization...</span></div>';
    
    // Check for Plotly availability before proceeding
    if (typeof Plotly === 'undefined') {
        vizContainer.innerHTML = '<div class="alert alert-warning">Plotly.js is required for visualizations. Please check your internet connection and reload the page.</div>';
        return;
    }
    
    // Get visualization options with fallbacks
    const vizType = document.getElementById('hierarchyType')?.value || 'sunburst';
    const colorScheme = document.getElementById('hierarchyColorScheme')?.value || 'viridis';
    
    // Process the data for hierarchy visualization with a delay to ensure DOM is ready
    setTimeout(() => {
        try {
            // Extract category hierarchy data
            const hierarchyData = {
                name: "Restaurant Categories",
                children: []
            };
            
            if (!window.restaurantData.categories || Object.keys(window.restaurantData.categories).length === 0) {
                vizContainer.innerHTML = '<div class="alert alert-warning">No category data available. The uploaded files may not contain properly formatted category information.</div>';
                return;
            }
            
            Object.entries(window.restaurantData.categories).forEach(([category, concepts]) => {
                if (!concepts || !Array.isArray(concepts) || concepts.length === 0) {
                    console.warn(`Category ${category} has no concepts or invalid data format`);
                    return; // Skip this category
                }
                
                const categoryNode = {
                    name: category,
                    children: concepts.map(concept => ({ name: concept, value: 1 }))
                };
                hierarchyData.children.push(categoryNode);
            });
            
            // Render the appropriate visualization based on the selected type
            if (typeof Plotly !== 'undefined') {
                if (vizType === 'sunburst') {
                    renderSunburstChart(hierarchyData, vizContainer, colorScheme);
                } else if (vizType === 'treemap') {
                    renderTreeMap(hierarchyData, vizContainer, colorScheme);
                } else if (vizType === 'circlepack') {
                    renderCirclePacking(hierarchyData, vizContainer, colorScheme);
                }  // Fixed: Added missing closing brace for the if-else chain
                
                // Add export button after successful visualization
                addExportButton(vizContainer, 'hierarchy-export-btn', 'Restaurant Categories');
            } else {
                vizContainer.innerHTML = '<div class="alert alert-warning">Plotly.js is required for visualizations. Please check your internet connection and reload the page.</div>';
            }
        } catch (error) {
            vizContainer.innerHTML = `<div class="alert alert-danger">
                <h6><i class="bi bi-exclamation-triangle me-2"></i>Error rendering visualization</h6>
                <p class="mb-0">${error.message}</p>
                <button class="btn btn-sm btn-outline-danger mt-2" onclick="renderCategoryHierarchy()">Try Again</button>
            </div>`;
            console.error('Error in renderCategoryHierarchy:', error);
        }
    }, 300); // Increased delay from 100ms to 300ms for better DOM readiness
}

// Render sunburst chart using Plotly
function renderSunburstChart(data, container, colorScheme) {
    // Convert hierarchy data to the format Plotly expects
    const labels = [];
    const parents = [];
    const values = [];
    const ids = [];
    
    // Add the root
    labels.push(data.name);
    parents.push("");
    values.push(data.children.reduce((sum, cat) => sum + cat.children.length, 0));
    ids.push("root");
    
    // Add the categories
    data.children.forEach((category, i) => {
        const categoryId = `cat-${i}`;
        labels.push(category.name);
        parents.push("root");
        values.push(category.children.length);
        ids.push(categoryId);
        
        // Add the concepts
        category.children.forEach((concept, j) => {
            const conceptId = `cat-${i}-con-${j}`;
            labels.push(concept.name);
            parents.push(categoryId);
            values.push(concept.value);
            ids.push(conceptId);
        });
    });
    
    // Create the sunburst trace
    const trace = {
        type: "sunburst",
        labels: labels,
        parents: parents,
        values: values,
        ids: ids,
        branchvalues: 'total',
        hovertemplate: '<b>%{label}</b><br>Count: %{value}<br>Percentage: %{percentEntry:.1%}<extra></extra>',
        insidetextorientation: 'radial',
        marker: { 
            colorscale: colorScheme,
            line: { width: 0.5, color: '#fff' } // Add thin white borders for better separation
        }
    };
    
    const layout = {
        margin: { l: 0, r: 0, b: 0, t: 0 },
        sunburstcolorway: getColorScheme(colorScheme, data.children.length),
        font: { size: 10 },
        hoverlabel: { font: { size: 12 } }
    };
    
    const config = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleSpikelines'],
        toImageButtonOptions: {
            format: 'png',
            filename: 'restaurant-categories-sunburst',
            height: 800,
            width: 800,
            scale: 2
        }
    };
    
    Plotly.newPlot(container, [trace], layout, config);
    
    // Store the visualization type in the global data object
    window.restaurantData.currentVisualization = 'sunburst';
}

// Render treemap using Plotly
function renderTreeMap(data, container, colorScheme) {
    // Convert hierarchy data to the format Plotly expects
    const labels = [];
    const parents = [];
    const values = [];
    const ids = [];
    
    // Add the root
    labels.push(data.name);
    parents.push("");
    values.push(data.children.reduce((sum, cat) => sum + cat.children.length, 0));
    ids.push("root");
    
    // Add the categories
    data.children.forEach((category, i) => {
        const categoryId = `cat-${i}`;
        labels.push(category.name);
        parents.push("root");
        values.push(category.children.length);
        ids.push(categoryId);
        
        // Add the concepts
        category.children.forEach((concept, j) => {
            const conceptId = `cat-${i}-con-${j}`;
            labels.push(concept.name);
            parents.push(categoryId);
            values.push(concept.value);
            ids.push(conceptId);
        });
    });
    
    // Create the treemap trace
    const trace = {
        type: "treemap",
        labels: labels,
        parents: parents,
        values: values,
        ids: ids,
        branchvalues: 'total',
        hovertemplate: '<b>%{label}</b><br>Count: %{value}<br>Percentage: %{percentEntry:.1%}<extra></extra>',
        textposition: 'middle center',
        marker: { 
            colorscale: colorScheme,
            line: { width: 1, color: '#fff' } // Add white borders for better separation
        }
    };
    
    const layout = {
        margin: { l: 0, r: 0, b: 0, t: 0 },
        treemapcolorway: getColorScheme(colorScheme, data.children.length),
        font: { size: 10 },
        hoverlabel: { font: { size: 12 } }
    };
    
    const config = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleSpikelines'],
        toImageButtonOptions: {
            format: 'png',
            filename: 'restaurant-categories-treemap',
            height: 800,
            width: 800,
            scale: 2
        }
    };
    
    Plotly.newPlot(container, [trace], layout, config);
    
    // Store the visualization type in the global data object
    window.restaurantData.currentVisualization = 'treemap';
}

// Render circle packing using Plotly
function renderCirclePacking(data, container, colorScheme) {
    // For circle packing, we'll use a treemap with a special squarify algorithm
    // that makes it appear more like circle packing
    const labels = [];
    const parents = [];
    const values = [];
    const ids = [];
    
    // Add the root
    labels.push(data.name);
    parents.push("");
    values.push(data.children.reduce((sum, cat) => sum + cat.children.length, 0));
    ids.push("root");
    
    // Add the categories
    data.children.forEach((category, i) => {
        const categoryId = `cat-${i}`;
        labels.push(category.name);
        parents.push("root");
        values.push(category.children.length);
        ids.push(categoryId);
        
        // Add the concepts
        category.children.forEach((concept, j) => {
            const conceptId = `cat-${i}-con-${j}`;
            labels.push(concept.name);
            parents.push(categoryId);
            values.push(concept.value);
            ids.push(conceptId);
        });
    });
    
    // Create the treemap trace with circle packing appearance
    const trace = {
        type: "treemap",
        labels: labels,
        parents: parents,
        values: values,
        ids: ids,
        branchvalues: 'total',
        hovertemplate: '<b>%{label}</b><br>Count: %{value}<br>Percentage: %{percentEntry:.1%}<extra></extra>',
        textposition: 'middle center',
        marker: { 
            colorscale: colorScheme,
            line: { width: 2, color: '#fff' }, // Add white borders for better separation
            pad: { t: 3, l: 3, r: 3, b: 3 }
        },
        tiling: { 
            packing: 'circle'
        }
    };
    
    const layout = {
        margin: { l: 0, r: 0, b: 0, t: 0 },
        treemapcolorway: getColorScheme(colorScheme, data.children.length),
        font: { size: 10 },
        hoverlabel: { font: { size: 12 } }
    };
    
    const config = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleSpikelines'],
        toImageButtonOptions: {
            format: 'png',
            filename: 'restaurant-categories-circlepack',
            height: 800,
            width: 800,
            scale: 2
        }
    };
    
    Plotly.newPlot(container, [trace], layout, config);
    
    // Store the visualization type in the global data object
    window.restaurantData.currentVisualization = 'circlepack';
}

// Add export button to visualization container
function addExportButton(container, buttonId, titlePrefix) {
    // Check if button already exists to avoid duplicates
    const existingButton = document.getElementById(buttonId);
    if (existingButton) {
        return;
    }
    
    // Create export button container
    const exportButtonContainer = document.createElement('div');
    exportButtonContainer.className = 'position-absolute top-0 end-0 m-2';
    
    // Create export button
    const exportButton = document.createElement('button');
    exportButton.id = buttonId;
    exportButton.className = 'btn btn-sm btn-outline-primary';
    exportButton.innerHTML = '<i class="bi bi-download me-1"></i>Export';
    exportButton.title = 'Download visualization as PNG';
    exportButton.addEventListener('click', function() {
        // Get the current date for filename
        const date = new Date();
        const dateString = date.toISOString().split('T')[0];
        
        // Get current visualization type
        const vizType = window.restaurantData.currentVisualization || 'visualization';
        
        // Generate filename
        const filename = `${titlePrefix.toLowerCase().replace(/\s+/g, '-')}-${vizType}-${dateString}`;
        
        // Use Plotly's toImage function to download the visualization
        Plotly.toImage(container, {
            format: 'png',
            height: 800,
            width: 800,
            scale: 2,
            filename: filename
        }).then(function(dataUrl) {
            // Create a download link
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `${filename}.png`;
            link.click();
        }).catch(function(error) {
            console.error('Error exporting visualization:', error);
            alert('Failed to export visualization. Please try again.');
        });
    });
    
    // Add button to container
    exportButtonContainer.appendChild(exportButton);
    
    // Add container to visualization container
    container.style.position = 'relative'; // Ensure container is positioned
    container.appendChild(exportButtonContainer);
}

// Helper function to get color schemes
function getColorScheme(scheme, count) {
    if (scheme === 'viridis') {
        return Array.from({ length: count }, (_, i) => 
            `rgb(${Math.floor(68 + (i / count) * 187)}, ${Math.floor(1 + (i / count) * 229)}, ${Math.floor(84 + (i / count) * 100)})`
        );
    } else if (scheme === 'plasma') {
        return Array.from({ length: count }, (_, i) => 
            `rgb(${Math.floor(13 + (i / count) * 240)}, ${Math.floor(8 + (i / count) * 200)}, ${Math.floor(135 + (i / count) * 119)})`
        );
    } else {
        // Default to category10
        const baseColors = [
            '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', 
            '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
        ];
        // Repeat colors if needed
        return Array.from({ length: count }, (_, i) => baseColors[i % baseColors.length]);
    }
}

// Enhanced placeholder functions for better user experience
// Placeholder function for similarity visualization
function renderSimilarityVisualization() {
    const vizContainer = document.getElementById('similarityViz');
    if (!vizContainer) return;
    
    if (!window.restaurantData.loaded) {
        vizContainer.innerHTML = '<div class="alert alert-info">No restaurant data loaded. Please upload restaurant data files first.</div>';
        return;
    }
    
    // Show loading indicator
    vizContainer.innerHTML = '<div class="d-flex justify-content-center align-items-center h-100"><div class="spinner-border text-primary" role="status"></div><span class="ms-2">Loading semantic analysis...</span></div>';
    
    // Check for Plotly availability before proceeding
    if (typeof Plotly === 'undefined') {
        vizContainer.innerHTML = '<div class="alert alert-warning">Plotly.js is required for visualizations. Please check your internet connection and reload the page.</div>';
        return;
    }
    
    setTimeout(() => {
        try {
            const { vectors, labels, categories } = window.restaurantData;
            
            if (vectors.length === 0) {
                vizContainer.innerHTML = '<div class="alert alert-warning">No vector data available for visualization.</div>';
                return;
            }
            
            // Perform dimensionality reduction for 2D visualization
            // We'll use a simplified t-SNE approach for browser performance
            const embeddingPoints = performDimensionalityReduction(vectors);
            
            // Group points by category
            const categoryColors = getColorScheme('category10', Object.keys(categories).length);
            const categoryMap = {};
            const traces = [];
            
            // Create a trace for each category
            Object.keys(categories).forEach((category, i) => {
                const points = [];
                const text = [];
                const concepts = categories[category] || [];
                
                // Collect all points for this category
                labels.forEach((label, j) => {
                    // Fix: Check if label is an object and access its properties correctly
                    const labelCategory = typeof label === 'object' ? label.category : 
                                         (typeof label === 'string' && label.includes(' -> ') ? 
                                          label.split(' -> ')[0] : null);
                    
                    if (labelCategory === category) {
                        const concept = typeof label === 'object' ? label.concept : 
                                       (typeof label === 'string' && label.includes(' -> ') ? 
                                        label.split(' -> ')[1] : label);
                        
                        if (concepts.includes(concept)) {
                            points.push({
                                x: embeddingPoints[j][0],
                                y: embeddingPoints[j][1],
                                label: concept
                            });
                            text.push(concept);
                        }
                    }
                });
                
                if (points.length > 0) {
                    traces.push({
                        x: points.map(p => p.x),
                        y: points.map(p => p.y),
                        text: text,
                        mode: 'markers',
                        type: 'scatter',
                        name: category,
                        marker: {
                            color: categoryColors[i % categoryColors.length],
                            size: 10,
                            opacity: 0.7,
                            line: {
                                color: 'white',
                                width: 1
                            }
                        },
                        hovertemplate: 
                            '<b>%{text}</b><br>' +
                            'Category: ' + category +
                            '<extra></extra>'
                    });
                }
            });
            
            // Layout configuration
            const layout = {
                title: {
                    text: 'Concept Semantic Similarity',
                    font: {
                        size: 16
                    }
                },
                showlegend: true,
                legend: {
                    orientation: 'h',
                    yanchor: 'bottom',
                    y: 1.02,
                    xanchor: 'right',
                    x: 1
                },
                hovermode: 'closest',
                margin: { l: 40, r: 40, b: 40, t: 60 },
                xaxis: {
                    showticklabels: false,
                    zeroline: false,
                    title: 'Dimension 1'
                },
                yaxis: {
                    showticklabels: false,
                    zeroline: false,
                    title: 'Dimension 2'
                }
            };
            
            const config = {
                responsive: true,
                displayModeBar: true,
                modeBarButtonsToRemove: ['lasso2d', 'toggleSpikelines'],
                toImageButtonOptions: {
                    format: 'png',
                    filename: 'restaurant-concepts-similarity',
                    height: 800,
                    width: 800,
                    scale: 2
                }
            };
            
            // Plot the visualization
            Plotly.newPlot(vizContainer, traces, layout, config);
            
            // Add export button
            addExportButton(vizContainer, 'similarity-export-btn', 'Concept Similarity'); 
            
            // Store the visualization type in the global data object
            window.restaurantData.currentVisualization = 'similarity';
            
        } catch (error) {
            vizContainer.innerHTML = `<div class="alert alert-danger">
                <h6><i class="bi bi-exclamation-triangle me-2"></i>Error rendering similarity visualization</h6>
                <p class="mb-0">${error.message}</p>
                <button class="btn btn-sm btn-outline-danger mt-2" onclick="renderSimilarityVisualization()">Try Again</button>
            </div>`;
            console.error('Error in renderSimilarityVisualization:', error);
        }
    }, 300);
}

// Perform dimensionality reduction (simplified for browser)
function performDimensionalityReduction(vectors) {
    // If vectors are already 2D or less, return them directly
    if (vectors.length === 0 || vectors[0].length <= 2) {
        return vectors;
    }
    
    // For high-dimensional vectors, use a simple PCA-like approach
    // (A full t-SNE implementation would be too heavy for the browser)
    const result = [];
    const n = vectors.length;
    
    // Compute mean vector
    const mean = new Array(vectors[0].length).fill(0);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < vectors[i].length; j++) {
            mean[j] += vectors[i][j] / n;
        }
    }
    
    // Compute 2 principal directions (very simplified PCA)
    // We'll use the first 2 vectors as basis and make them orthogonal
    const basis1 = vectors[0].map((val, i) => val - mean[i]);
    
    // Find a vector that's most different from basis1
    let maxDiff = -Infinity;
    let basis2Index = 1;
    for (let i = 1; i < n; i++) {
        const diff = computeCosineDifference(
            vectors[i].map((val, j) => val - mean[j]),
            basis1
        );
        if (diff > maxDiff) {
            maxDiff = diff;
            basis2Index = i;
        }
    }
    
    const basis2Raw = vectors[basis2Index].map((val, i) => val - mean[i]);
    
    // Make basis2 orthogonal to basis1 using Gram-Schmidt
    const dot = dotProduct(basis2Raw, basis1);
    const basis1MagSq = dotProduct(basis1, basis1);
    const basis2 = basis2Raw.map((val, i) => val - (dot / basis1MagSq) * basis1[i]);
    
    // Project all vectors onto the 2D subspace
    for (let i = 0; i < n; i++) {
        const centered = vectors[i].map((val, j) => val - mean[j]);
        const proj1 = dotProduct(centered, basis1) / Math.sqrt(dotProduct(basis1, basis1));
        const proj2 = dotProduct(centered, basis2) / Math.sqrt(dotProduct(basis2, basis2));
        result.push([proj1, proj2]);
    }
    
    return result;
}

// Helper function to compute dot product
function dotProduct(vecA, vecB) {
    return vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
}

// Helper function to compute cosine difference (1 - cosine similarity)
function computeCosineDifference(vecA, vecB) {
    const dotProd = dotProduct(vecA, vecB);
    const magA = Math.sqrt(dotProduct(vecA, vecA));
    const magB = Math.sqrt(dotProduct(vecB, vecB));
    
    if (magA === 0 || magB === 0) return 1; // Maximum difference if either vector is zero
    return 1 - (dotProd / (magA * magB));
}

// Implementation of concept clustering visualization
function renderClusteringVisualization() {
    const vizContainer = document.getElementById('clusteringViz');
    if (!vizContainer) return;
    
    if (!window.restaurantData.loaded) {
        vizContainer.innerHTML = '<div class="alert alert-info">No restaurant data loaded. Please upload restaurant data files first.</div>';
        return;
    }
    
    // Show loading indicator
    vizContainer.innerHTML = '<div class="d-flex justify-content-center align-items-center h-100"><div class="spinner-border text-primary" role="status"></div><span class="ms-2">Loading clustering analysis...</span></div>';
    
    // Check for Plotly availability before proceeding
    if (typeof Plotly === 'undefined') {
        vizContainer.innerHTML = '<div class="alert alert-warning">Plotly.js is required for visualizations. Please check your internet connection and reload the page.</div>';
        return;
    }
    
    setTimeout(() => {
        try {
            const { vectors, labels, categories } = window.restaurantData;
            
            if (vectors.length === 0) {
                vizContainer.innerHTML = '<div class="alert alert-warning">No vector data available for visualization.</div>';
                return;
            }
            
            // Get all concepts across categories
            const allConcepts = [];
            Object.entries(categories).forEach(([category, concepts]) => {
                if (Array.isArray(concepts)) {
                    concepts.forEach(concept => {
                        allConcepts.push({
                            category,
                            concept,
                            vector: null
                        });
                    });
                }
            });
            
            // Match vectors to concepts
            labels.forEach((label, i) => {
                // Fix: Check if label is an object or string and handle accordingly
                if (typeof label === 'object' && label.category && label.concept) {
                    const conceptObj = allConcepts.find(c => 
                        c.category === label.category && c.concept === label.concept);
                    if (conceptObj) {
                        conceptObj.vector = vectors[i];
                    }
                } else if (typeof label === 'string' && label.includes(' -> ')) {
                    const [category, concept] = label.split(' -> ');
                    const conceptObj = allConcepts.find(c => 
                        c.category === category && c.concept === concept);
                    if (conceptObj) {
                        conceptObj.vector = vectors[i];
                    }
                }
            });
            
            // Filter concepts that have vectors
            const validConcepts = allConcepts.filter(c => c.vector !== null);
            
            if (validConcepts.length === 0) {
                vizContainer.innerHTML = '<div class="alert alert-warning">No valid concept vectors found for clustering.</div>';
                return;
            }
            
            // Perform dimensionality reduction for visualization
            const embeddingPoints = performDimensionalityReduction(validConcepts.map(c => c.vector));
            
            // Apply a simplified clustering algorithm
            const clusters = performSimpleClustering(embeddingPoints);
            
            // Get colors for clusters and categories
            const clusterColors = getColorScheme('viridis', Math.max(...clusters) + 1);
            const categoryColors = {};
            Object.keys(categories).forEach((cat, i) => {
                categoryColors[cat] = getColorScheme('category10', Object.keys(categories).length)[i];
            });
            
            // Create a trace for each cluster
            const traces = [];
            for (let clusterIndex = 0; clusterIndex <= Math.max(...clusters); clusterIndex++) {
                const clusterPoints = [];
                const clusterText = [];
                const clusterCats = [];
                
                validConcepts.forEach((concept, i) => {
                    if (clusters[i] === clusterIndex) {
                        clusterPoints.push({
                            x: embeddingPoints[i][0],
                            y: embeddingPoints[i][1],
                            category: concept.category,
                            concept: concept.concept
                        });
                        clusterText.push(concept.concept);
                        clusterCats.push(concept.category);
                    }
                });
                
                if (clusterPoints.length > 0) {
                    traces.push({
                        x: clusterPoints.map(p => p.x),
                        y: clusterPoints.map(p => p.y),
                        text: clusterText,
                        mode: 'markers',
                        type: 'scatter',
                        name: `Cluster ${clusterIndex + 1}`,
                        marker: {
                            color: clusterColors[clusterIndex],
                            size: 10,
                            opacity: 0.7,
                            line: {
                                color: 'white',
                                width: 1
                            }
                        },
                        customdata: clusterCats,
                        hovertemplate: 
                            '<b>%{text}</b><br>' +
                            'Category: %{customdata}<br>' +
                            'Cluster: ' + (clusterIndex + 1) +
                            '<extra></extra>'
                    });
                }
            }
            
            // Layout configuration
            const layout = {
                title: {
                    text: 'Concept Clusters',
                    font: {
                        size: 16
                    }
                },
                showlegend: true,
                legend: {
                    orientation: 'h',
                    yanchor: 'bottom',
                    y: 1.02,
                    xanchor: 'right',
                    x: 1
                },
                hovermode: 'closest',
                margin: { l: 40, r: 40, b: 40, t: 60 },
                xaxis: {
                    showticklabels: false,
                    zeroline: false,
                    title: 'Dimension 1'
                },
                yaxis: {
                    showticklabels: false,
                    zeroline: false,
                    title: 'Dimension 2'
                },
                annotations: [
                    {
                        text: `${traces.length} clusters identified`,
                        showarrow: false,
                        x: 0,
                        y: 1.05,
                        xref: 'paper',
                        yref: 'paper',
                        xanchor: 'left',
                        yanchor: 'bottom',
                        font: {
                            size: 12,
                            color: '#7f7f7f'
                        }
                    }
                ]
            };
            
            const config = {
                responsive: true,
                displayModeBar: true,
                modeBarButtonsToRemove: ['lasso2d', 'toggleSpikelines'],
                toImageButtonOptions: {
                    format: 'png',
                    filename: 'restaurant-concept-clusters',
                    height: 800,
                    width: 800,
                    scale: 2
                }
            };
            
            // Plot the visualization
            Plotly.newPlot(vizContainer, traces, layout, config);
            
            // Add export button
            addExportButton(vizContainer, 'clustering-export-btn', 'Concept Clusters');
            
            // Add UI controls for cluster visualization
            addClusteringControls(vizContainer);
            
            // Store the visualization type in the global data object
            window.restaurantData.currentVisualization = 'clustering';
            
        } catch (error) {
            vizContainer.innerHTML = `<div class="alert alert-danger">
                <h6><i class="bi bi-exclamation-triangle me-2"></i>Error rendering clustering visualization</h6>
                <p class="mb-0">${error.message}</p>
                <button class="btn btn-sm btn-outline-danger mt-2" onclick="renderClusteringVisualization()">Try Again</button>
            </div>`;
            console.error('Error in renderClusteringVisualization:', error);
        }
    }, 300);
}

// Add controls for clustering visualization
function addClusteringControls(container) {
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'clustering-controls position-absolute top-0 end-0 m-2';
    controlsDiv.innerHTML = `
        <div class="btn-group btn-group-sm">
            <button class="btn btn-sm btn-outline-secondary" id="cluster-by-similarity">
                <i class="bi bi-diagram-3 me-1"></i>By Similarity
            </button>
            <button class="btn btn-sm btn-outline-secondary" id="cluster-by-category">
                <i class="bi bi-tags me-1"></i>By Category
            </button>
        </div>
    `;
    
    container.appendChild(controlsDiv);
    
    // Add event listeners
    document.getElementById('cluster-by-similarity')?.addEventListener('click', function() {
        this.classList.add('active');
        document.getElementById('cluster-by-category')?.classList.remove('active');
        // Re-render with similarity clustering
        renderClusteringVisualization();
    });
    
    document.getElementById('cluster-by-category')?.addEventListener('click', function() {
        this.classList.add('active');
        document.getElementById('cluster-by-similarity')?.classList.remove('active');
        // Re-render with category clustering
        renderClusteringByCategoryVisualization();
    });
}

// Perform simplified clustering (k-means like approach)
function performSimpleClustering(points) {
    if (points.length <= 3) {
        return points.map(() => 0); // All points in one cluster if very few
    }
    
    // Determine number of clusters (rough heuristic)
    const k = Math.min(Math.max(2, Math.floor(Math.sqrt(points.length / 2))), 8);
    
    // Initialize cluster centers by choosing points that are far apart
    const centers = [points[0]];
    for (let i = 1; i < k; i++) {
        let farthestPoint = null;
        let maxMinDistance = -Infinity;
        
        // Find point with maximum minimum distance to existing centers
        for (let j = 0; j < points.length; j++) {
            let minDistance = Infinity;
            for (let c = 0; c < centers.length; c++) {
                const dist = euclideanDistance(points[j], centers[c]);
                minDistance = Math.min(minDistance, dist);
            }
            
            if (minDistance > maxMinDistance) {
                maxMinDistance = minDistance;
                farthestPoint = points[j];
            }
        }
        
        centers.push(farthestPoint);
    }
    
    // Assign points to nearest center
    const assignments = [];
    for (let i = 0; i < points.length; i++) {
        let minDistance = Infinity;
        let nearestCenter = 0;
        
        for (let j = 0; j < centers.length; j++) {
            const dist = euclideanDistance(points[i], centers[j]);
            if (dist < minDistance) {
                minDistance = dist;
                nearestCenter = j;
            }
        }
        
        assignments.push(nearestCenter);
    }
    
    return assignments;
}

// Helper function to calculate Euclidean distance
function euclideanDistance(p1, p2) {
    return Math.sqrt(p1.reduce((sum, val, i) => sum + Math.pow(val - p2[i], 2), 0));
}

// Render clustering visualization by category
function renderClusteringByCategoryVisualization() {
    const vizContainer = document.getElementById('clusteringViz');
    if (!vizContainer) return;
    
    if (!window.restaurantData.loaded) {
        vizContainer.innerHTML = '<div class="alert alert-info">No restaurant data loaded. Please upload restaurant data files first.</div>';
        return;
    }
    
    // Show loading indicator
    vizContainer.innerHTML = '<div class="d-flex justify-content-center align-items-center h-100"><div class="spinner-border text-primary" role="status"></div><span class="ms-2">Loading category analysis...</span></div>';
    
    setTimeout(() => {
        try {
            const { vectors, labels, categories } = window.restaurantData;
            
            if (vectors.length === 0) {
                vizContainer.innerHTML = '<div class="alert alert-warning">No vector data available for visualization.</div>';
                return;
            }
            
            // Perform dimensionality reduction
            const embeddingPoints = performDimensionalityReduction(vectors);
            
            // Create a trace for each category
            const categoryColors = getColorScheme('category10', Object.keys(categories).length);
            const traces = [];
            
            Object.keys(categories).forEach((category, i) => {
                const catPoints = [];
                const catLabels = [];
                
                // Collect points for this category
                labels.forEach((label, j) => {
                    // Fix: Check if label is an object and access its properties correctly
                    const labelCategory = typeof label === 'object' ? label.category : 
                                         (typeof label === 'string' && label.includes(' -> ') ? 
                                          label.split(' -> ')[0] : null);
                    
                    if (labelCategory === category) {
                        const concept = typeof label === 'object' ? label.concept : 
                                       (typeof label === 'string' && label.includes(' -> ') ? 
                                        label.split(' -> ')[1] : label);
                        
                        catPoints.push({
                            x: embeddingPoints[j][0],
                            y: embeddingPoints[j][1]
                        });
                        catLabels.push(concept);
                    }
                });
                
                if (catPoints.length > 0) {
                    traces.push({
                        x: catPoints.map(p => p.x),
                        y: catPoints.map(p => p.y),
                        text: catLabels,
                        mode: 'markers',
                        type: 'scatter',
                        name: category,
                        marker: {
                            color: categoryColors[i],
                            size: 10,
                            opacity: 0.7
                        },
                        hovertemplate: 
                            '<b>%{text}</b><br>' +
                            'Category: ' + category +
                            '<extra></extra>'
                    });
                }
            });
            
            // Layout configuration
            const layout = {
                title: {
                    text: 'Concepts Grouped by Category',
                    font: {
                        size: 16
                    }
                },
                showlegend: true,
                legend: {
                    orientation: 'h',
                    yanchor: 'bottom',
                    y: 1.02,
                    xanchor: 'right',
                    x: 1
                },
                hovermode: 'closest',
                margin: { l: 40, r: 40, b: 40, t: 60 },
                xaxis: {
                    showticklabels: false,
                    zeroline: false,
                    title: 'Dimension 1'
                },
                yaxis: {
                    showticklabels: false,
                    zeroline: false,
                    title: 'Dimension 2'
                }
            };
            
            const config = {
                responsive: true,
                displayModeBar: true,
                modeBarButtonsToRemove: ['lasso2d', 'toggleSpikelines'],
                toImageButtonOptions: {
                    format: 'png',
                    filename: 'restaurant-concepts-by-category',
                    height: 800,
                    width: 800,
                    scale: 2
                }
            };
            
            // Plot the visualization
            Plotly.newPlot(vizContainer, traces, layout, config);
            
            // Add clustering controls if they don't exist
            if (!document.querySelector('.clustering-controls')) {
                addClusteringControls(vizContainer);
            }
            
            // Make the category button active
            document.getElementById('cluster-by-category')?.classList.add('active');
            document.getElementById('cluster-by-similarity')?.classList.remove('active');
            
            // Add export button
            addExportButton(vizContainer, 'category-cluster-export-btn', 'Concepts by Category');
            
        } catch (error) {
            vizContainer.innerHTML = `<div class="alert alert-danger">
                <h6><i class="bi bi-exclamation-triangle me-2"></i>Error rendering category visualization</h6>
                <p class="mb-0">${error.message}</p>
                <button class="btn btn-sm btn-outline-danger mt-2" onclick="renderClusteringByCategoryVisualization()">Try Again</button>
            </div>`;
            console.error('Error in renderClusteringByCategoryVisualization:', error);
        }
    }, 300);
}

// Implementation of distribution visualization with actual data
function renderDistributionVisualization() {
    const vizContainer = document.getElementById('distributionViz');
    if (!vizContainer) return;
    
    if (!window.restaurantData.loaded) {
        vizContainer.innerHTML = '<div class="alert alert-info">No restaurant data loaded. Please upload restaurant data files first.</div>';
        return;
    }
    
    // Show loading indicator
    vizContainer.innerHTML = '<div class="d-flex justify-content-center align-items-center h-100"><div class="spinner-border text-primary" role="status"></div><span class="ms-2">Loading distribution analysis...</span></div>';
    
    // Check for Plotly availability before proceeding
    if (typeof Plotly === 'undefined') {
        vizContainer.innerHTML = '<div class="alert alert-warning">Plotly.js is required for visualizations. Please check your internet connection and reload the page.</div>';
        return;
    }
    
    setTimeout(() => {
        try {
            // Extract category distribution data
            const categories = window.restaurantData.categories;
            if (!categories || Object.keys(categories).length === 0) {
                vizContainer.innerHTML = '<div class="alert alert-warning">No category data available. The uploaded files may not contain properly formatted category information.</div>';
                return;
            }
            
            // Prepare data for visualization
            const categoryNames = Object.keys(categories);
            const conceptCounts = categoryNames.map(cat => 
                Array.isArray(categories[cat]) ? categories[cat].length : 0);
            
            // Sort categories by concept count (descending)
            const sortedIndices = conceptCounts
                .map((count, idx) => ({ count, idx }))
                .sort((a, b) => b.count - a.count)
                .map(item => item.idx);
            
            const sortedCategories = sortedIndices.map(idx => categoryNames[idx]);
            const sortedCounts = sortedIndices.map(idx => conceptCounts[idx]);
            
            // Calculate percentages for the pie chart
            const total = sortedCounts.reduce((sum, count) => sum + count, 0);
            const percentages = sortedCounts.map(count => (count / total * 100).toFixed(1) + '%');
            
            // Create bar chart trace
            const barTrace = {
                type: 'bar',
                x: sortedCategories,
                y: sortedCounts,
                marker: {
                    color: getColorScheme('category10', sortedCategories.length),
                    line: {
                        color: '#fff',
                        width: 1
                    }
                },
                hovertemplate: '<b>%{x}</b><br>Concepts: %{y}<br>Percentage: %{text}<extra></extra>',
                text: percentages
            };
            
            // Create pie chart trace
            const pieTrace = {
                type: 'pie',
                labels: sortedCategories,
                values: sortedCounts,
                textinfo: 'percent',
                hovertemplate: '<b>%{label}</b><br>Concepts: %{value}<br>Percentage: %{percent}<extra></extra>',
                marker: {
                    colors: getColorScheme('category10', sortedCategories.length),
                    line: {
                        color: '#fff',
                        width: 1
                    }
                },
                hole: 0.4,
                pull: sortedIndices.map((_, idx) => idx === 0 ? 0.1 : 0) // Pull out the largest segment slightly
            };
            
            // Create a 2x1 subplot layout
            const layout = {
                grid: {
                    rows: 2,
                    columns: 1,
                    pattern: 'independent',
                    roworder: 'top to bottom'
                },
                margin: {
                    l: 50,
                    r: 50,
                    t: 50,
                    b: 50
                },
                height: 500,
                title: {
                    text: 'Category Distribution Analysis',
                    font: {
                        size: 16
                    }
                },
                annotations: [
                    {
                        text: 'Bar Chart: Category Concept Counts',
                        showarrow: false,
                        x: 0.5,
                        y: 1.0,
                        xref: 'paper',
                        yref: 'paper',
                        xanchor: 'center',
                        yanchor: 'bottom'
                    },
                    {
                        text: 'Pie Chart: Category Proportions',
                        showarrow: false,
                        x: 0.5,
                        y: 0.45,
                        xref: 'paper',
                        yref: 'paper',
                        xanchor: 'center',
                        yanchor: 'bottom'
                    }
                ],
                xaxis: {
                    title: 'Categories',
                    tickangle: -45,
                },
                yaxis: {
                    title: 'Number of Concepts'
                },
                font: {
                    family: "'Inter', -apple-system, sans-serif",
                    size: 12
                },
                showlegend: false
            };
            
            const config = {
                responsive: true,
                displayModeBar: true,
                modeBarButtonsToRemove: ['lasso2d', 'select2d'],
                toImageButtonOptions: {
                    format: 'png',
                    filename: 'restaurant-categories-distribution',
                    height: 800,
                    width: 800,
                    scale: 2
                }
            };
            
            // Plot the bar chart in the top half
            Plotly.newPlot(vizContainer, [barTrace], layout, config);
            
            // Add the pie chart to the bottom half of the subplot
            Plotly.addTraces(vizContainer, pieTrace);
            Plotly.update(vizContainer, {}, {
                // Update layout to specify which subplot the pie chart should use
                domain: {
                    row: 1,
                    column: 0
                }
            });
            
            // Add export button
            addExportButton(vizContainer, 'distribution-export-btn', 'Restaurant Categories Distribution');
            
            // Store the visualization type
            window.restaurantData.currentVisualization = 'distribution';
            
        } catch (error) {
            vizContainer.innerHTML = `<div class="alert alert-danger">
                <h6><i class="bi bi-exclamation-triangle me-2"></i>Error rendering distribution visualization</h6>
                <p class="mb-0">${error.message}</p>
                <button class="btn btn-sm btn-outline-danger mt-2" onclick="renderDistributionVisualization()">Try Again</button>
            </div>`;
            console.error('Error in renderDistributionVisualization:', error);
        }
    }, 300);
}
