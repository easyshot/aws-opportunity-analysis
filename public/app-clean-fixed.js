// Clean AWS Opportunity Analysis Frontend - Fixed Version
document.addEventListener('DOMContentLoaded', () => {
  // Restore theme from localStorage or default to light
  const storedTheme = localStorage.getItem('theme-preference');
  const initialTheme = storedTheme === 'dark' ? 'dark' : 'light';
  document.body.setAttribute('data-theme', initialTheme);
  document.documentElement.setAttribute('data-theme', initialTheme);

  console.log('🚀 App initialization started');

  // DOM elements
  const opportunityForm = document.getElementById('opportunityForm');
  const analyzeButton = document.getElementById('analyzeBtn');
  const resultsSection = document.getElementById('detailedAnalysis');
  const additionalSections = document.getElementById('additionalSections');
  const debugSection = document.getElementById('debugSection');
  const progressSection = document.getElementById('progressSection');
  
  // Output elements for projections
  const predictedArr = document.getElementById('predictedArr');
  const predictedMrr = document.getElementById('predictedMrr');
  const launchDate = document.getElementById('launchDate');
  const timeToLaunch = document.getElementById('timeToLaunch');
  const confidenceScore = document.getElementById('confidenceScore');
  const confidenceLabel = document.getElementById('confidenceLabel');
  const confidenceFill = document.getElementById('confidenceFill');
  const topServices = document.getElementById('topServices');
  
  // Output elements for analysis sections
  const methodology = document.getElementById('methodology');
  const findings = document.getElementById('findings');
  const rationale = document.getElementById('rationale');
  const riskFactors = document.getElementById('riskFactors');
  const similarProjects = document.getElementById('similarProjects');
  const fullAnalysis = document.getElementById('fullAnalysis');
  const fundingOptions = document.getElementById('fundingOptions');
  const followOnOpportunities = document.getElementById('followOnOpportunities');
  
  // Debug elements
  const debugSqlQuery = document.getElementById('debugSqlQuery');
  const debugQueryResults = document.getElementById('debugQueryResults');
  const debugBedrockPayload = document.getElementById('debugBedrockPayload');
  const debugFullResponse = document.getElementById('debugFullResponse');

  // Utility to format bytes as human-readable string
  function formatBytes(bytes) {
    if (bytes === 0 || bytes === '-' || bytes == null || isNaN(bytes)) return '-';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Initialize the application
  function initializeApp() {
    console.log('🔧 Setting up event listeners');
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    setupEventListeners();
    updateCompletionStatus();
    console.log('✅ App initialization complete');
  }

  // Update current time
  function updateCurrentTime() {
    const currentTimeElement = document.getElementById('currentTime');
    if (currentTimeElement) {
      const now = new Date();
      currentTimeElement.textContent = now.toLocaleString();
    }
  }

  // Setup event listeners
  function setupEventListeners() {
    // Character counter for description
    const descriptionField = document.getElementById('description');
    if (descriptionField) {
      descriptionField.addEventListener('input', updateCharCounter);
    }

    // Form validation
    if (opportunityForm) {
      opportunityForm.addEventListener('input', updateCompletionStatus);
    }

    // Analysis button
    if (analyzeButton) {
      analyzeButton.addEventListener('click', analyzeOpportunity);
      console.log('✅ Analyze button event listener attached');
    } else {
      console.log('❌ Analyze button not found');
    }

    // Clear button
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearForm);
      console.log('✅ Clear button event listener attached');
    }

    // Sample button
    const sampleBtn = document.getElementById('sampleBtn');
    if (sampleBtn) {
      sampleBtn.addEventListener('click', loadSampleData);
      console.log('✅ Sample button event listener attached');
    }

    // Theme toggle
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', toggleTheme);
      console.log('✅ Theme toggle event listener attached');
    }

    // Export button
    const exportBtn = document.querySelector('.action-btn.export');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportData);
    }

    // Print button
    const printBtn = document.querySelector('.action-btn.print');
    if (printBtn) {
      printBtn.addEventListener('click', printReport);
    }

    // Debug toggle
    const debugToggle = document.querySelector('.debug-toggle');
    if (debugToggle) {
      debugToggle.addEventListener('click', toggleDebugSection);
    }
  }

  // Update character counter
  function updateCharCounter() {
    const descriptionField = document.getElementById('description');
    const charCounter = document.getElementById('charCounter');
    if (descriptionField && charCounter) {
      const count = descriptionField.value.length;
      charCounter.textContent = count + ' characters';
    }
  }

  // Update completion status
  function updateCompletionStatus() {
    if (!opportunityForm) return;
    
    const requiredFields = opportunityForm.querySelectorAll('[required]');
    const filledFields = Array.from(requiredFields).filter(field => field.value.trim() !== '');
    const completionPercentage = Math.round((filledFields.length / requiredFields.length) * 100);
    
    const statusText = document.querySelector('#completionStatus .status-text');
    if (statusText) {
      statusText.textContent = completionPercentage + '% Complete';
    }
    
    const statusFill = document.getElementById('statusFill');
    if (statusFill) {
      statusFill.style.width = completionPercentage + '%';
    }
  }

  // Get form data
  function getFormData() {
    return {
      CustomerName: document.getElementById('customerName')?.value?.trim() || '',
      region: document.getElementById('region')?.value || '',
      closeDate: document.getElementById('closeDate')?.value || '',
      oppName: document.getElementById('opportunityName')?.value?.trim() || '',
      oppDescription: document.getElementById('description')?.value?.trim() || ''
    };
  }

  // Validate form data
  function validateFormData(formData) {
    const errors = [];
    
    if (!formData.CustomerName) errors.push('Customer Name is required');
    if (!formData.region) errors.push('Customer Region is required');
    if (!formData.closeDate) errors.push('Close Date is required');
    if (!formData.oppName) errors.push('Opportunity Name is required');
    if (!formData.oppDescription) errors.push('Description is required');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get analysis settings
  function getAnalysisSettings() {
    const defaultSettings = {
      sqlQueryLimit: 200,
      truncationLimit: 400000,
      enableTruncation: true,
      analysisTimeout: 120
    };

    if (window.settingsManager) {
      const settings = window.settingsManager.getSettings();
      return {
        sqlQueryLimit: settings.dataProcessing?.sqlQueryLimit || defaultSettings.sqlQueryLimit,
        truncationLimit: settings.dataProcessing?.truncationLimit || defaultSettings.truncationLimit,
        enableTruncation: settings.dataProcessing?.enableTruncation !== false,
        analysisTimeout: settings.performance?.analysisTimeout || defaultSettings.analysisTimeout
      };
    }

    return defaultSettings;
  }

  // Show error message
  function showError(message) {
    alert('Error: ' + message);
    console.error('Error:', message);
  }

  // Show loading state
  function showLoading() {
    if (analyzeButton) {
      analyzeButton.disabled = true;
      analyzeButton.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Analyzing...</span>';
    }
  }

  // Hide loading state
  function hideLoading() {
    if (analyzeButton) {
      analyzeButton.disabled = false;
      analyzeButton.innerHTML = '<span class="btn-icon">🔍</span><span class="btn-text">Analyze Opportunity</span>';
    }
  }

  // Show progress
  function showProgress() {
    if (progressSection) {
      progressSection.style.display = 'block';
    }
  }

  // Hide progress
  function hideProgress() {
    setTimeout(() => {
      if (progressSection) {
        progressSection.style.display = 'none';
      }
    }, 2000);
  }

  // Main analysis function
  async function analyzeOpportunity() {
    console.log('🔍 Starting analysis...');
    
    try {
      const formData = getFormData();
      const validation = validateFormData(formData);
      
      if (!validation.isValid) {
        showError('Please fill in all required fields: ' + validation.errors.join(', '));
        return;
      }
      
      showLoading();
      showProgress();
      
      const settings = getAnalysisSettings();
      console.log('Using analysis settings:', settings);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SQL-Query-Limit': settings.sqlQueryLimit.toString(),
          'X-Truncation-Limit': settings.truncationLimit.toString(),
          'X-Enable-Truncation': settings.enableTruncation.toString()
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error('HTTP error! status: ' + response.status);
      }
      
      const results = await response.json();
      console.log('Analysis results:', results);
      
      populateUI(results);
      
    } catch (error) {
      console.error('Analysis error:', error);
      showError('Analysis failed: ' + error.message);
    } finally {
      hideLoading();
      hideProgress();
    }
  }

  // Clear form
  function clearForm() {
    console.log('🧹 Clearing form...');
    if (opportunityForm) {
      opportunityForm.reset();
    }
    clearUIFields();
    updateCompletionStatus();
  }

  // Load sample data
  function loadSampleData() {
    console.log('📝 Loading sample data...');
    const sampleData = {
      customerName: 'Acme Corporation',
      region: 'United States',
      closeDate: '2025-06-15',
      opportunityName: 'Cloud Migration Initiative',
      description: 'Large enterprise customer looking to migrate their on-premises infrastructure to AWS cloud services. They need compute, storage, database, and networking solutions with high availability and disaster recovery capabilities. The project involves migrating 200+ servers and supporting 10,000+ users across multiple geographic locations.'
    };
    
    Object.keys(sampleData).forEach(key => {
      const element = document.getElementById(key);
      if (element) {
        element.value = sampleData[key];
      }
    });
    
    updateCompletionStatus();
    updateCharCounter();
  }

  // Toggle theme
  function toggleTheme() {
    console.log('🎨 Toggling theme...');
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme-preference', newTheme);
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
      const icon = themeToggle.querySelector('.icon');
      const text = themeToggle.querySelector('.theme-text');
      if (icon && text) {
        icon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        text.textContent = newTheme === 'dark' ? 'Light' : 'Dark';
      }
    }
    console.log('Theme switched to:', newTheme);
  }

  // Clear UI fields
  function clearUIFields() {
    // Clear projections
    if (predictedArr) predictedArr.textContent = '-';
    if (predictedMrr) predictedMrr.textContent = '-';
    if (launchDate) launchDate.textContent = '-';
    if (timeToLaunch) timeToLaunch.textContent = '-';
    if (confidenceScore) confidenceScore.textContent = '-';
    if (confidenceLabel) confidenceLabel.textContent = '-';
    if (confidenceFill) confidenceFill.style.width = '0%';
    
    // Clear analysis sections
    const loadingText = '<div class="loading-state">Content will appear after analysis...</div>';
    if (methodology) methodology.innerHTML = loadingText;
    if (findings) findings.innerHTML = loadingText;
    if (rationale) rationale.innerHTML = loadingText;
    if (riskFactors) riskFactors.innerHTML = loadingText;
    if (similarProjects) similarProjects.innerHTML = loadingText;
    if (fullAnalysis) fullAnalysis.innerHTML = loadingText;
    if (fundingOptions) fundingOptions.innerHTML = loadingText;
    if (followOnOpportunities) followOnOpportunities.innerHTML = loadingText;
    
    // Clear debug sections
    if (debugSqlQuery) debugSqlQuery.value = '';
    if (debugQueryResults) debugQueryResults.value = '';
    if (debugBedrockPayload) debugBedrockPayload.value = '';
    if (debugFullResponse) debugFullResponse.value = '';
  }

  // Format currency
  function formatCurrency(amount) {
    if (!amount) return '-';
    const cleanAmount = amount.toString().replace(/[$,]/g, '');
    const num = parseFloat(cleanAmount);
    if (isNaN(num)) return amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  }

  // Format date
  function formatDate(dateString) {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
      });
    } catch (e) {
      return dateString;
    }
  }

  // Get confidence label
  function getConfidenceLabel(confidence) {
    if (typeof confidence === 'number') {
      if (confidence >= 80) return 'High';
      if (confidence >= 60) return 'Medium';
      return 'Low';
    }
    
    if (typeof confidence === 'string') {
      const upper = confidence.toUpperCase();
      if (upper === 'HIGH') return 'High';
      if (upper === 'MEDIUM') return 'Medium';
      if (upper === 'LOW') return 'Low';
      return confidence;
    }
    
    return 'Unknown';
  }

  // Get confidence percentage
  function getConfidencePercentage(confidence) {
    if (typeof confidence === 'number') {
      return Math.min(100, Math.max(0, confidence));
    }
    
    if (typeof confidence === 'string') {
      const upper = confidence.toUpperCase();
      if (upper === 'HIGH') return 85;
      if (upper === 'MEDIUM') return 65;
      if (upper === 'LOW') return 35;
      
      const parsed = parseFloat(confidence);
      if (!isNaN(parsed)) {
        return Math.min(100, Math.max(0, parsed));
      }
    }
    
    return 0;
  }

  // Populate UI with results
  function populateUI(results) {
    try {
      console.log('📊 Populating UI with results:', results);
      
      const metrics = results.metrics;
      if (!metrics) {
        console.error('No metrics found in response');
        return;
      }

      // Populate metrics
      if (predictedArr && metrics.predictedArr) {
        predictedArr.textContent = formatCurrency(metrics.predictedArr);
        console.log('Set predictedArr to:', metrics.predictedArr);
      }
      
      if (predictedMrr && metrics.predictedMrr) {
        predictedMrr.textContent = formatCurrency(metrics.predictedMrr);
        console.log('Set predictedMrr to:', metrics.predictedMrr);
      }
      
      if (launchDate && metrics.launchDate) {
        launchDate.textContent = formatDate(metrics.launchDate);
        console.log('Set launchDate to:', metrics.launchDate);
      }
      
      if (timeToLaunch && metrics.timeToLaunch) {
        timeToLaunch.textContent = metrics.timeToLaunch;
        console.log('Set timeToLaunch to:', metrics.timeToLaunch);
      }
      
      if (confidenceScore && (metrics.confidence || metrics.confidenceScore)) {
        const scoreValue = metrics.confidenceScore || metrics.confidence;
        confidenceScore.textContent = typeof scoreValue === 'number' ? scoreValue : metrics.confidence;
        console.log('Set confidenceScore to:', scoreValue);
      }
      
      if (confidenceLabel && (metrics.confidence || metrics.confidenceScore)) {
        const confValue = metrics.confidence || metrics.confidenceScore;
        confidenceLabel.textContent = getConfidenceLabel(confValue);
        console.log('Set confidenceLabel to:', getConfidenceLabel(confValue));
      }
      
      if (confidenceFill && (metrics.confidence || metrics.confidenceScore)) {
        const confValue = metrics.confidence || metrics.confidenceScore;
        const percentage = getConfidencePercentage(confValue);
        confidenceFill.style.width = percentage + '%';
        console.log('Set confidenceFill to:', percentage + '%');
      }

      // Populate analysis sections
      if (methodology && results.methodology) {
        methodology.innerHTML = '<p>' + results.methodology + '</p>';
      }
      
      if (findings && results.findings) {
        findings.innerHTML = '<p>' + results.findings + '</p>';
      }
      
      if (rationale && results.rationale) {
        rationale.innerHTML = '<p>' + results.rationale + '</p>';
      }
      
      if (riskFactors && results.riskFactors) {
        riskFactors.innerHTML = '<p>' + results.riskFactors + '</p>';
      }
      
      if (similarProjects && results.similarProjects) {
        similarProjects.innerHTML = '<p>' + results.similarProjects + '</p>';
      }
      
      if (fullAnalysis && results.fullAnalysis) {
        fullAnalysis.innerHTML = '<p>' + results.fullAnalysis + '</p>';
      }

      // Show results sections
      if (resultsSection) {
        resultsSection.style.display = 'block';
        console.log('✅ Results section shown');
      }
      
      if (additionalSections) {
        additionalSections.style.display = 'block';
        console.log('✅ Additional sections shown');
      }
      
      if (debugSection) {
        debugSection.style.display = 'block';
        console.log('✅ Debug section shown');
      }

      // Populate debug information
      if (results.debug) {
        if (debugSqlQuery && results.debug.sqlQuery) {
          debugSqlQuery.value = results.debug.sqlQuery;
        }
        
        if (debugQueryResults && results.debug.queryResults) {
          debugQueryResults.value = results.debug.queryResults;
        }
        
        if (debugBedrockPayload && results.debug.bedrockPayload) {
          debugBedrockPayload.value = results.debug.bedrockPayload;
        }
        
        if (debugFullResponse && results.debug.fullResponse) {
          debugFullResponse.value = results.debug.fullResponse;
        }
        // Enhanced debug info
        populateDebugInfo(results);
      }
      
      console.log('✅ UI population complete');
      
    } catch (error) {
      console.error('Error populating UI:', error);
      showError('Error displaying results: ' + error.message);
    }
  }

  // Export data (placeholder)
  function exportData() {
    console.log('📊 Export functionality not implemented yet');
    alert('Export functionality coming soon!');
  }

  // Print report (placeholder)
  function printReport() {
    console.log('🖨️ Print functionality not implemented yet');
    window.print();
  }

  // Toggle debug section
  function toggleDebugSection() {
    if (debugSection) {
      const isVisible = debugSection.style.display !== 'none';
      debugSection.style.display = isVisible ? 'none' : 'block';
      console.log('Debug section toggled:', !isVisible ? 'shown' : 'hidden');
    }
  }

  // Table/Raw Query View Toggle
  function showQueryView(viewType) {
    // Update button states
    const rawBtn = document.getElementById('rawViewBtn');
    const tableBtn = document.getElementById('tableViewBtn');
    if (rawBtn && tableBtn) {
      rawBtn.classList.toggle('active', viewType === 'raw');
      tableBtn.classList.toggle('active', viewType === 'table');
    }
    // Update view visibility
    const rawView = document.getElementById('debugQueryRaw');
    const tableView = document.getElementById('debugQueryTable');
    if (rawView && tableView) {
      rawView.style.display = viewType === 'raw' ? 'block' : 'none';
      tableView.style.display = viewType === 'table' ? 'block' : 'none';
    }
  }
  window.showQueryView = showQueryView;

  // Enhanced Debug Info Population
  function populateDebugInfo(results) {
    const debugSqlQuery = document.getElementById('debugSqlQuery');
    const debugQueryResults = document.getElementById('debugQueryResults');
    const debugBedrockPayload = document.getElementById('debugBedrockPayload');
    const debugFullResponse = document.getElementById('debugFullResponse');
    let queryResults = '';
    let bedrockPayload = '';
    if (debugSqlQuery) {
      const sqlQuery = results.debug?.sqlQuery || 'No SQL query found in response';
      debugSqlQuery.value = sqlQuery;
    }
    if (debugQueryResults) {
      queryResults = results.debug?.queryResults || 'No query results found in response';
      debugQueryResults.value = queryResults;
      if (typeof updateQueryDebugInfo === 'function') updateQueryDebugInfo(results.debug, queryResults);
    }
    if (debugBedrockPayload) {
      bedrockPayload = results.debug?.bedrockPayload || 'No Bedrock payload found in response';
      debugBedrockPayload.value = bedrockPayload;
      if (typeof updatePayloadDebugInfo === 'function') updatePayloadDebugInfo(bedrockPayload, queryResults);
    }
    if (debugFullResponse) {
      const fullResponse = results.debug?.fullResponse || 'No full response found in response';
      debugFullResponse.value = fullResponse;
      if (typeof updateResponseDebugInfo === 'function') updateResponseDebugInfo(fullResponse);
    }
    if (typeof updateBedrockDebugInfo === 'function') updateBedrockDebugInfo(results.debug || {});
  }

  // Robust Query Debug Info (Option 3)
  function updateQueryDebugInfo(debug, queryResults) {
    try {
      // Prefer backend-provided debug fields if present
      let rowCount = debug?.queryRowCount ?? '-';
      let dataSize = debug?.queryDataSize ?? '-';
      let charCount = debug?.queryCharCount ?? '-';
      // Fallback: parse queryResults if needed
      if ((rowCount === '-' || dataSize === '-' || charCount === '-') && queryResults && queryResults !== 'No query results found in response') {
        try {
          charCount = queryResults.length;
          dataSize = new Blob([queryResults]).size;
          let parsed = JSON.parse(queryResults);
          if (parsed && parsed.Rows && Array.isArray(parsed.Rows)) {
            rowCount = parsed.Rows.length > 1 ? parsed.Rows.length - 1 : 0;
          } else if (Array.isArray(parsed)) {
            rowCount = parsed.length;
          } else if (parsed && parsed.data && Array.isArray(parsed.data)) {
            rowCount = parsed.data.length;
          } else {
            rowCount = 1;
          }
        } catch (e) {
          rowCount = queryResults.split('\n').filter(line => line.trim()).length;
        }
      }
      // Update UI elements
      const queryRowCount = document.getElementById('queryRowCount');
      const queryDataSize = document.getElementById('queryDataSize');
      const queryCharCount = document.getElementById('queryCharCount');
      if (queryRowCount) queryRowCount.textContent = rowCount !== undefined ? rowCount : '-';
      if (queryDataSize) queryDataSize.textContent = dataSize !== undefined && dataSize !== '-' ? formatBytes(dataSize) : '-';
      if (queryCharCount) queryCharCount.textContent = charCount !== undefined ? charCount : '-';
      // Table View: try to parse and show table, else show error
      const tableContainer = document.getElementById('debugQueryTable');
      if (tableContainer) {
        let tableHtml = '';
        try {
          let parsed = JSON.parse(queryResults);
          if (parsed && parsed.Rows && Array.isArray(parsed.Rows)) {
            // Athena ResultSet: first row is header
            const headers = parsed.Rows[0].Data.map(col => col.VarCharValue);
            const dataRows = parsed.Rows.slice(1);
            tableHtml = '<table class="debug-table"><thead><tr>' + headers.map(h => `<th>${escapeHtml(h)}</th>`).join('') + '</tr></thead><tbody>';
            dataRows.slice(0, 100).forEach(row => {
              tableHtml += '<tr>' + row.Data.map(col => `<td>${escapeHtml(col.VarCharValue)}</td>`).join('') + '</tr>';
            });
            if (dataRows.length > 100) {
              tableHtml += `<tr><td colspan="${headers.length}" style="text-align: center; font-style: italic; color: #666; padding: 16px;">... and ${(dataRows.length - 100).toLocaleString()} more rows</td></tr>`;
            }
            tableHtml += '</tbody></table>';
          } else {
            tableHtml = '<div class="table-placeholder">No tabular data available for this result.</div>';
          }
        } catch (e) {
          tableHtml = '<div class="table-placeholder">Table view unavailable: invalid or non-tabular data.</div>';
        }
        tableContainer.innerHTML = tableHtml;
      }
    } catch (error) {
      console.error('Error updating query debug info:', error);
    }
  }

  // Initialize the application
  initializeApp();
});