/**
 * Lambda function for Bedrock Agent Data Analysis Action Group
 * Handles opportunity data analysis and prediction generation
 */

const { bedrockAgent, bedrockRuntime, lambda } = require('../config/aws-config-v3');
const { GetPromptCommand } = require('@aws-sdk/client-bedrock-agent');
const { ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
const { InvokeCommand } = require('@aws-sdk/client-lambda');

exports.handler = async (event) => {
    console.log('Data Analysis Action Group invoked:', JSON.stringify(event, null, 2));
    
    try {
        const { function: functionName, parameters } = event;
        
        switch (functionName) {
            case 'analyzeOpportunityData':
                return await analyzeOpportunityData(parameters);
            default:
                throw new Error(`Unknown function: ${functionName}`);
        }
    } catch (error) {
        console.error('Error in data analysis action group:', error);
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
 * Analyze opportunity data and generate predictions
 */
async function analyzeOpportunityData(parameters) {
    try {
        const { opportunityDetails, historicalData, analysisType = 'standard' } = parameters;
        
        // First, execute the SQL query to get historical data if not provided
        let processedHistoricalData = historicalData;
        if (!processedHistoricalData && opportunityDetails.sqlQuery) {
            processedHistoricalData = await executeDataQuery(opportunityDetails.sqlQuery);
        }
        
        // Get the appropriate analysis prompt
        const promptId = analysisType === 'nova-premier' 
            ? process.env.CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID
            : process.env.CATAPULT_ANALYSIS_PROMPT_ID;
            
        const promptCommand = new GetPromptCommand({
            promptIdentifier: promptId,
            promptVersion: promptId === process.env.CATAPULT_ANALYSIS_PROMPT_ID ? "$LATEST" : undefined
        });
        
        const promptResponse = await bedrockAgent.send(promptCommand);
        const promptData = promptResponse;
        
        // Prepare the analysis payload
        const modelId = promptData.variants[0].modelId;
        const userMessageTemplate = promptData.variants[0].templateConfiguration.chat.messages[0].content[0].text;
        const systemInstructions = promptData.variants[0].templateConfiguration.chat.system[0].text;

        // Process historical data for analysis
        const processedData = processHistoricalData(processedHistoricalData);
        
        const filledUserMessage = userMessageTemplate
            .replace('{{CustomerName}}', opportunityDetails.customerName || 'Not specified')
            .replace('{{region}}', opportunityDetails.region || 'Not specified')
            .replace('{{closeDate}}', opportunityDetails.closeDate || 'Not specified')
            .replace('{{oppName}}', opportunityDetails.opportunityName || 'Not specified')
            .replace('{{oppDescription}}', opportunityDetails.description || 'Not specified')
            .replace('{{queryResults}}', JSON.stringify(processedData, null, 2));

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
                maxTokens: 8192,
                temperature: 0.1
            }
        };

        // Invoke Bedrock for analysis
        const converseCommand = new ConverseCommand(payload);
        const response = await bedrockRuntime.send(converseCommand);
        
        // Process the analysis results
        const analysisResults = processAnalysisResponse(response);
        
        return {
            statusCode: 200,
            body: {
                analysis: analysisResults,
                success: true
            }
        };
        
    } catch (error) {
        console.error('Error analyzing opportunity data:', error);
        throw error;
    }
}

/**
 * Execute SQL query via Lambda to get historical data
 */
async function executeDataQuery(sqlQuery) {
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
        console.error('Error executing data query:', error);
        throw error;
    }
}

/**
 * Process historical data for analysis
 */
function processHistoricalData(historicalData) {
    if (!Array.isArray(historicalData)) {
        return [];
    }
    
    return historicalData.map(project => {
        // Handle various date formats
        const processedProject = { ...project };
        
        if (project.close_date) {
            processedProject.historical_opportunity_won_date = convertDateFormat(project.close_date);
        }
        
        // Ensure numeric fields are properly formatted
        if (project.total_arr) {
            processedProject.total_arr = parseFloat(project.total_arr) || 0;
        }
        
        if (project.total_mrr) {
            processedProject.total_mrr = parseFloat(project.total_mrr) || 0;
        }
        
        return processedProject;
    });
}

/**
 * Convert various date formats to standard format
 */
function convertDateFormat(dateValue) {
    if (!dateValue) return null;
    
    try {
        // Handle nanoseconds (19 digits)
        if (typeof dateValue === 'number' && dateValue.toString().length >= 19) {
            return new Date(dateValue / 1000000).toISOString().split('T')[0];
        }
        
        // Handle milliseconds (13 digits)
        if (typeof dateValue === 'number' && dateValue.toString().length >= 13) {
            return new Date(dateValue).toISOString().split('T')[0];
        }
        
        // Handle seconds (10 digits)
        if (typeof dateValue === 'number' && dateValue.toString().length >= 10) {
            return new Date(dateValue * 1000).toISOString().split('T')[0];
        }
        
        // Handle string dates
        if (typeof dateValue === 'string') {
            return new Date(dateValue).toISOString().split('T')[0];
        }
        
        return dateValue;
    } catch (error) {
        console.warn('Error converting date:', dateValue, error);
        return dateValue;
    }
}

/**
 * Process analysis response from Bedrock
 */
function processAnalysisResponse(response) {
    try {
        const messageContent = response.output.message.content[0].text;
        
        // Parse the structured analysis response
        const analysisData = JSON.parse(messageContent);
        
        return {
            metrics: {
                predictedArr: analysisData.predicted_arr || 'Not determined',
                predictedMrr: analysisData.predicted_mrr || 'Not determined',
                launchDate: analysisData.launch_date || 'Not determined',
                timeToLaunch: analysisData.time_to_launch || 'Not determined',
                confidence: analysisData.confidence || 'MEDIUM',
                topServices: analysisData.top_services || 'Not determined'
            },
            sections: {
                methodology: analysisData.methodology || '',
                similarProjects: analysisData.similar_projects || '',
                findings: analysisData.findings || '',
                rationale: analysisData.rationale || '',
                riskFactors: analysisData.risk_factors || '',
                summary: analysisData.summary || ''
            },
            architecture: analysisData.architecture || {},
            validation: analysisData.validation || {}
        };
    } catch (error) {
        console.error('Error processing analysis response:', error);
        // Return the raw response if parsing fails
        return {
            rawResponse: response.output.message.content[0].text,
            error: 'Failed to parse structured analysis response'
        };
    }
}