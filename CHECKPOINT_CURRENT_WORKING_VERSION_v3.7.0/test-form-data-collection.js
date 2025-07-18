// Task 6.2: Test implementation for enhanced form data collection

// Enhanced form data collection function
function getFormData() {
  // Get industry value (handle "Other" option)
  const industrySelect = document.getElementById('industry');
  const industryOther = document.getElementById('industryOther');
  const industryValue = industrySelect?.value === 'Other' ? industryOther?.value?.trim() || '' : industrySelect?.value || '';

  // Collect all enhanced input fields
  const formData = {
    // Basic Details
    CustomerName: document.getElementById('CustomerName')?.value?.trim() || '',
    oppName: document.getElementById('oppName')?.value?.trim() || '',
    oppDescription: document.getElementById('oppDescription')?.value?.trim() || '',
    
    // Location & Timing
    region: document.getElementById('region')?.value || '',
    closeDate: document.getElementById('closeDate')?.value || '',
    
    // Business Context
    industry: industryValue,
    customerSegment: document.getElementById('customerSegment')?.value || '',
    partnerName: document.getElementById('partnerName')?.value?.trim() || '',
    
    // Technical Details
    activityFocus: document.getElementById('activityFocus')?.value || '',
    businessDescription: document.getElementById('businessDescription')?.value?.trim() || '',
    migrationPhase: document.getElementById('migrationPhase')?.value || '',
    salesforceLink: document.getElementById('salesforceLink')?.value?.trim() || '',
    awsCalculatorLink: document.getElementById('awsCalculatorLink')?.value?.trim() || ''
  };

  return formData;
}

// Enhanced form validation function
function validateFormData(formData) {
  const errors = [];
  const warnings = [];

  // Validate required fields
  const requiredFields = [
    { field: 'CustomerName', label: 'Customer Name' },
    { field: 'oppName', label: 'Opportunity Name' },
    { field: 'oppDescription', label: 'Opportunity Description' },
    { field: 'region', label: 'Region' },
    { field: 'closeDate', label: 'Close Date' }
  ];

  requiredFields.forEach(({ field, label }) => {
    if (!formData[field] || formData[field].trim() === '') {
      errors.push(`${label} is required`);
    }
  });

  // Validate field lengths and formats
  if (formData.CustomerName && formData.CustomerName.length < 2) {
    errors.push('Customer Name must be at least 2 characters');
  }
  if (formData.CustomerName && formData.CustomerName.length > 100) {
    errors.push('Customer Name cannot exceed 100 characters');
  }

  if (formData.oppName && formData.oppName.length < 3) {
    errors.push('Opportunity Name must be at least 3 characters');
  }
  if (formData.oppName && formData.oppName.length > 150) {
    errors.push('Opportunity Name cannot exceed 150 characters');
  }

  if (formData.oppDescription && formData.oppDescription.length < 10) {
    errors.push('Opportunity Description must be at least 10 characters');
  }
  if (formData.oppDescription && formData.oppDescription.length > 2000) {
    errors.push('Opportunity Description cannot exceed 2000 characters');
  }

  // Validate date format and future date
  if (formData.closeDate) {
    const closeDate = new Date(formData.closeDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isNaN(closeDate.getTime())) {
      errors.push('Close Date must be a valid date');
    } else if (closeDate <= today) {
      errors.push('Close Date must be in the future');
    }
  }

  // Validate optional field lengths
  if (formData.partnerName && formData.partnerName.length > 0) {
    if (formData.partnerName.length < 2) {
      errors.push('Partner Name must be at least 2 characters');
    }
    if (formData.partnerName.length > 100) {
      errors.push('Partner Name cannot exceed 100 characters');
    }
  }

  if (formData.businessDescription && formData.businessDescription.length > 0) {
    if (formData.businessDescription.length < 10) {
      errors.push('Business Description must be at least 10 characters');
    }
    if (formData.businessDescription.length > 1500) {
      errors.push('Business Description cannot exceed 1500 characters');
    }
  }

  // Validate URL formats
  const urlFields = [
    { field: 'salesforceLink', label: 'Salesforce Link' },
    { field: 'awsCalculatorLink', label: 'AWS Calculator Link' }
  ];

  urlFields.forEach(({ field, label }) => {
    if (formData[field] && formData[field].length > 0) {
      try {
        const url = new URL(formData[field]);
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.push(`${label} must be a valid URL starting with http:// or https://`);
        }
      } catch (e) {
        errors.push(`${label} must be a valid URL format`);
      }
    }
  });

  // Validate industry "Other" specification
  if (formData.industry === '' && document.getElementById('industry')?.value === 'Other') {
    errors.push('Please specify the industry when "Other" is selected');
  }

  // Generate warnings for missing optional but recommended fields
  if (!formData.industry) {
    warnings.push('Industry information helps improve analysis accuracy');
  }
  if (!formData.customerSegment) {
    warnings.push('Customer segment information helps improve predictions');
  }
  if (!formData.activityFocus) {
    warnings.push('Activity focus helps identify relevant similar projects');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    hasWarnings: warnings.length > 0
  };
}

// Test function to demonstrate usage
function testFormDataCollection() {
  console.log('Testing form data collection...');
  
  // Mock form data for testing
  const mockFormData = {
    CustomerName: 'Test Customer',
    oppName: 'Test Opportunity',
    oppDescription: 'This is a test opportunity description with sufficient length',
    region: 'us-east-1',
    closeDate: '2025-12-31',
    industry: 'Technology',
    customerSegment: 'Enterprise',
    partnerName: 'Test Partner',
    activityFocus: 'Migration',
    businessDescription: 'Detailed business description for testing purposes',
    migrationPhase: 'Planning',
    salesforceLink: 'https://example.salesforce.com/opportunity/123',
    awsCalculatorLink: 'https://calculator.aws/estimate/456'
  };
  
  const validation = validateFormData(mockFormData);
  console.log('Validation result:', validation);
  
  return validation;
}

// Export functions for use in main application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getFormData,
    validateFormData,
    testFormDataCollection
  };
}