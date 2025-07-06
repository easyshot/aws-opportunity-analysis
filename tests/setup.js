/**
 * Jest Test Setup
 * 
 * Global test configuration and setup for the AWS Opportunity Analysis application.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  // Mock AWS response helper
  mockAwsResponse: (data, error = null) => {
    if (error) {
      return Promise.reject(error);
    }
    return Promise.resolve({ data });
  },
  
  // Mock opportunity data
  mockOpportunityData: {
    customerName: 'Test Customer',
    region: 'us-east-1',
    closeDate: '2024-12-31',
    opportunityName: 'Test Opportunity',
    description: 'Test opportunity description for automated testing'
  },
  
  // Mock historical project data
  mockHistoricalData: [
    {
      opportunity_name: 'Historical Project 1',
      customer_name: 'Historical Customer 1',
      region: 'us-east-1',
      close_date: '2023-01-15',
      total_arr: '100000',
      total_mrr: '8333',
      top_services: 'EC2, S3, RDS'
    }
  ]
};

// Setup and teardown
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  jest.restoreAllMocks();
});