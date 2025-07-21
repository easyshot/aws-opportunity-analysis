// Simple validation test script
console.log('=== Real-time Form Validation Test ===');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, starting validation tests...');
  
  setTimeout(() => {
    // Test 1: Check if validation system exists
    console.log('\n1. Checking validation system...');
    if (window.formValidation) {
      console.log('✓ Validation system is available');
      console.log('✓ Initial form validity:', window.formValidation.isValid());
    } else {
      console.log('✗ Validation system not found');
    }
    
    // Test 2: Test required field validation
    console.log('\n2. Testing required field validation...');
    const customerField = document.getElementById('CustomerName');
    if (customerField) {
      console.log('✓ Customer name field found');
      
      // Test invalid input
      customerField.value = 'A';
      customerField.dispatchEvent(new Event('input'));
      setTimeout(() => {
        const hasError = customerField.classList.contains('field-invalid');
        console.log('✓ Short name validation:', hasError ? 'PASS' : 'FAIL');
        
        // Test valid input
        customerField.value = 'Valid Customer Name';
        customerField.dispatchEvent(new Event('input'));
        setTimeout(() => {
          const isValid = customerField.classList.contains('field-valid');
          console.log('✓ Valid name validation:', isValid ? 'PASS' : 'FAIL');
        }, 100);
      }, 100);
    } else {
      console.log('✗ Customer name field not found');
    }
    
    // Test 3: Test URL validation
    console.log('\n3. Testing URL validation...');
    const urlField = document.getElementById('salesforceLink');
    if (urlField) {
      console.log('✓ URL field found');
      
      // Test invalid URL
      urlField.value = 'invalid-url';
      urlField.dispatchEvent(new Event('input'));
      setTimeout(() => {
        const hasError = urlField.classList.contains('field-invalid');
        console.log('✓ Invalid URL validation:', hasError ? 'PASS' : 'FAIL');
        
        // Test valid URL
        urlField.value = 'https://example.salesforce.com';
        urlField.dispatchEvent(new Event('input'));
        setTimeout(() => {
          const isValid = urlField.classList.contains('field-valid');
          console.log('✓ Valid URL validation:', isValid ? 'PASS' : 'FAIL');
        }, 100);
      }, 100);
    } else {
      console.log('✗ URL field not found');
    }
    
    // Test 4: Test date validation
    console.log('\n4. Testing date validation...');
    const dateField = document.getElementById('closeDate');
    if (dateField) {
      console.log('✓ Date field found');
      
      // Test past date (should be invalid)
      dateField.value = '2020-01-01';
      dateField.dispatchEvent(new Event('change'));
      setTimeout(() => {
        const hasError = dateField.classList.contains('field-invalid');
        console.log('✓ Past date validation:', hasError ? 'PASS' : 'FAIL');
        
        // Test future date (should be valid)
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 3);
        dateField.value = futureDate.toISOString().split('T')[0];
        dateField.dispatchEvent(new Event('change'));
        setTimeout(() => {
          const isValid = dateField.classList.contains('field-valid');
          console.log('✓ Future date validation:', isValid ? 'PASS' : 'FAIL');
        }, 100);
      }, 100);
    } else {
      console.log('✗ Date field not found');
    }
    
    // Test 5: Test button state management
    console.log('\n5. Testing button state management...');
    setTimeout(() => {
      const button = document.getElementById('oppDetQueryButtonV3');
      if (button) {
        console.log('✓ Analyze button found');
        console.log('✓ Button disabled state:', button.disabled);
        console.log('✓ Button has disabled class:', button.classList.contains('button-disabled'));
        
        if (window.formValidation) {
          console.log('✓ Form validation state:', window.formValidation.isValid());
        }
      } else {
        console.log('✗ Analyze button not found');
      }
    }, 2000);
    
  }, 500);
});

console.log('Validation test script loaded');