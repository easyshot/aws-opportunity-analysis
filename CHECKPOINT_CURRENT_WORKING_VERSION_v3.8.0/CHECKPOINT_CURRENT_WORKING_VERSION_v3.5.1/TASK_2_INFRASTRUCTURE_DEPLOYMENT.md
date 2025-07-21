# Task 2: AWS Infrastructure Deployment

This document provides instructions for deploying the required AWS infrastructure components for the Opportunity Analysis application.

## Overview

Task 2 deploys the following AWS infrastructure components:

1. **catapult_get_dataset Lambda function** with proper IAM permissions
2. **Athena database and S3 output location** configuration
3. **DynamoDB tables** for caching and session management
4. **EventBridge custom bus** and event rules
5. **ElastiCache Redis cluster** for intelligent caching
6. **Infrastructure validation** and connectivity testing

## Prerequisites

Before running the deployment, ensure you have:

1. **AWS CLI configured** with appropriate credentials
   ```bash
   aws configure
   aws sts get-caller-identity
   ```

2. **Node.js dependencies installed**
   ```bash
   npm install
   ```

3. **Required AWS permissions** for:
   - Lambda (create functions, manage roles)
   - IAM (create roles, attach policies)
   - Athena (create databases, execute queries)
   - S3 (create buckets, manage objects)
   - DynamoDB (create tables, manage streams)
   - EventBridge (create buses, manage rules)
   - ElastiCache (create clusters)

## Deployment Methods

### Method 1: Complete Task 2 Deployment (Recommended)

Run the comprehensive Task 2 deployment script:

```bash
npm run deploy:task-2
```

This script will:
- Check prerequisites
- Deploy all infrastructure components
- Validate the deployment
- Generate configuration files
- Create deployment summary

### Method 2: Individual Component Deployment

Deploy components individually if needed:

```bash
# Deploy core infrastructure
npm run deploy:infrastructure

# Deploy Lambda functions
npm run deploy:lambda

# Deploy DynamoDB tables
npm run deploy:dynamodb

# Deploy EventBridge
npm run deploy:eventbridge
```

### Method 3: Manual Validation Only

If infrastructure is already deployed, run validation:

```bash
npm run validate:infrastructure
```

## Deployment Process

The deployment follows these steps:

### Step 1: Prerequisites Check
- Validates AWS CLI availability
- Checks AWS credentials
- Verifies Node.js dependencies
- Confirms required source files exist

### Step 2: Infrastructure Deployment
- Creates IAM role for Lambda execution
- Deploys catapult_get_dataset Lambda function
- Sets up Athena database and S3 bucket
- Creates DynamoDB tables with streams
- Configures EventBridge custom bus and rules
- Sets up ElastiCache Redis cluster (optional)

### Step 3: Validation
- Tests Lambda function invocation
- Validates Athena query execution
- Checks DynamoDB table status
- Verifies EventBridge configuration
- Tests end-to-end connectivity

### Step 4: Configuration Generation
- Creates infrastructure-outputs.json
- Generates updated .env file
- Creates deployment summary

## Generated Files

After successful deployment, the following files are created:

- **`infrastructure-outputs.json`** - Complete infrastructure details
- **`.env.infrastructure`** - Updated environment configuration
- **`validation-results.json`** - Infrastructure validation results
- **`TASK_2_DEPLOYMENT_SUMMARY.md`** - Deployment summary

## Environment Configuration

After deployment, update your `.env` file with the generated values:

```bash
# Copy the generated environment file
cp .env.infrastructure .env

# Or manually update your existing .env file with values from infrastructure-outputs.json
```

Key environment variables that will be updated:

```bash
CATAPULT_GET_DATASET_LAMBDA=catapult_get_dataset
ATHENA_DATABASE=catapult_db_p
ATHENA_OUTPUT_LOCATION=s3://as-athena-catapult/
DYNAMODB_ANALYSIS_RESULTS_TABLE=opportunity-analysis-results
DYNAMODB_USER_SESSIONS_TABLE=opportunity-analysis-sessions
DYNAMODB_ANALYSIS_HISTORY_TABLE=opportunity-analysis-history
EVENTBRIDGE_BUS_NAME=aws-opportunity-analysis-bus
EVENTBRIDGE_BUS_ARN=arn:aws:events:region:account:event-bus/aws-opportunity-analysis-bus
```

## Validation and Testing

### Infrastructure Validation

Run comprehensive infrastructure validation:

```bash
npm run validate:infrastructure
```

This validates:
- AWS credentials and permissions
- Lambda function deployment and invocation
- Athena database and S3 configuration
- DynamoDB table status and accessibility
- EventBridge bus and rules
- ElastiCache Redis cluster (if deployed)
- End-to-end connectivity

### Individual Component Testing

Test specific components:

```bash
# Test AWS connectivity
npm run validate:aws

# Test Bedrock connectivity
npm run validate:bedrock

# Test Lambda functions
npm run validate:lambda
```

## Troubleshooting

### Common Issues

1. **AWS Credentials Not Configured**
   ```bash
   aws configure
   # Or set environment variables:
   export AWS_ACCESS_KEY_ID=your-key
   export AWS_SECRET_ACCESS_KEY=your-secret
   export AWS_REGION=us-east-1
   ```

2. **Insufficient AWS Permissions**
   - Ensure your AWS user/role has permissions for all required services
   - Check CloudFormation stack status in AWS Console
   - Review IAM policies and permissions

3. **Lambda Function Creation Failed**
   - Check IAM role creation
   - Verify Lambda service permissions
   - Review function code and dependencies

4. **DynamoDB Table Creation Failed**
   - Check DynamoDB service limits
   - Verify table names don't conflict
   - Review billing mode settings

5. **Athena Configuration Issues**
   - Verify S3 bucket permissions
   - Check Athena service availability in region
   - Review database naming conventions

### Debugging Steps

1. **Check AWS CLI Configuration**
   ```bash
   aws sts get-caller-identity
   aws configure list
   ```

2. **Review Deployment Logs**
   - Check console output during deployment
   - Review validation-results.json for detailed errors
   - Check AWS CloudFormation events in console

3. **Manual Verification**
   - Check AWS Console for created resources
   - Test Lambda function in AWS Console
   - Verify DynamoDB tables exist
   - Check EventBridge bus configuration

4. **Clean Up and Retry**
   ```bash
   # Remove failed resources manually in AWS Console
   # Then retry deployment
   npm run deploy:task-2
   ```

## Resource Cleanup

To remove deployed infrastructure:

1. **Delete Lambda Functions**
   ```bash
   aws lambda delete-function --function-name catapult_get_dataset
   ```

2. **Delete DynamoDB Tables**
   ```bash
   aws dynamodb delete-table --table-name opportunity-analysis-results
   aws dynamodb delete-table --table-name opportunity-analysis-sessions
   aws dynamodb delete-table --table-name opportunity-analysis-history
   ```

3. **Delete EventBridge Resources**
   ```bash
   aws events delete-rule --name analysis-completion-rule --event-bus-name aws-opportunity-analysis-bus
   aws events delete-event-bus --name aws-opportunity-analysis-bus
   ```

4. **Delete S3 Bucket** (if created)
   ```bash
   aws s3 rb s3://as-athena-catapult --force
   ```

5. **Delete IAM Role**
   ```bash
   aws iam delete-role-policy --role-name catapult-lambda-execution-role --policy-name CatapultLambdaPolicy
   aws iam detach-role-policy --role-name catapult-lambda-execution-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
   aws iam delete-role --role-name catapult-lambda-execution-role
   ```

## Next Steps

After successful infrastructure deployment:

1. **Update Environment Configuration**
   - Copy `.env.infrastructure` to `.env`
   - Verify all environment variables are correct

2. **Run Validation Tests**
   ```bash
   npm run validate:infrastructure
   npm run validate:all
   ```

3. **Proceed to Task 3**
   - Switch application from debug mode to production mode
   - Test backend server with real AWS integrations

4. **Test End-to-End Workflow**
   - Validate complete analysis workflow
   - Test frontend integration with real data

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review AWS documentation for specific services
3. Check validation-results.json for detailed error information
4. Verify AWS service limits and quotas
5. Review CloudFormation stack events in AWS Console

## Architecture Overview

The deployed infrastructure creates the following architecture:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API    │    │   Lambda        │
│   (Port 3123)   │───▶│   (Port 8123)    │───▶│   catapult_get_ │
│                 │    │                  │    │   dataset       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   EventBridge   │    │   DynamoDB       │    │   Athena        │
│   Custom Bus    │    │   Tables (3)     │    │   Database      │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐                           ┌─────────────────┐
│   ElastiCache   │                           │   S3 Bucket     │
│   Redis         │                           │   Query Results │
│   (Optional)    │                           │                 │
└─────────────────┘                           └─────────────────┘
```

This infrastructure supports the complete opportunity analysis workflow with caching, event-driven processing, and scalable data storage.