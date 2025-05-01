# Changelog

## [Unreleased]

### Added
- Comprehensive redesign of Debug Insights section with:
  - Reorganized layout for better visualization and data exploration
  - Added missing association count metric with ID 'debug-association-count'
  - Enhanced category-restaurant relationships display with accordion component
  - Added search functionality for conversation list filtering
  - Better empty state handling with conditional alerts

### Changed
- Simplified the upload form to a minimalist drop area with automatic submission
- Removed unnecessary panels, cards, and buttons while maintaining full functionality
- Added automatic file upload when a valid file is selected or dropped
- Improved user experience by eliminating the need for explicit submission
- Refactored Debug Insights section to:
  - Remove dashboard cards and move them to the Dashboard section
  - Create a more focused conversation-level debug analysis interface
  - Improve the concept-restaurant associations visualization with toggle view
  - Add search functionality for conversation filtering
  - Provide a streamlined UI for examining specific conversation debug data

### Fixed
- Fixed responsive layout issues with the conversation table by:
  - Removing conflicting CSS Grid layout that was fighting with Bootstrap's grid
  - Adding proper flex layout and container sizing for all screen sizes
  - Implementing a mobile-specific view with a back button for better navigation
  - Ensuring correct overflow behavior for scrollable content
- Fixed "Identifier 'isRendering' has already been declared" error by:
  - Adding script loading protection to prevent multiple initializations of modules
  - Using a more specific variable name (`isDebugInsightsRendering`) to avoid conflicts
  - Adding a module existence check before defining variables
- Fixed conversations table appearing in all sections by implementing proper section containment
- Added safeguards to prevent multiple rendering of conversation lists
- Implemented proper section cleanup when switching between sections
- Added visibility controls to ensure section-specific content only appears in its section
- Fixed "Canvas is already in use" errors in Debug Insights section by:
  - Using Chart.js built-in Chart.getChart() method to ensure proper chart instance tracking
  - Implementing proper chart destruction before recreating charts
  - Adding debouncing to prevent multiple chart renders in quick succession
  - Fixing race conditions with a rendering lock flag
- Fixed multiple execution of chart rendering code that was causing duplicate charts
- Added better debugging and logging for chart creation and destruction
- Resolved "Element with ID 'debug-association-count' not found" warning
- Fixed category-restaurant associations display format issue
- Improved visualization layout for responsiveness and consistency
- Added proper structure for concept-restaurant associations table
- Fixed the element ID 'debug-association-count' warning by removing the element from the debug section
- Corrected cross-conversation insights display with proper UI for both table and accordion views
- Improved usability with search functionality and filtering for debug conversations
- Added responsive design improvements for debug analysis interface
- Improved height handling in the debug content frame to extend as much as needed:
  - Set minimum height to 800px for content and sidebar
  - Added scrollable list for conversation selection
  - Fixed display issues with conversation details panel
  - Improved responsive behavior for different screen sizes
- Fixed concept-restaurant association table not showing values:
  - Added proper loading indicator for association data
  - Improved error handling with informative messages
  - Added refresh button for association data
  - Fixed visibility issues with table and accordion views
  - Added empty state handling for when no association data is found

### Improved
- Enhanced responsive layout for better usability on mobile devices
- Added automatic UI adjustments based on screen size changes
- Added mobile-optimized conversation viewing experience with back navigation
- Added more comprehensive error handling for chart rendering failures
- Consolidated chart rendering logic to reduce code duplication
- Added visual error feedback when chart rendering fails
- Implemented proper cleanup when switching between sections
- Enhanced script loading mechanism to prevent duplicate module initialization
- Enhanced debug insights visualization with better chart layouts
- Improved navigation and interactive elements in Debug Insights
- Better structured HTML for consistency with other application sections
- Added search filtering for conversation list

## [1.0.0] - 2023-10-15

### Added
- Initial release of Concierge Analyzer

## [1.0.0] - 2023-10-25

### Added
- Initial release with core analysis features
- WhatsApp chat import functionality
- Persona analysis
- Recommendation analysis
- Response time metrics
- Conversation explorer
- Debug insights dashboard

## [1.1.0] - 2023-10-30

### Changed
- Restructured codebase into modular components for better maintainability
- Separated CSS into multiple specialized stylesheets:
  - main.css: Core styling and common components
  - dashboard.css: Dashboard-specific styles
  - conversations.css: Conversation display and interaction styles
  - debug-insights.css: Debug panel and visualization styles
- Modularized JavaScript into functional components:
  - config.js: Application configuration
  - main.js: Core application functionality
  - charts.js: Chart generation and management
  - conversations.js: Conversation list and detail handling
  - debug-insights.js: Debug data visualization and analysis
  - pdf-export.js: Report export functionality
  - chart-exporter.js: Chart image export utilities
- Implemented template partials for HTML components:
  - Separated header, upload form, dashboard panels
  - Created individual tab content templates
  - Isolated summary and analysis components

### Improved
- Better separation of concerns across all code files
- Enhanced maintainability through modular architecture
- Simplified debugging through isolated component structure
- Improved performance by loading only necessary resources

## [1.1.1] - 2023-11-01

### Fixed
- Fixed "initializeConversationsList is not defined" error by implementing proper JavaScript module interfaces with window namespaces
- Fixed "Cannot read properties of null (reading 'getContext')" error by:
  - Adding element existence checks to chart rendering functions
  - Implementing deferred chart rendering for content in hidden tabs
  - Improving error handling and reporting for debug insights failures

### Improved
- Added graceful error handling with user-friendly error messages
- Deferred chart initialization to improve performance and prevent DOM access errors
- Updated module loading order in index.html to ensure proper dependency resolution

## [1.1.2] - 2023-11-02

### Fixed
- Fixed missing 'restaurant-distribution-chart' canvas element error by:
  - Adding the missing chart container in the debug-insights tab template
  - Implementing enhanced error handling for chart rendering
  - Adding a delay to ensure DOM is fully rendered before attempting to access canvas elements
- Added more robust element existence checking before attempting DOM operations

### Improved
- Enhanced debug logging for chart initialization
- Added visual error feedback when chart rendering fails
- Improved tab event handling for deferred resource loading

## [1.1.3] - 2023-11-03

### Fixed
- Fixed "Chart is already in use" error by:
  - Implementing chart instance tracking and automatic cleanup
  - Properly destroying existing charts before creating new ones
  - Adding error boundaries around chart creation operations
- Fixed "Cannot set properties of null (setting 'textContent')" error in debug insights by:
  - Adding robust element existence checks
  - Implementing safe DOM update mechanisms
  - Adding proper error handling for debugging conversation analysis
- Fixed empty conversations section issue by:
  - Improving data validity checks
  - Adding detailed console logging for troubleshooting
  - Enhancing the main data processing logic

### Improved
- Added comprehensive error reporting for all chart operations
- Enhanced debug logging throughout the application
- Implemented better null checking for module dependencies

## [1.1.4] - 2023-11-04

### Fixed
- Fixed "item is not defined" error in Debug Insights module by:
  - Adding proper data structure validation for restaurant distribution chart
  - Handling different server response data formats gracefully
  - Improving error logging with structural data inspection
- Fixed conversations section not showing data by:
  - Adding comprehensive data validation and error handling
  - Improving filtering logic robustness
  - Adding automatic selection of first conversation

### Improved
- Enhanced data inspection and logging throughout the application
- Added fallback UI messages when no data is available
- Implemented comprehensive error handling for all chart operations

## [1.2.0] - 2023-11-10

### Fixed
- Fixed broken Conversations section display by:
  - Correcting element ID references between HTML and JavaScript
  - Updating section visibility detection logic
  - Adding additional error handling and debug logging
- Fixed Debug Insights section functionality by:
  - Improving chart rendering with proper element checks
  - Adding fallbacks for data structure variations
  - Extending timeouts to ensure DOM is fully rendered
  - Implementing comprehensive error messaging
- Fixed data flow issues between components:
  - Ensuring proper data propagation from upload to analysis
  - Adding validation and type-checking for all API responses
  - Improving error handling for missing or malformed data

### Improved
- Enhanced logging throughout the application for better debugging
- Added robust element existence checks before DOM operations
- Improved mobile responsiveness in conversation views
- Optimized chart rendering with better error handling
