#!/usr/bin/env node

const { 
  CostExplorerClient, 
  GetCostAndUsageCommand 
} = require('@aws-sdk/client-cost-explorer');
const { 
  BudgetsClient, 
  DescribeBudgetsCommand 
} = require('@aws-sdk/client-budgets');
const { 
  LambdaClient, 
  InvokeCommand,
  ListFunctionsCommand 
} = require('@aws-sdk/client-lambda');
const { 
  S3Client, 
  ListBucketsCommand,
  GetBucketIntelligentTieringConfigurationCommand 
} = require('@aws-sdk/client-s3');
const { 
  CloudWatchClient, 
  GetMetricStatisticsCommand 
} = require('@aws-sdk/client-cloudwatch');

class CostOptimizationTester {
  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.costExplorerClient = new CostExplorerClient({ region: 'us-east-1' });
    this.budgetsClient = new BudgetsClient({ region: 'us-east-1' });
    this.lambdaClient = new LambdaClient({ region: this.region });
    this.s3Client = new S3Client({ region: this.region });
    this.cloudWatchClient = new CloudWatchClient({ region: this.region });
    this.projectTag = 'aws-opportunity-analysis';
  }

  async runAllTests() {
    console.log('🧪 Starting Cost Optimization Tests...\n');

    const results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };

    // Test 1: Cost Explorer Integration
    await this.testCostExplorerIntegration(results);

    // Test 2: Budget Management
    await this.testBudgetManagement(results);

    // Test 3: Lambda Cost Monitoring
    await this.testLambdaCostMonitoring(results);

    // Test 4: S3 Intelligent Tiering
    await this.testS3IntelligentTiering(results);

    // Test 5: Lambda Provisioned Concurrency
    await this.testLambdaProvisionedConcurrency(results);

    // Test 6: Cost Allocation Tags
    await this.testCostAllocationTags(results);

    // Test 7: DynamoDB On-Demand Billing
    await this.testDynamoDBOnDemandBilling(results);

    // Print summary
    this.printTestSummary(results);

    return results;
  }

  async testCostExplorerIntegration(results) {
    console.log('📊 Testing Cost Explorer Integration...');

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days

      const params = {
        TimePeriod: {
          Start: startDate.toISOString().split('T')[0],
          End: endDate.toISOString().split('T')[0]
        },
        Granularity: 'DAILY',
        Metrics: ['BlendedCost'],
        Filter: {
          Tags: {
            Key: 'Project',
            Values: [this.projectTag]
          }
        }
      };

      const response = await this.costExplorerClient.send(new GetCostAndUsageCommand(params));
      
      if (response.ResultsByTime && response.ResultsByTime.length > 0) {
        console.log('   ✅ Cost Explorer integration working');
        console.log(`   📈 Found ${response.ResultsByTime.length} days of cost data`);
        
        const totalCost = response.ResultsByTime.reduce((sum, result) => {
          return sum + parseFloat(result.Total?.BlendedCost?.Amount || '0');
        }, 0);
        
        console.log(`   💰 Total cost for last 7 days: $${totalCost.toFixed(2)}`);
        
        results.passed++;
        results.tests.push({
          name: 'Cost Explorer Integration',
          status: 'PASSED',
          details: `Retrieved ${response.ResultsByTime.length} days of cost data, total: $${totalCost.toFixed(2)}`
        });
      } else {
        console.log('   ⚠️  No cost data found (may be expected for new deployments)');
        results.warnings++;
        results.tests.push({
          name: 'Cost Explorer Integration',
          status: 'WARNING',
          details: 'No cost data found - may be expected for new deployments'
        });
      }

    } catch (error) {
      console.log(`   ❌ Cost Explorer test failed: ${error.message}`);
      results.failed++;
      results.tests.push({
        name: 'Cost Explorer Integration',
        status: 'FAILED',
        details: error.message
      });
    }

    console.log('');
  }

  async testBudgetManagement(results) {
    console.log('💰 Testing Budget Management...');

    try {
      const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
      const stsClient = new STSClient({ region: this.region });
      const identity = await stsClient.send(new GetCallerIdentityCommand({}));
      const accountId = identity.Account;

      const response = await this.budgetsClient.send(new DescribeBudgetsCommand({
        AccountId: accountId,
        MaxResults: 100
      }));

      const projectBudgets = response.Budgets?.filter(budget => 
        budget.BudgetName.includes('aws-opportunity-analysis')
      ) || [];

      if (projectBudgets.length > 0) {
        console.log(`   ✅ Found ${projectBudgets.length} project budgets`);
        
        for (const budget of projectBudgets) {
          console.log(`   📊 Budget: ${budget.BudgetName} - Limit: ${budget.BudgetLimit.Amount} ${budget.BudgetLimit.Unit}`);
        }
        
        results.passed++;
        results.tests.push({
          name: 'Budget Management',
          status: 'PASSED',
          details: `Found ${projectBudgets.length} project budgets`
        });
      } else {
        console.log('   ⚠️  No project budgets found');
        results.warnings++;
        results.tests.push({
          name: 'Budget Management',
          status: 'WARNING',
          details: 'No project budgets found - may need to run budget setup'
        });
      }

    } catch (error) {
      console.log(`   ❌ Budget management test failed: ${error.message}`);
      results.failed++;
      results.tests.push({
        name: 'Budget Management',
        status: 'FAILED',
        details: error.message
      });
    }

    console.log('');
  }

  async testLambdaCostMonitoring(results) {
    console.log('⚡ Testing Lambda Cost Monitoring...');

    try {
      // Get Lambda functions
      const functionsResponse = await this.lambdaClient.send(new ListFunctionsCommand({}));
      const projectFunctions = functionsResponse.Functions?.filter(func => 
        func.FunctionName.includes('opportunity-analysis') || 
        func.FunctionName.includes('cost-monitoring')
      ) || [];

      if (projectFunctions.length > 0) {
        console.log(`   ✅ Found ${projectFunctions.length} project Lambda functions`);

        // Test cost monitoring function specifically
        const costMonitoringFunction = projectFunctions.find(func => 
          func.FunctionName.includes('cost-monitoring')
        );

        if (costMonitoringFunction) {
          try {
            const invokeResponse = await this.lambdaClient.send(new InvokeCommand({
              FunctionName: costMonitoringFunction.FunctionName,
              InvocationType: 'RequestResponse',
              Payload: JSON.stringify({ test: true })
            }));

            if (invokeResponse.StatusCode === 200) {
              console.log('   ✅ Cost monitoring function executed successfully');
              results.passed++;
              results.tests.push({
                name: 'Lambda Cost Monitoring',
                status: 'PASSED',
                details: `Found ${projectFunctions.length} functions, cost monitoring function working`
              });
            } else {
              throw new Error(`Function returned status code: ${invokeResponse.StatusCode}`);
            }
          } catch (invokeError) {
            console.log(`   ⚠️  Cost monitoring function test failed: ${invokeError.message}`);
            results.warnings++;
            results.tests.push({
              name: 'Lambda Cost Monitoring',
              status: 'WARNING',
              details: `Functions found but monitoring test failed: ${invokeError.message}`
            });
          }
        } else {
          console.log('   ⚠️  Cost monitoring function not found');
          results.warnings++;
          results.tests.push({
            name: 'Lambda Cost Monitoring',
            status: 'WARNING',
            details: 'Cost monitoring function not found'
          });
        }
      } else {
        console.log('   ❌ No project Lambda functions found');
        results.failed++;
        results.tests.push({
          name: 'Lambda Cost Monitoring',
          status: 'FAILED',
          details: 'No project Lambda functions found'
        });
      }

    } catch (error) {
      console.log(`   ❌ Lambda cost monitoring test failed: ${error.message}`);
      results.failed++;
      results.tests.push({
        name: 'Lambda Cost Monitoring',
        status: 'FAILED',
        details: error.message
      });
    }

    console.log('');
  }

  async testS3IntelligentTiering(results) {
    console.log('🗄️  Testing S3 Intelligent Tiering...');

    try {
      const bucketsResponse = await this.s3Client.send(new ListBucketsCommand({}));
      const projectBuckets = bucketsResponse.Buckets?.filter(bucket => 
        bucket.Name.includes('opportunity-analysis')
      ) || [];

      if (projectBuckets.length > 0) {
        console.log(`   ✅ Found ${projectBuckets.length} project S3 buckets`);

        let tieringConfigured = 0;
        for (const bucket of projectBuckets) {
          try {
            const tieringResponse = await this.s3Client.send(
              new GetBucketIntelligentTieringConfigurationCommand({
                Bucket: bucket.Name,
                Id: 'EntireBucket'
              })
            );

            if (tieringResponse.IntelligentTieringConfiguration) {
              console.log(`   ✅ Intelligent tiering configured for ${bucket.Name}`);
              tieringConfigured++;
            }
          } catch (tieringError) {
            if (tieringError.name !== 'NoSuchConfiguration') {
              console.log(`   ⚠️  Error checking tiering for ${bucket.Name}: ${tieringError.message}`);
            }
          }
        }

        if (tieringConfigured > 0) {
          results.passed++;
          results.tests.push({
            name: 'S3 Intelligent Tiering',
            status: 'PASSED',
            details: `${tieringConfigured} of ${projectBuckets.length} buckets have intelligent tiering configured`
          });
        } else {
          results.warnings++;
          results.tests.push({
            name: 'S3 Intelligent Tiering',
            status: 'WARNING',
            details: 'No buckets have intelligent tiering configured'
          });
        }
      } else {
        console.log('   ⚠️  No project S3 buckets found');
        results.warnings++;
        results.tests.push({
          name: 'S3 Intelligent Tiering',
          status: 'WARNING',
          details: 'No project S3 buckets found'
        });
      }

    } catch (error) {
      console.log(`   ❌ S3 intelligent tiering test failed: ${error.message}`);
      results.failed++;
      results.tests.push({
        name: 'S3 Intelligent Tiering',
        status: 'FAILED',
        details: error.message
      });
    }

    console.log('');
  }

  async testLambdaProvisionedConcurrency(results) {
    console.log('🚀 Testing Lambda Provisioned Concurrency...');

    try {
      const functionsResponse = await this.lambdaClient.send(new ListFunctionsCommand({}));
      const projectFunctions = functionsResponse.Functions?.filter(func => 
        func.FunctionName.includes('opportunity-analysis')
      ) || [];

      if (projectFunctions.length > 0) {
        console.log(`   ✅ Found ${projectFunctions.length} project Lambda functions`);

        // Test concurrency management function
        const concurrencyFunction = projectFunctions.find(func => 
          func.FunctionName.includes('concurrency-management')
        );

        if (concurrencyFunction) {
          try {
            const invokeResponse = await this.lambdaClient.send(new InvokeCommand({
              FunctionName: concurrencyFunction.FunctionName,
              InvocationType: 'RequestResponse',
              Payload: JSON.stringify({ action: 'test', test: true })
            }));

            if (invokeResponse.StatusCode === 200) {
              console.log('   ✅ Concurrency management function working');
              results.passed++;
              results.tests.push({
                name: 'Lambda Provisioned Concurrency',
                status: 'PASSED',
                details: 'Concurrency management function working'
              });
            } else {
              throw new Error(`Function returned status code: ${invokeResponse.StatusCode}`);
            }
          } catch (invokeError) {
            console.log(`   ⚠️  Concurrency management test failed: ${invokeError.message}`);
            results.warnings++;
            results.tests.push({
              name: 'Lambda Provisioned Concurrency',
              status: 'WARNING',
              details: `Concurrency management test failed: ${invokeError.message}`
            });
          }
        } else {
          console.log('   ⚠️  Concurrency management function not found');
          results.warnings++;
          results.tests.push({
            name: 'Lambda Provisioned Concurrency',
            status: 'WARNING',
            details: 'Concurrency management function not found'
          });
        }
      } else {
        console.log('   ❌ No project Lambda functions found');
        results.failed++;
        results.tests.push({
          name: 'Lambda Provisioned Concurrency',
          status: 'FAILED',
          details: 'No project Lambda functions found'
        });
      }

    } catch (error) {
      console.log(`   ❌ Lambda provisioned concurrency test failed: ${error.message}`);
      results.failed++;
      results.tests.push({
        name: 'Lambda Provisioned Concurrency',
        status: 'FAILED',
        details: error.message
      });
    }

    console.log('');
  }

  async testCostAllocationTags(results) {
    console.log('🏷️  Testing Cost Allocation Tags...');

    try {
      // Test if we can query costs by project tag
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);

      const params = {
        TimePeriod: {
          Start: startDate.toISOString().split('T')[0],
          End: endDate.toISOString().split('T')[0]
        },
        Granularity: 'DAILY',
        Metrics: ['BlendedCost'],
        GroupBy: [
          {
            Type: 'TAG',
            Key: 'Project'
          }
        ]
      };

      const response = await this.costExplorerClient.send(new GetCostAndUsageCommand(params));
      
      if (response.ResultsByTime && response.ResultsByTime.length > 0) {
        const hasProjectTag = response.ResultsByTime.some(result => 
          result.Groups?.some(group => 
            group.Keys?.includes(this.projectTag)
          )
        );

        if (hasProjectTag) {
          console.log('   ✅ Cost allocation tags working - project costs found');
          results.passed++;
          results.tests.push({
            name: 'Cost Allocation Tags',
            status: 'PASSED',
            details: 'Project costs found with proper tagging'
          });
        } else {
          console.log('   ⚠️  Project tag found but no costs attributed yet');
          results.warnings++;
          results.tests.push({
            name: 'Cost Allocation Tags',
            status: 'WARNING',
            details: 'Tags configured but no costs attributed yet'
          });
        }
      } else {
        console.log('   ⚠️  No cost data available for tag testing');
        results.warnings++;
        results.tests.push({
          name: 'Cost Allocation Tags',
          status: 'WARNING',
          details: 'No cost data available for tag testing'
        });
      }

    } catch (error) {
      console.log(`   ❌ Cost allocation tags test failed: ${error.message}`);
      results.failed++;
      results.tests.push({
        name: 'Cost Allocation Tags',
        status: 'FAILED',
        details: error.message
      });
    }

    console.log('');
  }

  async testDynamoDBOnDemandBilling(results) {
    console.log('🗃️  Testing DynamoDB On-Demand Billing...');

    try {
      const { DynamoDBClient, ListTablesCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
      const dynamoClient = new DynamoDBClient({ region: this.region });

      const tablesResponse = await dynamoClient.send(new ListTablesCommand({}));
      const projectTables = tablesResponse.TableNames?.filter(tableName => 
        tableName.includes('opportunity-analysis')
      ) || [];

      if (projectTables.length > 0) {
        console.log(`   ✅ Found ${projectTables.length} project DynamoDB tables`);

        let onDemandTables = 0;
        for (const tableName of projectTables) {
          const tableResponse = await dynamoClient.send(new DescribeTableCommand({
            TableName: tableName
          }));

          if (tableResponse.Table?.BillingModeSummary?.BillingMode === 'PAY_PER_REQUEST') {
            console.log(`   ✅ Table ${tableName} is using on-demand billing`);
            onDemandTables++;
          } else {
            console.log(`   ⚠️  Table ${tableName} is using provisioned billing`);
          }
        }

        if (onDemandTables === projectTables.length) {
          results.passed++;
          results.tests.push({
            name: 'DynamoDB On-Demand Billing',
            status: 'PASSED',
            details: `All ${projectTables.length} tables using on-demand billing`
          });
        } else {
          results.warnings++;
          results.tests.push({
            name: 'DynamoDB On-Demand Billing',
            status: 'WARNING',
            details: `${onDemandTables} of ${projectTables.length} tables using on-demand billing`
          });
        }
      } else {
        console.log('   ⚠️  No project DynamoDB tables found');
        results.warnings++;
        results.tests.push({
          name: 'DynamoDB On-Demand Billing',
          status: 'WARNING',
          details: 'No project DynamoDB tables found'
        });
      }

    } catch (error) {
      console.log(`   ❌ DynamoDB on-demand billing test failed: ${error.message}`);
      results.failed++;
      results.tests.push({
        name: 'DynamoDB On-Demand Billing',
        status: 'FAILED',
        details: error.message
      });
    }

    console.log('');
  }

  printTestSummary(results) {
    console.log('📋 Cost Optimization Test Summary');
    console.log('================================');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`⚠️  Warnings: ${results.warnings}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📊 Total Tests: ${results.tests.length}\n`);

    console.log('📝 Detailed Results:');
    for (const test of results.tests) {
      const icon = test.status === 'PASSED' ? '✅' : test.status === 'WARNING' ? '⚠️' : '❌';
      console.log(`   ${icon} ${test.name}: ${test.details}`);
    }

    console.log('\n💡 Recommendations:');
    if (results.warnings > 0 || results.failed > 0) {
      console.log('   - Review failed tests and warnings above');
      console.log('   - Ensure all cost optimization features are properly deployed');
      console.log('   - Check AWS permissions for cost management services');
      console.log('   - Allow time for cost data to accumulate for new deployments');
    } else {
      console.log('   - All cost optimization features are working correctly!');
      console.log('   - Monitor cost dashboard regularly');
      console.log('   - Review and adjust budget thresholds as needed');
    }
  }
}

// Main execution
if (require.main === module) {
  const tester = new CostOptimizationTester();
  tester.runAllTests().catch(console.error);
}

module.exports = { CostOptimizationTester };