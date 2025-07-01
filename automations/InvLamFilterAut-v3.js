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
        sqlQuery = parsedParams.query;
      } catch (e) {
        sqlQuery = params;
      }
    } else if (params.query) {
      sqlQuery = params.query;
    }
    
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
 * Invoke Lambda function
 */
async function invokeLambda(payload) {
  try {
    const command = new InvokeCommand({
      FunctionName: LAMBDA_FUNCTION_NAME,
      Payload: JSON.stringify(payload),
      InvocationType: 'RequestResponse'
    });
    
    const response = await lambda.send(command);
    
    // Convert Uint8Array to string
    const responsePayload = Buffer.from(response.Payload).toString();
    
    // Parse the response
    const parsedResponse = JSON.parse(responsePayload);
    
    if (parsedResponse.statusCode && parsedResponse.statusCode !== 200) {
      throw new Error(`Lambda returned error: ${parsedResponse.body}`);
    }
    
    // Extract the body if it exists
    const body = parsedResponse.body ? JSON.parse(parsedResponse.body) : parsedResponse;
    
    return body.ResultSet ? JSON.stringify(body.ResultSet) : JSON.stringify(body);
  } catch (error) {
    console.error('Error invoking Lambda function:', error);
    throw new Error(`Failed to invoke Lambda function: ${error.message}`);
  }
}