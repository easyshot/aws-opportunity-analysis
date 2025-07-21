const { Stack, Duration, RemovalPolicy } = require('aws-cdk-lib');
const { Construct } = require('constructs');
const iam = require('aws-cdk-lib/aws-iam');
const lambda = require('aws-cdk-lib/aws-lambda');
const events = require('aws-cdk-lib/aws-events');
const targets = require('aws-cdk-lib/aws-events-targets');
const logs = require('aws-cdk-lib/aws-logs');
const sns = require('aws-cdk-lib/aws-sns');
const subscriptions = require('aws-cdk-lib/aws-sns-subscriptions');
const cloudwatch = require('aws-cdk-lib/aws-cloudwatch');
const actions = require('aws-cdk-lib/aws-cloudwatch-actions');

/**
 * Chaos Engineering Stack using AWS Fault Injection Simulator
 */
class ChaosEngineeringStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // SNS topic for chaos engineering notifications
    const chaosTopic = new sns.Topic(this, 'ChaosEngineeringTopic', {
      topicName: 'aws-opportunity-analysis-chaos-engineering',
      displayName: 'Chaos Engineering Notifications'
    });

    // Add email subscription if provided
    if (props?.notificationEmail) {
      chaosTopic.addSubscription(
        new subscriptions.EmailSubscription(props.notificationEmail)
      );
    }

    // IAM role for Fault Injection Simulator
    const fisRole = new iam.Role(this, 'FISRole', {
      assumedBy: new iam.ServicePrincipal('fis.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSFaultInjectionSimulatorEC2Role'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSFaultInjectionSimulatorECSRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSFaultInjectionSimulatorRDSRole')
      ],
      inlinePolicies: {
        ChaosEngineeringPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'lambda:InvokeFunction',
                'lambda:GetFunction',
                'lambda:UpdateFunctionConfiguration',
                'apigateway:GET',
                'apigateway:POST',
                'cloudwatch:PutMetricData',
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'sns:Publish'
              ],
              resources: ['*']
            })
          ]
        })
      }
    });

    // Lambda function for chaos experiment orchestration
    const chaosOrchestrator = new lambda.Function(this, 'ChaosOrchestrator', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { FISClient, StartExperimentCommand, GetExperimentCommand, StopExperimentCommand } = require('@aws-sdk/client-fis');
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const fis = new FISClient();
const cloudwatch = new CloudWatchClient();
const sns = new SNSClient();

exports.handler = async (event) => {
  console.log('Chaos orchestrator triggered:', JSON.stringify(event, null, 2));
  
  const action = event.action || 'start';
  const experimentType = event.experimentType || 'lambda-latency';
  
  try {
    switch (action) {
      case 'start':
        return await startChaosExperiment(experimentType, event.parameters);
      case 'stop':
        return await stopChaosExperiment(event.experimentId);
      case 'status':
        return await getChaosExperimentStatus(event.experimentId);
      default:
        throw new Error(\`Unknown action: \${action}\`);
    }
  } catch (error) {
    console.error('Chaos experiment error:', error);
    
    // Send notification
    await sns.send(new PublishCommand({
      TopicArn: process.env.CHAOS_TOPIC_ARN,
      Subject: 'Chaos Engineering Experiment Failed',
      Message: \`Chaos experiment failed: \${error.message}\`
    }));
    
    throw error;
  }
};

async function startChaosExperiment(experimentType, parameters = {}) {
  const experiments = {
    'lambda-latency': {
      description: 'Inject latency into Lambda functions',
      targets: {
        'lambda-functions': {
          resourceType: 'aws:lambda:function',
          resourceTags: {
            'Environment': 'production'
          },
          selectionMode: 'PERCENT(50)'
        }
      },
      actions: {
        'inject-latency': {
          actionId: 'aws:lambda:invoke-api',
          parameters: {
            duration: 'PT10M',
            latencyMs: parameters.latencyMs || '2000'
          },
          targets: {
            Functions: 'lambda-functions'
          }
        }
      }
    },
    'api-throttling': {
      description: 'Throttle API Gateway requests',
      targets: {
        'api-gateway': {
          resourceType: 'aws:apigateway:stage',
          resourceTags: {
            'Environment': 'production'
          },
          selectionMode: 'ALL'
        }
      },
      actions: {
        'throttle-requests': {
          actionId: 'aws:apigateway:throttle-api',
          parameters: {
            duration: 'PT5M',
            throttleRate: parameters.throttleRate || '10'
          },
          targets: {
            Stages: 'api-gateway'
          }
        }
      }
    },
    'network-latency': {
      description: 'Inject network latency',
      targets: {
        'ec2-instances': {
          resourceType: 'aws:ec2:instance',
          resourceTags: {
            'Environment': 'production'
          },
          selectionMode: 'PERCENT(25)'
        }
      },
      actions: {
        'network-latency': {
          actionId: 'aws:network:latency',
          parameters: {
            duration: 'PT10M',
            latencyMs: parameters.networkLatencyMs || '1000'
          },
          targets: {
            Instances: 'ec2-instances'
          }
        }
      }
    }
  };
  
  const experiment = experiments[experimentType];
  if (!experiment) {
    throw new Error(\`Unknown experiment type: \${experimentType}\`);
  }
  
  // Create experiment template (this would typically be done via CDK)
  const experimentTemplate = {
    description: experiment.description,
    roleArn: process.env.FIS_ROLE_ARN,
    targets: experiment.targets,
    actions: experiment.actions,
    stopConditions: [
      {
        source: 'aws:cloudwatch:alarm',
        value: process.env.STOP_CONDITION_ALARM_ARN
      }
    ],
    tags: {
      'Project': 'AWS-Opportunity-Analysis',
      'Type': 'ChaosEngineering'
    }
  };
  
  // Start experiment
  const result = await fis.send(new StartExperimentCommand({
    experimentTemplateId: process.env.EXPERIMENT_TEMPLATE_ID,
    tags: experimentTemplate.tags
  }));
  
  // Send notification
  await sns.send(new PublishCommand({
    TopicArn: process.env.CHAOS_TOPIC_ARN,
    Subject: 'Chaos Engineering Experiment Started',
    Message: \`Chaos experiment '\${experimentType}' started with ID: \${result.experiment.id}\`
  }));
  
  // Record metric
  await cloudwatch.send(new PutMetricDataCommand({
    Namespace: 'ChaosEngineering',
    MetricData: [
      {
        MetricName: 'ExperimentStarted',
        Value: 1,
        Unit: 'Count',
        Dimensions: [
          {
            Name: 'ExperimentType',
            Value: experimentType
          }
        ]
      }
    ]
  }));
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Chaos experiment started successfully',
      experimentId: result.experiment.id,
      experimentType
    })
  };
}

async function stopChaosExperiment(experimentId) {
  const result = await fis.send(new StopExperimentCommand({
    id: experimentId
  }));
  
  await sns.send(new PublishCommand({
    TopicArn: process.env.CHAOS_TOPIC_ARN,
    Subject: 'Chaos Engineering Experiment Stopped',
    Message: \`Chaos experiment stopped: \${experimentId}\`
  }));
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Chaos experiment stopped successfully',
      experimentId
    })
  };
}

async function getChaosExperimentStatus(experimentId) {
  const result = await fis.send(new GetExperimentCommand({
    id: experimentId
  }));
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      experimentId,
      state: result.experiment.state,
      startTime: result.experiment.startTime,
      endTime: result.experiment.endTime
    })
  };
}
      `),
      environment: {
        FIS_ROLE_ARN: fisRole.roleArn,
        CHAOS_TOPIC_ARN: chaosTopic.topicArn,
        EXPERIMENT_TEMPLATE_ID: 'EXT123456789' // This would be created separately
      },
      timeout: Duration.minutes(5)
    });

    // Grant permissions to chaos orchestrator
    chaosOrchestrator.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'fis:StartExperiment',
        'fis:StopExperiment',
        'fis:GetExperiment',
        'fis:ListExperiments'
      ],
      resources: ['*']
    }));

    chaosTopic.grantPublish(chaosOrchestrator);

    // Lambda function for chaos experiment monitoring
    const chaosMonitor = new lambda.Function(this, 'ChaosMonitor', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { CloudWatchClient, GetMetricStatisticsCommand } = require('@aws-sdk/client-cloudwatch');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const cloudwatch = new CloudWatchClient();
const sns = new SNSClient();

exports.handler = async (event) => {
  console.log('Chaos monitor triggered:', JSON.stringify(event, null, 2));
  
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 15 * 60 * 1000); // Last 15 minutes
  
  try {
    // Check error rates
    const errorRateMetrics = await cloudwatch.send(new GetMetricStatisticsCommand({
      Namespace: 'AWS/Lambda',
      MetricName: 'Errors',
      Dimensions: [
        {
          Name: 'FunctionName',
          Value: 'opportunity-analysis'
        }
      ],
      StartTime: startTime,
      EndTime: endTime,
      Period: 300,
      Statistics: ['Sum']
    }));
    
    // Check response times
    const latencyMetrics = await cloudwatch.send(new GetMetricStatisticsCommand({
      Namespace: 'AWS/Lambda',
      MetricName: 'Duration',
      Dimensions: [
        {
          Name: 'FunctionName',
          Value: 'opportunity-analysis'
        }
      ],
      StartTime: startTime,
      EndTime: endTime,
      Period: 300,
      Statistics: ['Average']
    }));
    
    // Analyze metrics and determine if chaos experiment should be stopped
    const errorRate = calculateErrorRate(errorRateMetrics.Datapoints);
    const avgLatency = calculateAverageLatency(latencyMetrics.Datapoints);
    
    const report = {
      timestamp: new Date().toISOString(),
      errorRate,
      avgLatency,
      status: 'healthy'
    };
    
    // Check thresholds
    if (errorRate > 10) { // 10% error rate threshold
      report.status = 'unhealthy';
      report.reason = 'High error rate detected';
    } else if (avgLatency > 30000) { // 30 second latency threshold
      report.status = 'unhealthy';
      report.reason = 'High latency detected';
    }
    
    // Send notification if unhealthy
    if (report.status === 'unhealthy') {
      await sns.send(new PublishCommand({
        TopicArn: process.env.CHAOS_TOPIC_ARN,
        Subject: 'Chaos Engineering Alert: System Unhealthy',
        Message: JSON.stringify(report, null, 2)
      }));
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify(report)
    };
    
  } catch (error) {
    console.error('Chaos monitoring error:', error);
    throw error;
  }
};

function calculateErrorRate(datapoints) {
  if (!datapoints || datapoints.length === 0) return 0;
  const totalErrors = datapoints.reduce((sum, point) => sum + (point.Sum || 0), 0);
  return totalErrors / datapoints.length;
}

function calculateAverageLatency(datapoints) {
  if (!datapoints || datapoints.length === 0) return 0;
  const totalLatency = datapoints.reduce((sum, point) => sum + (point.Average || 0), 0);
  return totalLatency / datapoints.length;
}
      `),
      environment: {
        CHAOS_TOPIC_ARN: chaosTopic.topicArn
      },
      timeout: Duration.minutes(2)
    });

    chaosTopic.grantPublish(chaosMonitor);

    // CloudWatch alarm for stopping chaos experiments
    const stopConditionAlarm = new cloudwatch.Alarm(this, 'ChaosStopCondition', {
      alarmName: 'aws-opportunity-analysis-chaos-stop-condition',
      alarmDescription: 'Stop chaos experiments when error rate is too high',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Errors',
        dimensionsMap: {
          FunctionName: 'opportunity-analysis'
        },
        statistic: 'Sum'
      }),
      threshold: 10,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    stopConditionAlarm.addAlarmAction(new actions.SnsAction(chaosTopic));

    // EventBridge rule for scheduled chaos experiments
    const chaosScheduleRule = new events.Rule(this, 'ChaosSchedule', {
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '10', // Run at 10 AM on weekdays
        day: 'MON-FRI',
        month: '*',
        year: '*'
      }),
      description: 'Weekly chaos engineering experiments'
    });

    chaosScheduleRule.addTarget(new targets.LambdaFunction(chaosOrchestrator, {
      event: events.RuleTargetInput.fromObject({
        action: 'start',
        experimentType: 'lambda-latency',
        parameters: {
          latencyMs: '1000'
        }
      })
    }));

    // EventBridge rule for chaos monitoring
    const monitoringRule = new events.Rule(this, 'ChaosMonitoringSchedule', {
      schedule: events.Schedule.rate(Duration.minutes(5)),
      description: 'Monitor system health during chaos experiments'
    });

    monitoringRule.addTarget(new targets.LambdaFunction(chaosMonitor));

    // CloudWatch dashboard for chaos engineering
    const chaosDashboard = new cloudwatch.Dashboard(this, 'ChaosEngineeringDashboard', {
      dashboardName: 'AWS-Opportunity-Analysis-Chaos-Engineering'
    });

    chaosDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Error Rate During Chaos Experiments',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Errors',
            statistic: 'Sum'
          })
        ],
        width: 12
      }),
      new cloudwatch.GraphWidget({
        title: 'Response Time During Chaos Experiments',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Duration',
            statistic: 'Average'
          })
        ],
        width: 12
      })
    );

    // Outputs
    this.chaosOrchestrator = chaosOrchestrator;
    this.chaosMonitor = chaosMonitor;
    this.chaosTopic = chaosTopic;
    this.fisRole = fisRole;
  }
}

module.exports = { ChaosEngineeringStack };