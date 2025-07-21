/**
 * Unit Tests for Query Cache Service
 * Purpose: Test the intelligent query caching for Phase 1 optimization
 */

const QueryCacheService = require("../lib/query-cache-service");

// Mock the CachingService to avoid Redis dependency in tests
jest.mock("../lib/caching-service", () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    invalidatePattern: jest.fn(),
    healthCheck: jest.fn(),
    getStats: jest.fn(),
    disconnect: jest.fn(),
  }));
});

describe("QueryCacheService", () => {
  let queryCacheService;
  let mockCachingService;

  beforeEach(() => {
    jest.clearAllMocks();
    queryCacheService = new QueryCacheService({
      enableDebug: false,
    });
    mockCachingService = queryCacheService.cacheService;
  });

  afterEach(async () => {
    await queryCacheService.disconnect();
  });

  describe("generateCacheKey", () => {
    it("should generate consistent cache keys for identical parameters", () => {
      const params1 = {
        CustomerName: "Test Company",
        region: "us-east-1",
        industry: "Technology",
      };

      const params2 = {
        CustomerName: "Test Company",
        region: "us-east-1",
        industry: "Technology",
      };

      const key1 = queryCacheService.generateCacheKey(params1);
      const key2 = queryCacheService.generateCacheKey(params2);

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^query:[a-f0-9]{32}$/);
    });

    it("should generate different keys for different parameters", () => {
      const params1 = {
        CustomerName: "Company A",
        region: "us-east-1",
      };

      const params2 = {
        CustomerName: "Company B",
        region: "us-east-1",
      };

      const key1 = queryCacheService.generateCacheKey(params1);
      const key2 = queryCacheService.generateCacheKey(params2);

      expect(key1).not.toBe(key2);
    });

    it("should normalize parameters for consistent hashing", () => {
      const params1 = {
        CustomerName: "  Test Company  ",
        region: "US-EAST-1",
        industry: "Technology",
      };

      const params2 = {
        CustomerName: "test company",
        region: "us-east-1",
        industry: "technology",
      };

      const key1 = queryCacheService.generateCacheKey(params1);
      const key2 = queryCacheService.generateCacheKey(params2);

      expect(key1).toBe(key2);
    });
  });

  describe("normalizeParameters", () => {
    it("should normalize essential parameters", () => {
      const params = {
        CustomerName: "  Test Company  ",
        region: "US-EAST-1",
        industry: "Technology",
        customerSegment: "Enterprise",
        migrationPhase: "Planning",
        closeDate: "2025-07-01",
        oppName: "Test Opportunity",
        oppDescription: "Test description",
        businessDescription: "Business description",
        partnerName: "Test Partner",
        activityFocus: "Migration",
        settings: {
          sqlQueryLimit: "200",
          relevanceThreshold: "0.8",
        },
      };

      const normalized = queryCacheService.normalizeParameters(params);

      expect(normalized.CustomerName).toBe("test company");
      expect(normalized.region).toBe("us-east-1");
      expect(normalized.industry).toBe("technology");
      expect(normalized.customerSegment).toBe("enterprise");
      expect(normalized.migrationPhase).toBe("planning");
      expect(normalized.closeDate).toBe("2025-07-01");
      expect(normalized.oppName).toBe("test opportunity");
      expect(normalized.oppDescription).toBe("test description");
      expect(normalized.businessDescription).toBe("business description");
      expect(normalized.partnerName).toBe("test partner");
      expect(normalized.activityFocus).toBe("migration");
      expect(normalized.settings).toEqual({
        sqlQueryLimit: "200",
        relevanceThreshold: "0.8",
      });
    });

    it("should handle missing parameters gracefully", () => {
      const params = {
        CustomerName: "Test Company",
      };

      const normalized = queryCacheService.normalizeParameters(params);

      expect(normalized.CustomerName).toBe("test company");
      expect(normalized.region).toBeUndefined();
      expect(normalized.industry).toBeUndefined();
    });
  });

  describe("getCachedQuery", () => {
    it("should return cached result when available", async () => {
      const params = {
        CustomerName: "Test Company",
        region: "us-east-1",
      };

      const cachedData = {
        result: { sql_query: "SELECT * FROM opportunities" },
        cachedAt: "2025-01-01T00:00:00Z",
        ttl: 3600,
      };

      mockCachingService.get.mockResolvedValue(cachedData);

      const result = await queryCacheService.getCachedQuery(params);

      expect(result).toEqual({
        ...cachedData,
        cached: true,
        cacheKey: expect.any(String),
      });
      expect(queryCacheService.stats.hits).toBe(1);
      expect(queryCacheService.stats.misses).toBe(0);
    });

    it("should return null when cache miss", async () => {
      const params = {
        CustomerName: "Test Company",
        region: "us-east-1",
      };

      mockCachingService.get.mockResolvedValue(null);

      const result = await queryCacheService.getCachedQuery(params);

      expect(result).toBeNull();
      expect(queryCacheService.stats.hits).toBe(0);
      expect(queryCacheService.stats.misses).toBe(1);
    });

    it("should handle cache errors gracefully", async () => {
      const params = {
        CustomerName: "Test Company",
        region: "us-east-1",
      };

      mockCachingService.get.mockRejectedValue(new Error("Cache error"));

      const result = await queryCacheService.getCachedQuery(params);

      expect(result).toBeNull();
      expect(queryCacheService.stats.errors).toBe(1);
    });
  });

  describe("cacheQueryResult", () => {
    it("should cache query result successfully", async () => {
      const params = {
        CustomerName: "Test Company",
        region: "us-east-1",
      };

      const result = {
        sql_query: "SELECT * FROM opportunities WHERE customer_name = ?",
      };

      mockCachingService.set.mockResolvedValue(true);

      const cacheKey = await queryCacheService.cacheQueryResult(params, result);

      expect(cacheKey).toMatch(/^query:[a-f0-9]{32}$/);
      expect(mockCachingService.set).toHaveBeenCalledWith(
        cacheKey,
        expect.objectContaining({
          result,
          params: expect.any(Object),
          cachedAt: expect.any(String),
          ttl: expect.any(Number),
          resultSize: expect.any(Number),
          rowCount: expect.any(Number),
        }),
        expect.any(Number)
      );
    });

    it("should handle caching errors gracefully", async () => {
      const params = {
        CustomerName: "Test Company",
        region: "us-east-1",
      };

      const result = {
        sql_query: "SELECT * FROM opportunities",
      };

      mockCachingService.set.mockRejectedValue(new Error("Cache set error"));

      const cacheKey = await queryCacheService.cacheQueryResult(params, result);

      expect(cacheKey).toBeNull();
    });
  });

  describe("calculateIntelligentTtl", () => {
    it("should calculate TTL based on result size", () => {
      const smallResult = { sql_query: "SELECT * FROM small_table" };
      const largeResult = {
        sql_query: "SELECT * FROM large_table",
        data: "x".repeat(2000000),
      };

      const smallTtl = queryCacheService.calculateIntelligentTtl(smallResult);
      const largeTtl = queryCacheService.calculateIntelligentTtl(largeResult);

      expect(smallTtl).toBeLessThan(largeTtl);
    });

    it("should respect explicit TTL override", () => {
      const result = { sql_query: "SELECT * FROM table" };
      const explicitTtl = 7200;

      const ttl = queryCacheService.calculateIntelligentTtl(result, {
        ttl: explicitTtl,
      });

      expect(ttl).toBe(explicitTtl);
    });
  });

  describe("calculateResultSize", () => {
    it("should calculate size of string result", () => {
      const result = "SELECT * FROM opportunities";
      const size = queryCacheService.calculateResultSize(result);

      expect(size).toBeGreaterThan(0);
    });

    it("should calculate size of object result", () => {
      const result = {
        sql_query: "SELECT * FROM opportunities",
        metadata: { rows: 100 },
      };
      const size = queryCacheService.calculateResultSize(result);

      expect(size).toBeGreaterThan(0);
    });
  });

  describe("extractRowCount", () => {
    it("should extract row count from string result", () => {
      const result = JSON.stringify({
        Rows: [
          ["header1", "header2"],
          ["data1", "data2"],
          ["data3", "data4"],
        ],
      });

      const rowCount = queryCacheService.extractRowCount(result);

      expect(rowCount).toBe(2); // Excluding header row
    });

    it("should extract row count from object result", () => {
      const result = {
        Rows: [
          ["header1", "header2"],
          ["data1", "data2"],
          ["data3", "data4"],
          ["data5", "data6"],
        ],
      };

      const rowCount = queryCacheService.extractRowCount(result);

      expect(rowCount).toBe(3); // Excluding header row
    });

    it("should return 0 for invalid result", () => {
      const result = "invalid json";
      const rowCount = queryCacheService.extractRowCount(result);

      expect(rowCount).toBe(0);
    });
  });

  describe("invalidateCache", () => {
    it("should invalidate cache for specific parameters", async () => {
      const params = {
        CustomerName: "Test Company",
        region: "us-east-1",
      };

      mockCachingService.delete.mockResolvedValue(1);

      const result = await queryCacheService.invalidateCache(params);

      expect(result).toBe(true);
      expect(mockCachingService.delete).toHaveBeenCalledWith(
        expect.stringMatching(/^query:[a-f0-9]{32}$/)
      );
    });
  });

  describe("invalidateAllQueryCache", () => {
    it("should invalidate all query cache", async () => {
      mockCachingService.invalidatePattern.mockResolvedValue(5);

      const result = await queryCacheService.invalidateAllQueryCache();

      expect(result).toBe(5);
      expect(mockCachingService.invalidatePattern).toHaveBeenCalledWith(
        "query:*"
      );
    });
  });

  describe("getStats", () => {
    it("should return cache statistics", () => {
      queryCacheService.stats.hits = 10;
      queryCacheService.stats.misses = 5;
      queryCacheService.stats.errors = 1;
      queryCacheService.stats.totalQueries = 16;

      const stats = queryCacheService.getStats();

      expect(stats.hits).toBe(10);
      expect(stats.misses).toBe(5);
      expect(stats.errors).toBe(1);
      expect(stats.totalQueries).toBe(16);
      expect(stats.hitRate).toBe("62.50%");
    });

    it("should handle zero total queries", () => {
      const stats = queryCacheService.getStats();

      expect(stats.hitRate).toBe("0%");
    });
  });

  describe("healthCheck", () => {
    it("should return healthy status when cache service is working", async () => {
      mockCachingService.healthCheck.mockResolvedValue({ status: "healthy" });

      const health = await queryCacheService.healthCheck();

      expect(health.status).toBe("healthy");
      expect(health.cacheService).toEqual({ status: "healthy" });
      expect(health.stats).toBeDefined();
      expect(health.timestamp).toBeDefined();
    });

    it("should return unhealthy status when cache service fails", async () => {
      mockCachingService.healthCheck.mockRejectedValue(
        new Error("Cache error")
      );

      const health = await queryCacheService.healthCheck();

      expect(health.status).toBe("unhealthy");
      expect(health.error).toBe("Cache error");
    });
  });

  describe("warmCache", () => {
    it("should warm cache with popular queries", async () => {
      const popularQueries = [
        { CustomerName: "Company A", region: "us-east-1" },
        { CustomerName: "Company B", region: "us-west-2" },
      ];

      const result = await queryCacheService.warmCache(popularQueries);

      expect(result.warmed).toBe(2);
      expect(result.timestamp).toBeDefined();
    });
  });
});
