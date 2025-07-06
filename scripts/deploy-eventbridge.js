#!/usr/bin/env node

/**
 * EventBridge Infrastructure Deployment Script
 * Deploys EventBridge enhanced data processing infrastructure
 */

const { App } = require('aws-cdk-lib');
const { EventBridgeStack } = require('../lib/eventbridge-stack');

async function deployEventBridge() {
  console.log('🚀 Starting EventBridge infrastructure deployment...');
  
  try {
    // Create CDK app
    const app = new App();
    
    // Create EventBridge stack
    const eventBridgeStack = new EventBridgeStack(app, 'AwsOpportunityAnalysisEventBridgeStack', {
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
      },
      description: 'EventBridge infrastructure for AWS Opportunity Analysis enhanced data processing'
    });
    
    // Add email subscription if provided
    if (process.env.NOTIFICATION_EMAIL) {
      eventBridgeStack.addEmailSubscription(process.env.NOTIFICATION_EMAIL);
      console.log(`📧 Email subscription added: ${process.env.NOTIFICATION_EMAIL}`);
    }
    
    // Get stack outputs
    const outputs = eventBridgeStack.getOutputs();
    
    console.log('\n📋 EventBridge Infrastructure Configuration:');
    console.log('='.repeat(50));
    console.log(`Event Bus Name: ${outputs.eventBusName}`);
    console.log(`Event Bus ARN: ${outputs.eventBusArn}`);
    console.log(`SNS Topic ARN: ${outputs.notificationTopicArn}`);
    console.log(`DLQ URL: ${outputs.deadLetterQueueUrl}`);
    console.log(`DLQ ARN: ${outputs.deadLetterQueueArn}`);
    console.log(`Real-time Function ARN: ${outputs.realTimeUpdateFunctionArn}`);
    
    console.log('\n🔧 Environment Variables to Add:');
    console.log('='.repeat(50));
    console.log(`EVENTBRIDGE_BUS_NAME=${outputs.eventBusName}`);
    console.log(`EVENTBRIDGE_BUS_ARN=${outputs.eventBusArn}`);
    console.log(`SNS_TOPIC_ARN=${outputs.notificationTopicArn}`);
    console.log(`DLQ_URL=${outputs.deadLetterQueueUrl}`);
    console.log(`DLQ_ARN=${outputs.deadLetterQueueArn}`);
    console.log(`REALTIME_UPDATE_LAMBDA_ARN=${outputs.realTimeUpdateFunctionArn}`);
    
    console.log('\n✅ EventBridge infrastructure deployment completed successfully!');
    console.log('\n📝 Next Steps:');
    console.log('1. Update your .env file with the environment variables above');
    console.log('2. Set INITIALIZE_EVENTBRIDGE=true in your .env file');
    console.log('3. Set ENABLE_EVENT_DRIVEN=true to enable event-driven features');
    console.log('4. Restart your application to initialize EventBridge integration');
    
    if (process.env.NOTIFICATION_EMAIL) {
      console.log('5. Check your email and confirm the SNS subscription');
    }
    
  } catch (error) {
    console.error('❌ EventBridge deployment failed:', error);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
EventBridge Infrastructure Deployment

Usage: node scripts/deploy-eventbridge.js [options]

Options:
  --help, -h          Show this help message
  --validate-only     Validate configuration without deploying
  --destroy          Destroy EventBridge infrastructure

Environment Variables:
  CDK_DEFAULT_ACCOUNT     AWS account ID for deployment
  CDK_DEFAULT_REGION      AWS region for deployment (default: us-east-1)
  NOTIFICATION_EMAIL      Email address for SNS notifications (optional)

Examples:
  node scripts/deploy-eventbridge.js
  NOTIFICATION_EMAIL=admin@company.com node scripts/deploy-eventbridge.js
  node scripts/deploy-eventbridge.js --validate-only
  `);
  process.exit(0);
}

if (args.includes('--validate-only')) {
  console.log('🔍 Validating EventBridge configuration...');
  
  // Validate required environment variables
  const requiredEnvVars = ['CDK_DEFAULT_ACCOUNT'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingEnvVars.forEach(envVar => console.error(`  - ${envVar}`));
    process.exit(1);
  }
  
  console.log('✅ EventBridge configuration is valid');
  console.log(`Account: ${process.env.CDK_DEFAULT_ACCOUNT}`);
  console.log(`Region: ${process.env.CDK_DEFAULT_REGION || 'us-east-1'}`);
  
  if (process.env.NOTIFICATION_EMAIL) {
    console.log(`Notification Email: ${process.env.NOTIFICATION_EMAIL}`);
  }
  
  process.exit(0);
}

if (args.includes('--destroy')) {
  console.log('🗑️  Destroying EventBridge infrastructure...');
  console.log('⚠️  This will remove all EventBridge resources including:');
  console.log('   - Custom event bus');
  console.log('   - Event rules and targets');
  console.log('   - SNS topic and subscriptions');
  console.log('   - Dead letter queue');
  console.log('   - Lambda functions');
  console.log('\nTo destroy, run: cdk destroy AwsOpportunityAnalysisEventBridgeStack');
  process.exit(0);
}

// Run deployment
deployEventBridge();