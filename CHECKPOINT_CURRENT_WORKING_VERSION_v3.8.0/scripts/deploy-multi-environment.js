#!/usr/bin/env node

const { execSync } = require('child_process');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { STSClient, AssumeRoleCommand } = require('@aws-sdk/client-sts');

class MultiEnvironmentDeployer {
  constructor() {
    this.ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.stsClient = new STSClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.environments = ['dev', 'staging', 'prod'];
  }

  async deployOrganizations() {
    console.log('🏢 Deploying AWS Organizations stack...');
    
    try {
      execSync('npx cdk deploy OrganizationsStack --require-approval never', {
        stdio: 'inherit',
        env: { ...process.env }
      });
      
      console.log('✅ Organizations stack deployed successfully');
    } catch (error) {
      console.error('❌ Failed to deploy Organizations stack:', error.message);
      throw error;
    }
  }

  async getAccountId(environment) {
    try {
      const command = new GetParameterCommand({
        Name: `/opportunity-analysis/accounts/${environment}/id`
      });
      
      const response = await this.ssmClient.send(command);
      return response.Parameter.Value;
    } catch (error) {
      console.error(`❌ Failed to get account ID for ${environment}:`, error.message);
      throw error;
    }
  }

  async assumeRoleForEnvironment(environment, accountId) {
    const roleArn = `arn:aws:iam::${accountId}:role/OrganizationAccountAccessRole`;
    
    try {
      const command = new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: `OpportunityAnalysisDeployment-${environment}-${Date.now()}`,
        DurationSeconds: 3600
      });
      
      const response = await this.stsClient.send(command);
      return response.Credentials;
    } catch (error) {
      console.error(`❌ Failed to assume role for ${environment}:`, error.message);
      throw error;
    }
  }

  async deployEnvironment(environment) {
    console.log(`🚀 Deploying ${environment} environment...`);
    
    try {
      // Get account ID for this environment
      const accountId = await this.getAccountId(environment);
      console.log(`📋 Account ID for ${environment}: ${accountId}`);
      
      // Assume role in target account
      const credentials = await this.assumeRoleForEnvironment(environment, accountId);
      
      // Set up environment variables for CDK deployment
      const deployEnv = {
        ...process.env,
        AWS_ACCESS_KEY_ID: credentials.AccessKeyId,
        AWS_SECRET_ACCESS_KEY: credentials.SecretAccessKey,
        AWS_SESSION_TOKEN: credentials.SessionToken,
        CDK_DEFAULT_ACCOUNT: accountId,
        CDK_DEFAULT_REGION: process.env.AWS_REGION || 'us-east-1'
      };
      
      // Deploy multi-environment stack
      const stackName = `OpportunityAnalysis${environment.charAt(0).toUpperCase() + environment.slice(1)}Stack`;
      const deployCommand = `npx cdk deploy ${stackName} --require-approval never --context environment=${environment} --context accountId=${accountId}`;
      
      execSync(deployCommand, {
        stdio: 'inherit',
        env: deployEnv
      });
      
      console.log(`✅ ${environment} environment deployed successfully`);
    } catch (error) {
      console.error(`❌ Failed to deploy ${environment} environment:`, error.message);
      throw error;
    }
  }

  async deployAllEnvironments() {
    console.log('🌍 Starting multi-environment deployment...');
    
    try {
      // First deploy the Organizations stack in the master account
      await this.deployOrganizations();
      
      // Wait a bit for Organizations to propagate
      console.log('⏳ Waiting for Organizations to propagate...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // Deploy each environment
      for (const environment of this.environments) {
        await this.deployEnvironment(environment);
      }
      
      console.log('🎉 All environments deployed successfully!');
      
      // Display deployment summary
      await this.displayDeploymentSummary();
      
    } catch (error) {
      console.error('❌ Multi-environment deployment failed:', error.message);
      process.exit(1);
    }
  }

  async displayDeploymentSummary() {
    console.log('\n📊 Deployment Summary:');
    console.log('='.repeat(50));
    
    for (const environment of this.environments) {
      try {
        const accountId = await this.getAccountId(environment);
        console.log(`${environment.toUpperCase()}: Account ${accountId}`);
      } catch (error) {
        console.log(`${environment.toUpperCase()}: ❌ Failed to get account info`);
      }
    }
    
    console.log('\n🔗 Next Steps:');
    console.log('1. Configure AWS Control Tower (if not already done)');
    console.log('2. Set up CI/CD pipelines for automated deployments');
    console.log('3. Configure monitoring and alerting for each environment');
    console.log('4. Test cross-account access and deployments');
  }

  async validateEnvironment(environment) {
    console.log(`🔍 Validating ${environment} environment...`);
    
    try {
      const accountId = await this.getAccountId(environment);
      const credentials = await this.assumeRoleForEnvironment(environment, accountId);
      
      // Test basic AWS access
      const testEnv = {
        ...process.env,
        AWS_ACCESS_KEY_ID: credentials.AccessKeyId,
        AWS_SECRET_ACCESS_KEY: credentials.SecretAccessKey,
        AWS_SESSION_TOKEN: credentials.SessionToken,
      };
      
      execSync('aws sts get-caller-identity', {
        stdio: 'inherit',
        env: testEnv
      });
      
      console.log(`✅ ${environment} environment validation successful`);
      return true;
    } catch (error) {
      console.error(`❌ ${environment} environment validation failed:`, error.message);
      return false;
    }
  }

  async validateAllEnvironments() {
    console.log('🔍 Validating all environments...');
    
    const results = {};
    for (const environment of this.environments) {
      results[environment] = await this.validateEnvironment(environment);
    }
    
    console.log('\n📊 Validation Results:');
    console.log('='.repeat(30));
    for (const [env, result] of Object.entries(results)) {
      console.log(`${env.toUpperCase()}: ${result ? '✅ PASS' : '❌ FAIL'}`);
    }
    
    return Object.values(results).every(result => result);
  }
}

// CLI interface
async function main() {
  const deployer = new MultiEnvironmentDeployer();
  const command = process.argv[2];
  
  switch (command) {
    case 'deploy':
      await deployer.deployAllEnvironments();
      break;
    case 'deploy-org':
      await deployer.deployOrganizations();
      break;
    case 'deploy-env':
      const environment = process.argv[3];
      if (!environment) {
        console.error('❌ Please specify environment: dev, staging, or prod');
        process.exit(1);
      }
      await deployer.deployEnvironment(environment);
      break;
    case 'validate':
      const allValid = await deployer.validateAllEnvironments();
      process.exit(allValid ? 0 : 1);
      break;
    case 'validate-env':
      const env = process.argv[3];
      if (!env) {
        console.error('❌ Please specify environment: dev, staging, or prod');
        process.exit(1);
      }
      const valid = await deployer.validateEnvironment(env);
      process.exit(valid ? 0 : 1);
      break;
    default:
      console.log('Usage:');
      console.log('  node deploy-multi-environment.js deploy          # Deploy all environments');
      console.log('  node deploy-multi-environment.js deploy-org      # Deploy Organizations only');
      console.log('  node deploy-multi-environment.js deploy-env <env> # Deploy specific environment');
      console.log('  node deploy-multi-environment.js validate        # Validate all environments');
      console.log('  node deploy-multi-environment.js validate-env <env> # Validate specific environment');
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Deployment script failed:', error);
    process.exit(1);
  });
}

module.exports = { MultiEnvironmentDeployer }; 
 async deployControlTower() {
    console.log('🏛️  Deploying Control Tower stack...');
    
    try {
      execSync('npx cdk deploy ControlTowerStack --require-approval never', {
        stdio: 'inherit',
        env: { ...process.env }
      });
      
      console.log('✅ Control Tower stack deployed successfully');
    } catch (error) {
      console.error('❌ Failed to deploy Control Tower stack:', error.message);
      throw error;
    }
  }

  async deployEnhancedCICD() {
    console.log('🔄 Deploying enhanced CI/CD pipeline...');
    
    try {
      // Get account IDs for the pipeline
      const devAccountId = await this.getAccountId('dev');
      const stagingAccountId = await this.getAccountId('staging');
      const prodAccountId = await this.getAccountId('prod');
      
      const deployCommand = `npx cdk deploy EnhancedCicdPipelineStack --require-approval never --context devAccountId=${devAccountId} --context stagingAccountId=${stagingAccountId} --context prodAccountId=${prodAccountId}`;
      
      execSync(deployCommand, {
        stdio: 'inherit',
        env: { ...process.env }
      });
      
      console.log('✅ Enhanced CI/CD pipeline deployed successfully');
    } catch (error) {
      console.error('❌ Failed to deploy enhanced CI/CD pipeline:', error.message);
      throw error;
    }
  }

  async deployCompleteMultiEnvironment() {
    console.log('🌍 Starting complete multi-environment deployment...');
    
    try {
      // Step 1: Deploy the Organizations stack in the master account
      await this.deployOrganizations();
      
      // Step 2: Deploy Control Tower stack for governance
      await this.deployControlTower();
      
      // Wait for Organizations and Control Tower to propagate
      console.log('⏳ Waiting for Organizations and Control Tower to propagate...');
      await new Promise(resolve => setTimeout(resolve, 60000));
      
      // Step 3: Deploy each environment
      for (const environment of this.environments) {
        await this.deployEnvironment(environment);
      }
      
      // Step 4: Deploy enhanced CI/CD pipeline
      await this.deployEnhancedCICD();
      
      console.log('🎉 Complete multi-environment infrastructure deployed successfully!');
      
      // Display enhanced deployment summary
      await this.displayEnhancedDeploymentSummary();
      
    } catch (error) {
      console.error('❌ Complete multi-environment deployment failed:', error.message);
      process.exit(1);
    }
  }

  async displayEnhancedDeploymentSummary() {
    console.log('\n📊 Enhanced Deployment Summary:');
    console.log('='.repeat(60));
    
    for (const environment of this.environments) {
      try {
        const accountId = await this.getAccountId(environment);
        console.log(`${environment.toUpperCase()}: Account ${accountId}`);
      } catch (error) {
        console.log(`${environment.toUpperCase()}: ❌ Failed to get account info`);
      }
    }
    
    console.log('\n🏗️  Infrastructure Components:');
    console.log('✅ AWS Organizations with separate accounts');
    console.log('✅ AWS Control Tower for governance and compliance');
    console.log('✅ Multi-environment CDK stacks (dev, staging, prod)');
    console.log('✅ Cross-account IAM roles for deployment');
    console.log('✅ Environment-specific parameter management');
    console.log('✅ Enhanced CI/CD pipeline with multi-environment support');
    console.log('✅ Automated compliance monitoring and guardrails');
    console.log('✅ Environment provisioning automation');
    
    console.log('\n🔗 Next Steps:');
    console.log('1. Configure Control Tower guardrails and compliance rules');
    console.log('2. Set up monitoring and alerting for each environment');
    console.log('3. Test cross-account deployments via CI/CD pipeline');
    console.log('4. Configure environment-specific Bedrock prompts');
    console.log('5. Set up automated backup and disaster recovery');
    console.log('6. Configure governance notifications and approval workflows');
  }