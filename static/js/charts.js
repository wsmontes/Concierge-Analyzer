/**
 * Chart generation and manipulation for Concierge Chat Analyzer
 * Contains functions for creating and updating all visualization charts
 */

// Create a namespace to expose functions to other modules
window.ChartsModule = {
    displayCharts: displayCharts,
    updateRecommendationAnalysis: updateRecommendationAnalysis,
    updateRecommendationsTable: updateRecommendationsTable
    // Add other functions you want to expose
};

// Global chart references
let accuracyChart = null;
let accuracyDistChart = null;
let recommendationCountChart = null;
let metricsDistributionChart = null;
let responseTimeChart = null;

// Display all charts for the data
function displayCharts(data) {
    // Filter metrics for chart display
    const filteredMetrics = data.metrics.filter(metric => {
        // Only include metrics with reasonable response times
        const validRecommendationTime = metric.time_to_recommendation && 
                                      metric.time_to_recommendation <= CONFIG.MAX_REASONABLE_TIME;
                                      
        const validFirstResponseTime = metric.time_to_first_response && 
                                     metric.time_to_first_response <= CONFIG.MAX_REASONABLE_TIME;
                                     
        return validRecommendationTime || validFirstResponseTime;
    });
    
    // Display response time chart
    displayResponseTimeChart(filteredMetrics);
    
    // Display accuracy charts if persona data is available
    if (data.persona_summary) {
        displayAccuracyChart(data.metrics);
        displayAccuracyDistributionChart(data.persona_summary.accuracy_distribution);
        displayRecommendationCountChart(data.persona_summary.recommendation_counts);
    }
    
    // Display metrics distribution chart
    displayMetricsDistributionChart(data.metrics);
    
    // Store chart references in global app data
    window.appData.charts = {
        accuracyChart,
        accuracyDistChart,
        recommendationCountChart,
        metricsDistributionChart,
        responseTimeChart
    };
}

// Response Time Chart
function displayResponseTimeChart(metrics) {
    // Ensure we have data to display
    if (!metrics || metrics.length === 0) {
        console.warn("No metrics data available for response time chart");
        return;
    }
    
    // Prepare data for the chart
    const conversationIds = [];
    const firstResponseTimes = [];
    const recommendationTimes = [];
    
    metrics.forEach(metric => {
        conversationIds.push(`Conv. ${metric.conversation_id + 1}`);
        firstResponseTimes.push(metric.time_to_first_response || 0);
        recommendationTimes.push(metric.time_to_recommendation || 0);
    });
    
    // Create the chart
    const ctx = document.getElementById('response-time-chart').getContext('2d');
    
    if (responseTimeChart) {
        responseTimeChart.destroy();
    }
    
    responseTimeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: conversationIds,
            datasets: [
                {
                    label: 'Time to First Response (s)',
                    data: firstResponseTimes,
                    backgroundColor: CONFIG.CHART_COLORS.info,
                    borderColor: CONFIG.CHART_COLORS.infoBorder,
                    borderWidth: 1
                },
                {
                    label: 'Time to Recommendation (s)',
                    data: recommendationTimes,
                    backgroundColor: CONFIG.CHART_COLORS.primary,
                    borderColor: CONFIG.CHART_COLORS.primaryBorder,
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Time (seconds)'
                    },
                    suggestedMax: Math.min(
                        Math.max(...firstResponseTimes, ...recommendationTimes) * 1.1, 
                        60 // Cap at 60 seconds for better readability
                    )
                },
                x: {
                    title: {
                        display: true,
                        text: 'Conversation'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw.toFixed(1)}s`;
                        }
                    }
                }
            }
        }
    });
}

// Accuracy Chart
function displayAccuracyChart(metrics) {
    // Prepare data for the chart
    const conversationIds = [];
    const accuracyValues = [];
    const backgroundColors = [];
    
    metrics.forEach(metric => {
        if ('recommendation_accuracy' in metric) {
            conversationIds.push(`Conv. ${metric.conversation_id + 1}`);
            const accuracy = metric.recommendation_accuracy * 100;
            accuracyValues.push(accuracy);
            
            // Set color based on accuracy
            if (accuracy >= 75) {
                backgroundColors.push(CONFIG.CHART_COLORS.success);
            } else if (accuracy >= 50) {
                backgroundColors.push(CONFIG.CHART_COLORS.warning);
            } else {
                backgroundColors.push(CONFIG.CHART_COLORS.danger);
            }
        }
    });
    
    // Create the chart
    const ctx = document.getElementById('accuracy-chart').getContext('2d');
    
    if (accuracyChart) {
        accuracyChart.destroy();
    }
    
    accuracyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: conversationIds,
            datasets: [{
                label: 'Accuracy (%)',
                data: accuracyValues,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Accuracy (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Conversation'
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Accuracy: ${context.raw.toFixed(1)}%`;
                        }
                    }
                }
            }
        }
    });
}

// Accuracy Distribution Chart
function displayAccuracyDistributionChart(distribution) {
    // Prepare data for the chart
    const labels = Object.keys(distribution);
    const values = Object.values(distribution);
    
    // Create the chart
    const ctx = document.getElementById('accuracy-distribution-chart').getContext('2d');
    
    if (accuracyDistChart) {
        accuracyDistChart.destroy();
    }
    
    accuracyDistChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    CONFIG.CHART_COLORS.danger,
                    CONFIG.CHART_COLORS.warning,
                    CONFIG.CHART_COLORS.success,
                    CONFIG.CHART_COLORS.info
                ],
                borderColor: [
                    CONFIG.CHART_COLORS.dangerBorder,
                    CONFIG.CHART_COLORS.warningBorder,
                    CONFIG.CHART_COLORS.successBorder,
                    CONFIG.CHART_COLORS.infoBorder
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 15,
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Recommendation Count Chart
function displayRecommendationCountChart(recommendationCounts) {
    // Convert object to arrays for Chart.js
    const labels = Object.keys(recommendationCounts).map(count => `${count} Restaurant${count === '1' ? '' : 's'}`);
    const values = Object.values(recommendationCounts);
    
    const ctx = document.getElementById('recommendation-count-chart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (recommendationCountChart) {
        recommendationCountChart.destroy();
    }
    
    recommendationCountChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Conversations',
                data: values,
                backgroundColor: CONFIG.CHART_COLORS.secondary,
                borderColor: CONFIG.CHART_COLORS.secondaryBorder,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Frequency'
                    },
                    ticks: {
                        precision: 0
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Number of Restaurants Recommended'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Recommendation Count Distribution'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.raw} conversation${context.raw === 1 ? '' : 's'}`;
                        }
                    }
                }
            }
        }
    });
}

// Metrics Distribution Chart
function displayMetricsDistributionChart(metrics) {
    // Extract metrics for conversations with recommendation evaluations
    const evaluatedMetrics = metrics.filter(m => 'recommendation_accuracy' in m);
    
    // Group metrics into ranges
    const ranges = {
        '0-25%': { precision: 0, recall: 0, accuracy: 0 },
        '26-50%': { precision: 0, recall: 0, accuracy: 0 },
        '51-75%': { precision: 0, recall: 0, accuracy: 0 },
        '76-100%': { precision: 0, recall: 0, accuracy: 0 }
    };
    
    // Calculate ranges based on accuracy values directly from metrics
    evaluatedMetrics.forEach(metric => {
        // Get the accuracy value directly from the metrics
        const accuracy = metric.recommendation_accuracy || 0;
        
        // For demo purposes, we'll use the same value for precision and recall
        // In a real implementation, you would get these from your data
        const precision = accuracy;
        const recall = accuracy;
        
        // Categorize accuracy
        if (accuracy <= 0.25) ranges['0-25%'].accuracy++;
        else if (accuracy <= 0.5) ranges['26-50%'].accuracy++;
        else if (accuracy <= 0.75) ranges['51-75%'].accuracy++;
        else ranges['76-100%'].accuracy++;
        
        // Categorize precision
        if (precision <= 0.25) ranges['0-25%'].precision++;
        else if (precision <= 0.5) ranges['26-50%'].precision++;
        else if (precision <= 0.75) ranges['51-75%'].precision++;
        else ranges['76-100%'].precision++;
        
        // Categorize recall
        if (recall <= 0.25) ranges['0-25%'].recall++;
        else if (recall <= 0.5) ranges['26-50%'].recall++;
        else if (recall <= 0.75) ranges['51-75%'].recall++;
        else ranges['76-100%'].recall++;
    });
    
    // Prepare data for chart
    const labels = Object.keys(ranges);
    const accuracyData = labels.map(label => ranges[label].accuracy);
    const precisionData = labels.map(label => ranges[label].precision);
    const recallData = labels.map(label => ranges[label].recall);
    
    const ctx = document.getElementById('metrics-distribution-chart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (metricsDistributionChart) {
        metricsDistributionChart.destroy();
    }
    
    metricsDistributionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Accuracy',
                    data: accuracyData,
                    backgroundColor: CONFIG.CHART_COLORS.primary,
                    borderColor: CONFIG.CHART_COLORS.primaryBorder,
                    borderWidth: 1
                },
                {
                    label: 'Precision',
                    data: precisionData,
                    backgroundColor: CONFIG.CHART_COLORS.success,
                    borderColor: CONFIG.CHART_COLORS.successBorder,
                    borderWidth: 1
                },
                {
                    label: 'Recall',
                    data: recallData,
                    backgroundColor: CONFIG.CHART_COLORS.info,
                    borderColor: CONFIG.CHART_COLORS.infoBorder,
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Conversation Count'
                    },
                    ticks: {
                        precision: 0
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Score Range'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Metrics Distribution'
                }
            }
        }
    });
}

// Update recommendation metrics
function updateRecommendationAnalysis(data) {
    // Update recommendation stats
    const avgPrecision = data.persona_summary.avg_precision * 100;
    const avgRecall = data.persona_summary.avg_recall * 100;
    const avgAccuracy = data.persona_summary.avg_accuracy * 100;
    
    const precisionBar = document.getElementById('avg-precision-bar');
    const recallBar = document.getElementById('avg-recall-bar');
    const accuracyBar = document.getElementById('avg-accuracy-bar');
    
    if (precisionBar && recallBar && accuracyBar) {
        precisionBar.style.width = `${avgPrecision}%`;
        precisionBar.textContent = `${avgPrecision.toFixed(1)}%`;
        recallBar.style.width = `${avgRecall}%`;
        recallBar.textContent = `${avgRecall.toFixed(1)}%`;
        accuracyBar.style.width = `${avgAccuracy}%`;
        accuracyBar.textContent = `${avgAccuracy.toFixed(1)}%`;
    }
}

// Update recommendations comparison table
function updateRecommendationsTable(recommendations) {
    const tableBody = document.querySelector('#recommendations-comparison-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    recommendations.forEach(rec => {
        if (!rec.expected_restaurants) return;
        
        const row = document.createElement('tr');
        
        // Create cell for conversation ID
        const idCell = document.createElement('td');
        idCell.className = 'text-center';
        idCell.innerHTML = `<span class="badge bg-primary">${rec.conversation_id + 1}</span>`;
        row.appendChild(idCell);
        
        // Create cell for persona ID
        const personaCell = document.createElement('td');
        personaCell.className = 'text-center small text-nowrap';
        if (rec.persona_id) {
            personaCell.innerHTML = `<span class="badge bg-info" 
                title="${rec.persona_description || 'No description'}">${rec.persona_id}</span>`;
        } else {
            personaCell.innerHTML = '<span class="badge bg-secondary">N/A</span>';
        }
        row.appendChild(personaCell);
        
        // Create cell for request
        const requestCell = document.createElement('td');
        requestCell.className = 'small text-wrap';
        requestCell.style.fontSize = '0.8rem';
        requestCell.style.maxWidth = '150px';
        requestCell.title = rec.request; // Add tooltip with full text
        
        // Truncate request text if too long
        const maxLength = 50;
        const displayText = rec.request.length > maxLength ? 
            rec.request.substring(0, maxLength) + '...' : rec.request;
        requestCell.textContent = displayText;
        row.appendChild(requestCell);
        
        // Create cell for expected recommendations
        const expectedCell = document.createElement('td');
        expectedCell.className = 'text-wrap';
        expectedCell.style.fontSize = '0.8rem';
        
        // Create badges for expected recommendations - more compact
        const badgeHtml = rec.expected_restaurants.map(r => {
            const isFound = rec.potential_restaurants.some(a => 
                isSameRestaurant(r, a)
            );
            const badgeClass = isFound ? 'bg-success' : 'bg-secondary';
            // Extract first words to keep badges smaller
            const displayText = r.split(' ').slice(0, 3).join(' ');
            return `<span class="badge ${badgeClass} me-1 mb-1 d-inline-block" title="${r}">${displayText}</span>`;
        }).join('');
        
        expectedCell.innerHTML = `
            <div class="d-flex flex-wrap">
                ${badgeHtml}
            </div>
            <div class="small text-muted" style="font-size: 0.75rem">Total: ${rec.expected_restaurants.length}</div>
        `;
        row.appendChild(expectedCell);
        
        // Create cell for actual recommendations - more compact
        const actualCell = document.createElement('td');
        actualCell.className = 'text-wrap';
        actualCell.style.fontSize = '0.8rem';
        
        // Create badges for actual recommendations - more compact
        const actualBadges = rec.potential_restaurants.map((r, i) => {
            const isMatch = rec.expected_restaurants.some(exp => 
                isSameRestaurant(exp, r)
            );
            const bgClass = isMatch ? 'bg-success' : 'bg-danger';
            // Extract first words to keep badges smaller
            const displayText = r.split(' ').slice(0, 3).join(' ');
            return `<span class="badge ${bgClass} me-1 mb-1 d-inline-block" title="${r}">${i+1}. ${displayText}</span>`;
        }).join('');
        
        actualCell.innerHTML = `
            <div class="d-flex flex-wrap">
                ${actualBadges}
            </div>
        `;
        row.appendChild(actualCell);
        
        // Create cell for score and actions
        const scoreCell = document.createElement('td');
        scoreCell.className = 'text-center align-middle';
        
        const accuracy = (rec.accuracy * 100).toFixed(0);
        let scoreClass = 'danger';
        if (accuracy >= 75) scoreClass = 'success';
        else if (accuracy >= 50) scoreClass = 'warning';
        
        // Add score pill with details button
        scoreCell.innerHTML = `
            <div class="d-flex flex-column align-items-center">
                <div class="mb-1">
                    <span class="badge bg-${scoreClass} p-2">${accuracy}%</span>
                </div>
                <div>
                    <button class="btn btn-sm btn-primary view-conv-btn" 
                        data-conversation-id="${rec.conversation_id}"
                        data-bs-toggle="tooltip" title="View conversation">
                        <i class="bi bi-eye"></i>
                    </button>
                </div>
            </div>
        `;
        row.appendChild(scoreCell);
        
        // Add the row to the table
        tableBody.appendChild(row);
    });
    
    // Add click handler for "View Conversation" buttons in the table
    document.querySelectorAll('.view-conv-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const conversationId = parseInt(this.dataset.conversationId);
            
            // Switch to conversations tab
            document.getElementById('conversations-tab').click();
            
            // Find and click the corresponding conversation item
            const listItem = document.querySelector(`#conversations-list a[data-conversation-id="${conversationId}"]`);
            if (listItem) {
                listItem.click();
                // Scroll to the item to ensure it's visible
                listItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    });
}

// Helper function to compare restaurant names
function isSameRestaurant(name1, name2) {
    // Convert to lowercase for case-insensitive comparison
    name1 = name1.toLowerCase().trim();
    name2 = name2.toLowerCase().trim();
    
    // Exact match
    if (name1 === name2) {
        return true;
    }
    
    // Special case for restaurants with special characters or common words
    // Split into words and check word similarity
    const words1 = new Set(name1.split(/\s+/));
    const words2 = new Set(name2.split(/\s+/));
    
    // Common words in restaurant names that shouldn't determine a match by themselves
    const commonWords = new Set(['the', 'restaurant', 'café', 'cafe', 'bar', 'grill', 'bistro', 'kitchen']);
    
    // Remove common words for comparison
    const filteredWords1 = new Set([...words1].filter(word => !commonWords.has(word)));
    const filteredWords2 = new Set([...words2].filter(word => !commonWords.has(word)));
    
    // Check if they share substantial words
    if (filteredWords1.size > 0 && filteredWords2.size > 0) {
        const intersection = new Set([...filteredWords1].filter(x => filteredWords2.has(x)));
        
        // Only consider a match if they share significant unique words
        const minSize = Math.min(filteredWords1.size, filteredWords2.size);
        if (intersection.size >= minSize * 0.8) {
            // Additional length check to distinguish "Parigi" from "Bistrot Parigi"
            const shorter = name1.length < name2.length ? name1 : name2;
            const longer = name2.length > name1.length ? name2 : name1;
            
            // If the longer name is significantly longer, it's likely a different restaurant
            if (longer.length > shorter.length * 1.5) {
                // Check if shorter name appears as a complete word in longer name
                const longerWords = longer.split(/\s+/);
                if (longerWords.includes(shorter) && longerWords.length > 1) {
                    return false;
                }
            }
            
            return true;
        }
    }
    
    return false;
}
