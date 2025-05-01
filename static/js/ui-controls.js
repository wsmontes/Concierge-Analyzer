/**
 * UI Controls functionality for Concierge Chat Analyzer
 * Handles sidebar navigation, theme switching, and responsive behaviors
 * Dependencies: bootstrap, ConversationModule, DebugInsightsModule
 */

// Track the currently active section
let currentActiveSection = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI controls
    initializeSidebar();
    initializeThemeToggle();
    initializeFileUploadUI();
    
    // Handle navigation between sections
    initializeSectionNavigation();
});

// Initialize sidebar controls
function initializeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mobileToggle = document.getElementById('mobile-sidebar-toggle');
    const sidebarClose = document.getElementById('sidebar-toggle-btn');
    
    // Mobile sidebar toggle
    if (mobileToggle) {
        mobileToggle.addEventListener('click', function() {
            sidebar.classList.add('show');
        });
    }
    
    // Close sidebar on mobile
    if (sidebarClose) {
        sidebarClose.addEventListener('click', function() {
            sidebar.classList.remove('show');
        });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
        const isClickInsideSidebar = sidebar.contains(event.target);
        const isClickOnToggle = mobileToggle && mobileToggle.contains(event.target);
        
        if (!isClickInsideSidebar && !isClickOnToggle && sidebar.classList.contains('show')) {
            sidebar.classList.remove('show');
        }
    });
}

// Initialize theme toggle
function initializeThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    
    // Toggle theme on button click
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const currentTheme = htmlElement.getAttribute('data-bs-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
    
    // Set theme and update UI
    function setTheme(theme) {
        htmlElement.setAttribute('data-bs-theme', theme);
        
        if (themeToggle) {
            const themeIcon = themeToggle.querySelector('i');
            if (theme === 'dark') {
                themeIcon.classList.remove('bi-sun');
                themeIcon.classList.add('bi-moon');
            } else {
                themeIcon.classList.remove('bi-moon');
                themeIcon.classList.add('bi-sun');
            }
        }
    }
}

// Initialize section navigation
function initializeSectionNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.content-section');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetSectionId = this.getAttribute('data-target');
            if (!targetSectionId) return;
            
            // Clean up previous section
            if (currentActiveSection) {
                cleanupSection(currentActiveSection);
            }
            
            // Deactivate all menu items and sections
            menuItems.forEach(mi => mi.classList.remove('active'));
            sections.forEach(section => {
                section.classList.remove('active');
                // Hide all section-specific content
                section.querySelectorAll('.conversations-section-content, .dashboard-section-content, .recommendations-section-content, .personas-section-content, .debug-insights-section-content').forEach(el => {
                    el.style.visibility = 'hidden';
                    el.style.display = 'none';
                });
            });
            
            // Activate the clicked menu item
            this.classList.add('active');
            
            // Activate the target section
            const targetSection = document.getElementById(targetSectionId);
            if (targetSection) {
                targetSection.classList.add('active');
                
                // Show section-specific content
                const contentClass = targetSectionId.replace('-section', '-section-content');
                targetSection.querySelectorAll('.' + contentClass).forEach(el => {
                    el.style.visibility = 'visible';
                    el.style.display = 'block';
                });
                
                // Remember the active section
                currentActiveSection = targetSectionId;
                
                // Update page title
                document.getElementById('current-section-title').textContent = 
                    this.querySelector('a').textContent.trim();
                
                // Trigger section-specific initialization
                triggerSectionInit(targetSectionId);
                
                // Dispatch event for other modules
                document.dispatchEvent(new CustomEvent('section:activated', {
                    detail: { sectionId: targetSectionId }
                }));
            }
        });
    });
}

// Clean up a section before hiding it
function cleanupSection(sectionId) {
    console.log(`Cleaning up section: ${sectionId}`);
    
    // Dispatch cleanup event for the section
    const cleanupEvent = new CustomEvent('section:cleanup', {
        detail: { sectionId: sectionId }
    });
    document.dispatchEvent(cleanupEvent);
}

// Trigger section-specific initialization logic
function triggerSectionInit(sectionId) {
    console.log(`Triggering initialization for section: ${sectionId}`);
    
    // Ensure any floating/absolute positioned elements from other sections are hidden
    document.querySelectorAll('.content-section').forEach(section => {
        if (section.id !== sectionId) {
            section.querySelectorAll('.section-content').forEach(content => {
                content.style.visibility = 'hidden';
                content.style.display = 'none';
            });
        }
    });
    
    // Handle section-specific initialization
    switch(sectionId) {
        case 'conversations-section':
            initializeConversationsSection();
            break;
        case 'debug-insights-section':
            initializeDebugInsightsSection();
            break;
        // Add other sections as needed
    }
    
    // Dispatch a custom event that can be listened to by other modules
    const event = new CustomEvent('section:activated', { 
        detail: { sectionId: sectionId }
    });
    document.dispatchEvent(event);
    
    // Ensure proper visibility for current section content
    const currentSection = document.getElementById(sectionId);
    if (currentSection) {
        // Make sure section-specific content is visible
        currentSection.querySelectorAll('.section-content').forEach(content => {
            content.style.visibility = 'visible';
            content.style.display = 'block';
        });
    }
}

// Initialize conversations section
function initializeConversationsSection() {
    console.log("Initializing conversations section");
    
    // Check if the conversations module is available
    if (window.ConversationModule) {
        // Force visibility of conversation elements
        document.querySelectorAll('.conversations-section-content').forEach(element => {
            element.style.visibility = 'visible';
            element.style.display = 'block';
        });
        
        // Check if the conversation list exists and needs rendering
        const conversationList = document.getElementById('conversation-list');
        if (conversationList) {
            try {
                // Force a re-render of the conversation list
                const event = new CustomEvent('conversation:render');
                document.dispatchEvent(event);
                
                // Add delay to ensure DOM is ready for rendering
                setTimeout(() => {
                    // Check if list was populated
                    if (conversationList.children.length === 0) {
                        showNotification("Conversations data loading failed. Try refreshing the page.", 'warning');
                    }
                }, 500);
            } catch (error) {
                console.error("Error initializing conversations section:", error);
                showNotification("Error loading conversations: " + error.message, 'error');
            }
        }
    } else {
        console.warn("ConversationModule not available");
        showNotification("Conversations module not available", 'warning');
    }
}

// Initialize debug insights section
function initializeDebugInsightsSection() {
    console.log("Initializing debug insights section");
    
    // Check if debug insights module is available
    if (window.DebugInsightsModule) {
        try {
            // Force charts re-rendering through custom event
            const event = new CustomEvent('debugInsights:render');
            document.dispatchEvent(event);
        } catch (error) {
            console.error("Error initializing debug insights section:", error);
            showNotification("Error loading debug insights: " + error.message, 'error');
        }
    } else {
        console.warn("DebugInsightsModule not available");
        showNotification("Debug insights module not available", 'warning');
    }
}

// File upload UI handling with automatic submission
function initializeFileUploadUI() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('chat-file');
    const selectedFileEl = document.getElementById('selected-file');
    const uploadPlaceholder = document.querySelector('.upload-placeholder');
    const fileNameEl = document.querySelector('.file-name');
    const removeButton = document.getElementById('remove-file');
    
    if (!uploadArea || !fileInput) return;
    
    // Handle file selection with validation and auto-submission
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            const file = this.files[0];
            
            // Validate file type
            if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
                showFileError('Please select a valid text file (.txt)');
                this.value = ''; // Clear the file input
                return;
            }
            
            // Validate file size (10MB limit)
            const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
            if (file.size > MAX_FILE_SIZE) {
                showFileError('File size exceeds the 10MB limit');
                this.value = ''; // Clear the file input
                return;
            }
            
            // Show selected file info
            showSelectedFile(file.name);
            
            // Auto-submit the form after a short delay to allow UI feedback
            setTimeout(() => {
                const submitBtn = document.getElementById('hidden-submit-btn');
                if (submitBtn) {
                    submitBtn.click();
                }
            }, 300);
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
            if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
                showFileError('Please select a valid text file (.txt)');
                return;
            }
            
            // Validate file size (10MB limit)
            const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
            if (file.size > MAX_FILE_SIZE) {
                showFileError('File size exceeds the 10MB limit');
                return;
            }
            
            // Set the file input value
            fileInput.files = e.dataTransfer.files;
            
            // Show selected file info
            showSelectedFile(file.name);
            
            // Auto-submit the form after a short delay
            setTimeout(() => {
                const submitBtn = document.getElementById('hidden-submit-btn');
                if (submitBtn) {
                    submitBtn.click();
                }
            }, 300);
        }
    });
    
    // Handle remove file button
    if (removeButton) {
        removeButton.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Clear the file input
            fileInput.value = '';
            
            // Hide selected file info
            selectedFileEl.classList.add('d-none');
            uploadPlaceholder.classList.remove('d-none');
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
    
    // Show file error message
    function showFileError(message) {
        // Use toast notification if available
        if (typeof showNotification === 'function') {
            showNotification(message, 'error');
        } else {
            alert(message);
        }
    }
}

// Handle tab activation without jQuery
function activateTab(tabId) {
    const tabElement = document.getElementById(tabId);
    if (!tabElement) return;
    
    // Create a new event
    const tabEvent = new Event('click');
    
    // Dispatch event on tab element
    tabElement.dispatchEvent(tabEvent);
}

// Export functions for external use
window.UIControls = {
    activateTab: activateTab,
    showNotification: showNotification,
    refreshSection: function(sectionId) {
        triggerSectionInit(sectionId);
    }
};

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
    if (window.bootstrap && bootstrap.Toast) {
        const toast = new bootstrap.Toast(toastEl, {
            delay: 5000  // Increased delay for better readability
        });
        toast.show();
    }
    
    // Remove toast from DOM after it's hidden
    toastEl.addEventListener('hidden.bs.toast', function() {
        toastEl.remove();
    });
}
