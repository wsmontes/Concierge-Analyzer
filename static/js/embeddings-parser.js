/**
 * Embeddings Parser Module for Concierge Analyzer
 * 
 * Handles uploading, parsing, and storing embeddings data from JSON files
 * for use in advanced analysis features.
 */

// Global store for embeddings data
window.embeddingsData = {
    raw: null,         // Raw embeddings data
    vectors: [],       // Extracted vectors
    labels: [],        // Labels for each vector
    categories: {},    // Category -> concepts mapping
    loaded: false      // Whether embeddings have been loaded
};

// Initialize embeddings upload functionality
function initEmbeddingsUpload() {
    console.log('Initializing embeddings upload functionality');
    
    const uploadArea = document.getElementById('embeddings-upload-area');
    const fileInput = document.getElementById('embeddings-file');
    const selectedFileEl = document.getElementById('embeddings-selected-file');
    const uploadPlaceholder = document.querySelector('#embeddings-upload-area .upload-placeholder');
    const fileNameEl = document.querySelector('#embeddings-upload-area .file-name');
    const removeButton = document.getElementById('embeddings-remove-file');
    const statusElement = document.getElementById('embeddings-status');
    
    if (!uploadArea || !fileInput) {
        console.warn('Embeddings upload elements not found');
        return;
    }
    
    // Handle file selection with auto-processing
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            const file = this.files[0];
            
            // Validate file type
            if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
                showEmbeddingsError('Please select a valid JSON file');
                this.value = '';
                return;
            }
            
            // Show selected file info
            showSelectedFile(file.name);
            
            // Auto-process the file
            processEmbeddingsFile(file);
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
        
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            
            // Validate file type
            if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
                showEmbeddingsError('Please select a valid JSON file');
                return;
            }
            
            // Set the file input value
            fileInput.files = e.dataTransfer.files;
            
            // Show selected file info
            showSelectedFile(file.name);
            
            // Auto-process the file
            processEmbeddingsFile(file);
        }
    });
    
    // Handle remove file button
    if (removeButton) {
        removeButton.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Clear the file input
            fileInput.value = '';
            
            // Reset embeddings data
            window.embeddingsData = {
                raw: null,
                vectors: [],
                labels: [],
                categories: {},
                loaded: false
            };
            
            // Hide selected file info
            selectedFileEl.classList.add('d-none');
            uploadPlaceholder.classList.remove('d-none');
            
            // Hide status
            if (statusElement) {
                statusElement.classList.add('d-none');
            }
            
            console.log('Embeddings data cleared');
        });
    }
    
    // Show selected file information
    function showSelectedFile(fileName) {
        if (fileNameEl) {
            fileNameEl.textContent = fileName;
            fileNameEl.title = fileName; // Add tooltip for full filename on hover
        }
        
        selectedFileEl.classList.remove('d-none');
        uploadPlaceholder.classList.add('d-none');
    }
}

// Process embeddings file
function processEmbeddingsFile(file) {
    if (!file) {
        const fileInput = document.getElementById('embeddings-file');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            return;
        }
        file = fileInput.files[0];
    }
    
    const statusElement = document.getElementById('embeddings-status');
    console.log('Processing embeddings file:', file.name);
    
    // Show processing status
    if (statusElement) {
        statusElement.innerHTML = `
            <i class="bi bi-arrow-repeat spin me-1"></i>
            Processing embeddings...
        `;
        statusElement.classList.remove('d-none');
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            const data = JSON.parse(content);
            parseEmbeddingsData(data);
            
            if (statusElement) {
                statusElement.innerHTML = `
                    <i class="bi bi-check-circle-fill text-success me-1"></i>
                    ${window.embeddingsData.vectors.length} embeddings loaded successfully
                `;
            }
            
            // Notify with toast if available
            if (typeof showNotification === 'function') {
                showNotification('Embeddings data loaded successfully!', 'success');
            }
            
        } catch (error) {
            console.error('Error processing embeddings file:', error);
            
            if (statusElement) {
                statusElement.innerHTML = `
                    <i class="bi bi-exclamation-triangle-fill text-danger me-1"></i>
                    Error: ${error.message}
                `;
            }
            
            // Notify with toast if available
            if (typeof showNotification === 'function') {
                showNotification(`Error processing embeddings: ${error.message}`, 'error');
            }
        }
    };
    
    reader.onerror = function() {
        console.error('Error reading embeddings file');
        
        if (statusElement) {
            statusElement.innerHTML = `
                <i class="bi bi-exclamation-triangle-fill text-danger me-1"></i>
                Error reading file
            `;
        }
        
        // Notify with toast if available
        if (typeof showNotification === 'function') {
            showNotification('Error reading embeddings file', 'error');
        }
    };
    
    reader.readAsText(file);
}

// Parse embeddings data from JSON
function parseEmbeddingsData(data) {
    console.log('Parsing embeddings data');
    
    // Store raw data
    window.embeddingsData.raw = data;
    
    // Reset vectors and labels
    const vectors = [];
    const labels = [];
    const categories = {};
    
    if (Array.isArray(data)) {
        console.log('Processing array data format with', data.length, 'items');
        
        // Extract embeddings and categorized labels
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
    } else if (typeof data === 'object') {
        console.log('Processing object data format');
        
        if (data.embeddings || data.vectors) {
            const embeddingsArray = data.embeddings || data.vectors;
            console.log('Found embeddings array with', embeddingsArray.length, 'items');
            
            // Simple array of embeddings
            embeddingsArray.forEach((vector, i) => {
                vectors.push(vector);
                labels.push(`Item ${i+1}`);
            });
        } else {
            // Key-value pairs where each key is a label and value is the embedding
            const keys = Object.keys(data);
            console.log('Processing object with keys as labels, found', keys.length, 'items');
            
            for (const key of keys) {
                if (Array.isArray(data[key])) {
                    vectors.push(data[key]);
                    
                    // Check if key follows pattern "category -> concept"
                    if (key.includes(' -> ')) {
                        const [category, concept] = key.split(' -> ');
                        
                        // Store the category for later use
                        if (!categories[category]) {
                            categories[category] = [];
                        }
                        if (!categories[category].includes(concept)) {
                            categories[category].push(concept);
                        }
                        
                        labels.push({
                            category: category,
                            concept: concept,
                            fullLabel: key
                        });
                    } else {
                        labels.push(key);
                    }
                }
            }
        }
    }
    
    // Validate results
    if (vectors.length === 0) {
        throw new Error('No valid embedding vectors found in the file');
    }
    
    // Ensure all vectors have the same length
    const firstVectorLength = vectors[0].length;
    const validVectors = vectors.filter(v => Array.isArray(v) && v.length === firstVectorLength);
    
    if (validVectors.length !== vectors.length) {
        console.warn(`Found ${vectors.length - validVectors.length} invalid vectors with inconsistent dimensions`);
    }
    
    // Store processed data
    window.embeddingsData.vectors = validVectors;
    window.embeddingsData.labels = labels.slice(0, validVectors.length); // Match labels to valid vectors
    window.embeddingsData.categories = categories;
    window.embeddingsData.loaded = true;
    
    console.log('Embeddings processing completed:', {
        vectors: validVectors.length,
        dimensions: firstVectorLength,
        labels: labels.length,
        categories: Object.keys(categories).length
    });
    
    // Dispatch event for other components to react to
    document.dispatchEvent(new CustomEvent('embeddingsLoaded', {
        detail: window.embeddingsData
    }));
}

// Show error message
function showEmbeddingsError(message) {
    console.error('Embeddings error:', message);
    // Use toast notification if available
    if (typeof showNotification === 'function') {
        showNotification(message, 'error');
    } else {
        alert(message);
    }
}

// Initialize on document ready
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('embeddings-upload-area')) {
        initEmbeddingsUpload();
    }
});
