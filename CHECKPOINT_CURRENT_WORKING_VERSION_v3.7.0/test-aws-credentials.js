require('dotenv').config();
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');

async function testAWSCredentials() {
  try {
    console.log('🔍 Testing AWS Credentials...');
    console.log('Region:', process.env.AWS_REGION || 'us-east-1');
    console.log('Access Key ID:', process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Not set');
    console.log('Secret Access Key:', process.env.AWS_SECRET_ACCESS_KEY ? 'Set' : 'Not set');
    console.log('');

    const sts = new STSClient({ 
      region: process.env.AWS_REGION || 'us-east-1' 
    });
    
    const result = await sts.send(new GetCallerIdentityCommand({}));
    console.log('✅ AWS Credentials Valid!');
    console.log('Account ID:', result.Account);
    console.log('User ID:', result.UserId);
    console.log('ARN:', result.Arn);
    console.log('');
    console.log('🎉 Your AWS credentials are working correctly!');
    console.log('The issue might be with specific service permissions or configuration.');
    
  } catch (error) {
    console.log('❌ AWS Credentials Invalid!');
    console.log('Error:', error.message);
    console.log('');
    console.log('🔧 To fix this:');
    console.log('1. Check your AWS credentials in the .env file');
    console.log('2. Ensure the credentials are valid and not expired');
    console.log('3. Verify the AWS region is correct');
    console.log('4. Check if your AWS account has the required permissions');
  }
}

testAWSCredentials(); 