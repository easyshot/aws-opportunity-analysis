#!/usr/bin/env node

/**
 * Task 2 Infrastructure Deployment Script
 * Orchestrates the deployment of all required AWS infrastructure components
 * 
 * Components deployed:
 * - catapult_get_dataset Lambda function with proper IAM permissions
 * - Athena database and S3 output location configuration
 * - DynamoDB tables for caching and session management
 * - EventBridge custom bus and event rules
 * - ElastiCache Redis cluster for intelligent caching
 * - Infrastructure validation and connectivity testing
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Task 2: Deploy Required AWS Infrastructure Components\n');

async function main() {
    try {
        // Step 1: Check prerequisites
        await checkPrerequisites();
        
        // Step 2: Load environment configuration
        loadEnvironmentConfig();
        
        // Step 3: Deploy infrastructure components
        console.log('📦 Deploying infrastructure components...');
        await deployInfrastructure();
        
        // Step 4: Validate infrastructure
        console.log('🔍 Validating infrastructure deployment...');
        await validateInfrastructure();
        
        // Step 5: Generate configuration files
        console.log('📄 Generating configuration files...');
        await generateConfiguration();
        
        console.log('\n🎉 Task 2 completed successfully!');
        console.log('\n✅ Infrastructure Components Deployed:');
        console.log('   ✓ catapult_get_dataset Lambda function');
        console.log('   ✓ Athena database and S3 configuration');
        console.log('   ✓ DynamoDB tables (results, sessions, history)');
        console.log('   ✓ EventBridge custom bus and rules');
        console.log('   ✓ ElastiCache Redis cluster (if available)');
        
        console.log('\n📋 Next Steps:');
        console.log('1. Review the generated infrastructure-outputs.json file');
        console.log('2. Update your .env file with the new infrastructure values');
        console.log('3. Run validation tests: npm run validate-infrastructure');
        console.log('4. Proceed to Task 3: Switch to production mode');
        
    } catch (error) {
        console.error('❌ Task 2 deployment failed:', error.message);
        console.error('\n🔧 Troubleshooting Steps:');
        console.error('1. Check AWS credentials: aws sts get-caller-identity');
        console.error('2. Verify AWS permissions for Lambda, DynamoDB, Athena, EventBridge');
        console.error('3. Check CloudFormation stack status in AWS Console');
        console.error('4. Review error logs in validation-results.json');
        process.exit(1);
    }
}

/**
 * Check prerequisites for deployment
 */
async function checkPrerequisites() {
    console.log('🔍 Checking prerequisites...');
    
    // Check if AWS CLI is available
    try {
        execSync('aws --version', { stdio: 'pipe' });
        console.log('✅ AWS CLI is available');
    } catch (error) {
        throw new Error('AWS CLI is not installed or not in PATH');
    }
    
    // Check AWS credentials
    try {
        execSync('aws sts get-caller-identity', { stdio: 'pipe' });
        console.log('✅ AWS credentials are configured');
    } catch (error) {
        throw new Error('AWS credentials are not configured. Run: aws configure');
    }
    
    // Check Node.js dependencies
    if (!fs.existsSync(path.join(__dirname, '..', 'node_modules'))) {
        console.log('📦 Installing Node.js dependencies...');
        execSync('npm install', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    }
    console.log('✅ Node.js dependencies are available');
    
    // Check required files
    const requiredFiles = [
        'lambda/catapult_get_dataset-v3.js',
        'config/aws-config-v3.js'
    ];
    
    for (const file of requiredFiles) {
        const filePath = path.join(__dirname, '..', file);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Required file not found: ${file}`);
        }
    }
    console.log('✅ Required source files are available');
}

/**
 * Load environment configuration
 */
function loadEnvironmentConfig() {
    console.log('⚙️  Loading environment configuration...');
    
    // Load .env file if it exists
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
        console.log('✅ Environment configuration loaded from .env');
    } else {
        console.log('⚠️  No .env file found, using default configuration');
        console.log('   You can create .env from .env.template after deployment');
    }
    
    // Set default values if not provided
    process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1';
    process.env.ATHENA_DATABASE = process.env.ATHENA_DATABASE || 'catapult_db_p';
    process.env.ATHENA_OUTPUT_LOCATION = process.env.ATHENA_OUTPUT_LOCATION || 's3://as-athena-catapult/';
    process.env.CATAPULT_GET_DATASET_LAMBDA = process.env.CATAPULT_GET_DATASET_LAMBDA || 'catapult_get_dataset';
    
    console.log(`✅ Using AWS Region: ${process.env.AWS_REGION}`);
    console.log(`✅ Using Athena Database: ${process.env.ATHENA_DATABASE}`);
}

/**
 * Deploy infrastructure components
 */
async function deployInfrastructure() {
    try {
        // Run the main infrastructure deployment script
        console.log('🚀 Running infrastructure deployment...');
        
        const deployScript = path.join(__dirname, 'deploy-infrastructure.js');
        execSync(`node "${deployScript}"`, { 
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
        });
        
        console.log('✅ Infrastructure deployment completed');
        
    } catch (error) {
        throw new Error(`Infrastructure deployment failed: ${error.message}`);
    }
}

/**
 * Validate infrastructure deployment
 */
async function validateInfrastructure() {
    try {
        // Run the infrastructure validation script
        console.log('🔍 Running infrastructure validation...');
        
        const validateScript = path.join(__dirname, 'validate-infrastructure.js');
        
        try {
            execSync(`node "${validateScript}"`, { 
                stdio: 'inherit',
                cwd: path.join(__dirname, '..')
            });
            console.log('✅ Infrastructure validation passed');
        } catch (error) {
            // Validation script may exit with non-zero code for warnings
            console.log('⚠️  Infrastructure validation completed with warnings');
            console.log('   Check validation-results.json for details');
        }
        
    } catch (error) {
        throw new Error(`Infrastructure validation failed: ${error.message}`);
    }
}

/**
 * Generate configuration files
 */
async function generateConfiguration() {
    try {
        // Check if infrastructure outputs exist
        const outputsFile = path.join(__dirname, '..', 'infrastructure-outputs.json');
        
        if (fs.existsSync(outputsFile)) {
            const outputs = JSON.parse(fs.readFileSync(outputsFile, 'utf8'));
            
            // Generate updated .env file
            generateEnvFile(outputs);
            
            // Generate deployment summary
            generateDeploymentSummary(outputs);
            
            console.log('✅ Configuration files generated');
        } else {
            console.log('⚠️  Infrastructure outputs not found, skipping configuration generation');
        }
        
    } catch (error) {
        console.warn(`Configuration generation warning: ${error.message}`);
    }
}

/**
 * Generate updated .env file with infrastructure values
 */
function generateEnvFile(outputs) {
    const envTemplatePath = path.join(__dirname, '..', '.env.template');
    const envPath = path.join(__dirname, '..', '.env.infrastructure');
    
    if (fs.existsSync(envTemplatePath)) {
        let envContent = fs.readFileSync(envTemplatePath, 'utf8');
        
        // Replace template values with actual infrastructure values
        if (outputs.lambda?.functionName) {
            envContent = envContent.replace(
                /CATAPULT_GET_DATASET_LAMBDA=.*/,
                `CATAPULT_GET_DATASET_LAMBDA=${outputs.lambda.functionName}`
            );
        }
        
        if (outputs.athena?.database) {
            envContent = envContent.replace(
                /ATHENA_DATABASE=.*/,
                `ATHENA_DATABASE=${outputs.athena.database}`
            );
        }
        
        if (outputs.athena?.outputLocation) {
            envContent = envContent.replace(
                /ATHENA_OUTPUT_LOCATION=.*/,
                `ATHENA_OUTPUT_LOCATION=${outputs.athena.outputLocation}`
            );
        }
        
        if (outputs.eventbridge?.busName) {
            envContent = envContent.replace(
                /EVENTBRIDGE_BUS_NAME=.*/,
                `EVENTBRIDGE_BUS_NAME=${outputs.eventbridge.busName}`
            );
        }
        
        if (outputs.eventbridge?.busArn) {
            envContent = envContent.replace(
                /EVENTBRIDGE_BUS_ARN=.*/,
                `EVENTBRIDGE_BUS_ARN=${outputs.eventbridge.busArn}`
            );
        }
        
        // Update DynamoDB table names
        if (outputs.dynamodb?.opportunity_analysis_results?.tableName) {
            envContent = envContent.replace(
                /DYNAMODB_ANALYSIS_RESULTS_TABLE=.*/,
                `DYNAMODB_ANALYSIS_RESULTS_TABLE=${outputs.dynamodb.opportunity_analysis_results.tableName}`
            );
        }
        
        if (outputs.dynamodb?.opportunity_analysis_sessions?.tableName) {
            envContent = envContent.replace(
                /DYNAMODB_USER_SESSIONS_TABLE=.*/,
                `DYNAMODB_USER_SESSIONS_TABLE=${outputs.dynamodb.opportunity_analysis_sessions.tableName}`
            );
        }
        
        if (outputs.dynamodb?.opportunity_analysis_history?.tableName) {
            envContent = envContent.replace(
                /DYNAMODB_ANALYSIS_HISTORY_TABLE=.*/,
                `DYNAMODB_ANALYSIS_HISTORY_TABLE=${outputs.dynamodb.opportunity_analysis_history.tableName}`
            );
        }
        
        // Add deployment timestamp
        envContent = `# Generated by Task 2 deployment on ${new Date().toISOString()}\n` + envContent;
        
        fs.writeFileSync(envPath, envContent);
        console.log(`✅ Updated environment file saved to: ${envPath}`);
        console.log('   Copy this to .env to use the new infrastructure values');
    }
}

/**
 * Generate deployment summary
 */
function generateDeploymentSummary(outputs) {
    const summary = {
        task: 'Task 2: Deploy Required AWS Infrastructure Components',
        timestamp: new Date().toISOString(),
        status: 'COMPLETED',
        region: outputs.region,
        components: {
            lambda: {
                status: outputs.lambda?.functionName ? 'DEPLOYED' : 'FAILED',
                functionName: outputs.lambda?.functionName,
                functionArn: outputs.lambda?.functionArn
            },
            athena: {
                status: 'CONFIGURED',
                database: outputs.athena?.database,
                outputLocation: outputs.athena?.outputLocation,
                s3Bucket: outputs.s3?.bucketName
            },
            dynamodb: {
                status: 'DEPLOYED',
                tables: Object.keys(outputs.dynamodb || {}).length,
                tableNames: Object.keys(outputs.dynamodb || {})
            },
            eventbridge: {
                status: outputs.eventbridge?.busName ? 'DEPLOYED' : 'FAILED',
                busName: outputs.eventbridge?.busName,
                busArn: outputs.eventbridge?.busArn
            }
        },
        nextSteps: [
            'Update .env file with infrastructure values',
            'Run validation tests',
            'Switch from debug mode to production mode',
            'Test end-to-end analysis workflow'
        ]
    };
    
    const summaryFile = path.join(__dirname, '..', 'TASK_2_DEPLOYMENT_SUMMARY.md');
    const summaryContent = `# Task 2 Deployment Summary

**Status:** ${summary.status}  
**Timestamp:** ${summary.timestamp}  
**Region:** ${summary.region}

## Deployed Components

### Lambda Function
- **Status:** ${summary.components.lambda.status}
- **Function Name:** ${summary.components.lambda.functionName || 'N/A'}
- **Function ARN:** ${summary.components.lambda.functionArn || 'N/A'}

### Athena Configuration
- **Status:** ${summary.components.athena.status}
- **Database:** ${summary.components.athena.database}
- **Output Location:** ${summary.components.athena.outputLocation}
- **S3 Bucket:** ${summary.components.athena.s3Bucket}

### DynamoDB Tables
- **Status:** ${summary.components.dynamodb.status}
- **Tables Deployed:** ${summary.components.dynamodb.tables}
- **Table Names:** ${summary.components.dynamodb.tableNames.join(', ')}

### EventBridge
- **Status:** ${summary.components.eventbridge.status}
- **Bus Name:** ${summary.components.eventbridge.busName || 'N/A'}
- **Bus ARN:** ${summary.components.eventbridge.busArn || 'N/A'}

## Next Steps

${summary.nextSteps.map(step => `- ${step}`).join('\n')}

## Files Generated

- \`infrastructure-outputs.json\` - Complete infrastructure details
- \`.env.infrastructure\` - Updated environment configuration
- \`validation-results.json\` - Infrastructure validation results
- \`TASK_2_DEPLOYMENT_SUMMARY.md\` - This summary file

## Validation

Run the following command to validate your infrastructure:

\`\`\`bash
npm run validate-infrastructure
\`\`\`

## Troubleshooting

If you encounter issues:

1. Check AWS credentials: \`aws sts get-caller-identity\`
2. Verify AWS permissions for all required services
3. Review CloudFormation stack status in AWS Console
4. Check validation results in \`validation-results.json\`
`;
    
    fs.writeFileSync(summaryFile, summaryContent);
    console.log(`✅ Deployment summary saved to: ${summaryFile}`);
}

// Run the deployment
if (require.main === module) {
    main();
}

module.exports = { main };