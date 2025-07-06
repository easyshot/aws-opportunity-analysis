#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { AwsOpportunityAnalysisStack } = require('../lib/aws-opportunity-analysis-stack');
const { CloudFrontStack } = require('../lib/cloudfront-stack');

const app = new cdk.App();

// Deploy main application stack
const mainStack = new AwsOpportunityAnalysisStack(app, 'AwsOpportunityAnalysisStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
});

// Deploy CloudFront stack for frontend delivery
const cloudFrontStack = new CloudFrontStack(app, 'AwsOpportunityAnalysisCloudFrontStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  // Optional custom domain configuration
  domainName: process.env.CUSTOM_DOMAIN_NAME,
  hostedZoneId: process.env.HOSTED_ZONE_ID,
});

// Add dependency to ensure main stack deploys first
cloudFrontStack.addDependency(mainStack);// 
Import and deploy CI/CD pipeline stack
const { CicdPipelineStack } = require('../lib/cicd-pipeline-stack');

// Deploy CI/CD pipeline stack (separate from application stacks)
const cicdStack = new CicdPipelineStack(app, 'AwsOpportunityAnalysisCicdPipelineStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
});