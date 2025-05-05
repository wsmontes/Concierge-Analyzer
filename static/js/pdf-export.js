/**
 * PDF export functionality for Concierge Chat Analyzer
 * Handles generation and download of analysis reports in PDF format
 */

// Check if script is already loaded and create module if needed
if (typeof window.PdfExportModule === 'undefined') {
    window.PdfExportModule = (function() {
        // PDF document settings
        const pageWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const margin = 15; // Margin in mm
        
        // Helper function to create a PDF document
        function createPdf() {
            // Create a new PDF document using jsPDF
            const { jsPDF } = window.jspdf;
            if (!jsPDF) {
                console.error('jsPDF library not loaded');
                return null;
            }
            
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            // Set default styles
            doc.setFont('helvetica');
            doc.setFontSize(10);
            
            return doc;
        }

        // Add cover page with logo
        function addCoverPage(doc, title) {
            // Add logo
            const logoImg = new Image();
            logoImg.src = '/static/images/Lotier_Logo.webp';
            
            // Wait for the image to load
            return new Promise((resolve) => {
                logoImg.onload = function() {
                    // Background color
                    doc.setFillColor(245, 247, 250);
                    doc.rect(0, 0, pageWidth, pageHeight, 'F');
                    
                    // Add logo
                    const imgWidth = 60;
                    const imgHeight = (logoImg.height * imgWidth) / logoImg.width;
                    const xPos = (pageWidth - imgWidth) / 2;
                    doc.addImage(logoImg, 'WEBP', xPos, 50, imgWidth, imgHeight);
                    
                    // Add title
                    doc.setFontSize(24);
                    doc.setTextColor(50, 50, 50);
                    const titleText = title || "Concierge Chat Analysis";
                    const titleWidth = doc.getTextWidth(titleText);
                    doc.text(titleText, (pageWidth - titleWidth) / 2, 110);
                    
                    // Add date
                    doc.setFontSize(12);
                    doc.setTextColor(100, 100, 100);
                    const dateText = `Generated on ${new Date().toLocaleDateString()}`;
                    const dateWidth = doc.getTextWidth(dateText);
                    doc.text(dateText, (pageWidth - dateWidth) / 2, 120);
                    
                    // Add icon
                    const iconImg = new Image();
                    iconImg.src = '/static/images/icon128.png';
                    iconImg.onload = function() {
                        const iconSize = 20;
                        doc.addImage(iconImg, 'PNG', 
                            (pageWidth - iconSize) / 2, 
                            pageHeight - 60, 
                            iconSize, iconSize);
                        
                        resolve();
                    };
                    
                    iconImg.onerror = function() {
                        // Continue if icon fails to load
                        resolve();
                    };
                };
                
                logoImg.onerror = function() {
                    // If logo fails to load, just create a text page
                    doc.setFontSize(24);
                    doc.setTextColor(50, 50, 50);
                    const titleText = title || "Concierge Chat Analysis";
                    const titleWidth = doc.getTextWidth(titleText);
                    doc.text(titleText, (pageWidth - titleWidth) / 2, 110);
                    resolve();
                };
            });
        }
        
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
        
        // Return public API
        return {
            exportPDF: exportPDF
        };
    })();
}
