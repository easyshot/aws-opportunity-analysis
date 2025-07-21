/**
 * Artillery.js processor for load testing
 * Provides custom functions and data generation for load tests
 */

const crypto = require('crypto');

// Custom functions for Artillery templates
module.exports = {
  // Generate random string
  randomString: function() {
    return crypto.randomBytes(8).toString('hex');
  },
  
  // Generate random date between two dates
  randomDate: function(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
    return new Date(randomTime).toISOString().split('T')[0];
  },
  
  // Generate random text of specified length
  randomText: function(minLength, maxLength) {
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    const words = [
      'cloud', 'migration', 'digital', 'transformation', 'scalable', 'architecture',
      'serverless', 'microservices', 'containerization', 'automation', 'analytics',
      'machine', 'learning', 'artificial', 'intelligence', 'data', 'processing',
      'real-time', 'streaming', 'batch', 'ETL', 'pipeline', 'orchestration',
      'monitoring', 'logging', 'security', 'compliance', 'governance', 'cost',
      'optimization', 'performance', 'availability', 'reliability', 'disaster',
      'recovery', 'backup', 'storage', 'database', 'networking', 'infrastructure'
    ];
    
    let text = '';
    while (text.length < length) {
      const word = words[Math.floor(Math.random() * words.length)];
      text += (text ? ' ' : '') + word;
    }
    
    return text.substring(0, length);
  },
  
  // Pick random item from array
  pick: function(items) {
    return items[Math.floor(Math.random() * items.length)];
  },
  
  // Before scenario hook
  beforeScenario: function(context, events, done) {
    // Set up scenario-specific data
    context.vars.startTime = Date.now();
    return done();
  },
  
  // After response hook
  afterResponse: function(requestParams, response, context, events, done) {
    // Log response times for analysis
    const responseTime = Date.now() - context.vars.startTime;
    
    if (responseTime > 30000) { // 30 seconds
      console.log(`Slow response detected: ${responseTime}ms for ${requestParams.url}`);
    }
    
    // Custom metrics
    events.emit('customStat', 'response_time', responseTime);
    
    if (response.statusCode >= 400) {
      events.emit('customStat', 'error_count', 1);
      console.log(`Error response: ${response.statusCode} for ${requestParams.url}`);
    }
    
    return done();
  },
  
  // Custom stats aggregation
  customStats: {
    response_time: {
      aggregate: 'avg'
    },
    error_count: {
      aggregate: 'sum'
    }
  }
};