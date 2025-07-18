// Test script for enhanced API validation
const axios = require('axios');

const API_BASE_URL = 'http://localhost:8123';

// Test data with enhanced fields
const testData = {
  // Required fields
  CustomerName: 'Test Customer Corp',
  oppName: 'Test Migration Opportunity',
  oppDescription: 'This is a comprehensive test of the enhanced API validation with all the new fields that have been added to support better opportunity analysis.',
  region: 'us-east-1',
  closeDate: '2025-12-31',
  
  // Enhanced fields
  industry: 'Technology',
  customerSegment: 'Enterprise',
  partnerName: 'AWS Partner Solutions',
  activityFocus: 'Migration',
  businessDescription: 'Large scale cloud migration project involving multiple workloads and data centers.',
  migrationPhase: 'Planning',
  salesforceLink: 'https://example.salesforce.com/opportunity/123',
  awsCalculatorLink: 'https://calculator.aws/estimate/123'
};

// Test cases
const testCases = [
  {
    name: 'Valid Enhanced Request',
    data: testData,
    expectSuccess: true
  },
  {
    name: 'Missing Required Field - CustomerName',
    data: { ...testData, CustomerName: '' },
    expectSuccess: false
  },
  {
    name: 'Invalid URL - Salesforce Link',
    data: { ...testData, salesforceLink: 'not-a-valid-url' },
    expectSuccess: false
  },
  {
    name: 'Invalid Date Format',
    data: { ...testData, closeDate: 'invalid-date' },
    expectSuccess: false
  },
  {
    name: 'Past Date',
    data: { ...testData, closeDate: '2020-01-01' },
    expectSuccess: false
  },
  {
    name: 'Field Too Long - Customer Name',
    data: { ...testData, CustomerName: 'A'.repeat(150) },
    expectSuccess: false
  },
  {
    name: 'Field Too Short - Opportunity Description',
    data: { ...testData, oppDescription: 'Short' },
    expectSuccess: false
  }
];

async function runTests() {
  console.log('🧪 Testing Enhanced API Validation\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    try {
      console.log(`Testing: ${testCase.name}`);
      
      const response = await axios.post(`${API_BASE_URL}/api/analyze/mock`, testCase.data, {
        timeout: 5000
      });
      
      if (testCase.expectSuccess) {
        if (response.status === 200) {
          console.log('✅ PASS - Request succeeded as expected');
          passed++;
        } else {
          console.log(`❌ FAIL - Expected success but got status ${response.status}`);
          failed++;
        }
      } else {
        console.log(`❌ FAIL - Expected validation error but request succeeded`);
        failed++;
      }
      
    } catch (error) {
      if (testCase.expectSuccess) {
        console.log(`❌ FAIL - Expected success but got error: ${error.response?.data?.message || error.message}`);
        failed++;
      } else {
        if (error.response?.status === 400 && error.response?.data?.validationErrors) {
          console.log('✅ PASS - Validation error caught as expected');
          console.log(`   Errors: ${error.response.data.validationErrors.map(e => e.message).join(', ')}`);
          passed++;
        } else {
          console.log(`❌ FAIL - Expected validation error but got: ${error.response?.data?.message || error.message}`);
          failed++;
        }
      }
    }
    
    console.log('');
  }
  
  console.log(`\n📊 Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Enhanced API validation is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the API validation logic.');
  }
}

// Test field validation function directly
function testValidationFunction() {
  console.log('\n🔍 Testing validation function directly...\n');
  
  // Mock the validation function (since we can't import it directly)
  function validateEnhancedInputFields(fields) {
    const errors = [];
    
    // Required field validation
    const requiredFields = [
      { field: 'CustomerName', label: 'Customer Name', value: fields.CustomerName },
      { field: 'oppName', label: 'Opportunity Name', value: fields.oppName },
      { field: 'oppDescription', label: 'Opportunity Description', value: fields.oppDescription },
      { field: 'region', label: 'Region', value: fields.region },
      { field: 'closeDate', label: 'Close Date', value: fields.closeDate }
    ];

    requiredFields.forEach(({ field, label, value }) => {
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors.push({
          field: field,
          message: `${label} is required`,
          type: 'required'
        });
      }
    });

    // Field length validation
    if (fields.CustomerName && fields.CustomerName.length > 100) {
      errors.push({
        field: 'CustomerName',
        message: 'Customer Name cannot exceed 100 characters',
        type: 'length'
      });
    }

    // URL validation
    if (fields.salesforceLink && fields.salesforceLink.trim() !== '') {
      try {
        const url = new URL(fields.salesforceLink);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          errors.push({
            field: 'salesforceLink',
            message: 'Salesforce Link must be a valid URL',
            type: 'format'
          });
        }
      } catch (_) {
        errors.push({
          field: 'salesforceLink',
          message: 'Salesforce Link must be a valid URL',
          type: 'format'
        });
      }
    }

    return errors;
  }
  
  // Test validation directly
  const validData = {
    CustomerName: 'Test Corp',
    oppName: 'Test Opportunity',
    oppDescription: 'This is a valid description that is long enough',
    region: 'us-east-1',
    closeDate: '2025-12-31',
    salesforceLink: 'https://example.salesforce.com/123'
  };
  
  const invalidData = {
    CustomerName: '',
    oppName: 'Test',
    oppDescription: 'Short',
    region: '',
    closeDate: '',
    salesforceLink: 'not-a-url'
  };
  
  console.log('Valid data validation:');
  const validErrors = validateEnhancedInputFields(validData);
  console.log(`Errors found: ${validErrors.length}`);
  if (validErrors.length > 0) {
    console.log('Errors:', validErrors.map(e => e.message));
  }
  
  console.log('\nInvalid data validation:');
  const invalidErrors = validateEnhancedInputFields(invalidData);
  console.log(`Errors found: ${invalidErrors.length}`);
  if (invalidErrors.length > 0) {
    console.log('Errors:', invalidErrors.map(e => e.message));
  }
}

// Run the tests
if (require.main === module) {
  testValidationFunction();
  
  // Only run API tests if server is likely running
  if (process.argv.includes('--api')) {
    runTests().catch(console.error);
  } else {
    console.log('\n💡 To test API endpoints, run: node test-enhanced-api-validation.js --api');
    console.log('   (Make sure the server is running on port 8123)');
  }
}

module.exports = { testValidationFunction };