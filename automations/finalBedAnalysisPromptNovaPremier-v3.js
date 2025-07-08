/**
 * Automation: finalBedAnalysisPromptNovaPremier (AWS SDK v3 version)
 * Purpose: Orchestrates opportunity analysis using a fetched Bedrock Prompt Resource with Nova Premier model
 */

const { bedrockAgent, bedrockRuntime, config } = require('../config/aws-config-v3');
const { GetPromptCommand } = require('@aws-sdk/client-bedrock-agent');
const { ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

// Configuration
const PROMPT_ID = config.promptIds.analysisPromptNovaPremier;

/**
 * Main automation function
 */
exports.execute = async (params) => {
  try {
    console.log('Starting finalBedAnalysisPromptNovaPremier with params:', JSON.stringify(params));
    
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
    console.error('Error in finalBedAnalysisPromptNovaPremier:', error);
    return {
      status: 'error',
      message: `Error in finalBedAnalysisPromptNovaPremier: ${error.message}`,
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
 * Truncate query results to fit within model limits while preserving most relevant data
 */
function truncateQueryResults(queryResults, maxLength = 200000) {
  try {
    // Convert to string if needed
    const queryString = typeof queryResults === 'string' ? queryResults : JSON.stringify(queryResults);
    
    // Return as-is if already small enough
    if (queryString.length <= maxLength) {
      return queryString;
    }
    
    console.log(`PROCESS_RESULTS (Analysis Nova Premier): Truncating query results from ${queryString.length} to ~${maxLength} characters`);
    
    // Simple truncation - more reliable and faster
    const truncated = queryString.substring(0, maxLength);
    console.log(`PROCESS_RESULTS (Analysis Nova Premier): Truncation applied: ${truncated.length} characters`);
    return truncated;
    
  } catch (error) {
    console.error("PROCESS_RESULTS (Analysis Nova Premier): Error truncating query results:", error);
    // Fallback to simple string conversion and truncation
    const fallback = String(queryResults).substring(0, maxLength);
    return fallback;
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

    // Format and truncate query results for the template
    const rawQueryResults = typeof params.queryResults === 'string' 
      ? params.queryResults 
      : JSON.stringify(params.queryResults);
    
    // Truncate query results to prevent model input limits
    const queryResults = truncateQueryResults(rawQueryResults);

    console.log("PROCESS_RESULTS (Analysis Nova Premier): Raw query results length:", rawQueryResults.length);
    console.log("PROCESS_RESULTS (Analysis Nova Premier): Truncated query results length:", queryResults.length);

    // Create enhanced payload with both template and actual data
    const enhancedUserMessage = `
<opp_details>
New Opportunity Information:
- Customer Name: ${params.CustomerName || 'Not specified'}
- Region: ${params.region || 'Not specified'}
- Close Date: ${params.closeDate || 'Not specified'}
- Opportunity Name: ${params.oppName || 'Not specified'}
- Description: ${params.oppDescription || 'Not specified'}
- Industry: ${params.industry || 'Not specified'}
- Customer Segment: ${params.customerSegment || 'Not specified'}
- Partner Name: ${params.partnerName || 'Not specified'}
- Activity Focus: ${params.activityFocus || 'Not specified'}
- Business Description: ${params.businessDescription || 'Not specified'}
- Migration Phase: ${params.migrationPhase || 'Not specified'}
</opp_details>

<project_data>
Historical Project Dataset:
${queryResults}
</project_data>

${userMessageTemplate
  .replace('{{CustomerName}}', params.CustomerName || 'Not specified')
  .replace('{{region}}', params.region || 'Not specified')
  .replace('{{closeDate}}', params.closeDate || 'Not specified')
  .replace('{{oppName}}', params.oppName || 'Not specified')
  .replace('{{oppDescription}}', params.oppDescription || 'Not specified')
  .replace('{{queryResults}}', queryResults)}`;

    // Check final message size and truncate further if needed
    const maxTotalSize = 300000; // Conservative limit for Nova Premier
    let finalUserMessage = enhancedUserMessage;
    
    if (finalUserMessage.length > maxTotalSize) {
      console.log(`PROCESS_RESULTS (Analysis Nova Premier): Final message too large (${finalUserMessage.length}), applying additional truncation`);
      
      // Further truncate query results if needed
      const oppDetailsSize = enhancedUserMessage.indexOf('<project_data>');
      const templateSize = userMessageTemplate.length;
      const availableForData = maxTotalSize - oppDetailsSize - templateSize - 1000; // Buffer
      
      const furtherTruncatedResults = truncateQueryResults(queryResults, Math.max(50000, availableForData));
      
      finalUserMessage = `
<opp_details>
New Opportunity Information:
- Customer Name: ${params.CustomerName || 'Not specified'}
- Region: ${params.region || 'Not specified'}
- Close Date: ${params.closeDate || 'Not specified'}
- Opportunity Name: ${params.oppName || 'Not specified'}
- Description: ${params.oppDescription || 'Not specified'}
- Industry: ${params.industry || 'Not specified'}
- Customer Segment: ${params.customerSegment || 'Not specified'}
- Partner Name: ${params.partnerName || 'Not specified'}
- Activity Focus: ${params.activityFocus || 'Not specified'}
- Business Description: ${params.businessDescription || 'Not specified'}
- Migration Phase: ${params.migrationPhase || 'Not specified'}
</opp_details>

<project_data>
Historical Project Dataset:
${furtherTruncatedResults}
</project_data>

${userMessageTemplate
  .replace('{{CustomerName}}', params.CustomerName || 'Not specified')
  .replace('{{region}}', params.region || 'Not specified')
  .replace('{{closeDate}}', params.closeDate || 'Not specified')
  .replace('{{oppName}}', params.oppName || 'Not specified')
  .replace('{{oppDescription}}', params.oppDescription || 'Not specified')
  .replace('{{queryResults}}', furtherTruncatedResults)}`;
    }

    console.log("PROCESS_RESULTS (Analysis Nova Premier): Final message length:", finalUserMessage.length);

    return {
      modelId: modelId,
      system: [{ text: systemInstructions }],
      messages: [
        {
          role: "user",
          content: [{ text: finalUserMessage }]
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
  console.log("PROCESS_RESULTS (Analysis Nova Premier): Starting. Input response object (first 1000 chars):", JSON.stringify(response, null, 2).substring(0,1000));
  
  if (!response || !response.output || !response.output.message || !response.output.message.content || !response.output.message.content[0] || !response.output.message.content[0].text) {
    console.error("PROCESS_RESULTS (Analysis Nova Premier): Invalid or incomplete Bedrock Converse API response structure. Full response:", JSON.stringify(response, null, 2));
    throw new Error("Invalid or incomplete Bedrock Converse API response structure for analysis.");
  }
  
  const messageContentText = response.output.message.content[0].text;
  console.log("PROCESS_RESULTS (Analysis Nova Premier): Extracted message content (first 1000 chars):", messageContentText.substring(0, 1000));
  
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
    console.error("PROCESS_RESULTS (Analysis Nova Premier): Error processing analysis response:", error.message);
    throw new Error(`Failed to process analysis response: ${error.message}`);
  }
}