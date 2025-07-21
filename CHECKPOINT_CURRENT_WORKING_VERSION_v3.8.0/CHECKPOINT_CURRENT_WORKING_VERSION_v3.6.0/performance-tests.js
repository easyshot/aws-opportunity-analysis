const axios = require('axios');
const { performance } = require('perf_hooks');

/**
 * Performance Tests for AWS Opportunity Analysis Application
 * Tests response times, throughput, and resource utilization
 */

const BASE_URL = process.env.TARGET_URL || 'http://localhost:8123';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS) || 10;
const TEST_DURATION = parseInt(process.env.TEST_DURATION) || 60; // seconds
const RAMP_UP_TIME = parseInt(process.env.RAMP_UP_TIME) || 30; // seconds

// Test data
const testOpportunities = [
  {
    customerName: 'Performance Test Customer 1',
    region: 'us-east-1',
    closeDate: '2024-12-31',
    opportunityName: 'Performance Test Opportunity 1',
    description: 'Large enterprise migration to AWS cloud infrastructure with focus on scalability and performance'
  },
  {
    customerName: 'Performance Test Customer 2',
    region: 'us-west-2',
    closeDate: '2024-11-30',
    opportunityName: 'Performance Test Opportunity 2',
    description: 'Mid-size company digital transformation using AWS serverless technologies and machine learning'
  },
  {
    customerName: 'Performance Test Customer 3',
    region: 'eu-west-1',
    closeDate: '2025-01-15',
    opportunityName: 'Performance Test Opportunity 3',
    description: 'Startup building modern web application with AWS container services and managed databases'
  }
];

// Performance metrics
const metrics = {
  requests: {
    total: 0,
    successful: 0,
    failed: 0,
    errors: []
  },
  responseTime: {
    min: Infinity,
    max: 0,
    total: 0,
    samples: []
  },
  throughput: {
    requestsPerSecond: 0,
    startTime: 0,
    endTime: 0
  },
  percentiles: {
    p50: 0,
    p90: 0,
    p95: 0,
    p99: 0
  }
};

/**
 * Make HTTP request and measure performance
 */
async function makeTimedRequest(url, data) {
  const startTime = performance.now();
  
  try {
    const response = await axios.post(url, data, {
      timeout: 60000, // 60 seconds
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    return {
      success: true,
      status: response.status,
      responseTime,
      dataSize: JSON.stringify(response.data).length
    };
  } catch (error) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    return {
      success: false,
      status: error.response?.status || 0,
      responseTime,
      error: error.message,
      dataSize: 0
    };
  }
}

/**
 * Update performance metrics
 */
function updateMetrics(result) {
  metrics.requests.total++;
  
  if (result.success) {
    metrics.requests.successful++;
  } else {
    metrics.requests.failed++;
    metrics.requests.errors.push({
      error: result.error,
      status: result.status,
      timestamp: new Date().toISOString()
    });
  }
  
  // Update response time metrics
  metrics.responseTime.total += result.responseTime;
  metrics.responseTime.min = Math.min(metrics.responseTime.min, result.responseTime);
  metrics.responseTime.max = Math.max(metrics.responseTime.max, result.responseTime);
  metrics.responseTime.samples.push(result.responseTime);
}

/**
 * Calculate percentiles
 */
function calculatePercentiles() {
  const samples = metrics.responseTime.samples.sort((a, b) => a - b);
  const count = samples.length;
  
  if (count === 0) return;
  
  metrics.percentiles.p50 = samples[Math.floor(count * 0.5)];
  metrics.percentiles.p90 = samples[Math.floor(count * 0.9)];
  metrics.percentiles.p95 = samples[Math.floor(count * 0.95)];
  metrics.percentiles.p99 = samples[Math.floor(count * 0.99)];
}

/**
 * Calculate throughput
 */
function calculateThroughput() {
  const duration = (metrics.throughput.endTime - metrics.throughput.startTime) / 1000; // seconds
  metrics.throughput.requestsPerSecond = metrics.requests.total / duration;
}

/**
 * Simulate user load
 */
async function simulateUser(userId, testDuration) {
  console.log(`User ${userId} starting load simulation...`);
  
  const endTime = Date.now() + (testDuration * 1000);
  let requestCount = 0;
  
  while (Date.now() < endTime) {
    const opportunity = testOpportunities[requestCount % testOpportunities.length];
    
    // Add user-specific variation
    const testData = {
      ...opportunity,
      customerName: `${opportunity.customerName} - User ${userId}`,
      opportunityName: `${opportunity.opportunityName} - Request ${requestCount + 1}`
    };
    
    const result = await makeTimedRequest(`${BASE_URL}/api/analyze`, testData);
    updateMetrics(result);
    
    requestCount++;
    
    // Add some randomness to request timing
    const delay = Math.random() * 2000 + 1000; // 1-3 seconds
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  console.log(`User ${userId} completed ${requestCount} requests`);
}

/**
 * Ramp up users gradually
 */
async function rampUpUsers(totalUsers, rampUpTime) {
  const userPromises = [];
  const intervalMs = (rampUpTime * 1000) / totalUsers;
  
  for (let i = 0; i < totalUsers; i++) {
    setTimeout(() => {
      const userPromise = simulateUser(i + 1, TEST_DURATION);
      userPromises.push(userPromise);
    }, i * intervalMs);
  }
  
  // Wait for ramp-up to complete
  await new Promise(resolve => setTimeout(resolve, rampUpTime * 1000));
  
  return userPromises;
}

/**
 * Test single request performance
 */
async function testSingleRequestPerformance() {
  console.log('Testing single request performance...');
  
  const testData = testOpportunities[0];
  const iterations = 10;
  const results = [];
  
  for (let i = 0; i < iterations; i++) {
    const result = await makeTimedRequest(`${BASE_URL}/api/analyze`, testData);
    results.push(result);
    
    if (!result.success) {
      console.error(`Request ${i + 1} failed:`, result.error);
    }
  }
  
  const successfulResults = results.filter(r => r.success);
  const avgResponseTime = successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulResults.length;
  const minResponseTime = Math.min(...successfulResults.map(r => r.responseTime));
  const maxResponseTime = Math.max(...successfulResults.map(r => r.responseTime));
  
  console.log('Single Request Performance Results:');
  console.log(`  Successful requests: ${successfulResults.length}/${iterations}`);
  console.log(`  Average response time: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`  Min response time: ${minResponseTime.toFixed(2)}ms`);
  console.log(`  Max response time: ${maxResponseTime.toFixed(2)}ms`);
  
  return {
    successRate: (successfulResults.length / iterations) * 100,
    avgResponseTime,
    minResponseTime,
    maxResponseTime
  };
}

/**
 * Test concurrent user load
 */
async function testConcurrentLoad() {
  console.log(`Testing concurrent load with ${CONCURRENT_USERS} users for ${TEST_DURATION} seconds...`);
  console.log(`Ramp-up time: ${RAMP_UP_TIME} seconds`);
  
  // Reset metrics
  Object.assign(metrics, {
    requests: { total: 0, successful: 0, failed: 0, errors: [] },
    responseTime: { min: Infinity, max: 0, total: 0, samples: [] },
    throughput: { requestsPerSecond: 0, startTime: Date.now(), endTime: 0 },
    percentiles: { p50: 0, p90: 0, p95: 0, p99: 0 }
  });
  
  // Start load test
  const userPromises = await rampUpUsers(CONCURRENT_USERS, RAMP_UP_TIME);
  
  // Wait for all users to complete
  await Promise.all(userPromises);
  
  // Finalize metrics
  metrics.throughput.endTime = Date.now();
  calculatePercentiles();
  calculateThroughput();
  
  return metrics;
}

/**
 * Test memory usage patterns
 */
async function testMemoryUsage() {
  console.log('Testing memory usage patterns...');
  
  const initialMemory = process.memoryUsage();
  const memorySnapshots = [initialMemory];
  
  // Make several requests and monitor memory
  for (let i = 0; i < 20; i++) {
    await makeTimedRequest(`${BASE_URL}/api/analyze`, testOpportunities[0]);
    
    if (i % 5 === 0) {
      const memoryUsage = process.memoryUsage();
      memorySnapshots.push(memoryUsage);
    }
  }
  
  const finalMemory = process.memoryUsage();
  memorySnapshots.push(finalMemory);
  
  console.log('Memory Usage Analysis:');
  console.log(`  Initial RSS: ${(initialMemory.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Final RSS: ${(finalMemory.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Memory increase: ${((finalMemory.rss - initialMemory.rss) / 1024 / 1024).toFixed(2)} MB`);
  
  return {
    initialMemory,
    finalMemory,
    memoryIncrease: finalMemory.rss - initialMemory.rss,
    snapshots: memorySnapshots
  };
}

/**
 * Test error handling under load
 */
async function testErrorHandling() {
  console.log('Testing error handling under load...');
  
  const invalidData = {
    customerName: '',
    region: 'invalid-region',
    closeDate: 'invalid-date',
    opportunityName: '',
    description: ''
  };
  
  const results = [];
  const iterations = 10;
  
  for (let i = 0; i < iterations; i++) {
    const result = await makeTimedRequest(`${BASE_URL}/api/analyze`, invalidData);
    results.push(result);
  }
  
  const errorResponses = results.filter(r => !r.success);
  const avgErrorResponseTime = errorResponses.reduce((sum, r) => sum + r.responseTime, 0) / errorResponses.length;
  
  console.log('Error Handling Results:');
  console.log(`  Error responses: ${errorResponses.length}/${iterations}`);
  console.log(`  Average error response time: ${avgErrorResponseTime.toFixed(2)}ms`);
  
  return {
    errorRate: (errorResponses.length / iterations) * 100,
    avgErrorResponseTime
  };
}

/**
 * Generate performance report
 */
function generateReport(singleRequestResults, loadTestResults, memoryResults, errorResults) {
  const report = {
    timestamp: new Date().toISOString(),
    testConfiguration: {
      baseUrl: BASE_URL,
      concurrentUsers: CONCURRENT_USERS,
      testDuration: TEST_DURATION,
      rampUpTime: RAMP_UP_TIME
    },
    singleRequest: singleRequestResults,
    loadTest: {
      requests: loadTestResults.requests,
      responseTime: {
        average: loadTestResults.responseTime.total / loadTestResults.requests.total,
        min: loadTestResults.responseTime.min,
        max: loadTestResults.responseTime.max
      },
      percentiles: loadTestResults.percentiles,
      throughput: loadTestResults.throughput,
      errors: loadTestResults.requests.errors.slice(0, 10) // First 10 errors
    },
    memory: memoryResults,
    errorHandling: errorResults,
    recommendations: []
  };
  
  // Generate recommendations
  if (report.singleRequest.avgResponseTime > 10000) {
    report.recommendations.push('Consider optimizing single request performance - average response time exceeds 10 seconds');
  }
  
  if (report.loadTest.requests.failed / report.loadTest.requests.total > 0.05) {
    report.recommendations.push('High error rate detected under load - investigate error handling and capacity');
  }
  
  if (report.loadTest.throughput.requestsPerSecond < 1) {
    report.recommendations.push('Low throughput detected - consider scaling infrastructure or optimizing code');
  }
  
  if (report.memory.memoryIncrease > 100 * 1024 * 1024) { // 100MB
    report.recommendations.push('Significant memory increase detected - investigate potential memory leaks');
  }
  
  return report;
}

/**
 * Main performance test runner
 */
async function runPerformanceTests() {
  console.log('Starting Performance Tests...');
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Configuration: ${CONCURRENT_USERS} users, ${TEST_DURATION}s duration, ${RAMP_UP_TIME}s ramp-up`);
  console.log('='.repeat(80));
  
  try {
    // Test 1: Single request performance
    const singleRequestResults = await testSingleRequestPerformance();
    console.log('');
    
    // Test 2: Memory usage
    const memoryResults = await testMemoryUsage();
    console.log('');
    
    // Test 3: Error handling
    const errorResults = await testErrorHandling();
    console.log('');
    
    // Test 4: Concurrent load test
    const loadTestResults = await testConcurrentLoad();
    console.log('');
    
    // Generate and display report
    const report = generateReport(singleRequestResults, loadTestResults, memoryResults, errorResults);
    
    console.log('='.repeat(80));
    console.log('PERFORMANCE TEST REPORT');
    console.log('='.repeat(80));
    console.log(JSON.stringify(report, null, 2));
    
    // Save report to file
    const fs = require('fs');
    const reportPath = `performance-results/performance-report-${Date.now()}.json`;
    
    // Ensure directory exists
    if (!fs.existsSync('performance-results')) {
      fs.mkdirSync('performance-results', { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nReport saved to: ${reportPath}`);
    
    // Exit with error code if performance is poor
    if (report.recommendations.length > 0) {
      console.log('\n⚠️  Performance issues detected. See recommendations above.');
      process.exit(1);
    }
    
    console.log('\n✅ All performance tests passed!');
    
  } catch (error) {
    console.error('Performance tests failed:', error);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runPerformanceTests();
}

module.exports = {
  runPerformanceTests,
  testSingleRequestPerformance,
  testConcurrentLoad,
  testMemoryUsage,
  testErrorHandling
};