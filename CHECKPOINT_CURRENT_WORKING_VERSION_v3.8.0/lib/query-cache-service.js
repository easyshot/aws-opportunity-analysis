/**
 * Query Cache Service for AWS Opportunity Analysis
 * Purpose: Intelligent caching for SQL queries and results
 *
 * This service implements Phase 1 optimization by providing intelligent caching
 * for query results, reducing Lambda costs and improving response times.
 */

const { CachingService } = require("./caching-service");
const cacheConfig = require("../config/cache-config");
const crypto = require("crypto");

class QueryCacheService {
  constructor(options = {}) {
    this.options = {
      enableDebug: options.enableDebug !== false,
      enableCompression: options.enableCompression !== false,
      ...options,
    };

    // Initialize caching service
    this.cacheService = new CachingService({
      ...cacheConfig.redis,
      defaultTtl: cacheConfig.ttl.queryResults,
      keyPrefix: cacheConfig.keyPrefixes.query,
      enableDebug: this.options.enableDebug,
    });

    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
      totalQueries: 0,
    };

    // Query similarity cache for intelligent cache keys
    this.similarityCache = new Map();
  }

  /**
   * Generate intelligent cache key based on query parameters
   */
  generateCacheKey(params) {
    // Create a normalized parameter object for consistent hashing
    const normalizedParams = this.normalizeParameters(params);

    // Generate hash from normalized parameters
    const paramString = JSON.stringify(normalizedParams);
    const hash = crypto.createHash("md5").update(paramString).digest("hex");

    return `query:${hash}`;
  }

  /**
   * Normalize parameters for consistent cache key generation
   */
  normalizeParameters(params) {
    const normalized = {};

    // Essential parameters that affect query results
    const essentialParams = [
      "CustomerName",
      "region",
      "industry",
      "customerSegment",
      "migrationPhase",
      "closeDate",
      "oppName",
      "oppDescription",
      "businessDescription",
      "partnerName",
      "activityFocus",
    ];

    essentialParams.forEach((param) => {
      if (params[param]) {
        // Normalize string values
        normalized[param] =
          typeof params[param] === "string"
            ? params[param].trim().toLowerCase()
            : params[param];
      }
    });

    // Include query settings that affect results
    if (params.settings) {
      normalized.settings = {
        sqlQueryLimit: params.settings.sqlQueryLimit || "200",
        relevanceThreshold: params.settings.relevanceThreshold || "default",
      };
    }

    return normalized;
  }

  /**
   * Check if query result is cached
   */
  async getCachedQuery(params) {
    const cacheKey = this.generateCacheKey(params);

    try {
      this.stats.totalQueries++;

      const cached = await this.cacheService.get(cacheKey);

      if (cached) {
        this.stats.hits++;

        if (this.options.enableDebug) {
          console.log(`QueryCacheService: Cache hit for key ${cacheKey}`);
        }

        return {
          ...cached,
          cached: true,
          cacheKey,
        };
      }

      this.stats.misses++;

      if (this.options.enableDebug) {
        console.log(`QueryCacheService: Cache miss for key ${cacheKey}`);
      }

      return null;
    } catch (error) {
      this.stats.errors++;
      console.error("QueryCacheService: Error retrieving cached query:", error);
      return null;
    }
  }

  /**
   * Cache query result with intelligent TTL
   */
  async cacheQueryResult(params, result, options = {}) {
    const cacheKey = this.generateCacheKey(params);

    try {
      // Determine TTL based on result characteristics
      const ttl = this.calculateIntelligentTtl(result, options);

      // Prepare cache data
      const cacheData = {
        result,
        params: this.normalizeParameters(params),
        cachedAt: new Date().toISOString(),
        ttl,
        resultSize: this.calculateResultSize(result),
        rowCount: this.extractRowCount(result),
      };

      // Cache the result
      await this.cacheService.set(cacheKey, cacheData, ttl);

      if (this.options.enableDebug) {
        console.log(
          `QueryCacheService: Cached query result for key ${cacheKey} (TTL: ${ttl}s)`
        );
      }

      return cacheKey;
    } catch (error) {
      console.error("QueryCacheService: Error caching query result:", error);
      return null;
    }
  }

  /**
   * Calculate intelligent TTL based on result characteristics
   */
  calculateIntelligentTtl(result, options = {}) {
    // Base TTL from config
    let ttl = cacheConfig.ttl.queryResults;

    // Adjust based on result size (larger results cached longer)
    const resultSize = this.calculateResultSize(result);
    if (resultSize > 1000000) {
      // > 1MB
      ttl = Math.min(ttl * 1.5, 21600); // Up to 6 hours
    } else if (resultSize < 100000) {
      // < 100KB
      ttl = Math.max(ttl * 0.5, 1800); // At least 30 minutes
    }

    // Adjust based on row count
    const rowCount = this.extractRowCount(result);
    if (rowCount > 100) {
      ttl = Math.min(ttl * 1.2, 18000); // Up to 5 hours
    }

    // Override with explicit TTL if provided
    if (options.ttl) {
      ttl = options.ttl;
    }

    return Math.floor(ttl);
  }

  /**
   * Calculate result size in bytes
   */
  calculateResultSize(result) {
    try {
      const resultString =
        typeof result === "string" ? result : JSON.stringify(result);
      return Buffer.byteLength(resultString, "utf8");
    } catch (error) {
      return 0;
    }
  }

  /**
   * Extract row count from query result
   */
  extractRowCount(result) {
    try {
      if (typeof result === "string") {
        const parsed = JSON.parse(result);
        return parsed.Rows ? parsed.Rows.length - 1 : 0; // Subtract header row
      } else if (result.Rows) {
        return result.Rows.length - 1; // Subtract header row
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Find similar cached queries for intelligent suggestions
   */
  async findSimilarQueries(params, limit = 5) {
    try {
      const normalizedParams = this.normalizeParameters(params);
      const similarQueries = [];

      // This would require scanning cache keys, which is expensive
      // In a production environment, you might use a separate index
      // For now, we'll return an empty array

      return similarQueries;
    } catch (error) {
      console.error("QueryCacheService: Error finding similar queries:", error);
      return [];
    }
  }

  /**
   * Invalidate cache for specific parameters
   */
  async invalidateCache(params) {
    try {
      const cacheKey = this.generateCacheKey(params);
      const deleted = await this.cacheService.delete(cacheKey);

      if (this.options.enableDebug) {
        console.log(`QueryCacheService: Invalidated cache for key ${cacheKey}`);
      }

      return deleted;
    } catch (error) {
      console.error("QueryCacheService: Error invalidating cache:", error);
      return false;
    }
  }

  /**
   * Invalidate all query cache
   */
  async invalidateAllQueryCache() {
    try {
      const deletedCount = await this.cacheService.invalidatePattern("query:*");

      if (this.options.enableDebug) {
        console.log(
          `QueryCacheService: Invalidated ${deletedCount} query cache entries`
        );
      }

      return deletedCount;
    } catch (error) {
      console.error(
        "QueryCacheService: Error invalidating all query cache:",
        error
      );
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate =
      this.stats.totalQueries > 0
        ? ((this.stats.hits / this.stats.totalQueries) * 100).toFixed(2)
        : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      cacheServiceStats: this.cacheService.getStats(),
    };
  }

  /**
   * Health check for cache service
   */
  async healthCheck() {
    try {
      const cacheHealth = await this.cacheService.healthCheck();

      return {
        status: "healthy",
        cacheService: cacheHealth,
        stats: this.getStats(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Warm cache with popular queries
   */
  async warmCache(popularQueries = []) {
    try {
      if (this.options.enableDebug) {
        console.log(
          `QueryCacheService: Warming cache with ${popularQueries.length} queries`
        );
      }

      // This would typically involve pre-executing popular queries
      // For now, we'll just log the warming attempt

      return {
        warmed: popularQueries.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("QueryCacheService: Error warming cache:", error);
      return {
        warmed: 0,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Clean up resources
   */
  async disconnect() {
    try {
      await this.cacheService.disconnect();

      if (this.options.enableDebug) {
        console.log("QueryCacheService: Disconnected from cache service");
      }
    } catch (error) {
      console.error("QueryCacheService: Error disconnecting:", error);
    }
  }
}

module.exports = QueryCacheService;
