#!/usr/bin/env node

const https = require('https');
const { CloudFormationClient, DescribeStacksCommand } = require('@aws-sdk/client-cloudformation');

class CloudFrontTester {
  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.stackName = process.env.CLOUDFRONT_STACK_NAME || 'AwsOpportunityAnalysisCloudFrontStack';
    this.cloudFormationClient = new CloudFormationClient({ region: this.region });
  }

  async getStackOutputs() {
    try {
      const command = new DescribeStacksCommand({
        StackName: this.stackName
      });
      
      const response = await this.cloudFormationClient.send(command);
      const stack = response.Stacks[0];
      
      if (!stack) {
        throw new Error(`Stack ${this.stackName} not found`);
      }
      
      const outputs = {};
      if (stack.Outputs) {
        stack.Outputs.forEach(output => {
          outputs[output.OutputKey] = output.OutputValue;
        });
      }
      
      return outputs;
    } catch (error) {
      console.error('❌ Error getting stack outputs:', error.message);
      throw error;
    }
  }

  async testHttpsRequest(url, expectedStatus = 200) {
    return new Promise((resolve, reject) => {
      const request = https.get(url, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          resolve({
            statusCode: response.statusCode,
            headers: response.headers,
            data: data,
            url: url
          });
        });
      });
      
      request.on('error', (error) => {
        reject(error);
      });
      
      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  async testSecurityHeaders(url) {
    try {
      const response = await this.testHttpsRequest(url);
      const headers = response.headers;
      
      const securityHeaders = {
        'strict-transport-security': headers['strict-transport-security'],
        'content-security-policy': headers['content-security-policy'],
        'x-content-type-options': headers['x-content-type-options'],
        'x-frame-options': headers['x-frame-options'],
        'x-xss-protection': headers['x-xss-protection'],
        'referrer-policy': headers['referrer-policy']
      };
      
      console.log('🔒 Security Headers:');
      Object.entries(securityHeaders).forEach(([header, value]) => {
        if (value) {
          console.log(`   ✅ ${header}: ${value}`);
        } else {
          console.log(`   ❌ ${header}: Missing`);
        }
      });
      
      return securityHeaders;
    } catch (error) {
      console.error('❌ Error testing security headers:', error.message);
      throw error;
    }
  }

  async testCaching(url) {
    try {
      const response = await this.testHttpsRequest(url);
      const headers = response.headers;
      
      const cacheHeaders = {
        'cache-control': headers['cache-control'],
        'etag': headers['etag'],
        'last-modified': headers['last-modified'],
        'expires': headers['expires'],
        'x-cache': headers['x-cache'],
        'x-cache-hits': headers['x-cache-hits']
      };
      
      console.log('📦 Cache Headers:');
      Object.entries(cacheHeaders).forEach(([header, value]) => {
        if (value) {
          console.log(`   ✅ ${header}: ${value}`);
        }
      });
      
      return cacheHeaders;
    } catch (error) {
      console.error('❌ Error testing caching:', error.message);
      throw error;
    }
  }

  async testCompression(url) {
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'Accept-Encoding': 'gzip, deflate, br'
        }
      };
      
      const request = https.get(url, options, (response) => {
        const encoding = response.headers['content-encoding'];
        const contentLength = response.headers['content-length'];
        
        console.log('🗜️  Compression Test:');
        console.log(`   Content-Encoding: ${encoding || 'none'}`);
        console.log(`   Content-Length: ${contentLength || 'unknown'}`);
        
        if (encoding) {
          console.log(`   ✅ Compression enabled: ${encoding}`);
        } else {
          console.log(`   ⚠️  No compression detected`);
        }
        
        resolve({
          encoding: encoding,
          contentLength: contentLength
        });
      });
      
      request.on('error', reject);
      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  async testSPARouting(baseUrl) {
    try {
      console.log('🔄 Testing SPA Routing...');
      
      // Test non-existent route (should return index.html)
      const testRoute = `${baseUrl}/non-existent-route`;
      const response = await this.testHttpsRequest(testRoute);
      
      if (response.statusCode === 200 && response.data.includes('<title>AWS Opportunity Analysis</title>')) {
        console.log('   ✅ SPA routing working correctly');
        return true;
      } else {
        console.log('   ❌ SPA routing not working');
        return false;
      }
    } catch (error) {
      console.error('❌ Error testing SPA routing:', error.message);
      return false;
    }
  }

  async testStaticAssets(baseUrl) {
    try {
      console.log('📁 Testing Static Assets...');
      
      const assets = [
        { path: '/styles.css', type: 'text/css' },
        { path: '/app.js', type: 'application/javascript' },
        { path: '/manifest.json', type: 'application/json' }
      ];
      
      for (const asset of assets) {
        try {
          const response = await this.testHttpsRequest(`${baseUrl}${asset.path}`);
          if (response.statusCode === 200) {
            console.log(`   ✅ ${asset.path}: OK`);
          } else {
            console.log(`   ❌ ${asset.path}: ${response.statusCode}`);
          }
        } catch (error) {
          console.log(`   ❌ ${asset.path}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('❌ Error testing static assets:', error.message);
    }
  }

  async runAllTests() {
    try {
      console.log('🧪 Starting CloudFront and S3 tests...\n');
      
      // Get stack outputs
      const outputs = await this.getStackOutputs();
      const cloudFrontUrl = outputs.CloudFrontUrl;
      
      if (!cloudFrontUrl) {
        throw new Error('CloudFront URL not found in stack outputs');
      }
      
      console.log(`🌐 Testing URL: ${cloudFrontUrl}\n`);
      
      // Test basic connectivity
      console.log('🔗 Testing Basic Connectivity...');
      const basicResponse = await this.testHttpsRequest(cloudFrontUrl);
      if (basicResponse.statusCode === 200) {
        console.log('   ✅ Basic connectivity: OK');
      } else {
        console.log(`   ❌ Basic connectivity: ${basicResponse.statusCode}`);
      }
      console.log('');
      
      // Test security headers
      await this.testSecurityHeaders(cloudFrontUrl);
      console.log('');
      
      // Test caching
      await this.testCaching(cloudFrontUrl);
      console.log('');
      
      // Test compression
      await this.testCompression(cloudFrontUrl);
      console.log('');
      
      // Test SPA routing
      await this.testSPARouting(cloudFrontUrl);
      console.log('');
      
      // Test static assets
      await this.testStaticAssets(cloudFrontUrl);
      console.log('');
      
      console.log('🎉 All tests completed!');
      console.log(`\n📋 Summary:`);
      console.log(`   CloudFront URL: ${cloudFrontUrl}`);
      console.log(`   S3 Bucket: ${outputs.S3BucketName || 'Unknown'}`);
      console.log(`   Distribution ID: ${outputs.DistributionId || 'Unknown'}`);
      
      if (outputs.CustomDomainUrl) {
        console.log(`   Custom Domain: ${outputs.CustomDomainUrl}`);
      }
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async testPerformance(url) {
    try {
      console.log('⚡ Testing Performance...');
      
      const startTime = Date.now();
      const response = await this.testHttpsRequest(url);
      const endTime = Date.now();
      
      const responseTime = endTime - startTime;
      
      console.log(`   Response Time: ${responseTime}ms`);
      console.log(`   Status Code: ${response.statusCode}`);
      console.log(`   Content Length: ${response.data.length} bytes`);
      
      if (responseTime < 1000) {
        console.log('   ✅ Performance: Good');
      } else if (responseTime < 3000) {
        console.log('   ⚠️  Performance: Acceptable');
      } else {
        console.log('   ❌ Performance: Poor');
      }
      
      return responseTime;
    } catch (error) {
      console.error('❌ Error testing performance:', error.message);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const tester = new CloudFrontTester();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'all':
      await tester.runAllTests();
      break;
    case 'security':
      const outputs = await tester.getStackOutputs();
      await tester.testSecurityHeaders(outputs.CloudFrontUrl);
      break;
    case 'performance':
      const perfOutputs = await tester.getStackOutputs();
      await tester.testPerformance(perfOutputs.CloudFrontUrl);
      break;
    case 'spa':
      const spaOutputs = await tester.getStackOutputs();
      await tester.testSPARouting(spaOutputs.CloudFrontUrl);
      break;
    default:
      console.log(`
Usage: node test-cloudfront.js <command>

Commands:
  all          Run all tests
  security     Test security headers
  performance  Test performance
  spa          Test SPA routing

Environment Variables:
  AWS_REGION              AWS region (default: us-east-1)
  CLOUDFRONT_STACK_NAME   CloudFormation stack name
      `);
      process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  });
}

module.exports = { CloudFrontTester };