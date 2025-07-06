#!/usr/bin/env node

/**
 * Test script for Step Functions workflows
 * This script helps test the deployed Step Functions state machines
 */

const { SFNClient, StartExecutionCommand, DescribeExecutionCommand, ListExecutionsCommand } = require('@aws-sdk/client-sfn');
const { CloudFormationClient, DescribeStacksCommand } = require('@aws-sdk/client-cloudformation');

async function getStackOutputs() {
  const cfClient = new CloudFormationClient({});
  
  try {
    const command = new DescribeStacksCommand({
      StackName: 'AwsOpportunityAnalysisStack'
    });
    
    const result = await cfClient.send(command);
    const outputs = {};
    
    if (result.Stacks && result.Stacks[0] && result.Stacks[0].Outputs) {
      result.Stacks[0].Outputs.forEach(output => {
        outputs[output.OutputKey] = output.OutputValue;
      });
    }
    
    return outputs;
  } catch (error) {
    console.error('Error getting stack outputs:', error.message);
    return {};
  }
}

async function testStepFunction(stateMachineArn, testInput, workflowName) {
  const sfnClient = new SFNClient({});
  
  console.log(`\n🧪 Testing ${workflowName} workflow...`);
  console.log(`State Machine ARN: ${stateMachineArn}`);
  
  try {
    // Start execution
    const executionName = `test-${workflowName.toLowerCase()}-${Date.now()}`;
    const startCommand = new StartExecutionCommand({
      stateMachineArn,
      name: executionName,
      input: JSON.stringify(testInput)
    });
    
    const startResult = await sfnClient.send(startCommand);
    console.log(`✅ Execution started: ${startResult.executionArn}`);
    
    // Wait for completion
    let status = 'RUNNING';
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max
    
    while (status === 'RUNNING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const describeCommand = new DescribeExecutionCommand({
        executionArn: startResult.executionArn
      });
      
      const describeResult = await sfnClient.send(describeCommand);
      status = describeResult.status;
      attempts++;
      
      console.log(`⏳ Status: ${status} (attempt ${attempts}/${maxAttempts})`);
    }
    
    if (status === 'SUCCEEDED') {
      console.log(`✅ ${workflowName} workflow completed successfully!`);
      
      const describeCommand = new DescribeExecutionCommand({
        executionArn: startResult.executionArn
      });
      
      const finalResult = await sfnClient.send(describeCommand);
      console.log('📋 Output:', JSON.stringify(JSON.parse(finalResult.output), null, 2));
    } else if (status === 'FAILED') {
      console.log(`❌ ${workflowName} workflow failed`);
      
      const describeCommand = new DescribeExecutionCommand({
        executionArn: startResult.executionArn
      });
      
      const finalResult = await sfnClient.send(describeCommand);
      console.log('❌ Error:', finalResult.error);
    } else {
      console.log(`⚠️  ${workflowName} workflow did not complete within timeout`);
    }
    
  } catch (error) {
    console.error(`❌ Error testing ${workflowName}:`, error.message);
  }
}

async function main() {
  console.log('🧪 Starting Step Functions tests...');
  
  // Get stack outputs
  const outputs = await getStackOutputs();
  
  if (!outputs.OpportunityAnalysisStateMachineArn) {
    console.error('❌ Could not find Step Functions state machine ARNs in stack outputs');
    console.log('Available outputs:', Object.keys(outputs));
    process.exit(1);
  }
  
  // Test data
  const testOpportunity = {
    CustomerName: 'Test Customer Inc',
    region: 'us-east-1',
    closeDate: '2024-12-31',
    oppName: 'Test Opportunity',
    oppDescription: 'This is a test opportunity for validating Step Functions workflow'
  };
  
  const testInput = {
    opportunityDetails: testOpportunity,
    analysisOptions: {
      useNovaPremier: false,
      includeValidation: true
    }
  };
  
  // Test opportunity analysis workflow
  if (outputs.OpportunityAnalysisStateMachineArn) {
    await testStepFunction(
      outputs.OpportunityAnalysisStateMachineArn,
      testInput,
      'Opportunity Analysis'
    );
  }
  
  // Test funding analysis workflow
  if (outputs.FundingAnalysisStateMachineArn) {
    const fundingInput = {
      opportunityDetails: testOpportunity,
      analysisResults: {
        metrics: { confidence: 0.8 },
        sections: ['test section']
      }
    };
    
    await testStepFunction(
      outputs.FundingAnalysisStateMachineArn,
      fundingInput,
      'Funding Analysis'
    );
  }
  
  // Test follow-on analysis workflow
  if (outputs.FollowOnAnalysisStateMachineArn) {
    const followOnInput = {
      opportunityDetails: testOpportunity,
      analysisResults: {
        metrics: { confidence: 0.8 },
        sections: ['test section']
      }
    };
    
    await testStepFunction(
      outputs.FollowOnAnalysisStateMachineArn,
      followOnInput,
      'Follow-On Analysis'
    );
  }
  
  console.log('\n🎉 Step Functions testing completed!');
}

// Run the tests
main().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});