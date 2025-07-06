const { Stack, Duration, RemovalPolicy } = require('aws-cdk-lib');
const { Construct } = require('constructs');
const synthetics = require('aws-cdk-lib/aws-synthetics');
const iam = require('aws-cdk-lib/aws-iam');
const s3 = require('aws-cdk-lib/aws-s3');
const cloudwatch = require('aws-cdk-lib/aws-cloudwatch');
const actions = require('aws-cdk-lib/aws-cloudwatch-actions');
const sns = require('aws-cdk-lib/aws-sns');
const subscriptions = require('aws-cdk-lib/aws-sns-subscriptions');
const lambda = require('aws-cdk-lib/aws-lambda');

/**
 * CloudWatch Synthetic Monitoring Stack for performance and availability testing
 */
class SyntheticMonitoringStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // S3 bucket for synthetic test artifacts
    const syntheticsBucket = new s3.Bucket(this, 'SyntheticsBucket', {
      bucketName: `aws-opportunity-analysis-synthetics-${this.account}`,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [{
        id: 'DeleteOldArtifacts',
        expiration: Duration.days(30)
      }]
    });

    // SNS topic for synthetic monitoring alerts
    const alertTopic = new sns.Topic(this, 'SyntheticsAlertTopic', {
      topicName: 'aws-opportunity-analysis-synthetics-alerts'
    });

    if (props?.notificationEmail) {
      alertTopic.addSubscription(
        new subscriptions.EmailSubscription(props.notificationEmail)
      );
    }

    // IAM role for synthetic canaries
    const syntheticsRole = new iam.Role(this, 'SyntheticsRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ],
      inlinePolicies: {
        SyntheticsPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:PutObject',
                's3:GetObject',
                's3:ListBucket',
                'cloudwatch:PutMetricData',
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
              ],
              resources: [
                syntheticsBucket.bucketArn,
                `${syntheticsBucket.bucketArn}/*`,
                '*'
              ]
            })
          ]
        })
      }
    });

    // API Availability Canary
    const apiAvailabilityCanary = new synthetics.Canary(this, 'ApiAvailabilityCanary', {
      canaryName: 'aws-opportunity-analysis-api-availability',
      schedule: synthetics.Schedule.rate(Duration.minutes(5)),
      test: synthetics.Test.custom({
        code: synthetics.Code.fromInline(`
const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

const apiAvailabilityBlueprint = async function () {
    const targetUrl = '${props?.targetUrl || 'http://localhost:8123'}';
    
    // Test health endpoint
    const healthResponse = await synthetics.executeStep('checkHealth', async function () {
        return await synthetics.makeRequest({
            hostname: new URL(targetUrl).hostname,
            port: new URL(targetUrl).port || 80,
            protocol: new URL(targetUrl).protocol,
            path: '/api/health',
            method: 'GET',
            headers: {
                'User-Agent': 'CloudWatch-Synthetics'
            }
        });
    });
    
    if (healthResponse.statusCode !== 200) {
        throw new Error(\`Health check failed with status \${healthResponse.statusCode}\`);
    }
    
    log.info('Health check passed');
    
    // Test main API endpoint with minimal data
    const apiResponse = await synthetics.executeStep('checkApiEndpoint', async function () {
        const testData = JSON.stringify({
            customerName: 'Synthetics Test Customer',
            region: 'us-east-1',
            closeDate: '2024-12-31',
            opportunityName: 'Synthetics Test Opportunity',
            description: 'Automated synthetic monitoring test'
        });
        
        return await synthetics.makeRequest({
            hostname: new URL(targetUrl).hostname,
            port: new URL(targetUrl).port || 80,
            protocol: new URL(targetUrl).protocol,
            path: '/api/analyze',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': testData.length,
                'User-Agent': 'CloudWatch-Synthetics'
            },
            postData: testData
        });
    });
    
    if (apiResponse.statusCode !== 200) {
        throw new Error(\`API endpoint failed with status \${apiResponse.statusCode}\`);
    }
    
    log.info('API endpoint check passed');
    
    return 'API availability check completed successfully';
};

exports.handler = async () => {
    return await synthetics.executeStep('apiAvailabilityBlueprint', apiAvailabilityBlueprint);
};
        `),
        handler: 'index.handler'
      }),
      runtime: synthetics.Runtime.SYNTHETICS_NODEJS_PUPPETEER_6_2,
      environmentVariables: {
        TARGET_URL: props?.targetUrl || 'http://localhost:8123'
      },
      role: syntheticsRole,
      artifactsBucketLocation: {
        bucket: syntheticsBucket
      }
    });

    // Performance Testing Canary
    const performanceCanary = new synthetics.Canary(this, 'PerformanceCanary', {
      canaryName: 'aws-opportunity-analysis-performance',
      schedule: synthetics.Schedule.rate(Duration.minutes(15)),
      test: synthetics.Test.custom({
        code: synthetics.Code.fromInline(`
const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

const performanceBlueprint = async function () {
    const targetUrl = '${props?.targetUrl || 'http://localhost:8123'}';
    const performanceThresholds = {
        responseTime: 30000, // 30 seconds
        healthCheckTime: 5000 // 5 seconds
    };
    
    // Measure health endpoint performance
    const healthStartTime = Date.now();
    const healthResponse = await synthetics.executeStep('measureHealthPerformance', async function () {
        return await synthetics.makeRequest({
            hostname: new URL(targetUrl).hostname,
            port: new URL(targetUrl).port || 80,
            protocol: new URL(targetUrl).protocol,
            path: '/api/health',
            method: 'GET',
            headers: {
                'User-Agent': 'CloudWatch-Synthetics-Performance'
            }
        });
    });
    
    const healthResponseTime = Date.now() - healthStartTime;
    
    if (healthResponseTime > performanceThresholds.healthCheckTime) {
        log.warn(\`Health endpoint slow: \${healthResponseTime}ms (threshold: \${performanceThresholds.healthCheckTime}ms)\`);
    }
    
    // Custom metric for health response time
    await synthetics.addUserAgentMetric('HealthResponseTime', healthResponseTime, 'Milliseconds');
    
    // Measure API endpoint performance
    const apiStartTime = Date.now();
    const apiResponse = await synthetics.executeStep('measureApiPerformance', async function () {
        const testData = JSON.stringify({
            customerName: 'Performance Test Customer',
            region: 'us-east-1',
            closeDate: '2024-12-31',
            opportunityName: 'Performance Test Opportunity',
            description: 'Performance monitoring test with detailed analysis requirements'
        });
        
        return await synthetics.makeRequest({
            hostname: new URL(targetUrl).hostname,
            port: new URL(targetUrl).port || 80,
            protocol: new URL(targetUrl).protocol,
            path: '/api/analyze',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': testData.length,
                'User-Agent': 'CloudWatch-Synthetics-Performance'
            },
            postData: testData
        });
    });
    
    const apiResponseTime = Date.now() - apiStartTime;
    
    if (apiResponseTime > performanceThresholds.responseTime) {
        throw new Error(\`API response time exceeded threshold: \${apiResponseTime}ms (threshold: \${performanceThresholds.responseTime}ms)\`);
    }
    
    // Custom metrics for API performance
    await synthetics.addUserAgentMetric('ApiResponseTime', apiResponseTime, 'Milliseconds');
    await synthetics.addUserAgentMetric('ApiResponseSize', apiResponse.responseBody ? apiResponse.responseBody.length : 0, 'Bytes');
    
    log.info(\`Performance test completed - Health: \${healthResponseTime}ms, API: \${apiResponseTime}ms\`);
    
    return 'Performance monitoring completed successfully';
};

exports.handler = async () => {
    return await synthetics.executeStep('performanceBlueprint', performanceBlueprint);
};
        `),
        handler: 'index.handler'
      }),
      runtime: synthetics.Runtime.SYNTHETICS_NODEJS_PUPPETEER_6_2,
      environmentVariables: {
        TARGET_URL: props?.targetUrl || 'http://localhost:8123'
      },
      role: syntheticsRole,
      artifactsBucketLocation: {
        bucket: syntheticsBucket
      }
    });

    // End-to-End User Journey Canary
    const userJourneyCanary = new synthetics.Canary(this, 'UserJourneyCanary', {
      canaryName: 'aws-opportunity-analysis-user-journey',
      schedule: synthetics.Schedule.rate(Duration.hours(1)),
      test: synthetics.Test.custom({
        code: synthetics.Code.fromInline(`
const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

const userJourneyBlueprint = async function () {
    const targetUrl = '${props?.targetUrl || 'http://localhost:8123'}';
    
    // Step 1: Load the main page
    await synthetics.executeStep('loadMainPage', async function () {
        const page = await synthetics.getPage();
        await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        
        // Check if page loaded correctly
        const title = await page.title();
        if (!title || title.trim() === '') {
            throw new Error('Page title is empty');
        }
        
        log.info(\`Page loaded with title: \${title}\`);
    });
    
    // Step 2: Fill out the opportunity form
    await synthetics.executeStep('fillOpportunityForm', async function () {
        const page = await synthetics.getPage();
        
        // Fill form fields
        await page.type('#customerName', 'E2E Test Customer');
        await page.select('#region', 'us-east-1');
        await page.type('#closeDate', '2024-12-31');
        await page.type('#opportunityName', 'E2E Test Opportunity');
        await page.type('#description', 'End-to-end test opportunity for comprehensive analysis');
        
        log.info('Form filled successfully');
    });
    
    // Step 3: Submit analysis request
    await synthetics.executeStep('submitAnalysis', async function () {
        const page = await synthetics.getPage();
        
        // Click analyze button
        await page.click('#analyzeButton');
        
        // Wait for analysis to complete (with timeout)
        await page.waitForSelector('#analysisResults', { timeout: 60000 });
        
        log.info('Analysis submitted and results received');
    });
    
    // Step 4: Verify results are displayed
    await synthetics.executeStep('verifyResults', async function () {
        const page = await synthetics.getPage();
        
        // Check if key result elements are present
        const predictedArr = await page.$('#predictedArr');
        const topServices = await page.$('#topServices');
        const confidence = await page.$('#confidence');
        
        if (!predictedArr || !topServices || !confidence) {
            throw new Error('Key result elements not found');
        }
        
        // Get result values for logging
        const arrValue = await page.evaluate(el => el.textContent, predictedArr);
        const servicesValue = await page.evaluate(el => el.textContent, topServices);
        const confidenceValue = await page.evaluate(el => el.textContent, confidence);
        
        log.info(\`Results verified - ARR: \${arrValue}, Services: \${servicesValue}, Confidence: \${confidenceValue}\`);
    });
    
    return 'User journey test completed successfully';
};

exports.handler = async () => {
    return await synthetics.executeStep('userJourneyBlueprint', userJourneyBlueprint);
};
        `),
        handler: 'index.handler'
      }),
      runtime: synthetics.Runtime.SYNTHETICS_NODEJS_PUPPETEER_6_2,
      environmentVariables: {
        TARGET_URL: props?.targetUrl || 'http://localhost:8123'
      },
      role: syntheticsRole,
      artifactsBucketLocation: {
        bucket: syntheticsBucket
      }
    });

    // Lambda function for synthetic monitoring analysis
    const syntheticsAnalyzer = new lambda.Function(this, 'SyntheticsAnalyzer', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { CloudWatchClient, GetMetricStatisticsCommand } = require('@aws-sdk/client-cloudwatch');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const cloudwatch = new CloudWatchClient();
const sns = new SNSClient();

exports.handler = async (event) => {
  console.log('Synthetics analyzer triggered:', JSON.stringify(event, null, 2));
  
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // Last hour
  
  try {
    // Get synthetic canary metrics
    const canaryNames = [
      'aws-opportunity-analysis-api-availability',
      'aws-opportunity-analysis-performance',
      'aws-opportunity-analysis-user-journey'
    ];
    
    const canaryResults = [];
    
    for (const canaryName of canaryNames) {
      // Get success rate
      const successMetrics = await cloudwatch.send(new GetMetricStatisticsCommand({
        Namespace: 'CloudWatchSynthetics',
        MetricName: 'SuccessPercent',
        Dimensions: [
          {
            Name: 'CanaryName',
            Value: canaryName
          }
        ],
        StartTime: startTime,
        EndTime: endTime,
        Period: 300,
        Statistics: ['Average']
      }));
      
      // Get duration metrics
      const durationMetrics = await cloudwatch.send(new GetMetricStatisticsCommand({
        Namespace: 'CloudWatchSynthetics',
        MetricName: 'Duration',
        Dimensions: [
          {
            Name: 'CanaryName',
            Value: canaryName
          }
        ],
        StartTime: startTime,
        EndTime: endTime,
        Period: 300,
        Statistics: ['Average', 'Max']
      }));
      
      const result = {
        canaryName,
        successRate: calculateAverage(successMetrics.Datapoints, 'Average'),
        avgDuration: calculateAverage(durationMetrics.Datapoints, 'Average'),
        maxDuration: calculateMax(durationMetrics.Datapoints, 'Maximum'),
        status: 'healthy'
      };
      
      // Determine status
      if (result.successRate < 95) {
        result.status = 'unhealthy';
        result.reason = 'Low success rate';
      } else if (result.maxDuration > 30000) {
        result.status = 'degraded';
        result.reason = 'High response times';
      }
      
      canaryResults.push(result);
    }
    
    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      canaries: canaryResults,
      summary: {
        totalCanaries: canaryResults.length,
        healthy: canaryResults.filter(c => c.status === 'healthy').length,
        degraded: canaryResults.filter(c => c.status === 'degraded').length,
        unhealthy: canaryResults.filter(c => c.status === 'unhealthy').length
      }
    };
    
    // Send alert if issues detected
    if (report.summary.unhealthy > 0 || report.summary.degraded > 0) {
      await sns.send(new PublishCommand({
        TopicArn: process.env.ALERT_TOPIC_ARN,
        Subject: 'Synthetic Monitoring Alert',
        Message: \`Synthetic monitoring detected issues:
        
Unhealthy canaries: \${report.summary.unhealthy}
Degraded canaries: \${report.summary.degraded}

Details:
\${JSON.stringify(report, null, 2)}\`
      }));
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify(report)
    };
    
  } catch (error) {
    console.error('Synthetics analysis error:', error);
    
    await sns.send(new PublishCommand({
      TopicArn: process.env.ALERT_TOPIC_ARN,
      Subject: 'Synthetic Monitoring Analysis Failed',
      Message: \`Synthetic monitoring analysis failed: \${error.message}\`
    }));
    
    throw error;
  }
};

function calculateAverage(datapoints, statistic) {
  if (!datapoints || datapoints.length === 0) return 0;
  const sum = datapoints.reduce((acc, point) => acc + (point[statistic] || 0), 0);
  return sum / datapoints.length;
}

function calculateMax(datapoints, statistic) {
  if (!datapoints || datapoints.length === 0) return 0;
  return Math.max(...datapoints.map(point => point[statistic] || 0));
}
      `),
      environment: {
        ALERT_TOPIC_ARN: alertTopic.topicArn
      },
      timeout: Duration.minutes(5)
    });

    alertTopic.grantPublish(syntheticsAnalyzer);

    // CloudWatch alarms for synthetic monitoring
    const availabilityAlarm = new cloudwatch.Alarm(this, 'AvailabilityAlarm', {
      alarmName: 'aws-opportunity-analysis-availability-alarm',
      alarmDescription: 'Alert when API availability drops below threshold',
      metric: new cloudwatch.Metric({
        namespace: 'CloudWatchSynthetics',
        metricName: 'SuccessPercent',
        dimensionsMap: {
          CanaryName: apiAvailabilityCanary.canaryName
        },
        statistic: 'Average'
      }),
      threshold: 95,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING
    });

    const performanceAlarm = new cloudwatch.Alarm(this, 'PerformanceAlarm', {
      alarmName: 'aws-opportunity-analysis-performance-alarm',
      alarmDescription: 'Alert when API response time exceeds threshold',
      metric: new cloudwatch.Metric({
        namespace: 'CloudWatchSynthetics',
        metricName: 'Duration',
        dimensionsMap: {
          CanaryName: performanceCanary.canaryName
        },
        statistic: 'Average'
      }),
      threshold: 25000, // 25 seconds
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // Add alarm actions
    availabilityAlarm.addAlarmAction(new actions.SnsAction(alertTopic));
    performanceAlarm.addAlarmAction(new actions.SnsAction(alertTopic));

    // CloudWatch dashboard for synthetic monitoring
    const syntheticsDashboard = new cloudwatch.Dashboard(this, 'SyntheticsDashboard', {
      dashboardName: 'AWS-Opportunity-Analysis-Synthetic-Monitoring'
    });

    syntheticsDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Availability',
        left: [
          new cloudwatch.Metric({
            namespace: 'CloudWatchSynthetics',
            metricName: 'SuccessPercent',
            dimensionsMap: {
              CanaryName: apiAvailabilityCanary.canaryName
            },
            statistic: 'Average'
          })
        ],
        width: 12
      }),
      new cloudwatch.GraphWidget({
        title: 'Response Times',
        left: [
          new cloudwatch.Metric({
            namespace: 'CloudWatchSynthetics',
            metricName: 'Duration',
            dimensionsMap: {
              CanaryName: performanceCanary.canaryName
            },
            statistic: 'Average',
            label: 'Average Response Time'
          }),
          new cloudwatch.Metric({
            namespace: 'CloudWatchSynthetics',
            metricName: 'Duration',
            dimensionsMap: {
              CanaryName: performanceCanary.canaryName
            },
            statistic: 'Maximum',
            label: 'Max Response Time'
          })
        ],
        width: 12
      }),
      new cloudwatch.GraphWidget({
        title: 'User Journey Success Rate',
        left: [
          new cloudwatch.Metric({
            namespace: 'CloudWatchSynthetics',
            metricName: 'SuccessPercent',
            dimensionsMap: {
              CanaryName: userJourneyCanary.canaryName
            },
            statistic: 'Average'
          })
        ],
        width: 12
      })
    );

    // Outputs
    this.apiAvailabilityCanary = apiAvailabilityCanary;
    this.performanceCanary = performanceCanary;
    this.userJourneyCanary = userJourneyCanary;
    this.syntheticsAnalyzer = syntheticsAnalyzer;
    this.syntheticsBucket = syntheticsBucket;
    this.alertTopic = alertTopic;
    this.syntheticsDashboard = syntheticsDashboard;
  }
}

module.exports = { SyntheticMonitoringStack };