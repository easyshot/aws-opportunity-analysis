/**
 * CI/CD Pipeline Stack Tests
 * 
 * Unit tests for the AWS CodePipeline infrastructure stack.
 */

const { App } = require('aws-cdk-lib');
const { Template } = require('aws-cdk-lib/assertions');
const { CicdPipelineStack } = require('../lib/cicd-pipeline-stack');

describe('CicdPipelineStack', () => {
  let app;
  let stack;
  let template;

  beforeEach(() => {
    app = new App();
    stack = new CicdPipelineStack(app, 'TestCicdPipelineStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1'
      }
    });
    template = Template.fromStack(stack);
  });

  describe('S3 Artifacts Bucket', () => {
    test('creates S3 bucket for pipeline artifacts', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        VersioningConfiguration: {
          Status: 'Enabled'
        },
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [{
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256'
            }
          }]
        },
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true
        }
      });
    });

    test('configures lifecycle rules for artifact cleanup', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: {
          Rules: [{
            Id: 'DeleteOldArtifacts',
            Status: 'Enabled',
            ExpirationInDays: 30,
            NoncurrentVersionExpirationInDays: 7
          }]
        }
      });
    });
  });

  describe('CodeCommit Repository', () => {
    test('creates CodeCommit repository', () => {
      template.hasResourceProperties('AWS::CodeCommit::Repository', {
        RepositoryName: 'aws-opportunity-analysis',
        RepositoryDescription: 'AWS Opportunity Analysis Application Source Code'
      });
    });
  });

  describe('CodeBuild Projects', () => {
    test('creates test project with correct configuration', () => {
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Name: 'aws-opportunity-analysis-test',
        Environment: {
          ComputeType: 'BUILD_GENERAL1_SMALL',
          Image: 'aws/codebuild/standard:7.0',
          Type: 'LINUX_CONTAINER',
          EnvironmentVariables: [{
            Name: 'NODE_ENV',
            Value: 'test'
          }]
        }
      });
    });

    test('creates build project with correct configuration', () => {
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Name: 'aws-opportunity-analysis-build',
        Environment: {
          ComputeType: 'BUILD_GENERAL1_SMALL',
          Image: 'aws/codebuild/standard:7.0',
          Type: 'LINUX_CONTAINER',
          EnvironmentVariables: [{
            Name: 'NODE_ENV',
            Value: 'production'
          }]
        }
      });
    });

    test('creates security scan project', () => {
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Name: 'aws-opportunity-analysis-security-scan',
        Environment: {
          ComputeType: 'BUILD_GENERAL1_SMALL',
          Image: 'aws/codebuild/standard:7.0',
          Type: 'LINUX_CONTAINER'
        }
      });
    });
  });

  describe('CodePipeline', () => {
    test('creates pipeline with correct name', () => {
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Name: 'aws-opportunity-analysis-pipeline'
      });
    });

    test('configures source stage', () => {
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Stages: expect.arrayContaining([
          expect.objectContaining({
            Name: 'Source',
            Actions: expect.arrayContaining([
              expect.objectContaining({
                Name: 'Source',
                ActionTypeId: {
                  Category: 'Source',
                  Owner: 'AWS',
                  Provider: 'CodeCommit',
                  Version: '1'
                }
              })
            ])
          })
        ])
      });
    });

    test('configures security scan stage', () => {
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Stages: expect.arrayContaining([
          expect.objectContaining({
            Name: 'SecurityScan'
          })
        ])
      });
    });

    test('configures test stage', () => {
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Stages: expect.arrayContaining([
          expect.objectContaining({
            Name: 'Test'
          })
        ])
      });
    });

    test('configures build stage', () => {
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Stages: expect.arrayContaining([
          expect.objectContaining({
            Name: 'Build'
          })
        ])
      });
    });

    test('configures deployment stages', () => {
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Stages: expect.arrayContaining([
          expect.objectContaining({
            Name: 'Deploy-Dev'
          }),
          expect.objectContaining({
            Name: 'Approval'
          }),
          expect.objectContaining({
            Name: 'Deploy-Prod'
          })
        ])
      });
    });
  });

  describe('SNS Notifications', () => {
    test('creates SNS topic for pipeline notifications', () => {
      template.hasResourceProperties('AWS::SNS::Topic', {
        TopicName: 'aws-opportunity-analysis-pipeline-notifications',
        DisplayName: 'AWS Opportunity Analysis Pipeline Notifications'
      });
    });

    test('creates notification rule for pipeline events', () => {
      template.hasResourceProperties('AWS::CodeStarNotifications::NotificationRule', {
        EventTypeIds: [
          'codepipeline-pipeline-pipeline-execution-failed',
          'codepipeline-pipeline-pipeline-execution-succeeded',
          'codepipeline-pipeline-manual-approval-needed'
        ]
      });
    });
  });

  describe('CodeDeploy Configuration', () => {
    test('creates Lambda application for blue-green deployments', () => {
      template.hasResourceProperties('AWS::CodeDeploy::Application', {
        ApplicationName: 'aws-opportunity-analysis-lambda-app',
        ComputePlatform: 'Lambda'
      });
    });

    test('creates deployment group with canary configuration', () => {
      template.hasResourceProperties('AWS::CodeDeploy::DeploymentGroup', {
        DeploymentGroupName: 'aws-opportunity-analysis-lambda-dg',
        DeploymentConfigName: 'CodeDeployDefault.LambdaCanary10Percent5Minutes'
      });
    });
  });

  describe('IAM Roles and Permissions', () => {
    test('creates CodeBuild service role', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [{
            Effect: 'Allow',
            Principal: {
              Service: 'codebuild.amazonaws.com'
            },
            Action: 'sts:AssumeRole'
          }]
        }
      });
    });

    test('attaches PowerUserAccess policy to CodeBuild role', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        ManagedPolicyArns: [
          'arn:aws:iam::aws:policy/PowerUserAccess'
        ]
      });
    });
  });

  describe('Stack Outputs', () => {
    test('exposes repository clone URL', () => {
      expect(stack.repositoryCloneUrl).toBeDefined();
    });

    test('exposes pipeline name', () => {
      expect(stack.pipelineName).toBeDefined();
    });

    test('exposes artifacts bucket name', () => {
      expect(stack.artifactsBucketName).toBeDefined();
    });
  });
});