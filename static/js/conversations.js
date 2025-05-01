/**
 * Conversation management for Concierge Chat Analyzer
 * Handles conversation list display, conversation details, and filtering
 * Dependencies: CONFIG
 */

// Create a namespace to expose functions to other modules
window.ConversationModule = {
    initializeConversationsList: initializeConversationsList,
    loadConversation: loadConversation,
    displayConversation: displayConversation,
    exportConversationToText: exportConversationToText
};

// Initialize conversations list and functionality
function initializeConversationsList(metrics, recommendations) {
    console.log("Initializing conversations list with:", 
                metrics ? `${metrics.length} metrics` : "No metrics", 
                recommendations ? `${recommendations.length} recommendations` : "No recommendations");
    
    const conversationsList = document.getElementById('conversations-list');
    const conversationsCount = document.getElementById('conversations-count');
    
    // Check if the conversations list element exists
    if (!conversationsList) {
        console.error("Conversations list element not found");
        return;
    }
    
    // Clear existing list
    conversationsList.innerHTML = '';
    
    // Check if we have metrics data
    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
        console.warn("No conversation metrics available");
        conversationsList.innerHTML = '<div class="list-group-item text-muted">No conversations available</div>';
        if (conversationsCount) {
            conversationsCount.textContent = "0";
        }
        return;
    }
    
    // Get filter DOM elements
    const resetFiltersBtn = document.getElementById('reset-filters');
    const timeSortToggle = document.getElementById('time-sort-toggle');
    const searchInput = document.getElementById('conversation-search');
    const personaFilter = document.getElementById('persona-filter');
    const accuracyFilter = document.getElementById('accuracy-filter');
    
    // Reset persona filter
    if (personaFilter) {
        personaFilter.innerHTML = '<option value="">All Personas</option>';
    }
    
    // Track all personas for filter
    const personas = new Set();
    
    // Process all metrics to create conversation list
    metrics.forEach(metric => {
        if (!metric) {
            console.warn("Encountered null or undefined metric item");
            return;
        }
        
        const conversationId = metric.conversation_id;
        if (conversationId === undefined || conversationId === null) {
            console.warn("Metric missing conversation_id:", metric);
            return;
        }
        
        // Find corresponding recommendation data if available
        const recommendation = recommendations ? recommendations.find(r => r.conversation_id === conversationId) : null;
        
        // Create list item
        const listItem = document.createElement('a');
        listItem.href = '#';
        listItem.className = 'list-group-item list-group-item-action conversation-list-item';
        
        // Set various data attributes for filtering
        listItem.dataset.conversationId = conversationId;
        
        // Safely get request text
        let requestText = "No request";
        try {
            requestText = metric.request ? metric.request.toLowerCase() : "No request";
            listItem.dataset.request = requestText;
        } catch (e) {
            console.warn(`Error processing request for conversation ${conversationId}:`, e);
        }
        
        // Add response time data for sorting
        if (metric.time_to_recommendation) {
            listItem.dataset.responseTime = metric.time_to_recommendation;
        } else if (metric.time_to_first_response) {
            listItem.dataset.responseTime = metric.time_to_first_response;
        }
        
        // Add persona data if available
        if (metric.persona_id) {
            listItem.dataset.personaId = metric.persona_id;
            personas.add(metric.persona_id);
        }
        
        // Determine accuracy level for filtering
        if ('recommendation_accuracy' in metric) {
            const accuracy = metric.recommendation_accuracy * 100;
            if (accuracy >= 75) {
                listItem.dataset.accuracyLevel = 'high';
            } else if (accuracy >= 50) {
                listItem.dataset.accuracyLevel = 'medium';
            } else {
                listItem.dataset.accuracyLevel = 'low';
            }
        }
        
        // Truncate request for display
        const truncatedRequest = requestText.length > 60 ? requestText.substring(0, 60) + '...' : requestText;
        
        // Create accuracy badge if available
        let accuracyBadge = '';
        if ('recommendation_accuracy' in metric) {
            const accuracy = metric.recommendation_accuracy * 100;
            let badgeClass = 'bg-danger';
            if (accuracy >= 75) {
                badgeClass = 'bg-success';
            } else if (accuracy >= 50) {
                badgeClass = 'bg-warning';
            }
            accuracyBadge = `<span class="badge ${badgeClass} accuracy-badge">${accuracy.toFixed(0)}%</span>`;
        }
        
        // Create persona badge if available
        let personaBadge = '';
        if (metric.persona_id) {
            personaBadge = `<span class="badge bg-info me-1">${metric.persona_id}</span>`;
        }
        
        // Create time badge if available
        let timeBadge = '';
        if (metric.time_to_recommendation) {
            timeBadge = `<span class="badge bg-secondary">${metric.time_to_recommendation.toFixed(1)}s</span>`;
        }
        
        // Set the HTML content
        listItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <strong class="mb-1">Conv. ${conversationId + 1}</strong>
                    ${personaBadge}
                </div>
                <div>
                    ${accuracyBadge}
                    ${timeBadge}
                </div>
            </div>
            <p class="mb-1 text-truncate">${truncatedRequest}</p>
        `;
        
        // Add click handler to load conversation details
        listItem.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all items
            document.querySelectorAll('#conversations-list a').forEach(item => {
                item.classList.remove('active');
            });
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Load conversation details
            loadConversation(conversationId);
        });
        
        // Add the item to the list
        conversationsList.appendChild(listItem);
    });
    
    // Update conversation count
    if (conversationsCount) {
        conversationsCount.textContent = metrics.length;
    }
    
    // Build persona filter options
    if (personaFilter && personas.size > 0) {
        personas.forEach(persona => {
            const option = document.createElement('option');
            option.value = persona;
            option.textContent = persona;
            personaFilter.appendChild(option);
        });
    }
    
    // Apply filters functionality
    if (searchInput && personaFilter && accuracyFilter) {
        // Function to apply filters
        function applyFilters() {
            const searchTerm = searchInput.value.toLowerCase();
            const selectedPersona = personaFilter.value;
            const selectedAccuracy = accuracyFilter.value;
            
            let visibleCount = 0;
            
            // Filter conversation items
            document.querySelectorAll('#conversations-list a').forEach(item => {
                // Check search term
                const matchesSearch = !searchTerm || 
                                    (item.dataset.request && item.dataset.request.includes(searchTerm));
                
                // Check persona filter
                const matchesPersona = !selectedPersona || 
                                    item.dataset.personaId === selectedPersona;
                
                // Check accuracy filter
                const matchesAccuracy = !selectedAccuracy || 
                                    item.dataset.accuracyLevel === selectedAccuracy;
                
                // Show/hide based on filter matches
                if (matchesSearch && matchesPersona && matchesAccuracy) {
                    item.classList.remove('d-none');
                    visibleCount++;
                } else {
                    item.classList.add('d-none');
                }
            });
            
            // Update count
            if (conversationsCount) {
                conversationsCount.textContent = visibleCount;
            }
        }
        
        // Add event listeners
        searchInput.addEventListener('input', applyFilters);
        personaFilter.addEventListener('change', applyFilters);
        accuracyFilter.addEventListener('change', applyFilters);
        
        // Reset filters button
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', function() {
                searchInput.value = '';
                personaFilter.selectedIndex = 0;
                accuracyFilter.selectedIndex = 0;
                applyFilters();
            });
        }
    }
    
    // Sort by response time toggle
    if (timeSortToggle) {
        timeSortToggle.addEventListener('change', function() {
            const listItems = Array.from(document.querySelectorAll('#conversations-list a'));
            const sortedItems = listItems.sort((a, b) => {
                if (timeSortToggle.checked) {
                    return (parseFloat(a.dataset.responseTime) || 999) - (parseFloat(b.dataset.responseTime) || 999);
                } else {
                    return parseInt(a.dataset.conversationId) - parseInt(b.dataset.conversationId);
                }
            });
            
            // Re-append in sorted order
            const parentList = document.getElementById('conversations-list');
            parentList.innerHTML = '';
            sortedItems.forEach(item => parentList.appendChild(item));
        });
    }
    
    // Select first conversation by default if available
    const firstConversation = conversationsList.querySelector('.conversation-list-item');
    if (firstConversation) {
        firstConversation.click();
    }
}

// Load conversation details
function loadConversation(conversationId) {
    // Fetch conversation details
    fetch(`${CONFIG.API_URL}/conversation/${conversationId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load conversation');
            }
            return response.json();
        })
        .then(conversation => {
            // Reset debug toggle to default state (off)
            const debugToggle = document.getElementById('debug-toggle');
            if (debugToggle) {
                debugToggle.checked = false;
            }
            
            const conversationContainer = document.getElementById('conversation-container');
            if (conversationContainer) {
                conversationContainer.classList.add('hide-debug');
            }
            
            // Display conversation
            displayConversation(conversation, conversationId);
        })
        .catch(error => {
            console.error('Error loading conversation:', error);
        });
}

// Display conversation details
function displayConversation(conversation, conversationId) {
    // Get DOM elements
    const conversationDetails = document.getElementById('conversation-details');
    const conversationContainer = document.getElementById('conversation-container');
    const conversationTitle = document.getElementById('conversation-title');
    const conversationPersonaDetails = document.getElementById('conversation-persona-details');
    const personaBadge = document.getElementById('persona-badge');
    const debugToggle = document.getElementById('debug-toggle');

    // Hide placeholder, show details
    document.getElementById('no-conversation-placeholder').classList.add('d-none');
    conversationDetails.classList.remove('d-none');
    
    // Set conversation title
    conversationTitle.textContent = `Conversation ${parseInt(conversationId) + 1}`;
    
    // Clear previous content
    conversationContainer.innerHTML = '';
    conversationPersonaDetails.innerHTML = '';
    
    // Set up debug toggle functionality
    debugToggle.addEventListener('change', function() {
        if (this.checked) {
            conversationContainer.classList.remove('hide-debug');
        } else {
            conversationContainer.classList.add('hide-debug');
        }
    });
    
    // Hide debug messages by default
    conversationContainer.classList.add('hide-debug');
    
    // Format and display conversation date
    const firstMsg = conversation[0];
    if (firstMsg && firstMsg.timestamp) {
        const msgDate = new Date(firstMsg.timestamp);
        document.getElementById('conv-date').textContent = msgDate.toLocaleDateString();
    }

    // Set message count
    document.getElementById('conv-message-count').textContent = `${conversation.length} messages`;
    
    // Calculate and display time metrics
    let requestTime = null;
    let firstResponseTime = null;
    let recommendationTime = null;

    conversation.forEach(msg => {
        if (msg.type === 'user_request' && !requestTime) {
            requestTime = new Date(msg.timestamp);
        }
        if (msg.sender !== 'Wagner' && msg.type !== 'debug' && !firstResponseTime) {
            firstResponseTime = new Date(msg.timestamp);
        }
        if (msg.type === 'recommendation' && !recommendationTime) {
            recommendationTime = new Date(msg.timestamp);
        }
    });

    if (requestTime && firstResponseTime) {
        const timeToFirst = (firstResponseTime - requestTime) / 1000;
        document.getElementById('conv-time-to-first').textContent = `${timeToFirst.toFixed(1)}s to first response`;
    }

    if (requestTime && recommendationTime) {
        const timeToRec = (recommendationTime - requestTime) / 1000;
        document.getElementById('conv-time-to-rec').textContent = `${timeToRec.toFixed(1)}s to recommendation`;
    }
    
    // Display persona information if available
    const personaId = firstMsg.persona_id;
    const personaDescription = firstMsg.persona_description;
    
    if (personaId) {
        personaBadge.textContent = personaId;
        personaBadge.classList.remove('d-none');
        
        if (personaDescription) {
            // Create persona details section
            const personaCard = document.createElement('div');
            personaCard.className = 'card mb-3';
            
            personaCard.innerHTML = `
                <div class="card-header bg-info bg-opacity-10">
                    <i class="bi bi-person me-2"></i>Persona Profile
                </div>
                <div class="card-body">
                    <p class="mb-2"><strong>ID:</strong> ${personaId}</p>
                    <p class="mb-2"><strong>Description:</strong> ${personaDescription}</p>
                </div>
            `;
            conversationPersonaDetails.appendChild(personaCard);
        }
    } else {
        personaBadge.classList.add('d-none');
    }
    
    // Display messages
    conversation.forEach((msg, index) => {
        const messageDiv = document.createElement('div');
        
        // Determine message class based on type
        if (msg.type === 'user_request') {
            messageDiv.className = 'message user';
        } else if (msg.type === 'debug') {
            messageDiv.className = 'message debug';
        } else {
            messageDiv.className = 'message concierge';
        }
        
        // Format timestamp
        let formattedTime = '';
        if (msg.timestamp) {
            const msgTime = new Date(msg.timestamp);
            formattedTime = msgTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        // Create message content
        let messageContent = `
            <div class="message-timestamp">${formattedTime}</div>
            <div class="message-sender">${msg.sender}</div>
            <div class="message-content">${msg.content.replace(/\n/g, '<br>')}</div>
        `;
        
        // Add debug info if available
        if (msg.type === 'debug' && msg.debug_info) {
            messageContent += `
                <div class="mt-2">
                    <strong>Debug Type:</strong> ${msg.debug_info.type}
                </div>
            `;
            
            // Show the first few items from debug data
            if (msg.debug_info.data) {
                let dataPreview = '';
                
                if (Array.isArray(msg.debug_info.data)) {
                    dataPreview = msg.debug_info.data.slice(0, 3).join(', ');
                    if (msg.debug_info.data.length > 3) {
                        dataPreview += ` ...and ${msg.debug_info.data.length - 3} more`;
                    }
                } else if (typeof msg.debug_info.data === 'object') {
                    const keys = Object.keys(msg.debug_info.data);
                    dataPreview = keys.slice(0, 3).join(', ');
                    if (keys.length > 3) {
                        dataPreview += ` ...and ${keys.length - 3} more keys`;
                    }
                }
                
                messageContent += `
                    <div>
                        <strong>Data:</strong> ${dataPreview}
                    </div>
                `;
            }
        }
        
        messageDiv.innerHTML = messageContent;
        conversationContainer.appendChild(messageDiv);
    });
    
    // Add export functionality
    document.getElementById('export-conversation').onclick = function() {
        exportConversationToText(conversation, conversationId);
    };
}

// Export conversation to text file
function exportConversationToText(conversation, conversationId) {
    // Format the conversation as text
    let text = `Conversation ${parseInt(conversationId) + 1}\n`;
    text += `=============================\n\n`;
    
    // Add persona info if available
    if (conversation[0].persona_id) {
        text += `Persona: ${conversation[0].persona_id}\n`;
        if (conversation[0].persona_description) {
            text += `Description: ${conversation[0].persona_description}\n`;
        }
        text += `\n`;
    }
    
    // Add messages
    conversation.forEach(msg => {
        const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
        text += `${time} - ${msg.sender} (${msg.type}):\n`;
        text += `${msg.content}\n\n`;
    });
    
    // Add evaluation if available
    conversation.forEach(msg => {
        if (msg.type === 'recommendation' && msg.recommendation_evaluation) {
            const eval = msg.recommendation_evaluation;
            text += `\nRECOMMENDATION EVALUATION:\n`;
            text += `===========================\n`;
            text += `Accuracy: ${(eval.accuracy * 100).toFixed(0)}%\n`;
            text += `Precision: ${(eval.precision * 100).toFixed(0)}%\n`;
            text += `Recall: ${(eval.recall * 100).toFixed(0)}%\n`;
            text += `\nEXPECTED RESTAURANTS:\n`;
            eval.expected_recommendations.forEach((r, i) => {
                text += `${i+1}. ${r}\n`;
            });
            
            text += `\nACTUAL RECOMMENDATIONS:\n`;
            eval.actual_recommendations.forEach((r, i) => {
                text += `${i+1}. ${r}\n`;
            });
        }
    });
    
    // Create and trigger download
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation_${parseInt(conversationId) + 1}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
