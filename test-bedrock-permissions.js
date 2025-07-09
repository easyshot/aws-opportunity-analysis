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
  console.log('\n2. Testing Analysis Prompt (FDUHITJIME)...');
  try {
    const analysisCommand = new GetPromptCommand({
      promptIdentifier: 'FDUHITJIME'
    });
    const analysisResponse = await client.send(analysisCommand);
    console.log('✅ Analysis prompt accessible (no version)');
    console.log('   Model ID:', analysisResponse.variants?.[0]?.modelId || 'Unknown');
  } catch (error) {
    console.log('❌ Analysis prompt failed (no version):', error.message);
  }

  // Test analysis prompt with $LATEST version (like the automation does)
  console.log('\n3. Testing Analysis Prompt with $LATEST version...');
  try {
    const analysisCommandLatest = new GetPromptCommand({
      promptIdentifier: 'FDUHITJIME',
      promptVersion: '$LATEST'
    });
    const analysisResponseLatest = await client.send(analysisCommandLatest);
    console.log('✅ Analysis prompt accessible with $LATEST');
    console.log('   Model ID:', analysisResponseLatest.variants?.[0]?.modelId || 'Unknown');
  } catch (error) {
    console.log('❌ Analysis prompt failed with $LATEST:', error.message);
  }
}

testPromptAccess().catch(console.error);