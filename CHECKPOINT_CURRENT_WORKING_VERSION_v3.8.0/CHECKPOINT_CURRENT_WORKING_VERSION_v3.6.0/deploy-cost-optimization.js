#!/usr/bin/env node

const { CloudFormationClient, DescribeStacksCommand } = require('@aws-sdk/client-cloudformation');
const { CostOptimizationStack } = require('../lib/cost-optimization-stack');
const { App } = require('aws-cdk-lib');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class CostOptimizationDeployment {
  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.stackName = 'aws-opportunity-analysis-cost-optimization';
    this.cfClient = new CloudFormationClient({ region: this.region });
  }

  async deploy() {
    console.log('🚀 Starting AWS Cost Optimization and FinOps deployment...\n');

    try {
      // Step 1: Validate prerequisites
      await this.validatePrerequisites();

      // Step 2: Deploy CDK stack
      await this.deployCdkStack();

      // Step 3: Initialize budgets
      await this.initializeBudgets();

      // Step 4: Configure S3 optimization
      await this.configureS3Optimization();

      // Step 5: Set up Lambda concurrency management
      await this.setupConcurrencyManagement();

      // Step 6: Validate deployment
      await this.validateDeployment();

      console.log('\n✅ Cost optimization deployment completed successfully!');
      await this.printSummary();

    } catch (error) {
      console.error('\n❌ Cost optimization deployment failed:', error.message);
      process.exit(1);
    }
  }

  async validatePrerequisites() {
    console.log('📋 Validating prerequisites...');

    // Check AWS credentials
    try {
      const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
      const stsClient = new STSClient({ region: this.region });
      const identity = await stsClient.send(new GetCallerIdentityCommand({}));
      console.log(`   ✓ AWS credentials valid (Account: ${identity.Account})`);
    } catch (error) {
      throw new Error(`AWS credentials not configured: ${error.message}`);
    }

    // Check CDK installation
    try {
      execSync('cdk --version', { stdio: 'pipe' });
      console.log('   ✓ AWS CDK is installed');
    } catch (error) {
      throw new Error('AWS CDK is not installed. Please install it with: npm install -g aws-cdk');
    }

    // Check required environment variables
    const requiredEnvVars = ['AWS_REGION'];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Required environment variable ${envVar} is not set`);
      }
    }

    console.log('   ✓ All prerequisites validated\n');
  }

  async deployCdkStack() {
    console.log('🏗️  Deploying CDK stack...');

    try {
      // Create CDK app
      const app = new App();
      
      // Create cost optimization stack
      new CostOptimizationStack(app, this.stackName, {
        env: {
          account: process.env.CDK_DEFAULT_ACCOUNT,
          region: this.region
        },
        environment: process.env.NODE_ENV || 'production'
      });

      // Synthesize the stack
      console.log('   📦 Synthesizing CDK stack...');
      execSync(`cdk synth ${this.stackName}`, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });

      // Deploy the stack
      console.log('   🚀 Deploying CDK stack...');
      execSync(`cdk deploy ${this.stackName} --require-approval never`, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });

      console.log('   ✓ CDK stack deployed successfully\n');

    } catch (error) {
      throw new Error(`CDK deployment failed: ${error.message}`);
    }
  }

  async initializeBudgets() {
    console.log('💰 Initializing AWS Budgets...');

    try {
      // Get the budget management Lambda function ARN from the stack
      const stackInfo = await this.getStackOutputs();
      const budgetFunctionArn = stackInfo.BudgetManagementFunctionArn;

      if (!budgetFunctionArn) {
        throw new Error('Budget management function ARN not found in stack outputs');
      }

      // Invoke the budget management function
      const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
      const lambdaClient = new LambdaClient({ region: this.region });

      const invokeParams = {
        FunctionName: budgetFunctionArn,
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify({
          action: 'initialize',
          source: 'deployment-script'
        })
      };

      const response = await lambdaClient.send(new InvokeCommand(invokeParams));
      const result = JSON.parse(Buffer.from(response.Payload).toString());

      if (response.StatusCode === 200) {
        console.log('   ✓ Budgets initialized successfully');
        console.log(`   📊 Created/updated budgets: ${result.results?.created?.length || 0}`);
      } else {
        throw new Error(`Budget initialization failed: ${result.error}`);
      }

    } catch (error) {
      console.warn(`   ⚠️  Budget initialization warning: ${error.message}`);
      console.log('   💡 You may need to manually configure budgets in the AWS Console');
    }

    console.log('');
  }

  async configureS3Optimization() {
    console.log('🗄️  Configuring S3 optimization...');

    try {
      // Get the S3 optimization Lambda function ARN from the stack
      const stackInfo = await this.getStackOutputs();
      const s3FunctionArn = stackInfo.S3OptimizationFunctionArn;

      if (!s3FunctionArn) {
        throw new Error('S3 optimization function ARN not found in stack outputs');
      }

      // Invoke the S3 optimization function
      const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
      const lambdaClient = new LambdaClient({ region: this.region });

      const invokeParams = {
        FunctionName: s3FunctionArn,
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify({
          action: 'optimize',
          source: 'deployment-script'
        })
      };

      const response = await lambdaClient.send(new InvokeCommand(invokeParams));
      const result = JSON.parse(Buffer.from(response.Payload).toString());

      if (response.StatusCode === 200) {
        console.log('   ✓ S3 optimization configured successfully');
        console.log(`   📦 Optimized buckets: ${result.results?.summary?.optimizedBuckets || 0}`);
      } else {
        throw new Error(`S3 optimization failed: ${result.error}`);
      }

    } catch (error) {
      console.warn(`   ⚠️  S3 optimization warning: ${error.message}`);
      console.log('   💡 You may need to manually configure S3 intelligent tiering');
    }

    console.log('');
  }

  async setupConcurrencyManagement() {
    console.log('⚡ Setting up Lambda concurrency management...');

    try {
      // Get the concurrency management Lambda function ARN from the stack
      const stackInfo = await this.getStackOutputs();
      const concurrencyFunctionArn = stackInfo.ConcurrencyManagementFunctionArn;

      if (!concurrencyFunctionArn) {
        throw new Error('Concurrency management function ARN not found in stack outputs');
      }

      // Invoke the concurrency management function for initial setup
      const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
      const lambdaClient = new LambdaClient({ region: this.region });

      const invokeParams = {
        FunctionName: concurrencyFunctionArn,
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify({
          action: 'scale-up',
          source: 'deployment-script'
        })
      };

      const response = await lambdaClient.send(new InvokeCommand(invokeParams));
      const result = JSON.parse(Buffer.from(response.Payload).toString());

      if (response.StatusCode === 200) {
        console.log('   ✓ Lambda concurrency management configured successfully');
        console.log(`   🔧 Processed functions: ${result.results?.summary?.successfulUpdates || 0}`);
      } else {
        throw new Error(`Concurrency management setup failed: ${result.error}`);
      }

    } catch (error) {
      console.warn(`   ⚠️  Concurrency management warning: ${error.message}`);
      console.log('   💡 You may need to manually configure Lambda provisioned concurrency');
    }

    console.log('');
  }

  async validateDeployment() {
    console.log('✅ Validating deployment...');

    try {
      // Check if stack exists and is in good state
      const stackInfo = await this.getStackOutputs();
      
      const requiredOutputs = [
        'CostAlertTopicArn',
        'CostMonitoringFunctionArn',
        'BudgetManagementFunctionArn',
        'S3OptimizationFunctionArn',
        'ConcurrencyManagementFunctionArn'
      ];

      for (const output of requiredOutputs) {
        if (!stackInfo[output]) {
          throw new Error(`Required stack output ${output} not found`);
        }
      }

      console.log('   ✓ All required resources deployed');

      // Test cost monitoring function
      await this.testCostMonitoring(stackInfo.CostMonitoringFunctionArn);

      console.log('   ✓ Deployment validation completed\n');

    } catch (error) {
      throw new Error(`Deployment validation failed: ${error.message}`);
    }
  }

  async testCostMonitoring(functionArn) {
    try {
      const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
      const lambdaClient = new LambdaClient({ region: this.region });

      const invokeParams = {
        FunctionName: functionArn,
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify({
          test: true,
          source: 'deployment-validation'
        })
      };

      const response = await lambdaClient.send(new InvokeCommand(invokeParams));
      
      if (response.StatusCode === 200) {
        console.log('   ✓ Cost monitoring function test passed');
      } else {
        console.warn('   ⚠️  Cost monitoring function test failed');
      }

    } catch (error) {
      console.warn(`   ⚠️  Cost monitoring test warning: ${error.message}`);
    }
  }

  async getStackOutputs() {
    try {
      const response = await this.cfClient.send(new DescribeStacksCommand({
        StackName: this.stackName
      }));

      const stack = response.Stacks[0];
      const outputs = {};

      if (stack.Outputs) {
        for (const output of stack.Outputs) {
          outputs[output.OutputKey] = output.OutputValue;
        }
      }

      return outputs;

    } catch (error) {
      throw new Error(`Failed to get stack outputs: ${error.message}`);
    }
  }

  async printSummary() {
    console.log('\n📊 Cost Optimization Deployment Summary');
    console.log('=====================================');

    try {
      const stackInfo = await this.getStackOutputs();

      console.log('\n🔗 Important Resources:');
      console.log(`   Cost Alerts Topic: ${stackInfo.CostAlertTopicArn}`);
      console.log(`   Cost Dashboard: ${stackInfo.CostDashboardUrl}`);
      
      console.log('\n⚡ Lambda Functions:');
      console.log(`   Cost Monitoring: ${stackInfo.CostMonitoringFunctionArn}`);
      console.log(`   Budget Management: ${stackInfo.BudgetManagementFunctionArn}`);
      console.log(`   S3 Optimization: ${stackInfo.S3OptimizationFunctionArn}`);
      console.log(`   Concurrency Management: ${stackInfo.ConcurrencyManagementFunctionArn}`);

      console.log('\n📋 Next Steps:');
      console.log('   1. Subscribe to cost alerts SNS topic');
      console.log('   2. Review and adjust budget thresholds');
      console.log('   3. Monitor cost dashboard regularly');
      console.log('   4. Review S3 intelligent tiering configurations');
      console.log('   5. Adjust Lambda provisioned concurrency as needed');

      console.log('\n💡 Cost Optimization Features Enabled:');
      console.log('   ✓ Daily cost monitoring and alerts');
      console.log('   ✓ Automated budget management');
      console.log('   ✓ S3 intelligent tiering');
      console.log('   ✓ Lambda provisioned concurrency optimization');
      console.log('   ✓ Comprehensive cost allocation tagging');
      console.log('   ✓ DynamoDB on-demand billing');

    } catch (error) {
      console.error('Error printing summary:', error.message);
    }
  }
}

// Main execution
if (require.main === module) {
  const deployment = new CostOptimizationDeployment();
  deployment.deploy().catch(console.error);
}

module.exports = { CostOptimizationDeployment };