/**
 * Security Stack Fixes for AWS Opportunity Analysis
 * 
 * This module contains fixes and enhancements for the security stack
 * to address bucket policies and other security configurations.
 */

const { PolicyStatement, Effect, ServicePrincipal } = require('aws-cdk-lib/aws-iam');

/**
 * Add proper CloudTrail bucket policies
 */
function addCloudTrailBucketPolicies(cloudTrailBucket, trailArn, account, region) {
  // CloudTrail service needs to check bucket ACL
  cloudTrailBucket.addToResourcePolicy(
    new PolicyStatement({
      sid: 'AWSCloudTrailAclCheck',
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal('cloudtrail.amazonaws.com')],
      actions: ['s3:GetBucketAcl'],
      resources: [cloudTrailBucket.bucketArn],
      conditions: {
        StringEquals: {
          'AWS:SourceArn': trailArn,
        },
      },
    })
  );

  // CloudTrail service needs to write log files
  cloudTrailBucket.addToResourcePolicy(
    new PolicyStatement({
      sid: 'AWSCloudTrailWrite',
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal('cloudtrail.amazonaws.com')],
      actions: ['s3:PutObject'],
      resources: [`${cloudTrailBucket.bucketArn}/*`],
      conditions: {
        StringEquals: {
          's3:x-amz-acl': 'bucket-owner-full-control',
          'AWS:SourceArn': trailArn,
        },
      },
    })
  );

  // CloudTrail service needs to check if bucket exists
  cloudTrailBucket.addToResourcePolicy(
    new PolicyStatement({
      sid: 'AWSCloudTrailBucketExistenceCheck',
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal('cloudtrail.amazonaws.com')],
      actions: ['s3:ListBucket'],
      resources: [cloudTrailBucket.bucketArn],
      conditions: {
        StringEquals: {
          'AWS:SourceArn': trailArn,
        },
      },
    })
  );
}

/**
 * Add proper AWS Config bucket policies
 */
function addConfigBucketPolicies(configBucket, account, region) {
  // Config service needs to check bucket permissions
  configBucket.addToResourcePolicy(
    new PolicyStatement({
      sid: 'AWSConfigBucketPermissionsCheck',
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal('config.amazonaws.com')],
      actions: ['s3:GetBucketAcl', 's3:ListBucket'],
      resources: [configBucket.bucketArn],
      conditions: {
        StringEquals: {
          'AWS:SourceAccount': account,
        },
      },
    })
  );

  // Config service needs to check bucket location
  configBucket.addToResourcePolicy(
    new PolicyStatement({
      sid: 'AWSConfigBucketExistenceCheck',
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal('config.amazonaws.com')],
      actions: ['s3:GetBucketLocation'],
      resources: [configBucket.bucketArn],
      conditions: {
        StringEquals: {
          'AWS:SourceAccount': account,
        },
      },
    })
  );

  // Config service needs to deliver configuration snapshots and history files
  configBucket.addToResourcePolicy(
    new PolicyStatement({
      sid: 'AWSConfigBucketDelivery',
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal('config.amazonaws.com')],
      actions: ['s3:PutObject'],
      resources: [`${configBucket.bucketArn}/*`],
      conditions: {
        StringEquals: {
          's3:x-amz-acl': 'bucket-owner-full-control',
          'AWS:SourceAccount': account,
        },
      },
    })
  );
}

/**
 * Fix IAM policies for better least privilege access
 */
function createEnhancedLeastPrivilegePolicy(scope, account, region) {
  const { ManagedPolicy, PolicyStatement, Effect } = require('aws-cdk-lib/aws-iam');
  
  return new ManagedPolicy(scope, 'EnhancedLeastPrivilegePolicy', {
    managedPolicyName: 'OpportunityAnalysis-Enhanced-LeastPrivilege',
    description: 'Enhanced least privilege policy for AWS Opportunity Analysis application',
    statements: [
      // Bedrock access with specific model restrictions
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'bedrock:InvokeModel',
          'bedrock-runtime:Converse',
        ],
        resources: [
          `arn:aws:bedrock:${region}::foundation-model/amazon.titan-text-express-v1`,
          `arn:aws:bedrock:${region}::foundation-model/amazon.nova-premier-v1:0`,
        ],
        conditions: {
          StringEquals: {
            'aws:RequestedRegion': region,
          },
          DateGreaterThan: {
            'aws:CurrentTime': '2024-01-01T00:00:00Z', // Prevent old requests
          },
        },
      }),
      
      // Bedrock Agent access with specific prompt restrictions
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'bedrock-agent:GetPrompt',
        ],
        resources: [
          `arn:aws:bedrock-agent:${region}:${account}:prompt/*`,
        ],
        conditions: {
          StringLike: {
            'bedrock-agent:PromptId': [
              'Y6T66EI3GZ', // CATAPULT_QUERY_PROMPT_ID
              'FDUHITJIME', // CATAPULT_ANALYSIS_PROMPT_ID
              'P03B9TO1Q1', // CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID
            ],
          },
        },
      }),
      
      // Athena access with database restrictions
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'athena:StartQueryExecution',
          'athena:GetQueryExecution',
          'athena:GetQueryResults',
          'athena:StopQueryExecution',
        ],
        resources: [
          `arn:aws:athena:${region}:${account}:workgroup/primary`,
        ],
        conditions: {
          StringLike: {
            'athena:QueryString': '*catapult_db_p*',
          },
          StringEquals: {
            'athena:OutputLocation': 's3://as-athena-catapult/*',
          },
        },
      }),
      
      // S3 access with specific bucket and prefix restrictions
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:PutObject',
        ],
        resources: [
          'arn:aws:s3:::as-athena-catapult/*',
        ],
        conditions: {
          StringEquals: {
            's3:x-amz-server-side-encryption': 'AES256',
          },
          StringLike: {
            's3:x-amz-server-side-encryption-context': '*opportunity-analysis*',
          },
        },
      }),
      
      // Lambda access with specific function restrictions
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'lambda:InvokeFunction',
        ],
        resources: [
          `arn:aws:lambda:${region}:${account}:function:catapult_get_dataset`,
          `arn:aws:lambda:${region}:${account}:function:catapult_get_dataset:*`, // Include versions
        ],
        conditions: {
          StringEquals: {
            'lambda:FunctionArn': [
              `arn:aws:lambda:${region}:${account}:function:catapult_get_dataset`,
            ],
          },
        },
      }),
      
      // Parameter Store access with path restrictions
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'ssm:GetParameter',
          'ssm:GetParameters',
        ],
        resources: [
          `arn:aws:ssm:${region}:${account}:parameter/opportunity-analysis/*`,
        ],
        conditions: {
          StringEquals: {
            'ssm:SourceIp': ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'], // Private IP ranges only
          },
        },
      }),
      
      // Secrets Manager access with specific secret restrictions
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'secretsmanager:GetSecretValue',
        ],
        resources: [
          `arn:aws:secretsmanager:${region}:${account}:secret:opportunity-analysis/credentials-*`,
        ],
        conditions: {
          StringEquals: {
            'secretsmanager:ResourceTag/Project': 'OpportunityAnalysis',
          },
          DateGreaterThan: {
            'aws:CurrentTime': '2024-01-01T00:00:00Z',
          },
        },
      }),
      
      // CloudWatch Logs access for application logging
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: [
          `arn:aws:logs:${region}:${account}:log-group:/aws/lambda/opportunity-analysis-*`,
          `arn:aws:logs:${region}:${account}:log-group:/aws/apigateway/opportunity-analysis-*`,
        ],
        conditions: {
          StringEquals: {
            'logs:LogGroupName': [
              '/aws/lambda/opportunity-analysis-*',
              '/aws/apigateway/opportunity-analysis-*',
            ],
          },
        },
      }),
      
      // X-Ray tracing for observability
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'xray:PutTraceSegments',
          'xray:PutTelemetryRecords',
        ],
        resources: ['*'], // X-Ray requires wildcard
        conditions: {
          StringEquals: {
            'aws:RequestedRegion': region,
          },
        },
      }),
    ],
  });
}

/**
 * Create security monitoring enhancements
 */
function createSecurityMonitoringEnhancements(scope, securityAlertsTopic, region) {
  const { Alarm, Metric, TreatMissingData } = require('aws-cdk-lib/aws-cloudwatch');
  const { SnsAction } = require('aws-cdk-lib/aws-cloudwatch-actions');
  const { Duration } = require('aws-cdk-lib');

  // Root account usage alarm
  const rootAccountUsageAlarm = new Alarm(scope, 'RootAccountUsageAlarm', {
    alarmName: 'OpportunityAnalysis-RootAccountUsage',
    alarmDescription: 'Detects root account usage which should be avoided',
    metric: new Metric({
      namespace: 'AWS/CloudTrail',
      metricName: 'RootAccountUsage',
      statistic: 'Sum',
      period: Duration.minutes(5),
    }),
    threshold: 1,
    evaluationPeriods: 1,
    treatMissingData: TreatMissingData.NOT_BREACHING,
  });

  rootAccountUsageAlarm.addAlarmAction(new SnsAction(securityAlertsTopic));

  // Failed login attempts alarm
  const failedLoginAlarm = new Alarm(scope, 'FailedLoginAlarm', {
    alarmName: 'OpportunityAnalysis-FailedLogins',
    alarmDescription: 'Detects multiple failed login attempts',
    metric: new Metric({
      namespace: 'AWS/CloudTrail',
      metricName: 'ConsoleLoginFailures',
      statistic: 'Sum',
      period: Duration.minutes(5),
    }),
    threshold: 5,
    evaluationPeriods: 2,
    treatMissingData: TreatMissingData.NOT_BREACHING,
  });

  failedLoginAlarm.addAlarmAction(new SnsAction(securityAlertsTopic));

  // Unusual API activity alarm
  const unusualApiActivityAlarm = new Alarm(scope, 'UnusualApiActivityAlarm', {
    alarmName: 'OpportunityAnalysis-UnusualApiActivity',
    alarmDescription: 'Detects unusual API activity patterns',
    metric: new Metric({
      namespace: 'AWS/CloudTrail',
      metricName: 'UnusualApiCalls',
      statistic: 'Sum',
      period: Duration.minutes(15),
    }),
    threshold: 100,
    evaluationPeriods: 2,
    treatMissingData: TreatMissingData.NOT_BREACHING,
  });

  unusualApiActivityAlarm.addAlarmAction(new SnsAction(securityAlertsTopic));

  return {
    rootAccountUsageAlarm,
    failedLoginAlarm,
    unusualApiActivityAlarm,
  };
}

module.exports = {
  addCloudTrailBucketPolicies,
  addConfigBucketPolicies,
  createEnhancedLeastPrivilegePolicy,
  createSecurityMonitoringEnhancements,
};