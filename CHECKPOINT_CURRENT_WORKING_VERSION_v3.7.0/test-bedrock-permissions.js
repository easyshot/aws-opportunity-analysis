// Test script to check Bedrock permissions
require('dotenv').config();
const { BedrockAgentClient, GetPromptCommand } = require('@aws-sdk/client-bedrock-agent');

const client = new BedrockAgentClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function testPromptAccess() {
  console.log('Testing Bedrock prompt access...\n');
  
    // Test query prompt
  console.log('1. Testing Query Prompt (Y6T66EI3GZ)...');
  try {
    const queryCommand = new GetPromptCommand({
      promptIdentifier: 'Y6T66EI3GZ'
    });
    const queryResponse = await client.send(queryCommand);
    console.log('✅ Query prompt accessible');
    console.log('   Model ID:', queryResponse.variants?.[0]?.modelId || 'Unknown');
  } catch (error) {
    console.log('❌ Query prompt failed:', error.message);
  }
  
  // Test analysis prompt
  console.log('\n2. Testing Analysis Prompt (arn:aws:bedrock:us-east-1:701976266286:prompt/FDUHITJIME:4)...');
  try {
    const analysisCommand = new GetPromptCommand({
      promptIdentifier: 'arn:aws:bedrock:us-east-1:701976266286:prompt/FDUHITJIME:4'
    });
    const analysisResponse = await client.send(analysisCommand);
    console.log('✅ Analysis prompt accessible (version 4)');
    console.log('   Model ID:', analysisResponse.variants?.[0]?.modelId || 'Unknown');
  } catch (error) {
    console.log('❌ Analysis prompt failed (version 4):', error.message);
  }

  // Test analysis prompt with base ID for comparison
  console.log('\n3. Testing Analysis Prompt with base ID (FDUHITJIME)...');
  try {
    const analysisCommandBase = new GetPromptCommand({
      promptIdentifier: 'FDUHITJIME'
    });
    const analysisResponseBase = await client.send(analysisCommandBase);
    console.log('✅ Analysis prompt accessible (base ID)');
    console.log('   Model ID:', analysisResponseBase.variants?.[0]?.modelId || 'Unknown');
  } catch (error) {
    console.log('❌ Analysis prompt failed (base ID):', error.message);
  }
}

testPromptAccess().catch(console.error);