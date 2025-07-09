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
          confidenceScore: 75,
          confidenceFactors: [
            "Strong historical data match",
            "Similar customer profile",
            "Standard service patterns"
          ],
          topServices: "**Amazon EC2** - $3,500/month\n\n**Amazon RDS** - $2,000/month\n\n**Amazon S3** - $500/month",
          servicesData: [
            {
              name: "Amazon EC2",
              cost: 3500,
              description: "Compute instances for application hosting"
            },
            {
              name: "Amazon RDS",
              cost: 2000,
              description: "Managed database service"
            },
            {
              name: "Amazon S3",
              cost: 500,
              description: "Object storage for data and backups"
            }
          ]
        },
        sections: {
          similarProjectsRaw: "--- Project 1 ---\nProject Name: Similar Migration Project\nCustomer: Example Corp\nIndustry: Healthcare\nDescription: Database migration to AWS\n\n--- Project 2 ---\nProject Name: Cloud Transformation\nCustomer: Another Company\nIndustry: Finance\nDescription: Full infrastructure migration"
        },
        methodology: {
          analysisApproach: {
            summary: "Historical data analysis using AWS Bedrock AI models to identify similar projects and predict opportunity outcomes.",
            steps: [
              "Query generation using natural language processing",
              "Historical project data retrieval from AWS Athena",
              "Pattern matching and similarity analysis",
              "Statistical modeling for predictions",
              "Confidence scoring based on data quality"
            ],
            techniques: [
              "Machine Learning",
              "Natural Language Processing", 
              "Statistical Analysis",
              "Pattern Recognition",
              "Predictive Modeling"
            ]
          },
          dataSources: [
            {
              name: "Historical Project Database",
              description: "AWS Athena database containing historical opportunity and project data",
              icon: "🗄️"
            },
            {
              name: "AWS Bedrock AI Models",
              description: "Amazon Titan model for standard analysis",
              icon: "🤖"
            },
            {
              name: "Customer Input Data",
              description: "Analysis based on customer opportunity data",
              icon: "📝"
            }
          ],
          dataQuality: {
            coverage: "85%",
            accuracy: "92%",
            completeness: "78%"
          },
          confidenceFactors: [
            {
              factor: "Historical Data Availability",
              impact: "high",
              description: "Sufficient historical projects for pattern matching"
            },
            {
              factor: "Customer Profile Match",
              impact: "medium", 
              description: "Similar customer segments and industries in historical data"
            },
            {
              factor: "Regional Data Coverage",
              impact: "medium",
              description: "Good coverage of projects in target region"
            },
            {
              factor: "Service Pattern Recognition",
              impact: "high",
              description: "Strong patterns in service usage for similar opportunities"
            }
          ],
          scoring: {
            formula: "Confidence = (Data_Quality × 0.4) + (Pattern_Match × 0.3) + (Historical_Accuracy × 0.3)",
            explanation: "Weighted scoring based on data quality, pattern matching strength, and historical prediction accuracy"
          },
          limitations: [
            "Predictions based on historical patterns may not account for new market conditions",
            "Limited data for highly specialized or unique customer requirements",
            "Regional variations may affect accuracy for less common AWS regions",
            "Service pricing and availability subject to change"
          ]
        },
        formattedSummaryText: "=== ANALYSIS METHODOLOGY ===\nAnalysis based on historical project data\n\n=== DETAILED FINDINGS ===\nThis project appears to be a standard migration",
        debug: {
          sqlQuery: `SELECT 
    customer_name,
    region,
    close_date,
    opportunity_name,
    description,
    industry,
    customer_segment,
    predicted_arr,
    predicted_mrr,
    launch_date,
    confidence_score
FROM opportunity_analysis 
WHERE region = 'United States' 
    AND industry LIKE '%Technology%'
    AND customer_segment IN ('Enterprise', 'Commercial')
ORDER BY confidence_score DESC, predicted_arr DESC
LIMIT 50;`,
          queryResults: `{
  "ResultSet": {
    "Rows": [
      {
        "Data": [
          {"VarCharValue": "TechCorp Solutions"},
          {"VarCharValue": "United States"},
          {"VarCharValue": "2024-03-15"},
          {"VarCharValue": "Cloud Migration Initiative"},
          {"VarCharValue": "Large-scale migration of on-premises infrastructure to AWS"},
          {"VarCharValue": "Technology"},
          {"VarCharValue": "Enterprise"},
          {"VarCharValue": "150000"},
          {"VarCharValue": "12500"},
          {"VarCharValue": "2024-09-01"},
          {"VarCharValue": "85"}
        ]
      },
      {
        "Data": [
          {"VarCharValue": "InnovateTech Inc"},
          {"VarCharValue": "United States"},
          {"VarCharValue": "2024-02-20"},
          {"VarCharValue": "Digital Transformation"},
          {"VarCharValue": "Modernization of legacy applications using AWS services"},
          {"VarCharValue": "Technology"},
          {"VarCharValue": "Commercial"},
          {"VarCharValue": "95000"},
          {"VarCharValue": "7900"},
          {"VarCharValue": "2024-08-15"},
          {"VarCharValue": "78"}
        ]
      }
    ],
    "ResultSetMetadata": {
      "ColumnInfo": [
        {"Name": "customer_name", "Type": "varchar"},
        {"Name": "region", "Type": "varchar"},
        {"Name": "close_date", "Type": "date"},
        {"Name": "opportunity_name", "Type": "varchar"},
        {"Name": "description", "Type": "varchar"},
        {"Name": "industry", "Type": "varchar"},
        {"Name": "customer_segment", "Type": "varchar"},
        {"Name": "predicted_arr", "Type": "bigint"},
        {"Name": "predicted_mrr", "Type": "bigint"},
        {"Name": "launch_date", "Type": "date"},
        {"Name": "confidence_score", "Type": "int"}
      ]
    }
  }
}`,
          bedrockPayload: `{
  "modelId": "amazon.titan-text-premier-v1:0",
  "system": [
    {
      "text": "You are an expert AWS opportunity analysis consultant with deep expertise in cloud migrations, digital transformations, and AWS service recommendations. Your role is to analyze business opportunities and provide comprehensive insights based on historical project data and industry best practices.\\n\\nAnalyze the provided opportunity details and historical project data to generate a comprehensive analysis with specific predictions and recommendations.\\n\\nIMPORTANT: Your response must be structured with clear sections and include specific metrics."
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "text": "\\n<opp_details>\\nNew Opportunity Information:\\n- Customer Name: ${req.body.customerName || 'Sample Customer'}\\n- Region: ${req.body.region || 'United States'}\\n- Close Date: ${req.body.closeDate || '2025-06-01'}\\n- Opportunity Name: ${req.body.opportunityName || 'Cloud Migration Project'}\\n- Description: ${req.body.description || 'Enterprise cloud migration and digital transformation initiative'}\\n</opp_details>\\n\\n<project_data>\\nHistorical Project Dataset:\\n[Historical project data with similar customer profiles and requirements]\\n</project_data>\\n\\nBased on the opportunity details and historical project data above, provide a comprehensive analysis with specific predictions for AWS Annual Recurring Revenue (ARR), Monthly Recurring Revenue (MRR), launch timeline, and confidence assessment."
        }
      ]
    }
  ],
  "inferenceConfig": {
    "maxTokens": 8192,
    "temperature": 0.1
  }
}`
        }
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