const axios = require('axios');
const crypto = require('crypto');
const { expect } = require('@jest/globals');

/**
 * Security Tests for AWS Opportunity Analysis Application
 * Tests security vulnerabilities, authentication, and data protection
 */

const BASE_URL = process.env.TARGET_URL || 'http://localhost:8123';
const API_TIMEOUT = 30000; // 30 seconds

// Security test data
const maliciousPayloads = {
  sqlInjection: [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "admin'--",
    "' UNION SELECT * FROM information_schema.tables --"
  ],
  xss: [
    "<script>alert('XSS')</script>",
    "javascript:alert('XSS')",
    "<img src=x onerror=alert('XSS')>",
    "';alert(String.fromCharCode(88,83,83))//';alert(String.fromCharCode(88,83,83))//",
    "\";alert(String.fromCharCode(88,83,83))//\";alert(String.fromCharCode(88,83,83))//"
  ],
  commandInjection: [
    "; ls -la",
    "| cat /etc/passwd",
    "&& whoami",
    "`id`",
    "$(whoami)"
  ],
  pathTraversal: [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
    "....//....//....//etc/passwd",
    "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"
  ]
};

/**
 * Make HTTP request with security testing configuration
 */
async function makeSecureRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      validateStatus: () => true // Don't throw on any status code
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return {
      status: response.status,
      data: response.data,
      headers: response.headers
    };
  } catch (error) {
    return {
      status: 0,
      data: null,
      headers: {},
      error: error.message
    };
  }
}

/**
 * Test Suite: SQL Injection Protection
 */
async function testSqlInjectionProtection() {
  console.log('Testing SQL injection protection...');
  
  const vulnerabilities = [];
  
  for (const payload of maliciousPayloads.sqlInjection) {
    const testData = {
      customerName: payload,
      region: 'us-east-1',
      closeDate: '2024-12-31',
      opportunityName: payload,
      description: payload
    };
    
    const response = await makeSecureRequest('POST', '/api/analyze', testData);
    
    // Check if SQL injection was successful (should not be)
    if (response.status === 200 && response.data && response.data.success) {
      // Check response for signs of SQL injection success
      const responseStr = JSON.stringify(response.data).toLowerCase();
      if (responseStr.includes('table') || responseStr.includes('schema') || responseStr.includes('database')) {
        vulnerabilities.push({
          type: 'SQL Injection',
          payload,
          response: response.data
        });
      }
    }
  }
  
  if (vulnerabilities.length > 0) {
    console.error('⚠️  SQL injection vulnerabilities detected:', vulnerabilities);
    throw new Error(`SQL injection vulnerabilities found: ${vulnerabilities.length}`);
  }
  
  console.log('✓ SQL injection protection test passed');
}

/**
 * Test Suite: Cross-Site Scripting (XSS) Protection
 */
async function testXssProtection() {
  console.log('Testing XSS protection...');
  
  const vulnerabilities = [];
  
  for (const payload of maliciousPayloads.xss) {
    const testData = {
      customerName: payload,
      region: 'us-east-1',
      closeDate: '2024-12-31',
      opportunityName: payload,
      description: payload
    };
    
    const response = await makeSecureRequest('POST', '/api/analyze', testData);
    
    // Check if XSS payload is reflected unescaped
    if (response.status === 200 && response.data) {
      const responseStr = JSON.stringify(response.data);
      if (responseStr.includes('<script>') || responseStr.includes('javascript:') || responseStr.includes('onerror=')) {
        vulnerabilities.push({
          type: 'XSS',
          payload,
          response: response.data
        });
      }
    }
  }
  
  if (vulnerabilities.length > 0) {
    console.error('⚠️  XSS vulnerabilities detected:', vulnerabilities);
    throw new Error(`XSS vulnerabilities found: ${vulnerabilities.length}`);
  }
  
  console.log('✓ XSS protection test passed');
}

/**
 * Test Suite: Command Injection Protection
 */
async function testCommandInjectionProtection() {
  console.log('Testing command injection protection...');
  
  const vulnerabilities = [];
  
  for (const payload of maliciousPayloads.commandInjection) {
    const testData = {
      customerName: payload,
      region: 'us-east-1',
      closeDate: '2024-12-31',
      opportunityName: payload,
      description: payload
    };
    
    const response = await makeSecureRequest('POST', '/api/analyze', testData);
    
    // Check for signs of command execution
    if (response.status === 200 && response.data) {
      const responseStr = JSON.stringify(response.data).toLowerCase();
      if (responseStr.includes('root:') || responseStr.includes('uid=') || responseStr.includes('gid=')) {
        vulnerabilities.push({
          type: 'Command Injection',
          payload,
          response: response.data
        });
      }
    }
  }
  
  if (vulnerabilities.length > 0) {
    console.error('⚠️  Command injection vulnerabilities detected:', vulnerabilities);
    throw new Error(`Command injection vulnerabilities found: ${vulnerabilities.length}`);
  }
  
  console.log('✓ Command injection protection test passed');
}

/**
 * Test Suite: Path Traversal Protection
 */
async function testPathTraversalProtection() {
  console.log('Testing path traversal protection...');
  
  const vulnerabilities = [];
  
  for (const payload of maliciousPayloads.pathTraversal) {
    // Test in various endpoints
    const endpoints = [
      `/api/analyze`,
      `/api/health`,
      `/${payload}`
    ];
    
    for (const endpoint of endpoints) {
      const response = await makeSecureRequest('GET', endpoint);
      
      // Check for file system access
      if (response.status === 200 && response.data) {
        const responseStr = JSON.stringify(response.data).toLowerCase();
        if (responseStr.includes('root:x:') || responseStr.includes('localhost') || responseStr.includes('127.0.0.1')) {
          vulnerabilities.push({
            type: 'Path Traversal',
            payload,
            endpoint,
            response: response.data
          });
        }
      }
    }
  }
  
  if (vulnerabilities.length > 0) {
    console.error('⚠️  Path traversal vulnerabilities detected:', vulnerabilities);
    throw new Error(`Path traversal vulnerabilities found: ${vulnerabilities.length}`);
  }
  
  console.log('✓ Path traversal protection test passed');
}

/**
 * Test Suite: HTTP Security Headers
 */
async function testSecurityHeaders() {
  console.log('Testing HTTP security headers...');
  
  const response = await makeSecureRequest('GET', '/api/health');
  const headers = response.headers;
  
  const requiredHeaders = {
    'x-content-type-options': 'nosniff',
    'x-frame-options': ['DENY', 'SAMEORIGIN'],
    'x-xss-protection': '1; mode=block',
    'strict-transport-security': null, // Should exist
    'content-security-policy': null, // Should exist
    'referrer-policy': null // Should exist
  };
  
  const missingHeaders = [];
  const weakHeaders = [];
  
  for (const [headerName, expectedValue] of Object.entries(requiredHeaders)) {
    const headerValue = headers[headerName];
    
    if (!headerValue) {
      missingHeaders.push(headerName);
    } else if (Array.isArray(expectedValue)) {
      if (!expectedValue.includes(headerValue)) {
        weakHeaders.push({
          header: headerName,
          expected: expectedValue,
          actual: headerValue
        });
      }
    } else if (expectedValue && headerValue !== expectedValue) {
      weakHeaders.push({
        header: headerName,
        expected: expectedValue,
        actual: headerValue
      });
    }
  }
  
  if (missingHeaders.length > 0) {
    console.warn('⚠️  Missing security headers:', missingHeaders);
  }
  
  if (weakHeaders.length > 0) {
    console.warn('⚠️  Weak security headers:', weakHeaders);
  }
  
  console.log('✓ Security headers test completed');
}

/**
 * Test Suite: Input Validation
 */
async function testInputValidation() {
  console.log('Testing input validation...');
  
  const invalidInputs = [
    {
      name: 'Empty strings',
      data: {
        customerName: '',
        region: '',
        closeDate: '',
        opportunityName: '',
        description: ''
      }
    },
    {
      name: 'Null values',
      data: {
        customerName: null,
        region: null,
        closeDate: null,
        opportunityName: null,
        description: null
      }
    },
    {
      name: 'Undefined values',
      data: {
        customerName: undefined,
        region: undefined,
        closeDate: undefined,
        opportunityName: undefined,
        description: undefined
      }
    },
    {
      name: 'Very long strings',
      data: {
        customerName: 'A'.repeat(10000),
        region: 'B'.repeat(10000),
        closeDate: 'C'.repeat(10000),
        opportunityName: 'D'.repeat(10000),
        description: 'E'.repeat(100000)
      }
    },
    {
      name: 'Invalid data types',
      data: {
        customerName: 12345,
        region: true,
        closeDate: [],
        opportunityName: {},
        description: function() {}
      }
    }
  ];
  
  const validationIssues = [];
  
  for (const testCase of invalidInputs) {
    const response = await makeSecureRequest('POST', '/api/analyze', testCase.data);
    
    // Should return 400 or 422 for invalid input
    if (response.status === 200) {
      validationIssues.push({
        testCase: testCase.name,
        issue: 'Accepted invalid input',
        data: testCase.data
      });
    }
  }
  
  if (validationIssues.length > 0) {
    console.warn('⚠️  Input validation issues:', validationIssues);
  }
  
  console.log('✓ Input validation test completed');
}

/**
 * Test Suite: Rate Limiting and DoS Protection
 */
async function testRateLimitingAndDosProtection() {
  console.log('Testing rate limiting and DoS protection...');
  
  const requests = [];
  const requestCount = 50;
  const startTime = Date.now();
  
  // Send many requests rapidly
  for (let i = 0; i < requestCount; i++) {
    requests.push(makeSecureRequest('POST', '/api/analyze', {
      customerName: `DoS Test ${i}`,
      region: 'us-east-1',
      closeDate: '2024-12-31',
      opportunityName: `DoS Test Opportunity ${i}`,
      description: 'DoS protection test'
    }));
  }
  
  const responses = await Promise.all(requests);
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // Analyze responses
  const statusCounts = {};
  responses.forEach(response => {
    statusCounts[response.status] = (statusCounts[response.status] || 0) + 1;
  });
  
  console.log(`DoS test results: ${requestCount} requests in ${duration}ms`);
  console.log('Status code distribution:', statusCounts);
  
  // Check if rate limiting is working
  const rateLimitedCount = statusCounts[429] || 0;
  const tooManyRequestsCount = statusCounts[503] || 0;
  
  if (rateLimitedCount === 0 && tooManyRequestsCount === 0) {
    console.warn('⚠️  No rate limiting detected - potential DoS vulnerability');
  } else {
    console.log(`✓ Rate limiting working: ${rateLimitedCount + tooManyRequestsCount} requests limited`);
  }
  
  console.log('✓ Rate limiting and DoS protection test completed');
}

/**
 * Test Suite: Data Encryption and Sensitive Information
 */
async function testDataEncryptionAndSensitiveInfo() {
  console.log('Testing data encryption and sensitive information handling...');
  
  const sensitiveData = {
    customerName: 'ACME Corp (SSN: 123-45-6789)',
    region: 'us-east-1',
    closeDate: '2024-12-31',
    opportunityName: 'Credit Card Processing (4111-1111-1111-1111)',
    description: 'API Key: sk-1234567890abcdef, Password: admin123, Email: user@example.com'
  };
  
  const response = await makeSecureRequest('POST', '/api/analyze', sensitiveData);
  
  if (response.status === 200 && response.data) {
    const responseStr = JSON.stringify(response.data);
    
    // Check for sensitive data patterns in response
    const sensitivePatterns = [
      /\d{3}-\d{2}-\d{4}/, // SSN
      /\d{4}-\d{4}-\d{4}-\d{4}/, // Credit card
      /sk-[a-zA-Z0-9]+/, // API key
      /password:\s*\w+/i, // Password
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/ // Email
    ];
    
    const foundSensitiveData = [];
    sensitivePatterns.forEach((pattern, index) => {
      if (pattern.test(responseStr)) {
        foundSensitiveData.push({
          pattern: pattern.toString(),
          type: ['SSN', 'Credit Card', 'API Key', 'Password', 'Email'][index]
        });
      }
    });
    
    if (foundSensitiveData.length > 0) {
      console.error('⚠️  Sensitive data exposed in response:', foundSensitiveData);
      throw new Error(`Sensitive data exposure detected: ${foundSensitiveData.length} patterns found`);
    }
  }
  
  console.log('✓ Data encryption and sensitive information test passed');
}

/**
 * Test Suite: Authentication and Authorization
 */
async function testAuthenticationAndAuthorization() {
  console.log('Testing authentication and authorization...');
  
  // Test without authentication headers
  const unauthenticatedResponse = await makeSecureRequest('POST', '/api/analyze', {
    customerName: 'Test Customer',
    region: 'us-east-1',
    closeDate: '2024-12-31',
    opportunityName: 'Test Opportunity',
    description: 'Authentication test'
  });
  
  // Test with invalid authentication
  const invalidAuthResponse = await makeSecureRequest('POST', '/api/analyze', {
    customerName: 'Test Customer',
    region: 'us-east-1',
    closeDate: '2024-12-31',
    opportunityName: 'Test Opportunity',
    description: 'Authentication test'
  }, {
    'Authorization': 'Bearer invalid-token'
  });
  
  // Test with malformed authentication
  const malformedAuthResponse = await makeSecureRequest('POST', '/api/analyze', {
    customerName: 'Test Customer',
    region: 'us-east-1',
    closeDate: '2024-12-31',
    opportunityName: 'Test Opportunity',
    description: 'Authentication test'
  }, {
    'Authorization': 'InvalidFormat'
  });
  
  // Note: If the API doesn't require authentication, this is informational
  console.log('Authentication test results:');
  console.log(`  Unauthenticated: ${unauthenticatedResponse.status}`);
  console.log(`  Invalid auth: ${invalidAuthResponse.status}`);
  console.log(`  Malformed auth: ${malformedAuthResponse.status}`);
  
  if (unauthenticatedResponse.status === 200) {
    console.warn('⚠️  API allows unauthenticated access');
  }
  
  console.log('✓ Authentication and authorization test completed');
}

/**
 * Test Suite: Error Information Disclosure
 */
async function testErrorInformationDisclosure() {
  console.log('Testing error information disclosure...');
  
  const errorTriggers = [
    {
      name: 'Invalid JSON',
      data: '{"invalid": json}',
      contentType: 'application/json'
    },
    {
      name: 'Malformed request',
      data: 'not-json-at-all',
      contentType: 'application/json'
    }
  ];
  
  const informationDisclosures = [];
  
  for (const trigger of errorTriggers) {
    const response = await makeSecureRequest('POST', '/api/analyze', trigger.data);
    
    if (response.data && typeof response.data === 'object') {
      const responseStr = JSON.stringify(response.data).toLowerCase();
      
      // Check for sensitive information in error messages
      const sensitivePatterns = [
        'stack trace',
        'file path',
        'database',
        'internal server error',
        'exception',
        'debug',
        'aws',
        'lambda',
        'bedrock'
      ];
      
      const foundPatterns = sensitivePatterns.filter(pattern => 
        responseStr.includes(pattern)
      );
      
      if (foundPatterns.length > 0) {
        informationDisclosures.push({
          trigger: trigger.name,
          patterns: foundPatterns,
          response: response.data
        });
      }
    }
  }
  
  if (informationDisclosures.length > 0) {
    console.warn('⚠️  Information disclosure in error messages:', informationDisclosures);
  }
  
  console.log('✓ Error information disclosure test completed');
}

/**
 * Generate security test report
 */
function generateSecurityReport(testResults) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: testResults.length,
      passed: testResults.filter(r => r.status === 'passed').length,
      failed: testResults.filter(r => r.status === 'failed').length,
      warnings: testResults.filter(r => r.status === 'warning').length
    },
    tests: testResults,
    recommendations: []
  };
  
  // Generate recommendations based on results
  if (report.summary.failed > 0) {
    report.recommendations.push('Address critical security vulnerabilities immediately');
  }
  
  if (report.summary.warnings > 0) {
    report.recommendations.push('Review and address security warnings');
  }
  
  report.recommendations.push('Implement regular security testing in CI/CD pipeline');
  report.recommendations.push('Consider using AWS WAF for additional protection');
  report.recommendations.push('Enable AWS CloudTrail for audit logging');
  
  return report;
}

/**
 * Main security test runner
 */
async function runSecurityTests() {
  console.log('Starting Security Tests...');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('='.repeat(60));
  
  const tests = [
    { name: 'SQL Injection Protection', fn: testSqlInjectionProtection },
    { name: 'XSS Protection', fn: testXssProtection },
    { name: 'Command Injection Protection', fn: testCommandInjectionProtection },
    { name: 'Path Traversal Protection', fn: testPathTraversalProtection },
    { name: 'Security Headers', fn: testSecurityHeaders },
    { name: 'Input Validation', fn: testInputValidation },
    { name: 'Rate Limiting and DoS Protection', fn: testRateLimitingAndDosProtection },
    { name: 'Data Encryption and Sensitive Info', fn: testDataEncryptionAndSensitiveInfo },
    { name: 'Authentication and Authorization', fn: testAuthenticationAndAuthorization },
    { name: 'Error Information Disclosure', fn: testErrorInformationDisclosure }
  ];
  
  const testResults = [];
  
  for (const test of tests) {
    try {
      await test.fn();
      testResults.push({
        name: test.name,
        status: 'passed',
        message: 'Test completed successfully'
      });
    } catch (error) {
      testResults.push({
        name: test.name,
        status: 'failed',
        message: error.message,
        error: error.stack
      });
    }
  }
  
  // Generate and display report
  const report = generateSecurityReport(testResults);
  
  console.log('='.repeat(60));
  console.log('SECURITY TEST REPORT');
  console.log('='.repeat(60));
  console.log(JSON.stringify(report, null, 2));
  
  // Save report to file
  const fs = require('fs');
  const reportPath = `security-results/security-report-${Date.now()}.json`;
  
  // Ensure directory exists
  if (!fs.existsSync('security-results')) {
    fs.mkdirSync('security-results', { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport saved to: ${reportPath}`);
  
  // Exit with error code if critical issues found
  if (report.summary.failed > 0) {
    console.log('\n⚠️  Critical security issues detected. See report above.');
    process.exit(1);
  }
  
  console.log('\n✅ All security tests completed!');
}

// Run tests if called directly
if (require.main === module) {
  runSecurityTests().catch(error => {
    console.error('Security tests failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runSecurityTests,
  testSqlInjectionProtection,
  testXssProtection,
  testCommandInjectionProtection,
  testPathTraversalProtection,
  testSecurityHeaders,
  testInputValidation,
  testRateLimitingAndDosProtection,
  testDataEncryptionAndSensitiveInfo,
  testAuthenticationAndAuthorization,
  testErrorInformationDisclosure
};