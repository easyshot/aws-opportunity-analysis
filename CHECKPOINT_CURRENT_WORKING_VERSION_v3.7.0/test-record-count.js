/**
 * Test script to verify we're getting more than 40 records
 */

const axios = require('axios');

async function testRecordCount() {
  try {
    console.log('Testing record count with United Airlines example...');
    
    const testData = {
      customerName: 'United Airlines',
      region: 'United States',
      closeDate: '2024-12-31',
      oppName: 'Cloud Migration Project',
      oppDescription: 'Large-scale migration of on-premises infrastructure to AWS cloud. Includes database migration, application modernization, and security implementation. Expected to improve performance by 40% and reduce operational costs by 30%.',
      timeToLaunch: '6'
    };
    
    console.log('Sending request to backend...');
    const response = await axios.post('http://localhost:8123/api/analyze', testData, {
      timeout: 120000 // 2 minutes timeout
    });
    
    console.log('Response received. Checking debug information...');
    
    if (response.data && response.data.debugInfo) {
      const debugInfo = response.data.debugInfo;
      
      // Check SQL query
      if (debugInfo.sqlQuery) {
        const sqlQuery = typeof debugInfo.sqlQuery === 'string' ? debugInfo.sqlQuery : JSON.stringify(debugInfo.sqlQuery);
        console.log('SQL Query contains LIMIT 200:', sqlQuery.includes('LIMIT 200'));
        console.log('SQL Query length:', sqlQuery.length);
      }
      
      // Check query results
      if (debugInfo.queryResults) {
        const queryResults = typeof debugInfo.queryResults === 'string' ? debugInfo.queryResults : JSON.stringify(debugInfo.queryResults);
        console.log('Query Results length:', queryResults.length);
        
        // Try to parse and count rows
        try {
          const parsed = JSON.parse(queryResults);
          if (parsed.Rows && Array.isArray(parsed.Rows)) {
            console.log('Total rows in query results:', parsed.Rows.length);
            console.log('Data rows (excluding header):', parsed.Rows.length - 1);
          }
        } catch (e) {
          console.log('Could not parse query results as JSON');
        }
      }
      
      // Check Bedrock response
      if (debugInfo.fullResponse) {
        const fullResponse = debugInfo.fullResponse;
        console.log('Bedrock response length:', fullResponse.length);
        
        // Look for the analysis methodology section to see how many projects were analyzed
        const methodologyMatch = fullResponse.match(/Analyzed ALL N=(\d+) historical projects/i);
        if (methodologyMatch) {
          console.log('Bedrock analyzed', methodologyMatch[1], 'projects');
        } else {
          console.log('Could not find project count in Bedrock response');
        }
      }
    }
    
    console.log('Test completed successfully');
    
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response && error.response.data) {
      console.error('Response data:', error.response.data);
    }
  }
}

testRecordCount();