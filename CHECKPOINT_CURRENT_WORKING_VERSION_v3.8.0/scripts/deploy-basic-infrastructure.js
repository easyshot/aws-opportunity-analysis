#!/usr/bin/env node

/**
 * Basic AWS Infrastructure Deployment Script
 * Deploys the minimum required AWS resources for the Opportunity Analysis application
 */

require('dotenv').config();
const { 
  LambdaClient, 
  CreateFunctionCommand,
  UpdateFunctionCodeCommand,
  GetFunctionCommand,
  CreateEventSourceMappingCommand
} = require('@aws-sdk/client-lambda');
const { 
  IAMClient, 
  CreateRoleCommand,
  AttachRolePolicyCommand,
  GetRoleCommand
} = require('@aws-sdk/client-iam');
const { 
  DynamoDBClient, 
  CreateTableCommand,
  DescribeTableCommand
} = require('@aws-sdk/client-dynamodb');
const { 
  EventBridgeClient, 
  CreateEventBusCommand,
  DescribeEventBusCommand
} = require('@aws-sdk/client-eventbridge');
const { 
  S3Client, 
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand
} = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const LAMBDA_FUNCTION_NAME = process.env.CATAPULT_GET_DATASET_LAMBDA || 'catapult_get_dataset';
const ATHENA_OUTPUT_BUCKET = process.env.ATHENA_OUTPUT_LOCATION?.replace('s3://', '').replace('/', '') || 'aws-athena-query-results-' + Date.now();

// Initialize AWS clients
const lambda = new LambdaClient({ region: AWS_REGION });
const iam = new IAMClient({ region: AWS_REGION });
const dynamodb = new DynamoDBClient({ region: AWS_REGION });
const eventbridge = new EventBridgeClient({ region: AWS_REGION });
const s3 = new S3Client({ region: AWS_REGION });

/**
 * Main deployment function
 */
async function deployBasicInfrastructure() {
  console.log('🚀 Deploying Basic AWS Infrastructure');
  console.log('====================================\n');
  
  const deploymentResults = {
    timestamp: new Date().toISOString(),
    region: AWS_REGION,
    resources: [],
    errors: []
  };
  
  try {
    // Deploy in order of dependencies
    deploymentResults.resources.push(await deployS3Bucket());
    deploymentResults.resources.push(await deployIAMRole());
    deploymentResults.resources.push(await deployLambdaFunction());
    deploymentResults.resources.push(await deployDynamoDBTables());
    deploymentResults.resources.push(await deployEventBridge());
    
    // Display results
    displayDeploymentResults(deploymentResults);
    
    return deploymentResults;
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    deploymentResults.errors.push(error.message);
    return deploymentResults;
  }
}

/**
 * Deploy S3 bucket for Athena results
 */
async function deployS3Bucket() {
  const result = {
    resource: 'S3 Bucket',
    name: ATHENA_OUTPUT_BUCKET,
    status: 'success',
    action: 'none'
  };
  
  try {
    console.log('🪣 Deploying S3 Bucket for Athena...');
    
    // Check if bucket exists
    try {
      await s3.send(new HeadBucketCommand({ Bucket: ATHENA_OUTPUT_BUCKET }));
      result.action = 'exists';
      console.log(`  ✅ S3 bucket already exists: ${ATHENA_OUTPUT_BUCKET}`);
    } catch (error) {
      if (error.name === 'NotFound') {
        // Create bucket
        const createBucketParams = {
          Bucket: ATHENA_OUTPUT_BUCKET
        };
        
        // Add location constraint for regions other than us-east-1
        if (AWS_REGION !== 'us-east-1') {
          createBucketParams.CreateBucketConfiguration = {
            LocationConstraint: AWS_REGION
          };
        }
        
        await s3.send(new CreateBucketCommand(createBucketParams));
        result.action = 'created';
        console.log(`  ✅ S3 bucket created: ${ATHENA_OUTPUT_BUCKET}`);
        
        // Set bucket policy for Athena access
        const bucketPolicy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'athena.amazonaws.com'
              },
              Action: [
                's3:GetBucketLocation',
                's3:GetObject',
                's3:ListBucket',
                's3:PutObject'
              ],
              Resource: [
                `arn:aws:s3:::${ATHENA_OUTPUT_BUCKET}`,
                `arn:aws:s3:::${ATHENA_OUTPUT_BUCKET}/*`
              ]
            }
          ]
        };
        
        await s3.send(new PutBucketPolicyCommand({
          Bucket: ATHENA_OUTPUT_BUCKET,
          Policy: JSON.stringify(bucketPolicy)
        }));
        
        console.log('  ✅ Bucket policy configured for Athena access');
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    result.status = 'error';
    result.error = error.message;
    console.log(`  ❌ S3 bucket deployment failed: ${error.message}`);
  }
  
  return result;
}

/**
 * Deploy IAM role for Lambda function
 */
async function deployIAMRole() {
  const roleName = `${LAMBDA_FUNCTION_NAME}-execution-role`;
  const result = {
    resource: 'IAM Role',
    name: roleName,
    status: 'success',
    action: 'none'
  };
  
  try {
    console.log('🔐 Deploying IAM Role for Lambda...');
    
    // Check if role exists
    try {
      await iam.send(new GetRoleCommand({ RoleName: roleName }));
      result.action = 'exists';
      console.log(`  ✅ IAM role already exists: ${roleName}`);
    } catch (error) {
      if (error.name === 'NoSuchEntity') {
        // Create role
        const assumeRolePolicy = {
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
        
        await iam.send(new CreateRoleCommand({
          RoleName: roleName,
          AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicy),
          Description: 'Execution role for catapult_get_dataset Lambda function'
        }));
        
        result.action = 'created';
        console.log(`  ✅ IAM role created: ${roleName}`);
        
        // Attach policies
        const policies = [
          'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
          'arn:aws:iam::aws:policy/AmazonAthenaFullAccess',
          'arn:aws:iam::aws:policy/AmazonS3FullAccess'
        ];
        
        for (const policyArn of policies) {
          await iam.send(new AttachRolePolicyCommand({
            RoleName: roleName,
            PolicyArn: policyArn
          }));
          console.log(`  ✅ Policy attached: ${policyArn}`);
        }
        
        // Wait for role propagation
        console.log('  ⏳ Waiting for IAM role propagation...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    result.status = 'error';
    result.error = error.message;
    console.log(`  ❌ IAM role deployment failed: ${error.message}`);
  }
  
  return result;
}

/**
 * Deploy Lambda function
 */
async function deployLambdaFunction() {
  const result = {
    resource: 'Lambda Function',
    name: LAMBDA_FUNCTION_NAME,
    status: 'success',
    action: 'none'
  };
  
  try {
    console.log('⚡ Deploying Lambda Function...');
    
    // Create Lambda function code
    const lambdaCode = createLambdaFunctionCode();
    const zipBuffer = createZipBuffer(lambdaCode);
    
    const roleName = `${LAMBDA_FUNCTION_NAME}-execution-role`;
    const roleArn = `arn:aws:iam::${await getAccountId()}:role/${roleName}`;
    
    // Check if function exists
    try {
      await lambda.send(new GetFunctionCommand({ FunctionName: LAMBDA_FUNCTION_NAME }));
      
      // Update existing function
      await lambda.send(new UpdateFunctionCodeCommand({
        FunctionName: LAMBDA_FUNCTION_NAME,
        ZipFile: zipBuffer
      }));
      
      result.action = 'updated';
      console.log(`  ✅ Lambda function updated: ${LAMBDA_FUNCTION_NAME}`);
      
    } catch (error) {
      if (error.name === 'ResourceNotFoundException') {
        // Create new function
        await lambda.send(new CreateFunctionCommand({
          FunctionName: LAMBDA_FUNCTION_NAME,
          Runtime: 'nodejs18.x',
          Role: roleArn,
          Handler: 'index.handler',
          Code: { ZipFile: zipBuffer },
          Description: 'Executes Athena queries for opportunity analysis',
          Timeout: 300,
          MemorySize: 512,
          Environment: {
            Variables: {
              ATHENA_DATABASE: process.env.ATHENA_DATABASE || 'default',
              ATHENA_OUTPUT_LOCATION: `s3://${ATHENA_OUTPUT_BUCKET}/`
            }
          }
        }));
        
        result.action = 'created';
        console.log(`  ✅ Lambda function created: ${LAMBDA_FUNCTION_NAME}`);
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    result.status = 'error';
    result.error = error.message;
    console.log(`  ❌ Lambda function deployment failed: ${error.message}`);
  }
  
  return result;
}

/**
 * Deploy DynamoDB tables
 */
async function deployDynamoDBTables() {
  const tables = [
    {
      name: 'opportunity-analysis-results',
      keySchema: [{ AttributeName: 'opportunityId', KeyType: 'HASH' }],
      attributeDefinitions: [{ AttributeName: 'opportunityId', AttributeType: 'S' }]
    },
    {
      name: 'opportunity-analysis-sessions',
      keySchema: [{ AttributeName: 'sessionId', KeyType: 'HASH' }],
      attributeDefinitions: [{ AttributeName: 'sessionId', AttributeType: 'S' }]
    },
    {
      name: 'opportunity-analysis-history',
      keySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }, { AttributeName: 'timestamp', KeyType: 'RANGE' }],
      attributeDefinitions: [
        { AttributeName: 'userId', AttributeType: 'S' },
        { AttributeName: 'timestamp', AttributeType: 'S' }
      ]
    }
  ];
  
  const result = {
    resource: 'DynamoDB Tables',
    tables: [],
    status: 'success',
    action: 'none'
  };
  
  try {
    console.log('📊 Deploying DynamoDB Tables...');
    
    for (const tableConfig of tables) {
      try {
        // Check if table exists
        await dynamodb.send(new DescribeTableCommand({ TableName: tableConfig.name }));
        result.tables.push({ name: tableConfig.name, action: 'exists' });
        console.log(`  ✅ DynamoDB table already exists: ${tableConfig.name}`);
      } catch (error) {
        if (error.name === 'ResourceNotFoundException') {
          // Create table
          await dynamodb.send(new CreateTableCommand({
            TableName: tableConfig.name,
            KeySchema: tableConfig.keySchema,
            AttributeDefinitions: tableConfig.attributeDefinitions,
            BillingMode: 'PAY_PER_REQUEST',
            Tags: [
              { Key: 'Application', Value: 'OpportunityAnalysis' },
              { Key: 'Environment', Value: process.env.NODE_ENV || 'development' }
            ]
          }));
          
          result.tables.push({ name: tableConfig.name, action: 'created' });
          console.log(`  ✅ DynamoDB table created: ${tableConfig.name}`);
        } else {
          throw error;
        }
      }
    }
    
  } catch (error) {
    result.status = 'error';
    result.error = error.message;
    console.log(`  ❌ DynamoDB tables deployment failed: ${error.message}`);
  }
  
  return result;
}

/**
 * Deploy EventBridge custom bus
 */
async function deployEventBridge() {
  const busName = 'aws-opportunity-analysis-bus';
  const result = {
    resource: 'EventBridge Bus',
    name: busName,
    status: 'success',
    action: 'none'
  };
  
  try {
    console.log('🚌 Deploying EventBridge Bus...');
    
    // Check if bus exists
    try {
      await eventbridge.send(new DescribeEventBusCommand({ Name: busName }));
      result.action = 'exists';
      console.log(`  ✅ EventBridge bus already exists: ${busName}`);
    } catch (error) {
      if (error.name === 'ResourceNotFoundException') {
        // Create bus
        await eventbridge.send(new CreateEventBusCommand({
          Name: busName,
          Tags: [
            { Key: 'Application', Value: 'OpportunityAnalysis' },
            { Key: 'Environment', Value: process.env.NODE_ENV || 'development' }
          ]
        }));
        
        result.action = 'created';
        console.log(`  ✅ EventBridge bus created: ${busName}`);
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    result.status = 'error';
    result.error = error.message;
    console.log(`  ❌ EventBridge bus deployment failed: ${error.message}`);
  }
  
  return result;
}

/**
 * Create Lambda function code
 */
function createLambdaFunctionCode() {
  return `
const { AthenaClient, StartQueryExecutionCommand, GetQueryExecutionCommand, GetQueryResultsCommand } = require('@aws-sdk/client-athena');

const athena = new AthenaClient({ region: process.env.AWS_REGION || 'us-east-1' });

exports.handler = async (event) => {
  console.log('Lambda function invoked with event:', JSON.stringify(event, null, 2));
  
  try {
    const { sql_query } = event;
    
    if (!sql_query) {
      throw new Error('sql_query parameter is required');
    }
    
    // Start query execution
    const startQueryCommand = new StartQueryExecutionCommand({
      QueryString: sql_query,
      QueryExecutionContext: {
        Database: process.env.ATHENA_DATABASE || 'default'
      },
      ResultConfiguration: {
        OutputLocation: process.env.ATHENA_OUTPUT_LOCATION || 's3://aws-athena-query-results/'
      }
    });
    
    const queryResponse = await athena.send(startQueryCommand);
    const queryExecutionId = queryResponse.QueryExecutionId;
    
    console.log('Query started with ID:', queryExecutionId);
    
    // Wait for query completion
    let queryStatus = 'RUNNING';
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes timeout
    
    while (queryStatus === 'RUNNING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const getQueryCommand = new GetQueryExecutionCommand({
        QueryExecutionId: queryExecutionId
      });
      
      const queryExecution = await athena.send(getQueryCommand);
      queryStatus = queryExecution.QueryExecution.Status.State;
      attempts++;
      
      console.log(\`Query status: \${queryStatus}, attempt: \${attempts}\`);
    }
    
    if (queryStatus !== 'SUCCEEDED') {
      throw new Error(\`Query failed with status: \${queryStatus}\`);
    }
    
    // Get query results
    const getResultsCommand = new GetQueryResultsCommand({
      QueryExecutionId: queryExecutionId
    });
    
    const resultsResponse = await athena.send(getResultsCommand);
    
    // Process results into the expected format
    const resultSet = resultsResponse.ResultSet;
    const rows = resultSet.Rows || [];
    
    if (rows.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'success',
          data: [],
          message: 'No results found'
        })
      };
    }
    
    // Extract headers from first row
    const headers = rows[0].Data.map(col => col.VarCharValue);
    
    // Process data rows
    const data = rows.slice(1).map(row => {
      const rowData = {};
      row.Data.forEach((col, index) => {
        rowData[headers[index]] = col.VarCharValue;
      });
      return rowData;
    });
    
    console.log(\`Query completed successfully, returned \${data.length} rows\`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'success',
        data: data,
        queryExecutionId: queryExecutionId,
        rowCount: data.length
      })
    };
    
  } catch (error) {
    console.error('Lambda function error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'error',
        message: error.message,
        data: []
      })
    };
  }
};
`;
}

/**
 * Create ZIP buffer for Lambda deployment
 */
function createZipBuffer(code) {
  const JSZip = require('jszip');
  const zip = new JSZip();
  
  // Add main handler file
  zip.file('index.js', code);
  
  // Add package.json
  const packageJson = {
    name: 'catapult-get-dataset',
    version: '1.0.0',
    description: 'Lambda function for executing Athena queries',
    main: 'index.js',
    dependencies: {
      '@aws-sdk/client-athena': '^3.0.0'
    }
  };
  
  zip.file('package.json', JSON.stringify(packageJson, null, 2));
  
  return zip.generateSync({ type: 'nodebuffer' });
}

/**
 * Get AWS account ID
 */
async function getAccountId() {
  const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
  const sts = new STSClient({ region: AWS_REGION });
  
  const response = await sts.send(new GetCallerIdentityCommand({}));
  return response.Account;
}

/**
 * Display deployment results
 */
function displayDeploymentResults(results) {
  console.log('\n📋 Deployment Results Summary');
  console.log('=============================');
  console.log(`Timestamp: ${results.timestamp}`);
  console.log(`Region: ${results.region}\n`);
  
  results.resources.forEach(resource => {
    const emoji = resource.status === 'success' ? '✅' : '❌';
    console.log(`${emoji} ${resource.resource}: ${resource.name}`);
    console.log(`   Action: ${resource.action}`);
    if (resource.error) {
      console.log(`   Error: ${resource.error}`);
    }
    if (resource.tables) {
      resource.tables.forEach(table => {
        console.log(`   - ${table.name}: ${table.action}`);
      });
    }
    console.log('');
  });
  
  if (results.errors.length > 0) {
    console.log('❌ Deployment Errors:');
    results.errors.forEach(error => {
      console.log(`   - ${error}`);
    });
  } else {
    console.log('✅ All resources deployed successfully!');
    console.log('\n🚀 Next Steps:');
    console.log('1. Run connectivity validation: node scripts/validate-aws-connectivity.js');
    console.log('2. Switch to production mode: npm start');
    console.log('3. Test the application at: http://localhost:3123/index-compact.html');
  }
}

// Install JSZip if not available
try {
  require('jszip');
} catch (error) {
  console.log('Installing JSZip dependency...');
  execSync('npm install jszip', { stdio: 'inherit' });
}

// Run deployment if called directly
if (require.main === module) {
  deployBasicInfrastructure()
    .then(results => {
      const hasErrors = results.errors.length > 0 || results.resources.some(r => r.status === 'error');
      process.exit(hasErrors ? 1 : 0);
    })
    .catch(error => {
      console.error('Deployment script failed:', error);
      process.exit(1);
    });
}

module.exports = { deployBasicInfrastructure };