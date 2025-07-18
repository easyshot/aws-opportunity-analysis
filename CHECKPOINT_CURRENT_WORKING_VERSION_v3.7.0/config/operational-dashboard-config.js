/**
 * Operational Dashboard Configuration
 * 
 * This configuration defines CloudWatch dashboards, alarms, and monitoring
 * for the AWS Opportunity Analysis application.
 */

const { CloudWatchClient, PutDashboardCommand, PutMetricAlarmCommand } = require('@aws-sdk/client-cloudwatch');
const { SNSClient, CreateTopicCommand, SubscribeCommand } = require('@aws-sdk/client-sns');

class OperationalDashboardConfig {
    constructor(region = 'us-east-1') {
        this.region = region;
        this.cloudWatch = new CloudWatchClient({ region });
        this.sns = new SNSClient({ region });
        this.applicationName = 'aws-opportunity-analysis';
        this.environment = process.env.NODE_ENV || 'production';
    }

    /**
     * Create comprehensive CloudWatch dashboard
     */
    async createDashboard() {
        const dashboardBody = {
            widgets: [
                // Application Overview
                {
                    type: "metric",
                    x: 0, y: 0, width: 12, height: 6,
                    properties: {
                        metrics: [
                            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", this.applicationName],
                            [".", "TargetResponseTime", ".", "."],
                            [".", "HTTPCode_Target_2XX_Count", ".", "."],
                            [".", "HTTPCode_Target_4XX_Count", ".", "."],
                            [".", "HTTPCode_Target_5XX_Count", ".", "."]
                        ],
                        period: 300,
                        stat: "Sum",
                        region: this.region,
                        title: "Application Overview"
                    }
                },
                // AWS Service Metrics
                {
                    type: "metric",
                    x: 12, y: 0, width: 12, height: 6,
                    properties: {
                        metrics: [
                            ["AWS/Bedrock", "Invocations", "ModelId", "amazon.titan-text-express-v1"],
                            [".", "InvocationLatency", ".", "."],
                            ["AWS/Lambda", "Invocations", "FunctionName", "catapult_get_dataset"],
                            [".", "Duration", ".", "."],
                            [".", "Errors", ".", "."]
                        ],
                        period: 300,
                        stat: "Average",
                        region: this.region,
                        title: "AWS Services Performance"
                    }
                },
                // Database Performance
                {
                    type: "metric",
                    x: 0, y: 6, width: 12, height: 6,
                    properties: {
                        metrics: [
                            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", "analysis-results"],
                            [".", "ConsumedWriteCapacityUnits", ".", "."],
                            [".", "ThrottledRequests", ".", "."],
                            ["AWS/Athena", "QueryExecutionTime", "WorkGroup", "primary"]
                        ],
                        period: 300,
                        stat: "Sum",
                        region: this.region,
                        title: "Database Performance"
                    }
                },
                // Error Rates and Availability
                {
                    type: "metric",
                    x: 12, y: 6, width: 12, height: 6,
                    properties: {
                        metrics: [
                            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", this.applicationName],
                            [".", "HTTPCode_Target_4XX_Count", ".", "."],
                            ["AWS/Lambda", "Errors", "FunctionName", "catapult_get_dataset"],
                            [".", "Throttles", ".", "."]
                        ],
                        period: 300,
                        stat: "Sum",
                        region: this.region,
                        title: "Error Rates"
                    }
                },
                // Cost Monitoring
                {
                    type: "metric",
                    x: 0, y: 12, width: 24, height: 6,
                    properties: {
                        metrics: [
                            ["AWS/Billing", "EstimatedCharges", "Currency", "USD", "ServiceName", "AmazonBedrock"],
                            [".", ".", ".", ".", ".", "AWSLambda"],
                            [".", ".", ".", ".", ".", "AmazonDynamoDB"],
                            [".", ".", ".", ".", ".", "AmazonAthena"]
                        ],
                        period: 86400,
                        stat: "Maximum",
                        region: "us-east-1",
                        title: "Daily Cost Breakdown"
                    }
                }
            ]
        };

        const command = new PutDashboardCommand({
            DashboardName: `${this.applicationName}-${this.environment}`,
            DashboardBody: JSON.stringify(dashboardBody)
        });

        try {
            await this.cloudWatch.send(command);
            console.log(`Dashboard created: ${this.applicationName}-${this.environment}`);
        } catch (error) {
            console.error('Failed to create dashboard:', error);
            throw error;
        }
    }

    /**
     * Create CloudWatch alarms for critical metrics
     */
    async createAlarms() {
        const alarms = [
            // High Error Rate Alarm
            {
                AlarmName: `${this.applicationName}-high-error-rate`,
                AlarmDescription: 'High error rate detected',
                MetricName: 'HTTPCode_Target_5XX_Count',
                Namespace: 'AWS/ApplicationELB',
                Statistic: 'Sum',
                Period: 300,
                EvaluationPeriods: 2,
                Threshold: 10,
                ComparisonOperator: 'GreaterThanThreshold',
                Dimensions: [
                    { Name: 'LoadBalancer', Value: this.applicationName }
                ]
            },
            // High Response Time Alarm
            {
                AlarmName: `${this.applicationName}-high-response-time`,
                AlarmDescription: 'High response time detected',
                MetricName: 'TargetResponseTime',
                Namespace: 'AWS/ApplicationELB',
                Statistic: 'Average',
                Period: 300,
                EvaluationPeriods: 3,
                Threshold: 30,
                ComparisonOperator: 'GreaterThanThreshold',
                Dimensions: [
                    { Name: 'LoadBalancer', Value: this.applicationName }
                ]
            },
            // Lambda Function Errors
            {
                AlarmName: `${this.applicationName}-lambda-errors`,
                AlarmDescription: 'Lambda function errors detected',
                MetricName: 'Errors',
                Namespace: 'AWS/Lambda',
                Statistic: 'Sum',
                Period: 300,
                EvaluationPeriods: 2,
                Threshold: 5,
                ComparisonOperator: 'GreaterThanThreshold',
                Dimensions: [
                    { Name: 'FunctionName', Value: 'catapult_get_dataset' }
                ]
            },
            // DynamoDB Throttling
            {
                AlarmName: `${this.applicationName}-dynamodb-throttling`,
                AlarmDescription: 'DynamoDB throttling detected',
                MetricName: 'ThrottledRequests',
                Namespace: 'AWS/DynamoDB',
                Statistic: 'Sum',
                Period: 300,
                EvaluationPeriods: 1,
                Threshold: 1,
                ComparisonOperator: 'GreaterThanOrEqualToThreshold',
                Dimensions: [
                    { Name: 'TableName', Value: 'analysis-results' }
                ]
            },
            // High Cost Alert
            {
                AlarmName: `${this.applicationName}-high-cost`,
                AlarmDescription: 'Daily costs exceeding threshold',
                MetricName: 'EstimatedCharges',
                Namespace: 'AWS/Billing',
                Statistic: 'Maximum',
                Period: 86400,
                EvaluationPeriods: 1,
                Threshold: 100,
                ComparisonOperator: 'GreaterThanThreshold',
                Dimensions: [
                    { Name: 'Currency', Value: 'USD' }
                ]
            }
        ];

        for (const alarm of alarms) {
            try {
                const command = new PutMetricAlarmCommand(alarm);
                await this.cloudWatch.send(command);
                console.log(`Alarm created: ${alarm.AlarmName}`);
            } catch (error) {
                console.error(`Failed to create alarm ${alarm.AlarmName}:`, error);
            }
        }
    }

    /**
     * Create SNS topic for notifications
     */
    async createNotificationTopic() {
        try {
            const createTopicCommand = new CreateTopicCommand({
                Name: `${this.applicationName}-alerts`
            });
            
            const topicResult = await this.sns.send(createTopicCommand);
            console.log(`SNS topic created: ${topicResult.TopicArn}`);
            
            return topicResult.TopicArn;
        } catch (error) {
            console.error('Failed to create SNS topic:', error);
            throw error;
        }
    }

    /**
     * Subscribe email to notifications
     */
    async subscribeToNotifications(topicArn, email) {
        try {
            const subscribeCommand = new SubscribeCommand({
                TopicArn: topicArn,
                Protocol: 'email',
                Endpoint: email
            });
            
            await this.sns.send(subscribeCommand);
            console.log(`Email subscription created: ${email}`);
        } catch (error) {
            console.error('Failed to subscribe to notifications:', error);
            throw error;
        }
    }

    /**
     * Get dashboard configuration for external monitoring tools
     */
    getDashboardConfig() {
        return {
            dashboardName: `${this.applicationName}-${this.environment}`,
            region: this.region,
            metrics: {
                application: {
                    requestCount: 'AWS/ApplicationELB.RequestCount',
                    responseTime: 'AWS/ApplicationELB.TargetResponseTime',
                    errorRate: 'AWS/ApplicationELB.HTTPCode_Target_5XX_Count'
                },
                bedrock: {
                    invocations: 'AWS/Bedrock.Invocations',
                    latency: 'AWS/Bedrock.InvocationLatency'
                },
                lambda: {
                    invocations: 'AWS/Lambda.Invocations',
                    duration: 'AWS/Lambda.Duration',
                    errors: 'AWS/Lambda.Errors'
                },
                dynamodb: {
                    readCapacity: 'AWS/DynamoDB.ConsumedReadCapacityUnits',
                    writeCapacity: 'AWS/DynamoDB.ConsumedWriteCapacityUnits',
                    throttling: 'AWS/DynamoDB.ThrottledRequests'
                }
            },
            alarmThresholds: {
                errorRate: 10,
                responseTime: 30,
                lambdaErrors: 5,
                dynamodbThrottling: 1,
                dailyCost: 100
            }
        };
    }

    /**
     * Initialize complete monitoring setup
     */
    async initialize(notificationEmail) {
        try {
            console.log('Initializing operational dashboard...');
            
            // Create dashboard
            await this.createDashboard();
            
            // Create alarms
            await this.createAlarms();
            
            // Create notification topic and subscription
            if (notificationEmail) {
                const topicArn = await this.createNotificationTopic();
                await this.subscribeToNotifications(topicArn, notificationEmail);
            }
            
            console.log('Operational dashboard initialization completed');
            return this.getDashboardConfig();
        } catch (error) {
            console.error('Failed to initialize operational dashboard:', error);
            throw error;
        }
    }
}

module.exports = OperationalDashboardConfig;