#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting AWS Opportunity Analysis Infrastructure Deployment...\n');

// Check if AWS CLI is configured
try {
  execSync('aws sts get-caller-identity', { stdio: 'pipe' });
  console.log('✅ AWS CLI is configured');
} catch (error) {
  console.error('❌ AWS CLI is not configured or credentials are invalid');
  console.error('Please run: aws configure');
  process.exit(1);
}

// Check if CDK is bootstrapped
try {
  console.log('🔍 Checking CDK bootstrap status...');
  const region = process.env.AWS_REGION || 'us-east-1';
  const account = execSync('aws sts get-caller-identity --query Account --output text', { encoding: 'utf8' }).trim();
  
  try {
    execSync(`aws cloudformation describe-stacks --stack-name CDKToolkit --region ${region}`, { stdio: 'pipe' });
    console.log('✅ CDK is already bootstrapped');
  } catch (bootstrapError) {
    console.log('🔧 Bootstrapping CDK...');
    execSync(`npx cdk bootstrap aws://${account}/${region}`, { stdio: 'inherit' });
    console.log('✅ CDK bootstrap completed');
  }
} catch (error) {
  console.error('❌ Failed to check/bootstrap CDK:', error.message);
  process.exit(1);
}

// Install dependencies
console.log('📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Synthesize CDK stack
console.log('🔨 Synthesizing CDK stack...');
try {
  execSync('npx cdk synth', { stdio: 'inherit' });
  console.log('✅ CDK stack synthesized');
} catch (error) {
  console.error('❌ Failed to synthesize CDK stack:', error.message);
  process.exit(1);
}

// Deploy CDK stack
console.log('🚀 Deploying CDK stack...');
try {
  execSync('npx cdk deploy --require-approval never', { stdio: 'inherit' });
  console.log('✅ CDK stack deployed successfully');
} catch (error) {
  console.error('❌ Failed to deploy CDK stack:', error.message);
  process.exit(1);
}

// Get stack outputs
console.log('📋 Retrieving stack outputs...');
try {
  const outputs = execSync('aws cloudformation describe-stacks --stack-name AwsOpportunityAnalysisStack --query "Stacks[0].Outputs" --output json', { encoding: 'utf8' });
  const parsedOutputs = JSON.parse(outputs);
  
  console.log('\n🎉 Deployment completed successfully!');
  console.log('\n📊 Stack Outputs:');
  parsedOutputs.forEach(output => {
    console.log(`  ${output.OutputKey}: ${output.OutputValue}`);
    if (output.Description) {
      console.log(`    Description: ${output.Description}`);
    }
  });

  // Save outputs to file for easy access
  const outputsFile = path.join(__dirname, '..', 'infrastructure-outputs.json');
  const outputsData = {};
  parsedOutputs.forEach(output => {
    outputsData[output.OutputKey] = {
      value: output.OutputValue,
      description: output.Description
    };
  });
  
  fs.writeFileSync(outputsFile, JSON.stringify(outputsData, null, 2));
  console.log(`\n💾 Outputs saved to: ${outputsFile}`);

} catch (error) {
  console.error('❌ Failed to retrieve stack outputs:', error.message);
}

console.log('\n🎯 Next Steps:');
console.log('1. Update your .env file with the new infrastructure values');
console.log('2. Deploy your application code to the Lambda function');
console.log('3. Upload your frontend files to the S3 bucket');
console.log('4. Test your application using the API Gateway URL');
console.log('\n✨ Happy coding!');