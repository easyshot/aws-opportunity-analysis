/**
 * Automation: invokeBedrockQueryPrompt (AWS SDK v3 version)
 * Purpose: Orchestrates SQL query generation using a fetched Bedrock Prompt Resource
 */

const { bedrockAgent, bedrockRuntime, config } = require('../config/aws-config-v3');
const { GetPromptCommand } = require('@aws-sdk/client-bedrock-agent');
const { ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

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
    const processedResults = processConverseApiResponse(converseResponse, params);

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

    const filledUserMessage = userMessageTemplate
      .replace('{{CustomerName}}', params.CustomerName || 'Not specified')
      .replace('{{region}}', params.region || 'Not specified')
      .replace('{{closeDate}}', params.closeDate || 'Not specified')
      .replace('{{oppName}}', params.oppName || 'Not specified')
      .replace('{{oppDescription}}', params.oppDescription || 'Not specified')
      .replace('{{queryLimit}}', params.settings?.sqlQueryLimit || '200')
      .replace('{{industry}}', params.industry || 'Not specified')
      .replace('{{customerSegment}}', params.customerSegment || 'Not specified')
      .replace('{{partnerName}}', params.partnerName || 'Not specified')
      .replace('{{activityFocus}}', params.activityFocus || 'Not specified')
      .replace('{{businessDescription}}', params.businessDescription || 'Not specified')
      .replace('{{migrationPhase}}', params.migrationPhase || 'Not specified');

    // Debug: Show what's being sent to Bedrock for SQL generation
    console.log("\n" + "=".repeat(60));
    console.log("🤖 BEDROCK SQL QUERY GENERATION PAYLOAD");
    console.log("=".repeat(60));
    console.log("📋 MODEL CONFIGURATION:");
    console.log("   Model ID:", modelId);
    console.log("   Max Tokens: 4096");
    console.log("   Temperature: 0.0");
    console.log("   Purpose: SQL Query Generation");
    console.log("\n📝 PROMPT CONFIGURATION:");
    console.log("   Prompt ID:", PROMPT_ID);
    console.log("   System Instructions Length:", systemInstructions.length, "characters");
    console.log("   User Template Length:", userMessageTemplate.length, "characters");
    console.log("\n📊 INPUT PARAMETERS:");
    console.log("   Customer Name:", params.CustomerName || 'Not specified');
    console.log("   Region:", params.region || 'Not specified');
    console.log("   Close Date:", params.closeDate || 'Not specified');
    console.log("   Opportunity Name:", params.oppName || 'Not specified');
    console.log("   Description Length:", (params.oppDescription || '').length, "characters");
    console.log("\n🔧 COMPLETE BEDROCK PAYLOAD:");
    console.log(JSON.stringify({
      modelId: modelId,
      system: [{ text: systemInstructions.substring(0, 200) + "..." }],
      messages: [{ role: "user", content: [{ text: filledUserMessage.substring(0, 500) + "..." }] }],
      inferenceConfig: { maxTokens: 4096, temperature: 0.0 }
    }, null, 2));
    console.log("=".repeat(60) + "\n");

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
        maxTokens: 5120,
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
    const command = new ConverseCommand(payload);
    const response = await bedrockRuntime.send(command);
    return response;
  } catch (error) {
    console.error('Error invoking Bedrock Converse API:', error);
    throw new Error(`Failed to invoke Bedrock Converse API: ${error.message}`);
  }
}

/**
 * Apply row limit to SQL query
 */
function applyRowLimit(sqlQuery, limit) {
  try {
    // Remove existing LIMIT clause if present (handles both numeric limits and template variables)
    let modifiedQuery = sqlQuery.replace(/\s+LIMIT\s+(\d+|{{[^}]+}})\s*$/i, '');
    
    // Also remove any duplicate LIMIT clauses that might exist
    modifiedQuery = modifiedQuery.replace(/\s+LIMIT\s+(\d+|{{[^}]+}})/gi, '');
    
    // Add new LIMIT clause
    modifiedQuery = modifiedQuery.trim() + ` LIMIT ${limit}`;
    
    console.log("PROCESS_RESULTS (SQL Query): Applied row limit:", limit);
    console.log("PROCESS_RESULTS (SQL Query): Original query had LIMIT:", sqlQuery.includes('LIMIT'));
    console.log("PROCESS_RESULTS (SQL Query): Modified query (last 200 chars):", modifiedQuery.slice(-200));
    
    return modifiedQuery;
  } catch (error) {
    console.error("PROCESS_RESULTS (SQL Query): Error applying row limit:", error.message);
    return sqlQuery; // Return original query if modification fails
  }
}

/**
 * Process Converse API response
 */
function processConverseApiResponse(response, params = {}) {
  console.log("PROCESS_RESULTS (SQL Query): Starting. Input response object (first 1000 chars):", JSON.stringify(response, null, 2).substring(0, 1000));

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
      console.log("PROCESS_RESULTS (SQL Query): SQL Query Details - Length:", parsedJson.sql_query.length, "Contains WHERE clauses:", parsedJson.sql_query.includes('WHERE'));

      // Apply row limit if specified in settings
      let finalQuery = parsedJson.sql_query;
      const rowLimit = params.settings?.sqlQueryLimit;
      if (rowLimit && typeof rowLimit === 'number' && rowLimit > 0) {
        console.log("PROCESS_RESULTS (SQL Query): Applying row limit from settings:", rowLimit);
        finalQuery = applyRowLimit(parsedJson.sql_query, rowLimit);
      } else {
        console.log("PROCESS_RESULTS (SQL Query): No row limit specified or invalid limit:", rowLimit);
      }

      // Store the SQL query for debug purposes
      if (!global.debugInfo) global.debugInfo = {};
      global.debugInfo.sqlQuery = finalQuery;

      return JSON.stringify({ sql_query: finalQuery });
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
          
          // Apply row limit to fallback query as well
          let finalQuery = embeddedParsedJson.sql_query;
          const rowLimit = params.settings?.sqlQueryLimit;
          if (rowLimit && typeof rowLimit === 'number' && rowLimit > 0) {
            console.log("PROCESS_RESULTS (SQL Query): Applying row limit to fallback query:", rowLimit);
            finalQuery = applyRowLimit(embeddedParsedJson.sql_query, rowLimit);
          }
          
          return JSON.stringify({ sql_query: finalQuery });
        }
      } catch (fallbackError) {
        console.error("PROCESS_RESULTS (SQL Query): Fallback parsing also failed. Error:", fallbackError.message);
      }
    }

    throw new Error("Failed to extract a valid SQL query from the LLM's response. Response was not the expected clean JSON object: " + messageContentText.substring(0, 200) + "...");
  }
}