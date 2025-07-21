const { CachingService } = require('../lib/caching-service');
const { BedrockAgentClient, GetPromptCommand } = require('@aws-sdk/client-bedrock-agent');
const { SSMClient, GetParametersCommand } = require('@aws-sdk/client-ssm');

class CacheWarmingService {
  constructor() {
    this.cachingService = new CachingService();
    this.bedrockAgent = new BedrockAgentClient({ region: process.env.AWS_REGION });
    this.ssm = new SSMClient({ region: process.env.AWS_REGION });
  }

  async handler(event, context) {
    console.log('Cache warming Lambda triggered:', JSON.stringify(event, null, 2));

    try {
      const warmingType = event.warmingType || 'full';
      const results = {};

      switch (warmingType) {
        case 'prompts':
          results.prompts = await this.warmPrompts();
          break;
        case 'popular':
          results.popular = await this.warmPopularAnalyses();
          break;
        case 'configuration':
          results.configuration = await this.warmConfiguration();
          break;
        case 'full':
        default:
          results.prompts = await this.warmPrompts();
          results.popular = await this.warmPopularAnalyses();
          results.configuration = await this.warmConfiguration();
          break;
      }

      // Health check
      results.health = await this.cachingService.healthCheck();
      results.stats = await this.cachingService.getStats();

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          warmingType,
          results,
          timestamp: new Date().toISOString(),
        }),
      };
    } catch (error) {
      console.error('Cache warming error:', error);
      
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        }),
      };
    }
  }

  async warmPrompts() {
    console.log('Warming prompt cache...');
    const results = [];

    try {
      // Get prompt IDs from environment or parameter store
      const promptIds = await this.getPromptIds();
      
      for (const promptId of promptIds) {
        try {
          // Check if prompt is already cached
          const cached = await this.cachingService.getCachedPrompt(promptId);
          
          if (!cached) {
            console.log(`Fetching and caching prompt: ${promptId}`);
            
            // Fetch prompt from Bedrock Agent
            const command = new GetPromptCommand({
              promptIdentifier: promptId,
            });
            
            const response = await this.bedrockAgent.send(command);
            
            // Cache the prompt
            await this.cachingService.cachePrompt(promptId, {
              id: response.id,
              name: response.name,
              description: response.description,
              variants: response.variants,
              createdAt: response.createdAt,
              updatedAt: response.updatedAt,
            });
            
            results.push({
              promptId,
              status: 'cached',
              size: JSON.stringify(response).length,
            });
          } else {
            results.push({
              promptId,
              status: 'already_cached',
            });
          }
        } catch (error) {
          console.error(`Error warming prompt ${promptId}:`, error);
          results.push({
            promptId,
            status: 'error',
            error: error.message,
          });
        }
      }
    } catch (error) {
      console.error('Error getting prompt IDs:', error);
      results.push({
        status: 'error',
        error: error.message,
      });
    }

    return results;
  }

  async warmPopularAnalyses() {
    console.log('Warming popular analysis cache...');
    const results = [];

    // Popular analysis patterns based on common use cases
    const popularPatterns = [
      {
        customerName: 'Enterprise Customer',
        region: 'us-east-1',
        description: 'Cloud migration project',
        analysisType: 'standard',
      },
      {
        customerName: 'Startup Company',
        region: 'us-west-2',
        description: 'Web application deployment',
        analysisType: 'standard',
      },
      {
        customerName: 'Financial Services',
        region: 'eu-west-1',
        description: 'Data analytics platform',
        analysisType: 'nova-premier',
      },
      {
        customerName: 'Healthcare Organization',
        region: 'us-east-1',
        description: 'HIPAA compliant infrastructure',
        analysisType: 'standard',
      },
      {
        customerName: 'E-commerce Platform',
        region: 'ap-southeast-1',
        description: 'Scalable web platform',
        analysisType: 'standard',
      },
    ];

    for (const pattern of popularPatterns) {
      try {
        // Check if analysis is already cached
        const cached = await this.cachingService.getCachedAnalysis(pattern, pattern.analysisType);
        
        if (!cached) {
          // Pre-generate cache key for popular patterns
          const key = this.cachingService.generateKey('analysis', {
            customer: pattern.customerName,
            region: pattern.region,
            type: pattern.analysisType,
            description: pattern.description.substring(0, 100),
          });
          
          // Cache a placeholder that indicates this is a popular pattern
          await this.cachingService.set(key, {
            isPopularPattern: true,
            pattern,
            preWarmed: true,
            timestamp: new Date().toISOString(),
          }, 1800); // 30 minutes for pre-warmed patterns
          
          results.push({
            pattern: pattern.customerName,
            region: pattern.region,
            status: 'pre_warmed',
          });
        } else {
          results.push({
            pattern: pattern.customerName,
            region: pattern.region,
            status: 'already_cached',
          });
        }
      } catch (error) {
        console.error(`Error warming pattern for ${pattern.customerName}:`, error);
        results.push({
          pattern: pattern.customerName,
          region: pattern.region,
          status: 'error',
          error: error.message,
        });
      }
    }

    return results;
  }

  async warmConfiguration() {
    console.log('Warming configuration cache...');
    const results = [];

    try {
      // Cache common configuration data
      const configKeys = [
        '/opportunity-analysis/config/aws-region',
        '/opportunity-analysis/config/athena-database',
        '/opportunity-analysis/config/athena-output-location',
        '/opportunity-analysis/config/lambda-function-name',
        '/opportunity-analysis/config/redis-endpoint',
        '/opportunity-analysis/config/redis-port',
      ];

      // Fetch configuration from Parameter Store
      const command = new GetParametersCommand({
        Names: configKeys,
        WithDecryption: true,
      });

      const response = await this.ssm.send(command);
      
      // Cache each configuration parameter
      for (const param of response.Parameters || []) {
        const key = this.cachingService.generateKey('config', param.Name);
        
        await this.cachingService.set(key, {
          name: param.Name,
          value: param.Value,
          type: param.Type,
          lastModifiedDate: param.LastModifiedDate,
        }, 3600); // 1 hour for configuration
        
        results.push({
          parameter: param.Name,
          status: 'cached',
        });
      }

      // Cache invalid parameters
      for (const invalidParam of response.InvalidParameters || []) {
        results.push({
          parameter: invalidParam,
          status: 'invalid',
        });
      }
    } catch (error) {
      console.error('Error warming configuration:', error);
      results.push({
        status: 'error',
        error: error.message,
      });
    }

    return results;
  }

  async getPromptIds() {
    // Try to get from environment variables first
    const promptIds = [
      process.env.CATAPULT_QUERY_PROMPT_ID,
      process.env.CATAPULT_ANALYSIS_PROMPT_ID,
      process.env.CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID,
    ].filter(Boolean);

    if (promptIds.length > 0) {
      return promptIds;
    }

    // Fallback to parameter store
    try {
      const command = new GetParametersCommand({
        Names: [
          '/opportunity-analysis/config/query-prompt-id',
          '/opportunity-analysis/config/analysis-prompt-id',
          '/opportunity-analysis/config/analysis-prompt-nova-premier-id',
        ],
        WithDecryption: true,
      });

      const response = await this.ssm.send(command);
      return (response.Parameters || []).map(p => p.Value).filter(Boolean);
    } catch (error) {
      console.error('Error getting prompt IDs from parameter store:', error);
      return [];
    }
  }
}

// Lambda handler
exports.handler = async (event, context) => {
  const service = new CacheWarmingService();
  return await service.handler(event, context);
};

// For testing
if (require.main === module) {
  const service = new CacheWarmingService();
  service.handler({ warmingType: 'full' }, {})
    .then(result => console.log('Result:', JSON.stringify(result, null, 2)))
    .catch(error => console.error('Error:', error));
}