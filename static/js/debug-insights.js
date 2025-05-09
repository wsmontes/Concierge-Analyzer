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
    let integratedData = null;
    let embeddingsData = null;

    // Track chart instances so we can destroy them before recreating
    let chartInstances = {
        categoryDistribution: null,
        conceptDistribution: null,
        restaurantDistribution: null,
        embeddingsDistribution: null
    };

    // Add a flag to track if rendering is in progress to prevent simultaneous renders
    let isDebugInsightsRendering = false;

    // Create a namespace to expose functions to other modules
    window.DebugInsightsModule = {
        initializeDebugInsights: initializeDebugInsights,
        updateWithIntegratedData: updateWithIntegratedData,
        handleEmbeddingsLoaded: handleEmbeddingsLoaded,
        isInitialized: true
    };

    // Initialize debug insights module
    function initializeDebugInsights(data) {
        console.log("Initializing debug insights with data:", data ? "Data available" : "No data");
        
        // Fetch debug analysis data
        fetchDebugAnalysisData();
        
        // Setup conversation list for debug analysis
        setupDebugConversationList(data);
        
        // Set up section visibility listener
        initSectionVisibilityObserver();
        
        // Listen for refresh events
        document.addEventListener('debugInsights:refreshAssociations', function() {
            console.log("Refresh associations event received");
            fetchDebugAnalysisData();
        });
        
        // Listen for embeddings data loaded events
        document.addEventListener('embeddingsLoaded', function(event) {
            console.log("Debug insights: Embeddings data loaded event received");
            handleEmbeddingsLoaded(event.detail);
        });
    }
    
    // Handle when embeddings data is loaded
    function handleEmbeddingsLoaded(data) {
        console.log('Debug insights received embeddings data:', data ? 'Data available' : 'No data');
        
        // Store embeddings data for later use
        embeddingsData = data;
        
        // Only update visualizations if the debug section is active
        const debugSection = document.getElementById('debug-insights-section');
        if (debugSection && debugSection.classList.contains('active')) {
            // Update embeddings visualizations
            displayEmbeddingsVisualizations();
        }
    }
    
    // Display embeddings visualizations in the debug insights section
    function displayEmbeddingsVisualizations() {
        if (!embeddingsData || !embeddingsData.loaded || !embeddingsData.vectors || embeddingsData.vectors.length === 0) {
            console.warn('No embeddings data available for visualization in debug insights');
            showNoEmbeddingsMessage('debug-embeddings-container');
            return;
        }
        
        try {
            // Make sure we have a container for embeddings visualizations
            const container = document.getElementById('debug-embeddings-container');
            if (!container) {
                console.warn('Debug embeddings container not found');
                return;
            }
            
            // Clear any existing content or error messages
            container.innerHTML = '';
            
            // Create a card for embeddings visualization
            const card = document.createElement('div');
            card.className = 'card shadow-sm mb-3';
            card.innerHTML = `
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-diagram-3 me-2"></i>
                        Embeddings Overview
                    </h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="d-flex flex-column align-items-center mb-3">
                                <div style="height: 200px; width: 100%;">
                                    <canvas id="debug-embeddings-distribution-chart"></canvas>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="card-subtitle mb-2 text-muted">Embeddings Statistics</h6>
                                    <ul class="list-group list-group-flush">
                                        <li class="list-group-item d-flex justify-content-between align-items-center">
                                            Vectors
                                            <span class="badge bg-primary rounded-pill" id="debug-embeddings-count">${embeddingsData.vectors.length}</span>
                                        </li>
                                        <li class="list-group-item d-flex justify-content-between align-items-center">
                                            Dimensions
                                            <span class="badge bg-primary rounded-pill" id="debug-embeddings-dimensions">${embeddingsData.vectors[0]?.length || 'Unknown'}</span>
                                        </li>
                                        <li class="list-group-item d-flex justify-content-between align-items-center">
                                            Categories
                                            <span class="badge bg-primary rounded-pill" id="debug-embeddings-categories">${Object.keys(embeddingsData.categories || {}).length}</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Add the card to the container
            container.appendChild(card);
            
            // Create embeddings distribution chart
            setTimeout(() => {
                displayEmbeddingsDistributionChart();
            }, 100);
            
            console.log('Embeddings visualizations displayed in debug insights');
        } catch (error) {
            console.error('Error displaying embeddings visualizations:', error);
            const container = document.getElementById('debug-embeddings-container');
            if (container) {
                container.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Error displaying embeddings: ${error.message}
                    </div>
                `;
            }
        }
    }
    
    // Display embeddings distribution chart
    function displayEmbeddingsDistributionChart() {
        if (!embeddingsData || !embeddingsData.vectors || embeddingsData.vectors.length === 0) {
            console.warn('No embeddings vectors data available for chart');
            return;
        }
        
        const canvasElement = document.getElementById('debug-embeddings-distribution-chart');
        if (!canvasElement) {
            console.warn("Canvas element 'debug-embeddings-distribution-chart' not found");
            return;
        }
        
        try {
            // Ensure any existing chart on this canvas is destroyed
            const existingChart = Chart.getChart(canvasElement);
            if (existingChart) {
                console.log("Found existing embeddings chart, destroying it");
                existingChart.destroy();
            }
            
            const ctx = canvasElement.getContext('2d');
            if (!ctx) {
                console.warn("Could not get context for 'debug-embeddings-distribution-chart'");
                return;
            }
            
            // Prepare category distribution data if categories are available
            let labels = [];
            let values = [];
            
            if (embeddingsData.categories && Object.keys(embeddingsData.categories).length > 0) {
                // Count embeddings by category
                const categoryCounts = {};
                Object.keys(embeddingsData.categories).forEach(category => {
                    categoryCounts[category] = embeddingsData.categories[category].length;
                });
                
                // Convert to arrays for the chart
                const sortedCategories = Object.entries(categoryCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10);  // Take top 10
                
                labels = sortedCategories.map(item => item[0]);
                values = sortedCategories.map(item => item[1]);
            } else {
                // If no categories, just show the total count
                labels = ['Embeddings'];
                values = [embeddingsData.vectors.length];
            }
            
            // Create and store chart reference
            chartInstances.embeddingsDistribution = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: [
                            'rgba(54, 162, 235, 0.6)',
                            'rgba(255, 206, 86, 0.6)',
                            'rgba(75, 192, 192, 0.6)',
                            'rgba(255, 99, 132, 0.6)',
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
                            text: 'Embeddings by Category'
                        }
                    }
                }
            });
            
            console.log("Embeddings distribution chart created successfully");
        } catch (error) {
            console.error("Error creating embeddings distribution chart:", error);
            throw error;
        }
    }
    
    // Show message when no embeddings data is available
    function showNoEmbeddingsMessage(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="d-flex flex-column align-items-center justify-content-center p-4">
                    <div class="text-center text-muted">
                        <i class="bi bi-cloud-upload fs-1 mb-3"></i>
                        <h5>No Embeddings Data Available</h5>
                        <p>Please upload an embeddings JSON file using the uploader in the sidebar.</p>
                    </div>
                </div>
            `;
        }
    }

    // Extract the fetch logic to a separate function for reuse
    function fetchDebugAnalysisData() {
        fetch(`${CONFIG.API_URL}/debug_analysis`)
            .then(response => {
                if (!response.ok) throw new Error('Failed to load debug analysis');
                return response.json();
            })
            .then(debugData => {
                console.log("Debug analysis data received:", debugData ? "Data available" : "No data");
                
                // Store data for deferred rendering
                globalInsightsData = debugData.global_insights || [];
                crossConversationData = debugData.cross_insights || {};
                
                // Log the structure of the insights data
                console.log("Global insights data structure:", 
                          globalInsightsData.length > 0 ? 
                          "Array with " + globalInsightsData.length + " items" : 
                          "Empty or invalid array");
                
                // Update stats immediately (these don't need canvas elements)
                updateDebugStats(globalInsightsData);
                
                // Render cross-conversation insights immediately
                displayCrossConversationInsights(crossConversationData);
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
            
            // Add embeddings visualization if available
            if (embeddingsData && embeddingsData.loaded) {
                displayEmbeddingsVisualizations();
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
            
            // Try to find a parent container where we could add a message
            const possibleContainers = [
                document.querySelector('.card-body'),
                document.getElementById('debug-insight-cards'),
                document.querySelector('.dashboard-card')
            ];
            
            // Try to find an available container
            for (const container of possibleContainers) {
                if (container) {
                    const alertDiv = document.createElement('div');
                    alertDiv.className = 'alert alert-warning mt-2';
                    alertDiv.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i>Missing chart container: 'restaurant-distribution-chart'`;
                    container.appendChild(alertDiv);
                    break;
                }
            }
            
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
            if (!restaurants) {
                console.warn("Restaurants data is missing");
                
                // Display a message in the chart area
                const parent = canvasElement.parentElement;
                if (parent) {
                    parent.innerHTML = '<div class="alert alert-warning">No restaurant data available</div>';
                }
                return;
            }
            
            if (!Array.isArray(restaurants)) {
                console.warn("Restaurants data is not an array:", restaurants);
                
                // Display a message in the chart area
                const parent = canvasElement.parentElement;
                if (parent) {
                    parent.innerHTML = '<div class="alert alert-warning">Invalid restaurant data format</div>';
                }
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
                    labels = restaurants.map(restaurant => restaurant[0] || "Unknown");
                    values = restaurants.map(restaurant => restaurant[1] || 0);
                } 
                // If data comes as array of objects with name and count properties
                else if (typeof restaurants[0] === 'object') {
                    labels = restaurants.map(restaurant => restaurant.name || "Unknown");
                    values = restaurants.map(restaurant => restaurant.count || 0);
                }
            } else {
                // No data case - show empty chart with a message
                const parent = canvasElement.parentElement;
                if (parent) {
                    parent.innerHTML = '<div class="alert alert-info">No restaurant data to display</div>';
                }
                return;
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
            
            // Display error message in the chart area
            const parent = canvasElement.parentElement;
            if (parent) {
                parent.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Error creating chart: ${error.message}
                    </div>
                `;
            }
        }
    }

    // Display cross-conversation insights with element checks
    function displayCrossConversationInsights(crossInsights) {
        try {
            // Updated selectors to match the new HTML structure
            const loadingIndicator = document.querySelector('.spinner-border');
            const errorMessage = document.getElementById('concept-restaurant-error') || document.querySelector('.alert-danger');
            
            // Check for both old and new element IDs for backwards compatibility
            const tableView = document.getElementById('relationship-table-view') || 
                             document.getElementById('concept-restaurant-table-view');
            
            // Updated to use the new accordion element ID
            const accordionView = document.getElementById('relationship-views') ||
                                 document.getElementById('categoryRestaurantAccordion');
                                 
            const noDataMessage = document.getElementById('no-associations-message') || 
                                 document.querySelector('.alert-info');
            
            if (loadingIndicator) {
                loadingIndicator.parentElement.classList.add('d-none');
            }
            
            if (!crossInsights || Object.keys(crossInsights).length === 0) {
                console.warn("No cross-conversation insights data available");
                if (errorMessage) {
                    errorMessage.classList.remove('d-none');
                    const errMsgElement = errorMessage.querySelector('span') || errorMessage;
                    if (errMsgElement) {
                        errMsgElement.textContent = "No concept-restaurant association data available from server";
                    }
                }
                return;
            }
            
            // Display concept-restaurant associations
            const hasTableData = displayConceptRestaurantAssociations(crossInsights.concept_restaurant_associations);
            
            // If we're using the new UI, we can skip the old accordion display
            const hasAccordionData = accordionView ? displayCategoryRestaurantAccordion(crossInsights) : false;
            
            // Show either table view or no data message based on results
            if (tableView && !tableView.classList.contains('d-none')) {
                tableView.classList.remove('d-none');
            }
            
            // Show no data message if both displays have no data
            if (!hasTableData && !hasAccordionData && noDataMessage) {
                noDataMessage.classList.remove('d-none');
            }
        } catch (error) {
            console.error("Error displaying cross-conversation insights:", error);
            const errorMessage = document.getElementById('concept-restaurant-error') || document.querySelector('.alert-danger');
            if (errorMessage) {
                errorMessage.classList.remove('d-none');
                const errMsgElement = errorMessage.querySelector('span') || errorMessage;
                if (errMsgElement) {
                    errMsgElement.textContent = "Error displaying association data: " + error.message;
                }
            }
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

    /**
     * Displays concept-restaurant associations in a table
     * @param {Array} associations - Array of associations between concepts and restaurants
     * @returns {boolean} True if associations were successfully displayed
     */
    function displayConceptRestaurantAssociations(associations) {
        // First try to find the table body element
        const tableBody = document.getElementById('relationship-table-body');
        
        // If table body doesn't exist, try to find a container to add it to
        if (!tableBody) {
            console.warn('Relationship table body element not found, creating dynamically');
            
            // Try multiple possible container selectors
            const containerSelectors = [
                '.debug-insights-container',
                '#debug-insights-section',
                '.content-section',
                '.card-body'
            ];
            
            let parentContainer = null;
            
            // Try each selector until a container is found
            for (const selector of containerSelectors) {
                const container = document.querySelector(selector);
                if (container) {
                    parentContainer = container;
                    console.log(`Found container using selector: ${selector}`);
                    break;
                }
            }
            
            if (!parentContainer) {
                console.error('Debug insights container not found - cannot create relationship table');
                return false;
            }
            
            // Create the relationship table dynamically
            const tableCard = document.createElement('div');
            tableCard.className = 'card shadow-sm mb-3';
            tableCard.innerHTML = `
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-diagram-3 me-2"></i>
                        Concept-Restaurant Relationships
                    </h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-sm table-hover">
                            <thead>
                                <tr>
                                    <th>Category</th>
                                    <th>Concept</th>
                                    <th>Restaurant</th>
                                    <th>Strength</th>
                                </tr>
                            </thead>
                            <tbody id="relationship-table-body">
                                <!-- Relationships will be populated here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            // Add the table to the page
            parentContainer.appendChild(tableCard);
            
            // Now get the table body reference
            const newTableBody = document.getElementById('relationship-table-body');
            if (!newTableBody) {
                console.error('Failed to create relationship table');
                return false;
            }
            
            return populateRelationshipTable(newTableBody, associations);
        } else {
            return populateRelationshipTable(tableBody, associations);
        }
    }

    /**
     * Populates the relationship table with data
     * @param {HTMLElement} tableBody - Table body element to populate
     * @param {Array} associations - Association data to display
     * @returns {boolean} True if table was populated successfully
     */
    function populateRelationshipTable(tableBody, associations) {
        // Clear existing content
        tableBody.innerHTML = '';
        
        if (!associations || associations.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = '<td colspan="4" class="text-center">No relationship data available</td>';
            tableBody.appendChild(emptyRow);
            console.log('No relationship data available to display');
            return false;
        }
        
        // Add each association as a row
        associations.forEach(assoc => {
            const row = document.createElement('tr');
            
            // Create cells with proper structure and error handling
            const categoryCell = document.createElement('td');
            categoryCell.textContent = assoc.category || 'Unknown';
            
            const conceptCell = document.createElement('td');
            conceptCell.textContent = assoc.concept || 'Unknown';
            
            const restaurantCell = document.createElement('td');
            restaurantCell.textContent = assoc.restaurant || 'Unknown';
            
            const strengthCell = document.createElement('td');
            
            // Display strength as a progress bar
            if (typeof assoc.strength === 'number') {
                const percentage = Math.round(assoc.strength * 100);
                strengthCell.innerHTML = `
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar" role="progressbar" 
                            style="width: ${percentage}%;" 
                            aria-valuenow="${percentage}" 
                            aria-valuemin="0" 
                            aria-valuemax="100"
                            title="${percentage}%">
                        </div>
                    </div>
                    <span class="small">${percentage}%</span>
                `;
            } else {
                strengthCell.textContent = 'N/A';
            }
            
            // Add all cells to the row
            row.appendChild(categoryCell);
            row.appendChild(conceptCell);
            row.appendChild(restaurantCell);
            row.appendChild(strengthCell);
            
            // Add the row to the table
            tableBody.appendChild(row);
        });
        
        console.log(`Successfully displayed ${associations.length} category-restaurant associations`);
        return true;
    }

    // Display category-restaurant accordion with element check
    function displayCategoryRestaurantAccordion(crossInsights) {
        if (!crossInsights) return false;
        
        // Look for either the network view or the old accordion element
        const networkView = document.getElementById('relationship-network-chart');
        const accordion = document.getElementById('categoryRestaurantAccordion');
        
        if (!networkView && !accordion) {
            console.warn("Neither network chart nor accordion element found");
            return false;
        }
        
        // If we have the new network view, assume the new UI is in place and skip old accordion
        if (networkView) {
            // Here you would initialize a network visualization with D3, VisJS, or another library
            console.log("Network view found, initializing relationship network");
            try {
                // Simple placeholder visualization (should be replaced with actual network viz)
                networkView.innerHTML = `<div class="p-5 text-center">
                    <p>Network visualization would be rendered here</p>
                    <p>Found ${crossInsights.concept_restaurant_associations?.length || 0} 
                       concept-restaurant associations</p>
                </div>`;
                return true;
            } catch (e) {
                console.error("Failed to initialize network visualization", e);
                return false;
            }
        } else if (accordion) {
            // Old accordion logic
            accordion.innerHTML = '';
            
            if (crossInsights.category_restaurant_associations && 
                Array.isArray(crossInsights.category_restaurant_associations) && 
                crossInsights.category_restaurant_associations.length > 0) {
                
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
                                ${category.category || "Unknown Category"} (${category.top_restaurants?.length || 0} restaurants)
                            </button>
                        </h2>
                        <div id="${collapseId}" class="accordion-collapse collapse" aria-labelledby="${headerId}"
                            data-bs-parent="#categoryRestaurantAccordion">
                            <div class="accordion-body p-0">
                                <ul class="list-group list-group-flush">
                                    ${category.top_restaurants ? category.top_restaurants.map(r => 
                                        `<li class="list-group-item d-flex justify-content-between align-items-center">
                                            ${r.name || "Unknown"}
                                            <span class="badge bg-primary rounded-pill">${r.count || 0}</span>
                                         </li>`
                                    ).join('') : '<li class="list-group-item">No restaurant data available</li>'}
                                </ul>
                            </div>
                        </div>
                    `;
                    
                    accordion.appendChild(accordionItem);
                });
                return true;
            } else {
                console.warn("No category-restaurant associations data available or invalid format");
                return false;
            }
        }
        return false;
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

    /**
     * Update debug insights with integrated data from multiple sources
     * @param {Object} data - The integrated data object containing concepts, restaurants and relationships
     */
    function updateWithIntegratedData(data) {
        if (!data) {
            console.warn("No integrated data provided to updateWithIntegratedData");
            return;
        }

        console.log("Updating debug insights with integrated data");
        integratedData = data;

        // Update relationship counts in the UI if elements exist
        updateElementText('debug-relationship-count', data.relationships ? data.relationships.length : 0);
        updateElementText('debug-integrated-concept-count', Object.keys(data.concepts || {}).length);
        updateElementText('debug-integrated-restaurant-count', Object.keys(data.restaurants || {}).length);

        // Create synthetic insights data structure for visualization
        const syntheticInsights = createSyntheticInsightsFromIntegrated(data);
        
        // Display integrated data visualizations
        try {
            displayIntegratedDataVisualizations(syntheticInsights);
        } catch (error) {
            console.error("Error displaying integrated data visualizations:", error);
        }

        // Dispatch event in case other components need to know integrated data is ready in debug insights
        document.dispatchEvent(new CustomEvent('debugInsights:integratedDataReady'));
    }

    /**
     * Create synthetic insights data structure from integrated data
     * @param {Object} data - The integrated data object
     * @returns {Array} - An array of synthetic insights objects
     */
    function createSyntheticInsightsFromIntegrated(data) {
        const insights = [];
        
        // Basic stats insight
        insights.push({
            type: 'basic_stats',
            data: {
                unique_categories: Object.keys(data.categoryCounts || {}).length,
                unique_concepts: Object.keys(data.concepts || {}).length,
                unique_restaurants: Object.keys(data.restaurants || {}).length,
                association_count: data.relationships ? data.relationships.length : 0
            }
        });

        // Category distribution insight
        const categoryData = [];
        if (data.categoryCounts) {
            Object.entries(data.categoryCounts).forEach(([category, count]) => {
                categoryData.push([category, count]);
            });
        }
        
        insights.push({
            type: 'category_distribution',
            data: {
                categories: categoryData.sort((a, b) => b[1] - a[1]).slice(0, 10)
            }
        });

        // Add other synthetic insights as needed
        return insights;
    }

    /**
     * Display visualizations based on integrated data
     * @param {Array} insights - Array of synthetic insights objects
     */
    function displayIntegratedDataVisualizations(insights) {
        // Update the existing debug insights with our synthetic ones
        if (globalInsightsData) {
            // Merge insights, replacing any with same type
            const existingTypes = new Set(insights.map(i => i.type));
            const filteredOriginal = globalInsightsData.filter(i => !existingTypes.has(i.type));
            globalInsightsData = [...filteredOriginal, ...insights];
            
            // Re-render if the debug section is visible
            const debugSection = document.getElementById('debug-insights-section');
            if (debugSection && debugSection.classList.contains('active')) {
                renderDebugInsights();
            }
        }
    }
} else {
    // Module already exists, log a warning
    console.warn("DebugInsightsModule already initialized, skipping duplicate initialization");
}
