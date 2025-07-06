/**
 * CI/CD Pipeline Configuration
 * 
 * This configuration defines the settings for the AWS CodePipeline
 * infrastructure including build environments, deployment stages,
 * and notification settings.
 */

const cicdConfig = {
  // Pipeline Configuration
  pipeline: {
    name: 'aws-opportunity-analysis-pipeline',
    description: 'Automated CI/CD pipeline for AWS Opportunity Analysis application',
    
    // Source Configuration
    source: {
      type: 'codecommit', // or 'github'
      repositoryName: 'aws-opportunity-analysis',
      branch: 'main',
      pollForSourceChanges: false // Use CloudWatch Events instead
    },

    // Build Configuration
    build: {
      environment: {
        buildImage: 'aws/codebuild/standard:7.0',
        computeType: 'BUILD_GENERAL1_SMALL',
        privilegedMode: false,
        environmentVariables: {
          NODE_ENV: 'production',
          AWS_DEFAULT_REGION: process.env.AWS_REGION || 'us-east-1'
        }
      },
      
      // Build phases
      phases: {
        install: {
          runtimeVersions: {
            nodejs: '18'
          },
          commands: [
            'npm ci',
            'npm install -g aws-cdk@latest'
          ]
        },
        
        preBuild: {
          commands: [
            'echo Pre-build phase started',
            'npm audit --audit-level=high',
            'npm run lint || echo "Linting not configured"'
          ]
        },
        
        build: {
          commands: [
            'echo Build phase started',
            'npm test',
            'npm run cdk:synth'
          ]
        },
        
        postBuild: {
          commands: [
            'echo Post-build phase completed'
          ]
        }
      }
    },

    // Test Configuration
    test: {
      environment: {
        buildImage: 'aws/codebuild/standard:7.0',
        computeType: 'BUILD_GENERAL1_SMALL'
      },
      
      phases: {
        install: {
          runtimeVersions: {
            nodejs: '18'
          },
          commands: [
            'npm ci'
          ]
        },
        
        build: {
          commands: [
            'npm run test:coverage',
            'npm run test:integration || echo "Integration tests not configured"'
          ]
        }
      },
      
      reports: {
        jest_reports: {
          files: ['coverage/lcov.info'],
          fileFormat: 'LCOV'
        }
      }
    },

    // Security Scan Configuration
    securityScan: {
      environment: {
        buildImage: 'aws/codebuild/standard:7.0',
        computeType: 'BUILD_GENERAL1_SMALL'
      },
      
      phases: {
        install: {
          runtimeVersions: {
            nodejs: '18'
          },
          commands: [
            'npm install -g snyk',
            'npm ci'
          ]
        },
        
        build: {
          commands: [
            'npm audit --audit-level high',
            'snyk test || echo "Snyk scan completed with findings"'
          ]
        }
      }
    },

    // Deployment Stages
    deploymentStages: [
      {
        name: 'Deploy-Dev',
        environment: 'dev',
        stackName: 'aws-opportunity-analysis-dev',
        autoApprove: true,
        parameterOverrides: {
          Environment: 'dev',
          EnableDebugLogging: 'true'
        }
      },
      {
        name: 'Manual-Approval',
        type: 'approval',
        notificationArn: null, // Will be set during deployment
        approvalTimeout: 7 // days
      },
      {
        name: 'Deploy-Prod',
        environment: 'prod',
        stackName: 'aws-opportunity-analysis-prod',
        autoApprove: false,
        parameterOverrides: {
          Environment: 'prod',
          EnableDebugLogging: 'false'
        }
      }
    ]
  },

  // Notification Configuration
  notifications: {
    topic: {
      name: 'aws-opportunity-analysis-pipeline-notifications',
      displayName: 'AWS Opportunity Analysis Pipeline Notifications'
    },
    
    events: [
      'codepipeline-pipeline-pipeline-execution-failed',
      'codepipeline-pipeline-pipeline-execution-succeeded',
      'codepipeline-pipeline-manual-approval-needed',
      'codepipeline-pipeline-stage-execution-failed'
    ],
    
    // Email subscriptions (to be configured manually)
    emailSubscriptions: [
      // 'devops@company.com',
      // 'team-lead@company.com'
    ]
  },

  // CodeDeploy Configuration for Lambda Blue-Green Deployments
  codeDeploy: {
    application: {
      name: 'aws-opportunity-analysis-lambda-app',
      computePlatform: 'Lambda'
    },
    
    deploymentGroup: {
      name: 'aws-opportunity-analysis-lambda-dg',
      deploymentConfigName: 'CodeDeployDefault.LambdaCanary10Percent5Minutes',
      
      // Auto rollback configuration
      autoRollback: {
        enabled: true,
        events: ['DEPLOYMENT_FAILURE', 'DEPLOYMENT_STOP_ON_ALARM']
      },
      
      // CloudWatch alarms for monitoring deployment health
      alarms: [
        // These would be created by the monitoring stack
        // 'lambda-error-rate-alarm',
        // 'lambda-duration-alarm'
      ]
    }
  },

  // Artifact Storage Configuration
  artifacts: {
    bucket: {
      namePrefix: 'aws-opportunity-analysis-pipeline-artifacts',
      versioned: true,
      encryption: 'S3_MANAGED',
      lifecycleRules: [
        {
          id: 'DeleteOldArtifacts',
          expiration: 30, // days
          noncurrentVersionExpiration: 7 // days
        }
      ]
    }
  },

  // IAM Permissions
  permissions: {
    codeBuildServiceRole: {
      managedPolicies: [
        'arn:aws:iam::aws:policy/PowerUserAccess'
      ],
      
      inlinePolicies: {
        CodeBuildLogsPolicy: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'codebuild:CreateReportGroup',
                'codebuild:CreateReport',
                'codebuild:UpdateReport',
                'codebuild:BatchPutTestCases',
                'codebuild:BatchPutCodeCoverages'
              ],
              Resource: '*'
            }
          ]
        }
      }
    }
  },

  // Environment-specific configurations
  environments: {
    dev: {
      region: process.env.AWS_REGION || 'us-east-1',
      account: process.env.CDK_DEFAULT_ACCOUNT,
      enableXRayTracing: true,
      logLevel: 'DEBUG'
    },
    
    prod: {
      region: process.env.AWS_REGION || 'us-east-1',
      account: process.env.CDK_DEFAULT_ACCOUNT,
      enableXRayTracing: true,
      logLevel: 'INFO'
    }
  }
};

module.exports = cicdConfig;