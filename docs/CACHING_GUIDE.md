# Intelligent Caching Guide

## Overview

The AWS Opportunity Analysis application implements intelligent caching using ElastiCache Redis and CloudFront to optimize performance and reduce costs. This guide covers the caching architecture, configuration, and best practices.

## Architecture

### Multi-Layer Caching Strategy

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CloudFront    │    │   ElastiCache   │    │   Application   │
│   Edge Cache    │────│   Redis Cache   │────│     Cache       │
│   (15min-4hrs)  │    │   (30min-24hrs) │    │   (In-Memory)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Components

1. **CloudFront Edge Caching**
   - API response caching at edge locations
   - Intelligent cache policies based on request type
   - Cache invalidation strategies

2. **ElastiCache Redis Cluster**
   - Primary/replica setup for high availability
   - Intelligent TTL based on content confidence
   - Cache-aside pattern implementation

3. **Application-Level Caching**
   - In-memory caching for frequently accessed data
   - Session management and state caching

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_ENDPOINT=your-redis-endpoint
REDIS_PORT=6379
REDIS_AUTH_TOKEN=your-redis-auth-token
REDIS_READER_ENDPOINT=your-redis-reader-endpoint

# Cache Settings
CACHE_DEFAULT_TTL=3600
CACHE_WARMING_ENABLED=true
CACHE_WARMING_INTERVAL=300000
```

### Redis Cluster Setup

The ElastiCache Redis cluster is configured with:

- **Node Type**: cache.t3.micro (development) / cache.r6g.large (production)
- **Replication**: Primary + 1 replica for high availability
- **Encryption**: At-rest and in-transit encryption enabled
- **Authentication**: Auth token required
- **Backup**: 7-day snapshot retention

## Caching Strategies

### 1. Analysis Result Caching

Analysis results are cached with intelligent TTL based on confidence:

```javascript
// High confidence results cached for 2 hours
if (analysisResult.confidence === 'HIGH') {
  ttl = 7200;
}
// Medium confidence results cached for 1 hour
else if (analysisResult.confidence === 'MEDIUM') {
  ttl = 3600;
}
// Low confidence results cached for 30 minutes
else {
  ttl = 1800;
}
```

### 2. Query Result Caching

SQL query results are cached for 4 hours since historical data changes infrequently:

```javascript
await cachingService.cacheQueryResult(sqlQuery, results, 14400);
```

### 3. Prompt Caching

Bedrock prompts are cached for 24 hours as they rarely change:

```javascript
await cachingService.cachePrompt(promptId, promptData, 86400);
```

### 4. CloudFront API Caching

Different cache policies for different API endpoints:

- **Analysis endpoints**: 15 minutes default, 4 hours max
- **Health checks**: 1 minute default, 5 minutes max
- **Configuration**: 2 hours default, 24 hours max

## Cache Keys

### Key Naming Convention

```
opp-analysis:{type}:{hash}
```

Examples:
- `opp-analysis:analysis:a1b2c3d4e5f6...`
- `opp-analysis:query:f6e5d4c3b2a1...`
- `opp-analysis:prompt:Y6T66EI3GZ`

### Key Generation

Keys are generated using MD5 hashing of relevant parameters:

```javascript
generateKey(type, params) {
  const paramString = JSON.stringify(params);
  const hash = crypto.createHash('md5').update(paramString).digest('hex');
  return `${this.keyPrefix}${type}:${hash}`;
}
```

## Cache Warming

### Automatic Warming

Cache warming runs automatically every 30 minutes (configurable) and includes:

1. **Prompt Warming**: Pre-loads frequently used Bedrock prompts
2. **Popular Analysis Patterns**: Pre-warms common analysis scenarios
3. **Configuration Data**: Caches system configuration parameters

### Manual Warming

Trigger manual cache warming via API:

```bash
curl -X POST http://localhost:8123/api/cache/warm \
  -H "Content-Type: application/json" \
  -d '{"type": "full"}'
```

### Lambda-based Warming

Scheduled Lambda function for production environments:

```javascript
// Triggered every 30 minutes via EventBridge
exports.handler = async (event) => {
  const service = new CacheWarmingService();
  return await service.handler(event);
};
```

## Cache Invalidation

### Intelligent Invalidation

Cache invalidation strategies based on data type:

1. **Analysis Results**: Invalidated when new similar analyses are performed
2. **Query Results**: Invalidated when underlying data changes
3. **Prompts**: Invalidated when prompt versions are updated

### Manual Invalidation

```bash
# Invalidate by pattern
curl -X POST http://localhost:8123/api/cache/invalidate \
  -H "Content-Type: application/json" \
  -d '{"pattern": "analysis:*"}'

# Invalidate specific key
curl -X POST http://localhost:8123/api/cache/invalidate \
  -H "Content-Type: application/json" \
  -d '{"key": "opp-analysis:analysis:abc123"}'
```

### CloudFront Invalidation

CloudFront cache is invalidated automatically when:
- Application deployments occur
- API responses change significantly
- Manual invalidation is triggered

## Monitoring and Metrics

### Cache Health Monitoring

```bash
# Check cache health
curl http://localhost:8123/api/cache/health

# Get cache statistics
curl http://localhost:8123/api/cache/stats
```

### CloudWatch Metrics

Key metrics monitored:

- **Hit Rate**: Percentage of cache hits vs misses
- **Memory Usage**: Redis memory utilization
- **Connection Count**: Active Redis connections
- **Response Time**: Cache operation latency

### Alarms

Configured CloudWatch alarms for:

- High memory usage (>85%)
- High CPU utilization (>80%)
- High connection count (>500)
- Low hit rate (<70%)

## Performance Optimization

### Cache-Aside Pattern

The application implements the cache-aside pattern:

```javascript
async get(key, fallbackFn, options = {}) {
  // Try cache first
  const cached = await this.redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Execute fallback if cache miss
  const result = await fallbackFn();
  
  // Store in cache
  await this.set(key, result, ttl);
  
  return result;
}
```

### Read Replicas

Read operations use Redis read replicas to distribute load:

```javascript
const client = useReader ? this.readerRedis : this.redis;
const cached = await client.get(key);
```

### Connection Pooling

Redis connections are pooled and reused:

```javascript
const redis = new Redis({
  host: redisEndpoint,
  port: 6379,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
});
```

## Best Practices

### 1. Cache Key Design

- Use consistent naming conventions
- Include version information when needed
- Keep keys short but descriptive
- Use hashing for complex parameters

### 2. TTL Strategy

- Set appropriate TTLs based on data volatility
- Use shorter TTLs for frequently changing data
- Implement intelligent TTL based on confidence levels

### 3. Error Handling

- Always provide fallback mechanisms
- Log cache errors but don't fail requests
- Implement circuit breaker patterns for cache failures

### 4. Memory Management

- Monitor memory usage regularly
- Implement LRU eviction policies
- Use appropriate data structures (strings vs hashes)

### 5. Security

- Enable authentication and encryption
- Use VPC security groups to restrict access
- Rotate auth tokens regularly
- Monitor for suspicious access patterns

## Troubleshooting

### Common Issues

1. **Cache Misses**
   - Check key generation logic
   - Verify TTL settings
   - Monitor for premature evictions

2. **Connection Errors**
   - Verify network connectivity
   - Check security group rules
   - Validate authentication credentials

3. **Memory Issues**
   - Monitor memory usage patterns
   - Adjust eviction policies
   - Consider scaling up node types

4. **Performance Issues**
   - Check for hot keys
   - Monitor connection pool usage
   - Analyze query patterns

### Debugging Commands

```bash
# Test cache connection
npm run test:cache connection

# Run performance tests
npm run test:cache performance

# Get detailed cache statistics
npm run test:cache stats

# Test all cache functionality
npm run test:cache all
```

## Deployment

### Infrastructure Deployment

```bash
# Deploy ElastiCache infrastructure
node scripts/deploy-caching.js

# Deploy cache warming Lambda
cdk deploy CacheWarmingStack

# Update application configuration
npm install
```

### Configuration Updates

1. Update `.env` file with Redis endpoints
2. Configure CloudFront cache policies
3. Set up monitoring and alarms
4. Test cache functionality

### Validation

```bash
# Validate caching infrastructure
node scripts/test-caching.js all

# Check cache health
curl http://localhost:8123/api/cache/health

# Verify cache warming
curl -X POST http://localhost:8123/api/cache/warm
```

## Cost Optimization

### ElastiCache Costs

- Use appropriate node types for workload
- Enable reserved instances for production
- Monitor data transfer costs
- Implement efficient eviction policies

### CloudFront Costs

- Optimize cache hit rates
- Use appropriate price classes
- Monitor data transfer patterns
- Implement intelligent cache policies

### Monitoring Costs

- Set up cost alerts for cache resources
- Monitor cache efficiency metrics
- Regular cost optimization reviews
- Consider spot instances for development

## Future Enhancements

### Planned Improvements

1. **Multi-Region Caching**: Implement cross-region cache replication
2. **Advanced Analytics**: Enhanced cache performance analytics
3. **Machine Learning**: ML-based cache warming predictions
4. **Auto-Scaling**: Dynamic cache cluster scaling based on load

### Integration Opportunities

1. **API Gateway Caching**: Integrate with API Gateway response caching
2. **Lambda Edge**: Implement Lambda@Edge for advanced caching logic
3. **DynamoDB DAX**: Add DynamoDB Accelerator for database caching
4. **Application Load Balancer**: Implement sticky sessions with caching

## Support

For caching-related issues:

1. Check the troubleshooting section
2. Review CloudWatch metrics and alarms
3. Run diagnostic scripts
4. Contact the development team with detailed logs

---

*This guide is part of the AWS Opportunity Analysis application documentation. For more information, see the main README.md file.*