/**
 * Enhanced Automation: Enhanced Funding Analysis (AWS SDK v3 version)
 * Purpose: Advanced funding analysis with prompt management and A/B testing
 */

const BedrockPromptManager = require('../lib/bedrock-prompt-manager');
const { bedrockRuntime } = require('../config/aws-config-v3');
const { ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

// Initialize prompt manager
const promptManager = new BedrockPromptManager();

/**
 * Main automation function for enhanced funding analysis
 */
exports.execute = async (params) => {
  const startTime = Date.now();
  let selectedPromptId = null;
  
  try {
    console.log('Starting enhanced funding analysis:', JSON.stringify(params, null, 2));
    
    // Step 1: Analyze opportunity characteristics for funding analysis
    const fundingCharacteristics = analyzeFundingCharacteristics(params);
    
    // Step 2: Get optimal prompt for funding analysis
    const { prompt, promptId, selectionReason } = await promptManager.getOptimalPrompt(
      'funding-analysis', 
      fundingCharacteristics
    );
    selectedPromptId = promptId;
    
    console.log(`Selected funding analysis prompt ${promptId}. Reason: ${selectionReason}`);
    
    // Step 3: Prepare enhanced payload with funding context
    const payload = prepareFundingPayload(params, prompt, fundingCharacteristics);
    
    // Step 4: Invoke Bedrock with monitoring
    const converseResponse = await invokeBedrockWithRetry(payload);
    
    // Step 5: Process funding analysis results
    const processedResults = processFundingResponse(converseResponse, fundingCharacteristics);
    
    // Step 6: Record funding analysis metrics
    const responseTime = Date.now() - startTime;
    await recordFundingMetrics(selectedPromptId, responseTime, processedResults, fundingCharacteristics);
    
    return {
      status: 'success',
      fundingAnalysis: processedResults.fundingAnalysis,
      fundingMetadata: {
        promptId: selectedPromptId,
        selectionReason,
        responseTime,
        characteristics: fundingCharacteristics,
        fundingOptions: processedResults.fundingOptions
      }
    };
  } catch (error) {
    console.error('Error in enhanced funding analysis:', error);
    
    // Record error metrics
    if (selectedPromptId) {
      await recordFundingErrorMetrics(selectedPromptId, error, Date.now() - startTime);
    }
    
    return {
      status: 'error',
      message: `Enhanced funding analysis failed: ${error.message}`,
      fundingAnalysis: `Error in funding analysis: ${error.message}`
    };
  }
};

/**
 * Analyze characteristics specific to funding analysis
 */
function analyzeFundingCharacteristics(params) {
  const characteristics = {
    customerName: params.customerName,
    region: params.region,
    opportunitySize: 'medium',
    fundingComplexity: 'medium',
    customerSegment: 'commercial',
    industry: 'general',
    predictedArr: 0,
    fundingUrgency: 'medium'
  };

  // Parse predicted ARR from analysis results
  if (params.projectedArr) {
    const arrValue = parseCurrency(params.projectedArr);
    characteristics.predictedArr = arrValue;
    
    if (arrValue >= 2000000) {
      characteristics.opportunitySize = 'enterprise';
      characteristics.fundingComplexity = 'high';
    } else if (arrValue >= 500000) {
      characteristics.opportunitySize = 'medium';
      characteristics.fundingComplexity = 'medium';
    } else {
      characteristics.opportunitySize = 'smb';
      characteristics.fundingComplexity = 'low';
    }
  }

  // Analyze opportunity description for funding indicators
  const description = (params.oppDescription || '').toLowerCase();
  
  // Determine customer segment
  if (description.includes('enterprise') || description.includes('fortune') || description.includes('global')) {
    characteristics.customerSegment = 'enterprise';
    characteristics.fundingComplexity = 'high';
  } else if (description.includes('startup') || description.includes('small') || description.includes('smb')) {
    characteristics.customerSegment = 'smb';
    characteristics.fundingComplexity = 'low';
  }

  // Analyze funding urgency indicators
  const urgencyIndicators = ['urgent', 'immediate', 'asap', 'critical', 'emergency'];
  if (urgencyIndicators.some(indicator => description.includes(indicator))) {
    characteristics.fundingUrgency = 'high';
  }

  // Determine industry for funding context
  const industryPatterns = {
    'financial': ['bank', 'finance', 'fintech', 'payment', 'trading'],
    'healthcare': ['health', 'medical', 'hospital', 'pharma', 'biotech'],
    'government': ['government', 'public sector', 'federal', 'state'],
    'startup': ['startup', 'seed', 'series a', 'venture'],
    'nonprofit': ['nonprofit', 'ngo', 'charity', 'foundation']
  };

  for (const [industry, keywords] of Object.entries(industryPatterns)) {
    if (keywords.some(keyword => description.includes(keyword))) {
      characteristics.industry = industry;
      break;
    }
  }

  // Analyze top services for funding complexity
  if (params.topServices) {
    const services = params.topServices.toLowerCase();
    const complexServices = ['sagemaker', 'bedrock', 'comprehend', 'rekognition', 'lex', 'connect'];
    if (complexServices.some(service => services.includes(service))) {
      characteristics.fundingComplexity = 'high';
    }
  }

  return characteristics;
}

/**
 * Prepare funding analysis payload with enhanced context
 */
function prepareFundingPayload(params, promptData, characteristics) {
  try {
    const modelId = promptData.variants[0].modelId;
    const userMessageTemplate = promptData.variants[0].templateConfiguration.chat.messages[0].content[0].text;
    const systemInstructions = promptData.variants[0].templateConfiguration.chat.system[0].text;

    // Enhanced system instructions for funding analysis
    const enhancedSystemInstructions = `${systemInstructions}

FUNDING ANALYSIS CONTEXT:
- Customer Segment: ${characteristics.customerSegment}
- Opportunity Size: ${characteristics.opportunitySize}
- Funding Complexity: ${characteristics.fundingComplexity}
- Industry: ${characteristics.industry}
- Predicted ARR: $${characteristics.predictedArr.toLocaleString()}
- Funding Urgency: ${characteristics.fundingUrgency}

Provide funding recommendations tailored to this specific context.`;

    // Fill template with enhanced parameters
    const filledUserMessage = userMessageTemplate
      .replace('{{customerName}}', params.customerName || 'Not specified')
      .replace('{{region}}', params.region || 'Not specified')
      .replace('{{oppName}}', params.oppName || 'Not specified')
      .replace('{{oppDescription}}', params.oppDescription || 'Not specified')
      .replace('{{projectedArr}}', params.projectedArr || 'Not specified')
      .replace('{{topServices}}', params.topServices || 'Not specified')
      .replace('{{fundingContext}}', JSON.stringify(characteristics, null, 2));

    return {
      modelId: modelId,
      system: [{ text: enhancedSystemInstructions }],
      messages: [
        {
          role: "user",
          content: [{ text: filledUserMessage }]
        }
      ],
      inferenceConfig: {
        maxTokens: 4096,
        temperature: 0.2
      }
    };
  } catch (error) {
    console.error('Error preparing funding payload:', error);
    throw new Error('Failed to prepare funding analysis payload: ' + error.message);
  }
}

/**
 * Invoke Bedrock with retry logic for funding analysis
 */
async function invokeBedrockWithRetry(payload) {
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const command = new ConverseCommand(payload);
      const response = await bedrockRuntime.send(command);
      
      if (attempt > 1) {
        console.log(`Funding analysis succeeded on attempt ${attempt}`);
      }
      
      return response;
    } catch (error) {
      lastError = error;
      console.error(`Funding analysis attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Funding analysis failed after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Process funding analysis response
 */
function processFundingResponse(response, characteristics) {
  console.log("Processing funding analysis response");
  
  if (!response || !response.output || !response.output.message || !response.output.message.content || !response.output.message.content[0] || !response.output.message.content[0].text) {
    throw new Error("Invalid Bedrock response structure for funding analysis");
  }
  
  const messageContentText = response.output.message.content[0].text;
  console.log("Funding analysis content length:", messageContentText.length);
  
  try {
    // Extract funding options and recommendations
    const fundingOptions = extractFundingOptions(messageContentText);
    const recommendations = extractFundingRecommendations(messageContentText);
    const timeline = extractFundingTimeline(messageContentText);
    const riskFactors = extractFundingRisks(messageContentText);

    return {
      fundingAnalysis: messageContentText,
      fundingOptions: fundingOptions,
      recommendations: recommendations,
      timeline: timeline,
      riskFactors: riskFactors,
      enhancedFunding: true
    };
  } catch (error) {
    console.error("Error processing funding response:", error.message);
    return {
      fundingAnalysis: messageContentText,
      fundingOptions: [],
      enhancedFunding: false
    };
  }
}

/**
 * Extract funding options from response
 */
function extractFundingOptions(content) {
  const options = [];
  
  // Look for funding option patterns
  const optionPatterns = [
    /(?:Option\s*\d+|Funding\s*Option):\s*([^\n]+)/gi,
    /(?:•|\*|\d+\.)\s*([^:\n]*(?:funding|finance|loan|credit)[^:\n]*)/gi
  ];

  for (const pattern of optionPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const option = match[1].trim();
      if (option.length > 10 && !options.includes(option)) {
        options.push(option);
      }
    }
  }

  return options.slice(0, 5); // Limit to top 5 options
}

/**
 * Extract funding recommendations from response
 */
function extractFundingRecommendations(content) {
  const recommendationMatch = content.match(/(?:RECOMMENDATIONS?|RECOMMENDED?)[\s\S]*?(?=\n\n|\n[A-Z]|$)/i);
  return recommendationMatch ? recommendationMatch[0].trim() : 'No specific recommendations provided';
}

/**
 * Extract funding timeline from response
 */
function extractFundingTimeline(content) {
  const timelineMatch = content.match(/(?:TIMELINE|TIMEFRAME)[\s\S]*?(?=\n\n|\n[A-Z]|$)/i);
  return timelineMatch ? timelineMatch[0].trim() : 'Timeline not specified';
}

/**
 * Extract funding risk factors from response
 */
function extractFundingRisks(content) {
  const riskMatch = content.match(/(?:RISK|RISKS?)[\s\S]*?(?=\n\n|\n[A-Z]|$)/i);
  return riskMatch ? riskMatch[0].trim() : 'Risk factors not identified';
}

/**
 * Record funding analysis metrics
 */
async function recordFundingMetrics(promptId, responseTime, results, characteristics) {
  try {
    const fundingQuality = calculateFundingQuality(results);
    const accuracyScore = calculateFundingAccuracy(results, characteristics);
    
    const metrics = {
      response_time: responseTime,
      funding_accuracy: accuracyScore,
      recommendation_quality: fundingQuality,
      success_rate: results.fundingOptions.length > 0 ? 100 : 50,
      options_provided: results.fundingOptions.length,
      complexity_handled: getComplexityScore(characteristics.fundingComplexity)
    };

    await promptManager.recordPromptPerformance('funding-analysis', promptId, metrics);
    
    console.log(`Recorded funding analysis metrics for prompt ${promptId}:`, metrics);
  } catch (error) {
    console.error('Error recording funding metrics:', error);
  }
}

/**
 * Record funding analysis error metrics
 */
async function recordFundingErrorMetrics(promptId, error, responseTime) {
  try {
    const metrics = {
      response_time: responseTime,
      success_rate: 0,
      funding_accuracy: 0,
      error_type: error.name || 'UnknownError'
    };

    await promptManager.recordPromptPerformance('funding-analysis', promptId, metrics);
  } catch (recordError) {
    console.error('Error recording funding error metrics:', recordError);
  }
}

/**
 * Calculate funding analysis quality score
 */
function calculateFundingQuality(results) {
  let score = 50; // Base score
  
  // Check for funding options
  if (results.fundingOptions.length >= 3) score += 20;
  else if (results.fundingOptions.length >= 1) score += 10;
  
  // Check for recommendations
  if (results.recommendations && results.recommendations !== 'No specific recommendations provided') {
    score += 15;
  }
  
  // Check for timeline
  if (results.timeline && results.timeline !== 'Timeline not specified') {
    score += 10;
  }
  
  // Check for risk factors
  if (results.riskFactors && results.riskFactors !== 'Risk factors not identified') {
    score += 10;
  }
  
  // Bonus for enhanced analysis
  if (results.enhancedFunding) score += 5;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate funding accuracy score
 */
function calculateFundingAccuracy(results, characteristics) {
  let score = 70; // Base accuracy score
  
  // Check if funding options match customer segment
  const fundingText = results.fundingAnalysis.toLowerCase();
  
  if (characteristics.customerSegment === 'enterprise') {
    if (fundingText.includes('enterprise') || fundingText.includes('corporate')) score += 10;
  } else if (characteristics.customerSegment === 'smb') {
    if (fundingText.includes('small business') || fundingText.includes('smb')) score += 10;
  }
  
  // Check if funding complexity is appropriate
  if (characteristics.fundingComplexity === 'high' && fundingText.includes('complex')) {
    score += 5;
  }
  
  // Check for industry-specific funding options
  if (characteristics.industry === 'government' && fundingText.includes('government')) {
    score += 10;
  } else if (characteristics.industry === 'startup' && fundingText.includes('venture')) {
    score += 10;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Parse currency values
 */
function parseCurrency(value) {
  if (typeof value !== 'string') return 0;
  const cleaned = value.replace(/[$,]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Get complexity score for metrics
 */
function getComplexityScore(complexity) {
  const scores = { low: 1, medium: 2, high: 3 };
  return scores[complexity] || 2;
}

module.exports = { execute: exports.execute, promptManager };