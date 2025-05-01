/**
 * Chart export utilities for Concierge Chat Analyzer
 * Provides functionality for exporting charts to images and PDF documents
 */

// Chart Export Utility
const ChartExporter = {
    /**
     * Export a chart to an image
     * @param {string} chartId - The id of the canvas element containing the chart
     * @param {string} format - The image format (png, jpeg)
     * @returns {Promise<string>} A promise that resolves with the data URL of the image
     */
    exportChartToImage: function(chartId, format = 'png') {
        return new Promise((resolve, reject) => {
            try {
                const canvas = document.getElementById(chartId);
                if (!canvas) {
                    reject(new Error(`Canvas with id "${chartId}" not found`));
                    return;
                }
                
                // Convert chart to image data URL
                const dataUrl = canvas.toDataURL(`image/${format}`);
                resolve(dataUrl);
            } catch (error) {
                reject(error);
            }
        });
    },
    
    /**
     * Create a PDF report containing charts and analysis data
     * @param {Array} recommendationsData - The recommendations data to include in the report
     * @param {Array} chartConfigs - Configuration for charts to include in the report
     * @param {Function} callback - Callback function called when complete
     */
    createPDFReport: function(recommendationsData, chartConfigs, callback) {
        try {
            // Initialize jsPDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            // PDF document settings
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const margin = 15;
            const contentWidth = pageWidth - (margin * 2);
            let currentY = margin;
            
            // Add report title
            doc.setFontSize(18);
            doc.text('Concierge Chat Analyzer Report', pageWidth / 2, currentY, { align: 'center' });
            currentY += 10;
            
            // Add report date
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, currentY, { align: 'center' });
            currentY += 15;
            
            // Add summary section
            doc.setFontSize(14);
            doc.text('Analysis Summary', margin, currentY);
            currentY += 8;
            
            // Add summary statistics
            doc.setFontSize(10);
            const conversationCount = window.metricsData ? window.metricsData.length : 0;
            const matchedPersonas = window.personaSummary && window.personaSummary.matched_conversations ?
                `${window.personaSummary.matched_conversations}/${conversationCount}` : '0/0';
            
            doc.text(`Total Conversations: ${conversationCount}`, margin, currentY);
            currentY += 5;
            doc.text(`Matched Personas: ${matchedPersonas}`, margin, currentY);
            currentY += 15;
            
            // Process and add charts
            const processCharts = async () => {
                try {
                    // Process each chart from the config
                    for (const chartConfig of chartConfigs) {
                        // Check if we need to add a new page
                        if (currentY > pageHeight - 60) {
                            doc.addPage();
                            currentY = margin;
                        }
                        
                        // Add section title
                        doc.setFontSize(12);
                        doc.text(chartConfig.title, margin, currentY);
                        currentY += 8;
                        
                        try {
                            // Get the chart image
                            const chartImage = await this.exportChartToImage(chartConfig.chartId);
                            
                            // Add the chart image to PDF
                            if (chartImage) {
                                // Calculate image dimensions to fit within content width
                                const imageWidth = contentWidth;
                                const imageHeight = 70; // Fixed height for charts
                                
                                doc.addImage(
                                    chartImage, 
                                    'PNG', 
                                    margin, 
                                    currentY, 
                                    imageWidth, 
                                    imageHeight
                                );
                                
                                currentY += imageHeight + 10;
                            }
                        } catch (chartErr) {
                            console.error(`Error exporting ${chartConfig.title} chart:`, chartErr);
                        }
                    }
                    
                    // Add recommendations summary if available
                    if (recommendationsData && recommendationsData.length > 0) {
                        // Add a new page for recommendations
                        doc.addPage();
                        currentY = margin;
                        
                        // Add recommendations title
                        doc.setFontSize(14);
                        doc.text('Recommendations Analysis', margin, currentY);
                        currentY += 10;
                        
                        // Add recommendations table
                        const columns = [
                            'Conv.', 'Persona', 'Accuracy'
                        ];
                        
                        // Prepare table data - only include key information due to space constraints
                        const tableData = recommendationsData.map(rec => {
                            const accuracy = rec.accuracy ? `${(rec.accuracy * 100).toFixed(0)}%` : 'N/A';
                            return [
                                rec.conversation_id + 1,
                                rec.persona_id || 'N/A',
                                accuracy
                            ];
                        });
                        
                        // Draw the table
                        const startY = currentY;
                        const cellWidth = contentWidth / columns.length;
                        const cellHeight = 8;
                        
                        // Draw header
                        doc.setFillColor(240, 240, 240);
                        doc.rect(margin, currentY, contentWidth, cellHeight, 'F');
                        
                        doc.setFont(undefined, 'bold');
                        for (let i = 0; i < columns.length; i++) {
                            doc.text(
                                columns[i], 
                                margin + (i * cellWidth) + (cellWidth / 2), 
                                currentY + 5, 
                                { align: 'center' }
                            );
                        }
                        
                        currentY += cellHeight;
                        doc.setFont(undefined, 'normal');
                        
                        // Draw rows
                        const maxRowsPerPage = Math.floor((pageHeight - margin - currentY) / cellHeight);
                        let rowCount = 0;
                        
                        for (let i = 0; i < tableData.length; i++) {
                            // Check if we need a new page
                            if (rowCount >= maxRowsPerPage) {
                                doc.addPage();
                                currentY = margin;
                                rowCount = 0;
                            }
                            
                            const row = tableData[i];
                            
                            for (let j = 0; j < row.length; j++) {
                                doc.text(
                                    row[j].toString(), 
                                    margin + (j * cellWidth) + (cellWidth / 2),
                                    currentY + 5,
                                    { align: 'center' }
                                );
                            }
                            
                            // Add row border
                            doc.line(margin, currentY, margin + contentWidth, currentY);
                            
                            currentY += cellHeight;
                            rowCount++;
                        }
                        
                        // Add bottom border
                        doc.line(margin, currentY, margin + contentWidth, currentY);
                        
                        // Add vertical lines
                        for (let i = 0; i <= columns.length; i++) {
                            const x = margin + (i * cellWidth);
                            doc.line(x, startY, x, currentY);
                        }
                    }
                    
                    // Save the PDF
                    doc.save('concierge-chat-analysis.pdf');
                    
                    // Call callback function with success
                    if (typeof callback === 'function') {
                        callback(null);
                    }
                    
                } catch (error) {
                    console.error('Error generating PDF report:', error);
                    if (typeof callback === 'function') {
                        callback(error);
                    }
                }
            };
            
            // Start the chart processing
            processCharts();
            
        } catch (error) {
            console.error('Error initializing PDF report:', error);
            if (typeof callback === 'function') {
                callback(error);
            }
        }
    }
};