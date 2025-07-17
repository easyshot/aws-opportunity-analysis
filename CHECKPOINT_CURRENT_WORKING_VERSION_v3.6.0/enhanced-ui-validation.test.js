/**
 * Unit Tests for Enhanced UI Form Validation Functions
 * Tests real-time validation for all field types and form data collection
 */

const { JSDOM } = require('jsdom');

// Mock DOM environment
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
</head>
<body>
  <form id="opportunityForm">
    <!-- Basic Details Section -->
    <input type="text" id="CustomerName" name="CustomerName" required />
    <input type="text" id="oppName" name="oppName" required />
    <textarea id="oppDescription" name="oppDescription" required></textarea>
    
    <!-- Location & Timing Section -->
    <select id="region" name="region" required>
      <option value="">Select Region</option>
      <option value="us-east-1">US East (N. Virginia)</option>
      <option value="us-west-2">US West (Oregon)</option>
    </select>
    <input type="date" id="closeDate" name="closeDate" required />
    
    <!-- Business Context Section -->
    <select id="industry" name="industry">
      <option value="">Select Industry</option>
      <option value="Technology">Technology</option>
      <option value="Healthcare">Healthcare</option>
      <option value="Other">Other</option>
    </select>
    <input type="text" id="industryOther" name="industryOther" style="display: none;" />
    <select id="customerSegment" name="customerSegment">
      <option value="">Select Segment</option>
      <option value="Enterprise">Enterprise</option>
      <option value="Mid-Market">Mid-Market</option>
    </select>
    <input type="text" id="partnerName" name="partnerName" />
    
    <!-- Technical Details Section -->
    <select id="activityFocus" name="activityFocus">
      <option value="">Select Activity</option>
      <option value="Migration">Migration</option>
      <option value="Modernization">Modernization</option>
    </select>
    <textarea id="businessDescription" name="businessDescription"></textarea>
    <select id="migrationPhase" name="migrationPhase">
      <option value="">Select Phase</option>
      <option value="Assessment">Assessment</option>
      <option value="Planning">Planning</option>
    </select>
    <input type="url" id="salesforceLink" name="salesforceLink" />
    <input type="url" id="awsCalculatorLink" name="awsCalculatorLink" />
  </form>
  
  <!-- Validation error containers -->
  <div id="CustomerName-error" class="error-message"></div>
  <div id="oppName-error" class="error-message"></div>
  <div id="oppDescription-error" class="error-message"></div>
  <div id="region-error" class="error-message"></div>
  <div id="closeDate-error" class="error-message"></div>
  <div id="industry-error" class="error-message"></div>
  <div id="industryOther-error" class="error-message"></div>
  <div id="customerSegment-error" class="error-message"></div>
  <div id="partnerName-error" class="error-message"></div>
  <div id="activityFocus-error" class="error-message"></div>
  <div id="businessDescription-error" class="error-message"></div>
  <div id="migrationPhase-error" class="error-message"></div>
  <div id="salesforceLink-error" class="error-message"></div>
  <div id="awsCalculatorLink-error" class="error-message"></div>
</body>
</html>
`, { url: 'http://localhost' });

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

// Mock validation functions based on the frontend code
class FormValidator {
  constructor() {
    this.validationState = {
      isValid: false,
      fieldStates: {},
      validationRules: {}
    };
    this.initializeValidationRules();
  }

  initializeValidationRules() {
    this.validationState.validationRules = {
      'CustomerName': {
        required: true,
        minLength: 2,
        maxLength: 100,
        pattern: /^[a-zA-Z0-9\s\-&.,()]+$/,
        errorMessages: {
          required: 'Customer name is required',
          minLength: 'Customer name must be at least 2 characters',
          maxLength: 'Customer name cannot exceed 100 characters',
          pattern: 'Customer name contains invalid characters'
        }
      },
      'oppName': {
        required: true,
        minLength: 3,
        maxLength: 150,
        pattern: /^[a-zA-Z0-9\s\-&.,()]+$/,
        errorMessages: {
          required: 'Opportunity name is required',
          minLength: 'Opportunity name must be at least 3 characters',
          maxLength: 'Opportunity name cannot exceed 150 characters',
          pattern: 'Opportunity name contains invalid characters'
        }
      },
      'oppDescription': {
        required: true,
        minLength: 10,
        maxLength: 2000,
        errorMessages: {
          required: 'Opportunity description is required',
          minLength: 'Description must be at least 10 characters',
          maxLength: 'Description cannot exceed 2000 characters'
        }
      },
      'region': {
        required: true,
        errorMessages: {
          required: 'Please select an AWS region'
        }
      },
      'closeDate': {
        required: true,
        validDate: true,
        futureDate: true,
        errorMessages: {
          required: 'Close date is required',
          validDate: 'Please enter a valid date',
          futureDate: 'Close date must be in the future'
        }
      },
      'industry': {
        required: false,
        errorMessages: {}
      },
      'industryOther': {
        required: false,
        conditionalRequired: true,
        minLength: 2,
        maxLength: 50,
        errorMessages: {
          conditionalRequired: 'Please specify the industry',
          minLength: 'Industry specification must be at least 2 characters',
          maxLength: 'Industry specification cannot exceed 50 characters'
        }
      },
      'customerSegment': {
        required: false,
        errorMessages: {}
      },
      'partnerName': {
        required: false,
        minLength: 2,
        maxLength: 100,
        pattern: /^[a-zA-Z0-9\s\-&.,()]+$/,
        errorMessages: {
          minLength: 'Partner name must be at least 2 characters',
          maxLength: 'Partner name cannot exceed 100 characters',
          pattern: 'Partner name contains invalid characters'
        }
      },
      'activityFocus': {
        required: false,
        errorMessages: {}
      },
      'businessDescription': {
        required: false,
        minLength: 10,
        maxLength: 1500,
        errorMessages: {
          minLength: 'Business description must be at least 10 characters',
          maxLength: 'Business description cannot exceed 1500 characters'
        }
      },
      'migrationPhase': {
        required: false,
        errorMessages: {}
      },
      'salesforceLink': {
        required: false,
        validUrl: true,
        errorMessages: {
          validUrl: 'Please enter a valid URL (e.g., https://example.salesforce.com)'
        }
      },
      'awsCalculatorLink': {
        required: false,
        validUrl: true,
        errorMessages: {
          validUrl: 'Please enter a valid URL (e.g., https://calculator.aws)'
        }
      }
    };
  }

  validateField(fieldId, value) {
    const rules = this.validationState.validationRules[fieldId];
    if (!rules) return { isValid: true, errors: [] };

    const errors = [];
    
    // Required validation
    if (rules.required && (!value || value.trim() === '')) {
      errors.push(rules.errorMessages.required);
      return { isValid: false, errors };
    }

    // Skip other validations if field is empty and not required
    if (!value || value.trim() === '') {
      return { isValid: true, errors: [] };
    }

    // Conditional required validation (for industryOther)
    if (rules.conditionalRequired && fieldId === 'industryOther') {
      const industrySelect = document.getElementById('industry');
      if (industrySelect && industrySelect.value === 'Other' && (!value || value.trim() === '')) {
        errors.push(rules.errorMessages.conditionalRequired);
      }
    }

    // Length validations
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(rules.errorMessages.minLength);
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(rules.errorMessages.maxLength);
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(rules.errorMessages.pattern);
    }

    // Date validations
    if (rules.validDate) {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        errors.push(rules.errorMessages.validDate);
      } else if (rules.futureDate && date <= new Date()) {
        errors.push(rules.errorMessages.futureDate);
      }
    }

    // URL validation
    if (rules.validUrl) {
      try {
        new URL(value);
      } catch {
        errors.push(rules.errorMessages.validUrl);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  validateForm() {
    const form = document.getElementById('opportunityForm');
    if (!form) return { isValid: false, errors: {} };

    const formData = new FormData(form);
    const errors = {};
    let isValid = true;

    // Validate all fields with rules
    Object.keys(this.validationState.validationRules).forEach(fieldId => {
      const value = formData.get(fieldId) || '';
      const validation = this.validateField(fieldId, value);
      
      if (!validation.isValid) {
        errors[fieldId] = validation.errors;
        isValid = false;
      }
    });

    return { isValid, errors };
  }

  getFormData() {
    const form = document.getElementById('opportunityForm');
    if (!form) return {};

    const formData = new FormData(form);
    const data = {};

    // Collect all form fields
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }

    // Handle special cases
    const industrySelect = document.getElementById('industry');
    const industryOther = document.getElementById('industryOther');
    
    if (industrySelect && industrySelect.value === 'Other' && industryOther) {
      data.industry = industryOther.value;
    }

    return data;
  }

  showFieldError(fieldId, errors) {
    const errorContainer = document.getElementById(`${fieldId}-error`);
    const field = document.getElementById(fieldId);
    
    if (errorContainer) {
      if (errors && errors.length > 0) {
        errorContainer.textContent = errors[0];
        errorContainer.style.display = 'block';
      } else {
        errorContainer.textContent = '';
        errorContainer.style.display = 'none';
      }
    }

    if (field) {
      if (errors && errors.length > 0) {
        field.classList.add('error');
      } else {
        field.classList.remove('error');
      }
    }
  }

  clearAllErrors() {
    const errorContainers = document.querySelectorAll('.error-message');
    const fields = document.querySelectorAll('.error');
    
    errorContainers.forEach(container => {
      container.textContent = '';
      container.style.display = 'none';
    });

    fields.forEach(field => {
      field.classList.remove('error');
    });
  }
}

describe('Enhanced UI Form Validation', () => {
  let validator;

  beforeEach(() => {
    validator = new FormValidator();
    // Clear all form fields
    const form = document.getElementById('opportunityForm');
    if (form) {
      form.reset();
    }
    validator.clearAllErrors();
  });

  describe('Field Validation Rules', () => {
    test('should initialize validation rules correctly', () => {
      expect(validator.validationState.validationRules).toBeDefined();
      expect(validator.validationState.validationRules.CustomerName).toBeDefined();
      expect(validator.validationState.validationRules.oppName).toBeDefined();
      expect(validator.validationState.validationRules.oppDescription).toBeDefined();
    });

    test('should have correct required field rules', () => {
      const requiredFields = ['CustomerName', 'oppName', 'oppDescription', 'region', 'closeDate'];
      
      requiredFields.forEach(fieldId => {
        expect(validator.validationState.validationRules[fieldId].required).toBe(true);
      });
    });

    test('should have correct optional field rules', () => {
      const optionalFields = ['industry', 'customerSegment', 'partnerName', 'activityFocus', 'businessDescription', 'migrationPhase', 'salesforceLink', 'awsCalculatorLink'];
      
      optionalFields.forEach(fieldId => {
        expect(validator.validationState.validationRules[fieldId].required).toBeFalsy();
      });
    });
  });

  describe('Individual Field Validation', () => {
    describe('Customer Name Validation', () => {
      test('should require customer name', () => {
        const result = validator.validateField('CustomerName', '');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Customer name is required');
      });

      test('should enforce minimum length', () => {
        const result = validator.validateField('CustomerName', 'A');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Customer name must be at least 2 characters');
      });

      test('should enforce maximum length', () => {
        const longName = 'A'.repeat(101);
        const result = validator.validateField('CustomerName', longName);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Customer name cannot exceed 100 characters');
      });

      test('should validate character pattern', () => {
        const result = validator.validateField('CustomerName', 'Invalid@#$%Name');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Customer name contains invalid characters');
      });

      test('should accept valid customer name', () => {
        const result = validator.validateField('CustomerName', 'TechCorp Solutions Inc.');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Opportunity Name Validation', () => {
      test('should require opportunity name', () => {
        const result = validator.validateField('oppName', '');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Opportunity name is required');
      });

      test('should enforce minimum length', () => {
        const result = validator.validateField('oppName', 'AB');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Opportunity name must be at least 3 characters');
      });

      test('should accept valid opportunity name', () => {
        const result = validator.validateField('oppName', 'Cloud Migration Project');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Description Validation', () => {
      test('should require description', () => {
        const result = validator.validateField('oppDescription', '');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Opportunity description is required');
      });

      test('should enforce minimum length', () => {
        const result = validator.validateField('oppDescription', 'Short');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Description must be at least 10 characters');
      });

      test('should accept valid description', () => {
        const result = validator.validateField('oppDescription', 'This is a comprehensive cloud migration project for enterprise client.');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Region Validation', () => {
      test('should require region selection', () => {
        const result = validator.validateField('region', '');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Please select an AWS region');
      });

      test('should accept valid region', () => {
        const result = validator.validateField('region', 'us-east-1');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Close Date Validation', () => {
      test('should require close date', () => {
        const result = validator.validateField('closeDate', '');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Close date is required');
      });

      test('should validate date format', () => {
        const result = validator.validateField('closeDate', 'invalid-date');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Please enter a valid date');
      });

      test('should require future date', () => {
        const pastDate = '2020-01-01';
        const result = validator.validateField('closeDate', pastDate);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Close date must be in the future');
      });

      test('should accept valid future date', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        const dateString = futureDate.toISOString().split('T')[0];
        
        const result = validator.validateField('closeDate', dateString);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('URL Validation', () => {
      test('should validate Salesforce URL format', () => {
        const result = validator.validateField('salesforceLink', 'invalid-url');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Please enter a valid URL (e.g., https://example.salesforce.com)');
      });

      test('should accept valid Salesforce URL', () => {
        const result = validator.validateField('salesforceLink', 'https://example.salesforce.com/opportunity/123');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test('should accept empty URL for optional field', () => {
        const result = validator.validateField('salesforceLink', '');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Conditional Validation', () => {
      test('should require industryOther when industry is "Other"', () => {
        // Set industry to "Other"
        const industrySelect = document.getElementById('industry');
        industrySelect.value = 'Other';
        
        const result = validator.validateField('industryOther', '');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Please specify the industry');
      });

      test('should not require industryOther when industry is not "Other"', () => {
        // Set industry to something other than "Other"
        const industrySelect = document.getElementById('industry');
        industrySelect.value = 'Technology';
        
        const result = validator.validateField('industryOther', '');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('Form Data Collection', () => {
    test('should collect all form field data', () => {
      // Set form values
      document.getElementById('CustomerName').value = 'Test Customer';
      document.getElementById('oppName').value = 'Test Opportunity';
      document.getElementById('oppDescription').value = 'Test description for opportunity';
      document.getElementById('region').value = 'us-east-1';
      document.getElementById('closeDate').value = '2025-12-31';
      document.getElementById('industry').value = 'Technology';
      document.getElementById('customerSegment').value = 'Enterprise';
      document.getElementById('partnerName').value = 'Test Partner';
      document.getElementById('activityFocus').value = 'Migration';
      document.getElementById('businessDescription').value = 'Business context description';
      document.getElementById('migrationPhase').value = 'Assessment';
      document.getElementById('salesforceLink').value = 'https://example.salesforce.com';
      document.getElementById('awsCalculatorLink').value = 'https://calculator.aws';

      const formData = validator.getFormData();

      expect(formData.CustomerName).toBe('Test Customer');
      expect(formData.oppName).toBe('Test Opportunity');
      expect(formData.oppDescription).toBe('Test description for opportunity');
      expect(formData.region).toBe('us-east-1');
      expect(formData.closeDate).toBe('2025-12-31');
      expect(formData.industry).toBe('Technology');
      expect(formData.customerSegment).toBe('Enterprise');
      expect(formData.partnerName).toBe('Test Partner');
      expect(formData.activityFocus).toBe('Migration');
      expect(formData.businessDescription).toBe('Business context description');
      expect(formData.migrationPhase).toBe('Assessment');
      expect(formData.salesforceLink).toBe('https://example.salesforce.com');
      expect(formData.awsCalculatorLink).toBe('https://calculator.aws');
    });

    test('should handle "Other" industry selection', () => {
      document.getElementById('industry').value = 'Other';
      document.getElementById('industryOther').value = 'Custom Industry';

      const formData = validator.getFormData();
      expect(formData.industry).toBe('Custom Industry');
    });

    test('should return empty object when form is not found', () => {
      // Remove form from DOM temporarily
      const form = document.getElementById('opportunityForm');
      form.remove();

      const formData = validator.getFormData();
      expect(formData).toEqual({});

      // Restore form
      document.body.appendChild(form);
    });
  });

  describe('Complete Form Validation', () => {
    test('should validate complete form with all required fields', () => {
      // Set all required fields
      document.getElementById('CustomerName').value = 'Test Customer';
      document.getElementById('oppName').value = 'Test Opportunity';
      document.getElementById('oppDescription').value = 'Test description for opportunity';
      document.getElementById('region').value = 'us-east-1';
      
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      document.getElementById('closeDate').value = futureDate.toISOString().split('T')[0];

      const result = validator.validateForm();
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    test('should fail validation when required fields are missing', () => {
      // Leave required fields empty
      const result = validator.validateForm();
      
      expect(result.isValid).toBe(false);
      expect(result.errors.CustomerName).toContain('Customer name is required');
      expect(result.errors.oppName).toContain('Opportunity name is required');
      expect(result.errors.oppDescription).toContain('Opportunity description is required');
      expect(result.errors.region).toContain('Please select an AWS region');
      expect(result.errors.closeDate).toContain('Close date is required');
    });

    test('should validate optional fields when provided', () => {
      // Set required fields
      document.getElementById('CustomerName').value = 'Test Customer';
      document.getElementById('oppName').value = 'Test Opportunity';
      document.getElementById('oppDescription').value = 'Test description for opportunity';
      document.getElementById('region').value = 'us-east-1';
      
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      document.getElementById('closeDate').value = futureDate.toISOString().split('T')[0];

      // Set invalid optional field
      document.getElementById('salesforceLink').value = 'invalid-url';

      const result = validator.validateForm();
      expect(result.isValid).toBe(false);
      expect(result.errors.salesforceLink).toContain('Please enter a valid URL (e.g., https://example.salesforce.com)');
    });
  });

  describe('Error Display Functions', () => {
    test('should show field error correctly', () => {
      const errors = ['Test error message'];
      validator.showFieldError('CustomerName', errors);

      const errorContainer = document.getElementById('CustomerName-error');
      const field = document.getElementById('CustomerName');

      expect(errorContainer.textContent).toBe('Test error message');
      expect(errorContainer.style.display).toBe('block');
      expect(field.classList.contains('error')).toBe(true);
    });

    test('should clear field error correctly', () => {
      // First show an error
      validator.showFieldError('CustomerName', ['Test error']);
      
      // Then clear it
      validator.showFieldError('CustomerName', []);

      const errorContainer = document.getElementById('CustomerName-error');
      const field = document.getElementById('CustomerName');

      expect(errorContainer.textContent).toBe('');
      expect(errorContainer.style.display).toBe('none');
      expect(field.classList.contains('error')).toBe(false);
    });

    test('should clear all errors correctly', () => {
      // Show errors on multiple fields
      validator.showFieldError('CustomerName', ['Error 1']);
      validator.showFieldError('oppName', ['Error 2']);

      // Clear all errors
      validator.clearAllErrors();

      const errorContainers = document.querySelectorAll('.error-message');
      const fields = document.querySelectorAll('#CustomerName, #oppName');

      errorContainers.forEach(container => {
        expect(container.textContent).toBe('');
        expect(container.style.display).toBe('none');
      });

      fields.forEach(field => {
        expect(field.classList.contains('error')).toBe(false);
      });
    });
  });

  describe('Real-time Validation Integration', () => {
    test('should validate field on input event', () => {
      const field = document.getElementById('CustomerName');
      const validator = new FormValidator();
      
      // Simulate real-time validation
      field.value = 'A'; // Too short
      const result = validator.validateField('CustomerName', field.value);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Customer name must be at least 2 characters');
    });

    test('should update validation state as user types', () => {
      const field = document.getElementById('CustomerName');
      const validator = new FormValidator();
      
      // Test progression from invalid to valid
      const testValues = ['', 'A', 'AB', 'ABC Company'];
      const expectedResults = [false, false, true, true];
      
      testValues.forEach((value, index) => {
        field.value = value;
        const result = validator.validateField('CustomerName', value);
        expect(result.isValid).toBe(expectedResults[index]);
      });
    });
  });
});