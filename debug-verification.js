// Debug script to understand the relevance scoring issue
require('dotenv').config();

async function debugRelevanceScoring() {
  try {
    console.log('=== DEBUGGING RELEVANCE SCORING ===');
    
    // Test the current analysis to see what we're getting
    const testData = {
      CustomerName: "American Airlines",
      region: "United States", 
      closeDate: "2025-03-01",
      oppName: "Cloud Migration Project",
      oppDescription: "Large-scale migration of on-premises infrastructure to AWS cloud. Includes database migration, application modernization, and security implementation."
    };

    console.log('Test data:', testData);
    console.log('\nMaking API call...');

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
    
    console.log('\n=== RESULTS ANALYSIS ===');
    console.log('Projects found in methodology:', result.methodology.match(/N=(\d+)/)?.[1] || 'Not found');
    
    // Check if we have debug info
    if (result.debugInfo) {
      console.log('\n=== SQL QUERY ANALYSIS ===');
      const sqlQuery = JSON.parse(result.debugInfo.sqlQuery).sql_query;
      console.log('SQL contains LIMIT 200:', sqlQuery.includes('LIMIT 200'));
      console.log('SQL contains >= 45:', sqlQuery.includes('>= 45'));
      
      // Look for the relevance score threshold
      const thresholdMatch = sqlQuery.match(/relevance_score >= (\d+)/);
      if (thresholdMatch) {
        console.log('Current relevance threshold:', thresholdMatch[1]);
      }
      
      console.log('\n=== QUERY RESULTS ANALYSIS ===');
      const queryResults = JSON.parse(result.debugInfo.queryResults);
      console.log('Total rows returned:', queryResults.Rows.length - 1); // -1 for header row
      console.log('Expected: 200, Actual:', queryResults.Rows.length - 1);
      
      if (queryResults.Rows.length - 1 < 200) {
        console.log('\n❌ PROBLEM IDENTIFIED:');
        console.log('The SQL query is only returning', queryResults.Rows.length - 1, 'projects');
        console.log('This means the relevance_score >= 45 filter is too restrictive');
        console.log('Only', queryResults.Rows.length - 1, 'projects meet the relevance criteria');
        console.log('\n💡 SOLUTION:');
        console.log('Need to lower the relevance threshold in the query prompt');
        console.log('Suggest changing from >= 45 to >= 30 or >= 35');
      } else {
        console.log('✅ SQL query is returning the expected number of results');
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugRelevanceScoring();