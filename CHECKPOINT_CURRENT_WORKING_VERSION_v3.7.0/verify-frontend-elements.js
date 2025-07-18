// Verify frontend elements are present and accessible
const puppeteer = require('puppeteer');

async function verifyFrontendElements() {
  console.log('🔍 Verifying frontend elements...');
  
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Navigate to the frontend
    await page.goto('http://localhost:3123', { waitUntil: 'networkidle0' });
    
    console.log('✅ Page loaded successfully');
    
    // Check for required form elements
    const formElements = [
      'customerName',
      'region', 
      'closeDate',
      'opportunityName',
      'description',
      'analyzeBtn'
    ];
    
    console.log('\n📝 Checking form elements:');
    for (const elementId of formElements) {
      const element = await page.$(`#${elementId}`);
      if (element) {
        console.log(`✅ ${elementId} - Found`);
      } else {
        console.log(`❌ ${elementId} - Missing`);
      }
    }
    
    // Check for required output elements
    const outputElements = [
      'predictedArr',
      'predictedMrr', 
      'launchDate',
      'timeToLaunch',
      'confidenceScore',
      'confidenceLabel',
      'topServices',
      'methodology',
      'findings',
      'rationale',
      'riskFactors',
      'similarProjects'
    ];
    
    console.log('\n📊 Checking output elements:');
    for (const elementId of outputElements) {
      const element = await page.$(`#${elementId}`);
      if (element) {
        console.log(`✅ ${elementId} - Found`);
      } else {
        console.log(`❌ ${elementId} - Missing`);
      }
    }
    
    // Test form interaction
    console.log('\n🧪 Testing form interaction:');
    
    // Fill out the form
    await page.type('#customerName', 'Test Customer');
    await page.select('#region', 'United States');
    await page.type('#closeDate', '2024-12-31');
    await page.type('#opportunityName', 'Test Opportunity');
    await page.type('#description', 'This is a test opportunity description.');
    
    console.log('✅ Form filled successfully');
    
    // Check if analyze button is enabled
    const analyzeBtn = await page.$('#analyzeBtn');
    const isDisabled = await analyzeBtn.evaluate(btn => btn.disabled);
    
    if (!isDisabled) {
      console.log('✅ Analyze button is enabled');
    } else {
      console.log('❌ Analyze button is disabled');
    }
    
    // Test JavaScript functionality
    console.log('\n🔧 Testing JavaScript functionality:');
    
    const jsFunctions = await page.evaluate(() => {
      return {
        analyzeOpportunity: typeof window.analyzeOpportunity === 'function',
        clearForm: typeof window.clearForm === 'function',
        loadSampleData: typeof window.loadSampleData === 'function',
        toggleTheme: typeof window.toggleTheme === 'function'
      };
    });
    
    for (const [func, exists] of Object.entries(jsFunctions)) {
      if (exists) {
        console.log(`✅ ${func} - Available`);
      } else {
        console.log(`❌ ${func} - Missing`);
      }
    }
    
    console.log('\n🎉 Frontend verification complete!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run verification
verifyFrontendElements(); 