const { SSMClient, GetParameterCommand, GetParametersCommand } = require('@aws-sdk/client-ssm');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

class InfrastructureConfig {
  constructor(region = 'us-east-1') {
    this.region = region;
    this.ssmClient = new SSMClient({ region: this.region });
    this.secretsClient = new SecretsManagerClient({ region: this.region });
    this.configCache = new Map();
    this.secretsCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  async getParameter(parameterName, useCache = true) {
    const cacheKey = `param_${parameterName}`;
    
    if (useCache && this.configCache.has(cacheKey)) {
      const cached = this.configCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.value;
      }
    }

    try {
      const command = new GetParameterCommand({
        Name: parameterName,
        WithDecryption: true
      });
      
      const response = await this.ssmClient.send(command);
      const value = response.Parameter.Value;
      
      if (useCache) {
        this.configCache.set(cacheKey, {
          value,
          timestamp: Date.now()
        });
      }
      
      return value;
    } catch (error) {
      console.error(`Failed to get parameter ${parameterName}:`, error);
      throw error;
    }
  }

  async getParameters(parameterNames, useCache = true) {
    const uncachedParams = [];
    const results = {};

    // Check cache first
    if (useCache) {
      for (const paramName of parameterNames) {
        const cacheKey = `param_${paramName}`;
        if (this.configCache.has(cacheKey)) {
          const cached = this.configCache.get(cacheKey);
          if (Date.now() - cached.timestamp < this.cacheExpiry) {
            results[paramName] = cached.value;
            continue;
          }
        }
        uncachedParams.push(paramName);
      }
    } else {
      uncachedParams.push(...parameterNames);
    }

    // Fetch uncached parameters
    if (uncachedParams.length > 0) {
      try {
        const command = new GetParametersCommand({
          Names: uncachedParams,
          WithDecryption: true
        });
        
        const response = await this.ssmClient.send(command);
        
        for (const param of response.Parameters) {
          results[param.Name] = param.Value;
          
          if (useCache) {
            this.configCache.set(`param_${param.Name}`, {
              value: param.Value,
              timestamp: Date.now()
            });
          }
        }
      } catch (error) {
        console.error('Failed to get parameters:', error);
        throw error;
      }
    }

    return results;
  }

  async getSecret(secretName, useCache = true) {
    const cacheKey = `secret_${secretName}`;
    
    if (useCache && this.secretsCache.has(cacheKey)) {
      const cached = this.secretsCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.value;
      }
    }

    try {
      const command = new GetSecretValueCommand({
        SecretId: secretName
      });
      
      const response = await this.secretsClient.send(command);
      const secretValue = JSON.parse(response.SecretString);
      
      if (useCache) {
        this.secretsCache.set(cacheKey, {
          value: secretValue,
          timestamp: Date.now()
        });
      }
      
      return secretValue;
    } catch (error) {
      console.error(`Failed to get secret ${secretName}:`, error);
      throw error;
    }
  }

  async getAppConfig() {
    try {
      // Get configuration parameters
      const parameterNames = [
        '/opportunity-analysis/config/aws-region',
        '/opportunity-analysis/config/athena-database',
        '/opportunity-analysis/config/athena-output-location',
        '/opportunity-analysis/config/lambda-function-name',
        '/opportunity-analysis/config/cloudfront-domain'
      ];

      const parameters = await this.getParameters(parameterNames);
      
      // Get secrets
      const secrets = await this.getSecret('opportunity-analysis/credentials');

      return {
        aws: {
          region: parameters['/opportunity-analysis/config/aws-region'] || this.region,
        },
        athena: {
          database: parameters['/opportunity-analysis/config/athena-database'] || 'catapult_db_p',
          outputLocation: parameters['/opportunity-analysis/config/athena-output-location'] || 's3://as-athena-catapult/',
        },
        lambda: {
          functionName: parameters['/opportunity-analysis/config/lambda-function-name'] || 'catapult_get_dataset',
        },
        cloudfront: {
          domain: parameters['/opportunity-analysis/config/cloudfront-domain'],
        },
        bedrock: {
          prompts: secrets.bedrockPromptIds || {
            queryPromptId: 'Y6T66EI3GZ',
            analysisPromptId: 'FDUHITJIME',
            analysisPromptNovaPremierId: 'P03B9TO1Q1'
          }
        },
        apiKey: secrets.apiKey
      };
    } catch (error) {
      console.error('Failed to load application configuration:', error);
      
      // Fallback to environment variables
      return {
        aws: {
          region: process.env.AWS_REGION || this.region,
        },
        athena: {
          database: process.env.ATHENA_DATABASE || 'catapult_db_p',
          outputLocation: process.env.ATHENA_OUTPUT_LOCATION || 's3://as-athena-catapult/',
        },
        lambda: {
          functionName: process.env.CATAPULT_GET_DATASET_LAMBDA || 'catapult_get_dataset',
        },
        bedrock: {
          prompts: {
            queryPromptId: process.env.CATAPULT_QUERY_PROMPT_ID || 'Y6T66EI3GZ',
            analysisPromptId: process.env.CATAPULT_ANALYSIS_PROMPT_ID || 'FDUHITJIME',
            analysisPromptNovaPremierId: process.env.CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID || 'P03B9TO1Q1'
          }
        }
      };
    }
  }

  clearCache() {
    this.configCache.clear();
    this.secretsCache.clear();
  }
}

module.exports = { InfrastructureConfig };