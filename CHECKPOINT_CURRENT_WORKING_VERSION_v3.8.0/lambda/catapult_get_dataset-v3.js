// Lambda function to execute SQL queries against Athena (AWS SDK v3)
const { AthenaClient, StartQueryExecutionCommand, GetQueryExecutionCommand, GetQueryResultsCommand } = require('@aws-sdk/client-athena');

// Lambda will get environment variables from the Lambda configuration
// These are set when you deploy the Lambda function
const DATABASE = process.env.ATHENA_DATABASE;
const OUTPUT_LOCATION = process.env.ATHENA_OUTPUT_LOCATION;

// Initialize Athena client
const athena = new AthenaClient({
  region: process.env.AWS_REGION
});
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
    console.log('SQL query length:', sqlQuery.length);
    console.log('SQL query contains LIMIT:', sqlQuery.toUpperCase().includes('LIMIT'));
    
    // Extract the LIMIT value from the query for debugging
    const limitMatch = sqlQuery.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      console.log('SQL query LIMIT value:', limitMatch[1]);
    } else {
      console.log('No LIMIT clause found in SQL query');
    }
    
    // Start query execution
    const startQueryCommand = new StartQueryExecutionCommand({
      QueryString: sqlQuery,
      QueryExecutionContext: {
        Database: DATABASE
      },
      ResultConfiguration: {
        OutputLocation: OUTPUT_LOCATION
      }
    });
    
    const startQueryResponse = await athena.send(startQueryCommand);
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
    const getQueryExecutionCommand = new GetQueryExecutionCommand({
      QueryExecutionId: queryExecutionId
    });
    
    const queryExecution = await athena.send(getQueryExecutionCommand);
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
  const getQueryResultsCommand = new GetQueryResultsCommand({
    QueryExecutionId: queryExecutionId,
    MaxResults: 1000 // Explicitly set max results to avoid default pagination issues
  });
  
  const results = await athena.send(getQueryResultsCommand);
  
  // Log for debugging
  console.log('Athena query results - Row count:', results.ResultSet?.Rows?.length || 0);
  
  return {
    ResultSet: results.ResultSet
  };
}