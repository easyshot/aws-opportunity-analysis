const { Stack, Duration, RemovalPolicy, CfnOutput, Tags } = require('aws-cdk-lib');
const lambda = require('aws-cdk-lib/aws-lambda');
const iam = require('aws-cdk-lib/aws-iam');
const events = require('aws-cdk-lib/aws-events');
const targets = require('aws-cdk-lib/aws-events-targets');
const sns = require('aws-cdk-lib/aws-sns');
const subscriptions = require('aws-cdk-lib/aws-sns-subscriptions');
const cloudwatch = require('aws-cdk-lib/aws-cloudwatch');
const actions = require('aws-cdk-lib/aws-cloudwatch-actions');
const s3 = require('aws-cdk-lib/aws-s3');
const dynamodb = require('aws-cdk-lib/aws-dynamodb');
const { CostOptimizationConfig } = require('../config/cost-optimization-config');

class CostOptimizationStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const costConfig = new CostOptimizationConfig(this.region);
    const costTags = costConfig.getCostAllocationTags();

    // Apply cost allocation tags to the entire stack
    Tags.of(this).add('Project', costTags.values.Project);
    Tags.of(this).add('Environment', props?.environment || 'production');
    Tags.of(this).add('Owner', costTags.values.Owner);
    Tags.of(this).add('CostCenter', 'engineering');
    Tags.of(this).add('Service', 'cost-optimization');

    // Create SNS topic for cost alerts
    const costAlertsTopic = new sns.Topic(this, 'CostAlertsTopic', {
      topicName: 'aws-opportunity-analysis-cost-alerts',
      displayName: 'AWS Opportunity Analysis Cost Alerts'
    });

    // Add email subscription (replace with actual email)
    costAlertsTopic.addSubscription(
      new subscriptions.EmailSubscription('admin@example.com')
    );

    // Create Lambda function for cost monitoring
    const costMonitoringRole = new iam.Role(this, 'CostMonitoringRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        CostExplorerAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'ce:GetCostAndUsage',
                'ce:GetUsageAndCosts',
                'ce:GetDimensionValues',
                'ce:GetReservationCoverage',
                'ce:GetReservationPurchaseRecommendation',
                'ce:GetReservationUtilization',
                'ce:GetSavingsPlansUtilization',
                'ce:ListCostCategoryDefinitions'
              ],
              resources: ['*']
            })
          ]
        }),
        BudgetsAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'budgets:ViewBudget',
                'budgets:DescribeBudgets',
                'budgets:DescribeBudgetAction',
                'budgets:DescribeBudgetActionsForBudget',
                'budgets:DescribeBudgetActionsForAccount'
              ],
              resources: ['*']
            })
          ]
        }),
        SNSPublish: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['sns:Publish'],
              resources: [costAlertsTopic.topicArn]
            })
          ]
        }),
        CloudWatchMetrics: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'cloudwatch:PutMetricData',
                'cloudwatch:GetMetricStatistics',
                'cloudwatch:ListMetrics'
              ],
              resources: ['*']
            })
          ]
        })
      }
    });

    const costMonitoringFunction = new lambda.Function(this, 'CostMonitoringFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'cost-monitoring.handler',
      code: lambda.Code.fromAsset('lambda'),
      role: costMonitoringRole,
      timeout: Duration.minutes(5),
      memorySize: 512,
      environment: {
        COST_ALERTS_TOPIC_ARN: costAlertsTopic.topicArn,
        PROJECT_TAG: costTags.values.Project,
        COST_THRESHOLDS: JSON.stringify(costConfig.getCostMonitoringThresholds())
      },
      tracing: lambda.Tracing.ACTIVE
    });

    // Create EventBridge rule for daily cost monitoring
    const dailyCostMonitoringRule = new events.Rule(this, 'DailyCostMonitoringRule', {
      ruleName: 'aws-opportunity-analysis-daily-cost-check',
      description: 'Daily cost monitoring for AWS Opportunity Analysis',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '9', // 9 AM UTC
        day: '*',
        month: '*',
        year: '*'
      })
    });

    dailyCostMonitoringRule.addTarget(new targets.LambdaFunction(costMonitoringFunction));

    // Create Lambda function for budget management
    const budgetManagementRole = new iam.Role(this, 'BudgetManagementRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        BudgetsFullAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'budgets:CreateBudget',
                'budgets:UpdateBudget',
                'budgets:DeleteBudget',
                'budgets:DescribeBudgets',
                'budgets:CreateNotification',
                'budgets:UpdateNotification',
                'budgets:DeleteNotification',
                'budgets:DescribeNotificationsForBudget'
              ],
              resources: ['*']
            })
          ]
        }),
        SNSPublish: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['sns:Publish'],
              resources: [costAlertsTopic.topicArn]
            })
          ]
        })
      }
    });

    const budgetManagementFunction = new lambda.Function(this, 'BudgetManagementFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'budget-management.handler',
      code: lambda.Code.fromAsset('lambda'),
      role: budgetManagementRole,
      timeout: Duration.minutes(5),
      memorySize: 512,
      environment: {
        COST_ALERTS_TOPIC_ARN: costAlertsTopic.topicArn,
        BUDGET_CONFIGURATIONS: JSON.stringify(costConfig.getBudgetConfigurations()),
        ACCOUNT_ID: this.account
      },
      tracing: lambda.Tracing.ACTIVE
    });

    // Create Lambda function for S3 intelligent tiering management
    const s3OptimizationRole = new iam.Role(this, 'S3OptimizationRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        S3FullAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetBucketIntelligentTieringConfiguration',
                's3:PutBucketIntelligentTieringConfiguration',
                's3:DeleteBucketIntelligentTieringConfiguration',
                's3:ListBucketIntelligentTieringConfigurations',
                's3:GetBucketLifecycleConfiguration',
                's3:PutBucketLifecycleConfiguration',
                's3:GetBucketTagging',
                's3:PutBucketTagging',
                's3:ListBucket'
              ],
              resources: ['*']
            })
          ]
        })
      }
    });

    const s3OptimizationFunction = new lambda.Function(this, 'S3OptimizationFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 's3-optimization.handler',
      code: lambda.Code.fromAsset('lambda'),
      role: s3OptimizationRole,
      timeout: Duration.minutes(5),
      memorySize: 512,
      environment: {
        S3_TIERING_CONFIG: JSON.stringify(costConfig.getS3IntelligentTieringConfig()),
        PROJECT_TAG: costTags.values.Project
      },
      tracing: lambda.Tracing.ACTIVE
    });

    // Create Lambda function for provisioned concurrency management
    const concurrencyManagementRole = new iam.Role(this, 'ConcurrencyManagementRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        LambdaConcurrencyAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'lambda:GetProvisionedConcurrencyConfig',
                'lambda:PutProvisionedConcurrencyConfig',
                'lambda:DeleteProvisionedConcurrencyConfig',
                'lambda:ListProvisionedConcurrencyConfigs',
                'lambda:GetFunction',
                'lambda:ListFunctions',
                'lambda:GetAlias',
                'lambda:CreateAlias',
                'lambda:UpdateAlias',
                'lambda:PublishVersion'
              ],
              resources: ['*']
            })
          ]
        }),
        CloudWatchMetrics: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'cloudwatch:GetMetricStatistics',
                'cloudwatch:ListMetrics'
              ],
              resources: ['*']
            })
          ]
        })
      }
    });

    const concurrencyManagementFunction = new lambda.Function(this, 'ConcurrencyManagementFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'concurrency-management.handler',
      code: lambda.Code.fromAsset('lambda'),
      role: concurrencyManagementRole,
      timeout: Duration.minutes(5),
      memorySize: 512,
      environment: {
        CONCURRENCY_CONFIG: JSON.stringify(costConfig.getLambdaProvisionedConcurrencyConfig()),
        PROJECT_TAG: costTags.values.Project
      },
      tracing: lambda.Tracing.ACTIVE
    });

    // Create EventBridge rules for concurrency management
    const businessHoursRule = new events.Rule(this, 'BusinessHoursRule', {
      ruleName: 'aws-opportunity-analysis-business-hours',
      description: 'Scale up Lambda concurrency during business hours',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '8', // 8 AM UTC
        day: '*',
        month: '*',
        year: '*'
      })
    });

    const offHoursRule = new events.Rule(this, 'OffHoursRule', {
      ruleName: 'aws-opportunity-analysis-off-hours',
      description: 'Scale down Lambda concurrency during off hours',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '20', // 8 PM UTC
        day: '*',
        month: '*',
        year: '*'
      })
    });

    businessHoursRule.addTarget(new targets.LambdaFunction(concurrencyManagementFunction, {
      event: events.RuleTargetInput.fromObject({ action: 'scale-up' })
    }));

    offHoursRule.addTarget(new targets.LambdaFunction(concurrencyManagementFunction, {
      event: events.RuleTargetInput.fromObject({ action: 'scale-down' })
    }));

    // Create CloudWatch custom metrics and alarms
    const costThresholds = costConfig.getCostMonitoringThresholds();

    // Daily cost alarm
    const dailyCostAlarm = new cloudwatch.Alarm(this, 'DailyCostAlarm', {
      alarmName: 'aws-opportunity-analysis-daily-cost-alarm',
      alarmDescription: 'Alert when daily costs exceed threshold',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Billing',
        metricName: 'EstimatedCharges',
        dimensionsMap: {
          Currency: 'USD'
        },
        statistic: 'Maximum',
        period: Duration.hours(24)
      }),
      threshold: costThresholds.daily.warning,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });

    dailyCostAlarm.addAlarmAction(new actions.SnsAction(costAlertsTopic));

    // Monthly cost alarm
    const monthlyCostAlarm = new cloudwatch.Alarm(this, 'MonthlyCostAlarm', {
      alarmName: 'aws-opportunity-analysis-monthly-cost-alarm',
      alarmDescription: 'Alert when monthly costs exceed threshold',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Billing',
        metricName: 'EstimatedCharges',
        dimensionsMap: {
          Currency: 'USD'
        },
        statistic: 'Maximum',
        period: Duration.days(30)
      }),
      threshold: costThresholds.monthly.warning,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });

    monthlyCostAlarm.addAlarmAction(new actions.SnsAction(costAlertsTopic));

    // Create cost optimization dashboard
    const costDashboard = new cloudwatch.Dashboard(this, 'CostOptimizationDashboard', {
      dashboardName: 'AWS-Opportunity-Analysis-Cost-Optimization',
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: 'Daily Estimated Charges',
            left: [
              new cloudwatch.Metric({
                namespace: 'AWS/Billing',
                metricName: 'EstimatedCharges',
                dimensionsMap: { Currency: 'USD' },
                statistic: 'Maximum',
                period: Duration.hours(24)
              })
            ],
            width: 12,
            height: 6
          }),
          new cloudwatch.SingleValueWidget({
            title: 'Current Month Estimated Charges',
            metrics: [
              new cloudwatch.Metric({
                namespace: 'AWS/Billing',
                metricName: 'EstimatedCharges',
                dimensionsMap: { Currency: 'USD' },
                statistic: 'Maximum',
                period: Duration.days(1)
              })
            ],
            width: 12,
            height: 6
          })
        ],
        [
          new cloudwatch.GraphWidget({
            title: 'Lambda Invocations vs Cost',
            left: [
              new cloudwatch.Metric({
                namespace: 'AWS/Lambda',
                metricName: 'Invocations',
                statistic: 'Sum',
                period: Duration.hours(1)
              })
            ],
            right: [
              new cloudwatch.Metric({
                namespace: 'AWS/Lambda',
                metricName: 'Duration',
                statistic: 'Average',
                period: Duration.hours(1)
              })
            ],
            width: 24,
            height: 6
          })
        ]
      ]
    });

    // Output important values
    new CfnOutput(this, 'CostAlertTopicArn', {
      value: costAlertsTopic.topicArn,
      description: 'SNS Topic ARN for cost alerts'
    });

    new CfnOutput(this, 'CostMonitoringFunctionArn', {
      value: costMonitoringFunction.functionArn,
      description: 'Cost monitoring Lambda function ARN'
    });

    new CfnOutput(this, 'BudgetManagementFunctionArn', {
      value: budgetManagementFunction.functionArn,
      description: 'Budget management Lambda function ARN'
    });

    new CfnOutput(this, 'S3OptimizationFunctionArn', {
      value: s3OptimizationFunction.functionArn,
      description: 'S3 optimization Lambda function ARN'
    });

    new CfnOutput(this, 'ConcurrencyManagementFunctionArn', {
      value: concurrencyManagementFunction.functionArn,
      description: 'Lambda concurrency management function ARN'
    });

    new CfnOutput(this, 'CostDashboardUrl', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${costDashboard.dashboardName}`,
      description: 'Cost optimization dashboard URL'
    });

    // Store references for other stacks to use
    this.costAlertsTopic = costAlertsTopic;
    this.costMonitoringFunction = costMonitoringFunction;
    this.budgetManagementFunction = budgetManagementFunction;
    this.s3OptimizationFunction = s3OptimizationFunction;
    this.concurrencyManagementFunction = concurrencyManagementFunction;
  }
}

module.exports = { CostOptimizationStack };