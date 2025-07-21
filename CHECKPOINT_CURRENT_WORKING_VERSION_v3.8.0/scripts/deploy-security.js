#!/usr/bin/env node

/**
 * Deploy Security Infrastructure for AWS Opportunity Analysis
 * 
 * This script deploys comprehensive security services including:
 * - AWS WAF for API Gateway protection
 * - AWS Shield for DDoS protection
 * - AWS Config for compliance monitoring
 * - AWS CloudTrail for audit logging
 * - AWS GuardDuty for threat detection
 * - IAM Access Analyzer for least privilege analysis
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const STACK_NAME = 'aws-opportunity-analysis-security';
const REGION = process.env.AWS_REGION || 'us-east-1';
const PROFILE = process.env.AWS_PROFILE || 'default';

console.log('🔒 Starting AWS Opportunity Analysis Security Deployment...');
console.log(`📍 Region: ${REGION}`);
console.log(`👤 Profile: ${PROFILE}`);
console.log(`📦 Stack: ${STACK_NAME}`);

async function deploySecurityStack() {
  try {
    console.log('\n🔍 Checking prerequisites...');
    
    // Check if AWS CLI is configured
    try {
      execSync('aws sts get-caller-identity', { stdio: 'pipe' });
      console.log('✅ AWS CLI configured');
    } catch (error) {
      throw new Error('AWS CLI not configured. Please run "aws configure" first.');
    }

    // Check if CDK is installed
    try {
      execSync('cdk --version', { stdio: 'pipe' });
      console.log('✅ AWS CDK installed');
    } catch (error) {
      throw new Error('AWS CDK not installed. Please run "npm install -g aws-cdk" first.');
    }

    // Bootstrap CDK if needed
    console.log('\n🚀 Bootstrapping CDK...');
    try {
      execSync(`cdk bootstrap aws://$(aws sts get-caller-identity --query Account --output text)/${REGION}`, {
        stdio: 'inherit',
        env: { ...process.env, AWS_PROFILE: PROFILE }
      });
      console.log('✅ CDK bootstrapped');
    } catch (error) {
      console.log('⚠️  CDK bootstrap may have failed, continuing...');
    }

    // Create CDK app file for security stack
    const cdkAppContent = `#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { SecurityStack } = require('./lib/security-stack');

const app = new cdk.App();

new SecurityStack(app, '${STACK_NAME}', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: '${REGION}',
  },
  description: 'AWS Opportunity Analysis Security Infrastructure',
  tags: {
    Project: 'AWS-Opportunity-Analysis',
    Environment: process.env.NODE_ENV || 'production',
    Component: 'Security',
    ManagedBy: 'CDK',
  },
});

app.synth();
`;

    fs.writeFileSync('cdk-security.js', cdkAppContent);

    // Deploy the security stack
    console.log('\n🔒 Deploying security infrastructure...');
    console.log('This may take 10-15 minutes...');
    
    const deployCommand = `cdk deploy ${STACK_NAME} --app "node cdk-security.js" --require-approval never`;
    
    execSync(deployCommand, {
      stdio: 'inherit',
      env: { ...process.env, AWS_PROFILE: PROFILE }
    });

    console.log('\n✅ Security stack deployed successfully!');

    // Get stack outputs
    console.log('\n📋 Retrieving stack outputs...');
    const outputsCommand = `aws cloudformation describe-stacks --stack-name ${STACK_NAME} --query "Stacks[0].Outputs" --region ${REGION}`;
    
    try {
      const outputs = JSON.parse(execSync(outputsCommand, { stdio: 'pipe' }).toString());
      
      console.log('\n🔑 Security Stack Outputs:');
      outputs.forEach(output => {
        console.log(`  ${output.OutputKey}: ${output.OutputValue}`);
        if (output.Description) {
          console.log(`    Description: ${output.Description}`);
        }
      });

      // Save outputs to file for reference
      const outputsFile = path.join(__dirname, '..', 'outputs', 'security-outputs.json');
      const outputsDir = path.dirname(outputsFile);
      
      if (!fs.existsSync(outputsDir)) {
        fs.mkdirSync(outputsDir, { recursive: true });
      }
      
      fs.writeFileSync(outputsFile, JSON.stringify(outputs, null, 2));
      console.log(`\n💾 Outputs saved to: ${outputsFile}`);

    } catch (error) {
      console.log('⚠️  Could not retrieve stack outputs:', error.message);
    }

    // Clean up temporary CDK app file
    if (fs.existsSync('cdk-security.js')) {
      fs.unlinkSync('cdk-security.js');
    }

    console.log('\n🎉 Security deployment completed successfully!');
    
    // Display next steps
    console.log('\n📝 Next Steps:');
    console.log('1. Associate the WAF Web ACL with your API Gateway');
    console.log('2. Configure SNS topic subscriptions for security alerts');
    console.log('3. Review and customize Config rules as needed');
    console.log('4. Set up GuardDuty threat intelligence feeds if required');
    console.log('5. Review IAM Access Analyzer findings');
    console.log('6. Consider enabling Shield Advanced if DDoS protection is critical');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    
    // Clean up temporary files
    if (fs.existsSync('cdk-security.js')) {
      fs.unlinkSync('cdk-security.js');
    }
    
    process.exit(1);
  }
}

async function validateSecurityConfiguration() {
  console.log('\n🔍 Validating security configuration...');
  
  const checks = [
    {
      name: 'WAF Web ACL',
      check: async () => {
        const command = `aws wafv2 list-web-acls --scope REGIONAL --region ${REGION}`;
        const result = JSON.parse(execSync(command, { stdio: 'pipe' }).toString());
        return result.WebACLs.some(acl => acl.Name === 'OpportunityAnalysisWebACL');
      }
    },
    {
      name: 'CloudTrail',
      check: async () => {
        const command = `aws cloudtrail describe-trails --region ${REGION}`;
        const result = JSON.parse(execSync(command, { stdio: 'pipe' }).toString());
        return result.trailList.some(trail => trail.Name === 'OpportunityAnalysisAuditTrail');
      }
    },
    {
      name: 'GuardDuty',
      check: async () => {
        const command = `aws guardduty list-detectors --region ${REGION}`;
        const result = JSON.parse(execSync(command, { stdio: 'pipe' }).toString());
        return result.DetectorIds.length > 0;
      }
    },
    {
      name: 'Config',
      check: async () => {
        const command = `aws configservice describe-configuration-recorders --region ${REGION}`;
        const result = JSON.parse(execSync(command, { stdio: 'pipe' }).toString());
        return result.ConfigurationRecorders.length > 0;
      }
    },
    {
      name: 'Access Analyzer',
      check: async () => {
        const command = `aws accessanalyzer list-analyzers --region ${REGION}`;
        const result = JSON.parse(execSync(command, { stdio: 'pipe' }).toString());
        return result.analyzers.some(analyzer => analyzer.name === 'OpportunityAnalysisAccessAnalyzer');
      }
    }
  ];

  for (const check of checks) {
    try {
      const result = await check.check();
      console.log(`  ${result ? '✅' : '❌'} ${check.name}`);
    } catch (error) {
      console.log(`  ❌ ${check.name} (Error: ${error.message})`);
    }
  }
}

// Main execution
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'deploy':
      deploySecurityStack();
      break;
    case 'validate':
      validateSecurityConfiguration();
      break;
    case 'destroy':
      console.log('🗑️  Destroying security stack...');
      try {
        execSync(`cdk destroy ${STACK_NAME} --app "node cdk-security.js" --force`, {
          stdio: 'inherit',
          env: { ...process.env, AWS_PROFILE: PROFILE }
        });
        console.log('✅ Security stack destroyed');
      } catch (error) {
        console.error('❌ Failed to destroy stack:', error.message);
      }
      break;
    default:
      console.log('Usage: node deploy-security.js [deploy|validate|destroy]');
      console.log('  deploy   - Deploy the security infrastructure');
      console.log('  validate - Validate security configuration');
      console.log('  destroy  - Destroy the security infrastructure');
      process.exit(1);
  }
}

module.exports = {
  deploySecurityStack,
  validateSecurityConfiguration
};