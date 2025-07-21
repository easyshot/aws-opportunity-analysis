const { BedrockAgentClient, GetPromptCommand } = require('@aws-sdk/client-bedrock-agent');
require('dotenv').config();

const client = new BedrockAgentClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function checkUserMessage() {
  try {
    const command = new GetPromptCommand({
      promptIdentifier: 'arn:aws:bedrock:us-east-1:701976266286:prompt/FDUHITJIME:7'
    });
    const response = await client.send(command);
    const userMessage = response.variants[0].templateConfiguration.chat.messages[0].content[0].text;
    
    console.log('User Message Template (first 1000 chars):');
    console.log(userMessage.substring(0, 1000));
    console.log('\n=== CHECKING FOR CONFLICTING INSTRUCTIONS ===');
    console.log('Contains 85% subset instruction:', userMessage.includes('85%'));
    console.log('Contains M subset instruction:', userMessage.includes('M='));
    console.log('Contains old methodology template:', userMessage.includes('Selected a focused subset'));
    
    if (userMessage.includes('85%') || userMessage.includes('Selected a focused subset')) {
      console.log('\n❌ FOUND CONFLICTING INSTRUCTIONS IN USER MESSAGE!');
      console.log('The user message template still contains the old subset logic.');
      console.log('This is overriding the system instructions.');
    } else {
      console.log('\n✅ User message template looks clean');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkUserMessage();