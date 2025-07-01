// Main application entry point
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 8123;

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
    
    // Return mock data for debugging
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
    
  } catch (error) {
    console.error('Error in analysis process:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      message: error.message 
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`AWS Opportunity Analysis backend server running on port ${port}`);
  console.log(`Backend API available at http://localhost:${port}/api/analyze`);
});