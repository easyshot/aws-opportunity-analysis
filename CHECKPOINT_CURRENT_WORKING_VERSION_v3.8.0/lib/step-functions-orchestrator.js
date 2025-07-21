/**
 * Step Functions Orchestrator
 * Manages execution of Step Functions state machines for opportunity analysis workflows
 */

const { SFNClient, StartExecutionCommand, DescribeExecutionCommand } = require('@aws-sdk/client-sfn');
const { config } = require('../config/aws-config-v3');

class StepFunctionsOrchestrator {
  constructor() {
    this.sfnClient = new SFNClient({ region: config.region });
    this.stateMachines = {
      opportunityAnalysis: process.env.OPPORTUNITY_ANALYSIS_STATE_MACHINE_ARN,
      fundingAnalysis: process.env.FUNDING_ANALYSIS_STATE_MACHINE_ARN,
      followOnAnalysis: process.env.FOLLOW_ON_ANALYSIS_STATE_MACHINE_ARN
    };
  }

  /**
   * Execute main opportunity analysis workflow
   */
  async executeOpportunityAnalysis(opportunityDetails, analysisOptions = {}) {
    try {
      console.log('Starting opportunity analysis workflow via Step Functions');
      
      const input = {
        opportunityDetails,
        analysisOptions: {
          useNovaPremier: analysisOptions.useNovaPremier || false,
          includeValidation: analysisOptions.includeValidation || true
        }
      };

      const executionName = `opportunity-analysis-${Date.now()}`;
      
      const command = new StartExecutionCommand({
        stateMachineArn: this.stateMachines.opportunityAnalysis,
        name: executionName,
        input: JSON.stringify(input)
      });

      const result = await this.sfnClient.send(command);
      
      console.log('Step Functions execution started:', result.executionArn);
      
      // Wait for execution to complete
      const finalResult = await this.waitForExecution(result.executionArn);
      
      return finalResult;
    } catch (error) {
      console.error('Error executing opportunity analysis workflow:', error);
      return {
        status: 'error',
        message: `Step Functions execution failed: ${error.message}`,
        orchestrationType: 'step-functions'
      };
    }
  }

  /**
   * Execute funding analysis workflow
   */
  async executeFundingAnalysis(opportunityDetails, analysisResults) {
    try {
      console.log('Starting funding analysis workflow via Step Functions');
      
      const input = {
        opportunityDetails,
        analysisResults
      };

      const executionName = `funding-analysis-${Date.now()}`;
      
      const command = new StartExecutionCommand({
        stateMachineArn: this.stateMachines.fundingAnalysis,
        name: executionName,
        input: JSON.stringify(input)
      });

      const result = await this.sfnClient.send(command);
      
      console.log('Step Functions funding execution started:', result.executionArn);
      
      // Wait for execution to complete
      const finalResult = await this.waitForExecution(result.executionArn);
      
      return finalResult;
    } catch (error) {
      console.error('Error executing funding analysis workflow:', error);
      return {
        status: 'error',
        message: `Step Functions funding execution failed: ${error.message}`,
        orchestrationType: 'step-functions'
      };
    }
  }

  /**
   * Execute follow-on analysis workflow
   */
  async executeFollowOnAnalysis(opportunityDetails, analysisResults) {
    try {
      console.log('Starting follow-on analysis workflow via Step Functions');
      
      const input = {
        opportunityDetails,
        analysisResults
      };

      const executionName = `follow-on-analysis-${Date.now()}`;
      
      const command = new StartExecutionCommand({
        stateMachineArn: this.stateMachines.followOnAnalysis,
        name: executionName,
        input: JSON.stringify(input)
      });

      const result = await this.sfnClient.send(command);
      
      console.log('Step Functions follow-on execution started:', result.executionArn);
      
      // Wait for execution to complete
      const finalResult = await this.waitForExecution(result.executionArn);
      
      return finalResult;
    } catch (error) {
      console.error('Error executing follow-on analysis workflow:', error);
      return {
        status: 'error',
        message: `Step Functions follow-on execution failed: ${error.message}`,
        orchestrationType: 'step-functions'
      };
    }
  }

  /**
   * Wait for Step Functions execution to complete
   */
  async waitForExecution(executionArn, maxWaitTime = 300000) { // 5 minutes max
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const command = new DescribeExecutionCommand({
          executionArn
        });
        
        const result = await this.sfnClient.send(command);
        
        if (result.status === 'SUCCEEDED') {
          console.log('Step Functions execution completed successfully');
          return JSON.parse(result.output);
        } else if (result.status === 'FAILED') {
          console.error('Step Functions execution failed:', result.error);
          return {
            status: 'error',
            message: `Execution failed: ${result.error}`,
            orchestrationType: 'step-functions'
          };
        } else if (result.status === 'TIMED_OUT') {
          console.error('Step Functions execution timed out');
          return {
            status: 'error',
            message: 'Execution timed out',
            orchestrationType: 'step-functions'
          };
        } else if (result.status === 'ABORTED') {
          console.error('Step Functions execution was aborted');
          return {
            status: 'error',
            message: 'Execution was aborted',
            orchestrationType: 'step-functions'
          };
        }
        
        // Still running, wait and check again
        console.log(`Step Functions execution status: ${result.status}, waiting...`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        console.error('Error checking execution status:', error);
        return {
          status: 'error',
          message: `Error checking execution status: ${error.message}`,
          orchestrationType: 'step-functions'
        };
      }
    }
    
    // Timeout reached
    console.error('Step Functions execution wait timeout reached');
    return {
      status: 'error',
      message: 'Execution wait timeout reached',
      orchestrationType: 'step-functions'
    };
  }

  /**
   * Get execution history for debugging
   */
  async getExecutionHistory(executionArn) {
    try {
      const { GetExecutionHistoryCommand } = require('@aws-sdk/client-sfn');
      
      const command = new GetExecutionHistoryCommand({
        executionArn,
        maxResults: 100,
        reverseOrder: true
      });
      
      const result = await this.sfnClient.send(command);
      return result.events;
    } catch (error) {
      console.error('Error getting execution history:', error);
      return [];
    }
  }
}

module.exports = StepFunctionsOrchestrator;  /*
*
   * Validate configuration
   */
  validateConfiguration() {
    if (!this.stateMachines.opportunityAnalysis) {
      console.warn('OPPORTUNITY_ANALYSIS_STATE_MACHINE_ARN environment variable not set');
    }
    if (!this.stateMachines.fundingAnalysis) {
      console.warn('FUNDING_ANALYSIS_STATE_MACHINE_ARN environment variable not set');
    }
    if (!this.stateMachines.followOnAnalysis) {
      console.warn('FOLLOW_ON_ANALYSIS_STATE_MACHINE_ARN environment variable not set');
    }
  }