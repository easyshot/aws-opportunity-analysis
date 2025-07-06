/**
 * Health Check Service
 * 
 * Provides comprehensive health checking for all AWS services
 * used by the AWS Opportunity Analysis application.
 * 
 * Implements Requirement 9.1: Health check endpoints for all services
 */

const { BedrockAgentClient, GetPromptCommand } = require('@aws-sdk/client-bedrock-agent');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { LambdaClient, InvokeCommand, GetFunctionCommand } = require('@aws-sdk/client-lambda');
const { AthenaClient, GetDatabaseCommand, StartQueryExecutionCommand } = require('@aws-sdk/client-athena');
const { DynamoDBClient, ListTablesCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { EventBridgeClient, ListEventBusesCommand } = require('@aws-sdk/client-eventbridge');
const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');

class HealthCheckService {
  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.clients = {};
    this.healthResults = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    console.log('🏥 Initializing Health Check Service...');
    
    try {
      // Initialize AWS clients
      this.clients = {
        bedrock: new BedrockAgentClient({ region: this.region }),
        bedrockRuntime: new BedrockRuntimeClient({ region: this.region }),
        lambda: new LambdaClient({ region: this.region }),
        athena: new AthenaClient({ region: this.region }),
        dynamodb: new DynamoDBClient({ region: this.region }),
        eventbridge: new EventBridgeClient({ region: this.region }),
        s3: new S3Client({ region: this.region }),
        sts: new STSClient({ region: this.region })
      };
      
      this.initialized = true;
      console.log('✅ Health Check Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Health Check Service:', error.message);
      throw error;
    }
  }

  /**
   * Run comprehensive health check on all services
   */
  async runFullHealthCheck() {
    if (!this.initialized) await this.initialize();
    
    console.log('🔍 Running comprehensive health check...');
    
    const checks = [
      this.checkAWSCredentials(),
      this.checkBedrockAgent(),
      this.checkBedrockRuntime(),
      this.checkBedrockPrompts(),
      this.checkLambdaFunction(),
      this.checkAthenaDatabase(),
      this.checkAthenaS3Access(),
      this.checkDynamoDBTables(),
      this.checkEventBridge(),
      this.checkS3Access()
    ];
    
    const results = await Promise.allSettled(checks);
    
    this.healthResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          service: `Check ${index + 1}`,
          status: 'unhealthy',
          responseTime: 0,
          error: result.reason.message,
          timestamp: new Date()
        };
      }
    });
    
    return this.healthResults;
  }

  /**
   * Check AWS credentials and basic connectivity
   */
  async checkAWSCredentials() {
    const startTime = Date.now();
    
    try {
      const command = new GetCallerIdentityCommand({});
      const response = await this.clients.sts.send(command);
      
      return {
        service: 'AWS Credentials',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          account: response.Account,
          arn: response.Arn,
          userId: response.UserId
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        service: 'AWS Credentials',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check Bedrock Agent service
   */
  async checkBedrockAgent() {
    const startTime = Date.now();
    
    try {
      // Try to get a prompt to test Bedrock Agent connectivity
      const promptId = process.env.CATAPULT_QUERY_PROMPT_ID;
      if (!promptId) {
        throw new Error('CATAPULT_QUERY_PROMPT_ID environment variable not set');
      }
      
      const command = new GetPromptCommand({ promptIdentifier: promptId });
      await this.clients.bedrock.send(command);
      
      return {
        service: 'Bedrock Agent',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          promptId: promptId,
          region: this.region
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        service: 'Bedrock Agent',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check Bedrock Runtime service
   */
  async checkBedrockRuntime() {
    const startTime = Date.now();
    
    try {
      // Test with a simple prompt to Titan model
      const command = new InvokeModelCommand({
        modelId: 'amazon.titan-text-lite-v1',
        body: JSON.stringify({
          inputText: 'Hello',
          textGenerationConfig: {
            maxTokenCount: 10,
            temperature: 0.1
          }
        }),
        contentType: 'application/json',
        accept: 'application/json'
      });
      
      const response = await this.clients.bedrockRuntime.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      return {
        service: 'Bedrock Runtime',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          modelId: 'amazon.titan-text-lite-v1',
          responseLength: responseBody.results?.[0]?.outputText?.length || 0
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        service: 'Bedrock Runtime',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check Bedrock prompts accessibility
   */
  async checkBedrockPrompts() {
    const startTime = Date.now();
    
    try {
      const prompts = [
        { name: 'Query Prompt', id: process.env.CATAPULT_QUERY_PROMPT_ID },
        { name: 'Analysis Prompt', id: process.env.CATAPULT_ANALYSIS_PROMPT_ID },
        { name: 'Nova Premier Prompt', id: process.env.CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID }
      ];
      
      const promptChecks = await Promise.allSettled(
        prompts.map(async (prompt) => {
          if (!prompt.id) {
            throw new Error(`${prompt.name} ID not configured`);
          }
          
          const command = new GetPromptCommand({ promptIdentifier: prompt.id });
          await this.clients.bedrock.send(command);
          return { name: prompt.name, id: prompt.id, status: 'accessible' };
        })
      );
      
      const accessiblePrompts = promptChecks.filter(p => p.status === 'fulfilled').length;
      const totalPrompts = prompts.length;
      
      return {
        service: 'Bedrock Prompts',
        status: accessiblePrompts === totalPrompts ? 'healthy' : 'degraded',
        responseTime: Date.now() - startTime,
        details: {
          accessible: accessiblePrompts,
          total: totalPrompts,
          prompts: promptChecks.map(p => p.status === 'fulfilled' ? p.value : { error: p.reason.message })
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        service: 'Bedrock Prompts',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check Lambda function
   */
  async checkLambdaFunction() {
    const startTime = Date.now();
    
    try {
      const functionName = process.env.CATAPULT_GET_DATASET_LAMBDA;
      if (!functionName) {
        throw new Error('CATAPULT_GET_DATASET_LAMBDA environment variable not set');
      }
      
      // Check if function exists
      const getCommand = new GetFunctionCommand({ FunctionName: functionName });
      const functionInfo = await this.clients.lambda.send(getCommand);
      
      // Test invocation with a simple payload
      const invokeCommand = new InvokeCommand({
        FunctionName: functionName,
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify({
          test: true,
          query: 'SELECT 1 as test_value'
        })
      });
      
      const response = await this.clients.lambda.send(invokeCommand);
      const payload = JSON.parse(new TextDecoder().decode(response.Payload));
      
      return {
        service: 'Lambda Function',
        status: response.StatusCode === 200 ? 'healthy' : 'degraded',
        responseTime: Date.now() - startTime,
        details: {
          functionName: functionName,
          runtime: functionInfo.Configuration.Runtime,
          statusCode: response.StatusCode,
          executedVersion: response.ExecutedVersion,
          testResponse: payload
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        service: 'Lambda Function',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check Athena database
   */
  async checkAthenaDatabase() {
    const startTime = Date.now();
    
    try {
      const database = process.env.ATHENA_DATABASE || 'default';
      
      const command = new GetDatabaseCommand({
        CatalogName: 'AwsDataCatalog',
        DatabaseName: database
      });
      
      const response = await this.clients.athena.send(command);
      
      return {
        service: 'Athena Database',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          database: database,
          name: response.Database.Name,
          description: response.Database.Description
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        service: 'Athena Database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check Athena S3 access
   */
  async checkAthenaS3Access() {
    const startTime = Date.now();
    
    try {
      const outputLocation = process.env.ATHENA_OUTPUT_LOCATION;
      if (!outputLocation) {
        throw new Error('ATHENA_OUTPUT_LOCATION environment variable not set');
      }
      
      // Extract bucket name from S3 URL
      const bucketMatch = outputLocation.match(/s3:\/\/([^\/]+)/);
      if (!bucketMatch) {
        throw new Error('Invalid ATHENA_OUTPUT_LOCATION format');
      }
      
      const bucketName = bucketMatch[1];
      
      // Check if bucket is accessible
      const command = new HeadBucketCommand({ Bucket: bucketName });
      await this.clients.s3.send(command);
      
      return {
        service: 'Athena S3 Access',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          outputLocation: outputLocation,
          bucket: bucketName
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        service: 'Athena S3 Access',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check DynamoDB tables
   */
  async checkDynamoDBTables() {
    const startTime = Date.now();
    
    try {
      // List all tables
      const listCommand = new ListTablesCommand({});
      const response = await this.clients.dynamodb.send(listCommand);
      
      // Check for expected tables (these would be created by the infrastructure)
      const expectedTables = ['AnalysisResults', 'UserSessions', 'AnalysisHistory'];
      const existingTables = response.TableNames || [];
      
      const tableChecks = await Promise.allSettled(
        expectedTables.map(async (tableName) => {
          if (existingTables.includes(tableName)) {
            const describeCommand = new DescribeTableCommand({ TableName: tableName });
            const tableInfo = await this.clients.dynamodb.send(describeCommand);
            return {
              name: tableName,
              status: tableInfo.Table.TableStatus,
              itemCount: tableInfo.Table.ItemCount
            };
          } else {
            return {
              name: tableName,
              status: 'NOT_FOUND',
              itemCount: 0
            };
          }
        })
      );
      
      const healthyTables = tableChecks.filter(t => 
        t.status === 'fulfilled' && t.value.status === 'ACTIVE'
      ).length;
      
      return {
        service: 'DynamoDB Tables',
        status: healthyTables > 0 ? 'healthy' : 'degraded',
        responseTime: Date.now() - startTime,
        details: {
          totalTables: existingTables.length,
          expectedTables: expectedTables.length,
          healthyTables: healthyTables,
          tables: tableChecks.map(t => t.status === 'fulfilled' ? t.value : { error: t.reason.message })
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        service: 'DynamoDB Tables',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check EventBridge
   */
  async checkEventBridge() {
    const startTime = Date.now();
    
    try {
      const command = new ListEventBusesCommand({});
      const response = await this.clients.eventbridge.send(command);
      
      const eventBuses = response.EventBuses || [];
      const customBuses = eventBuses.filter(bus => bus.Name !== 'default');
      
      return {
        service: 'EventBridge',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          totalBuses: eventBuses.length,
          customBuses: customBuses.length,
          buses: eventBuses.map(bus => ({
            name: bus.Name,
            arn: bus.Arn
          }))
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        service: 'EventBridge',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check S3 access
   */
  async checkS3Access() {
    const startTime = Date.now();
    
    try {
      const outputLocation = process.env.ATHENA_OUTPUT_LOCATION;
      if (!outputLocation) {
        throw new Error('ATHENA_OUTPUT_LOCATION environment variable not set');
      }
      
      const bucketMatch = outputLocation.match(/s3:\/\/([^\/]+)/);
      if (!bucketMatch) {
        throw new Error('Invalid ATHENA_OUTPUT_LOCATION format');
      }
      
      const bucketName = bucketMatch[1];
      const command = new HeadBucketCommand({ Bucket: bucketName });
      await this.clients.s3.send(command);
      
      return {
        service: 'S3 Access',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          bucket: bucketName,
          region: this.region
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        service: 'S3 Access',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get health status summary
   */
  getHealthSummary() {
    if (this.healthResults.length === 0) {
      return {
        overall: 'unknown',
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
        total: 0
      };
    }
    
    const summary = {
      healthy: this.healthResults.filter(r => r.status === 'healthy').length,
      degraded: this.healthResults.filter(r => r.status === 'degraded').length,
      unhealthy: this.healthResults.filter(r => r.status === 'unhealthy').length,
      total: this.healthResults.length
    };
    
    // Determine overall health
    if (summary.unhealthy > 0) {
      summary.overall = 'unhealthy';
    } else if (summary.degraded > 0) {
      summary.overall = 'degraded';
    } else {
      summary.overall = 'healthy';
    }
    
    return summary;
  }
}

module.exports = { HealthCheckService };