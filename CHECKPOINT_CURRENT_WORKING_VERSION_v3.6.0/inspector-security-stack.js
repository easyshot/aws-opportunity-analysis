const { Stack, Duration, RemovalPolicy } = require('aws-cdk-lib');
const { Construct } = require('constructs');
const lambda = require('aws-cdk-lib/aws-lambda');
const iam = require('aws-cdk-lib/aws-iam');
const events = require('aws-cdk-lib/aws-events');
const targets = require('aws-cdk-lib/aws-events-targets');
const sns = require('aws-cdk-lib/aws-sns');
const subscriptions = require('aws-cdk-lib/aws-sns-subscriptions');
const s3 = require('aws-cdk-lib/aws-s3');
const cloudwatch = require('aws-cdk-lib/aws-cloudwatch');

/**
 * AWS Inspector Security Testing Stack for automated vulnerability assessments
 */
class InspectorSecurityStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // S3 bucket for security reports
    const securityReportsBucket = new s3.Bucket(this, 'SecurityReportsBucket', {
      bucketName: `aws-opportunity-analysis-security-reports-${this.account}`,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: true,
      lifecycleRules: [{
        id: 'DeleteOldReports',
        expiration: Duration.days(90)
      }]
    });

    // SNS topic for security alerts
    const securityAlertTopic = new sns.Topic(this, 'SecurityAlertTopic', {
      topicName: 'aws-opportunity-analysis-security-alerts'
    });

    if (props?.notificationEmail) {
      securityAlertTopic.addSubscription(
        new subscriptions.EmailSubscription(props.notificationEmail)
      );
    }

    // Lambda function for Inspector V2 integration
    const inspectorOrchestrator = new lambda.Function(this, 'InspectorOrchestrator', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { Inspector2Client, ListFindingsCommand, GetFindingsReportCommand, CreateFindingsReportCommand } = require('@aws-sdk/client-inspector2');
const { ECRClient, DescribeRepositoriesCommand, ListImagesCommand } = require('@aws-sdk/client-ecr');
const { LambdaClient, ListFunctionsCommand } = require('@aws-sdk/client-lambda');
const { EC2Client, DescribeInstancesCommand } = require('@aws-sdk/client-ec2');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const inspector = new Inspector2Client();
const ecr = new ECRClient();
const lambda = new LambdaClient();
const ec2 = new EC2Client();
const sns = new SNSClient();
const s3 = new S3Client();

exports.handler = async (event) => {
  console.log('Inspector orchestrator triggered:', JSON.stringify(event, null, 2));
  
  const action = event.action || 'scan';
  
  try {
    switch (action) {
      case 'scan':
        return await performSecurityScan();
      case 'report':
        return await generateSecurityReport();
      case 'findings':
        return await getLatestFindings();
      default:
        throw new Error(\`Unknown action: \${action}\`);
    }
  } catch (error) {
    console.error('Inspector orchestration error:', error);
    
    await sns.send(new PublishCommand({
      TopicArn: process.env.SECURITY_ALERT_TOPIC_ARN,
      Subject: 'Security Scan Failed',
      Message: \`Security scan failed: \${error.message}\`
    }));
    
    throw error;
  }
};

async function performSecurityScan() {
  console.log('Starting comprehensive security scan...');
  
  const scanResults = {
    timestamp: new Date().toISOString(),
    scans: {
      lambda: await scanLambdaFunctions(),
      ecr: await scanECRImages(),
      ec2: await scanEC2Instances()
    },
    summary: {
      totalFindings: 0,
      criticalFindings: 0,
      highFindings: 0,
      mediumFindings: 0,
      lowFindings: 0
    }
  };
  
  // Aggregate findings
  Object.values(scanResults.scans).forEach(scan => {
    if (scan.findings) {
      scanResults.summary.totalFindings += scan.findings.length;
      scan.findings.forEach(finding => {
        switch (finding.severity) {
          case 'CRITICAL':
            scanResults.summary.criticalFindings++;
            break;
          case 'HIGH':
            scanResults.summary.highFindings++;
            break;
          case 'MEDIUM':
            scanResults.summary.mediumFindings++;
            break;
          case 'LOW':
            scanResults.summary.lowFindings++;
            break;
        }
      });
    }
  });
  
  // Save scan results
  const reportKey = \`security-scans/\${Date.now()}/scan-results.json\`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.SECURITY_REPORTS_BUCKET,
    Key: reportKey,
    Body: JSON.stringify(scanResults, null, 2),
    ContentType: 'application/json'
  }));
  
  // Send alert if critical findings
  if (scanResults.summary.criticalFindings > 0 || scanResults.summary.highFindings > 5) {
    await sns.send(new PublishCommand({
      TopicArn: process.env.SECURITY_ALERT_TOPIC_ARN,
      Subject: 'Critical Security Findings Detected',
      Message: \`Security scan completed with critical findings:
      
Critical: \${scanResults.summary.criticalFindings}
High: \${scanResults.summary.highFindings}
Medium: \${scanResults.summary.mediumFindings}
Low: \${scanResults.summary.lowFindings}

Full report: s3://\${process.env.SECURITY_REPORTS_BUCKET}/\${reportKey}\`
    }));
  }
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Security scan completed',
      summary: scanResults.summary,
      reportLocation: \`s3://\${process.env.SECURITY_REPORTS_BUCKET}/\${reportKey}\`
    })
  };
}

async function scanLambdaFunctions() {
  console.log('Scanning Lambda functions...');
  
  try {
    // Get Lambda functions
    const functionsResult = await lambda.send(new ListFunctionsCommand({}));
    const opportunityAnalysisFunctions = functionsResult.Functions.filter(fn => 
      fn.FunctionName.includes('opportunity-analysis') || 
      fn.FunctionName.includes('bedrock') ||
      fn.FunctionName.includes('catapult')
    );
    
    if (opportunityAnalysisFunctions.length === 0) {
      return { message: 'No relevant Lambda functions found', findings: [] };
    }
    
    // Get findings for Lambda functions
    const findings = await inspector.send(new ListFindingsCommand({
      filterCriteria: {
        resourceType: [{
          comparison: 'EQUALS',
          value: 'AWS_LAMBDA_FUNCTION'
        }]
      },
      maxResults: 100
    }));
    
    return {
      scannedFunctions: opportunityAnalysisFunctions.length,
      findings: findings.findings || []
    };
    
  } catch (error) {
    console.error('Lambda scan error:', error);
    return { error: error.message, findings: [] };
  }
}

async function scanECRImages() {
  console.log('Scanning ECR images...');
  
  try {
    // Get ECR repositories
    const reposResult = await ecr.send(new DescribeRepositoriesCommand({}));
    const opportunityAnalysisRepos = reposResult.repositories.filter(repo => 
      repo.repositoryName.includes('opportunity-analysis')
    );
    
    if (opportunityAnalysisRepos.length === 0) {
      return { message: 'No relevant ECR repositories found', findings: [] };
    }
    
    // Get findings for ECR images
    const findings = await inspector.send(new ListFindingsCommand({
      filterCriteria: {
        resourceType: [{
          comparison: 'EQUALS',
          value: 'AWS_ECR_CONTAINER_IMAGE'
        }]
      },
      maxResults: 100
    }));
    
    return {
      scannedRepositories: opportunityAnalysisRepos.length,
      findings: findings.findings || []
    };
    
  } catch (error) {
    console.error('ECR scan error:', error);
    return { error: error.message, findings: [] };
  }
}

async function scanEC2Instances() {
  console.log('Scanning EC2 instances...');
  
  try {
    // Get EC2 instances
    const instancesResult = await ec2.send(new DescribeInstancesCommand({}));
    const instances = [];
    
    instancesResult.Reservations.forEach(reservation => {
      reservation.Instances.forEach(instance => {
        if (instance.State.Name === 'running') {
          instances.push(instance);
        }
      });
    });
    
    if (instances.length === 0) {
      return { message: 'No running EC2 instances found', findings: [] };
    }
    
    // Get findings for EC2 instances
    const findings = await inspector.send(new ListFindingsCommand({
      filterCriteria: {
        resourceType: [{
          comparison: 'EQUALS',
          value: 'AWS_EC2_INSTANCE'
        }]
      },
      maxResults: 100
    }));
    
    return {
      scannedInstances: instances.length,
      findings: findings.findings || []
    };
    
  } catch (error) {
    console.error('EC2 scan error:', error);
    return { error: error.message, findings: [] };
  }
}

async function generateSecurityReport() {
  console.log('Generating comprehensive security report...');
  
  try {
    // Create findings report
    const reportResult = await inspector.send(new CreateFindingsReportCommand({
      reportFormat: 'JSON',
      s3Destination: {
        bucketName: process.env.SECURITY_REPORTS_BUCKET,
        keyPrefix: \`inspector-reports/\${Date.now()}/\`
      },
      filterCriteria: {
        firstObservedAt: [{
          startInclusive: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          endInclusive: new Date()
        }]
      }
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Security report generation initiated',
        reportId: reportResult.reportId
      })
    };
    
  } catch (error) {
    console.error('Report generation error:', error);
    throw error;
  }
}

async function getLatestFindings() {
  console.log('Getting latest security findings...');
  
  try {
    const findings = await inspector.send(new ListFindingsCommand({
      filterCriteria: {
        severity: [{
          comparison: 'EQUALS',
          value: 'CRITICAL'
        }, {
          comparison: 'EQUALS',
          value: 'HIGH'
        }],
        firstObservedAt: [{
          startInclusive: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          endInclusive: new Date()
        }]
      },
      maxResults: 50,
      sortCriteria: {
        field: 'FIRST_OBSERVED_AT',
        sortOrder: 'DESC'
      }
    }));
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Latest findings retrieved',
        findingsCount: findings.findings.length,
        findings: findings.findings
      })
    };
    
  } catch (error) {
    console.error('Get findings error:', error);
    throw error;
  }
}
      `),
      environment: {
        SECURITY_ALERT_TOPIC_ARN: securityAlertTopic.topicArn,
        SECURITY_REPORTS_BUCKET: securityReportsBucket.bucketName
      },
      timeout: Duration.minutes(10)
    });

    // Grant permissions to Inspector orchestrator
    inspectorOrchestrator.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'inspector2:ListFindings',
        'inspector2:GetFindings',
        'inspector2:CreateFindingsReport',
        'inspector2:GetFindingsReport',
        'inspector2:ListFindingsReports',
        'ecr:DescribeRepositories',
        'ecr:ListImages',
        'ecr:DescribeImages',
        'lambda:ListFunctions',
        'lambda:GetFunction',
        'ec2:DescribeInstances',
        'ec2:DescribeImages',
        'ec2:DescribeSecurityGroups'
      ],
      resources: ['*']
    }));

    securityAlertTopic.grantPublish(inspectorOrchestrator);
    securityReportsBucket.grantReadWrite(inspectorOrchestrator);

    // Lambda function for vulnerability assessment
    const vulnerabilityAssessor = new lambda.Function(this, 'VulnerabilityAssessor', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { Inspector2Client, ListFindingsCommand } = require('@aws-sdk/client-inspector2');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

const inspector = new Inspector2Client();
const sns = new SNSClient();
const cloudwatch = new CloudWatchClient();

exports.handler = async (event) => {
  console.log('Vulnerability assessor triggered:', JSON.stringify(event, null, 2));
  
  try {
    // Get all findings from the last 24 hours
    const findings = await inspector.send(new ListFindingsCommand({
      filterCriteria: {
        firstObservedAt: [{
          startInclusive: new Date(Date.now() - 24 * 60 * 60 * 1000),
          endInclusive: new Date()
        }]
      },
      maxResults: 1000
    }));
    
    // Analyze findings
    const analysis = {
      timestamp: new Date().toISOString(),
      totalFindings: findings.findings.length,
      severityBreakdown: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        informational: 0
      },
      resourceTypes: {},
      topVulnerabilities: [],
      riskScore: 0
    };
    
    // Process findings
    findings.findings.forEach(finding => {
      // Count by severity
      const severity = finding.severity.toLowerCase();
      if (analysis.severityBreakdown[severity] !== undefined) {
        analysis.severityBreakdown[severity]++;
      }
      
      // Count by resource type
      const resourceType = finding.resources[0]?.type || 'unknown';
      analysis.resourceTypes[resourceType] = (analysis.resourceTypes[resourceType] || 0) + 1;
      
      // Collect high-severity findings
      if (finding.severity === 'CRITICAL' || finding.severity === 'HIGH') {
        analysis.topVulnerabilities.push({
          title: finding.title,
          severity: finding.severity,
          type: finding.type,
          description: finding.description,
          remediation: finding.remediation?.recommendation?.text
        });
      }
    });
    
    // Calculate risk score (0-100)
    analysis.riskScore = Math.min(100, 
      (analysis.severityBreakdown.critical * 10) +
      (analysis.severityBreakdown.high * 5) +
      (analysis.severityBreakdown.medium * 2) +
      (analysis.severityBreakdown.low * 1)
    );
    
    // Send CloudWatch metrics
    const metricData = [
      {
        MetricName: 'CriticalFindings',
        Value: analysis.severityBreakdown.critical,
        Unit: 'Count',
        Dimensions: [
          {
            Name: 'Service',
            Value: 'AWS-Opportunity-Analysis'
          }
        ]
      },
      {
        MetricName: 'HighFindings',
        Value: analysis.severityBreakdown.high,
        Unit: 'Count',
        Dimensions: [
          {
            Name: 'Service',
            Value: 'AWS-Opportunity-Analysis'
          }
        ]
      },
      {
        MetricName: 'SecurityRiskScore',
        Value: analysis.riskScore,
        Unit: 'None',
        Dimensions: [
          {
            Name: 'Service',
            Value: 'AWS-Opportunity-Analysis'
          }
        ]
      }
    ];
    
    await cloudwatch.send(new PutMetricDataCommand({
      Namespace: 'Security/Inspector',
      MetricData: metricData
    }));
    
    // Send alert if high risk
    if (analysis.riskScore > 50 || analysis.severityBreakdown.critical > 0) {
      await sns.send(new PublishCommand({
        TopicArn: process.env.SECURITY_ALERT_TOPIC_ARN,
        Subject: \`High Security Risk Detected - Score: \${analysis.riskScore}\`,
        Message: \`Security vulnerability assessment completed with high risk:

Risk Score: \${analysis.riskScore}/100

Findings Summary:
- Critical: \${analysis.severityBreakdown.critical}
- High: \${analysis.severityBreakdown.high}
- Medium: \${analysis.severityBreakdown.medium}
- Low: \${analysis.severityBreakdown.low}

Top Vulnerabilities:
\${analysis.topVulnerabilities.slice(0, 5).map(v => \`- \${v.title} (\${v.severity})\`).join('\\n')}

Please review and remediate critical and high-severity findings immediately.\`
      }));
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify(analysis)
    };
    
  } catch (error) {
    console.error('Vulnerability assessment error:', error);
    
    await sns.send(new PublishCommand({
      TopicArn: process.env.SECURITY_ALERT_TOPIC_ARN,
      Subject: 'Vulnerability Assessment Failed',
      Message: \`Vulnerability assessment failed: \${error.message}\`
    }));
    
    throw error;
  }
};
      `),
      environment: {
        SECURITY_ALERT_TOPIC_ARN: securityAlertTopic.topicArn
      },
      timeout: Duration.minutes(5)
    });

    // Grant permissions to vulnerability assessor
    vulnerabilityAssessor.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'inspector2:ListFindings',
        'inspector2:GetFindings',
        'cloudwatch:PutMetricData'
      ],
      resources: ['*']
    }));

    securityAlertTopic.grantPublish(vulnerabilityAssessor);

    // EventBridge rules for scheduled security scans
    const dailySecurityScanRule = new events.Rule(this, 'DailySecurityScan', {
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '6', // 6 AM daily
        day: '*',
        month: '*',
        year: '*'
      }),
      description: 'Daily security scan with AWS Inspector'
    });

    dailySecurityScanRule.addTarget(new targets.LambdaFunction(inspectorOrchestrator, {
      event: events.RuleTargetInput.fromObject({
        action: 'scan'
      })
    }));

    // Weekly comprehensive security report
    const weeklyReportRule = new events.Rule(this, 'WeeklySecurityReport', {
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '8', // 8 AM on Mondays
        day: 'MON',
        month: '*',
        year: '*'
      }),
      description: 'Weekly comprehensive security report'
    });

    weeklyReportRule.addTarget(new targets.LambdaFunction(inspectorOrchestrator, {
      event: events.RuleTargetInput.fromObject({
        action: 'report'
      })
    }));

    // Hourly vulnerability assessment
    const hourlyAssessmentRule = new events.Rule(this, 'HourlyVulnerabilityAssessment', {
      schedule: events.Schedule.rate(Duration.hours(1)),
      description: 'Hourly vulnerability assessment'
    });

    hourlyAssessmentRule.addTarget(new targets.LambdaFunction(vulnerabilityAssessor));

    // CloudWatch alarms for security metrics
    const criticalFindingsAlarm = new cloudwatch.Alarm(this, 'CriticalFindingsAlarm', {
      alarmName: 'aws-opportunity-analysis-critical-security-findings',
      alarmDescription: 'Alert when critical security findings are detected',
      metric: new cloudwatch.Metric({
        namespace: 'Security/Inspector',
        metricName: 'CriticalFindings',
        dimensionsMap: {
          Service: 'AWS-Opportunity-Analysis'
        },
        statistic: 'Maximum'
      }),
      threshold: 0,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    const riskScoreAlarm = new cloudwatch.Alarm(this, 'SecurityRiskScoreAlarm', {
      alarmName: 'aws-opportunity-analysis-security-risk-score',
      alarmDescription: 'Alert when security risk score is too high',
      metric: new cloudwatch.Metric({
        namespace: 'Security/Inspector',
        metricName: 'SecurityRiskScore',
        dimensionsMap: {
          Service: 'AWS-Opportunity-Analysis'
        },
        statistic: 'Maximum'
      }),
      threshold: 75,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // Add alarm actions
    criticalFindingsAlarm.addAlarmAction(new cloudwatch.actions.SnsAction(securityAlertTopic));
    riskScoreAlarm.addAlarmAction(new cloudwatch.actions.SnsAction(securityAlertTopic));

    // CloudWatch dashboard for security monitoring
    const securityDashboard = new cloudwatch.Dashboard(this, 'SecurityDashboard', {
      dashboardName: 'AWS-Opportunity-Analysis-Security-Monitoring'
    });

    securityDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Security Findings by Severity',
        left: [
          new cloudwatch.Metric({
            namespace: 'Security/Inspector',
            metricName: 'CriticalFindings',
            dimensionsMap: { Service: 'AWS-Opportunity-Analysis' },
            statistic: 'Maximum',
            label: 'Critical'
          }),
          new cloudwatch.Metric({
            namespace: 'Security/Inspector',
            metricName: 'HighFindings',
            dimensionsMap: { Service: 'AWS-Opportunity-Analysis' },
            statistic: 'Maximum',
            label: 'High'
          })
        ],
        width: 12
      }),
      new cloudwatch.GraphWidget({
        title: 'Security Risk Score Trend',
        left: [
          new cloudwatch.Metric({
            namespace: 'Security/Inspector',
            metricName: 'SecurityRiskScore',
            dimensionsMap: { Service: 'AWS-Opportunity-Analysis' },
            statistic: 'Maximum'
          })
        ],
        width: 12
      })
    );

    // Outputs
    this.inspectorOrchestrator = inspectorOrchestrator;
    this.vulnerabilityAssessor = vulnerabilityAssessor;
    this.securityReportsBucket = securityReportsBucket;
    this.securityAlertTopic = securityAlertTopic;
    this.securityDashboard = securityDashboard;
  }
}

module.exports = { InspectorSecurityStack };