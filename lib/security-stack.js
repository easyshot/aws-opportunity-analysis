const { Stack, Duration, RemovalPolicy, CfnOutput } = require('aws-cdk-lib');
const wafv2 = require('aws-cdk-lib/aws-wafv2');
const shield = require('aws-cdk-lib/aws-shield');
const config = require('aws-cdk-lib/aws-config');
const cloudtrail = require('aws-cdk-lib/aws-cloudtrail');
const guardduty = require('aws-cdk-lib/aws-guardduty');
const iam = require('aws-cdk-lib/aws-iam');
const accessanalyzer = require('aws-cdk-lib/aws-accessanalyzer');
const s3 = require('aws-cdk-lib/aws-s3');
const logs = require('aws-cdk-lib/aws-logs');
const sns = require('aws-cdk-lib/aws-sns');
const cloudwatch = require('aws-cdk-lib/aws-cloudwatch');
const cw_actions = require('aws-cdk-lib/aws-cloudwatch-actions');

class SecurityStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create S3 bucket for CloudTrail logs
    const cloudTrailBucket = new s3.Bucket(this, 'CloudTrailLogsBucket', {
      bucketName: `aws-opportunity-analysis-cloudtrail-${this.account}-${this.region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          id: 'CloudTrailLogsLifecycle',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: Duration.days(90),
            },
            {
              storageClass: s3.StorageClass.DEEP_ARCHIVE,
              transitionAfter: Duration.days(365),
            },
          ],
          expiration: Duration.days(2555), // 7 years retention
        },
      ],
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // Create S3 bucket for AWS Config
    const configBucket = new s3.Bucket(this, 'ConfigBucket', {
      bucketName: `aws-opportunity-analysis-config-${this.account}-${this.region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          id: 'ConfigLogsLifecycle',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: Duration.days(90),
            },
          ],
          expiration: Duration.days(2555), // 7 years retention
        },
      ],
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // Create SNS topic for security alerts
    const securityAlertsTopic = new sns.Topic(this, 'SecurityAlertsTopic', {
      topicName: 'aws-opportunity-analysis-security-alerts',
      displayName: 'AWS Opportunity Analysis Security Alerts',
    });

    // 1. AWS WAF for API Gateway protection
    const webAcl = new wafv2.CfnWebACL(this, 'OpportunityAnalysisWebACL', {
      name: 'OpportunityAnalysisWebACL',
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
      description: 'Web ACL for AWS Opportunity Analysis API Gateway protection',
      rules: [
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'CommonRuleSetMetric',
          },
        },
        {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'KnownBadInputsRuleSetMetric',
          },
        },
        {
          name: 'AWSManagedRulesSQLiRuleSet',
          priority: 3,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesSQLiRuleSet',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'SQLiRuleSetMetric',
          },
        },
        {
          name: 'RateLimitRule',
          priority: 4,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: 2000,
              aggregateKeyType: 'IP',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRuleMetric',
          },
        },
        {
          name: 'GeoBlockRule',
          priority: 5,
          action: { block: {} },
          statement: {
            geoMatchStatement: {
              countryCodes: ['CN', 'RU', 'KP', 'IR'], // Block high-risk countries
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'GeoBlockRuleMetric',
          },
        },
      ],
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'OpportunityAnalysisWebACL',
      },
    });

    // Create WAF logging configuration
    const wafLogGroup = new logs.LogGroup(this, 'WAFLogGroup', {
      logGroupName: '/aws/wafv2/opportunity-analysis',
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new wafv2.CfnLoggingConfiguration(this, 'WAFLoggingConfiguration', {
      resourceArn: webAcl.attrArn,
      logDestinationConfigs: [wafLogGroup.logGroupArn],
      redactedFields: [
        {
          singleHeader: {
            name: 'authorization',
          },
        },
        {
          singleHeader: {
            name: 'cookie',
          },
        },
      ],
    });

    // 2. AWS Shield Advanced (Note: This requires manual subscription and has costs)
    // Shield Standard is automatically enabled for all AWS resources
    // For Shield Advanced, we'll create the necessary IAM role and policies
    const shieldRole = new iam.Role(this, 'ShieldAdvancedRole', {
      assumedBy: new iam.ServicePrincipal('shield.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSShieldDRTAccessPolicy'),
      ],
    });

    // 3. AWS Config for compliance monitoring
    const configRole = new iam.Role(this, 'ConfigRole', {
      assumedBy: new iam.ServicePrincipal('config.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/ConfigRole'),
      ],
    });

    // Grant Config permissions to write to S3 bucket
    configBucket.grantReadWrite(configRole);

    const configurationRecorder = new config.CfnConfigurationRecorder(this, 'ConfigurationRecorder', {
      name: 'OpportunityAnalysisConfigRecorder',
      roleArn: configRole.roleArn,
      recordingGroup: {
        allSupported: true,
        includeGlobalResourceTypes: true,
        resourceTypes: [],
      },
    });

    const deliveryChannel = new config.CfnDeliveryChannel(this, 'ConfigDeliveryChannel', {
      name: 'OpportunityAnalysisConfigDeliveryChannel',
      s3BucketName: configBucket.bucketName,
      configSnapshotDeliveryProperties: {
        deliveryFrequency: 'TwentyFour_Hours',
      },
    });

    // Add Config Rules for compliance monitoring
    const configRules = [
      {
        name: 'root-access-key-check',
        source: 'AWS',
        identifier: 'ROOT_ACCESS_KEY_CHECK',
        description: 'Checks whether the root user access key is available',
      },
      {
        name: 'iam-password-policy',
        source: 'AWS',
        identifier: 'IAM_PASSWORD_POLICY',
        description: 'Checks whether the account password policy meets specified requirements',
      },
      {
        name: 'cloudtrail-enabled',
        source: 'AWS',
        identifier: 'CLOUD_TRAIL_ENABLED',
        description: 'Checks whether AWS CloudTrail is enabled',
      },
      {
        name: 's3-bucket-public-read-prohibited',
        source: 'AWS',
        identifier: 'S3_BUCKET_PUBLIC_READ_PROHIBITED',
        description: 'Checks that S3 buckets do not allow public read access',
      },
      {
        name: 's3-bucket-public-write-prohibited',
        source: 'AWS',
        identifier: 'S3_BUCKET_PUBLIC_WRITE_PROHIBITED',
        description: 'Checks that S3 buckets do not allow public write access',
      },
      {
        name: 'encrypted-volumes',
        source: 'AWS',
        identifier: 'ENCRYPTED_VOLUMES',
        description: 'Checks whether EBS volumes are encrypted',
      },
    ];

    configRules.forEach((rule, index) => {
      new config.CfnConfigRule(this, `ConfigRule${index}`, {
        configRuleName: rule.name,
        description: rule.description,
        source: {
          owner: rule.source,
          sourceIdentifier: rule.identifier,
        },
        dependsOn: [configurationRecorder],
      });
    });

    // 4. AWS CloudTrail for comprehensive audit logging
    const cloudTrailRole = new iam.Role(this, 'CloudTrailRole', {
      assumedBy: new iam.ServicePrincipal('cloudtrail.amazonaws.com'),
    });

    // Grant CloudTrail permissions to write to S3 bucket
    cloudTrailBucket.grantWrite(cloudTrailRole);

    const cloudTrailLogGroup = new logs.LogGroup(this, 'CloudTrailLogGroup', {
      logGroupName: '/aws/cloudtrail/opportunity-analysis',
      retention: logs.RetentionDays.ONE_YEAR,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const cloudTrailLogStream = new logs.LogStream(this, 'CloudTrailLogStream', {
      logGroup: cloudTrailLogGroup,
      logStreamName: 'opportunity-analysis-trail',
    });

    // Create IAM role for CloudTrail to write to CloudWatch Logs
    const cloudTrailLogsRole = new iam.Role(this, 'CloudTrailLogsRole', {
      assumedBy: new iam.ServicePrincipal('cloudtrail.amazonaws.com'),
      inlinePolicies: {
        CloudWatchLogsPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:PutLogEvents',
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:DescribeLogStreams',
                'logs:DescribeLogGroups',
              ],
              resources: [
                cloudTrailLogGroup.logGroupArn,
                `${cloudTrailLogGroup.logGroupArn}:*`,
              ],
            }),
          ],
        }),
      },
    });

    const trail = new cloudtrail.Trail(this, 'OpportunityAnalysisTrail', {
      trailName: 'OpportunityAnalysisAuditTrail',
      bucket: cloudTrailBucket,
      includeGlobalServiceEvents: true,
      isMultiRegionTrail: true,
      enableFileValidation: true,
      sendToCloudWatchLogs: true,
      cloudWatchLogGroup: cloudTrailLogGroup,
      cloudWatchLogsRole: cloudTrailLogsRole,
      eventRuleTargets: [
        {
          target: securityAlertsTopic,
        },
      ],
    });

    // Add data events for S3 buckets
    trail.addS3EventSelector([
      {
        bucket: cloudTrailBucket,
        objectPrefix: '',
      },
      {
        bucket: configBucket,
        objectPrefix: '',
      },
    ]);

    // 5. AWS GuardDuty for threat detection
    const guardDutyDetector = new guardduty.CfnDetector(this, 'GuardDutyDetector', {
      enable: true,
      findingPublishingFrequency: 'FIFTEEN_MINUTES',
      dataSources: {
        s3Logs: {
          enable: true,
        },
        kubernetes: {
          auditLogs: {
            enable: true,
          },
        },
        malwareProtection: {
          scanEc2InstanceWithFindings: {
            ebsVolumes: true,
          },
        },
      },
    });

    // 6. IAM Access Analyzer for least privilege analysis
    const accessAnalyzer = new accessanalyzer.CfnAnalyzer(this, 'AccessAnalyzer', {
      analyzerName: 'OpportunityAnalysisAccessAnalyzer',
      type: 'ACCOUNT',
      archiveRules: [
        {
          ruleName: 'ArchiveInternalFindings',
          filter: [
            {
              property: 'principal.AWS',
              contains: [this.account],
            },
          ],
        },
      ],
    });

    // Create least privilege IAM policies
    const leastPrivilegePolicy = new iam.ManagedPolicy(this, 'LeastPrivilegePolicy', {
      managedPolicyName: 'OpportunityAnalysisLeastPrivilege',
      description: 'Least privilege policy for AWS Opportunity Analysis application',
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'bedrock:InvokeModel',
            'bedrock-agent:GetPrompt',
            'bedrock-runtime:Converse',
          ],
          resources: [
            `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-text-express-v1`,
            `arn:aws:bedrock:${this.region}::foundation-model/amazon.nova-premier-v1:0`,
            `arn:aws:bedrock-agent:${this.region}:${this.account}:prompt/*`,
          ],
          conditions: {
            StringEquals: {
              'aws:RequestedRegion': this.region,
            },
          },
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'athena:StartQueryExecution',
            'athena:GetQueryExecution',
            'athena:GetQueryResults',
            'athena:StopQueryExecution',
          ],
          resources: [
            `arn:aws:athena:${this.region}:${this.account}:workgroup/primary`,
          ],
          conditions: {
            StringEquals: {
              'athena:QueryString': '*catapult_db_p*',
            },
          },
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            's3:GetObject',
            's3:PutObject',
          ],
          resources: [
            'arn:aws:s3:::as-athena-catapult/*',
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'lambda:InvokeFunction',
          ],
          resources: [
            `arn:aws:lambda:${this.region}:${this.account}:function:catapult_get_dataset`,
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'ssm:GetParameter',
            'ssm:GetParameters',
          ],
          resources: [
            `arn:aws:ssm:${this.region}:${this.account}:parameter/opportunity-analysis/*`,
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'secretsmanager:GetSecretValue',
          ],
          resources: [
            `arn:aws:secretsmanager:${this.region}:${this.account}:secret:opportunity-analysis/credentials-*`,
          ],
        }),
      ],
    });

    // Create security monitoring alarms
    const wafBlockedRequestsAlarm = new cloudwatch.Alarm(this, 'WAFBlockedRequestsAlarm', {
      alarmName: 'OpportunityAnalysis-WAF-BlockedRequests',
      alarmDescription: 'High number of blocked requests detected by WAF',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/WAFV2',
        metricName: 'BlockedRequests',
        dimensionsMap: {
          WebACL: webAcl.name,
          Region: this.region,
        },
        statistic: 'Sum',
        period: Duration.minutes(5),
      }),
      threshold: 100,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    wafBlockedRequestsAlarm.addAlarmAction(new cw_actions.SnsAction(securityAlertsTopic));

    const guardDutyFindingsAlarm = new cloudwatch.Alarm(this, 'GuardDutyFindingsAlarm', {
      alarmName: 'OpportunityAnalysis-GuardDuty-Findings',
      alarmDescription: 'GuardDuty findings detected',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/GuardDuty',
        metricName: 'FindingCount',
        statistic: 'Sum',
        period: Duration.minutes(15),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    guardDutyFindingsAlarm.addAlarmAction(new cw_actions.SnsAction(securityAlertsTopic));

    // Create security dashboard
    const securityDashboard = new cloudwatch.Dashboard(this, 'SecurityDashboard', {
      dashboardName: 'AWS-Opportunity-Analysis-Security',
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: 'WAF Blocked Requests',
            left: [
              new cloudwatch.Metric({
                namespace: 'AWS/WAFV2',
                metricName: 'BlockedRequests',
                dimensionsMap: {
                  WebACL: webAcl.name,
                  Region: this.region,
                },
                statistic: 'Sum',
              }),
            ],
            width: 12,
          }),
          new cloudwatch.GraphWidget({
            title: 'WAF Allowed Requests',
            left: [
              new cloudwatch.Metric({
                namespace: 'AWS/WAFV2',
                metricName: 'AllowedRequests',
                dimensionsMap: {
                  WebACL: webAcl.name,
                  Region: this.region,
                },
                statistic: 'Sum',
              }),
            ],
            width: 12,
          }),
        ],
        [
          new cloudwatch.GraphWidget({
            title: 'GuardDuty Findings',
            left: [
              new cloudwatch.Metric({
                namespace: 'AWS/GuardDuty',
                metricName: 'FindingCount',
                statistic: 'Sum',
              }),
            ],
            width: 12,
          }),
          new cloudwatch.GraphWidget({
            title: 'CloudTrail API Calls',
            left: [
              new cloudwatch.Metric({
                namespace: 'AWS/CloudTrail',
                metricName: 'TotalAPICallCount',
                statistic: 'Sum',
              }),
            ],
            width: 12,
          }),
        ],
      ],
    });

    // Outputs
    new CfnOutput(this, 'WebACLArn', {
      value: webAcl.attrArn,
      description: 'WAF Web ACL ARN for API Gateway association',
      exportName: 'OpportunityAnalysis-WebACL-Arn',
    });

    new CfnOutput(this, 'CloudTrailArn', {
      value: trail.trailArn,
      description: 'CloudTrail ARN for audit logging',
    });

    new CfnOutput(this, 'GuardDutyDetectorId', {
      value: guardDutyDetector.ref,
      description: 'GuardDuty Detector ID',
    });

    new CfnOutput(this, 'AccessAnalyzerArn', {
      value: accessAnalyzer.attrArn,
      description: 'IAM Access Analyzer ARN',
    });

    new CfnOutput(this, 'SecurityAlertsTopicArn', {
      value: securityAlertsTopic.topicArn,
      description: 'SNS Topic ARN for security alerts',
    });

    new CfnOutput(this, 'LeastPrivilegePolicyArn', {
      value: leastPrivilegePolicy.managedPolicyArn,
      description: 'Least privilege IAM policy ARN',
    });

    // Store important values for other stacks
    this.webAclArn = webAcl.attrArn;
    this.securityAlertsTopic = securityAlertsTopic;
    this.leastPrivilegePolicy = leastPrivilegePolicy;
    this.cloudTrailBucket = cloudTrailBucket;
    this.configBucket = configBucket;
  }
}

module.exports = { SecurityStack };