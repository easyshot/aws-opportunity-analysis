// Lambda function to execute SQL queries against Athena
const AWS = require('aws-sdk');

// Lambda will get environment variables from the Lambda configuration
// These are set when you deploy the Lambda function
const DATABASE = process.env.ATHENA_DATABASE;
const OUTPUT_LOCATION = process.env.ATHENA_OUTPUT_LOCATION;

// Initialize Athena client
const athena = new AWS.Athena();
const WAIT_TIME_MS = 1000; // Time to wait between query status checks

exports.handler = async (event) => {
  try {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    // Extract SQL query from the event
    let sqlQuery;
    if (typeof event === 'string') {
      try {
        const parsedEvent = JSON.parse(event);
        sqlQuery = parsedEvent.sql_query;
      } catch (e) {
        sqlQuery = event;
      }
    } else if (event.body) {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      sqlQuery = body.sql_query;
    } else if (event.sql_query) {
      sqlQuery = event.sql_query;
    }
    
    if (!sqlQuery) {
      throw new Error('No SQL query provided in the event');
    }
    
    console.log('Executing SQL query:', sqlQuery);
    
    // Start query execution
    const startQueryResponse = await athena.startQueryExecution({
      QueryString: sqlQuery,
      QueryExecutionContext: {
        Database: DATABASE
      },
      ResultConfiguration: {
        OutputLocation: OUTPUT_LOCATION
      }
    }).promise();
    
    const queryExecutionId = startQueryResponse.QueryExecutionId;
    console.log('Query execution ID:', queryExecutionId);
    
    // Wait for query to complete
    const queryResults = await waitForQueryToComplete(queryExecutionId);
    
    // Process and return results
    return {
      statusCode: 200,
      body: JSON.stringify(queryResults)
    };
  } catch (error) {
    console.error('Error executing query:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'error',
        message: `Error executing query: ${error.message}`,
        data: []
      })
    };
  }
};

// Function to wait for query completion
async function waitForQueryToComplete(queryExecutionId) {
  let queryStatus = 'RUNNING';
  let attempts = 0;
  
  while (queryStatus === 'RUNNING' || queryStatus === 'QUEUED') {
    attempts++;
    
    // Check query status
    const queryExecution = await athena.getQueryExecution({
      QueryExecutionId: queryExecutionId
    }).promise();
    
    queryStatus = queryExecution.QueryExecution.Status.State;
    console.log(`Query status (attempt ${attempts}): ${queryStatus}`);
    
    if (queryStatus === 'FAILED' || queryStatus === 'CANCELLED') {
      const reason = queryExecution.QueryExecution.Status.StateChangeReason;
      throw new Error(`Query ${queryStatus}: ${reason}`);
    }
    
    if (queryStatus === 'SUCCEEDED') {
      console.log('Query succeeded, fetching results');
      return await getQueryResults(queryExecutionId);
    }
    
    // Wait before checking again
    await new Promise(resolve => setTimeout(resolve, WAIT_TIME_MS));
  }
}

// Function to get query results
async function getQueryResults(queryExecutionId) {
  const results = await athena.getQueryResults({
    QueryExecutionId: queryExecutionId
  }).promise();
  
  return {
    ResultSet: results.ResultSet
  };
}