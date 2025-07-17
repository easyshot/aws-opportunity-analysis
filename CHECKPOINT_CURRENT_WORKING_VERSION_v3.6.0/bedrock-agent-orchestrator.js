/**
 * Bedrock Agent Orchestrator
 * Coordinates the opportunity analysis workflow using Bedrock Agents
 */

const { 
  BedrockAgentRuntimeClient,
  InvokeAgentCommand
} = require('@aws-sdk/client-bedrock-agent-runtime');

const { getConfig } = require('../config/aws-config-v3');
const BedrockAgentManager = require('./bedrock-agent-manager');

class BedrockAgentOrchestrator {
  constructor() {
    this.agentManager = new BedrockAgentManager();
    this.agentRuntimeClient = new BedrockAgentRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    this.sessionId = null;
    this.agentId = null;
    this.agentAliasId = null;
  }

  /**
   * Initialize the orchestrator
   */
  async initialize() {
    try {
      // Initialize the agent
      const agent = await this.agentManager.initializeAgent();
      this.agentId = agent.agentId;
      
      // Get the appropriate alias for current environment
      const environment = process.env.NODE_ENV || 'development';
      const alias = this.agentManager.getAgentAlias(environment);
      this.agentAliasId = alias?.agentAliasId;
      
      // Generate a session ID
      this.sessionId = this.generateSessionId();
      
      console.log(`Agent orchestrator initialized - Agent: ${this.agentId}, Alias: ${this.agentAliasId}`);
    } catch (error) {
      console.error('Error initializing agent orchestrator:', error);
      throw error;
    }
  }

  /**
   * Execute complete opportunity analysis workflow
   */
  async analyzeOpportunity(opportunityDetails, options = {}) {
    try {
      if (!this.agentId) {
        await this.initialize();
      }

      const { useNovaPremier = false } = options;
      
      // Construct the analysis request
      const analysisRequest = this.buildAnalysisRequest(opportunityDetails, useNovaPremier);
      
      // Invoke the agent
      const response = await this.invokeAgent(analysisRequest);
      
      // Process and return results
      return this.processAgentResponse(response);
      
    } catch (error) {
      console.error('Error in opportunity analysis:', error);
      throw error;
    }
  }

  /**
   * Execute funding analysis
   */
  async analyzeFunding(opportunityDetails, analysisResults) {
    try {
      if (!this.agentId) {
        await this.initialize();
      }

      const fundingRequest = this.buildFundingRequest(opportunityDetails, analysisResults);
      const response = await this.invokeAgent(fundingRequest);
      
      return this.processFundingResponse(response);
      
    } catch (error) {
      console.error('Error in funding analysis:', error);
      throw error;
    }
  }

  /**
   * Execute follow-on opportunity analysis
   */
  async analyzeFollowOnOpportunities(opportunityDetails, analysisResults) {
    try {
      if (!this.agentId) {
        await this.initialize();
      }

      const followOnRequest = this.buildFollowOnRequest(opportunityDetails, analysisResults);
      const response = await this.invokeAgent(followOnRequest);
      
      return this.processFollowOnResponse(response);
      
    } catch (error) {
      console.error('Error in follow-on analysis:', error);
      throw error;
    }
  }

  /**
   * Build analysis request for the agent
   */
  buildAnalysisRequest(opportunityDetails, useNovaPremier) {
    const analysisType = useNovaPremier ? 'nova-premier' : 'standard';
    
    return `Please analyze this opportunity using the ${analysisType} model:

Customer: ${opportunityDetails.CustomerName}
Region: ${opportunityDetails.region}
Close Date: ${opportunityDetails.closeDate}
Opportunity Name: ${opportunityDetails.oppName}
Description: ${opportunityDetails.oppDescription}

Please perform the following steps:
1. Generate a SQL query to find similar historical projects
2. Execute the query to retrieve historical data
3. Analyze the data to provide predictions for ARR, MRR, launch date, and recommended services
4. Provide detailed findings, rationale, and risk factors

Return the results in a structured format with all analysis components.`;
  }

  /**
   * Build funding analysis request
   */
  buildFundingRequest(opportunityDetails, analysisResults) {
    return `Please analyze funding options for this opportunity:

Customer: ${opportunityDetails.CustomerName}
Region: ${opportunityDetails.region}
Opportunity: ${opportunityDetails.oppName}
Description: ${opportunityDetails.oppDescription}
Projected ARR: ${analysisResults.metrics?.predictedArr || 'Not available'}
Top Services: ${analysisResults.metrics?.topServices || 'Not available'}

Please provide funding analysis including:
1. Potential funding sources
2. Funding requirements based on projected costs
3. Risk assessment for funding
4. Recommended funding strategy`;
  }

  /**
   * Build follow-on opportunity request
   */
  buildFollowOnRequest(opportunityDetails, analysisResults) {
    return `Please identify follow-on opportunities for this customer:

Customer: ${opportunityDetails.CustomerName}
Region: ${opportunityDetails.region}
Current Opportunity: ${opportunityDetails.oppName}
Current Analysis Results: ${JSON.stringify(analysisResults.metrics, null, 2)}

Please identify:
1. Potential follow-on opportunities based on similar customer patterns
2. Additional services that could be recommended
3. Timeline for follow-on engagements
4. Revenue potential for follow-on opportunities`;
  }

  /**
   * Invoke the Bedrock Agent
   */
  async invokeAgent(inputText) {
    try {
      const command = new InvokeAgentCommand({
        agentId: this.agentId,
        agentAliasId: this.agentAliasId,
        sessionId: this.sessionId,
        inputText: inputText,
        enableTrace: true, // Enable tracing for debugging
        endSession: false
      });

      const response = await this.agentRuntimeClient.send(command);
      return response;
      
    } catch (error) {
      console.error('Error invoking Bedrock Agent:', error);
      throw error;
    }
  }

  /**
   * Process agent response for opportunity analysis
   */
  processAgentResponse(response) {
    try {
      // Extract the completion from the response
      const completion = this.extractCompletion(response);
      
      // Parse the structured response
      const analysisResults = this.parseAnalysisResults(completion);
      
      return {
        status: 'success',
        metrics: analysisResults.metrics,
        sections: analysisResults.sections,
        architecture: analysisResults.architecture,
        validation: analysisResults.validation,
        trace: response.trace // Include trace for debugging
      };
      
    } catch (error) {
      console.error('Error processing agent response:', error);
      return {
        status: 'error',
        message: error.message,
        rawResponse: response
      };
    }
  }

  /**
   * Process funding analysis response
   */
  processFundingResponse(response) {
    try {
      const completion = this.extractCompletion(response);
      
      return {
        status: 'success',
        fundingAnalysis: completion,
        trace: response.trace
      };
      
    } catch (error) {
      console.error('Error processing funding response:', error);
      return {
        status: 'error',
        message: error.message,
        rawResponse: response
      };
    }
  }

  /**
   * Process follow-on analysis response
   */
  processFollowOnResponse(response) {
    try {
      const completion = this.extractCompletion(response);
      
      return {
        status: 'success',
        followOnAnalysis: completion,
        trace: response.trace
      };
      
    } catch (error) {
      console.error('Error processing follow-on response:', error);
      return {
        status: 'error',
        message: error.message,
        rawResponse: response
      };
    }
  }

  /**
   * Extract completion text from agent response
   */
  extractCompletion(response) {
    if (response.completion) {
      return response.completion;
    }
    
    // Handle streaming response
    if (response.completion && response.completion.length > 0) {
      return response.completion.map(chunk => chunk.bytes ? 
        new TextDecoder().decode(chunk.bytes) : ''
      ).join('');
    }
    
    throw new Error('No completion found in agent response');
  }

  /**
   * Parse structured analysis results
   */
  parseAnalysisResults(completion) {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(completion);
      return parsed;
    } catch (error) {
      // If not JSON, parse as structured text
      return this.parseTextAnalysis(completion);
    }
  }

  /**
   * Parse text-based analysis results
   */
  parseTextAnalysis(text) {
    const sections = {
      metrics: {},
      sections: {},
      architecture: {},
      validation: {}
    };

    // Extract metrics using regex patterns
    const arrMatch = text.match(/ARR[:\s]*\$?([0-9,]+)/i);
    const mrrMatch = text.match(/MRR[:\s]*\$?([0-9,]+)/i);
    const launchMatch = text.match(/Launch Date[:\s]*([^\n]+)/i);
    const confidenceMatch = text.match(/Confidence[:\s]*(HIGH|MEDIUM|LOW)/i);

    if (arrMatch) sections.metrics.predictedArr = `$${arrMatch[1]}`;
    if (mrrMatch) sections.metrics.predictedMrr = `$${mrrMatch[1]}`;
    if (launchMatch) sections.metrics.launchDate = launchMatch[1].trim();
    if (confidenceMatch) sections.metrics.confidence = confidenceMatch[1];

    // Extract sections
    sections.sections.summary = text;

    return sections;
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * End the current session
   */
  async endSession() {
    if (this.sessionId && this.agentId) {
      try {
        const command = new InvokeAgentCommand({
          agentId: this.agentId,
          agentAliasId: this.agentAliasId,
          sessionId: this.sessionId,
          inputText: '',
          endSession: true
        });

        await this.agentRuntimeClient.send(command);
        console.log('Agent session ended');
      } catch (error) {
        console.error('Error ending agent session:', error);
      }
    }
  }
}

module.exports = BedrockAgentOrchestrator;