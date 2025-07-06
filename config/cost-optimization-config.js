const { 
  CostExplorerClient, 
  GetCostAndUsageCommand, 
  GetDimensionValuesCommand,
  GetUsageAndCostsCommand 
} = require('@aws-sdk/client-cost-explorer');
const { 
  BudgetsClient, 
  CreateBudgetCommand, 
  DescribeBudgetsCommand,
  CreateNotificationCommand 
} = require('@aws-sdk/client-budgets');

class CostOptimizationConfig {
  constructor(region = 'us-east-1') {
    this.region = region;
    this.costExplorerClient = new CostExplorerClient({ region: 'us-east-1' }); // Cost Explorer is only available in us-east-1
    this.budgetsClient = new BudgetsClient({ region: 'us-east-1' }); // Budgets is only available in us-east-1
    this.accountId = null;
  }

  async initialize() {
    try {
      // Get account ID from STS
      const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
      const stsClient = new STSClient({ region: this.region });
      const identity = await stsClient.send(new GetCallerIdentityCommand({}));
      this.accountId = identity.Account;
      console.log(`Initialized cost optimization for account: ${this.accountId}`);
    } catch (error) {
      console.error('Failed to initialize cost optimization:', error);
      throw error;
    }
  }

  // Cost allocation tags configuration
  getCostAllocationTags() {
    return {
      required: [
        'Project',
        'Environment', 
        'Service',
        'Owner',
        'CostCenter'
      ],
      optional: [
        'Application',
        'Version',
        'CreatedBy',
        'Purpose'
      ],
      values: {
        Project: 'aws-opportunity-analysis',
        Service: {
          api: 'api-gateway',
          compute: 'lambda',
          storage: 's3',
          database: 'dynamodb',
          cdn: 'cloudfront',
          monitoring: 'cloudwatch',
          orchestration: 'step-functions',
          ai: 'bedrock'
        },
        Environment: ['development', 'staging', 'production'],
        Owner: 'opportunity-analysis-team'
      }
    };
  }

  // Budget configuration
  getBudgetConfigurations() {
    return {
      monthly: {
        budgetName: 'aws-opportunity-analysis-monthly',
        budgetLimit: {
          amount: '100.0',
          unit: 'USD'
        },
        timeUnit: 'MONTHLY',
        budgetType: 'COST',
        costFilters: {
          TagKey: ['Project'],
          TagValue: ['aws-opportunity-analysis']
        },
        notifications: [
          {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 80,
            thresholdType: 'PERCENTAGE'
          },
          {
            notificationType: 'FORECASTED',
            comparisonOperator: 'GREATER_THAN',
            threshold: 100,
            thresholdType: 'PERCENTAGE'
          }
        ]
      },
      service: {
        lambda: {
          budgetName: 'aws-opportunity-analysis-lambda',
          budgetLimit: { amount: '30.0', unit: 'USD' },
          timeUnit: 'MONTHLY',
          budgetType: 'COST',
          costFilters: {
            Service: ['AWS Lambda'],
            TagKey: ['Project'],
            TagValue: ['aws-opportunity-analysis']
          }
        },
        bedrock: {
          budgetName: 'aws-opportunity-analysis-bedrock',
          budgetLimit: { amount: '40.0', unit: 'USD' },
          timeUnit: 'MONTHLY',
          budgetType: 'COST',
          costFilters: {
            Service: ['Amazon Bedrock'],
            TagKey: ['Project'],
            TagValue: ['aws-opportunity-analysis']
          }
        },
        apiGateway: {
          budgetName: 'aws-opportunity-analysis-api-gateway',
          budgetLimit: { amount: '10.0', unit: 'USD' },
          timeUnit: 'MONTHLY',
          budgetType: 'COST',
          costFilters: {
            Service: ['Amazon API Gateway'],
            TagKey: ['Project'],
            TagValue: ['aws-opportunity-analysis']
          }
        }
      }
    };
  }

  // Lambda provisioned concurrency configuration
  getLambdaProvisionedConcurrencyConfig() {
    return {
      functions: {
        'opportunity-analysis': {
          provisionedConcurrency: 2,
          autoPublishAliasVersionConfiguration: {
            codeDeploymentConfiguration: {
              deploymentPreference: {
                type: 'Linear10PercentEvery1Minute'
              }
            }
          },
          reservedConcurrency: 10
        },
        'query-generation': {
          provisionedConcurrency: 1,
          reservedConcurrency: 5
        },
        'data-retrieval': {
          provisionedConcurrency: 1,
          reservedConcurrency: 5
        }
      },
      scheduling: {
        warmUpSchedule: 'rate(5 minutes)', // Keep functions warm during business hours
        coolDownSchedule: 'rate(1 hour)'   // Reduce concurrency during off-hours
      }
    };
  }

  // S3 intelligent tiering configuration
  getS3IntelligentTieringConfig() {
    return {
      configurations: [
        {
          id: 'EntireBucket',
          status: 'Enabled',
          filter: {
            prefix: ''
          },
          tierings: [
            {
              days: 1,
              accessTier: 'ARCHIVE_ACCESS'
            },
            {
              days: 90,
              accessTier: 'DEEP_ARCHIVE_ACCESS'
            }
          ]
        },
        {
          id: 'LogsOptimization',
          status: 'Enabled',
          filter: {
            prefix: 'logs/'
          },
          tierings: [
            {
              days: 1,
              accessTier: 'ARCHIVE_ACCESS'
            },
            {
              days: 30,
              accessTier: 'DEEP_ARCHIVE_ACCESS'
            }
          ]
        }
      ],
      lifecycleRules: [
        {
          id: 'DeleteIncompleteMultipartUploads',
          status: 'Enabled',
          abortIncompleteMultipartUpload: {
            daysAfterInitiation: 7
          }
        },
        {
          id: 'TransitionOldVersions',
          status: 'Enabled',
          noncurrentVersionTransitions: [
            {
              noncurrentDays: 30,
              storageClass: 'STANDARD_IA'
            },
            {
              noncurrentDays: 90,
              storageClass: 'GLACIER'
            }
          ],
          noncurrentVersionExpiration: {
            noncurrentDays: 365
          }
        }
      ]
    };
  }

  // DynamoDB on-demand billing configuration
  getDynamoDBOnDemandConfig() {
    return {
      billingMode: 'PAY_PER_REQUEST',
      pointInTimeRecovery: true,
      backupPolicy: {
        pointInTimeRecoveryEnabled: true,
        continuousBackups: true
      },
      globalTables: false, // Enable only if multi-region is needed
      streamSpecification: {
        streamEnabled: true,
        streamViewType: 'NEW_AND_OLD_IMAGES'
      },
      contributorInsights: true,
      costOptimization: {
        enableAutoScaling: false, // Not needed with on-demand
        enableDeletionProtection: true,
        enableEncryption: true,
        encryptionType: 'AWS_MANAGED'
      }
    };
  }

  // Cost monitoring thresholds
  getCostMonitoringThresholds() {
    return {
      daily: {
        warning: 5.0,   // $5 per day
        critical: 10.0  // $10 per day
      },
      monthly: {
        warning: 80.0,   // $80 per month
        critical: 100.0  // $100 per month
      },
      services: {
        bedrock: {
          daily: 2.0,
          monthly: 40.0
        },
        lambda: {
          daily: 1.5,
          monthly: 30.0
        },
        apiGateway: {
          daily: 0.5,
          monthly: 10.0
        },
        s3: {
          daily: 0.3,
          monthly: 5.0
        },
        cloudfront: {
          daily: 0.2,
          monthly: 3.0
        }
      }
    };
  }

  // Cost optimization recommendations
  getCostOptimizationRecommendations() {
    return {
      lambda: [
        'Use ARM-based Graviton2 processors for better price-performance',
        'Optimize memory allocation based on actual usage patterns',
        'Implement connection pooling to reduce cold starts',
        'Use provisioned concurrency only for critical functions',
        'Monitor and adjust timeout values to prevent unnecessary charges'
      ],
      bedrock: [
        'Choose the most cost-effective model for each use case',
        'Implement request batching where possible',
        'Cache frequently used responses',
        'Monitor token usage and optimize prompts',
        'Use streaming responses for better user experience'
      ],
      s3: [
        'Enable S3 Intelligent Tiering for automatic cost optimization',
        'Use lifecycle policies to transition old data to cheaper storage classes',
        'Enable compression for text-based content',
        'Implement multipart upload cleanup',
        'Monitor and optimize request patterns'
      ],
      apiGateway: [
        'Enable caching for frequently accessed endpoints',
        'Implement request/response compression',
        'Use regional endpoints instead of edge-optimized when appropriate',
        'Monitor and optimize throttling settings',
        'Consider using Application Load Balancer for high-volume APIs'
      ],
      general: [
        'Implement comprehensive tagging strategy for cost allocation',
        'Set up automated cost alerts and budgets',
        'Regular review of AWS Cost Explorer reports',
        'Use AWS Trusted Advisor recommendations',
        'Implement resource scheduling for non-production environments'
      ]
    };
  }
}

module.exports = { CostOptimizationConfig };