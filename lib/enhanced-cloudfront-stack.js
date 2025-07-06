const { Stack, Duration, RemovalPolicy, CfnOutput } = require('aws-cdk-lib');
const s3 = require('aws-cdk-lib/aws-s3');
const cloudfront = require('aws-cdk-lib/aws-cloudfront');
const origins = require('aws-cdk-lib/aws-cloudfront-origins');
const iam = require('aws-cdk-lib/aws-iam');
const apigateway = require('aws-cdk-lib/aws-apigateway');

class EnhancedCloudFrontStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Get API Gateway from props
    this.api = props?.api;
    this.websiteBucket = props?.websiteBucket;

    // Create custom cache policy for API responses with intelligent caching
    const apiCachePolicy = new cloudfront.CachePolicy(this, 'ApiCachePolicy', {
      cachePolicyName: 'aws-opportunity-analysis-api-cache',
      comment: 'Intelligent cache policy for API responses',
      defaultTtl: Duration.minutes(15), // 15 minutes for analysis results
      maxTtl: Duration.hours(4), // Max 4 hours for stable results
      minTtl: Duration.seconds(0), // Allow immediate updates when needed
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        'Authorization',
        'Content-Type',
        'X-Amz-Date',
        'X-Api-Key',
        'X-Amz-Security-Token',
        'X-Cache-Control',
        'X-Analysis-Type'
      ),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    });

    // Create cache policy for health checks and metadata (shorter TTL)
    const healthCachePolicy = new cloudfront.CachePolicy(this, 'HealthCachePolicy', {
      cachePolicyName: 'aws-opportunity-analysis-health-cache',
      comment: 'Cache policy for health checks and metadata',
      defaultTtl: Duration.minutes(1),
      maxTtl: Duration.minutes(5),
      minTtl: Duration.seconds(0),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList('Content-Type'),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    });

    // Create cache policy for static analysis data (longer TTL)
    const staticDataCachePolicy = new cloudfront.CachePolicy(this, 'StaticDataCachePolicy', {
      cachePolicyName: 'aws-opportunity-analysis-static-data-cache',
      comment: 'Cache policy for static analysis data',
      defaultTtl: Duration.hours(2),
      maxTtl: Duration.hours(24),
      minTtl: Duration.minutes(5),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList('Content-Type'),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    });

    // Create origin request policy for API Gateway
    const apiOriginRequestPolicy = new cloudfront.OriginRequestPolicy(this, 'ApiOriginRequestPolicy', {
      originRequestPolicyName: 'aws-opportunity-analysis-api-origin',
      comment: 'Origin request policy for API Gateway with caching headers',
      headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList(
        'Authorization',
        'Content-Type',
        'X-Amz-Date',
        'X-Api-Key',
        'X-Amz-Security-Token',
        'X-Amz-User-Agent',
        'X-Cache-Control',
        'X-Analysis-Type',
        'Accept',
        'Accept-Encoding'
      ),
      queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
      cookieBehavior: cloudfront.OriginRequestCookieBehavior.none(),
    });

    // Create CloudFront Function for intelligent cache control
    const cacheControlFunction = new cloudfront.Function(this, 'CacheControlFunction', {
      functionName: 'aws-opportunity-analysis-cache-control',
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    var headers = request.headers;
    
    // Add cache control headers based on request type
    if (uri.includes('/api/analyze')) {
        // Analysis requests - cache based on request body hash
        var body = request.body && request.body.data ? request.body.data : '';
        var analysisType = headers['x-analysis-type'] ? headers['x-analysis-type'].value : 'standard';
        
        // Add cache key based on analysis type and request characteristics
        headers['x-cache-key'] = {
            value: analysisType + '-' + (body.length > 0 ? body.substring(0, 100) : 'empty')
        };
        
        // Set cache control based on analysis type
        if (analysisType === 'nova-premier') {
            headers['x-cache-control'] = { value: 'max-age=7200' }; // 2 hours for premium analysis
        } else {
            headers['x-cache-control'] = { value: 'max-age=3600' }; // 1 hour for standard analysis
        }
    } else if (uri.includes('/api/health')) {
        // Health checks - short cache
        headers['x-cache-control'] = { value: 'max-age=60' }; // 1 minute
    } else if (uri.includes('/api/prompts') || uri.includes('/api/config')) {
        // Static configuration data - longer cache
        headers['x-cache-control'] = { value: 'max-age=14400' }; // 4 hours
    }
    
    return request;
}
      `),
      comment: 'Intelligent cache control for API requests',
    });

    // Create response function for cache headers
    const cacheResponseFunction = new cloudfront.Function(this, 'CacheResponseFunction', {
      functionName: 'aws-opportunity-analysis-cache-response',
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
    var response = event.response;
    var request = event.request;
    var headers = response.headers;
    
    // Add cache control headers to response
    var uri = request.uri;
    
    if (uri.includes('/api/analyze')) {
        // Analysis responses - add cache metadata
        headers['cache-control'] = { value: 'public, max-age=3600, s-maxage=7200' };
        headers['x-cache-type'] = { value: 'analysis' };
        headers['vary'] = { value: 'X-Analysis-Type, Authorization' };
    } else if (uri.includes('/api/health')) {
        headers['cache-control'] = { value: 'public, max-age=60, s-maxage=300' };
        headers['x-cache-type'] = { value: 'health' };
    } else if (uri.includes('/api/prompts') || uri.includes('/api/config')) {
        headers['cache-control'] = { value: 'public, max-age=14400, s-maxage=86400' };
        headers['x-cache-type'] = { value: 'static' };
    }
    
    // Add cache hit/miss information
    headers['x-cache-timestamp'] = { value: new Date().toISOString() };
    
    return response;
}
      `),
      comment: 'Add cache headers to API responses',
    });

    // Create enhanced CloudFront distribution with API caching
    if (this.api && this.websiteBucket) {
      this.distribution = new cloudfront.Distribution(this, 'EnhancedDistribution', {
        comment: 'Enhanced AWS Opportunity Analysis CloudFront Distribution with API Caching',
        defaultBehavior: {
          origin: new origins.S3Origin(this.websiteBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          compress: true,
        },
        additionalBehaviors: {
          // API analyze endpoint with intelligent caching
          '/api/analyze': {
            origin: new origins.RestApiOrigin(this.api),
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: apiCachePolicy,
            originRequestPolicy: apiOriginRequestPolicy,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
            compress: true,
            functionAssociations: [
              {
                function: cacheControlFunction,
                eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
              },
              {
                function: cacheResponseFunction,
                eventType: cloudfront.FunctionEventType.VIEWER_RESPONSE,
              },
            ],
          },
          // API health endpoint with short cache
          '/api/health': {
            origin: new origins.RestApiOrigin(this.api),
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: healthCachePolicy,
            originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
            compress: true,
          },
          // API configuration endpoints with longer cache
          '/api/prompts/*': {
            origin: new origins.RestApiOrigin(this.api),
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: staticDataCachePolicy,
            originRequestPolicy: apiOriginRequestPolicy,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
            compress: true,
          },
          '/api/config/*': {
            origin: new origins.RestApiOrigin(this.api),
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: staticDataCachePolicy,
            originRequestPolicy: apiOriginRequestPolicy,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
            compress: true,
          },
          // All other API endpoints with standard caching
          '/api/*': {
            origin: new origins.RestApiOrigin(this.api),
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: apiCachePolicy,
            originRequestPolicy: apiOriginRequestPolicy,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
            compress: true,
          },
          // Static assets with long cache
          '*.css': {
            origin: new origins.S3Origin(this.websiteBucket),
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
            compress: true,
          },
          '*.js': {
            origin: new origins.S3Origin(this.websiteBucket),
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
            compress: true,
          },
          '*.png': {
            origin: new origins.S3Origin(this.websiteBucket),
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
            compress: false,
          },
          '*.jpg': {
            origin: new origins.S3Origin(this.websiteBucket),
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
            compress: false,
          },
        },
        defaultRootObject: 'index.html',
        errorResponses: [
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: Duration.minutes(5),
          },
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: Duration.minutes(5),
          },
        ],
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        enableIpv6: true,
        httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
        enableLogging: true,
        logBucket: new s3.Bucket(this, 'EnhancedCloudFrontLogsBucket', {
          bucketName: `aws-opportunity-analysis-enhanced-cf-logs-${this.account}-${this.region}`,
          removalPolicy: RemovalPolicy.DESTROY,
          autoDeleteObjects: true,
          lifecycleRules: [
            {
              id: 'DeleteOldLogs',
              enabled: true,
              expiration: Duration.days(90),
            },
          ],
        }),
        logFilePrefix: 'enhanced-cloudfront-logs/',
      });
    }

    // Outputs
    if (this.distribution) {
      new CfnOutput(this, 'EnhancedCloudFrontUrl', {
        value: `https://${this.distribution.distributionDomainName}`,
        description: 'Enhanced CloudFront Distribution URL with API Caching',
        exportName: 'EnhancedCloudFrontUrl',
      });

      new CfnOutput(this, 'EnhancedDistributionId', {
        value: this.distribution.distributionId,
        description: 'Enhanced CloudFront Distribution ID',
        exportName: 'EnhancedDistributionId',
      });
    }

    new CfnOutput(this, 'ApiCachePolicyId', {
      value: apiCachePolicy.cachePolicyId,
      description: 'API Cache Policy ID',
      exportName: 'ApiCachePolicyId',
    });

    new CfnOutput(this, 'HealthCachePolicyId', {
      value: healthCachePolicy.cachePolicyId,
      description: 'Health Cache Policy ID',
      exportName: 'HealthCachePolicyId',
    });

    new CfnOutput(this, 'StaticDataCachePolicyId', {
      value: staticDataCachePolicy.cachePolicyId,
      description: 'Static Data Cache Policy ID',
      exportName: 'StaticDataCachePolicyId',
    });
  }

  // Getter methods
  get distributionDomainName() {
    return this.distribution?.distributionDomainName;
  }

  get distributionId() {
    return this.distribution?.distributionId;
  }
}

module.exports = { EnhancedCloudFrontStack };