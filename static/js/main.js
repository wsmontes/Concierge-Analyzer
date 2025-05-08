/**
 * Main JavaScript functionality for Concierge Chat Analyzer
 * Handles core application logic, data loading, and UI initialization
 * Dependencies: CONFIG, window.ChartsModule, window.ConversationModule, window.DebugInsightsModule
 */

document.addEventListener('DOMContentLoaded', function() {
    // Core application elements
    const uploadForm = document.getElementById('upload-form');
    const loadingIndicator = document.getElementById('loading');
    const resultsContainer = document.getElementById('results-container');
    const exportPdfBtn = document.getElementById('export-pdf');
    const exportPdfSidebarBtn = document.getElementById('export-pdf-sidebar');
    const exportPdfMobileBtn = document.getElementById('export-pdf-mobile');
    const refreshDataBtn = document.getElementById('refresh-data');
    
    // Global data store for the application
    window.appData = {
        lastUploadedData: null,
        currentConversation: null,
        charts: {}
    };
    
    // Server status tracking
    let serverAvailable = null; // null = unknown, true = available, false = unavailable
    
    // Initialize event listeners
    function initEventListeners() {
        // Form submission handler
        if (uploadForm) {
            uploadForm.addEventListener('submit', handleFormSubmit);
        }
        
        // PDF Export functionality
        if (window.PdfExportModule) {
            if (exportPdfBtn) {
                exportPdfBtn.addEventListener('click', window.PdfExportModule.exportPDF);
            }
            
            // Removed event listener for sidebar export button
            
            if (exportPdfMobileBtn) {
                exportPdfMobileBtn.addEventListener('click', window.PdfExportModule.exportPDF);
            }
        }
        
        // Refresh data button
        if (refreshDataBtn) {
            refreshDataBtn.addEventListener('click', function() {
                if (window.appData.lastUploadedData) {
                    processData(window.appData.lastUploadedData);
                    
                    // Show toast notification
                    showNotification('Data refreshed successfully', 'success');
                }
            });
        }
        
        // Initialize tab functionality
        document.querySelectorAll('#analysisTab .nav-link').forEach(tabLink => {
            tabLink.addEventListener('click', function() {
                // Update active tab in URL hash for bookmarkability
                window.location.hash = this.id;
            });
        });

        // Check server connectivity on page load
        checkServerConnectivity();
        
        // Add server status indicator to navbar if it doesn't exist
        createServerStatusIndicator();
    }
    
    // Form submission handler
    function handleFormSubmit(event) {
        event.preventDefault();
        
        const fileInput = document.getElementById('chat-file');
        
        // Validate that a file is selected
        if (!fileInput.files || fileInput.files.length === 0) {
            showNotification('Please select a file to upload', 'error');
            return;
        }
        
        const chatFile = fileInput.files[0];
        
        // Additional file validation
        if (chatFile.type !== 'text/plain' && !chatFile.name.endsWith('.txt')) {
            showNotification('Please select a valid text file (.txt)', 'error');
            return;
        }
        
        // Check file size (10MB limit)
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
        if (chatFile.size > MAX_FILE_SIZE) {
            showNotification('File size exceeds the 10MB limit', 'error');
            return;
        }
        
        console.log(`Uploading file: ${chatFile.name}, size: ${chatFile.size} bytes`);
        
        // Check server connectivity before attempting upload
        checkServerConnectivity().then(available => {
            if (!available) {
                showNotification('Server is not available. Please check if the application backend is running.', 'error');
                updateServerStatusIndicator(false);
                return;
            }
            
            // Create FormData object and explicitly append the file
            const formData = new FormData();
            formData.append('file', chatFile);
            
            // Show loading indicator
            loadingIndicator.classList.remove('d-none');
            resultsContainer.classList.add('d-none');
            
            // Upload file with improved error handling
            fetch(`${CONFIG.API_URL}/upload`, {
                method: 'POST',
                body: formData,
                // Don't set Content-Type header manually, let browser set it with boundary
            })
            .then(response => {
                console.log('Response status:', response.status);
                
                if (!response.ok) {
                    return response.json().then(errorData => {
                        throw new Error(`Server error: ${errorData.error || response.statusText}`);
                    }).catch(err => {
                        // If JSON parsing fails, throw generic error with status
                        if (err.name === 'SyntaxError') {
                            throw new Error(`Server error (${response.status}): ${response.statusText}`);
                        }
                        throw err;
                    });
                }
                return response.json();
            })
            .then(data => {
                console.log('Upload response:', data);
                
                // Store the data globally for later use
                window.appData.lastUploadedData = data;
                
                // Check if we have valid conversation data
                if (!data.metrics || !Array.isArray(data.metrics) || data.metrics.length === 0) {
                    throw new Error('No conversation data found in the response');
                }
                
                console.log(`Received ${data.metrics.length} conversations and ${data.recommendations ? data.recommendations.length : 0} recommendations`);
                
                // Process and display the data
                processData(data);
                
                // Show export PDF button
                exportPdfBtn.classList.remove('d-none');
                
                // Show success notification
                showNotification('Data loaded successfully!', 'success');
                
                // Update server status indicator
                updateServerStatusIndicator(true);
            })
            .catch(error => {
                console.error('Error uploading file:', error);
                
                // Handle connection errors specifically
                if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                    showNotification('Unable to connect to the server. Please check if the application backend is running at ' + 
                        CONFIG.API_URL + ' and try again.', 'error');
                    updateServerStatusIndicator(false);
                    
                    // Show server connection troubleshooting guide
                    showServerTroubleshootingGuide();
                } else {
                    showNotification(`Error uploading file: ${error.message}`, 'error');
                }
            })
            .finally(() => {
                loadingIndicator.classList.add('d-none');
            });
        });
    }
    
    // Process the data and display results
    function processData(data) {
        // Hide no-data background
        const noDataBackground = document.getElementById('no-data-background');
        if (noDataBackground) {
            noDataBackground.style.display = 'none';
        }
        
        // Show results container
        resultsContainer.classList.remove('d-none');
        
        // Update summary stats
        updateSummaryStats(data);
        
        // Display charts and visualizations
        if (window.ChartsModule) {
            console.log("Displaying charts...");
            window.ChartsModule.displayCharts(data);
            
            // Update recommendation analysis if data is available
            if (data.persona_summary) {
                window.ChartsModule.updateRecommendationAnalysis(data);
            }
            
            // Update recommendations table
            if (data.recommendations) {
                console.log(`Updating recommendations table with ${data.recommendations.length} items`);
                window.ChartsModule.updateRecommendationsTable(data.recommendations);
            } else {
                console.warn("No recommendations data available");
            }
        } else {
            console.error("ChartsModule not found");
        }
        
        // Initialize conversation list
        if (window.ConversationModule) {
            console.log("Initializing conversation list...");
            window.ConversationModule.initializeConversationsList(data.metrics, data.recommendations || []);
        } else {
            console.error("ConversationModule not found");
        }
        
        // Initialize debug insights
        if (window.DebugInsightsModule) {
            console.log("Initializing debug insights...");
            window.DebugInsightsModule.initializeDebugInsights(data);
        } else {
            console.error("DebugInsightsModule not found");
        }
        
        // Show Dashboard tab by default (since Persona tab is removed)
        const firstTabButton = document.querySelector('.menu-item[data-target="dashboard-section"]');
        if (firstTabButton) {
            firstTabButton.click();
        }
        
        // Show PDF export button
        exportPdfBtn.classList.remove('d-none');
        if (exportPdfSidebarBtn) exportPdfSidebarBtn.classList.remove('d-none');
        if (exportPdfMobileBtn) exportPdfMobileBtn.classList.remove('d-none');
        
        // If we have embeddings data loaded, integrate it with the conversation data
        if (window.embeddingsData && window.embeddingsData.loaded) {
            console.log('Integrating embeddings data with conversation analysis');
            
            // Integrate the embeddings data with conversations
            integrateDataSources(data);
            
            // Update embeddings visualizations if the module is available
            if (window.EmbeddingsVisualizationModule) {
                window.EmbeddingsVisualizationModule.updateCategoryHierarchyCard();
            }
        }
        
        // Check if we have restaurant data available
        if (window.restaurantData && window.restaurantData.loaded) {
            console.log('Restaurant data available, integrating with analysis');
            integrateDataSources(data);
        }
    }
    
    /**
     * Integrates multiple data sources: conversation data, embeddings, and restaurant data
     * Creates cross-references and associations between these sources
     * @param {Object} conversationData - The conversation analysis data
     */
    function integrateDataSources(conversationData) {
        console.log('Starting data sources integration...');
        
        // Track what data sources we have available
        const hasEmbeddings = window.embeddingsData && window.embeddingsData.loaded;
        const hasRestaurants = window.restaurantData && window.restaurantData.loaded;
        const hasConversations = conversationData && conversationData.metrics && conversationData.metrics.length > 0;
        
        if (!hasConversations) {
            console.warn('No conversation data available for integration');
            return;
        }

        // Create integrated data structure
        if (!window.integratedData) {
            window.integratedData = {
                concepts: {},
                restaurants: {},
                conversations: {},
                relationships: [],
                categoryCounts: {}
            };
        }
        
        // Step 1: Process conversation data
        conversationData.metrics.forEach(conversation => {
            window.integratedData.conversations[conversation.id] = conversation;
        });
        
        // Step 2: Process embeddings data if available
        if (hasEmbeddings) {
            console.log('Processing embeddings for integration...');
            
            // Process categories and concepts from embeddings
            if (window.embeddingsData.categories) {
                Object.keys(window.embeddingsData.categories).forEach(category => {
                    if (!window.integratedData.categoryCounts[category]) {
                        window.integratedData.categoryCounts[category] = 0;
                    }
                    
                    window.embeddingsData.categories[category].forEach(concept => {
                        const conceptKey = `${category} -> ${concept}`;
                        window.integratedData.concepts[conceptKey] = {
                            category: category,
                            concept: concept,
                            fullLabel: conceptKey,
                            mentionCount: 0,
                            restaurants: []
                        };
                    });
                });
            }
            
            // Process mentions in conversations
            conversationData.metrics.forEach(conversation => {
                // Check if conversation has concept mentions
                if (conversation.concepts_mentioned && conversation.concepts_mentioned.length > 0) {
                    conversation.concepts_mentioned.forEach(mention => {
                        if (window.integratedData.concepts[mention]) {
                            window.integratedData.concepts[mention].mentionCount++;
                            window.integratedData.categoryCounts[window.integratedData.concepts[mention].category]++;
                        }
                    });
                }
            });
            
            console.log(`Integrated ${Object.keys(window.integratedData.concepts).length} concepts from embeddings data`);
        }
        
        // Step 3: Process restaurant data if available
        if (hasRestaurants) {
            console.log('Processing restaurant data for integration...');
            
            // Map restaurants to concepts
            if (window.restaurantData.restaurants) {
                Object.keys(window.restaurantData.restaurants).forEach(restaurantName => {
                    const restaurant = window.restaurantData.restaurants[restaurantName];
                    window.integratedData.restaurants[restaurantName] = restaurant;
                    
                    // Link restaurant to concepts
                    if (restaurant.concepts) {
                        restaurant.concepts.forEach(conceptKey => {
                            if (window.integratedData.concepts[conceptKey]) {
                                window.integratedData.concepts[conceptKey].restaurants.push(restaurantName);
                            }
                        });
                    }
                });
            }
            
            console.log(`Integrated ${Object.keys(window.integratedData.restaurants).length} restaurants with concept data`);
        }
        
        // Step 4: Build relationships between conversations, concepts, and restaurants
        console.log('Building cross-reference relationships...');
        window.integratedData.relationships = [];
        
        Object.values(window.integratedData.conversations).forEach(conversation => {
            if (conversation.concepts_mentioned && conversation.concepts_mentioned.length > 0) {
                conversation.concepts_mentioned.forEach(concept => {
                    if (window.integratedData.concepts[concept]) {
                        // For each restaurant that matches this concept
                        window.integratedData.concepts[concept].restaurants.forEach(restaurant => {
                            window.integratedData.relationships.push({
                                conversationId: conversation.id,
                                concept: concept,
                                restaurant: restaurant
                            });
                        });
                    }
                });
            }
        });
        
        // Notify modules that integrated data is available
        console.log(`Integration complete: ${window.integratedData.relationships.length} relationships established`);
        document.dispatchEvent(new CustomEvent('integratedDataReady', {
            detail: window.integratedData
        }));
        
        // Update Debug Insights with integrated data if module is available
        if (window.DebugInsightsModule && typeof window.DebugInsightsModule.updateWithIntegratedData === 'function') {
            window.DebugInsightsModule.updateWithIntegratedData(window.integratedData);
        }
    }
    
    // Update summary statistics
    function updateSummaryStats(data) {
        document.getElementById('conversation-count').textContent = data.conversation_count;
        
        // Calculate average time metrics
        let avgRecommendationTime = 0;
        let recommendationTimeCount = 0;
        let avgFirstResponseTime = 0;
        let firstResponseTimeCount = 0;
        
        // Track min/max values
        let minFirstResponse = Infinity;
        let maxFirstResponse = 0;
        let minRecommendationTime = Infinity;
        let maxRecommendationTime = 0;
        
        // Define reasonable maximum time limit from config
        const MAX_REASONABLE_TIME = CONFIG.MAX_REASONABLE_TIME;
        
        // Process response time metrics
        data.metrics.forEach(metric => {
            if (metric.time_to_recommendation) {
                // Only include reasonable values in averages
                if (metric.time_to_recommendation <= MAX_REASONABLE_TIME) {
                    avgRecommendationTime += metric.time_to_recommendation;
                    recommendationTimeCount++;
                    
                    minRecommendationTime = Math.min(minRecommendationTime, metric.time_to_recommendation);
                    maxRecommendationTime = Math.max(maxRecommendationTime, metric.time_to_recommendation);
                }
            }
            
            if (metric.time_to_first_response) {
                // Only include reasonable values in averages
                if (metric.time_to_first_response <= MAX_REASONABLE_TIME) {
                    avgFirstResponseTime += metric.time_to_first_response;
                    firstResponseTimeCount++;
                    
                    minFirstResponse = Math.min(minFirstResponse, metric.time_to_first_response);
                    maxFirstResponse = Math.max(maxFirstResponse, metric.time_to_first_response);
                }
            }
        });
        
        // Calculate and display averages
        if (recommendationTimeCount > 0) {
            avgRecommendationTime = avgRecommendationTime / recommendationTimeCount;
            document.getElementById('avg-recommendation-time').textContent = avgRecommendationTime.toFixed(1) + 's';
        }
        
        if (firstResponseTimeCount > 0) {
            avgFirstResponseTime = avgFirstResponseTime / firstResponseTimeCount;
            document.getElementById('avg-first-response').textContent = avgFirstResponseTime.toFixed(1) + 's';
        }
        
        // Display min/max values
        if (minFirstResponse !== Infinity) {
            document.getElementById('min-first-response').textContent = `Min: ${minFirstResponse.toFixed(1)}s`;
            document.getElementById('max-first-response').textContent = `Max: ${maxFirstResponse.toFixed(1)}s`;
        }
        
        if (minRecommendationTime !== Infinity) {
            document.getElementById('min-recommendation-time').textContent = `Min: ${minRecommendationTime.toFixed(1)}s`;
            document.getElementById('max-recommendation-time').textContent = `Max: ${maxRecommendationTime.toFixed(1)}s`;
        }
        
        // Update persona stats
        if (data.persona_summary) {
            document.getElementById('matched-personas').textContent = 
                `${data.persona_summary.matched_conversations}/${data.conversation_count}`;
        }
    }
    
    // Show notification toast
    function showNotification(message, type = 'info') {
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
        
        // Initialize and show toast
        const toast = new bootstrap.Toast(toastEl, {
            delay: 3000
        });
        toast.show();
        
        // Remove toast from DOM after it's hidden
        toastEl.addEventListener('hidden.bs.toast', function() {
            toastEl.remove();
        });
    }

    // Expose the notification function to the global scope
    window.showNotification = showNotification;
    
    // Initialize the application
    initEventListeners();
    
    // Check URL hash for direct tab access
    if (window.location.hash) {
        const tabId = window.location.hash.substring(1);
        const tab = document.getElementById(tabId);
        if (tab) {
            tab.click();
        }
    }
    
    // Initialize embeddings upload if present
    if (document.getElementById('embeddings-upload-area')) {
        console.log('Initializing embeddings upload functionality');
        if (typeof initEmbeddingsUpload === 'function') {
            initEmbeddingsUpload();
        } else {
            console.warn('embeddings-parser.js script not loaded');
        }
    }
    
    /**
     * Check if the server is available
     * @returns {Promise<boolean>} Promise that resolves to true if server is available, false otherwise
     */
    function checkServerConnectivity() {
        return fetch(`${CONFIG.API_URL}/status`, { 
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            mode: 'cors',
            // Request times out after 3 seconds
            signal: AbortSignal.timeout(3000)
        })
        .then(response => {
            serverAvailable = response.ok;
            updateServerStatusIndicator(serverAvailable);
            return serverAvailable;
        })
        .catch(error => {
            console.warn('Server connectivity check failed:', error);
            serverAvailable = false;
            updateServerStatusIndicator(false);
            return false;
        });
    }
    
    /**
     * Create server status indicator in the navbar
     */
    function createServerStatusIndicator() {
        // Check if it already exists
        if (document.getElementById('server-status-indicator')) return;
        
        const navbarActions = document.querySelector('.top-navbar-actions');
        if (!navbarActions) return;
        
        const indicator = document.createElement('div');
        indicator.id = 'server-status-indicator';
        indicator.className = 'server-status unknown';
        indicator.title = 'Server status: Checking...';
        indicator.innerHTML = '<i class="bi bi-question-circle"></i>';
        
        // Add tooltip functionality if bootstrap is available
        if (typeof bootstrap !== 'undefined') {
            new bootstrap.Tooltip(indicator);
        }
        
        // Add click handler to manually check connectivity
        indicator.addEventListener('click', function() {
            checkServerConnectivity().then(available => {
                if (available) {
                    showNotification('Server is running properly', 'success');
                } else {
                    showNotification('Server is not responding. Please check if the backend is running.', 'error');
                    showServerTroubleshootingGuide();
                }
            });
        });
        
        // Insert at the beginning of the navbar actions
        navbarActions.insertBefore(indicator, navbarActions.firstChild);
        
        // Add styles if they don't exist
        if (!document.getElementById('server-status-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'server-status-styles';
            styleEl.textContent = `
                .server-status {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    margin-right: 8px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                .server-status.unknown { background-color: #6c757d; color: white; }
                .server-status.available { background-color: #198754; color: white; }
                .server-status.unavailable { background-color: #dc3545; color: white; }
                .server-status i { font-size: 14px; }
                
                .troubleshooting-guide {
                    max-width: 600px;
                    margin: 20px auto;
                    padding: 20px;
                    border-radius: 8px;
                    background-color: #f8f9fa;
                    border: 1px solid #dee2e6;
                }
                .troubleshooting-guide h4 {
                    margin-top: 0;
                    color: #dc3545;
                }
                .troubleshooting-guide ol {
                    padding-left: 20px;
                }
                .troubleshooting-guide code {
                    background-color: #e9ecef;
                    padding: 2px 4px;
                    border-radius: 4px;
                }
            `;
            document.head.appendChild(styleEl);
        }
    }
    
    /**
     * Update the server status indicator
     * @param {boolean} available - Whether the server is available
     */
    function updateServerStatusIndicator(available) {
        const indicator = document.getElementById('server-status-indicator');
        if (!indicator) return;
        
        // Remove all status classes
        indicator.classList.remove('unknown', 'available', 'unavailable');
        
        if (available === null) {
            indicator.classList.add('unknown');
            indicator.title = 'Server status: Unknown';
            indicator.innerHTML = '<i class="bi bi-question-circle"></i>';
        } else if (available) {
            indicator.classList.add('available');
            indicator.title = 'Server status: Running';
            indicator.innerHTML = '<i class="bi bi-check-circle"></i>';
        } else {
            indicator.classList.add('unavailable');
            indicator.title = 'Server status: Not responding';
            indicator.innerHTML = '<i class="bi bi-exclamation-circle"></i>';
        }
        
        // Update tooltip if bootstrap is available
        if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
            const tooltip = bootstrap.Tooltip.getInstance(indicator);
            if (tooltip) {
                tooltip.dispose();
            }
            new bootstrap.Tooltip(indicator);
        }
    }
    
    /**
     * Show a troubleshooting guide for server connection issues
     */
    function showServerTroubleshootingGuide() {
        // Check if the guide already exists
        if (document.getElementById('server-troubleshooting-guide')) return;
        
        const resultsContainer = document.getElementById('results-container');
        if (!resultsContainer) return;
        
        const guide = document.createElement('div');
        guide.id = 'server-troubleshooting-guide';
        guide.className = 'troubleshooting-guide';
        guide.innerHTML = `
            <h4><i class="bi bi-exclamation-triangle-fill me-2"></i>Server Connection Issue</h4>
            <p>The application cannot connect to the backend server. Here are some troubleshooting steps:</p>
            <ol>
                <li>Check if the server is running on <code>${CONFIG.API_URL}</code></li>
                <li>Make sure you've started the Python backend with <code>python app.py</code> or <code>flask run</code></li>
                <li>Verify that your firewall isn't blocking the connection</li>
                <li>Check the server console for any error messages</li>
                <li>Try restarting the server application</li>
            </ol>
            <p>After fixing the issue, click the server status indicator in the navbar to check connectivity.</p>
            <button id="dismiss-guide" class="btn btn-sm btn-outline-secondary mt-2">Dismiss</button>
        `;
        
        // Insert before content sections
        const firstSection = resultsContainer.querySelector('.content-section');
        if (firstSection) {
            resultsContainer.insertBefore(guide, firstSection);
        } else {
            resultsContainer.appendChild(guide);
        }
        
        // Show the results container if hidden
        resultsContainer.classList.remove('d-none');
        
        // Add dismiss button functionality
        document.getElementById('dismiss-guide').addEventListener('click', function() {
            guide.remove();
        });
    }
});

/**
 * Main application utilities for Concierge Analyzer
 * Provides global initialization, DOM helpers, and utility functions
 */

// Namespace for global utilities
window.ConciergeUtils = {
    // Check if an element exists in the DOM
    elementExists: function(selector) {
        return document.querySelector(selector) !== null;
    },
    
    // Safe querySelector that checks existence
    getSafeElement: function(selector) {
        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`Element not found: ${selector}`);
        }
        return element;
    },
    
    // Wait for an element to appear in the DOM
    // Returns a promise that resolves with the element
    waitForElement: function(selector, timeout = 2000) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }
            
            const observer = new MutationObserver((mutations) => {
                if (document.querySelector(selector)) {
                    resolve(document.querySelector(selector));
                    observer.disconnect();
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            // Set timeout
            setTimeout(() => {
                observer.disconnect();
                reject(`Timeout waiting for ${selector}`);
            }, timeout);
        });
    },
    
    // Create an error message element
    createErrorMessage: function(message, type = 'warning') {
        const div = document.createElement('div');
        div.className = `alert alert-${type} mt-2`;
        div.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i>${message}`;
        return div;
    },
    
    // Safely initialize a Chart.js chart with error handling
    initializeChart: function(canvasId, chartConfig) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.warn(`Canvas element '${canvasId}' not found`);
            return null;
        }
        
        try {
            // Destroy existing chart if present
            const existingChart = Chart.getChart(canvas);
            if (existingChart) {
                existingChart.destroy();
            }
            
            // Create and return new chart
            return new Chart(canvas, chartConfig);
        } catch (error) {
            console.error(`Error creating chart on '${canvasId}':`, error);
            
            // Try to display error in canvas parent
            const parent = canvas.parentElement;
            if (parent) {
                canvas.style.display = 'none'; // Hide the canvas
                parent.appendChild(this.createErrorMessage(`Error creating chart: ${error.message}`, 'danger'));
            }
            return null;
        }
    },
    
    // Initialize library dependencies and check availability
    checkDependencies: function() {
        const dependencies = {
            'Chart.js': typeof Chart !== 'undefined',
            'Plotly.js': typeof Plotly !== 'undefined',
            'Bootstrap': typeof bootstrap !== 'undefined'
        };
        
        console.log('Dependency check:', dependencies);
        
        // Return missing dependencies
        return Object.entries(dependencies)
            .filter(([, available]) => !available)
            .map(([name]) => name);
    }
};

// Initialize after the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Main application initializing');
    
    // Check dependencies
    const missingDeps = ConciergeUtils.checkDependencies();
    if (missingDeps.length > 0) {
        console.warn('Missing dependencies:', missingDeps.join(', '));
    }
    
    // Add global error handler for charts
    if (typeof Chart !== 'undefined') {
        Chart.defaults.plugins.title.font.size = 14;
        Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    }
});

/**
 * Process the upload response data and trigger any necessary events
 * @param {Object} data - The response data from the server
 */
function processUploadResponse(data) {
    // ...existing code...

    // Check if an Excel file was processed and sheet restaurant data was extracted
    if (data.excel_file_processed) {
        console.log('Excel file was processed, triggering excelFileProcessed event');
        
        // Dispatch the excelFileProcessed event to notify components like restaurant-visualizer
        window.dispatchEvent(new CustomEvent('excelFileProcessed', { 
            detail: { 
                sheetRestaurants: data.sheet_restaurants || []
            } 
        }));
    }

    // ...existing code...
    return data;
}

/**
 * Upload a file to the server
 * @param {File} file - The file to upload
 * @returns {Promise} - A promise that resolves with the server response
 */
function uploadFile(file) {
    // ...existing code...
    
    return fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log('Upload response:', data);
        
        // Process the response using our new function
        return processUploadResponse(data);
    })
    .catch(error => {
        // ...existing error handling code...
    });
}

// ...existing code...
