const { Stack, CfnOutput, Tags } = require('aws-cdk-lib');
const { StringParameter, ParameterType } = require('aws-cdk-lib/aws-ssm');
const { Role, PolicyDocument, PolicyStatement, Effect, AccountRootPrincipal, ServicePrincipal } = require('aws-cdk-lib/aws-iam');
const { Key } = require('aws-cdk-lib/aws-kms');
const { LogGroup, RetentionDays } = require('aws-cdk-lib/aws-logs');

class MultiEnvironmentStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const { environment, accountId, region } = props;

    // Environment-specific configuration
    const envConfig = this.getEnvironmentConfig(environment);

    // Apply environment tags
    Tags.of(this).add('Environment', environment);
    Tags.of(this).add('Project', 'OpportunityAnalysis');
    Tags.of(this).add('ManagedBy', 'CDK');

    // Create environment-specific KMS key for encryption
    const envKmsKey = new Key(this, `${environment}KmsKey`, {
      alias: `opportunity-analysis-${environment}`,
      description: `KMS key for Opportunity Analysis ${environment} environment`,
      enableKeyRotation: true,
    });

    // Create environment-specific log group
    const envLogGroup = new LogGroup(this, `${environment}LogGroup`, {
      logGroupName: `/aws/opportunity-analysis/${environment}`,
      retention: envConfig.logRetention,
    });

    // Store environment-specific parameters
    const parameters = this.createEnvironmentParameters(environment, envConfig, envKmsKey.keyArn);

    // Create cross-account access role for this environment
    const crossAccountRole = new Role(this, `${environment}CrossAccountRole`, {
      roleName: `OpportunityAnalysis${environment}AccessRole`,
      assumedBy: new AccountRootPrincipal(), // Allow master account to assume
      description: `Cross-account access role for ${environment} environment`,
      inlinePolicies: {
        EnvironmentAccessPolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'cloudformation:*',
                'lambda:*',
                'apigateway:*',
                'bedrock:*',
                'athena:*',
                's3:*',
                'dynamodb:*',
                'iam:PassRole',
                'iam:GetRole',
                'iam:CreateRole',
                'iam:DeleteRole',
                'iam:AttachRolePolicy',
                'iam:DetachRolePolicy',
                'logs:*',
                'ssm:GetParameter',
                'ssm:GetParameters',
                'ssm:PutParameter',
                'kms:Decrypt',
                'kms:Encrypt',
                'kms:GenerateDataKey',
              ],
              resources: ['*'],
              conditions: {
                StringEquals: {
                  'aws:RequestedRegion': region,
                },
              },
            }),
          ],
        }),
      },
    });

    // Create deployment automation role
    const deploymentRole = new Role(this, `${environment}DeploymentRole`, {
      roleName: `OpportunityAnalysis${environment}DeploymentRole`,
      assumedBy: new ServicePrincipal('codebuild.amazonaws.com'),
      description: `Deployment role for ${environment} environment`,
      inlinePolicies: {
        DeploymentPolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'sts:AssumeRole',
              ],
              resources: [crossAccountRole.roleArn],
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'ssm:GetParameter',
                'ssm:GetParameters',
                'kms:Decrypt',
              ],
              resources: [
                `arn:aws:ssm:${region}:${accountId}:parameter/opportunity-analysis/${environment}/*`,
                envKmsKey.keyArn,
              ],
            }),
          ],
        }),
      },
    });

    // Output important values
    new CfnOutput(this, `${environment}AccountId`, {
      value: accountId,
      description: `Account ID for ${environment} environment`,
      exportName: `OpportunityAnalysis${environment}AccountId`,
    });

    new CfnOutput(this, `${environment}CrossAccountRoleArn`, {
      value: crossAccountRole.roleArn,
      description: `Cross-account role ARN for ${environment} environment`,
      exportName: `OpportunityAnalysis${environment}CrossAccountRoleArn`,
    });

    new CfnOutput(this, `${environment}DeploymentRoleArn`, {
      value: deploymentRole.roleArn,
      description: `Deployment role ARN for ${environment} environment`,
      exportName: `OpportunityAnalysis${environment}DeploymentRoleArn`,
    });

    new CfnOutput(this, `${environment}KmsKeyArn`, {
      value: envKmsKey.keyArn,
      description: `KMS key ARN for ${environment} environment`,
      exportName: `OpportunityAnalysis${environment}KmsKeyArn`,
    });
  }

  getEnvironmentConfig(environment) {
    const configs = {
      dev: {
        logRetention: RetentionDays.ONE_WEEK,
        bedrockModel: 'amazon.titan-text-premier-v1:0',
        athenaDatabase: 'catapult_db_dev',
        lambdaConcurrency: 5,
        apiThrottling: {
          rateLimit: 100,
          burstLimit: 200,
        },
        monitoring: {
          detailedMetrics: true,
          alarmThreshold: 10,
        },
      },
      staging: {
        logRetention: RetentionDays.ONE_MONTH,
        bedrockModel: 'amazon.titan-text-premier-v1:0',
        athenaDatabase: 'catapult_db_staging',
        lambdaConcurrency: 10,
        apiThrottling: {
          rateLimit: 500,
          burstLimit: 1000,
        },
        monitoring: {
          detailedMetrics: true,
          alarmThreshold: 5,
        },
      },
      prod: {
        logRetention: RetentionDays.SIX_MONTHS,
        bedrockModel: 'amazon.titan-text-premier-v1:0',
        athenaDatabase: 'catapult_db_p',
        lambdaConcurrency: 50,
        apiThrottling: {
          rateLimit: 2000,
          burstLimit: 5000,
        },
        monitoring: {
          detailedMetrics: true,
          alarmThreshold: 1,
        },
      },
    };

    return configs[environment] || configs.dev;
  }

  createEnvironmentParameters(environment, config, kmsKeyArn) {
    const parameters = {};

    // AWS Region
    parameters.region = new StringParameter(this, `${environment}RegionParameter`, {
      parameterName: `/opportunity-analysis/${environment}/aws/region`,
      stringValue: this.region,
      description: `AWS region for ${environment} environment`,
    });

    // Bedrock Configuration
    parameters.bedrockModel = new StringParameter(this, `${environment}BedrockModelParameter`, {
      parameterName: `/opportunity-analysis/${environment}/bedrock/model`,
      stringValue: config.bedrockModel,
      description: `Bedrock model for ${environment} environment`,
    });

    // Athena Configuration
    parameters.athenaDatabase = new StringParameter(this, `${environment}AthenaDatabaseParameter`, {
      parameterName: `/opportunity-analysis/${environment}/athena/database`,
      stringValue: config.athenaDatabase,
      description: `Athena database for ${environment} environment`,
    });

    parameters.athenaOutputLocation = new StringParameter(this, `${environment}AthenaOutputParameter`, {
      parameterName: `/opportunity-analysis/${environment}/athena/output-location`,
      stringValue: `s3://opportunity-analysis-${environment}-athena-results/`,
      description: `Athena output location for ${environment} environment`,
    });

    // Lambda Configuration
    parameters.lambdaConcurrency = new StringParameter(this, `${environment}LambdaConcurrencyParameter`, {
      parameterName: `/opportunity-analysis/${environment}/lambda/concurrency`,
      stringValue: config.lambdaConcurrency.toString(),
      description: `Lambda concurrency limit for ${environment} environment`,
    });

    // API Gateway Configuration
    parameters.apiRateLimit = new StringParameter(this, `${environment}ApiRateLimitParameter`, {
      parameterName: `/opportunity-analysis/${environment}/api/rate-limit`,
      stringValue: config.apiThrottling.rateLimit.toString(),
      description: `API Gateway rate limit for ${environment} environment`,
    });

    parameters.apiBurstLimit = new StringParameter(this, `${environment}ApiBurstLimitParameter`, {
      parameterName: `/opportunity-analysis/${environment}/api/burst-limit`,
      stringValue: config.apiThrottling.burstLimit.toString(),
      description: `API Gateway burst limit for ${environment} environment`,
    });

    // Monitoring Configuration
    parameters.alarmThreshold = new StringParameter(this, `${environment}AlarmThresholdParameter`, {
      parameterName: `/opportunity-analysis/${environment}/monitoring/alarm-threshold`,
      stringValue: config.monitoring.alarmThreshold.toString(),
      description: `Alarm threshold for ${environment} environment`,
    });

    // KMS Key ARN
    parameters.kmsKeyArn = new StringParameter(this, `${environment}KmsKeyArnParameter`, {
      parameterName: `/opportunity-analysis/${environment}/kms/key-arn`,
      stringValue: kmsKeyArn,
      description: `KMS key ARN for ${environment} environment`,
    });

    // Environment-specific prompt IDs (these would be different per environment)
    const promptIds = this.getEnvironmentPromptIds(environment);
    
    parameters.queryPromptId = new StringParameter(this, `${environment}QueryPromptIdParameter`, {
      parameterName: `/opportunity-analysis/${environment}/bedrock/query-prompt-id`,
      stringValue: promptIds.queryPromptId,
      description: `Bedrock query prompt ID for ${environment} environment`,
    });

    parameters.analysisPromptId = new StringParameter(this, `${environment}AnalysisPromptIdParameter`, {
      parameterName: `/opportunity-analysis/${environment}/bedrock/analysis-prompt-id`,
      stringValue: promptIds.analysisPromptId,
      description: `Bedrock analysis prompt ID for ${environment} environment`,
    });

    parameters.novaPromptId = new StringParameter(this, `${environment}NovaPromptIdParameter`, {
      parameterName: `/opportunity-analysis/${environment}/bedrock/nova-prompt-id`,
      stringValue: promptIds.novaPromptId,
      description: `Bedrock Nova Premier prompt ID for ${environment} environment`,
    });

    return parameters;
  }

  getEnvironmentPromptIds(environment) {
    // These would be environment-specific prompt IDs
    // In practice, you'd have different prompts for each environment
    const promptIds = {
      dev: {
        queryPromptId: 'Y6T66EI3GZ-DEV',
        analysisPromptId: 'FDUHITJIME-DEV',
        novaPromptId: 'P03B9TO1Q1-DEV',
      },
      staging: {
        queryPromptId: 'Y6T66EI3GZ-STAGING',
        analysisPromptId: 'FDUHITJIME-STAGING',
        novaPromptId: 'P03B9TO1Q1-STAGING',
      },
      prod: {
        queryPromptId: 'Y6T66EI3GZ',
        analysisPromptId: 'FDUHITJIME',
        novaPromptId: 'P03B9TO1Q1',
      },
    };

    return promptIds[environment] || promptIds.dev;
  }
}

module.exports = { MultiEnvironmentStack };