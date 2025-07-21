// Test script to verify the analysis endpoint is working with the new prompt ARN
require('dotenv').config();

async function testAnalysisEndpoint() {
  try {
    console.log('Testing analysis endpoint with new prompt ARN...');
    
    const testData = {
      CustomerName: "Test Customer",
      region: "United States", 
      closeDate: "2025-03-01",
      oppName: "Test Opportunity",
      oppDescription: "This is a test opportunity for cloud migration and modernization. The customer wants to migrate their legacy applications to AWS and implement modern cloud-native solutions. They are looking for improved performance, scalability, and cost optimization.",
      industry: "Technology",
      customerSegment: "Commercial",
      partnerName: "Test Partner",
      activityFocus: "Cloud Migration",
      businessDescription: "Technology company looking to modernize their infrastructure",
      migrationPhase: "Assessment"
    };

    const response = await fetch('http://localhost:8123/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ Analysis endpoint test successful!');
    console.log('Response status:', response.status);
    console.log('Fallback mode:', result.fallbackMode || false);
    console.log('Analysis completed:', !!result.metrics);
    console.log('Predicted ARR:', result.metrics?.predictedArr);
    console.log('Confidence:', result.metrics?.confidence);
    
    if (result.fallbackMode) {
      console.log('⚠️  Still in fallback mode. Check server logs for errors.');
      console.log('Fallback reason:', result.fallbackReason);
    } else {
      console.log('🎉 Real Bedrock analysis working!');
    }
    
  } catch (error) {
    console.error('❌ Analysis endpoint test failed:', error.message);
  }
}

testAnalysisEndpoint();