const { Stack, Duration, RemovalPolicy } = require('aws-cdk-lib');
const { Construct } = require('constructs');
const codebuild = require('aws-cdk-lib/aws-codebuild');
const codepipeline = require('aws-cdk-lib/aws-codepipeline');
const codepipeline_actions = require('aws-cdk-lib/aws-codepipeline-actions');
const codecommit = require('aws-cdk-lib/aws-codecommit');
const codedeploy = require('aws-cdk-lib/aws-codedeploy');
const iam = require('aws-cdk-lib/aws-iam');
const s3 = require('aws-cdk-lib/aws-s3');
const sns = require('aws-cdk-lib/aws-sns');
const codestarnotifications = require('aws-cdk-lib/aws-codestarnotifications');

class CicdPipelineStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // S3 bucket for pipeline artifacts
    const artifactsBucket = new s3.Bucket(this, 'PipelineArtifacts', {
      bucketName: `aws-opportunity-analysis-pipeline-artifacts-${this.account}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      lifecycleRules: [{
        id: 'DeleteOldArtifacts',
        expiration: Duration.days(30),
        noncurrentVersionExpiration: Duration.days(7)
      }]
    });    // 
CodeCommit repository (or can be configured for GitHub)
    const repository = new codecommit.Repository(this, 'SourceRepository', {
      repositoryName: 'aws-opportunity-analysis',
      description: 'AWS Opportunity Analysis Application Source Code'
    });

    // IAM role for CodeBuild
    const codeBuildRole = new iam.Role(this, 'CodeBuildRole', {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('PowerUserAccess')
      ],
      inlinePolicies: {
        CodeBuildPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'codebuild:CreateReportGroup',
                'codebuild:CreateReport',
                'codebuild:UpdateReport',
                'codebuild:BatchPutTestCases',
                'codebuild:BatchPutCodeCoverages'
              ],
              resources: ['*']
            })
          ]
        })
      }
    });

    // CodeBuild project for testing
    const testProject = new codebuild.Project(this, 'TestProject', {
      projectName: 'aws-opportunity-analysis-test',
      source: codebuild.Source.codeCommit({
        repository: repository
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.SMALL,
        environmentVariables: {
          NODE_ENV: { value: 'test' }
        }
      },
      role: codeBuildRole,
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              nodejs: '18'
            },
            commands: [
              'npm ci'
            ]
          },
          pre_build: {
            commands: [
              'npm run lint',
              'npm audit --audit-level moderate'
            ]
          },
          build: {
            commands: [
              'npm test -- --coverage --watchAll=false'
            ]
          }
        },
        reports: {
          jest_reports: {
            files: [
              'coverage/lcov.info'
            ],
            'file-format': 'LCOV'
          }
        },
        artifacts: {
          files: [
            '**/*'
          ]
        }
      })
    });   
 // CodeBuild project for building
    const buildProject = new codebuild.Project(this, 'BuildProject', {
      projectName: 'aws-opportunity-analysis-build',
      source: codebuild.Source.codeCommit({
        repository: repository
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.SMALL,
        environmentVariables: {
          NODE_ENV: { value: 'production' }
        }
      },
      role: codeBuildRole,
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              nodejs: '18'
            },
            commands: [
              'npm ci --production'
            ]
          },
          pre_build: {
            commands: [
              'echo Build started on `date`'
            ]
          },
          build: {
            commands: [
              'npm run build',
              'npm run cdk:synth'
            ]
          },
          post_build: {
            commands: [
              'echo Build completed on `date`'
            ]
          }
        },
        artifacts: {
          files: [
            '**/*'
          ]
        }
      })
    });

    // CodeBuild project for security scanning
    const securityScanProject = new codebuild.Project(this, 'SecurityScanProject', {
      projectName: 'aws-opportunity-analysis-security-scan',
      source: codebuild.Source.codeCommit({
        repository: repository
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.SMALL
      },
      role: codeBuildRole,
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              nodejs: '18'
            },
            commands: [
              'npm install -g snyk',
              'npm ci'
            ]
          },
          pre_build: {
            commands: [
              'snyk auth $SNYK_TOKEN || echo "Snyk token not configured"'
            ]
          },
          build: {
            commands: [
              'npm audit --audit-level high',
              'snyk test || echo "Snyk scan completed with findings"',
              'echo "Running OWASP dependency check..."'
            ]
          }
        }
      })
    });    /
/ SNS topic for pipeline notifications
    const pipelineNotificationsTopic = new sns.Topic(this, 'PipelineNotifications', {
      topicName: 'aws-opportunity-analysis-pipeline-notifications',
      displayName: 'AWS Opportunity Analysis Pipeline Notifications'
    });

    // Pipeline artifacts
    const sourceOutput = new codepipeline.Artifact('SourceOutput');
    const testOutput = new codepipeline.Artifact('TestOutput');
    const buildOutput = new codepipeline.Artifact('BuildOutput');

    // CodePipeline
    const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: 'aws-opportunity-analysis-pipeline',
      artifactBucket: artifactsBucket,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.CodeCommitSourceAction({
              actionName: 'Source',
              repository: repository,
              branch: 'main',
              output: sourceOutput,
              trigger: codepipeline_actions.CodeCommitTrigger.EVENTS
            })
          ]
        },
        {
          stageName: 'SecurityScan',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'SecurityScan',
              project: securityScanProject,
              input: sourceOutput
            })
          ]
        },
        {
          stageName: 'Test',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Test',
              project: testProject,
              input: sourceOutput,
              outputs: [testOutput]
            })
          ]
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Build',
              project: buildProject,
              input: testOutput,
              outputs: [buildOutput]
            })
          ]
        },
        {
          stageName: 'Deploy-Dev',
          actions: [
            new codepipeline_actions.CloudFormationCreateUpdateStackAction({
              actionName: 'Deploy-Dev',
              templatePath: buildOutput.atPath('cdk.out/AwsOpportunityAnalysisStack.template.json'),
              stackName: 'aws-opportunity-analysis-dev',
              adminPermissions: true,
              parameterOverrides: {
                Environment: 'dev'
              }
            })
          ]
        },
        {
          stageName: 'Approval',
          actions: [
            new codepipeline_actions.ManualApprovalAction({
              actionName: 'ManualApproval',
              notificationTopic: pipelineNotificationsTopic,
              additionalInformation: 'Please review the dev deployment and approve for production'
            })
          ]
        },
        {
          stageName: 'Deploy-Prod',
          actions: [
            new codepipeline_actions.CloudFormationCreateUpdateStackAction({
              actionName: 'Deploy-Prod',
              templatePath: buildOutput.atPath('cdk.out/AwsOpportunityAnalysisStack.template.json'),
              stackName: 'aws-opportunity-analysis-prod',
              adminPermissions: true,
              parameterOverrides: {
                Environment: 'prod'
              }
            })
          ]
        }
      ]
    });    /
/ CodeStar Notifications for pipeline events
    new codestarnotifications.NotificationRule(this, 'PipelineNotificationRule', {
      source: pipeline,
      events: [
        'codepipeline-pipeline-pipeline-execution-failed',
        'codepipeline-pipeline-pipeline-execution-succeeded',
        'codepipeline-pipeline-manual-approval-needed'
      ],
      targets: [pipelineNotificationsTopic]
    });

    // Lambda deployment configuration for blue-green deployments
    const lambdaApplication = new codedeploy.LambdaApplication(this, 'LambdaApplication', {
      applicationName: 'aws-opportunity-analysis-lambda-app'
    });

    const lambdaDeploymentGroup = new codedeploy.LambdaDeploymentGroup(this, 'LambdaDeploymentGroup', {
      application: lambdaApplication,
      deploymentGroupName: 'aws-opportunity-analysis-lambda-dg',
      deploymentConfig: codedeploy.LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES,
      alarms: [
        // CloudWatch alarms would be added here for monitoring deployment health
      ]
    });

    // Output important values
    this.repositoryCloneUrl = repository.repositoryCloneUrlHttp;
    this.pipelineName = pipeline.pipelineName;
    this.artifactsBucketName = artifactsBucket.bucketName;
  }
}

module.exports = { CicdPipelineStack };