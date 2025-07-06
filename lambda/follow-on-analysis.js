/**
 * Lambda function for Step Functions: Follow-On Analysis
 * Implements follow-on opportunity analysis using Bedrock
 */

const { bedrockAgent, bedrockRuntime, config } = require('../config/aws-config-v3');
const { GetPromptCommand } = require('@aws-sdk/client-bedrock-agent');
const { ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

exports.handler = async (event) => {
  console.log('Follow-On Analysis Lambda - Event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract parameters from the event
    const { CustomerName, region, oppName, oppDescription, queryResults, analysisResults } = event;
    
    // Validate required parameters
    if (!CustomerName || !region || !oppName || !oppDescription) {
      throw new Error('Missing required parameters for follow-on analysis');
    }
    
    // Execute follow-on analysis using Bedrock
    const result = await analyzeFollowOnOpportunities({
      CustomerName,
      region,
      oppName,
      oppDescription,
      queryResults,
      analysisResults
    });
    
    console.log('Follow-On Analysis Lambda - Result:', JSON.stringify(result, null, 2));
    
    return {
      status: 'success',
      followOnAnalysis: result,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Follow-On Analysis Lambda - Error:', error);
    
    return {
      status: 'error',
      message: error.message,
      followOnAnalysis: `Error analyzing follow-on opportunities: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Analyze follow-on opportunities using Bedrock
 */
async function analyzeFollowOnOpportunities(params) {
  try {
    // Use a generic prompt for follow-on analysis
    const systemPrompt = `You are an AWS solutions architect analyzing follow-on opportunities for existing customers. 
Based on the customer information and historical data provided, identify potential next opportunities, 
additional services they might need, and expansion possibilities.

Provide your analysis in the following format:
=== FOLLOW-ON OPPORTUNITIES ===
[List potential next opportunities]

=== RECOMMENDED SERVICES ===
[List additional AWS services they might need]

=== EXPANSION TIMELINE ===
[Suggest timeline for follow-on opportunities]

=== NEXT STEPS ===
[Recommend specific actions]`;

    const userPrompt = `Customer: ${params.CustomerName}
Region: ${params.region}
Current Opportunity: ${params.oppName}
Description: ${params.oppDescription}

Historical Data: ${params.queryResults || 'No historical data available'}

Current Analysis Results: ${JSON.stringify(params.analysisResults || {}, null, 2)}

Please analyze potential follow-on opportunities for this customer.`;

    const payload = {
      modelId: 'amazon.titan-text-premier-v1:0',
      system: [{ text: systemPrompt }],
      messages: [
        {
          role: "user",
          content: [{ text: userPrompt }]
        }
      ],
      inferenceConfig: {
        maxTokens: 4096,
        temperature: 0.1
      }
    };

    const command = new ConverseCommand(payload);
    const response = await bedrockRuntime.send(command);
    
    if (!response || !response.output || !response.output.message || !response.output.message.content || !response.output.message.content[0]) {
      throw new Error('Invalid response from Bedrock');
    }
    
    return response.output.message.content[0].text;
  } catch (error) {
    console.error('Error in analyzeFollowOnOpportunities:', error);
    throw error;
  }
}