/**
 * Lambda function for Bedrock Agent Query Generation Action Group
 * Handles SQL query generation for opportunity analysis
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
    console.log('Query Generation Action Group invoked:', JSON.stringify(event, null, 2));
    
    try {
        const { function: functionName, parameters } = event;
        
        switch (functionName) {
            case 'generateOpportunityQuery':
                return await generateOpportunityQuery(parameters);
            default:
                throw new Error(`Unknown function: ${functionName}`);
        }
    } catch (error) {
        console.error('Error in query generation action group:', error);
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
 * Generate SQL query based on opportunity details
 */
async function generateOpportunityQuery(parameters) {
    try {
        const { customerName, region, closeDate, opportunityName, description } = parameters;
        
        // Fetch the query generation prompt
        const promptId = process.env.CATAPULT_QUERY_PROMPT_ID;
        const promptCommand = new GetPromptCommand({
            promptIdentifier: promptId
        });
        
        const promptResponse = await bedrockAgent.send(promptCommand);
        const promptData = promptResponse;
        
        // Prepare the payload for Bedrock
        const modelId = promptData.variants[0].modelId;
        const userMessageTemplate = promptData.variants[0].templateConfiguration.chat.messages[0].content[0].text;
        const systemInstructions = promptData.variants[0].templateConfiguration.chat.system[0].text;

        const filledUserMessage = userMessageTemplate
            .replace('{{CustomerName}}', customerName || 'Not specified')
            .replace('{{region}}', region || 'Not specified')
            .replace('{{closeDate}}', closeDate || 'Not specified')
            .replace('{{oppName}}', opportunityName || 'Not specified')
            .replace('{{oppDescription}}', description || 'Not specified');

        const payload = {
            modelId: modelId,
            system: [{ text: systemInstructions }],
            messages: [
                {
                    role: "user",
                    content: [{ text: filledUserMessage }]
                }
            ],
            inferenceConfig: {
                maxTokens: 5120,
                temperature: 0.0
            }
        };

        // Invoke Bedrock
        const converseCommand = new ConverseCommand(payload);
        const response = await bedrockRuntime.send(converseCommand);
        
        // Process the response
        const messageContent = response.output.message.content[0].text;
        const parsedQuery = JSON.parse(messageContent);
        
        return {
            statusCode: 200,
            body: {
                sqlQuery: parsedQuery.sql_query,
                success: true
            }
        };
        
    } catch (error) {
        console.error('Error generating opportunity query:', error);
        throw error;
    }
}