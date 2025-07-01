# AWS Opportunity Analysis - Technical Stack

## Technology Stack
- **Backend**: Node.js with Express
- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **AWS Services**:
  - AWS Bedrock (for AI/ML capabilities, Titan and Nova Premier models)
  - AWS Lambda (for serverless execution)
  - Amazon Athena (for SQL queries against data)
  - AWS Bedrock Agent (for prompt management)

## Dependencies
- **AWS SDK v3**:
  - @aws-sdk/client-athena
  - @aws-sdk/client-bedrock-agent
  - @aws-sdk/client-bedrock-runtime
  - @aws-sdk/client-lambda
- **Backend**:
  - express: Web server framework
  - dotenv: Environment variable management
  - body-parser: Request body parsing
  - http-proxy-middleware: API proxying for frontend

## Development Dependencies
- nodemon: Auto-restart during development
- concurrently: Run multiple npm scripts simultaneously

## Build & Run Commands
```bash
# Install dependencies
npm install

# Start backend server only
npm start

# Start backend server with auto-restart
npm run dev

# Start backend server in debug mode
npm run debug

# Start frontend server only
npm run frontend

# Start frontend server with auto-restart
npm run dev-frontend

# Start both backend and frontend servers
npm run dev-all
```

## Environment Configuration
Required environment variables in `.env` file:
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

- Ensure all prompt IDs are correct and match those configured in AWS Bedrock.
- Lambda function must have permissions for Athena and S3 as described in the README.

## Server Configuration
- Backend server runs on port 8123 by default
- Frontend server runs on port 3123 by default
- Frontend proxies API requests to backend