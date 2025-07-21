/**
 * Enhanced Automation: Enhanced Follow-On Opportunity Analysis (AWS SDK v3 version)
 * Purpose: Advanced follow-on opportunity analysis with prompt management and predictive analytics
 */

const BedrockPromptManager = require('../lib/bedrock-prompt-manager');
const { bedrockRuntime } = require('../config/aws-config-v3');
const { ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

// Initialize prompt manager
const promptManager = new BedrockPromptManager();

/**
 * Main automation function for enhanced follow-on analysis
 */
exports.execute = async (params) => {
  const startTime = Date.now();
  let selectedPromptId = null;
  
  try {
    console.log('Starting enhanced follow-on opportunity analysis:', JSON.stringify(params, null, 2));
    
    // Step 1: Analyze characteristics for follow-on opportunities
    const followOnCharacteristics = analyzeFollowOnCharacteristics(params);
    
    // Step 2: Get optimal prompt for follow-on analysis
    const { prompt, promptId, selectionReason } = await promptManager.getOptimalPrompt(
      'follow-on-analysis', 
      followOnCharacteristics
    );
    selectedPromptId = promptId;
    
    console.log(`Selected follow-on analysis prompt ${promptId}. Reason: ${selectionReason}`);
    
    // Step 3: Prepare enhanced payload with follow-on context
    const payload = prepareFollowOnPayload(params, prompt, followOnCharacteristics);
    
    // Step 4: Invoke Bedrock with monitoring
    const converseResponse = await invokeBedrockWithRetry(payload);
    
    // Step 5: Process follow-on analysis results
    const processedResults = processFollowOnResponse(converseResponse, followOnCharacteristics);
    
    // Step 6: Record follow-on analysis metrics
    const responseTime = Date.now() - startTime;
    await recordFollowOnMetrics(selectedPromptId, responseTime, processedResults, followOnCharacteristics);
    
    return {
      status: 'success',
      followOnAnalysis: processedResults.followOnAnalysis,
      followOnMetadata: {
        promptId: selectedPromptId,
        selectionReason,
        responseTime,
        characteristics: followOnCharacteristics,
        opportunities: processedResults.opportunities,
        timeline: processedResults.timeline
      }
    };
  } catch (error) {
    console.error('Error in enhanced follow-on analysis:', error);
    
    // Record error metrics
    if (selectedPromptId) {
      await recordFollowOnErrorMetrics(selectedPromptId, error, Date.now() - startTime);
    }
    
    return {
      status: 'error',
      message: `Enhanced follow-on analysis failed: ${error.message}`,
      followOnAnalysis: `Error in follow-on analysis: ${error.message}`
    };
  }
};

/**
 * Analyze characteristics specific to follow-on opportunity analysis
 */
function analyzeFollowOnCharacteristics(params) {
  const characteristics = {
    customerName: params.customerName,
    region: params.region,
    currentOpportunitySize: 'medium',
    customerMaturity: 'medium',
    customerSegment: 'commercial',
    industry: 'general',
    currentServices: [],
    expansionPotential: 'medium',
    relationshipStrength: 'medium'
  };

  // Analyze current opportunity size
  if (params.projectedArr) {
    const arrValue = parseCurrency(params.projectedArr);
    
    if (arrValue >= 2000000) {
      characteristics.currentOpportunitySize = 'enterprise';
      characteristics.expansionPotential = 'high';
    } else if (arrValue >= 500000) {
      characteristics.currentOpportunitySize = 'medium';
      characteristics.expansionPotential = 'medium';
    } else {
      characteristics.currentOpportunitySize = 'smb';
      characteristics.expansionPotential = 'low';
    }
  }

  // Analyze opportunity description for follow-on indicators
  const description = (params.oppDescription || '').toLowerCase();
  
  // Determine customer segment and maturity
  if (description.includes('enterprise') || description.includes('fortune') || description.includes('global')) {
    characteristics.customerSegment = 'enterprise';
    characteristics.customerMaturity = 'high';
    characteristics.expansionPotential = 'high';
  } else if (description.includes('startup') || description.includes('new') || description.includes('first time')) {
    characteristics.customerSegment = 'startup';
    characteristics.customerMaturity = 'low';
    characteristics.expansionPotential = 'high'; // Startups can grow quickly
  }

  // Analyze cloud maturity indicators
  const maturityIndicators = {
    'high': ['multi-cloud', 'hybrid', 'advanced', 'sophisticated', 'mature', 'experienced'],
    'medium': ['migration', 'modernization', 'transformation', 'expanding'],
    'low': ['first', 'initial', 'pilot', 'proof of concept', 'getting started']
  };

  for (const [level, indicators] of Object.entries(maturityIndicators)) {
    if (indicators.some(indicator => description.includes(indicator))) {
      characteristics.customerMaturity = level;
      break;
    }
  }

  // Determine industry for follow-on context
  const industryPatterns = {
    'financial': ['bank', 'finance', 'fintech', 'payment', 'trading', 'insurance'],
    'healthcare': ['health', 'medical', 'hospital', 'pharma', 'biotech', 'clinical'],
    'retail': ['retail', 'ecommerce', 'shopping', 'consumer', 'marketplace'],
    'manufacturing': ['manufacturing', 'factory', 'production', 'supply chain', 'automotive'],
    'government': ['government', 'public sector', 'federal', 'state', 'municipal'],
    'education': ['education', 'university', 'school', 'learning', 'academic'],
    'media': ['media', 'entertainment', 'streaming', 'content', 'gaming']
  };

  for (const [industry, keywords] of Object.entries(industryPatterns)) {
    if (keywords.some(keyword => description.includes(keyword))) {
      characteristics.industry = industry;
      break;
    }
  }

  // Analyze current services for expansion opportunities
  if (params.topServices) {
    characteristics.currentServices = extractServicesFromText(params.topServices);
    
    // Determine expansion potential based on current services
    const advancedServices = ['sagemaker', 'bedrock', 'comprehend', 'rekognition', 'lex', 'connect', 'quicksight'];
    const hasAdvancedServices = characteristics.currentServices.some(service => 
      advancedServices.some(advanced => service.toLowerCase().includes(advanced))
    );
    
    if (hasAdvancedServices) {
      characteristics.expansionPotential = 'high';
    }
  }

  // Assess relationship strength based on opportunity characteristics
  if (characteristics.currentOpportunitySize === 'enterprise' && characteristics.customerMaturity === 'high') {
    characteristics.relationshipStrength = 'high';
  } else if (characteristics.currentOpportunitySize === 'medium' || characteristics.customerMaturity === 'medium') {
    characteristics.relationshipStrength = 'medium';
  } else {
    characteristics.relationshipStrength = 'low';
  }

  return characteristics;
}

/**
 * Extract AWS services from text
 */
function extractServicesFromText(text) {
  const services = [];
  const servicePatterns = [
    /Amazon\s+(\w+)/gi,
    /AWS\s+(\w+)/gi,
    /(EC2|S3|RDS|Lambda|DynamoDB|CloudFront|Route53|VPC|IAM|CloudWatch)/gi
  ];

  for (const pattern of servicePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const service = match[1] || match[0];
      if (service && !services.includes(service)) {
        services.push(service);
      }
    }
  }

  return services;
}

/**
 * Prepare follow-on analysis payload with enhanced context
 */
function prepareFollowOnPayload(params, promptData, characteristics) {
  try {
    const modelId = promptData.variants[0].modelId;
    const userMessageTemplate = promptData.variants[0].templateConfiguration.chat.messages[0].content[0].text;
    const systemInstructions = promptData.variants[0].templateConfiguration.chat.system[0].text;

    // Enhanced system instructions for follow-on analysis
    const enhancedSystemInstructions = `${systemInstructions}

FOLLOW-ON OPPORTUNITY CONTEXT:
- Customer Segment: ${characteristics.customerSegment}
- Customer Maturity: ${characteristics.customerMaturity}
- Current Opportunity Size: ${characteristics.currentOpportunitySize}
- Industry: ${characteristics.industry}
- Expansion Potential: ${characteristics.expansionPotential}
- Relationship Strength: ${characteristics.relationshipStrength}
- Current Services: ${characteristics.currentServices.join(', ')}

Focus on identifying realistic follow-on opportunities based on this customer profile and current engagement.`;

    // Fill template with enhanced parameters
    const filledUserMessage = userMessageTemplate
      .replace('{{customerName}}', params.customerName || 'Not specified')
      .replace('{{region}}', params.region || 'Not specified')
      .replace('{{oppName}}', params.oppName || 'Not specified')
      .replace('{{oppDescription}}', params.oppDescription || 'Not specified')
      .replace('{{projectedArr}}', params.projectedArr || 'Not specified')
      .replace('{{topServices}}', params.topServices || 'Not specified')
      .replace('{{followOnContext}}', JSON.stringify(characteristics, null, 2));

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
        temperature: 0.3 // Slightly higher for creative opportunity identification
      }
    };
  } catch (error) {
    console.error('Error preparing follow-on payload:', error);
    throw new Error('Failed to prepare follow-on analysis payload: ' + error.message);
  }
}

/**
 * Invoke Bedrock with retry logic for follow-on analysis
 */
async function invokeBedrockWithRetry(payload) {
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const command = new ConverseCommand(payload);
      const response = await bedrockRuntime.send(command);
      
      if (attempt > 1) {
        console.log(`Follow-on analysis succeeded on attempt ${attempt}`);
      }
      
      return response;
    } catch (error) {
      lastError = error;
      console.error(`Follow-on analysis attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Follow-on analysis failed after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Process follow-on analysis response
 */
function processFollowOnResponse(response, characteristics) {
  console.log("Processing follow-on analysis response");
  
  if (!response || !response.output || !response.output.message || !response.output.message.content || !response.output.message.content[0] || !response.output.message.content[0].text) {
    throw new Error("Invalid Bedrock response structure for follow-on analysis");
  }
  
  const messageContentText = response.output.message.content[0].text;
  console.log("Follow-on analysis content length:", messageContentText.length);
  
  try {
    // Extract follow-on opportunities and insights
    const opportunities = extractFollowOnOpportunities(messageContentText);
    const timeline = extractFollowOnTimeline(messageContentText);
    const nextSteps = extractNextSteps(messageContentText);
    const services = extractRecommendedServices(messageContentText);
    const insights = extractFollowOnInsights(messageContentText);

    return {
      followOnAnalysis: messageContentText,
      opportunities: opportunities,
      timeline: timeline,
      nextSteps: nextSteps,
      recommendedServices: services,
      insights: insights,
      enhancedFollowOn: true
    };
  } catch (error) {
    console.error("Error processing follow-on response:", error.message);
    return {
      followOnAnalysis: messageContentText,
      opportunities: [],
      enhancedFollowOn: false
    };
  }
}

/**
 * Extract follow-on opportunities from response
 */
function extractFollowOnOpportunities(content) {
  const opportunities = [];
  
  // Look for opportunity patterns
  const opportunityPatterns = [
    /(?:Opportunity\s*\d+|Next\s*Opportunity):\s*([^\n]+)/gi,
    /(?:•|\*|\d+\.)\s*([^:\n]*(?:opportunity|expansion|growth)[^:\n]*)/gi
  ];

  for (const pattern of opportunityPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const opportunity = match[1].trim();
      if (opportunity.length > 15 && !opportunities.includes(opportunity)) {
        opportunities.push(opportunity);
      }
    }
  }

  return opportunities.slice(0, 5); // Limit to top 5 opportunities
}

/**
 * Extract follow-on timeline from response
 */
function extractFollowOnTimeline(content) {
  const timelineMatch = content.match(/(?:TIMELINE|TIMEFRAME|SCHEDULE)[\s\S]*?(?=\n\n|\n[A-Z]|$)/i);
  return timelineMatch ? timelineMatch[0].trim() : 'Timeline not specified';
}

/**
 * Extract next steps from response
 */
function extractNextSteps(content) {
  const nextStepsMatch = content.match(/(?:NEXT\s*STEPS?|ACTION\s*ITEMS?)[\s\S]*?(?=\n\n|\n[A-Z]|$)/i);
  return nextStepsMatch ? nextStepsMatch[0].trim() : 'Next steps not specified';
}

/**
 * Extract recommended services from response
 */
function extractRecommendedServices(content) {
  const services = [];
  const servicePatterns = [
    /Amazon\s+(\w+)/gi,
    /AWS\s+(\w+)/gi,
    /(EC2|S3|RDS|Lambda|DynamoDB|CloudFront|Route53|VPC|IAM|CloudWatch|SageMaker|Bedrock|QuickSight)/gi
  ];

  for (const pattern of servicePatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const service = match[1] || match[0];
      if (service && !services.includes(service)) {
        services.push(service);
      }
    }
  }

  return services.slice(0, 10); // Limit to top 10 services
}

/**
 * Extract follow-on insights from response
 */
function extractFollowOnInsights(content) {
  const insightsMatch = content.match(/(?:INSIGHTS?|KEY\s*FINDINGS?)[\s\S]*?(?=\n\n|\n[A-Z]|$)/i);
  return insightsMatch ? insightsMatch[0].trim() : 'Insights not available';
}

/**
 * Record follow-on analysis metrics
 */
async function recordFollowOnMetrics(promptId, responseTime, results, characteristics) {
  try {
    const relevanceScore = calculateOpportunityRelevance(results, characteristics);
    const predictionAccuracy = calculatePredictionAccuracy(results, characteristics);
    
    const metrics = {
      response_time: responseTime,
      opportunity_relevance: relevanceScore,
      prediction_accuracy: predictionAccuracy,
      success_rate: results.opportunities.length > 0 ? 100 : 50,
      opportunities_identified: results.opportunities.length,
      services_recommended: results.recommendedServices ? results.recommendedServices.length : 0,
      expansion_potential_score: getExpansionScore(characteristics.expansionPotential)
    };

    await promptManager.recordPromptPerformance('follow-on-analysis', promptId, metrics);
    
    console.log(`Recorded follow-on analysis metrics for prompt ${promptId}:`, metrics);
  } catch (error) {
    console.error('Error recording follow-on metrics:', error);
  }
}

/**
 * Record follow-on analysis error metrics
 */
async function recordFollowOnErrorMetrics(promptId, error, responseTime) {
  try {
    const metrics = {
      response_time: responseTime,
      success_rate: 0,
      opportunity_relevance: 0,
      error_type: error.name || 'UnknownError'
    };

    await promptManager.recordPromptPerformance('follow-on-analysis', promptId, metrics);
  } catch (recordError) {
    console.error('Error recording follow-on error metrics:', recordError);
  }
}

/**
 * Calculate opportunity relevance score
 */
function calculateOpportunityRelevance(results, characteristics) {
  let score = 50; // Base score
  
  // Check for opportunities identified
  if (results.opportunities.length >= 3) score += 20;
  else if (results.opportunities.length >= 1) score += 10;
  
  // Check for next steps
  if (results.nextSteps && results.nextSteps !== 'Next steps not specified') {
    score += 15;
  }
  
  // Check for timeline
  if (results.timeline && results.timeline !== 'Timeline not specified') {
    score += 10;
  }
  
  // Check for recommended services
  if (results.recommendedServices && results.recommendedServices.length > 0) {
    score += 10;
  }
  
  // Bonus for enhanced analysis
  if (results.enhancedFollowOn) score += 5;
  
  // Industry-specific relevance check
  const analysisText = results.followOnAnalysis.toLowerCase();
  if (characteristics.industry !== 'general' && analysisText.includes(characteristics.industry)) {
    score += 10;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate prediction accuracy score
 */
function calculatePredictionAccuracy(results, characteristics) {
  let score = 70; // Base accuracy score
  
  const analysisText = results.followOnAnalysis.toLowerCase();
  
  // Check if opportunities match customer maturity
  if (characteristics.customerMaturity === 'high' && analysisText.includes('advanced')) {
    score += 10;
  } else if (characteristics.customerMaturity === 'low' && analysisText.includes('basic')) {
    score += 10;
  }
  
  // Check if expansion potential is considered
  if (characteristics.expansionPotential === 'high' && analysisText.includes('expansion')) {
    score += 10;
  }
  
  // Check for realistic timeline based on customer segment
  if (characteristics.customerSegment === 'enterprise' && analysisText.includes('month')) {
    score += 5;
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
 * Get expansion score for metrics
 */
function getExpansionScore(expansionPotential) {
  const scores = { low: 1, medium: 2, high: 3 };
  return scores[expansionPotential] || 2;
}

module.exports = { execute: exports.execute, promptManager };