import json
import boto3
import time
import re
import os

def lambda_handler(event, context):
    """
    Lambda function to execute SQL queries against Athena with proper LIMIT handling
    """
    print(f"Received event: {json.dumps(event)}")
    
    # Initialize Athena client
    athena_client = boto3.client('athena')
    
    # Get environment variables
    database = os.environ.get('ATHENA_DATABASE', 'catapult_db_p')
    output_location = os.environ.get('ATHENA_OUTPUT_LOCATION', 's3://as-athena-catapult/')
    
    try:
        # Extract SQL query from event
        sql_query = None
        if isinstance(event, dict):
            if 'sql_query' in event:
                sql_query = event['sql_query']
            elif 'body' in event:
                body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
                sql_query = body.get('sql_query')
        elif isinstance(event, str):
            # Try to parse as JSON
            try:
                parsed = json.loads(event)
                sql_query = parsed.get('sql_query')
            except:
                sql_query = event
        
        if not sql_query:
            raise ValueError("No SQL query provided in event")
        
        print(f"Executing SQL query: {sql_query[:200]}...")
        print(f"SQL query length: {len(sql_query)}")
        print(f"SQL query contains LIMIT: {'LIMIT' in sql_query.upper()}")
        
        # Extract LIMIT value from SQL query for debugging and MaxResults
        limit_match = re.search(r'LIMIT\s+(\d+)', sql_query, re.IGNORECASE)
        sql_limit = None
        if limit_match:
            sql_limit = int(limit_match.group(1))
            print(f"SQL query LIMIT value: {sql_limit}")
        else:
            print("No LIMIT clause found in SQL query")
            # Try to get limit from event parameters if available
            if isinstance(event, dict) and 'limit' in event:
                sql_limit = int(event['limit'])
                print(f"Using limit from event parameter: {sql_limit}")
            elif isinstance(event, dict) and 'queryLimit' in event:
                sql_limit = int(event['queryLimit'])
                print(f"Using queryLimit from event parameter: {sql_limit}")
        
        # Start query execution
        response = athena_client.start_query_execution(
            QueryString=sql_query,
            QueryExecutionContext={
                'Database': database
            },
            ResultConfiguration={
                'OutputLocation': output_location
            }
        )
        
        query_execution_id = response['QueryExecutionId']
        print(f"Query execution ID: {query_execution_id}")
        
        # Wait for query to complete
        max_attempts = 60  # 5 minutes max
        attempt = 0
        
        while attempt < max_attempts:
            attempt += 1
            
            # Check query status
            execution_response = athena_client.get_query_execution(
                QueryExecutionId=query_execution_id
            )
            
            status = execution_response['QueryExecution']['Status']['State']
            print(f"Query status: {status}")
            
            if status == 'SUCCEEDED':
                print("Query succeeded, fetching results")
                break
            elif status in ['FAILED', 'CANCELLED']:
                reason = execution_response['QueryExecution']['Status'].get('StateChangeReason', 'Unknown')
                raise Exception(f"Query {status}: {reason}")
            
            # Wait before checking again
            time.sleep(5)
        
        if attempt >= max_attempts:
            raise Exception("Query execution timeout")
        
        # Get query results with proper MaxResults parameter
        # Use the SQL LIMIT value if available, otherwise default to 1000
        max_results = min(sql_limit, 1000) if sql_limit else 1000
        print(f"Using MaxResults: {max_results}")
        
        results_response = athena_client.get_query_results(
            QueryExecutionId=query_execution_id,
            MaxResults=max_results
        )
        
        result_set = results_response['ResultSet']
        row_count = len(result_set.get('Rows', [])) - 1  # Subtract header row
        print(f"Query results received. Row count: {row_count}")
        
        # Verify that we're respecting the SQL LIMIT
        if sql_limit and row_count > sql_limit:
            print(f"WARNING: Returned {row_count} rows but SQL LIMIT was {sql_limit}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'ResultSet': result_set
            })
        }
        
    except Exception as e:
        print(f"Error executing query: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'status': 'error',
                'message': f'Error executing query: {str(e)}',
                'data': []
            })
        }