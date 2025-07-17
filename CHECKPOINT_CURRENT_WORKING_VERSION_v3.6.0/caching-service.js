const Redis = require('ioredis');
const crypto = require('crypto');

class CachingService {
  constructor(options = {}) {
    this.redisConfig = {
      host: options.host || process.env.REDIS_ENDPOINT,
      port: options.port || process.env.REDIS_PORT || 6379,
      password: options.password || process.env.REDIS_AUTH_TOKEN,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      tls: options.tls !== false ? {} : null, // Enable TLS by default
    };

    this.readerConfig = {
      ...this.redisConfig,
      host: options.readerHost || process.env.REDIS_READER_ENDPOINT || this.redisConfig.host,
    };

    // Initialize Redis clients
    this.redis = new Redis(this.redisConfig);
    this.readerRedis = new Redis(this.readerConfig);

    // Cache configuration
    this.defaultTtl = options.defaultTtl || 3600; // 1 hour
    this.keyPrefix = options.keyPrefix || 'opp-analysis:';
    
    // Cache warming configuration
    this.warmingEnabled = options.warmingEnabled !== false;
    this.warmingInterval = options.warmingInterval || 300000; // 5 minutes
    
    // Setup event handlers
    this.setupEventHandlers();
    
    // Start cache warming if enabled
    if (this.warmingEnabled) {
      this.startCacheWarming();
    }
  }

  setupEventHandlers() {
    this.redis.on('connect', () => {
      console.log('Connected to Redis primary');
    });

    this.redis.on('error', (err) => {
      console.error('Redis primary error:', err);
    });

    this.readerRedis.on('connect', () => {
      console.log('Connected to Redis reader');
    });

    this.readerRedis.on('error', (err) => {
      console.error('Redis reader error:', err);
    });
  }

  // Generate cache key with consistent hashing
  generateKey(type, params) {
    const paramString = typeof params === 'object' ? JSON.stringify(params) : String(params);
    const hash = crypto.createHash('md5').update(paramString).digest('hex');
    return `${this.keyPrefix}${type}:${hash}`;
  }

  // Cache-aside pattern implementation
  async get(key, fallbackFn, options = {}) {
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
      if (typeof fallbackFn === 'function') {
        const result = await fallbackFn();
        
        // Store in cache (always use primary for writes)
        await this.set(key, result, ttl);
        
        return result;
      }
      
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      
      // If cache fails, still try to execute fallback
      if (typeof fallbackFn === 'function') {
        return await fallbackFn();
      }
      
      throw error;
    }
  }

  // Set value in cache
  async set(key, value, ttl = null) {
    try {
      const expiry = ttl || this.defaultTtl;
      const serialized = JSON.stringify(value);
      
      await this.redis.setex(key, expiry, serialized);
      console.log(`Cached value for key: ${key} (TTL: ${expiry}s)`);
      
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Delete from cache
  async delete(key) {
    try {
      const result = await this.redis.del(key);
      console.log(`Deleted cache key: ${key}`);
      return result > 0;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  // Intelligent cache invalidation
  async invalidatePattern(pattern) {
    try {
      const keys = await this.redis.keys(`${this.keyPrefix}${pattern}`);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`Invalidated ${keys.length} keys matching pattern: ${pattern}`);
      }
      
      return keys.length;
    } catch (error) {
      console.error('Cache invalidation error:', error);
      return 0;
    }
  }

  // Cache analysis results with intelligent TTL
  async cacheAnalysisResult(opportunityDetails, analysisResult, analysisType = 'standard') {
    const key = this.generateKey('analysis', {
      customer: opportunityDetails.customerName,
      region: opportunityDetails.region,
      type: analysisType,
      description: opportunityDetails.description?.substring(0, 100), // First 100 chars for similarity
    });

    // Intelligent TTL based on analysis confidence
    let ttl = this.defaultTtl;
    if (analysisResult.confidence === 'HIGH') {
      ttl = 7200; // 2 hours for high confidence
    } else if (analysisResult.confidence === 'MEDIUM') {
      ttl = 3600; // 1 hour for medium confidence
    } else {
      ttl = 1800; // 30 minutes for low confidence
    }

    await this.set(key, {
      ...analysisResult,
      cachedAt: new Date().toISOString(),
      analysisType,
    }, ttl);

    return key;
  }

  // Cache query results
  async cacheQueryResult(sqlQuery, results) {
    const key = this.generateKey('query', sqlQuery);
    
    // Query results can be cached longer as historical data doesn't change often
    await this.set(key, {
      results,
      cachedAt: new Date().toISOString(),
      queryHash: crypto.createHash('md5').update(sqlQuery).digest('hex'),
    }, 14400); // 4 hours

    return key;
  }

  // Cache Bedrock prompts
  async cachePrompt(promptId, promptData) {
    const key = this.generateKey('prompt', promptId);
    
    // Prompts can be cached for a long time as they don't change frequently
    await this.set(key, promptData, 86400); // 24 hours

    return key;
  }

  // Get cached analysis result
  async getCachedAnalysis(opportunityDetails, analysisType = 'standard') {
    const key = this.generateKey('analysis', {
      customer: opportunityDetails.customerName,
      region: opportunityDetails.region,
      type: analysisType,
      description: opportunityDetails.description?.substring(0, 100),
    });

    return await this.get(key);
  }

  // Get cached query result
  async getCachedQuery(sqlQuery) {
    const key = this.generateKey('query', sqlQuery);
    return await this.get(key);
  }

  // Get cached prompt
  async getCachedPrompt(promptId) {
    const key = this.generateKey('prompt', promptId);
    return await this.get(key);
  }

  // Cache warming strategies
  async warmCache() {
    console.log('Starting cache warming...');
    
    try {
      // Warm frequently accessed prompts
      await this.warmPrompts();
      
      // Warm popular analysis patterns
      await this.warmPopularAnalyses();
      
      console.log('Cache warming completed');
    } catch (error) {
      console.error('Cache warming error:', error);
    }
  }

  async warmPrompts() {
    const promptIds = [
      process.env.CATAPULT_QUERY_PROMPT_ID,
      process.env.CATAPULT_ANALYSIS_PROMPT_ID,
      process.env.CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID,
    ].filter(Boolean);

    for (const promptId of promptIds) {
      const key = this.generateKey('prompt', promptId);
      const exists = await this.redis.exists(key);
      
      if (!exists) {
        console.log(`Warming prompt cache for: ${promptId}`);
        // This would typically fetch from Bedrock and cache
        // Implementation depends on your prompt fetching logic
      }
    }
  }

  async warmPopularAnalyses() {
    // This could be enhanced to warm cache based on analytics data
    // For now, we'll implement basic warming for common regions
    const commonRegions = ['us-east-1', 'us-west-2', 'eu-west-1'];
    
    for (const region of commonRegions) {
      console.log(`Warming analysis cache for region: ${region}`);
      // Pre-warm common analysis patterns
      // Implementation would depend on your specific use cases
    }
  }

  startCacheWarming() {
    // Initial warming
    setTimeout(() => this.warmCache(), 5000); // Wait 5 seconds after startup
    
    // Periodic warming
    setInterval(() => this.warmCache(), this.warmingInterval);
  }

  // Health check
  async healthCheck() {
    try {
      const primaryPing = await this.redis.ping();
      const readerPing = await this.readerRedis.ping();
      
      return {
        primary: primaryPing === 'PONG',
        reader: readerPing === 'PONG',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        primary: false,
        reader: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Get cache statistics
  async getStats() {
    try {
      const info = await this.redis.info('stats');
      const memory = await this.redis.info('memory');
      
      return {
        info: info.split('\r\n').reduce((acc, line) => {
          const [key, value] = line.split(':');
          if (key && value) acc[key] = value;
          return acc;
        }, {}),
        memory: memory.split('\r\n').reduce((acc, line) => {
          const [key, value] = line.split(':');
          if (key && value) acc[key] = value;
          return acc;
        }, {}),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Graceful shutdown
  async disconnect() {
    try {
      await this.redis.disconnect();
      await this.readerRedis.disconnect();
      console.log('Disconnected from Redis');
    } catch (error) {
      console.error('Error disconnecting from Redis:', error);
    }
  }
}

module.exports = { CachingService };
 
 // Enhanced cache analysis with performance optimization (Task 7.1)
  async cacheAnalysis(opportunityDetails, analysisType, analysisResult) {
    const key = this.generateKey('analysis', {
      customer: opportunityDetails.CustomerName,
      region: opportunityDetails.region,
      type: analysisType,
      description: opportunityDetails.oppDescription?.substring(0, 100)
    });

    // Intelligent TTL based on confidence score
    let ttl = this.defaultTtl;
    const confidenceScore = analysisResult.metrics?.confidenceScore || 
                           analysisResult.confidence || 
                           analysisResult.confidenceScore;
    
    if (typeof confidenceScore === 'number') {
      if (confidenceScore >= 90) {
        ttl = 14400; // 4 hours for very high confidence
      } else if (confidenceScore >= 80) {
        ttl = 7200; // 2 hours for high confidence
      } else if (confidenceScore >= 70) {
        ttl = 3600; // 1 hour for medium confidence
      } else {
        ttl = 1800; // 30 minutes for low confidence
      }
    }

    // Enhanced cache entry
    const cacheEntry = {
      ...analysisResult,
      cacheMetadata: {
        cachedAt: new Date().toISOString(),
        analysisType,
        ttl,
        confidenceScore,
        region: opportunityDetails.region,
        version: '2.0'
      }
    };

    await this.set(key, cacheEntry, ttl);
    return key;
  }

  // Get cached analysis with fallback (Task 7.1)
  async getCachedAnalysis(opportunityDetails, analysisType) {
    const key = this.generateKey('analysis', {
      customer: opportunityDetails.CustomerName,
      region: opportunityDetails.region,
      type: analysisType,
      description: opportunityDetails.oppDescription?.substring(0, 100)
    });

    return await this.get(key);
  }

  // Performance-optimized batch caching (Task 7.1)
  async batchCache(entries) {
    const pipeline = this.redis.pipeline();
    
    for (const entry of entries) {
      const serialized = JSON.stringify(entry.value);
      pipeline.setex(entry.key, entry.ttl || this.defaultTtl, serialized);
    }
    
    try {
      await pipeline.exec();
      console.log(`📦 Batch cached ${entries.length} entries`);
      return true;
    } catch (error) {
      console.error('Batch cache error:', error);
      return false;
    }
  }

  // Cache warming for performance optimization (Task 7.1)
  async warmCacheForRegion(region, analysisType = 'standard') {
    const warmingData = {
      region,
      analysisType,
      warmedAt: new Date().toISOString(),
      commonPatterns: [
        'enterprise-migration',
        'startup-scaling',
        'digital-transformation'
      ]
    };

    const key = this.generateKey('warm', { region, type: analysisType });
    await this.set(key, warmingData, 7200); // 2 hours
    
    console.log(`🔥 Cache warmed for region: ${region}, type: ${analysisType}`);
  }

  // Enhanced cache statistics with performance metrics (Task 7.6)
  async getEnhancedStats() {
    try {
      const info = await this.redis.info('stats');
      const memory = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      // Get additional performance metrics
      const pipeline = this.redis.pipeline();
      pipeline.dbsize();
      pipeline.lastsave();
      
      const results = await pipeline.exec();
      const dbSize = results[0][1];
      const lastSave = results[1][1];
      
      return {
        performance: {
          dbSize,
          lastSave: new Date(lastSave * 1000).toISOString(),
          keyspaceHits: this.extractMetric(info, 'keyspace_hits'),
          keyspaceMisses: this.extractMetric(info, 'keyspace_misses'),
          hitRate: this.calculateHitRate(info),
          memoryUsage: this.extractMetric(memory, 'used_memory'),
          maxMemory: this.extractMetric(memory, 'maxmemory')
        },
        info: info.split('\r\n').reduce((acc, line) => {
          const [key, value] = line.split(':');
          if (key && value) acc[key] = value;
          return acc;
        }, {}),
        memory: memory.split('\r\n').reduce((acc, line) => {
          const [key, value] = line.split(':');
          if (key && value) acc[key] = value;
          return acc;
        }, {}),
        keyspace: keyspace.split('\r\n').reduce((acc, line) => {
          const [key, value] = line.split(':');
          if (key && value) acc[key] = value;
          return acc;
        }, {}),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Helper method to extract metrics from Redis info
  extractMetric(info, metricName) {
    const match = info.match(new RegExp(`${metricName}:(\\d+)`));
    return match ? parseInt(match[1]) : 0;
  }

  // Calculate cache hit rate
  calculateHitRate(info) {
    const hits = this.extractMetric(info, 'keyspace_hits');
    const misses = this.extractMetric(info, 'keyspace_misses');
    const total = hits + misses;
    return total > 0 ? ((hits / total) * 100).toFixed(2) : 0;
  }

  // Intelligent cache cleanup for cost optimization (Task 7.5)
  async optimizeCache() {
    try {
      console.log('🧹 Starting cache optimization...');
      
      // Get current stats
      const stats = await this.getEnhancedStats();
      const hitRate = parseFloat(stats.performance.hitRate);
      
      // If hit rate is low, clean up old entries
      if (hitRate < 50) {
        console.log(`📊 Low hit rate detected: ${hitRate}%, cleaning up cache...`);
        
        // Get all keys with TTL information
        const keys = await this.redis.keys(`${this.keyPrefix}*`);
        const pipeline = this.redis.pipeline();
        
        for (const key of keys) {
          pipeline.ttl(key);
        }
        
        const ttlResults = await pipeline.exec();
        
        // Remove keys with very short TTL (likely to expire soon anyway)
        const keysToDelete = [];
        for (let i = 0; i < keys.length; i++) {
          const ttl = ttlResults[i][1];
          if (ttl > 0 && ttl < 300) { // Less than 5 minutes
            keysToDelete.push(keys[i]);
          }
        }
        
        if (keysToDelete.length > 0) {
          await this.redis.del(...keysToDelete);
          console.log(`🗑️ Cleaned up ${keysToDelete.length} expiring cache entries`);
        }
      }
      
      console.log('✅ Cache optimization completed');
      return {
        success: true,
        hitRate,
        cleanedEntries: keysToDelete?.length || 0,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Cache optimization failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }