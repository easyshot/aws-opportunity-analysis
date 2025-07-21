#!/usr/bin/env node

/**
 * Test script to trigger enhanced Bedrock logging
 * This will make a direct API call to test the comprehensive error diagnostics
 */

const axios = require('axios');

async function testEnhancedLogging() {
  console.log('🧪 Testing Enhanced Bedrock Logging');
  console.log('=====================================');
  
  const testData = {
    customerName: 'Test Corporation',
    region: 'United States',
    closeDate: '2024-12-31',
    oppName: 'Large Scale Cloud Migration Test',
    oppDescription: 'This is a test opportunity with a very long description to potentially trigger payload size issues. '.repeat(100), // Make it large
    industry: 'Technology',
    customerSegment: 'Enterprise',
    partnerName: 'Test Partner',
    activityFocus: 'Migration',
    businessDescription: 'Test business description',
    migrationPhase: 'Assess',
    settings: {
      enableTruncation: false, // Disable truncation to test size limits
      sqlQueryLimit: 250,
      truncationLimit: 400000,
      analysisTimeout: 120
    }
  };

  try {
    console.log('📡 Making API call to trigger Bedrock analysis...');
    console.log('   Endpoint: http://localhost:8123/api/analyze');
    console.log('   Truncation disabled to test size limits');
    console.log('   Large description to increase payload size');
    
    const response = await axios.post('http://localhost:8123/api/analyze', testData, {
      timeout: 180000, // 3 minutes
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API call successful');
    console.log('   Response status:', response.status);
    console.log('   Response size:', JSON.stringify(response.data).length, 'characters');
    
    if (response.data.fallbackMode) {
      console.log('⚠️  Response was in fallback mode');
      console.log('   Fallback reason:', response.data.fallbackReason);
    } else {
      console.log('✅ Real Bedrock analysis completed');
    }
    
  } catch (error) {
    console.log('❌ API call failed');
    console.log('   Error:', error.message);
    
    if (error.response) {
      console.log('   HTTP Status:', error.response.status);
      console.log('   Response data:', error.response.data);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.log('   💡 Server may not be running on port 8123');
    }
  }
}

// Run the test
testEnhancedLogging().catch(console.error);