#!/usr/bin/env node

/**
 * Deployment script for Bedrock Agents infrastructure
 * This script sets up the complete Bedrock Agent orchestration system
 */

const BedrockAgentManager = require('../lib/bedrock-agent-manager');
const { getConfig } = require('../config/aws-config-v3');

async function deployBedrockAgents() {
  console.log('🚀 Starting Bedrock Agent deployment...');
  
  try {
    // Initialize the agent manager
    const agentManager = new BedrockAgentManager();
    
    console.log('📋 Step 1: Initializing Bedrock Agent...');
    const agent = await agentManager.initializeAgent();
    
    console.log(`✅ Agent created successfully: ${agent.agentId}`);
    console.log(`📝 Agent Name: ${agent.agentName}`);
    console.log(`🔧 Foundation Model: ${agent.foundationModel}`);
    
    // Get agent aliases
    const devAlias = agentManager.getAgentAlias('development');
    const stagingAlias = agentManager.getAgentAlias('staging');
    const prodAlias = agentManager.getAgentAlias('production');
    
    console.log('\n🏷️  Agent Aliases:');
    if (devAlias) console.log(`  Development: ${devAlias.agentAliasId}`);
    if (stagingAlias) console.log(`  Staging: ${stagingAlias.agentAliasId}`);
    if (prodAlias) console.log(`  Production: ${prodAlias.agentAliasId}`);
    
    // Update configuration with agent details
    console.log('\n📝 Step 2: Updating configuration...');
    await updateConfiguration(agent, {
      development: devAlias,
      staging: stagingAlias,
      production: prodAlias
    });
    
    console.log('\n✅ Bedrock Agent deployment completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Deploy the Lambda functions using: npm run deploy');
    console.log('2. Test the agent using the frontend interface');
    console.log('3. Monitor agent performance in CloudWatch');
    
    return {
      agentId: agent.agentId,
      aliases: {
        development: devAlias?.agentAliasId,
        staging: stagingAlias?.agentAliasId,
        production: prodAlias?.agentAliasId
      }
    };
    
  } catch (error) {
    console.error('❌ Error deploying Bedrock Agents:', error);
    throw error;
  }
}

async function updateConfiguration(agent, aliases) {
  try {
    const config = await getConfig();
    
    // Update environment variables or configuration files
    console.log('Updating configuration with agent details...');
    
    // This would typically update SSM parameters or configuration files
    // For now, we'll log the values that should be updated
    console.log('\n🔧 Configuration values to update:');
    console.log(`BEDROCK_AGENT_ID=${agent.agentId}`);
    console.log(`BEDROCK_AGENT_ROLE_ARN=${agent.agentResourceRoleArn}`);
    
    if (aliases.development) {
      console.log(`BEDROCK_AGENT_DEV_ALIAS=${aliases.development.agentAliasId}`);
    }
    if (aliases.staging) {
      console.log(`BEDROCK_AGENT_STAGING_ALIAS=${aliases.staging.agentAliasId}`);
    }
    if (aliases.production) {
      console.log(`BEDROCK_AGENT_PROD_ALIAS=${aliases.production.agentAliasId}`);
    }
    
    console.log('\n💡 Add these to your .env file or update your infrastructure configuration');
    
  } catch (error) {
    console.error('Error updating configuration:', error);
    throw error;
  }
}

async function validateDeployment(agentId) {
  console.log('\n🔍 Step 3: Validating deployment...');
  
  try {
    const agentManager = new BedrockAgentManager();
    agentManager.agentId = agentId;
    
    const agentInfo = await agentManager.getAgent();
    
    console.log('✅ Agent validation successful:');
    console.log(`  Status: ${agentInfo.agent.agentStatus}`);
    console.log(`  Created: ${agentInfo.agent.createdAt}`);
    console.log(`  Updated: ${agentInfo.agent.updatedAt}`);
    
    return true;
  } catch (error) {
    console.error('❌ Agent validation failed:', error);
    return false;
  }
}

// Main execution
if (require.main === module) {
  deployBedrockAgents()
    .then(async (result) => {
      console.log('\n🎉 Deployment Summary:');
      console.log(`Agent ID: ${result.agentId}`);
      console.log('Aliases:', result.aliases);
      
      // Validate the deployment
      const isValid = await validateDeployment(result.agentId);
      
      if (isValid) {
        console.log('\n✅ All systems ready! Your Bedrock Agent is operational.');
        process.exit(0);
      } else {
        console.log('\n⚠️  Deployment completed but validation failed. Please check the logs.');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Deployment failed:', error.message);
      process.exit(1);
    });
}

module.exports = { deployBedrockAgents, updateConfiguration, validateDeployment };