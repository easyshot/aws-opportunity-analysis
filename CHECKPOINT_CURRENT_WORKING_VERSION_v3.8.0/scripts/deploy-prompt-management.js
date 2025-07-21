#!/usr/bin/env node

/**
 * Deployment script for Enhanced Bedrock Prompt Management System
 * Sets up prompt templates, versions, and monitoring infrastructure
 */

const { 
  BedrockAgentClient, 
  CreatePromptCommand,
  CreatePromptVersionCommand,
  ListPromptsCommand 
} = require('@aws-sdk/client-bedrock-agent');
const { 
  CloudWatchClient,
  PutDashboardCommand 
} = require('@aws-sdk/client-cloudwatch');

// Initialize AWS clients
const bedrockAgent = new BedrockAgentClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

const cloudWatch = new CloudWatchClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

/**
 * Enhanced prompt templates for different analysis types
 */
const PROMPT_TEMPLATES = {
  'query-generation-optimized': {
    name: 'Enhanced Query Generation - Optimized',
    description: 'Optimized prompt for SQL query generation with improved accuracy',
    modelId: 'amazon.titan-text-premier-v1:0',
    systemPrompt: `You are an expert SQL analyst specializing in AWS opportunity analysis. Generate precise SQL queries to find similar historical projects based on the provided opportunity details.

ENHANCED INSTRUCTIONS:
- Focus on semantic similarity, not just keyword matching
- Consider industry-specific patterns and regional variations
- Prioritize recent projects (last 2 years) but include relevant older ones
- Use advanced SQL features like window functions and CTEs when beneficial
- Ensure queries are optimized for performance on large datasets`,
    userPrompt: `Generate a SQL query to find similar historical AWS opportunities based on:

Customer: {{CustomerName}}
Region: {{region}}
Close Date: {{closeDate}}
Opportunity: {{oppName}}
Description: {{oppDescription}}

Return ONLY a JSON object with the SQL query:
{"sql_query": "your_sql_here"}`
  },
  
  'funding-analysis-enhanced': {
    name: 'Enhanced Funding Analysis',
    description: 'Advanced funding analysis with industry-specific recommendations',
    modelId: 'amazon.titan-text-premier-v1:0',
    systemPrompt: `You are a senior AWS financial advisor specializing in funding strategies for cloud transformation projects. Provide comprehensive funding analysis tailored to the customer's industry, size, and specific requirements.

ENHANCED CAPABILITIES:
- Industry-specific funding options and considerations
- Customer segment-appropriate recommendations
- Risk assessment and mitigation strategies
- Timeline and milestone-based funding approaches
- Integration with AWS financial services and programs`,
    userPrompt: `Analyze funding options for this AWS opportunity:

Customer: {{customerName}}
Region: {{region}}
Opportunity: {{oppName}}
Description: {{oppDescription}}
Projected ARR: {{projectedArr}}
Top Services: {{topServices}}

Provide detailed funding analysis including:
1. Recommended funding options
2. Industry-specific considerations
3. Timeline and milestones
4. Risk factors and mitigation
5. AWS program eligibility`
  },
  
  'follow-on-analysis': {
    name: 'Follow-on Opportunity Analysis',
    description: 'Intelligent follow-on opportunity identification and planning',
    modelId: 'amazon.titan-text-premier-v1:0',
    systemPrompt: `You are an AWS solutions architect and business development expert. Identify realistic follow-on opportunities based on the current engagement, customer maturity, and industry patterns.

ANALYSIS FRAMEWORK:
- Customer cloud maturity assessment
- Natural progression paths for AWS adoption
- Industry-specific expansion opportunities
- Service interdependencies and logical next steps
- Timeline and readiness considerations`,
    userPrompt: `Identify follow-on opportunities for this customer:

Customer: {{customerName}}
Region: {{region}}
Current Opportunity: {{oppName}}
Description: {{oppDescription}}
Projected ARR: {{projectedArr}}
Current Services: {{topServices}}

Provide analysis including:
1. Next logical opportunities
2. Timeline recommendations
3. Service expansion paths
4. Customer readiness assessment
5. Specific next steps`
  }
};

/**
 * CloudWatch dashboard configuration for prompt monitoring
 */
const DASHBOARD_CONFIG = {
  name: 'BedrockPromptManagement',
  body: JSON.stringify({
    widgets: [
      {
        type: 'metric',
        x: 0, y: 0, width: 12, height: 6,
        properties: {
          metrics: [
            ['AWS/BedrockPrompts', 'selection_count', 'PromptType', 'query-generation'],
            ['.', '.', '.', 'analysis'],
            ['.', '.', '.', 'funding-analysis'],
            ['.', '.', '.', 'follow-on-analysis']
          ],
          period: 300,
          stat: 'Sum',
          region: process.env.AWS_REGION || 'us-east-1',
          title: 'Prompt Usage by Type'
        }
      },
      {
        type: 'metric',
        x: 12, y: 0, width: 12, height: 6,
        properties: {
          metrics: [
            ['AWS/BedrockPrompts', 'response_time', 'PromptType', 'query-generation'],
            ['.', '.', '.', 'analysis'],
            ['.', '.', '.', 'funding-analysis'],
            ['.', '.', '.', 'follow-on-analysis']
          ],
          period: 300,
          stat: 'Average',
          region: process.env.AWS_REGION || 'us-east-1',
          title: 'Average Response Time by Prompt Type'
        }
      },
      {
        type: 'metric',
        x: 0, y: 6, width: 12, height: 6,
        properties: {
          metrics: [
            ['AWS/BedrockPrompts', 'success_rate', 'PromptType', 'query-generation'],
            ['.', '.', '.', 'analysis'],
            ['.', '.', '.', 'funding-analysis'],
            ['.', '.', '.', 'follow-on-analysis']
          ],
          period: 300,
          stat: 'Average',
          region: process.env.AWS_REGION || 'us-east-1',
          title: 'Success Rate by Prompt Type',
          yAxis: { left: { min: 0, max: 100 } }
        }
      },
      {
        type: 'metric',
        x: 12, y: 6, width: 12, height: 6,
        properties: {
          metrics: [
            ['AWS/BedrockPrompts', 'query_quality', 'PromptType', 'query-generation'],
            ['AWS/BedrockPrompts', 'analysis_quality', 'PromptType', 'analysis'],
            ['AWS/BedrockPrompts', 'funding_accuracy', 'PromptType', 'funding-analysis'],
            ['AWS/BedrockPrompts', 'opportunity_relevance', 'PromptType', 'follow-on-analysis']
          ],
          period: 300,
          stat: 'Average',
          region: process.env.AWS_REGION || 'us-east-1',
          title: 'Quality Metrics by Prompt Type',
          yAxis: { left: { min: 0, max: 100 } }
        }
      }
    ]
  })
};

/**
 * Main deployment function
 */
async function deployPromptManagement() {
  console.log('🚀 Starting Enhanced Bedrock Prompt Management deployment...\n');
  
  try {
    // Step 1: Create enhanced prompt templates
    console.log('📝 Creating enhanced prompt templates...');
    const createdPrompts = await createPromptTemplates();
    
    // Step 2: Set up prompt versions for A/B testing
    console.log('\n🧪 Setting up A/B testing versions...');
    await createPromptVersions(createdPrompts);
    
    // Step 3: Deploy CloudWatch dashboard
    console.log('\n📊 Deploying monitoring dashboard...');
    await deployMonitoringDashboard();
    
    // Step 4: Display deployment summary
    console.log('\n✅ Deployment completed successfully!');
    displayDeploymentSummary(createdPrompts);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

/**
 * Create enhanced prompt templates
 */
async function createPromptTemplates() {
  const createdPrompts = {};
  
  for (const [templateKey, template] of Object.entries(PROMPT_TEMPLATES)) {
    try {
      console.log(`  Creating prompt: ${template.name}`);
      
      const command = new CreatePromptCommand({
        name: template.name,
        description: template.description,
        variants: [{
          name: 'default',
          modelId: template.modelId,
          templateType: 'CHAT',
          templateConfiguration: {
            chat: {
              system: [{ text: template.systemPrompt }],
              messages: [{
                role: 'user',
                content: [{ text: template.userPrompt }]
              }]
            }
          }
        }]
      });
      
      const response = await bedrockAgent.send(command);
      createdPrompts[templateKey] = {
        id: response.id,
        name: template.name,
        arn: response.arn
      };
      
      console.log(`    ✓ Created prompt ${response.id}`);
      
    } catch (error) {
      if (error.name === 'ConflictException') {
        console.log(`    ⚠️  Prompt ${template.name} already exists, skipping...`);
      } else {
        console.error(`    ❌ Failed to create prompt ${template.name}:`, error.message);
      }
    }
  }
  
  return createdPrompts;
}

/**
 * Create prompt versions for A/B testing
 */
async function createPromptVersions(createdPrompts) {
  for (const [templateKey, promptInfo] of Object.entries(createdPrompts)) {
    try {
      console.log(`  Creating version for: ${promptInfo.name}`);
      
      const command = new CreatePromptVersionCommand({
        promptIdentifier: promptInfo.id,
        description: `A/B testing version - ${new Date().toISOString()}`
      });
      
      const response = await bedrockAgent.send(command);
      console.log(`    ✓ Created version ${response.version} for prompt ${promptInfo.id}`);
      
    } catch (error) {
      console.error(`    ❌ Failed to create version for ${promptInfo.name}:`, error.message);
    }
  }
}

/**
 * Deploy CloudWatch monitoring dashboard
 */
async function deployMonitoringDashboard() {
  try {
    const command = new PutDashboardCommand(DASHBOARD_CONFIG);
    await cloudWatch.send(command);
    
    console.log(`  ✓ Created CloudWatch dashboard: ${DASHBOARD_CONFIG.name}`);
    console.log(`    View at: https://console.aws.amazon.com/cloudwatch/home?region=${process.env.AWS_REGION || 'us-east-1'}#dashboards:name=${DASHBOARD_CONFIG.name}`);
    
  } catch (error) {
    console.error('  ❌ Failed to create CloudWatch dashboard:', error.message);
  }
}

/**
 * Display deployment summary
 */
function displayDeploymentSummary(createdPrompts) {
  console.log('\n📋 Deployment Summary:');
  console.log('='.repeat(50));
  
  console.log('\n🎯 Created Prompts:');
  for (const [key, prompt] of Object.entries(createdPrompts)) {
    console.log(`  • ${prompt.name} (ID: ${prompt.id})`);
  }
  
  console.log('\n🔧 Environment Variables to Update:');
  console.log('Add these to your .env file for A/B testing:');
  
  if (createdPrompts['query-generation-optimized']) {
    console.log(`CATAPULT_QUERY_PROMPT_ID_V2=${createdPrompts['query-generation-optimized'].id}`);
  }
  if (createdPrompts['funding-analysis-enhanced']) {
    console.log(`CATAPULT_FUNDING_PROMPT_ENHANCED_ID=${createdPrompts['funding-analysis-enhanced'].id}`);
  }
  if (createdPrompts['follow-on-analysis']) {
    console.log(`CATAPULT_FOLLOWON_PROMPT_ID=${createdPrompts['follow-on-analysis'].id}`);
  }
  
  console.log('\n📊 Monitoring:');
  console.log(`  • CloudWatch Dashboard: ${DASHBOARD_CONFIG.name}`);
  console.log('  • Metrics Namespace: AWS/BedrockPrompts');
  console.log('  • Analytics API: /api/prompt-analytics');
  
  console.log('\n🚀 Next Steps:');
  console.log('  1. Update your .env file with the new prompt IDs');
  console.log('  2. Restart your application to load the new configuration');
  console.log('  3. Test the enhanced endpoints: /api/analyze/enhanced');
  console.log('  4. Monitor performance via the CloudWatch dashboard');
  console.log('  5. Configure A/B test weights via /api/prompt-management/ab-test-config');
}

/**
 * List existing prompts (utility function)
 */
async function listExistingPrompts() {
  try {
    const command = new ListPromptsCommand({});
    const response = await bedrockAgent.send(command);
    
    console.log('\n📋 Existing Prompts:');
    for (const prompt of response.promptSummaries || []) {
      console.log(`  • ${prompt.name} (ID: ${prompt.id})`);
    }
  } catch (error) {
    console.error('Error listing prompts:', error.message);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--list')) {
  listExistingPrompts();
} else if (args.includes('--help')) {
  console.log(`
Enhanced Bedrock Prompt Management Deployment Script

Usage:
  node scripts/deploy-prompt-management.js [options]

Options:
  --help    Show this help message
  --list    List existing prompts without deploying

Environment Variables Required:
  AWS_REGION                    AWS region for deployment
  AWS_ACCESS_KEY_ID            AWS access key
  AWS_SECRET_ACCESS_KEY        AWS secret key

The script will:
  1. Create enhanced prompt templates for A/B testing
  2. Set up prompt versions for experimentation
  3. Deploy CloudWatch monitoring dashboard
  4. Provide configuration instructions
`);
} else {
  deployPromptManagement();
}

module.exports = {
  deployPromptManagement,
  PROMPT_TEMPLATES,
  DASHBOARD_CONFIG
};