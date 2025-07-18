module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'automations/**/*.js',
    'lib/**/*.js',
    'lambda/**/*.js',
    'config/**/*.js',
    '!**/__tests__/**',
    '!**/node_modules/**',
    '!coverage/**',
    '!jest.config.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],
  
  // Test timeout
  testTimeout: 30000,
  
  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml'
    }]
  ],
  
  // Mock AWS SDK
  moduleNameMapping: {
    '^@aws-sdk/(.*)$': '<rootDir>/tests/mocks/aws-sdk/$1'
  },
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true
};