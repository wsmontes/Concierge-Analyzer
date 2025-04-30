class ChartExporter {
    static async createPDFReport(recommendationsData, chartConfigs, callback = null) {
        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            
            // Add title and summary information
            pdf.setFontSize(18);
            pdf.text('Concierge Chat Analysis Report', 105, 15, { align: 'center' });
            
            pdf.setFontSize(12);
            pdf.text(`Report generated: ${new Date().toLocaleString()}`, 105, 25, { align: 'center' });
            
            // Add summary statistics
            if (recommendationsData && recommendationsData.length > 0) {
                pdf.setFontSize(14);
                pdf.text('Analysis Summary', 20, 40);
                
                pdf.setFontSize(10);
                pdf.text(`Total conversations analyzed: ${recommendationsData.length}`, 20, 50);
            }

            // Get all chart canvases from the chartConfigs
            let yPosition = 60;
            
            for (let i = 0; i < chartConfigs.length; i++) {
                const config = chartConfigs[i];
                const canvas = document.getElementById(config.chartId);
                
                if (canvas) {
                    // Convert chart to image
                    const imageData = canvas.toDataURL('image/png', 1.0);

                    // Add section title
                    pdf.setFontSize(12);
                    pdf.text(config.title, 20, yPosition);
                    yPosition += 10;
                    
                    // Add image to PDF
                    const imgProps = pdf.getImageProperties(imageData);
                    const pdfPageWidth = pdf.internal.pageSize.getWidth() - 40; // margins
                    const pdfPageHeight = (imgProps.height * pdfPageWidth) / imgProps.width;
                    
                    // Check if we need a new page
                    if (yPosition + pdfPageHeight > pdf.internal.pageSize.getHeight() - 20) {
                        pdf.addPage();
                        yPosition = 20;
                    }

                    pdf.addImage(imageData, 'PNG', 20, yPosition, pdfPageWidth, pdfPageHeight);
                    yPosition += pdfPageHeight + 20; // Add space after each chart
                }
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

    static async exportChartToImage(chart, filename = 'chart.png') {
        const canvas = chart.canvas;
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png', 1.0);
        link.download = filename;
        link.click();
    }
}

// Example usage:
// ChartExporter.createPDFReport([chart1, chart2], 'charts.pdf');
// ChartExporter.exportChartToImage(chart1, 'chart.png');