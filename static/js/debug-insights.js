/**
 * Debug insights functionality for Concierge Chat Analyzer
 * Provides visualization and analysis of debug data
 * Dependencies: Chart.js, CONFIG
 */

// Script loading protection - prevent duplicate module initialization
if (typeof window.DebugInsightsModule === 'undefined') {
    // Store insights data globally within this module for deferred rendering
    let globalInsightsData = null;
    let crossConversationData = null;

    // Track chart instances so we can destroy them before recreating
    let chartInstances = {
        categoryDistribution: null,
        conceptDistribution: null,
        restaurantDistribution: null
    };

    // Add a flag to track if rendering is in progress to prevent simultaneous renders
    let isDebugInsightsRendering = false;

    // Create a namespace to expose functions to other modules
    window.DebugInsightsModule = {
        initializeDebugInsights: initializeDebugInsights,
        isInitialized: true
    };

    // Initialize debug insights module
    function initializeDebugInsights(data) {
        console.log("Initializing debug insights with data:", data ? "Data available" : "No data");
        
        // Fetch debug analysis data
        fetch(`${CONFIG.API_URL}/debug_analysis`)
            .then(response => {
                if (!response.ok) throw new Error('Failed to load debug analysis');
                return response.json();
            })
            .then(debugData => {
                console.log("Debug analysis data received:", debugData ? "Data available" : "No data");
                
                // Store data for deferred rendering
                globalInsightsData = debugData.global_insights || [];
                crossConversationData = debugData.cross_conversation_insights || {};
                
                // Log the structure of the insights data
                console.log("Global insights data structure:", 
                            globalInsightsData.length > 0 ? 
                            "Array with " + globalInsightsData.length + " items" : 
                            "Empty or invalid array");
                
                // Update stats immediately (these don't need canvas elements)
                updateDebugStats(globalInsightsData);
                
                // Setup conversation list for debug analysis
                setupDebugConversationList(data);
                
                // Set up section visibility listener
                initSectionVisibilityObserver();
            })
            .catch(error => {
                console.error('Error loading debug analysis:', error);
                showDebugLoadError(error);
            });
    }

    // First create a helper function to safely destroy all charts
    function safelyDestroyAllCharts() {
        console.log("Safely destroying all charts before recreation");
        
        // Clean up each chart instance properly
        Object.keys(chartInstances).forEach(chartKey => {
            if (chartInstances[chartKey]) {
                try {
                    // Check if the instance has a destroy method
                    if (typeof chartInstances[chartKey].destroy === 'function') {
                        chartInstances[chartKey].destroy();
                        console.log(`Successfully destroyed ${chartKey} chart`);
                    }
                } catch (error) {
                    console.warn(`Error destroying ${chartKey} chart:`, error);
                }
                // Always set to null after destruction attempt
                chartInstances[chartKey] = null;
            }
        });
    }

    // Initialize section visibility observer for deferred chart rendering
    function initSectionVisibilityObserver() {
        // Get the debug insights section
        const debugInsightsSection = document.getElementById('debug-insights-section');
        if (!debugInsightsSection) {
            console.warn("Debug insights section element not found - trying alternative selector");
            // Try other possible IDs or selectors
            const alternativeSection = document.querySelector('[data-target="debug-insights-section"]');
            if (!alternativeSection) {
                console.error("Could not find the debug insights section with any selector");
                return;
            }
        }
        
        console.log("Debug insights section found, setting up observer");
        
        // Create a MutationObserver to watch for changes to the section's classList
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    // Check if the section is active (visible)
                    if (debugInsightsSection.classList.contains('active')) {
                        console.log("Debug insights section is now visible, rendering charts...");
                        
                        // Reset chart instances and ensure any existing charts are properly destroyed
                        safelyDestroyAllCharts();
                        
                        // Use debouncing to prevent multiple renders in quick succession
                        // Wait for the DOM to be fully ready
                        setTimeout(() => {
                            renderDebugInsights();
                        }, 300);
                    }
                }
            });
        });
        
        // Start observing changes to the section's classList
        observer.observe(debugInsightsSection, { attributes: true });
        
        // Also check if the section is already active when this runs
        if (debugInsightsSection.classList.contains('active')) {
            console.log("Debug insights section is already active, rendering charts...");
            
            // Ensure all charts are destroyed before attempting to render
            safelyDestroyAllCharts();
            
            // Wait for the DOM to be fully ready
            setTimeout(() => {
                renderDebugInsights();
            }, 300);
        }
        
        // Also add listener for sidebar menu item clicks with proper debouncing
        const debugMenuItem = document.querySelector('.menu-item[data-target="debug-insights-section"]');
        if (debugMenuItem) {
            debugMenuItem.addEventListener('click', function() {
                console.log("Debug insights menu item clicked");
                
                // No need to handle chart creation here as the section:activated event
                // will trigger the MutationObserver above
            });
        }
        
        // Add listener for the custom debug insights render event
        document.addEventListener('debugInsights:render', function() {
            console.log("Received debugInsights:render event");
            
            // Only render if section is active
            if (debugInsightsSection.classList.contains('active')) {
                safelyDestroyAllCharts();
                
                // Wait a moment to ensure DOM is ready
                setTimeout(() => {
                    renderDebugInsights();
                }, 300);
            }
        });
        
        // Add listener for cleanup event
        document.addEventListener('section:cleanup', function(event) {
            if (event.detail.sectionId === 'debug-insights-section') {
                console.log("Cleaning up debug insights charts");
                safelyDestroyAllCharts();
            }
        });
    }

    // Consolidate rendering logic into a single function to avoid duplication
    function renderDebugInsights() {
        // Prevent multiple simultaneous render attempts
        if (isDebugInsightsRendering) {
            console.log("Debug insights already rendering, skipping");
            return;
        }
        
        isDebugInsightsRendering = true;
        
        try {
            if (globalInsightsData && globalInsightsData.length > 0) {
                displayGlobalDebugInsights(globalInsightsData);
            } else {
                console.warn("No global insights data available for rendering charts");
                showNoDataMessage("debug-insights-section", "No debug insights data available");
            }
            
            if (crossConversationData) {
                displayCrossConversationInsights(crossConversationData);
            } else {
                console.warn("No cross conversation data available");
            }
        } catch (error) {
            console.error("Error rendering debug insights:", error);
            
            // Show a visual error on the page
            const debugInsightsContent = document.querySelector('.debug-content-wrapper');
            if (debugInsightsContent) {
                const errorMsg = document.createElement('div');
                errorMsg.className = 'alert alert-danger mt-3';
                errorMsg.innerHTML = `
                    <strong><i class="bi bi-exclamation-triangle me-2"></i>Chart rendering error:</strong> ${error.message}
                `;
                
                // Check if the error already exists to avoid duplicates
                const existingError = debugInsightsContent.querySelector('.alert.alert-danger');
                if (existingError) {
                    existingError.remove();
                }
                
                debugInsightsContent.prepend(errorMsg);
            }
        } finally {
            isDebugInsightsRendering = false;
        }
    }

    // Show message when no data is available
    function showNoDataMessage(containerId, message) {
        const container = document.getElementById(containerId) || document.querySelector('.debug-content-wrapper');
        if (container) {
            const noDataMsg = document.createElement('div');
            noDataMsg.className = 'alert alert-info my-3';
            noDataMsg.textContent = message;
            container.appendChild(noDataMsg);
        }
    }

    // Show error message when debug loading fails
    function showDebugLoadError(error) {
        const debugContent = document.querySelector('.debug-content-wrapper');
        if (debugContent) {
            const errorAlert = document.createElement('div');
            errorAlert.className = 'alert alert-danger my-3';
            errorAlert.innerHTML = `
                <h4 class="alert-heading"><i class="bi bi-exclamation-triangle me-2"></i>Error Loading Debug Data</h4>
                <p>There was a problem loading the debug analysis data: ${error.message}</p>
                <hr>
                <p class="mb-0">Please try refreshing the page or check the server logs for more information.</p>
            `;
            debugContent.prepend(errorAlert);
        }
    }

    // Update debug statistics that don't require canvas elements
    function updateDebugStats(insights) {
        if (!insights || !Array.isArray(insights) || insights.length === 0) {
            console.warn("No insights data available for updating stats");
            return;
        }
        
        // Get basic stats from insights
        const basicStats = insights.find(insight => insight.type === 'basic_stats');
        if (!basicStats || !basicStats.data) {
            console.warn("No basic stats found in insights data");
            return;
        }
        
        console.log("Updating debug stats with:", basicStats.data);
        
        // Update stats summary if elements exist
        updateElementText('debug-category-count', basicStats.data.unique_categories || 0);
        updateElementText('debug-concept-count', basicStats.data.unique_concepts || 0);
        updateElementText('debug-restaurant-count', basicStats.data.unique_restaurants || 0);
        updateElementText('debug-association-count', basicStats.data.association_count || 0);
    }

    // Helper to safely update text content of an element
    function updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        } else {
            console.warn(`Element with ID '${elementId}' not found when updating text`);
        }
    }

    // Display global debug insights with canvas element checks
    function displayGlobalDebugInsights(insights) {
        console.log("Displaying global debug insights...");
        
        if (!insights || !Array.isArray(insights) || insights.length === 0) {
            console.warn("No valid insights data for displaying charts");
            return;
        }
        
        try {
            // Display charts only if the elements exist
            displayCategoryDistributionChart(insights);
            displayConceptDistributionChart(insights);
            displayRestaurantDistributionChart(insights);
        } catch (error) {
            console.error("Error displaying global debug insights:", error);
            throw error; // Let the caller handle this
        }
    }

    // Display category distribution chart with element check
    function displayCategoryDistributionChart(insights) {
        const categoryInsight = insights.find(insight => insight.type === 'category_distribution');
        if (!categoryInsight) {
            console.warn("No category distribution data found in insights");
            return;
        }
        
        // Check if the canvas element exists
        const canvasElement = document.getElementById('category-distribution-chart');
        if (!canvasElement) {
            console.warn("Canvas element 'category-distribution-chart' not found");
            return;
        }
        
        try {
            // Ensure any existing chart on this canvas is destroyed
            const existingChart = Chart.getChart(canvasElement);
            if (existingChart) {
                console.log("Found existing category chart, destroying it");
                existingChart.destroy();
            }
            
            const ctx = canvasElement.getContext('2d');
            if (!ctx) {
                console.warn("Could not get context for 'category-distribution-chart'");
                return;
            }
            
            // Verify that categories data is available and in expected format
            const categories = categoryInsight.data.categories;
            if (!categories || !Array.isArray(categories)) {
                console.warn("Categories data is not an array:", categories);
                return;
            }
            
            console.log("Categories data format:", categories.length > 0 ? 
                      typeof categories[0] === 'object' ? "Object format" : 
                      Array.isArray(categories[0]) ? "Array format" : 
                      "Unknown format" : "Empty array");
            
            // Handle different possible data formats from the server
            let labels = [];
            let values = [];
            
            if (categories.length > 0) {
                // If data comes as array of [key, value] pairs
                if (Array.isArray(categories[0])) {
                    labels = categories.map(item => item[0]);
                    values = categories.map(item => item[1]);
                } 
                // If data comes as array of objects with name and count properties
                else if (typeof categories[0] === 'object') {
                    labels = categories.map(item => item.name || item.category || "Unknown");
                    values = categories.map(item => item.count || item.value || 0);
                }
            }
            
            // Create and store chart reference
            chartInstances.categoryDistribution = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.6)',
                            'rgba(54, 162, 235, 0.6)',
                            'rgba(255, 206, 86, 0.6)',
                            'rgba(75, 192, 192, 0.6)',
                            'rgba(153, 102, 255, 0.6)',
                            'rgba(255, 159, 64, 0.6)',
                            'rgba(199, 199, 199, 0.6)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                boxWidth: 10,
                                font: {
                                    size: 10
                                }
                            }
                        },
                        title: {
                            display: true,
                            text: 'Top Categories'
                        }
                    }
                }
            });
            
            console.log("Category distribution chart created successfully");
        } catch (error) {
            console.error("Error creating category distribution chart:", error);
            throw error;
        }
    }

    // Display concept distribution chart with element check
    function displayConceptDistributionChart(insights) {
        const conceptInsight = insights.find(insight => insight.type === 'concept_distribution');
        if (!conceptInsight) {
            console.warn("No concept distribution data found in insights");
            return;
        }
        
        // Check if the canvas element exists
        const canvasElement = document.getElementById('concept-distribution-chart');
        if (!canvasElement) {
            console.warn("Canvas element 'concept-distribution-chart' not found");
            return;
        }
        
        try {
            // Ensure any existing chart on this canvas is destroyed
            const existingChart = Chart.getChart(canvasElement);
            if (existingChart) {
                console.log("Found existing concept chart, destroying it");
                existingChart.destroy();
            }
            
            const ctx = canvasElement.getContext('2d');
            if (!ctx) {
                console.warn("Could not get context for 'concept-distribution-chart'");
                return;
            }
            
            // Verify that concepts data is available and in expected format
            const concepts = conceptInsight.data.concepts;
            if (!concepts || !Array.isArray(concepts)) {
                console.warn("Concepts data is not an array:", concepts);
                return;
            }
            
            // Handle different possible data formats from the server
            let labels = [];
            let values = [];
            
            if (concepts.length > 0) {
                // If data comes as array of [key, value] pairs
                if (Array.isArray(concepts[0])) {
                    labels = concepts.map(item => item[0]);
                    values = concepts.map(item => item[1]);
                } 
                // If data comes as array of objects with name and count properties
                else if (typeof concepts[0] === 'object') {
                    labels = concepts.map(item => item.name || item.concept || "Unknown");
                    values = concepts.map(item => item.count || item.value || 0);
                }
            }
            
            // Create and store chart reference
            chartInstances.conceptDistribution = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Frequency',
                        data: values,
                        backgroundColor: CONFIG.CHART_COLORS.primary,
                        borderColor: CONFIG.CHART_COLORS.primaryBorder,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Frequency'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Top Concepts'
                        }
                    }
                }
            });
            
            console.log("Concept distribution chart created successfully");
        } catch (error) {
            console.error("Error creating concept distribution chart:", error);
            throw error;
        }
    }

    // Display restaurant distribution chart with element check
    function displayRestaurantDistributionChart(insights) {
        const restaurantInsight = insights.find(insight => insight.type === 'restaurant_distribution');
        if (!restaurantInsight) {
            console.warn("No restaurant distribution data found in insights");
            return;
        }
        
        // Check if the canvas element exists
        const canvasElement = document.getElementById('restaurant-distribution-chart');
        if (!canvasElement) {
            console.warn("Canvas element 'restaurant-distribution-chart' not found");
            return;
        }
        
        try {
            // Ensure any existing chart on this canvas is destroyed
            const existingChart = Chart.getChart(canvasElement);
            if (existingChart) {
                console.log("Found existing restaurant chart, destroying it");
                existingChart.destroy();
            }
            
            const ctx = canvasElement.getContext('2d');
            if (!ctx) {
                console.warn("Could not get context for 'restaurant-distribution-chart'");
                return;
            }
            
            // Inspect the data structure for debugging
            console.log("Restaurant insight data:", restaurantInsight.data);
            
            // Verify that restaurants data is available and in expected format
            const restaurants = restaurantInsight.data.restaurants;
            if (!restaurants || !Array.isArray(restaurants)) {
                console.warn("Restaurants data is not an array:", restaurants);
                return;
            }
            
            // Handle different possible data formats from the server
            let labels = [];
            let values = [];
            
            if (restaurants.length > 0) {
                // Log the structure of the first item to help with debugging
                console.log("First restaurant item structure:", restaurants[0]);
                
                // If data comes as array of [key, value] pairs
                if (Array.isArray(restaurants[0])) {
                    labels = restaurants.map(restaurant => restaurant[0]);
                    values = restaurants.map(restaurant => restaurant[1]);
                } 
                // If data comes as array of objects with name and count properties
                else if (typeof restaurants[0] === 'object') {
                    labels = restaurants.map(restaurant => restaurant.name || "Unknown");
                    values = restaurants.map(restaurant => restaurant.count || 0);
                }
            }
            
            // Create and store chart reference
            chartInstances.restaurantDistribution = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Frequency',
                        data: values,
                        backgroundColor: CONFIG.CHART_COLORS.warning,
                        borderColor: CONFIG.CHART_COLORS.warningBorder,
                        borderWidth: 1
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Frequency'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Top Restaurants'
                        }
                    }
                }
            });
            
            console.log("Restaurant distribution chart created successfully");
        } catch (error) {
            console.error("Error creating restaurant distribution chart:", error);
            throw error;
        }
    }

    // Display cross-conversation insights with element checks
    function displayCrossConversationInsights(crossInsights) {
        try {
            if (!crossInsights) {
                console.warn("No cross-conversation insights data available");
                return;
            }
            
            displayConceptRestaurantAssociations(crossInsights);
            displayCategoryRestaurantAccordion(crossInsights);
        } catch (error) {
            console.error("Error displaying cross-conversation insights:", error);
        }
    }

    // Setup debug conversation list
    function setupDebugConversationList(data) {
        const debugConversationList = document.getElementById('debug-conversation-list');
        if (!debugConversationList) {
            console.warn("Debug conversation list element not found");
            return;
        }
        
        debugConversationList.innerHTML = ''; // Clear existing items
        
        // Check if we have the conversations data
        if (!data) {
            console.warn("No data available for debug analysis");
            debugConversationList.innerHTML = '<div class="list-group-item text-muted">No conversation data available</div>';
            return;
        }
        
        // Use metrics data if available, otherwise use conversations
        const metrics = data.metrics || [];
        const conversations = data.conversations || [];
        
        // Determine which data source to use and how many items we have
        const useMetrics = metrics.length > 0;
        const itemCount = useMetrics ? metrics.length : conversations.length;
        
        if (itemCount === 0) {
            debugConversationList.innerHTML = '<div class="list-group-item text-muted">No conversations with data available</div>';
            return;
        }
        
        console.log(`Setting up debug conversation list with ${itemCount} conversations`);
        
        // Create list items for each conversation
        for (let i = 0; i < itemCount; i++) {
            // Get data based on source
            const sourceData = useMetrics ? metrics[i] : conversations[i];
            
            // Create list item for conversation
            const listItem = document.createElement('a');
            listItem.href = '#';
            listItem.className = 'list-group-item list-group-item-action';
            listItem.dataset.conversationId = i;
            
            // Get the request text from the appropriate source
            let requestText = 'No request';
            
            if (useMetrics) {
                requestText = sourceData.request || 'No request';
            } else {
                // Try to find user request in conversation messages
                const userMsg = sourceData.find(msg => msg.type === 'user_request');
                if (userMsg) {
                    requestText = userMsg.content;
                }
            }
            
            const truncatedRequest = requestText.length > 60 ? requestText.substring(0, 60) + '...' : requestText;
            
            listItem.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">Conversation ${i + 1}</h6>
                    <small class="text-muted">${sourceData.timestamp ? new Date(sourceData.timestamp).toLocaleDateString() : ''}</small>
                </div>
                <p class="mb-1 text-truncate">${truncatedRequest}</p>
            `;
            
            listItem.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Show loading message in debug panel
                loadDebugConversationAnalysis(i);
                
                // Set active state
                document.querySelectorAll('#debug-conversation-list a').forEach(item => {
                    item.classList.remove('active');
                });
                this.classList.add('active');
            });
            
            debugConversationList.appendChild(listItem);
        }
        
        // Auto-select first conversation if available
        if (itemCount > 0 && debugConversationList.firstElementChild) {
            debugConversationList.firstElementChild.click();
        }
    }

    // Load debug analysis for a specific conversation
    function loadDebugConversationAnalysis(conversationId) {
        // Show loading indicator
        const detailsPanel = document.getElementById('debug-conversation-details');
        if (detailsPanel) {
            detailsPanel.classList.remove('d-none');
            detailsPanel.innerHTML = `
                <div class="card-header">
                    <div id="debug-conversation-title">Loading Conversation ${conversationId + 1} Analysis...</div>
                </div>
                <div class="card-body text-center">
                    <div class="spinner-border text-primary my-5" role="status">
                        <span class="visually-hidden">Loading debug data...</span>
                    </div>
                    <p class="mt-2">Loading debug analysis for conversation ${conversationId + 1}...</p>
                </div>
            `;
        }
        
        // Hide the placeholder
        const placeholder = document.getElementById('debug-no-conversation-placeholder');
        if (placeholder) {
            placeholder.classList.add('d-none');
        }
        
        fetch(`${CONFIG.API_URL}/debug_analysis/${conversationId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(response.status === 404 ? 
                        'Debug analysis not found for this conversation' : 
                        'Failed to load conversation debug analysis');
                }
                return response.json();
            })
            .then(analysis => {
                displayDebugConversationAnalysis(analysis);
            })
            .catch(error => {
                console.error('Error loading conversation debug analysis:', error);
                
                // Show error in the details panel
                if (detailsPanel) {
                    detailsPanel.innerHTML = `
                        <div class="card-header">
                            <div id="debug-conversation-title">Conversation ${conversationId + 1} Analysis</div>
                        </div>
                        <div class="card-body">
                            <div class="alert alert-danger">
                                <h5><i class="bi bi-exclamation-triangle me-2"></i>Error Loading Debug Data</h5>
                                <p>${error.message}</p>
                                <p>Try refreshing the page or check server logs for details.</p>
                            </div>
                        </div>
                    `;
                }
            });
    }

    // Display debug analysis for a specific conversation with element checks
    function displayDebugConversationAnalysis(analysis) {
        // Check if the details panel exists
        const detailsPanel = document.getElementById('debug-conversation-details');
        if (!detailsPanel) {
            console.error("Debug conversation details element not found");
            return;
        }
        
        // Show the conversation details panel and hide the placeholder
        detailsPanel.classList.remove('d-none');
        const placeholder = document.getElementById('debug-no-conversation-placeholder');
        if (placeholder) {
            placeholder.classList.add('d-none');
        }
        
        // Check if we have an error
        if (analysis.error) {
            detailsPanel.innerHTML = `
                <div class="card-header">
                    <div id="debug-conversation-title">Conversation ${analysis.conversation_id + 1} Analysis</div>
                </div>
                <div class="card-body">
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle me-2"></i>${analysis.error}
                    </div>
                </div>
            `;
            return;
        }
        
        // Build details panel HTML
        let detailsHtml = `
            <div class="card-header d-flex justify-content-between align-items-center">
                <div id="debug-conversation-title">Conversation ${analysis.conversation_id + 1} Debug Analysis</div>
                <div>
                    <span class="badge bg-info">${analysis.debug_count} debug logs</span>
                </div>
            </div>
            <div class="card-body">
        `;
        
        // Add request section
        detailsHtml += `
            <div class="alert alert-info" id="debug-conversation-request">
                <h5 class="alert-heading">User Request</h5>
                <p class="mb-0">${analysis.request || 'No request available'}</p>
            </div>
        `;
        
        // Add concepts evolution visualization if available
        if (analysis.concept_evolution && analysis.concept_evolution.metadata && analysis.concept_evolution.metadata.length > 0) {
            detailsHtml += `
                <h5 class="mt-4 mb-3">Initial Concepts</h5>
                <div class="table-responsive mb-4">
                    <table class="table table-sm table-hover debug-concept-table">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Value</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            analysis.concept_evolution.metadata.forEach(concept => {
                detailsHtml += `
                    <tr>
                        <td>${concept.category}</td>
                        <td>${concept.value}</td>
                    </tr>
                `;
            });
            
            detailsHtml += `
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        // Add insights sections if available
        if (analysis.insights && analysis.insights.length > 0) {
            detailsHtml += `
                <h5 class="mt-4 mb-3">Debug Insights</h5>
                <div class="row g-3">
            `;
            
            // Add each insight card
            analysis.insights.forEach(insight => {
                detailsHtml += `
                    <div class="col-md-6">
                        <div class="card h-100">
                            <div class="card-header">
                                ${insight.title}
                            </div>
                            <div class="card-body">
                                <p class="text-muted">${insight.description}</p>
                                <div class="debug-insight-data" id="insight-${insight.type}">
                `;
                
                // Format data based on insight type
                if (insight.type === 'metadata_summary' && insight.data.top_categories) {
                    detailsHtml += `
                        <div class="debug-stats-grid mb-3">
                            ${insight.data.top_categories.map(cat => 
                                `<div class="debug-stat-item">
                                    <div class="badge bg-primary">${cat[1]}</div>
                                    <div class="text-truncate">${cat[0]}</div>
                                 </div>`).join('')}
                        </div>
                    `;
                } else if (insight.type === 'top_candidates' && insight.data.top_candidates) {
                    detailsHtml += `
                        <div class="list-group">
                            ${insight.data.top_candidates.map(cand => 
                                `<div class="list-group-item d-flex justify-content-between align-items-center">
                                    <div>${cand.name}</div>
                                    <span class="badge bg-success rounded-pill">${cand.score.toFixed(2)}</span>
                                 </div>`).join('')}
                        </div>
                    `;
                } else {
                    detailsHtml += `<pre class="debug-content">${JSON.stringify(insight.data, null, 2)}</pre>`;
                }
                
                detailsHtml += `
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            detailsHtml += '</div>'; // Close row
        } else {
            detailsHtml += `
                <div class="alert alert-warning">
                    <i class="bi bi-info-circle me-2"></i>No debug insights available for this conversation.
                </div>
            `;
        }
        
        detailsHtml += '</div>'; // Close card-body
        
        // Update the details panel
        detailsPanel.innerHTML = detailsHtml;
    }

    // Display concept-restaurant associations table with element check
    function displayConceptRestaurantAssociations(crossInsights) {
        if (!crossInsights) return;
        
        const tableBody = document.querySelector('#concept-restaurant-table tbody');
        if (!tableBody) {
            console.warn("Concept-restaurant table body element not found");
            return;
        }
        
        tableBody.innerHTML = '';
        
        if (crossInsights.concept_restaurant_associations && 
            Array.isArray(crossInsights.concept_restaurant_associations)) {
            
            crossInsights.concept_restaurant_associations.forEach(association => {
                const row = document.createElement('tr');
                
                const categoryCell = document.createElement('td');
                categoryCell.textContent = association.category;
                row.appendChild(categoryCell);
                
                const conceptCell = document.createElement('td');
                conceptCell.textContent = association.concept;
                row.appendChild(conceptCell);
                
                const restaurantCell = document.createElement('td');
                restaurantCell.textContent = association.restaurant;
                row.appendChild(restaurantCell);
                
                const countCell = document.createElement('td');
                countCell.textContent = association.count;
                row.appendChild(countCell);
                
                tableBody.appendChild(row);
            });
        }
    }

    // Display category-restaurant accordion with element check
    function displayCategoryRestaurantAccordion(crossInsights) {
        if (!crossInsights) return;
        
        const accordion = document.getElementById('categoryRestaurantAccordion');
        if (!accordion) {
            console.warn("Category-restaurant accordion element not found");
            return;
        }
        
        accordion.innerHTML = '';
        
        if (crossInsights.category_restaurant_associations && 
            Array.isArray(crossInsights.category_restaurant_associations)) {
            
            console.log(`Displaying ${crossInsights.category_restaurant_associations.length} category-restaurant associations`);
            
            crossInsights.category_restaurant_associations.forEach((category, index) => {
                const accordionItem = document.createElement('div');
                accordionItem.className = 'accordion-item';
                
                const headerId = `heading${index}`;
                const collapseId = `collapse${index}`;
                
                accordionItem.innerHTML = `
                    <h2 class="accordion-header" id="${headerId}">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
                            data-bs-target="#${collapseId}" aria-expanded="false" aria-controls="${collapseId}">
                            ${category.category} (${category.top_restaurants.length} restaurants)
                        </button>
                    </h2>
                    <div id="${collapseId}" class="accordion-collapse collapse" aria-labelledby="${headerId}"
                        data-bs-parent="#categoryRestaurantAccordion">
                        <div class="accordion-body p-0">
                            <ul class="list-group list-group-flush">
                                ${category.top_restaurants.map(r => 
                                    `<li class="list-group-item d-flex justify-content-between align-items-center">
                                        ${r.name}
                                        <span class="badge bg-primary rounded-pill">${r.count}</span>
                                     </li>`
                                ).join('')}
                            </ul>
                        </div>
                    </div>
                `;
                
                accordion.appendChild(accordionItem);
            });
        } else {
            console.warn("No category-restaurant associations data available or invalid format");
            accordion.innerHTML = '<div class="alert alert-info m-3">No category-restaurant associations available</div>';
        }
    }

    // Display initial concepts analysis
    function displayInitialConceptsAnalysis(conceptEvolution) {
        const metadata = conceptEvolution?.metadata || [];
        
        // Count categories
        const categoryCount = {};
        metadata.forEach(item => {
            if (!categoryCount[item.category]) {
                categoryCount[item.category] = 0;
            }
            categoryCount[item.category]++;
        });
        
        // Display category distribution chart
        const ctx = document.getElementById('debug-initial-categories-chart')?.getContext('2d');
        if (ctx) {
            // Verify Chart.js is available
            if (!window.Chart) {
                console.error("Chart.js is not loaded");
                return;
            }
            
            try {
                new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(categoryCount),
                        datasets: [{
                            data: Object.values(categoryCount),
                            backgroundColor: [
                                'rgba(54, 162, 235, 0.6)',
                                'rgba(75, 192, 192, 0.6)',
                                'rgba(255, 206, 86, 0.6)',
                                'rgba(255, 99, 132, 0.6)',
                                'rgba(153, 102, 255, 0.6)',
                                'rgba(255, 159, 64, 0.6)'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right',
                                labels: {
                                    boxWidth: 10,
                                    font: {
                                        size: 10
                                    }
                                }
                            }
                        }
                    }
                });
            } catch (error) {
                console.error("Error creating initial categories chart:", error);
            }
        }
        
        // Populate concepts table
        const conceptsTable = document.getElementById('debug-initial-concepts-table')?.querySelector('tbody');
        if (conceptsTable) {
            conceptsTable.innerHTML = '';
            
            metadata.forEach(concept => {
                const row = document.createElement('tr');
                
                const categoryCell = document.createElement('td');
                categoryCell.textContent = concept.category;
                row.appendChild(categoryCell);
                
                const conceptCell = document.createElement('td');
                conceptCell.textContent = concept.value;
                row.appendChild(conceptCell);
                
                conceptsTable.appendChild(row);
            });
        }
    }
} else {
    // Module already exists, log a warning
    console.warn("DebugInsightsModule already initialized, skipping duplicate initialization");
}
