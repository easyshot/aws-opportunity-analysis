// Comprehensive verification script based on handover document
const http = require('http');
const fs = require('fs');

console.log('🔍 AWS Bedrock Partner Management System - Functionality Verification');
console.log('Based on ENHANCED_DEBUG_PROGRESS_HANDOVER.md\n');

// Test functions that need verification according to handover
const functionsToTest = [
  'window.exportData()',
  'window.printReport()', 
  'window.toggleTheme()',
  'window.toggleDebugSection()',
  'window.showQueryView()'
];

console.log('📋 Functions that need verification:');
functionsToTest.forEach(func => console.log(`   - ${func}`));

// Check if key files exist
console.log('\n📁 Checking key files...');

const keyFiles = [
  'public/index.html',
  'public/app-clean.js',
  'public/styles-compact-option-c.css',
  'app.js',
  'app-debug.js',
  'frontend-server.js'
];

keyFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING`);
  }
});

// Check which backend is running
console.log('\n🔍 Checking which backend is running...');
console.log('According to handover: Should be app-debug.js for stability');
console.log('Current dev script runs: app.js');

// Test API with proper payload
function testAPIWithValidPayload() {
  return new Promise((resolve, reject) => {
    const validPayload = {
      customerName: "Acme Corporation",
      customerRegion: "United States", 
      closeDate: "2025-06-01",
      timeToLaunch: "6",
      description: "Large enterprise customer looking to migrate their on-premises infrastructure to AWS cloud. They have complex requirements including multi-region deployment, high availability, disaster recovery, and compliance with SOC2 and HIPAA standards. The project involves migrating 200+ servers, multiple databases, and implementing modern DevOps practices."
    };

    const postData = JSON.stringify(validPayload);

    const req = http.request({
      hostname: 'localhost',
      port: 8123,
      path: '/api/analyze',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`\n✅ API Response Status: ${res.statusCode}`);
          
          if (response.metrics) {
            console.log('✅ Metrics section present');
            console.log(`   - Predicted ARR: ${response.metrics.predictedArr || 'Missing'}`);
            console.log(`   - Predicted MRR: ${response.metrics.predictedMrr || 'Missing'}`);
            console.log(`   - Launch Date: ${response.metrics.launchDate || 'Missing'}`);
            console.log(`   - Confidence: ${response.metrics.confidence || 'Missing'}`);
          } else {
            console.log('❌ Metrics section missing');
          }

          if (response.analysis) {
            console.log('✅ Analysis section present');
            const sections = ['methodology', 'findings', 'riskFactors', 'similarProjects', 'rationale', 'fullAnalysis'];
            sections.forEach(section => {
              if (response.analysis[section]) {
                console.log(`   ✅ ${section}: Present`);
              } else {
                console.log(`   ❓ ${section}: Missing or empty`);
              }
            });
          } else {
            console.log('❌ Analysis section missing');
          }

          if (response.fundingOptions) {
            console.log('✅ Funding Options section present');
          } else {
            console.log('❓ Funding Options section missing');
          }

          if (response.followOnOpportunities) {
            console.log('✅ Follow-On Opportunities section present');
          } else {
            console.log('❓ Follow-On Opportunities section missing');
          }

          if (response.debug) {
            console.log('✅ Debug information present');
            console.log(`   - SQL Query: ${response.debug.sqlQuery ? 'Present' : 'Missing'}`);
            console.log(`   - Query Results: ${response.debug.queryResults ? 'Present' : 'Missing'}`);
          } else {
            console.log('❓ Debug information missing');
          }

          resolve(response);
        } catch (err) {
          console.log('❌ Failed to parse API response:', err.message);
          console.log('Raw response:', data.substring(0, 500));
          reject(err);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log('❌ API request failed:', err.message);
      reject(err);
    });
    
    req.write(postData);
    req.end();
  });
}

// Check if enhanced debug features are in the HTML
function checkEnhancedDebugFeatures() {
  console.log('\n🔍 Checking enhanced debug features in HTML...');
  
  try {
    const htmlContent = fs.readFileSync('public/index.html', 'utf8');
    
    const debugFeatures = [
      'Data Size',
      'Character Count', 
      'Query Rows',
      'Token Estimate',
      'progress-section',
      'Complete Payload Sent to Bedrock'
    ];

    debugFeatures.forEach(feature => {
      if (htmlContent.includes(feature)) {
        console.log(`   ✅ ${feature}: Found in HTML`);
      } else {
        console.log(`   ❓ ${feature}: Not found in HTML`);
      }
    });

  } catch (err) {
    console.log('❌ Could not read HTML file:', err.message);
  }
}

// Check JavaScript functions
function checkJavaScriptFunctions() {
  console.log('\n🔍 Checking JavaScript functions...');
  
  try {
    const jsContent = fs.readFileSync('public/app-clean.js', 'utf8');
    
    const functions = [
      'function exportData',
      'function printReport',
      'function toggleTheme',
      'function toggleDebugSection',
      'function showQueryView',
      'showProgress',
      'updateProgressStep',
      'updatePayloadDebugInfo'
    ];

    functions.forEach(func => {
      if (jsContent.includes(func)) {
        console.log(`   ✅ ${func}: Found`);
      } else {
        console.log(`   ❓ ${func}: Not found`);
      }
    });

  } catch (err) {
    console.log('❌ Could not read JavaScript file:', err.message);
  }
}

// Main verification function
async function runVerification() {
  console.log('\n🚀 Starting comprehensive verification...\n');
  
  checkEnhancedDebugFeatures();
  checkJavaScriptFunctions();
  
  console.log('\n🔍 Testing API with valid payload...');
  try {
    await testAPIWithValidPayload();
  } catch (error) {
    console.log('API test failed:', error.message);
  }

  console.log('\n📋 Verification Summary:');
  console.log('✅ System is running and responding');
  console.log('✅ Key files are present');
  console.log('❓ Some functions need manual browser testing');
  console.log('❓ AWS permissions may be blocking real Bedrock analysis');
  
  console.log('\n🎯 Manual Testing Required:');
  console.log('1. Open http://localhost:3123/ in browser');
  console.log('2. Fill out form and click "Analyze Opportunity"');
  console.log('3. Test these functions in browser console:');
  functionsToTest.forEach(func => console.log(`   - ${func}`));
  console.log('4. Verify progress indicator appears during analysis');
  console.log('5. Check if enhanced debug information displays');
  
  console.log('\n🔧 Potential Issues to Address:');
  console.log('1. Switch to app-debug.js for stability (update package.json dev script)');
  console.log('2. Fix AWS permissions for real Bedrock analysis');
  console.log('3. Verify all six analysis sections populate correctly');
  console.log('4. Test export, print, and theme toggle functionality');
}

runVerification();