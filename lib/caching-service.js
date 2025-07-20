// Optional Redis import - application can run without Redis
let Redis = null;
try {
  Redis = require("ioredis");
} catch (error) {
  console.warn("⚠️  ioredis not available - caching will be disabled");
}

const crypto = require("crypto");

class CachingService {
  constructor(options = {}) {
    this.enabled = options.enabled === true && Redis !== null;
    this.redisAvailable = false;

    if (!this.enabled) {
      console.log("🗄️  Caching Service disabled (Redis not available)");
      this.redis = null;
      this.readerRedis = null;
      return;
    }

    this.redisConfig = {
      host: options.host || process.env.REDIS_ENDPOINT,
      port: options.port || process.env.REDIS_PORT || 6379,
      password: options.password || process.env.REDIS_AUTH_TOKEN,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 5000, // Reduced timeout
      commandTimeout: 3000, // Reduced timeout
      tls: options.tls !== false ? {} : null, // Enable TLS by default
      retryDelayOnClusterDown: 300,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 2, // Reduced retries
    };

    this.readerConfig = {
      ...this.redisConfig,
      host:
        options.readerHost ||
        process.env.REDIS_READER_ENDPOINT ||
        this.redisConfig.host,
    };

    // Initialize Redis clients with error handling
    try {
      this.redis = new Redis(this.redisConfig);
      this.readerRedis = new Redis(this.readerConfig);

      // Cache configuration
      this.defaultTtl = options.defaultTtl || 3600; // 1 hour
      this.keyPrefix = options.keyPrefix || "opp-analysis:";

      // Cache warming configuration
      this.warmingEnabled = options.warmingEnabled !== false;
      this.warmingInterval = options.warmingInterval || 300000; // 5 minutes

      // Setup event handlers
      this.setupEventHandlers();

      // Test connection
      this.testConnection();
    } catch (error) {
      console.warn("⚠️  Redis initialization failed:", error.message);
      console.warn("   Continuing without Redis caching");
      this.redisAvailable = false;
      this.redis = null;
      this.readerRedis = null;
    }
  }

  async testConnection() {
    try {
      // Test primary connection
      await this.redis.ping();
      console.log("✅ Redis primary connection successful");

      // Test reader connection
      await this.readerRedis.ping();
      console.log("✅ Redis reader connection successful");

      this.redisAvailable = true;

      // Start cache warming if enabled and Redis is available
      if (this.warmingEnabled) {
        this.startCacheWarming();
      }
    } catch (error) {
      console.warn("⚠️  Redis connection test failed:", error.message);
      console.warn(
        "   Caching will be disabled - application will continue without caching"
      );
      this.redisAvailable = false;
    }
  }

  setupEventHandlers() {
    if (!this.redis || !this.readerRedis) return;

    this.redis.on("connect", () => {
      console.log("🔗 Connected to Redis primary");
      this.redisAvailable = true;
    });

    this.redis.on("error", (err) => {
      console.warn("⚠️  Redis primary error:", err.message);
      this.redisAvailable = false;
    });

    this.redis.on("close", () => {
      console.warn("⚠️  Redis primary connection closed");
      this.redisAvailable = false;
    });

    this.readerRedis.on("connect", () => {
      console.log("🔗 Connected to Redis reader");
    });

    this.readerRedis.on("error", (err) => {
      console.warn("⚠️  Redis reader error:", err.message);
    });

    this.readerRedis.on("close", () => {
      console.warn("⚠️  Redis reader connection closed");
    });
  }

  // Generate cache key with consistent hashing
  generateKey(type, params) {
    const paramString =
      typeof params === "object" ? JSON.stringify(params) : String(params);
    const hash = crypto.createHash("md5").update(paramString).digest("hex");
    return `${this.keyPrefix}${type}:${hash}`;
  }

  // Cache-aside pattern implementation
  async get(key, fallbackFn, options = {}) {
    // If Redis is not available, just execute fallback function
    if (!this.redisAvailable || !this.redis) {
      if (typeof fallbackFn === "function") {
        return await fallbackFn();
      }
      return null;
    }

    const ttl = options.ttl || this.defaultTtl;
    const useReader = options.useReader !== false;

    try {
      // Try to get from cache first (use reader for read operations)
      const client = useReader ? this.readerRedis : this.redis;
      const cached = await client.get(key);

      if (cached) {
        console.log(`Cache hit for key: ${key}`);
        return JSON.parse(cached);
      }

      console.log(`Cache miss for key: ${key}`);

      // If not in cache, execute fallback function
      if (typeof fallbackFn === "function") {
        const result = await fallbackFn();

        // Store in cache (always use primary for writes)
        await this.set(key, result, ttl);

        return result;
      }

      return null;
    } catch (error) {
      console.warn("Cache get error:", error.message);

      // If cache fails, still try to execute fallback
      if (typeof fallbackFn === "function") {
        return await fallbackFn();
      }

      throw error;
    }
  }

  // Set value in cache
  async set(key, value, ttl = null) {
    // If Redis is not available, just return success
    if (!this.redisAvailable || !this.redis) {
      return true;
    }

    try {
      const expiry = ttl || this.defaultTtl;
      const serialized = JSON.stringify(value);

      await this.redis.setex(key, expiry, serialized);
      console.log(`Cached value for key: ${key} (TTL: ${expiry}s)`);

      return true;
    } catch (error) {
      console.warn("Cache set error:", error.message);
      return false;
    }
  }

  // Delete from cache
  async delete(key) {
    // If Redis is not available, just return success
    if (!this.redisAvailable || !this.redis) {
      return true;
    }

    try {
      const result = await this.redis.del(key);
      console.log(`Deleted cache key: ${key}`);
      return result > 0;
    } catch (error) {
      console.warn("Cache delete error:", error.message);
      return false;
    }
  }

  // Intelligent cache invalidation
  async invalidatePattern(pattern) {
    // If Redis is not available, just return 0
    if (!this.redisAvailable || !this.redis) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(`${this.keyPrefix}${pattern}`);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(
          `Invalidated ${keys.length} keys matching pattern: ${pattern}`
        );
      }

      return keys.length;
    } catch (error) {
      console.warn("Cache invalidation error:", error.message);
      return 0;
    }
  }

  // Cache analysis results with intelligent TTL
  async cacheAnalysisResult(
    opportunityDetails,
    analysisResult,
    analysisType = "standard"
  ) {
    const key = this.generateKey("analysis", {
      customer: opportunityDetails.customerName,
      region: opportunityDetails.region,
      type: analysisType,
      description: opportunityDetails.description?.substring(0, 100), // First 100 chars for similarity
    });

    // Intelligent TTL based on analysis confidence
    let ttl = this.defaultTtl;
    if (analysisResult.confidence === "HIGH") {
      ttl = 7200; // 2 hours for high confidence
    } else if (analysisResult.confidence === "MEDIUM") {
      ttl = 3600; // 1 hour for medium confidence
    } else {
      ttl = 1800; // 30 minutes for low confidence
    }

    await this.set(
      key,
      {
        ...analysisResult,
        cachedAt: new Date().toISOString(),
        analysisType,
      },
      ttl
    );

    return key;
  }

  // Cache query results
  async cacheQueryResult(sqlQuery, results) {
    const key = this.generateKey("query", sqlQuery);

    // Query results can be cached longer as historical data doesn't change often
    await this.set(
      key,
      {
        results,
        cachedAt: new Date().toISOString(),
        queryHash: crypto.createHash("md5").update(sqlQuery).digest("hex"),
      },
      14400
    ); // 4 hours

    return key;
  }

  // Cache Bedrock prompts
  async cachePrompt(promptId, promptData) {
    const key = this.generateKey("prompt", promptId);

    // Prompts can be cached for a long time as they don't change frequently
    await this.set(key, promptData, 86400); // 24 hours

    return key;
  }

  // Get cached analysis result
  async getCachedAnalysis(opportunityDetails, analysisType = "standard") {
    const key = this.generateKey("analysis", {
      customer: opportunityDetails.customerName,
      region: opportunityDetails.region,
      type: analysisType,
      description: opportunityDetails.description?.substring(0, 100),
    });

    return await this.get(key);
  }

  // Get cached query result
  async getCachedQuery(sqlQuery) {
    const key = this.generateKey("query", sqlQuery);
    return await this.get(key);
  }

  // Get cached prompt
  async getCachedPrompt(promptId) {
    const key = this.generateKey("prompt", promptId);
    return await this.get(key);
  }

  // Cache warming strategies
  async warmCache() {
    // If Redis is not available, skip warming
    if (!this.redisAvailable || !this.redis) {
      console.log("Cache warming skipped - Redis not available");
      return;
    }

    console.log("Starting cache warming...");

    try {
      // Warm frequently accessed prompts
      await this.warmPrompts();

      // Warm popular analysis patterns
      await this.warmPopularAnalyses();

      console.log("Cache warming completed");
    } catch (error) {
      console.warn("Cache warming error:", error.message);
    }
  }

  async warmPrompts() {
    // If Redis is not available, skip warming
    if (!this.redisAvailable || !this.redis) {
      return;
    }

    const promptIds = [
      process.env.CATAPULT_QUERY_PROMPT_ID,
      process.env.CATAPULT_ANALYSIS_PROMPT_ID,
      process.env.CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID,
    ].filter(Boolean);

    for (const promptId of promptIds) {
      const key = this.generateKey("prompt", promptId);
      const exists = await this.redis.exists(key);

      if (!exists) {
        console.log(`Warming prompt cache for: ${promptId}`);
        // This would typically fetch from Bedrock and cache
        // Implementation depends on your prompt fetching logic
      }
    }
  }

  async warmPopularAnalyses() {
    // If Redis is not available, skip warming
    if (!this.redisAvailable || !this.redis) {
      return;
    }

    // This could be enhanced to warm cache based on analytics data
    // For now, we'll implement basic warming for common regions
    const commonRegions = ["us-east-1", "us-west-2", "eu-west-1"];

    for (const region of commonRegions) {
      console.log(`Warming analysis cache for region: ${region}`);
      // Pre-warm common analysis patterns
      // Implementation would depend on your specific use cases
    }
  }

  startCacheWarming() {
    // Only start warming if Redis is available
    if (!this.redisAvailable || !this.redis) {
      console.log("Cache warming not started - Redis not available");
      return;
    }

    // Initial warming
    setTimeout(() => this.warmCache(), 5000); // Wait 5 seconds after startup

    // Periodic warming
    setInterval(() => this.warmCache(), this.warmingInterval);
  }

  // Health check
  async healthCheck() {
    // If Redis is not available, return unavailable status
    if (!this.redisAvailable || !this.redis || !this.readerRedis) {
      return {
        primary: false,
        reader: false,
        available: false,
        message: "Redis not available",
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const primaryPing = await this.redis.ping();
      const readerPing = await this.readerRedis.ping();

      return {
        primary: primaryPing === "PONG",
        reader: readerPing === "PONG",
        available: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        primary: false,
        reader: false,
        available: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Get cache statistics
  async getStats() {
    // If Redis is not available, return empty stats
    if (!this.redisAvailable || !this.redis) {
      return {
        totalKeys: 0,
        memoryUsage: "N/A",
        hitRate: "N/A",
        available: false,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const info = await this.redis.info();
      const keys = await this.redis.keys(`${this.keyPrefix}*`);

      // Parse Redis info for memory usage
      const memoryMatch = info.match(/used_memory_human:(\S+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : "Unknown";

      return {
        totalKeys: keys.length,
        memoryUsage,
        hitRate: "N/A", // Would need to implement hit tracking
        available: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        totalKeys: 0,
        memoryUsage: "Error",
        hitRate: "N/A",
        available: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Disconnect from Redis
  async disconnect() {
    if (this.redis) {
      try {
        await this.redis.quit();
        console.log("Redis primary disconnected");
      } catch (error) {
        console.warn("Error disconnecting Redis primary:", error.message);
      }
    }

    if (this.readerRedis) {
      try {
        await this.readerRedis.quit();
        console.log("Redis reader disconnected");
      } catch (error) {
        console.warn("Error disconnecting Redis reader:", error.message);
      }
    }

    this.redisAvailable = false;
  }
}

module.exports = { CachingService };
