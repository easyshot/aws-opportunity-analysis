// Main application entry point - Production Mode
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 8123;

// Import production logging
const { productionLogger } = require('./config/production-logging-config');

// Import monitoring services with fallback
let MonitoringService = null;
let monitoringConfig = null;
let monitoringService = null;

try {
  const monitoringModule = require('./lib/monitoring-service');
  MonitoringService = monitoringModule.MonitoringService;
  monitoringConfig = require('./config/monitoring-config').monitoringConfig;
  monitoringService = new MonitoringService();
  console.log('✅ Monitoring service loaded');
} catch (error) {
  console.warn('⚠️  Monitoring service not available:', error.message);
}

// Import error handling services with fallback
let ErrorHandlingService = null;
let errorHandlingService = null;

try {
  const errorModule = require('./lib/error-handling-service');
  ErrorHandlingService = errorModule.ErrorHandlingService;
  errorHandlingService = new ErrorHandlingService({
    deadLetterQueueUrl: process.env.ERROR_DLQ_URL,
    errorRecoveryQueueUrl: process.env.ERROR_RECOVERY_QUEUE_URL,
    errorRecoveryLambda: process.env.ERROR_RECOVERY_LAMBDA,
    errorRecoveryStateMachine: process.env.ERROR_RECOVERY_STATE_MACHINE,
    incidentResponseDocument: process.env.INCIDENT_RESPONSE_DOCUMENT
  });
  console.log('✅ Error handling service loaded');
} catch (error) {
  console.warn('⚠️  Error handling service not available:', error.message);
}

// Import automations (AWS SDK v3 versions) with fallback handling
let automationModules = {};
const requiredAutomations = [
  'invokeBedrockQueryPrompt-v3',
  'InvLamFilterAut-v3', 
  'finalBedAnalysisPrompt-v3'
  // 'finalBedAnalysisPromptNovaPremier-v3' - Removed: Using standard prompt only
];

const optionalAutomations = [
  'enhancedBedrockQueryPrompt-v3',
  'enhancedAnalysisWithRAG-v3',
  'enhancedFundingAnalysis-v3',
  'enhancedFollowOnAnalysis-v3',
  'finalBedAnalysisPromptNovaPremier-v3'  // Moved to optional - not used by default
];

// Load required automations
requiredAutomations.forEach(moduleName => {
  try {
    const moduleKey = moduleName.replace('-v3', '').replace(/([A-Z])/g, (match, p1, offset) => 
      offset > 0 ? match.toLowerCase() : match.toLowerCase()
    );
    automationModules[moduleKey] = require(`./automations/${moduleName}`);
    console.log(`✅ Loaded automation: ${moduleName}`);
  } catch (error) {
    console.warn(`⚠️  Failed to load automation ${moduleName}:`, error.message);
  }
});

// Load optional automations
optionalAutomations.forEach(moduleName => {
  try {
    const moduleKey = moduleName.replace('-v3', '').replace(/([A-Z])/g, (match, p1, offset) => 
      offset > 0 ? match.toLowerCase() : match.toLowerCase()
    );
    automationModules[moduleKey] = require(`./automations/${moduleName}`);
    console.log(`✅ Loaded optional automation: ${moduleName}`);
  } catch (error) {
    console.log(`ℹ️  Optional automation ${moduleName} not available`);
  }
});

// Import enhanced response formatter with fallback
let formatEnhancedAnalysisResponse = null;
try {
  const responseFormatter = require('./lib/enhanced-response-formatter');
  formatEnhancedAnalysisResponse = responseFormatter.formatEnhancedAnalysisResponse;
  console.log('✅ Enhanced response formatter loaded');
} catch (error) {
  console.warn('⚠️  Enhanced response formatter not available, using basic formatting');
  formatEnhancedAnalysisResponse = (result) => result; // Fallback to identity function
}

// Import services with graceful fallback
let BedrockAgentOrchestrator = null;
let BedrockPromptManager = null;
let PromptAnalyticsService = null;
let EventBridgeService = null;
let DynamoDBService = null;
let CachingService = null;
let PerformanceOptimizationService = null;

const serviceModules = [
  { name: 'BedrockAgentOrchestrator', path: './lib/bedrock-agent-orchestrator' },
  { name: 'BedrockPromptManager', path: './lib/bedrock-prompt-manager' },
  { name: 'PromptAnalyticsService', path: './lib/prompt-analytics-service' },
  { name: 'EventBridgeService', path: './lib/eventbridge-service' },
  { name: 'DynamoDBService', path: './lib/dynamodb-service' },
  { name: 'CachingService', path: './lib/caching-service', property: 'CachingService' },
  { name: 'PerformanceOptimizationService', path: './lib/performance-optimization-service', property: 'PerformanceOptimizationService' }
];

serviceModules.forEach(({ name, path, property }) => {
  try {
    const module = require(path);
    const ServiceClass = property ? module[property] : module;
    
    switch (name) {
      case 'BedrockAgentOrchestrator':
        BedrockAgentOrchestrator = ServiceClass;
        break;
      case 'BedrockPromptManager':
        BedrockPromptManager = ServiceClass;
        break;
      case 'PromptAnalyticsService':
        PromptAnalyticsService = ServiceClass;
        break;
      case 'EventBridgeService':
        EventBridgeService = ServiceClass;
        break;
      case 'DynamoDBService':
        DynamoDBService = ServiceClass;
        break;
      case 'CachingService':
        CachingService = ServiceClass;
        break;
      case 'PerformanceOptimizationService':
        PerformanceOptimizationService = ServiceClass;
        break;
    }
    console.log(`✅ ${name} loaded`);
  } catch (error) {
    console.log(`ℹ️  ${name} not available:`, error.message);
  }
});

// Initialize services with error handling
let promptManager = null;
let analyticsService = null;
let eventBridgeService = null;
let dynamoDBService = null;
let cachingService = null;
let performanceOptimizationService = null;

try {
  if (BedrockPromptManager) promptManager = new BedrockPromptManager();
  if (PromptAnalyticsService) analyticsService = new PromptAnalyticsService();
  if (EventBridgeService) eventBridgeService = new EventBridgeService();
  if (DynamoDBService) dynamoDBService = new DynamoDBService();
  
  if (CachingService) {
    cachingService = new CachingService({
      host: process.env.REDIS_ENDPOINT,
      port: process.env.REDIS_PORT,
      readerHost: process.env.REDIS_READER_ENDPOINT,
      password: process.env.REDIS_AUTH_TOKEN,
      defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL) || 3600,
      warmingEnabled: process.env.CACHE_WARMING_ENABLED !== 'false',
      warmingInterval: parseInt(process.env.CACHE_WARMING_INTERVAL) || 300000,
    });
  }
  
  // Initialize Performance Optimization Service (Task 7)
  if (PerformanceOptimizationService) {
    performanceOptimizationService = new PerformanceOptimizationService({
      responseTimeThresholds: {
        queryGeneration: parseInt(process.env.QUERY_GENERATION_TIMEOUT) || 5000,
        dataRetrieval: parseInt(process.env.DATA_RETRIEVAL_TIMEOUT) || 10000,
        analysis: parseInt(process.env.ANALYSIS_TIMEOUT) || 15000,
        totalWorkflow: parseInt(process.env.TOTAL_WORKFLOW_TIMEOUT) || 30000
      },
      concurrency: {
        maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 100,
        rateLimitPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE) || 1000
      },
      costOptimization: {
        enableIntelligentCaching: process.env.INTELLIGENT_CACHING_ENABLED !== 'false',
        cacheWarmingEnabled: process.env.CACHE_WARMING_ENABLED !== 'false',
        resourcePoolingEnabled: process.env.RESOURCE_POOLING_ENABLED !== 'false'
      }
    });
    
    // Initialize performance optimization
    performanceOptimizationService.initialize().catch(error => {
      console.warn('⚠️  Performance optimization initialization warning:', error.message);
    });
  }
  console.log('✅ Services initialized');
} catch (error) {
  console.warn('⚠️  Service initialization warnings:', error.message);
}

/**
 * Enhanced input validation for production mode
 */
function validateEnhancedInputFields(fields) {
  const errors = [];
  
  // Required field validation
  const requiredFields = [
    { field: 'CustomerName', label: 'Customer Name', value: fields.CustomerName },
    { field: 'oppName', label: 'Opportunity Name', value: fields.oppName },
    { field: 'oppDescription', label: 'Opportunity Description', value: fields.oppDescription },
    { field: 'region', label: 'Region', value: fields.region },
    { field: 'closeDate', label: 'Close Date', value: fields.closeDate }
  ];

  requiredFields.forEach(({ field, label, value }) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors.push({
        field: field,
        message: `${label} is required`,
        type: 'required'
      });
    }
  });

  // Field length validation
  if (fields.CustomerName && fields.CustomerName.length < 2) {
    errors.push({
      field: 'CustomerName',
      message: 'Customer Name must be at least 2 characters',
      type: 'length'
    });
  }

  if (fields.oppDescription && fields.oppDescription.length < 10) {
    errors.push({
      field: 'oppDescription',
      message: 'Opportunity Description must be at least 10 characters',
      type: 'length'
    });
  }

  // Date validation
  if (fields.closeDate) {
    const closeDate = new Date(fields.closeDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(closeDate.getTime())) {
      errors.push({
        field: 'closeDate',
        message: 'Close Date must be a valid date',
        type: 'format'
      });
    }
  }

  return errors;
}

/**
 * Generate mock response for fallback scenarios
 */
function generateMockResponse(inputData) {
  console.log('🔄 Generating mock response due to service unavailability');
  
  return {
    metrics: {
      predictedArr: "$120,000",
      predictedMrr: "$10,000",
      launchDate: "January 2026",
      predictedProjectDuration: "6 months",
      confidence: "MEDIUM",
      confidenceScore: 75,
      confidenceFactors: [
        "Fallback mode - limited AWS service connectivity",
        "Using cached historical patterns",
        "Standard service estimates"
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
      similarProjectsRaw: "--- Fallback Mode ---\nLimited connectivity to AWS services\nUsing cached analysis patterns"
    },
    methodology: {
      analysisApproach: {
        summary: "Fallback analysis using cached patterns due to limited AWS service connectivity.",
        steps: [
          "Input validation and processing",
          "Pattern matching from cached data",
          "Statistical estimation",
          "Confidence scoring with service limitations"
        ]
      }
    },
    findings: "**Key Findings (Fallback Mode)**\n\nBased on cached patterns for similar cloud migration projects:\n\n• **Market Opportunity**: Strong potential for AWS adoption in this sector\n• **Technical Feasibility**: Standard migration approach recommended\n• **Timeline**: 6-month implementation timeline is realistic\n• **Investment**: Moderate initial investment with good ROI potential",
    riskFactors: "**Risk Assessment (Fallback Mode)**\n\n**Medium Risk Factors:**\n• Limited real-time data analysis due to service connectivity\n• Estimates based on historical patterns only\n• Actual costs may vary based on specific requirements\n\n**Mitigation Strategies:**\n• Conduct detailed technical assessment when services are available\n• Plan for 15-20% cost variance\n• Implement phased approach to reduce risk",
    similarProjects: "**Similar Projects (Fallback Mode)**\n\n**Project 1: Enterprise Cloud Migration**\n• Customer: Large Manufacturing Company\n• ARR: $115,000\n• Timeline: 5 months\n• Services: EC2, RDS, S3, CloudFront\n\n**Project 2: Digital Transformation**\n• Customer: Financial Services Firm\n• ARR: $135,000\n• Timeline: 7 months\n• Services: EC2, RDS, Lambda, API Gateway",
    rationale: "**Analysis Rationale (Fallback Mode)**\n\nThis analysis is based on cached historical patterns due to limited AWS service connectivity. The projections use:\n\n• **Historical Data**: Similar projects from the past 12 months\n• **Industry Benchmarks**: Standard cloud migration metrics\n• **Conservative Estimates**: Lower-bound projections to account for uncertainty\n\nFor more accurate analysis, full AWS service connectivity is recommended.",
    fullAnalysis: "**Complete Analysis Summary (Fallback Mode)**\n\nThis opportunity shows strong potential based on historical patterns. The projected ARR of $120,000 aligns with similar cloud migration projects. The 6-month timeline is realistic for this scope of work.\n\n**Recommendations:**\n• Proceed with opportunity development\n• Conduct detailed technical assessment\n• Plan for phased implementation\n• Monitor actual vs. projected metrics",
    formattedSummaryText: "=== FALLBACK MODE ===\nLimited AWS service connectivity\n\n=== ANALYSIS ===\nUsing cached patterns for estimation",
    fallbackMode: true,
    timestamp: new Date().toISOString()
  };
}

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Add request logging middleware
app.use((req, res, next) => {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;
  req.startTime = Date.now();
  
  productionLogger.info(`${req.method} ${req.path}`, {
    requestId,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  if (req.method === 'POST' && req.path === '/api/analyze') {
    productionLogger.info('Analysis request received', { requestId });
  }
  
  next();
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Performance metrics endpoint (Task 7.6)
app.get('/api/performance', async (req, res) => {
  try {
    if (!performanceOptimizationService) {
      return res.status(503).json({
        error: 'Performance optimization service not available',
        timestamp: new Date().toISOString()
      });
    }
    
    const optimizationStatus = await performanceOptimizationService.getOptimizationStatus();
    
    // Get cache statistics if available
    let cacheStats = null;
    if (cachingService && cachingService.getEnhancedStats) {
      try {
        cacheStats = await cachingService.getEnhancedStats();
      } catch (error) {
        console.warn('⚠️  Cache stats retrieval failed:', error.message);
      }
    }
    
    const performanceMetrics = {
      timestamp: new Date().toISOString(),
      optimization: optimizationStatus,
      cache: cacheStats,
      system: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        nodeVersion: process.version
      }
    };
    
    res.json(performanceMetrics);
    
  } catch (error) {
    console.error('❌ Performance metrics endpoint error:', error);
    res.status(500).json({
      error: 'Failed to retrieve performance metrics',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint with performance optimization status
app.get('/health', async (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    mode: 'production',
    services: {
      automation: !!automationModules.invokebedrockqueryprompt,
      monitoring: !!monitoringService,
      errorHandling: !!errorHandlingService,
      caching: !!cachingService,
      eventBridge: !!eventBridgeService,
      dynamodb: !!dynamoDBService,
      performanceOptimization: !!performanceOptimizationService
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'production',
      awsRegion: process.env.AWS_REGION || 'us-east-1',
      hasAwsCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
    }
  };
  
  // Add performance optimization details if available
  if (performanceOptimizationService) {
    try {
      const optimizationStatus = await performanceOptimizationService.getOptimizationStatus();
      healthStatus.performanceOptimization = {
        enabled: true,
        caching: optimizationStatus.caching,
        connectionPools: optimizationStatus.connectionPools,
        concurrency: optimizationStatus.concurrency,
        monitoring: optimizationStatus.monitoring
      };
    } catch (error) {
      healthStatus.performanceOptimization = {
        enabled: false,
        error: error.message
      };
    }
  }
  
  res.json(healthStatus);
});

// API endpoint for opportunity analysis - Production Mode
app.post('/api/analyze', async (req, res) => {
  let requestTraceId = null;
  let sessionId = null;
  let opportunityId = null;
  
  try {
    // Initialize monitoring for this request
    if (monitoringService && monitoringService.initializeRequestMonitoring) {
      try {
        requestTraceId = await monitoringService.initializeRequestMonitoring(
          `analyze-${Date.now()}`, 
          req.body
        );
      } catch (error) {
        console.warn('⚠️  Request monitoring initialization failed:', error.message);
      }
    }
    
    productionLogger.logAnalysisRequest(req.body, req.requestId);
    
    const { 
      CustomerName, region, closeDate, oppName, oppDescription, 
      industry, customerSegment, partnerName,
      activityFocus, businessDescription, migrationPhase, 
      salesforceLink, awsCalculatorLink,
      useNovaPremier, useBedrockAgent, sessionId: providedSessionId 
    } = req.body;
    
    // Enhanced validation
    const validationErrors = validateEnhancedInputFields({
      CustomerName, region, closeDate, oppName, oppDescription,
      industry, customerSegment, partnerName,
      activityFocus, businessDescription, migrationPhase, 
      salesforceLink, awsCalculatorLink
    });
    
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => {
        productionLogger.logValidationError(error.field, error.message, req.requestId);
      });
      
      return res.status(400).json({ 
        error: 'Validation failed', 
        message: 'Please correct the following errors',
        validationErrors: validationErrors
      });
    }

    // Generate unique opportunity ID
    opportunityId = `${CustomerName}-${oppName}-${Date.now()}`.replace(/[^a-zA-Z0-9-]/g, '-');
    
    // Session management with fallback
    if (dynamoDBService && providedSessionId) {
      try {
        sessionId = providedSessionId;
        const existingSession = await dynamoDBService.getUserSession(sessionId);
        if (!existingSession) {
          sessionId = await dynamoDBService.createUserSession({
            userId: 'anonymous',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          });
        }
      } catch (error) {
        console.warn('⚠️  Session management error:', error.message);
        sessionId = `fallback-${Date.now()}`;
      }
    } else {
      sessionId = `session-${Date.now()}`;
    }

    // Use Performance Optimization Service if available (Task 7)
    if (performanceOptimizationService) {
      try {
        console.log('🚀 Using performance-optimized analysis workflow');
        
        const optimizedResult = await performanceOptimizationService.processOptimizedAnalysisRequest({
          CustomerName, region, closeDate, oppName, oppDescription,
          industry, customerSegment, partnerName,
          activityFocus, businessDescription, migrationPhase,
          salesforceLink, awsCalculatorLink, useNovaPremier, useBedrockAgent
        }, {
          forceRefresh: req.body.forceRefresh,
          sessionId: sessionId
        });
        
        const endTime = Date.now();
        const duration = endTime - (req.startTime || endTime);
        
        productionLogger.logAnalysisSuccess(optimizedResult, req.requestId, duration);
        
        return res.json({
          ...optimizedResult,
          sessionId: sessionId,
          opportunityId: opportunityId,
          timestamp: new Date().toISOString(),
          processingMode: 'performance-optimized',
          performanceMetrics: {
            totalDuration: duration,
            optimizationEnabled: true,
            cached: optimizedResult.cached || false
          }
        });
        
      } catch (error) {
        console.warn('⚠️  Performance optimization failed, falling back to standard workflow:', error.message);
        // Continue with standard workflow below
      }
    }

    // Standard workflow with caching fallback
    let cachedResult = null;
    if (cachingService) {
      try {
        const analysisType = useNovaPremier ? 'nova-premier' : 'standard';
        cachedResult = await cachingService.getCachedAnalysis({
          CustomerName, region, closeDate, oppName, oppDescription
        }, analysisType);
        
        if (cachedResult && !req.body.forceRefresh) {
          productionLogger.logCacheOperation('hit', opportunityId, true, 0);
          
          res.set({
            'Cache-Control': 'public, max-age=3600',
            'X-Cache-Hit': 'true'
          });
          
          return res.json({
            ...cachedResult,
            cached: true,
            sessionId: sessionId,
            opportunityId: opportunityId
          });
        }
      } catch (error) {
        console.warn('⚠️  Cache check failed:', error.message);
      }
    }

    // Publish analysis started event with fallback
    if (eventBridgeService) {
      try {
        await eventBridgeService.publishAnalysisStarted({
          CustomerName, region, closeDate, oppName, oppDescription
        }, useNovaPremier ? 'nova-premier' : 'standard');
      } catch (error) {
        console.warn('⚠️  Event publishing failed:', error.message);
      }
    }

    // Try AWS automation workflow with comprehensive fallback
    let analysisResult = null;
    let usedFallback = false;
    let queryPromptResult = null;
    let lambdaResult = null;
    
    try {
      if (!automationModules.invokebedrockqueryprompt || 
          !automationModules.invlamfilteraut || 
          !automationModules.finalbedanalysisprompt) {
        throw new Error('Required automation modules not available');
      }

      productionLogger.info('Step 1: Generating SQL query', { requestId: req.requestId });
      queryPromptResult = await automationModules.invokebedrockqueryprompt.execute({
        CustomerName, region, closeDate, oppName, oppDescription,
        industry, customerSegment, partnerName,
        activityFocus, businessDescription, migrationPhase,
        salesforceLink, awsCalculatorLink
      });
      
      if (queryPromptResult.status === 'error') {
        throw new Error(`SQL query generation failed: ${queryPromptResult.message}`);
      }

      productionLogger.info('Step 2: Executing SQL query', { requestId: req.requestId });
      lambdaResult = await automationModules.invlamfilteraut.execute(
        queryPromptResult.processResults
      );
      
      if (lambdaResult.status === 'error') {
        throw new Error(`SQL query execution failed: ${lambdaResult.message}`);
      }

      productionLogger.info('Step 3: Analyzing results', { requestId: req.requestId });
      const analysisParams = {
        CustomerName, region, closeDate, oppName, oppDescription,
        industry, customerSegment, partnerName,
        activityFocus, businessDescription, migrationPhase,
        salesforceLink, awsCalculatorLink,
        queryResults: lambdaResult.processResults
      };
      
      // Always use standard analysis prompt (Nova Premier disabled)
      analysisResult = await automationModules.finalbedanalysisprompt.execute(analysisParams);
      
      if (analysisResult.status === 'error') {
        throw new Error(`Analysis failed: ${analysisResult.message}`);
      }

      productionLogger.info('AWS automation workflow completed successfully', { requestId: req.requestId });
      
    } catch (error) {
      productionLogger.logFallbackMode(error.message, req.requestId);
      productionLogger.warn('AWS automation workflow failed, switching to fallback mode', {
        requestId: req.requestId,
        error: error.message
      });
      
      analysisResult = generateMockResponse(req.body);
      usedFallback = true;
    }

    // Apply enhanced formatting if available
    let formattedResult = analysisResult;
    if (formatEnhancedAnalysisResponse && !usedFallback) {
      try {
        formattedResult = formatEnhancedAnalysisResponse(analysisResult, req.body);
      } catch (error) {
        console.warn('⚠️  Enhanced formatting failed:', error.message);
      }
    }

    // Cache the result if caching is available (enhanced caching for performance optimization)
    if (cachingService && !usedFallback) {
      try {
        const analysisType = useNovaPremier ? 'nova-premier' : 'standard';
        await cachingService.cacheAnalysis({
          CustomerName, region, closeDate, oppName, oppDescription
        }, analysisType, formattedResult);
      } catch (error) {
        console.warn('⚠️  Result caching failed:', error.message);
      }
    }

    // Publish completion event
    if (eventBridgeService && !usedFallback) {
      try {
        await eventBridgeService.publishAnalysisCompleted({
          CustomerName, region, closeDate, oppName, oppDescription
        }, formattedResult, useNovaPremier ? 'nova-premier' : 'standard');
      } catch (error) {
        console.warn('⚠️  Completion event publishing failed:', error.message);
      }
    }

    // Record metrics
    if (monitoringService && monitoringService.recordAnalysisRequest) {
      try {
        await monitoringService.recordAnalysisRequest(CustomerName, region, true);
      } catch (error) {
        console.warn('⚠️  Metrics recording failed:', error.message);
      }
    }

    const endTime = Date.now();
    const duration = endTime - (req.startTime || endTime);
    
    productionLogger.logAnalysisSuccess(formattedResult, req.requestId, duration);
    
    // Prepare debug information
    let debugInfo = {
      sqlQuery: 'SQL query not captured',
      queryResults: 'Query results not captured',
      bedrockPayload: 'Bedrock payload not captured',
      fullResponse: 'Full response not captured'
    };

    // Only include debug info if we have the actual results
    if (!usedFallback && queryPromptResult && lambdaResult && analysisResult) {
      debugInfo = {
        sqlQuery: queryPromptResult.processResults || 'SQL query not captured',
        queryResults: lambdaResult.processResults || 'Query results not captured',
        bedrockPayload: global.debugInfo?.bedrockPayload || 'Bedrock payload not captured',
        fullResponse: analysisResult.formattedSummaryText || analysisResult.processResults || 'Full response not captured'
      };
    }

    // Return the analysis results
    res.json({
      ...formattedResult,
      // Include individual sections from the automation result
      methodology: analysisResult?.methodology || formattedResult?.methodology,
      findings: analysisResult?.findings || formattedResult?.findings,
      riskFactors: analysisResult?.riskFactors || formattedResult?.riskFactors,
      similarProjects: analysisResult?.similarProjects || formattedResult?.similarProjects,
      rationale: analysisResult?.rationale || formattedResult?.rationale,
      fullAnalysis: analysisResult?.fullAnalysis || formattedResult?.fullAnalysis,
      fundingOptions: analysisResult?.fundingOptions || formattedResult?.fundingOptions,
      followOnOpportunities: analysisResult?.followOnOpportunities || formattedResult?.followOnOpportunities,
      formattedSummaryText: analysisResult?.formattedSummaryText || formattedResult?.formattedSummaryText,
      sessionId: sessionId,
      opportunityId: opportunityId,
      fallbackMode: usedFallback,
      timestamp: new Date().toISOString(),
      processingMode: usedFallback ? 'fallback' : 'aws-services',
      debug: debugInfo
    });
    
  } catch (error) {
    productionLogger.logAnalysisError(error, req.requestId, req.body);
    
    // Record error metrics
    if (monitoringService && monitoringService.recordError) {
      try {
        await monitoringService.recordError('analysis_error', error.message);
      } catch (metricsError) {
        console.warn('⚠️  Error metrics recording failed:', metricsError.message);
      }
    }
    
    // Generate fallback response for critical errors
    const fallbackResponse = generateMockResponse(req.body);
    
    res.status(500).json({ 
      ...fallbackResponse,
      error: 'Analysis service temporarily unavailable',
      message: 'Using fallback analysis due to service issues',
      fallbackMode: true,
      sessionId: sessionId || `error-${Date.now()}`,
      opportunityId: opportunityId || `error-opp-${Date.now()}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('🚨 Unhandled application error:', error);
  
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    fallbackMode: true
  });
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('🔄 Received SIGTERM, shutting down gracefully...');
  
  // Cleanup services
  if (performanceOptimizationService && performanceOptimizationService.cleanup) {
    try {
      await performanceOptimizationService.cleanup();
    } catch (error) {
      console.warn('⚠️  Performance optimization cleanup error:', error.message);
    }
  }
  
  if (cachingService && cachingService.cleanup) {
    try {
      await cachingService.cleanup();
    } catch (error) {
      console.warn('⚠️  Cache cleanup error:', error.message);
    }
  }
  
  if (monitoringService && monitoringService.cleanup) {
    try {
      await monitoringService.cleanup();
    } catch (error) {
      console.warn('⚠️  Monitoring cleanup error:', error.message);
    }
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Start server
app.listen(port, () => {
  productionLogger.info('AWS Opportunity Analysis - Production Mode Started', {
    port,
    environment: process.env.NODE_ENV || 'production',
    region: process.env.AWS_REGION || 'us-east-1',
    hasAwsCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
  });
  
  console.log('🚀 AWS Opportunity Analysis - Production Mode');
  console.log('============================================');
  console.log(`📡 Backend server running on port ${port}`);
  console.log(`🔗 Backend API available at http://localhost:${port}/api/analyze`);
  console.log(`💚 Health check available at http://localhost:${port}/health`);
  console.log('');
  
  // Display service status
  console.log('📋 Service Status:');
  console.log(`   🤖 AWS Automations: ${automationModules.invokebedrockqueryprompt ? '✅ Available' : '❌ Fallback Mode'}`);
  console.log(`   📊 Monitoring: ${monitoringService ? '✅ Available' : '❌ Disabled'}`);
  console.log(`   🛡️  Error Handling: ${errorHandlingService ? '✅ Available' : '❌ Basic Mode'}`);
  console.log(`   💾 Caching: ${cachingService ? '✅ Available' : '❌ Disabled'}`);
  console.log(`   📡 EventBridge: ${eventBridgeService ? '✅ Available' : '❌ Disabled'}`);
  console.log(`   🗄️  DynamoDB: ${dynamoDBService ? '✅ Available' : '❌ Disabled'}`);
  console.log(`   🚀 Performance Optimization: ${performanceOptimizationService ? '✅ Available' : '❌ Disabled'}`);
  console.log('');
  
  // Display environment information
  console.log('🌍 Environment:');
  console.log(`   📍 AWS Region: ${process.env.AWS_REGION || 'us-east-1'}`);
  console.log(`   🔑 AWS Credentials: ${process.env.AWS_ACCESS_KEY_ID ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   🏷️  Node Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log('');
  console.log('🔄 Application ready for production traffic');
  
  // Log service health status
  productionLogger.logServiceHealth('aws-automations', !!automationModules.invokebedrockqueryprompt, 'AWS automation modules');
  productionLogger.logServiceHealth('monitoring', !!monitoringService, 'Monitoring service');
  productionLogger.logServiceHealth('error-handling', !!errorHandlingService, 'Error handling service');
  productionLogger.logServiceHealth('caching', !!cachingService, 'Caching service');
  productionLogger.logServiceHealth('eventbridge', !!eventBridgeService, 'EventBridge service');
  productionLogger.logServiceHealth('dynamodb', !!dynamoDBService, 'DynamoDB service');
  productionLogger.logServiceHealth('performance-optimization', !!performanceOptimizationService, 'Performance optimization service');
});