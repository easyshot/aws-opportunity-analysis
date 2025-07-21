/**
 * Lambda function for Bedrock Agent Funding Analysis Action Group
 * Handles funding options analysis for opportunities
 */

const { bedrockAgent, bedrockRuntime } = require('./layers/shared-utilities/nodejs/aws-clients');
const { 
    validateOpportunityDetails, 
    createErrorResponse, 
    createSuccessResponse,
    retryWithBackoff
} = require('./layers/shared-utilities/nodejs/utils');
const { GetPromptCommand } = require('@aws-sdk/client-bedrock-agent');
const { ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

exports.handler = async (event) => {
    console.log('Funding Analysis Action Group invoked:', JSON.stringify(event, null, 2));
    
    try {
        const { function: functionName, parameters } = event;
        
        switch (functionName) {
            case 'analyzeFundingOptions':
                return await analyzeFundingOptions(parameters);
            default:
                throw new Error(`Unknown function: ${functionName}`);
        }
    } catch (error) {
        console.error('Error in funding analysis action group:', error);
        return {
            statusCode: 500,
            body: {
                error: error.message,
                function: event.function
            }
        };
    }
};

/**
 * Analyze funding options based on opportunity details
 */
async function analyzeFundingOptions(parameters) {
    try {
        const { opportunityDetails, projectedArr, topServices } = parameters;
        
        // Create funding analysis prompt
        const fundingPrompt = `Analyze funding options for this AWS opportunity:

Customer: ${opportunityDetails.customerName || 'Not specified'}
Region: ${opportunityDetails.region || 'Not specified'}
Opportunity: ${opportunityDetails.opportunityName || 'Not specified'}
Description: ${opportunityDetails.description || 'Not specified'}
Projected ARR: ${projectedArr || 'Not available'}
Top Services: ${topServices || 'Not available'}

Please provide a comprehensive funding analysis including:

1. **Funding Requirements Analysis**
   - Estimated initial investment needed
   - Ongoing operational costs
   - Break-even timeline analysis

2. **Funding Sources**
   - AWS Partner funding programs
   - Customer co-investment opportunities
   - Third-party financing options
   - Internal funding recommendations

3. **Risk Assessment**
   - Financial risks and mitigation strategies
   - Market risks and competitive factors
   - Technical delivery risks

4. **Funding Strategy Recommendations**
   - Recommended funding approach
   - Phased funding timeline
   - Success metrics and milestones

5. **ROI Analysis**
   - Expected return on investment
   - Payback period calculation
   - Long-term value proposition

Please structure your response in clear sections with actionable recommendations.`;

        // Use a standard model for funding analysis
        const payload = {
            modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
            messages: [
                {
                    role: "user",
                    content: [{ text: fundingPrompt }]
                }
            ],
            inferenceConfig: {
                maxTokens: 4096,
                temperature: 0.1
            }
        };

        // Invoke Bedrock for funding analysis
        const converseCommand = new ConverseCommand(payload);
        const response = await bedrockRuntime.send(converseCommand);
        
        // Process the response
        const fundingAnalysis = response.output.message.content[0].text;
        
        return {
            statusCode: 200,
            body: {
                fundingAnalysis: fundingAnalysis,
                success: true
            }
        };
        
    } catch (error) {
        console.error('Error analyzing funding options:', error);
        throw error;
    }
}