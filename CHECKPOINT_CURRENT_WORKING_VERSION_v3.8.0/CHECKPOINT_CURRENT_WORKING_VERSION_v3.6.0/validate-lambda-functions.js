#!/usr/bin/env node

/**
 * Lambda Functions Connectivity Validation
 * 
 * Focused validation script for AWS Lambda functions including:
 * - Function existence and configuration
 * - Invocation permissions
 * - Function health and performance
 * - IAM role validation
 */

const { HealthCheckService } = require('../lib/health-check-service');
const { lambda, getConfig } = require('../config/aws-config-v3');
const { InvokeCommand, GetFunctionConfigurationCommand } = require('@aws-sdk/client-lambda');

class LambdaValidator {
  constructor() {
    this.config = null;
  }

  async initialize() {
    this.config = await getConfig();
  }

  async validateLambdaFunction() {
    console.log('⚡ AWS Lambda Functions Validation');
    console.log('=================================\n');

    const functionName = this.config.lambda.functionName;
    
    if (!functionName) {
      console.log('❌ Lambda function name not configured');
      console.log('   Set CATAPULT_GET_DATASET_LAMBDA environment variable');
      return false;
    }

    console.log(`Testing Lambda function: ${functionName}\n`);

    try {
      // Test 1: Function Configuration
      console.log('1. Checking function configuration...');
      const configResult = await this.checkFunctionConfiguration(functionName);
      this.displayResult('Function Configuration', configResult);

      // Test 2: Function Invocation
      console.log('2. Testing function invocation...');
      const invokeResult = await this.testFunctionInvocation(functionName);
      this.displayResult('Function Invocation', invokeResult);

      // Test 3: Performance Test
      console.log('3. Running performance test...');
      const perfResult = await this.performanceTest(functionName);
      this.displayResult('Performance Test', perfResult);

      // Summary
      const allPassed = configResult.passed && invokeResult.passed && perfResult.passed;
      
      if (allPassed) {
        console.log('\n🎉 Lambda function is healthy and ready for use!');
        return true;
      } else {
        console.log('\n❌ Lambda function has issues that need attention.');
        return false;
      }

    } catch (error) {
      console.error(`❌ Fatal error during Lambda validation: ${error.message}`);
      return false;
    }
  }

  async checkFunctionConfiguration(functionName) {
    try {
      const command = new GetFunctionConfigurationCommand({
        FunctionName: functionName
      });
      
      const response = await lambda.send(command);
      
      const checks = [
        {
          name: 'Function State',
          passed: response.State === 'Active',
          message: `State: ${response.State}`
        },
        {
          name: 'Runtime',
          passed: !!response.Runtime,
          message: `Runtime: ${response.Runtime}`
        },
        {
          name: 'Timeout Configuration',
          passed: response.Timeout >= 30,
          message: `Timeout: ${response.Timeout}s ${response.Timeout < 30 ? '(may be too low)' : ''}`
        },
        {
          name: 'Memory Configuration',
          passed: response.MemorySize >= 128,
          message: `Memory: ${response.MemorySize}MB`
        }
      ];

      return {
        passed: checks.every(c => c.passed),
        checks,
        details: {
          functionArn: response.FunctionArn,
          lastModified: response.LastModified,
          codeSize: response.CodeSize,
          role: response.Role
        }
      };
    } catch (error) {
      return {
        passed: false,
        checks: [
          {
            name: 'Function Access',
            passed: false,
            message: `Cannot access function: ${error.message}`
          }
        ],
        error: error.message
      };
    }
  }

  async testFunctionInvocation(functionName) {
    try {
      const testPayload = {
        test: true,
        query: 'SELECT 1 as test_value',
        timestamp: new Date().toISOString()
      };

      const command = new InvokeCommand({
        FunctionName: functionName,
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify(testPayload)
      });

      const startTime = Date.now();
      const response = await lambda.send(command);
      const responseTime = Date.now() - startTime;

      const hasError = !!response.FunctionError;
      let responsePayload = null;
      
      if (response.Payload) {
        try {
          const payloadString = Buffer.from(response.Payload).toString();
          responsePayload = JSON.parse(payloadString);
        } catch (parseError) {
          // Payload might not be JSON
        }
      }

      const checks = [
        {
          name: 'Function Execution',
          passed: !hasError,
          message: hasError ? `Execution failed: ${response.FunctionError}` : 'Function executed successfully'
        },
        {
          name: 'Response Time',
          passed: responseTime < 10000,
          message: `Response time: ${responseTime}ms ${responseTime > 10000 ? '(slow)' : ''}`
        },
        {
          name: 'Response Format',
          passed: !!responsePayload,
          message: responsePayload ? 'Valid response received' : 'No valid response payload'
        }
      ];

      return {
        passed: checks.every(c => c.passed),
        checks,
        details: {
          responseTime,
          statusCode: response.StatusCode,
          executedVersion: response.ExecutedVersion,
          logResult: response.LogResult ? Buffer.from(response.LogResult, 'base64').toString() : null
        }
      };
    } catch (error) {
      return {
        passed: false,
        checks: [
          {
            name: 'Function Invocation',
            passed: false,
            message: `Cannot invoke function: ${error.message}`
          }
        ],
        error: error.message
      };
    }
  }

  async performanceTest(functionName, iterations = 3) {
    const results = [];
    
    try {
      for (let i = 0; i < iterations; i++) {
        const testPayload = {
          test: true,
          query: `SELECT ${i + 1} as iteration_number`,
          timestamp: new Date().toISOString()
        };

        const command = new InvokeCommand({
          FunctionName: functionName,
          InvocationType: 'RequestResponse',
          Payload: JSON.stringify(testPayload)
        });

        const startTime = Date.now();
        const response = await lambda.send(command);
        const responseTime = Date.now() - startTime;

        results.push({
          iteration: i + 1,
          responseTime,
          success: !response.FunctionError
        });

        // Small delay between invocations
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const successfulRuns = results.filter(r => r.success).length;
      const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      const maxResponseTime = Math.max(...results.map(r => r.responseTime));
      const minResponseTime = Math.min(...results.map(r => r.responseTime));

      const checks = [
        {
          name: 'Success Rate',
          passed: successfulRuns === iterations,
          message: `${successfulRuns}/${iterations} successful invocations`
        },
        {
          name: 'Average Performance',
          passed: averageResponseTime < 5000,
          message: `Average: ${Math.round(averageResponseTime)}ms`
        },
        {
          name: 'Consistency',
          passed: (maxResponseTime - minResponseTime) < 3000,
          message: `Range: ${minResponseTime}ms - ${maxResponseTime}ms`
        }
      ];

      return {
        passed: checks.every(c => c.passed),
        checks,
        details: {
          iterations,
          successfulRuns,
          averageResponseTime: Math.round(averageResponseTime),
          minResponseTime,
          maxResponseTime,
          results
        }
      };
    } catch (error) {
      return {
        passed: false,
        checks: [
          {
            name: 'Performance Test',
            passed: false,
            message: `Performance test failed: ${error.message}`
          }
        ],
        error: error.message
      };
    }
  }

  displayResult(testName, result) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`   ${icon} ${testName}: ${result.passed ? 'PASSED' : 'FAILED'}`);
    
    if (result.checks) {
      result.checks.forEach(check => {
        const checkIcon = check.passed ? '     ✓' : '     ✗';
        console.log(`${checkIcon} ${check.message}`);
      });
    }
    
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
    
    console.log('');
  }
}

async function validateLambdaFunctions() {
  const validator = new LambdaValidator();
  await validator.initialize();
  
  const success = await validator.validateLambdaFunction();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  validateLambdaFunctions().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { LambdaValidator, validateLambdaFunctions };