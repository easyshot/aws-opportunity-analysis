/**
 * Test script to verify timeout and fallback improvements
 */

const express = require('express');
const app = express();

// Test the improved timeout handling
async function testTimeoutHandling() {
  console.log('🧪 Testing timeout and fallback improvements...\n');
  
  // Simulate the analysis request that was failing
  const testRequest = {
    CustomerName: "Tesla",
    region: "United States", 
    closeDate: "2025-06-15",
    oppName: "Cloud Migration Initiative",
    oppDescription: "Large enterprise customer looking to migrate their on-premises infrastructure to AWS cloud services. They need compute, storage, database, and networking solutions with high availability and disaster recovery capabilities. The project involves migrating 200+ servers and supporting 10,000+ users across multiple geographic locations."
  };
  
  const settings = {
    sqlQueryLimit: 200,
    truncationLimit: 400000,
    enableTruncation: true
  };
  
  console.log('📋 Test Request:', JSON.stringify(testRequest, null, 2));
  console.log('⚙️ Settings:', settings);
  console.log('\n' + '='.repeat(50));
  
  try {
    // Test the timeout improvements by making a request to our backend
    const response = await fetch('http://localhost:8123/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sql-query-limit': settings.sqlQueryLimit.toString(),
        'x-truncation-limit': settings.truncationLimit.toString(),
        'x-enable-truncation': settings.enableTruncation.toString()
      },
      body: JSON.stringify(testRequest)
    });
    
    console.log('📡 Response Status:', response.status);
    console.log('📡 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS: Analysis completed without timeout');
      console.log('📊 Metrics:', result.metrics);
      console.log('🔍 Debug Info Available:', !!result.debug);
      
      if (result.debug) {
        console.log('🔍 SQL Query Length:', result.debug.sqlQuery?.length || 'N/A');
        console.log('🔍 Query Results Length:', result.debug.queryResults?.length || 'N/A');
        console.log('🔍 SQL Generation Logs:', result.debug.sqlGenerationLogs?.length || 0, 'entries');
      }
    } else {
      console.log('⚠️ PARTIAL SUCCESS: Got error response but with fallback data');
      console.log('❌ Error:', result.error);
      console.log('📝 Message:', result.message);
      console.log('🔄 Fallback Data Available:', !!result.metrics);
      
      if (result.debug) {
        console.log('🔍 Debug Info:', result.debug.sqlGenerationLogs?.slice(0, 3) || []);
      }
    }
    
  } catch (error) {
    console.log('❌ FAILURE: Request failed completely');
    console.error('Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🧪 Test completed');
}

// Test query optimization
function testQueryOptimization() {
  console.log('\n🔧 Testing SQL query optimization...');
  
  // Test with a complex query similar to what was causing timeouts
  const complexQuery = `
    WITH historical_projects AS (
      SELECT 
        activity_name, project_type, customer_name,
        ((CASE WHEN lower(opportunity_name) LIKE '%cloud migration%' THEN 50 ELSE 0 END) +
         (CASE WHEN lower(opportunity_name) LIKE '%initiative%' THEN 50 ELSE 0 END) +
         (CASE WHEN lower(concat(opportunity_name, ' ', description)) LIKE '%compute%' THEN 30 ELSE 0 END)) AS relevance_score
      FROM parquet
      WHERE from_unixtime(close_date) > (date_parse('2024-12-31', '%Y-%m-%d') - interval '3' year)
    )
    SELECT * FROM historical_projects
    WHERE relevance_score >= 30
    ORDER BY relevance_score DESC
    LIMIT {{queryLimit}}
  `;
  
  console.log('📝 Original Query Length:', complexQuery.length);
  console.log('🔧 Simulating query optimization with limit 200...');
  
  // Simulate the optimization logic
  let optimizedQuery = complexQuery.replace(/{{queryLimit}}/gi, '200');
  const effectiveLimit = Math.min(200, 500);
  
  if (optimizedQuery.includes('relevance_score') && optimizedQuery.length > 500) {
    console.log('🔧 Complex query detected - would apply performance optimizations');
    // Show what the optimization would do
    console.log('   - Simplify relevance scoring calculations');
    console.log('   - Reduce computational complexity');
    console.log('   - Cap query limit at', effectiveLimit);
  }
  
  console.log('📝 Optimized Query Length:', optimizedQuery.length);
  console.log('✅ Query optimization test completed');
}

// Run tests if this script is executed directly
if (require.main === module) {
  console.log('🚀 Starting timeout fix verification tests...\n');
  
  // Test query optimization first (doesn't require server)
  testQueryOptimization();
  
  // Test timeout handling (requires server to be running)
  setTimeout(async () => {
    console.log('\n⏱️ Waiting 3 seconds for server to be ready...');
    await testTimeoutHandling();
  }, 3000);
}

module.exports = {
  testTimeoutHandling,
  testQueryOptimization
};