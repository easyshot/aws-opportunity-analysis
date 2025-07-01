# AWS Opportunity Analysis Application

This application analyzes new business opportunities by finding similar historical AWS projects and providing predictions about ARR, MRR, launch dates, project duration, and recommended AWS services. It supports both standard and Amazon Nova Premier Bedrock models for analysis.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# AWS Credentials
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Bedrock Prompt IDs
CATAPULT_QUERY_PROMPT_ID=Y6T66EI3GZ
CATAPULT_ANALYSIS_PROMPT_ID=FDUHITJIME
CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID=P03B9TO1Q1

# Lambda Function
CATAPULT_GET_DATASET_LAMBDA=catapult_get_dataset

# Athena Configuration
ATHENA_DATABASE=default
ATHENA_OUTPUT_LOCATION=s3://aws-athena-query-results/
```

Replace the placeholder values with your actual AWS credentials and resource IDs.

### 3. Deploy Lambda Function

1. Package the Lambda function:

```bash
cd lambda
zip -r catapult_get_dataset.zip catapult_get_dataset.js
```

2. Deploy to AWS Lambda:
   - Go to AWS Lambda console
   - Create a new function named `catapult_get_dataset`
   - Upload the zip file
   - Set the handler to `catapult_get_dataset.handler`
   - Set the runtime to Node.js 14.x or later
   - Configure environment variables:
     - `ATHENA_DATABASE`: Your Athena database name
     - `ATHENA_OUTPUT_LOCATION`: S3 location for Athena query results

3. Configure IAM permissions:
   - Ensure the Lambda execution role has permissions for:
     - Athena: `athena:StartQueryExecution`, `athena:GetQueryExecution`, `athena:GetQueryResults`
     - S3: `s3:GetObject`, `s3:PutObject` (for the Athena output location)

### 4. Set Up Bedrock Prompts

1. In the AWS Bedrock console, create the following prompts:
   - "CatapultQueryPrompt" (ID: Y6T66EI3GZ)
   - "CatapultAnalysisPrompt" (ID: FDUHITJIME)
   - "CatapultAnalysisPrompt_NovaPremier" (ID: P03B9TO1Q1)

2. Configure each prompt with the appropriate model and template as described in the Project Handover document. Nova Premier prompt should use the Amazon Nova Premier model and robust date logic.

### 5. Run the Application

```bash
npm start
```

The backend server will be available at http://localhost:8123 and the frontend at http://localhost:3123

## Application Structure

- `app.js`: Main application entry point
- `public/`: Frontend files
- `automations/`: Backend automation scripts (v3 versions are current standard)
  - `invokeBedrockQueryPrompt-v3.js`: Generates SQL queries using Bedrock
  - `InvLamFilterAut-v3.js`: Executes SQL queries via Lambda
  - `finalBedAnalysisPrompt-v3.js`: Analyzes data using standard Bedrock model
  - `finalBedAnalysisPromptNovaPremier-v3.js`: Analyzes data using Nova Premier model
- `lambda/`: AWS Lambda functions
  - `catapult_get_dataset-v3.js`: Executes SQL against Athena
- `config/`: Configuration files
  - `aws-config-v3.js`: Centralized AWS configuration (v3)

## Analysis Flows

- **Standard Flow**: Uses Titan Bedrock model and the original analysis prompt for predictions.
- **Nova Premier Flow**: Uses Amazon Nova Premier model and enhanced prompt for robust date handling and improved analysis.

## Security Considerations

- Never commit your `.env` file to version control
- Use IAM roles with least privilege principles
- Consider using AWS Secrets Manager for production deployments
- Implement proper authentication for the application in production

## Troubleshooting
- Ensure all Bedrock prompt IDs in your `.env` match those in AWS Bedrock
- Lambda function must have correct permissions for Athena and S3
- For prompt or analysis errors, consult the Project Handover document for debugging guidance