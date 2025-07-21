/**
 * Analysis Configuration for AWS Opportunity Analysis System
 * Purpose: Centralized configuration for analysis performance and timeouts
 */

module.exports = {
  // Development mode settings for faster testing
development: {
  // Aligned timeouts to match frontend expectations and actual processing time
  analysisTimeout: 240, // Increased to 4 minutes (240 * 2 = 480 seconds total = 8 minutes)
  queryTimeout: 60, // Increased from 30 to 60 seconds for better reliability
  sqlQueryLimit: 200, // Match frontend expectation
  truncationLimit: 600000, // Match frontend expectation
  enableTruncation: true, // Enable truncation for faster processing
},

  // Production settings
production: {
  analysisTimeout: 240, // Increased to 4 minutes (240 * 2 = 480 seconds total = 8 minutes)
  queryTimeout: 60, // Increased from 30 to 60 seconds
  sqlQueryLimit: 200, // Match frontend expectation
  truncationLimit: 600000, // Match frontend expectation
  enableTruncation: true, // Enable truncation to prevent timeouts
},

  // Bedrock configuration
  bedrock: {
    // Model settings
    queryModel: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    analysisModel: "anthropic.claude-3-5-sonnet-20241022-v2:0",

    // Performance settings
    temperature: 0.0,
    maxTokens: 4096,

    // Retry settings
    maxRetries: 2, // Reduced from 3 to 2
    retryDelay: 500, // Reduced from 1000 to 500ms
  },

  // Cache settings
  cache: {
    enabled: true,
    ttl: 3600, // 1 hour
    queryCacheEnabled: true,
    analysisCacheEnabled: true,
  },

  // Get current settings based on environment
  getCurrentSettings() {
    const isDevelopment =
      process.env.NODE_ENV === "development" ||
      process.env.DISABLE_REDIS === "true" ||
      process.env.USE_MEMORY_ONLY === "true";

    return {
      ...this[isDevelopment ? "development" : "production"],
      bedrock: this.bedrock,
      cache: this.cache,
    };
  },
};
