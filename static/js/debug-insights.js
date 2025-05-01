/**
 * Debug insights functionality for Concierge Chat Analyzer
 * Provides visualization and analysis of debug data
 * Dependencies: Chart.js, CONFIG
 */

// Store insights data globally within this module for deferred rendering
let globalInsightsData = null;
let crossConversationData = null;

// Track chart instances so we can destroy them before recreating
let chartInstances = {
    categoryDistribution: null,
    conceptDistribution: null,
    restaurantDistribution: null
};

// Create a namespace to expose functions to other modules
window.DebugInsightsModule = {
    initializeDebugInsights: initializeDebugInsights
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
            
            // Set up tab event listener for deferred rendering
            initTabEventListeners();
        })
        .catch(error => {
            console.error('Error loading debug analysis:', error);
            showDebugLoadError(error);
        });
}

// Initialize tab event listeners for deferred chart rendering
function initTabEventListeners() {
    // Get the debug insights tab
    const debugInsightsTab = document.getElementById('debug-insights-tab');
    if (!debugInsightsTab) {
        console.warn("Debug insights tab element not found");
        return;
    }

    // Listen for tab activation using Bootstrap's events
    debugInsightsTab.addEventListener('shown.bs.tab', function() {
        console.log("Debug insights tab shown, rendering charts...");
        
        // Reset chart instances to ensure we don't try to create charts twice
        chartInstances = {
            categoryDistribution: null,
            conceptDistribution: null,
            restaurantDistribution: null
        };
        
        // Create a slight delay to ensure DOM is ready
        setTimeout(() => {
            if (globalInsightsData && globalInsightsData.length > 0) {
                displayGlobalDebugInsights(globalInsightsData);
            } else {
                console.warn("No global insights data available for rendering charts");
                showNoDataMessage("global-insights-container", "No debug insights data available");
            }
            
            if (crossConversationData) {
                displayCrossConversationInsights(crossConversationData);
            } else {
                console.warn("No cross conversation data available");
            }
        }, 100);
    });
}

// Show message when no data is available
function showNoDataMessage(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        const noDataMsg = document.createElement('div');
        noDataMsg.className = 'alert alert-info';
        noDataMsg.textContent = message;
        container.appendChild(noDataMsg);
    }
}

// Show error message when debug loading fails
function showDebugLoadError(error) {
    const debugTabContent = document.getElementById('debug-insights');
    if (debugTabContent) {
        const errorAlert = document.createElement('div');
        errorAlert.className = 'alert alert-danger';
        errorAlert.innerHTML = `
            <h4 class="alert-heading"><i class="bi bi-exclamation-triangle me-2"></i>Error Loading Debug Data</h4>
            <p>There was a problem loading the debug analysis data: ${error.message}</p>
            <hr>
            <p class="mb-0">Please try refreshing the page or check the server logs for more information.</p>
        `;
        debugTabContent.prepend(errorAlert);
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
        console.warn(`Element with ID '${elementId}' not found`);
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
        
        // Show a visual error on the page
        const debugInsightsContent = document.getElementById('debug-insights');
        if (debugInsightsContent) {
            const errorMsg = document.createElement('div');
            errorMsg.className = 'alert alert-warning mt-3';
            errorMsg.innerHTML = `
                <strong><i class="bi bi-exclamation-triangle me-2"></i>Chart rendering error:</strong> ${error.message}
            `;
            
            // Check if the error already exists to avoid duplicates
            const existingError = debugInsightsContent.querySelector('.alert.alert-warning');
            if (existingError) {
                existingError.remove();
            }
            
            debugInsightsContent.prepend(errorMsg);
        }
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
        // Destroy existing chart if it exists
        if (chartInstances.categoryDistribution) {
            chartInstances.categoryDistribution.destroy();
            chartInstances.categoryDistribution = null;
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
        // Destroy existing chart if it exists
        if (chartInstances.conceptDistribution) {
            chartInstances.conceptDistribution.destroy();
            chartInstances.conceptDistribution = null;
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
        // Destroy existing chart if it exists
        if (chartInstances.restaurantDistribution) {
            chartInstances.restaurantDistribution.destroy();
            chartInstances.restaurantDistribution = null;
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
    if (!data || (!data.conversations && !data.metrics)) {
        console.warn("No conversation data available for debug analysis");
        debugConversationList.innerHTML = '<div class="list-group-item text-muted">No conversations with debug data available</div>';
        return;
    }
    
    // Use metrics data to create list items since full conversations might not be available
    const metrics = data.metrics || [];
    
    if (metrics.length === 0) {
        debugConversationList.innerHTML = '<div class="list-group-item text-muted">No conversations with metrics data available</div>';
        return;
    }
    
    console.log(`Setting up debug conversation list with ${metrics.length} conversations`);
    
    for (let i = 0; i < metrics.length; i++) {
        const metric = metrics[i];
        
        // Create list item for all conversations - we'll fetch debug data on demand
        const listItem = document.createElement('a');
        listItem.href = '#';
        listItem.className = 'list-group-item list-group-item-action';
        listItem.dataset.conversationId = i;
        
        const requestText = metric.request || 'No request';
        const truncatedRequest = requestText.length > 60 ? requestText.substring(0, 60) + '...' : requestText;
        
        listItem.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">Conversation ${i + 1}</h6>
            </div>
            <p class="mb-1 text-truncate">${truncatedRequest}</p>
        `;
        
        listItem.addEventListener('click', function(e) {
            e.preventDefault();
            loadDebugConversationAnalysis(i);
            
            // Set active state
            document.querySelectorAll('#debug-conversation-list a').forEach(item => {
                item.classList.remove('active');
            });
            this.classList.add('active');
        });
        
        debugConversationList.appendChild(listItem);
    }
}

// Load debug analysis for a specific conversation
function loadDebugConversationAnalysis(conversationId) {
    // Show loading indicator
    const detailsPanel = document.getElementById('debug-conversation-details');
    if (detailsPanel) {
        detailsPanel.classList.remove('d-none');
        detailsPanel.innerHTML = `
            <div class="card-body text-center">
                <div class="spinner-border text-primary" role="status">
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
            if (!response.ok) throw new Error('Failed to load conversation debug analysis');
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
                    <div class="card-body">
                        <div class="alert alert-danger">
                            <h5><i class="bi bi-exclamation-triangle me-2"></i>Error Loading Debug Data</h5>
                            <p>${error.message}</p>
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
                                <!-- Insight data would be added here dynamically -->
                                <pre class="debug-content">${JSON.stringify(insight.data, null, 2)}</pre>
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
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categoryCount),
                datasets: [{
                    data: Object.values(categoryCount),
                    backgroundColor: [
                        CONFIG.CHART_COLORS.primary,
                        CONFIG.CHART_COLORS.success,
                        CONFIG.CHART_COLORS.warning,
                        CONFIG.CHART_COLORS.danger,
                        CONFIG.CHART_COLORS.info,
                        CONFIG.CHART_COLORS.secondary
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

// Additional debug insight functions would be implemented here
// Following the same pattern as above
