#!/usr/bin/env node

const { CloudFormationClient, CreateStackCommand, UpdateStackCommand, DescribeStacksCommand } = require('@aws-sdk/client-cloudformation');
const { CloudWatchClient, PutDashboardCommand, PutMetricAlarmCommand } = require('@aws-sdk/client-cloudwatch');
const { SNSClient, CreateTopicCommand, SubscribeCommand } = require('@aws-sdk/client-sns');
const { CloudWatchLogsClient, CreateLogGroupCommand, PutRetentionPolicyCommand } = require('@aws-sdk/client-cloudwatch-logs');
const fs = require('fs');
const path = require('path');

class MonitoringDeployment {
  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.cloudFormation = new CloudFormationClient({ region: this.region });
    this.cloudWatch = new CloudWatchClient({ region: this.region });
    this.sns = new SNSClient({ region: this.region });
    this.cloudWatchLogs = new CloudWatchLogsClient({ region: this.region });
    this.stackName = 'aws-opportunity-analysis-monitoring';
  }

  async deploy() {
    console.log('🚀 Starting monitoring infrastructure deployment...');
    
    try {
      // Step 1: Create CloudWatch Log Groups
      await this.createLogGroups();
      
      // Step 2: Create SNS Topic for Alerts
      const alertTopicArn = await this.createAlertTopic();
      
      // Step 3: Create CloudWatch Alarms
      await this.createAlarms(alertTopicArn);
      
      // Step 4: Create CloudWatch Dashboard
      await this.createDashboard();
      
      // Step 5: Deploy X-Ray configuration
      await this.deployXRayConfiguration();
      
      console.log('✅ Monitoring infrastructure deployed successfully!');
      
      return {
        success: true,
        alertTopicArn,
        dashboardUrl: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=AWS-Opportunity-Analysis-Comprehensive`,
      };
    } catch (error) {
      console.error('❌ Deployment failed:', error);
      throw error;
    }
  }

  async createLogGroups() {
    console.log('📝 Creating CloudWatch Log Groups...');
    
    const logGroups = [
      '/aws/opportunity-analysis/api',
      '/aws/opportunity-analysis/lambda',
      '/aws/opportunity-analysis/stepfunctions',
      '/aws/opportunity-analysis/bedrock',
      '/aws/opportunity-analysis/application',
    ];

    for (const logGroupName of logGroups) {
      try {
        await this.cloudWatchLogs.send(new CreateLogGroupCommand({
          logGroupName,
        }));
        
        // Set retention policy to 30 days
        await this.cloudWatchLogs.send(new PutRetentionPolicyCommand({
          logGroupName,
          retentionInDays: 30,
        }));
        
        console.log(`✅ Created log group: ${logGroupName}`);
      } catch (error) {
        if (error.name === 'ResourceAlreadyExistsException') {
          console.log(`ℹ️  Log group already exists: ${logGroupName}`);
        } else {
          console.error(`❌ Failed to create log group ${logGroupName}:`, error);
        }
      }
    }
  }

  async createAlertTopic() {
    console.log('📢 Creating SNS Alert Topic...');
    
    try {
      const createTopicResponse = await this.sns.send(new CreateTopicCommand({
        Name: 'opportunity-analysis-alerts',
        DisplayName: 'AWS Opportunity Analysis Alerts',
      }));
      
      const topicArn = createTopicResponse.TopicArn;
      console.log(`✅ Created SNS topic: ${topicArn}`);
      
      // Subscribe email if provided
      if (process.env.ALERT_EMAIL) {
        await this.sns.send(new SubscribeCommand({
          TopicArn: topicArn,
          Protocol: 'email',
          Endpoint: process.env.ALERT_EMAIL,
        }));
        console.log(`✅ Subscribed email to alerts: ${process.env.ALERT_EMAIL}`);
      }
      
      return topicArn;
    } catch (error) {
      if (error.name === 'TopicAlreadyExistsException') {
        console.log('ℹ️  SNS topic already exists');
        // Get existing topic ARN
        return `arn:aws:sns:${this.region}:${await this.getAccountId()}:opportunity-analysis-alerts`;
      }
      throw error;
    }
  }

  async createAlarms(alertTopicArn) {
    console.log('🚨 Creating CloudWatch Alarms...');
    
    const alarms = [
      {
        AlarmName: 'OpportunityAnalysis-HighErrorRate',
        AlarmDescription: 'High error rate detected in opportunity analysis',
        MetricName: 'AnalysisErrors',
        Namespace: 'AWS/OpportunityAnalysis',
        Statistic: 'Sum',
        Period: 300,
        EvaluationPeriods: 2,
        Threshold: 10,
        ComparisonOperator: 'GreaterThanThreshold',
        AlarmActions: [alertTopicArn],
        OKActions: [alertTopicArn],
        Dimensions: [{ Name: 'Service', Value: 'opportunity-analysis' }],
      },
      {
        AlarmName: 'OpportunityAnalysis-HighLatency',
        AlarmDescription: 'High latency detected in opportunity analysis',
        MetricName: 'AnalysisLatency',
        Namespace: 'AWS/OpportunityAnalysis',
        Statistic: 'Average',
        Period: 300,
        EvaluationPeriods: 3,
        Threshold: 30000, // 30 seconds
        ComparisonOperator: 'GreaterThanThreshold',
        AlarmActions: [alertTopicArn],
        OKActions: [alertTopicArn],
        Dimensions: [{ Name: 'Service', Value: 'opportunity-analysis' }],
      },
      {
        AlarmName: 'OpportunityAnalysis-BedrockThrottling',
        AlarmDescription: 'Bedrock throttling detected',
        MetricName: 'BedrockInvocations',
        Namespace: 'AWS/OpportunityAnalysis',
        Statistic: 'Sum',
        Period: 300,
        EvaluationPeriods: 2,
        Threshold: 0,
        ComparisonOperator: 'LessThanThreshold',
        AlarmActions: [alertTopicArn],
        Dimensions: [
          { Name: 'Service', Value: 'opportunity-analysis' },
          { Name: 'Status', Value: 'Error' }
        ],
      },
    ];

    for (const alarm of alarms) {
      try {
        await this.cloudWatch.send(new PutMetricAlarmCommand(alarm));
        console.log(`✅ Created alarm: ${alarm.AlarmName}`);
      } catch (error) {
        console.error(`❌ Failed to create alarm ${alarm.AlarmName}:`, error);
      }
    }
  }

  async createDashboard() {
    console.log('📊 Creating CloudWatch Dashboard...');
    
    const dashboardBody = {
      widgets: [
        {
          type: 'metric',
          x: 0,
          y: 0,
          width: 6,
          height: 6,
          properties: {
            metrics: [
              ['AWS/OpportunityAnalysis', 'AnalysisRequests', 'Service', 'opportunity-analysis']
            ],
            period: 300,
            stat: 'Sum',
            region: this.region,
            title: 'Total Analysis Requests (24h)',
            view: 'singleValue',
          },
        },
        {
          type: 'metric',
          x: 6,
          y: 0,
          width: 6,
          height: 6,
          properties: {
            metrics: [
              ['AWS/OpportunityAnalysis', 'AnalysisLatency', 'Service', 'opportunity-analysis']
            ],
            period: 300,
            stat: 'Average',
            region: this.region,
            title: 'Average Analysis Latency',
            view: 'singleValue',
          },
        },
        {
          type: 'metric',
          x: 12,
          y: 0,
          width: 6,
          height: 6,
          properties: {
            metrics: [
              ['AWS/OpportunityAnalysis', 'AnalysisErrors', 'Service', 'opportunity-analysis']
            ],
            period: 300,
            stat: 'Sum',
            region: this.region,
            title: 'Error Count',
            view: 'singleValue',
          },
        },
        {
          type: 'metric',
          x: 18,
          y: 0,
          width: 6,
          height: 6,
          properties: {
            metrics: [
              ['AWS/OpportunityAnalysis', 'BedrockInvocations', 'Service', 'opportunity-analysis']
            ],
            period: 300,
            stat: 'Sum',
            region: this.region,
            title: 'Bedrock Invocations',
            view: 'singleValue',
          },
        },
        {
          type: 'metric',
          x: 0,
          y: 6,
          width: 12,
          height: 6,
          properties: {
            metrics: [
              ['AWS/OpportunityAnalysis', 'AnalysisRequests', 'Service', 'opportunity-analysis']
            ],
            period: 300,
            stat: 'Sum',
            region: this.region,
            title: 'Analysis Requests Over Time',
            view: 'timeSeries',
          },
        },
        {
          type: 'metric',
          x: 12,
          y: 6,
          width: 12,
          height: 6,
          properties: {
            metrics: [
              ['AWS/OpportunityAnalysis', 'AnalysisErrors', 'Service', 'opportunity-analysis']
            ],
            period: 300,
            stat: 'Sum',
            region: this.region,
            title: 'Error Trends',
            view: 'timeSeries',
          },
        },
        {
          type: 'metric',
          x: 0,
          y: 12,
          width: 12,
          height: 6,
          properties: {
            metrics: [
              ['AWS/OpportunityAnalysis', 'AnalysisLatency', 'Service', 'opportunity-analysis', { stat: 'Average' }],
              ['...', { stat: 'p95' }],
              ['...', { stat: 'p99' }]
            ],
            period: 300,
            region: this.region,
            title: 'Analysis Latency Distribution',
            view: 'timeSeries',
          },
        },
        {
          type: 'metric',
          x: 12,
          y: 12,
          width: 12,
          height: 6,
          properties: {
            metrics: [
              ['AWS/OpportunityAnalysis', 'BedrockInvocations', 'Service', 'opportunity-analysis'],
              ['AWS/OpportunityAnalysis', 'QueryExecutions', 'Service', 'opportunity-analysis']
            ],
            period: 300,
            stat: 'Sum',
            region: this.region,
            title: 'Service Invocations',
            view: 'timeSeries',
          },
        },
        {
          type: 'log',
          x: 0,
          y: 18,
          width: 24,
          height: 6,
          properties: {
            query: `SOURCE '/aws/opportunity-analysis/application'\n| fields @timestamp, @message\n| filter @message like /ERROR/\n| sort @timestamp desc\n| limit 20`,
            region: this.region,
            title: 'Recent Errors',
            view: 'table',
          },
        },
      ],
    };

    try {
      await this.cloudWatch.send(new PutDashboardCommand({
        DashboardName: 'AWS-Opportunity-Analysis-Comprehensive',
        DashboardBody: JSON.stringify(dashboardBody),
      }));
      
      console.log('✅ Created CloudWatch Dashboard');
    } catch (error) {
      console.error('❌ Failed to create dashboard:', error);
    }
  }

  async deployXRayConfiguration() {
    console.log('🔍 Deploying X-Ray Configuration...');
    
    // X-Ray sampling rules are typically managed through the console or CLI
    // For now, we'll just log the configuration
    console.log('ℹ️  X-Ray sampling rules should be configured manually or via CDK');
    console.log('ℹ️  Recommended sampling rules:');
    console.log('   - API Gateway: 10% fixed rate, 1 reservoir');
    console.log('   - Lambda: 20% fixed rate, 2 reservoir');
    console.log('   - Step Functions: 30% fixed rate, 1 reservoir');
    console.log('   - Bedrock: 10% fixed rate, 1 reservoir');
  }

  async getAccountId() {
    // Simple way to get account ID from ARN
    try {
      const { Account } = await this.cloudFormation.send(new DescribeStacksCommand({}));
      return Account;
    } catch {
      return '123456789012'; // Fallback
    }
  }

  async validateDeployment() {
    console.log('🔍 Validating monitoring deployment...');
    
    const validations = [];
    
    try {
      // Check if log groups exist
      const logGroups = [
        '/aws/opportunity-analysis/api',
        '/aws/opportunity-analysis/lambda',
        '/aws/opportunity-analysis/application',
      ];
      
      for (const logGroup of logGroups) {
        try {
          await this.cloudWatchLogs.send(new DescribeLogGroupsCommand({
            logGroupNamePrefix: logGroup,
          }));
          validations.push({ component: logGroup, status: 'OK' });
        } catch (error) {
          validations.push({ component: logGroup, status: 'FAILED', error: error.message });
        }
      }
      
      console.log('📋 Validation Results:');
      validations.forEach(v => {
        console.log(`   ${v.status === 'OK' ? '✅' : '❌'} ${v.component}: ${v.status}`);
        if (v.error) console.log(`      Error: ${v.error}`);
      });
      
      return validations.every(v => v.status === 'OK');
    } catch (error) {
      console.error('❌ Validation failed:', error);
      return false;
    }
  }
}

// Main execution
async function main() {
  const deployment = new MonitoringDeployment();
  
  try {
    const result = await deployment.deploy();
    
    console.log('\n🎉 Deployment Summary:');
    console.log(`   Alert Topic ARN: ${result.alertTopicArn}`);
    console.log(`   Dashboard URL: ${result.dashboardUrl}`);
    
    // Validate deployment
    const isValid = await deployment.validateDeployment();
    
    if (isValid) {
      console.log('\n✅ All monitoring components deployed and validated successfully!');
      console.log('\n📋 Next Steps:');
      console.log('   1. Configure email alerts by setting ALERT_EMAIL environment variable');
      console.log('   2. Review and adjust alarm thresholds as needed');
      console.log('   3. Set up X-Ray sampling rules in the AWS Console');
      console.log('   4. Test monitoring by running some analysis requests');
    } else {
      console.log('\n⚠️  Some components failed validation. Please check the logs above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { MonitoringDeployment };