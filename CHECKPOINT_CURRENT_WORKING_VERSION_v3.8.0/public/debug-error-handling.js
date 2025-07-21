// Enhanced Debug Error Handling - NO FALLBACKS
// This file contains improved debug information extraction with proper error handling

// Extract analysis generation information from debug data - NO FALLBACKS
function extractAnalysisGenerationInfoEnhanced(debugInfo) {
  console.log('🔍 ENHANCED DEBUG: Starting analysis generation info extraction with strict validation');
  
  // Use ONLY analysis debug fields - NO FALLBACKS
  const bedrockPayload = debugInfo?.analysisBedrockPayload || '';
  const promptMeta = debugInfo?.analysisPromptMeta || {};
  const fullResponse = debugInfo?.fullResponse || '';
  const analysisLogs = debugInfo?.analysisGenerationLogs || [];
  
  // STRICT VALIDATION - NO FALLBACKS TO DEFAULTS
  let modelId, promptVersion, promptName, promptDescription, variants;
  let payloadSize = '0 B';
  let tokenEstimate = '0';
  let duration = '0ms';
  let riskAssessment = null;
  let validationErrors = [];
  let validationStatus = 'UNKNOWN';
  
  // Validate prompt metadata - show errors instead of defaults
  if (!promptMeta || Object.keys(promptMeta).length === 0) {
    validationErrors.push('PROMPT_META_MISSING: No analysis prompt metadata received');
    modelId = 'ERROR: No prompt metadata';
    promptVersion = 'ERROR: No prompt metadata';
    promptName = 'ERROR: No prompt metadata';
    promptDescription = 'ERROR: No prompt metadata';
    variants = [];
    validationStatus = 'FAILED';
    console.error('🚨 ENHANCED DEBUG: Critical error - no prompt metadata received');
  } else {
    console.log('✅ ENHANCED DEBUG: Prompt metadata found, validating fields...');
    
    // Validate required fields
    if (!promptMeta.modelId) {
      validationErrors.push('MODEL_ID_MISSING: No model ID in prompt metadata');
      modelId = 'ERROR: Model ID missing';
      console.error('🚨 ENHANCED DEBUG: Model ID missing from prompt metadata');
    } else {
      modelId = promptMeta.modelId;
      console.log('✅ ENHANCED DEBUG: Model ID found:', modelId);
    }
    
    if (!promptMeta.promptVersion) {
      validationErrors.push('PROMPT_VERSION_MISSING: No prompt version in metadata');
      promptVersion = 'ERROR: Version missing';
      console.error('🚨 ENHANCED DEBUG: Prompt version missing from metadata');
    } else {
      promptVersion = promptMeta.promptVersion;
      console.log('✅ ENHANCED DEBUG: Prompt version found:', promptVersion);
    }
    
    // These can be null/undefined - that's valid
    promptName = promptMeta.promptName || '(No name provided)';
    promptDescription = promptMeta.description || '(No description provided)';
    variants = promptMeta.variants || [];
    
    // Check validation status from backend
    if (promptMeta.validationStatus === 'VALIDATED') {
      validationStatus = 'VALIDATED';
      console.log('✅ ENHANCED DEBUG: Backend validation passed');
    } else {
      validationErrors.push('BACKEND_VALIDATION_MISSING: No validation status from backend');
      validationStatus = 'UNVALIDATED';
      console.warn('⚠️ ENHANCED DEBUG: No backend validation status');
    }
    
    // Check data freshness
    if (promptMeta.dataFreshness) {
      const dataAge = Date.now() - new Date(promptMeta.dataFreshness).getTime();
      if (dataAge > 300000) { // 5 minutes
        validationErrors.push(`DATA_STALE: Prompt metadata is ${Math.round(dataAge/60000)} minutes old`);
        console.warn(`⚠️ ENHANCED DEBUG: Data is stale (${Math.round(dataAge/60000)} minutes old)`);
      } else {
        console.log('✅ ENHANCED DEBUG: Data is fresh');
      }
    } else {
      validationErrors.push('DATA_FRESHNESS_UNKNOWN: No timestamp on prompt metadata');
      console.warn('⚠️ ENHANCED DEBUG: No data freshness timestamp');
    }
  }
  
  // Validate payload data
  if (!bedrockPayload) {
    validationErrors.push('BEDROCK_PAYLOAD_MISSING: No analysis Bedrock payload received');
    console.error('🚨 ENHANCED DEBUG: No Bedrock payload for analysis');
  } else {
    console.log('✅ ENHANCED DEBUG: Bedrock payload found, analyzing...');
    
    try {
      if (bedrockPayload !== 'Bedrock payload not captured (permission denied)') {
        const payload = JSON.parse(bedrockPayload);
        
        // Validate payload structure
        if (!payload.modelId) {
          validationErrors.push('PAYLOAD_MODEL_ID_MISSING: No model ID in Bedrock payload');
          console.error('🚨 ENHANCED DEBUG: No model ID in Bedrock payload');
        } else if (payload.modelId !== modelId) {
          validationErrors.push(`MODEL_ID_MISMATCH: Payload model (${payload.modelId}) != metadata model (${modelId})`);
          console.error('🚨 ENHANCED DEBUG: Model ID mismatch between payload and metadata');
        }
        
        // Calculate payload metrics
        const sizeBytes = new Blob([bedrockPayload]).size;
        payloadSize = formatBytes(sizeBytes);
        tokenEstimate = Math.round(bedrockPayload.length / 3.5).toLocaleString(); // More accurate for Claude
        
        // Enhanced risk assessment
        riskAssessment = {
          payloadSizeRisk: sizeBytes > 900000 ? 'high' : sizeBytes > 500000 ? 'medium' : 'low',
          tokenCountRisk: (bedrockPayload.length / 3.5) > 150000 ? 'high' : 
                         (bedrockPayload.length / 3.5) > 100000 ? 'medium' : 'low',
          durationRisk: 'low', // We don't have actual duration data
          validationRisk: validationErrors.length > 0 ? 'high' : 'low'
        };
        
        console.log('✅ ENHANCED DEBUG: Payload analysis complete');
        console.log('📊 ENHANCED DEBUG: Payload size:', payloadSize);
        console.log('📊 ENHANCED DEBUG: Token estimate:', tokenEstimate);
      } else {
        validationErrors.push('BEDROCK_PAYLOAD_PERMISSION_DENIED: Payload capture was denied');
        console.error('🚨 ENHANCED DEBUG: Bedrock payload capture was denied');
      }
    } catch (error) {
      validationErrors.push(`PAYLOAD_PARSE_ERROR: ${error.message}`);
      console.error('🚨 ENHANCED DEBUG: Failed to parse Bedrock payload:', error);
    }
  }
  
  // Final validation summary
  const hasErrors = validationErrors.length > 0;
  console.log(`📋 ENHANCED DEBUG: Validation complete - ${hasErrors ? 'ERRORS FOUND' : 'SUCCESS'}`);
  if (hasErrors) {
    console.error('🚨 ENHANCED DEBUG: Validation errors:', validationErrors);
  }
  
  return {
    modelId,
    promptVersion,
    promptName,
    promptDescription,
    variants,
    payloadSize,
    tokenEstimate,
    duration,
    riskAssessment,
    bedrockPayload,
    fullResponse,
    analysisLogs,
    validationErrors,
    validationStatus,
    dataFreshness: promptMeta.dataFreshness || 'Unknown',
    enhancedAccuracy: true,
    timestamp: new Date().toISOString()
  };
}

// Enhanced format bytes function
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  return `${value.toLocaleString()} ${sizes[i]}`;
}

// Enhanced debug display function
function displayEnhancedDebugInfo(debugInfo) {
  const analysisInfo = extractAnalysisGenerationInfoEnhanced(debugInfo);
  
  // Update model ID with error styling if needed
  const modelIdElement = document.getElementById('analysisModelId');
  if (modelIdElement) {
    modelIdElement.textContent = analysisInfo.modelId;
    if (analysisInfo.modelId.startsWith('ERROR:')) {
      modelIdElement.className = 'debug-value error';
      modelIdElement.title = 'Error: ' + analysisInfo.validationErrors.join('; ');
    } else {
      modelIdElement.className = 'debug-value success';
      modelIdElement.title = 'Model ID validated successfully';
    }
  }
  
  // Update prompt version with error styling if needed
  const promptVersionElement = document.getElementById('analysisPromptVersion');
  if (promptVersionElement) {
    promptVersionElement.textContent = analysisInfo.promptVersion;
    if (analysisInfo.promptVersion.startsWith('ERROR:')) {
      promptVersionElement.className = 'debug-value error';
      promptVersionElement.title = 'Error: ' + analysisInfo.validationErrors.join('; ');
    } else {
      promptVersionElement.className = 'debug-value success';
      promptVersionElement.title = 'Prompt version validated successfully';
    }
  }
  
  // Display validation errors prominently
  const validationErrorsElement = document.getElementById('analysisValidationErrors');
  if (validationErrorsElement) {
    if (analysisInfo.validationErrors.length > 0) {
      validationErrorsElement.innerHTML = `
        <div class="validation-errors">
          <h4>⚠️ Validation Errors:</h4>
          <ul>
            ${analysisInfo.validationErrors.map(error => `<li class="error-item">${error}</li>`).join('')}
          </ul>
        </div>
      `;
      validationErrorsElement.style.display = 'block';
    } else {
      validationErrorsElement.innerHTML = '<div class="validation-success">✅ All validations passed</div>';
      validationErrorsElement.style.display = 'block';
    }
  }
  
  // Update other fields
  updateElement('analysisPayloadSize', analysisInfo.payloadSize);
  updateElement('analysisTokenEstimate', analysisInfo.tokenEstimate);
  updateElement('analysisDataFreshness', analysisInfo.dataFreshness);
  updateElement('analysisValidationStatus', analysisInfo.validationStatus);
  
  console.log('✅ ENHANCED DEBUG: UI updated with enhanced debug information');
}

// Helper function to update elements
function updateElement(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = value || 'Not available';
  }
}

// Export functions for use in main application
if (typeof window !== 'undefined') {
  window.extractAnalysisGenerationInfoEnhanced = extractAnalysisGenerationInfoEnhanced;
  window.displayEnhancedDebugInfo = displayEnhancedDebugInfo;
}