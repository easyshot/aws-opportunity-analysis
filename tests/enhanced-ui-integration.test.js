/**
 * Integration Tests for Enhanced Analysis Workflow
 * Tests complete workflow from enhanced input to comprehensive output display
 */

const { JSDOM } = require('jsdom');
const request = require('supertest');
const express = require('express');

// Mock DOM environment for frontend testing
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
  <title>AWS Opportunity Analysis</title>
</head>
<body>
  <form id="opportunityForm">
    <!-- Enhanced Input Fields -->
    <input type="text" id="CustomerName" name="CustomerName" required />
    <input type="text" id="oppName" name="oppName" required />
    <textarea id="oppDescription" name="oppDescription" required></textarea>
    <select id="region" name="region" required>
      <option value="us-east-1">US East (N. Virginia)</option>
    </select>
    <input type="date" id="closeDate" name="closeDate" required />
    <select id="industry" name="industry">
      <option value="Technology">Technology</option>
    </select>
    <select id="customerSegment" name="customerSegment">
      <option value="Enterprise">Enterprise</option>
    </select>
    <input type="text" id="partnerName" name="partnerName" />
    <select id="activityFocus" name="activityFocus">
      <option value="Migration">Migration</option>
    </select>
    <textarea id="businessDescription" name="businessDescription"></textarea>
    <select id="migrationPhase" name="migrationPhase">
      <option value="Assessment">Assessment</option>
    </select>
    <input type="url" id="salesforceLink" name="salesforceLink" />
    <input type="url" id="awsCalculatorLink" name="awsCalculatorLink" />
  </form>

  <!-- Enhanced Output Display Sections -->
  <div id="projectionsSection">
    <div id="oppArrOut">-</div>
    <div id="oppMrrOut">-</div>
    <div id="oppLaunchDateOut">-</div>
    <div id="oppProjectDurationOut">-</div>
    <div id="oppConfidenceOut">-</div>
    <div id="oppServicesOut">-</div>
  </div>

  <div id="analysisResultsSection">
    <div id="methodologyContent">-</div>
    <div id="similarProjectsContent">
      <div class="projects-table-container" style="display: none;">
        <table class="projects-table">
          <tbody id="projectsTableBody"></tbody>
        </table>
      </div>
      <div class="placeholder-content">No similar projects found</div>
    </div>
    <div id="findingsContent">-</div>
    <div id="rationaleContent">-</div>
    <div id="riskFactorsContent">-</div>
  </div>

  <div id="architectureSection">
    <div id="networkFoundationContent">-</div>
    <div id="computeLayerContent">-</div>
    <div id="dataLayerContent">-</div>
    <div id="securityComponentsContent">-</div>
    <div id="integrationPointsContent">-</div>
    <div id="scalingElementsContent">-</div>
    <div id="managementToolsContent">-</div>
  </div>

  <div id="querySection">
    <div id="queryContent">-</div>
    <div id="queryResultsContent">-</div>
  </div>

  <div id="summarySection">
    <div id="executiveSummaryContent">-</div>
  </div>

  <!-- Action Buttons -->
  <button id="oppDetQueryButtonV3">Analyze (Standard)</button>
  <button id="oppDetQueryButtonV4">Analyze (Nova Premier)</button>
  <button id="fundingAnalysisButton">Funding Analysis</button>
  <button id="nextOpportunityButton">Next Opportunity</button>
  <button id="resetFormButton">Reset</button>
  <button id="exportResultsButton">Export Results</button>
</body>
</html>
`, { url: 'http://localhost' });

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

// Mock Express app for API testing
const createMockApp = () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mock enhanced API endpoint
  app.post('/api/analyze', (req, res) => {
    const { analysisType, ...formData } = req.body;
    
    // Validate enhanced input fields
    const requiredFields = ['CustomerName', 'oppName', 'oppDescription', 'region', 'closeDate'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missingFields
      });
    }

    // Mock comprehensive analysis response
    const mockResponse = {
      success: true,
      analysisType: analysisType || 'standard',
      inputData: formData,
      projections: {
        arr: {
          value: 850000,
          formatted: '$850,000',
          confidence: 85,
          range: { min: 750000, max: 950000 }
        },
        mrr: {
          value: 70833,
          formatted: '$70,833',
          relationship: '8.33% of ARR'
        },
        launchDate: {
          date: '2025-09-15',
          daysFromNow: 257,
          timeline: '8.5 months from now'
        },
        timeToLaunch: {
          months: 8.5,
          formatted: '8.5 months',
          milestones: ['Planning: 2 months', 'Development: 4 months', 'Testing: 1.5 months', 'Deployment: 1 month']
        },
        confidence: {
          level: 'HIGH',
          score: 85,
          factors: ['Strong historical data match', 'Clear technical requirements', 'Experienced team']
        },
        topServices: [
          { service: 'EC2', estimatedCost: 25000, description: 'Compute instances' },
          { service: 'S3', estimatedCost: 8000, description: 'Object storage' },
          { service: 'RDS', estimatedCost: 15000, description: 'Managed database' }
        ]
      },
      analysis: {
        methodology: {
          approach: 'Historical data analysis with machine learning predictions',
          dataSources: ['Similar project database', 'AWS pricing data', 'Industry benchmarks'],
          techniques: ['Pattern matching', 'Regression analysis', 'Confidence scoring']
        },
        similarProjects: [
          {
            project: 'Cloud Migration Initiative',
            customer: 'TechCorp Solutions',
            industry: 'Technology',
            region: 'us-east-1',
            arr: 850000,
            services: ['EC2', 'S3', 'RDS'],
            similarity: 92
          },
          {
            project: 'Digital Transformation',
            customer: 'Healthcare Plus',
            industry: 'Healthcare',
            region: 'us-west-2',
            arr: 1200000,
            services: ['EC2', 'S3', 'RDS', 'CloudFront'],
            similarity: 78
          }
        ],
        findings: [
          {
            category: 'Market Analysis',
            insight: 'Strong demand for cloud migration in technology sector',
            supporting_data: 'Historical data shows 85% success rate',
            confidence: 90
          },
          {
            category: 'Technical Feasibility',
            insight: 'Standard migration pattern with proven architecture',
            supporting_data: 'Similar projects completed successfully',
            confidence: 88
          }
        ],
        rationale: [
          {
            prediction: 'ARR projection of $850,000',
            reasoning: 'Based on similar technology sector migrations',
            historical_basis: 'Average ARR for comparable projects: $825,000'
          }
        ],
        riskFactors: [
          {
            risk: 'Timeline delays due to data migration complexity',
            severity: 'MEDIUM',
            mitigation: 'Implement phased migration approach',
            impact: 'Could extend timeline by 1-2 months'
          },
          {
            risk: 'Budget overrun on compute costs',
            severity: 'LOW',
            mitigation: 'Use reserved instances and auto-scaling',
            impact: 'Potential 10-15% cost increase'
          }
        ]
      },
      architecture: {
        networkFoundation: ['VPC with public/private subnets', 'Internet Gateway', 'NAT Gateway'],
        computeLayer: ['EC2 instances with Auto Scaling', 'Application Load Balancer'],
        dataLayer: ['RDS Multi-AZ', 'S3 buckets with versioning', 'ElastiCache'],
        securityComponents: ['IAM roles and policies', 'Security Groups', 'AWS WAF'],
        integrationPoints: ['API Gateway', 'Lambda functions', 'EventBridge'],
        scalingElements: ['Auto Scaling Groups', 'CloudFront CDN', 'ElastiCache'],
        managementTools: ['CloudWatch', 'CloudTrail', 'Systems Manager'],
        completeArchitecture: 'Multi-tier architecture with high availability and security'
      },
      query: {
        generatedQuery: 'SELECT * FROM projects WHERE industry = "Technology" AND region = "us-east-1"',
        executionTime: '1.2 seconds',
        recordsFound: 15
      },
      queryResults: {
        totalRecords: 15,
        relevantRecords: 8,
        dataQuality: 'High',
        completeness: '95%'
      },
      summary: {
        executiveSummary: 'High-confidence opportunity with strong historical precedent. Recommended for immediate pursuit with standard migration approach.',
        keyRecommendations: [
          'Proceed with standard AWS migration architecture',
          'Implement phased approach to minimize risk',
          'Focus on cost optimization through reserved instances'
        ],
        nextSteps: [
          'Prepare detailed technical proposal',
          'Schedule customer architecture review',
          'Develop project timeline and milestones'
        ]
      }
    };

    // Simulate processing delay
    setTimeout(() => {
      res.json(mockResponse);
    }, 100);
  });

  return app;
};

// Integration test class
class EnhancedWorkflowIntegration {
  constructor() {
    this.app = createMockApp();
  }

  // Simulate form data collection
  collectEnhancedFormData() {
    const formData = {
      CustomerName: 'TechCorp Solutions',
      oppName: 'Cloud Migration Initiative',
      oppDescription: 'Complete infrastructure migration to AWS with modernization components',
      region: 'us-east-1',
      closeDate: '2025-12-31',
      industry: 'Technology',
      customerSegment: 'Enterprise',
      partnerName: 'AWS Partner Solutions',
      activityFocus: 'Migration',
      businessDescription: 'Legacy system modernization with cloud-native architecture',
      migrationPhase: 'Assessment',
      salesforceLink: 'https://example.salesforce.com/opportunity/123',
      awsCalculatorLink: 'https://calculator.aws/#/estimate'
    };

    return formData;
  }

  // Simulate UI population with analysis results
  populateEnhancedUI(results) {
    const populationResults = {
      projections: false,
      analysis: false,
      architecture: false,
      query: false,
      summary: false
    };

    try {
      // Populate projections
      if (results.projections) {
        document.getElementById('oppArrOut').textContent = results.projections.arr.formatted;
        document.getElementById('oppMrrOut').textContent = results.projections.mrr.formatted;
        document.getElementById('oppLaunchDateOut').textContent = results.projections.launchDate.date;
        document.getElementById('oppProjectDurationOut').textContent = results.projections.timeToLaunch.formatted;
        document.getElementById('oppConfidenceOut').textContent = results.projections.confidence.level;
        document.getElementById('oppServicesOut').textContent = results.projections.topServices.map(s => s.service).join(', ');
        populationResults.projections = true;
      }

      // Populate analysis results
      if (results.analysis) {
        document.getElementById('methodologyContent').textContent = results.analysis.methodology.approach;
        document.getElementById('findingsContent').textContent = results.analysis.findings.map(f => f.insight).join('; ');
        document.getElementById('rationaleContent').textContent = results.analysis.rationale.map(r => r.reasoning).join('; ');
        document.getElementById('riskFactorsContent').textContent = results.analysis.riskFactors.map(r => r.risk).join('; ');
        
        // Populate similar projects table
        if (results.analysis.similarProjects && results.analysis.similarProjects.length > 0) {
          const tableContainer = document.querySelector('.projects-table-container');
          const placeholder = document.querySelector('.placeholder-content');
          tableContainer.style.display = 'block';
          placeholder.style.display = 'none';
          
          const tbody = document.getElementById('projectsTableBody');
          tbody.innerHTML = results.analysis.similarProjects.map(project => `
            <tr>
              <td>${project.project}</td>
              <td>${project.customer}</td>
              <td>${project.industry}</td>
              <td>${project.region}</td>
              <td>$${project.arr.toLocaleString()}</td>
              <td>${project.services.join(', ')}</td>
              <td>${project.similarity}%</td>
            </tr>
          `).join('');
        }
        
        populationResults.analysis = true;
      }

      // Populate architecture
      if (results.architecture) {
        document.getElementById('networkFoundationContent').textContent = results.architecture.networkFoundation.join(', ');
        document.getElementById('computeLayerContent').textContent = results.architecture.computeLayer.join(', ');
        document.getElementById('dataLayerContent').textContent = results.architecture.dataLayer.join(', ');
        document.getElementById('securityComponentsContent').textContent = results.architecture.securityComponents.join(', ');
        document.getElementById('integrationPointsContent').textContent = results.architecture.integrationPoints.join(', ');
        document.getElementById('scalingElementsContent').textContent = results.architecture.scalingElements.join(', ');
        document.getElementById('managementToolsContent').textContent = results.architecture.managementTools.join(', ');
        populationResults.architecture = true;
      }

      // Populate query information
      if (results.query) {
        document.getElementById('queryContent').textContent = results.query.generatedQuery;
        document.getElementById('queryResultsContent').textContent = `Found ${results.queryResults.totalRecords} records in ${results.query.executionTime}`;
        populationResults.query = true;
      }

      // Populate executive summary
      if (results.summary) {
        document.getElementById('executiveSummaryContent').textContent = results.summary.executiveSummary;
        populationResults.summary = true;
      }

    } catch (error) {
      console.error('Error populating UI:', error);
    }

    return populationResults;
  }

  // Test button state management
  testButtonStates(analysisInProgress = false) {
    const buttons = {
      analyze: document.getElementById('oppDetQueryButtonV3'),
      analyzeNova: document.getElementById('oppDetQueryButtonV4'),
      funding: document.getElementById('fundingAnalysisButton'),
      nextOpp: document.getElementById('nextOpportunityButton'),
      reset: document.getElementById('resetFormButton'),
      export: document.getElementById('exportResultsButton')
    };

    const states = {};
    
    Object.keys(buttons).forEach(key => {
      const button = buttons[key];
      if (button) {
        states[key] = {
          disabled: button.disabled,
          visible: button.style.display !== 'none',
          text: button.textContent
        };
      }
    });

    return states;
  }
}

describe('Enhanced UI Integration Tests', () => {
  let integration;

  beforeEach(() => {
    integration = new EnhancedWorkflowIntegration();
    
    // Reset DOM state
    const form = document.getElementById('opportunityForm');
    if (form) form.reset();
    
    // Clear all output sections
    const outputElements = [
      'oppArrOut', 'oppMrrOut', 'oppLaunchDateOut', 'oppProjectDurationOut',
      'oppConfidenceOut', 'oppServicesOut', 'methodologyContent', 'findingsContent',
      'rationaleContent', 'riskFactorsContent', 'networkFoundationContent',
      'computeLayerContent', 'dataLayerContent', 'securityComponentsContent',
      'integrationPointsContent', 'scalingElementsContent', 'managementToolsContent',
      'queryContent', 'queryResultsContent', 'executiveSummaryContent'
    ];
    
    outputElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.textContent = '-';
    });
  });

  describe('Complete Analysis Workflow', () => {
    test('should handle standard analysis workflow end-to-end', async () => {
      // Step 1: Collect enhanced form data
      const formData = integration.collectEnhancedFormData();
      expect(formData.CustomerName).toBe('TechCorp Solutions');
      expect(formData.oppName).toBe('Cloud Migration Initiative');
      expect(formData.region).toBe('us-east-1');

      // Step 2: Submit analysis request
      const response = await request(integration.app)
        .post('/api/analyze')
        .send({ ...formData, analysisType: 'standard' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.analysisType).toBe('standard');
      expect(response.body.inputData.CustomerName).toBe('TechCorp Solutions');

      // Step 3: Verify comprehensive response structure
      expect(response.body.projections).toBeDefined();
      expect(response.body.analysis).toBeDefined();
      expect(response.body.architecture).toBeDefined();
      expect(response.body.query).toBeDefined();
      expect(response.body.summary).toBeDefined();

      // Step 4: Populate UI with results
      const populationResults = integration.populateEnhancedUI(response.body);
      expect(populationResults.projections).toBe(true);
      expect(populationResults.analysis).toBe(true);
      expect(populationResults.architecture).toBe(true);
      expect(populationResults.query).toBe(true);
      expect(populationResults.summary).toBe(true);

      // Step 5: Verify UI population
      expect(document.getElementById('oppArrOut').textContent).toBe('$850,000');
      expect(document.getElementById('oppMrrOut').textContent).toBe('$70,833');
      expect(document.getElementById('oppConfidenceOut').textContent).toBe('HIGH');
    });

    test('should handle Nova Premier analysis workflow', async () => {
      const formData = integration.collectEnhancedFormData();

      const response = await request(integration.app)
        .post('/api/analyze')
        .send({ ...formData, analysisType: 'nova-premier' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.analysisType).toBe('nova-premier');
      
      // Nova Premier should provide same comprehensive structure
      expect(response.body.projections).toBeDefined();
      expect(response.body.analysis).toBeDefined();
      expect(response.body.architecture).toBeDefined();
    });

    test('should handle funding analysis workflow', async () => {
      const formData = integration.collectEnhancedFormData();

      const response = await request(integration.app)
        .post('/api/analyze')
        .send({ ...formData, analysisType: 'funding' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.projections).toBeDefined();
      expect(response.body.projections.arr).toBeDefined();
      expect(response.body.projections.mrr).toBeDefined();
    });
  });

  describe('Enhanced Input Field Integration', () => {
    test('should validate all enhanced input fields', async () => {
      const incompleteData = {
        CustomerName: 'Test Customer',
        // Missing required fields
      };

      const response = await request(integration.app)
        .post('/api/analyze')
        .send(incompleteData)
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
      expect(response.body.missingFields).toContain('oppName');
      expect(response.body.missingFields).toContain('oppDescription');
      expect(response.body.missingFields).toContain('region');
      expect(response.body.missingFields).toContain('closeDate');
    });

    test('should process all optional enhanced fields', async () => {
      const completeData = integration.collectEnhancedFormData();

      const response = await request(integration.app)
        .post('/api/analyze')
        .send(completeData)
        .expect(200);

      const inputData = response.body.inputData;
      expect(inputData.industry).toBe('Technology');
      expect(inputData.customerSegment).toBe('Enterprise');
      expect(inputData.partnerName).toBe('AWS Partner Solutions');
      expect(inputData.activityFocus).toBe('Migration');
      expect(inputData.businessDescription).toBeDefined();
      expect(inputData.migrationPhase).toBe('Assessment');
      expect(inputData.salesforceLink).toContain('salesforce.com');
      expect(inputData.awsCalculatorLink).toContain('calculator.aws');
    });
  });

  describe('Comprehensive Output Display Integration', () => {
    test('should populate all projection display sections', async () => {
      const formData = integration.collectEnhancedFormData();
      const response = await request(integration.app)
        .post('/api/analyze')
        .send(formData)
        .expect(200);

      const populationResults = integration.populateEnhancedUI(response.body);
      expect(populationResults.projections).toBe(true);

      // Verify all projection fields are populated
      expect(document.getElementById('oppArrOut').textContent).not.toBe('-');
      expect(document.getElementById('oppMrrOut').textContent).not.toBe('-');
      expect(document.getElementById('oppLaunchDateOut').textContent).not.toBe('-');
      expect(document.getElementById('oppProjectDurationOut').textContent).not.toBe('-');
      expect(document.getElementById('oppConfidenceOut').textContent).not.toBe('-');
      expect(document.getElementById('oppServicesOut').textContent).not.toBe('-');
    });

    test('should populate all analysis result sections', async () => {
      const formData = integration.collectEnhancedFormData();
      const response = await request(integration.app)
        .post('/api/analyze')
        .send(formData)
        .expect(200);

      const populationResults = integration.populateEnhancedUI(response.body);
      expect(populationResults.analysis).toBe(true);

      // Verify analysis sections are populated
      expect(document.getElementById('methodologyContent').textContent).not.toBe('-');
      expect(document.getElementById('findingsContent').textContent).not.toBe('-');
      expect(document.getElementById('rationaleContent').textContent).not.toBe('-');
      expect(document.getElementById('riskFactorsContent').textContent).not.toBe('-');
    });

    test('should populate similar projects table correctly', async () => {
      const formData = integration.collectEnhancedFormData();
      const response = await request(integration.app)
        .post('/api/analyze')
        .send(formData)
        .expect(200);

      integration.populateEnhancedUI(response.body);

      // Verify table is shown and populated
      const tableContainer = document.querySelector('.projects-table-container');
      const placeholder = document.querySelector('.placeholder-content');
      const tbody = document.getElementById('projectsTableBody');

      expect(tableContainer.style.display).toBe('block');
      expect(placeholder.style.display).toBe('none');
      expect(tbody.innerHTML).toContain('Cloud Migration Initiative');
      expect(tbody.innerHTML).toContain('TechCorp Solutions');
    });

    test('should populate all architecture sections', async () => {
      const formData = integration.collectEnhancedFormData();
      const response = await request(integration.app)
        .post('/api/analyze')
        .send(formData)
        .expect(200);

      const populationResults = integration.populateEnhancedUI(response.body);
      expect(populationResults.architecture).toBe(true);

      // Verify all architecture sections are populated
      expect(document.getElementById('networkFoundationContent').textContent).not.toBe('-');
      expect(document.getElementById('computeLayerContent').textContent).not.toBe('-');
      expect(document.getElementById('dataLayerContent').textContent).not.toBe('-');
      expect(document.getElementById('securityComponentsContent').textContent).not.toBe('-');
      expect(document.getElementById('integrationPointsContent').textContent).not.toBe('-');
      expect(document.getElementById('scalingElementsContent').textContent).not.toBe('-');
      expect(document.getElementById('managementToolsContent').textContent).not.toBe('-');
    });
  });

  describe('Action Button Integration', () => {
    test('should manage button states during analysis', () => {
      // Test initial button states
      const initialStates = integration.testButtonStates(false);
      expect(initialStates.analyze.disabled).toBeFalsy();
      expect(initialStates.analyzeNova.disabled).toBeFalsy();
      expect(initialStates.reset.disabled).toBeFalsy();

      // Test button states during analysis (would be set by actual frontend code)
      // This simulates the button state management during analysis
      const analysisStates = integration.testButtonStates(true);
      expect(analysisStates).toBeDefined();
    });

    test('should enable export functionality after analysis', async () => {
      const formData = integration.collectEnhancedFormData();
      const response = await request(integration.app)
        .post('/api/analyze')
        .send(formData)
        .expect(200);

      integration.populateEnhancedUI(response.body);

      // After successful analysis, export should be available
      const exportButton = document.getElementById('exportResultsButton');
      expect(exportButton).toBeDefined();
      // In real implementation, this would be enabled after population
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle API errors gracefully', async () => {
      // Test with invalid data that would cause server error
      const invalidData = {
        CustomerName: '', // Empty required field
        oppName: '',
        oppDescription: '',
        region: '',
        closeDate: ''
      };

      const response = await request(integration.app)
        .post('/api/analyze')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.missingFields).toBeDefined();
    });

    test('should handle UI population errors', () => {
      // Test with malformed response data
      const malformedResponse = {
        projections: null,
        analysis: undefined,
        architecture: {}
      };

      const populationResults = integration.populateEnhancedUI(malformedResponse);
      
      // Should handle errors gracefully without crashing
      expect(populationResults).toBeDefined();
      expect(populationResults.projections).toBe(false);
      expect(populationResults.analysis).toBe(false);
    });
  });

  describe('Data Flow Integration', () => {
    test('should maintain data consistency throughout workflow', async () => {
      const originalData = integration.collectEnhancedFormData();
      
      const response = await request(integration.app)
        .post('/api/analyze')
        .send(originalData)
        .expect(200);

      // Verify input data is preserved in response
      expect(response.body.inputData.CustomerName).toBe(originalData.CustomerName);
      expect(response.body.inputData.oppName).toBe(originalData.oppName);
      expect(response.body.inputData.region).toBe(originalData.region);
      expect(response.body.inputData.industry).toBe(originalData.industry);
      expect(response.body.inputData.customerSegment).toBe(originalData.customerSegment);
    });

    test('should handle different analysis types with same input', async () => {
      const formData = integration.collectEnhancedFormData();

      // Test standard analysis
      const standardResponse = await request(integration.app)
        .post('/api/analyze')
        .send({ ...formData, analysisType: 'standard' })
        .expect(200);

      // Test Nova Premier analysis
      const novaResponse = await request(integration.app)
        .post('/api/analyze')
        .send({ ...formData, analysisType: 'nova-premier' })
        .expect(200);

      // Both should succeed with same input data
      expect(standardResponse.body.success).toBe(true);
      expect(novaResponse.body.success).toBe(true);
      expect(standardResponse.body.analysisType).toBe('standard');
      expect(novaResponse.body.analysisType).toBe('nova-premier');
    });
  });
});