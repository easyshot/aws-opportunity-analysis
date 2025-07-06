#!/usr/bin/env node

/**
 * Deployment script for AWS Opportunity Analysis Lambda functions
 * Creates and deploys all core processing Lambda functions
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// AWS Configuration
const lambda = new AWS.Lambda({
    region: process.env.AWS_REGION || 'us-east-1'
});

const iam = new AWS.IAM({
    region: process.env.AWS_REGION || 'us-east-1'
});

// Lambda function configurations
const LAMBDA_FUNCTIONS = [
    {
        name: 'aws-opportunity-analysis-main',
        handler: 'opportunity-analysis.handler',
        description: 'Main opportunity analysis orchestrator',
        timeout: 900, // 15 minutes
        memorySize: 1024,
        runtime: 'nodejs18.x',
        sourceFile: 'lambda/opportunity-analysis.js'
    },
    {
        name: 'aws-opportunity-query-generation',
        handler: 'query-generation.handler',
        description: 'SQL query generation using Bedrock',
        timeout: 300, // 5 minutes
        memorySize: 512,
        runtime: 'nodejs18.x',
        sourceFile: 'lambda/query-generation.js'
    },
    {
        name: 'aws-opportunity-data-retrieval',
        handler: 'data-retrieval.handler',
        description: 'Athena query execution and data processing',
        timeout: 600, // 10 minutes
        memorySize: 1024,
        runtime: 'nodejs18.x',
        sourceFile: 'lambda/data-retrieval.js'
    },
    {
        name: 'aws-opportunity-funding-analysis',
        handler: 'funding-analysis.handler',
        description: 'Funding options analysis using Bedrock',
        timeout: 300, // 5 minutes
        memorySize: 512,
        runtime: 'nodejs18.x',
        sourceFile: 'lambda/funding-analysis.js'
    },
    {
        name: 'aws-opportunity-follow-on-analysis',
        handler: 'follow-on-analysis.handler',
        description: 'Follow-on opportunity identification and analysis',
        timeout: 600, // 10 minutes
        memorySize: 1024,
        runtime: 'nodejs18.x',
        sourceFile: 'lambda/follow-on-analysis.js'
    }
];

// Environment variables for Lambda functions
const LAMBDA_ENVIRONMENT = {
    Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        POWERTOOLS_SERVICE_NAME: 'opportunity-analysis',
        POWERTOOLS_METRICS_NAMESPACE: 'OpportunityAnalysis',
        CATAPULT_QUERY_PROMPT_ID: process.env.CATAPULT_QUERY_PROMPT_ID || 'Y6T66EI3GZ',
        CATAPULT_ANALYSIS_PROMPT_ID: process.env.CATAPULT_ANALYSIS_PROMPT_ID || 'FDUHITJIME',
        CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID: process.env.CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID || 'P03B9TO1Q1',
        CATAPULT_GET_DATASET_LAMBDA: process.env.CATAPULT_GET_DATASET_LAMBDA || 'catapult_get_dataset',
        ATHENA_DATABASE: process.env.ATHENA_DATABASE || 'catapult_db_p',
        ATHENA_OUTPUT_LOCATION: process.env.ATHENA_OUTPUT_LOCATION || 's3://as-athena-catapult/'
    }
};

async function main() {
    try {
        console.log('Starting Lambda function deployment...');
        
        // Create or get IAM role for Lambda functions
        const roleArn = await createOrGetLambdaRole();
        console.log('Lambda execution role ready:', roleArn);
        
        // Create Lambda layer for shared utilities
        const layerArn = await createSharedUtilitiesLayer();
        console.log('Shared utilities layer ready:', layerArn);
        
        // Deploy each Lambda function
        for (const funcConfig of LAMBDA_FUNCTIONS) {
            console.log(`\nDeploying ${funcConfig.name}...`);
            await deployLambdaFunction(funcConfig, roleArn, layerArn);
            console.log(`✓ ${funcConfig.name} deployed successfully`);
        }
        
        console.log('\n🎉 All Lambda functions deployed successfully!');
        
        // Print function ARNs for reference
        console.log('\nDeployed Lambda Functions:');
        for (const funcConfig of LAMBDA_FUNCTIONS) {
            const functionArn = `arn:aws:lambda:${process.env.AWS_REGION || 'us-east-1'}:${await getAccountId()}:function:${funcConfig.name}`;
            console.log(`- ${funcConfig.name}: ${functionArn}`);
        }
        
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    }
}

/**
 * Create or get existing IAM role for Lambda functions
 */
async function createOrGetLambdaRole() {
    const roleName = 'aws-opportunity-analysis-lambda-role';
    
    try {
        // Try to get existing role
        const result = await iam.getRole({ RoleName: roleName }).promise();
        return result.Role.Arn;
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
        Description: 'IAM role for AWS Opportunity Analysis Lambda functions'
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
    
    // Create and attach inline policy for AWS services
    const inlinePolicy = {
        Version: '2012-10-17',
        Statement: [
            {
                Effect: 'Allow',
                Action: [
                    'bedrock:InvokeModel',
                    'bedrock:InvokeModelWithResponseStream',
                    'bedrock-agent:GetPrompt',
                    'bedrock-runtime:Converse',
                    'bedrock-runtime:ConverseStream'
                ],
                Resource: '*'
            },
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
            },
            {
                Effect: 'Allow',
                Action: [
                    'lambda:InvokeFunction'
                ],
                Resource: '*'
            }
        ]
    };
    
    await iam.putRolePolicy({
        RoleName: roleName,
        PolicyName: 'OpportunityAnalysisLambdaPolicy',
        PolicyDocument: JSON.stringify(inlinePolicy)
    }).promise();
    
    // Wait for role to be ready
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    return createRoleResult.Role.Arn;
}

/**
 * Create Lambda layer for shared utilities
 */
async function createSharedUtilitiesLayer() {
    const layerName = 'aws-opportunity-analysis-shared-utilities';
    
    // Create zip file for layer
    const layerZipPath = await createLayerZip();
    
    try {
        const layerCode = fs.readFileSync(layerZipPath);
        
        const result = await lambda.publishLayerVersion({
            LayerName: layerName,
            Description: 'Shared utilities and AWS clients for Opportunity Analysis',
            Content: {
                ZipFile: layerCode
            },
            CompatibleRuntimes: ['nodejs18.x'],
            CompatibleArchitectures: ['x86_64']
        }).promise();
        
        return result.LayerVersionArn;
    } finally {
        // Clean up zip file
        if (fs.existsSync(layerZipPath)) {
            fs.unlinkSync(layerZipPath);
        }
    }
}

/**
 * Create zip file for Lambda layer
 */
async function createLayerZip() {
    const zipPath = path.join(__dirname, '../temp-layer.zip');
    
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        output.on('close', () => resolve(zipPath));
        archive.on('error', reject);
        
        archive.pipe(output);
        
        // Add shared utilities to the layer
        archive.directory(path.join(__dirname, '../lambda/layers/shared-utilities'), false);
        
        archive.finalize();
    });
}

/**
 * Deploy individual Lambda function
 */
async function deployLambdaFunction(funcConfig, roleArn, layerArn) {
    const zipPath = await createFunctionZip(funcConfig);
    
    try {
        const functionCode = fs.readFileSync(zipPath);
        
        const params = {
            FunctionName: funcConfig.name,
            Runtime: funcConfig.runtime,
            Role: roleArn,
            Handler: funcConfig.handler,
            Code: {
                ZipFile: functionCode
            },
            Description: funcConfig.description,
            Timeout: funcConfig.timeout,
            MemorySize: funcConfig.memorySize,
            Environment: LAMBDA_ENVIRONMENT,
            Layers: [layerArn],
            TracingConfig: {
                Mode: 'Active'
            }
        };
        
        try {
            // Try to update existing function
            await lambda.updateFunctionCode({
                FunctionName: funcConfig.name,
                ZipFile: functionCode
            }).promise();
            
            await lambda.updateFunctionConfiguration({
                FunctionName: funcConfig.name,
                Runtime: funcConfig.runtime,
                Role: roleArn,
                Handler: funcConfig.handler,
                Description: funcConfig.description,
                Timeout: funcConfig.timeout,
                MemorySize: funcConfig.memorySize,
                Environment: LAMBDA_ENVIRONMENT,
                Layers: [layerArn],
                TracingConfig: {
                    Mode: 'Active'
                }
            }).promise();
            
        } catch (error) {
            if (error.code === 'ResourceNotFoundException') {
                // Create new function
                await lambda.createFunction(params).promise();
            } else {
                throw error;
            }
        }
        
    } finally {
        // Clean up zip file
        if (fs.existsSync(zipPath)) {
            fs.unlinkSync(zipPath);
        }
    }
}

/**
 * Create zip file for Lambda function
 */
async function createFunctionZip(funcConfig) {
    const zipPath = path.join(__dirname, `../temp-${funcConfig.name}.zip`);
    
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        output.on('close', () => resolve(zipPath));
        archive.on('error', reject);
        
        archive.pipe(output);
        
        // Add the main function file
        archive.file(path.join(__dirname, '..', funcConfig.sourceFile), { 
            name: path.basename(funcConfig.sourceFile) 
        });
        
        archive.finalize();
    });
}

/**
 * Get AWS account ID
 */
async function getAccountId() {
    const sts = new AWS.STS();
    const result = await sts.getCallerIdentity().promise();
    return result.Account;
}

// Run the deployment
if (require.main === module) {
    main();
}

module.exports = { main };