const { 
  CostExplorerClient, 
  GetCostAndUsageCommand,
  GetDimensionValuesCommand 
} = require('@aws-sdk/client-cost-explorer');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

const costExplorerClient = new CostExplorerClient({ region: 'us-east-1' });
const snsClient = new SNSClient({ region: process.env.AWS_REGION });
const cloudWatchClient = new CloudWatchClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  console.log('Cost monitoring event:', JSON.stringify(event, null, 2));
  
  try {
    const projectTag = process.env.PROJECT_TAG;
    const costThresholds = JSON.parse(process.env.COST_THRESHOLDS);
    const topicArn = process.env.COST_ALERTS_TOPIC_ARN;
    
    // Get current date range (yesterday to today for daily costs)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1);
    
    const dateFormat = (date) => date.toISOString().split('T')[0];
    
    // Get overall project costs
    const overallCostParams = {
      TimePeriod: {
        Start: dateFormat(startDate),
        End: dateFormat(endDate)
      },
      Granularity: 'DAILY',
      Metrics: ['BlendedCost', 'UnblendedCost', 'UsageQuantity'],
      GroupBy: [
        {
          Type: 'DIMENSION',
          Key: 'SERVICE'
        }
      ],
      Filter: {
        Tags: {
          Key: 'Project',
          Values: [projectTag]
        }
      }
    };
    
    const costResponse = await costExplorerClient.send(
      new GetCostAndUsageCommand(overallCostParams)
    );
    
    console.log('Cost response:', JSON.stringify(costResponse, null, 2));
    
    // Process cost data
    const costAnalysis = processCostData(costResponse, costThresholds);
    
    // Send custom metrics to CloudWatch
    await sendCostMetrics(costAnalysis);
    
    // Check thresholds and send alerts if needed
    await checkThresholdsAndAlert(costAnalysis, costThresholds, topicArn);
    
    // Get service-specific costs
    const serviceCosts = await getServiceSpecificCosts(projectTag, startDate, endDate);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Cost monitoring completed successfully',
        costAnalysis,
        serviceCosts,
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('Error in cost monitoring:', error);
    
    // Send error alert
    if (process.env.COST_ALERTS_TOPIC_ARN) {
      try {
        await snsClient.send(new PublishCommand({
          TopicArn: process.env.COST_ALERTS_TOPIC_ARN,
          Subject: 'AWS Opportunity Analysis - Cost Monitoring Error',
          Message: `Cost monitoring failed with error: ${error.message}\n\nStack trace: ${error.stack}`
        }));
      } catch (snsError) {
        console.error('Failed to send error alert:', snsError);
      }
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Cost monitoring failed',
        message: error.message
      })
    };
  }
};

function processCostData(costResponse, thresholds) {
  const analysis = {
    totalCost: 0,
    serviceBreakdown: {},
    trends: [],
    alerts: []
  };
  
  if (costResponse.ResultsByTime && costResponse.ResultsByTime.length > 0) {
    const latestResult = costResponse.ResultsByTime[costResponse.ResultsByTime.length - 1];
    
    // Calculate total cost
    analysis.totalCost = parseFloat(latestResult.Total?.BlendedCost?.Amount || '0');
    
    // Process service breakdown
    if (latestResult.Groups) {
      for (const group of latestResult.Groups) {
        const serviceName = group.Keys[0];
        const cost = parseFloat(group.Metrics?.BlendedCost?.Amount || '0');
        analysis.serviceBreakdown[serviceName] = cost;
      }
    }
    
    // Check for trends (if multiple time periods)
    if (costResponse.ResultsByTime.length > 1) {
      const previousResult = costResponse.ResultsByTime[costResponse.ResultsByTime.length - 2];
      const previousCost = parseFloat(previousResult.Total?.BlendedCost?.Amount || '0');
      const costChange = analysis.totalCost - previousCost;
      const percentChange = previousCost > 0 ? (costChange / previousCost) * 100 : 0;
      
      analysis.trends.push({
        period: 'daily',
        costChange,
        percentChange,
        direction: costChange > 0 ? 'increase' : 'decrease'
      });
    }
  }
  
  return analysis;
}

async function sendCostMetrics(costAnalysis) {
  const metricData = [
    {
      MetricName: 'DailyCost',
      Value: costAnalysis.totalCost,
      Unit: 'None',
      Dimensions: [
        {
          Name: 'Project',
          Value: process.env.PROJECT_TAG
        }
      ]
    }
  ];
  
  // Add service-specific metrics
  for (const [service, cost] of Object.entries(costAnalysis.serviceBreakdown)) {
    metricData.push({
      MetricName: 'ServiceCost',
      Value: cost,
      Unit: 'None',
      Dimensions: [
        {
          Name: 'Project',
          Value: process.env.PROJECT_TAG
        },
        {
          Name: 'Service',
          Value: service
        }
      ]
    });
  }
  
  const params = {
    Namespace: 'AWS/OpportunityAnalysis/Costs',
    MetricData: metricData
  };
  
  await cloudWatchClient.send(new PutMetricDataCommand(params));
  console.log('Cost metrics sent to CloudWatch');
}

async function checkThresholdsAndAlert(costAnalysis, thresholds, topicArn) {
  const alerts = [];
  
  // Check daily threshold
  if (costAnalysis.totalCost > thresholds.daily.critical) {
    alerts.push({
      level: 'CRITICAL',
      type: 'daily_cost',
      message: `Daily cost ($${costAnalysis.totalCost.toFixed(2)}) exceeds critical threshold ($${thresholds.daily.critical})`
    });
  } else if (costAnalysis.totalCost > thresholds.daily.warning) {
    alerts.push({
      level: 'WARNING',
      type: 'daily_cost',
      message: `Daily cost ($${costAnalysis.totalCost.toFixed(2)}) exceeds warning threshold ($${thresholds.daily.warning})`
    });
  }
  
  // Check service-specific thresholds
  for (const [service, cost] of Object.entries(costAnalysis.serviceBreakdown)) {
    const serviceKey = service.toLowerCase().replace(/\s+/g, '');
    const serviceThreshold = thresholds.services[serviceKey];
    
    if (serviceThreshold && cost > serviceThreshold.daily) {
      alerts.push({
        level: 'WARNING',
        type: 'service_cost',
        service,
        message: `${service} daily cost ($${cost.toFixed(2)}) exceeds threshold ($${serviceThreshold.daily})`
      });
    }
  }
  
  // Check for significant cost increases
  if (costAnalysis.trends.length > 0) {
    const trend = costAnalysis.trends[0];
    if (trend.percentChange > 50) { // 50% increase
      alerts.push({
        level: 'WARNING',
        type: 'cost_trend',
        message: `Significant cost increase detected: ${trend.percentChange.toFixed(1)}% (${trend.direction})`
      });
    }
  }
  
  // Send alerts if any
  if (alerts.length > 0) {
    const alertMessage = formatAlertMessage(costAnalysis, alerts);
    
    await snsClient.send(new PublishCommand({
      TopicArn: topicArn,
      Subject: `AWS Opportunity Analysis - Cost Alert (${alerts[0].level})`,
      Message: alertMessage
    }));
    
    console.log(`Sent ${alerts.length} cost alerts`);
  }
}

async function getServiceSpecificCosts(projectTag, startDate, endDate) {
  const services = ['AWS Lambda', 'Amazon Bedrock', 'Amazon API Gateway', 'Amazon S3', 'Amazon CloudFront'];
  const serviceCosts = {};
  
  for (const service of services) {
    try {
      const params = {
        TimePeriod: {
          Start: startDate.toISOString().split('T')[0],
          End: endDate.toISOString().split('T')[0]
        },
        Granularity: 'DAILY',
        Metrics: ['BlendedCost'],
        Filter: {
          And: [
            {
              Tags: {
                Key: 'Project',
                Values: [projectTag]
              }
            },
            {
              Dimensions: {
                Key: 'SERVICE',
                Values: [service]
              }
            }
          ]
        }
      };
      
      const response = await costExplorerClient.send(new GetCostAndUsageCommand(params));
      
      if (response.ResultsByTime && response.ResultsByTime.length > 0) {
        const cost = parseFloat(response.ResultsByTime[0].Total?.BlendedCost?.Amount || '0');
        serviceCosts[service] = cost;
      }
    } catch (error) {
      console.error(`Error getting cost for service ${service}:`, error);
      serviceCosts[service] = 0;
    }
  }
  
  return serviceCosts;
}

function formatAlertMessage(costAnalysis, alerts) {
  let message = `AWS Opportunity Analysis - Cost Alert\n\n`;
  message += `Total Daily Cost: $${costAnalysis.totalCost.toFixed(2)}\n\n`;
  
  message += `Service Breakdown:\n`;
  for (const [service, cost] of Object.entries(costAnalysis.serviceBreakdown)) {
    message += `- ${service}: $${cost.toFixed(2)}\n`;
  }
  
  message += `\nAlerts:\n`;
  for (const alert of alerts) {
    message += `- [${alert.level}] ${alert.message}\n`;
  }
  
  if (costAnalysis.trends.length > 0) {
    const trend = costAnalysis.trends[0];
    message += `\nCost Trend: ${trend.percentChange.toFixed(1)}% ${trend.direction} from previous period\n`;
  }
  
  message += `\nTimestamp: ${new Date().toISOString()}\n`;
  
  return message;
}