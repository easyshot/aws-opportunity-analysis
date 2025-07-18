#!/usr/bin/env node

/**
 * Multi-Environment CDK App
 * Defines all stacks for the multi-environment deployment strategy
 */

const { App, Tags } = require('aws-cdk-lib');
const { MultiEnvironmentStack } = require('./lib/multi-environment-stack');
const { OrganizationsStack } = require('./lib/organizations-stack');
const { ControlTowerStack } = require('./lib/control-tower-stack');
const { EnhancedCicdPipelineStack } = require('./lib/enhanced-cicd-pipeline-stack');
const { LoadTestingStack } = require('./lib/load-testing-stack');
const { ChaosEngineeringStack } = require('./lib/chaos-engineering-stack');
const { SyntheticMonitoringStack } = require('./lib/synthetic-monitoring-stack');
const { InspectorSecurityStack } = require('./lib/inspector-security-stack');

const app = new App();

// Get context values
const environment = app.node.tryGetContext('environment') || 'dev';
const accountId = app.node.tryGetContext('accountId') || process.env.CDK_DEFAULT_ACCOUNT;
const region = app.node.tryGetContext('region') || process.env.CDK_DEFAULT_REGION || 'us-east-1';

// Account IDs for CI/CD pipeline (can be overridden via context)
const devAccountId = app.node.tryGetContext('devAccountId') || accountId;
const stagingAccountId = app.node.tryGetContext('stagingAccountId') || accountId;
const prodAccountId = app.node.tryGetContext('prodAccountId') || accountId;

// Governance email for Control Tower notifications
const governanceEmail = app.node.tryGetContext('governanceEmail') || process.env.GOVERNANCE_EMAIL;

// Apply global tags
Tags.of(app).add('Project', 'OpportunityAnalysis');
Tags.of(app).add('ManagedBy', 'CDK');
Tags.of(app).add('Repository', 'opportunity-analysis');

// Organizations Stack (deployed in master account)
const organizationsStack = new OrganizationsStack(app, 'OrganizationsStack', {
  env: {
    account: accountId,
    region: region,
  },
  description: 'AWS Organizations setup for Opportunity Analysis multi-environment deployment',
});

// Control Tower Stack (deployed in master account)
const controlTowerStack = new ControlTowerStack(app, 'ControlTowerStack', {
  env: {
    account: accountId,
    region: region,
  },
  governanceEmail: governanceEmail,
  description: 'AWS Control Tower setup for governance and compliance',
});

// Multi-Environment Stacks (one for each environment)
const environments = ['dev', 'staging', 'prod'];

const environmentStacks = {};
environments.forEach(env => {
  const envAccountId = app.node.tryGetContext(`${env}AccountId`) || accountId;
  
  environmentStacks[env] = new MultiEnvironmentStack(app, `OpportunityAnalysis${env.charAt(0).toUpperCase() + env.slice(1)}Stack`, {
    env: {
      account: envAccountId,
      region: region,
    },
    environment: env,
    accountId: envAccountId,
    region: region,
    description: `Opportunity Analysis ${env} environment infrastructure`,
  });
  
  // Add environment-specific tags
  Tags.of(environmentStacks[env]).add('Environment', env);
  Tags.of(environmentStacks[env]).add('AccountType', env === 'prod' ? 'production' : 'non-production');
});

// Enhanced CI/CD Pipeline Stack (deployed in master account)
const cicdStack = new EnhancedCicdPipelineStack(app, 'EnhancedCicdPipelineStack', {
  env: {
    account: accountId,
    region: region,
  },
  devAccountId: devAccountId,
  stagingAccountId: stagingAccountId,
  prodAccountId: prodAccountId,
  description: 'Enhanced CI/CD pipeline for multi-environment deployments',
});

// Add dependencies
controlTowerStack.addDependency(organizationsStack);
cicdStack.addDependency(organizationsStack);

// Environment stacks depend on organizations
environments.forEach(env => {
  environmentStacks[env].addDependency(organizationsStack);
});

// Output deployment information
console.log('\n🏗️  CDK App Configuration:');
console.log('='.repeat(40));
console.log(`Default Account: ${accountId}`);
console.log(`Default Region: ${region}`);
console.log(`Environment: ${environment}`);
console.log(`Dev Account: ${devAccountId}`);
console.log(`Staging Account: ${stagingAccountId}`);
console.log(`Prod Account: ${prodAccountId}`);
if (governanceEmail) {
  console.log(`Governance Email: ${governanceEmail}`);
}

console.log('\n📦 Stacks to Deploy:');
console.log('- OrganizationsStack (AWS Organizations setup)');
console.log('- ControlTowerStack (Governance and compliance)');
environments.forEach(env => {
  console.log(`- OpportunityAnalysis${env.charAt(0).toUpperCase() + env.slice(1)}Stack (${env} environment)`);
});
console.log('- EnhancedCicdPipelineStack (Multi-environment CI/CD)');
console.log('- LoadTestingStack (Distributed load testing)');
console.log('- ChaosEngineeringStack (Fault injection testing)');
console.log('- SyntheticMonitoringStack (Continuous monitoring)');
console.log('- InspectorSecurityStack (Automated security testing)');

console.log('\n🚀 Deployment Commands:');
console.log('# Deploy all stacks:');
console.log('npx cdk deploy --all --require-approval never');
console.log('');
console.log('# Deploy specific environment:');
console.log('npx cdk deploy OpportunityAnalysisDevStack --context environment=dev');
console.log('');
console.log('# Deploy with custom account IDs:');
console.log('npx cdk deploy --all --context devAccountId=123456789012 --context stagingAccountId=123456789013 --context prodAccountId=123456789014');

app.synth();