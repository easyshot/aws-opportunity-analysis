/**
 * Simple test script using Node.js built-in modules
 */

const http = require('http');

function testRecordCount() {
  const postData = JSON.stringify({
    customerName: 'United Airlines',
    region: 'United States',
    closeDate: '2024-12-31',
    oppName: 'Cloud Migration Project',
    oppDescription: 'Large-scale migration of on-premises infrastructure to AWS cloud. Includes database migration, application modernization, and security implementation. Expected to improve performance by 40% and reduce operational costs by 30%.',
    timeToLaunch: '6'
  });

  const options = {
    hostname: 'localhost',
    port: 8123,
    path: '/api/analyze',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
    timeout: 120000
  };

  console.log('Testing record count with United Airlines example...');
  console.log('Sending request to backend...');

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('Response received. Checking debug information...');
        
        if (response.debugInfo) {
          const debugInfo = response.debugInfo;
          
          // Check SQL query
          if (debugInfo.sqlQuery) {
            const sqlQuery = typeof debugInfo.sqlQuery === 'string' ? debugInfo.sqlQuery : JSON.stringify(debugInfo.sqlQuery);
            console.log('✓ SQL Query contains LIMIT 200:', sqlQuery.includes('LIMIT 200'));
            console.log('✓ SQL Query length:', sqlQuery.length);
          }
          
          // Check query results
          if (debugInfo.queryResults) {
            const queryResults = typeof debugInfo.queryResults === 'string' ? debugInfo.queryResults : JSON.stringify(debugInfo.queryResults);
            console.log('✓ Query Results length:', queryResults.length);
            
            // Try to parse and count rows
            try {
              const parsed = JSON.parse(queryResults);
              if (parsed.Rows && Array.isArray(parsed.Rows)) {
                console.log('✓ Total rows in query results:', parsed.Rows.length);
                console.log('✓ Data rows (excluding header):', parsed.Rows.length - 1);
              }
            } catch (e) {
              console.log('⚠ Could not parse query results as JSON');
            }
          }
          
          // Check Bedrock response
          if (debugInfo.fullResponse) {
            const fullResponse = debugInfo.fullResponse;
            console.log('✓ Bedrock response length:', fullResponse.length);
            
            // Look for the analysis methodology section to see how many projects were analyzed
            const methodologyMatch = fullResponse.match(/Analyzed ALL N=(\d+) historical projects/i);
            if (methodologyMatch) {
              console.log('🎯 Bedrock analyzed', methodologyMatch[1], 'projects');
              
              if (parseInt(methodologyMatch[1]) > 40) {
                console.log('✅ SUCCESS: More than 40 projects analyzed!');
              } else {
                console.log('❌ ISSUE: Still only analyzing', methodologyMatch[1], 'projects');
              }
            } else {
              console.log('⚠ Could not find project count in Bedrock response');
              console.log('First 500 chars of response:', fullResponse.substring(0, 500));
            }
          }
        } else {
          console.log('❌ No debug information in response');
        }
        
        console.log('✅ Test completed successfully');
        
      } catch (error) {
        console.error('❌ Error parsing response:', error.message);
        console.log('Raw response:', data.substring(0, 1000));
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
  });

  req.on('timeout', () => {
    console.error('❌ Request timed out');
    req.destroy();
  });

  req.write(postData);
  req.end();
}

testRecordCount();