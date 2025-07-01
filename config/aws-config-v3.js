// AWS SDK v3 Configuration
const { BedrockAgentClient } = require('@aws-sdk/client-bedrock-agent');
const { BedrockRuntimeClient } = require('@aws-sdk/client-bedrock-runtime');
const { LambdaClient } = require('@aws-sdk/client-lambda');
const { AthenaClient } = require('@aws-sdk/client-athena');

// Common configuration for all clients
const config = {
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
};

// Initialize AWS SDK v3 clients
const bedrockAgent = new BedrockAgentClient(config);
const bedrockRuntime = new BedrockRuntimeClient(config);
const lambda = new LambdaClient(config);
const athena = new AthenaClient(config);

// Export configured AWS services
module.exports = {
  bedrockAgent,
  bedrockRuntime,
  lambda,
  athena,
  
  // Export configuration values
  config: {
    promptIds: {
      queryPrompt: process.env.CATAPULT_QUERY_PROMPT_ID,
      analysisPrompt: process.env.CATAPULT_ANALYSIS_PROMPT_ID,
      analysisPromptNovaPremier: process.env.CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID
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