#!/usr/bin/env node

/**
 * Deployment script for Error Handling Infrastructure
 * Deploys SQS DLQs, Lambda functions, Step Functions, and monitoring
 */

const { App } = require('aws-cdk-lib');
const { ErrorHandlingStack } = require('../lib/error-handling-stack');

async function deployErrorHandling() {
  console.log('🚀 Starting Error Handling Infrastructure deployment...');
  
  try {
    const app = new App();
    
    // Create the error handling stack
    const errorHandlingStack = new ErrorHandlingStack(app, 'OpportunityAnalysisErrorHandling', {
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.AWS_REGION || 'us-east-1'
      },
      alertEmail: process.env.ALERT_EMAIL, // Optional email for notifications
      description: 'Advanced error handling infrastructure for AWS Opportunity Analysis application'
    });
    
    console.log('✅ Error Handling Stack created successfully');
    console.log('📋 Stack includes:');
    console.log('   - Dead Letter Queue for failed operations');
    console.log('   - Error Recovery Queue with DLQ');
    console.log('   - Error Recovery Lambda function');
    console.log('   - Step Functions state machine for recovery workflows');
    console.log('   - SSM document for incident response');
    console.log('   - CloudWatch alarms for error monitoring');
    console.log('   - SNS topic for alerts');
    
    // Output configuration for environment variables
    console.log('\n📝 Add these environment variables to your .env file:');
    console.log(`ERROR_DLQ_URL=${errorHandlingStack.deadLetterQueueUrl}`);
    console.log(`ERROR_RECOVERY_QUEUE_URL=${errorHandlingStack.errorRecoveryQueueUrl}`);
    console.log(`ERROR_RECOVERY_LAMBDA=${errorHandlingStack.errorRecoveryLambdaArn}`);
    console.log(`ERROR_RECOVERY_STATE_MACHINE=${errorHandlingStack.errorRecoveryStateMachineArn}`);
    console.log(`INCIDENT_RESPONSE_DOCUMENT=${errorHandlingStack.incidentResponseDocumentName}`);
    console.log(`ALERT_TOPIC_ARN=${errorHandlingStack.alertTopicArn}`);
    
    console.log('\n🎯 To deploy this stack, run:');
    console.log('   npx cdk deploy OpportunityAnalysisErrorHandling');
    
    console.log('\n⚠️  Note: Make sure you have:');
    console.log('   - AWS CDK installed (npm install -g aws-cdk)');
    console.log('   - AWS credentials configured');
    console.log('   - Proper IAM permissions for creating resources');
    
  } catch (error) {
    console.error('❌ Error during deployment setup:', error);
    process.exit(1);
  }
}

// Run deployment if this script is executed directly
if (require.main === module) {
  deployErrorHandling();
}

module.exports = { deployErrorHandling };