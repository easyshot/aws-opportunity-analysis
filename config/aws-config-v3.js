// AWS SDK v3 Configuration with Infrastructure Integration
const { BedrockAgentClient } = require('@aws-sdk/client-bedrock-agent');
const { BedrockRuntimeClient } = require('@aws-sdk/client-bedrock-runtime');
const { LambdaClient } = require('@aws-sdk/client-lambda');
const { AthenaClient } = require('@aws-sdk/client-athena');
const { SSMClient } = require('@aws-sdk/client-ssm');
const { SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');
const { CloudWatchClient } = require('@aws-sdk/client-cloudwatch');
const { InfrastructureConfig } = require('./infrastructure-config');

// Common configuration for all clients with X-Ray tracing
const config = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
};

// Initialize AWS SDK v3 clients with enhanced configuration
const bedrockAgent = new BedrockAgentClient({
  ...config,
  requestHandler: {
    metadata: { handlerProtocol: 'http/1.1' }
  }
});

const bedrockRuntime = new BedrockRuntimeClient({
  ...config,
  requestHandler: {
    metadata: { handlerProtocol: 'http/1.1' }
  }
});

const lambda = new LambdaClient({
  ...config,
  requestHandler: {
    metadata: { handlerProtocol: 'http/1.1' }
  }
});

const athena = new AthenaClient({
  ...config,
  requestHandler: {
    metadata: { handlerProtocol: 'http/1.1' }
  }
});

const ssm = new SSMClient({
  ...config,
  requestHandler: {
    metadata: { handlerProtocol: 'http/1.1' }
  }
});

const secretsManager = new SecretsManagerClient({
  ...config,
  requestHandler: {
    metadata: { handlerProtocol: 'http/1.1' }
  }
});

const cloudWatch = new CloudWatchClient({
  ...config,
  requestHandler: {
    metadata: { handlerProtocol: 'http/1.1' }
  }
});

// Initialize infrastructure configuration
const infrastructureConfig = new InfrastructureConfig(config.region);

// Configuration loader with fallback to environment variables
let appConfig = null;

async function getConfig() {
  if (!appConfig) {
    try {
      appConfig = await infrastructureConfig.getAppConfig();
      console.log('Loaded configuration from AWS infrastructure');
    } catch (error) {
      console.warn('Failed to load infrastructure config, falling back to environment variables:', error.message);
      appConfig = {
        aws: {
          region: process.env.AWS_REGION || 'us-east-1',
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
  return appConfig;
}

// Export configured AWS services
module.exports = {
  bedrockAgent,
  bedrockRuntime,
  lambda,
  athena,
  ssm,
  secretsManager,
  cloudWatch,
  infrastructureConfig,
  getConfig,
  
  // Export configuration values (legacy support)
  config: {
    promptIds: {
      queryPrompt: process.env.CATAPULT_QUERY_PROMPT_ID,
      analysisPrompt: process.env.CATAPULT_ANALYSIS_PROMPT_ID,
      analysisPromptNovaPremier: process.env.CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID  // Not used - kept for compatibility
    },
    lambda: {
      catapultGetDataset: process.env.CATAPULT_GET_DATASET_LAMBDA
    },
    athena: {
      database: process.env.ATHENA_DATABASE,
      outputLocation: process.env.ATHENA_OUTPUT_LOCATION
    }
  }
};