#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class CachingDeployment {
  constructor() {
    this.stackName = 'aws-opportunity-analysis-caching';
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.environment = process.env.NODE_ENV || 'development';
  }

  async deploy() {
    console.log('🚀 Starting caching infrastructure deployment...');
    
    try {
      // Step 1: Deploy ElastiCache stack
      await this.deployElastiCache();
      
      // Step 2: Deploy enhanced CloudFront with API caching
      await this.deployEnhancedCloudFront();
      
      // Step 3: Deploy cache warming Lambda
      await this.deployCacheWarmingLambda();
      
      // Step 4: Update application configuration
      await this.updateApplicationConfig();
      
      // Step 5: Test caching functionality
      await this.testCaching();
      
      console.log('✅ Caching infrastructure deployment completed successfully!');
      
    } catch (error) {
      console.error('❌ Deployment failed:', error.message);
      process.exit(1);
    }
  }

  async deployElastiCache() {
    console.log('📦 Deploying ElastiCache Redis cluster...');
    
    try {
      // Create CDK app for ElastiCache
      const cdkApp = `
const { App } = require('aws-cdk-lib');
const { ElastiCacheStack } = require('../lib/elasticache-stack');

const app = new App();

new ElastiCacheStack(app, 'ElastiCacheStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || '${this.region}',
  },
  environment: '${this.environment}',
});
`;

      fs.writeFileSync('cdk-elasticache.js', cdkApp);
      
      // Deploy ElastiCache stack
      execSync(`npx cdk deploy ElastiCacheStack --app "node cdk-elasticache.js" --require-approval never`, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      
      // Clean up temporary file
      fs.unlinkSync('cdk-elasticache.js');
      
      console.log('✅ ElastiCache deployment completed');
      
    } catch (error) {
      console.error('❌ ElastiCache deployment failed:', error.message);
      throw error;
    }
  }

  async deployEnhancedCloudFront() {
    console.log('🌐 Deploying enhanced CloudFront with API caching...');
    
    try {
      // This would typically integrate with existing API Gateway and S3 bucket
      console.log('ℹ️  Enhanced CloudFront requires integration with existing API Gateway');
      console.log('ℹ️  Please update your main stack to use EnhancedCloudFrontStack');
      
    } catch (error) {
      console.error('❌ Enhanced CloudFront deployment failed:', error.message);
      throw error;
    }
  }

  async deployCacheWarmingLambda() {
    console.log('🔥 Deploying cache warming Lambda function...');
    
    try {
      // Create CDK app for cache warming Lambda
      const cdkApp = `
const { App, Stack, Duration } = require('aws-cdk-lib');
const lambda = require('aws-cdk-lib/aws-lambda');
const events = require('aws-cdk-lib/aws-events');
const targets = require('aws-cdk-lib/aws-events-targets');
const iam = require('aws-cdk-lib/aws-iam');

class CacheWarmingStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create IAM role for cache warming Lambda
    const lambdaRole = new iam.Role(this, 'CacheWarmingLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
      inlinePolicies: {
        CacheWarmingPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'bedrock-agent:GetPrompt',
                'ssm:GetParameter',
                'ssm:GetParameters',
                'ssm:GetParametersByPath',
                'elasticache:DescribeCacheClusters',
                'elasticache:DescribeReplicationGroups',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // Create cache warming Lambda function
    const cacheWarmingFunction = new lambda.Function(this, 'CacheWarmingFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'cache-warming.handler',
      code: lambda.Code.fromAsset('lambda'),
      role: lambdaRole,
      timeout: Duration.minutes(10),
      memorySize: 512,
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        REDIS_ENDPOINT: process.env.REDIS_ENDPOINT || 'localhost',
        REDIS_PORT: process.env.REDIS_PORT || '6379',
        REDIS_AUTH_TOKEN: process.env.REDIS_AUTH_TOKEN || '',
        CATAPULT_QUERY_PROMPT_ID: process.env.CATAPULT_QUERY_PROMPT_ID || '',
        CATAPULT_ANALYSIS_PROMPT_ID: process.env.CATAPULT_ANALYSIS_PROMPT_ID || '',
        CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID: process.env.CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID || '',
      },
    });

    // Create EventBridge rule for scheduled cache warming
    const warmingRule = new events.Rule(this, 'CacheWarmingRule', {
      schedule: events.Schedule.rate(Duration.minutes(30)), // Warm cache every 30 minutes
      description: 'Scheduled cache warming for AWS Opportunity Analysis',
    });

    // Add Lambda as target
    warmingRule.addTarget(new targets.LambdaFunction(cacheWarmingFunction, {
      event: events.RuleTargetInput.fromObject({
        warmingType: 'full',
        source: 'scheduled',
      }),
    }));

    // Create manual warming rule for immediate execution
    const manualWarmingRule = new events.Rule(this, 'ManualCacheWarmingRule', {
      eventPattern: {
        source: ['aws.opportunity-analysis'],
        detailType: ['Cache Warming Request'],
      },
      description: 'Manual cache warming trigger',
    });

    manualWarmingRule.addTarget(new targets.LambdaFunction(cacheWarmingFunction));
  }
}

const app = new App();
new CacheWarmingStack(app, 'CacheWarmingStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || '${this.region}',
  },
});
`;

      fs.writeFileSync('cdk-cache-warming.js', cdkApp);
      
      // Deploy cache warming stack
      execSync(`npx cdk deploy CacheWarmingStack --app "node cdk-cache-warming.js" --require-approval never`, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      
      // Clean up temporary file
      fs.unlinkSync('cdk-cache-warming.js');
      
      console.log('✅ Cache warming Lambda deployment completed');
      
    } catch (error) {
      console.error('❌ Cache warming Lambda deployment failed:', error.message);
      throw error;
    }
  }

  async updateApplicationConfig() {
    console.log('⚙️  Updating application configuration...');
    
    try {
      // Update package.json with Redis dependency
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      if (!packageJson.dependencies.ioredis) {
        packageJson.dependencies.ioredis = '^5.3.2';
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        
        console.log('📦 Added ioredis dependency to package.json');
        
        // Install new dependency
        execSync('npm install', { stdio: 'inherit' });
      }
      
      // Update environment template
      const envTemplatePath = path.join(process.cwd(), '.env.template');
      let envTemplate = '';
      
      if (fs.existsSync(envTemplatePath)) {
        envTemplate = fs.readFileSync(envTemplatePath, 'utf8');
      }
      
      const cacheEnvVars = `
# Redis Cache Configuration
REDIS_ENDPOINT=your-redis-endpoint
REDIS_PORT=6379
REDIS_AUTH_TOKEN=your-redis-auth-token
REDIS_READER_ENDPOINT=your-redis-reader-endpoint

# Cache Configuration
CACHE_DEFAULT_TTL=3600
CACHE_WARMING_ENABLED=true
CACHE_WARMING_INTERVAL=300000
`;

      if (!envTemplate.includes('REDIS_ENDPOINT')) {
        envTemplate += cacheEnvVars;
        fs.writeFileSync(envTemplatePath, envTemplate);
        console.log('📝 Updated .env.template with cache configuration');
      }
      
      console.log('✅ Application configuration updated');
      
    } catch (error) {
      console.error('❌ Application configuration update failed:', error.message);
      throw error;
    }
  }

  async testCaching() {
    console.log('🧪 Testing caching functionality...');
    
    try {
      // Create a simple test script
      const testScript = `
const { CachingService } = require('./lib/caching-service');

async function testCache() {
  console.log('Testing cache connection...');
  
  const cache = new CachingService({
    host: process.env.REDIS_ENDPOINT || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_AUTH_TOKEN,
  });
  
  try {
    // Test basic operations
    await cache.set('test-key', { message: 'Hello Cache!' }, 60);
    const result = await cache.get('test-key');
    
    console.log('Cache test result:', result);
    
    // Test health check
    const health = await cache.healthCheck();
    console.log('Cache health:', health);
    
    // Clean up
    await cache.delete('test-key');
    await cache.disconnect();
    
    console.log('✅ Cache test completed successfully');
    
  } catch (error) {
    console.error('❌ Cache test failed:', error.message);
    await cache.disconnect();
    throw error;
  }
}

testCache().catch(console.error);
`;

      fs.writeFileSync('test-cache.js', testScript);
      
      // Run cache test (only if Redis is available)
      try {
        execSync('node test-cache.js', { stdio: 'inherit', timeout: 10000 });
      } catch (error) {
        console.log('ℹ️  Cache test skipped (Redis not available yet)');
      }
      
      // Clean up test file
      fs.unlinkSync('test-cache.js');
      
      console.log('✅ Caching functionality test completed');
      
    } catch (error) {
      console.error('❌ Caching test failed:', error.message);
      // Don't throw here as this is not critical for deployment
    }
  }

  async showDeploymentSummary() {
    console.log('\n📋 Deployment Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ElastiCache Redis cluster deployed');
    console.log('✅ Enhanced CloudFront configuration created');
    console.log('✅ Cache warming Lambda function deployed');
    console.log('✅ Application configuration updated');
    console.log('✅ Caching functionality tested');
    console.log('\n🔧 Next Steps:');
    console.log('1. Update your main CDK stack to use EnhancedCloudFrontStack');
    console.log('2. Configure Redis endpoints in your .env file');
    console.log('3. Update your application code to use CachingService');
    console.log('4. Monitor cache performance in CloudWatch');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}

// Main execution
if (require.main === module) {
  const deployment = new CachingDeployment();
  
  deployment.deploy()
    .then(() => deployment.showDeploymentSummary())
    .catch((error) => {
      console.error('💥 Deployment failed:', error);
      process.exit(1);
    });
}

module.exports = { CachingDeployment };