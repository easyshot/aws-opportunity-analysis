/**
 * Prompt Analytics Service
 * Provides comprehensive analytics and monitoring for Bedrock prompt performance
 */

const { cloudWatch } = require('../config/aws-config-v3');
const { GetMetricStatisticsCommand, GetMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

class PromptAnalyticsService {
  constructor() {
    this.namespace = 'AWS/BedrockPrompts';
    this.analyticsCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get comprehensive analytics for all prompt types
   */
  async getComprehensiveAnalytics(timeRange = 24 * 60 * 60 * 1000) { // 24 hours default
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - timeRange);
      
      const analytics = {
        overview: await this.getOverviewMetrics(startTime, endTime),
        promptTypes: {
          'query-generation': await this.getPromptTypeAnalytics('query-generation', startTime, endTime),
          'analysis': await this.getPromptTypeAnalytics('analysis', startTime, endTime),
          'funding-analysis': await this.getPromptTypeAnalytics('funding-analysis', startTime, endTime),
          'follow-on-analysis': await this.getPromptTypeAnalytics('follow-on-analysis', startTime, endTime)
        },
        abTestResults: await this.getABTestResults(startTime, endTime),
        recommendations: this.generateOptimizationRecommendations()
      };

      return analytics;
    } catch (error) {
      console.error('Error getting comprehensive analytics:', error);
      throw new Error(`Failed to get analytics: ${error.message}`);
    }
  }

  /**
   * Get overview metrics across all prompt types
   */
  async getOverviewMetrics(startTime, endTime) {
    try {
      const metrics = await this.getMetricData([
        {
          Id: 'total_requests',
          MetricStat: {
            Metric: {
              Namespace: this.namespace,
              MetricName: 'selection_count'
            },
            Period: 3600, // 1 hour
            Stat: 'Sum'
          }
        },
        {
          Id: 'avg_response_time',
          MetricStat: {
            Metric: {
              Namespace: this.namespace,
              MetricName: 'response_time'
            },
            Period: 3600,
            Stat: 'Average'
          }
        },
        {
          Id: 'success_rate',
          MetricStat: {
            Metric: {
              Namespace: this.namespace,
              MetricName: 'success_rate'
            },
            Period: 3600,
            Stat: 'Average'
          }
        }
      ], startTime, endTime);

      return {
        totalRequests: this.sumMetricValues(metrics.total_requests),
        averageResponseTime: this.averageMetricValues(metrics.avg_response_time),
        overallSuccessRate: this.averageMetricValues(metrics.success_rate),
        timeRange: {
          start: startTime.toISOString(),
          end: endTime.toISOString()
        }
      };
    } catch (error) {
      console.error('Error getting overview metrics:', error);
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        overallSuccessRate: 0,
        error: error.message
      };
    }
  }

  /**
   * Get analytics for a specific prompt type
   */
  async getPromptTypeAnalytics(promptType, startTime, endTime) {
    try {
      const cacheKey = `${promptType}_${startTime.getTime()}_${endTime.getTime()}`;
      
      if (this.analyticsCache.has(cacheKey)) {
        const cached = this.analyticsCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      const metrics = await this.getMetricData([
        {
          Id: 'requests',
          MetricStat: {
            Metric: {
              Namespace: this.namespace,
              MetricName: 'selection_count',
              Dimensions: [{ Name: 'PromptType', Value: promptType }]
            },
            Period: 3600,
            Stat: 'Sum'
          }
        },
        {
          Id: 'response_time',
          MetricStat: {
            Metric: {
              Namespace: this.namespace,
              MetricName: 'response_time',
              Dimensions: [{ Name: 'PromptType', Value: promptType }]
            },
            Period: 3600,
            Stat: 'Average'
          }
        },
        {
          Id: 'quality_score',
          MetricStat: {
            Metric: {
              Namespace: this.namespace,
              MetricName: this.getQualityMetricName(promptType),
              Dimensions: [{ Name: 'PromptType', Value: promptType }]
            },
            Period: 3600,
            Stat: 'Average'
          }
        },
        {
          Id: 'success_rate',
          MetricStat: {
            Metric: {
              Namespace: this.namespace,
              MetricName: 'success_rate',
              Dimensions: [{ Name: 'PromptType', Value: promptType }]
            },
            Period: 3600,
            Stat: 'Average'
          }
        }
      ], startTime, endTime);

      const analytics = {
        promptType,
        totalRequests: this.sumMetricValues(metrics.requests),
        averageResponseTime: this.averageMetricValues(metrics.response_time),
        averageQualityScore: this.averageMetricValues(metrics.quality_score),
        successRate: this.averageMetricValues(metrics.success_rate),
        trends: this.calculateTrends(metrics),
        performance: this.calculatePerformanceGrade(metrics)
      };

      // Cache the results
      this.analyticsCache.set(cacheKey, {
        data: analytics,
        timestamp: Date.now()
      });

      return analytics;
    } catch (error) {
      console.error(`Error getting analytics for ${promptType}:`, error);
      return {
        promptType,
        error: error.message,
        totalRequests: 0,
        averageResponseTime: 0,
        averageQualityScore: 0,
        successRate: 0
      };
    }
  }

  /**
   * Get A/B test results and performance comparison
   */
  async getABTestResults(startTime, endTime) {
    try {
      const abTestResults = {};
      const promptTypes = ['query-generation', 'analysis', 'funding-analysis', 'follow-on-analysis'];

      for (const promptType of promptTypes) {
        const variants = await this.getPromptVariantPerformance(promptType, startTime, endTime);
        if (variants.length > 1) {
          abTestResults[promptType] = {
            variants,
            winner: this.determineABTestWinner(variants),
            statisticalSignificance: this.calculateStatisticalSignificance(variants),
            recommendation: this.generateABTestRecommendation(variants)
          };
        }
      }

      return abTestResults;
    } catch (error) {
      console.error('Error getting A/B test results:', error);
      return { error: error.message };
    }
  }

  /**
   * Get performance data for prompt variants
   */
  async getPromptVariantPerformance(promptType, startTime, endTime) {
    try {
      // This would typically query CloudWatch for metrics grouped by PromptId dimension
      // For now, we'll simulate variant data based on the prompt type
      const variants = [];
      
      // Get unique prompt IDs for this type (this would come from actual CloudWatch data)
      const promptIds = await this.getPromptIdsForType(promptType);
      
      for (const promptId of promptIds) {
        const metrics = await this.getMetricData([
          {
            Id: 'requests',
            MetricStat: {
              Metric: {
                Namespace: this.namespace,
                MetricName: 'selection_count',
                Dimensions: [
                  { Name: 'PromptType', Value: promptType },
                  { Name: 'PromptId', Value: promptId }
                ]
              },
              Period: 3600,
              Stat: 'Sum'
            }
          },
          {
            Id: 'quality',
            MetricStat: {
              Metric: {
                Namespace: this.namespace,
                MetricName: this.getQualityMetricName(promptType),
                Dimensions: [
                  { Name: 'PromptType', Value: promptType },
                  { Name: 'PromptId', Value: promptId }
                ]
              },
              Period: 3600,
              Stat: 'Average'
            }
          }
        ], startTime, endTime);

        variants.push({
          promptId,
          requests: this.sumMetricValues(metrics.requests),
          qualityScore: this.averageMetricValues(metrics.quality),
          responseTime: Math.random() * 2000 + 1000, // Simulated for now
          successRate: Math.random() * 20 + 80 // Simulated for now
        });
      }

      return variants;
    } catch (error) {
      console.error(`Error getting variant performance for ${promptType}:`, error);
      return [];
    }
  }

  /**
   * Get prompt IDs for a specific type (simulated for now)
   */
  async getPromptIdsForType(promptType) {
    // In a real implementation, this would query CloudWatch or a database
    // For now, return simulated prompt IDs based on environment variables
    const promptIds = [];
    
    switch (promptType) {
      case 'query-generation':
        if (process.env.CATAPULT_QUERY_PROMPT_ID) promptIds.push(process.env.CATAPULT_QUERY_PROMPT_ID);
        if (process.env.CATAPULT_QUERY_PROMPT_ID_V2) promptIds.push(process.env.CATAPULT_QUERY_PROMPT_ID_V2);
        break;
      case 'analysis':
        if (process.env.CATAPULT_ANALYSIS_PROMPT_ID) promptIds.push(process.env.CATAPULT_ANALYSIS_PROMPT_ID);
        if (process.env.CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID) promptIds.push(process.env.CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID);
        break;
      case 'funding-analysis':
        if (process.env.CATAPULT_FUNDING_PROMPT_ID) promptIds.push(process.env.CATAPULT_FUNDING_PROMPT_ID);
        if (process.env.CATAPULT_FUNDING_PROMPT_ENHANCED_ID) promptIds.push(process.env.CATAPULT_FUNDING_PROMPT_ENHANCED_ID);
        break;
      case 'follow-on-analysis':
        if (process.env.CATAPULT_FOLLOWON_PROMPT_ID) promptIds.push(process.env.CATAPULT_FOLLOWON_PROMPT_ID);
        break;
    }
    
    return promptIds.filter(id => id); // Remove undefined values
  }

  /**
   * Get metric data from CloudWatch
   */
  async getMetricData(metricQueries, startTime, endTime) {
    try {
      const command = new GetMetricDataCommand({
        MetricDataQueries: metricQueries,
        StartTime: startTime,
        EndTime: endTime
      });

      const response = await cloudWatch.send(command);
      
      // Transform response into a more usable format
      const result = {};
      for (const metricResult of response.MetricDataResults || []) {
        result[metricResult.Id] = {
          values: metricResult.Values || [],
          timestamps: metricResult.Timestamps || []
        };
      }

      return result;
    } catch (error) {
      console.error('Error getting metric data from CloudWatch:', error);
      // Return empty data structure to prevent errors
      const result = {};
      for (const query of metricQueries) {
        result[query.Id] = { values: [], timestamps: [] };
      }
      return result;
    }
  }

  /**
   * Get quality metric name for a prompt type
   */
  getQualityMetricName(promptType) {
    const qualityMetrics = {
      'query-generation': 'query_quality',
      'analysis': 'analysis_quality',
      'funding-analysis': 'funding_accuracy',
      'follow-on-analysis': 'opportunity_relevance'
    };
    
    return qualityMetrics[promptType] || 'quality_score';
  }

  /**
   * Sum metric values
   */
  sumMetricValues(metricData) {
    if (!metricData || !metricData.values) return 0;
    return metricData.values.reduce((sum, value) => sum + value, 0);
  }

  /**
   * Average metric values
   */
  averageMetricValues(metricData) {
    if (!metricData || !metricData.values || metricData.values.length === 0) return 0;
    return metricData.values.reduce((sum, value) => sum + value, 0) / metricData.values.length;
  }

  /**
   * Calculate trends from metric data
   */
  calculateTrends(metrics) {
    const trends = {};
    
    for (const [metricName, metricData] of Object.entries(metrics)) {
      if (metricData.values && metricData.values.length >= 2) {
        const firstHalf = metricData.values.slice(0, Math.floor(metricData.values.length / 2));
        const secondHalf = metricData.values.slice(Math.floor(metricData.values.length / 2));
        
        const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
        
        const change = ((secondAvg - firstAvg) / firstAvg) * 100;
        
        trends[metricName] = {
          direction: change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable',
          changePercent: Math.round(change * 100) / 100
        };
      } else {
        trends[metricName] = { direction: 'insufficient_data', changePercent: 0 };
      }
    }
    
    return trends;
  }

  /**
   * Calculate performance grade
   */
  calculatePerformanceGrade(metrics) {
    let score = 0;
    let factors = 0;
    
    // Response time score (lower is better)
    const avgResponseTime = this.averageMetricValues(metrics.response_time);
    if (avgResponseTime > 0) {
      score += avgResponseTime < 1000 ? 25 : avgResponseTime < 2000 ? 20 : avgResponseTime < 3000 ? 15 : 10;
      factors++;
    }
    
    // Quality score
    const avgQuality = this.averageMetricValues(metrics.quality_score);
    if (avgQuality > 0) {
      score += avgQuality >= 80 ? 25 : avgQuality >= 70 ? 20 : avgQuality >= 60 ? 15 : 10;
      factors++;
    }
    
    // Success rate
    const successRate = this.averageMetricValues(metrics.success_rate);
    if (successRate > 0) {
      score += successRate >= 95 ? 25 : successRate >= 90 ? 20 : successRate >= 85 ? 15 : 10;
      factors++;
    }
    
    // Volume score (more requests indicate trust/usage)
    const totalRequests = this.sumMetricValues(metrics.requests);
    if (totalRequests > 0) {
      score += totalRequests >= 100 ? 25 : totalRequests >= 50 ? 20 : totalRequests >= 20 ? 15 : 10;
      factors++;
    }
    
    const finalScore = factors > 0 ? score / factors : 0;
    
    if (finalScore >= 22) return 'A';
    if (finalScore >= 18) return 'B';
    if (finalScore >= 14) return 'C';
    if (finalScore >= 10) return 'D';
    return 'F';
  }

  /**
   * Determine A/B test winner
   */
  determineABTestWinner(variants) {
    if (variants.length < 2) return null;
    
    // Score each variant based on multiple factors
    const scoredVariants = variants.map(variant => ({
      ...variant,
      score: this.calculateVariantScore(variant)
    }));
    
    // Sort by score (highest first)
    scoredVariants.sort((a, b) => b.score - a.score);
    
    return {
      winningPromptId: scoredVariants[0].promptId,
      winningScore: scoredVariants[0].score,
      margin: scoredVariants[0].score - (scoredVariants[1]?.score || 0),
      confidence: this.calculateWinnerConfidence(scoredVariants)
    };
  }

  /**
   * Calculate variant score for A/B testing
   */
  calculateVariantScore(variant) {
    let score = 0;
    
    // Quality score (40% weight)
    score += (variant.qualityScore || 0) * 0.4;
    
    // Success rate (30% weight)
    score += (variant.successRate || 0) * 0.3;
    
    // Response time score (20% weight) - lower is better
    const responseTimeScore = Math.max(0, 100 - (variant.responseTime || 0) / 50);
    score += responseTimeScore * 0.2;
    
    // Volume bonus (10% weight) - more usage indicates preference
    const volumeScore = Math.min(100, (variant.requests || 0) / 10);
    score += volumeScore * 0.1;
    
    return Math.round(score * 100) / 100;
  }

  /**
   * Calculate winner confidence
   */
  calculateWinnerConfidence(scoredVariants) {
    if (scoredVariants.length < 2) return 'low';
    
    const margin = scoredVariants[0].score - scoredVariants[1].score;
    const totalRequests = scoredVariants.reduce((sum, v) => sum + (v.requests || 0), 0);
    
    if (margin > 10 && totalRequests > 100) return 'high';
    if (margin > 5 && totalRequests > 50) return 'medium';
    return 'low';
  }

  /**
   * Calculate statistical significance
   */
  calculateStatisticalSignificance(variants) {
    // Simplified statistical significance calculation
    // In a real implementation, you'd use proper statistical tests
    if (variants.length < 2) return 'insufficient_data';
    
    const totalRequests = variants.reduce((sum, v) => sum + (v.requests || 0), 0);
    const maxMargin = Math.max(...variants.map(v => v.qualityScore || 0)) - 
                     Math.min(...variants.map(v => v.qualityScore || 0));
    
    if (totalRequests > 200 && maxMargin > 10) return 'significant';
    if (totalRequests > 100 && maxMargin > 5) return 'moderate';
    return 'not_significant';
  }

  /**
   * Generate A/B test recommendation
   */
  generateABTestRecommendation(variants) {
    if (variants.length < 2) return 'Need at least 2 variants for A/B testing';
    
    const winner = this.determineABTestWinner(variants);
    const significance = this.calculateStatisticalSignificance(variants);
    
    if (significance === 'significant' && winner.confidence === 'high') {
      return `Recommend switching to prompt ${winner.winningPromptId} - shows ${winner.margin.toFixed(1)} point improvement with high confidence`;
    } else if (significance === 'moderate') {
      return `Continue testing - ${winner.winningPromptId} shows promise but needs more data for confident decision`;
    } else {
      return 'Continue current A/B test - no clear winner yet, need more data';
    }
  }

  /**
   * Generate optimization recommendations
   */
  generateOptimizationRecommendations() {
    return [
      {
        category: 'Performance',
        recommendation: 'Monitor response times and consider prompt optimization for queries taking >2 seconds',
        priority: 'medium'
      },
      {
        category: 'Quality',
        recommendation: 'Review prompts with quality scores <70 for potential improvements',
        priority: 'high'
      },
      {
        category: 'A/B Testing',
        recommendation: 'Ensure sufficient traffic volume (>50 requests) before making A/B test decisions',
        priority: 'medium'
      },
      {
        category: 'Monitoring',
        recommendation: 'Set up alerts for success rates dropping below 90%',
        priority: 'high'
      }
    ];
  }

  /**
   * Clear analytics cache
   */
  clearCache() {
    this.analyticsCache.clear();
    console.log('Analytics cache cleared');
  }
}

module.exports = PromptAnalyticsService;