// CloudFront Configuration for AWS Opportunity Analysis
const { Duration } = require('aws-cdk-lib');

const CloudFrontConfig = {
  // Cache policies
  caching: {
    // Static assets (CSS, JS, images) - long cache
    staticAssets: {
      defaultTtl: Duration.days(1),
      maxTtl: Duration.days(365),
      minTtl: Duration.seconds(0),
      headers: ['CloudFront-Viewer-Country'],
      queryStrings: false,
      cookies: false,
    },
    
    // HTML files - short cache for updates
    htmlFiles: {
      defaultTtl: Duration.minutes(5),
      maxTtl: Duration.hours(1),
      minTtl: Duration.seconds(0),
      headers: ['CloudFront-Viewer-Country'],
      queryStrings: false,
      cookies: false,
    },
    
    // API requests - no cache
    apiRequests: {
      defaultTtl: Duration.seconds(0),
      maxTtl: Duration.seconds(1),
      minTtl: Duration.seconds(0),
      headers: ['Authorization', 'Content-Type', 'X-Api-Key'],
      queryStrings: true,
      cookies: false,
    },
  },

  // Security headers
  securityHeaders: {
    strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.amazonaws.com",
    xContentTypeOptions: 'nosniff',
    xFrameOptions: 'DENY',
    xXssProtection: '1; mode=block',
    referrerPolicy: 'strict-origin-when-cross-origin',
  },

  // Error responses
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
    {
      httpStatus: 500,
      responseHttpStatus: 200,
      responsePagePath: '/index.html',
      ttl: Duration.minutes(1),
    },
  ],

  // Behavior patterns
  behaviors: {
    // API endpoints
    '/api/*': {
      cachePolicy: 'api',
      allowedMethods: 'ALL',
      compress: false,
      viewerProtocolPolicy: 'REDIRECT_TO_HTTPS',
    },
    
    // Static CSS files
    '*.css': {
      cachePolicy: 'static',
      allowedMethods: 'GET_HEAD',
      compress: true,
      viewerProtocolPolicy: 'REDIRECT_TO_HTTPS',
    },
    
    // Static JavaScript files
    '*.js': {
      cachePolicy: 'static',
      allowedMethods: 'GET_HEAD',
      compress: true,
      viewerProtocolPolicy: 'REDIRECT_TO_HTTPS',
    },
    
    // Image files
    '*.png': {
      cachePolicy: 'static',
      allowedMethods: 'GET_HEAD',
      compress: false,
      viewerProtocolPolicy: 'REDIRECT_TO_HTTPS',
    },
    
    '*.jpg': {
      cachePolicy: 'static',
      allowedMethods: 'GET_HEAD',
      compress: false,
      viewerProtocolPolicy: 'REDIRECT_TO_HTTPS',
    },
    
    '*.ico': {
      cachePolicy: 'static',
      allowedMethods: 'GET_HEAD',
      compress: false,
      viewerProtocolPolicy: 'REDIRECT_TO_HTTPS',
    },
    
    // Manifest and service worker
    '/manifest.json': {
      cachePolicy: 'html',
      allowedMethods: 'GET_HEAD',
      compress: true,
      viewerProtocolPolicy: 'REDIRECT_TO_HTTPS',
    },
  },

  // CloudFront Functions
  functions: {
    request: {
      name: 'aws-opportunity-analysis-request-function',
      code: `
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // Redirect root to index.html
    if (uri === '/') {
        request.uri = '/index.html';
    }
    
    // Add security headers
    request.headers['strict-transport-security'] = {
        value: 'max-age=31536000; includeSubDomains; preload'
    };
    
    // Handle SPA routing - redirect all non-asset requests to index.html
    if (!uri.includes('.') && uri !== '/index.html') {
        request.uri = '/index.html';
    }
    
    // Add cache-busting for HTML files in development
    if (uri.endsWith('.html') && request.querystring.includes('v=')) {
        // Allow cache busting with version parameter
    }
    
    return request;
}
      `,
    },
    
    response: {
      name: 'aws-opportunity-analysis-response-function',
      code: `
function handler(event) {
    var response = event.response;
    var headers = response.headers;
    
    // Add security headers
    headers['strict-transport-security'] = {
        value: 'max-age=31536000; includeSubDomains; preload'
    };
    headers['content-security-policy'] = {
        value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.amazonaws.com"
    };
    headers['x-content-type-options'] = {
        value: 'nosniff'
    };
    headers['x-frame-options'] = {
        value: 'DENY'
    };
    headers['x-xss-protection'] = {
        value: '1; mode=block'
    };
    headers['referrer-policy'] = {
        value: 'strict-origin-when-cross-origin'
    };
    
    // Add performance headers
    headers['x-content-type-options'] = {
        value: 'nosniff'
    };
    
    return response;
}
      `,
    },
  },

  // Distribution settings
  distribution: {
    comment: 'AWS Opportunity Analysis CloudFront Distribution',
    defaultRootObject: 'index.html',
    priceClass: 'PRICE_CLASS_100', // US, Canada, Europe
    enableIpv6: true,
    httpVersion: 'HTTP2_AND_3',
    enableLogging: true,
    logFilePrefix: 'cloudfront-logs/',
  },

  // Custom domain configuration (optional)
  customDomain: {
    // Set these via environment variables or CDK context
    domainName: process.env.CUSTOM_DOMAIN_NAME,
    hostedZoneId: process.env.HOSTED_ZONE_ID,
    certificateArn: process.env.SSL_CERTIFICATE_ARN,
  },
};

module.exports = { CloudFrontConfig };