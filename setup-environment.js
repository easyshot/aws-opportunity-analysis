#!/usr/bin/env node

/**
 * Environment Setup Script for AWS Opportunity Analysis
 * This script helps configure the required environment variables
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 AWS Opportunity Analysis - Environment Setup');
console.log('===============================================');
console.log('');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('📁 Found existing .env file');
  console.log('   Current environment variables:');
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = envContent.split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.split('=')[0]);
  
  envVars.forEach(varName => {
    console.log(`   ✅ ${varName}`);
  });
  console.log('');
} else {
  console.log('📁 No .env file found - will create one');
  console.log('');
}

console.log('🔑 Required AWS Credentials:');
console.log('   AWS_ACCESS_KEY_ID - Your AWS access key');
console.log('   AWS_SECRET_ACCESS_KEY - Your AWS secret access key');
console.log('   AWS_REGION - AWS region (default: us-east-1)');
console.log('');

console.log('⚙️ Required Service Configuration:');
console.log('   CATAPULT_QUERY_PROMPT_ID - Bedrock prompt ID for SQL queries');
console.log('   CATAPULT_ANALYSIS_PROMPT_ID - Bedrock prompt ID for analysis');

console.log('   CATAPULT_GET_DATASET_LAMBDA - Lambda function name for data retrieval');
console.log('   ATHENA_DATABASE - Athena database name');
console.log('   ATHENA_OUTPUT_LOCATION - S3 location for Athena query results');
console.log('');

console.log('📋 Optional Configuration:');
console.log('   NODE_ENV - Environment (development/production)');
console.log('   PORT - Server port (default: 8123)');
console.log('   REDIS_ENDPOINT - Redis cache endpoint');
console.log('   REDIS_PORT - Redis cache port');
console.log('   REDIS_AUTH_TOKEN - Redis authentication token');
console.log('   CACHE_DEFAULT_TTL - Cache TTL in seconds (default: 3600)');
console.log('');

console.log('💡 To set up your environment:');
console.log('   1. Create a .env file in the project root');
console.log('   2. Add your AWS credentials and service configuration');
console.log('   3. Restart the application');
console.log('');

console.log('📝 Example .env file structure:');
console.log('   # AWS Credentials');
console.log('   AWS_ACCESS_KEY_ID=your_access_key_here');
console.log('   AWS_SECRET_ACCESS_KEY=your_secret_key_here');
console.log('   AWS_REGION=us-east-1');
console.log('');
console.log('   # Bedrock Prompts');
console.log('   CATAPULT_QUERY_PROMPT_ID=Y6T66EI3GZ');
console.log('   CATAPULT_ANALYSIS_PROMPT_ID=FDUHITJIME');

console.log('');
console.log('   # Lambda Functions');
console.log('   CATAPULT_GET_DATASET_LAMBDA=catapult_get_dataset');
console.log('');
console.log('   # Athena Configuration');
console.log('   ATHENA_DATABASE=catapult_db_p');
console.log('   ATHENA_OUTPUT_LOCATION=s3://your-bucket/athena-output/');
console.log('');
console.log('   # Application Configuration');
console.log('   NODE_ENV=production');
console.log('   PORT=8123');
console.log('');

console.log('🔍 Current Status:');
console.log('   The application is currently running in FALLBACK MODE');
console.log('   This means it will show mock data instead of real analysis');
console.log('   To get real analysis results, configure the AWS credentials above');
console.log('');

console.log('✅ Next Steps:');
console.log('   1. Set up your AWS credentials');
console.log('   2. Configure the required environment variables');
console.log('   3. Restart the application with: npm run dev');
console.log('   4. Run validation: npm run validate:aws');
console.log('   5. Test the analysis with real data');
console.log('');

console.log('📚 For more information:');
console.log('   - Check the README.md file');
console.log('   - Review the docs/ directory for detailed guides');
console.log('   - Run npm run validate:aws to check connectivity');
console.log(''); 