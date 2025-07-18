/**
 * Security Enhancements for AWS Opportunity Analysis
 * 
 * This module provides additional security configurations and fixes
 * for the main security stack implementation.
 */

const { Stack, Duration, RemovalPolicy, CfnOutput } = require('aws-cdk-lib');
const iam = require('aws-cdk-lib/aws-iam');
const apigateway = require('aws-cdk-lib/aws-apigateway');
const wafv2 = require('aws-cdk-lib/aws-wafv2');
const cloudwatch = require('aws-cdk-lib/aws-cloudwatch');
const cw_actions = require('aws-cdk-lib/aws-cloudwatch-actions');
const sns = require('aws-cdk-lib/aws-sns');
const ssm = require('aws-cdk-lib/aws-ssm');

class SecurityEnhancementsStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Import existing security resources
    const webAclArn = ssm.StringParameter.valueForStringParameter(
      this,
      '/opportunity-analysis/security/waf-web-acl-arn'
    );

    const securityAlertsTopicArn = ssm.StringParameter.valueForStringParameter(
      this,
      '/opportunity-analysis/security/alerts-topic-arn'
    );

    const securityAlertsTopic = sns.Topic.fromTopicArn(
      this,
      'SecurityAlertsTopic',
      securityAlertsTopicArn
    );

    // Create API Gateway with WAF association
    const api = new apigateway.RestApi(this, 'OpportunityAnalysisAPI', {
      restApiName: 'AWS Opportunity Analysis API',
      description: 'API for AWS Opportunity Analysis with security controls',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 1000,
        throttlingBurstLimit: 2000,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [new iam.AnyPrincipal()],
            actions: ['execute-api:Invoke'],
            resources: ['*'],
            conditions: {
              IpAddress: {
                'aws:SourceIp': [
                  '0.0.0.0/0', // Allow all IPs - WAF will handle filtering
                ],
              },
            },
          }),
        ],
      }),
    });

    // Associate WAF with API Gateway
    new wafv2.CfnWebACLAssociation(this, 'APIGatewayWAFAssociation', {
      resourceArn: `arn:aws:apigateway:${this.region}::/restapis/${api.restApiId}/stages/prod`,
      webAclArn: webAclArn,
    });

    // Create API Gateway resources and methods
    const analyzeResource = api.root.addResource('analyze');
    const healthResource = api.root.addResource('health');

    // Add Lambda integration (placeholder - will be connected to actual Lambda)
    const lambdaIntegration = new apigateway.LambdaIntegration(
      // This will be replaced with actual Lambda function reference
      new iam.Role(this, 'PlaceholderRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      }),
      {
        requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
      }
    );

    analyzeResource.addMethod('POST', lambdaIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE,
      requestValidator: new apigateway.RequestValidator(this, 'RequestValidator', {
        restApi: api,
        requestValidatorName: 'Validate body and parameters',
        validateRequestBody: true,
        validateRequestParameters: true,
      }),
      requestModels: {
        'application/json': new apigateway.Model(this, 'AnalyzeRequestModel', {
          restApi: api,
          contentType: 'application/json',
          modelName: 'AnalyzeRequest',
          schema: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
              customerName: { type: apigateway.JsonSchemaType.STRING },
              region: { type: apigateway.JsonSchemaType.STRING },
              closeDate: { type: apigateway.JsonSchemaType.STRING },
              opportunityName: { type: apigateway.JsonSchemaType.STRING },
              description: { type: apigateway.JsonSchemaType.STRING },
            },
            required: ['customerName', 'region', 'closeDate', 'opportunityName', 'description'],
          },
        }),
      },
    });

    healthResource.addMethod('GET', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
        responseTemplates: {
          'application/json': '{"status": "healthy", "timestamp": "$context.requestTime"}',
        },
      }],
      requestTemplates: {
        'application/json': '{"statusCode": 200}',
      },
    }), {
      methodResponses: [{
        statusCode: '200',
        responseModels: {
          'application/json': apigateway.Model.EMPTY_MODEL,
        },
      }],
    });

    // Enhanced security monitoring
    const unauthorizedAccessAlarm = new cloudwatch.Alarm(this, 'UnauthorizedAccessAlarm', {
      alarmName: 'OpportunityAnalysis-UnauthorizedAccess',
      alarmDescription: 'Detects unauthorized access attempts',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '4XXError',
        dimensionsMap: {
          ApiName: api.restApiName,
        },
        statistic: 'Sum',
        period: Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    unauthorizedAccessAlarm.addAlarmAction(new cw_actions.SnsAction(securityAlertsTopic));

    const highLatencyAlarm = new cloudwatch.Alarm(this, 'HighLatencyAlarm', {
      alarmName: 'OpportunityAnalysis-HighLatency',
      alarmDescription: 'Detects high API latency which could indicate attacks',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: 'Latency',
        dimensionsMap: {
          ApiName: api.restApiName,
        },
        statistic: 'Average',
        period: Duration.minutes(5),
      }),
      threshold: 10000, // 10 seconds
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    highLatencyAlarm.addAlarmAction(new cw_actions.SnsAction(securityAlertsTopic));

    // Create additional IAM policies for enhanced security
    const apiGatewayExecutionPolicy = new iam.ManagedPolicy(this, 'APIGatewayExecutionPolicy', {
      managedPolicyName: 'OpportunityAnalysis-APIGateway-Execution',
      description: 'Policy for API Gateway execution with security controls',
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents',
            'logs:DescribeLogGroups',
            'logs:DescribeLogStreams',
          ],
          resources: [
            `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/apigateway/*`,
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'xray:PutTraceSegments',
            'xray:PutTelemetryRecords',
          ],
          resources: ['*'],
        }),
      ],
    });

    // Create security compliance checks
    const complianceRole = new iam.Role(this, 'ComplianceRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        CompliancePolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'config:GetComplianceDetailsByConfigRule',
                'config:GetComplianceDetailsByResource',
                'config:DescribeComplianceByConfigRule',
                'config:DescribeComplianceByResource',
              ],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'guardduty:GetFindings',
                'guardduty:ListFindings',
                'guardduty:GetDetector',
              ],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'accessanalyzer:GetAnalyzedResource',
                'accessanalyzer:GetFinding',
                'accessanalyzer:ListFindings',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // Store important values in Parameter Store for other stacks
    new ssm.StringParameter(this, 'APIGatewayIdParameter', {
      parameterName: '/opportunity-analysis/api/gateway-id',
      stringValue: api.restApiId,
      description: 'API Gateway ID for the Opportunity Analysis API',
    });

    new ssm.StringParameter(this, 'APIGatewayUrlParameter', {
      parameterName: '/opportunity-analysis/api/gateway-url',
      stringValue: api.url,
      description: 'API Gateway URL for the Opportunity Analysis API',
    });

    // Outputs
    new CfnOutput(this, 'APIGatewayId', {
      value: api.restApiId,
      description: 'API Gateway ID',
      exportName: 'OpportunityAnalysis-API-Gateway-Id',
    });

    new CfnOutput(this, 'APIGatewayUrl', {
      value: api.url,
      description: 'API Gateway URL',
      exportName: 'OpportunityAnalysis-API-Gateway-Url',
    });

    new CfnOutput(this, 'ComplianceRoleArn', {
      value: complianceRole.roleArn,
      description: 'Compliance monitoring role ARN',
    });

    // Store references for other stacks
    this.api = api;
    this.complianceRole = complianceRole;
    this.apiGatewayExecutionPolicy = apiGatewayExecutionPolicy;
  }
}

module.exports = { SecurityEnhancementsStack };