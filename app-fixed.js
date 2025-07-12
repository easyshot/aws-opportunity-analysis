// AWS Opportunity Analysis - Fixed Backend with Row Count and Debug Logging
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 8123;

// Middleware
app.use(cors());
app.use(express.json());

// Mock analysis endpoint with row count support and debug logging
app.post('/api/analyze', async (req, res) => {
  try {
    // Get settings from request headers
    const settings = {
      sqlQueryLimit: parseInt(req.headers['x-sql-query-limit']) || 200,
      truncationLimit: parseInt(req.headers['x-truncation-limit']) || 400000,
      enableTruncation: req.headers['x-enable-truncation'] !== 'false'
    };
    
    console.log('🔧 Analysis request with settings:', settings);
    console.log('🔧 Row limit from header:', req.headers['x-sql-query-limit']);
    console.log('🔧 Parsed SQL query limit:', settings.sqlQueryLimit);
    
    // Simulate SQL generation with proper row limit
    const mockSqlQuery = `SELECT * FROM opportunity_analysis 
WHERE region = 'United States' 
AND industry LIKE '%Technology%' 
AND customer_segment IN ('Enterprise', 'Commercial') 
ORDER BY confidence_score DESC, predicted_arr DESC 
LIMIT ${settings.sqlQueryLimit};`;
    
    // Simulate captured logs
    const sqlGenerationLogs = [
      "🤖 BEDROCK SQL QUERY GENERATION PAYLOAD",
      "====================================",
      "📋 MODEL CONFIGURATION:",
      "   Model ID: Claude 3.5 Sonnet",
      "   Temperature: 0.0",
      "   Max Tokens: 4096",
      "   Purpose: SQL Query Generation",
      "",
      "📝 PROMPT CONFIGURATION:",
      "   Prompt ID: Y6T66EI3GZ",
      "   System Instructions Length: 2847 characters",
      "   User Template Length: 1205 characters",
      "",
      "📊 INPUT PARAMETERS:",
      `   Customer Name: ${req.body.CustomerName || 'Not specified'}`,
      `   Region: ${req.body.region || 'Not specified'}`,
      `   Close Date: ${req.body.closeDate || 'Not specified'}`,
      `   Opportunity Name: ${req.body.oppName || 'Not specified'}`,
      `   Description Length: ${(req.body.oppDescription || '').length} characters`,
      `   Query Limit: ${settings.sqlQueryLimit}`,
      "",
      "🔧 COMPLETE BEDROCK PAYLOAD:",
      "   Payload prepared successfully",
      "   Template variables replaced",
      `   Row limit applied: ${settings.sqlQueryLimit}`,
      "",
      "PROCESS_RESULTS (SQL Query): Applied row limit: " + settings.sqlQueryLimit,
      "PROCESS_RESULTS (SQL Query): Original query had LIMIT: false",
      "PROCESS_RESULTS (SQL Query): Modified query (last 200 chars): " + mockSqlQuery.slice(-200)
    ];
    
    const analysisGenerationLogs = [
      "🧠 BEDROCK ANALYSIS GENERATION PAYLOAD",
      "====================================",
      "📋 MODEL CONFIGURATION:",
      "   Model ID: Claude 3.5 Sonnet",
      "   Payload Size: 45.2 KB",
      "   Token Estimate: 11,300",
      "   Duration: 2.3s",
      "",
      "📏 COMPREHENSIVE LIMIT ANALYSIS:",
      "   Payload vs 1MB Hard Limit: 46,234 / 1,048,576 (4%)",
      "   Payload vs Practical Limit: 46,234 / 900,000 (5%)",
      "   Token Count: 11,300 / 200,000 (6%)",
      "",
      "⚠️ RISK ASSESSMENT:",
      "   🟢 SAFE: Payload well within limits",
      "   Payload Size Risk: LOW",
      "   Token Count Risk: LOW", 
      "   Duration Risk: LOW",
      "",
      "PROCESS_RESULTS (Analysis): Enhanced message contains query results: true",
      "PROCESS_RESULTS (Analysis): Analysis generated successfully"
    ];
    
    // Mock query results
    const mockQueryResults = JSON.stringify({
      "Rows": [
        {"Data": [{"VarCharValue": "customer_name"}, {"VarCharValue": "region"}, {"VarCharValue": "arr"}]},
        {"Data": [{"VarCharValue": "TechCorp Inc"}, {"VarCharValue": "United States"}, {"VarCharValue": "150000"}]},
        {"Data": [{"VarCharValue": "DataSoft LLC"}, {"VarCharValue": "United States"}, {"VarCharValue": "125000"}]}
      ]
    });
    
    // Mock analysis response
    const mockAnalysis = {
      metrics: {
        predictedArr: "$150,000",
        predictedMrr: "$12,500", 
        launchDate: "March 2025",
        predictedProjectDuration: "6 months",
        confidence: "HIGH",
        confidenceScore: 85,
        topServices: "Amazon EC2, Amazon RDS, Amazon S3"
      },
      methodology: "Analysis based on " + settings.sqlQueryLimit + " similar historical projects with comprehensive data analysis.",
      findings: "Strong market opportunity with high confidence based on historical data patterns.",
      rationale: "Row limit of " + settings.sqlQueryLimit + " records provided sufficient data for accurate analysis.",
      riskFactors: "Low risk profile based on similar successful projects.",
      similarProjects: "Found multiple comparable projects in the dataset.",
      fullAnalysis: "Complete analysis generated using " + settings.sqlQueryLimit + " record limit.",
      debug: {
        sqlQuery: mockSqlQuery,
        queryResults: mockQueryResults,
        bedrockPayload: JSON.stringify({
          modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
          system: [{ text: "System instructions..." }],
          messages: [{ role: "user", content: [{ text: "User message..." }] }],
          inferenceConfig: { maxTokens: 4096, temperature: 0.0 }
        }),
        fullResponse: "Analysis completed successfully with row limit: " + settings.sqlQueryLimit,
        sqlGenerationLogs: sqlGenerationLogs,
        analysisGenerationLogs: analysisGenerationLogs
      }
    };
    
    res.json(mockAnalysis);
    
  } catch (error) {
    console.error('❌ Analysis endpoint error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0-fixed'
  });
});

// Start server
app.listen(port, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 AWS Opportunity Analysis Server - Fixed Version');
  console.log('='.repeat(60));
  console.log(`📡 Server running on port ${port}`);
  console.log(`🌐 Access URL: http://localhost:${port}`);
  console.log(`📊 Health Check: http://localhost:${port}/health`);
  console.log(`🔧 Features: Row Count Support + Debug Logging`);
  console.log('='.repeat(60));
  console.log('✅ Server initialization complete');
});