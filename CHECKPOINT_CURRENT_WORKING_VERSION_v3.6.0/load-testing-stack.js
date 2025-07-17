const { Stack, Duration, RemovalPolicy } = require('aws-cdk-lib');
const { Construct } = require('constructs');
const ec2 = require('aws-cdk-lib/aws-ec2');
const ecs = require('aws-cdk-lib/aws-ecs');
const iam = require('aws-cdk-lib/aws-iam');
const logs = require('aws-cdk-lib/aws-logs');
const events = require('aws-cdk-lib/aws-events');
const targets = require('aws-cdk-lib/aws-events-targets');
const lambda = require('aws-cdk-lib/aws-lambda');
const s3 = require('aws-cdk-lib/aws-s3');
const cloudwatch = require('aws-cdk-lib/aws-cloudwatch');

/**
 * AWS Load Testing Stack using ECS Fargate for distributed load testing
 */
class LoadTestingStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // VPC for load testing infrastructure
    const vpc = new ec2.Vpc(this, 'LoadTestingVPC', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        }
      ]
    });

    // ECS Cluster for load testing
    const cluster = new ecs.Cluster(this, 'LoadTestingCluster', {
      vpc,
      clusterName: 'aws-opportunity-analysis-load-testing',
      containerInsights: true
    });

    // S3 bucket for test results
    const resultsBucket = new s3.Bucket(this, 'LoadTestResultsBucket', {
      bucketName: `aws-opportunity-analysis-load-test-results-${this.account}`,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: true,
      lifecycleRules: [{
        id: 'DeleteOldResults',
        expiration: Duration.days(30)
      }]
    });

    // IAM role for load testing tasks
    const taskRole = new iam.Role(this, 'LoadTestingTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
      ],
      inlinePolicies: {
        LoadTestingPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:PutObject',
                's3:GetObject',
                's3:DeleteObject'
              ],
              resources: [
                resultsBucket.bucketArn,
                `${resultsBucket.bucketArn}/*`
              ]
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'cloudwatch:PutMetricData',
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
              ],
              resources: ['*']
            })
          ]
        })
      }
    });

    // Task definition for Artillery.io load testing
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'LoadTestingTaskDefinition', {
      memoryLimitMiB: 2048,
      cpu: 1024,
      taskRole,
      executionRole: taskRole
    });

    // Container definition for Artillery load testing
    const container = taskDefinition.addContainer('LoadTestingContainer', {
      image: ecs.ContainerImage.fromRegistry('artilleryio/artillery:latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'load-testing',
        logGroup: new logs.LogGroup(this, 'LoadTestingLogGroup', {
          logGroupName: '/aws/ecs/load-testing',
          retention: logs.RetentionDays.ONE_WEEK,
          removalPolicy: RemovalPolicy.DESTROY
        })
      }),
      environment: {
        AWS_REGION: this.region,
        RESULTS_BUCKET: resultsBucket.bucketName,
        TARGET_URL: props?.targetUrl || 'http://localhost:8123'
      }
    });

    // Lambda function for orchestrating load tests
    const loadTestOrchestrator = new lambda.Function(this, 'LoadTestOrchestrator', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const ecs = new ECSClient();
const s3 = new S3Client();

exports.handler = async (event) => {
  console.log('Load test orchestrator triggered:', JSON.stringify(event, null, 2));
  
  const testConfig = event.testConfig || {
    duration: 300, // 5 minutes
    arrivalRate: 10,
    rampTo: 50
  };
  
  // Generate Artillery configuration
  const artilleryConfig = {
    config: {
      target: process.env.TARGET_URL,
      phases: [
        {
          duration: testConfig.duration,
          arrivalRate: testConfig.arrivalRate,
          rampTo: testConfig.rampTo
        }
      ],
      processor: './processor.js'
    },
    scenarios: [
      {
        name: 'Opportunity Analysis Load Test',
        weight: 100,
        flow: [
          {
            post: {
              url: '/api/analyze',
              headers: {
                'Content-Type': 'application/json'
              },
              json: {
                customerName: 'Load Test Customer {{ $randomString() }}',
                region: 'us-east-1',
                closeDate: '2024-12-31',
                opportunityName: 'Load Test Opportunity {{ $randomString() }}',
                description: 'This is a load test opportunity for performance testing'
              }
            }
          }
        ]
      }
    ]
  };
  
  // Save configuration to S3
  const configKey = \`load-tests/\${Date.now()}/artillery-config.yml\`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.RESULTS_BUCKET,
    Key: configKey,
    Body: JSON.stringify(artilleryConfig, null, 2),
    ContentType: 'application/json'
  }));
  
  // Run ECS task
  const runTaskParams = {
    cluster: process.env.CLUSTER_ARN,
    taskDefinition: process.env.TASK_DEFINITION_ARN,
    launchType: 'FARGATE',
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: process.env.SUBNET_IDS.split(','),
        securityGroups: [process.env.SECURITY_GROUP_ID],
        assignPublicIp: 'ENABLED'
      }
    },
    overrides: {
      containerOverrides: [
        {
          name: 'LoadTestingContainer',
          command: ['run', \`s3://\${process.env.RESULTS_BUCKET}/\${configKey}\`],
          environment: [
            { name: 'CONFIG_S3_KEY', value: configKey }
          ]
        }
      ]
    }
  };
  
  const result = await ecs.send(new RunTaskCommand(runTaskParams));
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Load test started successfully',
      taskArn: result.tasks[0].taskArn,
      configKey
    })
  };
};
      `),
      environment: {
        CLUSTER_ARN: cluster.clusterArn,
        TASK_DEFINITION_ARN: taskDefinition.taskDefinitionArn,
        RESULTS_BUCKET: resultsBucket.bucketName,
        TARGET_URL: props?.targetUrl || 'http://localhost:8123'
      },
      timeout: Duration.minutes(5)
    });

    // Grant permissions to orchestrator
    cluster.grantRunTask(loadTestOrchestrator, taskDefinition);
    resultsBucket.grantReadWrite(loadTestOrchestrator);

    // CloudWatch dashboard for load testing metrics
    const dashboard = new cloudwatch.Dashboard(this, 'LoadTestingDashboard', {
      dashboardName: 'AWS-Opportunity-Analysis-Load-Testing'
    });

    // Add widgets to dashboard
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Load Test Response Times',
        left: [
          new cloudwatch.Metric({
            namespace: 'LoadTesting/Artillery',
            metricName: 'ResponseTime',
            statistic: 'Average'
          })
        ],
        width: 12
      }),
      new cloudwatch.GraphWidget({
        title: 'Load Test Request Rate',
        left: [
          new cloudwatch.Metric({
            namespace: 'LoadTesting/Artillery',
            metricName: 'RequestRate',
            statistic: 'Sum'
          })
        ],
        width: 12
      })
    );

    // EventBridge rule for scheduled load tests
    const scheduleRule = new events.Rule(this, 'LoadTestSchedule', {
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '2', // Run at 2 AM daily
        day: '*',
        month: '*',
        year: '*'
      }),
      description: 'Daily load test execution'
    });

    scheduleRule.addTarget(new targets.LambdaFunction(loadTestOrchestrator, {
      event: events.RuleTargetInput.fromObject({
        testConfig: {
          duration: 600, // 10 minutes
          arrivalRate: 5,
          rampTo: 25
        }
      })
    }));

    // Outputs
    this.resultsBucket = resultsBucket;
    this.loadTestOrchestrator = loadTestOrchestrator;
    this.cluster = cluster;
    this.taskDefinition = taskDefinition;
  }
}

module.exports = { LoadTestingStack };