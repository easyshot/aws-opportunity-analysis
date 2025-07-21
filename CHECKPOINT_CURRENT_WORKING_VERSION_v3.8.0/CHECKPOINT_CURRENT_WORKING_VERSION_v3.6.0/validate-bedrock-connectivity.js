#!/usr/bin/env node

/**
 * Bedrock Service Connectivity Validation
 * 
 * Focused validation script for AWS Bedrock services including:
 * - Bedrock Agent connectivity
 * - Bedrock Runtime model access
 * - Prompt management validation
 * - Model permission testing
 */

const { HealthCheckService } = require('../lib/health-check-service');

async function validateBedrockConnectivity() {
  console.log('🤖 AWS Bedrock Connectivity Validation');
  console.log('=====================================\n');

  const healthCheck = new HealthCheckService();
  
  try {
    await healthCheck.initialize();
    
    console.log('Testing Bedrock services...\n');
    
    // Run Bedrock-specific tests
    const results = await Promise.all([
      healthCheck.checkBedrockAgent(),
      healthCheck.checkBedrockRuntime(),
      healthCheck.checkBedrockPrompts()
    ]);
    
    // Display results
    results.forEach(result => {
      const statusIcon = result.status === 'healthy' ? '✅' : 
                        result.status === 'degraded' ? '⚠️' : '❌';
      
      console.log(`${statusIcon} ${result.service}: ${result.status.toUpperCase()}`);
      console.log(`   Response Time: ${result.responseTime}ms`);
      
      if (result.checks) {
        result.checks.forEach(check => {
          const checkIcon = check.passed ? '  ✓' : '  ✗';
          console.log(`${checkIcon} ${check.message}`);
        });
      }
      
      if (result.recommendations && result.recommendations.length > 0) {
        console.log('   Recommendations:');
        result.recommendations.forEach(rec => {
          console.log(`     • ${rec}`);
        });
      }
      
      console.log('');
    });
    
    // Summary
    const allHealthy = results.every(r => r.status === 'healthy');
    const hasUnhealthy = results.some(r => r.status === 'unhealthy');
    
    if (allHealthy) {
      console.log('🎉 All Bedrock services are healthy and ready for use!');
    } else if (hasUnhealthy) {
      console.log('❌ Some Bedrock services have critical issues that need attention.');
      process.exit(1);
    } else {
      console.log('⚠️  Some Bedrock services are degraded but may still function.');
    }
    
  } catch (error) {
    console.error('❌ Fatal error during Bedrock validation:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  validateBedrockConnectivity();
}

module.exports = { validateBedrockConnectivity };