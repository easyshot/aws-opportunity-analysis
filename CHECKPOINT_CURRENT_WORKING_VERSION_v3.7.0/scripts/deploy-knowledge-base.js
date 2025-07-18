#!/usr/bin/env node

const { App } = require('aws-cdk-lib');
const { BedrockKnowledgeBaseStack } = require('../lib/bedrock-knowledge-base-stack');
const { KnowledgeBaseIngestion } = require('../lib/knowledge-base-ingestion');
require('dotenv').config();

/**
 * Deploy Bedrock Knowledge Base Infrastructure
 * Creates OpenSearch Serverless collection and Bedrock Knowledge Base
 */
async function deployKnowledgeBase() {
  try {
    console.log('🚀 Starting Bedrock Knowledge Base deployment...\n');
    
    // Validate environment variables
    const requiredEnvVars = ['AWS_REGION', 'CDK_DEFAULT_ACCOUNT'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:');
      missingVars.forEach(varName => console.error(`   - ${varName}`));
      console.error('\nPlease set these variables in your .env file or environment.');
      process.exit(1);
    }
    
    // Create CDK App
    const app = new App();
    
    // Deploy Knowledge Base Stack
    console.log('📦 Creating Knowledge Base stack...');
    const kbStack = new BedrockKnowledgeBaseStack(app, 'BedrockKnowledgeBaseStack', {
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.AWS_REGION
      },
      description: 'Bedrock Knowledge Base with OpenSearch Serverless for AWS Opportunity Analysis'
    });
    
    console.log('✅ Knowledge Base stack created successfully');
    console.log(`   - Stack Name: BedrockKnowledgeBaseStack`);
    console.log(`   - Region: ${process.env.AWS_REGION}`);
    console.log(`   - Account: ${process.env.CDK_DEFAULT_ACCOUNT}`);
    
    // Output important resource information
    console.log('\n📋 Resource Information:');
    console.log(`   - Knowledge Base Bucket: aws-opportunity-kb-${process.env.CDK_DEFAULT_ACCOUNT}-${process.env.AWS_REGION}`);
    console.log(`   - OpenSearch Collection: aws-opportunity-vectors`);
    console.log(`   - Vector Index: opportunity-analysis-index`);
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Deploy the stack using: cdk deploy BedrockKnowledgeBaseStack');
    console.log('2. Update your .env file with the Knowledge Base ID and Data Source ID');
    console.log('3. Run the data ingestion script to populate the knowledge base');
    console.log('4. Test the RAG functionality with sample queries');
    
    console.log('\n💡 Environment Variables to Add:');
    console.log('   KNOWLEDGE_BASE_ID=<knowledge-base-id-from-deployment>');
    console.log('   KNOWLEDGE_BASE_DATA_SOURCE_ID=<data-source-id-from-deployment>');
    console.log(`   KNOWLEDGE_BASE_BUCKET=aws-opportunity-kb-${process.env.CDK_DEFAULT_ACCOUNT}-${process.env.AWS_REGION}`);
    
  } catch (error) {
    console.error('❌ Error deploying Knowledge Base:', error);
    process.exit(1);
  }
}

/**
 * Test knowledge base ingestion with sample data
 */
async function testIngestion() {
  try {
    console.log('🧪 Testing Knowledge Base ingestion...\n');
    
    // Sample historical project data
    const sampleProjects = [
      {
        opportunity_name: 'Enterprise Cloud Migration',
        customer_name: 'TechCorp Inc',
        region: 'us-east-1',
        industry: 'Technology',
        customer_segment: 'Enterprise',
        description: 'Large-scale migration of on-premises infrastructure to AWS cloud',
        business_description: 'Digital transformation initiative to modernize legacy systems',
        close_date: '2023-06-15',
        total_arr: '500000',
        total_mrr: '41667',
        top_services: 'EC2, S3, RDS, Lambda, CloudFormation',
        migration_phase: 'Phase 2',
        activity_focus: 'Infrastructure Migration'
      },
      {
        opportunity_name: 'Data Analytics Platform',
        customer_name: 'DataCorp LLC',
        region: 'us-west-2',
        industry: 'Financial Services',
        customer_segment: 'Mid-Market',
        description: 'Build modern data analytics platform using AWS services',
        business_description: 'Real-time analytics and machine learning capabilities',
        close_date: '2023-09-30',
        total_arr: '750000',
        total_mrr: '62500',
        top_services: 'Redshift, Glue, SageMaker, QuickSight, Athena',
        migration_phase: 'Phase 1',
        activity_focus: 'Data & Analytics'
      }
    ];
    
    // Initialize ingestion service
    const ingestion = new KnowledgeBaseIngestion({
      region: process.env.AWS_REGION,
      bucketName: process.env.KNOWLEDGE_BASE_BUCKET,
      knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID,
      dataSourceId: process.env.KNOWLEDGE_BASE_DATA_SOURCE_ID
    });
    
    // Test data upload
    console.log('📤 Uploading sample data...');
    const uploadResult = await ingestion.uploadHistoricalProjects(
      sampleProjects, 
      'sample-projects.json'
    );
    
    console.log('✅ Sample data uploaded successfully');
    console.log(`   - Location: ${uploadResult.location}`);
    console.log(`   - Project Count: ${uploadResult.projectCount}`);
    
    // Test ingestion job
    if (process.env.KNOWLEDGE_BASE_ID && process.env.KNOWLEDGE_BASE_DATA_SOURCE_ID) {
      console.log('\n🔄 Starting ingestion job...');
      const jobResult = await ingestion.startIngestionJob();
      
      console.log('✅ Ingestion job started');
      console.log(`   - Job ID: ${jobResult.jobId}`);
      console.log(`   - Status: ${jobResult.status}`);
      
      console.log('\n⏳ Waiting for ingestion to complete...');
      const finalStatus = await ingestion.waitForIngestionCompletion(jobResult.jobId);
      
      console.log('✅ Ingestion completed');
      console.log(`   - Final Status: ${finalStatus.status}`);
      console.log(`   - Statistics: ${JSON.stringify(finalStatus.statistics, null, 2)}`);
    } else {
      console.log('\n⚠️  Knowledge Base ID or Data Source ID not configured');
      console.log('   Please deploy the infrastructure first and update your .env file');
    }
    
  } catch (error) {
    console.error('❌ Error testing ingestion:', error);
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'deploy':
    deployKnowledgeBase();
    break;
  case 'test-ingestion':
    testIngestion();
    break;
  case 'help':
  default:
    console.log('Bedrock Knowledge Base Deployment Script\n');
    console.log('Usage:');
    console.log('  node scripts/deploy-knowledge-base.js deploy          - Create CDK stack definition');
    console.log('  node scripts/deploy-knowledge-base.js test-ingestion  - Test data ingestion');
    console.log('  node scripts/deploy-knowledge-base.js help            - Show this help');
    console.log('\nNote: Run "cdk deploy BedrockKnowledgeBaseStack" after creating the stack definition');
    break;
}

module.exports = {
  deployKnowledgeBase,
  testIngestion
};