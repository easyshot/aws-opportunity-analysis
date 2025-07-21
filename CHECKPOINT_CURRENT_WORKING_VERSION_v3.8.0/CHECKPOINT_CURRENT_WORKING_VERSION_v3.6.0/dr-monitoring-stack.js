const { Stack, Duration, RemovalPolicy } = require('aws-cdk-lib');
const { Construct } = require('constructs');
const cloudwatch = require('aws-cdk-lib/aws-cloudwatch');
const sns = require('aws-cdk-lib/aws-sns');
const snsSubscriptions = require('aws-cdk-lib/aws-sns-subscriptions');
const lambda = require('aws-cdk-lib/aws-lambda');
const events = require('aws-cdk-lib/aws-events');
const targets = require('aws-cdk-lib/aws-events-targets');
const iam = require('aws-cdk-lib/aws-iam');
const logs = require('aws-cdk-lib/aws-logs');

class DrMonitoringStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const { 
      environment = 'production',
      primaryRegion = 'us-east-1',
      secondaryRegion = 'us-west-2',
      alertEmail,
      alertPhone
    } = props;

    // SNS Topics for different alert levels
    const criticalAlertsTopic = new sns.Topic(this, 'CriticalAlerts', {
      topicName: `dr-alerts-critical-${environment}`,
      displayName: 'Critical DR Alerts'
    });

    const warningAlertsTopic = new sns.Topic(this, 'WarningAlerts', {
      topicName: `dr-alerts-warning-${environment}`,
      displayName: 'Warning DR Alerts'
    });

    const infoAlertsTopic = new sns.Topic(this, 'InfoAlerts', {
      topicName: `dr-alerts-info-${environment}`,
      displayName: 'Info DR Alerts'
    });

    // Add email subscriptions if provided
    if (alertEmail) {
      criticalAlertsTopic.addSubscription(
        new snsSubscriptions.EmailSubscription(alertEmail)
      );
      warningAlertsTopic.addSubscription(
        new snsSubscriptions.EmailSubscription(alertEmail)
      );
    }

    // Add SMS subscriptions if provided
    if (alertPhone) {
      criticalAlertsTopic.addSubscription(
        new snsSubscriptions.SmsSubscription(alertPhone)
      );
    }

    // CloudWatch Log Group for DR events
    const drLogGroup = new logs.LogGroup(this, 'DrLogGroup', {
      logGroupName: `/aws/disaster-recovery/${environment}`,
      retention: logs.RetentionDays.ONE_YEAR,
      removalPolicy: RemovalPolicy.RETAIN
    });

    // Lambda function for comprehensive health monitoring
    const healthMonitorFunction = new lambda.Function(this, 'HealthMonitorFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      timeout: Duration.minutes(5),
      code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        
        const cloudwatch = new AWS.CloudWatch();
        const sns = new AWS.SNS();
        const dynamodb = new AWS.DynamoDB();
        const s3 = new AWS.S3();
        const lambda = new AWS.Lambda();
        const route53 = new AWS.Route53();
        
        exports.handler = async (event) => {
          console.log('Starting comprehensive health check...');
          
          const results = {
            timestamp: new Date().toISOString(),
            region: process.env.AWS_REGION,
            environment: process.env.ENVIRONMENT,
            checks: {},
            metrics: {},
            alerts: []
          };
          
          try {
            // Check DynamoDB Global Tables
            await checkDynamoDB(results);
            
            // Check S3 Cross-Region Replication
            await checkS3Replication(results);
            
            // Check Lambda Functions
            await checkLambdaFunctions(results);
            
            // Check Route 53 Health Checks
            await checkRoute53Health(results);
            
            // Check Backup Status
            await checkBackupStatus(results);
            
            // Calculate overall health score
            const healthScore = calculateHealthScore(results);
            results.overallHealth = healthScore;
            
            // Send custom metrics to CloudWatch
            await sendCustomMetrics(results);
            
            // Send alerts if necessary
            await processAlerts(results);
            
            // Log results
            console.log('Health check results:', JSON.stringify(results, null, 2));
            
            return {
              statusCode: 200,
              body: JSON.stringify(results)
            };
            
          } catch (error) {
            console.error('Health check failed:', error);
            
            await sns.publish({
              TopicArn: process.env.CRITICAL_ALERTS_TOPIC,
              Subject: 'DR Health Check Failed',
              Message: \`Health check failed with error: \${error.message}\`
            }).promise();
            
            throw error;
          }
        };
        
        async function checkDynamoDB(results) {
          try {
            const tableName = \`opportunity-analysis-results-\${process.env.ENVIRONMENT}\`;
            
            // Check table status
            const tableDesc = await dynamodb.describeTable({ TableName: tableName }).promise();
            const tableStatus = tableDesc.Table.TableStatus;
            
            // Check recent read/write activity
            const readMetrics = await cloudwatch.getMetricStatistics({
              Namespace: 'AWS/DynamoDB',
              MetricName: 'ConsumedReadCapacityUnits',
              Dimensions: [{ Name: 'TableName', Value: tableName }],
              StartTime: new Date(Date.now() - 300000), // 5 minutes ago
              EndTime: new Date(),
              Period: 300,
              Statistics: ['Sum']
            }).promise();
            
            results.checks.dynamodb = {
              status: tableStatus === 'ACTIVE' ? 'healthy' : 'unhealthy',
              tableStatus,
              recentReads: readMetrics.Datapoints.length > 0 ? readMetrics.Datapoints[0].Sum : 0
            };
            
          } catch (error) {
            results.checks.dynamodb = {
              status: 'error',
              error: error.message
            };
          }
        }
        
        async function checkS3Replication(results) {
          try {
            const primaryBucket = \`aws-opportunity-analysis-primary-\${process.env.ENVIRONMENT}-\${process.env.ACCOUNT_ID}\`;
            const secondaryBucket = \`aws-opportunity-analysis-secondary-\${process.env.ENVIRONMENT}-\${process.env.ACCOUNT_ID}\`;
            
            // Check bucket accessibility
            await s3.headBucket({ Bucket: primaryBucket }).promise();
            
            // Check replication configuration
            const replicationConfig = await s3.getBucketReplication({ Bucket: primaryBucket }).promise();
            
            results.checks.s3Replication = {
              status: replicationConfig.ReplicationConfiguration ? 'healthy' : 'warning',
              rulesCount: replicationConfig.ReplicationConfiguration?.Rules?.length || 0
            };
            
          } catch (error) {
            results.checks.s3Replication = {
              status: 'error',
              error: error.message
            };
          }
        }
        
        async function checkLambdaFunctions(results) {
          try {
            const functions = ['catapult_get_dataset', 'opportunity-analysis'];
            const functionChecks = {};
            
            for (const funcName of functions) {
              try {
                const funcConfig = await lambda.getFunction({ FunctionName: funcName }).promise();
                
                // Check recent invocations
                const errorMetrics = await cloudwatch.getMetricStatistics({
                  Namespace: 'AWS/Lambda',
                  MetricName: 'Errors',
                  Dimensions: [{ Name: 'FunctionName', Value: funcName }],
                  StartTime: new Date(Date.now() - 300000), // 5 minutes ago
                  EndTime: new Date(),
                  Period: 300,
                  Statistics: ['Sum']
                }).promise();
                
                functionChecks[funcName] = {
                  status: funcConfig.Configuration.State === 'Active' ? 'healthy' : 'unhealthy',
                  state: funcConfig.Configuration.State,
                  recentErrors: errorMetrics.Datapoints.length > 0 ? errorMetrics.Datapoints[0].Sum : 0
                };
                
              } catch (error) {
                functionChecks[funcName] = {
                  status: 'error',
                  error: error.message
                };
              }
            }
            
            results.checks.lambdaFunctions = functionChecks;
            
          } catch (error) {
            results.checks.lambdaFunctions = {
              status: 'error',
              error: error.message
            };
          }
        }
        
        async function checkRoute53Health(results) {
          try {
            const healthChecks = await route53.listHealthChecks().promise();
            const healthCheckResults = [];
            
            for (const healthCheck of healthChecks.HealthChecks) {
              const status = await route53.getHealthCheckStatus({
                HealthCheckId: healthCheck.Id
              }).promise();
              
              healthCheckResults.push({
                id: healthCheck.Id,
                status: status.CheckerIpRanges.length > 0 ? 'healthy' : 'unhealthy',
                checkerCount: status.CheckerIpRanges.length
              });
            }
            
            results.checks.route53Health = {
              status: healthCheckResults.every(hc => hc.status === 'healthy') ? 'healthy' : 'warning',
              healthChecks: healthCheckResults
            };
            
          } catch (error) {
            results.checks.route53Health = {
              status: 'error',
              error: error.message
            };
          }
        }
        
        async function checkBackupStatus(results) {
          try {
            const backup = new AWS.Backup();
            const vaultName = \`dr-backup-vault-\${process.env.ENVIRONMENT}\`;
            
            // Get recent backup jobs
            const backupJobs = await backup.listBackupJobs({
              ByBackupVaultName: vaultName,
              MaxResults: 10
            }).promise();
            
            const recentSuccessful = backupJobs.BackupJobs.filter(job => 
              job.State === 'COMPLETED' && 
              new Date(job.CreationDate) > new Date(Date.now() - 24 * 60 * 60 * 1000)
            );
            
            results.checks.backupStatus = {
              status: recentSuccessful.length > 0 ? 'healthy' : 'warning',
              recentSuccessfulBackups: recentSuccessful.length,
              totalRecentJobs: backupJobs.BackupJobs.length
            };
            
          } catch (error) {
            results.checks.backupStatus = {
              status: 'error',
              error: error.message
            };
          }
        }
        
        function calculateHealthScore(results) {
          const checks = Object.values(results.checks);
          const healthyCount = checks.filter(check => check.status === 'healthy').length;
          const totalCount = checks.length;
          
          if (totalCount === 0) return 0;
          
          const score = (healthyCount / totalCount) * 100;
          
          if (score >= 90) return 'excellent';
          if (score >= 75) return 'good';
          if (score >= 50) return 'fair';
          return 'poor';
        }
        
        async function sendCustomMetrics(results) {
          const metrics = [];
          
          // Overall health score
          const healthScore = results.overallHealth === 'excellent' ? 100 :
                             results.overallHealth === 'good' ? 75 :
                             results.overallHealth === 'fair' ? 50 : 25;
          
          metrics.push({
            MetricName: 'OverallHealthScore',
            Value: healthScore,
            Unit: 'Percent'
          });
          
          // Individual service metrics
          Object.entries(results.checks).forEach(([service, check]) => {
            metrics.push({
              MetricName: 'ServiceHealth',
              Dimensions: [{ Name: 'Service', Value: service }],
              Value: check.status === 'healthy' ? 1 : 0,
              Unit: 'Count'
            });
          });
          
          // Send metrics in batches
          const batchSize = 20;
          for (let i = 0; i < metrics.length; i += batchSize) {
            const batch = metrics.slice(i, i + batchSize);
            
            await cloudwatch.putMetricData({
              Namespace: 'DisasterRecovery',
              MetricData: batch
            }).promise();
          }
        }
        
        async function processAlerts(results) {
          const criticalIssues = [];
          const warningIssues = [];
          
          Object.entries(results.checks).forEach(([service, check]) => {
            if (check.status === 'error') {
              criticalIssues.push(\`\${service}: \${check.error}\`);
            } else if (check.status === 'unhealthy') {
              criticalIssues.push(\`\${service}: Service is unhealthy\`);
            } else if (check.status === 'warning') {
              warningIssues.push(\`\${service}: Service has warnings\`);
            }
          });
          
          // Send critical alerts
          if (criticalIssues.length > 0) {
            await sns.publish({
              TopicArn: process.env.CRITICAL_ALERTS_TOPIC,
              Subject: \`CRITICAL: DR Health Issues Detected\`,
              Message: \`Critical issues detected:\\n\\n\${criticalIssues.join('\\n')}\`
            }).promise();
          }
          
          // Send warning alerts
          if (warningIssues.length > 0) {
            await sns.publish({
              TopicArn: process.env.WARNING_ALERTS_TOPIC,
              Subject: \`WARNING: DR Health Warnings\`,
              Message: \`Warning issues detected:\\n\\n\${warningIssues.join('\\n')}\`
            }).promise();
          }
        }
      `),
      environment: {
        ENVIRONMENT: environment,
        ACCOUNT_ID: this.account,
        CRITICAL_ALERTS_TOPIC: criticalAlertsTopic.topicArn,
        WARNING_ALERTS_TOPIC: warningAlertsTopic.topicArn,
        INFO_ALERTS_TOPIC: infoAlertsTopic.topicArn
      }
    });

    // Grant permissions to health monitor function
    healthMonitorFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:DescribeTable',
        'dynamodb:ListTables',
        's3:GetBucketReplication',
        's3:HeadBucket',
        'lambda:GetFunction',
        'lambda:ListFunctions',
        'route53:ListHealthChecks',
        'route53:GetHealthCheckStatus',
        'backup:ListBackupJobs',
        'backup:DescribeBackupVault',
        'cloudwatch:GetMetricStatistics',
        'cloudwatch:PutMetricData',
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: ['*']
    }));

    criticalAlertsTopic.grantPublish(healthMonitorFunction);
    warningAlertsTopic.grantPublish(healthMonitorFunction);
    infoAlertsTopic.grantPublish(healthMonitorFunction);

    // Schedule health monitoring every 5 minutes
    const healthMonitorRule = new events.Rule(this, 'HealthMonitorSchedule', {
      schedule: events.Schedule.rate(Duration.minutes(5))
    });
    healthMonitorRule.addTarget(new targets.LambdaFunction(healthMonitorFunction));

    // CloudWatch Dashboard for DR monitoring
    const drDashboard = new cloudwatch.Dashboard(this, 'DrDashboard', {
      dashboardName: `DisasterRecoveryDashboard-${environment}`,
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: 'Overall Health Score',
            left: [
              new cloudwatch.Metric({
                namespace: 'DisasterRecovery',
                metricName: 'OverallHealthScore',
                statistic: 'Average'
              })
            ],
            width: 12,
            height: 6
          })
        ],
        [
          new cloudwatch.GraphWidget({
            title: 'Service Health Status',
            left: [
              new cloudwatch.Metric({
                namespace: 'DisasterRecovery',
                metricName: 'ServiceHealth',
                dimensionsMap: { Service: 'dynamodb' },
                statistic: 'Average'
              }),
              new cloudwatch.Metric({
                namespace: 'DisasterRecovery',
                metricName: 'ServiceHealth',
                dimensionsMap: { Service: 's3Replication' },
                statistic: 'Average'
              }),
              new cloudwatch.Metric({
                namespace: 'DisasterRecovery',
                metricName: 'ServiceHealth',
                dimensionsMap: { Service: 'lambdaFunctions' },
                statistic: 'Average'
              })
            ],
            width: 12,
            height: 6
          })
        ],
        [
          new cloudwatch.SingleValueWidget({
            title: 'DynamoDB Status',
            metrics: [
              new cloudwatch.Metric({
                namespace: 'AWS/DynamoDB',
                metricName: 'ConsumedReadCapacityUnits',
                dimensionsMap: { TableName: `opportunity-analysis-results-${environment}` },
                statistic: 'Sum'
              })
            ],
            width: 6,
            height: 6
          }),
          new cloudwatch.SingleValueWidget({
            title: 'Lambda Errors',
            metrics: [
              new cloudwatch.Metric({
                namespace: 'AWS/Lambda',
                metricName: 'Errors',
                dimensionsMap: { FunctionName: 'catapult_get_dataset' },
                statistic: 'Sum'
              })
            ],
            width: 6,
            height: 6
          })
        ]
      ]
    });

    // Critical alarms
    const overallHealthAlarm = new cloudwatch.Alarm(this, 'OverallHealthAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'DisasterRecovery',
        metricName: 'OverallHealthScore',
        statistic: 'Average'
      }),
      threshold: 75,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING
    });

    overallHealthAlarm.addAlarmAction(
      new cloudwatch.SnsAction(criticalAlertsTopic)
    );

    // Export important resources
    this.criticalAlertsTopic = criticalAlertsTopic;
    this.warningAlertsTopic = warningAlertsTopic;
    this.infoAlertsTopic = infoAlertsTopic;
    this.healthMonitorFunction = healthMonitorFunction;
    this.drDashboard = drDashboard;
  }
}

module.exports = { DrMonitoringStack };