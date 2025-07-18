#!/usr/bin/env node

/**
 * Deployment script for Step Functions infrastructure
 * This script helps deploy the AWS CDK stack with Step Functions orchestration
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Step Functions deployment...');

// Check if CDK is installed
try {
  execSync('cdk --version', { stdio: 'pipe' });
  console.log('✅ AWS CDK is installed');
} catch (error) {
  console.error('❌ AWS CDK is not installed. Please install it with: npm install -g aws-cdk');
  process.exit(1);
}

// Check if AWS credentials are configured
try {
  execSync('aws sts get-caller-identity', { stdio: 'pipe' });
  console.log('✅ AWS credentials are configured');
} catch (error) {
  console.error('❌ AWS credentials are not configured. Please run: aws configure');
  process.exit(1);
}

// Check if Lambda functions exist
const lambdaDir = path.join(__dirname, '..', 'lambda');
const requiredLambdas = [
  'query-generation.js',
  'data-retrieval.js',
  'opportunity-analysis.js',
  'funding-analysis.js',
  'follow-on-analysis.js'
];

console.log('🔍 Checking Lambda functions...');
for (const lambdaFile of requiredLambdas) {
  const lambdaPath = path.join(lambdaDir, lambdaFile);
  if (!fs.existsSync(lambdaPath)) {
    console.warn(`⚠️  Lambda function ${lambdaFile} not found. Creating placeholder...`);
    
    const placeholderContent = `
/**
 * ${lambdaFile.replace('.js', '')} Lambda function
 * This is a placeholder implementation for Step Functions integration
 */

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Placeholder implementation
    return {
      status: 'success',
      message: '${lambdaFile.replace('.js', '')} function executed successfully',
      processResults: event,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
    `.trim();
    
    fs.writeFileSync(lambdaPath, placeholderContent);
    console.log(`✅ Created placeholder for ${lambdaFile}`);
  }
}

// Bootstrap CDK if needed
console.log('🔧 Bootstrapping CDK...');
try {
  execSync('cdk bootstrap', { stdio: 'inherit' });
  console.log('✅ CDK bootstrap completed');
} catch (error) {
  console.log('ℹ️  CDK bootstrap may have already been completed');
}

// Synthesize the stack
console.log('🔨 Synthesizing CDK stack...');
try {
  execSync('cdk synth', { stdio: 'inherit' });
  console.log('✅ CDK synthesis completed');
} catch (error) {
  console.error('❌ CDK synthesis failed:', error.message);
  process.exit(1);
}

// Deploy the stack
console.log('🚀 Deploying CDK stack...');
try {
  execSync('cdk deploy --require-approval never', { stdio: 'inherit' });
  console.log('✅ CDK deployment completed successfully!');
  
  console.log('\n🎉 Step Functions infrastructure deployed successfully!');
  console.log('\nNext steps:');
  console.log('1. Update your Lambda functions with actual implementation');
  console.log('2. Test the Step Functions workflows in the AWS Console');
  console.log('3. Configure your frontend to use the new API Gateway endpoint');
  
} catch (error) {
  console.error('❌ CDK deployment failed:', error.message);
  process.exit(1);
}