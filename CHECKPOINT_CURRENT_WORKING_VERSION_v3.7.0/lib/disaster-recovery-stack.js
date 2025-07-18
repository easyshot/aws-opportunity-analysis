const { Stack, Duration, RemovalPolicy, CfnOutput } = require('aws-cdk-lib');
const { Construct } = require('constructs');
const dynamodb = require('aws-cdk-lib/aws-dynamodb');
const s3 = require('aws-cdk-lib/aws-s3');
const s3replication = require('aws-cdk-lib/aws-s3');
const route53 = require('aws-cdk-lib/aws-route53');
const route53targets = require('aws-cdk-lib/aws-route53-targets');
const cloudwatch = require('aws-cdk-lib/aws-cloudwatch');
const sns = require('aws-cdk-lib/aws-sns');
const lambda = require('aws-cdk-lib/aws-lambda');
const events = require('aws-cdk-lib/aws-events');
const targets = require('aws-cdk-lib/aws-events-targets');
const iam = require('aws-cdk-lib/aws-iam');

class DisasterRecoveryStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const { 
      primaryRegion = 'us-east-1',
      secondaryRegion = 'us-west-2',
      environment = 'production',
      domainName,
      hostedZoneId
    } = props;

    // Cross-region replication role for S3
    const replicationRole = new iam.Role(this, 'S3ReplicationRole', {
      assumedBy: new iam.ServicePrincipal('s3.amazonaws.com'),
      inlinePolicies: {
        ReplicationPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObjectVersionForReplication',
                's3:GetObjectVersionAcl',
                's3:GetObjectVersionTagging'
              ],
              resources: ['*']
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:ReplicateObject',
                's3:ReplicateDelete',
                's3:ReplicateTags'
              ],
              resources: ['*']
            })
          ]
        })
      }
    });

    // Primary S3 bucket with cross-region replication
    const primaryBucket = new s3.Bucket(this, 'PrimaryDataBucket', {
      bucketName: `aws-opportunity-analysis-primary-${environment}-${this.account}`,
      versioned: true,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          id: 'DeleteIncompleteMultipartUploads',
          abortIncompleteMultipartUploadAfter: Duration.days(7)
        },
        {
          id: 'TransitionToIA',
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: Duration.days(30)
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: Duration.days(90)
            }
          ]
        }
      ],
      replicationConfiguration: {
        role: replicationRole.roleArn,
        rules: [
          {
            id: 'ReplicateToSecondaryRegion',
            status: s3.BucketReplicationStatus.ENABLED,
            prefix: '',
            destination: {
              bucket: `arn:aws:s3:::aws-opportunity-analysis-secondary-${environment}-${this.account}`,
              storageClass: s3.StorageClass.STANDARD_IA
            }
          }
        ]
      }
    });

    // DynamoDB Global Tables for cross-region replication
    const analysisResultsTable = new dynamodb.Table(this, 'AnalysisResultsTable', {
      tableName: `opportunity-analysis-results-${environment}`,
      partitionKey: {
        name: 'opportunityId',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.NUMBER
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      replicationRegions: [secondaryRegion],
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
    });

    const userSessionsTable = new dynamodb.Table(this, 'UserSessionsTable', {
      tableName: `user-sessions-${environment}`,
      partitionKey: {
        name: 'sessionId',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      replicationRegions: [secondaryRegion],
      timeToLiveAttribute: 'ttl'
    });

    // SNS topic for disaster recovery alerts
    const drAlertsTopic = new sns.Topic(this, 'DisasterRecoveryAlerts', {
      topicName: `dr-alerts-${environment}`,
      displayName: 'Disaster Recovery Alerts'
    });

    // Health check Lambda function
    const healthCheckFunction = new lambda.Function(this, 'HealthCheckFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        const https = require('https');
        
        exports.handler = async (event) => {
          const results = {
            timestamp: new Date().toISOString(),
            region: process.env.AWS_REGION,
            checks: {}
          };
          
          try {
            // Check DynamoDB
            const dynamodb = new AWS.DynamoDB();
            await dynamodb.describeTable({
              TableName: process.env.ANALYSIS_RESULTS_TABLE
            }).promise();
            results.checks.dynamodb = 'healthy';
          } catch (error) {
            results.checks.dynamodb = 'unhealthy';
            results.checks.dynamodbError = error.message;
          }
          
          try {
            // Check S3
            const s3 = new AWS.S3();
            await s3.headBucket({
              Bucket: process.env.PRIMARY_BUCKET
            }).promise();
            results.checks.s3 = 'healthy';
          } catch (error) {
            results.checks.s3 = 'unhealthy';
            results.checks.s3Error = error.message;
          }
          
          try {
            // Check application endpoint
            const endpoint = process.env.APP_ENDPOINT;
            if (endpoint) {
              await new Promise((resolve, reject) => {
                const req = https.get(endpoint + '/api/health', (res) => {
                  if (res.statusCode === 200) {
                    results.checks.application = 'healthy';
                    resolve();
                  } else {
                    results.checks.application = 'unhealthy';
                    reject(new Error(\`Status: \${res.statusCode}\`));
                  }
                });
                req.on('error', reject);
                req.setTimeout(5000, () => reject(new Error('Timeout')));
              });
            }
          } catch (error) {
            results.checks.application = 'unhealthy';
            results.checks.applicationError = error.message;
          }
          
          // Determine overall health
          const unhealthyChecks = Object.values(results.checks).filter(
            status => status === 'unhealthy'
          );
          results.overallHealth = unhealthyChecks.length === 0 ? 'healthy' : 'unhealthy';
          
          // Send alert if unhealthy
          if (results.overallHealth === 'unhealthy') {
            const sns = new AWS.SNS();
            await sns.publish({
              TopicArn: process.env.ALERTS_TOPIC_ARN,
              Subject: \`Health Check Failed - \${process.env.AWS_REGION}\`,
              Message: JSON.stringify(results, null, 2)
            }).promise();
          }
          
          return {
            statusCode: results.overallHealth === 'healthy' ? 200 : 500,
            body: JSON.stringify(results)
          };
        };
      `),
      environment: {
        ANALYSIS_RESULTS_TABLE: analysisResultsTable.tableName,
        PRIMARY_BUCKET: primaryBucket.bucketName,
        ALERTS_TOPIC_ARN: drAlertsTopic.topicArn,
        APP_ENDPOINT: domainName ? `https://${domainName}` : ''
      },
      timeout: Duration.seconds(30)
    });

    // Grant permissions to health check function
    analysisResultsTable.grantReadData(healthCheckFunction);
    primaryBucket.grantRead(healthCheckFunction);
    drAlertsTopic.grantPublish(healthCheckFunction);

    // Schedule health checks every 5 minutes
    const healthCheckRule = new events.Rule(this, 'HealthCheckSchedule', {
      schedule: events.Schedule.rate(Duration.minutes(5))
    });
    healthCheckRule.addTarget(new targets.LambdaFunction(healthCheckFunction));

    // CloudWatch alarms for disaster recovery monitoring
    const dynamodbErrorAlarm = new cloudwatch.Alarm(this, 'DynamoDBErrorAlarm', {
      metric: analysisResultsTable.metricUserErrors(),
      threshold: 5,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    const s3ErrorAlarm = new cloudwatch.Alarm(this, 'S3ErrorAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/S3',
        metricName: '4xxErrors',
        dimensionsMap: {
          BucketName: primaryBucket.bucketName
        },
        statistic: 'Sum'
      }),
      threshold: 10,
      evaluationPeriods: 2
    });

    // Add alarms to SNS topic
    dynamodbErrorAlarm.addAlarmAction(
      new cloudwatch.SnsAction(drAlertsTopic)
    );
    s3ErrorAlarm.addAlarmAction(
      new cloudwatch.SnsAction(drAlertsTopic)
    );

    // Route 53 health check and failover (if domain provided)
    if (domainName && hostedZoneId) {
      const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
        hostedZoneId,
        zoneName: domainName
      });

      // Primary region health check
      const primaryHealthCheck = new route53.CfnHealthCheck(this, 'PrimaryHealthCheck', {
        type: 'HTTPS',
        resourcePath: '/api/health',
        fullyQualifiedDomainName: `primary.${domainName}`,
        requestInterval: 30,
        failureThreshold: 3
      });

      // Secondary region health check
      const secondaryHealthCheck = new route53.CfnHealthCheck(this, 'SecondaryHealthCheck', {
        type: 'HTTPS',
        resourcePath: '/api/health',
        fullyQualifiedDomainName: `secondary.${domainName}`,
        requestInterval: 30,
        failureThreshold: 3
      });

      // Primary record with failover
      new route53.ARecord(this, 'PrimaryRecord', {
        zone: hostedZone,
        recordName: domainName,
        target: route53.RecordTarget.fromIpAddresses('1.2.3.4'), // Replace with actual IP
        setIdentifier: 'primary',
        failover: route53.FailoverPolicy.PRIMARY,
        healthCheckId: primaryHealthCheck.attrHealthCheckId
      });

      // Secondary record with failover
      new route53.ARecord(this, 'SecondaryRecord', {
        zone: hostedZone,
        recordName: domainName,
        target: route53.RecordTarget.fromIpAddresses('5.6.7.8'), // Replace with actual IP
        setIdentifier: 'secondary',
        failover: route53.FailoverPolicy.SECONDARY,
        healthCheckId: secondaryHealthCheck.attrHealthCheckId
      });
    }

    // Outputs
    new CfnOutput(this, 'PrimaryBucketName', {
      value: primaryBucket.bucketName,
      description: 'Primary S3 bucket name'
    });

    new CfnOutput(this, 'AnalysisResultsTableName', {
      value: analysisResultsTable.tableName,
      description: 'DynamoDB table for analysis results'
    });

    new CfnOutput(this, 'UserSessionsTableName', {
      value: userSessionsTable.tableName,
      description: 'DynamoDB table for user sessions'
    });

    new CfnOutput(this, 'DrAlertsTopicArn', {
      value: drAlertsTopic.topicArn,
      description: 'SNS topic for disaster recovery alerts'
    });

    new CfnOutput(this, 'HealthCheckFunctionName', {
      value: healthCheckFunction.functionName,
      description: 'Health check Lambda function name'
    });
  }
}

module.exports = { DisasterRecoveryStack };