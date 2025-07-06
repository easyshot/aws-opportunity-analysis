const AWSXRay = require('aws-xray-sdk-core');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));
const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
const { BedrockAgentClient, GetPromptCommand } = require('@aws-sdk/client-bedrock-agent');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

// Initialize AWS clients with X-Ray tracing
const bedrockRuntime = AWSXRay.captureAWSv3Client(new BedrockRuntimeClient({ region: process.env.AWS_REGION }));
const bedrockAgent = AWSXRay.captureAWSv3Client(new BedrockAgentClient({ region: process.env.AWS_REGION }));
const lambda = AWSXRay.captureAWSv3Client(new LambdaClient({ region: process.env.AWS_REGION }));
const cloudWatch = AWSXRay.captureAWSv3Client(new CloudWatchClient({ region: process.env.AWS_REGION }));

exports.handler = async (event, context) => {
  // Initialize X-Ray tracing
  const segment = AWSXRay.getSegment();
  const traceId = segment ? segment.trace_id : 'unknown';
  
  console.log(`🔍 Lambda execution started - Trace ID: ${traceId}`, JSON.stringify(event, null, 2));
  
  const startTime = Date.now();
  let analysisSuccess = false;
  
  try {
    // Add trace annotations
    if (segment) {
      segment.addAnnotation('service', 'opportunity-analysis');
      segment.addAnnotation('version', '1.0.0');
      segment.addAnnotation('requestId', context.awsRequestId);
    }

    // Extract opportunity details from event
    const { opportunityDetails, analysisOptions = {} } = event;
    const { CustomerName, region, closeDate, oppName, oppDescription } = opportunityDetails;
    const { useNovaPremier = false, includeValidation = true } = analysisOptions;

    // Add business context to trace
    if (segment) {
      segment.addMetadata('opportunity', {
        customerName: CustomerName,
        region,
        analysisType: useNovaPremier ? 'nova-premier' : 'standard',
      });
    }

    // Step 1: Generate SQL query using Bedrock
    const querySubsegment = segment ? segment.addNewSubsegment('query-generation') : null;
    let queryResult;
    
    try {
      if (querySubsegment) {
        querySubsegment.addAnnotation('step', 'query-generation');
        querySubsegment.addMetadata('input', { CustomerName, region, oppName });
      }

      console.log('🔍 Step 1: Generating SQL query using Bedrock');
      
      // Get prompt from Bedrock Agent
      const promptId = process.env.CATAPULT_QUERY_PROMPT_ID;
      const getPromptCommand = new GetPromptCommand({
        promptIdentifier: promptId,
      });
      
      const promptResponse = await bedrockAgent.send(getPromptCommand);
      const promptData = promptResponse.variants[0];
      
      // Prepare Bedrock payload
      const modelId = promptData.modelId || 'amazon.titan-text-express-v1';
      const systemPrompt = promptData.templateConfiguration?.text?.text || '';
      const userPrompt = promptData.templateConfiguration?.text?.inputVariables || '';
      
      // Fill prompt template
      const filledPrompt = userPrompt
        .replace(/\{\{CustomerName\}\}/g, CustomerName)
        .replace(/\{\{region\}\}/g, region)
        .replace(/\{\{closeDate\}\}/g, closeDate)
        .replace(/\{\{oppName\}\}/g, oppName)
        .replace(/\{\{oppDescription\}\}/g, oppDescription);

      const converseCommand = new ConverseCommand({
        modelId,
        messages: [{
          role: 'user',
          content: [{ text: filledPrompt }]
        }],
        system: systemPrompt ? [{ text: systemPrompt }] : undefined,
        inferenceConfig: {
          maxTokens: 4000,
          temperature: 0.1,
        },
      });

      const bedrockResponse = await bedrockRuntime.send(converseCommand);
      const responseText = bedrockResponse.output.message.content[0].text;
      
      // Extract SQL query from response
      const sqlMatch = responseText.match(/```sql\n([\s\S]*?)\n```/) || responseText.match(/```\n([\s\S]*?)\n```/);
      queryResult = sqlMatch ? sqlMatch[1].trim() : responseText.trim();
      
      if (querySubsegment) {
        querySubsegment.addMetadata('output', { queryLength: queryResult.length });
        querySubsegment.close();
      }

      // Record metrics
      await recordMetric('BedrockInvocations', 1, [
        { Name: 'ModelId', Value: modelId },
        { Name: 'Status', Value: 'Success' }
      ]);

      console.log('✅ SQL query generated successfully');
    } catch (error) {
      if (querySubsegment) {
        querySubsegment.addError(error);
        querySubsegment.close(error);
      }
      throw new Error(`Query generation failed: ${error.message}`);
    }

    // Step 2: Execute SQL query via Lambda
    const dataSubsegment = segment ? segment.addNewSubsegment('data-retrieval') : null;
    let dataResult;
    
    try {
      if (dataSubsegment) {
        dataSubsegment.addAnnotation('step', 'data-retrieval');
        dataSubsegment.addMetadata('query', { sql: queryResult.substring(0, 200) + '...' });
      }

      console.log('🔍 Step 2: Executing SQL query via Lambda');
      
      const lambdaPayload = {
        sql_query: queryResult
      };

      const invokeCommand = new InvokeCommand({
        FunctionName: process.env.CATAPULT_GET_DATASET_LAMBDA || 'catapult_get_dataset',
        Payload: JSON.stringify(lambdaPayload),
      });

      const lambdaResponse = await lambda.send(invokeCommand);
      const responsePayload = JSON.parse(new TextDecoder().decode(lambdaResponse.Payload));
      
      if (responsePayload.statusCode !== 200) {
        throw new Error(`Lambda execution failed: ${responsePayload.body}`);
      }

      dataResult = JSON.parse(responsePayload.body);
      
      if (dataSubsegment) {
        dataSubsegment.addMetadata('output', { 
          recordCount: dataResult.data?.length || 0,
          status: dataResult.status 
        });
        dataSubsegment.close();
      }

      // Record metrics
      await recordMetric('QueryExecutions', 1, [
        { Name: 'QueryType', Value: 'opportunity-analysis' },
        { Name: 'Status', Value: 'Success' }
      ]);

      console.log(`✅ Data retrieved: ${dataResult.data?.length || 0} records`);
    } catch (error) {
      if (dataSubsegment) {
        dataSubsegment.addError(error);
        dataSubsegment.close(error);
      }
      throw new Error(`Data retrieval failed: ${error.message}`);
    }

    // Step 3: Analyze results using Bedrock
    const analysisSubsegment = segment ? segment.addNewSubsegment('bedrock-analysis') : null;
    let analysisResult;
    
    try {
      if (analysisSubsegment) {
        analysisSubsegment.addAnnotation('step', 'bedrock-analysis');
        analysisSubsegment.addAnnotation('model-type', useNovaPremier ? 'nova-premier' : 'standard');
      }

      console.log(`🔍 Step 3: Analyzing results using ${useNovaPremier ? 'Nova Premier' : 'standard'} model`);
      
      // Get analysis prompt
      const analysisPromptId = useNovaPremier 
        ? process.env.CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID 
        : process.env.CATAPULT_ANALYSIS_PROMPT_ID;
      
      const getAnalysisPromptCommand = new GetPromptCommand({
        promptIdentifier: analysisPromptId,
      });
      
      const analysisPromptResponse = await bedrockAgent.send(getAnalysisPromptCommand);
      const analysisPromptData = analysisPromptResponse.variants[0];
      
      const analysisModelId = analysisPromptData.modelId || (useNovaPremier ? 'amazon.nova-premier-v1:0' : 'amazon.titan-text-express-v1');
      const analysisSystemPrompt = analysisPromptData.templateConfiguration?.text?.text || '';
      
      // Prepare historical data for analysis
      const historicalData = dataResult.data || [];
      const processedData = historicalData.map(project => ({
        ...project,
        historical_opportunity_won_date: formatDate(project.close_date),
      }));

      // Create analysis prompt
      const analysisUserPrompt = `
Analyze the following opportunity and provide predictions based on historical data:

OPPORTUNITY DETAILS:
- Customer: ${CustomerName}
- Region: ${region}
- Close Date: ${closeDate}
- Opportunity Name: ${oppName}
- Description: ${oppDescription}

HISTORICAL PROJECT DATA:
${JSON.stringify(processedData, null, 2)}

Please provide a comprehensive analysis including predictions for ARR, MRR, launch dates, and recommended AWS services.
      `;

      const analysisConverseCommand = new ConverseCommand({
        modelId: analysisModelId,
        messages: [{
          role: 'user',
          content: [{ text: analysisUserPrompt }]
        }],
        system: analysisSystemPrompt ? [{ text: analysisSystemPrompt }] : undefined,
        inferenceConfig: {
          maxTokens: 8000,
          temperature: 0.2,
        },
      });

      const analysisBedrockResponse = await bedrockRuntime.send(analysisConverseCommand);
      const analysisResponseText = analysisBedrockResponse.output.message.content[0].text;
      
      // Parse analysis results
      analysisResult = parseAnalysisResponse(analysisResponseText, processedData);
      
      if (analysisSubsegment) {
        analysisSubsegment.addMetadata('output', { 
          predictedArr: analysisResult.metrics?.predictedArr,
          confidence: analysisResult.sections?.confidence,
          topServices: analysisResult.metrics?.topServices?.substring(0, 100) + '...'
        });
        analysisSubsegment.close();
      }

      // Record metrics
      await recordMetric('BedrockInvocations', 1, [
        { Name: 'ModelId', Value: analysisModelId },
        { Name: 'Status', Value: 'Success' }
      ]);

      analysisSuccess = true;
      console.log('✅ Analysis completed successfully');
    } catch (error) {
      if (analysisSubsegment) {
        analysisSubsegment.addError(error);
        analysisSubsegment.close(error);
      }
      throw new Error(`Analysis failed: ${error.message}`);
    }

    // Record final metrics
    const totalDuration = Date.now() - startTime;
    await recordMetric('AnalysisLatency', totalDuration, [
      { Name: 'AnalysisType', Value: useNovaPremier ? 'nova-premier' : 'standard' }
    ]);

    await recordMetric('AnalysisRequests', 1, [
      { Name: 'Region', Value: region },
      { Name: 'Status', Value: 'Success' }
    ]);

    // Add final trace metadata
    if (segment) {
      segment.addMetadata('result', {
        success: true,
        duration: totalDuration,
        predictedArr: analysisResult.metrics?.predictedArr,
      });
    }

    console.log(`✅ Lambda execution completed successfully in ${totalDuration}ms`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        ...analysisResult,
        executionTime: totalDuration,
        traceId,
      }),
    };

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    
    console.error('❌ Lambda execution failed:', error);
    
    // Record error metrics
    await recordMetric('AnalysisErrors', 1, [
      { Name: 'ErrorType', Value: error.name || 'UnknownError' }
    ]);

    await recordMetric('AnalysisRequests', 1, [
      { Name: 'Region', Value: event.opportunityDetails?.region || 'unknown' },
      { Name: 'Status', Value: 'Error' }
    ]);

    // Add error to trace
    if (segment) {
      segment.addError(error);
      segment.addMetadata('error', {
        message: error.message,
        duration: totalDuration,
      });
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        executionTime: totalDuration,
        traceId,
      }),
    };
  }
};

// Helper function to record CloudWatch metrics
async function recordMetric(metricName, value, dimensions = []) {
  try {
    const command = new PutMetricDataCommand({
      Namespace: 'AWS/OpportunityAnalysis',
      MetricData: [{
        MetricName: metricName,
        Value: value,
        Unit: metricName.includes('Latency') || metricName.includes('Duration') ? 'Milliseconds' : 'Count',
        Timestamp: new Date(),
        Dimensions: [
          { Name: 'Service', Value: 'opportunity-analysis' },
          ...dimensions
        ]
      }]
    });

    await cloudWatch.send(command);
  } catch (error) {
    console.error(`Failed to record metric ${metricName}:`, error);
  }
}

// Helper function to format dates
function formatDate(dateValue) {
  if (!dateValue) return null;
  
  try {
    // Handle different date formats
    if (typeof dateValue === 'number') {
      // Handle nanoseconds, seconds, or milliseconds
      if (dateValue > 1e12) {
        // Nanoseconds
        return new Date(dateValue / 1e6).toISOString().split('T')[0];
      } else if (dateValue > 1e9) {
        // Milliseconds
        return new Date(dateValue).toISOString().split('T')[0];
      } else {
        // Seconds
        return new Date(dateValue * 1000).toISOString().split('T')[0];
      }
    } else if (typeof dateValue === 'string') {
      return new Date(dateValue).toISOString().split('T')[0];
    }
    
    return dateValue;
  } catch (error) {
    console.warn(`Failed to format date: ${dateValue}`, error);
    return dateValue;
  }
}

// Helper function to parse analysis response
function parseAnalysisResponse(responseText, historicalData) {
  try {
    // Extract structured data from the response
    const metrics = {
      predictedArr: extractValue(responseText, /ARR[:\s]*\$?([\d,]+)/i) || 'Not determined',
      predictedMrr: extractValue(responseText, /MRR[:\s]*\$?([\d,]+)/i) || 'Not determined',
      launchDate: extractValue(responseText, /launch date[:\s]*([^\n]+)/i) || 'Not determined',
      timeToLaunch: extractValue(responseText, /time to launch[:\s]*(\d+)/i) || 'Not determined',
      confidence: extractValue(responseText, /confidence[:\s]*(\w+)/i) || 'MEDIUM',
      topServices: extractServices(responseText) || 'AWS services to be determined',
    };

    const sections = {
      analysisMethodology: extractSection(responseText, 'METHODOLOGY') || 'Analysis based on historical project data',
      similarProjects: parseSimilarProjects(historicalData),
      detailedFindings: extractSection(responseText, 'FINDINGS') || 'Detailed analysis findings',
      predictionRationale: extractSection(responseText, 'RATIONALE') || 'Prediction rationale',
      riskFactors: extractSection(responseText, 'RISK') || 'Risk factors identified',
      confidence: metrics.confidence,
    };

    return {
      metrics,
      sections,
      query: {
        generatedSql: 'SQL query executed successfully',
        executionResults: `Retrieved ${historicalData.length} historical projects`,
      },
    };
  } catch (error) {
    console.error('Error parsing analysis response:', error);
    return {
      metrics: {
        predictedArr: 'Analysis error',
        predictedMrr: 'Analysis error',
        launchDate: 'Analysis error',
        timeToLaunch: 'Analysis error',
        confidence: 'LOW',
        topServices: 'Analysis error',
      },
      sections: {
        analysisMethodology: 'Error occurred during analysis',
        similarProjects: [],
        detailedFindings: 'Analysis failed',
        predictionRationale: 'Unable to generate rationale',
        riskFactors: 'Unable to assess risks',
        confidence: 'LOW',
      },
      query: {
        generatedSql: 'Error',
        executionResults: 'Error',
      },
    };
  }
}

// Helper functions for parsing
function extractValue(text, regex) {
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

function extractSection(text, sectionName) {
  const regex = new RegExp(`${sectionName}[:\\s]*([\\s\\S]*?)(?=\\n\\n|$)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

function extractServices(text) {
  const servicesMatch = text.match(/(?:services|aws)[:\s]*([^\n]+(?:\n[^\n]+)*)/i);
  return servicesMatch ? servicesMatch[1].trim() : null;
}

function parseSimilarProjects(historicalData) {
  return historicalData.slice(0, 5).map(project => ({
    projectName: project.opportunity_name || 'Unknown',
    customer: project.customer_name || 'Unknown',
    region: project.region || 'Unknown',
    totalARR: project.total_arr || 'Unknown',
    topServices: project.top_services || 'Unknown',
  }));
}