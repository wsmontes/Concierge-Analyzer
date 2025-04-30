/**
 * ChartExporter - Professional PDF report generation utility for Concierge Analyzer
 * 
 * Dependencies:
 * - jsPDF: PDF document generation
 * - html2canvas: Canvas rendering for charts
 * - Chart.js: Chart data access
 */
class ChartExporter {
    static async createPDFReport(recommendationsData, chartConfigs, callback = null) {
        try {
            // Initialize jsPDF with professional report settings (A4, portrait)
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            // Define document constants
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 20;
            const contentWidth = pageWidth - (margin * 2);
            
            // Define colors and styles
            const colors = {
                primary: [41, 128, 185],    // Blue
                secondary: [39, 174, 96],   // Green
                accent: [142, 68, 173],     // Purple
                warning: [211, 84, 0],      // Orange
                text: [52, 73, 94],         // Dark blue-gray
                lightGray: [236, 240, 241]  // Light gray
            };
            
            // Safely handle input data
            const recommendations = Array.isArray(recommendationsData) ? recommendationsData : [];
            const metricsData = Array.isArray(window.metricsData) ? window.metricsData : [];
            const personaSummary = window.personaSummary || {};
            
            // Get report date information
            const reportDate = new Date();
            const formattedDate = reportDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            // ------ COVER PAGE ------
            this._createCoverPage(pdf, formattedDate, recommendations.length, colors);
            
            // ------ TABLE OF CONTENTS ------
            pdf.addPage();
            this._createTableOfContents(pdf, margin, colors);
            
            // ------ EXECUTIVE SUMMARY ------
            pdf.addPage();
            let yPosition = this._createExecutiveSummary(pdf, margin, personaSummary, metricsData, recommendations, colors);
            
            // ------ PERFORMANCE METRICS SECTION ------
            pdf.addPage();
            yPosition = margin;
            this._createPerformanceMetricsSection(pdf, margin, metricsData, colors);
            
            // ------ CHARTS VISUALIZATION SECTION ------
            yPosition = this._addChartsToPDF(pdf, chartConfigs, margin, colors);
            
            // ------ RECOMMENDATION ANALYSIS SECTION ------
            pdf.addPage();
            this._createRecommendationAnalysisSection(pdf, margin, recommendations, personaSummary, colors);
            
            // ------ CONVERSATION DETAILS SECTION ------
            pdf.addPage();
            this._createConversationDetailsSection(pdf, margin, metricsData, colors);
            
            // ------ APPENDIX WITH DETAILED DATA ------
            pdf.addPage();
            this._createDataAppendix(pdf, margin, recommendations, metricsData, colors);
            
            // Add footers with page numbers and metadata to all pages
            const pageCount = pdf.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                pdf.setPage(i);
                
                if (i > 1) { // Skip cover page
                    // Header
                    pdf.setFillColor(...colors.lightGray);
                    pdf.rect(0, 0, pageWidth, 12, 'F');
                    pdf.setFontSize(8);
                    pdf.setTextColor(...colors.text);
                    pdf.text('CONCIERGE ANALYZER REPORT', margin, 8);
                }
                
                // Footer
                pdf.setFillColor(...colors.lightGray);
                pdf.rect(0, pageHeight - 12, pageWidth, 12, 'F');
                pdf.setFontSize(8);
                pdf.setTextColor(...colors.text);
                pdf.text(`Generated: ${formattedDate}`, margin, pageHeight - 4);
                pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 4, { align: 'right' });
            }
            
            // Save the PDF
            pdf.save('concierge_analysis_report.pdf');
            
            // Call the callback if provided
            if (callback) {
                callback(null);
            }
        } catch (err) {
            console.error('Error generating PDF:', err);
            if (callback) {
                callback(err);
            }
        }
    }
    
    // ------ COVER PAGE METHOD ------
    static _createCoverPage(pdf, formattedDate, conversationCount, colors) {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        // Add background color/gradient
        pdf.setFillColor(...colors.lightGray);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        
        // Add blue header area
        pdf.setFillColor(...colors.primary);
        pdf.rect(0, 0, pageWidth, 60, 'F');
        
        // Add logo/title text
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(28);
        pdf.text('CONCIERGE ANALYZER', pageWidth/2, 40, { align: 'center' });
        
        // Add report title
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...colors.text);
        pdf.setFontSize(24);
        pdf.text('Performance Analysis Report', pageWidth/2, 85, { align: 'center' });
        
        // Add decorative line
        pdf.setDrawColor(...colors.primary);
        pdf.setLineWidth(1);
        pdf.line(pageWidth/4, 95, pageWidth*3/4, 95);
        
        // Add report summary
        pdf.setFontSize(14);
        pdf.text(`Analysis of ${conversationCount} Concierge AI Conversations`, pageWidth/2, 115, { align: 'center' });
        
        // Add date
        pdf.setFontSize(12);
        pdf.text(`Report Generated: ${formattedDate}`, pageWidth/2, 130, { align: 'center' });
        
        // Add company info/footer
        pdf.setFontSize(10);
        pdf.text('CONFIDENTIAL: INTERNAL USE ONLY', pageWidth/2, pageHeight - 30, { align: 'center' });
    }
    
    // ------ TABLE OF CONTENTS METHOD ------
    static _createTableOfContents(pdf, margin, colors) {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const contentWidth = pageWidth - (margin * 2);
        let yPosition = margin;
        
        // Section title
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(20);
        pdf.setTextColor(...colors.primary);
        pdf.text('Table of Contents', margin, yPosition);
        yPosition += 15;
        
        // Line under title
        pdf.setDrawColor(...colors.primary);
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPosition - 5, margin + contentWidth, yPosition - 5);
        
        // Set text color for TOC
        pdf.setTextColor(...colors.text);
        
        // Create TOC entries with dotted leaders and page numbers
        const tocEntries = [
            { title: 'Executive Summary', page: 3 },
            { title: 'Performance Metrics', page: 4 },
            { title: '    Response Time Analysis', page: 4 },
            { title: '    Accuracy Distribution', page: 5 },
            { title: 'Recommendation Analysis', page: 6 },
            { title: '    Persona Matching Results', page: 6 },
            { title: '    Top Recommendations', page: 7 },
            { title: 'Conversation Details', page: 8 },
            { title: 'Data Appendix', page: 10 }
        ];
        
        pdf.setFontSize(12);
        for (let i = 0; i < tocEntries.length; i++) {
            const entry = tocEntries[i];
            
            // Determine if this is a main entry or sub-entry
            const isMainEntry = !entry.title.startsWith('    ');
            
            // Format accordingly
            if (isMainEntry) {
                pdf.setFont('helvetica', 'bold');
                yPosition += 10;
            } else {
                pdf.setFont('helvetica', 'normal');
                yPosition += 7;
            }
            
            // Draw the entry text
            pdf.text(entry.title, margin, yPosition);
            
            // Add dotted leader line
            const textWidth = pdf.getStringUnitWidth(entry.title) * 12 / pdf.internal.scaleFactor;
            const startX = margin + textWidth + 5;
            const endX = pageWidth - margin - 15;
            const lineY = yPosition - 2;
            
            // Draw dotted leader line
            this._drawDottedLine(pdf, startX, lineY, endX, lineY);
            
            // Add page number
            pdf.text(entry.page.toString(), pageWidth - margin, yPosition, { align: 'right' });
            
            if (isMainEntry) yPosition += 3; // Extra space after main entries
        }
    }
    
    // ------ EXECUTIVE SUMMARY METHOD ------
    static _createExecutiveSummary(pdf, margin, personaSummary, metricsData, recommendations, colors) {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const contentWidth = pageWidth - (margin * 2);
        let yPosition = margin;
        
        // Section title
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(20);
        pdf.setTextColor(...colors.primary);
        pdf.text('Executive Summary', margin, yPosition);
        yPosition += 15;
        
        // Line under title
        pdf.setDrawColor(...colors.primary);
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPosition - 5, margin + contentWidth, yPosition - 5);
        
        // Reset text color
        pdf.setTextColor(...colors.text);
        
        // Calculate key metrics for summary
        const totalConversations = recommendations.length;
        
        let avgFirstResponse = 'N/A';
        let avgRecommendation = 'N/A';
        let avgAccuracy = 'N/A';
        
        if (Array.isArray(metricsData) && metricsData.length > 0) {
            let firstRespSum = 0;
            let firstRespCount = 0;
            let recSum = 0;
            let recCount = 0;
            
            metricsData.forEach(metric => {
                if (metric.time_to_first_response) {
                    firstRespSum += metric.time_to_first_response;
                    firstRespCount++;
                }
                if (metric.time_to_recommendation) {
                    recSum += metric.time_to_recommendation;
                    recCount++;
                }
            });
            
            if (firstRespCount > 0) {
                avgFirstResponse = (firstRespSum / firstRespCount).toFixed(2) + ' seconds';
            }
            
            if (recCount > 0) {
                avgRecommendation = (recSum / recCount).toFixed(2) + ' seconds';
            }
        }
        
        if (personaSummary && typeof personaSummary.avg_accuracy === 'number') {
            avgAccuracy = (personaSummary.avg_accuracy * 100).toFixed(1) + '%';
        }
        
        // Introduction paragraph
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        
        const introText = `This report provides a comprehensive analysis of ${totalConversations} Concierge AI conversations. The analysis evaluates response times, recommendation accuracy, and conversation patterns to assess the effectiveness and performance of the Concierge AI system.`;
        
        const introLines = this._splitTextToSize(pdf, introText, contentWidth);
        for (let i = 0; i < introLines.length; i++) {
            pdf.text(introLines[i], margin, yPosition);
            yPosition += 6;
        }
        
        yPosition += 10;
        
        // Key Findings section
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(...colors.secondary);
        pdf.text('Key Findings', margin, yPosition);
        yPosition += 10;
        
        pdf.setTextColor(...colors.text);
        
        // Key metrics summary table
        const metrics = [
            { name: 'Total Conversations Analyzed', value: totalConversations.toString() },
            { name: 'Average Time to First Response', value: avgFirstResponse },
            { name: 'Average Time to Recommendation', value: avgRecommendation },
            { name: 'Overall Recommendation Accuracy', value: avgAccuracy }
        ];
        
        // Draw a nice looking metrics table
        this._drawMetricsTable(pdf, margin, yPosition, contentWidth, metrics, colors);
        yPosition += 40;
        
        // Recommendations paragraph
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(...colors.secondary);
        pdf.text('Observations & Recommendations', margin, yPosition);
        yPosition += 10;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        pdf.setTextColor(...colors.text);
        
        const recText = `Based on the analysis, the Concierge AI system is performing with ${avgAccuracy} recommendation accuracy. The system provides first responses in an average of ${avgFirstResponse} and recommendations in ${avgRecommendation}. Areas for improvement include response time optimization and enhancing persona matching precision to improve overall recommendation quality.`;
        
        const recLines = this._splitTextToSize(pdf, recText, contentWidth);
        for (let i = 0; i < recLines.length; i++) {
            pdf.text(recLines[i], margin, yPosition);
            yPosition += 6;
        }
        
        // Return the last y-position for additional content
        return yPosition;
    }
    
    // ------ PERFORMANCE METRICS SECTION ------
    static _createPerformanceMetricsSection(pdf, margin, metricsData, colors) {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const contentWidth = pageWidth - (margin * 2);
        let yPosition = margin;
        
        // Section title
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(20);
        pdf.setTextColor(...colors.primary);
        pdf.text('Performance Metrics', margin, yPosition);
        yPosition += 15;
        
        // Line under title
        pdf.setDrawColor(...colors.primary);
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPosition - 5, margin + contentWidth, yPosition - 5);
        
        // Reset text color
        pdf.setTextColor(...colors.text);
        
        // Introduction
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        
        const introText = `This section analyzes the performance metrics of the Concierge AI system, focusing on response times and recommendation efficiency.`;
        
        const introLines = this._splitTextToSize(pdf, introText, contentWidth);
        for (let i = 0; i < introLines.length; i++) {
            pdf.text(introLines[i], margin, yPosition);
            yPosition += 6;
        }
        
        yPosition += 10;
        
        // Response time metrics
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(...colors.secondary);
        pdf.text('Response Time Analysis', margin, yPosition);
        yPosition += 10;
        
        pdf.setTextColor(...colors.text);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        
        // Create detailed table of response time metrics if data is available
        if (Array.isArray(metricsData) && metricsData.length > 0) {
            // Calculate statistics
            let firstRespTimes = metricsData
                .filter(m => m.time_to_first_response)
                .map(m => m.time_to_first_response);
                
            let recommendationTimes = metricsData
                .filter(m => m.time_to_recommendation)
                .map(m => m.time_to_recommendation);
            
            // Calculate min, max, avg
            const firstRespStats = this._calculateStats(firstRespTimes);
            const recommendationStats = this._calculateStats(recommendationTimes);
            
            // Create a statistics comparison table
            const headers = ['Metric', 'Minimum', 'Average', 'Maximum'];
            const rows = [
                ['Time to First Response', 
                 firstRespStats.min.toFixed(2) + ' sec', 
                 firstRespStats.avg.toFixed(2) + ' sec', 
                 firstRespStats.max.toFixed(2) + ' sec'],
                ['Time to Recommendation', 
                 recommendationStats.min.toFixed(2) + ' sec', 
                 recommendationStats.avg.toFixed(2) + ' sec', 
                 recommendationStats.max.toFixed(2) + ' sec']
            ];
            
            this._drawTable(pdf, margin, yPosition, headers, rows, contentWidth, colors);
            yPosition += 25;
        } else {
            pdf.text('No response time data available.', margin, yPosition);
            yPosition += 10;
        }
        
        // Add a subtitle for distribution analysis
        yPosition += 15;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(...colors.secondary);
        pdf.text('Response Time Distribution', margin, yPosition);
        yPosition += 10;
        
        pdf.setTextColor(...colors.text);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        
        const distributionText = "The chart below shows the distribution of response times across all analyzed conversations. This helps identify patterns and outliers in system performance.";
        const distLines = this._splitTextToSize(pdf, distributionText, contentWidth);
        
        for (let i = 0; i < distLines.length; i++) {
            pdf.text(distLines[i], margin, yPosition);
            yPosition += 6;
        }
        
        yPosition += 10;
        
        return yPosition;
    }
    
    // ------ ADD CHARTS TO PDF ------
    static _addChartsToPDF(pdf, chartConfigs, margin, colors) {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const contentWidth = pageWidth - (margin * 2);
        let yPosition = 150; // Start below the text content
        
        for (let i = 0; i < chartConfigs.length; i++) {
            const config = chartConfigs[i];
            const canvas = document.getElementById(config.chartId);
            
            if (canvas) {
                // Need a new page?
                if (yPosition > pageHeight - 100) {
                    pdf.addPage();
                    yPosition = margin + 10;
                    
                    // Add section title to the new page
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(16);
                    pdf.setTextColor(...colors.secondary);
                    pdf.text('Performance Charts (continued)', margin, yPosition);
                    yPosition += 15;
                    
                    pdf.setTextColor(...colors.text);
                }
                
                // Add chart title
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(12);
                pdf.setTextColor(...colors.secondary);
                pdf.text(config.title, margin, yPosition);
                yPosition += 8;
                
                // Reset text color
                pdf.setTextColor(...colors.text);
                
                // Convert chart to image
                const imageData = canvas.toDataURL('image/png', 1.0);
                
                // Calculate image dimensions with proper aspect ratio
                const imgProps = pdf.getImageProperties(imageData);
                const pdfPageWidth = contentWidth;
                const pdfPageHeight = (imgProps.height * pdfPageWidth) / imgProps.width;
                
                // Add image to PDF
                pdf.addImage(imageData, 'PNG', margin, yPosition, pdfPageWidth, pdfPageHeight);
                yPosition += pdfPageHeight + 20; // Add space after each chart
            }
        }
        
        return yPosition;
    }
    
    // ------ RECOMMENDATION ANALYSIS SECTION ------
    static _createRecommendationAnalysisSection(pdf, margin, recommendations, personaSummary, colors) {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const contentWidth = pageWidth - (margin * 2);
        let yPosition = margin;
        
        // Section title
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(20);
        pdf.setTextColor(...colors.primary);
        pdf.text('Recommendation Analysis', margin, yPosition);
        yPosition += 15;
        
        // Line under title
        pdf.setDrawColor(...colors.primary);
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPosition - 5, margin + contentWidth, yPosition - 5);
        
        // Reset text color
        pdf.setTextColor(...colors.text);
        
        // Introduction
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        
        const introText = `This section analyzes the quality and accuracy of recommendations provided by the Concierge AI system.`;
        
        const introLines = this._splitTextToSize(pdf, introText, contentWidth);
        for (let i = 0; i < introLines.length; i++) {
            pdf.text(introLines[i], margin, yPosition);
            yPosition += 6;
        }
        
        yPosition += 10;
        
        // Persona matching results
        if (personaSummary && typeof personaSummary.persona_count === 'number') {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(14);
            pdf.setTextColor(...colors.secondary);
            pdf.text('Persona Matching Results', margin, yPosition);
            yPosition += 10;
            
            pdf.setTextColor(...colors.text);
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'normal');
            
            // Create a metrics table for persona matching
            const personaMetrics = [
                { name: 'Total Personas in Database', value: personaSummary.persona_count.toString() },
                { name: 'Matched Conversations', value: personaSummary.matched_conversations.toString() },
                { name: 'Recommendation Accuracy', value: (personaSummary.avg_accuracy * 100).toFixed(1) + '%' },
                { name: 'Precision', value: (personaSummary.avg_precision * 100).toFixed(1) + '%' },
                { name: 'Recall', value: (personaSummary.avg_recall * 100).toFixed(1) + '%' }
            ];
            
            this._drawMetricsTable(pdf, margin, yPosition, contentWidth, personaMetrics, colors);
            yPosition += 40;
            
            // Add accuracy distribution if available
            if (personaSummary.accuracy_distribution) {
                yPosition += 10;
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(12);
                pdf.text('Accuracy Distribution', margin, yPosition);
                yPosition += 8;
                
                pdf.setFont('helvetica', 'normal');
                
                // Create a table for accuracy distribution
                const headers = ['Accuracy Range', 'Count', 'Percentage'];
                const totalCount = Object.values(personaSummary.accuracy_distribution).reduce((sum, val) => sum + val, 0);
                
                const rows = [
                    ['0-25%', 
                     personaSummary.accuracy_distribution['0-25%'].toString(), 
                     ((personaSummary.accuracy_distribution['0-25%'] / totalCount) * 100).toFixed(1) + '%'],
                    ['26-50%', 
                     personaSummary.accuracy_distribution['26-50%'].toString(), 
                     ((personaSummary.accuracy_distribution['26-50%'] / totalCount) * 100).toFixed(1) + '%'],
                    ['51-75%', 
                     personaSummary.accuracy_distribution['51-75%'].toString(), 
                     ((personaSummary.accuracy_distribution['51-75%'] / totalCount) * 100).toFixed(1) + '%'],
                    ['76-100%', 
                     personaSummary.accuracy_distribution['76-100%'].toString(), 
                     ((personaSummary.accuracy_distribution['76-100%'] / totalCount) * 100).toFixed(1) + '%']
                ];
                
                this._drawTable(pdf, margin, yPosition, headers, rows, contentWidth * 0.7, colors);
                yPosition += 35;
            }
        }
        
        // Top recommendations analysis
        yPosition += 10;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(...colors.secondary);
        pdf.text('Top Recommendations Analysis', margin, yPosition);
        yPosition += 10;
        
        pdf.setTextColor(...colors.text);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        
        // Create a table of top recommendations with their accuracy
        if (Array.isArray(recommendations) && recommendations.length > 0) {
            // Sort by accuracy if available
            const sortedRecs = [...recommendations]
                .filter(rec => rec.accuracy !== undefined)
                .sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0))
                .slice(0, 10); // Top 10
            
            if (sortedRecs.length > 0) {
                const headers = ['Request', 'Recommendations', 'Accuracy'];
                const rows = sortedRecs.map(rec => [
                    rec.request.substring(0, 30) + (rec.request.length > 30 ? '...' : ''),
                    (rec.potential_restaurants || []).slice(0, 3).join(', '),
                    rec.accuracy !== undefined ? (rec.accuracy * 100).toFixed(1) + '%' : 'N/A'
                ]);
                
                this._drawTable(pdf, margin, yPosition, headers, rows, contentWidth, colors, true);
                yPosition += rows.length * 10 + 15;
            } else {
                pdf.text('No recommendations with accuracy data available.', margin, yPosition);
                yPosition += 10;
            }
        } else {
            pdf.text('No recommendation data available.', margin, yPosition);
            yPosition += 10;
        }
        
        return yPosition;
    }
    
    // ------ CONVERSATION DETAILS SECTION ------
    static _createConversationDetailsSection(pdf, margin, metricsData, colors) {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const contentWidth = pageWidth - (margin * 2);
        let yPosition = margin;
        
        // Section title
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(20);
        pdf.setTextColor(...colors.primary);
        pdf.text('Conversation Details', margin, yPosition);
        yPosition += 15;
        
        // Line under title
        pdf.setDrawColor(...colors.primary);
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPosition - 5, margin + contentWidth, yPosition - 5);
        
        // Reset text color
        pdf.setTextColor(...colors.text);
        
        // Introduction
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        
        const introText = `This section provides detailed metrics for individual conversations analyzed. Each conversation is evaluated based on response times, recommendation accuracy, and matched personas where applicable.`;
        
        const introLines = this._splitTextToSize(pdf, introText, contentWidth);
        for (let i = 0; i < introLines.length; i++) {
            pdf.text(introLines[i], margin, yPosition);
            yPosition += 6;
        }
        
        yPosition += 10;
        
        // Create a detailed table of conversations
        if (Array.isArray(metricsData) && metricsData.length > 0) {
            // Headers for our detailed table
            const headers = ['ID', 'Time to First Response (s)', 'Time to Recommendation (s)', 'Accuracy', 'Persona'];
            
            // Create rows with detailed data
            const rows = metricsData.slice(0, 20).map((metric, i) => [
                (i + 1).toString(),
                metric.time_to_first_response ? metric.time_to_first_response.toFixed(2) : 'N/A',
                metric.time_to_recommendation ? metric.time_to_recommendation.toFixed(2) : 'N/A',
                metric.recommendation_accuracy !== undefined ? (metric.recommendation_accuracy * 100).toFixed(1) + '%' : 'N/A',
                metric.persona_id || 'Not matched'
            ]);
            
            this._drawTable(pdf, margin, yPosition, headers, rows, contentWidth, colors, true);
            
            // Add note if we're only showing a subset
            if (metricsData.length > 20) {
                yPosition += rows.length * 10 + 15;
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'italic');
                pdf.text(`Note: Showing first 20 of ${metricsData.length} conversations. See Data Appendix for complete list.`, margin, yPosition);
            }
        } else {
            pdf.text('No conversation metrics data available.', margin, yPosition);
        }
        
        return yPosition;
    }
    
    // ------ DATA APPENDIX SECTION ------
    static _createDataAppendix(pdf, margin, recommendations, metricsData, colors) {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const contentWidth = pageWidth - (margin * 2);
        let yPosition = margin;
        
        // Section title
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(20);
        pdf.setTextColor(...colors.primary);
        pdf.text('Data Appendix', margin, yPosition);
        yPosition += 15;
        
        // Line under title
        pdf.setDrawColor(...colors.primary);
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPosition - 5, margin + contentWidth, yPosition - 5);
        
        // Reset text color
        pdf.setTextColor(...colors.text);
        
        // Introduction
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        
        const introText = `This appendix contains raw data tables used in the analysis.`;
        
        pdf.text(introText, margin, yPosition);
        yPosition += 15;
        
        // Create detailed raw data tables
        if (Array.isArray(recommendations) && recommendations.length > 0) {
            // Create a full recommendations table
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(14);
            pdf.setTextColor(...colors.secondary);
            pdf.text('Complete Recommendations List', margin, yPosition);
            yPosition += 10;
            
            pdf.setTextColor(...colors.text);
            
            // First 10 recommendations on this page
            const firstPageRecs = recommendations.slice(0, 10);
            
            const recHeaders = ['ID', 'Request', 'Recommended Restaurants', 'Accuracy'];
            const recRows = firstPageRecs.map((rec, i) => [
                (i + 1).toString(),
                rec.request.substring(0, 20) + (rec.request.length > 20 ? '...' : ''),
                (rec.potential_restaurants || []).slice(0, 2).join(', ') + 
                    (rec.potential_restaurants && rec.potential_restaurants.length > 2 ? '...' : ''),
                rec.accuracy !== undefined ? (rec.accuracy * 100).toFixed(1) + '%' : 'N/A'
            ]);
            
            this._drawTable(pdf, margin, yPosition, recHeaders, recRows, contentWidth, colors, true);
            yPosition += recRows.length * 10 + 15;
            
            // If we have more recommendations, add them on additional pages
            if (recommendations.length > 10) {
                // Add a note about additional data
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'italic');
                pdf.text(`Note: Showing 10 of ${recommendations.length} recommendations. Additional data available upon request.`, margin, yPosition);
            }
        }
        
        return yPosition;
    }
    
    // ------ HELPER METHODS ------
    static _drawDottedLine(pdf, xStart, yStart, xEnd, yEnd) {
        const dashLen = 2;
        const gapLen = 2;
        pdf.setLineWidth(0.3);
        
        let x1 = xStart;
        const y = yStart; // Assuming horizontal line
        const xEnd2 = xEnd;
        
        while (x1 < xEnd2) {
            const x2 = Math.min(x1 + dashLen, xEnd2);
            pdf.line(x1, y, x2, y);
            x1 = x2 + gapLen;
        }
    }
    
    static _drawMetricsTable(pdf, x, y, width, metrics, colors) {
        const rowHeight = 8;
        const labelWidth = width * 0.7;
        const valueWidth = width * 0.3;
        
        // Draw background and border
        pdf.setFillColor(...colors.lightGray);
        pdf.setDrawColor(...colors.primary);
        pdf.setLineWidth(0.5);
        
        // Draw table
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        
        for (let i = 0; i < metrics.length; i++) {
            const yPos = y + (i * rowHeight);
            
            // Draw alternating row background
            if (i % 2 === 0) {
                pdf.setFillColor(...colors.lightGray);
                pdf.rect(x, yPos, width, rowHeight, 'F');
            }
            
            // Draw label
            pdf.setTextColor(...colors.text);
            pdf.text(metrics[i].name, x + 3, yPos + 5);
            
            // Draw value (right-aligned)
            pdf.setFont('helvetica', 'bold');
            pdf.text(metrics[i].value, x + width - 3, yPos + 5, { align: 'right' });
            pdf.setFont('helvetica', 'normal');
            
            // Draw bottom border
            pdf.setDrawColor(...colors.primary);
            pdf.line(x, yPos + rowHeight, x + width, yPos + rowHeight);
        }
        
        // Draw outer border
        pdf.rect(x, y, width, rowHeight * metrics.length);
    }
    
    static _drawTable(pdf, x, y, headers, rows, width, colors, zebra = false) {
        if (!headers || !rows || headers.length === 0 || rows.length === 0) {
            return;
        }
        
        const rowHeight = 10;
        const headerHeight = 10;
        const columnWidth = width / headers.length;
        
        // Draw header background
        pdf.setFillColor(...colors.primary);
        pdf.rect(x, y, width, headerHeight, 'F');
        
        // Draw header text
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(255, 255, 255);
        
        for (let i = 0; i < headers.length; i++) {
            const colX = x + (i * columnWidth);
            pdf.text(headers[i], colX + 3, y + 7);
        }
        
        // Draw rows
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(...colors.text);
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowY = y + headerHeight + (i * rowHeight);
            
            // Draw zebra striping if requested
            if (zebra && i % 2 === 1) {
                pdf.setFillColor(...colors.lightGray);
                pdf.rect(x, rowY, width, rowHeight, 'F');
            }
            
            // Draw row data
            for (let j = 0; j < row.length; j++) {
                const colX = x + (j * columnWidth);
                pdf.text(row[j].toString(), colX + 3, rowY + 7);
            }
            
            // Draw row border
            pdf.setDrawColor(...colors.lightGray);
            pdf.line(x, rowY, x + width, rowY);
        }
        
        // Draw bottom border
        pdf.line(x, y + headerHeight + (rows.length * rowHeight), x + width, y + headerHeight + (rows.length * rowHeight));
        
        // Draw outer border
        pdf.setDrawColor(...colors.primary);
        pdf.rect(x, y, width, headerHeight + (rows.length * rowHeight));
    }
    
    static _splitTextToSize(pdf, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const width = pdf.getStringUnitWidth(currentLine + ' ' + word) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;
            
            if (width > maxWidth) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                if (currentLine) {
                    currentLine += ' ' + word;
                } else {
                    currentLine = word;
                }
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }
    
    static _calculateStats(values) {
        if (!values || values.length === 0) {
            return { min: 0, max: 0, avg: 0 };
        }
        
        const min = Math.min(...values);
        const max = Math.max(...values);
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        
        return { min, max, avg };
    }
    
    static async exportChartToImage(chart, filename = 'chart.png') {
        const canvas = chart.canvas;
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png', 1.0);
        link.download = filename;
        link.click();
    }
}