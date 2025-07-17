const { 
  BudgetsClient, 
  CreateBudgetCommand, 
  DescribeBudgetsCommand,
  UpdateBudgetCommand,
  CreateNotificationCommand,
  DescribeNotificationsForBudgetCommand 
} = require('@aws-sdk/client-budgets');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const budgetsClient = new BudgetsClient({ region: 'us-east-1' });
const snsClient = new SNSClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  console.log('Budget management event:', JSON.stringify(event, null, 2));
  
  try {
    const accountId = process.env.ACCOUNT_ID;
    const budgetConfigurations = JSON.parse(process.env.BUDGET_CONFIGURATIONS);
    const topicArn = process.env.COST_ALERTS_TOPIC_ARN;
    
    const results = {
      created: [],
      updated: [],
      errors: []
    };
    
    // Create or update main monthly budget
    try {
      await createOrUpdateBudget(accountId, budgetConfigurations.monthly, topicArn);
      results.created.push(budgetConfigurations.monthly.budgetName);
    } catch (error) {
      console.error('Error with monthly budget:', error);
      results.errors.push({
        budget: budgetConfigurations.monthly.budgetName,
        error: error.message
      });
    }
    
    // Create or update service-specific budgets
    for (const [serviceName, budgetConfig] of Object.entries(budgetConfigurations.service)) {
      try {
        await createOrUpdateBudget(accountId, budgetConfig, topicArn);
        results.created.push(budgetConfig.budgetName);
      } catch (error) {
        console.error(`Error with ${serviceName} budget:`, error);
        results.errors.push({
          budget: budgetConfig.budgetName,
          error: error.message
        });
      }
    }
    
    // Send summary notification
    if (results.created.length > 0 || results.errors.length > 0) {
      await sendBudgetSummary(results, topicArn);
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Budget management completed',
        results,
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('Error in budget management:', error);
    
    // Send error alert
    if (process.env.COST_ALERTS_TOPIC_ARN) {
      try {
        await snsClient.send(new PublishCommand({
          TopicArn: process.env.COST_ALERTS_TOPIC_ARN,
          Subject: 'AWS Opportunity Analysis - Budget Management Error',
          Message: `Budget management failed with error: ${error.message}\n\nStack trace: ${error.stack}`
        }));
      } catch (snsError) {
        console.error('Failed to send error alert:', snsError);
      }
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Budget management failed',
        message: error.message
      })
    };
  }
};

async function createOrUpdateBudget(accountId, budgetConfig, topicArn) {
  try {
    // Check if budget already exists
    const existingBudgets = await budgetsClient.send(new DescribeBudgetsCommand({
      AccountId: accountId,
      MaxResults: 100
    }));
    
    const existingBudget = existingBudgets.Budgets?.find(
      budget => budget.BudgetName === budgetConfig.budgetName
    );
    
    const budgetDefinition = {
      BudgetName: budgetConfig.budgetName,
      BudgetLimit: {
        Amount: budgetConfig.budgetLimit.amount,
        Unit: budgetConfig.budgetLimit.unit
      },
      TimeUnit: budgetConfig.timeUnit,
      BudgetType: budgetConfig.budgetType,
      CostFilters: budgetConfig.costFilters,
      TimePeriod: {
        Start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Start of current month
        End: new Date(new Date().getFullYear() + 10, 11, 31) // Far future end date
      }
    };
    
    if (existingBudget) {
      // Update existing budget
      await budgetsClient.send(new UpdateBudgetCommand({
        AccountId: accountId,
        NewBudget: budgetDefinition
      }));
      console.log(`Updated budget: ${budgetConfig.budgetName}`);
    } else {
      // Create new budget
      await budgetsClient.send(new CreateBudgetCommand({
        AccountId: accountId,
        Budget: budgetDefinition,
        NotificationsWithSubscribers: createNotifications(budgetConfig, topicArn)
      }));
      console.log(`Created budget: ${budgetConfig.budgetName}`);
    }
    
  } catch (error) {
    console.error(`Error managing budget ${budgetConfig.budgetName}:`, error);
    throw error;
  }
}

function createNotifications(budgetConfig, topicArn) {
  const notifications = [];
  
  if (budgetConfig.notifications) {
    for (const notificationConfig of budgetConfig.notifications) {
      notifications.push({
        Notification: {
          NotificationType: notificationConfig.notificationType,
          ComparisonOperator: notificationConfig.comparisonOperator,
          Threshold: notificationConfig.threshold,
          ThresholdType: notificationConfig.thresholdType,
          NotificationState: 'ALARM'
        },
        Subscribers: [
          {
            SubscriptionType: 'SNS',
            Address: topicArn
          }
        ]
      });
    }
  }
  
  // Add default notifications if none specified
  if (notifications.length === 0) {
    notifications.push(
      {
        Notification: {
          NotificationType: 'ACTUAL',
          ComparisonOperator: 'GREATER_THAN',
          Threshold: 80,
          ThresholdType: 'PERCENTAGE',
          NotificationState: 'ALARM'
        },
        Subscribers: [
          {
            SubscriptionType: 'SNS',
            Address: topicArn
          }
        ]
      },
      {
        Notification: {
          NotificationType: 'FORECASTED',
          ComparisonOperator: 'GREATER_THAN',
          Threshold: 100,
          ThresholdType: 'PERCENTAGE',
          NotificationState: 'ALARM'
        },
        Subscribers: [
          {
            SubscriptionType: 'SNS',
            Address: topicArn
          }
        ]
      }
    );
  }
  
  return notifications;
}

async function sendBudgetSummary(results, topicArn) {
  let message = `AWS Opportunity Analysis - Budget Management Summary\n\n`;
  
  if (results.created.length > 0) {
    message += `Successfully managed budgets:\n`;
    for (const budgetName of results.created) {
      message += `- ${budgetName}\n`;
    }
    message += `\n`;
  }
  
  if (results.errors.length > 0) {
    message += `Errors encountered:\n`;
    for (const error of results.errors) {
      message += `- ${error.budget}: ${error.error}\n`;
    }
    message += `\n`;
  }
  
  message += `Timestamp: ${new Date().toISOString()}\n`;
  
  await snsClient.send(new PublishCommand({
    TopicArn: topicArn,
    Subject: 'AWS Opportunity Analysis - Budget Management Summary',
    Message: message
  }));
}