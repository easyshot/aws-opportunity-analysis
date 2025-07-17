/**
 * Lambda function for Step Functions: Data Retrieval
 * Wraps the existing InvLamFilterAut automation
 */

const InvLamFilterAut = require('../automations/InvLamFilterAut-v3');

exports.handler = async (event) => {
  console.log('Data Retrieval Lambda - Event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract query from the event
    const { query } = event;
    
    if (!query) {
      throw new Error('Missing query parameter for data retrieval');
    }
    
    // Execute the automation
    const result = await InvLamFilterAut.execute({ query });
    
    console.log('Data Retrieval Lambda - Result:', JSON.stringify(result, null, 2));
    
    if (result.status === 'error') {
      throw new Error(result.message);
    }
    
    return {
      status: 'success',
      processResults: result.processResults,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Data Retrieval Lambda - Error:', error);
    
    return {
      status: 'error',
      message: error.message,
      processResults: '[]',
      timestamp: new Date().toISOString()
    };
  }
};