/**
 * Lambda function for Step Functions: Funding Analysis
 * Implements funding options analysis using Bedrock
 */

const { bedrockAgent, bedrockRuntime, config } = require('../config/aws-config-v3');
const { GetPromptCommand } = require('@aws-sdk/client-bedrock-agent');
const { ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

exports.handler = async (event) => {
  console.log('Funding Analysis Lambda - Event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract parameters from the event
    const { CustomerName, region, oppName, oppDescription, analysisResults } = event;
    
    // Validate required parameters
    if (!CustomerName || !region || !oppName || !oppDescription) {
      throw new Error('Missing required parameters for funding analysis');
    }
    
    // Execute funding analysis using Bedrock
    const result = await analyzeFundingOptions({
      CustomerName,
      region,
      oppName,
      oppDescription,
      analysisResults
    });
    
    console.log('Funding Analysis Lambda - Result:', JSON.stringify(result, null, 2));
    
    return {
      status: 'success',
      fundingAnalysis: result,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Funding Analysis Lambda - Error:', error);
    
    return {
      status: 'error',
      message: error.message,
      fundingAnalysis: `Error analyzing funding options: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Analyze funding options using Bedrock
 */
async function analyzeFundingOptions(params) {
  try {
    // Use a generic prompt for funding analysis
    const systemPrompt = `You are a financial analyst specializing in AWS project funding and financing options. 
Based on the customer information and analysis results provided, recommend appropriate funding strategies, 
financing options, and cost optimization approaches.

Provide your analysis in the following format:
=== FUNDING OPTIONS ===
[List potential funding sources and strategies]

=== COST OPTIMIZATION ===
[Suggest ways to optimize costs and improve ROI]

=== FINANCING RECOMMENDATIONS ===
[Recommend specific financing approaches]

=== BUDGET CONSIDERATIONS ===
[Highlight important budget factors]`;

    const userPrompt = `Customer: ${params.CustomerName}
Region: ${params.region}
Opportunity: ${params.oppName}
Description: ${params.oppDescription}

Analysis Results: ${JSON.stringify(params.analysisResults || {}, null, 2)}

Please analyze funding options and financial strategies for this opportunity.`;

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
    console.error('Error in analyzeFundingOptions:', error);
    throw error;
  }
}