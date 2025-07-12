/**
 * Automation: InvLamFilterAut (AWS SDK v3 version)
 * Purpose: Invokes a Lambda function to execute SQL queries against Athena
 */

const { lambda, config } = require('../config/aws-config-v3');
const { InvokeCommand } = require('@aws-sdk/client-lambda');

// Configuration
const LAMBDA_FUNCTION_NAME = config.lambda.catapultGetDataset;

/**
 * Main automation function
 */
exports.execute = async (params) => {
  try {
    console.log('Starting InvLamFilterAut with params:', JSON.stringify(params));
    
    // Extract SQL query from params
    let sqlQuery;
    
    if (typeof params === 'string') {
      try {
        const parsedParams = JSON.parse(params);
        sqlQuery = parsedParams.sql_query || parsedParams.query;
      } catch (e) {
        sqlQuery = params;
      }
    } else if (params.query) {
      // Check if params.query is a JSON string containing the SQL
      if (typeof params.query === 'string') {
        try {
          const parsedQuery = JSON.parse(params.query);
          sqlQuery = parsedQuery.sql_query || params.query;
        } catch (e) {
          sqlQuery = params.query;
        }
      } else {
        sqlQuery = params.query;
      }
    } else if (params.sql_query) {
      sqlQuery = params.sql_query;
    }
    
    console.log('Extracted SQL query:', sqlQuery ? sqlQuery.substring(0, 200) + '...' : 'No query found');
    
    if (!sqlQuery) {
      throw new Error('No SQL query provided in the parameters');
    }
    
    // Prepare payload for Lambda
    const payload = {
      sql_query: sqlQuery
    };
    
    // Invoke Lambda function
    const lambdaResponse = await invokeLambda(payload);
    
    // Process Lambda response
    return {
      status: 'success',
      processResults: lambdaResponse
    };
  } catch (error) {
    console.error('Error in InvLamFilterAut:', error);
    return {
      status: 'error',
      message: `Error in InvLamFilterAut: ${error.message}`,
      processResults: '[]'
    };
  }
};

/**
 * Invoke Lambda function with improved error handling and timeout management
 */
async function invokeLambda(payload) {
  try {
    console.log('InvLamFilterAut: Invoking Lambda function:', LAMBDA_FUNCTION_NAME);
    console.log('InvLamFilterAut: Payload size:', JSON.stringify(payload).length, 'characters');
    
    const command = new InvokeCommand({
      FunctionName: LAMBDA_FUNCTION_NAME,
      Payload: JSON.stringify(payload),
      InvocationType: 'RequestResponse'
    });
    
    const startTime = Date.now();
    const response = await lambda.send(command);
    const executionTime = Date.now() - startTime;
    
    console.log('InvLamFilterAut: Lambda execution time:', executionTime, 'ms');
    
    // Check for Lambda function errors
    if (response.FunctionError) {
      console.error('InvLamFilterAut: Lambda function error:', response.FunctionError);
      throw new Error(`Lambda function error: ${response.FunctionError}`);
    }
    
    // Convert Uint8Array to string
    const responsePayload = Buffer.from(response.Payload).toString();
    console.log('InvLamFilterAut: Raw response payload length:', responsePayload.length);
    
    // Parse the response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responsePayload);
    } catch (parseError) {
      console.error('InvLamFilterAut: Failed to parse Lambda response:', parseError.message);
      console.error('InvLamFilterAut: Raw response (first 1000 chars):', responsePayload.substring(0, 1000));
      throw new Error(`Failed to parse Lambda response: ${parseError.message}`);
    }
    
    // Check for HTTP error status codes
    if (parsedResponse.statusCode && parsedResponse.statusCode !== 200) {
      console.error('InvLamFilterAut: Lambda returned HTTP error:', parsedResponse.statusCode);
      console.error('InvLamFilterAut: Error body:', parsedResponse.body);
      throw new Error(`Lambda returned HTTP ${parsedResponse.statusCode}: ${parsedResponse.body}`);
    }
    
    // Extract the body if it exists
    const body = parsedResponse.body ? JSON.parse(parsedResponse.body) : parsedResponse;
    
    // Handle different response formats
    let result;
    if (body.ResultSet) {
      result = JSON.stringify(body.ResultSet);
    } else if (body.results) {
      result = JSON.stringify(body.results);
    } else if (Array.isArray(body)) {
      result = JSON.stringify(body);
    } else {
      result = JSON.stringify(body);
    }
    
    console.log("InvLamFilterAut: Lambda returned data length:", result.length);
    console.log("InvLamFilterAut: First 500 chars of returned data:", result.substring(0, 500));
    
    // Check for extremely large responses that might cause issues
    if (result.length > 1000000) { // 1MB
      console.warn('InvLamFilterAut: Very large response detected:', result.length, 'characters');
      console.warn('InvLamFilterAut: This may cause downstream processing issues');
    }
    
    // Store the query results for debug purposes
    if (!global.debugInfo) global.debugInfo = {};
    global.debugInfo.queryResults = result;
    global.debugInfo.lambdaExecutionTime = executionTime;
    global.debugInfo.responseSize = result.length;
    
    return result;
  } catch (error) {
    console.error('InvLamFilterAut: Error invoking Lambda function:', error.message);
    console.error('InvLamFilterAut: Error stack:', error.stack);
    
    // Provide more specific error messages based on error type
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      throw new Error(`Lambda execution timeout - query may be too complex or dataset too large: ${error.message}`);
    } else if (error.name === 'ThrottlingException') {
      throw new Error(`Lambda throttling - too many concurrent executions: ${error.message}`);
    } else if (error.name === 'ResourceNotFoundException') {
      throw new Error(`Lambda function not found: ${LAMBDA_FUNCTION_NAME}. Check function name and permissions.`);
    } else if (error.name === 'AccessDeniedException') {
      throw new Error(`Access denied to Lambda function: ${LAMBDA_FUNCTION_NAME}. Check IAM permissions.`);
    } else {
      throw new Error(`Failed to invoke Lambda function: ${error.message}`);
    }
  }
}