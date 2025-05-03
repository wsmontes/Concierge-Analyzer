/**
 * Conversations functionality for Concierge Chat Analyzer
 * Handles rendering and interaction with conversation data
 * Dependencies: UIControls
 */

// Store conversation data for deferred rendering
let conversationMetrics = [];
let recommendationsData = [];
let selectedConversation = null;
let isRendering = false;
let isConversationsSectionActive = false;
let integratedData = null;

// Create a namespace to expose functions to other modules
window.ConversationModule = {
    initializeConversationsList: initializeConversationsList,
    getSelectedConversation: function() { return selectedConversation; },
    renderConversations: function() { 
        renderConversationList(conversationMetrics); 
    }
};

// Initialize conversations list
function initializeConversationsList(metrics, recommendations) {
    console.log("Initializing conversations list with:", metrics.length, "metrics", recommendations.length, "recommendations");
    
    // Store the data for later use
    conversationMetrics = metrics;
    recommendationsData = recommendations;
    
    // Listen for integrated data events
    document.addEventListener('integratedDataReady', function(event) {
        integratedData = event.detail;
        console.log('Conversations module received integrated data');
        
        // If the conversation detail is currently shown, update it with relationship data
        if (selectedConversation) {
            updateCurrentConversationWithIntegratedData();
        }
    });
    
    // Check if conversations section exists before proceeding
    const conversationsSection = document.getElementById('conversations-section');
    if (!conversationsSection) {
        console.error("Conversations section not found in DOM");
        return;
    }
    
    // Add section-specific class to ensure proper containment
    ensureProperContainment();
    
    // Set up event listeners for conversation list filters
    setupFilterEventListeners();
    
    // Add window resize listener to adjust UI on screen size changes
    window.addEventListener('resize', adjustUIForScreenSize);
    
    // Initial UI adjustment
    adjustUIForScreenSize();
    
    // Set up custom event listener for forced rendering
    document.addEventListener('conversation:render', function(event) {
        console.log("Received conversation:render event");
        
        // Only proceed if conversations section is active and not already rendering
        if (isConversationsSectionActive && !isRendering) {
            tryRenderConversationList();
        }
    });
    
    // Set up listener for section activation
    document.addEventListener('section:activated', function(event) {
        if (event.detail.sectionId === 'conversations-section') {
            console.log("Conversations section activated via event");
            isConversationsSectionActive = true;
            tryRenderConversationList();
            
            // Adjust UI for current screen size when section becomes active
            adjustUIForScreenSize();
        } else {
            isConversationsSectionActive = false;
        }
    });
    
    // Initial check if section is already active
    isConversationsSectionActive = conversationsSection.classList.contains('active');
    if (isConversationsSectionActive) {
        console.log("Conversations section is already active, queueing render");
        // Use setTimeout to avoid rendering during initialization
        setTimeout(function() {
            tryRenderConversationList();
            adjustUIForScreenSize();
        }, 300);
    }
}

// Ensure proper CSS containment for conversations
function ensureProperContainment() {
    // Add section-specific classes to all conversation elements
    document.querySelectorAll('#conversations-section .card, #conversations-section .conversation-filter-container, #conversations-section #conversation-list, #conversations-section #conversation-details, #conversations-section #conversation-placeholder').forEach(element => {
        if (!element.classList.contains('conversations-section-content')) {
            element.classList.add('conversations-section-content');
        }
    });
    
    // Add containment styles if they don't exist
    if (!document.getElementById('conversation-containment-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'conversation-containment-styles';
        styleEl.textContent = `
            /* Ensure conversations only appear in their section */
            .content-section:not(#conversations-section) .conversations-section-content {
                display: none !important;
                visibility: hidden !important;
            }
            
            /* Only show conversation content when section is active */
            #conversations-section.active .conversations-section-content {
                display: block !important;
                visibility: visible !important;
            }
            
            /* Hide conversation content when section is not active */
            #conversations-section:not(.active) .conversations-section-content {
                display: none !important;
                visibility: hidden !important;
            }
        `;
        document.head.appendChild(styleEl);
    }
}

// Try to render conversation list if possible
function tryRenderConversationList() {
    if (isRendering) {
        console.log("Already rendering conversation list, skipping");
        return;
    }
    
    // Check if conversations section is active
    const conversationsSection = document.getElementById('conversations-section');
    if (!conversationsSection || !conversationsSection.classList.contains('active')) {
        console.log("Conversations section is not active, skipping render");
        return;
    }
    
    const conversationList = document.getElementById('conversation-list');
    if (!conversationList) {
        console.error("Conversation list element not found");
        return;
    }
    
    // Check if we need to render (empty or force)
    if (conversationList.children.length === 0) {
        isRendering = true;
        
        try {
            console.log("Rendering conversation list with", conversationMetrics.length, "items");
            renderConversationList(conversationMetrics);
            
            // Set conversation count in UI
            const countElement = document.getElementById('conversations-count');
            if (countElement) {
                countElement.textContent = conversationMetrics.length;
            }
            
            console.log("Conversation list rendered successfully");
        } catch (error) {
            console.error("Error rendering conversation list:", error);
            
            // Show error in the conversation list
            conversationList.innerHTML = `
                <div class="alert alert-danger m-3">
                    <strong>Error rendering conversations:</strong> ${error.message}
                </div>
            `;
        } finally {
            isRendering = false;
        }
    }
}

// Render the conversation list with the provided metrics
function renderConversationList(metrics) {
    // Get the conversation list element
    const conversationList = document.getElementById('conversation-list');
    if (!conversationList) {
        console.error("Conversation list element not found");
        return;
    }
    
    // Clear existing list
    conversationList.innerHTML = '';
    
    // Check if we have metrics to display
    if (!metrics || metrics.length === 0) {
        conversationList.innerHTML = '<div class="alert alert-info m-3">No conversation data available</div>';
        return;
    }
    
    // Add each conversation to the list
    metrics.forEach((metric, index) => {
        const listItem = createConversationListItem(metric, index);
        conversationList.appendChild(listItem);
    });
    
    // Select first conversation by default if none is selected
    if (!selectedConversation && metrics.length > 0) {
        const firstItem = conversationList.querySelector('.conversation-list-item');
        if (firstItem) {
            firstItem.click();
        }
    }
}

// Create a conversation list item
function createConversationListItem(metric, index) {
    const item = document.createElement('div');
    item.className = 'conversation-list-item';
    item.dataset.conversationId = index;
    
    // Format request text
    const request = metric.request || 'No request';
    const truncatedRequest = request.length > 60 ? request.substring(0, 60) + '...' : request;
    
    // Create item content
    item.innerHTML = `
        <div class="d-flex w-100 justify-content-between">
            <h6 class="mb-1">Conversation ${index + 1}</h6>
            ${metric.persona_id ? `<span class="badge bg-info">Persona ${metric.persona_id}</span>` : ''}
        </div>
        <p class="mb-1 text-truncate">${truncatedRequest}</p>
        <small class="text-muted">
            ${metric.time_to_recommendation ? `Response time: ${metric.time_to_recommendation.toFixed(1)}s` : 'No timing data'}
        </small>
    `;
    
    // Add click event to show conversation details using our responsive handler
    item.addEventListener('click', function() {
        handleConversationClick(index);
    });
    
    return item;
}

// Load conversation details
function loadConversationDetails(conversationId) {
    // Set selected conversation
    selectedConversation = conversationId;
    
    // Get container elements
    const detailsContainer = document.getElementById('conversation-details');
    const placeholder = document.getElementById('conversation-placeholder');
    
    if (!detailsContainer) {
        console.error("Conversation details container not found");
        return;
    }
    
    // Show loading state
    detailsContainer.classList.remove('d-none');
    detailsContainer.innerHTML = `
        <div class="card-body text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading conversation details...</span>
            </div>
            <p class="mt-2">Loading conversation ${conversationId + 1}...</p>
        </div>
    `;
    
    // Hide placeholder
    if (placeholder) {
        placeholder.classList.add('d-none');
    }
    
    // Fetch conversation details from server
    fetch(`${CONFIG.API_URL}/conversation/${conversationId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load conversation');
            return response.json();
        })
        .then(conversation => {
            displayConversationDetails(conversation, conversationId);
        })
        .catch(error => {
            console.error("Error loading conversation details:", error);
            detailsContainer.innerHTML = `
                <div class="card-body">
                    <div class="alert alert-danger">
                        <h5><i class="bi bi-exclamation-triangle me-2"></i>Error Loading Conversation</h5>
                        <p>${error.message}</p>
                    </div>
                </div>
            `;
        });
}

// Display conversation details
function displayConversationDetails(conversation, conversationId) {
    const detailsContainer = document.getElementById('conversation-details');
    if (!detailsContainer) return;
    
    // Find the related metric
    const metric = conversationMetrics.find(m => m.conversation_id === conversationId);
    
    // Find user request
    const userRequest = conversation.find(msg => msg.type === 'user_request');
    
    // Start building HTML
    let html = `
        <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">
                <i class="bi bi-chat-text me-2"></i>
                Conversation ${conversationId + 1}
            </h5>
            <div>
                <button type="button" class="btn btn-sm btn-outline-primary toggle-debug-btn">
                    <i class="bi bi-bug"></i> Show Debug
                </button>
            </div>
        </div>
        <div class="card-body conversation-container">
    `;
    
    // Add request and metrics section
    if (userRequest) {
        html += `
            <div class="conversation-header">
                <div class="conversation-title">
                    <i class="bi bi-question-circle"></i> User Request
                </div>
                <div class="user-request">${userRequest.content}</div>
            </div>
        `;
    }
    
    // Add metrics pills
    html += `<div class="conversation-metrics">`;
    
    if (metric) {
        if (metric.time_to_first_response) {
            html += `
                <div class="metric-pill">
                    <i class="bi bi-lightning-charge"></i>
                    First response: ${metric.time_to_first_response.toFixed(1)}s
                </div>
            `;
        }
        
        if (metric.time_to_recommendation) {
            html += `
                <div class="metric-pill">
                    <i class="bi bi-clock"></i>
                    Recommendation: ${metric.time_to_recommendation.toFixed(1)}s
                </div>
            `;
        }
        
        if (metric.persona_id) {
            html += `
                <div class="metric-pill">
                    <i class="bi bi-person"></i>
                    Persona: ${metric.persona_id}
                </div>
            `;
        }
    }
    
    html += `</div>`;
    
    // Add messages
    html += `<div class="messages-container">`;
    
    conversation.forEach(msg => {
        // Skip user request since we already showed it
        if (msg.type === 'user_request' && msg === userRequest) {
            return;
        }
        
        let messageClass = '';
        switch(msg.type) {
            case 'user_request':
                messageClass = 'user';
                break;
            case 'recommendation':
                messageClass = 'concierge';
                break;
            case 'debug':
                messageClass = 'debug';
                break;
            default:
                messageClass = 'concierge';
        }
        
        html += `
            <div class="message ${messageClass}">
                <div class="message-sender">${msg.sender}</div>
                <div class="message-timestamp">${formatTimestamp(msg.timestamp)}</div>
                <div class="message-content">${msg.content}</div>
            </div>
        `;
    });
    
    html += `</div></div>`;
    
    // Update the container
    detailsContainer.innerHTML = html;
    
    // Add event listener for debug toggle
    const debugToggle = detailsContainer.querySelector('.toggle-debug-btn');
    if (debugToggle) {
        debugToggle.addEventListener('click', function() {
            const messagesContainer = detailsContainer.querySelector('.messages-container');
            if (messagesContainer) {
                messagesContainer.classList.toggle('hide-debug');
                
                // Update button text
                const isHidden = messagesContainer.classList.contains('hide-debug');
                this.innerHTML = isHidden ? 
                    '<i class="bi bi-bug"></i> Show Debug' : 
                    '<i class="bi bi-bug"></i> Hide Debug';
            }
        });
        
        // Hide debug messages by default
        const messagesContainer = detailsContainer.querySelector('.messages-container');
        if (messagesContainer) {
            messagesContainer.classList.add('hide-debug');
        }
    }
    
    // Update current conversation view with integrated data
    updateCurrentConversationWithIntegratedData();
}

// Update current conversation view with integrated data
function updateCurrentConversationWithIntegratedData() {
    if (!selectedConversation || !integratedData) return;
    
    // Find relationships for this conversation
    const conversationId = selectedConversation.id;
    const relationships = integratedData.relationships.filter(rel => 
        rel.conversationId === conversationId);
    
    if (relationships.length > 0) {
        console.log(`Found ${relationships.length} relationships for conversation ${conversationId}`);
        
        // Get or create relationship container
        let relationshipContainer = document.getElementById('conversation-relationships');
        if (!relationshipContainer) {
            relationshipContainer = document.createElement('div');
            relationshipContainer.id = 'conversation-relationships';
            relationshipContainer.className = 'concept-relationships mt-4';
            
            // Find where to insert it
            const detailsContainer = document.querySelector('.conversation-details');
            if (detailsContainer) {
                detailsContainer.appendChild(relationshipContainer);
            }
        }
        
        // Group relationships by concept
        const conceptRelationships = {};
        relationships.forEach(rel => {
            if (!conceptRelationships[rel.concept]) {
                conceptRelationships[rel.concept] = [];
            }
            conceptRelationships[rel.concept].push(rel.restaurant);
        });
        
        // Build UI for relationships
        let html = `
            <h5 class="mb-3"><i class="bi bi-diagram-3 me-2"></i>Concept-Restaurant Relationships</h5>
            <div class="relationship-items">
        `;
        
        Object.entries(conceptRelationships).forEach(([concept, restaurants]) => {
            html += `
                <div class="relationship-item mb-3 p-3 border rounded">
                    <div class="concept-name fw-bold">${concept}</div>
                    <div class="restaurant-list mt-2">
                        <span class="text-muted me-2">Restaurants:</span>
                        ${restaurants.map(r => `<span class="badge bg-secondary me-1">${r}</span>`).join('')}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        relationshipContainer.innerHTML = html;
    }
}

// Helper to format timestamp
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    
    let date;
    if (typeof timestamp === 'string') {
        date = new Date(timestamp);
    } else {
        date = new Date(timestamp);
    }
    
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// Set up event listeners for filtering conversations
function setupFilterEventListeners() {
    const filterInput = document.getElementById('conversation-filter');
    if (filterInput) {
        filterInput.addEventListener('input', function() {
            filterConversations(this.value);
        });
    } else {
        console.warn("Conversation filter input not found");
    }
    
    const filterButtons = document.querySelectorAll('.conversation-filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active state
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Apply filter
            const filterType = this.dataset.filter;
            applyFilterByType(filterType);
        });
    });
}

// Filter conversations by text input
function filterConversations(searchText) {
    const items = document.querySelectorAll('.conversation-list-item');
    const lowerSearch = searchText.toLowerCase();
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        const visible = text.includes(lowerSearch);
        item.style.display = visible ? 'block' : 'none';
    });
}

// Apply filter by type
function applyFilterByType(filterType) {
    if (filterType === 'all') {
        // Show all conversations
        renderConversationList(conversationMetrics);
        return;
    }
    
    let filteredMetrics;
    
    if (filterType === 'with-persona') {
        filteredMetrics = conversationMetrics.filter(metric => metric.persona_id);
    } else if (filterType === 'with-recommendations') {
        filteredMetrics = conversationMetrics.filter(metric => 
            recommendationsData.some(rec => rec.conversation_id === metric.conversation_id));
    } else {
        filteredMetrics = conversationMetrics;
    }
    
    renderConversationList(filteredMetrics);
}

// Adjust UI based on current screen size
function adjustUIForScreenSize() {
    const isMobile = window.innerWidth < 992;
    const conversationList = document.getElementById('conversation-list');
    const conversationDetails = document.getElementById('conversation-details');
    const placeholder = document.getElementById('conversation-placeholder');
    
    if (!conversationList) return;
    
    // On mobile, if a conversation is selected, show only the details
    if (isMobile && selectedConversation !== null && conversationDetails && !conversationDetails.classList.contains('d-none')) {
        // Add a back button if not already present
        if (!document.getElementById('back-to-list-btn')) {
            const backButton = document.createElement('button');
            backButton.id = 'back-to-list-btn';
            backButton.className = 'btn btn-sm btn-outline-secondary mb-2';
            backButton.innerHTML = '<i class="bi bi-arrow-left"></i> Back to List';
            backButton.addEventListener('click', function() {
                // Show list, hide details
                const container = conversationList.closest('.col-lg-4');
                if (container) container.style.display = 'block';
                const detailsContainer = conversationDetails.closest('.col-lg-8');
                if (detailsContainer) detailsContainer.style.display = 'none';
            });
            
            // Insert at the top of the details section
            const detailsContainer = conversationDetails.closest('.col-lg-8');
            if (detailsContainer) {
                detailsContainer.insertBefore(backButton, detailsContainer.firstChild);
            }
        }
    } else {
        // On desktop or when no conversation is selected, remove any back buttons
        const backButton = document.getElementById('back-to-list-btn');
        if (backButton) backButton.remove();
    }
}

// Handle conversation item click with responsive behavior
function handleConversationClick(conversationId) {
    // Set selected conversation
    selectedConversation = conversationId;
    
    // Remove active state from other items
    document.querySelectorAll('.conversation-list-item').forEach(i => {
        i.classList.remove('active');
    });
    
    // Find and set this item as active
    const clickedItem = document.querySelector(`.conversation-list-item[data-conversation-id="${conversationId}"]`);
    if (clickedItem) {
        clickedItem.classList.add('active');
    }
    
    // Show conversation details
    loadConversationDetails(conversationId);
    
    // On mobile, hide the list and show only the details
    if (window.innerWidth < 992) {
        const listContainer = document.querySelector('#conversations-section .col-lg-4');
        const detailsContainer = document.querySelector('#conversations-section .col-lg-8');
        
        if (listContainer && detailsContainer) {
            listContainer.style.display = 'none';
            detailsContainer.style.display = 'block';
        }
    }
}
