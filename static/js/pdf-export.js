/**
 * PDF export functionality for Concierge Chat Analyzer
 * Handles generation and download of analysis reports in PDF format
 */

// Create a namespace to expose functions to other modules
window.PdfExportModule = {
    exportPDF: exportPDF
};

// Export analysis data to PDF
function exportPDF() {
    // Show loading indicator
    document.getElementById('loading').classList.remove('d-none');
    
    try {
        // Safely store data for the PDF export
        window.metricsData = [];
        window.personaSummary = {};
        window.recommendationsData = [];
        
        // Access data from the global scope if available
        if (typeof window.appData?.lastUploadedData === 'object' && window.appData.lastUploadedData !== null) {
            window.metricsData = window.appData.lastUploadedData.metrics || [];
            window.personaSummary = window.appData.lastUploadedData.persona_summary || {};
            window.recommendationsData = window.appData.lastUploadedData.recommendations || [];
        }
        
        // Get all active chart instances
        const activeCharts = [
            window.appData?.charts?.responseTimeChart,
            window.appData?.charts?.accuracyChart, 
            window.appData?.charts?.accuracyDistChart,
            window.appData?.charts?.recommendationCountChart,
            window.appData?.charts?.metricsDistributionChart
        ].filter(chart => chart !== null && chart !== undefined);
        
        // Define chart configurations for the PDF
        const chartConfigs = [
            {
                chartId: 'response-time-chart',
                title: 'Response Time Analysis'
            },
            {
                chartId: 'accuracy-chart',
                title: 'Recommendation Accuracy'
            },
            {
                chartId: 'accuracy-distribution-chart',
                title: 'Accuracy Distribution'
            },
            {
                chartId: 'recommendation-count-chart',
                title: 'Recommendation Counts'
            },
            {
                chartId: 'metrics-distribution-chart',
                title: 'Metrics Distribution'
            }
        ];
        
        // Use the ChartExporter utility to create the PDF
        ChartExporter.createPDFReport(
            window.recommendationsData,
            chartConfigs,
            function(err) {
                document.getElementById('loading').classList.add('d-none');
                if (err) {
                    alert('There was a problem generating the PDF. Please try again.');
                    console.error('PDF generation error:', err);
                }
            }
        );
    } catch (error) {
        console.error('Error initiating PDF export:', error);
        alert('Failed to generate PDF. Please try again or check console for details.');
        document.getElementById('loading').classList.add('d-none');
    }
}
