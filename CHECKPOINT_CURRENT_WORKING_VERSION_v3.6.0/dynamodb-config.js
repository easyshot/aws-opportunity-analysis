const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

// Create DynamoDB client
const dynamoDBClient = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Create DynamoDB Document client for easier operations
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// Table names
const TABLE_NAMES = {
    ANALYSIS_RESULTS: process.env.DYNAMODB_ANALYSIS_RESULTS_TABLE || 'opportunity-analysis-results',
    USER_SESSIONS: process.env.DYNAMODB_USER_SESSIONS_TABLE || 'opportunity-analysis-sessions',
    ANALYSIS_HISTORY: process.env.DYNAMODB_ANALYSIS_HISTORY_TABLE || 'opportunity-analysis-history'
};

// TTL settings (in seconds)
const TTL_SETTINGS = {
    ANALYSIS_RESULTS: 7 * 24 * 60 * 60, // 7 days
    USER_SESSIONS: 24 * 60 * 60, // 24 hours
    ANALYSIS_HISTORY: 90 * 24 * 60 * 60 // 90 days
};

module.exports = {
    dynamoDBClient,
    docClient,
    TABLE_NAMES,
    TTL_SETTINGS
};