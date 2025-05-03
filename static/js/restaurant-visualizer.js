/**
 * Restaurant Data Visualization Module for Concierge Analyzer
 * 
 * Provides visualization tools for restaurant categories and concepts
 * Handles loading and processing restaurant data from file uploads
 * 
 * Dependencies: d3.js, plotly.js, main.js
 */

// Global store for restaurant visualization data
window.restaurantData = {
    raw: null,         // Raw data
    vectors: [],       // Extracted vectors
    labels: [],        // Labels for each vector
    categories: {},    // Category -> concepts mapping
    loaded: false,     // Whether data has been loaded
    currentVisualization: null // Current visualization state
};

// Initialize restaurant data visualization module
function initRestaurantVisualizer() {
    console.log('Initializing Restaurant Visualizer module');
    initFolderUpload();
    initVisualizationTabs();
}

// Initialize folder upload functionality
function initFolderUpload() {
    const uploadArea = document.getElementById('folder-upload-area');
    const folderInput = document.getElementById('folder-input');
    const selectedFileEl = document.getElementById('folder-selected-file');
    const uploadPlaceholder = uploadArea ? uploadArea.querySelector('.upload-placeholder') : null;
    const fileNameEl = selectedFileEl ? selectedFileEl.querySelector('.file-name') : null;
    const removeButton = document.getElementById('folder-remove-file');
    const statusElement = document.getElementById('folder-status');
    const statusText = document.getElementById('folder-status-text');
    const fileCountEl = document.getElementById('folder-file-count');

    if (!uploadArea || !folderInput) {
        console.warn('Folder upload elements not found');
        return;
    }

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
                currentVisualization: null
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
        
        // Show status
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
        
        // Process each JSON file
        const categories = {};
        const vectors = [];
        const labels = [];
        let processedCount = 0;
        
        jsonFiles.forEach(file => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
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
                statusElement.querySelector('.progress-bar').style.width = `${progress}%`;
                statusText.textContent = `Processed ${processedCount}/${jsonFiles.length} files`;
                
                // Check if all files have been processed
                if (processedCount === jsonFiles.length) {
                    if (vectors.length > 0) {
                        window.restaurantData = {
                            raw: null,
                            vectors: vectors,
                            labels: labels,
                            categories: categories,
                            loaded: true,
                            currentVisualization: null
                        };
                        
                        updateRestaurantMetrics();
                        renderCategoryHierarchy();
                        showRestaurantSuccess(`Loaded ${vectors.length} embeddings from ${Object.keys(categories).length} categories`);
                    } else {
                        showRestaurantError('No valid embedding vectors found in the uploaded files');
                    }
                }
            };
            
            reader.onerror = function() {
                console.error(`Error reading file ${file.name}`);
                processedCount++;
            };
            
            reader.readAsText(file);
        });
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
                activeTab.dispatchEvent(new Event('shown.bs.tab'));
            }
        });
    }
    
    // Add update hierarchy visualization button event
    const updateBtn = document.getElementById('updateHierarchyViz');
    if (updateBtn) {
        updateBtn.addEventListener('click', renderCategoryHierarchy);
    }
}

// Update restaurant metrics
function updateRestaurantMetrics() {
    if (!window.restaurantData.loaded) return;
    
    const { vectors, categories } = window.restaurantData;
    
    // Update metrics
    if (vectors.length > 0) {
        document.getElementById('dimensions').textContent = vectors[0].length;
        document.getElementById('dataPoints').textContent = vectors.length;
        document.getElementById('categoryCount').textContent = Object.keys(categories).length;
        
        // Count total concepts
        const totalConcepts = Object.values(categories).reduce((sum, arr) => sum + arr.length, 0);
        document.getElementById('conceptCount').textContent = totalConcepts;
        
        // Show category breakdown section
        const breakdownSection = document.getElementById('categoryBreakdownSection');
        if (breakdownSection) {
            breakdownSection.classList.remove('d-none');
        }
        
        // Populate category table
        const categoryTable = document.getElementById('categoryTable');
        if (categoryTable) {
            categoryTable.innerHTML = '';
            
            Object.entries(categories).forEach(([category, concepts]) => {
                const percentage = ((concepts.length / totalConcepts) * 100).toFixed(1);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${category}</td>
                    <td>${concepts.length}</td>
                    <td>${percentage}%</td>
                `;
                categoryTable.appendChild(row);
            });
        }
    }
}

// Render category hierarchy visualization
function renderCategoryHierarchy() {
    if (!window.restaurantData.loaded) return;
    
    const vizType = document.getElementById('hierarchyType')?.value || 'sunburst';
    const colorScheme = document.getElementById('hierarchyColorScheme')?.value || 'viridis';
    const vizContainer = document.getElementById('hierarchyViz');
    
    if (!vizContainer) return;
    
    // Show loading indicator
    vizContainer.innerHTML = '<div class="d-flex justify-content-center align-items-center h-100"><div class="spinner-border text-primary" role="status"></div><span class="ms-2">Loading visualization...</span></div>';
    
    // Process the data for hierarchy visualization
    setTimeout(() => {
        try {
            // Extract category hierarchy data
            const hierarchyData = {
                name: "Restaurant Categories",
                children: []
            };
            
            Object.entries(window.restaurantData.categories).forEach(([category, concepts]) => {
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
                }
            } else {
                vizContainer.innerHTML = '<div class="alert alert-warning">Plotly.js is required for visualizations</div>';
            }
        } catch (error) {
            vizContainer.innerHTML = `<div class="alert alert-danger">Error rendering visualization: ${error.message}</div>`;
            console.error('Error in renderCategoryHierarchy:', error);
        }
    }, 100);
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
        hovertemplate: '<b>%{label}</b><br>Count: %{value}<extra></extra>',
        insidetextorientation: 'radial',
        marker: { colorscale: colorScheme }
    };
    
    const layout = {
        margin: { l: 0, r: 0, b: 0, t: 0 },
        sunburstcolorway: getColorScheme(colorScheme, data.children.length),
        font: { size: 10 }
    };
    
    Plotly.newPlot(container, [trace], layout, { responsive: true });
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
        hovertemplate: '<b>%{label}</b><br>Count: %{value}<extra></extra>',
        textposition: 'middle center',
        marker: { colorscale: colorScheme }
    };
    
    const layout = {
        margin: { l: 0, r: 0, b: 0, t: 0 },
        treemapcolorway: getColorScheme(colorScheme, data.children.length),
        font: { size: 10 }
    };
    
    Plotly.newPlot(container, [trace], layout, { responsive: true });
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
        hovertemplate: '<b>%{label}</b><br>Count: %{value}<extra></extra>',
        textposition: 'middle center',
        marker: { 
            colorscale: colorScheme,
            line: { width: 2 },
            pad: { t: 3, l: 3, r: 3, b: 3 }
        },
        tiling: { 
            packing: 'circle'
        }
    };
    
    const layout = {
        margin: { l: 0, r: 0, b: 0, t: 0 },
        treemapcolorway: getColorScheme(colorScheme, data.children.length),
        font: { size: 10 }
    };
    
    Plotly.newPlot(container, [trace], layout, { responsive: true });
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

// Placeholder function for similarity visualization
function renderSimilarityVisualization() {
    const vizContainer = document.getElementById('similarityViz');
    if (!vizContainer) return;
    
    if (!window.restaurantData.loaded) {
        vizContainer.innerHTML = '<div class="alert alert-info">No restaurant data loaded</div>';
        return;
    }
    
    vizContainer.innerHTML = '<div class="d-flex justify-content-center align-items-center h-100"><div class="alert alert-info">Similarity visualization will be implemented in a future update</div></div>';
}

// Placeholder function for distribution visualization
function renderDistributionVisualization() {
    const vizContainer = document.getElementById('distributionViz');
    if (!vizContainer) return;
    
    if (!window.restaurantData.loaded) {
        vizContainer.innerHTML = '<div class="alert alert-info">No restaurant data loaded</div>';
        return;
    }
    
    vizContainer.innerHTML = '<div class="d-flex justify-content-center align-items-center h-100"><div class="alert alert-info">Distribution visualization will be implemented in a future update</div></div>';
}

// Placeholder function for clustering visualization
function renderClusteringVisualization() {
    const vizContainer = document.getElementById('clusteringViz');
    if (!vizContainer) return;
    
    if (!window.restaurantData.loaded) {
        vizContainer.innerHTML = '<div class="alert alert-info">No restaurant data loaded</div>';
        return;
    }
    
    vizContainer.innerHTML = '<div class="d-flex justify-content-center align-items-center h-100"><div class="alert alert-info">Clustering visualization will be implemented in a future update</div></div>';
}

// Initialize the module when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    initRestaurantVisualizer();
});
