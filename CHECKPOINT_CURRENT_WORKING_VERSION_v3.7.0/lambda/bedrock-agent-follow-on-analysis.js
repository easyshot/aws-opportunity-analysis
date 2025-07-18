/**
 * Lambda function for Bedrock Agent Follow-on Analysis Action Group
 * Handles identification of follow-on opportunities
 */

const { bedrockAgent, bedrockRuntime, lambda } = require('./layers/shared-utilities/nodejs/aws-clients');
const { 
    createErrorResponse, 
    createSuccessResponse,
    retryWithBackoff
} = require('./layers/shared-utilities/nodejs/utils');
const { GetPromptCommand } = require('@aws-sdk/client-bedrock-agent');
const { ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
const { InvokeCommand } = require('@aws-sdk/client-lambda');

exports.handler = async (event) => {
    console.log('Follow-on Analysis Action Group invoked:', JSON.stringify(event, null, 2));
    
    try {
        const { function: functionName, parameters } = event;
        
        switch (functionName) {
            case 'identifyFollowOnOpportunities':
                return await identifyFollowOnOpportunities(parameters);
            default:
                throw new Error(`Unknown function: ${functionName}`);
        }
    } catch (error) {
        console.error('Error in follow-on analysis action group:', error);
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
 * Identify potential follow-on opportunities
 */
async function identifyFollowOnOpportunities(parameters) {
    try {
        const { opportunityDetails, analysisResults } = parameters;
        
        // Step 1: Generate SQL query for follow-on opportunities
        const followOnQuery = await generateFollowOnQuery(opportunityDetails);
        
        // Step 2: Execute the query to get historical follow-on data
        const historicalData = await executeFollowOnQuery(followOnQuery);
        
        // Step 3: Analyze the data to identify follow-on opportunities
        const followOnAnalysis = await analyzeFollowOnData(opportunityDetails, analysisResults, historicalData);
        
        return {
            statusCode: 200,
            body: {
                followOnAnalysis: followOnAnalysis,
                query: followOnQuery,
                historicalData: historicalData,
                success: true
            }
        };
        
    } catch (error) {
        console.error('Error identifying follow-on opportunities:', error);
        throw error;
    }
}

/**
 * Generate SQL query for follow-on opportunities
 */
async function generateFollowOnQuery(opportunityDetails) {
    try {
        const queryPrompt = `Generate a SQL query to find follow-on opportunities for this customer:

Customer: ${opportunityDetails.customerName || 'Not specified'}
Region: ${opportunityDetails.region || 'Not specified'}
Current Opportunity: ${opportunityDetails.opportunityName || 'Not specified'}

The query should find:
1. Other opportunities with the same customer in the catapult_db_p database
2. Similar customers in the same region who had multiple projects
3. Customers with similar project types who expanded their AWS usage

Focus on identifying patterns that suggest follow-on opportunities like:
- Multiple projects from the same customer
- Expansion projects after initial migrations
- Additional services adopted after initial implementation

Return only a JSON object with the sql_query property containing the SQL query.

Database schema context:
- Table: catapult_db_p (contains historical project data)
- Key columns: customer_name, region, opportunity_name, close_date, description, top_services, total_arr, total_mrr`;

        const payload = {
            modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
            messages: [
                {
                    role: "user",
                    content: [{ text: queryPrompt }]
                }
            ],
            inferenceConfig: {
                maxTokens: 2048,
                temperature: 0.0
            }
        };

        const converseCommand = new ConverseCommand(payload);
        const response = await bedrockRuntime.send(converseCommand);
        
        const messageContent = response.output.message.content[0].text;
        const parsedQuery = JSON.parse(messageContent);
        
        return parsedQuery.sql_query;
        
    } catch (error) {
        console.error('Error generating follow-on query:', error);
        throw error;
    }
}

/**
 * Execute follow-on query via Lambda
 */
async function executeFollowOnQuery(sqlQuery) {
    try {
        const lambdaPayload = {
            sql_query: sqlQuery
        };
        
        const command = new InvokeCommand({
            FunctionName: process.env.CATAPULT_GET_DATASET_LAMBDA,
            Payload: JSON.stringify(lambdaPayload)
        });
        
        const response = await lambda.send(command);
        const result = JSON.parse(new TextDecoder().decode(response.Payload));
        
        return result.data || [];
    } catch (error) {
        console.error('Error executing follow-on query:', error);
        throw error;
    }
}

/**
 * Analyze follow-on data to identify opportunities
 */
async function analyzeFollowOnData(opportunityDetails, analysisResults, historicalData) {
    try {
        const analysisPrompt = `Analyze this data to identify follow-on opportunities:

CURRENT OPPORTUNITY:
Customer: ${opportunityDetails.customerName || 'Not specified'}
Region: ${opportunityDetails.region || 'Not specified'}
Opportunity: ${opportunityDetails.opportunityName || 'Not specified'}
Description: ${opportunityDetails.description || 'Not specified'}

CURRENT ANALYSIS RESULTS:
${JSON.stringify(analysisResults, null, 2)}

HISTORICAL FOLLOW-ON DATA:
${JSON.stringify(historicalData, null, 2)}

Based on this data, provide a comprehensive follow-on opportunity analysis including:

1. **Follow-on Opportunity Insights**
   - Patterns identified from similar customers
   - Common follow-on services and solutions
   - Typical timeline for follow-on engagements

2. **Recommended Next Opportunities**
   - Specific follow-on opportunities to pursue
   - Estimated ARR/MRR for each opportunity
   - Priority ranking of opportunities

3. **Next Steps and Timeline**
   - Recommended approach for each opportunity
   - Optimal timing for follow-on discussions
   - Key stakeholders to engage

4. **Additional Services Recommendations**
   - Services that complement the current opportunity
   - Advanced capabilities to introduce later
   - Migration and modernization next steps

5. **Revenue Expansion Potential**
   - Total addressable market with this customer
   - Multi-year revenue projection
   - Expansion strategy recommendations

6. **Summary Metrics**
   - Number of potential follow-on opportunities
   - Estimated total follow-on ARR
   - Confidence level for each opportunity

Please provide specific, actionable recommendations based on the historical patterns.`;

        const payload = {
            modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
            messages: [
                {
                    role: "user",
                    content: [{ text: analysisPrompt }]
                }
            ],
            inferenceConfig: {
                maxTokens: 6144,
                temperature: 0.1
            }
        };

        const converseCommand = new ConverseCommand(payload);
        const response = await bedrockRuntime.send(converseCommand);
        
        return response.output.message.content[0].text;
        
    } catch (error) {
        console.error('Error analyzing follow-on data:', error);
        throw error;
    }
}