#!/usr/bin/env node

/**
 * Deploy CI/CD Pipeline Infrastructure
 * 
 * This script deploys the AWS CodePipeline infrastructure for automated
 * testing, building, and deployment of the AWS Opportunity Analysis application.
 */

const { execSync } = require('child_process');
const path = require('path');

// Configuration
const STACK_NAME = 'aws-opportunity-analysis-cicd-pipeline';
const CDK_APP = 'bin/app.js';

console.log('🚀 Deploying CI/CD Pipeline Infrastructure...\n');

try {
  // Validate CDK installation
  console.log('📋 Validating CDK installation...');
  execSync('cdk --version', { stdio: 'inherit' });

  // Bootstrap CDK if needed
  console.log('\n🔧 Bootstrapping CDK environment...');
  execSync('cdk bootstrap', { stdio: 'inherit' });

  // Synthesize the stack
  console.log('\n🏗️  Synthesizing CI/CD pipeline stack...');
  execSync(`cdk synth ${STACK_NAME}`, { stdio: 'inherit' });

  // Deploy the stack
  console.log('\n🚀 Deploying CI/CD pipeline stack...');
  execSync(`cdk deploy ${STACK_NAME} --require-approval never`, { stdio: 'inherit' });

  console.log('\n✅ CI/CD Pipeline deployment completed successfully!');
  console.log('\n📝 Next steps:');
  console.log('1. Push your code to the CodeCommit repository');
  console.log('2. The pipeline will automatically trigger on code changes');
  console.log('3. Monitor pipeline execution in the AWS Console');
  console.log('4. Configure SNS notifications for pipeline events');

} catch (error) {
  console.error('\n❌ CI/CD Pipeline deployment failed:', error.message);
  process.exit(1);
}