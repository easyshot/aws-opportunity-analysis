// Test script to verify current functionality
const http = require('http');

console.log('🧪 Testing current functionality...\n');

// Test backend server
function testBackend() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 8123,
      path: '/',
      method: 'GET'
    }, (res) => {
      console.log('✅ Backend server responding on port 8123');
      console.log(`   Status: ${res.statusCode}`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.log('❌ Backend server not responding:', err.message);
      reject(err);
    });
    
    req.end();
  });
}

// Test frontend server
function testFrontend() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3123,
      path: '/',
      method: 'GET'
    }, (res) => {
      console.log('✅ Frontend server responding on port 3123');
      console.log(`   Status: ${res.statusCode}`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.log('❌ Frontend server not responding:', err.message);
      reject(err);
    });
    
    req.end();
  });
}

// Test API endpoint
function testAPI() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      customerName: "Test Customer",
      customerRegion: "United States",
      closeDate: "2025-06-01",
      timeToLaunch: "6",
      description: "This is a test description with more than 50 characters to meet the minimum requirement for testing purposes."
    });

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
          console.log('✅ API endpoint responding');
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Response has metrics: ${!!response.metrics}`);
          console.log(`   Response has analysis: ${!!response.analysis}`);
          resolve(response);
        } catch (err) {
          console.log('❌ API response parsing failed:', err.message);
          reject(err);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log('❌ API endpoint not responding:', err.message);
      reject(err);
    });
    
    req.write(postData);
    req.end();
  });
}

// Run tests
async function runTests() {
  try {
    await testBackend();
    await testFrontend();
    console.log('\n🔍 Testing API functionality...');
    const apiResponse = await testAPI();
    
    console.log('\n📊 Test Results Summary:');
    console.log('✅ Backend server: Working');
    console.log('✅ Frontend server: Working');
    console.log('✅ API endpoint: Working');
    console.log('\n🎯 System appears to be functional!');
    console.log('\n📝 Next steps:');
    console.log('1. Open http://localhost:3123/ in browser');
    console.log('2. Test form functionality');
    console.log('3. Verify export, print, and theme toggle functions');
    
  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting needed');
  }
}

runTests();