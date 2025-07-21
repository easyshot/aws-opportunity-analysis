# CloudFront and S3 Frontend Delivery Guide

This guide covers the implementation of CloudFront and S3 for frontend delivery in the AWS Opportunity Analysis application.

## Overview

The frontend delivery infrastructure consists of:
- **S3 Bucket**: Secure static website hosting with proper bucket policies
- **CloudFront Distribution**: Global content delivery with edge caching and compression
- **Origin Access Control (OAC)**: Secure access from CloudFront to S3
- **CloudFront Functions**: Request/response manipulation for security and routing
- **Custom Domain Support**: Optional SSL certificates and Route53 integration

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Browser  │───▶│  CloudFront CDN  │───▶│   S3 Bucket     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │ CloudFront Logs  │
                       │   (S3 Bucket)    │
                       └──────────────────┘
```

## Features Implemented

### 1. S3 Bucket Security
- **Block Public Access**: All public access blocked
- **Encryption**: S3-managed encryption enabled
- **SSL Enforcement**: HTTPS-only access required
- **Versioning**: Object versioning enabled
- **Lifecycle Rules**: Automatic cleanup of old versions

### 2. CloudFront Distribution
- **Origin Access Control (OAC)**: More secure than legacy OAI
- **Edge Caching**: Optimized cache policies for different content types
- **Compression**: Automatic gzip compression
- **HTTP/2 and HTTP/3**: Modern protocol support
- **IPv6**: Dual-stack support

### 3. CloudFront Functions
- **Request Function**: SPA routing and security headers
- **Response Function**: Additional security headers and performance optimizations

### 4. Cache Policies
- **Static Assets**: Long-term caching (1 year) for CSS, JS, images
- **HTML Files**: Short-term caching (5 minutes) for quick updates
- **API Requests**: No caching for dynamic content

### 5. Security Headers
- **Strict Transport Security (HSTS)**: Force HTTPS
- **Content Security Policy (CSP)**: Prevent XSS attacks
- **X-Content-Type-Options**: Prevent MIME sniffing
- **X-Frame-Options**: Prevent clickjacking
- **X-XSS-Protection**: Browser XSS protection
- **Referrer Policy**: Control referrer information

## Deployment

### Prerequisites
```bash
# Install dependencies
npm install

# Configure AWS credentials
aws configure

# Bootstrap CDK (if not already done)
cdk bootstrap
```

### Deploy Infrastructure
```bash
# Deploy CloudFront stack
npm run cloudfront:deploy

# Or deploy with clean S3 bucket
npm run cloudfront:deploy-clean
```

### Manual Deployment Steps
```bash
# 1. Deploy CDK infrastructure
cdk deploy AwsOpportunityAnalysisCloudFrontStack

# 2. Deploy frontend assets
node scripts/deploy-cloudfront.js deploy

# 3. Validate deployment
node scripts/deploy-cloudfront.js validate
```

### Full Infrastructure Deployment
```bash
# Deploy everything (infrastructure + assets)
node scripts/deploy-frontend-infrastructure.js deploy
```

## Configuration

### Environment Variables
```bash
# Required
AWS_REGION=us-east-1

# Optional - Custom Domain
CUSTOM_DOMAIN_NAME=your-domain.com
HOSTED_ZONE_ID=Z1234567890ABC
SSL_CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012

# Optional - Stack Names
CLOUDFRONT_STACK_NAME=AwsOpportunityAnalysisCloudFrontStack
```

### Custom Domain Setup
1. **Purchase Domain**: Register domain in Route53 or external registrar
2. **Create Hosted Zone**: Set up Route53 hosted zone
3. **Request Certificate**: Use AWS Certificate Manager in us-east-1
4. **Set Environment Variables**: Configure domain settings
5. **Deploy**: Run deployment with custom domain configuration

## File Structure

```
├── lib/
│   └── cloudfront-stack.js          # CloudFront CDK stack
├── scripts/
│   ├── deploy-cloudfront.js         # CloudFront deployment script
│   └── deploy-frontend-infrastructure.js  # Full deployment script
├── config/
│   └── cloudfront-config.js         # CloudFront configuration
├── public/                          # Frontend assets
│   ├── index.html                   # Main HTML file
│   ├── app.js                       # Frontend JavaScript
│   ├── styles.css                   # CSS styles
│   ├── manifest.json                # PWA manifest
│   └── favicon.ico                  # Favicon
└── docs/
    └── CLOUDFRONT_S3_GUIDE.md       # This guide
```

## Performance Optimizations

### Caching Strategy
- **Static Assets**: 1 year cache with immutable flag
- **HTML Files**: 5 minutes cache for quick updates
- **Images**: 1 year cache without compression
- **API Responses**: No caching

### Compression
- **Text Files**: Gzip compression enabled (HTML, CSS, JS)
- **Images**: No compression (already optimized)
- **JSON/API**: Compression disabled for API responses

### Edge Locations
- **Price Class**: 100 (US, Canada, Europe) for cost optimization
- **Global**: Can be upgraded to ALL for worldwide coverage

## Security Implementation

### S3 Bucket Policies
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::bucket-name/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::account:distribution/distribution-id"
        }
      }
    }
  ]
}
```

### CloudFront Functions
- **Request Processing**: SPA routing, security headers
- **Response Processing**: Additional security headers
- **Edge Computing**: Minimal latency for security enforcement

## Monitoring and Logging

### CloudFront Logs
- **Access Logs**: Stored in dedicated S3 bucket
- **Real-time Logs**: Available for detailed analysis
- **Retention**: 90-day automatic cleanup

### CloudWatch Metrics
- **Request Count**: Number of requests
- **Data Transfer**: Bytes transferred
- **Error Rates**: 4xx and 5xx errors
- **Cache Hit Ratio**: Cache effectiveness

### Alarms
- **High Error Rate**: Alert on 4xx/5xx errors
- **High Latency**: Alert on slow responses
- **Low Cache Hit Ratio**: Alert on cache misses

## Troubleshooting

### Common Issues

#### 1. 403 Forbidden Errors
```bash
# Check S3 bucket policy
aws s3api get-bucket-policy --bucket your-bucket-name

# Verify OAC configuration
aws cloudfront get-origin-access-control --id your-oac-id
```

#### 2. Cache Issues
```bash
# Create invalidation
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"

# Or use npm script
npm run cloudfront:invalidate
```

#### 3. SSL Certificate Issues
```bash
# Check certificate status
aws acm list-certificates --region us-east-1

# Verify domain validation
aws acm describe-certificate --certificate-arn YOUR_CERT_ARN
```

### Validation Commands
```bash
# Test deployment
npm run cloudfront:validate

# Check S3 bucket contents
aws s3 ls s3://your-bucket-name --recursive

# Test CloudFront distribution
curl -I https://your-distribution.cloudfront.net
```

## Cost Optimization

### S3 Costs
- **Storage**: Standard storage for active files
- **Lifecycle Rules**: Automatic cleanup of old versions
- **Transfer**: No charges for CloudFront to S3 transfer

### CloudFront Costs
- **Price Class 100**: Reduced cost for US/Canada/Europe
- **Caching**: Reduced origin requests through effective caching
- **Compression**: Reduced data transfer costs

### Monitoring Costs
```bash
# Check current costs
aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-01-31 --granularity MONTHLY --metrics BlendedCost --group-by Type=DIMENSION,Key=SERVICE
```

## Best Practices

### Security
1. **Always use OAC** instead of legacy OAI
2. **Enable SSL enforcement** on S3 bucket
3. **Implement security headers** via CloudFront Functions
4. **Regular security audits** of bucket policies

### Performance
1. **Optimize cache policies** for different content types
2. **Use compression** for text-based files
3. **Implement proper TTL values** based on content update frequency
4. **Monitor cache hit ratios** and optimize accordingly

### Maintenance
1. **Regular log analysis** for security and performance insights
2. **Automated deployments** using CI/CD pipelines
3. **Infrastructure as Code** using CDK for consistency
4. **Regular cost reviews** and optimization

## Next Steps

1. **Custom Domain**: Set up custom domain with SSL certificate
2. **CI/CD Integration**: Automate deployments with GitHub Actions or CodePipeline
3. **Advanced Monitoring**: Set up detailed CloudWatch dashboards
4. **Performance Testing**: Implement load testing for the CDN
5. **Security Scanning**: Regular security audits and penetration testing

## Support

For issues or questions:
1. Check CloudFormation stack events in AWS Console
2. Review CloudFront distribution settings
3. Examine S3 bucket policies and permissions
4. Check CloudWatch logs and metrics
5. Validate DNS settings for custom domains