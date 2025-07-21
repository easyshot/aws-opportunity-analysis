/**
 * Bedrock Agent Manager
 * Manages the primary Bedrock Agent for opportunity analysis orchestration
 */

const { 
  BedrockAgentClient,
  CreateAgentCommand,
  UpdateAgentCommand,
  GetAgentCommand,
  CreateAgentActionGroupCommand,
  UpdateAgentActionGroupCommand,
  CreateAgentAliasCommand,
  UpdateAgentAliasCommand,
  PrepareAgentCommand,
  ListAgentsCommand
} = require('@aws-sdk/client-bedrock-agent');

const { bedrockAgent, getConfig } = require('../config/aws-config-v3');

class BedrockAgentManager {
  constructor() {
    this.client = bedrockAgent;
    this.agentId = null;
    this.agentAliases = new Map();
  }

  /**
   * Initialize or get existing Bedrock Agent
   */
  async initializeAgent() {
    try {
      const config = await getConfig();
      const agentName = 'opportunity-analysis-orchestrator';
      
      // Check if agent already exists
      const existingAgent = await this.findAgentByName(agentName);
      
      if (existingAgent) {
        console.log(`Found existing agent: ${existingAgent.agentId}`);
        this.agentId = existingAgent.agentId;
        return existingAgent;
      }

      // Create new agent
      console.log('Creating new Bedrock Agent for opportunity analysis...');
      const agent = await this.createAgent(agentName);
      this.agentId = agent.agentId;
      
      // Set up action groups
      await this.setupActionGroups();
      
      // Create aliases for different environments
      await this.setupAgentAliases();
      
      // Prepare the agent
      await this.prepareAgent();
      
      return agent;
    } catch (error) {
      console.error('Error initializing Bedrock Agent:', error);
      throw error;
    }
  }

  /**
   * Find agent by name
   */
  async findAgentByName(agentName) {
    try {
      const command = new ListAgentsCommand({});
      const response = await this.client.send(command);
      
      return response.agentSummaries?.find(agent => 
        agent.agentName === agentName
      );
    } catch (error) {
      console.error('Error finding agent by name:', error);
      return null;
    }
  }

  /**
   * Create new Bedrock Agent
   */
  async createAgent(agentName) {
    const config = await getConfig();
    
    const command = new CreateAgentCommand({
      agentName: agentName,
      description: 'Primary agent for AWS opportunity analysis orchestration',
      foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
      instruction: `You are an intelligent orchestrator for AWS opportunity analysis. Your role is to:

1. Coordinate the analysis workflow by calling appropriate action groups
2. Generate SQL queries to find similar historical projects
3. Analyze retrieved data to provide predictions and recommendations
4. Perform funding analysis when requested
5. Identify follow-on opportunities

You have access to the following capabilities:
- Query Generation: Generate SQL queries based on opportunity details
- Data Analysis: Analyze historical project data to make predictions
- Funding Analysis: Analyze funding options for opportunities
- Follow-on Analysis: Identify potential follow-on opportunities

Always provide structured, actionable insights based on the historical data analysis.`,
      idleSessionTTLInSeconds: 1800, // 30 minutes
      agentResourceRoleArn: await this.getOrCreateAgentRole(),
      customerEncryptionKeyArn: config.kms?.keyArn, // Optional KMS key
      tags: {
        Environment: process.env.NODE_ENV || 'development',
        Application: 'aws-opportunity-analysis',
        Component: 'bedrock-agent'
      }
    });

    const response = await this.client.send(command);
    console.log('Created Bedrock Agent:', response.agent.agentId);
    return response.agent;
  }

  /**
   * Set up action groups for the agent
   */
  async setupActionGroups() {
    const actionGroups = [
      {
        name: 'query-generation',
        description: 'Generate SQL queries to find similar historical projects',
        functionSchema: {
          functions: [
            {
              name: 'generateOpportunityQuery',
              description: 'Generate SQL query based on opportunity details',
              parameters: {
                type: 'object',
                properties: {
                  customerName: { type: 'string', description: 'Customer name' },
                  region: { type: 'string', description: 'AWS region' },
                  closeDate: { type: 'string', description: 'Opportunity close date' },
                  opportunityName: { type: 'string', description: 'Opportunity name' },
                  description: { type: 'string', description: 'Opportunity description' }
                },
                required: ['customerName', 'region', 'closeDate', 'opportunityName', 'description']
              }
            }
          ]
        }
      },
      {
        name: 'data-analysis',
        description: 'Analyze historical project data and generate predictions',
        functionSchema: {
          functions: [
            {
              name: 'analyzeOpportunityData',
              description: 'Analyze historical data to generate predictions',
              parameters: {
                type: 'object',
                properties: {
                  opportunityDetails: { type: 'object', description: 'Opportunity details' },
                  historicalData: { type: 'array', description: 'Historical project data' },
                  analysisType: { type: 'string', enum: ['standard', 'nova-premier'], description: 'Analysis model type' }
                },
                required: ['opportunityDetails', 'historicalData']
              }
            }
          ]
        }
      },
      {
        name: 'funding-analysis',
        description: 'Analyze funding options for opportunities',
        functionSchema: {
          functions: [
            {
              name: 'analyzeFundingOptions',
              description: 'Analyze funding options based on opportunity details',
              parameters: {
                type: 'object',
                properties: {
                  opportunityDetails: { type: 'object', description: 'Opportunity details' },
                  projectedArr: { type: 'string', description: 'Projected ARR' },
                  topServices: { type: 'string', description: 'Top recommended services' }
                },
                required: ['opportunityDetails']
              }
            }
          ]
        }
      },
      {
        name: 'follow-on-analysis',
        description: 'Identify follow-on opportunities',
        functionSchema: {
          functions: [
            {
              name: 'identifyFollowOnOpportunities',
              description: 'Identify potential follow-on opportunities',
              parameters: {
                type: 'object',
                properties: {
                  opportunityDetails: { type: 'object', description: 'Current opportunity details' },
                  analysisResults: { type: 'object', description: 'Current analysis results' }
                },
                required: ['opportunityDetails']
              }
            }
          ]
        }
      }
    ];

    for (const actionGroup of actionGroups) {
      await this.createActionGroup(actionGroup);
    }
  }

  /**
   * Create individual action group
   */
  async createActionGroup(actionGroupConfig) {
    try {
      const command = new CreateAgentActionGroupCommand({
        agentId: this.agentId,
        agentVersion: 'DRAFT',
        actionGroupName: actionGroupConfig.name,
        description: actionGroupConfig.description,
        actionGroupExecutor: {
          lambda: await this.getActionGroupLambdaArn(actionGroupConfig.name)
        },
        functionSchema: actionGroupConfig.functionSchema,
        actionGroupState: 'ENABLED'
      });

      const response = await this.client.send(command);
      console.log(`Created action group: ${actionGroupConfig.name}`);
      return response;
    } catch (error) {
      console.error(`Error creating action group ${actionGroupConfig.name}:`, error);
      throw error;
    }
  }

  /**
   * Set up agent aliases for different environments
   */
  async setupAgentAliases() {
    const environments = ['development', 'staging', 'production'];
    
    for (const env of environments) {
      try {
        const alias = await this.createAgentAlias(env);
        this.agentAliases.set(env, alias);
      } catch (error) {
        console.error(`Error creating alias for ${env}:`, error);
      }
    }
  }

  /**
   * Create agent alias for specific environment
   */
  async createAgentAlias(environment) {
    const command = new CreateAgentAliasCommand({
      agentId: this.agentId,
      agentAliasName: `${environment}-alias`,
      description: `Agent alias for ${environment} environment`,
      routingConfiguration: [
        {
          agentVersion: 'DRAFT'
        }
      ],
      tags: {
        Environment: environment,
        Application: 'aws-opportunity-analysis'
      }
    });

    const response = await this.client.send(command);
    console.log(`Created agent alias for ${environment}: ${response.agentAlias.agentAliasId}`);
    return response.agentAlias;
  }

  /**
   * Prepare the agent (required after creating/updating)
   */
  async prepareAgent() {
    try {
      const command = new PrepareAgentCommand({
        agentId: this.agentId
      });

      const response = await this.client.send(command);
      console.log('Agent prepared successfully');
      return response;
    } catch (error) {
      console.error('Error preparing agent:', error);
      throw error;
    }
  }

  /**
   * Get or create IAM role for the agent
   */
  async getOrCreateAgentRole() {
    // This would typically create an IAM role with necessary permissions
    // For now, return a placeholder - this should be implemented with actual IAM role creation
    const config = await getConfig();
    return config.iam?.agentRoleArn || `arn:aws:iam::${process.env.AWS_ACCOUNT_ID}:role/BedrockAgentRole`;
  }

  /**
   * Get Lambda ARN for action group
   */
  async getActionGroupLambdaArn(actionGroupName) {
    // This would return the appropriate Lambda function ARN for each action group
    // For now, return a placeholder - this should be implemented with actual Lambda ARNs
    const config = await getConfig();
    return config.lambda?.actionGroupArns?.[actionGroupName] || 
           `arn:aws:lambda:${config.aws.region}:${process.env.AWS_ACCOUNT_ID}:function:bedrock-agent-${actionGroupName}`;
  }

  /**
   * Get agent information
   */
  async getAgent() {
    if (!this.agentId) {
      throw new Error('Agent not initialized');
    }

    const command = new GetAgentCommand({
      agentId: this.agentId
    });

    return await this.client.send(command);
  }

  /**
   * Get agent alias for environment
   */
  getAgentAlias(environment = 'development') {
    return this.agentAliases.get(environment);
  }
}

module.exports = BedrockAgentManager;