/**
 * Security Configuration for AWS Opportunity Analysis
 * 
 * This configuration defines security settings and policies for the application
 */

const securityConfig = {
  // WAF Configuration
  waf: {
    name: 'OpportunityAnalysisWebACL',
    scope: 'REGIONAL', // For API Gateway
    rateLimitPerIP: 2000, // requests per 5-minute window
    blockedCountries: ['CN', 'RU', 'KP', 'IR'], // High-risk countries
    managedRuleSets: [
      'AWSManagedRulesCommonRuleSet',
      'AWSManagedRulesKnownBadInputsRuleSet',
      'AWSManagedRulesSQLiRuleSet',
      'AWSManagedRulesLinuxRuleSet',
      'AWSManagedRulesUnixRuleSet',
    ],
    customRules: {
      rateLimiting: {
        enabled: true,
        limit: 2000,
        window: 300, // 5 minutes
      },
      geoBlocking: {
        enabled: true,
        blockedCountries: ['CN', 'RU', 'KP', 'IR'],
      },
      ipWhitelist: {
        enabled: false,
        allowedIPs: [], // Add specific IPs if needed
      },
    },
  },

  // Shield Configuration
  shield: {
    advanced: {
      enabled: false, // Set to true if Shield Advanced subscription is available
      drtAccess: true, // DDoS Response Team access
      proactiveEngagement: false,
    },
    standard: {
      enabled: true, // Always enabled by default
    },
  },

  // AWS Config Rules
  configRules: [
    {
      name: 'root-access-key-check',
      identifier: 'ROOT_ACCESS_KEY_CHECK',
      description: 'Checks whether the root user access key is available',
      severity: 'HIGH',
    },
    {
      name: 'iam-password-policy',
      identifier: 'IAM_PASSWORD_POLICY',
      description: 'Checks whether the account password policy meets requirements',
      severity: 'MEDIUM',
      parameters: {
        RequireUppercaseCharacters: 'true',
        RequireLowercaseCharacters: 'true',
        RequireNumbers: 'true',
        RequireSymbols: 'true',
        MinimumPasswordLength: '14',
        PasswordReusePrevention: '24',
        MaxPasswordAge: '90',
      },
    },
    {
      name: 'cloudtrail-enabled',
      identifier: 'CLOUD_TRAIL_ENABLED',
      description: 'Checks whether AWS CloudTrail is enabled',
      severity: 'HIGH',
    },
    {
      name: 's3-bucket-public-read-prohibited',
      identifier: 'S3_BUCKET_PUBLIC_READ_PROHIBITED',
      description: 'Checks that S3 buckets do not allow public read access',
      severity: 'HIGH',
    },
    {
      name: 's3-bucket-public-write-prohibited',
      identifier: 'S3_BUCKET_PUBLIC_WRITE_PROHIBITED',
      description: 'Checks that S3 buckets do not allow public write access',
      severity: 'CRITICAL',
    },
    {
      name: 'encrypted-volumes',
      identifier: 'ENCRYPTED_VOLUMES',
      description: 'Checks whether EBS volumes are encrypted',
      severity: 'HIGH',
    },
    {
      name: 'lambda-function-public-access-prohibited',
      identifier: 'LAMBDA_FUNCTION_PUBLIC_ACCESS_PROHIBITED',
      description: 'Checks that Lambda functions are not publicly accessible',
      severity: 'CRITICAL',
    },
    {
      name: 'api-gateway-execution-logging-enabled',
      identifier: 'API_GW_EXECUTION_LOGGING_ENABLED',
      description: 'Checks that API Gateway has execution logging enabled',
      severity: 'MEDIUM',
    },
  ],

  // CloudTrail Configuration
  cloudTrail: {
    name: 'OpportunityAnalysisAuditTrail',
    multiRegion: true,
    includeGlobalServiceEvents: true,
    enableFileValidation: true,
    enableLogFileValidation: true,
    eventSelectors: [
      {
        readWriteType: 'All',
        includeManagementEvents: true,
        dataResources: [
          {
            type: 'AWS::S3::Object',
            values: ['arn:aws:s3:::*/*'],
          },
          {
            type: 'AWS::Lambda::Function',
            values: ['arn:aws:lambda:*'],
          },
        ],
      },
    ],
    insightSelectors: [
      {
        insightType: 'ApiCallRateInsight',
      },
    ],
    cloudWatchLogs: {
      enabled: true,
      retentionDays: 365,
    },
  },

  // GuardDuty Configuration
  guardDuty: {
    enabled: true,
    findingPublishingFrequency: 'FIFTEEN_MINUTES',
    dataSources: {
      s3Logs: true,
      kubernetesAuditLogs: true,
      malwareProtection: true,
      ebsVolumeScanning: true,
    },
    threatIntelSets: [],
    ipSets: [],
  },

  // IAM Access Analyzer Configuration
  accessAnalyzer: {
    name: 'OpportunityAnalysisAccessAnalyzer',
    type: 'ACCOUNT',
    archiveRules: [
      {
        ruleName: 'ArchiveInternalFindings',
        filter: {
          'principal.AWS': ['ACCOUNT_ID'], // Will be replaced with actual account ID
        },
      },
    ],
  },

  // Least Privilege Policies
  leastPrivilegePolicies: {
    bedrockAccess: {
      actions: [
        'bedrock:InvokeModel',
        'bedrock-agent:GetPrompt',
        'bedrock-runtime:Converse',
      ],
      resources: [
        'arn:aws:bedrock:*::foundation-model/amazon.titan-text-express-v1',
        'arn:aws:bedrock:*::foundation-model/amazon.nova-premier-v1:0',
        'arn:aws:bedrock-agent:*:*:prompt/*',
      ],
      conditions: {
        StringEquals: {
          'aws:RequestedRegion': ['us-east-1', 'us-west-2'],
        },
      },
    },
    athenaAccess: {
      actions: [
        'athena:StartQueryExecution',
        'athena:GetQueryExecution',
        'athena:GetQueryResults',
        'athena:StopQueryExecution',
      ],
      resources: [
        'arn:aws:athena:*:*:workgroup/primary',
      ],
      conditions: {
        StringLike: {
          'athena:QueryString': '*catapult_db_p*',
        },
      },
    },
    s3Access: {
      actions: [
        's3:GetObject',
        's3:PutObject',
      ],
      resources: [
        'arn:aws:s3:::as-athena-catapult/*',
      ],
    },
    lambdaAccess: {
      actions: [
        'lambda:InvokeFunction',
      ],
      resources: [
        'arn:aws:lambda:*:*:function:catapult_get_dataset',
      ],
    },
    parameterStoreAccess: {
      actions: [
        'ssm:GetParameter',
        'ssm:GetParameters',
      ],
      resources: [
        'arn:aws:ssm:*:*:parameter/opportunity-analysis/*',
      ],
    },
    secretsManagerAccess: {
      actions: [
        'secretsmanager:GetSecretValue',
      ],
      resources: [
        'arn:aws:secretsmanager:*:*:secret:opportunity-analysis/credentials-*',
      ],
    },
  },

  // Security Monitoring
  monitoring: {
    alarms: {
      wafBlockedRequests: {
        threshold: 100,
        evaluationPeriods: 2,
        period: 300, // 5 minutes
      },
      guardDutyFindings: {
        threshold: 1,
        evaluationPeriods: 1,
        period: 900, // 15 minutes
      },
      unauthorizedApiCalls: {
        threshold: 10,
        evaluationPeriods: 2,
        period: 300, // 5 minutes
      },
      rootAccountUsage: {
        threshold: 1,
        evaluationPeriods: 1,
        period: 300, // 5 minutes
      },
    },
    notifications: {
      snsTopicName: 'aws-opportunity-analysis-security-alerts',
      emailEndpoints: [], // Add email addresses for alerts
      smsEndpoints: [], // Add phone numbers for critical alerts
    },
  },

  // Compliance and Governance
  compliance: {
    frameworks: [
      'SOC2',
      'ISO27001',
      'NIST',
      'CIS',
    ],
    dataRetention: {
      cloudTrailLogs: 2555, // 7 years in days
      configLogs: 2555, // 7 years in days
      wafLogs: 90, // 3 months in days
      applicationLogs: 365, // 1 year in days
    },
    encryption: {
      atRest: {
        s3: 'AES256',
        dynamodb: 'AWS_MANAGED',
        lambda: 'AWS_MANAGED',
      },
      inTransit: {
        apiGateway: 'TLS1.2',
        cloudFront: 'TLS1.2',
        internal: 'TLS1.2',
      },
    },
  },

  // Security Best Practices
  bestPractices: {
    mfa: {
      required: true,
      rootAccount: true,
      iamUsers: true,
    },
    passwordPolicy: {
      minimumLength: 14,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: true,
      preventReuse: 24,
      maxAge: 90,
    },
    networkSecurity: {
      vpcEndpoints: true,
      privateSubnets: true,
      nacls: true,
      securityGroups: 'least-privilege',
    },
    accessControl: {
      principleOfLeastPrivilege: true,
      regularAccessReviews: true,
      temporaryAccess: true,
      crossAccountRoles: 'minimal',
    },
  },
};

module.exports = securityConfig;