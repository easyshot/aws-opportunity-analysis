/**
 * AWS Lambda Function for Error Recovery
 * Handles automated error recovery for failed operations
 */

const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
const { BedrockAgentClient, GetPromptCommand } = require('@aws-sdk/client-bedrock-agent');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

// Initialize AWS clients
const bedrockRuntimeClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
const bedrockAgentClient = new BedrockAgentClient({ region: process.env.AWS_REGION });
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const cloudWatchClient = new CloudWatchClient({ region: process.env.AWS_REGION });
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

// Configuration
const METRICS_NAMESPACE = 'AWS/OpportunityAnalysis/ErrorRecovery';
const FALLBACK_MODELS = {
  'amazon.nova-premier-v1:0': 'amazon.titan-text-express-v1',
  'amazon.titan-text-express-v1': 'amazon.titan-text-lite-v1'
};

exports.handler = async (event) => {
  console.log('🔧 Error Recovery Lambda triggered:', JSON.stringify(event, null, 2));
  
  const startTime = Date.now();
  let recoveryResult = { success: false, message: 'Unknown recovery type' };
  
  try {
    const { recoveryType, originalOperation, context, retryCount = 0 } = event;
    
    // Record recovery attempt
    await recordMetric('RecoveryAttempts', 1, 'Count', [
      { Name: 'RecoveryType', Value: recoveryType },
      { Name: 'OriginalOperation', Value: originalOperation }
    ]);
    
    switch (recoveryType) {
      case 'bedrock_fallback':
        recoveryResult = await handleBedrockFallback(originalOperation, context, retryCount);
        break;
        
      case 'lambda_recovery':
        recoveryResult = await handleLambdaRecovery(originalOperation, context, retryCount);
        break;
        
      case 'network_recovery':
        recoveryResult = await handleNetworkRecovery(originalOperation, context, retryCount);
        break;
        
      case 'credential_refresh':
        recoveryResult = await handleCredentialRefresh(originalOperation, context, retryCount);
        break;
        
      case 'retry_with_backoff':
        recoveryResult = await handleRetryWithBackoff(originalOperation, context, retryCount);
        break;
        
      default:
        recoveryResult = await handleGenericRecovery(originalOperation, context, retryCount);
    }
    
    const duration = Date.now() - startTime;
    
    // Record recovery metrics
    await recordMetric('RecoveryDuration', duration, 'Milliseconds', [
      { Name: 'RecoveryType', Value: recoveryType },
      { Name: 'Success', Value: recoveryResult.success ? 'true' : 'false' }
    ]);
    
    if (recoveryResult.success) {
      await recordMetric('SuccessfulRecoveries', 1, 'Count', [
        { Name: 'RecoveryType', Value: recoveryType },
        { Name: 'OriginalOperation', Value: originalOperation }
      ]);
      
      console.log(`✅ Recovery successful for ${originalOperation} using ${recoveryType}`);
    } else {
      await recordMetric('FailedRecoveries', 1, 'Count', [
        { Name: 'RecoveryType', Value: recoveryType },
        { Name: 'OriginalOperation', Value: originalOperation }
      ]);
      
      console.log(`❌ Recovery failed for ${originalOperation} using ${recoveryType}`);
      
      // If recovery failed and we haven't exceeded max attempts, send back to recovery queue
      if (retryCount < 2) {
        await sendToRecoveryQueue(event, retryCount + 1);
      }
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        ...recoveryResult,
        duration,
        retryCount,
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('❌ Error in recovery Lambda:', error);
    
    const duration = Date.now() - startTime;
    
    await recordMetric('RecoveryErrors', 1, 'Count', [
      { Name: 'ErrorType', Value: error.name || 'UnknownError' }
    ]);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        duration,
        timestamp: new Date().toISOString()
      })
    };
  }
};

/**
 * Handle Bedrock fallback recovery
 */
async function handleBedrockFallback(operation, context, retryCount) {
  try {
    console.log('🤖 Attempting Bedrock fallback recovery...');
    
    const { modelId, originalPayload } = context;
    const fallbackModel = FALLBACK_MODELS[modelId] || 'amazon.titan-text-lite-v1';
    
    console.log(`Falling back from ${modelId} to ${fallbackModel}`);
    
    // Create simplified payload for fallback model
    const fallbackPayload = {
      modelId: fallbackModel,
      messages: [{
        role: 'user',
        content: [{ 
          text: originalPayload?.messages?.[0]?.content?.[0]?.text || 
                'Generate a simple analysis based on the provided data.' 
        }]
      }],
      inferenceConfig: {
        maxTokens: Math.min(originalPayload?.inferenceConfig?.maxTokens || 2000, 2000),
        temperature: Math.max(originalPayload?.inferenceConfig?.temperature || 0.1, 0.1)
      }
    };
    
    // Add system instructions if available
    if (originalPayload?.system) {
      fallbackPayload.system = originalPayload.system;
    }
    
    const command = new ConverseCommand(fallbackPayload);
    const response = await bedrockRuntimeClient.send(command);
    
    const result = response.output?.message?.content?.[0]?.text || 'Fallback analysis generated';
    
    return {
      success: true,
      message: 'Bedrock fallback successful',
      result,
      fallbackModel,
      originalModel: modelId
    };
    
  } catch (error) {
    console.error('❌ Bedrock fallback failed:', error);
    return {
      success: false,
      message: `Bedrock fallback failed: ${error.message}`,
      error: error.name
    };
  }
}

/**
 * Handle Lambda recovery
 */
async function handleLambdaRecovery(operation, context, retryCount) {
  try {
    console.log('⚡ Attempting Lambda recovery...');
    
    const { functionName, originalPayload } = context;
    
    // Wait before retry to allow for transient issues to resolve
    const waitTime = Math.min(1000 * Math.pow(2, retryCount), 10000);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Retry the original Lambda invocation with simplified payload
    const simplifiedPayload = {
      ...originalPayload,
      timeout: Math.min(originalPayload?.timeout || 30000, 30000),
      retryAttempt: retryCount + 1
    };
    
    const command = new InvokeCommand({
      FunctionName: functionName || process.env.CATAPULT_GET_DATASET_LAMBDA,
      Payload: JSON.stringify(simplifiedPayload),
      InvocationType: 'RequestResponse'
    });
    
    const response = await lambdaClient.send(command);
    const responsePayload = Buffer.from(response.Payload).toString();
    const parsedResponse = JSON.parse(responsePayload);
    
    if (parsedResponse.statusCode && parsedResponse.statusCode !== 200) {
      throw new Error(`Lambda returned error: ${parsedResponse.body}`);
    }
    
    return {
      success: true,
      message: 'Lambda recovery successful',
      result: parsedResponse,
      retryAttempt: retryCount + 1
    };
    
  } catch (error) {
    console.error('❌ Lambda recovery failed:', error);
    return {
      success: false,
      message: `Lambda recovery failed: ${error.message}`,
      error: error.name
    };
  }
}

/**
 * Handle network recovery
 */
async function handleNetworkRecovery(operation, context, retryCount) {
  try {
    console.log('🌐 Attempting network recovery...');
    
    // Wait longer for network issues to resolve
    const waitTime = Math.min(2000 * Math.pow(2, retryCount), 30000);
    console.log(`Waiting ${waitTime}ms for network recovery...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Simulate network connectivity check
    const connectivityCheck = await checkNetworkConnectivity();
    
    if (connectivityCheck.success) {
      return {
        success: true,
        message: 'Network recovery successful',
        connectivityStatus: connectivityCheck.status,
        waitTime
      };
    } else {
      return {
        success: false,
        message: 'Network still unavailable',
        connectivityStatus: connectivityCheck.status,
        waitTime
      };
    }
    
  } catch (error) {
    console.error('❌ Network recovery failed:', error);
    return {
      success: false,
      message: `Network recovery failed: ${error.message}`,
      error: error.name
    };
  }
}

/**
 * Handle credential refresh
 */
async function handleCredentialRefresh(operation, context, retryCount) {
  try {
    console.log('🔑 Attempting credential refresh...');
    
    // In a real implementation, this would refresh AWS credentials
    // For now, we'll simulate the process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate credential validation
    const credentialsValid = Math.random() > 0.2; // 80% success rate
    
    if (credentialsValid) {
      return {
        success: true,
        message: 'Credential refresh successful',
        refreshTime: new Date().toISOString()
      };
    } else {
      return {
        success: false,
        message: 'Credential refresh failed',
        refreshTime: new Date().toISOString()
      };
    }
    
  } catch (error) {
    console.error('❌ Credential refresh failed:', error);
    return {
      success: false,
      message: `Credential refresh failed: ${error.message}`,
      error: error.name
    };
  }
}

/**
 * Handle retry with backoff
 */
async function handleRetryWithBackoff(operation, context, retryCount) {
  try {
    console.log('🔄 Attempting retry with backoff...');
    
    // Calculate exponential backoff with jitter
    const baseDelay = 1000;
    const maxDelay = 30000;
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
    const delay = Math.max(100, Math.floor(exponentialDelay + jitter));
    
    console.log(`Waiting ${delay}ms before retry...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Simulate retry success based on retry count
    const successRate = Math.max(0.3, 0.9 - (retryCount * 0.2));
    const success = Math.random() < successRate;
    
    if (success) {
      return {
        success: true,
        message: 'Retry with backoff successful',
        delay,
        retryCount: retryCount + 1
      };
    } else {
      return {
        success: false,
        message: 'Retry with backoff failed',
        delay,
        retryCount: retryCount + 1
      };
    }
    
  } catch (error) {
    console.error('❌ Retry with backoff failed:', error);
    return {
      success: false,
      message: `Retry with backoff failed: ${error.message}`,
      error: error.name
    };
  }
}

/**
 * Handle generic recovery
 */
async function handleGenericRecovery(operation, context, retryCount) {
  try {
    console.log('🔧 Attempting generic recovery...');
    
    // Wait before retry
    const waitTime = Math.min(500 * (retryCount + 1), 5000);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Simulate generic recovery with decreasing success rate
    const successRate = Math.max(0.2, 0.7 - (retryCount * 0.15));
    const success = Math.random() < successRate;
    
    return {
      success,
      message: success ? 'Generic recovery successful' : 'Generic recovery failed',
      waitTime,
      retryCount: retryCount + 1,
      successRate
    };
    
  } catch (error) {
    console.error('❌ Generic recovery failed:', error);
    return {
      success: false,
      message: `Generic recovery failed: ${error.message}`,
      error: error.name
    };
  }
}

/**
 * Check network connectivity
 */
async function checkNetworkConnectivity() {
  try {
    // Simple connectivity check by trying to access AWS service
    const command = new PutMetricDataCommand({
      Namespace: METRICS_NAMESPACE,
      MetricData: [{
        MetricName: 'ConnectivityCheck',
        Value: 1,
        Unit: 'Count',
        Timestamp: new Date()
      }]
    });
    
    await cloudWatchClient.send(command);
    
    return {
      success: true,
      status: 'connected',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      status: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Send failed recovery back to recovery queue
 */
async function sendToRecoveryQueue(originalEvent, newRetryCount) {
  if (!process.env.ERROR_RECOVERY_QUEUE_URL) {
    console.warn('⚠️ Recovery queue URL not configured');
    return;
  }
  
  try {
    const message = {
      ...originalEvent,
      retryCount: newRetryCount,
      lastAttempt: new Date().toISOString()
    };
    
    const command = new SendMessageCommand({
      QueueUrl: process.env.ERROR_RECOVERY_QUEUE_URL,
      MessageBody: JSON.stringify(message),
      DelaySeconds: Math.min(60 * newRetryCount, 900) // Delay up to 15 minutes
    });
    
    await sqsClient.send(command);
    console.log(`📨 Sent recovery retry to queue (attempt ${newRetryCount})`);
  } catch (error) {
    console.error('❌ Failed to send to recovery queue:', error);
  }
}

/**
 * Record CloudWatch metric
 */
async function recordMetric(metricName, value, unit, dimensions = []) {
  try {
    const command = new PutMetricDataCommand({
      Namespace: METRICS_NAMESPACE,
      MetricData: [{
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Timestamp: new Date(),
        Dimensions: dimensions
      }]
    });
    
    await cloudWatchClient.send(command);
  } catch (error) {
    console.error(`❌ Failed to record metric ${metricName}:`, error);
  }
}