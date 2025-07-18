/**
 * Lambda function for Step Functions: Query Generation
 * Wraps the existing invokeBedrockQueryPrompt automation
 */

const invokeBedrockQueryPrompt = require('../automations/invokeBedrockQueryPrompt-v3');

exports.handler = async (event) => {
  console.log('Query Generation Lambda - Event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract parameters from the event
    const { CustomerName, region, closeDate, oppName, oppDescription } = event;
    
    // Validate required parameters
    if (!CustomerName || !region || !closeDate || !oppName || !oppDescription) {
      throw new Error('Missing required parameters for query generation');
    }
    
    // Execute the automation
    const result = await invokeBedrockQueryPrompt.execute({
      CustomerName,
      region,
      closeDate,
      oppName,
      oppDescription
    });
    
    console.log('Query Generation Lambda - Result:', JSON.stringify(result, null, 2));
    
    if (result.status === 'error') {
      throw new Error(result.message);
    }
    
    return {
      status: 'success',
      processResults: result.processResults,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Query Generation Lambda - Error:', error);
    
    return {
      status: 'error',
      message: error.message,
      processResults: JSON.stringify({ sql_query: "SELECT 'Error generating query'" }),
      timestamp: new Date().toISOString()
    };
  }
};