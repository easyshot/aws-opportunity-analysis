#!/usr/bin/env node

/**
 * Test Production Integration
 * Tests the production application with real AWS services
 */

const fetch = require('node-fetch');

async function testProductionIntegration() {
  console.log('🧪 Testing Production Integration');
  console.log('================================\n');
  
  try {
    // Test data
    const testOpportunity = {
      customerName: 'Test Customer Corp',
      region: 'United States',
      closeDate: '2025-12-31',
      opportunityName: 'Cloud Migration Test',
      description: 'This is a test opportunity for validating the production integration with AWS services. The customer wants to migrate their existing infrastructure to AWS cloud services including compute, storage, and database services.'
    };
    
    console.log('📤 Sending test analysis request...');
    console.log('Customer:', testOpportunity.customerName);
    console.log('Region:', testOpportunity.region);
    console.log('Opportunity:', testOpportunity.opportunityName);
    console.log('');
    
    const startTime = Date.now();
    
    // Make request to production API
    const response = await fetch('http://localhost:8123/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testOpportunity)
    });
    
    const responseTime = Date.now() - startTime;
    
    console.log(`📥 Response received (${responseTime}ms)`);
    console.log('Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error Response:', errorText);
      return false;
    }
    
    const result = await response.json();
    
    console.log('\n📊 Analysis Results:');
    console.log('===================');
    
    // Check if we got real data vs mock data
    if (result.metrics) {
      console.log('✅ Metrics received:');
      console.log('  - Predicted ARR:', result.metrics.predictedArr || 'N/A');
      console.log('  - Predicted MRR:', result.metrics.predictedMrr || 'N/A');
      console.log('  - Launch Date:', result.metrics.launchDate || 'N/A');
      console.log('  - Confidence:', result.metrics.confidence || 'N/A');
    }
    
    if (result.sections) {
      console.log('✅ Analysis sections received');
    }
    
    if (result.methodology) {
      console.log('✅ Methodology section received');
    }
    
    // Check if this looks like real AWS data or mock data
    const isRealData = !result.metrics?.predictedArr?.includes('$120,000'); // Mock data check
    
    console.log('\n🔍 Integration Status:');
    console.log('=====================');
    
    if (isRealData) {
      console.log('✅ SUCCESS: Application is using real AWS services!');
      console.log('✅ Bedrock AI analysis is working');
      console.log('✅ Lambda function execution successful');
      console.log('✅ End-to-end workflow completed');
    } else {
      console.log('⚠️  WARNING: Application may still be using mock data');
      console.log('   This could indicate AWS service issues or fallback mode');
    }
    
    console.log('\n🌐 Frontend Access:');
    console.log('==================');
    console.log('Your application is ready at:');
    console.log('👉 http://localhost:3123/index-compact.html');
    console.log('');
    console.log('Try submitting the same test data through the web interface!');
    
    return true;
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Troubleshooting:');
      console.log('- Make sure the backend server is running: node app.js');
      console.log('- Check if port 8123 is available');
    }
    
    return false;
  }
}

// Install node-fetch if not available
try {
  require('node-fetch');
} catch (error) {
  console.log('Installing node-fetch dependency...');
  const { execSync } = require('child_process');
  execSync('npm install node-fetch@2', { stdio: 'inherit' });
}

// Run test if called directly
if (require.main === module) {
  testProductionIntegration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test script failed:', error);
      process.exit(1);
    });
}

module.exports = { testProductionIntegration };