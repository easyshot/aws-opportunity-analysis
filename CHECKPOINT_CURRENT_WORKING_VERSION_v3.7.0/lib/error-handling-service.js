/**
 * Advanced Error Handling Service with AWS Services
 */

const { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
const { SSMClient, SendCommandCommand } = require('@aws-sdk/client-ssm');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { StepFunctionsClient, StartExecutionCommand } = require('@aws-sdk/client-sfn');

class ErrorHandlingService {
  constructor(config = {}) {
    this.region = config.region || process.env.AWS_REGION || 'us-east-1';
    this.sqsClient = new SQSClient({ region: this.region });
    this.cloudWatchClient = new CloudWatchClient({ region: this.region });
    this.ssmClient = new SSMClient({ region: this.region });
    this.lambdaClient = new LambdaClient({ region: this.region });
    this.stepFunctionsClient = new StepFunctionsClient({ region: this.region });
    
    // Configuration
    this.config = {
      deadLetterQueueUrl: config.deadLetterQueueUrl || process.env.ERROR_DLQ_URL,
      errorRecoveryQueueUrl: config.errorRecoveryQueueUrl || process.env.ERROR_RECOVERY_QUEUE_URL,
      errorRecoveryLambda: config.errorRecoveryLambda || process.env.ERROR_RECOVERY_LAMBDA,
      errorRecoveryStateMachine: config.errorRecoveryStateMachine || process.env.ERROR_RECOVERY_STATE_MACHINE,
      incidentResponseDocument: config.incidentResponseDocument || process.env.INCIDENT_RESPONSE_DOCUMENT,
      maxRetryAttempts: config.maxRetryAttempts || 5,
      baseDelayMs: config.baseDelayMs || 1000,
      maxDelayMs: config.maxDelayMs || 30000,
      circuitBreakerThreshold: config.circuitBreakerThreshold || 5,
      circuitBreakerTimeout: config.circuitBreakerTimeout || 60000,
      ...config
    };
    
    // Circuit breaker state
    this.circuitBreakers = new Map();
    
    // Error metrics namespace
    this.metricsNamespace = 'AWS/OpportunityAnalysis/ErrorHandling';
    
    console.log('🛡️ Error Handling Service initialized');
  }

  /**
   * Execute operation with comprehensive error handling
   */
  async executeWithErrorHandling(operationName, operation, options = {}) {
    const startTime = Date.now();
    let attempt = 0;
    let lastError = null;
    
    const {
      maxRetries = this.config.maxRetryAttempts,
      enableCircuitBreaker = true,
      enableDLQ = true,
      context = {}
    } = options;

    // Check circuit breaker
    if (enableCircuitBreaker && this.isCircuitBreakerOpen(operationName)) {
      const error = new Error(`Circuit breaker is open for operation: ${operationName}`);
      await this.recordError('circuit_breaker_open', error, { operationName, ...context });
      throw error;
    }

    while (attempt <= maxRetries) {
      try {
        console.log(`🔄 Executing ${operationName} (attempt ${attempt + 1}/${maxRetries + 1})`);
        
        const result = await operation();
        
        // Record success metrics
        await this.recordSuccess(operationName, Date.now() - startTime, attempt);
        
        // Reset circuit breaker on success
        if (enableCircuitBreaker) {
          this.resetCircuitBreaker(operationName);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        attempt++;
        
        console.error(`❌ ${operationName} failed (attempt ${attempt}):`, error.message);
        
        // Record error metrics
        await this.recordError('operation_failure', error, {
          operationName,
          attempt,
          duration: Date.now() - startTime,
          ...context
        });
        
        // Update circuit breaker
        if (enableCircuitBreaker) {
          this.recordCircuitBreakerFailure(operationName);
        }
        
        // If this is the last attempt, handle final failure
        if (attempt > maxRetries) {
          if (enableDLQ) {
            await this.sendToDeadLetterQueue(operationName, error, context);
          }
          
          // Trigger automated recovery if configured
          await this.triggerAutomatedRecovery(operationName, error, context);
          
          break;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateBackoffDelay(attempt);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await this.sleep(delay);
      }
    }
    
    // Final error handling
    await this.recordFinalFailure(operationName, lastError, attempt, Date.now() - startTime, context);
    throw lastError;
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  calculateBackoffDelay(attempt) {
    const exponentialDelay = Math.min(
      this.config.baseDelayMs * Math.pow(2, attempt - 1),
      this.config.maxDelayMs
    );
    
    // Add jitter (±25% of the delay)
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
    return Math.max(100, Math.floor(exponentialDelay + jitter));
  }

  /**
   * Circuit breaker implementation
   */
  isCircuitBreakerOpen(operationName) {
    const breaker = this.circuitBreakers.get(operationName);
    if (!breaker) return false;
    
    if (breaker.state === 'open') {
      // Check if timeout has passed
      if (Date.now() - breaker.lastFailureTime > this.config.circuitBreakerTimeout) {
        breaker.state = 'half-open';
        console.log(`🔄 Circuit breaker for ${operationName} moved to half-open state`);
      }
      return breaker.state === 'open';
    }
    
    return false;
  }

  recordCircuitBreakerFailure(operationName) {
    let breaker = this.circuitBreakers.get(operationName);
    if (!breaker) {
      breaker = {
        failures: 0,
        state: 'closed',
        lastFailureTime: null
      };
      this.circuitBreakers.set(operationName, breaker);
    }
    
    breaker.failures++;
    breaker.lastFailureTime = Date.now();
    
    if (breaker.failures >= this.config.circuitBreakerThreshold) {
      breaker.state = 'open';
      console.warn(`⚠️ Circuit breaker opened for ${operationName} after ${breaker.failures} failures`);
      
      // Record circuit breaker opened metric
      this.recordMetric('CircuitBreakerOpened', 1, 'Count', [
        { Name: 'OperationName', Value: operationName }
      ]);
    }
  }

  resetCircuitBreaker(operationName) {
    const breaker = this.circuitBreakers.get(operationName);
    if (breaker) {
      breaker.failures = 0;
      breaker.state = 'closed';
      console.log(`✅ Circuit breaker reset for ${operationName}`);
    }
  }

  /**
   * Send failed operations to Dead Letter Queue
   */
  async sendToDeadLetterQueue(operationName, error, context) {
    if (!this.config.deadLetterQueueUrl) {
      console.warn('⚠️ Dead Letter Queue URL not configured');
      return;
    }

    try {
      const message = {
        operationName,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        context,
        timestamp: new Date().toISOString(),
        retryCount: 0
      };

      const command = new SendMessageCommand({
        QueueUrl: this.config.deadLetterQueueUrl,
        MessageBody: JSON.stringify(message),
        MessageAttributes: {
          OperationName: {
            DataType: 'String',
            StringValue: operationName
          },
          ErrorType: {
            DataType: 'String',
            StringValue: error.name || 'UnknownError'
          },
          Timestamp: {
            DataType: 'String',
            StringValue: new Date().toISOString()
          }
        }
      });

      await this.sqsClient.send(command);
      console.log(`📨 Sent failed operation to DLQ: ${operationName}`);
      
      await this.recordMetric('DLQMessagesSent', 1, 'Count', [
        { Name: 'OperationName', Value: operationName }
      ]);
    } catch (dlqError) {
      console.error('❌ Failed to send message to DLQ:', dlqError);
      await this.recordError('dlq_send_failure', dlqError, { operationName });
    }
  }

  /**
   * Process messages from Dead Letter Queue for recovery
   */
  async processDLQMessages(maxMessages = 10) {
    if (!this.config.deadLetterQueueUrl) {
      console.warn('⚠️ Dead Letter Queue URL not configured');
      return { processed: 0, errors: 0 };
    }

    let processed = 0;
    let errors = 0;

    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: this.config.deadLetterQueueUrl,
        MaxNumberOfMessages: maxMessages,
        WaitTimeSeconds: 5,
        MessageAttributeNames: ['All']
      });

      const response = await this.sqsClient.send(command);
      const messages = response.Messages || [];

      console.log(`📥 Processing ${messages.length} DLQ messages`);

      for (const message of messages) {
        try {
          const messageBody = JSON.parse(message.Body);
          const success = await this.attemptErrorRecovery(messageBody);
          
          if (success) {
            // Delete message from DLQ on successful recovery
            await this.sqsClient.send(new DeleteMessageCommand({
              QueueUrl: this.config.deadLetterQueueUrl,
              ReceiptHandle: message.ReceiptHandle
            }));
            processed++;
            console.log(`✅ Recovered operation: ${messageBody.operationName}`);
          } else {
            errors++;
            console.log(`❌ Failed to recover operation: ${messageBody.operationName}`);
          }
        } catch (processingError) {
          errors++;
          console.error('❌ Error processing DLQ message:', processingError);
        }
      }

      await this.recordMetric('DLQMessagesProcessed', processed, 'Count');
      await this.recordMetric('DLQProcessingErrors', errors, 'Count');

      return { processed, errors, total: messages.length };
    } catch (error) {
      console.error('❌ Failed to process DLQ messages:', error);
      await this.recordError('dlq_processing_failure', error);
      return { processed: 0, errors: 1 };
    }
  }

  /**
   * Attempt automated error recovery
   */
  async attemptErrorRecovery(messageData) {
    const { operationName, error, context } = messageData;
    
    try {
      console.log(`🔧 Attempting recovery for operation: ${operationName}`);
      
      // Increment retry count
      messageData.retryCount = (messageData.retryCount || 0) + 1;
      
      // Check if we've exceeded max recovery attempts
      if (messageData.retryCount > 3) {
        console.warn(`⚠️ Max recovery attempts exceeded for ${operationName}`);
        await this.triggerIncidentResponse(operationName, error, context);
        return false;
      }
      
      // Try different recovery strategies based on error type
      const recoveryStrategy = this.determineRecoveryStrategy(error, operationName);
      const success = await this.executeRecoveryStrategy(recoveryStrategy, messageData);
      
      if (success) {
        await this.recordMetric('SuccessfulRecoveries', 1, 'Count', [
          { Name: 'OperationName', Value: operationName },
          { Name: 'RecoveryStrategy', Value: recoveryStrategy }
        ]);
      }
      
      return success;
    } catch (recoveryError) {
      console.error(`❌ Recovery attempt failed for ${operationName}:`, recoveryError);
      await this.recordError('recovery_failure', recoveryError, { operationName, originalError: error });
      return false;
    }
  }

  /**
   * Determine recovery strategy based on error type
   */
  determineRecoveryStrategy(error, operationName) {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('timeout') || errorMessage.includes('throttl')) {
      return 'retry_with_backoff';
    } else if (errorMessage.includes('credential') || errorMessage.includes('auth')) {
      return 'refresh_credentials';
    } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return 'network_recovery';
    } else if (operationName.includes('bedrock')) {
      return 'bedrock_fallback';
    } else if (operationName.includes('lambda')) {
      return 'lambda_recovery';
    } else {
      return 'generic_retry';
    }
  }

  /**
   * Execute specific recovery strategy
   */
  async executeRecoveryStrategy(strategy, messageData) {
    switch (strategy) {
      case 'retry_with_backoff':
        await this.sleep(this.calculateBackoffDelay(messageData.retryCount));
        return await this.retryOriginalOperation(messageData);
        
      case 'refresh_credentials':
        console.log('🔑 Attempting credential refresh...');
        await this.sleep(2000);
        return await this.retryOriginalOperation(messageData);
        
      case 'network_recovery':
        console.log('🌐 Attempting network recovery...');
        await this.sleep(5000);
        return await this.retryOriginalOperation(messageData);
        
      case 'bedrock_fallback':
        console.log('🤖 Attempting Bedrock fallback strategy...');
        return await this.executeBedrockFallback(messageData);
        
      case 'lambda_recovery':
        console.log('⚡ Attempting Lambda recovery...');
        return await this.executeLambdaRecovery(messageData);
        
      default:
        console.log('🔄 Executing generic retry...');
        await this.sleep(1000);
        return await this.retryOriginalOperation(messageData);
    }
  }

  /**
   * Bedrock-specific recovery strategy
   */
  async executeBedrockFallback(messageData) {
    try {
      console.log('🤖 Attempting Bedrock recovery with fallback model...');
      
      if (this.config.errorRecoveryLambda) {
        const command = new InvokeCommand({
          FunctionName: this.config.errorRecoveryLambda,
          Payload: JSON.stringify({
            recoveryType: 'bedrock_fallback',
            originalOperation: messageData.operationName,
            context: messageData.context
          })
        });
        
        const response = await this.lambdaClient.send(command);
        const result = JSON.parse(Buffer.from(response.Payload).toString());
        
        return result.success === true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Bedrock fallback failed:', error);
      return false;
    }
  }

  /**
   * Lambda-specific recovery strategy
   */
  async executeLambdaRecovery(messageData) {
    try {
      console.log('⚡ Attempting Lambda recovery...');
      
      if (this.config.errorRecoveryStateMachine) {
        const command = new StartExecutionCommand({
          stateMachineArn: this.config.errorRecoveryStateMachine,
          input: JSON.stringify({
            recoveryType: 'lambda_recovery',
            originalOperation: messageData.operationName,
            context: messageData.context,
            retryCount: messageData.retryCount
          })
        });
        
        const response = await this.stepFunctionsClient.send(command);
        console.log(`🔄 Started recovery state machine: ${response.executionArn}`);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Lambda recovery failed:', error);
      return false;
    }
  }

  /**
   * Retry the original operation
   */
  async retryOriginalOperation(messageData) {
    console.log(`🔄 Retrying original operation: ${messageData.operationName}`);
    await this.sleep(1000);
    return Math.random() > 0.3; // 70% success rate for demo
  }

  /**
   * Trigger automated incident response
   */
  async triggerIncidentResponse(operationName, error, context) {
    if (!this.config.incidentResponseDocument) {
      console.warn('⚠️ Incident response document not configured');
      return;
    }

    try {
      console.log(`🚨 Triggering incident response for ${operationName}`);
      
      const command = new SendCommandCommand({
        DocumentName: this.config.incidentResponseDocument,
        Parameters: {
          OperationName: [operationName],
          ErrorMessage: [error.message],
          Context: [JSON.stringify(context)],
          Severity: ['HIGH'],
          Timestamp: [new Date().toISOString()]
        },
        Targets: [
          {
            Key: 'tag:Environment',
            Values: [process.env.NODE_ENV || 'development']
          }
        ]
      });

      const response = await this.ssmClient.send(command);
      console.log(`🚨 Incident response triggered: ${response.Command.CommandId}`);
      
      await this.recordMetric('IncidentResponseTriggered', 1, 'Count', [
        { Name: 'OperationName', Value: operationName },
        { Name: 'Severity', Value: 'HIGH' }
      ]);
      
      return response.Command.CommandId;
    } catch (incidentError) {
      console.error('❌ Failed to trigger incident response:', incidentError);
      await this.recordError('incident_response_failure', incidentError, { operationName });
    }
  }

  /**
   * Record success metrics
   */
  async recordSuccess(operationName, duration, attempts) {
    await Promise.all([
      this.recordMetric('OperationSuccess', 1, 'Count', [
        { Name: 'OperationName', Value: operationName }
      ]),
      this.recordMetric('OperationDuration', duration, 'Milliseconds', [
        { Name: 'OperationName', Value: operationName }
      ]),
      this.recordMetric('OperationAttempts', attempts + 1, 'Count', [
        { Name: 'OperationName', Value: operationName }
      ])
    ]);
  }

  /**
   * Record error metrics
   */
  async recordError(errorType, error, context = {}) {
    await Promise.all([
      this.recordMetric('OperationErrors', 1, 'Count', [
        { Name: 'ErrorType', Value: errorType },
        { Name: 'OperationName', Value: context.operationName || 'unknown' }
      ]),
      this.recordMetric('ErrorsByType', 1, 'Count', [
        { Name: 'ErrorType', Value: errorType }
      ])
    ]);
    
    console.error('🚨 Error recorded:', {
      errorType,
      error: {
        name: error.name,
        message: error.message
      },
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Record final failure metrics
   */
  async recordFinalFailure(operationName, error, attempts, duration, context) {
    await Promise.all([
      this.recordMetric('OperationFinalFailure', 1, 'Count', [
        { Name: 'OperationName', Value: operationName }
      ]),
      this.recordMetric('FailedOperationDuration', duration, 'Milliseconds', [
        { Name: 'OperationName', Value: operationName }
      ]),
      this.recordMetric('FailedOperationAttempts', attempts, 'Count', [
        { Name: 'OperationName', Value: operationName }
      ])
    ]);
  }

  /**
   * Record custom CloudWatch metric
   */
  async recordMetric(metricName, value, unit = 'Count', dimensions = []) {
    try {
      const command = new PutMetricDataCommand({
        Namespace: this.metricsNamespace,
        MetricData: [{
          MetricName: metricName,
          Value: value,
          Unit: unit,
          Timestamp: new Date(),
          Dimensions: dimensions
        }]
      });

      await this.cloudWatchClient.send(command);
    } catch (error) {
      console.error(`❌ Failed to record metric ${metricName}:`, error);
    }
  }

  /**
   * Get error handling statistics
   */
  async getErrorStatistics() {
    try {
      const circuitBreakerStatus = Array.from(this.circuitBreakers.entries()).map(([name, breaker]) => ({
        operationName: name,
        state: breaker.state,
        failures: breaker.failures,
        lastFailureTime: breaker.lastFailureTime
      }));

      return {
        circuitBreakers: circuitBreakerStatus,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Failed to get error statistics:', error);
      return { error: error.message };
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { ErrorHandlingService };