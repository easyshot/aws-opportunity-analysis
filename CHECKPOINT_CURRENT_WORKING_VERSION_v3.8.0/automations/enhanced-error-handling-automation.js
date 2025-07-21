/**
 * Enhanced Automation with Advanced Error Handling
 * Wraps existing automations with comprehensive error handling
 */

const { ErrorHandlingService } = require('../lib/error-handling-service');
const invokeBedrockQueryPrompt = require('./invokeBedrockQueryPrompt-v3');
const InvLamFilterAut = require('./InvLamFilterAut-v3');
const finalBedAnalysisPrompt = require('./finalBedAnalysisPrompt-v3');
const finalBedAnalysisPromptNovaPremier = require('./finalBedAnalysisPromptNovaPremier-v3');

class EnhancedErrorHandlingAutomation {
  constructor(config = {}) {
    this.errorHandler = new ErrorHandlingService(config);
    console.log('🛡️ Enhanced Error Handling Automation initialized');
  }

  /**
   * Execute Bedrock query generation with error handling
   */
  async executeBedrockQueryWithErrorHandling(params, options = {}) {
    return await this.errorHandler.executeWithErrorHandling(
      'bedrock-query-generation',
      async () => {
        console.log('🔍 Executing Bedrock query generation...');
        const result = await invokeBedrockQueryPrompt.execute(params);
        
        if (result.status !== 'success') {
          throw new Error(`Query generation failed: ${result.message}`);
        }
        
        return result;
      },
      {
        maxRetries: 3,
        enableCircuitBreaker: true,
        enableDLQ: true,
        context: {
          customerName: params.CustomerName,
          region: params.region,
          operationType: 'query-generation'
        },
        ...options
      }
    );
  }

  /**
   * Execute Lambda data retrieval with error handling
   */
  async executeLambdaWithErrorHandling(params, options = {}) {
    return await this.errorHandler.executeWithErrorHandling(
      'lambda-data-retrieval',
      async () => {
        console.log('⚡ Executing Lambda data retrieval...');
        const result = await InvLamFilterAut.execute(params);
        
        if (result.status !== 'success') {
          throw new Error(`Lambda execution failed: ${result.message}`);
        }
        
        return result;
      },
      {
        maxRetries: 5,
        enableCircuitBreaker: true,
        enableDLQ: true,
        context: {
          lambdaFunction: 'catapult_get_dataset',
          operationType: 'data-retrieval'
        },
        ...options
      }
    );
  }

  /**
   * Execute Bedrock analysis with error handling
   */
  async executeBedrockAnalysisWithErrorHandling(params, useNovaPremier = false, options = {}) {
    const operationName = useNovaPremier ? 'bedrock-analysis-nova-premier' : 'bedrock-analysis-standard';
    const analysisFunction = useNovaPremier ? finalBedAnalysisPromptNovaPremier : finalBedAnalysisPrompt;
    
    return await this.errorHandler.executeWithErrorHandling(
      operationName,
      async () => {
        console.log(`🤖 Executing Bedrock analysis (${useNovaPremier ? 'Nova Premier' : 'Standard'})...`);
        const result = await analysisFunction.execute(params);
        
        if (result.status !== 'success') {
          throw new Error(`Analysis failed: ${result.message}`);
        }
        
        return result;
      },
      {
        maxRetries: 3,
        enableCircuitBreaker: true,
        enableDLQ: true,
        context: {
          customerName: params.CustomerName,
          region: params.region,
          modelType: useNovaPremier ? 'nova-premier' : 'standard',
          operationType: 'analysis'
        },
        ...options
      }
    );
  }

  /**
   * Execute complete analysis workflow with error handling
   */
  async executeCompleteAnalysisWorkflow(params, options = {}) {
    const { CustomerName, region, closeDate, oppName, oppDescription, useNovaPremier = false } = params;
    const workflowStartTime = Date.now();
    
    console.log('🔄 Starting complete analysis workflow with error handling...');
    
    try {
      // Step 1: Generate SQL query with error handling
      console.log('📝 Step 1: Generating SQL query...');
      const queryResult = await this.executeBedrockQueryWithErrorHandling({
        CustomerName,
        region,
        closeDate,
        oppName,
        oppDescription
      }, options);

      // Step 2: Execute Lambda with error handling
      console.log('🔍 Step 2: Retrieving data...');
      const dataResult = await this.executeLambdaWithErrorHandling({
        query: queryResult.processResults
      }, options);

      // Step 3: Perform analysis with error handling
      console.log('🧠 Step 3: Analyzing results...');
      const analysisResult = await this.executeBedrockAnalysisWithErrorHandling({
        CustomerName,
        region,
        closeDate,
        oppName,
        oppDescription,
        queryResults: dataResult.processResults
      }, useNovaPremier, options);

      const workflowDuration = Date.now() - workflowStartTime;
      
      // Record successful workflow metrics
      await this.errorHandler.recordMetric('WorkflowSuccess', 1, 'Count', [
        { Name: 'CustomerName', Value: CustomerName },
        { Name: 'Region', Value: region },
        { Name: 'ModelType', Value: useNovaPremier ? 'nova-premier' : 'standard' }
      ]);
      
      await this.errorHandler.recordMetric('WorkflowDuration', workflowDuration, 'Milliseconds', [
        { Name: 'ModelType', Value: useNovaPremier ? 'nova-premier' : 'standard' }
      ]);

      console.log(`✅ Complete analysis workflow completed successfully in ${workflowDuration}ms`);
      
      return {
        status: 'success',
        workflow: 'complete-analysis',
        duration: workflowDuration,
        steps: {
          queryGeneration: queryResult,
          dataRetrieval: dataResult,
          analysis: analysisResult
        },
        finalResult: analysisResult
      };
      
    } catch (error) {
      const workflowDuration = Date.now() - workflowStartTime;
      
      console.error('❌ Complete analysis workflow failed:', error.message);
      
      // Record failed workflow metrics
      await this.errorHandler.recordMetric('WorkflowFailure', 1, 'Count', [
        { Name: 'CustomerName', Value: CustomerName },
        { Name: 'Region', Value: region },
        { Name: 'ModelType', Value: useNovaPremier ? 'nova-premier' : 'standard' }
      ]);
      
      await this.errorHandler.recordMetric('FailedWorkflowDuration', workflowDuration, 'Milliseconds', [
        { Name: 'ModelType', Value: useNovaPremier ? 'nova-premier' : 'standard' }
      ]);
      
      // The error has already been handled by the error handling service
      // including DLQ processing and recovery attempts
      throw error;
    }
  }

  /**
   * Process Dead Letter Queue messages
   */
  async processDLQMessages(maxMessages = 10) {
    console.log('📥 Processing Dead Letter Queue messages...');
    return await this.errorHandler.processDLQMessages(maxMessages);
  }

  /**
   * Get error handling statistics
   */
  async getErrorStatistics() {
    return await this.errorHandler.getErrorStatistics();
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus() {
    const stats = this.errorHandler.getErrorStatistics();
    return stats.circuitBreakers || [];
  }

  /**
   * Reset circuit breaker for a specific operation
   */
  resetCircuitBreaker(operationName) {
    this.errorHandler.resetCircuitBreaker(operationName);
    console.log(`🔄 Circuit breaker reset for operation: ${operationName}`);
  }

  /**
   * Test error handling with a simulated failure
   */
  async testErrorHandling(operationName = 'test-operation', shouldFail = true) {
    console.log(`🧪 Testing error handling for operation: ${operationName}`);
    
    try {
      const result = await this.errorHandler.executeWithErrorHandling(
        operationName,
        async () => {
          if (shouldFail) {
            throw new Error('Simulated test failure');
          }
          return { success: true, message: 'Test operation succeeded' };
        },
        {
          maxRetries: 2,
          enableCircuitBreaker: true,
          enableDLQ: true,
          context: {
            testOperation: true,
            timestamp: new Date().toISOString()
          }
        }
      );
      
      console.log('✅ Test operation completed successfully:', result);
      return result;
    } catch (error) {
      console.log('❌ Test operation failed as expected:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Health check for error handling service
   */
  async healthCheck() {
    try {
      const stats = await this.getErrorStatistics();
      const circuitBreakers = stats.circuitBreakers || [];
      const openCircuitBreakers = circuitBreakers.filter(cb => cb.state === 'open');
      
      return {
        healthy: openCircuitBreakers.length === 0,
        circuitBreakers: {
          total: circuitBreakers.length,
          open: openCircuitBreakers.length,
          closed: circuitBreakers.filter(cb => cb.state === 'closed').length,
          halfOpen: circuitBreakers.filter(cb => cb.state === 'half-open').length
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = { EnhancedErrorHandlingAutomation };