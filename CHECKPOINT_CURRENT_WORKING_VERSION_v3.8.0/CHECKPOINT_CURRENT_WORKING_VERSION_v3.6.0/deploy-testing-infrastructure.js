#!/usr/bin/env node

/**
 * Deploy Testing Infrastructure
 * Deploys all testing-related AWS infrastructure including load testing, chaos engineering,
 * synthetic monitoring, and security testing components
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  region: process.env.AWS_REGION || 'us-east-1',
  account: process.env.AWS_ACCOUNT_ID,
  environment: process.env.ENVIRONMENT || 'development',
  targetUrl: process.env.TARGET_URL || 'http://localhost:8123',
  notificationEmail: process.env.NOTIFICATION_EMAIL,
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  stacksToDeploy: process.argv.includes('--stacks') 
    ? process.argv[process.argv.indexOf('--stacks') + 1].split(',')
    : ['all']
};

// Available testing stacks
const testingStacks = {
  'load-testing': {
    name: 'LoadTestingStack',
    file: 'lib/load-testing-stack.js',
    description: 'ECS-based distributed load testing infrastructure'
  },
  'chaos-engineering': {
    name: 'ChaosEngineeringStack',
    file: 'lib/chaos-engineering-stack.js',
    description: 'AWS Fault Injection Simulator for chaos engineering'
  },
  'synthetic-monitoring': {
    name: 'SyntheticMonitoringStack',
    file: 'lib/synthetic-monitoring-stack.js',
    description: 'CloudWatch Synthetics for continuous monitoring'
  },
  'inspector-security': {
    name: 'InspectorSecurityStack',
    file: 'lib/inspector-security-stack.js',
    description: 'AWS Inspector for automated security testing'
  },
  'enhanced-cicd': {
    name: 'EnhancedCicdPipelineStack',
    file: 'lib/enhanced-cicd-pipeline-stack.js',
    description: 'Enhanced CI/CD pipeline with comprehensive testing'
  }
};

/**
 * Log message with timestamp
 */
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = {
    INFO: '📋',
    SUCCESS: '✅',
    WARNING: '⚠️',
    ERROR: '❌',
    DEBUG: '🔍'
  }[level] || '📋';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

/**
 * Execute command with error handling
 */
function executeCommand(command, description) {
  log(`${description}...`);
  
  if (config.dryRun) {
    log(`DRY RUN: Would execute: ${command}`, 'DEBUG');
    return;
  }
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: config.verbose ? 'inherit' : 'pipe'
    });
    
    if (!config.verbose && output) {
      log(output.trim(), 'DEBUG');
    }
    
    log(`${description} completed successfully`, 'SUCCESS');
    return output;
  } catch (error) {
    log(`${description} failed: ${error.message}`, 'ERROR');
    throw error;
  }
}

/**
 * Check prerequisites
 */
function checkPrerequisites() {
  log('Checking prerequisites...');
  
  // Check AWS CLI
  try {
    execSync('aws --version', { stdio: 'pipe' });
  } catch (error) {
    throw new Error('AWS CLI not found. Please install AWS CLI.');
  }
  
  // Check CDK
  try {
    execSync('cdk --version', { stdio: 'pipe' });
  } catch (error) {
    throw new Error('AWS CDK not found. Please install AWS CDK.');
  }
  
  // Check AWS credentials
  try {
    const identity = execSync('aws sts get-caller-identity', { encoding: 'utf8' });
    const identityData = JSON.parse(identity);
    config.account = identityData.Account;
    log(`Using AWS Account: ${config.account}`, 'DEBUG');
  } catch (error) {
    throw new Error('AWS credentials not configured. Please configure AWS credentials.');
  }
  
  // Check if stacks exist
  const stacksToCheck = config.stacksToDeployList.filter(stack => stack !== 'all');
  for (const stackName of stacksToCheck) {
    if (!testingStacks[stackName]) {
      throw new Error(`Unknown stack: ${stackName}. Available stacks: ${Object.keys(testingStacks).join(', ')}`);
    }
    
    const stackFile = testingStacks[stackName].file;
    if (!fs.existsSync(stackFile)) {
      throw new Error(`Stack file not found: ${stackFile}`);
    }
  }
  
  log('Prerequisites check passed', 'SUCCESS');
}

/**
 * Bootstrap CDK if needed
 */
function bootstrapCdk() {
  log('Checking CDK bootstrap status...');
  
  try {
    // Check if bootstrap stack exists
    const stacks = execSync(`aws cloudformation list-stacks --region ${config.region} --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE`, { encoding: 'utf8' });
    const stacksData = JSON.parse(stacks);
    
    const bootstrapStack = stacksData.StackSummaries.find(stack => 
      stack.StackName.startsWith('CDKToolkit')
    );
    
    if (!bootstrapStack) {
      log('CDK not bootstrapped. Bootstrapping...');
      executeCommand(
        `cdk bootstrap aws://${config.account}/${config.region}`,
        'CDK Bootstrap'
      );
    } else {
      log('CDK already bootstrapped', 'DEBUG');
    }
  } catch (error) {
    log('Error checking bootstrap status, attempting bootstrap...', 'WARNING');
    executeCommand(
      `cdk bootstrap aws://${config.account}/${config.region}`,
      'CDK Bootstrap'
    );
  }
}

/**
 * Create CDK app file for testing stacks
 */
function createCdkApp() {
  const appContent = `#!/usr/bin/env node

const { App } = require('aws-cdk-lib');
${Object.entries(testingStacks).map(([key, stack]) => 
  `const { ${stack.name} } = require('../${stack.file}');`
).join('\n')}

const app = new App();

const props = {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || '${config.region}'
  },
  targetUrl: '${config.targetUrl}',
  notificationEmail: '${config.notificationEmail || ''}',
  environment: '${config.environment}'
};

${Object.entries(testingStacks).map(([key, stack]) => 
  `new ${stack.name}(app, 'aws-opportunity-analysis-${key}', props);`
).join('\n')}

app.synth();
`;

  const appPath = 'bin/testing-app.js';
  
  // Ensure bin directory exists
  if (!fs.existsSync('bin')) {
    fs.mkdirSync('bin', { recursive: true });
  }
  
  fs.writeFileSync(appPath, appContent);
  fs.chmodSync(appPath, '755');
  
  log(`Created CDK app: ${appPath}`, 'DEBUG');
  return appPath;
}

/**
 * Deploy testing stacks
 */
function deployTestingStacks() {
  const appPath = createCdkApp();
  
  const stacksToDeploy = config.stacksToDeployList.includes('all') 
    ? Object.keys(testingStacks)
    : config.stacksToDeployList;
  
  log(`Deploying testing stacks: ${stacksToDeploy.join(', ')}`);
  
  for (const stackKey of stacksToDeploy) {
    const stack = testingStacks[stackKey];
    const stackName = `aws-opportunity-analysis-${stackKey}`;
    
    log(`Deploying ${stack.description}...`);
    
    try {
      executeCommand(
        `cdk deploy ${stackName} --app "node ${appPath}" --require-approval never`,
        `Deploy ${stackName}`
      );
    } catch (error) {
      log(`Failed to deploy ${stackName}: ${error.message}`, 'ERROR');
      if (!process.argv.includes('--continue-on-error')) {
        throw error;
      }
    }
  }
}

/**
 * Validate deployed stacks
 */
function validateDeployment() {
  log('Validating deployed testing infrastructure...');
  
  const stacksToDeploy = config.stacksToDeployList.includes('all') 
    ? Object.keys(testingStacks)
    : config.stacksToDeployList;
  
  for (const stackKey of stacksToDeploy) {
    const stackName = `aws-opportunity-analysis-${stackKey}`;
    
    try {
      const stackInfo = execSync(
        `aws cloudformation describe-stacks --stack-name ${stackName} --region ${config.region}`,
        { encoding: 'utf8' }
      );
      
      const stackData = JSON.parse(stackInfo);
      const stack = stackData.Stacks[0];
      
      if (stack.StackStatus.includes('COMPLETE')) {
        log(`${stackName}: ${stack.StackStatus}`, 'SUCCESS');
      } else {
        log(`${stackName}: ${stack.StackStatus}`, 'WARNING');
      }
    } catch (error) {
      log(`${stackName}: Not found or error`, 'ERROR');
    }
  }
}

/**
 * Display deployment summary
 */
function displaySummary() {
  log('Testing Infrastructure Deployment Summary', 'SUCCESS');
  console.log('\n📊 Deployed Components:');
  
  const stacksToDeploy = config.stacksToDeployList.includes('all') 
    ? Object.keys(testingStacks)
    : config.stacksToDeployList;
  
  stacksToDeploy.forEach(stackKey => {
    const stack = testingStacks[stackKey];
    console.log(`  ✅ ${stack.name}: ${stack.description}`);
  });
  
  console.log('\n🎯 Next Steps:');
  console.log('  1. Run comprehensive tests: npm run test:all');
  console.log('  2. Run load tests: npm run test:load');
  console.log('  3. Run security tests: npm run test:security');
  console.log('  4. Check CloudWatch dashboards for monitoring');
  console.log('  5. Review SNS notifications for alerts');
  
  if (config.notificationEmail) {
    console.log(`\n📧 Notifications will be sent to: ${config.notificationEmail}`);
  }
  
  console.log(`\n🌐 Target URL: ${config.targetUrl}`);
  console.log(`📍 Region: ${config.region}`);
  console.log(`🏷️  Environment: ${config.environment}`);
}

/**
 * Main deployment function
 */
async function main() {
  try {
    log('Starting Testing Infrastructure Deployment');
    log(`Environment: ${config.environment}`);
    log(`Region: ${config.region}`);
    log(`Target URL: ${config.targetUrl}`);
    
    if (config.dryRun) {
      log('DRY RUN MODE - No actual deployment will occur', 'WARNING');
    }
    
    // Parse stacks to deploy
    config.stacksToDeployList = config.stacksToDeployList || ['all'];
    
    // Check prerequisites
    checkPrerequisites();
    
    // Bootstrap CDK
    bootstrapCdk();
    
    // Deploy stacks
    deployTestingStacks();
    
    // Validate deployment
    if (!config.dryRun) {
      validateDeployment();
    }
    
    // Display summary
    displaySummary();
    
    log('Testing infrastructure deployment completed successfully!', 'SUCCESS');
    
  } catch (error) {
    log(`Deployment failed: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
AWS Opportunity Analysis - Testing Infrastructure Deployment

Usage: node scripts/deploy-testing-infrastructure.js [options]

Options:
  --dry-run                 Show what would be deployed without actually deploying
  --verbose                 Show detailed output
  --stacks <stack1,stack2>  Deploy specific stacks (comma-separated)
  --continue-on-error       Continue deployment even if some stacks fail
  --help, -h               Show this help message

Available Stacks:
${Object.entries(testingStacks).map(([key, stack]) => 
  `  ${key.padEnd(20)} ${stack.description}`
).join('\n')}

Environment Variables:
  AWS_REGION              AWS region (default: us-east-1)
  AWS_ACCOUNT_ID          AWS account ID (auto-detected)
  ENVIRONMENT             Environment name (default: development)
  TARGET_URL              Target application URL (default: http://localhost:8123)
  NOTIFICATION_EMAIL      Email for alerts and notifications

Examples:
  # Deploy all testing infrastructure
  node scripts/deploy-testing-infrastructure.js

  # Deploy only load testing and synthetic monitoring
  node scripts/deploy-testing-infrastructure.js --stacks load-testing,synthetic-monitoring

  # Dry run to see what would be deployed
  node scripts/deploy-testing-infrastructure.js --dry-run

  # Deploy with verbose output
  node scripts/deploy-testing-infrastructure.js --verbose
`);
  process.exit(0);
}

// Run main function
if (require.main === module) {
  main();
}

module.exports = {
  main,
  config,
  testingStacks
};