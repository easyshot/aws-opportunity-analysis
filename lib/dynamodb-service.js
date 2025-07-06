const { 
    PutCommand, 
    GetCommand, 
    UpdateCommand, 
    DeleteCommand, 
    QueryCommand, 
    ScanCommand,
    BatchGetCommand
} = require('@aws-sdk/lib-dynamodb');
const { docClient, TABLE_NAMES, TTL_SETTINGS } = require('../config/dynamodb-config');

class DynamoDBService {
    constructor() {
        this.docClient = docClient;
        this.tables = TABLE_NAMES;
    }

    // Generate TTL timestamp
    generateTTL(seconds) {
        return Math.floor(Date.now() / 1000) + seconds;
    }

    // Generate unique ID
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Analysis Results Cache Operations
    async cacheAnalysisResult(opportunityId, analysisData) {
        const item = {
            id: opportunityId,
            analysisData: analysisData,
            createdAt: new Date().toISOString(),
            ttl: this.generateTTL(TTL_SETTINGS.ANALYSIS_RESULTS)
        };

        const command = new PutCommand({
            TableName: this.tables.ANALYSIS_RESULTS,
            Item: item
        });

        try {
            await this.docClient.send(command);
            console.log(`Analysis result cached for opportunity: ${opportunityId}`);
            return item;
        } catch (error) {
            console.error('Error caching analysis result:', error);
            throw error;
        }
    }

    async getCachedAnalysisResult(opportunityId) {
        const command = new GetCommand({
            TableName: this.tables.ANALYSIS_RESULTS,
            Key: { id: opportunityId }
        });

        try {
            const result = await this.docClient.send(command);
            if (result.Item) {
                console.log(`Retrieved cached analysis for opportunity: ${opportunityId}`);
                return result.Item.analysisData;
            }
            return null;
        } catch (error) {
            console.error('Error retrieving cached analysis result:', error);
            throw error;
        }
    }

    // User Session Management
    async createUserSession(sessionData) {
        const sessionId = this.generateId();
        const item = {
            sessionId: sessionId,
            ...sessionData,
            createdAt: new Date().toISOString(),
            lastAccessedAt: new Date().toISOString(),
            ttl: this.generateTTL(TTL_SETTINGS.USER_SESSIONS)
        };

        const command = new PutCommand({
            TableName: this.tables.USER_SESSIONS,
            Item: item
        });

        try {
            await this.docClient.send(command);
            console.log(`User session created: ${sessionId}`);
            return sessionId;
        } catch (error) {
            console.error('Error creating user session:', error);
            throw error;
        }
    }

    async getUserSession(sessionId) {
        const command = new GetCommand({
            TableName: this.tables.USER_SESSIONS,
            Key: { sessionId: sessionId }
        });

        try {
            const result = await this.docClient.send(command);
            if (result.Item) {
                // Update last accessed time
                await this.updateUserSessionAccess(sessionId);
                return result.Item;
            }
            return null;
        } catch (error) {
            console.error('Error retrieving user session:', error);
            throw error;
        }
    }

    async updateUserSessionAccess(sessionId) {
        const command = new UpdateCommand({
            TableName: this.tables.USER_SESSIONS,
            Key: { sessionId: sessionId },
            UpdateExpression: 'SET lastAccessedAt = :timestamp, #ttl = :ttl',
            ExpressionAttributeNames: {
                '#ttl': 'ttl'
            },
            ExpressionAttributeValues: {
                ':timestamp': new Date().toISOString(),
                ':ttl': this.generateTTL(TTL_SETTINGS.USER_SESSIONS)
            }
        });

        try {
            await this.docClient.send(command);
        } catch (error) {
            console.error('Error updating user session access:', error);
            // Don't throw error for session updates to avoid breaking main flow
        }
    }

    async deleteUserSession(sessionId) {
        const command = new DeleteCommand({
            TableName: this.tables.USER_SESSIONS,
            Key: { sessionId: sessionId }
        });

        try {
            await this.docClient.send(command);
            console.log(`User session deleted: ${sessionId}`);
        } catch (error) {
            console.error('Error deleting user session:', error);
            throw error;
        }
    }

    // Analysis History Tracking
    async saveAnalysisHistory(historyData) {
        const historyId = this.generateId();
        const item = {
            historyId: historyId,
            timestamp: new Date().toISOString(),
            ...historyData,
            ttl: this.generateTTL(TTL_SETTINGS.ANALYSIS_HISTORY)
        };

        const command = new PutCommand({
            TableName: this.tables.ANALYSIS_HISTORY,
            Item: item
        });

        try {
            await this.docClient.send(command);
            console.log(`Analysis history saved: ${historyId}`);
            return historyId;
        } catch (error) {
            console.error('Error saving analysis history:', error);
            throw error;
        }
    }

    async getAnalysisHistory(userId, limit = 10) {
        const command = new QueryCommand({
            TableName: this.tables.ANALYSIS_HISTORY,
            IndexName: 'UserIdTimestampIndex',
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId
            },
            ScanIndexForward: false, // Sort by timestamp descending
            Limit: limit
        });

        try {
            const result = await this.docClient.send(command);
            return result.Items || [];
        } catch (error) {
            console.error('Error retrieving analysis history:', error);
            throw error;
        }
    }

    async getAnalysisHistoryByOpportunity(opportunityName, limit = 5) {
        const command = new QueryCommand({
            TableName: this.tables.ANALYSIS_HISTORY,
            IndexName: 'OpportunityNameTimestampIndex',
            KeyConditionExpression: 'opportunityName = :opportunityName',
            ExpressionAttributeValues: {
                ':opportunityName': opportunityName
            },
            ScanIndexForward: false,
            Limit: limit
        });

        try {
            const result = await this.docClient.send(command);
            return result.Items || [];
        } catch (error) {
            console.error('Error retrieving analysis history by opportunity:', error);
            throw error;
        }
    }

    // Utility methods for batch operations
    async batchGetAnalysisResults(opportunityIds) {
        const results = [];
        
        // DynamoDB batch operations have a limit of 100 items
        const chunks = this.chunkArray(opportunityIds, 100);
        
        for (const chunk of chunks) {
            const keys = chunk.map(id => ({ id }));
            
            const command = new BatchGetCommand({
                RequestItems: {
                    [this.tables.ANALYSIS_RESULTS]: {
                        Keys: keys
                    }
                }
            });

            try {
                const result = await this.docClient.send(command);
                if (result.Responses && result.Responses[this.tables.ANALYSIS_RESULTS]) {
                    results.push(...result.Responses[this.tables.ANALYSIS_RESULTS]);
                }
            } catch (error) {
                console.error('Error in batch get analysis results:', error);
                throw error;
            }
        }

        return results;
    }

    // Helper method to chunk arrays
    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    // Health check method
    async healthCheck() {
        try {
            // Simple scan with limit 1 to test connectivity
            const command = new ScanCommand({
                TableName: this.tables.ANALYSIS_RESULTS,
                Limit: 1
            });
            
            await this.docClient.send(command);
            return { status: 'healthy', timestamp: new Date().toISOString() };
        } catch (error) {
            console.error('DynamoDB health check failed:', error);
            return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
        }
    }
}

module.exports = DynamoDBService;