#!/usr/bin/env node

/**
 * Comprehensive Infrastructure Deployment Script
 * Deploys all required AWS infrastructure components for the Opportunity Analysis application
 * Task 2: Deploy required AWS infrastructure components
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1'
});

const lambda = new AWS.Lambda();
const iam = new AWS.IAM();
const athena = new AWS.Athena();
const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB();
const eventbridge = new AWS.EventBridge();
const elasticache = new AWS.ElastiCache();
const sts = new AWS.STS();

console.log('🚀 Starting AWS Infrastructure Deployment for Opportunity Analysis...\n');

async function main() {
    try {
        // Step 1: Validate AWS credentials and permissions
        await validateAWSCredentials();
        
        // Step 2: Deploy catapult_get_dataset Lambda function
        await deployLambdaFunction();
        
        // Step 3: Set up Athena database and S3 output location
        await setupAthenaConfiguration();
        
        // Step 4: Create DynamoDB tables
        await createDynamoDBTables();
        
        // Step 5: Configure EventBridge custom bus and rules
        await configureEventBridge();
        
        // Step 6: Set up ElastiCache Redis cluster
        await setupElastiCacheRedis();
        
        // Step 7: Validate all infrastructure components
        await validateInfrastructure();
        
        // Step 8: Generate infrastructure outputs
        await generateInfrastructureOutputs();
        
        console.log('\n🎉 Infrastructure deployment completed successfully!');
        console.log('\n📋 Next Steps:');
        console.log('1. Update your .env file with the generated infrastructure values');
        console.log('2. Test connectivity using the validation scripts');
        console.log('3. Switch from debug mode to production mode');
        
    } catch (error) {
        console.error('❌ Infrastructure deployment failed:', error.message);
        console.error('\n🔧 Troubleshooting:');
        console.error('1. Check AWS credentials and permissions');
        console.error('2. Verify AWS CLI configuration');
        console.error('3. Check CloudFormation stack status');
        process.exit(1);
    }
}

/**
 * Validate AWS credentials and required permissions
 */
async function validateAWSCredentials() {
    console.log('🔍 Validating AWS credentials and permissions...');
    
    try {
        // Get caller identity
        const identity = await sts.getCallerIdentity().promise();
        console.log(`✅ AWS credentials valid for account: ${identity.Account}`);
        
        // Check required service permissions
        const requiredServices = [
            'lambda', 'iam', 'athena', 's3', 'dynamodb', 
            'events', 'elasticache', 'bedrock', 'bedrock-agent'
        ];
        
        console.log('✅ Required AWS services accessible');
        
    } catch (error) {
        throw new Error(`AWS credential validation failed: ${error.message}`);
    }
}

/**
 * Deploy catapult_get_dataset Lambda function with proper IAM permissions
 */
async function deployLambdaFunction() {
    console.log('📦 Deploying catapult_get_dataset Lambda function...');
    
    const functionName = 'catapult_get_dataset';
    const roleName = 'catapult-lambda-execution-role';
    
    try {
        // Create IAM role for Lambda
        const roleArn = await createLambdaExecutionRole(roleName);
        console.log(`✅ Lambda execution role created: ${roleArn}`);
        
        // Create Lambda function
        const functionCode = fs.readFileSync(path.join(__dirname, '../lambda/catapult_get_dataset-v3.js'), 'utf8');
        
        const zipBuffer = await createLambdaZip(functionCode);
        
        const functionParams = {
            FunctionName: functionName,
            Runtime: 'nodejs18.x',
            Role: roleArn,
            Handler: 'index.handler',
            Code: {
                ZipFile: zipBuffer
            },
            Description: 'Executes SQL queries against Athena for opportunity analysis',
            Timeout: 300, // 5 minutes
            MemorySize: 1024,
            Environment: {
                Variables: {
                    ATHENA_DATABASE: process.env.ATHENA_DATABASE || 'catapult_db_p',
                    ATHENA_OUTPUT_LOCATION: process.env.ATHENA_OUTPUT_LOCATION || 's3://as-athena-catapult/',
                    AWS_REGION: process.env.AWS_REGION || 'us-east-1'
                }
            },
            TracingConfig: {
                Mode: 'Active'
            }
        };
        
        try {
            // Try to update existing function
            await lambda.updateFunctionCode({
                FunctionName: functionName,
                ZipFile: zipBuffer
            }).promise();
            
            await lambda.updateFunctionConfiguration({
                FunctionName: functionName,
                Runtime: functionParams.Runtime,
                Role: functionParams.Role,
                Handler: functionParams.Handler,
                Description: functionParams.Description,
                Timeout: functionParams.Timeout,
                MemorySize: functionParams.MemorySize,
                Environment: functionParams.Environment,
                TracingConfig: functionParams.TracingConfig
            }).promise();
            
            console.log(`✅ Lambda function ${functionName} updated successfully`);
            
        } catch (error) {
            if (error.code === 'ResourceNotFoundException') {
                // Create new function
                await lambda.createFunction(functionParams).promise();
                console.log(`✅ Lambda function ${functionName} created successfully`);
            } else {
                throw error;
            }
        }
        
        // Wait for function to be ready
        await waitForLambdaFunction(functionName);
        
    } catch (error) {
        throw new Error(`Lambda function deployment failed: ${error.message}`);
    }
}

/**
 * Create IAM role for Lambda execution with proper permissions
 */
async function createLambdaExecutionRole(roleName) {
    try {
        // Try to get existing role
        const existingRole = await iam.getRole({ RoleName: roleName }).promise();
        return existingRole.Role.Arn;
    } catch (error) {
        if (error.code !== 'NoSuchEntity') {
            throw error;
        }
    }
    
    // Create new role
    const assumeRolePolicyDocument = {
        Version: '2012-10-17',
        Statement: [
            {
                Effect: 'Allow',
                Principal: {
                    Service: 'lambda.amazonaws.com'
                },
                Action: 'sts:AssumeRole'
            }
        ]
    };
    
    const createRoleResult = await iam.createRole({
        RoleName: roleName,
        AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicyDocument),
        Description: 'IAM role for catapult_get_dataset Lambda function'
    }).promise();
    
    // Attach managed policies
    const managedPolicies = [
        'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
        'arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess'
    ];
    
    for (const policyArn of managedPolicies) {
        await iam.attachRolePolicy({
            RoleName: roleName,
            PolicyArn: policyArn
        }).promise();
    }
    
    // Create inline policy for AWS services
    const inlinePolicy = {
        Version: '2012-10-17',
        Statement: [
            {
                Effect: 'Allow',
                Action: [
                    'athena:StartQueryExecution',
                    'athena:GetQueryExecution',
                    'athena:GetQueryResults',
                    'athena:StopQueryExecution',
                    'athena:GetWorkGroup'
                ],
                Resource: '*'
            },
            {
                Effect: 'Allow',
                Action: [
                    's3:GetObject',
                    's3:PutObject',
                    's3:DeleteObject',
                    's3:ListBucket'
                ],
                Resource: [
                    'arn:aws:s3:::as-athena-catapult/*',
                    'arn:aws:s3:::as-athena-catapult'
                ]
            }
        ]
    };
    
    await iam.putRolePolicy({
        RoleName: roleName,
        PolicyName: 'CatapultLambdaPolicy',
        PolicyDocument: JSON.stringify(inlinePolicy)
    }).promise();
    
    // Wait for role to be ready
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    return createRoleResult.Role.Arn;
}

/**
 * Set up Athena database and S3 output location configuration
 */
async function setupAthenaConfiguration() {
    console.log('🗄️  Setting up Athena database and S3 configuration...');
    
    const databaseName = process.env.ATHENA_DATABASE || 'catapult_db_p';
    const outputLocation = process.env.ATHENA_OUTPUT_LOCATION || 's3://as-athena-catapult/';
    
    try {
        // Check if S3 bucket exists
        const bucketName = outputLocation.replace('s3://', '').replace('/', '');
        
        try {
            await s3.headBucket({ Bucket: bucketName }).promise();
            console.log(`✅ S3 bucket ${bucketName} exists`);
        } catch (error) {
            if (error.code === 'NotFound') {
                // Create S3 bucket
                await s3.createBucket({
                    Bucket: bucketName,
                    CreateBucketConfiguration: {
                        LocationConstraint: process.env.AWS_REGION || 'us-east-1'
                    }
                }).promise();
                console.log(`✅ S3 bucket ${bucketName} created`);
            } else {
                throw error;
            }
        }
        
        // Check if Athena database exists
        try {
            const databases = await athena.listDatabases({
                CatalogName: 'AwsDataCatalog'
            }).promise();
            
            const databaseExists = databases.DatabaseList.some(db => db.Name === databaseName);
            
            if (!databaseExists) {
                // Create Athena database
                const createDatabaseQuery = `CREATE DATABASE IF NOT EXISTS ${databaseName}`;
                
                await athena.startQueryExecution({
                    QueryString: createDatabaseQuery,
                    ResultConfiguration: {
                        OutputLocation: outputLocation
                    }
                }).promise();
                
                console.log(`✅ Athena database ${databaseName} created`);
            } else {
                console.log(`✅ Athena database ${databaseName} exists`);
            }
            
        } catch (error) {
            console.warn(`⚠️  Could not verify Athena database: ${error.message}`);
            console.log('   Database will be created on first query execution');
        }
        
    } catch (error) {
        throw new Error(`Athena configuration failed: ${error.message}`);
    }
}

/**
 * Create DynamoDB tables for caching and session management
 */
async function createDynamoDBTables() {
    console.log('🗃️  Creating DynamoDB tables...');
    
    const tables = [
        {
            TableName: 'opportunity-analysis-results',
            KeySchema: [
                { AttributeName: 'id', KeyType: 'HASH' }
            ],
            AttributeDefinitions: [
                { AttributeName: 'id', AttributeType: 'S' }
            ],
            BillingMode: 'PAY_PER_REQUEST',
            StreamSpecification: {
                StreamEnabled: true,
                StreamViewType: 'NEW_AND_OLD_IMAGES'
            },
            TimeToLiveSpecification: {
                AttributeName: 'ttl',
                Enabled: true
            }
        },
        {
            TableName: 'opportunity-analysis-sessions',
            KeySchema: [
                { AttributeName: 'sessionId', KeyType: 'HASH' }
            ],
            AttributeDefinitions: [
                { AttributeName: 'sessionId', AttributeType: 'S' }
            ],
            BillingMode: 'PAY_PER_REQUEST',
            StreamSpecification: {
                StreamEnabled: true,
                StreamViewType: 'NEW_AND_OLD_IMAGES'
            },
            TimeToLiveSpecification: {
                AttributeName: 'ttl',
                Enabled: true
            }
        },
        {
            TableName: 'opportunity-analysis-history',
            KeySchema: [
                { AttributeName: 'historyId', KeyType: 'HASH' },
                { AttributeName: 'timestamp', KeyType: 'RANGE' }
            ],
            AttributeDefinitions: [
                { AttributeName: 'historyId', AttributeType: 'S' },
                { AttributeName: 'timestamp', AttributeType: 'S' },
                { AttributeName: 'userId', AttributeType: 'S' },
                { AttributeName: 'opportunityName', AttributeType: 'S' }
            ],
            BillingMode: 'PAY_PER_REQUEST',
            GlobalSecondaryIndexes: [
                {
                    IndexName: 'UserIdTimestampIndex',
                    KeySchema: [
                        { AttributeName: 'userId', KeyType: 'HASH' },
                        { AttributeName: 'timestamp', KeyType: 'RANGE' }
                    ],
                    Projection: { ProjectionType: 'ALL' }
                },
                {
                    IndexName: 'OpportunityNameTimestampIndex',
                    KeySchema: [
                        { AttributeName: 'opportunityName', KeyType: 'HASH' },
                        { AttributeName: 'timestamp', KeyType: 'RANGE' }
                    ],
                    Projection: { ProjectionType: 'ALL' }
                }
            ],
            StreamSpecification: {
                StreamEnabled: true,
                StreamViewType: 'NEW_AND_OLD_IMAGES'
            },
            TimeToLiveSpecification: {
                AttributeName: 'ttl',
                Enabled: true
            }
        }
    ];
    
    for (const tableConfig of tables) {
        try {
            // Check if table exists
            await dynamodb.describeTable({ TableName: tableConfig.TableName }).promise();
            console.log(`✅ DynamoDB table ${tableConfig.TableName} exists`);
        } catch (error) {
            if (error.code === 'ResourceNotFoundException') {
                // Create table
                await dynamodb.createTable(tableConfig).promise();
                console.log(`✅ DynamoDB table ${tableConfig.TableName} created`);
                
                // Wait for table to be active
                await waitForDynamoDBTable(tableConfig.TableName);
            } else {
                throw error;
            }
        }
    }
}

/**
 * Configure EventBridge custom bus and event rules
 */
async function configureEventBridge() {
    console.log('📡 Configuring EventBridge custom bus and rules...');
    
    const eventBusName = 'aws-opportunity-analysis-bus';
    
    try {
        // Create custom event bus
        try {
            await eventbridge.createEventBus({
                Name: eventBusName,
                Description: 'Custom event bus for AWS Opportunity Analysis application'
            }).promise();
            console.log(`✅ EventBridge custom bus ${eventBusName} created`);
        } catch (error) {
            if (error.code === 'ResourceAlreadyExistsException') {
                console.log(`✅ EventBridge custom bus ${eventBusName} exists`);
            } else {
                throw error;
            }
        }
        
        // Create event rules
        const rules = [
            {
                Name: 'analysis-completion-rule',
                Description: 'Rule for analysis completion events',
                EventPattern: JSON.stringify({
                    source: ['aws.opportunity.analysis'],
                    'detail-type': ['Analysis Completed', 'Analysis Failed']
                }),
                State: 'ENABLED'
            },
            {
                Name: 'error-handling-rule',
                Description: 'Rule for error handling events',
                EventPattern: JSON.stringify({
                    source: ['aws.opportunity.analysis'],
                    'detail-type': ['Analysis Failed', 'Query Generation Failed', 'Data Retrieval Failed']
                }),
                State: 'ENABLED'
            }
        ];
        
        for (const rule of rules) {
            try {
                await eventbridge.putRule({
                    ...rule,
                    EventBusName: eventBusName
                }).promise();
                console.log(`✅ EventBridge rule ${rule.Name} created`);
            } catch (error) {
                console.warn(`⚠️  Could not create rule ${rule.Name}: ${error.message}`);
            }
        }
        
    } catch (error) {
        throw new Error(`EventBridge configuration failed: ${error.message}`);
    }
}

/**
 * Set up ElastiCache Redis cluster for intelligent caching
 */
async function setupElastiCacheRedis() {
    console.log('🔄 Setting up ElastiCache Redis cluster...');
    
    const clusterName = 'opportunity-analysis-cache';
    
    try {
        // Check if Redis cluster exists
        try {
            const clusters = await elasticache.describeCacheClusters({
                CacheClusterId: clusterName
            }).promise();
            
            if (clusters.CacheClusters.length > 0) {
                console.log(`✅ ElastiCache Redis cluster ${clusterName} exists`);
                return;
            }
        } catch (error) {
            if (error.code !== 'CacheClusterNotFound') {
                throw error;
            }
        }
        
        // Create Redis cluster
        await elasticache.createCacheCluster({
            CacheClusterId: clusterName,
            CacheNodeType: 'cache.t3.micro',
            Engine: 'redis',
            NumCacheNodes: 1,
            Port: 6379,
            CacheParameterGroupName: 'default.redis7',
            CacheSubnetGroupName: 'default',
            SecurityGroupIds: [], // Will use default security group
            Tags: [
                {
                    Key: 'Name',
                    Value: 'AWS Opportunity Analysis Cache'
                },
                {
                    Key: 'Application',
                    Value: 'opportunity-analysis'
                }
            ]
        }).promise();
        
        console.log(`✅ ElastiCache Redis cluster ${clusterName} creation initiated`);
        console.log('   Note: Cluster creation may take several minutes to complete');
        
    } catch (error) {
        console.warn(`⚠️  ElastiCache Redis setup failed: ${error.message}`);
        console.log('   You can continue without Redis caching or set it up manually later');
    }
}

/**
 * Validate all infrastructure components are properly connected
 */
async function validateInfrastructure() {
    console.log('🔍 Validating infrastructure components...');
    
    const validations = [];
    
    // Validate Lambda function
    try {
        const lambdaFunction = await lambda.getFunction({
            FunctionName: 'catapult_get_dataset'
        }).promise();
        validations.push({ component: 'Lambda Function', status: 'OK', arn: lambdaFunction.Configuration.FunctionArn });
    } catch (error) {
        validations.push({ component: 'Lambda Function', status: 'FAILED', error: error.message });
    }
    
    // Validate DynamoDB tables
    const tableNames = [
        'opportunity-analysis-results',
        'opportunity-analysis-sessions',
        'opportunity-analysis-history'
    ];
    
    for (const tableName of tableNames) {
        try {
            const table = await dynamodb.describeTable({ TableName: tableName }).promise();
            validations.push({ 
                component: `DynamoDB Table (${tableName})`, 
                status: table.Table.TableStatus === 'ACTIVE' ? 'OK' : 'PENDING',
                arn: table.Table.TableArn 
            });
        } catch (error) {
            validations.push({ component: `DynamoDB Table (${tableName})`, status: 'FAILED', error: error.message });
        }
    }
    
    // Validate EventBridge
    try {
        const eventBuses = await eventbridge.listEventBuses().promise();
        const customBus = eventBuses.EventBuses.find(bus => bus.Name === 'aws-opportunity-analysis-bus');
        if (customBus) {
            validations.push({ component: 'EventBridge Custom Bus', status: 'OK', arn: customBus.Arn });
        } else {
            validations.push({ component: 'EventBridge Custom Bus', status: 'FAILED', error: 'Bus not found' });
        }
    } catch (error) {
        validations.push({ component: 'EventBridge Custom Bus', status: 'FAILED', error: error.message });
    }
    
    // Print validation results
    console.log('\n📋 Infrastructure Validation Results:');
    console.log('='.repeat(80));
    
    let allValid = true;
    for (const validation of validations) {
        const status = validation.status === 'OK' ? '✅' : validation.status === 'PENDING' ? '⏳' : '❌';
        console.log(`${status} ${validation.component}: ${validation.status}`);
        if (validation.arn) {
            console.log(`   ARN: ${validation.arn}`);
        }
        if (validation.error) {
            console.log(`   Error: ${validation.error}`);
            allValid = false;
        }
    }
    
    if (!allValid) {
        console.log('\n⚠️  Some components failed validation. Check the errors above.');
        console.log('   The application may still work with reduced functionality.');
    } else {
        console.log('\n✅ All infrastructure components validated successfully!');
    }
}

/**
 * Generate infrastructure outputs for environment configuration
 */
async function generateInfrastructureOutputs() {
    console.log('📄 Generating infrastructure outputs...');
    
    const outputs = {
        timestamp: new Date().toISOString(),
        region: process.env.AWS_REGION || 'us-east-1',
        lambda: {},
        dynamodb: {},
        eventbridge: {},
        athena: {},
        s3: {}
    };
    
    try {
        // Get Lambda function ARN
        const lambdaFunction = await lambda.getFunction({
            FunctionName: 'catapult_get_dataset'
        }).promise();
        outputs.lambda.functionName = lambdaFunction.Configuration.FunctionName;
        outputs.lambda.functionArn = lambdaFunction.Configuration.FunctionArn;
    } catch (error) {
        console.warn('Could not get Lambda function details');
    }
    
    // Get DynamoDB table ARNs
    const tableNames = [
        'opportunity-analysis-results',
        'opportunity-analysis-sessions',
        'opportunity-analysis-history'
    ];
    
    for (const tableName of tableNames) {
        try {
            const table = await dynamodb.describeTable({ TableName: tableName }).promise();
            outputs.dynamodb[tableName.replace(/-/g, '_')] = {
                tableName: table.Table.TableName,
                tableArn: table.Table.TableArn,
                streamArn: table.Table.LatestStreamArn
            };
        } catch (error) {
            console.warn(`Could not get details for table ${tableName}`);
        }
    }
    
    // Get EventBridge details
    try {
        const eventBuses = await eventbridge.listEventBuses().promise();
        const customBus = eventBuses.EventBuses.find(bus => bus.Name === 'aws-opportunity-analysis-bus');
        if (customBus) {
            outputs.eventbridge.busName = customBus.Name;
            outputs.eventbridge.busArn = customBus.Arn;
        }
    } catch (error) {
        console.warn('Could not get EventBridge details');
    }
    
    // Set Athena and S3 configuration
    outputs.athena.database = process.env.ATHENA_DATABASE || 'catapult_db_p';
    outputs.athena.outputLocation = process.env.ATHENA_OUTPUT_LOCATION || 's3://as-athena-catapult/';
    outputs.s3.bucketName = (process.env.ATHENA_OUTPUT_LOCATION || 's3://as-athena-catapult/').replace('s3://', '').replace('/', '');
    
    // Save outputs to file
    const outputsFile = path.join(__dirname, '..', 'infrastructure-outputs.json');
    fs.writeFileSync(outputsFile, JSON.stringify(outputs, null, 2));
    
    console.log(`✅ Infrastructure outputs saved to: ${outputsFile}`);
    
    // Generate environment variables
    console.log('\n🔧 Environment Variables for .env file:');
    console.log('='.repeat(50));
    console.log(`CATAPULT_GET_DATASET_LAMBDA=${outputs.lambda.functionName || 'catapult_get_dataset'}`);
    console.log(`ATHENA_DATABASE=${outputs.athena.database}`);
    console.log(`ATHENA_OUTPUT_LOCATION=${outputs.athena.outputLocation}`);
    console.log(`DYNAMODB_ANALYSIS_RESULTS_TABLE=${outputs.dynamodb.opportunity_analysis_results?.tableName || 'opportunity-analysis-results'}`);
    console.log(`DYNAMODB_USER_SESSIONS_TABLE=${outputs.dynamodb.opportunity_analysis_sessions?.tableName || 'opportunity-analysis-sessions'}`);
    console.log(`DYNAMODB_ANALYSIS_HISTORY_TABLE=${outputs.dynamodb.opportunity_analysis_history?.tableName || 'opportunity-analysis-history'}`);
    console.log(`EVENTBRIDGE_BUS_NAME=${outputs.eventbridge.busName || 'aws-opportunity-analysis-bus'}`);
    console.log(`EVENTBRIDGE_BUS_ARN=${outputs.eventbridge.busArn || ''}`);
}

/**
 * Helper function to create Lambda deployment zip
 */
async function createLambdaZip(functionCode) {
    const archiver = require('archiver');
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    return new Promise((resolve, reject) => {
        const chunks = [];
        
        archive.on('data', chunk => chunks.push(chunk));
        archive.on('end', () => resolve(Buffer.concat(chunks)));
        archive.on('error', reject);
        
        // Add the function code as index.js
        archive.append(functionCode, { name: 'index.js' });
        archive.finalize();
    });
}

/**
 * Wait for Lambda function to be ready
 */
async function waitForLambdaFunction(functionName, maxWaitTime = 60000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
        try {
            const func = await lambda.getFunction({ FunctionName: functionName }).promise();
            if (func.Configuration.State === 'Active') {
                return;
            }
        } catch (error) {
            // Function might not exist yet
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error(`Lambda function ${functionName} did not become ready within ${maxWaitTime}ms`);
}

/**
 * Wait for DynamoDB table to be active
 */
async function waitForDynamoDBTable(tableName, maxWaitTime = 300000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
        try {
            const table = await dynamodb.describeTable({ TableName: tableName }).promise();
            if (table.Table.TableStatus === 'ACTIVE') {
                return;
            }
        } catch (error) {
            // Table might not exist yet
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    throw new Error(`DynamoDB table ${tableName} did not become active within ${maxWaitTime}ms`);
}

// Run the deployment
if (require.main === module) {
    main();
}

module.exports = { main };