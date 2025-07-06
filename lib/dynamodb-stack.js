const { Stack, RemovalPolicy, Duration } = require('aws-cdk-lib');
const { 
    Table, 
    AttributeType, 
    BillingMode, 
    StreamViewType,
    ProjectionType
} = require('aws-cdk-lib/aws-dynamodb');
const { 
    Function, 
    Runtime, 
    Code 
} = require('aws-cdk-lib/aws-lambda');
const { 
    DynamoEventSource 
} = require('aws-cdk-lib/aws-lambda-event-sources');
const { 
    PolicyStatement, 
    Effect 
} = require('aws-cdk-lib/aws-iam');

class DynamoDBStack extends Stack {
    constructor(scope, id, props) {
        super(scope, id, props);

        // Analysis Results Cache Table
        this.analysisResultsTable = new Table(this, 'AnalysisResultsTable', {
            tableName: 'opportunity-analysis-results',
            partitionKey: {
                name: 'id',
                type: AttributeType.STRING
            },
            billingMode: BillingMode.PAY_PER_REQUEST,
            timeToLiveAttribute: 'ttl',
            stream: StreamViewType.NEW_AND_OLD_IMAGES,
            pointInTimeRecovery: true,
            removalPolicy: RemovalPolicy.RETAIN
        });

        // User Sessions Table
        this.userSessionsTable = new Table(this, 'UserSessionsTable', {
            tableName: 'opportunity-analysis-sessions',
            partitionKey: {
                name: 'sessionId',
                type: AttributeType.STRING
            },
            billingMode: BillingMode.PAY_PER_REQUEST,
            timeToLiveAttribute: 'ttl',
            stream: StreamViewType.NEW_AND_OLD_IMAGES,
            pointInTimeRecovery: true,
            removalPolicy: RemovalPolicy.RETAIN
        });

        // Analysis History Table
        this.analysisHistoryTable = new Table(this, 'AnalysisHistoryTable', {
            tableName: 'opportunity-analysis-history',
            partitionKey: {
                name: 'historyId',
                type: AttributeType.STRING
            },
            sortKey: {
                name: 'timestamp',
                type: AttributeType.STRING
            },
            billingMode: BillingMode.PAY_PER_REQUEST,
            timeToLiveAttribute: 'ttl',
            stream: StreamViewType.NEW_AND_OLD_IMAGES,
            pointInTimeRecovery: true,
            removalPolicy: RemovalPolicy.RETAIN
        });

        // Global Secondary Indexes for Analysis History
        this.analysisHistoryTable.addGlobalSecondaryIndex({
            indexName: 'UserIdTimestampIndex',
            partitionKey: {
                name: 'userId',
                type: AttributeType.STRING
            },
            sortKey: {
                name: 'timestamp',
                type: AttributeType.STRING
            },
            projectionType: ProjectionType.ALL
        });

        this.analysisHistoryTable.addGlobalSecondaryIndex({
            indexName: 'OpportunityNameTimestampIndex',
            partitionKey: {
                name: 'opportunityName',
                type: AttributeType.STRING
            },
            sortKey: {
                name: 'timestamp',
                type: AttributeType.STRING
            },
            projectionType: ProjectionType.ALL
        });

        this.analysisHistoryTable.addGlobalSecondaryIndex({
            indexName: 'CustomerNameTimestampIndex',
            partitionKey: {
                name: 'customerName',
                type: AttributeType.STRING
            },
            sortKey: {
                name: 'timestamp',
                type: AttributeType.STRING
            },
            projectionType: ProjectionType.ALL
        });

        // DynamoDB Streams Processing Lambda
        this.streamProcessorFunction = new Function(this, 'DynamoDBStreamProcessor', {
            functionName: 'opportunity-analysis-stream-processor',
            runtime: Runtime.NODEJS_18_X,
            handler: 'index.handler',
            code: Code.fromInline(`
                exports.handler = async (event) => {
                    console.log('DynamoDB Stream Event:', JSON.stringify(event, null, 2));
                    
                    for (const record of event.Records) {
                        const { eventName, dynamodb } = record;
                        const tableName = record.eventSourceARN.split('/')[1];
                        
                        console.log(\`Processing \${eventName} event for table \${tableName}\`);
                        
                        switch (eventName) {
                            case 'INSERT':
                                await handleInsert(record, tableName);
                                break;
                            case 'MODIFY':
                                await handleModify(record, tableName);
                                break;
                            case 'REMOVE':
                                await handleRemove(record, tableName);
                                break;
                        }
                    }
                    
                    return { statusCode: 200, body: 'Stream processed successfully' };
                };
                
                async function handleInsert(record, tableName) {
                    // Handle new item insertion
                    console.log(\`New item inserted in \${tableName}\`);
                    
                    if (tableName === 'opportunity-analysis-results') {
                        // Could trigger cache warming or notifications
                        console.log('Analysis result cached');
                    } else if (tableName === 'opportunity-analysis-sessions') {
                        // Could trigger session analytics
                        console.log('New user session created');
                    } else if (tableName === 'opportunity-analysis-history') {
                        // Could trigger trend analysis or reporting
                        console.log('Analysis history recorded');
                    }
                }
                
                async function handleModify(record, tableName) {
                    // Handle item modification
                    console.log(\`Item modified in \${tableName}\`);
                }
                
                async function handleRemove(record, tableName) {
                    // Handle item removal (TTL expiration or explicit deletion)
                    console.log(\`Item removed from \${tableName}\`);
                }
            `),
            timeout: Duration.minutes(5),
            memorySize: 256
        });

        // Add DynamoDB permissions to the stream processor
        this.streamProcessorFunction.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'dynamodb:DescribeStream',
                'dynamodb:GetRecords',
                'dynamodb:GetShardIterator',
                'dynamodb:ListStreams'
            ],
            resources: [
                this.analysisResultsTable.tableStreamArn,
                this.userSessionsTable.tableStreamArn,
                this.analysisHistoryTable.tableStreamArn
            ]
        }));

        // Add event sources for DynamoDB streams
        this.streamProcessorFunction.addEventSource(new DynamoEventSource(this.analysisResultsTable, {
            startingPosition: 'LATEST',
            batchSize: 10,
            maxBatchingWindow: Duration.seconds(5),
            retryAttempts: 3
        }));

        this.streamProcessorFunction.addEventSource(new DynamoEventSource(this.userSessionsTable, {
            startingPosition: 'LATEST',
            batchSize: 10,
            maxBatchingWindow: Duration.seconds(5),
            retryAttempts: 3
        }));

        this.streamProcessorFunction.addEventSource(new DynamoEventSource(this.analysisHistoryTable, {
            startingPosition: 'LATEST',
            batchSize: 10,
            maxBatchingWindow: Duration.seconds(5),
            retryAttempts: 3
        }));

        // Auto-scaling configuration (for provisioned billing mode if needed)
        // Note: Pay-per-request mode handles scaling automatically
        
        // Backup configuration
        // Point-in-time recovery is already enabled above
        
        // Output table names and ARNs
        this.tableNames = {
            analysisResults: this.analysisResultsTable.tableName,
            userSessions: this.userSessionsTable.tableName,
            analysisHistory: this.analysisHistoryTable.tableName
        };

        this.tableArns = {
            analysisResults: this.analysisResultsTable.tableArn,
            userSessions: this.userSessionsTable.tableArn,
            analysisHistory: this.analysisHistoryTable.tableArn
        };
    }

    // Method to grant read/write permissions to other resources
    grantReadWriteData(grantee) {
        this.analysisResultsTable.grantReadWriteData(grantee);
        this.userSessionsTable.grantReadWriteData(grantee);
        this.analysisHistoryTable.grantReadWriteData(grantee);
    }

    // Method to grant read-only permissions
    grantReadData(grantee) {
        this.analysisResultsTable.grantReadData(grantee);
        this.userSessionsTable.grantReadData(grantee);
        this.analysisHistoryTable.grantReadData(grantee);
    }
}

module.exports = { DynamoDBStack };