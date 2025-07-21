/**
 * Automation: finalBedAnalysisPrompt
 * Purpose: Orchestrates the final analysis generation using the "CatapultAnalysisPrompt" Bedrock prompt
 */

const { bedrock, bedrockRuntime, config } = require('../config/aws-config');

// Configuration
const PROMPT_ID = config.promptIds.analysisPrompt;

/**
 * Main automation function
 */
exports.execute = async (params) => {
  try {
    console.log('Starting finalBedAnalysisPrompt with params:', JSON.stringify(params, null, 2).substring(0, 1000) + '...');
    
    // Step 1: Fetch the Bedrock Prompt resource
    const promptData = await fetchPrompt(PROMPT_ID);
    
    // Step 2: Prepare payload for Bedrock Converse API
    const payload = prepareConverseApiPayload(params, promptData);
    
    // Step 3: Invoke Bedrock Converse API
    const converseResponse = await invokeBedrockConverse(payload);
    
    // Step 4: Process results
    const processedResults = processAnalysisResults(converseResponse, params);
    
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
        predictedArr: 'N/A',
        predictedMrr: 'N/A',
        launchDate: 'N/A',
        predictedProjectDuration: 'N/A',
        confidence: 'LOW',
        topServices: 'Error: Analysis failed'
      },
      sections: {
        similarProjectsRaw: '',
        detailedFindings: 'Error: Analysis failed'
      },
      formattedSummaryText: `Error in analysis: ${error.message}`
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
function prepareConverseApiPayload(params, fetchedPromptData) {
  let systemPromptText = "";
  let userPromptTemplateText = "";
  let modelId = "";
  
  if (fetchedPromptData && fetchedPromptData.variants && fetchedPromptData.variants[0]) {
    modelId = fetchedPromptData.variants[0].modelId;
    if (fetchedPromptData.variants[0].templateConfiguration && fetchedPromptData.variants[0].templateConfiguration.chat) {
      const chatConfig = fetchedPromptData.variants[0].templateConfiguration.chat;
      if (chatConfig.system && chatConfig.system[0] && chatConfig.system[0].text) {
        systemPromptText = chatConfig.system[0].text;
      }
      if (chatConfig.messages && chatConfig.messages[0] && chatConfig.messages[0].role === 'user' && chatConfig.messages[0].content && chatConfig.messages[0].content[0] && chatConfig.messages[0].content[0].text) {
        userPromptTemplateText = chatConfig.messages[0].content[0].text;
      }
    }
  }
  
  if (!modelId) { throw new Error("Model ID could not be extracted"); }
  if (!systemPromptText && !userPromptTemplateText) { console.warn("System or User prompt template missing"); }

  let processedUserPrompt = userPromptTemplateText;
  const closeDatePlaceholder = "{CloseDate_placeholder_for_rule_reference_only}";
  processedUserPrompt = processedUserPrompt.replace(new RegExp(closeDatePlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), params.closeDate || 'N/A');

  const newOppDetails = `<opp_details>\n` +
    `CustomerName: ${params.CustomerName || 'N/A'}\n` +
    `Region: ${params.region || 'N/A'}\n` +
    `CloseDate: ${params.closeDate || 'N/A'}\n` +
    `OppName: ${params.oppName || 'N/A'}\n` +
    `OppDescription: ${params.oppDescription || 'N/A'}\n` +
    `</opp_details>`;

  let historicalDataArrayForLlm = [];
  if (params.queryResults) {
    try {
      const parsedQueryResults = JSON.parse(params.queryResults);
      if (parsedQueryResults && Array.isArray(parsedQueryResults.data)) {
        historicalDataArrayForLlm = parsedQueryResults.data.map(project => {
          const projectForLlm = { ...project };
          let formattedWonDate = 'N/A';
          // This version of the script only handles 10-digit numeric timestamps for close_date
          if (projectForLlm.close_date && typeof projectForLlm.close_date === 'number' && String(projectForLlm.close_date).length === 10) {
            try {
              const dateObj = new Date(projectForLlm.close_date * 1000);
              const year = dateObj.getUTCFullYear();
              const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
              const day = String(dateObj.getUTCDate()).padStart(2, '0');
              formattedWonDate = `${year}-${month}-${day}`;
            } catch (e) { console.warn(`Error converting close_date ${projectForLlm.close_date}`); }
          } else if (projectForLlm.close_date) {
            console.warn(`Project ${projectForLlm.opportunity_name || projectForLlm.activity_name} has close_date '${projectForLlm.close_date}' not a 10-digit number. historical_opportunity_won_date will be 'N/A'.`);
          }
          projectForLlm.historical_opportunity_won_date = formattedWonDate;
          delete projectForLlm.close_date;
          return projectForLlm;
        });
      } else { console.warn("params.queryResults.data is not an array or is missing.");}
    } catch (e) { console.error("Error parsing queryResults or processing close_date:", e); }
  }
  
  const historicalDataStringForLlm = JSON.stringify(historicalDataArrayForLlm);
  const historicalDataForLlm = `<project_data>\n${historicalDataStringForLlm}\n</project_data>`;
  const userMessageContent = `${newOppDetails}\n\n${historicalDataForLlm}\n\n${processedUserPrompt}`;
  const messages = [{ role: "user", content: [{ text: userMessageContent }] }];
  
  let payload;
  if (systemPromptText && systemPromptText.trim() !== "") {
    payload = { modelId, messages, system: [{ text: systemPromptText }], inferenceConfig: { maxTokens: 10000, temperature: 0.0 } };
  } else {
    payload = { modelId, messages, inferenceConfig: { maxTokens: 10000, temperature: 0.0 } };
  }
  
  return payload;
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
 * Process analysis results
 */
function processAnalysisResults(converseResponse, params) {
  try {
    // Extract text from Bedrock response
    const text = converseResponse?.output?.message?.content?.[0]?.text;
    if (!text) {
      throw new Error("No text content found in Bedrock response");
    }
    
    // Extract sections from the text
    const sections = extractAllSections(text);
    
    // Extract metrics and architecture details
    const metrics = extractMetricsAndArchitecture(text);
    
    // Generate formatted summary
    const formattedSummary = generateFormattedSummary(sections);
    
    return {
      fullText: text,
      sections: sections,
      metrics: metrics,
      formattedSummaryText: formattedSummary
    };
  } catch (error) {
    console.error('Error processing analysis results:', error);
    throw new Error(`Failed to process analysis results: ${error.message}`);
  }
}

/**
 * Extract all sections from the LLM response
 */
function extractAllSections(text) {
  const sections = {
    analysisMethodology: 'N/A',
    similarProjectsRaw: '',
    detailedFindings: 'N/A',
    predictionRationale: 'N/A',
    riskFactors: 'N/A',
    architectureDescription: 'N/A',
    summaryMetrics: 'N/A',
    validationErrors: 'N/A'
  };
  
  if (!text) {
    console.warn("extractAllSections: No text provided.");
    return sections;
  }
  
  const sectionHeaders = [
    "ANALYSIS METHODOLOGY",
    "SIMILAR PROJECTS",
    "DETAILED FINDINGS",
    "PREDICTION RATIONALE",
    "RISK FACTORS",
    "ARCHITECTURE DESCRIPTION",
    "SUMMARY METRICS",
    "VALIDATION_ERRORS"
  ];
  
  const keyMap = {
    "ANALYSIS METHODOLOGY": "analysisMethodology",
    "SIMILAR PROJECTS": "similarProjectsRaw",
    "DETAILED FINDINGS": "detailedFindings",
    "PREDICTION RATIONALE": "predictionRationale",
    "RISK FACTORS": "riskFactors",
    "ARCHITECTURE DESCRIPTION": "architectureDescription",
    "SUMMARY METRICS": "summaryMetrics",
    "VALIDATION_ERRORS": "validationErrors"
  };
  
  for (let i = 0; i < sectionHeaders.length; i++) {
    const header = sectionHeaders[i];
    const escapedHeader = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s*');
    const nextHeaderPattern = (i + 1 < sectionHeaders.length) ? 
      `(?=\\s*===${sectionHeaders[i+1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s*')}===)` : 
      '($)';
    
    const regexPattern = new RegExp(`===${escapedHeader}===\\s*([\\s\\S]*?)${nextHeaderPattern}`, 'i');
    const match = text.match(regexPattern);
    
    if (match && match[1]) {
      sections[keyMap[header]] = match[1].trim();
    }
  }
  
  return sections;
}

/**
 * Extract metrics and architecture details
 */
function extractMetricsAndArchitecture(text) {
  const sections = extractAllSections(text);
  const metricsSectionText = sections.summaryMetrics || "";
  const archSectionText = sections.architectureDescription || "";
  
  // Extract architecture components
  const architectureObject = {
    networkFoundation: extractArchSection(archSectionText, 'NETWORK_FOUNDATION'),
    computeLayer: extractArchSection(archSectionText, 'COMPUTE_LAYER'),
    dataLayer: extractArchSection(archSectionText, 'DATA_LAYER'),
    securityComponents: extractArchSection(archSectionText, 'SECURITY_COMPONENTS'),
    integrationPoints: extractArchSection(archSectionText, 'INTEGRATION_POINTS'),
    scalingElements: extractArchSection(archSectionText, 'SCALING_ELEMENTS'),
    managementTools: extractArchSection(archSectionText, 'MANAGEMENT_TOOLS'),
    completeArchitecture: extractArchSection(archSectionText, 'COMPLETE_ARCHITECTURE')
  };
  
  // Extract metrics
  const metrics = {
    predictedArr: extractValue(metricsSectionText, /PREDICTED_ARR:\s*(\$[^\n<]+)/i, 'N/A'),
    predictedMrr: extractValue(metricsSectionText, /MRR:\s*(\$[^\n<]+)/i, 'N/A'),
    launchDate: formatLaunchDate(extractValue(metricsSectionText, /LAUNCH_DATE:\s*(\d{4}-\d{2})/i, 'N/A')),
    predictedProjectDuration: extractValue(metricsSectionText, /PREDICTED_PROJECT_DURATION:\s*([^\n]+)/i, 'N/A'),
    confidence: extractValue(metricsSectionText, /CONFIDENCE:\s*(HIGH|MEDIUM|LOW)/i, 'UNKNOWN'),
    topServices: processServiceLinesForDisplay(metricsSectionText),
    architecture: architectureObject,
    validationErrors: []
  };
  
  return metrics;
}

/**
 * Extract a specific architecture section
 */
function extractArchSection(archSectionText, sectionKeyName) {
  if (!archSectionText) return 'N/A';
  
  const upperSectionName = sectionKeyName.toUpperCase().replace(/ /g, '_');
  const regex = new RegExp(`(?:${upperSectionName}):\\s*([^\\n]+(?:\\n(?!NETWORK_FOUNDATION:|COMPUTE_LAYER:|DATA_LAYER:|SECURITY_COMPONENTS:|INTEGRATION_POINTS:|SCALING_ELEMENTS:|MANAGEMENT_TOOLS:|COMPLETE_ARCHITECTURE:)[^\\n]+)*)`, 'i');
  const match = archSectionText.match(regex);
  
  return match && match[1] ? match[1].trim() : 'N/A';
}

/**
 * Extract value using regex
 */
function extractValue(textBlock, regex, defaultValue = 'N/A') {
  if (!textBlock) return defaultValue;
  
  const match = textBlock.match(regex);
  const value = match && match[1] ? match[1].trim() : defaultValue;
  
  return (value === "" || value === null || value === undefined) ? defaultValue : value;
}

/**
 * Format launch date
 */
function formatLaunchDate(dateString) {
  if (!dateString || !/^\d{4}-\d{2}$/.test(dateString) || dateString.toLowerCase() === 'n/a') {
    return dateString || 'N/A';
  }
  
  const [year, month] = dateString.split('-');
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthIndex = parseInt(month, 10) - 1;
  
  if (monthIndex < 0 || monthIndex >= 12) {
    return dateString;
  }
  
  return `${months[monthIndex]} ${year}`;
}

/**
 * Process service lines for display
 */
function processServiceLinesForDisplay(serviceBlockText) {
  if (!serviceBlockText) {
    return 'Service information not available';
  }
  
  let servicesOutputList = [];
  const topServicesBlockMatch = serviceBlockText.match(/TOP_SERVICES:?\s*([^]*?)(?=OTHER_SERVICES:|CONFIDENCE:|LAUNCH_DATE:|PREDICTED_PROJECT_DURATION:|MRR:|PREDICTED_ARR:|===VALIDATION_ERRORS===|$)/i);
  
  if (topServicesBlockMatch && topServicesBlockMatch[1]) {
    const cleanedBlock = topServicesBlockMatch[1].trim();
    const lines = cleanedBlock.split('\n').map(line => line.trim()).filter(line => line);
    
    lines.forEach(line => {
      const parts = line.split('|');
      if (parts.length >= 2) {
        const serviceName = parts[0].trim();
        const monthlyCost = parts[1].trim();
        let upfrontCost = '';
        
        if (parts.length > 2) {
          upfrontCost = ` | ${parts[2].trim()}`;
        }
        
        servicesOutputList.push(`**${serviceName}** - ${monthlyCost}${upfrontCost}`);
      }
    });
  }
  
  // Check for OTHER_SERVICES
  const otherServicesMatch = serviceBlockText.match(/OTHER_SERVICES:\s*Combined\|?(\$?[^|\n]+)(?:\|(\$?[^|\n]+))?/i);
  if (otherServicesMatch) {
    let otherServiceString = `**Other Services (Combined)** - ${otherServicesMatch[1].trim()}`;
    if (otherServicesMatch[2]) {
      otherServiceString += ` | ${otherServicesMatch[2].trim()}`;
    }
    servicesOutputList.push(otherServiceString);
  }
  
  return servicesOutputList.length > 0 ? servicesOutputList.join('\n\n') : 'No service information parsed.';
}

/**
 * Generate formatted summary
 */
function generateFormattedSummary(sections) {
  let summary = "";
  
  if (sections.analysisMethodology && sections.analysisMethodology !== 'N/A') {
    summary += "=== ANALYSIS METHODOLOGY ===\n" + sections.analysisMethodology + "\n\n";
  }
  
  if (sections.detailedFindings && sections.detailedFindings !== 'N/A') {
    summary += "=== DETAILED FINDINGS ===\n" + sections.detailedFindings + "\n\n";
  }
  
  if (sections.predictionRationale && sections.predictionRationale !== 'N/A') {
    summary += "=== PREDICTION RATIONALE ===\n" + sections.predictionRationale + "\n\n";
  }
  
  if (sections.riskFactors && sections.riskFactors !== 'N/A') {
    summary += "=== RISK FACTORS ===\n" + sections.riskFactors + "\n\n";
  }
  
  if (sections.architectureDescription && sections.architectureDescription !== 'N/A') {
    let formattedArch = sections.architectureDescription;
    const archParts = ["NETWORK_FOUNDATION:", "COMPUTE_LAYER:", "DATA_LAYER:", "SECURITY_COMPONENTS:", "INTEGRATION_POINTS:", "SCALING_ELEMENTS:", "MANAGEMENT_TOOLS:", "COMPLETE_ARCHITECTURE:"];
    
    archParts.forEach(part => {
      const regex = new RegExp(`(^|\\n)(${part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      formattedArch = formattedArch.replace(regex, `$1\n$2`);
    });
    
    formattedArch = formattedArch.replace(/\n\s*\n/g, '\n\n').replace(/^\n+/, '').trim();
    summary += "=== ARCHITECTURE DESCRIPTION ===\n" + formattedArch + "\n\n";
  }
  
  return summary.trim();
}