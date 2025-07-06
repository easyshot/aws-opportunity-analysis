/**
 * Enhanced Automation: Enhanced Analysis with RAG (AWS SDK v3 version)
 * Purpose: Advanced opportunity analysis with RAG, prompt management, and model evaluation
 */

const BedrockPromptManager = require('../lib/bedrock-prompt-manager');
const { bedrockRuntime } = require('../config/aws-config-v3');
const { ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

// Initialize prompt manager
const promptManager = new BedrockPromptManager();

/**
 * Main automation function with enhanced analysis capabilities
 */
exports.execute = async (params) => {
  const startTime = Date.now();
  let selectedPromptId = null;
  
  try {
    console.log('Starting enhanced analysis with RAG:', JSON.stringify(params, null, 2));
    
    // Step 1: Analyze opportunity characteristics for optimal model selection
    const opportunityCharacteristics = analyzeOpportunityForAnalysis(params);
    
    // Step 2: Get optimal prompt using advanced prompt management
    const analysisType = determineAnalysisType(opportunityCharacteristics);
    const { prompt, promptId, selectionReason } = await promptManager.getOptimalPrompt(
      analysisType, 
      opportunityCharacteristics
    );
    selectedPromptId = promptId;
    
    console.log(`Selected ${analysisType} prompt ${promptId}. Reason: ${selectionReason}`);
    
    // Step 3: Enhance query results with RAG processing
    const enhancedQueryResults = await enhanceWithRAG(params.queryResults, opportunityCharacteristics);
    
    // Step 4: Prepare payload with enhanced context
    const payload = prepareEnhancedPayload(params, prompt, enhancedQueryResults, opportunityCharacteristics);
    
    // Step 5: Invoke Bedrock with performance monitoring
    const converseResponse = await invokeBedrockWithMonitoring(payload);
    
    // Step 6: Process results with advanced validation
    const processedResults = processAnalysisResponse(converseResponse, opportunityCharacteristics);
    
    // Step 7: Record comprehensive performance metrics
    const responseTime = Date.now() - startTime;
    await recordAnalysisMetrics(selectedPromptId, analysisType, responseTime, processedResults, opportunityCharacteristics);
    
    return {
      status: 'success',
      ...processedResults,
      analysisMetadata: {
        promptId: selectedPromptId,
        analysisType,
        selectionReason,
        responseTime,
        characteristics: opportunityCharacteristics,
        ragEnhanced: true
      }
    };
  } catch (error) {
    console.error('Error in enhanced analysis:', error);
    
    // Record error metrics
    if (selectedPromptId) {
      await recordAnalysisErrorMetrics(selectedPromptId, error, Date.now() - startTime);
    }
    
    return {
      status: 'error',
      message: `Enhanced analysis failed: ${error.message}`,
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
      formattedSummaryText: `Enhanced analysis error: ${error.message}`
    };
  }
};

/**
 * Analyze opportunity characteristics for optimal analysis approach
 */
function analyzeOpportunityForAnalysis(params) {
  const characteristics = {
    region: params.region,
    customerName: params.CustomerName,
    opportunitySize: 'medium',
    complexity: 'medium',
    customerSegment: 'commercial',
    industry: 'general',
    dataQuality: 'medium',
    historicalDataPoints: 0
  };

  // Analyze opportunity description
  const description = (params.oppDescription || '').toLowerCase();
  
  // Determine opportunity size and segment
  if (description.includes('enterprise') || description.includes('fortune') || description.includes('global')) {
    characteristics.opportunitySize = 'enterprise';
    characteristics.customerSegment = 'enterprise';
  } else if (description.includes('startup') || description.includes('small') || description.includes('smb')) {
    characteristics.opportunitySize = 'smb';
    characteristics.customerSegment = 'smb';
  }

  // Analyze complexity indicators
  const complexityIndicators = [
    'migration', 'multi-cloud', 'hybrid', 'compliance', 'security', 
    'integration', 'modernization', 'transformation', 'microservices'
  ];
  const complexityScore = complexityIndicators.reduce((score, indicator) => {
    return score + (description.includes(indicator) ? 1 : 0);
  }, 0);

  if (complexityScore >= 4) {
    characteristics.complexity = 'high';
  } else if (complexityScore >= 2) {
    characteristics.complexity = 'medium';
  } else {
    characteristics.complexity = 'low';
  }

  // Determine industry vertical
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

  // Analyze historical data quality
  try {
    const queryResults = typeof params.queryResults === 'string' 
      ? JSON.parse(params.queryResults) 
      : params.queryResults;
    
    if (queryResults && queryResults.data && Array.isArray(queryResults.data)) {
      characteristics.historicalDataPoints = queryResults.data.length;
      
      if (queryResults.data.length >= 10) {
        characteristics.dataQuality = 'high';
      } else if (queryResults.data.length >= 5) {
        characteristics.dataQuality = 'medium';
      } else {
        characteristics.dataQuality = 'low';
      }
    }
  } catch (error) {
    console.warn('Error analyzing query results for data quality:', error.message);
  }

  // Estimate predicted ARR for model selection
  if (characteristics.opportunitySize === 'enterprise') {
    characteristics.predictedArr = 2000000; // High value
  } else if (characteristics.opportunitySize === 'medium') {
    characteristics.predictedArr = 500000; // Medium value
  } else {
    characteristics.predictedArr = 100000; // Lower value
  }

  return characteristics;
}

/**
 * Determine the best analysis type based on characteristics
 */
function determineAnalysisType(characteristics) {
  // Use Nova Premier for high-value, complex opportunities
  if (characteristics.opportunitySize === 'enterprise' || 
      characteristics.complexity === 'high' || 
      characteristics.predictedArr > 1000000) {
    return 'analysis'; // Will select Nova Premier via business rules
  }
  
  // Use standard analysis for simpler opportunities
  return 'analysis';
}

/**
 * Enhance query results with RAG processing
 */
async function enhanceWithRAG(queryResults, characteristics) {
  try {
    const parsedResults = typeof queryResults === 'string' 
      ? JSON.parse(queryResults) 
      : queryResults;

    if (!parsedResults || !parsedResults.data) {
      return queryResults;
    }

    // Enhance with industry-specific context
    const industryContext = getIndustryContext(characteristics.industry);
    
    // Enhance with regional context
    const regionalContext = getRegionalContext(characteristics.region);
    
    // Enhance with complexity-specific insights
    const complexityContext = getComplexityContext(characteristics.complexity);

    // Add enhanced metadata to results
    const enhancedResults = {
      ...parsedResults,
      enhancedContext: {
        industry: industryContext,
        regional: regionalContext,
        complexity: complexityContext,
        dataQuality: characteristics.dataQuality,
        enhancementTimestamp: new Date().toISOString()
      }
    };

    console.log('Enhanced query results with RAG context');
    return JSON.stringify(enhancedResults);
  } catch (error) {
    console.warn('Error enhancing with RAG, using original results:', error.message);
    return queryResults;
  }
}

/**
 * Get industry-specific context for RAG enhancement
 */
function getIndustryContext(industry) {
  const industryContexts = {
    'financial': {
      keyServices: ['AWS PrivateLink', 'AWS CloudHSM', 'Amazon GuardDuty', 'AWS Config'],
      complianceRequirements: ['PCI DSS', 'SOX', 'GDPR'],
      typicalTimelines: '12-18 months',
      riskFactors: ['Regulatory compliance', 'Data security', 'High availability requirements']
    },
    'healthcare': {
      keyServices: ['AWS HIPAA Eligible Services', 'Amazon Comprehend Medical', 'AWS PrivateLink'],
      complianceRequirements: ['HIPAA', 'HITECH', 'FDA'],
      typicalTimelines: '18-24 months',
      riskFactors: ['HIPAA compliance', 'Patient data security', 'Integration complexity']
    },
    'retail': {
      keyServices: ['Amazon Personalize', 'AWS Lambda', 'Amazon DynamoDB', 'Amazon CloudFront'],
      complianceRequirements: ['PCI DSS', 'GDPR'],
      typicalTimelines: '6-12 months',
      riskFactors: ['Seasonal traffic spikes', 'Payment processing', 'Customer experience']
    },
    'manufacturing': {
      keyServices: ['AWS IoT Core', 'Amazon SageMaker', 'AWS Greengrass', 'Amazon Timestream'],
      complianceRequirements: ['ISO 27001', 'SOC 2'],
      typicalTimelines: '12-18 months',
      riskFactors: ['Legacy system integration', 'Operational downtime', 'Supply chain dependencies']
    }
  };

  return industryContexts[industry] || {
    keyServices: ['Amazon EC2', 'Amazon S3', 'AWS Lambda'],
    complianceRequirements: ['SOC 2'],
    typicalTimelines: '6-12 months',
    riskFactors: ['Integration complexity', 'Change management']
  };
}

/**
 * Get regional context for RAG enhancement
 */
function getRegionalContext(region) {
  const regionalContexts = {
    'us-east-1': {
      advantages: ['Lowest latency for US East Coast', 'Most AWS services available', 'Lowest costs'],
      considerations: ['High demand region', 'Potential for resource constraints']
    },
    'us-west-2': {
      advantages: ['Good for US West Coast', 'Strong availability', 'Tech hub proximity'],
      considerations: ['Slightly higher costs than us-east-1']
    },
    'eu-west-1': {
      advantages: ['GDPR compliance', 'European data residency', 'Strong connectivity'],
      considerations: ['Data transfer costs', 'Regulatory requirements']
    }
  };

  return regionalContexts[region] || {
    advantages: ['Regional data residency', 'Local compliance'],
    considerations: ['Service availability', 'Latency considerations']
  };
}

/**
 * Get complexity-specific context
 */
function getComplexityContext(complexity) {
  const complexityContexts = {
    'high': {
      recommendedApproach: 'Phased migration with extensive testing',
      additionalServices: ['AWS Migration Hub', 'AWS Application Discovery Service', 'AWS Database Migration Service'],
      timelineMultiplier: 1.5,
      riskMitigation: 'Comprehensive testing, rollback plans, parallel running'
    },
    'medium': {
      recommendedApproach: 'Standard migration with validation phases',
      additionalServices: ['AWS CloudFormation', 'AWS Systems Manager'],
      timelineMultiplier: 1.2,
      riskMitigation: 'Standard testing, backup procedures'
    },
    'low': {
      recommendedApproach: 'Direct migration with basic validation',
      additionalServices: ['AWS CloudFormation'],
      timelineMultiplier: 1.0,
      riskMitigation: 'Basic testing, standard procedures'
    }
  };

  return complexityContexts[complexity] || complexityContexts['medium'];
}

/**
 * Prepare enhanced payload with RAG context
 */
function prepareEnhancedPayload(params, promptData, enhancedQueryResults, characteristics) {
  try {
    const modelId = promptData.variants[0].modelId;
    const userMessageTemplate = promptData.variants[0].templateConfiguration.chat.messages[0].content[0].text;
    const systemInstructions = promptData.variants[0].templateConfiguration.chat.system[0].text;

    // Enhanced system instructions with RAG context
    const enhancedSystemInstructions = `${systemInstructions}

ENHANCED CONTEXT:
- Industry: ${characteristics.industry}
- Complexity Level: ${characteristics.complexity}
- Data Quality: ${characteristics.dataQuality}
- Historical Data Points: ${characteristics.historicalDataPoints}
- Opportunity Size: ${characteristics.opportunitySize}

Use this context to provide more accurate and industry-specific analysis.`;

    // Enhanced user message with additional context
    const filledUserMessage = userMessageTemplate
      .replace('{{CustomerName}}', params.CustomerName || 'Not specified')
      .replace('{{region}}', params.region || 'Not specified')
      .replace('{{closeDate}}', params.closeDate || 'Not specified')
      .replace('{{oppName}}', params.oppName || 'Not specified')
      .replace('{{oppDescription}}', params.oppDescription || 'Not specified')
      .replace('{{queryResults}}', enhancedQueryResults)
      .replace('{{analysisContext}}', JSON.stringify(characteristics, null, 2));

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
        temperature: 0.1
      }
    };
  } catch (error) {
    console.error('Error preparing enhanced payload:', error);
    throw new Error('Failed to prepare enhanced Bedrock payload: ' + error.message);
  }
}

/**
 * Invoke Bedrock with comprehensive monitoring
 */
async function invokeBedrockWithMonitoring(payload) {
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const command = new ConverseCommand(payload);
      const response = await bedrockRuntime.send(command);
      
      if (attempt > 1) {
        console.log(`Enhanced analysis succeeded on attempt ${attempt}`);
      }
      
      return response;
    } catch (error) {
      lastError = error;
      console.error(`Enhanced analysis attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Enhanced analysis failed after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Process analysis response with advanced validation
 */
function processAnalysisResponse(response, characteristics) {
  console.log("Enhanced Analysis Processing: Starting validation");
  
  if (!response || !response.output || !response.output.message || !response.output.message.content || !response.output.message.content[0] || !response.output.message.content[0].text) {
    throw new Error("Invalid Bedrock response structure for enhanced analysis");
  }
  
  const messageContentText = response.output.message.content[0].text;
  console.log("Enhanced analysis content length:", messageContentText.length);
  
  try {
    // Enhanced parsing with industry-specific validation
    const results = parseAnalysisContent(messageContentText, characteristics);
    
    // Validate results against industry benchmarks
    validateAgainstBenchmarks(results, characteristics);
    
    return results;
  } catch (error) {
    console.error("Error processing enhanced analysis:", error.message);
    throw new Error(`Failed to process enhanced analysis: ${error.message}`);
  }
}

/**
 * Parse analysis content with enhanced extraction
 */
function parseAnalysisContent(messageContent, characteristics) {
  // Extract metrics section with enhanced patterns
  const metricsMatch = messageContent.match(/===\s*METRICS\s*===\s*([\s\S]*?)(?===\s*|$)/i);
  const metricsText = metricsMatch ? metricsMatch[1].trim() : '';
  
  // Extract similar projects with enhanced parsing
  const similarProjectsMatch = messageContent.match(/===\s*SIMILAR\s*PROJECTS\s*===\s*([\s\S]*?)(?===\s*|$)/i);
  const similarProjectsText = similarProjectsMatch ? similarProjectsMatch[1].trim() : '';
  
  // Enhanced metric extraction with multiple patterns
  const arrMatch = metricsText.match(/(?:Predicted|Estimated)\s*ARR:\s*\$?([\d,]+(?:\.\d{2})?)/i);
  const mrrMatch = metricsText.match(/(?:Predicted|Estimated)\s*MRR:\s*\$?([\d,]+(?:\.\d{2})?)/i);
  const launchDateMatch = metricsText.match(/(?:Estimated\s*Launch\s*Date|Launch\s*Date):\s*([^\n]+)/i);
  const durationMatch = metricsText.match(/(?:Project\s*Duration|Duration):\s*([^\n]+)/i);
  const confidenceMatch = metricsText.match(/Confidence:\s*(HIGH|MEDIUM|LOW)/i);
  
  // Enhanced services extraction
  const servicesMatch = metricsText.match(/Top\s*Services:\s*([\s\S]*?)(?=\n\s*\n|Confidence:|$)/i);
  const servicesText = servicesMatch ? servicesMatch[1].trim() : '';

  // Extract additional sections
  const methodologyMatch = messageContent.match(/===\s*METHODOLOGY\s*===\s*([\s\S]*?)(?===\s*|$)/i);
  const findingsMatch = messageContent.match(/===\s*FINDINGS\s*===\s*([\s\S]*?)(?===\s*|$)/i);
  const rationaleMatch = messageContent.match(/===\s*RATIONALE\s*===\s*([\s\S]*?)(?===\s*|$)/i);
  const riskMatch = messageContent.match(/===\s*RISK\s*FACTORS\s*===\s*([\s\S]*?)(?===\s*|$)/i);

  return {
    metrics: {
      predictedArr: arrMatch ? formatCurrency(arrMatch[1]) : 'Not available',
      predictedMrr: mrrMatch ? formatCurrency(mrrMatch[1]) : 'Not available',
      launchDate: launchDateMatch ? launchDateMatch[1].trim() : 'Not available',
      predictedProjectDuration: durationMatch ? durationMatch[1].trim() : 'Not available',
      confidence: confidenceMatch ? confidenceMatch[1].toUpperCase() : 'MEDIUM',
      topServices: servicesText || 'No services data available'
    },
    sections: {
      analysisMethodology: methodologyMatch ? methodologyMatch[1].trim() : 'Standard analysis methodology applied',
      similarProjectsRaw: similarProjectsText || 'No similar projects found',
      detailedFindings: findingsMatch ? findingsMatch[1].trim() : 'Analysis findings not available',
      predictionRationale: rationaleMatch ? rationaleMatch[1].trim() : 'Rationale not available',
      riskFactors: riskMatch ? riskMatch[1].trim() : 'Risk factors not identified'
    },
    formattedSummaryText: messageContent,
    enhancedAnalysis: true
  };
}

/**
 * Validate results against industry benchmarks
 */
function validateAgainstBenchmarks(results, characteristics) {
  const warnings = [];
  
  // Validate ARR against industry benchmarks
  const arrValue = parseCurrency(results.metrics.predictedArr);
  if (arrValue > 0) {
    const industryBenchmarks = getIndustryBenchmarks(characteristics.industry);
    
    if (arrValue < industryBenchmarks.minArr) {
      warnings.push(`Predicted ARR (${results.metrics.predictedArr}) is below industry minimum`);
    }
    if (arrValue > industryBenchmarks.maxArr) {
      warnings.push(`Predicted ARR (${results.metrics.predictedArr}) exceeds typical industry maximum`);
    }
  }
  
  // Validate timeline against complexity
  const duration = results.metrics.predictedProjectDuration;
  if (duration && characteristics.complexity === 'high' && !duration.includes('18')) {
    warnings.push('Timeline may be optimistic for high complexity project');
  }
  
  if (warnings.length > 0) {
    console.warn('Validation warnings:', warnings);
    results.validationWarnings = warnings;
  }
}

/**
 * Get industry benchmarks for validation
 */
function getIndustryBenchmarks(industry) {
  const benchmarks = {
    'financial': { minArr: 500000, maxArr: 10000000 },
    'healthcare': { minArr: 300000, maxArr: 5000000 },
    'retail': { minArr: 200000, maxArr: 3000000 },
    'manufacturing': { minArr: 400000, maxArr: 8000000 },
    'government': { minArr: 1000000, maxArr: 20000000 }
  };
  
  return benchmarks[industry] || { minArr: 100000, maxArr: 5000000 };
}

/**
 * Format currency values
 */
function formatCurrency(value) {
  const numValue = typeof value === 'string' ? value.replace(/,/g, '') : value;
  return `$${Number(numValue).toLocaleString()}`;
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
 * Record comprehensive analysis metrics
 */
async function recordAnalysisMetrics(promptId, analysisType, responseTime, results, characteristics) {
  try {
    const qualityScore = calculateAnalysisQuality(results, characteristics);
    const confidenceScore = getConfidenceScore(results.metrics.confidence);
    
    const metrics = {
      response_time: responseTime,
      analysis_quality: qualityScore,
      confidence_score: confidenceScore,
      success_rate: results.metrics.predictedArr !== 'Error' ? 100 : 0,
      complexity_handled: getComplexityScore(characteristics.complexity),
      data_quality_score: getDataQualityScore(characteristics.dataQuality)
    };

    await promptManager.recordPromptPerformance(analysisType, promptId, metrics);
    
    console.log(`Recorded enhanced analysis metrics for ${analysisType} prompt ${promptId}:`, metrics);
  } catch (error) {
    console.error('Error recording analysis metrics:', error);
  }
}

/**
 * Record error metrics for analysis
 */
async function recordAnalysisErrorMetrics(promptId, error, responseTime) {
  try {
    const metrics = {
      response_time: responseTime,
      success_rate: 0,
      error_type: error.name || 'UnknownError',
      analysis_quality: 0
    };

    await promptManager.recordPromptPerformance('analysis', promptId, metrics);
  } catch (recordError) {
    console.error('Error recording analysis error metrics:', recordError);
  }
}

/**
 * Calculate analysis quality score
 */
function calculateAnalysisQuality(results, characteristics) {
  let score = 50; // Base score
  
  // Check for completeness
  if (results.metrics.predictedArr !== 'Not available') score += 15;
  if (results.metrics.predictedMrr !== 'Not available') score += 15;
  if (results.metrics.launchDate !== 'Not available') score += 10;
  if (results.metrics.topServices !== 'No services data available') score += 10;
  
  // Check for detailed sections
  if (results.sections.detailedFindings !== 'Analysis findings not available') score += 5;
  if (results.sections.predictionRationale !== 'Rationale not available') score += 5;
  
  // Bonus for enhanced analysis
  if (results.enhancedAnalysis) score += 10;
  
  // Penalty for validation warnings
  if (results.validationWarnings && results.validationWarnings.length > 0) {
    score -= results.validationWarnings.length * 5;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Get confidence score for metrics
 */
function getConfidenceScore(confidence) {
  const scores = { HIGH: 90, MEDIUM: 70, LOW: 40, ERROR: 0 };
  return scores[confidence] || 50;
}

/**
 * Get complexity score for metrics
 */
function getComplexityScore(complexity) {
  const scores = { low: 1, medium: 2, high: 3 };
  return scores[complexity] || 2;
}

/**
 * Get data quality score for metrics
 */
function getDataQualityScore(dataQuality) {
  const scores = { high: 3, medium: 2, low: 1 };
  return scores[dataQuality] || 2;
}

module.exports = { execute: exports.execute, promptManager };