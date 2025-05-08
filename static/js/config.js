/**
 * Configuration settings for Concierge Chat Analyzer
 * Contains global settings and constants used throughout the application
 */

const CONFIG = {
    // Server configuration - dynamically determine API URL based on current host
    API_URL: (function() {
        // If we're on deployed environment, use relative URL to current host
        // Otherwise use localhost for development
        const isLocalhost = window.location.hostname === "localhost" || 
                           window.location.hostname === "127.0.0.1";
        return isLocalhost ? 'http://localhost:5000' : '';
    })(),
    
    // Chart colors and styling
    CHART_COLORS: {
        primary: 'rgba(13, 110, 253, 0.7)',
        primaryBorder: 'rgba(13, 110, 253, 1)',
        secondary: 'rgba(108, 117, 125, 0.7)',
        secondaryBorder: 'rgba(108, 117, 125, 1)',
        success: 'rgba(25, 135, 84, 0.7)',
        successBorder: 'rgba(25, 135, 84, 1)',
        warning: 'rgba(255, 193, 7, 0.7)',
        warningBorder: 'rgba(255, 193, 7, 1)',
        danger: 'rgba(220, 53, 69, 0.7)',
        dangerBorder: 'rgba(220, 53, 69, 1)',
        info: 'rgba(13, 202, 240, 0.7)',
        infoBorder: 'rgba(13, 202, 240, 1)'
    },
    
    // Dashboard settings
    MAX_REASONABLE_TIME: 300, // Max time in seconds to consider for averages (5 min)
    
    // Application settings
    DEBUG_MODE: false,
    VERSION: '1.0.0'
};

// Prevent modification of configuration
Object.freeze(CONFIG);
