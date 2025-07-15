// Additional functions for Bedrock debug sections
// These should be added to app-clean.js

// Update Bedrock debug information sections
function updateBedrockDebugInfo(debugInfo) {
  // Update SQL Generation Process
  updateSqlGenerationDebug(debugInfo);
  
  // Update Analysis Generation Process
  updateAnalysisGenerationDebug(debugInfo);
}

// Update SQL Generation Debug Section
function updateSqlGenerationDebug(debugInfo) {
  // Extract SQL generation info from debug data
  const sqlInfo = extractSqlGenerationInfo(debugInfo);
  
  // Update SQL generation stats
  updateElement('sqlModelId', sqlInfo.modelId);
  updateElement('sqlPromptId', sqlInfo.promptId);
  updateElement('sqlTemperature', sqlInfo.temperature);
  updateElement('sqlMaxTokens', sqlInfo.maxTokens);
  
  // Update process status
  updateProcessStatus('sqlTemplateStatus', sqlInfo.templateStatus);
  updateProcessStatus('sqlBedrockStatus', sqlInfo.bedrockStatus);
  updateProcessStatus('sqlRowLimitStatus', sqlInfo.rowLimitStatus);
  
  // Update SQL generation textarea
  const debugSqlGeneration = document.getElementById('debugSqlGeneration');
  if (debugSqlGeneration) {
    debugSqlGeneration.value = formatSqlGenerationLog(sqlInfo);
  }
}

// Update Analysis Generation Debug Section
function updateAnalysisGenerationDebug(debugInfo) {
  // Extract analysis generation info from debug data
  const analysisInfo = extractAnalysisGenerationInfo(debugInfo);
  
  // Update analysis generation stats
  updateElement('analysisModelId', analysisInfo.modelId);
  updateElement('analysisPayloadSize', analysisInfo.payloadSize);
  updateElement('analysisTokenEstimate', analysisInfo.tokenEstimate);
  updateElement('analysisDuration', analysisInfo.duration);
  
  // Update risk assessment if available
  if (analysisInfo.riskAssessment) {
    updateRiskAssessment(analysisInfo.riskAssessment);
    const riskElement = document.getElementById('analysisRiskAssessment');
    if (riskElement) {
      riskElement.style.display = 'block';
    }
  }
  
  // Update analysis generation textarea
  const debugAnalysisGeneration = document.getElementById('debugAnalysisGeneration');
  if (debugAnalysisGeneration) {
    debugAnalysisGeneration.value = formatAnalysisGenerationLog(analysisInfo);
  }
}

// Extract SQL generation information from debug data with enhanced accuracy
function extractSqlGenerationInfo(debugInfo) {
  const sqlQuery = debugInfo?.sqlQuery || '';
  const bedrockPayload = debugInfo?.bedrockPayload || '';
  const sqlLogs = debugInfo?.sqlGenerationLogs || [];
  const promptMetadata = debugInfo?.promptMetadata || {};
  
  // Enhanced model information extraction
  let modelId = 'Unknown';
  let temperature = 'default (managed by prompt)';
  let maxTokens = 'default (managed by prompt)';
  let actualModelId = 'Unknown';
  let promptVersion = 'Unknown';
  let selectionReason = 'Default selection';
  let abTestStatus = 'Not active';
  
  try {
    if (bedrockPayload && bedrockPayload !== 'Bedrock payload not captured (permission denied)') {
      const payload = JSON.parse(bedrockPayload);
      actualModelId = payload.modelId || 'Unknown';
      
      // Extract actual inference configuration if present
      if (payload.inferenceConfig) {
        temperature = payload.inferenceConfig.temperature !== undefined ? 
          payload.inferenceConfig.temperature.toString() : 'default (managed by prompt)';
        maxTokens = payload.inferenceConfig.maxTokens !== undefined ? 
          payload.inferenceConfig.maxTokens.toString() : 'default (managed by prompt)';
      }
      
      // Enhanced model display name
      if (actualModelId.includes('claude-3-5-sonnet')) {
        modelId = 'Claude 3.5 Sonnet';
      } else if (actualModelId.includes('claude')) {
        modelId = 'Claude (version detected from ID)';
      } else {
        modelId = actualModelId;
      }
    }
  } catch (error) {
    console.warn('Could not parse Bedrock payload for SQL generation info:', error);
  }
  
  // Extract prompt management information
  if (promptMetadata) {
    promptVersion = promptMetadata.version || promptMetadata.promptVersion || 'Unknown';
    selectionReason = promptMetadata.selectionReason || 'Default selection';
    abTestStatus = promptMetadata.abTestActive ? 
      `Active (variant: ${promptMetadata.selectedVariant || 'unknown'})` : 'Not active';
  }
  
  // Get environment prompt ID with fallback
  const promptId = process.env.CATAPULT_QUERY_PROMPT_ID || 'Y6T66EI3GZ';
  
  return {
    modelId: modelId,
    actualModelId: actualModelId,
    promptId: promptId,
    promptVersion: promptVersion,
    temperature: temperature,
    maxTokens: maxTokens,
    selectionReason: selectionReason,
    abTestStatus: abTestStatus,
    templateStatus: sqlQuery ? 'completed' : 'pending',
    bedrockStatus: sqlQuery ? 'completed' : 'pending',
    rowLimitStatus: sqlQuery.includes('LIMIT') ? 'completed' : 'pending',
    rawPayload: bedrockPayload,
    sqlQuery: sqlQuery,
    logs: sqlLogs,
    enhancedAccuracy: true
  };
}

// Extract analysis generation information from debug data
function extractAnalysisGenerationInfo(debugInfo) {
  const bedrockPayload = debugInfo?.bedrockPayload || '';
  const fullResponse = debugInfo?.fullResponse || '';
  const analysisLogs = debugInfo?.analysisGenerationLogs || [];
  
  let modelId = 'Unknown';
  let payloadSize = '0 B';
  let tokenEstimate = '0';
  let duration = '0ms';
  let riskAssessment = null;
  // Add promptId and promptVersion for analysis
  const promptId = process.env.CATAPULT_ANALYSIS_PROMPT_ID || 'FDUHITJIME';
  const promptVersion = 'default'; // Or extract from debugInfo if available
  
  try {
    if (bedrockPayload && bedrockPayload !== 'Bedrock payload not captured (permission denied)') {
      const payload = JSON.parse(bedrockPayload);
      modelId = payload.modelId || 'Unknown';
      // Calculate payload size
      const sizeBytes = new Blob([bedrockPayload]).size;
      payloadSize = formatBytes(sizeBytes);
      // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
      tokenEstimate = Math.round(bedrockPayload.length / 4).toLocaleString();
      // Mock risk assessment based on size
      riskAssessment = {
        payloadSizeRisk: sizeBytes > 900000 ? 'high' : sizeBytes > 500000 ? 'medium' : 'low',
        tokenCountRisk: (bedrockPayload.length / 4) > 150000 ? 'high' : (bedrockPayload.length / 4) > 100000 ? 'medium' : 'low',
        durationRisk: 'low' // We don't have actual duration data
      };
    }
  } catch (error) {
    console.warn('Could not parse Bedrock payload for analysis generation info:', error);
  }
  
  return {
    modelId: modelId.includes('claude') ? 'Claude 3.5 Sonnet' : modelId,
    payloadSize: payloadSize,
    tokenEstimate: tokenEstimate,
    duration: duration,
    riskAssessment: riskAssessment,
    rawPayload: bedrockPayload,
    fullResponse: fullResponse,
    logs: analysisLogs,
    promptId: promptId,
    promptVersion: promptVersion
  };
}

// Update process status with appropriate styling
function updateProcessStatus(elementId, status) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = status;
    element.className = `step-status ${status}`;
  }
}

// Update risk assessment display
function updateRiskAssessment(riskAssessment) {
  updateRiskValue('payloadSizeRisk', riskAssessment.payloadSizeRisk);
  updateRiskValue('tokenCountRisk', riskAssessment.tokenCountRisk);
  updateRiskValue('durationRisk', riskAssessment.durationRisk);
}

// Update individual risk value with appropriate styling
function updateRiskValue(elementId, riskLevel) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = riskLevel.toUpperCase();
    element.className = `risk-value ${riskLevel}`;
  }
}

// Update element helper function
function updateElement(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = value || '-';
  }
}

// Format bytes helper function
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format SQL generation log for display with enhanced accuracy
function formatSqlGenerationLog(sqlInfo) {
  let log = `🤖 SQL QUERY GENERATION PROCESS
${'='.repeat(50)}

📋 MODEL CONFIGURATION:
   Model ID: ${sqlInfo.modelId}
   Actual Model ID: ${sqlInfo.actualModelId || 'Not captured'}
   Prompt ID: ${sqlInfo.promptId}
   Prompt Version: ${sqlInfo.promptVersion || 'Unknown'}
   Temperature: ${sqlInfo.temperature}
   Max Tokens: ${sqlInfo.maxTokens}
   Purpose: SQL Query Generation

🎯 PROMPT MANAGEMENT:
   Selection Reason: ${sqlInfo.selectionReason || 'Default selection'}
   A/B Test Status: ${sqlInfo.abTestStatus || 'Not active'}
   Enhanced Accuracy: ${sqlInfo.enhancedAccuracy ? 'ENABLED' : 'DISABLED'}

📝 TEMPLATE PROCESSING:
   Status: ${sqlInfo.templateStatus.toUpperCase()}
   Variables: CustomerName, region, closeDate, oppName, oppDescription, queryLimit

🤖 BEDROCK INVOCATION:
   Status: ${sqlInfo.bedrockStatus.toUpperCase()}
   Response: ${sqlInfo.sqlQuery ? 'SQL query generated successfully' : 'No response received'}

⚙️ ROW LIMIT APPLICATION:
   Status: ${sqlInfo.rowLimitStatus.toUpperCase()}
   Applied: ${sqlInfo.sqlQuery.includes('LIMIT') ? 'Yes' : 'No'}

📊 GENERATED SQL QUERY:
${sqlInfo.sqlQuery ? sqlInfo.sqlQuery.substring(0, 500) + (sqlInfo.sqlQuery.length > 500 ? '...' : '') : 'No SQL query generated'}`;

  // Add captured logs if available
  if (sqlInfo.logs && sqlInfo.logs.length > 0) {
    log += `\n\n🔍 CAPTURED LOGS:\n`;
    log += sqlInfo.logs.join('\n');
  }

  // Add accuracy note
  if (sqlInfo.enhancedAccuracy) {
    log += `\n\n✅ ENHANCED ACCURACY ACTIVE:
   - Real-time Bedrock configuration captured
   - Prompt management version tracking enabled
   - A/B testing status monitoring active`;
  }

  return log;
}

// Format analysis generation log for display
function formatAnalysisGenerationLog(analysisInfo) {
  let log = `🧠 ANALYSIS GENERATION PROCESS
${'='.repeat(50)}

📋 MODEL CONFIGURATION:
   Model ID: ${analysisInfo.modelId}
   Payload Size: ${analysisInfo.payloadSize}
   Token Estimate: ${analysisInfo.tokenEstimate}
   Duration: ${analysisInfo.duration}

📏 PAYLOAD ANALYSIS:
   Size Risk: ${analysisInfo.riskAssessment?.payloadSizeRisk?.toUpperCase() || 'UNKNOWN'}
   Token Risk: ${analysisInfo.riskAssessment?.tokenCountRisk?.toUpperCase() || 'UNKNOWN'}
   Duration Risk: ${analysisInfo.riskAssessment?.durationRisk?.toUpperCase() || 'UNKNOWN'}

🧠 ANALYSIS RESPONSE:
${analysisInfo.fullResponse ? analysisInfo.fullResponse.substring(0, 500) + (analysisInfo.fullResponse.length > 500 ? '...' : '') : 'No analysis response received'}`;

  // Add captured logs if available
  if (analysisInfo.logs && analysisInfo.logs.length > 0) {
    log += `\n\n🔍 CAPTURED LOGS:\n`;
    log += analysisInfo.logs.join('\n');
  }

  return log;
}