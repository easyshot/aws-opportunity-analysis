/**
 * Automation: invokeBedrockQueryPrompt
 * Purpose: Orchestrates SQL query generation using a fetched Bedrock Prompt Resource
 */

const { bedrock, bedrockRuntime, config } = require('../config/aws-config');

// Configuration
const PROMPT_ID = config.promptIds.queryPrompt;

/**
 * Main automation function
 */
exports.execute = async (params) => {
  try {
    console.log('Starting invokeBedrockQueryPrompt with params:', JSON.stringify(params));
    
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
      processResults: processedResults
    };
  } catch (error) {
    console.error('Error in invokeBedrockQueryPrompt:', error);
    return {
      status: 'error',
      message: `Error in invokeBedrockQueryPrompt: ${error.message}`,
      processResults: JSON.stringify({ sql_query: "SELECT 'Error generating query'" })
    };
  }
};

/**
 * Fetch the Bedrock Prompt resource
 */
async function fetchPrompt(promptId) {
  try {
    const response = await bedrock.getPrompt({
      promptIdentifier: promptId
    }).promise();
    
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

    const filledUserMessage = userMessageTemplate
      .replace('{{CustomerName}}', params.CustomerName || 'Not specified')
      .replace('{{region}}', params.region || 'Not specified')
      .replace('{{closeDate}}', params.closeDate || 'Not specified')
      .replace('{{oppName}}', params.oppName || 'Not specified')
      .replace('{{oppDescription}}', params.oppDescription || 'Not specified');

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
        temperature: 0.0
      }
    };
  } catch (error) {
    console.error('Critical error in preparePayload:', error.message, error.stack);
    throw new Error('Failed to prepare Bedrock payload for SQL query: ' + error.message);
  }
}

/**
 * Invoke Bedrock Converse API
 */
async function invokeBedrockConverse(payload) {
  try {
    const response = await bedrockRuntime.converse(payload).promise();
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
  console.log("PROCESS_RESULTS (SQL Query): Starting. Input response object (first 1000 chars):", JSON.stringify(response, null, 2).substring(0,1000));
  
  if (!response || !response.output || !response.output.message || !response.output.message.content || !response.output.message.content[0] || !response.output.message.content[0].text) {
    console.error("PROCESS_RESULTS (SQL Query): Invalid or incomplete Bedrock Converse API response structure. Full response:", JSON.stringify(response, null, 2));
    throw new Error("Invalid or incomplete Bedrock Converse API response structure for SQL query generation.");
  }
  
  const messageContentText = response.output.message.content[0].text;
  console.log("PROCESS_RESULTS (SQL Query): Extracted message content (should be a JSON string):", messageContentText);
  
  try {
    const parsedJson = JSON.parse(messageContentText);
    if (parsedJson && typeof parsedJson.sql_query === 'string') {
      console.log("PROCESS_RESULTS (SQL Query): Successfully extracted SQL query from JSON within message content:", parsedJson.sql_query);
      return JSON.stringify(parsedJson);
    } else {
      console.error("PROCESS_RESULTS (SQL Query): Parsed JSON does not contain a 'sql_query' string property. Parsed JSON:", JSON.stringify(parsedJson, null, 2));
      throw new Error("Parsed JSON from LLM response does not contain a 'sql_query' string property.");
    }
  } catch (error) {
    console.error("PROCESS_RESULTS (SQL Query): Error parsing message content as JSON or extracting sql_query. Error:", error.message, ". Message content was:", messageContentText);
    
    const jsonMatch = messageContentText.match(/{\s*"sql_query"\s*:/);
    if (jsonMatch && jsonMatch[0]) {
      try {
        const embeddedParsedJson = JSON.parse(jsonMatch[0]);
        if (embeddedParsedJson && typeof embeddedParsedJson.sql_query === 'string') {
          console.warn("PROCESS_RESULTS (SQL Query): Fallback - Successfully extracted SQL query from JSON embedded in text:", embeddedParsedJson.sql_query);
          return JSON.stringify(embeddedParsedJson);
        }
      } catch (fallbackError) {
        console.error("PROCESS_RESULTS (SQL Query): Fallback parsing also failed. Error:", fallbackError.message);
      }
    }
    
    throw new Error("Failed to extract a valid SQL query from the LLM's response. Response was not the expected clean JSON object: " + messageContentText.substring(0, 200) + "...");
  }
}