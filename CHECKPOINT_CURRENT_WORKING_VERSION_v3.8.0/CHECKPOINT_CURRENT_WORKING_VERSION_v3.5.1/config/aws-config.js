// AWS Configuration
const AWS = require('aws-sdk');

// Configure AWS SDK with credentials from environment variables
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Export configured AWS services
module.exports = {
  bedrock: new AWS.BedrockAgent(),
  bedrockRuntime: new AWS.BedrockRuntime(),
  lambda: new AWS.Lambda(),
  athena: new AWS.Athena(),
  
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