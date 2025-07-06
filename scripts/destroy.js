#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🗑️  AWS Opportunity Analysis Infrastructure Destruction\n');

console.log('⚠️  WARNING: This will destroy all infrastructure resources including:');
console.log('   - API Gateway');
console.log('   - Lambda Functions');
console.log('   - CloudWatch Log Groups and Dashboards');
console.log('   - S3 Bucket and all contents');
console.log('   - CloudFront Distribution');
console.log('   - Systems Manager Parameters');
console.log('   - Secrets Manager Secrets');
console.log('   - IAM Roles and Policies');
console.log('   - X-Ray Tracing Configuration\n');

rl.question('Are you sure you want to proceed? Type "yes" to confirm: ', (answer) => {
  if (answer.toLowerCase() !== 'yes') {
    console.log('❌ Destruction cancelled');
    rl.close();
    return;
  }

  console.log('\n🔥 Starting infrastructure destruction...');

  try {
    // Check if stack exists
    try {
      execSync('aws cloudformation describe-stacks --stack-name AwsOpportunityAnalysisStack', { stdio: 'pipe' });
    } catch (error) {
      console.log('ℹ️  Stack does not exist or is already deleted');
      rl.close();
      return;
    }

    // Destroy the stack
    console.log('🗑️  Destroying CDK stack...');
    execSync('npx cdk destroy --force', { stdio: 'inherit' });
    console.log('✅ Infrastructure destroyed successfully');

    // Clean up local files
    const fs = require('fs');
    const path = require('path');
    
    const filesToClean = [
      'infrastructure-outputs.json',
      'cdk.out'
    ];

    filesToClean.forEach(file => {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        if (fs.lstatSync(filePath).isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
        console.log(`🧹 Cleaned up: ${file}`);
      }
    });

    console.log('\n✅ Destruction completed successfully');
    console.log('💡 You can redeploy anytime using: npm run cdk:deploy');

  } catch (error) {
    console.error('❌ Failed to destroy infrastructure:', error.message);
    process.exit(1);
  }

  rl.close();
});