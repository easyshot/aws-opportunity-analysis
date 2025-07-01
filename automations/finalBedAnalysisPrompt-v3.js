/**
 * Automation: finalBedAnalysisPrompt (AWS SDK v3 version)
 * Purpose: Orchestrates opportunity analysis using a fetched Bedrock Prompt Resource
 */

const { bedrockAgent, bedrockRuntime, config } = require('../config/aws-config-v3');
const { GetPromptCommand } = require('@aws-sdk/client-bedrock-agent');
const { ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

// Configuration
const PROMPT_ID = config.promptIds.analysisPrompt;

/**
 * Main automation function
 */
exports.execute = async (params) => {
  try {
    console.log('Starting finalBedAnalysisPrompt with params:', JSON.stringify(params));
    
    // Step 1: Fetch the Bedrock Prompt resource
    const promptData = await fetchPrompt(PROMPT_ID);
    
    // Step 2: Prepare payload for Bedrock Converse API
    const payload = preparePayload(params, promptData);
    
    // Step 3: Invoke Bedrock Converse API
    const converseResponse = await invokeBedrockConverse(payload);
    
    // Step 4: Process results
    const processedResults = processConverseApiResponse(converseResponse);
    
    return {
      status: 'success',
      ...processedResults
    };
  } catch (error) {
    console.error('Error in finalBedAnalysisPrompt:', error);
    return {
      status: 'error',
      message: `Error in finalBedAnalysisPrompt: ${error.message}`,
      metrics: {
        predictedArr: "Error",
        predictedMrr: "Error",
        launchDate: "Error",
        predictedProjectDuration: "Error",
        confidence: "ERROR",
        topServices: "Error generating analysis"
      },
      sections: {
        similarProjectsRaw: "Error generating analysis"
      },
      formattedSummaryText: `Error generating analysis: ${error.message}`
    };
  }
};

/**
 * Fetch the Bedrock Prompt resource
 */
async function fetchPrompt(promptId) {
  try {
    const command = new GetPromptCommand({
      promptIdentifier: promptId
    });
    
    const response = await bedrockAgent.send(command);
    return response;
  } catch (error) {
    console.error('Error fetching Bedrock prompt:', error);
    throw new Error(`Failed to fetch Bedrock prompt: ${error.message}`);
  }
}

/**
 * Prepare payload for Bedrock Converse API
 */
function preparePayload(params, promptData) {
  try {
    const modelId = promptData.variants[0].modelId;
    const userMessageTemplate = promptData.variants[0].templateConfiguration.chat.messages[0].content[0].text;
    const systemInstructions = promptData.variants[0].templateConfiguration.chat.system[0].text;

    // Format query results for the template
    const queryResults = typeof params.queryResults === 'string' 
      ? params.queryResults 
      : JSON.stringify(params.queryResults);

    const filledUserMessage = userMessageTemplate
      .replace('{{CustomerName}}', params.CustomerName || 'Not specified')
      .replace('{{region}}', params.region || 'Not specified')
      .replace('{{closeDate}}', params.closeDate || 'Not specified')
      .replace('{{oppName}}', params.oppName || 'Not specified')
      .replace('{{oppDescription}}', params.oppDescription || 'Not specified')
      .replace('{{queryResults}}', queryResults);

    return {
      modelId: modelId,
      system: [{ text: systemInstructions }],
      messages: [
        {
          role: "user",
          content: [{ text: filledUserMessage }]
        }
      ],
      inferenceConfig: {
        maxTokens: 4096,
        temperature: 0.1
      }
    };
  } catch (error) {
    console.error('Critical error in preparePayload:', error.message, error.stack);
    throw new Error('Failed to prepare Bedrock payload for analysis: ' + error.message);
  }
}

/**
 * Invoke Bedrock Converse API
 */
async function invokeBedrockConverse(payload) {
  try {
    const command = new ConverseCommand(payload);
    const response = await bedrockRuntime.send(command);
    return response;
  } catch (error) {
    console.error('Error invoking Bedrock Converse API:', error);
    throw new Error(`Failed to invoke Bedrock Converse API: ${error.message}`);
  }
}

/**
 * Process Converse API response
 */
function processConverseApiResponse(response) {
  console.log("PROCESS_RESULTS (Analysis): Starting. Input response object (first 1000 chars):", JSON.stringify(response, null, 2).substring(0,1000));
  
  if (!response || !response.output || !response.output.message || !response.output.message.content || !response.output.message.content[0] || !response.output.message.content[0].text) {
    console.error("PROCESS_RESULTS (Analysis): Invalid or incomplete Bedrock Converse API response structure. Full response:", JSON.stringify(response, null, 2));
    throw new Error("Invalid or incomplete Bedrock Converse API response structure for analysis.");
  }
  
  const messageContentText = response.output.message.content[0].text;
  console.log("PROCESS_RESULTS (Analysis): Extracted message content (first 1000 chars):", messageContentText.substring(0, 1000));
  
  try {
    // Extract metrics section
    const metricsMatch = messageContentText.match(/===\s*METRICS\s*===\s*([\s\S]*?)(?===\s*|$)/i);
    const metricsText = metricsMatch ? metricsMatch[1].trim() : '';
    
    // Extract similar projects section
    const similarProjectsMatch = messageContentText.match(/===\s*SIMILAR\s*PROJECTS\s*===\s*([\s\S]*?)(?===\s*|$)/i);
    const similarProjectsText = similarProjectsMatch ? similarProjectsMatch[1].trim() : '';
    
    // Parse metrics
    const arrMatch = metricsText.match(/Predicted\s*ARR:\s*\$?([\d,]+)/i);
    const mrrMatch = metricsText.match(/Predicted\s*MRR:\s*\$?([\d,]+)/i);
    const launchDateMatch = metricsText.match(/Estimated\s*Launch\s*Date:\s*([^\n]+)/i);
    const durationMatch = metricsText.match(/Project\s*Duration:\s*([^\n]+)/i);
    const confidenceMatch = metricsText.match(/Confidence:\s*(HIGH|MEDIUM|LOW)/i);
    
    // Extract top services section
    const servicesMatch = metricsText.match(/Top\s*Services:\s*([\s\S]*?)(?=\n\s*\n|$)/i);
    const servicesText = servicesMatch ? servicesMatch[1].trim() : '';
    
    // Construct result object
    return {
      metrics: {
        predictedArr: arrMatch ? `$${arrMatch[1]}` : 'Not available',
        predictedMrr: mrrMatch ? `$${mrrMatch[1]}` : 'Not available',
        launchDate: launchDateMatch ? launchDateMatch[1].trim() : 'Not available',
        predictedProjectDuration: durationMatch ? durationMatch[1].trim() : 'Not available',
        confidence: confidenceMatch ? confidenceMatch[1].toUpperCase() : 'MEDIUM',
        topServices: servicesText || 'No services data available'
      },
      sections: {
        similarProjectsRaw: similarProjectsText || 'No similar projects found'
      },
      formattedSummaryText: messageContentText
    };
  } catch (error) {
    console.error("PROCESS_RESULTS (Analysis): Error processing analysis response:", error.message);
    throw new Error(`Failed to process analysis response: ${error.message}`);
  }
}