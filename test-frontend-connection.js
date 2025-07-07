const fetch = require('node-fetch');

async function testBackendConnection() {
    console.log('🧪 Testing backend connection...');
    
    const testData = {
        CustomerName: 'Test Customer',
        region: 'United States',
        closeDate: '2024-12-31',
        oppName: 'Test Opportunity',
        oppDescription: 'This is a test opportunity for verification purposes.'
    };
    
    try {
        const response = await fetch('http://localhost:8123/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Backend connection successful!');
            console.log('📊 Response keys:', Object.keys(result));
            
            if (result.metrics) {
                console.log('💰 Metrics found:', Object.keys(result.metrics));
            }
            
            if (result.sections) {
                console.log('📋 Sections found:', Object.keys(result.sections));
            }
            
            return true;
        } else {
            const errorText = await response.text();
            console.error('❌ Backend connection failed:', response.status, errorText);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Connection error:', error.message);
        return false;
    }
}

// Run the test
testBackendConnection().then(success => {
    if (success) {
        console.log('\n🎉 Frontend should now be able to connect to backend!');
        console.log('🌐 Open http://localhost:3123 in your browser to test the application.');
    } else {
        console.log('\n⚠️  Backend connection failed. Please check if the backend server is running.');
    }
}); 