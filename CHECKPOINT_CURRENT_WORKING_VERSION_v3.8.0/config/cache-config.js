/**
 * Cache Configuration for AWS Opportunity Analysis System
 * Purpose: Centralized cache configuration for Phase 1 optimization
 */

module.exports = {
  // Development mode - disable Redis if not available
  development: {
    disableRedis: process.env.DISABLE_REDIS === "true",
    useMemoryOnly: process.env.USE_MEMORY_ONLY === "true",
  },

  // Redis Configuration
  redis: {
    // Primary Redis endpoint
    host: process.env.REDIS_ENDPOINT || "localhost",
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_AUTH_TOKEN,

    // Reader endpoint for read replicas (if available)
    readerHost: process.env.REDIS_READER_ENDPOINT,
    readerPort: process.env.REDIS_READER_PORT || 6379,

    // Connection settings
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    connectTimeout: 10000,
    commandTimeout: 5000,
    tls: process.env.REDIS_TLS !== "false" ? {} : null,
  },

  // Cache TTL Settings (in seconds)
  ttl: {
    // Query results - longer TTL as historical data doesn't change often
    queryResults: 14400, // 4 hours

    // Analysis results - shorter TTL as they may become stale
    analysisResults: {
      high: 7200, // 2 hours for high confidence
      medium: 3600, // 1 hour for medium confidence
      low: 1800, // 30 minutes for low confidence
    },

    // Bedrock prompts - longer TTL as they rarely change
    prompts: 86400, // 24 hours

    // Response parser cache - in-memory cache
    responseParser: 3600, // 1 hour

    // Default TTL for other cached items
    default: 3600, // 1 hour
  },

  // Cache key prefixes
  keyPrefixes: {
    query: "opp-analysis:query:",
    analysis: "opp-analysis:analysis:",
    prompt: "opp-analysis:prompt:",
    responseParser: "opp-analysis:parser:",
    userSession: "opp-analysis:session:",
  },

  // Cache warming configuration
  warming: {
    enabled: process.env.CACHE_WARMING_ENABLED !== "false",
    interval: 300000, // 5 minutes
    maxConcurrentWarms: 5,
    warmPopularQueries: true,
    warmPrompts: true,
  },

  // Cache invalidation patterns
  invalidation: {
    // Patterns for bulk invalidation
    patterns: {
      allQueries: "opp-analysis:query:*",
      allAnalyses: "opp-analysis:analysis:*",
      allPrompts: "opp-analysis:prompt:*",
      userSession: "opp-analysis:session:*",
    },

    // Automatic invalidation triggers
    triggers: {
      onNewData: true, // Invalidate when new data is added
      onPromptUpdate: true, // Invalidate when prompts are updated
      onError: false, // Invalidate on errors (usually not needed)
    },
  },

  // Performance settings
  performance: {
    // Response parser cache size
    responseParserCacheSize: 100,

    // Enable debug logging
    enableDebug: process.env.CACHE_DEBUG === "true",

    // Connection pooling
    maxConnections: 10,
    minConnections: 2,

    // Circuit breaker settings
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      recoveryTimeout: 30000,
    },
  },

  // Monitoring and metrics
  monitoring: {
    enabled: process.env.CACHE_MONITORING !== "false",
    metrics: {
      hitRate: true,
      responseTime: true,
      errorRate: true,
      cacheSize: true,
    },

    // CloudWatch integration
    cloudWatch: {
      enabled: process.env.CACHE_CLOUDWATCH === "true",
      namespace: "AWS/OpportunityAnalysis/Cache",
      dimensions: ["CacheType", "Environment"],
    },
  },

  // Environment-specific overrides
  environments: {
    development: {
      ttl: {
        queryResults: 1800, // 30 minutes for faster iteration
        analysisResults: {
          high: 1800,
          medium: 900,
          low: 300,
        },
      },
      performance: {
        enableDebug: true,
        responseParserCacheSize: 50,
      },
    },

    staging: {
      ttl: {
        queryResults: 7200, // 2 hours
        analysisResults: {
          high: 3600,
          medium: 1800,
          low: 900,
        },
      },
    },

    production: {
      // Use default settings for production
    },
  },

  // Feature flags for gradual rollout
  features: {
    responseParser: {
      enabled: true,
      strictMode: false,
      fallbackEnabled: true,
    },

    queryCaching: {
      enabled: true,
      intelligentTtl: true,
      compression: true,
    },

    analysisCaching: {
      enabled: true,
      confidenceBasedTtl: true,
      partialCache: true,
    },
  },
};
