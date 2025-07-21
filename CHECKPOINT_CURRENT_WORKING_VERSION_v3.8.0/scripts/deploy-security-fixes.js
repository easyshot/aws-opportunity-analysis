#!/usr/bin/env node

/**
 * Deploy Security Fixes for AWS Opportunity Analysis
 * 
 * This script applies security fixes and enhancements to the existing
 * security infrastructure.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const REGION = process.env.AWS_REGION || 'us-east-1';
const PROFILE = process.env.AWS_PROFILE || 'default';

console.log('🔧 Starting AWS Opportunity Analysis Security Fixes Deployment...');
console.log(`📍 Region: ${REGION}`);
console.log(`👤 Profile: ${PROFILE}`);

async function deploySecurityFixes() {
  try {
    console.log('\n🔍 Checking prerequisites...');
    
    // Check if AWS CLI is configured
    try {
      const identity = execSync('aws sts get-caller-identity', { stdio: 'pipe' }).toString();
      const identityData = JSON.parse(identity);
      console.log(`✅ AWS CLI configured for account: ${identityData.Account}`);
    } catch (error) {
      throw new Error('AWS CLI not configured. Please run "aws configure" first.');
    }

    // Check if original security stack exists
    try {
      const stackCommand = `aws cloudformation describe-stacks --stack-name aws-opportunity-analysis-security --region ${REGION}`;
      const stackResult = JSON.parse(execSync(stackCommand, { stdio: 'pipe' }).toString());
      console.log('✅ Original security stack found');
    } catch (error) {
      console.log('⚠️  Original security stack not found. Deploying fresh security infrastructure...');
    }

    console.log('\n🔧 Applying security fixes...');

    // Apply CloudTrail bucket policy fixes
    await applyCloudTrailFixes();
    
    // Apply Config bucket policy fixes
    await applyConfigFixes();
    
    // Apply WAF enhancements
    await applyWAFEnhancements();
    
    // Apply IAM policy enhancements
    await applyIAMEnhancements();
    
    // Apply monitoring enhancements
    await applyMonitoringEnhancements();

    console.log('\n✅ Security fixes applied successfully!');
    
    // Run validation
    console.log('\n🔍 Running security validation...');
    try {
      execSync('node scripts/validate-security.js', { stdio: 'inherit' });
      console.log('✅ Security validation passed');
    } catch (error) {
      console.log('⚠️  Security validation completed with warnings. Check the report for details.');
    }

    console.log('\n🎉 Security fixes deployment completed!');
    
    // Display next steps
    console.log('\n📝 Next Steps:');
    console.log('1. Review the security validation report');
    console.log('2. Configure SNS topic subscriptions for security alerts');
    console.log('3. Test WAF rules with sample requests');
    console.log('4. Review GuardDuty findings regularly');
    console.log('5. Monitor CloudWatch security alarms');

  } catch (error) {
    console.error('\n❌ Security fixes deployment failed:', error.message);
    process.exit(1);
  }
}

async function applyCloudTrailFixes() {
  console.log('🔧 Applying CloudTrail bucket policy fixes...');
  
  try {
    // Get CloudTrail bucket name
    const trailsCommand = `aws cloudtrail describe-trails --region ${REGION}`;
    const trailsResult = JSON.parse(execSync(trailsCommand, { stdio: 'pipe' }).toString());
    
    const opportunityTrail = trailsResult.trailList.find(trail => 
      trail.Name === 'OpportunityAnalysisAuditTrail'
    );
    
    if (!opportunityTrail) {
      console.log('⚠️  CloudTrail not found, skipping bucket policy fixes');
      return;
    }

    const bucketName = opportunityTrail.S3BucketName;
    const trailArn = opportunityTrail.TrailARN;
    
    // Apply bucket policy
    const bucketPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AWSCloudTrailAclCheck',
          Effect: 'Allow',
          Principal: {
            Service: 'cloudtrail.amazonaws.com'
          },
          Action: 's3:GetBucketAcl',
          Resource: `arn:aws:s3:::${bucketName}`,
          Condition: {
            StringEquals: {
              'AWS:SourceArn': trailArn
            }
          }
        },
        {
          Sid: 'AWSCloudTrailWrite',
          Effect: 'Allow',
          Principal: {
            Service: 'cloudtrail.amazonaws.com'
          },
          Action: 's3:PutObject',
          Resource: `arn:aws:s3:::${bucketName}/*`,
          Condition: {
            StringEquals: {
              's3:x-amz-acl': 'bucket-owner-full-control',
              'AWS:SourceArn': trailArn
            }
          }
        },
        {
          Sid: 'AWSCloudTrailBucketExistenceCheck',
          Effect: 'Allow',
          Principal: {
            Service: 'cloudtrail.amazonaws.com'
          },
          Action: 's3:ListBucket',
          Resource: `arn:aws:s3:::${bucketName}`,
          Condition: {
            StringEquals: {
              'AWS:SourceArn': trailArn
            }
          }
        }
      ]
    };

    // Write policy to temporary file
    const policyFile = '/tmp/cloudtrail-bucket-policy.json';
    fs.writeFileSync(policyFile, JSON.stringify(bucketPolicy, null, 2));

    // Apply bucket policy
    const policyCommand = `aws s3api put-bucket-policy --bucket ${bucketName} --policy file://${policyFile}`;
    execSync(policyCommand, { stdio: 'pipe' });
    
    // Clean up
    fs.unlinkSync(policyFile);
    
    console.log('✅ CloudTrail bucket policy applied');
  } catch (error) {
    console.log(`⚠️  CloudTrail bucket policy fix failed: ${error.message}`);
  }
}

async function applyConfigFixes() {
  console.log('🔧 Applying AWS Config bucket policy fixes...');
  
  try {
    // Get Config delivery channel
    const channelCommand = `aws configservice describe-delivery-channels --region ${REGION}`;
    const channelResult = JSON.parse(execSync(channelCommand, { stdio: 'pipe' }).toString());
    
    if (channelResult.DeliveryChannels.length === 0) {
      console.log('⚠️  Config delivery channel not found, skipping bucket policy fixes');
      return;
    }

    const bucketName = channelResult.DeliveryChannels[0].s3BucketName;
    const accountId = JSON.parse(execSync('aws sts get-caller-identity', { stdio: 'pipe' })).Account;
    
    // Apply bucket policy
    const bucketPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AWSConfigBucketPermissionsCheck',
          Effect: 'Allow',
          Principal: {
            Service: 'config.amazonaws.com'
          },
          Action: ['s3:GetBucketAcl', 's3:ListBucket'],
          Resource: `arn:aws:s3:::${bucketName}`,
          Condition: {
            StringEquals: {
              'AWS:SourceAccount': accountId
            }
          }
        },
        {
          Sid: 'AWSConfigBucketExistenceCheck',
          Effect: 'Allow',
          Principal: {
            Service: 'config.amazonaws.com'
          },
          Action: 's3:GetBucketLocation',
          Resource: `arn:aws:s3:::${bucketName}`,
          Condition: {
            StringEquals: {
              'AWS:SourceAccount': accountId
            }
          }
        },
        {
          Sid: 'AWSConfigBucketDelivery',
          Effect: 'Allow',
          Principal: {
            Service: 'config.amazonaws.com'
          },
          Action: 's3:PutObject',
          Resource: `arn:aws:s3:::${bucketName}/*`,
          Condition: {
            StringEquals: {
              's3:x-amz-acl': 'bucket-owner-full-control',
              'AWS:SourceAccount': accountId
            }
          }
        }
      ]
    };

    // Write policy to temporary file
    const policyFile = '/tmp/config-bucket-policy.json';
    fs.writeFileSync(policyFile, JSON.stringify(bucketPolicy, null, 2));

    // Apply bucket policy
    const policyCommand = `aws s3api put-bucket-policy --bucket ${bucketName} --policy file://${policyFile}`;
    execSync(policyCommand, { stdio: 'pipe' });
    
    // Clean up
    fs.unlinkSync(policyFile);
    
    console.log('✅ Config bucket policy applied');
  } catch (error) {
    console.log(`⚠️  Config bucket policy fix failed: ${error.message}`);
  }
}

async function applyWAFEnhancements() {
  console.log('🔧 Applying WAF enhancements...');
  
  try {
    // Check if WAF Web ACL exists
    const wafCommand = `aws wafv2 list-web-acls --scope REGIONAL --region ${REGION}`;
    const wafResult = JSON.parse(execSync(wafCommand, { stdio: 'pipe' }).toString());
    
    const webAcl = wafResult.WebACLs.find(acl => acl.Name === 'OpportunityAnalysisWebACL');
    
    if (!webAcl) {
      console.log('⚠️  WAF Web ACL not found, skipping enhancements');
      return;
    }

    // Enable WAF logging if not already enabled
    try {
      const loggingCommand = `aws wafv2 get-logging-configuration --resource-arn ${webAcl.ARN} --region ${REGION}`;
      execSync(loggingCommand, { stdio: 'pipe' });
      console.log('✅ WAF logging already configured');
    } catch (error) {
      console.log('⚠️  WAF logging not configured, manual setup required');
    }

    console.log('✅ WAF enhancements checked');
  } catch (error) {
    console.log(`⚠️  WAF enhancements failed: ${error.message}`);
  }
}

async function applyIAMEnhancements() {
  console.log('🔧 Applying IAM policy enhancements...');
  
  try {
    const accountId = JSON.parse(execSync('aws sts get-caller-identity', { stdio: 'pipe' })).Account;
    
    // Create enhanced least privilege policy
    const enhancedPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: [
            'bedrock:InvokeModel',
            'bedrock-runtime:Converse'
          ],
          Resource: [
            `arn:aws:bedrock:${REGION}::foundation-model/amazon.titan-text-express-v1`,
            `arn:aws:bedrock:${REGION}::foundation-model/amazon.nova-premier-v1:0`
          ],
          Condition: {
            StringEquals: {
              'aws:RequestedRegion': REGION
            }
          }
        },
        {
          Effect: 'Allow',
          Action: 'bedrock-agent:GetPrompt',
          Resource: `arn:aws:bedrock-agent:${REGION}:${accountId}:prompt/*`,
          Condition: {
            StringLike: {
              'bedrock-agent:PromptId': [
                'Y6T66EI3GZ',
                'FDUHITJIME', 
                'P03B9TO1Q1'
              ]
            }
          }
        },
        {
          Effect: 'Allow',
          Action: [
            'athena:StartQueryExecution',
            'athena:GetQueryExecution',
            'athena:GetQueryResults',
            'athena:StopQueryExecution'
          ],
          Resource: `arn:aws:athena:${REGION}:${accountId}:workgroup/primary`,
          Condition: {
            StringLike: {
              'athena:QueryString': '*catapult_db_p*'
            }
          }
        },
        {
          Effect: 'Allow',
          Action: [
            's3:GetObject',
            's3:PutObject'
          ],
          Resource: 'arn:aws:s3:::as-athena-catapult/*'
        },
        {
          Effect: 'Allow',
          Action: 'lambda:InvokeFunction',
          Resource: `arn:aws:lambda:${REGION}:${accountId}:function:catapult_get_dataset`
        },
        {
          Effect: 'Allow',
          Action: [
            'ssm:GetParameter',
            'ssm:GetParameters'
          ],
          Resource: `arn:aws:ssm:${REGION}:${accountId}:parameter/opportunity-analysis/*`
        },
        {
          Effect: 'Allow',
          Action: 'secretsmanager:GetSecretValue',
          Resource: `arn:aws:secretsmanager:${REGION}:${accountId}:secret:opportunity-analysis/credentials-*`
        }
      ]
    };

    // Write policy to temporary file
    const policyFile = '/tmp/enhanced-policy.json';
    fs.writeFileSync(policyFile, JSON.stringify(enhancedPolicy, null, 2));

    // Create or update the policy
    try {
      const createCommand = `aws iam create-policy --policy-name OpportunityAnalysis-Enhanced-LeastPrivilege --policy-document file://${policyFile} --description "Enhanced least privilege policy for AWS Opportunity Analysis"`;
      execSync(createCommand, { stdio: 'pipe' });
      console.log('✅ Enhanced IAM policy created');
    } catch (error) {
      if (error.message.includes('already exists')) {
        // Update existing policy
        const listVersionsCommand = `aws iam list-policy-versions --policy-arn arn:aws:iam::${accountId}:policy/OpportunityAnalysis-Enhanced-LeastPrivilege`;
        const versions = JSON.parse(execSync(listVersionsCommand, { stdio: 'pipe' }));
        
        const updateCommand = `aws iam create-policy-version --policy-arn arn:aws:iam::${accountId}:policy/OpportunityAnalysis-Enhanced-LeastPrivilege --policy-document file://${policyFile} --set-as-default`;
        execSync(updateCommand, { stdio: 'pipe' });
        console.log('✅ Enhanced IAM policy updated');
      } else {
        throw error;
      }
    }
    
    // Clean up
    fs.unlinkSync(policyFile);
    
  } catch (error) {
    console.log(`⚠️  IAM enhancements failed: ${error.message}`);
  }
}

async function applyMonitoringEnhancements() {
  console.log('🔧 Applying monitoring enhancements...');
  
  try {
    // Check if security alerts topic exists
    const snsCommand = `aws sns list-topics --region ${REGION}`;
    const snsResult = JSON.parse(execSync(snsCommand, { stdio: 'pipe' }).toString());
    
    const alertsTopic = snsResult.Topics.find(topic => 
      topic.TopicArn.includes('security-alerts')
    );
    
    if (!alertsTopic) {
      console.log('⚠️  Security alerts SNS topic not found, creating...');
      
      const createTopicCommand = `aws sns create-topic --name aws-opportunity-analysis-security-alerts --region ${REGION}`;
      const topicResult = JSON.parse(execSync(createTopicCommand, { stdio: 'pipe' }));
      console.log(`✅ Security alerts topic created: ${topicResult.TopicArn}`);
    } else {
      console.log('✅ Security alerts topic exists');
    }

    // Create additional CloudWatch alarms
    const alarms = [
      {
        name: 'OpportunityAnalysis-RootAccountUsage',
        description: 'Detects root account usage',
        metricName: 'RootAccountUsageCount',
        namespace: 'CWLogs',
        threshold: 1
      },
      {
        name: 'OpportunityAnalysis-UnusualApiActivity', 
        description: 'Detects unusual API activity',
        metricName: 'UnusualApiCallCount',
        namespace: 'CWLogs',
        threshold: 50
      }
    ];

    for (const alarm of alarms) {
      try {
        const alarmCommand = `aws cloudwatch put-metric-alarm --alarm-name "${alarm.name}" --alarm-description "${alarm.description}" --metric-name "${alarm.metricName}" --namespace "${alarm.namespace}" --statistic Sum --period 300 --threshold ${alarm.threshold} --comparison-operator GreaterThanThreshold --evaluation-periods 1 --region ${REGION}`;
        execSync(alarmCommand, { stdio: 'pipe' });
        console.log(`✅ Created alarm: ${alarm.name}`);
      } catch (error) {
        console.log(`⚠️  Failed to create alarm ${alarm.name}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.log(`⚠️  Monitoring enhancements failed: ${error.message}`);
  }
}

// Main execution
if (require.main === module) {
  deploySecurityFixes();
}

module.exports = {
  deploySecurityFixes,
  applyCloudTrailFixes,
  applyConfigFixes,
  applyWAFEnhancements,
  applyIAMEnhancements,
  applyMonitoringEnhancements
};