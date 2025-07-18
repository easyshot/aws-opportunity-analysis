const { 
  LambdaClient, 
  GetProvisionedConcurrencyConfigCommand,
  PutProvisionedConcurrencyConfigCommand,
  DeleteProvisionedConcurrencyConfigCommand,
  ListProvisionedConcurrencyConfigsCommand,
  GetFunctionCommand,
  ListFunctionsCommand,
  PublishVersionCommand,
  CreateAliasCommand,
  UpdateAliasCommand,
  GetAliasCommand
} = require('@aws-sdk/client-lambda');
const { CloudWatchClient, GetMetricStatisticsCommand } = require('@aws-sdk/client-cloudwatch');

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const cloudWatchClient = new CloudWatchClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  console.log('Concurrency management event:', JSON.stringify(event, null, 2));
  
  try {
    const concurrencyConfig = JSON.parse(process.env.CONCURRENCY_CONFIG);
    const projectTag = process.env.PROJECT_TAG;
    const action = event.action || 'scale-up'; // scale-up or scale-down
    
    const results = {
      action,
      processedFunctions: [],
      errors: [],
      summary: {
        totalFunctions: 0,
        successfulUpdates: 0,
        errors: 0
      }
    };
    
    // Get all Lambda functions for the project
    const projectFunctions = await getProjectFunctions(projectTag);
    results.summary.totalFunctions = projectFunctions.length;
    
    // Process each function based on configuration
    for (const functionName of projectFunctions) {
      try {
        const functionConfig = concurrencyConfig.functions[functionName];
        
        if (!functionConfig) {
          console.log(`No configuration found for function: ${functionName}`);
          continue;
        }
        
        // Get current usage metrics to make intelligent scaling decisions
        const usageMetrics = await getFunctionUsageMetrics(functionName);
        
        // Determine optimal concurrency based on action and metrics
        const optimalConcurrency = calculateOptimalConcurrency(
          functionConfig, 
          usageMetrics, 
          action
        );
        
        // Apply concurrency configuration
        await applyProvisionedConcurrency(functionName, optimalConcurrency);
        
        results.processedFunctions.push({
          functionName,
          previousConcurrency: await getCurrentProvisionedConcurrency(functionName),
          newConcurrency: optimalConcurrency,
          usageMetrics
        });
        
        results.summary.successfulUpdates++;
        
      } catch (error) {
        console.error(`Error processing function ${functionName}:`, error);
        results.errors.push({
          functionName,
          error: error.message
        });
        results.summary.errors++;
      }
    }
    
    console.log('Concurrency management results:', results);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Concurrency management completed',
        results,
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('Error in concurrency management:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Concurrency management failed',
        message: error.message
      })
    };
  }
};

async function getProjectFunctions(projectTag) {
  const functions = [];
  let nextMarker;
  
  do {
    const params = {
      MaxItems: 50,
      Marker: nextMarker
    };
    
    const response = await lambdaClient.send(new ListFunctionsCommand(params));
    
    for (const func of response.Functions || []) {
      // Check if function belongs to our project (by naming convention or tags)
      if (func.FunctionName.includes('opportunity-analysis') || 
          func.FunctionName.includes('aws-opportunity')) {
        functions.push(func.FunctionName);
      }
    }
    
    nextMarker = response.NextMarker;
  } while (nextMarker);
  
  return functions;
}

async function getFunctionUsageMetrics(functionName) {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
  
  try {
    // Get invocation metrics
    const invocationsParams = {
      Namespace: 'AWS/Lambda',
      MetricName: 'Invocations',
      Dimensions: [
        {
          Name: 'FunctionName',
          Value: functionName
        }
      ],
      StartTime: startTime,
      EndTime: endTime,
      Period: 3600, // 1 hour periods
      Statistics: ['Sum', 'Average']
    };
    
    const invocationsResponse = await cloudWatchClient.send(
      new GetMetricStatisticsCommand(invocationsParams)
    );
    
    // Get duration metrics
    const durationParams = {
      Namespace: 'AWS/Lambda',
      MetricName: 'Duration',
      Dimensions: [
        {
          Name: 'FunctionName',
          Value: functionName
        }
      ],
      StartTime: startTime,
      EndTime: endTime,
      Period: 3600,
      Statistics: ['Average', 'Maximum']
    };
    
    const durationResponse = await cloudWatchClient.send(
      new GetMetricStatisticsCommand(durationParams)
    );
    
    // Get concurrent executions
    const concurrentParams = {
      Namespace: 'AWS/Lambda',
      MetricName: 'ConcurrentExecutions',
      Dimensions: [
        {
          Name: 'FunctionName',
          Value: functionName
        }
      ],
      StartTime: startTime,
      EndTime: endTime,
      Period: 3600,
      Statistics: ['Maximum', 'Average']
    };
    
    const concurrentResponse = await cloudWatchClient.send(
      new GetMetricStatisticsCommand(concurrentParams)
    );
    
    return {
      invocations: calculateMetricSummary(invocationsResponse.Datapoints),
      duration: calculateMetricSummary(durationResponse.Datapoints),
      concurrentExecutions: calculateMetricSummary(concurrentResponse.Datapoints)
    };
    
  } catch (error) {
    console.error(`Error getting metrics for function ${functionName}:`, error);
    return {
      invocations: { sum: 0, average: 0, maximum: 0 },
      duration: { average: 0, maximum: 0 },
      concurrentExecutions: { average: 0, maximum: 0 }
    };
  }
}

function calculateMetricSummary(datapoints) {
  if (!datapoints || datapoints.length === 0) {
    return { sum: 0, average: 0, maximum: 0 };
  }
  
  const values = datapoints.map(dp => dp.Sum || dp.Average || dp.Maximum || 0);
  
  return {
    sum: values.reduce((a, b) => a + b, 0),
    average: values.reduce((a, b) => a + b, 0) / values.length,
    maximum: Math.max(...values)
  };
}

function calculateOptimalConcurrency(functionConfig, usageMetrics, action) {
  const baseConcurrency = functionConfig.provisionedConcurrency || 1;
  const maxConcurrency = functionConfig.reservedConcurrency || 10;
  
  if (action === 'scale-down') {
    // During off-hours, reduce to minimum
    return Math.max(1, Math.floor(baseConcurrency * 0.5));
  }
  
  // Scale up based on usage patterns
  const avgConcurrent = usageMetrics.concurrentExecutions.average;
  const maxConcurrent = usageMetrics.concurrentExecutions.maximum;
  const avgInvocations = usageMetrics.invocations.average;
  
  // If we have high usage, scale up
  if (avgConcurrent > baseConcurrency * 0.8 || maxConcurrent > baseConcurrency) {
    return Math.min(maxConcurrency, Math.ceil(maxConcurrent * 1.2));
  }
  
  // If we have moderate usage, use base configuration
  if (avgInvocations > 10) {
    return baseConcurrency;
  }
  
  // Low usage, scale down slightly
  return Math.max(1, Math.floor(baseConcurrency * 0.7));
}

async function getCurrentProvisionedConcurrency(functionName) {
  try {
    const response = await lambdaClient.send(new ListProvisionedConcurrencyConfigsCommand({
      FunctionName: functionName
    }));
    
    if (response.ProvisionedConcurrencyConfigs && response.ProvisionedConcurrencyConfigs.length > 0) {
      return response.ProvisionedConcurrencyConfigs[0].AllocatedConcurrency;
    }
    
    return 0;
    
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      return 0;
    }
    throw error;
  }
}

async function applyProvisionedConcurrency(functionName, targetConcurrency) {
  try {
    // First, ensure we have a published version and alias
    const aliasName = 'PROVISIONED';
    
    // Get or create the function version
    const functionResponse = await lambdaClient.send(new GetFunctionCommand({
      FunctionName: functionName
    }));
    
    // Publish a new version
    const versionResponse = await lambdaClient.send(new PublishVersionCommand({
      FunctionName: functionName,
      Description: `Version for provisioned concurrency - ${new Date().toISOString()}`
    }));
    
    const version = versionResponse.Version;
    
    // Create or update alias
    try {
      await lambdaClient.send(new GetAliasCommand({
        FunctionName: functionName,
        Name: aliasName
      }));
      
      // Update existing alias
      await lambdaClient.send(new UpdateAliasCommand({
        FunctionName: functionName,
        Name: aliasName,
        FunctionVersion: version
      }));
      
    } catch (error) {
      if (error.name === 'ResourceNotFoundException') {
        // Create new alias
        await lambdaClient.send(new CreateAliasCommand({
          FunctionName: functionName,
          Name: aliasName,
          FunctionVersion: version
        }));
      } else {
        throw error;
      }
    }
    
    const qualifier = `${functionName}:${aliasName}`;
    
    // Check current provisioned concurrency
    const currentConcurrency = await getCurrentProvisionedConcurrency(qualifier);
    
    if (targetConcurrency === 0) {
      // Remove provisioned concurrency
      if (currentConcurrency > 0) {
        await lambdaClient.send(new DeleteProvisionedConcurrencyConfigCommand({
          FunctionName: qualifier
        }));
        console.log(`Removed provisioned concurrency for ${functionName}`);
      }
    } else {
      // Set or update provisioned concurrency
      await lambdaClient.send(new PutProvisionedConcurrencyConfigCommand({
        FunctionName: qualifier,
        ProvisionedConcurrencyConfig: targetConcurrency
      }));
      console.log(`Set provisioned concurrency for ${functionName} to ${targetConcurrency}`);
    }
    
  } catch (error) {
    console.error(`Error applying provisioned concurrency for ${functionName}:`, error);
    throw error;
  }
}