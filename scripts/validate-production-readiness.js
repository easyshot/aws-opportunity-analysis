#!/usr/bin/env node

/**
 * Production Readiness Validation Script
 * 
 * This script validates that the application is ready to switch from debug mode
 * to production mode by checking:
 * - Environment variables configuration
 * - AWS service connectivity
 * - Required infrastructure components
 * - API endpoint compatibility
 */

const fs = require('fs').promises;
const path = require('path');

class ProductionReadinessValidator {
  constructor() {
    this.results = {
      environment: { passed: 0, failed: 0, tests: [] },
      connectivity: { passed: 0, failed: 0, tests: [] },
      infrastructure: { passed: 0, failed: 0, tests: [] },
      compatibility: { passed: 0, failed: 0, tests: [] }
    };
  }

  async validateAll() {
    console.log('🔍 Production Readiness Validation');
    console.log('==================================\n');

    try {
      await this.validateEnvironmentVariables();
      await this.validateAWSConnectivity();
      await this.validateInfrastructure();
      await this.validateAPICompatibility();
      
      this.displayResults();
      return this.isReadyForProduction();
      
    } catch (error) {
      console.error('❌ Fatal error during validation:', error.message);
      return false;
    }
  }

  async validateEnvironmentVariables() {
    console.log('📋 Validating Environment Variables...');
    console.log('─'.repeat(40));

    const requiredVars = [
      { name: 'AWS_REGION', description: 'AWS Region' },
      { name: 'AWS_ACCESS_KEY_ID', description: 'AWS Access Key ID' },
      { name: 'AWS_SECRET_ACCESS_KEY', description: 'AWS Secret Access Key' },
      { name: 'CATAPULT_QUERY_PROMPT_ID', description: 'Bedrock Query Prompt ID' },
      { name: 'CATAPULT_ANALYSIS_PROMPT_ID', description: 'Bedrock Analysis Prompt ID' },
      { name: 'CATAPULT_GET_DATASET_LAMBDA', description: 'Lambda Function Name' },
      { name: 'ATHENA_DATABASE', description: 'Athena Database' },
      { name: 'ATHENA_OUTPUT_LOCATION', description: 'Athena S3 Output Location' }
    ];

    const optionalVars = [
      { name: 'CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID', description: 'Nova Premier Prompt ID' },
      { name: 'REDIS_ENDPOINT', description: 'Redis Cache Endpoint' },
      { name: 'DYNAMODB_ANALYSIS_RESULTS_TABLE', description: 'DynamoDB Results Table' },
      { name: 'EVENTBRIDGE_BUS_NAME', description: 'EventBridge Bus Name' }
    ];

    // Check required variables
    for (const variable of requiredVars) {
      const value = process.env[variable.name];
      const test = {
        name: `Required: ${variable.description}`,
        variable: variable.name,
        passed: !!value && value.trim() !== '',
        message: value ? '✅ Configured' : '❌ Missing or empty'
      };
      
      this.results.environment.tests.push(test);
      if (test.passed) {
        this.results.environment.passed++;
      } else {
        this.results.environment.failed++;
      }
      
      console.log(`  ${test.message} - ${variable.name}`);
    }

    console.log('');
    console.log('Optional Variables:');
    
    // Check optional variables
    for (const variable of optionalVars) {
      const value = process.env[variable.name];
      const test = {
        name: `Optional: ${variable.description}`,
        variable: variable.name,
        passed: true, // Optional variables don't fail the test
        message: value ? '✅ Configured' : 'ℹ️  Not configured (optional)'
      };
      
      this.results.environment.tests.push(test);
      this.results.environment.passed++;
      
      console.log(`  ${test.message} - ${variable.name}`);
    }

    console.log('');
  }

  async validateAWSConnectivity() {
    console.log('🔗 Validating AWS Service Connectivity...');
    console.log('─'.repeat(40));

    const connectivityTests = [
      { name: 'AWS Credentials', test: this.testAWSCredentials.bind(this) },
      { name: 'Bedrock Service', test: this.testBedrockService.bind(this) },
      { name: 'Lambda Service', test: this.testLambdaService.bind(this) },
      { name: 'Athena Service', test: this.testAthenaService.bind(this) }
    ];

    for (const { name, test } of connectivityTests) {
      try {
        const result = await test();
        const testResult = {
          name: name,
          passed: result.success,
          message: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
          details: result.details
        };
        
        this.results.connectivity.tests.push(testResult);
        if (testResult.passed) {
          this.results.connectivity.passed++;
        } else {
          this.results.connectivity.failed++;
        }
        
        console.log(`  ${testResult.message}`);
        if (result.details) {
          console.log(`    Details: ${result.details}`);
        }
        
      } catch (error) {
        const testResult = {
          name: name,
          passed: false,
          message: `❌ Test failed: ${error.message}`,
          error: error.message
        };
        
        this.results.connectivity.tests.push(testResult);
        this.results.connectivity.failed++;
        console.log(`  ${testResult.message}`);
      }
    }

    console.log('');
  }

  async validateInfrastructure() {
    console.log('🏗️  Validating Infrastructure Components...');
    console.log('─'.repeat(40));

    const infrastructureTests = [
      { name: 'Lambda Function Exists', test: this.testLambdaFunctionExists.bind(this) },
      { name: 'Athena Database Access', test: this.testAthenaDatabaseAccess.bind(this) },
      { name: 'S3 Output Location Access', test: this.testS3OutputLocation.bind(this) },
      { name: 'Bedrock Prompt Access', test: this.testBedrockPromptAccess.bind(this) }
    ];

    for (const { name, test } of infrastructureTests) {
      try {
        const result = await test();
        const testResult = {
          name: name,
          passed: result.success,
          message: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
          details: result.details
        };
        
        this.results.infrastructure.tests.push(testResult);
        if (testResult.passed) {
          this.results.infrastructure.passed++;
        } else {
          this.results.infrastructure.failed++;
        }
        
        console.log(`  ${testResult.message}`);
        if (result.details) {
          console.log(`    Details: ${result.details}`);
        }
        
      } catch (error) {
        const testResult = {
          name: name,
          passed: false,
          message: `❌ Test failed: ${error.message}`,
          error: error.message
        };
        
        this.results.infrastructure.tests.push(testResult);
        this.results.infrastructure.failed++;
        console.log(`  ${testResult.message}`);
      }
    }

    console.log('');
  }

  async validateAPICompatibility() {
    console.log('🔌 Validating API Compatibility...');
    console.log('─'.repeat(40));

    const compatibilityTests = [
      { name: 'Production App.js Syntax', test: this.testAppJsSyntax.bind(this) },
      { name: 'Required Modules Available', test: this.testRequiredModules.bind(this) },
      { name: 'API Endpoint Structure', test: this.testAPIEndpointStructure.bind(this) },
      { name: 'Frontend Compatibility', test: this.testFrontendCompatibility.bind(this) }
    ];

    for (const { name, test } of compatibilityTests) {
      try {
        const result = await test();
        const testResult = {
          name: name,
          passed: result.success,
          message: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
          details: result.details
        };
        
        this.results.compatibility.tests.push(testResult);
        if (testResult.passed) {
          this.results.compatibility.passed++;
        } else {
          this.results.compatibility.failed++;
        }
        
        console.log(`  ${testResult.message}`);
        if (result.details) {
          console.log(`    Details: ${result.details}`);
        }
        
      } catch (error) {
        const testResult = {
          name: name,
          passed: false,
          message: `❌ Test failed: ${error.message}`,
          error: error.message
        };
        
        this.results.compatibility.tests.push(testResult);
        this.results.compatibility.failed++;
        console.log(`  ${testResult.message}`);
      }
    }

    console.log('');
  }

  // Individual test methods
  async testAWSCredentials() {
    try {
      const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
      const sts = new STSClient({ 
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
      
      const result = await sts.send(new GetCallerIdentityCommand({}));
      return {
        success: true,
        message: 'AWS credentials valid',
        details: `Account: ${result.Account}, User: ${result.Arn?.split('/').pop() || 'Unknown'}`
      };
    } catch (error) {
      return {
        success: false,
        message: 'AWS credentials invalid or insufficient permissions',
        details: error.message
      };
    }
  }

  async testBedrockService() {
    try {
      const { BedrockClient, ListFoundationModelsCommand } = require('@aws-sdk/client-bedrock');
      const bedrock = new BedrockClient({ 
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
      
      const result = await bedrock.send(new ListFoundationModelsCommand({}));
      return {
        success: true,
        message: 'Bedrock service accessible',
        details: `Found ${result.modelSummaries?.length || 0} available models`
      };
    } catch (error) {
      return {
        success: false,
        message: 'Bedrock service not accessible',
        details: error.message
      };
    }
  }

  async testLambdaService() {
    try {
      const { LambdaClient, ListFunctionsCommand } = require('@aws-sdk/client-lambda');
      const lambda = new LambdaClient({ 
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
      
      await lambda.send(new ListFunctionsCommand({ MaxItems: 1 }));
      return {
        success: true,
        message: 'Lambda service accessible',
        details: 'Service permissions verified'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Lambda service not accessible',
        details: error.message
      };
    }
  }

  async testAthenaService() {
    try {
      const { AthenaClient, ListWorkGroupsCommand } = require('@aws-sdk/client-athena');
      const athena = new AthenaClient({ 
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
      
      await athena.send(new ListWorkGroupsCommand({ MaxResults: 1 }));
      return {
        success: true,
        message: 'Athena service accessible',
        details: 'Service permissions verified'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Athena service not accessible',
        details: error.message
      };
    }
  }

  async testLambdaFunctionExists() {
    try {
      const { LambdaClient, GetFunctionCommand } = require('@aws-sdk/client-lambda');
      const lambda = new LambdaClient({ 
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
      
      const functionName = process.env.CATAPULT_GET_DATASET_LAMBDA;
      if (!functionName) {
        return {
          success: false,
          message: 'Lambda function name not configured',
          details: 'CATAPULT_GET_DATASET_LAMBDA environment variable missing'
        };
      }
      
      const result = await lambda.send(new GetFunctionCommand({ FunctionName: functionName }));
      return {
        success: true,
        message: 'Lambda function exists and accessible',
        details: `Function: ${result.Configuration?.FunctionName}, Runtime: ${result.Configuration?.Runtime}`
      };
    } catch (error) {
      if (error.name === 'ResourceNotFoundException') {
        return {
          success: false,
          message: 'Lambda function not found',
          details: `Function '${process.env.CATAPULT_GET_DATASET_LAMBDA}' does not exist`
        };
      }
      return {
        success: false,
        message: 'Lambda function check failed',
        details: error.message
      };
    }
  }

  async testAthenaDatabaseAccess() {
    try {
      const { AthenaClient, ListDatabasesCommand } = require('@aws-sdk/client-athena');
      const athena = new AthenaClient({ 
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
      
      const databaseName = process.env.ATHENA_DATABASE;
      if (!databaseName) {
        return {
          success: false,
          message: 'Athena database not configured',
          details: 'ATHENA_DATABASE environment variable missing'
        };
      }
      
      const result = await athena.send(new ListDatabasesCommand({ CatalogName: 'AwsDataCatalog' }));
      const databases = result.DatabaseList?.map(db => db.Name) || [];
      
      if (databases.includes(databaseName)) {
        return {
          success: true,
          message: 'Athena database accessible',
          details: `Database '${databaseName}' found`
        };
      } else {
        return {
          success: false,
          message: 'Athena database not found',
          details: `Database '${databaseName}' not in available databases: ${databases.join(', ')}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Athena database check failed',
        details: error.message
      };
    }
  }

  async testS3OutputLocation() {
    try {
      const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
      const s3 = new S3Client({ 
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
      
      const outputLocation = process.env.ATHENA_OUTPUT_LOCATION;
      if (!outputLocation) {
        return {
          success: false,
          message: 'S3 output location not configured',
          details: 'ATHENA_OUTPUT_LOCATION environment variable missing'
        };
      }
      
      // Extract bucket name from S3 URL
      const bucketMatch = outputLocation.match(/s3:\/\/([^\/]+)/);
      if (!bucketMatch) {
        return {
          success: false,
          message: 'Invalid S3 output location format',
          details: `Expected s3://bucket-name/path format, got: ${outputLocation}`
        };
      }
      
      const bucketName = bucketMatch[1];
      await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
      
      return {
        success: true,
        message: 'S3 output location accessible',
        details: `Bucket '${bucketName}' accessible`
      };
    } catch (error) {
      return {
        success: false,
        message: 'S3 output location not accessible',
        details: error.message
      };
    }
  }

  async testBedrockPromptAccess() {
    try {
      const { BedrockAgentClient, GetPromptCommand } = require('@aws-sdk/client-bedrock-agent');
      const bedrockAgent = new BedrockAgentClient({ 
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
      
      const queryPromptId = process.env.CATAPULT_QUERY_PROMPT_ID;
      if (!queryPromptId) {
        return {
          success: false,
          message: 'Bedrock prompt ID not configured',
          details: 'CATAPULT_QUERY_PROMPT_ID environment variable missing'
        };
      }
      
      const result = await bedrockAgent.send(new GetPromptCommand({ promptIdentifier: queryPromptId }));
      return {
        success: true,
        message: 'Bedrock prompt accessible',
        details: `Prompt '${result.name}' (${result.id}) accessible`
      };
    } catch (error) {
      return {
        success: false,
        message: 'Bedrock prompt not accessible',
        details: error.message
      };
    }
  }

  async testAppJsSyntax() {
    try {
      const appJsPath = path.join(process.cwd(), 'app.js');
      const appJsContent = await fs.readFile(appJsPath, 'utf8');
      
      // Basic syntax checks
      if (appJsContent.length < 1000) {
        return {
          success: false,
          message: 'app.js appears to be incomplete',
          details: `File size: ${appJsContent.length} characters (expected > 1000)`
        };
      }
      
      if (!appJsContent.includes('app.post(\'/api/analyze\'')) {
        return {
          success: false,
          message: 'app.js missing required API endpoint',
          details: 'Missing /api/analyze endpoint definition'
        };
      }
      
      if (!appJsContent.includes('app.listen(')) {
        return {
          success: false,
          message: 'app.js missing server startup code',
          details: 'Missing app.listen() call'
        };
      }
      
      return {
        success: true,
        message: 'app.js syntax appears valid',
        details: `File size: ${appJsContent.length} characters`
      };
    } catch (error) {
      return {
        success: false,
        message: 'app.js file not readable',
        details: error.message
      };
    }
  }

  async testRequiredModules() {
    const requiredModules = [
      'express',
      'body-parser',
      '@aws-sdk/client-bedrock-runtime',
      '@aws-sdk/client-lambda',
      '@aws-sdk/client-athena'
    ];
    
    const missingModules = [];
    
    for (const moduleName of requiredModules) {
      try {
        require.resolve(moduleName);
      } catch (error) {
        missingModules.push(moduleName);
      }
    }
    
    if (missingModules.length > 0) {
      return {
        success: false,
        message: 'Required modules missing',
        details: `Missing modules: ${missingModules.join(', ')}`
      };
    }
    
    return {
      success: true,
      message: 'All required modules available',
      details: `Checked ${requiredModules.length} modules`
    };
  }

  async testAPIEndpointStructure() {
    try {
      const appJsPath = path.join(process.cwd(), 'app.js');
      const appJsContent = await fs.readFile(appJsPath, 'utf8');
      
      // Check for required endpoint patterns
      const requiredPatterns = [
        { pattern: /app\.post\(['"]\/api\/analyze['"]/, name: 'POST /api/analyze endpoint' },
        { pattern: /app\.get\(['"]\/health['"]/, name: 'GET /health endpoint' },
        { pattern: /res\.json\(/, name: 'JSON response handling' },
        { pattern: /validateEnhancedInputFields/, name: 'Input validation function' }
      ];
      
      const missingPatterns = [];
      
      for (const { pattern, name } of requiredPatterns) {
        if (!pattern.test(appJsContent)) {
          missingPatterns.push(name);
        }
      }
      
      if (missingPatterns.length > 0) {
        return {
          success: false,
          message: 'API endpoint structure incomplete',
          details: `Missing: ${missingPatterns.join(', ')}`
        };
      }
      
      return {
        success: true,
        message: 'API endpoint structure valid',
        details: `All ${requiredPatterns.length} required patterns found`
      };
    } catch (error) {
      return {
        success: false,
        message: 'API endpoint structure check failed',
        details: error.message
      };
    }
  }

  async testFrontendCompatibility() {
    try {
      const frontendPath = path.join(process.cwd(), 'public', 'index-compact.html');
      const frontendContent = await fs.readFile(frontendPath, 'utf8');
      
      // Check for required frontend patterns
      const requiredPatterns = [
        { pattern: /\/api\/analyze/, name: 'API endpoint reference' },
        { pattern: /fetch\(/, name: 'Fetch API usage' },
        { pattern: /CustomerName/, name: 'Customer name field' },
        { pattern: /oppDescription/, name: 'Opportunity description field' }
      ];
      
      const missingPatterns = [];
      
      for (const { pattern, name } of requiredPatterns) {
        if (!pattern.test(frontendContent)) {
          missingPatterns.push(name);
        }
      }
      
      if (missingPatterns.length > 0) {
        return {
          success: false,
          message: 'Frontend compatibility issues',
          details: `Missing: ${missingPatterns.join(', ')}`
        };
      }
      
      return {
        success: true,
        message: 'Frontend compatibility verified',
        details: `All ${requiredPatterns.length} required patterns found`
      };
    } catch (error) {
      return {
        success: false,
        message: 'Frontend compatibility check failed',
        details: error.message
      };
    }
  }

  displayResults() {
    console.log('📊 VALIDATION RESULTS');
    console.log('====================\n');

    const categories = [
      { name: 'Environment Variables', key: 'environment', icon: '📋' },
      { name: 'AWS Connectivity', key: 'connectivity', icon: '🔗' },
      { name: 'Infrastructure', key: 'infrastructure', icon: '🏗️' },
      { name: 'API Compatibility', key: 'compatibility', icon: '🔌' }
    ];

    let totalPassed = 0;
    let totalFailed = 0;

    categories.forEach(({ name, key, icon }) => {
      const result = this.results[key];
      totalPassed += result.passed;
      totalFailed += result.failed;
      
      console.log(`${icon} ${name}:`);
      console.log(`   ✅ Passed: ${result.passed}`);
      console.log(`   ❌ Failed: ${result.failed}`);
      console.log('');
    });

    console.log('📈 OVERALL SUMMARY');
    console.log('─'.repeat(20));
    console.log(`Total Tests: ${totalPassed + totalFailed}`);
    console.log(`✅ Passed: ${totalPassed}`);
    console.log(`❌ Failed: ${totalFailed}`);
    console.log(`📊 Success Rate: ${Math.round((totalPassed / (totalPassed + totalFailed)) * 100)}%`);
    console.log('');

    if (this.isReadyForProduction()) {
      console.log('🎉 READY FOR PRODUCTION');
      console.log('Application is ready to switch from debug mode to production mode!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Run: npm start (uses production app.js)');
      console.log('2. Test: http://localhost:8123/health');
      console.log('3. Verify: http://localhost:3123/index-compact.html');
    } else {
      console.log('⚠️  NOT READY FOR PRODUCTION');
      console.log('Please resolve the failed tests before switching to production mode.');
      console.log('');
      console.log('Failed tests:');
      
      categories.forEach(({ name, key }) => {
        const failedTests = this.results[key].tests.filter(test => !test.passed);
        if (failedTests.length > 0) {
          console.log(`\n${name}:`);
          failedTests.forEach(test => {
            console.log(`  - ${test.name}: ${test.message}`);
            if (test.details) {
              console.log(`    Details: ${test.details}`);
            }
          });
        }
      });
    }
  }

  isReadyForProduction() {
    // Must pass all critical tests
    const criticalFailures = this.results.environment.failed + 
                           this.results.connectivity.failed + 
                           this.results.infrastructure.failed;
    
    // Allow some compatibility issues but not critical ones
    return criticalFailures === 0;
  }

  async saveReport() {
    try {
      const reportPath = path.join(process.cwd(), 'reports', 'production-readiness-report.json');
      
      // Ensure reports directory exists
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      
      const report = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        region: process.env.AWS_REGION || 'us-east-1',
        readyForProduction: this.isReadyForProduction(),
        results: this.results,
        summary: {
          totalTests: Object.values(this.results).reduce((sum, cat) => sum + cat.passed + cat.failed, 0),
          totalPassed: Object.values(this.results).reduce((sum, cat) => sum + cat.passed, 0),
          totalFailed: Object.values(this.results).reduce((sum, cat) => sum + cat.failed, 0)
        }
      };
      
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Detailed report saved to: ${reportPath}`);
      
    } catch (error) {
      console.warn(`⚠️  Failed to save report: ${error.message}`);
    }
  }
}

async function main() {
  const validator = new ProductionReadinessValidator();
  
  try {
    const isReady = await validator.validateAll();
    await validator.saveReport();
    
    process.exit(isReady ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Fatal error during validation:', error.message);
    process.exit(1);
  }
}

// Handle process signals gracefully
process.on('SIGINT', () => {
  console.log('\n⚠️  Validation interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Validation terminated');
  process.exit(143);
});

if (require.main === module) {
  main();
}

module.exports = { ProductionReadinessValidator };