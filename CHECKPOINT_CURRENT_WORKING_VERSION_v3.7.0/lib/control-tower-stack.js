const { Stack, CfnOutput, Duration } = require('aws-cdk-lib');
const { Role, PolicyDocument, PolicyStatement, Effect, ServicePrincipal, ManagedPolicy } = require('aws-cdk-lib/aws-iam');
const { StringParameter } = require('aws-cdk-lib/aws-ssm');
const { Topic } = require('aws-cdk-lib/aws-sns');
const { EmailSubscription } = require('aws-cdk-lib/aws-sns-subscriptions');
const { Rule, Schedule } = require('aws-cdk-lib/aws-events');
const { LambdaFunction } = require('aws-cdk-lib/aws-events-targets');
const { Function, Runtime, Code } = require('aws-cdk-lib/aws-lambda');
const { LogGroup, RetentionDays } = require('aws-cdk-lib/aws-logs');

class ControlTowerStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create SNS topic for governance notifications
    const governanceTopic = new Topic(this, 'GovernanceTopic', {
      topicName: 'opportunity-analysis-governance',
      displayName: 'Opportunity Analysis Governance Notifications',
    });

    // Add email subscription for governance notifications
    if (props.governanceEmail) {
      governanceTopic.addSubscription(new EmailSubscription(props.governanceEmail));
    }

    // Create Control Tower service role
    const controlTowerServiceRole = new Role(this, 'ControlTowerServiceRole', {
      roleName: 'OpportunityAnalysisControlTowerServiceRole',
      assumedBy: new ServicePrincipal('controltower.amazonaws.com'),
      description: 'Service role for AWS Control Tower',
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSControlTowerServiceRolePolicy'),
      ],
    });

    // Create compliance monitoring Lambda function
    const complianceMonitoringFunction = new Function(this, 'ComplianceMonitoringFunction', {
      functionName: 'opportunity-analysis-compliance-monitoring',
      runtime: Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: Code.fromInline(`
        const { ConfigServiceClient, GetComplianceDetailsByConfigRuleCommand } = require('@aws-sdk/client-config-service');
        const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
        const { OrganizationsClient, ListAccountsCommand } = require('@aws-sdk/client-organizations');

        const configClient = new ConfigServiceClient({});
        const snsClient = new SNSClient({});
        const orgClient = new OrganizationsClient({});

        exports.handler = async (event) => {
          console.log('Starting compliance monitoring check...');
          
          try {
            // Get all accounts in the organization
            const accountsResponse = await orgClient.send(new ListAccountsCommand({}));
            const accounts = accountsResponse.Accounts || [];
            
            const complianceResults = [];
            
            // Check compliance for each account
            for (const account of accounts) {
              if (account.Status === 'ACTIVE') {
                try {
                  // Check key compliance rules
                  const rules = [
                    'root-access-key-check',
                    'encrypted-volumes',
                    's3-bucket-public-access-prohibited',
                    'iam-password-policy',
                    'cloudtrail-enabled'
                  ];
                  
                  for (const ruleName of rules) {
                    try {
                      const complianceCommand = new GetComplianceDetailsByConfigRuleCommand({
                        ConfigRuleName: ruleName
                      });
                      
                      const complianceResponse = await configClient.send(complianceCommand);
                      
                      if (complianceResponse.EvaluationResults) {
                        const nonCompliantResources = complianceResponse.EvaluationResults
                          .filter(result => result.ComplianceType === 'NON_COMPLIANT');
                        
                        if (nonCompliantResources.length > 0) {
                          complianceResults.push({
                            account: account.Name || account.Id,
                            rule: ruleName,
                            nonCompliantCount: nonCompliantResources.length,
                            resources: nonCompliantResources.map(r => r.EvaluationResultIdentifier?.EvaluationResultQualifier?.ResourceId)
                          });
                        }
                      }
                    } catch (ruleError) {
                      console.log(\`Rule \${ruleName} not found or not applicable for account \${account.Id}\`);
                    }
                  }
                } catch (accountError) {
                  console.error(\`Error checking compliance for account \${account.Id}:\`, accountError.message);
                }
              }
            }
            
            // Send notification if there are compliance issues
            if (complianceResults.length > 0) {
              const message = {
                timestamp: new Date().toISOString(),
                summary: \`Found \${complianceResults.length} compliance issues across accounts\`,
                details: complianceResults
              };
              
              await snsClient.send(new PublishCommand({
                TopicArn: process.env.GOVERNANCE_TOPIC_ARN,
                Subject: 'Opportunity Analysis - Compliance Issues Detected',
                Message: JSON.stringify(message, null, 2)
              }));
              
              console.log('Compliance issues found and notification sent');
            } else {
              console.log('No compliance issues found');
            }
            
            return {
              statusCode: 200,
              body: JSON.stringify({
                message: 'Compliance monitoring completed',
                issuesFound: complianceResults.length
              })
            };
            
          } catch (error) {
            console.error('Error in compliance monitoring:', error);
            
            // Send error notification
            await snsClient.send(new PublishCommand({
              TopicArn: process.env.GOVERNANCE_TOPIC_ARN,
              Subject: 'Opportunity Analysis - Compliance Monitoring Error',
              Message: \`Error in compliance monitoring: \${error.message}\`
            }));
            
            throw error;
          }
        };
      `),
      environment: {
        GOVERNANCE_TOPIC_ARN: governanceTopic.topicArn,
      },
      timeout: Duration.minutes(15),
    });

    // Create log group for compliance monitoring
    new LogGroup(this, 'ComplianceMonitoringLogGroup', {
      logGroupName: `/aws/lambda/${complianceMonitoringFunction.functionName}`,
      retention: RetentionDays.ONE_MONTH,
    });

    // Grant permissions to the compliance monitoring function
    governanceTopic.grantPublish(complianceMonitoringFunction);
    
    complianceMonitoringFunction.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'config:GetComplianceDetailsByConfigRule',
        'config:DescribeConfigRules',
        'organizations:ListAccounts',
        'organizations:DescribeAccount',
      ],
      resources: ['*'],
    }));

    // Schedule compliance monitoring to run daily
    const complianceScheduleRule = new Rule(this, 'ComplianceScheduleRule', {
      ruleName: 'opportunity-analysis-compliance-schedule',
      description: 'Daily compliance monitoring for Opportunity Analysis',
      schedule: Schedule.cron({ hour: '9', minute: '0' }), // 9 AM UTC daily
    });

    complianceScheduleRule.addTarget(new LambdaFunction(complianceMonitoringFunction));

    // Create guardrails enforcement Lambda
    const guardrailsFunction = new Function(this, 'GuardrailsFunction', {
      functionName: 'opportunity-analysis-guardrails',
      runtime: Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: Code.fromInline(`
        const { EC2Client, DescribeInstancesCommand, TerminateInstancesCommand } = require('@aws-sdk/client-ec2');
        const { S3Client, GetBucketPolicyCommand, PutBucketPolicyCommand } = require('@aws-sdk/client-s3');
        const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

        const ec2Client = new EC2Client({});
        const s3Client = new S3Client({});
        const snsClient = new SNSClient({});

        exports.handler = async (event) => {
          console.log('Guardrails enforcement triggered:', JSON.stringify(event, null, 2));
          
          try {
            const actions = [];
            
            // Check for non-compliant EC2 instances
            if (event.source === 'aws.ec2' && event['detail-type'] === 'EC2 Instance State-change Notification') {
              const instanceId = event.detail.instance-id;
              const state = event.detail.state;
              
              if (state === 'running') {
                // Check if instance has required tags
                const describeCommand = new DescribeInstancesCommand({
                  InstanceIds: [instanceId]
                });
                
                const response = await ec2Client.send(describeCommand);
                const instance = response.Reservations[0]?.Instances[0];
                
                if (instance) {
                  const tags = instance.Tags || [];
                  const hasEnvironmentTag = tags.some(tag => tag.Key === 'Environment');
                  const hasProjectTag = tags.some(tag => tag.Key === 'Project' && tag.Value === 'OpportunityAnalysis');
                  
                  if (!hasEnvironmentTag || !hasProjectTag) {
                    actions.push(\`Instance \${instanceId} missing required tags\`);
                    
                    // Optionally terminate non-compliant instances (be careful with this!)
                    if (process.env.ENFORCE_TERMINATION === 'true') {
                      await ec2Client.send(new TerminateInstancesCommand({
                        InstanceIds: [instanceId]
                      }));
                      actions.push(\`Terminated non-compliant instance \${instanceId}\`);
                    }
                  }
                }
              }
            }
            
            // Check for S3 bucket policy violations
            if (event.source === 'aws.s3' && event['detail-type'] === 'S3 Bucket Policy Change') {
              const bucketName = event.detail.requestParameters?.bucketName;
              
              if (bucketName && bucketName.includes('opportunity-analysis')) {
                try {
                  const policyCommand = new GetBucketPolicyCommand({
                    Bucket: bucketName
                  });
                  
                  const policyResponse = await s3Client.send(policyCommand);
                  const policy = JSON.parse(policyResponse.Policy);
                  
                  // Check for public access
                  const hasPublicAccess = policy.Statement.some(statement => 
                    statement.Principal === '*' || 
                    (statement.Principal && statement.Principal.AWS === '*')
                  );
                  
                  if (hasPublicAccess) {
                    actions.push(\`S3 bucket \${bucketName} has public access policy\`);
                  }
                } catch (policyError) {
                  console.log(\`Could not check policy for bucket \${bucketName}\`);
                }
              }
            }
            
            // Send notification if actions were taken
            if (actions.length > 0) {
              await snsClient.send(new PublishCommand({
                TopicArn: process.env.GOVERNANCE_TOPIC_ARN,
                Subject: 'Opportunity Analysis - Guardrails Enforcement',
                Message: \`Guardrails enforcement actions taken:\\n\\n\${actions.join('\\n')}\`
              }));
            }
            
            return {
              statusCode: 200,
              body: JSON.stringify({
                message: 'Guardrails enforcement completed',
                actions: actions
              })
            };
            
          } catch (error) {
            console.error('Error in guardrails enforcement:', error);
            
            await snsClient.send(new PublishCommand({
              TopicArn: process.env.GOVERNANCE_TOPIC_ARN,
              Subject: 'Opportunity Analysis - Guardrails Error',
              Message: \`Error in guardrails enforcement: \${error.message}\`
            }));
            
            throw error;
          }
        };
      `),
      environment: {
        GOVERNANCE_TOPIC_ARN: governanceTopic.topicArn,
        ENFORCE_TERMINATION: 'false', // Set to 'true' to enable automatic termination
      },
      timeout: Duration.minutes(5),
    });

    // Grant permissions to guardrails function
    governanceTopic.grantPublish(guardrailsFunction);
    
    guardrailsFunction.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'ec2:DescribeInstances',
        'ec2:TerminateInstances',
        's3:GetBucketPolicy',
        's3:PutBucketPolicy',
      ],
      resources: ['*'],
    }));

    // Create EventBridge rules for guardrails
    const ec2GuardrailRule = new Rule(this, 'EC2GuardrailRule', {
      ruleName: 'opportunity-analysis-ec2-guardrail',
      description: 'Monitor EC2 instance changes for compliance',
      eventPattern: {
        source: ['aws.ec2'],
        detailType: ['EC2 Instance State-change Notification'],
      },
    });

    ec2GuardrailRule.addTarget(new LambdaFunction(guardrailsFunction));

    const s3GuardrailRule = new Rule(this, 'S3GuardrailRule', {
      ruleName: 'opportunity-analysis-s3-guardrail',
      description: 'Monitor S3 bucket policy changes for compliance',
      eventPattern: {
        source: ['aws.s3'],
        detailType: ['S3 Bucket Policy Change'],
      },
    });

    s3GuardrailRule.addTarget(new LambdaFunction(guardrailsFunction));

    // Store Control Tower configuration in Parameter Store
    new StringParameter(this, 'ControlTowerServiceRoleParameter', {
      parameterName: '/opportunity-analysis/control-tower/service-role-arn',
      stringValue: controlTowerServiceRole.roleArn,
      description: 'Control Tower service role ARN',
    });

    new StringParameter(this, 'GovernanceTopicParameter', {
      parameterName: '/opportunity-analysis/control-tower/governance-topic-arn',
      stringValue: governanceTopic.topicArn,
      description: 'Governance notifications topic ARN',
    });

    // Output important values
    new CfnOutput(this, 'ControlTowerServiceRoleArn', {
      value: controlTowerServiceRole.roleArn,
      description: 'Control Tower service role ARN',
      exportName: 'OpportunityAnalysisControlTowerServiceRoleArn',
    });

    new CfnOutput(this, 'GovernanceTopicArn', {
      value: governanceTopic.topicArn,
      description: 'Governance notifications topic ARN',
      exportName: 'OpportunityAnalysisGovernanceTopicArn',
    });

    new CfnOutput(this, 'ComplianceMonitoringFunctionArn', {
      value: complianceMonitoringFunction.functionArn,
      description: 'Compliance monitoring function ARN',
      exportName: 'OpportunityAnalysisComplianceMonitoringFunctionArn',
    });

    new CfnOutput(this, 'GuardrailsFunctionArn', {
      value: guardrailsFunction.functionArn,
      description: 'Guardrails enforcement function ARN',
      exportName: 'OpportunityAnalysisGuardrailsFunctionArn',
    });
  }
}

module.exports = { ControlTowerStack };