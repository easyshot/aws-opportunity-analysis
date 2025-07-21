const { BedrockAgentClient, GetPromptCommand } = require('@aws-sdk/client-bedrock-agent');
require('dotenv').config();

const client = new BedrockAgentClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function checkPrompt() {
  try {
    const command = new GetPromptCommand({
      promptIdentifier: 'arn:aws:bedrock:us-east-1:701976266286:prompt/FDUHITJIME:7'
    });
    const response = await client.send(command);
    const systemInstructions = response.variants[0].templateConfiguration.chat.system[0].text;
    
    console.log('Version 7 System Instructions (first 500 chars):');
    console.log(systemInstructions.substring(0, 500));
    console.log('\nContains old subset logic (85%):', systemInstructions.includes('85%'));
    console.log('Contains new ALL data logic:', systemInstructions.includes('ANALYZE ALL PROVIDED DATA'));
    
    if (systemInstructions.includes('85%')) {
      console.log('\n❌ Version 7 still has the OLD prompt with subset logic');
      console.log('You need to update the Bedrock prompt to remove the 85% limitation');
    } else if (systemInstructions.includes('ANALYZE ALL PROVIDED DATA')) {
      console.log('\n✅ Version 7 has the NEW prompt with full data analysis');
    } else {
      console.log('\n⚠️  Version 7 has unknown prompt content');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkPrompt();