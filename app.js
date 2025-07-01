// Main application entry point
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 8123;

// Import automations (AWS SDK v3 versions)
const invokeBedrockQueryPrompt = require('./automations/invokeBedrockQueryPrompt-v3');
const InvLamFilterAut = require('./automations/InvLamFilterAut-v3');
const finalBedAnalysisPrompt = require('./automations/finalBedAnalysisPrompt-v3');
const finalBedAnalysisPromptNovaPremier = require('./automations/finalBedAnalysisPromptNovaPremier-v3');

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// API endpoint for opportunity analysis
app.post('/api/analyze', async (req, res) => {
  try {
    console.log('Received analysis request:', JSON.stringify(req.body, null, 2));
    
    const { CustomerName, region, closeDate, oppName, oppDescription, useNovaPremier } = req.body;
    
    // Validate required fields
    if (!CustomerName || !region || !closeDate || !oppName || !oppDescription) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        message: 'All fields (CustomerName, region, closeDate, oppName, oppDescription) are required' 
      });
    }
    
    // Step 1: Generate SQL query using Bedrock
    console.log('Step 1: Generating SQL query...');
    const queryPromptResult = await invokeBedrockQueryPrompt.execute({
      CustomerName,
      region,
      closeDate,
      oppName,
      oppDescription
    });
    
    if (queryPromptResult.status === 'error') {
      throw new Error(`SQL query generation failed: ${queryPromptResult.message}`);
    }
    
    // Step 2: Execute SQL query via Lambda
    console.log('Step 2: Executing SQL query...');
    const lambdaResult = await InvLamFilterAut.execute({
      query: queryPromptResult.processResults
    });
    
    if (lambdaResult.status === 'error') {
      throw new Error(`SQL query execution failed: ${lambdaResult.message}`);
    }
    
    // Step 3: Analyze results using appropriate Bedrock model
    console.log(`Step 3: Analyzing results using ${useNovaPremier ? 'Nova Premier' : 'standard'} model...`);
    
    const analysisParams = {
      CustomerName,
      region,
      closeDate,
      oppName,
      oppDescription,
      queryResults: lambdaResult.processResults
    };
    
    let analysisResult;
    if (useNovaPremier) {
      analysisResult = await finalBedAnalysisPromptNovaPremier.execute(analysisParams);
    } else {
      analysisResult = await finalBedAnalysisPrompt.execute(analysisParams);
    }
    
    if (analysisResult.status === 'error') {
      throw new Error(`Analysis failed: ${analysisResult.message}`);
    }
    
    // Return the analysis results
    res.json({
      metrics: analysisResult.metrics,
      sections: analysisResult.sections,
      formattedSummaryText: analysisResult.formattedSummaryText
    });
    
  } catch (error) {
    console.error('Error in analysis process:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      message: error.message 
    });
  }
});

// Mock API endpoint for development/testing
app.post('/api/analyze/mock', (req, res) => {
  console.log('Received mock analysis request:', JSON.stringify(req.body, null, 2));
  
  // Return mock data
  setTimeout(() => {
    res.json({
      metrics: {
        predictedArr: "$120,000",
        predictedMrr: "$10,000",
        launchDate: "January 2026",
        predictedProjectDuration: "6 months",
        confidence: "MEDIUM",
        topServices: "**Amazon EC2** - $3,500/month\n\n**Amazon RDS** - $2,000/month\n\n**Amazon S3** - $500/month"
      },
      sections: {
        similarProjectsRaw: "--- Project 1 ---\nProject Name: Similar Migration Project\nCustomer: Example Corp\nIndustry: Healthcare\nDescription: Database migration to AWS\n\n--- Project 2 ---\nProject Name: Cloud Transformation\nCustomer: Another Company\nIndustry: Finance\nDescription: Full infrastructure migration"
      },
      formattedSummaryText: "=== ANALYSIS METHODOLOGY ===\nAnalysis based on historical project data\n\n=== DETAILED FINDINGS ===\nThis project appears to be a standard migration"
    });
  }, 2000); // Simulate processing time
});

// Start server
app.listen(port, () => {
  console.log(`AWS Opportunity Analysis backend server running on port ${port}`);
  console.log(`Backend API available at http://localhost:${port}/api/analyze`);
});