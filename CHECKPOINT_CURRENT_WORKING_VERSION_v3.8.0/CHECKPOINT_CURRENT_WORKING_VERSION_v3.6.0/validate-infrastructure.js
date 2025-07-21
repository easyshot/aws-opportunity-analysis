#!/usr/bin/env node

/**
 * Infrastructure Validation Script
 * Validates all deployed AWS infrastructure components
 * Task 2: Validate all infrastructure components are properly connected
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure AWS SDK
AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1'
});

const lambda = new AWS.Lambda();
const athena = new AWS.Athena();
const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB();
const eventbridge = new AWS.EventBridge();
const elasticache = new AWS.ElastiCache();
const bedrock = new AWS.BedrockRuntime();
const sts = new AWS.STS();

console.log('🔍 Starting Infrastructure Validation...\n');

async function main() {
    const validationResults = {
        timestamp: new Date().toISOString(),
        overall: 'UNKNOWN',
        components: []
    };
    
    try {
        // Validate AWS credentials
        await validateAWSCredentials(validationResults);
        
        // Validate Lambda function
        await validateLambdaFunction(validationResults);
        
        // Validate Athena configuration
        await validateAthenaConfiguration(validationResults);
        
        // Validate DynamoDB tables
        await validateDynamoDBTables(validationResults);
        
        // Validate EventBridge configuration
        await validateEventBridge(validationResults);
        
        // Validate ElastiCache Redis (optional)
        await validateElastiCache(validationResults);
        
        // Validate Bedrock connectivity
        await validateBedrockConnectivity(validationResults);
        
        // Test end-to-end connectivity
        await testEndToEndConnectivity(validationResults);
        
        // Generate validation report
        generateValidationReport(validationResults);
        
    } catch (error) {
        console.error('❌ Validation failed:', error.message);
        validationResults.overall = 'FAILED';
        validationResults.error = error.message;
    }
    
    // Save validation results
    const resultsFile = path.join(__dirname, '..', 'validation-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(validationResults, null, 2));
    
    console.log(`\n📄 Validation results saved to: ${resultsFile}`);
    
    // Exit with appropriate code
    const failedComponents = validationResults.components.filter(c => c.status === 'FAILED');
    if (failedComponents.length > 0) {
        console.log(`\n❌ ${failedComponents.length} component(s) failed validation`);
        process.exit(1);
    } else {
        console.log('\n✅ All components passed validation!');
        process.exit(0);
    }
}

/**
 * Validate AWS credentials and permissions
 */
async function validateAWSCredentials(results) {
    console.log('🔐 Validating AWS credentials...');
    
    try {
        const identity = await sts.getCallerIdentity().promise();
        
        results.components.push({
            name: 'AWS Credentials',
            status: 'PASSED',
            details: {
                account: identity.Account,
                userId: identity.UserId,
                arn: identity.Arn
            }
        });
        
        console.log(`✅ AWS credentials valid for account: ${identity.Account}`);
        
    } catch (error) {
        results.components.push({
            name: 'AWS Credentials',
            status: 'FAILED',
            error: error.message
        });
        
        console.log(`❌ AWS credentials validation failed: ${error.message}`);
        throw error;
    }
}

/**
 * Validate Lambda function deployment and permissions
 */
async function validateLambdaFunction(results) {
    console.log('📦 Validating Lambda function...');
    
    const functionName = process.env.CATAPULT_GET_DATASET_LAMBDA || 'catapult_get_dataset';
    
    try {
        // Get function configuration
        const func = await lambda.getFunction({ FunctionName: functionName }).promise();
        
        const validation = {
            name: 'Lambda Function',
            status: 'PASSED',
            details: {
                functionName: func.Configuration.FunctionName,
                functionArn: func.Configuration.FunctionArn,
                runtime: func.Configuration.Runtime,
                state: func.Configuration.State,
                lastModified: func.Configuration.LastModified,
                memorySize: func.Configuration.MemorySize,
                timeout: func.Configuration.Timeout
            }
        };
        
        // Check if function is active
        if (func.Configuration.State !== 'Active') {
            validation.status = 'WARNING';
            validation.warning = `Function state is ${func.Configuration.State}, expected Active`;
        }
        
        // Test function invocation with a simple test
        try {
            const testPayload = {
                sql_query: 'SELECT 1 as test_column'
            };
            
            const invokeResult = await lambda.invoke({
                FunctionName: functionName,
                InvocationType: 'RequestResponse',
                Payload: JSON.stringify(testPayload)
            }).promise();
            
            const response = JSON.parse(invokeResult.Payload);
            
            if (invokeResult.StatusCode === 200) {
                validation.details.testInvocation = 'SUCCESS';
                console.log(`✅ Lambda function ${functionName} invocation test passed`);
            } else {
                validation.status = 'WARNING';
                validation.warning = `Function invocation returned status ${invokeResult.StatusCode}`;
                validation.details.testInvocation = 'FAILED';
                validation.details.testError = response;
            }
            
        } catch (invokeError) {
            validation.status = 'WARNING';
            validation.warning = `Function invocation test failed: ${invokeError.message}`;
            validation.details.testInvocation = 'FAILED';
            validation.details.testError = invokeError.message;
        }
        
        results.components.push(validation);
        console.log(`✅ Lambda function ${functionName} validated`);
        
    } catch (error) {
        results.components.push({
            name: 'Lambda Function',
            status: 'FAILED',
            error: error.message,
            details: { functionName }
        });
        
        console.log(`❌ Lambda function validation failed: ${error.message}`);
    }
}

/**
 * Validate Athena database and S3 configuration
 */
async function validateAthenaConfiguration(results) {
    console.log('🗄️  Validating Athena configuration...');
    
    const databaseName = process.env.ATHENA_DATABASE || 'catapult_db_p';
    const outputLocation = process.env.ATHENA_OUTPUT_LOCATION || 's3://as-athena-catapult/';
    
    try {
        // Validate S3 bucket
        const bucketName = outputLocation.replace('s3://', '').replace('/', '');
        
        try {
            await s3.headBucket({ Bucket: bucketName }).promise();
            console.log(`✅ S3 bucket ${bucketName} accessible`);
        } catch (s3Error) {
            results.components.push({
                name: 'Athena S3 Output Location',
                status: 'FAILED',
                error: `S3 bucket ${bucketName} not accessible: ${s3Error.message}`,
                details: { bucketName, outputLocation }
            });
            console.log(`❌ S3 bucket validation failed: ${s3Error.message}`);
            return;
        }
        
        // Test Athena query execution
        try {
            const testQuery = 'SELECT 1 as test_value';
            
            const queryResult = await athena.startQueryExecution({
                QueryString: testQuery,
                QueryExecutionContext: {
                    Database: databaseName
                },
                ResultConfiguration: {
                    OutputLocation: outputLocation
                }
            }).promise();
            
            // Wait for query to complete
            const queryStatus = await waitForAthenaQuery(queryResult.QueryExecutionId);
            
            if (queryStatus === 'SUCCEEDED') {
                results.components.push({
                    name: 'Athena Configuration',
                    status: 'PASSED',
                    details: {
                        database: databaseName,
                        outputLocation: outputLocation,
                        bucketName: bucketName,
                        testQueryId: queryResult.QueryExecutionId
                    }
                });
                console.log(`✅ Athena configuration validated`);
            } else {
                results.components.push({
                    name: 'Athena Configuration',
                    status: 'FAILED',
                    error: `Test query failed with status: ${queryStatus}`,
                    details: {
                        database: databaseName,
                        outputLocation: outputLocation,
                        testQueryId: queryResult.QueryExecutionId
                    }
                });
                console.log(`❌ Athena test query failed: ${queryStatus}`);
            }
            
        } catch (athenaError) {
            results.components.push({
                name: 'Athena Configuration',
                status: 'FAILED',
                error: `Athena query execution failed: ${athenaError.message}`,
                details: { database: databaseName, outputLocation }
            });
            console.log(`❌ Athena validation failed: ${athenaError.message}`);
        }
        
    } catch (error) {
        results.components.push({
            name: 'Athena Configuration',
            status: 'FAILED',
            error: error.message,
            details: { database: databaseName, outputLocation }
        });
        console.log(`❌ Athena configuration validation failed: ${error.message}`);
    }
}

/**
 * Validate DynamoDB tables
 */
async function validateDynamoDBTables(results) {
    console.log('🗃️  Validating DynamoDB tables...');
    
    const tables = [
        'opportunity-analysis-results',
        'opportunity-analysis-sessions', 
        'opportunity-analysis-history'
    ];
    
    for (const tableName of tables) {
        try {
            const table = await dynamodb.describeTable({ TableName: tableName }).promise();
            
            const validation = {
                name: `DynamoDB Table (${tableName})`,
                status: table.Table.TableStatus === 'ACTIVE' ? 'PASSED' : 'WARNING',
                details: {
                    tableName: table.Table.TableName,
                    tableArn: table.Table.TableArn,
                    tableStatus: table.Table.TableStatus,
                    itemCount: table.Table.ItemCount,
                    billingMode: table.Table.BillingModeSummary?.BillingMode,
                    streamEnabled: table.Table.StreamSpecification?.StreamEnabled,
                    streamArn: table.Table.LatestStreamArn
                }
            };
            
            if (table.Table.TableStatus !== 'ACTIVE') {
                validation.warning = `Table status is ${table.Table.TableStatus}, expected ACTIVE`;
            }
            
            results.components.push(validation);
            console.log(`✅ DynamoDB table ${tableName} validated (${table.Table.TableStatus})`);
            
        } catch (error) {
            results.components.push({
                name: `DynamoDB Table (${tableName})`,
                status: 'FAILED',
                error: error.message,
                details: { tableName }
            });
            console.log(`❌ DynamoDB table ${tableName} validation failed: ${error.message}`);
        }
    }
}

/**
 * Validate EventBridge configuration
 */
async function validateEventBridge(results) {
    console.log('📡 Validating EventBridge configuration...');
    
    const eventBusName = 'aws-opportunity-analysis-bus';
    
    try {
        // Check if custom event bus exists
        const eventBuses = await eventbridge.listEventBuses().promise();
        const customBus = eventBuses.EventBuses.find(bus => bus.Name === eventBusName);
        
        if (customBus) {
            // Get event rules for the bus
            const rules = await eventbridge.listRules({
                EventBusName: eventBusName
            }).promise();
            
            results.components.push({
                name: 'EventBridge Custom Bus',
                status: 'PASSED',
                details: {
                    busName: customBus.Name,
                    busArn: customBus.Arn,
                    rulesCount: rules.Rules.length,
                    rules: rules.Rules.map(rule => ({
                        name: rule.Name,
                        state: rule.State,
                        description: rule.Description
                    }))
                }
            });
            
            console.log(`✅ EventBridge custom bus ${eventBusName} validated (${rules.Rules.length} rules)`);
            
        } else {
            results.components.push({
                name: 'EventBridge Custom Bus',
                status: 'FAILED',
                error: `Custom event bus ${eventBusName} not found`,
                details: { expectedBusName: eventBusName }
            });
            console.log(`❌ EventBridge custom bus ${eventBusName} not found`);
        }
        
    } catch (error) {
        results.components.push({
            name: 'EventBridge Custom Bus',
            status: 'FAILED',
            error: error.message,
            details: { eventBusName }
        });
        console.log(`❌ EventBridge validation failed: ${error.message}`);
    }
}

/**
 * Validate ElastiCache Redis cluster (optional)
 */
async function validateElastiCache(results) {
    console.log('🔄 Validating ElastiCache Redis cluster...');
    
    const clusterName = 'opportunity-analysis-cache';
    
    try {
        const clusters = await elasticache.describeCacheClusters({
            CacheClusterId: clusterName,
            ShowCacheNodeInfo: true
        }).promise();
        
        if (clusters.CacheClusters.length > 0) {
            const cluster = clusters.CacheClusters[0];
            
            results.components.push({
                name: 'ElastiCache Redis Cluster',
                status: cluster.CacheClusterStatus === 'available' ? 'PASSED' : 'WARNING',
                details: {
                    clusterId: cluster.CacheClusterId,
                    status: cluster.CacheClusterStatus,
                    engine: cluster.Engine,
                    engineVersion: cluster.EngineVersion,
                    nodeType: cluster.CacheNodeType,
                    numNodes: cluster.NumCacheNodes,
                    endpoint: cluster.RedisConfiguration?.PrimaryEndpoint?.Address
                }
            });
            
            console.log(`✅ ElastiCache Redis cluster ${clusterName} validated (${cluster.CacheClusterStatus})`);
            
        } else {
            results.components.push({
                name: 'ElastiCache Redis Cluster',
                status: 'WARNING',
                warning: `Redis cluster ${clusterName} not found - caching will be disabled`,
                details: { expectedClusterName: clusterName }
            });
            console.log(`⚠️  ElastiCache Redis cluster ${clusterName} not found`);
        }
        
    } catch (error) {
        results.components.push({
            name: 'ElastiCache Redis Cluster',
            status: 'WARNING',
            warning: `Could not validate Redis cluster: ${error.message}`,
            details: { clusterName }
        });
        console.log(`⚠️  ElastiCache validation warning: ${error.message}`);
    }
}

/**
 * Validate Bedrock connectivity
 */
async function validateBedrockConnectivity(results) {
    console.log('🤖 Validating Bedrock connectivity...');
    
    const promptIds = {
        queryPrompt: process.env.CATAPULT_QUERY_PROMPT_ID || 'Y6T66EI3GZ',
        analysisPrompt: process.env.CATAPULT_ANALYSIS_PROMPT_ID || 'FDUHITJIME',
        analysisPromptNovaPremier: process.env.CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID || 'P03B9TO1Q1'
    };
    
    try {
        // Test basic Bedrock connectivity with a simple model invocation
        const testPayload = {
            inputText: 'Test connectivity',
            textGenerationConfig: {
                maxTokenCount: 10,
                temperature: 0.1
            }
        };
        
        try {
            const response = await bedrock.invokeModel({
                modelId: 'amazon.titan-text-lite-v1',
                contentType: 'application/json',
                accept: 'application/json',
                body: JSON.stringify(testPayload)
            }).promise();
            
            results.components.push({
                name: 'Bedrock Connectivity',
                status: 'PASSED',
                details: {
                    modelTested: 'amazon.titan-text-lite-v1',
                    promptIds: promptIds,
                    responseReceived: true
                }
            });
            
            console.log(`✅ Bedrock connectivity validated`);
            
        } catch (bedrockError) {
            results.components.push({
                name: 'Bedrock Connectivity',
                status: 'FAILED',
                error: `Bedrock model invocation failed: ${bedrockError.message}`,
                details: { promptIds }
            });
            console.log(`❌ Bedrock connectivity failed: ${bedrockError.message}`);
        }
        
    } catch (error) {
        results.components.push({
            name: 'Bedrock Connectivity',
            status: 'FAILED',
            error: error.message,
            details: { promptIds }
        });
        console.log(`❌ Bedrock validation failed: ${error.message}`);
    }
}

/**
 * Test end-to-end connectivity between components
 */
async function testEndToEndConnectivity(results) {
    console.log('🔗 Testing end-to-end connectivity...');
    
    try {
        // Test Lambda -> Athena -> S3 workflow
        const functionName = process.env.CATAPULT_GET_DATASET_LAMBDA || 'catapult_get_dataset';
        
        const testPayload = {
            sql_query: 'SELECT \'End-to-end test\' as test_message, CURRENT_TIMESTAMP as test_timestamp'
        };
        
        const invokeResult = await lambda.invoke({
            FunctionName: functionName,
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify(testPayload)
        }).promise();
        
        const response = JSON.parse(invokeResult.Payload);
        
        if (invokeResult.StatusCode === 200 && response.statusCode === 200) {
            results.components.push({
                name: 'End-to-End Connectivity',
                status: 'PASSED',
                details: {
                    testType: 'Lambda -> Athena -> S3',
                    lambdaStatus: invokeResult.StatusCode,
                    athenaQueryExecuted: true,
                    s3OutputGenerated: true
                }
            });
            
            console.log(`✅ End-to-end connectivity test passed`);
            
        } else {
            results.components.push({
                name: 'End-to-End Connectivity',
                status: 'FAILED',
                error: `End-to-end test failed with status ${invokeResult.StatusCode}`,
                details: {
                    lambdaStatus: invokeResult.StatusCode,
                    response: response
                }
            });
            console.log(`❌ End-to-end connectivity test failed`);
        }
        
    } catch (error) {
        results.components.push({
            name: 'End-to-End Connectivity',
            status: 'FAILED',
            error: error.message
        });
        console.log(`❌ End-to-end connectivity test failed: ${error.message}`);
    }
}

/**
 * Generate validation report
 */
function generateValidationReport(results) {
    console.log('\n📊 Infrastructure Validation Report');
    console.log('='.repeat(80));
    
    const passed = results.components.filter(c => c.status === 'PASSED').length;
    const warnings = results.components.filter(c => c.status === 'WARNING').length;
    const failed = results.components.filter(c => c.status === 'FAILED').length;
    const total = results.components.length;
    
    console.log(`Total Components: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed === 0 && warnings === 0) {
        results.overall = 'PASSED';
        console.log('\n🎉 All infrastructure components are working correctly!');
    } else if (failed === 0) {
        results.overall = 'PASSED_WITH_WARNINGS';
        console.log('\n⚠️  Infrastructure is functional but has some warnings');
    } else {
        results.overall = 'FAILED';
        console.log('\n❌ Infrastructure has critical issues that need to be resolved');
    }
    
    // Show detailed results
    console.log('\n📋 Detailed Results:');
    console.log('-'.repeat(80));
    
    for (const component of results.components) {
        const status = component.status === 'PASSED' ? '✅' : 
                      component.status === 'WARNING' ? '⚠️ ' : '❌';
        console.log(`${status} ${component.name}: ${component.status}`);
        
        if (component.error) {
            console.log(`   Error: ${component.error}`);
        }
        if (component.warning) {
            console.log(`   Warning: ${component.warning}`);
        }
    }
}

/**
 * Wait for Athena query to complete
 */
async function waitForAthenaQuery(queryExecutionId, maxWaitTime = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
        const queryExecution = await athena.getQueryExecution({
            QueryExecutionId: queryExecutionId
        }).promise();
        
        const status = queryExecution.QueryExecution.Status.State;
        
        if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELLED') {
            return status;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return 'TIMEOUT';
}

// Run the validation
if (require.main === module) {
    main();
}

module.exports = { main };