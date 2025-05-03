/**
 * Embeddings Visualization Module for Concierge Analyzer
 * 
 * Provides visualization capabilities for embedding vectors using Plotly.js
 * Dependencies: Plotly.js, embeddings-parser.js
 */

// Create a namespace for embeddings visualization functions
window.EmbeddingsVisualizationModule = (function() {
    // Private variables
    let isInitialized = false;
    let currentVisualization = null;
    let integratedData = null;
    
    // Initialize the module
    function initialize() {
        if (isInitialized) return;
        
        console.log('Initializing Embeddings Visualization Module');
        
        // Set up event listeners for embeddings data loading
        document.addEventListener('embeddingsLoaded', handleEmbeddingsLoaded);
        
        // Listen for integrated data events
        document.addEventListener('integratedDataReady', handleIntegratedDataReady);
        
        // Register with UI controls if available
        if (window.UIControlsModule && window.UIControlsModule.registerSectionCallback) {
            window.UIControlsModule.registerSectionCallback('embeddings-visualization-section', handleSectionActivated);
        }
        
        // Add event listeners for tab navigation
        document.querySelectorAll('#visualizationTabs .nav-link').forEach(tab => {
            tab.addEventListener('shown.bs.tab', handleTabActivated);
        });
        
        // Add event listener for refresh button
        const refreshBtn = document.getElementById('refreshVisualization');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', refreshVisualizations);
        }
        
        // Add event listener for update hierarchy button
        const updateHierarchyBtn = document.getElementById('updateHierarchyViz');
        if (updateHierarchyBtn) {
            updateHierarchyBtn.addEventListener('click', renderCategoryHierarchy);
        }
        
        isInitialized = true;
    }
    
    // Handle when embeddings data is loaded
    function handleEmbeddingsLoaded(event) {
        console.log('Embeddings data loaded', event.detail);
        
        // Check if we're currently on the embeddings visualization section
        const embeddingsSection = document.getElementById('embeddings-visualization-section');
        if (embeddingsSection && embeddingsSection.classList.contains('active')) {
            refreshVisualizations();
        }
    }
    
    // Handle when integrated data is available
    function handleIntegratedDataReady(event) {
        integratedData = event.detail;
        console.log('Embeddings visualization received integrated data');
        
        // Add mention counts to existing category hierarchy
        updateCategoryHierarchyWithIntegratedData();
    }
    
    // Update the category hierarchy visualization with integrated data
    function updateCategoryHierarchyWithIntegratedData() {
        // Only proceed if we're on the embeddings visualization section
        const section = document.getElementById('embeddings-visualization-section');
        if (!section || !section.classList.contains('active')) return;
        
        if (integratedData && window.embeddingsData && window.embeddingsData.loaded) {
            console.log('Enhancing category hierarchy with integrated mention data');
            
            // Update category hierarchy visualization with integrated data
            renderCategoryHierarchy(true);
        }
    }
    
    // Update the category hierarchy card with the latest data
    function updateCategoryHierarchyCard() {
        console.log('Updating category hierarchy card');
        // Use integrated data if available
        renderCategoryHierarchy(!!integratedData);
    }
    
    // Handle when embeddings visualization section is activated
    function handleSectionActivated() {
        console.log('Embeddings visualization section activated');
        
        if (window.embeddingsData && window.embeddingsData.loaded) {
            const activeTabButton = document.querySelector('#visualizationTabs .nav-link.active');
            if (activeTabButton) {
                // Trigger a tab activation event to render the active visualization
                activeTabButton.dispatchEvent(new Event('shown.bs.tab'));
            } else {
                // Default to hierarchy visualization if no active tab
                renderCategoryHierarchy();
            }
        } else {
            showNoEmbeddingsMessage();
        }
    }
    
    // Handle when a visualization tab is activated
    function handleTabActivated(e) {
        if (!window.embeddingsData || !window.embeddingsData.loaded) {
            showNoEmbeddingsMessage();
            return;
        }
        
        const targetId = e.target.getAttribute('data-bs-target').substring(1);
        
        switch (targetId) {
            case 'hierarchy':
                renderCategoryHierarchy();
                break;
            case 'similarity':
                renderSimilarityVisualization();
                break;
            case 'distribution':
                renderDistributionVisualization();
                break;
        }
        
        // Trigger resize event to ensure visualizations render properly
        window.dispatchEvent(new Event('resize'));
    }
    
    // Refresh all visualizations
    function refreshVisualizations() {
        const activeTabButton = document.querySelector('#visualizationTabs .nav-link.active');
        if (activeTabButton) {
            activeTabButton.dispatchEvent(new Event('shown.bs.tab'));
        }
    }
    
    // Show message when no embeddings data is available
    function showNoEmbeddingsMessage() {
        const containers = ['hierarchyViz', 'similarityViz', 'distributionViz'];
        
        containers.forEach(id => {
            const container = document.getElementById(id);
            if (container) {
                container.innerHTML = `
                    <div class="d-flex flex-column align-items-center justify-content-center h-100">
                        <div class="text-center text-muted p-4">
                            <i class="bi bi-cloud-upload fs-1 mb-3"></i>
                            <h5>No Embeddings Data Available</h5>
                            <p>Please upload an embeddings JSON file using the uploader in the sidebar.</p>
                        </div>
                    </div>
                `;
            }
        });
    }
    
    // Extract category hierarchy from embeddings data
    function extractCategoryHierarchy(useIntegratedData = false) {
        if (!window.embeddingsData || !window.embeddingsData.loaded) {
            return null;
        }
        
        // Create a root node for the hierarchy
        const hierarchy = {
            name: "Restaurant Categories",
            children: []
        };
        
        // Use the embeddings categories data
        const categories = window.embeddingsData.categories;
        
        Object.entries(categories).forEach(([category, concepts]) => {
            const categoryNode = {
                name: category,
                children: concepts.map(concept => ({ name: concept, value: 1 }))
            };
            hierarchy.children.push(categoryNode);
        });
        
        // If we should use integrated data and it's available, enhance with mention counts
        if (useIntegratedData && integratedData) {
            // Enhance values with mention counts
            // ... code to incorporate mention counts from integratedData ...
        }
        
        return hierarchy;
    }
    
    // Render category hierarchy visualization, optionally using integrated data
    function renderCategoryHierarchy(useIntegratedData = false) {
        const container = document.getElementById('hierarchyViz');
        if (!container) {
            console.error('Hierarchy visualization container not found');
            return;
        }
        
        if (!window.embeddingsData || !window.embeddingsData.loaded) {
            showNoEmbeddingsMessage();
            return;
        }
        
        try {
            const categoryHierarchy = extractCategoryHierarchy(useIntegratedData);
            
            if (!categoryHierarchy || !categoryHierarchy.children || categoryHierarchy.children.length === 0) {
                container.innerHTML = `
                    <div class="alert alert-warning m-4">
                        No category data found in the embeddings. Please ensure your data follows the expected format.
                    </div>
                `;
                return;
            }
            
            // Get visualization options from form elements
            const vizType = document.getElementById('hierarchyType')?.value || 'sunburst';
            const colorScheme = document.getElementById('hierarchyColorScheme')?.value || 'viridis';
            
            // Clear container before rendering
            container.innerHTML = '';
            
            // Render the appropriate visualization based on selected type
            if (vizType === 'sunburst') {
                renderSunburst(categoryHierarchy, container, colorScheme);
            } else if (vizType === 'treemap') {
                renderTreemap(categoryHierarchy, container, colorScheme);
            } else if (vizType === 'circlepack') {
                renderCirclePacking(categoryHierarchy, container, colorScheme);
            }
        } catch (error) {
            console.error('Error rendering category hierarchy:', error);
            container.innerHTML = `
                <div class="alert alert-danger m-4">
                    Error rendering visualization: ${error.message}
                </div>
            `;
        }
    }
    
    // Render sunburst chart using Plotly
    function renderSunburst(data, container, colorScheme) {
        const labels = [];
        const parents = [];
        const values = [];
        
        // Calculate total number of concepts for the root value
        const totalConcepts = data.children.reduce((sum, category) => sum + category.children.length, 0);
        
        // Add the root
        labels.push(data.name);
        parents.push("");
        values.push(totalConcepts); // Set root value to match sum of all concepts
        
        // Add categories and concepts
        data.children.forEach(category => {
            labels.push(category.name);
            parents.push(data.name);
            values.push(category.children.length);
            
            // Add individual concepts
            category.children.forEach(concept => {
                labels.push(concept.name);
                parents.push(category.name);
                values.push(concept.value);
            });
        });
        
        const trace = {
            type: 'sunburst',
            labels: labels,
            parents: parents,
            values: values,
            outsidetextfont: {size: 20, color: "#377eb8"},
            leaf: {opacity: 0.8},
            marker: {line: {width: 1}},
            branchvalues: 'total'
        };
        
        const layout = {
            margin: {l: 0, r: 0, b: 0, t: 0},
            sunburstcolorway: getColorScheme(colorScheme, data.children.length),
            font: { size: 10 }
        };
        
        Plotly.newPlot(container, [trace], layout);
    }
    
    // Render treemap using Plotly
    function renderTreemap(data, container, colorScheme) {
        const labels = [];
        const parents = [];
        const values = [];
        
        // Calculate total number of concepts for the root value
        const totalConcepts = data.children.reduce((sum, category) => sum + category.children.length, 0);
        
        // Add the root
        labels.push(data.name);
        parents.push("");
        values.push(totalConcepts); // Match the sum of all child values
        
        // Add categories and concepts
        data.children.forEach(category => {
            labels.push(category.name);
            parents.push(data.name);
            values.push(category.children.length);
            
            // Add individual concepts
            category.children.forEach(concept => {
                labels.push(concept.name);
                parents.push(category.name);
                values.push(concept.value);
            });
        });
        
        const trace = {
            type: 'treemap',
            labels: labels,
            parents: parents,
            values: values,
            marker: {
                line: { width: 1 }
            }
        };
        
        const layout = {
            margin: {l: 0, r: 0, b: 0, t: 0},
            treemapcolorway: getColorScheme(colorScheme, data.children.length),
            font: { size: 10 }
        };
        
        Plotly.newPlot(container, [trace], layout);
    }
    
    // Render circle packing using Plotly
    function renderCirclePacking(data, container, colorScheme) {
        // For circle packing, we'll use a treemap with a special squarify algorithm
        // that makes it appear more like circle packing
        const labels = [];
        const parents = [];
        const values = [];
        const ids = [];
        
        // Calculate total number of concepts for the root value
        const totalConcepts = data.children.reduce((sum, category) => sum + category.children.length, 0);
        
        // Add the root
        labels.push(data.name);
        parents.push("");
        values.push(totalConcepts); // Match the sum of all child values
        ids.push("root");
        
        // Add the categories
        data.children.forEach((category, i) => {
            const categoryId = `cat-${i}`;
            labels.push(category.name);
            parents.push("root");
            values.push(category.children.length);
            ids.push(categoryId);
            
            // Add the concepts for this category
            category.children.forEach((concept, j) => {
                labels.push(concept.name);
                parents.push(categoryId);
                values.push(concept.value);
                ids.push(`concept-${i}-${j}`);
            });
        });
        
        const trace = {
            type: 'treemap',
            labels: labels,
            parents: parents,
            values: values,
            ids: ids,
            tiling: {
                packing: 'circlePack'
            },
            marker: {
                line: { width: 1 }
            }
        };
        
        const layout = {
            margin: {l: 0, r: 0, b: 0, t: 0},
            treemapcolorway: getColorScheme(colorScheme, data.children.length),
            font: { size: 10 }
        };
        
        Plotly.newPlot(container, [trace], layout);
    }
    
    // Render semantic similarity visualization
    function renderSimilarityVisualization() {
        const container = document.getElementById('similarityViz');
        if (!container) {
            console.error('Similarity visualization container not found');
            return;
        }
        
        if (!window.embeddingsData || !window.embeddingsData.loaded) {
            showNoEmbeddingsMessage();
            return;
        }
        
        try {
            const vectors = window.embeddingsData.vectors;
            const labels = window.embeddingsData.labels;
            
            if (vectors.length === 0) {
                container.innerHTML = `
                    <div class="alert alert-warning m-4">
                        No vectors found in the embeddings data.
                    </div>
                `;
                return;
            }
            
            // Generate 2D projection using PCA fallback
            // In a production app, we would use t-SNE or UMAP, but for simplicity, we'll use PCA
            const projectedData = performSimplePCA(vectors);
            
            // Clear container before rendering
            container.innerHTML = '';
            
            // Prepare data for plotting
            const trace = {
                x: projectedData.map(p => p[0]),
                y: projectedData.map(p => p[1]),
                mode: 'markers+text',
                type: 'scatter',
                marker: {
                    size: 10,
                    color: vectors.map((_, i) => getColorForLabel(labels[i])),
                    opacity: 0.7
                },
                text: labels.map(label => {
                    if (typeof label === 'object' && label.concept) {
                        return label.concept;
                    }
                    return String(label);
                }),
                textposition: 'top center',
                hoverinfo: 'text',
                hovertext: labels.map(label => {
                    if (typeof label === 'object' && label.concept) {
                        return `${label.category} → ${label.concept}`;
                    }
                    return String(label);
                })
            };
            
            const layout = {
                margin: { l: 40, r: 40, b: 40, t: 20 },
                hovermode: 'closest',
                xaxis: {
                    showticklabels: false,
                    zeroline: false,
                    title: ''
                },
                yaxis: {
                    showticklabels: false,
                    zeroline: false,
                    title: ''
                }
            };
            
            Plotly.newPlot(container, [trace], layout, {
                responsive: true,
                displayModeBar: true,
                modeBarButtons: [[
                    'toImage', 'zoom2d', 'pan2d',
                    'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d'
                ]]
            });
            
        } catch (error) {
            console.error('Error rendering similarity visualization:', error);
            container.innerHTML = `
                <div class="alert alert-danger m-4">
                    Error rendering visualization: ${error.message}
                </div>
            `;
        }
    }
    
    // Render distribution visualization
    function renderDistributionVisualization() {
        const container = document.getElementById('distributionViz');
        if (!container) {
            console.error('Distribution visualization container not found');
            return;
        }
        
        if (!window.embeddingsData || !window.embeddingsData.loaded) {
            showNoEmbeddingsMessage();
            return;
        }
        
        try {
            const categories = window.embeddingsData.categories;
            
            if (!categories || Object.keys(categories).length === 0) {
                container.innerHTML = `
                    <div class="alert alert-warning m-4">
                        No category data found in the embeddings.
                    </div>
                `;
                return;
            }
            
            // Clear container before rendering
            container.innerHTML = '';
            
            // Prepare data for bar chart
            const categoryCounts = Object.entries(categories).map(([category, concepts]) => ({
                category,
                count: concepts.length
            }));
            
            // Sort by count in descending order
            categoryCounts.sort((a, b) => b.count - a.count);
            
            const trace = {
                x: categoryCounts.map(item => item.category),
                y: categoryCounts.map(item => item.count),
                type: 'bar',
                marker: {
                    color: getColorScheme('viridis', categoryCounts.length)
                }
            };
            
            const layout = {
                title: 'Category Distribution',
                xaxis: {
                    title: 'Category',
                    tickangle: -45
                },
                yaxis: {
                    title: 'Number of Concepts'
                },
                margin: {
                    l: 60,
                    r: 20,
                    t: 40,
                    b: 80
                }
            };
            
            Plotly.newPlot(container, [trace], layout, {
                responsive: true,
                displayModeBar: true
            });
            
        } catch (error) {
            console.error('Error rendering distribution visualization:', error);
            container.innerHTML = `
                <div class="alert alert-danger m-4">
                    Error rendering visualization: ${error.message}
                </div>
            `;
        }
    }
    
    // Helper: Get color scheme array
    function getColorScheme(name, count) {
        const schemes = {
            viridis: [
                '#440154', '#482777', '#3F4A8A', '#31678E', '#26838F',
                '#1F9D8A', '#6CCE5A', '#B6DE2B', '#FEE825'
            ],
            plasma: [
                '#0D0887', '#41049D', '#6A00A8', '#8F0DA4', '#B12A90',
                '#D14E72', '#ED7953', '#FBB32F', '#F0F921'
            ],
            category10: [
                '#1F77B4', '#FF7F0E', '#2CA02C', '#D62728', '#9467BD',
                '#8C564B', '#E377C2', '#7F7F7F', '#BCBD22', '#17BECF'
            ]
        };
        
        const scheme = schemes[name] || schemes.viridis;
        
        // If count > scheme.length, we'll repeat colors
        return Array(count).fill().map((_, i) => scheme[i % scheme.length]);
    }
    
    // Helper: Get color for a label
    function getColorForLabel(label) {
        if (typeof label === 'object' && label.category) {
            return hashStringToColor(label.category);
        }
        return hashStringToColor(String(label));
    }
    
    // Helper: Hash string to consistent color
    function hashStringToColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        
        // Convert hash to RGB values
        const r = (hash & 0xFF0000) >> 16;
        const g = (hash & 0x00FF00) >> 8;
        const b = hash & 0x0000FF;
        
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    // Helper: Perform simple PCA (Principal Component Analysis)
    function performSimplePCA(vectors) {
        // This is a very simplified version of PCA
        // In practice, you would use a proper library like ml-pca
        
        // Step 1: Center the data
        const dimensions = vectors[0].length;
        const n = vectors.length;
        
        // Calculate mean for each dimension
        const means = Array(dimensions).fill(0);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < dimensions; j++) {
                means[j] += vectors[i][j] / n;
            }
        }
        
        // Center the data
        const centered = vectors.map(vector => {
            return vector.map((value, j) => value - means[j]);
        });
        
        // Step 2: Calculate covariance matrix
        // For simplicity, we'll just project onto the first two dimensions 
        // that have the highest variance
        
        // Calculate variance for each dimension
        const variances = Array(dimensions).fill(0);
        for (let j = 0; j < dimensions; j++) {
            for (let i = 0; i < n; i++) {
                variances[j] += Math.pow(centered[i][j], 2) / n;
            }
        }
        
        // Find the two dimensions with highest variance
        const dimensionIndices = Array.from({length: dimensions}, (_, i) => i);
        dimensionIndices.sort((a, b) => variances[b] - variances[a]);
        
        const dim1 = dimensionIndices[0];
        const dim2 = dimensionIndices[1];
        
        // Project onto these dimensions
        return centered.map(vector => [vector[dim1], vector[dim2]]);
    }
    
    // Helper: Log visualization data for debugging
    function debugVisData(labels, parents, values) {
        console.log('Visualization data validation:');
        const nodeMap = {};
        
        // Create node map with values
        for (let i = 0; i < labels.length; i++) {
            nodeMap[labels[i]] = {
                value: values[i],
                children: [],
                childrenSum: 0
            };
        }
        
        // Add children
        for (let i = 0; i < parents.length; i++) {
            if (parents[i] && nodeMap[parents[i]]) {
                nodeMap[parents[i]].children.push(labels[i]);
            }
        }
        
        // Calculate children sums
        Object.keys(nodeMap).forEach(key => {
            const node = nodeMap[key];
            node.childrenSum = node.children.reduce((sum, childKey) => {
                return sum + (nodeMap[childKey] ? nodeMap[childKey].value : 0);
            }, 0);
            
            if (node.children.length > 0 && Math.abs(node.value - node.childrenSum) > 0.001) {
                console.warn(`Node "${key}" value (${node.value}) doesn't match sum of children (${node.childrenSum})`);
            }
        });
    }
    
    // Initialize on document ready
    document.addEventListener('DOMContentLoaded', initialize);
    
    // Return public API
    return {
        renderCategoryHierarchy,
        renderSimilarityVisualization,
        renderDistributionVisualization,
        refreshVisualizations,
        updateCategoryHierarchyCard
    };
})();
