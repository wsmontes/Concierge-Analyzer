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
            
            if (exportPdfSidebarBtn) {
                exportPdfSidebarBtn.addEventListener('click', window.PdfExportModule.exportPDF);
            }
            
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
        })
        .catch(error => {
            console.error('Error uploading file:', error);
            showNotification(`Error uploading file: ${error.message}`, 'error');
        })
        .finally(() => {
            loadingIndicator.classList.add('d-none');
        });
    }
    
    // Process the data and display results
    function processData(data) {
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
});
