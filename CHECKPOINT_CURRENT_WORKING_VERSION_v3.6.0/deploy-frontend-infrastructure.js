#!/usr/bin/env node

const { execSync } = require('child_process');
const { CloudFrontDeployment } = require('./deploy-cloudfront');
const path = require('path');
const fs = require('fs').promises;

class FrontendInfrastructureDeployment {
  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.stackName = process.env.STACK_NAME || 'AwsOpportunityAnalysisStack';
    this.cloudfrontStackName = process.env.CLOUDFRONT_STACK_NAME || 'AwsOpportunityAnalysisCloudFrontStack';
  }

  async validateEnvironment() {
    console.log('🔍 Validating environment...');
    
    // Check if AWS CLI is configured
    try {
      execSync('aws sts get-caller-identity', { stdio: 'pipe' });
      console.log('✅ AWS credentials configured');
    } catch (error) {
      throw new Error('AWS credentials not configured. Please run "aws configure" first.');
    }
    
    // Check if CDK is installed
    try {
      execSync('cdk --version', { stdio: 'pipe' });
      console.log('✅ AWS CDK installed');
    } catch (error) {
      throw new Error('AWS CDK not installed. Please install with "npm install -g aws-cdk"');
    }
    
    // Check if public directory exists
    const publicDir = path.join(process.cwd(), 'public');
    try {
      await fs.access(publicDir);
      console.log('✅ Public directory found');
    } catch (error) {
      throw new Error(`Public directory not found: ${publicDir}`);
    }
    
    // Check required files
    const requiredFiles = ['index.html', 'app.js', 'styles.css'];
    for (const file of requiredFiles) {
      try {
        await fs.access(path.join(publicDir, file));
        console.log(`✅ Found required file: ${file}`);
      } catch (error) {
        throw new Error(`Required file missing: ${file}`);
      }
    }
  }

  async bootstrapCDK() {
    console.log('🚀 Bootstrapping CDK...');
    
    try {
      execSync(`cdk bootstrap aws://$(aws sts get-caller-identity --query Account --output text)/${this.region}`, {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('✅ CDK bootstrap completed');
    } catch (error) {
      console.warn('⚠️  CDK bootstrap may have failed, but continuing...');
    }
  }

  async deployInfrastructure() {
    console.log('🏗️  Deploying infrastructure...');
    
    try {
      // Deploy main stack first (if it doesn't exist)
      console.log('📦 Deploying main stack...');
      execSync(`cdk deploy ${this.stackName} --require-approval never`, {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('✅ Main stack deployed');
      
      // Deploy CloudFront stack
      console.log('📦 Deploying CloudFront stack...');
      execSync(`cdk deploy ${this.cloudfrontStackName} --require-approval never`, {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('✅ CloudFront stack deployed');
      
    } catch (error) {
      console.error('❌ Infrastructure deployment failed:', error.message);
      throw error;
    }
  }

  async deployFrontendAssets() {
    console.log('📤 Deploying frontend assets...');
    
    const deployment = new CloudFrontDeployment();
    deployment.stackName = this.cloudfrontStackName;
    
    await deployment.deployFrontend();
    console.log('✅ Frontend assets deployed');
  }

  async validateDeployment() {
    console.log('🔍 Validating deployment...');
    
    const deployment = new CloudFrontDeployment();
    deployment.stackName = this.cloudfrontStackName;
    
    await deployment.validateDeployment();
    console.log('✅ Deployment validation completed');
  }

  async getDeploymentInfo() {
    console.log('📋 Getting deployment information...');
    
    try {
      const outputs = execSync(`cdk list --json`, {
        stdio: 'pipe',
        cwd: process.cwd()
      }).toString();
      
      const stacks = JSON.parse(outputs);
      console.log('📦 Deployed stacks:', stacks);
      
      // Get stack outputs
      const stackOutputs = execSync(`aws cloudformation describe-stacks --stack-name ${this.cloudfrontStackName} --query 'Stacks[0].Outputs' --output json`, {
        stdio: 'pipe'
      }).toString();
      
      const outputs_parsed = JSON.parse(stackOutputs);
      
      console.log('\n🌐 Deployment URLs:');
      outputs_parsed.forEach(output => {
        if (output.OutputKey.includes('Url')) {
          console.log(`   ${output.Description}: ${output.OutputValue}`);
        }
      });
      
    } catch (error) {
      console.warn('⚠️  Could not retrieve deployment info:', error.message);
    }
  }

  async fullDeployment() {
    try {
      console.log('🚀 Starting full frontend infrastructure deployment...\n');
      
      await this.validateEnvironment();
      await this.bootstrapCDK();
      await this.deployInfrastructure();
      await this.deployFrontendAssets();
      await this.validateDeployment();
      await this.getDeploymentInfo();
      
      console.log('\n🎉 Full deployment completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('   1. Test the application in your browser');
      console.log('   2. Configure custom domain (optional)');
      console.log('   3. Set up monitoring and alerts');
      console.log('   4. Configure CI/CD pipeline');
      
    } catch (error) {
      console.error('\n❌ Deployment failed:', error.message);
      console.log('\n🔧 Troubleshooting:');
      console.log('   1. Check AWS credentials: aws sts get-caller-identity');
      console.log('   2. Check CDK version: cdk --version');
      console.log('   3. Check stack status: aws cloudformation list-stacks');
      console.log('   4. Review CloudFormation events in AWS Console');
      
      process.exit(1);
    }
  }

  async destroyInfrastructure() {
    console.log('🗑️  Destroying infrastructure...');
    
    try {
      // Destroy CloudFront stack first
      console.log('🗑️  Destroying CloudFront stack...');
      execSync(`cdk destroy ${this.cloudfrontStackName} --force`, {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('✅ CloudFront stack destroyed');
      
    } catch (error) {
      console.error('❌ Infrastructure destruction failed:', error.message);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const deployment = new FrontendInfrastructureDeployment();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'deploy':
      await deployment.fullDeployment();
      break;
    case 'infrastructure':
      await deployment.validateEnvironment();
      await deployment.bootstrapCDK();
      await deployment.deployInfrastructure();
      break;
    case 'assets':
      await deployment.deployFrontendAssets();
      break;
    case 'validate':
      await deployment.validateDeployment();
      break;
    case 'info':
      await deployment.getDeploymentInfo();
      break;
    case 'destroy':
      await deployment.destroyInfrastructure();
      break;
    default:
      console.log(`
Usage: node deploy-frontend-infrastructure.js <command>

Commands:
  deploy         Full deployment (infrastructure + assets)
  infrastructure Deploy only infrastructure (CDK stacks)
  assets         Deploy only frontend assets to S3
  validate       Validate the deployment
  info           Get deployment information
  destroy        Destroy the infrastructure

Environment Variables:
  AWS_REGION              AWS region (default: us-east-1)
  STACK_NAME             Main stack name
  CLOUDFRONT_STACK_NAME  CloudFront stack name
  CUSTOM_DOMAIN_NAME     Custom domain (optional)
  HOSTED_ZONE_ID         Route53 hosted zone ID (optional)
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
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = { FrontendInfrastructureDeployment };