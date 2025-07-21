/**
 * AWS CDK Stack for Advanced Error Handling Infrastructure
 * Creates SQS DLQs, Lambda functions, Step Functions, and SSM documents
 */

const { Stack, Duration, RemovalPolicy } = require('aws-cdk-lib');
const { Queue, DeadLetterQueue } = require('aws-cdk-lib/aws-sqs');
const { Function, Runtime, Code } = require('aws-cdk-lib/aws-lambda');
const { StateMachine, DefinitionBody, Pass, Choice, Condition, Wait, WaitTime } = require('aws-cdk-lib/aws-stepfunctions');
const { LambdaInvoke } = require('aws-cdk-lib/aws-stepfunctions-tasks');
const { Document, DocumentFormat } = require('aws-cdk-lib/aws-ssm');
const { Role, ServicePrincipal, PolicyStatement, Effect } = require('aws-cdk-lib/aws-iam');
const { Alarm, Metric, ComparisonOperator, TreatMissingData } = require('aws-cdk-lib/aws-cloudwatch');
const { SnsAction } = require('aws-cdk-lib/aws-cloudwatch-actions');
const { Topic } = require('aws-cdk-lib/aws-sns');
const { EmailSubscription } = require('aws-cdk-lib/aws-sns-subscriptions');

class ErrorHandlingStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create SNS topic for notifications
    const alertTopic = new Topic(this, 'ErrorHandlingAlerts', {
      displayName: 'Error Handling Alerts',
      topicName: 'opportunity-analysis-error-alerts'
    });

    // Add email subscription if provided
    if (props?.alertEmail) {
      alertTopic.addSubscription(new EmailSubscription(props.alertEmail));
    }

    // Create Dead Letter Queue for failed operations
    const deadLetterQueue = new Queue(this, 'ErrorHandlingDLQ', {
      queueName: 'opportunity-analysis-error-dlq',
      visibilityTimeout: Duration.minutes(5),
      messageRetentionPeriod: Duration.days(14),
      receiveMessageWaitTime: Duration.seconds(20)
    });

    // Create main error recovery queue
    const errorRecoveryQueue = new Queue(this, 'ErrorRecoveryQueue', {
      queueName: 'opportunity-analysis-error-recovery',
      visibilityTimeout: Duration.minutes(10),
      messageRetentionPeriod: Duration.days(7),
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 3
      }
    });

    // Create IAM role for error recovery Lambda
    const errorRecoveryRole = new Role(this, 'ErrorRecoveryLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole' }
      ]
    });

    // Add permissions for error recovery Lambda
    errorRecoveryRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'sqs:ReceiveMessage',
        'sqs:DeleteMessage',
        'sqs:SendMessage',
        'sqs:GetQueueAttributes',
        'bedrock:InvokeModel',
        'bedrock-runtime:Converse',
        'bedrock-agent:GetPrompt',
        'lambda:InvokeFunction',
        'cloudwatch:PutMetricData',
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'xray:PutTraceSegments',
        'xray:PutTelemetryRecords'
      ],
      resources: ['*']
    }));

    // Create error recovery Lambda function
    const errorRecoveryLambda = new Function(this, 'ErrorRecoveryLambda', {
      functionName: 'opportunity-analysis-error-recovery',
      runtime: Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: Code.fromInline(`
const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
const cloudWatchClient = new CloudWatchClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  console.log('Error recovery Lambda triggered:', JSON.stringify(event, null, 2));
  
  try {
    const { recoveryType, originalOperation, context } = event;
    
    let recoveryResult = { success: false, message: 'Unknown recovery type' };
    
    switch (recoveryType) {
      case 'bedrock_fallback':
        recoveryResult = await handleBedrockFallback(originalOperation, context);
        break;
      case 'lambda_recovery':
        recoveryResult = await handleLambdaRecovery(originalOperation, context);
        break;
      case 'network_recovery':
        recoveryResult = await handleNetworkRecovery(originalOperation, context);
        break;
      default:
        recoveryResult = await handleGenericRecovery(originalOperation, context);
    }
    
    // Record recovery metrics
    await recordMetric('ErrorRecoveryAttempts', 1, 'Count', [
      { Name: 'RecoveryType', Value: recoveryType },
      { Name: 'Success', Value: recoveryResult.success ? 'true' : 'false' }
    ]);
    
    return {
      statusCode: 200,
      body: JSON.stringify(recoveryResult)
    };
  } catch (error) {
    console.error('Error in recovery Lambda:', error);
    
    await recordMetric('ErrorRecoveryFailures', 1, 'Count');
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

async function handleBedrockFallback(operation, context) {
  try {
    console.log('Attempting Bedrock fallback recovery...');
    
    // Try with a simpler model or reduced parameters
    const fallbackPayload = {
      modelId: 'amazon.titan-text-lite-v1',
      messages: [{
        role: 'user',
        content: [{ text: 'Generate a simple SQL query for opportunity analysis' }]
      }],
      inferenceConfig: {
        maxTokens: 1000,
        temperature: 0.1
      }
    };
    
    const command = new ConverseCommand(fallbackPayload);
    const response = await bedrockClient.send(command);
    
    return {
      success: true,
      message: 'Bedrock fallback successful',
      result: response.output?.message?.content?.[0]?.text || 'Fallback query generated'
    };
  } catch (error) {
    console.error('Bedrock fallback failed:', error);
    return {
      success: false,
      message: 'Bedrock fallback failed: ' + error.message
    };
  }
}

async function handleLambdaRecovery(operation, context) {
  console.log('Attempting Lambda recovery...');
  
  // Simulate Lambda recovery logic
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: Math.random() > 0.3, // 70% success rate
    message: 'Lambda recovery attempted'
  };
}

async function handleNetworkRecovery(operation, context) {
  console.log('Attempting network recovery...');
  
  // Simulate network recovery logic
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    success: Math.random() > 0.2, // 80% success rate
    message: 'Network recovery attempted'
  };
}

async function handleGenericRecovery(operation, context) {
  console.log('Attempting generic recovery...');
  
  // Simulate generic recovery logic
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    success: Math.random() > 0.4, // 60% success rate
    message: 'Generic recovery attempted'
  };
}

async function recordMetric(metricName, value, unit, dimensions = []) {
  try {
    const command = new PutMetricDataCommand({
      Namespace: 'AWS/OpportunityAnalysis/ErrorRecovery',
      MetricData: [{
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Timestamp: new Date(),
        Dimensions: dimensions
      }]
    });
    
    await cloudWatchClient.send(command);
  } catch (error) {
    console.error('Failed to record metric:', error);
  }
}
      `),
      timeout: Duration.minutes(5),
      role: errorRecoveryRole,
      environment: {
        DLQ_URL: deadLetterQueue.queueUrl,
        RECOVERY_QUEUE_URL: errorRecoveryQueue.queueUrl
      }
    });

    // Create Step Functions role
    const stepFunctionsRole = new Role(this, 'ErrorRecoveryStateMachineRole', {
      assumedBy: new ServicePrincipal('states.amazonaws.com')
    });

    stepFunctionsRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'lambda:InvokeFunction',
        'sqs:SendMessage',
        'sqs:ReceiveMessage',
        'cloudwatch:PutMetricData',
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: ['*']
    }));

    // Create Step Functions state machine for error recovery workflow
    const errorRecoveryStateMachine = new StateMachine(this, 'ErrorRecoveryStateMachine', {
      stateMachineName: 'opportunity-analysis-error-recovery',
      role: stepFunctionsRole,
      definitionBody: DefinitionBody.fromChainable(
        new Choice(this, 'DetermineRecoveryStrategy')
          .when(
            Condition.stringEquals('$.recoveryType', 'bedrock_fallback'),
            new LambdaInvoke(this, 'BedrockFallbackRecovery', {
              lambdaFunction: errorRecoveryLambda,
              payload: {
                type: 'TaskToken',
                value: {
                  'recoveryType.$': '$.recoveryType',
                  'originalOperation.$': '$.originalOperation',
                  'context.$': '$.context'
                }
              }
            }).next(new Pass(this, 'BedrockRecoveryComplete'))
          )
          .when(
            Condition.stringEquals('$.recoveryType', 'lambda_recovery'),
            new Wait(this, 'WaitBeforeLambdaRecovery', {
              time: WaitTime.duration(Duration.seconds(30))
            }).next(
              new LambdaInvoke(this, 'LambdaRecovery', {
                lambdaFunction: errorRecoveryLambda,
                payload: {
                  type: 'TaskToken',
                  value: {
                    'recoveryType.$': '$.recoveryType',
                    'originalOperation.$': '$.originalOperation',
                    'context.$': '$.context'
                  }
                }
              })
            ).next(new Pass(this, 'LambdaRecoveryComplete'))
          )
          .otherwise(
            new LambdaInvoke(this, 'GenericRecovery', {
              lambdaFunction: errorRecoveryLambda,
              payload: {
                type: 'TaskToken',
                value: {
                  'recoveryType.$': '$.recoveryType',
                  'originalOperation.$': '$.originalOperation',
                  'context.$': '$.context'
                }
              }
            }).next(new Pass(this, 'GenericRecoveryComplete'))
          )
      ),
      timeout: Duration.minutes(15)
    });

    // Create SSM document for incident response
    const incidentResponseDocument = new Document(this, 'IncidentResponseDocument', {
      name: 'OpportunityAnalysis-IncidentResponse',
      documentFormat: DocumentFormat.YAML,
      documentType: 'Command',
      content: {
        schemaVersion: '2.2',
        description: 'Automated incident response for Opportunity Analysis application',
        parameters: {
          OperationName: {
            type: 'String',
            description: 'Name of the failed operation'
          },
          ErrorMessage: {
            type: 'String',
            description: 'Error message from the failed operation'
          },
          Context: {
            type: 'String',
            description: 'Additional context about the failure'
          },
          Severity: {
            type: 'String',
            description: 'Severity level of the incident',
            allowedValues: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            default: 'MEDIUM'
          },
          Timestamp: {
            type: 'String',
            description: 'Timestamp of the incident'
          }
        },
        mainSteps: [
          {
            action: 'aws:runShellScript',
            name: 'LogIncident',
            inputs: {
              runCommand: [
                'echo "=== INCIDENT RESPONSE TRIGGERED ==="',
                'echo "Operation: {{ OperationName }}"',
                'echo "Error: {{ ErrorMessage }}"',
                'echo "Severity: {{ Severity }}"',
                'echo "Timestamp: {{ Timestamp }}"',
                'echo "Context: {{ Context }}"',
                'echo "=== INCIDENT LOGGED ==="'
              ]
            }
          },
          {
            action: 'aws:runShellScript',
            name: 'NotifyTeam',
            inputs: {
              runCommand: [
                `aws sns publish --topic-arn ${alertTopic.topicArn} --message "INCIDENT: {{ OperationName }} failed with error: {{ ErrorMessage }}" --subject "Opportunity Analysis Incident - {{ Severity }}" --region ${this.region} || echo "Failed to send SNS notification"`
              ]
            }
          },
          {
            action: 'aws:runShellScript',
            name: 'TriggerRecovery',
            inputs: {
              runCommand: [
                `aws stepfunctions start-execution --state-machine-arn ${errorRecoveryStateMachine.stateMachineArn} --input '{"recoveryType":"generic_recovery","originalOperation":"{{ OperationName }}","context":{{ Context }}}' --region ${this.region} || echo "Failed to trigger recovery workflow"`
              ]
            }
          }
        ]
      }
    });

    // Create CloudWatch alarms for error monitoring
    const errorRateAlarm = new Alarm(this, 'HighErrorRateAlarm', {
      alarmName: 'OpportunityAnalysis-HighErrorRate',
      alarmDescription: 'High error rate detected in Opportunity Analysis',
      metric: new Metric({
        namespace: 'AWS/OpportunityAnalysis/ErrorHandling',
        metricName: 'OperationErrors',
        statistic: 'Sum',
        period: Duration.minutes(5)
      }),
      threshold: 10,
      evaluationPeriods: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING
    });

    errorRateAlarm.addAlarmAction(new SnsAction(alertTopic));

    const circuitBreakerAlarm = new Alarm(this, 'CircuitBreakerOpenAlarm', {
      alarmName: 'OpportunityAnalysis-CircuitBreakerOpen',
      alarmDescription: 'Circuit breaker opened for critical operations',
      metric: new Metric({
        namespace: 'AWS/OpportunityAnalysis/ErrorHandling',
        metricName: 'CircuitBreakerOpened',
        statistic: 'Sum',
        period: Duration.minutes(1)
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING
    });

    circuitBreakerAlarm.addAlarmAction(new SnsAction(alertTopic));

    const dlqMessagesAlarm = new Alarm(this, 'DLQMessagesAlarm', {
      alarmName: 'OpportunityAnalysis-DLQMessages',
      alarmDescription: 'Messages accumulating in Dead Letter Queue',
      metric: deadLetterQueue.metricApproximateNumberOfVisibleMessages({
        period: Duration.minutes(5)
      }),
      threshold: 5,
      evaluationPeriods: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING
    });

    dlqMessagesAlarm.addAlarmAction(new SnsAction(alertTopic));

    // Grant permissions for the incident response document
    incidentResponseDocument.grantExecute(new ServicePrincipal('ssm.amazonaws.com'));

    // Output important ARNs and URLs
    this.deadLetterQueueUrl = deadLetterQueue.queueUrl;
    this.errorRecoveryQueueUrl = errorRecoveryQueue.queueUrl;
    this.errorRecoveryLambdaArn = errorRecoveryLambda.functionArn;
    this.errorRecoveryStateMachineArn = errorRecoveryStateMachine.stateMachineArn;
    this.incidentResponseDocumentName = incidentResponseDocument.name;
    this.alertTopicArn = alertTopic.topicArn;
  }
}

module.exports = { ErrorHandlingStack };