/**
 * Automation: InvLamFilterAut
 * Purpose: Executes the generated SQL query against Athena via the catapult_get_dataset Lambda function
 */

const { lambda, config } = require('../config/aws-config');

// Configuration
const LAMBDA_FUNCTION_NAME = config.lambda.catapultGetDataset;

/**
 * Main automation function
 */
exports.execute = async (params) => {
  try {
    console.log('Starting preparePayload action in InvLamFilterAut');
    console.log('Incoming query parameter:', params.query);
    
    // Step 1: Prepare payload for Lambda
    const payload = preparePayload(params);
    
    // Step 2: Invoke Lambda function
    const lambdaResponse = await invokeLambda(payload);
    
    // Step 3: Process results
    const processedResults = processResults(lambdaResponse);
    
    return {
      status: 'success',
      processResults: processedResults
    };
  } catch (error) {
    console.error('Error in InvLamFilterAut:', error);
    return {
      status: 'error',
      message: `Error in InvLamFilterAut: ${error.message}`,
      processResults: JSON.stringify({ status: 'error', message: error.message, data: [] }, null, 2)
    };
  }
};

/**
 * Prepare payload for Lambda
 */
function preparePayload(params) {
  try {
    let queryData;
    try {
      queryData = typeof params.query === 'string' ? JSON.parse(params.query) : params.query;
    } catch (e) {
      console.error('Error parsing query parameter in InvLamFilterAut:', e);
      throw new Error('Invalid query format for InvLamFilterAut');
    }
    
    console.log('Parsed queryData in InvLamFilterAut:', queryData);
    
    if (!queryData || typeof queryData !== 'object' || !('sql_query' in queryData)) {
      throw new Error('Missing or invalid sql_query in query data for InvLamFilterAut');
    }
    
    const formattedQuery = {
      sql_query: queryData.sql_query
    };
    
    console.log('Formatted query for Lambda in InvLamFilterAut:', formattedQuery);
    return JSON.stringify(formattedQuery);
  } catch (error) {
    console.error('Error in preparePayload for InvLamFilterAut:', error);
    throw error;
  }
}

/**
 * Invoke Lambda function
 */
async function invokeLambda(payload) {
  try {
    const params = {
      FunctionName: LAMBDA_FUNCTION_NAME,
      Payload: payload
    };
    
    const response = await lambda.invoke(params).promise();
    
    if (response.FunctionError) {
      throw new Error(`Lambda execution failed: ${response.FunctionError}`);
    }
    
    return response;
  } catch (error) {
    console.error('Error invoking Lambda function:', error);
    throw new Error(`Failed to invoke Lambda function: ${error.message}`);
  }
}

/**
 * Process Lambda results
 */
function processResults(response) {
  console.log('Processing Lambda results in InvLamFilterAut:', response);
  
  try {
    if (!response) {
      console.error('No response received from Lambda in InvLamFilterAut');
      return JSON.stringify({ status: 'error', message: 'No response received from Lambda', data: [] }, null, 2);
    }
    
    let resultSet;
    if (response.Payload) {
      const parsedPayload = JSON.parse(response.Payload);
      
      if (parsedPayload.body) {
        const parsedBody = typeof parsedPayload.body === 'string' ? JSON.parse(parsedPayload.body) : parsedPayload.body;
        
        if (parsedBody.ResultSet) {
          resultSet = parsedBody.ResultSet;
          console.log('Parsed ResultSet in InvLamFilterAut:', resultSet);
        } else if (parsedBody.data && Array.isArray(parsedBody.data) && parsedBody.status) {
          console.log('Lambda returned pre-formatted data in InvLamFilterAut:', parsedBody);
          return JSON.stringify(parsedBody, null, 2);
        } else {
          console.error('No ResultSet found in response body, and not pre-formatted. Body in InvLamFilterAut:', parsedBody);
          return JSON.stringify({ status: 'error', message: 'No ResultSet found in response and not pre-formatted', data: [] }, null, 2);
        }
      } else {
        console.error('No response.body from Lambda. Full response in InvLamFilterAut:', parsedPayload);
        return JSON.stringify({ status: 'error', message: 'No response.body from Lambda.', data: [] }, null, 2);
      }
    } else {
      console.error('No Payload in Lambda response. Full response in InvLamFilterAut:', response);
      return JSON.stringify({ status: 'error', message: 'No Payload in Lambda response', data: [] }, null, 2);
    }
    
    if (!resultSet || !resultSet.Rows || resultSet.Rows.length === 0) {
      return JSON.stringify({ status: 'success', message: 'No results found', data: [] }, null, 2);
    }
    
    const headers = resultSet.Rows[0].Data.map(col => col.VarCharValue);
    console.log('Extracted headers in InvLamFilterAut:', headers);
    
    const data = resultSet.Rows.slice(1).map(row => {
      const rowObj = {};
      headers.forEach((header, index) => {
        rowObj[header] = row.Data[index]?.VarCharValue || '';
      });
      return rowObj;
    });
    
    console.log('Transformed data in InvLamFilterAut (first 2 items):', data.slice(0,2));
    
    const results = {
      status: 'success',
      message: `Found ${data.length} results`,
      data: data
    };
    
    return JSON.stringify(results, null, 2);
  } catch (error) {
    console.error('Error processing results in InvLamFilterAut:', error);
    return JSON.stringify({ status: 'error', message: `Error processing results: ${error.message}`, data: [] }, null, 2);
  }
}