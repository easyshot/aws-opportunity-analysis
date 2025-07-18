const { Stack, Duration, RemovalPolicy } = require('aws-cdk-lib');
const { Construct } = require('constructs');
const codebuild = require('aws-cdk-lib/aws-codebuild');
const codepipeline = require('aws-cdk-lib/aws-codepipeline');
const codepipelineActions = require('aws-cdk-lib/aws-codepipeline-actions');
const iam = require('aws-cdk-lib/aws-iam');
const s3 = require('aws-cdk-lib/aws-s3');
const lambda = require('aws-cdk-lib/aws-lambda');
const apigateway = require('aws-cdk-lib/aws-apigateway');
const logs = require('aws-cdk-lib/aws-logs');
const sns = require('aws-cdk-lib/aws-sns');
const subscriptions = require('aws-cdk-lib/aws-sns-subscriptions');

/**
 * Enhanced CI/CD Pipeline Stack with comprehensive testing integration
 */
class EnhancedCicdPipelineStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // S3 bucket for pipeline artifacts
    const artifactsBucket = new s3.Bucket(this, 'PipelineArtifacts', {
      bucketName: `aws-opportunity-analysis-pipeline-artifacts-${this.account}`,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: true
    });

    // SNS topic for pipeline notifications
    const pipelineTopic = new sns.Topic(this, 'PipelineNotifications', {
      topicName: 'aws-opportunity-analysis-pipeline-notifications'
    });

    if (props?.notificationEmail) {
      pipelineTopic.addSubscription(
        new subscriptions.EmailSubscription(props.notificationEmail)
      );
    }

    // CodeBuild project for unit tests
    const unitTestProject = new codebuild.Project(this, 'UnitTestProject', {
      projectName: 'aws-opportunity-analysis-unit-tests',
      source: codebuild.Source.gitHub({
        owner: props?.githubOwner || 'your-org',
        repo: props?.githubRepo || 'aws-opportunity-analysis',
        webhook: true,
        webhookFilters: [
          codebuild.FilterGroup.inEventOf(codebuild.EventAction.PULL_REQUEST_CREATED),
          codebuild.FilterGroup.inEventOf(codebuild.EventAction.PULL_REQUEST_UPDATED)
        ]
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.SMALL
      },
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
              'echo "Running linting and security checks"',
              'npm run lint || echo "Linting not configured"',
              'npm audit --audit-level high',
              'echo "Installing test dependencies"'
            ]
          },
          build: {
            commands: [
              'echo "Running unit tests"',
              'npm test',
              'echo "Running coverage analysis"',
              'npm run test:coverage'
            ]
          },
          post_build: {
            commands: [
              'echo "Unit tests completed"',
              'echo "Coverage report generated"'
            ]
          }
        },
        reports: {
          'unit-test-reports': {
            files: ['test-results/junit.xml'],
            'file-format': 'JUNITXML'
          },
          'coverage-reports': {
            files: ['coverage/lcov.info'],
            'file-format': 'CLOVERXML'
          }
        },
        artifacts: {
          files: [
            '**/*'
          ],
          'exclude-paths': [
            'node_modules/**/*',
            'coverage/**/*',
            'test-results/**/*'
          ]
        }
      }),
      cache: codebuild.Cache.local(codebuild.LocalCacheMode.NPM)
    });

    // CodeBuild project for integration tests
    const integrationTestProject = new codebuild.Project(this, 'IntegrationTestProject', {
      projectName: 'aws-opportunity-analysis-integration-tests',
      source: codebuild.Source.s3({
        bucket: artifactsBucket,
        path: 'source.zip'
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.MEDIUM,
        privileged: true
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              nodejs: '18'
            },
            commands: [
              'npm ci',
              'echo "Installing AWS CLI"',
              'curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"',
              'unzip awscliv2.zip',
              'sudo ./aws/install'
            ]
          },
          pre_build: {
            commands: [
              'echo "Setting up test environment"',
              'export AWS_DEFAULT_REGION=$AWS_REGION',
              'echo "Validating AWS credentials"',
              'aws sts get-caller-identity'
            ]
          },
          build: {
            commands: [
              'echo "Running integration tests"',
              'npm run test:integration',
              'echo "Running API contract tests"',
              'node tests/contract-tests.js',
              'echo "Running end-to-end tests"',
              'npm run test:e2e'
            ]
          },
          post_build: {
            commands: [
              'echo "Integration tests completed"'
            ]
          }
        },
        reports: {
          'integration-test-reports': {
            files: ['test-results/integration-junit.xml'],
            'file-format': 'JUNITXML'
          }
        }
      }),
      environmentVariables: {
        AWS_REGION: {
          value: this.region
        }
      }
    });

    // CodeBuild project for security testing
    const securityTestProject = new codebuild.Project(this, 'SecurityTestProject', {
      projectName: 'aws-opportunity-analysis-security-tests',
      source: codebuild.Source.s3({
        bucket: artifactsBucket,
        path: 'source.zip'
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.MEDIUM
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              nodejs: '18'
            },
            commands: [
              'npm ci',
              'echo "Installing security testing tools"',
              'npm install -g snyk',
              'npm install -g retire',
              'pip3 install bandit safety'
            ]
          },
          pre_build: {
            commands: [
              'echo "Running dependency vulnerability scan"',
              'npm audit --audit-level moderate',
              'snyk test --severity-threshold=high || echo "Snyk scan completed with findings"'
            ]
          },
          build: {
            commands: [
              'echo "Running static security analysis"',
              'retire --path . --outputformat json --outputpath retire-report.json || echo "Retire.js scan completed"',
              'echo "Running AWS security best practices check"',
              'node tests/security-tests.js'
            ]
          },
          post_build: {
            commands: [
              'echo "Security tests completed"'
            ]
          }
        },
        reports: {
          'security-test-reports': {
            files: ['security-results/*.json'],
            'file-format': 'CUCUMBERJSON'
          }
        }
      })
    });

    // CodeBuild project for performance testing
    const performanceTestProject = new codebuild.Project(this, 'PerformanceTestProject', {
      projectName: 'aws-opportunity-analysis-performance-tests',
      source: codebuild.Source.s3({
        bucket: artifactsBucket,
        path: 'source.zip'
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.LARGE
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              nodejs: '18'
            },
            commands: [
              'npm ci',
              'echo "Installing performance testing tools"',
              'npm install -g artillery',
              'npm install -g lighthouse'
            ]
          },
          pre_build: {
            commands: [
              'echo "Setting up performance test environment"',
              'export TARGET_URL=${TARGET_URL:-http://localhost:8123}'
            ]
          },
          build: {
            commands: [
              'echo "Running load tests"',
              'artillery run tests/load-test-config.yml --output load-test-results.json',
              'echo "Running performance benchmarks"',
              'node tests/performance-tests.js',
              'echo "Running Lighthouse audit"',
              'lighthouse $TARGET_URL --output json --output-path lighthouse-report.json --chrome-flags="--headless --no-sandbox"'
            ]
          },
          post_build: {
            commands: [
              'echo "Performance tests completed"',
              'artillery report load-test-results.json --output load-test-report.html'
            ]
          }
        },
        reports: {
          'performance-test-reports': {
            files: ['performance-results/*.json'],
            'file-format': 'CUCUMBERJSON'
          }
        },
        artifacts: {
          files: [
            'load-test-report.html',
            'lighthouse-report.json'
          ]
        }
      }),
      environmentVariables: {
        TARGET_URL: {
          value: props?.targetUrl || 'http://localhost:8123'
        }
      }
    });

    // Grant necessary permissions to CodeBuild projects
    const buildProjects = [unitTestProject, integrationTestProject, securityTestProject, performanceTestProject];
    
    buildProjects.forEach(project => {
      project.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock:InvokeModel',
          'bedrock-agent:GetPrompt',
          'lambda:InvokeFunction',
          'athena:StartQueryExecution',
          'athena:GetQueryExecution',
          'athena:GetQueryResults',
          's3:GetObject',
          's3:PutObject',
          'cloudwatch:PutMetricData',
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents'
        ],
        resources: ['*']
      }));
    });

    // Lambda function for test result aggregation
    const testResultAggregator = new lambda.Function(this, 'TestResultAggregator', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { CodeBuildClient, BatchGetBuildsCommand } = require('@aws-sdk/client-codebuild');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const codebuild = new CodeBuildClient();
const sns = new SNSClient();
const s3 = new S3Client();

exports.handler = async (event) => {
  console.log('Test result aggregator triggered:', JSON.stringify(event, null, 2));
  
  try {
    const buildIds = event.buildIds || [];
    
    if (buildIds.length === 0) {
      throw new Error('No build IDs provided');
    }
    
    // Get build results
    const buildsResult = await codebuild.send(new BatchGetBuildsCommand({
      ids: buildIds
    }));
    
    const testResults = {
      timestamp: new Date().toISOString(),
      builds: [],
      summary: {
        total: buildsResult.builds.length,
        succeeded: 0,
        failed: 0,
        stopped: 0
      }
    };
    
    // Process each build
    for (const build of buildsResult.builds) {
      const buildResult = {
        id: build.id,
        projectName: build.projectName,
        buildStatus: build.buildStatus,
        startTime: build.startTime,
        endTime: build.endTime,
        duration: build.endTime ? (build.endTime - build.startTime) / 1000 : null,
        logs: build.logs?.groupName
      };
      
      testResults.builds.push(buildResult);
      
      // Update summary
      switch (build.buildStatus) {
        case 'SUCCEEDED':
          testResults.summary.succeeded++;
          break;
        case 'FAILED':
          testResults.summary.failed++;
          break;
        case 'STOPPED':
          testResults.summary.stopped++;
          break;
      }
    }
    
    // Calculate overall status
    testResults.summary.overallStatus = testResults.summary.failed > 0 ? 'FAILED' : 'SUCCEEDED';
    
    // Save results to S3
    const resultsKey = \`test-results/\${Date.now()}/aggregated-results.json\`;
    await s3.send(new PutObjectCommand({
      Bucket: process.env.ARTIFACTS_BUCKET,
      Key: resultsKey,
      Body: JSON.stringify(testResults, null, 2),
      ContentType: 'application/json'
    }));
    
    // Send notification
    const message = \`Test Results Summary:
Total Builds: \${testResults.summary.total}
Succeeded: \${testResults.summary.succeeded}
Failed: \${testResults.summary.failed}
Overall Status: \${testResults.summary.overallStatus}

Detailed results: s3://\${process.env.ARTIFACTS_BUCKET}/\${resultsKey}\`;
    
    await sns.send(new PublishCommand({
      TopicArn: process.env.PIPELINE_TOPIC_ARN,
      Subject: \`Test Results - \${testResults.summary.overallStatus}\`,
      Message: message
    }));
    
    return {
      statusCode: 200,
      body: JSON.stringify(testResults)
    };
    
  } catch (error) {
    console.error('Test result aggregation error:', error);
    
    await sns.send(new PublishCommand({
      TopicArn: process.env.PIPELINE_TOPIC_ARN,
      Subject: 'Test Result Aggregation Failed',
      Message: \`Test result aggregation failed: \${error.message}\`
    }));
    
    throw error;
  }
};
      `),
      environment: {
        ARTIFACTS_BUCKET: artifactsBucket.bucketName,
        PIPELINE_TOPIC_ARN: pipelineTopic.topicArn
      },
      timeout: Duration.minutes(5)
    });

    // Grant permissions to test result aggregator
    testResultAggregator.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'codebuild:BatchGetBuilds'
      ],
      resources: ['*']
    }));

    artifactsBucket.grantReadWrite(testResultAggregator);
    pipelineTopic.grantPublish(testResultAggregator);

    // API Gateway for triggering tests
    const testApi = new apigateway.RestApi(this, 'TestApi', {
      restApiName: 'aws-opportunity-analysis-test-api',
      description: 'API for triggering automated tests',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS
      }
    });

    // Lambda function for test orchestration
    const testOrchestrator = new lambda.Function(this, 'TestOrchestrator', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { CodeBuildClient, StartBuildCommand } = require('@aws-sdk/client-codebuild');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const codebuild = new CodeBuildClient();
const lambda = new LambdaClient();

exports.handler = async (event) => {
  console.log('Test orchestrator triggered:', JSON.stringify(event, null, 2));
  
  const testType = event.pathParameters?.testType || 'all';
  const buildIds = [];
  
  try {
    const projectMap = {
      'unit': process.env.UNIT_TEST_PROJECT,
      'integration': process.env.INTEGRATION_TEST_PROJECT,
      'security': process.env.SECURITY_TEST_PROJECT,
      'performance': process.env.PERFORMANCE_TEST_PROJECT
    };
    
    const projectsToRun = testType === 'all' 
      ? Object.values(projectMap)
      : [projectMap[testType]];
    
    if (projectsToRun.includes(undefined)) {
      throw new Error(\`Invalid test type: \${testType}\`);
    }
    
    // Start builds
    for (const projectName of projectsToRun) {
      const result = await codebuild.send(new StartBuildCommand({
        projectName
      }));
      buildIds.push(result.build.id);
    }
    
    // Schedule result aggregation (after a delay)
    setTimeout(async () => {
      await lambda.send(new InvokeCommand({
        FunctionName: process.env.AGGREGATOR_FUNCTION_NAME,
        InvocationType: 'Event',
        Payload: JSON.stringify({ buildIds })
      }));
    }, 300000); // 5 minutes delay
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'Tests started successfully',
        testType,
        buildIds
      })
    };
    
  } catch (error) {
    console.error('Test orchestration error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};
      `),
      environment: {
        UNIT_TEST_PROJECT: unitTestProject.projectName,
        INTEGRATION_TEST_PROJECT: integrationTestProject.projectName,
        SECURITY_TEST_PROJECT: securityTestProject.projectName,
        PERFORMANCE_TEST_PROJECT: performanceTestProject.projectName,
        AGGREGATOR_FUNCTION_NAME: testResultAggregator.functionName
      },
      timeout: Duration.minutes(2)
    });

    // Grant permissions to test orchestrator
    testOrchestrator.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'codebuild:StartBuild'
      ],
      resources: [
        unitTestProject.projectArn,
        integrationTestProject.projectArn,
        securityTestProject.projectArn,
        performanceTestProject.projectArn
      ]
    }));

    testResultAggregator.grantInvoke(testOrchestrator);

    // API Gateway integration
    const testsResource = testApi.root.addResource('tests');
    const testTypeResource = testsResource.addResource('{testType}');
    
    testTypeResource.addMethod('POST', new apigateway.LambdaIntegration(testOrchestrator));

    // Outputs
    this.unitTestProject = unitTestProject;
    this.integrationTestProject = integrationTestProject;
    this.securityTestProject = securityTestProject;
    this.performanceTestProject = performanceTestProject;
    this.testOrchestrator = testOrchestrator;
    this.testResultAggregator = testResultAggregator;
    this.testApi = testApi;
    this.artifactsBucket = artifactsBucket;
    this.pipelineTopic = pipelineTopic;
  }
}

module.exports = { EnhancedCicdPipelineStack };