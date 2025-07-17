#!/usr/bin/env node

/**
 * Environment Provisioning Script
 * Automates the creation and configuration of new environments
 */

const { execSync } = require('child_process');
const { SSMClient, PutParameterCommand, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { STSClient, AssumeRoleCommand, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
const { OrganizationsClient, CreateAccountCommand, ListAccountsCommand } = require('@aws-sdk/client-organizations');
const { IAMClient, CreateRoleCommand, AttachRolePolicyCommand, PutRolePolicyCommand } = require('@aws-sdk/client-iam');

class EnvironmentProvisioner {
  constructor() {
    this.ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.stsClient = new STSClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.orgClient = new OrganizationsClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.iamClient = new IAMClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.region = process.env.AWS_REGION || 'us-east-1';
  }

  async provisionNewEnvironment(environmentName, config = {}) {
    console.log(`🚀 Provisioning new environment: ${environmentName}`);
    
    try {
      // Step 1: Create or get AWS account
      const accountId = await this.createOrGetAccount(environmentName, config);
      
      // Step 2: Set up cross-account roles
      await this.setupCrossAccountRoles(environmentName, accountId);
      
      // Step 3: Bootstrap CDK in the new account
      await this.bootstrapCDK(environmentName, accountId);
      
      // Step 4: Deploy base infrastructure
      await this.deployBaseInfrastructure(environmentName, accountId);
      
      // Step 5: Configure environment parameters
      await this.configureEnvironmentParameters(environmentName, accountId, config);
      
      // Step 6: Validate environment
      await this.validateEnvironment(environmentName, accountId);
      
      console.log(`✅ Environment ${environmentName} provisioned successfully!`);
      
      return {
        environmentName,
        accountId,
        region: this.region,
        status: 'provisioned'
      };
      
    } catch (error) {
      console.error(`❌ Failed to provision environment ${environmentName}:`, error.message);
      throw error;
    }
  }

  async createOrGetAccount(environmentName, config) {
    console.log(`📋 Creating/getting AWS account for ${environmentName}...`);
    
    try {
      // Check if account already exists
      const existingAccounts = await this.orgClient.send(new ListAccountsCommand({}));
      const existingAccount = existingAccounts.Accounts?.find(
        account => account.Name === `opportunity-analysis-${environmentName}`
      );
      
      if (existingAccount) {
        console.log(`📋 Using existing account: ${existingAccount.Id}`);
        return existingAccount.Id;
      }
      
      // Create new account
      const email = config.email || `aws-${environmentName}@${config.domain || 'example.com'}`;
      
      console.log(`📧 Creating new account with email: ${email}`);
      
      const createAccountResponse = await this.orgClient.send(new CreateAccountCommand({
        AccountName: `opportunity-analysis-${environmentName}`,
        Email: email
      }));
      
      // Wait for account creation to complete
      const accountId = createAccountResponse.CreateAccountStatus.AccountId;
      console.log(`⏳ Waiting for account creation to complete: ${accountId}`);
      
      // In a real implementation, you'd poll the CreateAccountStatus
      // For now, we'll assume it completes quickly
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      console.log(`✅ Account created: ${accountId}`);
      return accountId;
      
    } catch (error) {
      if (error.name === 'AccountNotRegisteredException') {
        console.log('⚠️  Organizations not set up. Using current account for demonstration.');
        const identity = await this.stsClient.send(new GetCallerIdentityCommand({}));
        return identity.Account;
      }
      throw error;
    }
  }

  async setupCrossAccountRoles(environmentName, accountId) {
    console.log(`🔐 Setting up cross-account roles for ${environmentName}...`);
    
    try {
      // Assume role in target account to create deployment role
      const roleArn = `arn:aws:iam::${accountId}:role/OrganizationAccountAccessRole`;
      
      let credentials;
      try {
        const assumeRoleResponse = await this.stsClient.send(new AssumeRoleCommand({
          RoleArn: roleArn,
          RoleSessionName: `EnvironmentProvisioning-${environmentName}-${Date.now()}`
        }));
        credentials = assumeRoleResponse.Credentials;
      } catch (error) {
        console.log('⚠️  Could not assume organization role. Using current credentials.');
        credentials = null;
      }
      
      // Create IAM client with assumed role credentials if available
      const targetIamClient = credentials ? new IAMClient({
        region: this.region,
        credentials: {
          accessKeyId: credentials.AccessKeyId,
          secretAccessKey: credentials.SecretAccessKey,
          sessionToken: credentials.SessionToken
        }
      }) : this.iamClient;
      
      // Create deployment access role
      const deploymentRoleName = `OpportunityAnalysis${environmentName.charAt(0).toUpperCase() + environmentName.slice(1)}AccessRole`;
      
      const trustPolicy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              AWS: `arn:aws:iam::${await this.getCurrentAccountId()}:root`
            },
            Action: 'sts:AssumeRole',
            Condition: {
              StringEquals: {
                'sts:ExternalId': `opportunity-analysis-${environmentName}`
              }
            }
          }
        ]
      };
      
      try {
        await targetIamClient.send(new CreateRoleCommand({
          RoleName: deploymentRoleName,
          AssumeRolePolicyDocument: JSON.stringify(trustPolicy),
          Description: `Deployment role for Opportunity Analysis ${environmentName} environment`
        }));
        
        // Attach necessary policies
        const deploymentPolicy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'cloudformation:*',
                'lambda:*',
                'apigateway:*',
                'bedrock:*',
                'athena:*',
                's3:*',
                'dynamodb:*',
                'iam:PassRole',
                'iam:GetRole',
                'iam:CreateRole',
                'iam:DeleteRole',
                'iam:AttachRolePolicy',
                'iam:DetachRolePolicy',
                'logs:*',
                'ssm:*',
                'kms:*',
                'events:*',
                'sns:*'
              ],
              Resource: '*'
            }
          ]
        };
        
        await targetIamClient.send(new PutRolePolicyCommand({
          RoleName: deploymentRoleName,
          PolicyName: 'DeploymentPolicy',
          PolicyDocument: JSON.stringify(deploymentPolicy)
        }));
        
        console.log(`✅ Created deployment role: ${deploymentRoleName}`);
        
      } catch (error) {
        if (error.name === 'EntityAlreadyExistsException') {
          console.log(`✅ Deployment role already exists: ${deploymentRoleName}`);
        } else {
          throw error;
        }
      }
      
    } catch (error) {
      console.error(`❌ Failed to set up cross-account roles:`, error.message);
      throw error;
    }
  }

  async bootstrapCDK(environmentName, accountId) {
    console.log(`🏗️  Bootstrapping CDK for ${environmentName}...`);
    
    try {
      const bootstrapCommand = `npx cdk bootstrap aws://${accountId}/${this.region} --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess`;
      
      execSync(bootstrapCommand, {
        stdio: 'inherit',
        env: {
          ...process.env,
          CDK_DEFAULT_ACCOUNT: accountId,
          CDK_DEFAULT_REGION: this.region
        }
      });
      
      console.log(`✅ CDK bootstrapped for ${environmentName}`);
      
    } catch (error) {
      console.error(`❌ Failed to bootstrap CDK:`, error.message);
      throw error;
    }
  }

  async deployBaseInfrastructure(environmentName, accountId) {
    console.log(`🏗️  Deploying base infrastructure for ${environmentName}...`);
    
    try {
      const deployCommand = `node scripts/deploy-multi-environment.js deploy-env ${environmentName}`;
      
      execSync(deployCommand, {
        stdio: 'inherit',
        env: {
          ...process.env,
          CDK_DEFAULT_ACCOUNT: accountId,
          CDK_DEFAULT_REGION: this.region
        }
      });
      
      console.log(`✅ Base infrastructure deployed for ${environmentName}`);
      
    } catch (error) {
      console.error(`❌ Failed to deploy base infrastructure:`, error.message);
      throw error;
    }
  }

  async configureEnvironmentParameters(environmentName, accountId, config) {
    console.log(`⚙️  Configuring environment parameters for ${environmentName}...`);
    
    try {
      const parameters = this.getEnvironmentParameters(environmentName, config);
      
      for (const [key, value] of Object.entries(parameters)) {
        const parameterName = `/opportunity-analysis/${environmentName}/${key}`;
        
        try {
          await this.ssmClient.send(new PutParameterCommand({
            Name: parameterName,
            Value: value,
            Type: 'String',
            Overwrite: true,
            Description: `${key} parameter for ${environmentName} environment`
          }));
          
          console.log(`✅ Set parameter: ${parameterName}`);
        } catch (error) {
          console.error(`❌ Failed to set parameter ${parameterName}:`, error.message);
        }
      }
      
      // Store account ID
      await this.ssmClient.send(new PutParameterCommand({
        Name: `/opportunity-analysis/accounts/${environmentName}/id`,
        Value: accountId,
        Type: 'String',
        Overwrite: true,
        Description: `Account ID for ${environmentName} environment`
      }));
      
      console.log(`✅ Environment parameters configured for ${environmentName}`);
      
    } catch (error) {
      console.error(`❌ Failed to configure environment parameters:`, error.message);
      throw error;
    }
  }

  getEnvironmentParameters(environmentName, config) {
    const baseParameters = {
      'aws/region': this.region,
      'bedrock/model': 'amazon.titan-text-premier-v1:0',
      'athena/database': environmentName === 'prod' ? 'catapult_db_p' : `catapult_db_${environmentName}`,
      'athena/output-location': `s3://opportunity-analysis-${environmentName}-athena-results/`,
    };
    
    // Environment-specific configurations
    const envConfigs = {
      dev: {
        'lambda/concurrency': '5',
        'api/rate-limit': '100',
        'api/burst-limit': '200',
        'monitoring/alarm-threshold': '10',
        'bedrock/query-prompt-id': 'Y6T66EI3GZ-DEV',
        'bedrock/analysis-prompt-id': 'FDUHITJIME-DEV',
        'bedrock/nova-prompt-id': 'P03B9TO1Q1-DEV',
      },
      staging: {
        'lambda/concurrency': '10',
        'api/rate-limit': '500',
        'api/burst-limit': '1000',
        'monitoring/alarm-threshold': '5',
        'bedrock/query-prompt-id': 'Y6T66EI3GZ-STAGING',
        'bedrock/analysis-prompt-id': 'FDUHITJIME-STAGING',
        'bedrock/nova-prompt-id': 'P03B9TO1Q1-STAGING',
      },
      prod: {
        'lambda/concurrency': '50',
        'api/rate-limit': '2000',
        'api/burst-limit': '5000',
        'monitoring/alarm-threshold': '1',
        'bedrock/query-prompt-id': 'Y6T66EI3GZ',
        'bedrock/analysis-prompt-id': 'FDUHITJIME',
        'bedrock/nova-prompt-id': 'P03B9TO1Q1',
      }
    };
    
    return {
      ...baseParameters,
      ...(envConfigs[environmentName] || envConfigs.dev),
      ...config.parameters || {}
    };
  }

  async validateEnvironment(environmentName, accountId) {
    console.log(`🔍 Validating ${environmentName} environment...`);
    
    try {
      const validationCommand = `node scripts/validate-infrastructure.js validate-env ${environmentName}`;
      
      execSync(validationCommand, {
        stdio: 'inherit',
        env: {
          ...process.env,
          CDK_DEFAULT_ACCOUNT: accountId,
          CDK_DEFAULT_REGION: this.region
        }
      });
      
      console.log(`✅ Environment ${environmentName} validation successful`);
      
    } catch (error) {
      console.error(`❌ Environment ${environmentName} validation failed:`, error.message);
      throw error;
    }
  }

  async getCurrentAccountId() {
    const identity = await this.stsClient.send(new GetCallerIdentityCommand({}));
    return identity.Account;
  }

  async listEnvironments() {
    console.log('📋 Listing provisioned environments...');
    
    try {
      const environments = [];
      const envNames = ['dev', 'staging', 'prod'];
      
      for (const envName of envNames) {
        try {
          const response = await this.ssmClient.send(new GetParameterCommand({
            Name: `/opportunity-analysis/accounts/${envName}/id`
          }));
          
          environments.push({
            name: envName,
            accountId: response.Parameter.Value,
            status: 'provisioned'
          });
        } catch (error) {
          environments.push({
            name: envName,
            accountId: null,
            status: 'not-provisioned'
          });
        }
      }
      
      console.log('\n📊 Environment Status:');
      console.log('='.repeat(50));
      environments.forEach(env => {
        const status = env.status === 'provisioned' ? '✅' : '❌';
        const accountInfo = env.accountId ? `(${env.accountId})` : '(not created)';
        console.log(`${status} ${env.name.toUpperCase()}: ${env.status} ${accountInfo}`);
      });
      
      return environments;
      
    } catch (error) {
      console.error('❌ Failed to list environments:', error.message);
      throw error;
    }
  }

  async destroyEnvironment(environmentName) {
    console.log(`🗑️  Destroying environment: ${environmentName}`);
    
    try {
      // Get account ID
      const accountId = await this.getAccountId(environmentName);
      
      // Destroy infrastructure
      const destroyCommand = `npx cdk destroy --all --force`;
      
      execSync(destroyCommand, {
        stdio: 'inherit',
        env: {
          ...process.env,
          CDK_DEFAULT_ACCOUNT: accountId,
          CDK_DEFAULT_REGION: this.region
        }
      });
      
      // Clean up parameters
      const parameterPaths = [
        `/opportunity-analysis/${environmentName}/`,
        `/opportunity-analysis/accounts/${environmentName}/`
      ];
      
      for (const path of parameterPaths) {
        try {
          execSync(`aws ssm delete-parameters-by-path --path "${path}" --recursive`, {
            stdio: 'inherit'
          });
        } catch (error) {
          console.log(`⚠️  Could not delete parameters at path: ${path}`);
        }
      }
      
      console.log(`✅ Environment ${environmentName} destroyed successfully`);
      
    } catch (error) {
      console.error(`❌ Failed to destroy environment ${environmentName}:`, error.message);
      throw error;
    }
  }

  async getAccountId(environmentName) {
    const response = await this.ssmClient.send(new GetParameterCommand({
      Name: `/opportunity-analysis/accounts/${environmentName}/id`
    }));
    return response.Parameter.Value;
  }
}

// CLI interface
async function main() {
  const provisioner = new EnvironmentProvisioner();
  const command = process.argv[2];
  const environmentName = process.argv[3];
  
  switch (command) {
    case 'provision':
      if (!environmentName) {
        console.error('❌ Please specify environment name');
        process.exit(1);
      }
      
      const config = {
        email: process.argv[4],
        domain: process.argv[5] || 'example.com',
        parameters: {}
      };
      
      await provisioner.provisionNewEnvironment(environmentName, config);
      break;
      
    case 'list':
      await provisioner.listEnvironments();
      break;
      
    case 'destroy':
      if (!environmentName) {
        console.error('❌ Please specify environment name');
        process.exit(1);
      }
      
      console.log(`⚠️  This will destroy the ${environmentName} environment. Are you sure? (y/N)`);
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      readline.question('', (answer) => {
        readline.close();
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          provisioner.destroyEnvironment(environmentName);
        } else {
          console.log('❌ Operation cancelled');
        }
      });
      break;
      
    case 'validate':
      if (!environmentName) {
        console.error('❌ Please specify environment name');
        process.exit(1);
      }
      
      const accountId = await provisioner.getAccountId(environmentName);
      await provisioner.validateEnvironment(environmentName, accountId);
      break;
      
    default:
      console.log('Usage:');
      console.log('  node provision-environment.js provision <env-name> [email] [domain]');
      console.log('  node provision-environment.js list');
      console.log('  node provision-environment.js destroy <env-name>');
      console.log('  node provision-environment.js validate <env-name>');
      console.log('');
      console.log('Examples:');
      console.log('  node provision-environment.js provision dev dev@company.com company.com');
      console.log('  node provision-environment.js list');
      console.log('  node provision-environment.js validate dev');
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Environment provisioning failed:', error);
    process.exit(1);
  });
}

module.exports = { EnvironmentProvisioner };