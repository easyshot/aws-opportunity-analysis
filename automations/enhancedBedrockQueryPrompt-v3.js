/**
 * Enhanced Automation: Enhanced Bedrock Query Prompt (AWS SDK v3 version)
 * Purpose: Advanced SQL query generation with prompt management, A/B testing, and performance monitoring
 */

const BedrockPromptManager = require('../lib/bedrock-prompt-manager');
const { bedrockRuntime } = require('../config/aws-config-v3');
const { ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

// Initialize prompt manager
const promptManager = new BedrockPromptManager();

/**
 * Main automation function with enhanced prompt management
 */
exports.execute = async (params) => {
  const startTime = Date.now();
  let selectedPromptId = null;
  
  try {
    console.log('Starting enhanced Bedrock query prompt with params:', JSON.stringify(params));
    
    // Step 1: Analyze opportunity characteristics for dynamic prompt selection
    const opportunityCharacteristics = analyzeOpportunityCharacteristics(params);
    
    // Step 2: Get optimal prompt using advanced prompt management
    const { prompt, promptId, selectionReason } = await promptManager.getOptimalPrompt(
      'query-generation', 
      opportunityCharacteristics
    );
    selectedPromptId = promptId;
    
    console.log(`Selected prompt ${promptId} for query generation. Reason: ${selectionReason}`);
    
    // Step 3: Prepare payload for Bedrock Converse API
    const payload = preparePayload(params, prompt);
    
    // Step 4: Invoke Bedrock Converse API with performance tracking
    const converseResponse = await invokeBedrockConverse(payload);
    
    // Step 5: Process results
    const processedResults = processConverseApiResponse(converseResponse);
    
    // Step 6: Record performance metrics
    const responseTime = Date.now() - startTime;
    await recordPerformanceMetrics(selectedPromptId, responseTime, processedResults, opportunityCharacteristics);
    
    return {
      status: 'success',
      processResults: processedResults,
      promptMetadata: {
        promptId: selectedPromptId,
        selectionReason,
        responseTime,
        characteristics: opportunityCharacteristics
      }
    };
  } catch (error) {
    console.error('Error in enhanced Bedrock query prompt:', error);
    
    // Record error metrics
    if (selectedPromptId) {
      await recordErrorMetrics(selectedPromptId, error, Date.now() - startTime);
    }
    
    return {
      status: 'error',
      message: `Error in enhanced query generation: ${error.message}`,
      processResults: JSON.stringify({ sql_query: "SELECT 'Error generating query'" })
    };
  }
};

/**
 * Analyze opportunity characteristics for dynamic prompt selection
 */
function analyzeOpportunityCharacteristics(params) {
  const characteristics = {
    region: params.region,
    customerName: params.CustomerName,
    opportunitySize: 'medium', // Default
    complexity: 'medium', // Default
    customerSegment: 'commercial' // Default
  };

  // Analyze opportunity size based on description keywords
  const description = (params.oppDescription || '').toLowerCase();
  if (description.includes('enterprise') || description.includes('large scale') || description.includes('global')) {
    characteristics.opportunitySize = 'enterprise';
    characteristics.customerSegment = 'enterprise';
  } else if (description.includes('startup') || description.includes('small business') || description.includes('smb')) {
    characteristics.opportunitySize = 'smb';
    characteristics.customerSegment = 'smb';
  }

  // Analyze complexity based on description content
  const complexityKeywords = ['migration', 'multi-cloud', 'hybrid', 'compliance', 'security', 'integration'];
  const complexityScore = complexityKeywords.reduce((score, keyword) => {
    return score + (description.includes(keyword) ? 1 : 0);
  }, 0);

  if (complexityScore >= 3) {
    characteristics.complexity = 'high';
  } else if (complexityScore >= 1) {
    characteristics.complexity = 'medium';
  } else {
    characteristics.complexity = 'low';
  }

  // Analyze industry vertical
  const industryKeywords = {
    'financial': ['bank', 'finance', 'fintech', 'payment'],
    'healthcare': ['health', 'medical', 'hospital', 'pharma'],
    'retail': ['retail', 'ecommerce', 'shopping'],
    'manufacturing': ['manufacturing', 'factory', 'production'],
    'government': ['government', 'public sector', 'federal']
  };

  for (const [industry, keywords] of Object.entries(industryKeywords)) {
    if (keywords.some(keyword => description.includes(keyword))) {
      characteristics.industry = industry;
      break;
    }
  }

  return characteristics;
}

/**
 * Prepare payload for Bedrock Converse API with enhanced template processing
 */
function preparePayload(params, promptData) {
  try {
    const modelId = promptData.variants[0].modelId;
    const userMessageTemplate = promptData.variants[0].templateConfiguration.chat.messages[0].content[0].text;
    const systemInstructions = promptData.variants[0].templateConfiguration.chat.system[0].text;

    // Enhanced template variable replacement with additional context
    const filledUserMessage = userMessageTemplate
      .replace('{{CustomerName}}', params.CustomerName || 'Not specified')
      .replace('{{region}}', params.region || 'Not specified')
      .replace('{{closeDate}}', params.closeDate || 'Not specified')
      .replace('{{oppName}}', params.oppName || 'Not specified')
      .replace('{{oppDescription}}', params.oppDescription || 'Not specified')
      .replace('{{timestamp}}', new Date().toISOString())
      .replace('{{requestId}}', generateRequestId());

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
 * Invoke Bedrock Converse API with retry logic
 */
async function invokeBedrockConverse(payload) {
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const command = new ConverseCommand(payload);
      const response = await bedrockRuntime.send(command);
      
      if (attempt > 1) {
        console.log(`Bedrock call succeeded on attempt ${attempt}`);
      }
      
      return response;
    } catch (error) {
      lastError = error;
      console.error(`Bedrock call attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed to invoke Bedrock after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Process Converse API response with enhanced validation
 */
function processConverseApiResponse(response) {
  console.log("Enhanced SQL Query Processing: Starting validation");
  
  if (!response || !response.output || !response.output.message || !response.output.message.content || !response.output.message.content[0] || !response.output.message.content[0].text) {
    console.error("Invalid Bedrock response structure:", JSON.stringify(response, null, 2));
    throw new Error("Invalid or incomplete Bedrock Converse API response structure for SQL query generation.");
  }
  
  const messageContentText = response.output.message.content[0].text;
  console.log("Extracted message content:", messageContentText.substring(0, 500));
  
  try {
    const parsedJson = JSON.parse(messageContentText);
    
    // Enhanced validation
    if (!parsedJson || typeof parsedJson.sql_query !== 'string') {
      throw new Error("Response does not contain valid sql_query property");
    }

    // Validate SQL query structure
    const sqlQuery = parsedJson.sql_query.trim();
    if (!sqlQuery.toLowerCase().startsWith('select')) {
      console.warn("Generated query does not start with SELECT:", sqlQuery);
    }

    // Check for potential SQL injection patterns (basic validation)
    const dangerousPatterns = [';--', 'drop table', 'delete from', 'update set'];
    const lowerQuery = sqlQuery.toLowerCase();
    for (const pattern of dangerousPatterns) {
      if (lowerQuery.includes(pattern)) {
        throw new Error(`Generated query contains potentially dangerous pattern: ${pattern}`);
      }
    }

    console.log("SQL query validation passed:", sqlQuery.substring(0, 200));
    return JSON.stringify(parsedJson);
    
  } catch (error) {
    console.error("Error processing SQL query response:", error.message);
    
    // Attempt fallback parsing
    const fallbackResult = attemptFallbackParsing(messageContentText);
    if (fallbackResult) {
      return fallbackResult;
    }
    
    throw new Error(`Failed to extract valid SQL query: ${error.message}`);
  }
}

/**
 * Attempt fallback parsing for malformed responses
 */
function attemptFallbackParsing(messageContent) {
  try {
    // Look for SQL query patterns
    const sqlMatch = messageContent.match(/SELECT[\s\S]*?(?=\n\n|\n$|$)/i);
    if (sqlMatch) {
      const sqlQuery = sqlMatch[0].trim();
      console.log("Fallback parsing extracted SQL:", sqlQuery.substring(0, 200));
      return JSON.stringify({ sql_query: sqlQuery });
    }
    
    // Look for JSON-like patterns
    const jsonMatch = messageContent.match(/\{[\s\S]*"sql_query"[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      if (parsed.sql_query) {
        console.log("Fallback JSON parsing succeeded");
        return JSON.stringify(parsed);
      }
    }
  } catch (error) {
    console.error("Fallback parsing failed:", error.message);
  }
  
  return null;
}

/**
 * Record performance metrics for prompt optimization
 */
async function recordPerformanceMetrics(promptId, responseTime, results, characteristics) {
  try {
    // Calculate quality metrics
    const qualityScore = calculateQueryQuality(results);
    const successRate = results.includes('Error') ? 0 : 100;
    
    const metrics = {
      response_time: responseTime,
      query_quality: qualityScore,
      success_rate: successRate,
      complexity_handled: getComplexityScore(characteristics.complexity)
    };

    await promptManager.recordPromptPerformance('query-generation', promptId, metrics);
    
    console.log(`Recorded performance metrics for prompt ${promptId}:`, metrics);
  } catch (error) {
    console.error('Error recording performance metrics:', error);
  }
}

/**
 * Record error metrics
 */
async function recordErrorMetrics(promptId, error, responseTime) {
  try {
    const metrics = {
      response_time: responseTime,
      success_rate: 0,
      error_type: error.name || 'UnknownError'
    };

    await promptManager.recordPromptPerformance('query-generation', promptId, metrics);
  } catch (recordError) {
    console.error('Error recording error metrics:', recordError);
  }
}

/**
 * Calculate query quality score based on various factors
 */
function calculateQueryQuality(results) {
  try {
    const parsed = JSON.parse(results);
    const query = parsed.sql_query || '';
    
    let score = 50; // Base score
    
    // Check for proper SQL structure
    if (query.toLowerCase().includes('select')) score += 10;
    if (query.toLowerCase().includes('from')) score += 10;
    if (query.toLowerCase().includes('where')) score += 10;
    
    // Check for advanced features
    if (query.toLowerCase().includes('join')) score += 5;
    if (query.toLowerCase().includes('group by')) score += 5;
    if (query.toLowerCase().includes('order by')) score += 5;
    
    // Penalize for potential issues
    if (query.includes('*')) score -= 5; // Avoid SELECT *
    if (query.length < 50) score -= 10; // Too simple
    if (query.length > 2000) score -= 5; // Too complex
    
    return Math.max(0, Math.min(100, score));
  } catch (error) {
    return 0; // Failed to parse
  }
}

/**
 * Get complexity score for metrics
 */
function getComplexityScore(complexity) {
  const scores = { low: 1, medium: 2, high: 3 };
  return scores[complexity] || 2;
}

/**
 * Generate unique request ID for tracking
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = { execute: exports.execute, promptManager };