#!/usr/bin/env node

require('dotenv').config();
const { CachingService } = require('../lib/caching-service');

class CachingTest {
  constructor() {
    this.cachingService = new CachingService({
      host: process.env.REDIS_ENDPOINT || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_AUTH_TOKEN,
      readerHost: process.env.REDIS_READER_ENDPOINT,
    });
  }

  async runAllTests() {
    console.log('🧪 Starting comprehensive caching tests...\n');

    try {
      await this.testConnection();
      await this.testBasicOperations();
      await this.testAnalysisCaching();
      await this.testQueryCaching();
      await this.testPromptCaching();
      await this.testCacheInvalidation();
      await this.testCacheWarming();
      await this.testPerformance();
      
      console.log('\n✅ All caching tests passed successfully!');
      
    } catch (error) {
      console.error('\n❌ Caching tests failed:', error.message);
      throw error;
    } finally {
      await this.cachingService.disconnect();
    }
  }

  async testConnection() {
    console.log('🔌 Testing Redis connection...');
    
    const health = await this.cachingService.healthCheck();
    
    if (!health.primary || !health.reader) {
      throw new Error('Redis connection failed');
    }
    
    console.log('✅ Redis connection successful');
    console.log(`   Primary: ${health.primary ? 'Connected' : 'Failed'}`);
    console.log(`   Reader: ${health.reader ? 'Connected' : 'Failed'}`);
  }

  async testBasicOperations() {
    console.log('\n📝 Testing basic cache operations...');
    
    const testKey = 'test:basic:' + Date.now();
    const testValue = { message: 'Hello Cache!', timestamp: new Date().toISOString() };
    
    // Test set
    const setResult = await this.cachingService.set(testKey, testValue, 60);
    if (!setResult) {
      throw new Error('Cache set operation failed');
    }
    
    // Test get
    const getValue = await this.cachingService.get(testKey);
    if (!getValue || getValue.message !== testValue.message) {
      throw new Error('Cache get operation failed');
    }
    
    // Test delete
    const deleteResult = await this.cachingService.delete(testKey);
    if (!deleteResult) {
      throw new Error('Cache delete operation failed');
    }
    
    // Verify deletion
    const deletedValue = await this.cachingService.get(testKey);
    if (deletedValue !== null) {
      throw new Error('Cache delete verification failed');
    }
    
    console.log('✅ Basic cache operations successful');
  }

  async testAnalysisCaching() {
    console.log('\n🔍 Testing analysis result caching...');
    
    const opportunityDetails = {
      customerName: 'Test Customer',
      region: 'us-east-1',
      description: 'Test opportunity for caching validation',
      closeDate: '2024-12-31',
      opportunityName: 'Test Opportunity',
    };
    
    const analysisResult = {
      metrics: {
        predictedArr: '$100,000',
        predictedMrr: '$8,333',
        confidence: 'HIGH',
        topServices: 'EC2, S3, RDS',
      },
      sections: {
        methodology: 'Test methodology',
        findings: 'Test findings',
        rationale: 'Test rationale',
      },
      confidence: 'HIGH',
    };
    
    // Test caching analysis result
    const cacheKey = await this.cachingService.cacheAnalysisResult(
      opportunityDetails, 
      analysisResult, 
      'standard'
    );
    
    if (!cacheKey) {
      throw new Error('Analysis result caching failed');
    }
    
    // Test retrieving cached analysis
    const cachedResult = await this.cachingService.getCachedAnalysis(
      opportunityDetails, 
      'standard'
    );
    
    if (!cachedResult || cachedResult.metrics.predictedArr !== analysisResult.metrics.predictedArr) {
      throw new Error('Cached analysis retrieval failed');
    }
    
    console.log('✅ Analysis caching successful');
    console.log(`   Cache key: ${cacheKey}`);
    console.log(`   Confidence: ${cachedResult.confidence}`);
  }

  async testQueryCaching() {
    console.log('\n🗃️ Testing query result caching...');
    
    const testQuery = `
      SELECT customer_name, region, total_arr, top_services 
      FROM opportunities 
      WHERE region = 'us-east-1' 
      LIMIT 10
    `;
    
    const queryResults = [
      { customer_name: 'Customer A', region: 'us-east-1', total_arr: 50000, top_services: 'EC2, S3' },
      { customer_name: 'Customer B', region: 'us-east-1', total_arr: 75000, top_services: 'RDS, Lambda' },
    ];
    
    // Test caching query result
    const cacheKey = await this.cachingService.cacheQueryResult(testQuery, queryResults);
    
    if (!cacheKey) {
      throw new Error('Query result caching failed');
    }
    
    // Test retrieving cached query
    const cachedQuery = await this.cachingService.getCachedQuery(testQuery);
    
    if (!cachedQuery || cachedQuery.results.length !== queryResults.length) {
      throw new Error('Cached query retrieval failed');
    }
    
    console.log('✅ Query caching successful');
    console.log(`   Cache key: ${cacheKey}`);
    console.log(`   Results count: ${cachedQuery.results.length}`);
  }

  async testPromptCaching() {
    console.log('\n📋 Testing prompt caching...');
    
    const promptId = 'test-prompt-' + Date.now();
    const promptData = {
      id: promptId,
      name: 'Test Prompt',
      description: 'Test prompt for caching validation',
      variants: [
        {
          name: 'default',
          templateType: 'TEXT',
          templateConfiguration: {
            text: 'This is a test prompt template'
          }
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Test caching prompt
    const cacheKey = await this.cachingService.cachePrompt(promptId, promptData);
    
    if (!cacheKey) {
      throw new Error('Prompt caching failed');
    }
    
    // Test retrieving cached prompt
    const cachedPrompt = await this.cachingService.getCachedPrompt(promptId);
    
    if (!cachedPrompt || cachedPrompt.id !== promptId) {
      throw new Error('Cached prompt retrieval failed');
    }
    
    console.log('✅ Prompt caching successful');
    console.log(`   Cache key: ${cacheKey}`);
    console.log(`   Prompt name: ${cachedPrompt.name}`);
  }

  async testCacheInvalidation() {
    console.log('\n🗑️ Testing cache invalidation...');
    
    // Create test keys
    const testKeys = [
      'test:invalidation:key1',
      'test:invalidation:key2',
      'test:invalidation:key3',
    ];
    
    // Set test values
    for (const key of testKeys) {
      await this.cachingService.set(key, { test: true }, 300);
    }
    
    // Test pattern invalidation
    const invalidatedCount = await this.cachingService.invalidatePattern('invalidation:*');
    
    if (invalidatedCount !== testKeys.length) {
      throw new Error(`Expected to invalidate ${testKeys.length} keys, but invalidated ${invalidatedCount}`);
    }
    
    // Verify invalidation
    for (const key of testKeys) {
      const value = await this.cachingService.get(key);
      if (value !== null) {
        throw new Error(`Key ${key} was not properly invalidated`);
      }
    }
    
    console.log('✅ Cache invalidation successful');
    console.log(`   Invalidated ${invalidatedCount} keys`);
  }

  async testCacheWarming() {
    console.log('\n🔥 Testing cache warming...');
    
    // Test manual cache warming
    await this.cachingService.warmCache();
    
    console.log('✅ Cache warming completed');
  }

  async testPerformance() {
    console.log('\n⚡ Testing cache performance...');
    
    const iterations = 100;
    const testData = { 
      large: 'x'.repeat(1000), 
      timestamp: Date.now(),
      array: Array.from({ length: 100 }, (_, i) => ({ id: i, value: `item-${i}` }))
    };
    
    // Test write performance
    const writeStart = Date.now();
    const writePromises = [];
    
    for (let i = 0; i < iterations; i++) {
      writePromises.push(
        this.cachingService.set(`perf:write:${i}`, testData, 60)
      );
    }
    
    await Promise.all(writePromises);
    const writeTime = Date.now() - writeStart;
    
    // Test read performance
    const readStart = Date.now();
    const readPromises = [];
    
    for (let i = 0; i < iterations; i++) {
      readPromises.push(
        this.cachingService.get(`perf:write:${i}`)
      );
    }
    
    const readResults = await Promise.all(readPromises);
    const readTime = Date.now() - readStart;
    
    // Verify results
    const successfulReads = readResults.filter(r => r !== null).length;
    
    if (successfulReads !== iterations) {
      throw new Error(`Performance test failed: ${successfulReads}/${iterations} reads successful`);
    }
    
    // Cleanup
    await this.cachingService.invalidatePattern('write:*');
    
    console.log('✅ Performance test successful');
    console.log(`   Write time: ${writeTime}ms (${(writeTime/iterations).toFixed(2)}ms per operation)`);
    console.log(`   Read time: ${readTime}ms (${(readTime/iterations).toFixed(2)}ms per operation)`);
    console.log(`   Successful reads: ${successfulReads}/${iterations}`);
  }

  async showCacheStats() {
    console.log('\n📊 Cache Statistics:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const stats = await this.cachingService.getStats();
    
    if (stats.error) {
      console.log('❌ Error getting cache stats:', stats.error);
      return;
    }
    
    console.log('Memory Usage:');
    console.log(`   Used Memory: ${stats.memory.used_memory_human || 'N/A'}`);
    console.log(`   Peak Memory: ${stats.memory.used_memory_peak_human || 'N/A'}`);
    console.log(`   Memory Fragmentation: ${stats.memory.mem_fragmentation_ratio || 'N/A'}`);
    
    console.log('\nConnection Stats:');
    console.log(`   Connected Clients: ${stats.info.connected_clients || 'N/A'}`);
    console.log(`   Total Connections: ${stats.info.total_connections_received || 'N/A'}`);
    
    console.log('\nCommand Stats:');
    console.log(`   Total Commands: ${stats.info.total_commands_processed || 'N/A'}`);
    console.log(`   Keyspace Hits: ${stats.info.keyspace_hits || 'N/A'}`);
    console.log(`   Keyspace Misses: ${stats.info.keyspace_misses || 'N/A'}`);
    
    const hitRate = stats.info.keyspace_hits && stats.info.keyspace_misses 
      ? ((parseInt(stats.info.keyspace_hits) / (parseInt(stats.info.keyspace_hits) + parseInt(stats.info.keyspace_misses))) * 100).toFixed(2)
      : 'N/A';
    console.log(`   Hit Rate: ${hitRate}%`);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}

// Main execution
if (require.main === module) {
  const test = new CachingTest();
  
  const testType = process.argv[2] || 'all';
  
  switch (testType) {
    case 'connection':
      test.testConnection()
        .then(() => test.cachingService.disconnect())
        .catch(console.error);
      break;
    case 'basic':
      test.testBasicOperations()
        .then(() => test.cachingService.disconnect())
        .catch(console.error);
      break;
    case 'performance':
      test.testPerformance()
        .then(() => test.cachingService.disconnect())
        .catch(console.error);
      break;
    case 'stats':
      test.showCacheStats()
        .then(() => test.cachingService.disconnect())
        .catch(console.error);
      break;
    case 'all':
    default:
      test.runAllTests()
        .then(() => test.showCacheStats())
        .catch((error) => {
          console.error('💥 Test suite failed:', error);
          process.exit(1);
        });
      break;
  }
}

module.exports = { CachingTest };