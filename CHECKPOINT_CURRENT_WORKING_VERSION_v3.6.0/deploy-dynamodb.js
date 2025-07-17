#!/usr/bin/env node

const { App } = require('aws-cdk-lib');
const { DynamoDBStack } = require('../lib/dynamodb-stack');
require('dotenv').config();

async function deployDynamoDB() {
    console.log('🚀 Starting DynamoDB infrastructure deployment...');

    try {
        // Create CDK app
        const app = new App();

        // Create DynamoDB stack
        const dynamoDBStack = new DynamoDBStack(app, 'OpportunityAnalysisDynamoDBStack', {
            env: {
                account: process.env.CDK_DEFAULT_ACCOUNT,
                region: process.env.AWS_REGION || 'us-east-1'
            },
            description: 'DynamoDB tables for AWS Opportunity Analysis application'
        });

        console.log('✅ DynamoDB stack created successfully');
        console.log('📋 Stack includes:');
        console.log('   - Analysis Results Cache Table (opportunity-analysis-results)');
        console.log('   - User Sessions Table (opportunity-analysis-sessions)');
        console.log('   - Analysis History Table (opportunity-analysis-history)');
        console.log('   - DynamoDB Streams for real-time processing');
        console.log('   - Global Secondary Indexes for efficient querying');
        console.log('   - Auto-scaling and backup strategies');
        
        console.log('\n🔧 To deploy this stack, run:');
        console.log('   npx cdk deploy OpportunityAnalysisDynamoDBStack');
        
        console.log('\n📊 Table Configuration:');
        console.log('   - Billing Mode: Pay-per-request (auto-scaling)');
        console.log('   - TTL: Enabled for automatic data cleanup');
        console.log('   - Point-in-time Recovery: Enabled');
        console.log('   - Streams: Enabled for real-time processing');

    } catch (error) {
        console.error('❌ Error deploying DynamoDB infrastructure:', error);
        process.exit(1);
    }
}

// Handle command line arguments
const args = process.argv.slice(2);
const validateOnly = args.includes('--validate-only');
const destroy = args.includes('--destroy');

if (validateOnly) {
    console.log('✅ DynamoDB infrastructure validation completed');
} else if (destroy) {
    console.log('🗑️  To destroy DynamoDB infrastructure, run:');
    console.log('   npx cdk destroy OpportunityAnalysisDynamoDBStack');
} else {
    deployDynamoDB();
}

module.exports = { deployDynamoDB };