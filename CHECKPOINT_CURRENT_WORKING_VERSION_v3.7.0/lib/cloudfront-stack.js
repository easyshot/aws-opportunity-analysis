const { Stack, Duration, RemovalPolicy, CfnOutput } = require('aws-cdk-lib');
const s3 = require('aws-cdk-lib/aws-s3');
const cloudfront = require('aws-cdk-lib/aws-cloudfront');
const origins = require('aws-cdk-lib/aws-cloudfront-origins');
const iam = require('aws-cdk-lib/aws-iam');
const certificatemanager = require('aws-cdk-lib/aws-certificatemanager');
const route53 = require('aws-cdk-lib/aws-route53');
const targets = require('aws-cdk-lib/aws-route53-targets');
const s3deploy = require('aws-cdk-lib/aws-s3-deployment');

class CloudFrontStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create S3 bucket for static website hosting with proper security
    this.websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `aws-opportunity-analysis-frontend-${this.account}-${this.region}`,
      versioned: true,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          enabled: true,
          noncurrentVersionExpiration: Duration.days(30),
        },
      ],
    });

    // Create CloudFront Origin Access Control (OAC) - more secure than OAI
    const originAccessControl = new cloudfront.CfnOriginAccessControl(this, 'OAC', {
      originAccessControlConfig: {
        name: 'AWS-Opportunity-Analysis-OAC',
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4',
        description: 'Origin Access Control for AWS Opportunity Analysis website',
      },
    });

    // Create CloudFront Function for request manipulation
    const requestFunction = new cloudfront.Function(this, 'RequestFunction', {
      functionName: 'aws-opportunity-analysis-request-function',
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // Redirect root to index.html
    if (uri === '/') {
        request.uri = '/index.html';
    }
    
    // Handle SPA routing - redirect all non-asset requests to index.html
    if (!uri.includes('.') && uri !== '/index.html') {
        request.uri = '/index.html';
    }
    
    return request;
}
      `),
      comment: 'Request function for AWS Opportunity Analysis',
    });

    // Create CloudFront Function for response manipulation
    const responseFunction = new cloudfront.Function(this, 'ResponseFunction', {
      functionName: 'aws-opportunity-analysis-response-function',
      code: cloudfront.FunctionCode.fromInline(`
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
    
    return response;
}
      `),
      comment: 'Response function for AWS Opportunity Analysis',
    });

    // Create custom cache policy for static assets
    const staticAssetsCachePolicy = new cloudfront.CachePolicy(this, 'StaticAssetsCachePolicy', {
      cachePolicyName: 'aws-opportunity-analysis-static-cache',
      comment: 'Cache policy for static assets',
      defaultTtl: Duration.days(1),
      maxTtl: Duration.days(365),
      minTtl: Duration.seconds(0),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList('CloudFront-Viewer-Country'),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    });

    // Create custom cache policy for HTML files
    const htmlCachePolicy = new cloudfront.CachePolicy(this, 'HtmlCachePolicy', {
      cachePolicyName: 'aws-opportunity-analysis-html-cache',
      comment: 'Cache policy for HTML files',
      defaultTtl: Duration.minutes(5),
      maxTtl: Duration.hours(1),
      minTtl: Duration.seconds(0),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList('CloudFront-Viewer-Country'),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    });

    // Create CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: 'AWS Opportunity Analysis CloudFront Distribution',
      defaultBehavior: {
        origin: new origins.S3Origin(this.websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: htmlCachePolicy,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        functionAssociations: [
          {
            function: requestFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
          {
            function: responseFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_RESPONSE,
          },
        ],
      },
      additionalBehaviors: {
        '*.css': {
          origin: new origins.S3Origin(this.websiteBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: staticAssetsCachePolicy,
          compress: true,
        },
        '*.js': {
          origin: new origins.S3Origin(this.websiteBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: staticAssetsCachePolicy,
          compress: true,
        },
        '*.png': {
          origin: new origins.S3Origin(this.websiteBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: staticAssetsCachePolicy,
          compress: false,
        },
        '*.jpg': {
          origin: new origins.S3Origin(this.websiteBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: staticAssetsCachePolicy,
          compress: false,
        },
        '*.ico': {
          origin: new origins.S3Origin(this.websiteBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: staticAssetsCachePolicy,
          compress: false,
        },
        '/manifest.json': {
          origin: new origins.S3Origin(this.websiteBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: htmlCachePolicy,
          compress: true,
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
      logBucket: new s3.Bucket(this, 'CloudFrontLogsBucket', {
        bucketName: `aws-opportunity-analysis-cf-logs-${this.account}-${this.region}`,
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
      logFilePrefix: 'cloudfront-logs/',
    });

    // Update the CloudFront distribution to use OAC
    const cfnDistribution = this.distribution.node.defaultChild;
    cfnDistribution.addPropertyOverride('DistributionConfig.Origins.0.S3OriginConfig.OriginAccessIdentity', '');
    cfnDistribution.addPropertyOverride('DistributionConfig.Origins.0.OriginAccessControlId', originAccessControl.getAtt('Id'));

    // Create S3 bucket policy to allow CloudFront OAC access
    const bucketPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          sid: 'AllowCloudFrontServicePrincipal',
          effect: iam.Effect.ALLOW,
          principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
          actions: ['s3:GetObject'],
          resources: [`${this.websiteBucket.bucketArn}/*`],
          conditions: {
            StringEquals: {
              'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${this.distribution.distributionId}`,
            },
          },
        }),
      ],
    });

    // Apply the bucket policy
    this.websiteBucket.addToResourcePolicy(bucketPolicy.statements[0]);

    // Deploy frontend assets to S3
    this.deployment = new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset('./public')],
      destinationBucket: this.websiteBucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
      prune: true,
      retainOnDelete: false,
      memoryLimit: 512,
      ephemeralStorageSize: 1024,
    });

    // Optional: Create custom domain and SSL certificate
    if (props?.domainName && props?.hostedZoneId) {
      // Create SSL certificate
      const certificate = new certificatemanager.Certificate(this, 'Certificate', {
        domainName: props.domainName,
        subjectAlternativeNames: [`www.${props.domainName}`],
        validation: certificatemanager.CertificateValidation.fromDns(),
      });

      // Update distribution with custom domain
      this.distribution.addAlias(props.domainName);
      this.distribution.addAlias(`www.${props.domainName}`);

      // Create Route53 records
      const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
        hostedZoneId: props.hostedZoneId,
        zoneName: props.domainName,
      });

      new route53.ARecord(this, 'AliasRecord', {
        zone: hostedZone,
        recordName: props.domainName,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
      });

      new route53.ARecord(this, 'WwwAliasRecord', {
        zone: hostedZone,
        recordName: `www.${props.domainName}`,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
      });
    }

    // Outputs
    new CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'CloudFront Distribution URL',
      exportName: 'CloudFrontUrl',
    });

    new CfnOutput(this, 'S3BucketName', {
      value: this.websiteBucket.bucketName,
      description: 'S3 Bucket Name for static website',
      exportName: 'S3BucketName',
    });

    new CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: 'DistributionId',
    });

    if (props?.domainName) {
      new CfnOutput(this, 'CustomDomainUrl', {
        value: `https://${props.domainName}`,
        description: 'Custom Domain URL',
        exportName: 'CustomDomainUrl',
      });
    }
  }

  // Getter methods for accessing resources from other stacks
  get bucketName() {
    return this.websiteBucket.bucketName;
  }

  get distributionDomainName() {
    return this.distribution.distributionDomainName;
  }

  get distributionId() {
    return this.distribution.distributionId;
  }
}

module.exports = { CloudFrontStack };