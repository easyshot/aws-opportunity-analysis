const { Stack, Duration, RemovalPolicy, CfnOutput, Tags } = require('aws-cdk-lib');
const apigateway = require('aws-cdk-lib/aws-apigateway');
const lambda = require('aws-cdk-lib/aws-lambda');
const iam = require('aws-cdk-lib/aws-iam');
const logs = require('aws-cdk-lib/aws-logs');
const ssm = require('aws-cdk-lib/aws-ssm');
const secretsmanager = require('aws-cdk-lib/aws-secretsmanager');
const xray = require('aws-cdk-lib/aws-xray');
const cloudwatch = require('aws-cdk-lib/aws-cloudwatch');
const s3 = require('aws-cdk-lib/aws-s3');
const cloudfront = require('aws-cdk-lib/aws-cloudfront');
const origins = require('aws-cdk-lib/aws-cloudfront-origins');
const stepfunctions = require('aws-cdk-lib/aws-stepfunctions');
const sfnTasks = require('aws-cdk-lib/aws-stepfunctions-tasks');
const fs = require('fs');
const path = require('path');
const { BedrockKnowledgeBaseStack } = require('./bedrock-knowledge-base-stack');
const { CloudFrontStack } = require('./cloudfront-stack');
const { CostOptimizationStack } = require('./cost-optimization-stack');

class AwsOpportunityAnalysisStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create Bedrock Knowledge Base Stack
    const knowledgeBaseStack = new BedrockKnowledgeBaseStack(this, 'KnowledgeBase', {
      env: props?.env
    });

    // Create S3 bucket for static website hosting
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `aws-opportunity-analysis-${this.account}-${this.region}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Create CloudFront Origin Access Identity
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: 'OAI for AWS Opportunity Analysis website',
    });

    // Grant CloudFront access to S3 bucket
    websiteBucket.grantRead(originAccessIdentity);

    // Create CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket, {
          originAccessIdentity: originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(30),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    // Create CloudWatch Log Groups
    const apiLogGroup = new logs.LogGroup(this, 'ApiLogGroup', {
      logGroupName: '/aws/apigateway/opportunity-analysis',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const lambdaLogGroup = new logs.LogGroup(this, 'LambdaLogGroup', {
      logGroupName: '/aws/lambda/opportunity-analysis',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Create X-Ray tracing configuration
    const xrayTracingConfig = new xray.CfnSamplingRule(this, 'XRayTracingRule', {
      samplingRule: {
        ruleName: 'OpportunityAnalysisTracing',
        priority: 9000,
        fixedRate: 0.1,
        reservoirSize: 1,
        serviceName: 'opportunity-analysis',
        serviceType: '*',
        host: '*',
        httpMethod: '*',
        urlPath: '*',
        version: 1,
      },
    });

    // Create Secrets Manager secret for sensitive credentials
    const appSecrets = new secretsmanager.Secret(this, 'AppSecrets', {
      secretName: 'opportunity-analysis/credentials',
      description: 'Sensitive credentials for AWS Opportunity Analysis application',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          bedrockPromptIds: {
            queryPromptId: 'Y6T66EI3GZ',
            analysisPromptId: 'FDUHITJIME',
            analysisPromptNovaPremierId: 'P03B9TO1Q1'
          }
        }),
        generateStringKey: 'apiKey',
        excludeCharacters: '"@/\\',
      },
    });

    // Create Systems Manager Parameter Store parameters
    const parameters = [
      {
        name: '/opportunity-analysis/config/aws-region',
        value: this.region,
        description: 'AWS region for the application'
      },
      {
        name: '/opportunity-analysis/config/athena-database',
        value: 'catapult_db_p',
        description: 'Athena database name'
      },
      {
        name: '/opportunity-analysis/config/athena-output-location',
        value: 's3://as-athena-catapult/',
        description: 'S3 location for Athena query results'
      },
      {
        name: '/opportunity-analysis/config/lambda-function-name',
        value: 'catapult_get_dataset',
        description: 'Lambda function name for dataset retrieval'
      },
      {
        name: '/opportunity-analysis/config/cloudfront-domain',
        value: distribution.distributionDomainName,
        description: 'CloudFront distribution domain name'
      }
    ];

    // Add knowledge base parameters
    parameters.push(
      {
        name: '/opportunity-analysis/config/knowledge-base-id',
        value: knowledgeBaseStack.knowledgeBaseId,
        description: 'Bedrock Knowledge Base ID for RAG functionality'
      },
      {
        name: '/opportunity-analysis/config/knowledge-base-data-source-id',
        value: knowledgeBaseStack.dataSourceId,
        description: 'Knowledge Base Data Source ID'
      },
      {
        name: '/opportunity-analysis/config/knowledge-base-bucket',
        value: knowledgeBaseStack.knowledgeBaseBucket.bucketName,
        description: 'S3 bucket for knowledge base data sources'
      },
      {
        name: '/opportunity-analysis/config/opensearch-collection-endpoint',
        value: knowledgeBaseStack.collectionEndpoint,
        description: 'OpenSearch Serverless collection endpoint'
      }
    );

    parameters.forEach((param, index) => {
      new ssm.StringParameter(this, `Parameter${index}`, {
        parameterName: param.name,
        stringValue: param.value,
        description: param.description,
        tier: ssm.ParameterTier.STANDARD,
      });
    });

    // Create IAM role for Lambda functions
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess'),
      ],
      inlinePolicies: {
        BedrockAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream',
                'bedrock-agent:GetPrompt',
                'bedrock-runtime:Converse',
                'bedrock-runtime:ConverseStream'
              ],
              resources: ['*'],
            }),
          ],
        }),
        AthenaAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'athena:StartQueryExecution',
                'athena:GetQueryExecution',
                'athena:GetQueryResults',
                'athena:StopQueryExecution',
                'athena:GetWorkGroup'
              ],
              resources: ['*'],
            }),
          ],
        }),
        S3Access: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:ListBucket'
              ],
              resources: [
                'arn:aws:s3:::as-athena-catapult/*',
                'arn:aws:s3:::as-athena-catapult',
                websiteBucket.bucketArn,
                `${websiteBucket.bucketArn}/*`
              ],
            }),
          ],
        }),
        ParameterStoreAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'ssm:GetParameter',
                'ssm:GetParameters',
                'ssm:GetParametersByPath'
              ],
              resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter/opportunity-analysis/*`],
            }),
          ],
        }),
        SecretsManagerAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'secretsmanager:GetSecretValue',
                'secretsmanager:DescribeSecret'
              ],
              resources: [appSecrets.secretArn],
            }),
          ],
        }),
      },
    }); 
   // Create Step Functions Lambda functions
    const queryGenerationFunction = new lambda.Function(this, 'QueryGenerationFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'query-generation.handler',
      code: lambda.Code.fromAsset('lambda'),
      role: lambdaRole,
      timeout: Duration.minutes(5),
      memorySize: 512,
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        POWERTOOLS_SERVICE_NAME: 'query-generation',
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    const dataRetrievalFunction = new lambda.Function(this, 'DataRetrievalFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'data-retrieval.handler',
      code: lambda.Code.fromAsset('lambda'),
      role: lambdaRole,
      timeout: Duration.minutes(10),
      memorySize: 1024,
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        POWERTOOLS_SERVICE_NAME: 'data-retrieval',
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    const opportunityAnalysisStepFunction = new lambda.Function(this, 'OpportunityAnalysisStepFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'opportunity-analysis.handler',
      code: lambda.Code.fromAsset('lambda'),
      role: lambdaRole,
      timeout: Duration.minutes(10),
      memorySize: 1024,
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        POWERTOOLS_SERVICE_NAME: 'opportunity-analysis',
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    const fundingAnalysisFunction = new lambda.Function(this, 'FundingAnalysisFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'funding-analysis.handler',
      code: lambda.Code.fromAsset('lambda'),
      role: lambdaRole,
      timeout: Duration.minutes(5),
      memorySize: 512,
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        POWERTOOLS_SERVICE_NAME: 'funding-analysis',
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    const followOnAnalysisFunction = new lambda.Function(this, 'FollowOnAnalysisFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'follow-on-analysis.handler',
      code: lambda.Code.fromAsset('lambda'),
      role: lambdaRole,
      timeout: Duration.minutes(5),
      memorySize: 512,
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        POWERTOOLS_SERVICE_NAME: 'follow-on-analysis',
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    // Create IAM role for Step Functions
    const stepFunctionsRole = new iam.Role(this, 'StepFunctionsExecutionRole', {
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      inlinePolicies: {
        LambdaInvokePolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'lambda:InvokeFunction'
              ],
              resources: [
                queryGenerationFunction.functionArn,
                dataRetrievalFunction.functionArn,
                opportunityAnalysisStepFunction.functionArn,
                fundingAnalysisFunction.functionArn,
                followOnAnalysisFunction.functionArn
              ],
            }),
          ],
        }),
        CloudWatchLogsPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:DescribeLogGroups',
                'logs:DescribeLogStreams'
              ],
              resources: ['*'],
            }),
          ],
        }),
        XRayPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'xray:PutTraceSegments',
                'xray:PutTelemetryRecords'
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // Load Step Functions state machine definitions
    const opportunityAnalysisDefinition = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'step-functions/opportunity-analysis-workflow.json'), 'utf8')
    );
    
    const fundingAnalysisDefinition = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'step-functions/funding-analysis-workflow.json'), 'utf8')
    );
    
    const followOnAnalysisDefinition = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'step-functions/follow-on-analysis-workflow.json'), 'utf8')
    );

    // Replace placeholders in state machine definitions
    const opportunityAnalysisDefinitionStr = JSON.stringify(opportunityAnalysisDefinition)
      .replace(/\$\{QueryGenerationLambdaArn\}/g, queryGenerationFunction.functionArn)
      .replace(/\$\{DataRetrievalLambdaArn\}/g, dataRetrievalFunction.functionArn)
      .replace(/\$\{StandardAnalysisLambdaArn\}/g, opportunityAnalysisStepFunction.functionArn)
      .replace(/\$\{NovaAnalysisLambdaArn\}/g, opportunityAnalysisStepFunction.functionArn);

    const fundingAnalysisDefinitionStr = JSON.stringify(fundingAnalysisDefinition)
      .replace(/\$\{FundingAnalysisLambdaArn\}/g, fundingAnalysisFunction.functionArn);

    const followOnAnalysisDefinitionStr = JSON.stringify(followOnAnalysisDefinition)
      .replace(/\$\{FollowOnQueryLambdaArn\}/g, queryGenerationFunction.functionArn)
      .replace(/\$\{DataRetrievalLambdaArn\}/g, dataRetrievalFunction.functionArn)
      .replace(/\$\{FollowOnAnalysisLambdaArn\}/g, followOnAnalysisFunction.functionArn);

    // Create Step Functions state machines
    const opportunityAnalysisStateMachine = new stepfunctions.StateMachine(this, 'OpportunityAnalysisStateMachine', {
      stateMachineName: 'OpportunityAnalysisWorkflow',
      definition: stepfunctions.DefinitionBody.fromString(opportunityAnalysisDefinitionStr),
      role: stepFunctionsRole,
      timeout: Duration.minutes(15),
      tracingEnabled: true,
      logs: {
        destination: new logs.LogGroup(this, 'OpportunityAnalysisStateMachineLogGroup', {
          logGroupName: '/aws/stepfunctions/opportunity-analysis',
          retention: logs.RetentionDays.ONE_MONTH,
          removalPolicy: RemovalPolicy.DESTROY,
        }),
        level: stepfunctions.LogLevel.ALL,
        includeExecutionData: true,
      },
    });

    const fundingAnalysisStateMachine = new stepfunctions.StateMachine(this, 'FundingAnalysisStateMachine', {
      stateMachineName: 'FundingAnalysisWorkflow',
      definition: stepfunctions.DefinitionBody.fromString(fundingAnalysisDefinitionStr),
      role: stepFunctionsRole,
      timeout: Duration.minutes(10),
      tracingEnabled: true,
      logs: {
        destination: new logs.LogGroup(this, 'FundingAnalysisStateMachineLogGroup', {
          logGroupName: '/aws/stepfunctions/funding-analysis',
          retention: logs.RetentionDays.ONE_MONTH,
          removalPolicy: RemovalPolicy.DESTROY,
        }),
        level: stepfunctions.LogLevel.ALL,
        includeExecutionData: true,
      },
    });

    const followOnAnalysisStateMachine = new stepfunctions.StateMachine(this, 'FollowOnAnalysisStateMachine', {
      stateMachineName: 'FollowOnAnalysisWorkflow',
      definition: stepfunctions.DefinitionBody.fromString(followOnAnalysisDefinitionStr),
      role: stepFunctionsRole,
      timeout: Duration.minutes(10),
      tracingEnabled: true,
      logs: {
        destination: new logs.LogGroup(this, 'FollowOnAnalysisStateMachineLogGroup', {
          logGroupName: '/aws/stepfunctions/follow-on-analysis',
          retention: logs.RetentionDays.ONE_MONTH,
          removalPolicy: RemovalPolicy.DESTROY,
        }),
        level: stepfunctions.LogLevel.ALL,
        includeExecutionData: true,
      },
    });   
 // Create Lambda function for opportunity analysis with Step Functions integration
    const opportunityAnalysisFunction = new lambda.Function(this, 'OpportunityAnalysisFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { SFNClient, StartExecutionCommand, DescribeExecutionCommand } = require('@aws-sdk/client-sfn');

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    const sfnClient = new SFNClient({ region: process.env.AWS_REGION });
    
    // Parse request body
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    
    // Determine which workflow to execute
    const workflowType = body.workflowType || 'opportunity';
    let stateMachineArn;
    
    switch (workflowType) {
      case 'opportunity':
        stateMachineArn = process.env.OPPORTUNITY_ANALYSIS_STATE_MACHINE_ARN;
        break;
      case 'funding':
        stateMachineArn = process.env.FUNDING_ANALYSIS_STATE_MACHINE_ARN;
        break;
      case 'followOn':
        stateMachineArn = process.env.FOLLOW_ON_ANALYSIS_STATE_MACHINE_ARN;
        break;
      default:
        stateMachineArn = process.env.OPPORTUNITY_ANALYSIS_STATE_MACHINE_ARN;
    }
    
    const input = {
      opportunityDetails: body,
      analysisOptions: {
        useNovaPremier: body.useNovaPremier || false,
        includeValidation: true
      }
    };

    const executionName = \`\${workflowType}-analysis-\${Date.now()}\`;
    
    const command = new StartExecutionCommand({
      stateMachineArn,
      name: executionName,
      input: JSON.stringify(input)
    });

    const result = await sfnClient.send(command);
    
    console.log('Step Functions execution started:', result.executionArn);
    
    // Wait for execution to complete (with timeout)
    const finalResult = await waitForExecution(sfnClient, result.executionArn);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
      },
      body: JSON.stringify(finalResult)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

async function waitForExecution(sfnClient, executionArn, maxWaitTime = 300000) {
  const startTime = Date.now();
  const pollInterval = 2000;
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const command = new DescribeExecutionCommand({ executionArn });
      const result = await sfnClient.send(command);
      
      if (result.status === 'SUCCEEDED') {
        return JSON.parse(result.output);
      } else if (['FAILED', 'TIMED_OUT', 'ABORTED'].includes(result.status)) {
        return {
          status: 'error',
          message: \`Execution \${result.status.toLowerCase()}: \${result.error || 'Unknown error'}\`,
          orchestrationType: 'step-functions'
        };
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      return {
        status: 'error',
        message: \`Error checking execution status: \${error.message}\`,
        orchestrationType: 'step-functions'
      };
    }
  }
  
  return {
    status: 'error',
    message: 'Execution wait timeout reached',
    orchestrationType: 'step-functions'
  };
}
      `),
      role: lambdaRole,
      timeout: Duration.minutes(15),
      memorySize: 1024,
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        POWERTOOLS_SERVICE_NAME: 'opportunity-analysis',
        POWERTOOLS_METRICS_NAMESPACE: 'OpportunityAnalysis',
        OPPORTUNITY_ANALYSIS_STATE_MACHINE_ARN: opportunityAnalysisStateMachine.stateMachineArn,
        FUNDING_ANALYSIS_STATE_MACHINE_ARN: fundingAnalysisStateMachine.stateMachineArn,
        FOLLOW_ON_ANALYSIS_STATE_MACHINE_ARN: followOnAnalysisStateMachine.stateMachineArn,
      },
      tracing: lambda.Tracing.ACTIVE,
      logGroup: lambdaLogGroup,
    });

    // Grant Step Functions execution permissions to the main Lambda function
    opportunityAnalysisStateMachine.grantStartExecution(opportunityAnalysisFunction);
    fundingAnalysisStateMachine.grantStartExecution(opportunityAnalysisFunction);
    followOnAnalysisStateMachine.grantStartExecution(opportunityAnalysisFunction);
    
    opportunityAnalysisStateMachine.grantRead(opportunityAnalysisFunction);
    fundingAnalysisStateMachine.grantRead(opportunityAnalysisFunction);
    followOnAnalysisStateMachine.grantRead(opportunityAnalysisFunction);

    // Create API Gateway REST API
    const api = new apigateway.RestApi(this, 'OpportunityAnalysisApi', {
      restApiName: 'AWS Opportunity Analysis API',
      description: 'API for AWS Opportunity Analysis application with Step Functions orchestration',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Amz-User-Agent'
        ],
      },
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
        cachingEnabled: true,
        cacheClusterEnabled: true,
        cacheClusterSize: '0.5',
        cacheTtl: Duration.minutes(5),
        accessLogDestination: new apigateway.LogGroupLogDestination(apiLogGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          caller: false,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true,
        }),
        tracingEnabled: true,
      },
      cloudWatchRole: true,
    });

    // Create API Gateway integration with Lambda
    const lambdaIntegration = new apigateway.LambdaIntegration(opportunityAnalysisFunction, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
      proxy: true,
    });

    // Create API resources and methods
    const apiResource = api.root.addResource('api');
    const analyzeResource = apiResource.addResource('analyze');
    
    analyzeResource.addMethod('POST', lambdaIntegration, {
      requestValidator: new apigateway.RequestValidator(this, 'RequestValidator', {
        restApi: api,
        validateRequestBody: true,
        validateRequestParameters: true,
      }),
    });

    analyzeResource.addMethod('OPTIONS', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
          'method.response.header.Access-Control-Allow-Origin': "'*'",
          'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
        },
      }],
      passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
      requestTemplates: {
        'application/json': '{"statusCode": 200}',
      },
    }), {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true,
          'method.response.header.Access-Control-Allow-Origin': true,
        },
      }],
    }); 
   // Create CloudWatch Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'OpportunityAnalysisDashboard', {
      dashboardName: 'AWS-Opportunity-Analysis-Monitoring',
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: 'API Gateway Requests',
            left: [api.metricCount()],
            right: [api.metricLatency()],
            width: 12,
          }),
          new cloudwatch.GraphWidget({
            title: 'API Gateway Errors',
            left: [api.metricClientError(), api.metricServerError()],
            width: 12,
          }),
        ],
        [
          new cloudwatch.GraphWidget({
            title: 'Lambda Function Metrics',
            left: [opportunityAnalysisFunction.metricInvocations()],
            right: [opportunityAnalysisFunction.metricDuration()],
            width: 12,
          }),
          new cloudwatch.GraphWidget({
            title: 'Lambda Function Errors',
            left: [opportunityAnalysisFunction.metricErrors()],
            width: 12,
          }),
        ],
        [
          new cloudwatch.GraphWidget({
            title: 'Step Functions Executions',
            left: [
              opportunityAnalysisStateMachine.metricStarted(),
              fundingAnalysisStateMachine.metricStarted(),
              followOnAnalysisStateMachine.metricStarted()
            ],
            width: 12,
          }),
          new cloudwatch.GraphWidget({
            title: 'Step Functions Execution Time',
            left: [
              opportunityAnalysisStateMachine.metricTime(),
              fundingAnalysisStateMachine.metricTime(),
              followOnAnalysisStateMachine.metricTime()
            ],
            width: 12,
          }),
        ],
      ],
    });

    // Create CloudWatch Alarms
    new cloudwatch.Alarm(this, 'HighErrorRateAlarm', {
      metric: api.metricServerError({
        period: Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 10,
      evaluationPeriods: 2,
      alarmDescription: 'High error rate detected in API Gateway',
    });

    new cloudwatch.Alarm(this, 'HighLatencyAlarm', {
      metric: api.metricLatency({
        period: Duration.minutes(5),
        statistic: 'Average',
      }),
      threshold: 5000, // 5 seconds
      evaluationPeriods: 3,
      alarmDescription: 'High latency detected in API Gateway',
    });

    new cloudwatch.Alarm(this, 'LambdaErrorAlarm', {
      metric: opportunityAnalysisFunction.metricErrors({
        period: Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 5,
      evaluationPeriods: 2,
      alarmDescription: 'High error rate detected in Lambda function',
    });

    new cloudwatch.Alarm(this, 'StepFunctionsFailureAlarm', {
      metric: opportunityAnalysisStateMachine.metricFailed({
        period: Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 3,
      evaluationPeriods: 2,
      alarmDescription: 'High failure rate detected in Step Functions',
    });

    // Output important values
    new CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront Distribution URL',
    });

    new CfnOutput(this, 'S3BucketName', {
      value: websiteBucket.bucketName,
      description: 'S3 Bucket Name for static website',
    });

    new CfnOutput(this, 'SecretsManagerArn', {
      value: appSecrets.secretArn,
      description: 'Secrets Manager ARN for application credentials',
    });

    new CfnOutput(this, 'OpportunityAnalysisStateMachineArn', {
      value: opportunityAnalysisStateMachine.stateMachineArn,
      description: 'Step Functions State Machine ARN for Opportunity Analysis',
    });

    new CfnOutput(this, 'FundingAnalysisStateMachineArn', {
      value: fundingAnalysisStateMachine.stateMachineArn,
      description: 'Step Functions State Machine ARN for Funding Analysis',
    });

    new CfnOutput(this, 'FollowOnAnalysisStateMachineArn', {
      value: followOnAnalysisStateMachine.stateMachineArn,
      description: 'Step Functions State Machine ARN for Follow-On Analysis',
    });
  }
}

    // Knowledge Base Outputs
    new CfnOutput(this, 'KnowledgeBaseId', {
      value: knowledgeBaseStack.knowledgeBaseId,
      description: 'Bedrock Knowledge Base ID for RAG functionality',
    });

    new CfnOutput(this, 'KnowledgeBaseDataSourceId', {
      value: knowledgeBaseStack.dataSourceId,
      description: 'Knowledge Base Data Source ID',
    });

    new CfnOutput(this, 'KnowledgeBaseBucketName', {
      value: knowledgeBaseStack.knowledgeBaseBucket.bucketName,
      description: 'S3 bucket name for knowledge base data sources',
    });

    new CfnOutput(this, 'OpenSearchCollectionEndpoint', {
      value: knowledgeBaseStack.collectionEndpoint,
      description: 'OpenSearch Serverless collection endpoint',
    });
  }
}

module.exports = { AwsOpportunityAnalysisStack };