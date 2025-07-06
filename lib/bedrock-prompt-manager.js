/**
 * Advanced Bedrock Prompt Management Service
 * Handles prompt templates, versioning, A/B testing, and performance monitoring
 */

const { bedrockAgent, bedrockRuntime, cloudWatch } = require('../config/aws-config-v3');
const { 
  GetPromptCommand, 
  ListPromptsCommand,
  CreatePromptVersionCommand,
  GetPromptVersionCommand,
  ListPromptVersionsCommand
} = require('@aws-sdk/client-bedrock-agent');
const { PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

class BedrockPromptManager {
  constructor() {
    this.promptCache = new Map();
    this.performanceMetrics = new Map();
    this.abTestConfigs = new Map();
    
    // Initialize A/B test configurations
    this.initializeABTestConfigs();
  }

  /**
   * Initialize A/B test configurations for different prompt types
   */
  initializeABTestConfigs() {
    // Query generation A/B test
    this.abTestConfigs.set('query-generation', {
      enabled: true,
      variants: [
        { promptId: process.env.CATAPULT_QUERY_PROMPT_ID, weight: 70, version: 'standard' },
        { promptId: process.env.CATAPULT_QUERY_PROMPT_ID_V2, weight: 30, version: 'optimized' }
      ],
      metrics: ['response_time', 'query_quality', 'success_rate']
    });

    // Analysis A/B test
    this.abTestConfigs.set('analysis', {
      enabled: true,
      variants: [
        { promptId: process.env.CATAPULT_ANALYSIS_PROMPT_ID, weight: 50, version: 'titan' },
        { promptId: process.env.CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID, weight: 50, version: 'nova-premier' }
      ],
      metrics: ['response_time', 'analysis_quality', 'confidence_score']
    });

    // Funding analysis A/B test
    this.abTestConfigs.set('funding-analysis', {
      enabled: true,
      variants: [
        { promptId: process.env.CATAPULT_FUNDING_PROMPT_ID, weight: 60, version: 'standard' },
        { promptId: process.env.CATAPULT_FUNDING_PROMPT_ENHANCED_ID, weight: 40, version: 'enhanced' }
      ],
      metrics: ['response_time', 'funding_accuracy', 'recommendation_quality']
    });

    // Follow-on opportunity A/B test
    this.abTestConfigs.set('follow-on-analysis', {
      enabled: true,
      variants: [
        { promptId: process.env.CATAPULT_FOLLOWON_PROMPT_ID, weight: 100, version: 'standard' }
      ],
      metrics: ['response_time', 'opportunity_relevance', 'prediction_accuracy']
    });
  }

  /**
   * Get optimal prompt based on opportunity characteristics and A/B testing
   */
  async getOptimalPrompt(promptType, opportunityCharacteristics = {}) {
    try {
      const startTime = Date.now();
      
      // Dynamic prompt selection based on opportunity characteristics
      const selectedPromptId = await this.selectPromptDynamically(promptType, opportunityCharacteristics);
      
      // Get prompt with caching
      const prompt = await this.getPromptWithCache(selectedPromptId);
      
      // Record selection metrics
      await this.recordPromptSelection(promptType, selectedPromptId, Date.now() - startTime);
      
      return {
        prompt,
        promptId: selectedPromptId,
        selectionReason: this.getSelectionReason(promptType, opportunityCharacteristics)
      };
    } catch (error) {
      console.error('Error getting optimal prompt:', error);
      throw new Error(`Failed to get optimal prompt for ${promptType}: ${error.message}`);
    }
  }

  /**
   * Dynamic prompt selection based on opportunity characteristics
   */
  async selectPromptDynamically(promptType, characteristics) {
    const abTestConfig = this.abTestConfigs.get(promptType);
    
    if (!abTestConfig || !abTestConfig.enabled) {
      return this.getDefaultPromptId(promptType);
    }

    // Apply business rules for dynamic selection
    const selectedVariant = this.applyBusinessRules(promptType, characteristics, abTestConfig);
    
    if (selectedVariant) {
      return selectedVariant.promptId;
    }

    // Fall back to A/B testing
    return this.selectPromptByWeight(abTestConfig.variants);
  }

  /**
   * Apply business rules for prompt selection
   */
  applyBusinessRules(promptType, characteristics, abTestConfig) {
    const { region, customerSegment, opportunitySize, complexity } = characteristics;

    switch (promptType) {
      case 'query-generation':
        // Use optimized prompt for complex opportunities
        if (complexity === 'high' || opportunitySize === 'enterprise') {
          return abTestConfig.variants.find(v => v.version === 'optimized');
        }
        break;

      case 'analysis':
        // Use Nova Premier for high-value opportunities
        if (opportunitySize === 'enterprise' || characteristics.predictedArr > 1000000) {
          return abTestConfig.variants.find(v => v.version === 'nova-premier');
        }
        // Use standard for smaller opportunities
        if (opportunitySize === 'smb') {
          return abTestConfig.variants.find(v => v.version === 'titan');
        }
        break;

      case 'funding-analysis':
        // Use enhanced prompt for enterprise customers
        if (customerSegment === 'enterprise' || opportunitySize === 'large') {
          return abTestConfig.variants.find(v => v.version === 'enhanced');
        }
        break;
    }

    return null; // No specific rule matched, use A/B testing
  }

  /**
   * Select prompt variant based on weighted distribution
   */
  selectPromptByWeight(variants) {
    const totalWeight = variants.reduce((sum, variant) => sum + variant.weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (const variant of variants) {
      currentWeight += variant.weight;
      if (random <= currentWeight) {
        return variant.promptId;
      }
    }
    
    return variants[0].promptId; // Fallback
  }

  /**
   * Get prompt with caching
   */
  async getPromptWithCache(promptId) {
    const cacheKey = `prompt_${promptId}`;
    
    if (this.promptCache.has(cacheKey)) {
      const cached = this.promptCache.get(cacheKey);
      // Check if cache is still valid (5 minutes)
      if (Date.now() - cached.timestamp < 300000) {
        return cached.prompt;
      }
    }

    const prompt = await this.fetchPrompt(promptId);
    this.promptCache.set(cacheKey, {
      prompt,
      timestamp: Date.now()
    });

    return prompt;
  }

  /**
   * Fetch prompt from Bedrock Agent
   */
  async fetchPrompt(promptId) {
    try {
      const command = new GetPromptCommand({
        promptIdentifier: promptId
      });
      
      const response = await bedrockAgent.send(command);
      return response;
    } catch (error) {
      console.error('Error fetching prompt:', error);
      throw new Error(`Failed to fetch prompt ${promptId}: ${error.message}`);
    }
  }

  /**
   * Create new prompt version for A/B testing
   */
  async createPromptVersion(promptId, description = 'A/B test version') {
    try {
      const command = new CreatePromptVersionCommand({
        promptIdentifier: promptId,
        description
      });
      
      const response = await bedrockAgent.send(command);
      console.log(`Created prompt version: ${response.version} for prompt ${promptId}`);
      
      return response;
    } catch (error) {
      console.error('Error creating prompt version:', error);
      throw new Error(`Failed to create prompt version: ${error.message}`);
    }
  }

  /**
   * List all versions of a prompt
   */
  async listPromptVersions(promptId) {
    try {
      const command = new ListPromptVersionsCommand({
        promptIdentifier: promptId
      });
      
      const response = await bedrockAgent.send(command);
      return response.promptVersionSummaries || [];
    } catch (error) {
      console.error('Error listing prompt versions:', error);
      throw new Error(`Failed to list prompt versions: ${error.message}`);
    }
  }

  /**
   * Record prompt performance metrics
   */
  async recordPromptPerformance(promptType, promptId, metrics) {
    try {
      const metricData = [];
      
      // Record individual metrics
      for (const [metricName, value] of Object.entries(metrics)) {
        metricData.push({
          MetricName: metricName,
          Value: value,
          Unit: this.getMetricUnit(metricName),
          Dimensions: [
            { Name: 'PromptType', Value: promptType },
            { Name: 'PromptId', Value: promptId }
          ],
          Timestamp: new Date()
        });
      }

      // Send metrics to CloudWatch
      const command = new PutMetricDataCommand({
        Namespace: 'AWS/BedrockPrompts',
        MetricData: metricData
      });

      await cloudWatch.send(command);
      
      // Update local performance tracking
      const key = `${promptType}_${promptId}`;
      if (!this.performanceMetrics.has(key)) {
        this.performanceMetrics.set(key, []);
      }
      
      this.performanceMetrics.get(key).push({
        timestamp: Date.now(),
        metrics
      });

      console.log(`Recorded performance metrics for ${promptType} prompt ${promptId}`);
    } catch (error) {
      console.error('Error recording prompt performance:', error);
    }
  }

  /**
   * Get metric unit for CloudWatch
   */
  getMetricUnit(metricName) {
    const unitMap = {
      'response_time': 'Milliseconds',
      'success_rate': 'Percent',
      'confidence_score': 'None',
      'query_quality': 'None',
      'analysis_quality': 'None',
      'funding_accuracy': 'Percent',
      'recommendation_quality': 'None',
      'opportunity_relevance': 'None',
      'prediction_accuracy': 'Percent'
    };
    
    return unitMap[metricName] || 'None';
  }

  /**
   * Record prompt selection for analytics
   */
  async recordPromptSelection(promptType, promptId, selectionTime) {
    await this.recordPromptPerformance(promptType, promptId, {
      'selection_time': selectionTime,
      'selection_count': 1
    });
  }

  /**
   * Get selection reason for logging
   */
  getSelectionReason(promptType, characteristics) {
    const reasons = [];
    
    if (characteristics.complexity === 'high') {
      reasons.push('high_complexity');
    }
    if (characteristics.opportunitySize === 'enterprise') {
      reasons.push('enterprise_size');
    }
    if (characteristics.predictedArr > 1000000) {
      reasons.push('high_value');
    }
    
    return reasons.length > 0 ? reasons.join(',') : 'ab_test';
  }

  /**
   * Get default prompt ID for a type
   */
  getDefaultPromptId(promptType) {
    const defaultPrompts = {
      'query-generation': process.env.CATAPULT_QUERY_PROMPT_ID,
      'analysis': process.env.CATAPULT_ANALYSIS_PROMPT_ID,
      'analysis-nova': process.env.CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID,
      'funding-analysis': process.env.CATAPULT_FUNDING_PROMPT_ID,
      'follow-on-analysis': process.env.CATAPULT_FOLLOWON_PROMPT_ID
    };
    
    return defaultPrompts[promptType];
  }

  /**
   * Get performance analytics for a prompt type
   */
  getPerformanceAnalytics(promptType, timeRange = 24 * 60 * 60 * 1000) { // 24 hours default
    const analytics = {
      totalSelections: 0,
      averageResponseTime: 0,
      successRate: 0,
      variantPerformance: {}
    };

    const cutoffTime = Date.now() - timeRange;
    
    for (const [key, metrics] of this.performanceMetrics.entries()) {
      if (key.startsWith(promptType)) {
        const recentMetrics = metrics.filter(m => m.timestamp > cutoffTime);
        
        if (recentMetrics.length > 0) {
          const promptId = key.split('_')[1];
          analytics.variantPerformance[promptId] = {
            selections: recentMetrics.length,
            averageResponseTime: recentMetrics.reduce((sum, m) => sum + (m.metrics.response_time || 0), 0) / recentMetrics.length,
            successRate: recentMetrics.reduce((sum, m) => sum + (m.metrics.success_rate || 0), 0) / recentMetrics.length
          };
          
          analytics.totalSelections += recentMetrics.length;
        }
      }
    }

    return analytics;
  }

  /**
   * Update A/B test configuration
   */
  updateABTestConfig(promptType, config) {
    this.abTestConfigs.set(promptType, {
      ...this.abTestConfigs.get(promptType),
      ...config
    });
    
    console.log(`Updated A/B test config for ${promptType}:`, config);
  }

  /**
   * Clear prompt cache
   */
  clearCache() {
    this.promptCache.clear();
    console.log('Prompt cache cleared');
  }
}

module.exports = BedrockPromptManager;