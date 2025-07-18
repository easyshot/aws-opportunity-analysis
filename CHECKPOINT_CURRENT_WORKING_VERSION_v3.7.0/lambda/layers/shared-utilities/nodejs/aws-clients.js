/**
 * Centralized AWS client configuration for Lambda functions
 */

const { BedrockRuntimeClient } = require('@aws-sdk/client-bedrock-runtime');
const { BedrockAgentClient } = require('@aws-sdk/client-bedrock-agent');
const { LambdaClient } = require('@aws-sdk/client-lambda');
const { AthenaClient } = require('@aws-sdk/client-athena');
const { SSMClient } = require('@aws-sdk/client-ssm');
const { SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');

// Initialize AWS clients with optimal configuration
const region = process.env.AWS_REGION || 'us-east-1';

const bedrockRuntime = new BedrockRuntimeClient({
    region: region,
    maxAttempts: 3,
    requestTimeout: 300000, // 5 minutes
});

const bedrockAgent = new BedrockAgentClient({
    region: region,
    maxAttempts: 3,
});

const lambda = new LambdaClient({
    region: region,
    maxAttempts: 3,
});

const athena = new AthenaClient({
    region: region,
    maxAttempts: 3,
});

const ssm = new SSMClient({
    region: region,
    maxAttempts: 3,
});

const secretsManager = new SecretsManagerClient({
    region: region,
    maxAttempts: 3,
});

module.exports = {
    bedrockRuntime,
    bedrockAgent,
    lambda,
    athena,
    ssm,
    secretsManager,
    region
};