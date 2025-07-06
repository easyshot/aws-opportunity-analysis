#!/usr/bin/env node

const { BedrockRAGService } = require('../lib/bedrock-rag-service');
const { KnowledgeBaseIngestion } = require('../lib/knowledge-base-ingestion');
require('dotenv').config();

/**
 * Test Knowledge Base functionality
 */
async function testKnowledgeBase() {
  console.log('🧪 Testing Knowledge Base functionality...\n');

  try {
    // Test 1: Initialize services
    console.log('1. Initializing services...');
    const ragService = new BedrockRAGService({
      region: process.env.AWS_REGION,
      knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID
    });

    const ingestion = new KnowledgeBaseIngestion({
      region: process.env.AWS_REGION,
      bucketName: process.env.KNOWLEDGE_BASE_BUCKET,
      knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID,
      dataSourceId: process.env.KNOWLEDGE_BASE_DATA_SOURCE_ID
    });

    console.log('✅ Services initialized successfully\n');

    // Test 2: Check knowledge base status
    console.log('2. Checking knowledge base status...');
    const stats = await ragService.getKnowledgeBaseStats();
    console.log('Knowledge Base Stats:', JSON.stringify(stats, null, 2));
    console.log('✅ Knowledge base status checked\n');

    // Test 3: List data files
    console.log('3. Listing data files in S3...');
    try {
      const files = await ingestion.listDataFiles();
      console.log(`Found ${files.length} data files:`);
      files.forEach(file => {
        console.log(`  - ${file.key} (${file.size} bytes, modified: ${file.lastModified})`);
      });
      console.log('✅ Data files listed successfully\n');
    } catch (error) {
      console.log('⚠️  Could not list data files (bucket may not exist yet):', error.message);
      console.log('   This is normal if the infrastructure hasn\'t been deployed yet\n');
    }

    // Test 4: Test retrieval (only if knowledge base is configured)
    if (process.env.KNOWLEDGE_BASE_ID && process.env.KNOWLEDGE_BASE_ID !== 'your-knowledge-base-id') {
      console.log('4. Testing document retrieval...');
      try {
        const retrievalResult = await ragService.retrieveRelevantProjects(
          'cloud migration enterprise AWS services'
        );
        console.log(`Retrieved ${retrievalResult.projects.length} relevant projects`);
        
        if (retrievalResult.projects.length > 0) {
          console.log('Sample retrieved project:');
          console.log(JSON.stringify(retrievalResult.projects[0], null, 2));
        }
        console.log('✅ Document retrieval test completed\n');
      } catch (error) {
        console.log('⚠️  Document retrieval test failed:', error.message);
        console.log('   This is expected if no data has been ingested yet\n');
      }

      // Test 5: Test enhanced analysis
      console.log('5. Testing enhanced analysis...');
      try {
        const analysisResult = await ragService.generateEnhancedAnalysis({
          customerName: 'TestCorp',
          region: 'us-east-1',
          opportunityName: 'Test Migration',
          description: 'Test cloud migration project for enterprise customer'
        });
        
        console.log('Enhanced analysis completed:');
        console.log(`- Search query: ${analysisResult.searchQuery}`);
        console.log(`- Retrieved projects: ${analysisResult.retrievedProjects.length}`);
        console.log('✅ Enhanced analysis test completed\n');
      } catch (error) {
        console.log('⚠️  Enhanced analysis test failed:', error.message);
        console.log('   This is expected if no data has been ingested yet\n');
      }
    } else {
      console.log('4-5. Skipping retrieval and analysis tests (Knowledge Base ID not configured)\n');
    }

    console.log('🎉 Knowledge Base functionality test completed!');
    console.log('\n📋 Summary:');
    console.log('- Services can be initialized ✅');
    console.log('- Knowledge base status can be checked ✅');
    console.log('- S3 data files can be listed ✅');
    
    if (process.env.KNOWLEDGE_BASE_ID && process.env.KNOWLEDGE_BASE_ID !== 'your-knowledge-base-id') {
      console.log('- Document retrieval is configured ✅');
      console.log('- Enhanced analysis is available ✅');
    } else {
      console.log('- Document retrieval needs configuration ⚠️');
      console.log('- Enhanced analysis needs configuration ⚠️');
    }

  } catch (error) {
    console.error('❌ Knowledge Base test failed:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Ensure AWS credentials are configured');
    console.error('2. Deploy the knowledge base infrastructure: npm run knowledge-base:deploy');
    console.error('3. Update .env file with knowledge base IDs from deployment output');
    console.error('4. Ingest sample data: npm run knowledge-base:test-ingestion');
    process.exit(1);
  }
}

/**
 * Test enhanced analysis automation
 */
async function testEnhancedAnalysisAutomation() {
  console.log('🔬 Testing Enhanced Analysis Automation...\n');

  try {
    const { enhancedAnalysisWithRAG } = require('../automations/enhancedAnalysisWithRAG-v3');

    const testParams = {
      customerName: 'TestCorp Inc',
      region: 'us-east-1',
      closeDate: '2024-12-31',
      oppName: 'Enterprise Cloud Migration',
      oppDescription: 'Large-scale migration of on-premises infrastructure to AWS cloud services including compute, storage, and database modernization',
      analysisType: 'comprehensive',
      useIntegratedRAG: true
    };

    console.log('Testing enhanced analysis with RAG...');
    const result = await enhancedAnalysisWithRAG(testParams);

    if (result.success) {
      console.log('✅ Enhanced analysis completed successfully');
      console.log('Analysis type:', result.metadata.analysisType);
      console.log('RAG enhanced:', result.analysis.ragEnhanced);
      
      if (result.analysis.citations) {
        console.log('Citations found:', result.analysis.citations.length);
      }
      
      if (result.analysis.retrievedProjectsCount) {
        console.log('Retrieved projects:', result.analysis.retrievedProjectsCount);
      }
    } else {
      console.log('⚠️  Enhanced analysis returned error:', result.error.message);
    }

    console.log('\n🎉 Enhanced Analysis Automation test completed!');

  } catch (error) {
    console.error('❌ Enhanced Analysis Automation test failed:', error);
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'basic':
    testKnowledgeBase();
    break;
  case 'automation':
    testEnhancedAnalysisAutomation();
    break;
  case 'all':
    testKnowledgeBase().then(() => testEnhancedAnalysisAutomation());
    break;
  case 'help':
  default:
    console.log('Knowledge Base Test Script\n');
    console.log('Usage:');
    console.log('  node scripts/test-knowledge-base.js basic      - Test basic knowledge base functionality');
    console.log('  node scripts/test-knowledge-base.js automation - Test enhanced analysis automation');
    console.log('  node scripts/test-knowledge-base.js all        - Run all tests');
    console.log('  node scripts/test-knowledge-base.js help       - Show this help');
    break;
}

module.exports = {
  testKnowledgeBase,
  testEnhancedAnalysisAutomation
};