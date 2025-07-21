/**
 * Shared utilities for AWS Opportunity Analysis Lambda functions
 */

/**
 * Convert various date formats to standard ISO format
 * Handles nanoseconds, milliseconds, seconds, and string dates
 */
function convertDateFormat(dateValue) {
    if (!dateValue) return null;
    
    try {
        // Handle nanoseconds (19 digits)
        if (typeof dateValue === 'number' && dateValue.toString().length >= 19) {
            return new Date(dateValue / 1000000).toISOString().split('T')[0];
        }
        
        // Handle milliseconds (13 digits)
        if (typeof dateValue === 'number' && dateValue.toString().length >= 13) {
            return new Date(dateValue).toISOString().split('T')[0];
        }
        
        // Handle seconds (10 digits)
        if (typeof dateValue === 'number' && dateValue.toString().length >= 10) {
            return new Date(dateValue * 1000).toISOString().split('T')[0];
        }
        
        // Handle string dates
        if (typeof dateValue === 'string') {
            return new Date(dateValue).toISOString().split('T')[0];
        }
        
        return dateValue;
    } catch (error) {
        console.warn('Error converting date:', dateValue, error);
        return dateValue;
    }
}

/**
 * Process historical project data for analysis
 * Standardizes date formats and numeric fields
 */
function processHistoricalData(historicalData) {
    if (!Array.isArray(historicalData)) {
        return [];
    }
    
    return historicalData.map(project => {
        const processedProject = { ...project };
        
        // Convert close_date to historical_opportunity_won_date
        if (project.close_date) {
            processedProject.historical_opportunity_won_date = convertDateFormat(project.close_date);
        }
        
        // Process other date fields
        if (project.planned_delivery_start_date) {
            processedProject.planned_delivery_start_date = convertDateFormat(project.planned_delivery_start_date);
        }
        
        if (project.planned_delivery_end_date) {
            processedProject.planned_delivery_end_date = convertDateFormat(project.planned_delivery_end_date);
        }
        
        // Ensure numeric fields are properly formatted
        if (project.total_arr) {
            processedProject.total_arr = parseFloat(project.total_arr) || 0;
        }
        
        if (project.total_mrr) {
            processedProject.total_mrr = parseFloat(project.total_mrr) || 0;
        }
        
        if (project.stated_historical_arr) {
            processedProject.stated_historical_arr = parseFloat(project.stated_historical_arr) || 0;
        }
        
        return processedProject;
    });
}

/**
 * Validate opportunity details input
 */
function validateOpportunityDetails(opportunityDetails) {
    const errors = [];
    
    if (!opportunityDetails) {
        errors.push('Opportunity details are required');
        return errors;
    }
    
    if (!opportunityDetails.customerName || opportunityDetails.customerName.trim() === '') {
        errors.push('Customer name is required');
    }
    
    if (!opportunityDetails.region || opportunityDetails.region.trim() === '') {
        errors.push('Region is required');
    }
    
    if (!opportunityDetails.opportunityName || opportunityDetails.opportunityName.trim() === '') {
        errors.push('Opportunity name is required');
    }
    
    if (!opportunityDetails.description || opportunityDetails.description.trim() === '') {
        errors.push('Opportunity description is required');
    }
    
    // Validate date format if provided
    if (opportunityDetails.closeDate) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$|^\d{1,2}\/\d{1,2}\/\d{4}$/;
        if (!dateRegex.test(opportunityDetails.closeDate)) {
            errors.push('Close date must be in YYYY-MM-DD or MM/DD/YYYY format');
        }
    }
    
    return errors;
}

/**
 * Create standardized error response
 */
function createErrorResponse(statusCode, error, functionName = null) {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
        },
        body: JSON.stringify({
            success: false,
            error: {
                code: `ERROR_${statusCode}`,
                message: error.message || error,
                details: error.stack || null,
                timestamp: new Date().toISOString(),
                function: functionName
            }
        })
    };
}

/**
 * Create standardized success response
 */
function createSuccessResponse(data, statusCode = 200) {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
        },
        body: JSON.stringify({
            success: true,
            data: data,
            timestamp: new Date().toISOString()
        })
    };
}

/**
 * Parse Athena query results into structured data
 */
function parseAthenaResults(resultSet) {
    if (!resultSet || !resultSet.Rows || resultSet.Rows.length === 0) {
        return [];
    }
    
    // First row contains headers
    const headers = resultSet.Rows[0].Data.map(col => col.VarCharValue);
    
    // Remaining rows contain data
    const dataRows = resultSet.Rows.slice(1);
    
    return dataRows.map(row => {
        const rowData = {};
        row.Data.forEach((col, index) => {
            rowData[headers[index]] = col.VarCharValue;
        });
        return rowData;
    });
}

/**
 * Wait for a specified amount of time
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (attempt === maxRetries) {
                throw error;
            }
            
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.log(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
            await sleep(delay);
        }
    }
    
    throw lastError;
}

module.exports = {
    convertDateFormat,
    processHistoricalData,
    validateOpportunityDetails,
    createErrorResponse,
    createSuccessResponse,
    parseAthenaResults,
    sleep,
    retryWithBackoff
};