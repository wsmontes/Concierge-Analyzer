/*
MySQL API Frontend Test Script
Tests the deployed MySQL API on PythonAnywhere with correct endpoints
Uses /mysql-api/* prefix for integrated API routes
*/

// Configuration
const API_BASE_URL = 'https://wsmontes.pythonanywhere.com/mysql-api';
const TIMEOUT = 10000; // 10 seconds

// Test results container
let testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
};

// Utility functions
function log(message, type = 'info') {
    const styles = {
        info: 'color: #333; font-weight: normal;',
        success: 'color: #28a745; font-weight: bold;',
        error: 'color: #dc3545; font-weight: bold;',
        warning: 'color: #ffc107; font-weight: bold;',
        header: 'color: #007bff; font-weight: bold; font-size: 16px;'
    };
    console.log(`%c${message}`, styles[type]);
}

function logHeader(title) {
    console.log(`%c============================================================`, 'color: #007bff;');
    console.log(`%c 🔍 Testing: ${title}`, 'color: #007bff; font-weight: bold;');
}

async function makeRequest(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        clearTimeout(timeoutId);
        
        const data = await response.json();
        return { response, data, error: null };
    } catch (error) {
        clearTimeout(timeoutId);
        return { response: null, data: null, error: error.message };
    }
}

// Individual test functions
async function testHealthCheck() {
    logHeader('Health Check Endpoint');
    
    const { response, data, error } = await makeRequest(`${API_BASE_URL}/health`);
    
    let passed = true;
    const checks = [];
    
    if (error) {
        log(`❌ Request failed: ${error}`, 'error');
        return false;
    }
    
    // Check HTTP status
    if (response.status === 200) {
        log(' ✅ HTTP status is OK (200)', 'success');
        checks.push(true);
    } else {
        log(` ❌ HTTP status is ${response.status}, expected 200`, 'error');
        checks.push(false);
        passed = false;
    }
    
    // Check response structure
    if (data && data.status) {
        log(` ✅ API status is ${data.status}`, 'success');
        checks.push(true);
        
        if (data.status === 'healthy') {
            log(' ✅ API reports healthy status', 'success');
            checks.push(true);
        } else {
            log(` ⚠️ API reports: ${data.status}`, 'warning');
            if (data.error) {
                log(`   Error: ${data.error}`, 'warning');
            }
            checks.push(false);
        }
    } else {
        log(' ❌ Invalid response structure', 'error');
        checks.push(false);
        passed = false;
    }
    
    // Check timestamp
    if (data && data.timestamp) {
        log(' ✅ Timestamp is present', 'success');
        checks.push(true);
    } else {
        log(' ❌ Timestamp missing', 'error');
        checks.push(false);
        passed = false;
    }
    
    log(`Response data: ${JSON.stringify(data, null, 2)}`);
    return passed;
}

async function testApiInfo() {
    logHeader('API Info Endpoint');
    
    const { response, data, error } = await makeRequest(`${API_BASE_URL}/info`);
    
    let passed = true;
    
    if (error) {
        log(`❌ Request failed: ${error}`, 'error');
        return false;
    }
    
    // Check HTTP status
    if (response.status === 200) {
        log(' ✅ HTTP status is OK (200)', 'success');
    } else {
        log(` ❌ HTTP status is ${response.status}`, 'error');
        passed = false;
    }
    
    // Check response structure
    if (data && data.status === 'success') {
        log(' ✅ Status is success', 'success');
    } else {
        log(` ❌ Status is not success: ${data?.status}`, 'error');
        passed = false;
    }
    
    if (data?.data?.name) {
        log(` ✅ API name: ${data.data.name}`, 'success');
    } else {
        log(' ❌ API name missing', 'error');
        passed = false;
    }
    
    if (data?.data?.version) {
        log(` ✅ API version: ${data.data.version}`, 'success');
    } else {
        log(' ❌ API version missing', 'error');
        passed = false;
    }
    
    if (data?.data?.supported_entities?.length > 0) {
        log(` ✅ Supported entities: ${data.data.supported_entities.join(', ')}`, 'success');
    } else {
        log(' ❌ Supported entities missing or empty', 'error');
        passed = false;
    }
    
    if (data?.data?.endpoints) {
        log(` ✅ Endpoints: ${Object.keys(data.data.endpoints).join(', ')}`, 'success');
    } else {
        log(' ❌ Endpoints information missing', 'error');
        passed = false;
    }
    
    return passed;
}

async function testGetEntities() {
    logHeader('Get Entities (with filters)');
    
    const params = new URLSearchParams({
        entity_type: 'restaurant',
        status: 'active',
        page: '1',
        per_page: '5'
    });
    
    const { response, data, error } = await makeRequest(`${API_BASE_URL}/entities?${params}`);
    
    let passed = true;
    
    if (error) {
        log(`❌ Request failed: ${error}`, 'error');
        return false;
    }
    
    // Check HTTP status
    if (response.status === 200) {
        log(' ✅ HTTP status is OK (200)', 'success');
    } else {
        log(` ❌ HTTP status is ${response.status}`, 'error');
        passed = false;
    }
    
    // Check response structure
    if (data && data.status === 'success') {
        log(' ✅ Status is success', 'success');
    } else {
        log(` ❌ Status is not success: ${data?.status}`, 'error');
        if (data?.error) {
            log(`   Error: ${data.error}`, 'error');
        }
        passed = false;
    }
    
    if (data?.data?.entities && Array.isArray(data.data.entities)) {
        log(` ✅ Entities array present (${data.data.entities.length} entities)`, 'success');
    } else {
        log(' ❌ Entities array missing or invalid', 'error');
        passed = false;
    }
    
    if (data?.data?.pagination) {
        log(` ✅ Pagination info: page ${data.data.pagination.page} of ${data.data.pagination.pages}`, 'success');
    } else {
        log(' ❌ Pagination info missing', 'error');
        passed = false;
    }
    
    return passed;
}

async function testCreateEntity() {
    logHeader('Create New Entity');
    
    const entityData = {
        entity_type: 'restaurant',
        name: 'Test Restaurant via Browser',
        external_id: 'browser-test-001',
        status: 'active',
        entity_data: {
            metadata: [{
                type: 'collector',
                source: 'browser-test',
                data: {
                    name: 'Test Restaurant via Browser',
                    description: 'Created during browser testing',
                    location: {
                        latitude: 40.7128,
                        longitude: -74.0060,
                        address: '123 Test St, New York, NY'
                    }
                }
            }],
            categories: {
                Cuisine: ['Test'],
                'Price Range': ['Moderate']
            }
        },
        created_by: 'browser-test',
        updated_by: 'browser-test'
    };
    
    const { response, data, error } = await makeRequest(`${API_BASE_URL}/entities`, {
        method: 'POST',
        body: JSON.stringify(entityData)
    });
    
    let passed = true;
    
    if (error) {
        log(`❌ Request failed: ${error}`, 'error');
        return { passed: false, entityId: null };
    }
    
    // Check HTTP status
    if (response.status === 201) {
        log(' ✅ HTTP status is Created (201)', 'success');
    } else {
        log(` ❌ HTTP status is ${response.status}`, 'error');
        if (data?.error) {
            log(`   Error: ${data.error}`, 'error');
        }
        passed = false;
    }
    
    let entityId = null;
    if (data && data.status === 'success' && data.data?.entity_id) {
        log(` ✅ Entity created with ID: ${data.data.entity_id}`, 'success');
        entityId = data.data.entity_id;
    } else {
        log(' ❌ Entity creation failed or ID missing', 'error');
        passed = false;
    }
    
    return { passed, entityId };
}

async function testImportConciergeV2() {
    logHeader('Import Concierge V2 Format');
    
    const importData = [{
        metadata: [{
            type: 'collector',
            source: 'local',
            data: {
                name: 'Imported Test Restaurant',
                description: 'Imported via Concierge V2 format during testing',
                location: {
                    latitude: 40.7589,
                    longitude: -73.9851,
                    address: '456 Import Ave, New York, NY'
                }
            }
        }],
        categories: {
            Cuisine: ['Italian'],
            'Price Range': ['Expensive'],
            Mood: ['Romantic']
        }
    }];
    
    const { response, data, error } = await makeRequest(`${API_BASE_URL}/import/concierge-v2`, {
        method: 'POST',
        body: JSON.stringify(importData)
    });
    
    let passed = true;
    
    if (error) {
        log(`❌ Request failed: ${error}`, 'error');
        return false;
    }
    
    // Check HTTP status
    if (response.status === 200) {
        log(' ✅ HTTP status is OK (200)', 'success');
    } else {
        log(` ❌ HTTP status is ${response.status}`, 'error');
        if (data?.error) {
            log(`   Error: ${data.error}`, 'error');
        }
        passed = false;
    }
    
    // Check import results
    if (data && data.status === 'success') {
        log(' ✅ Import status is success', 'success');
        if (data.data?.summary) {
            const summary = data.data.summary;
            log(` ✅ Import summary: ${summary.successful} successful, ${summary.failed} failed`, 'success');
        }
    } else {
        log(` ❌ Import failed: ${data?.error || 'Unknown error'}`, 'error');
        passed = false;
    }
    
    return passed;
}

// Main test runner
async function runAllTests() {
    console.clear();
    log('🚀 Starting MySQL API Test Suite', 'header');
    log(`Testing API: ${API_BASE_URL}`, 'info');
    
    const startTime = Date.now();
    
    // Run all tests
    const tests = [
        { name: 'Health Check Endpoint', fn: testHealthCheck },
        { name: 'API Info Endpoint', fn: testApiInfo },
        { name: 'Get Entities (with filters)', fn: testGetEntities },
        { name: 'Create New Entity', fn: testCreateEntity },
        { name: 'Import Concierge V2 Format', fn: testImportConciergeV2 }
    ];
    
    let entityId = null;
    
    for (const test of tests) {
        try {
            const result = await test.fn();
            
            if (test.name === 'Create New Entity' && typeof result === 'object') {
                entityId = result.entityId;
                testResults.total++;
                if (result.passed) {
                    testResults.passed++;
                    log(` ✅ ${test.name}: PASSED`, 'success');
                } else {
                    testResults.failed++;
                    log(` ❌ ${test.name}: FAILED`, 'error');
                }
            } else {
                testResults.total++;
                if (result) {
                    testResults.passed++;
                    log(` ✅ ${test.name}: PASSED`, 'success');
                } else {
                    testResults.failed++;
                    log(` ❌ ${test.name}: FAILED`, 'error');
                }
            }
            
            testResults.details.push({
                name: test.name,
                passed: typeof result === 'object' ? result.passed : result
            });
            
        } catch (error) {
            testResults.total++;
            testResults.failed++;
            log(` ❌ ${test.name}: ERROR - ${error.message}`, 'error');
            testResults.details.push({
                name: test.name,
                passed: false,
                error: error.message
            });
        }
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // Summary
    console.log(`%c============================================================`, 'color: #007bff;');
    console.log(`%c📊 TEST SUMMARY`, 'color: #007bff; font-weight: bold;');
    console.log(`%c============================================================`, 'color: #007bff;');
    console.log(`%cTotal Tests: ${testResults.total}`);
    console.log(`%cPassed: ${testResults.passed} ✅`, 'color: #28a745;');
    console.log(`%cFailed: ${testResults.failed} ❌`, 'color: #dc3545;');
    console.log(`%cPass Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    console.log(`%cDuration: ${duration}s`);
    
    console.log(`%c ============================================================`, 'color: #007bff;');
    
    if (testResults.passed === testResults.total) {
        console.log(`%c✅ ALL TESTS PASSED: MySQL API is working perfectly!`, 'color: #28a745; font-weight: bold;');
    } else if (testResults.passed > 0) {
        console.log(`%c⚠️ PARTIALLY WORKING: ${testResults.passed}/${testResults.total} tests passed.`, 'color: #ffc107; font-weight: bold;');
        console.log(`%cCheck deployment configuration and database connectivity.`, 'color: #ffc107;');
    } else {
        console.log(`%c❌ NOT WORKING: All tests failed.`, 'color: #dc3545; font-weight: bold;');
        console.log(`%cCheck WSGI integration, dependencies, and database setup.`, 'color: #dc3545;');
    }
    
    console.log(`%c============================================================`, 'color: #007bff;');
    
    return testResults;
}

// Auto-run tests
runAllTests().then(results => {
    // Results available for further processing
    window.mysqlApiTestResults = results;
});