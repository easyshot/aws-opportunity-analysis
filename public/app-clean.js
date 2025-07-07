// Clean AWS Opportunity Analysis Frontend
document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const opportunityForm = document.getElementById('opportunityForm');
  const analyzeButton = document.getElementById('analyzeBtn');
  const resultsSection = document.getElementById('detailedAnalysis');
  const additionalSections = document.getElementById('additionalSections');
  const debugSection = document.getElementById('debugSection');
  
  // Output elements for projections
  const predictedArr = document.getElementById('predictedArr');
  const predictedMrr = document.getElementById('predictedMrr');
  const launchDate = document.getElementById('launchDate');
  const timeToLaunch = document.getElementById('timeToLaunch');
  const confidenceScore = document.getElementById('confidenceScore');
  const confidenceLabel = document.getElementById('confidenceLabel');
  const confidenceFill = document.getElementById('confidenceFill');
  const topServices = document.getElementById('topServices');
  const confidenceFactors = document.getElementById('confidenceFactors');
  
  // Output elements for analysis sections
  const methodology = document.getElementById('methodology');
  const findings = document.getElementById('findings');
  const rationale = document.getElementById('rationale');
  const riskFactors = document.getElementById('riskFactors');
  const similarProjects = document.getElementById('similarProjects');
  const fullAnalysis = document.getElementById('fullAnalysis');
  const bedrockResponse = document.getElementById('bedrockResponse');
  
  // Additional sections
  const fundingOptions = document.getElementById('fundingOptions');
  const followOnOpportunities = document.getElementById('followOnOpportunities');
  
  // Debug elements
  const debugSqlQuery = document.getElementById('debugSqlQuery');
  const debugQueryResults = document.getElementById('debugQueryResults');
  const debugFullResponse = document.getElementById('debugFullResponse');
  
  // Status elements
  const analysisStatus = document.getElementById('analysisStatus');
  const completionStatus = document.getElementById('completionStatus');
  const statusFill = document.getElementById('statusFill');
  const charCounter = document.getElementById('charCounter');

  // Initialize the application
  function initializeApp() {
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    setupEventListeners();
    updateCompletionStatus();
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
    }

    // Clear button
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearForm);
    }

    // Sample button
    const sampleBtn = document.getElementById('sampleBtn');
    if (sampleBtn) {
      sampleBtn.addEventListener('click', loadSampleData);
    }

    // Theme toggle
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', toggleTheme);
      console.log('✅ Theme toggle event listener attached');
    } else {
      console.log('❌ Theme toggle button not found');
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
      charCounter.textContent = `${count} characters`;
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
      statusText.textContent = `${completionPercentage}% Complete`;
    }
    
    if (statusFill) {
      statusFill.style.width = `${completionPercentage}%`;
    }
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
    if (topServices) {
      topServices.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">☁️</div>
          <div class="empty-text">Service recommendations will appear after analysis</div>
        </div>
      `;
    }
    if (confidenceFactors) {
      confidenceFactors.innerHTML = `
        <div class="empty-state small">
          <div class="empty-text">Confidence factors will appear after analysis</div>
        </div>
      `;
    }
    
    // Clear analysis sections
    if (methodology) methodology.innerHTML = '<div class="loading-state">Analysis methodology will appear here...</div>';
    if (findings) findings.innerHTML = '<div class="loading-state">Key findings will appear here...</div>';
    if (rationale) rationale.innerHTML = '<div class="loading-state">Analysis rationale will appear here...</div>';
    if (riskFactors) riskFactors.innerHTML = '<div class="loading-state">Risk assessment will appear here...</div>';
    if (similarProjects) similarProjects.innerHTML = '<div class="loading-state">Historical matches will appear here...</div>';
    if (fullAnalysis) fullAnalysis.innerHTML = '<div class="loading-state">Complete analysis will appear here...</div>';
    if (bedrockResponse) bedrockResponse.innerHTML = '<div class="loading-state">Complete Bedrock response will appear here...</div>';
    
    // Clear additional sections
    if (fundingOptions) fundingOptions.innerHTML = '<div class="loading-state">Funding recommendations will appear here...</div>';
    if (followOnOpportunities) followOnOpportunities.innerHTML = '<div class="loading-state">Future opportunities will appear here...</div>';
    
    // Clear debug sections
    const debugSqlQuery = document.getElementById('debugSqlQuery');
    const debugQueryResults = document.getElementById('debugQueryResults');
    const debugBedrockPayload = document.getElementById('debugBedrockPayload');
    const debugFullResponse = document.getElementById('debugFullResponse');
    
    if (debugSqlQuery) debugSqlQuery.value = '';
    if (debugQueryResults) debugQueryResults.value = '';
    if (debugBedrockPayload) debugBedrockPayload.value = '';
    if (debugFullResponse) debugFullResponse.value = '';
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

  // Format currency
  function formatCurrency(amount) {
    if (!amount) return '-';
    const num = parseFloat(amount);
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

  // Populate UI with results
  function populateUI(results) {
    try {
      console.log('Populating UI with results:', results);
      console.log('Response keys:', Object.keys(results));
      console.log('Sections available:', {
        methodology: !!results.methodology,
        findings: !!results.findings,
        rationale: !!results.rationale,
        riskFactors: !!results.riskFactors,
        similarProjects: !!results.similarProjects,
        sections: !!results.sections
      });
      
      // Clear existing data
      clearUIFields();
      
      // Handle different response structures
      let metrics = null;
      let fullResponse = null;
      
      // Check if we have the new response structure
      if (results.metrics) {
        metrics = results.metrics;
      }
      
      if (results.fullResponse) {
        fullResponse = results.fullResponse;
      }
      
      // If we don't have the new structure, try to extract from the old structure
      if (!metrics && results.projections) {
        metrics = results.projections;
      }
      
      // Check for sections in different possible locations
      if (!fullResponse) {
        // Prioritize top-level section properties over nested sections
        if (results.methodology || results.findings || results.rationale || results.riskFactors || results.similarProjects) {
          // Sections are at the top level
          fullResponse = '';
          if (results.methodology) fullResponse += `===ANALYSIS METHODOLOGY===\n${results.methodology}\n\n`;
          if (results.findings) fullResponse += `===DETAILED FINDINGS===\n${results.findings}\n\n`;
          if (results.rationale) fullResponse += `===PREDICTION RATIONALE===\n${results.rationale}\n\n`;
          if (results.riskFactors) fullResponse += `===RISK FACTORS===\n${results.riskFactors}\n\n`;
          if (results.similarProjects) fullResponse += `===SIMILAR PROJECTS===\n${results.similarProjects}\n\n`;
        } else if (results.sections) {
          // Fallback to nested sections
          const sections = results.sections;
          fullResponse = '';
          if (sections.methodology) fullResponse += `===ANALYSIS METHODOLOGY===\n${sections.methodology}\n\n`;
          if (sections.findings) fullResponse += `===DETAILED FINDINGS===\n${sections.findings}\n\n`;
          if (sections.rationale) fullResponse += `===PREDICTION RATIONALE===\n${sections.rationale}\n\n`;
          if (sections.riskFactors) fullResponse += `===RISK FACTORS===\n${sections.riskFactors}\n\n`;
          if (sections.similarProjectsRaw) fullResponse += `===SIMILAR PROJECTS===\n${sections.similarProjectsRaw}\n\n`;
        }
      }
      
      // Populate projections from metrics
      console.log('Metrics object:', metrics);
      console.log('Projections object:', results.projections);
      console.log('DOM elements found:', {
        predictedArr: !!predictedArr,
        predictedMrr: !!predictedMrr,
        launchDate: !!launchDate,
        timeToLaunch: !!timeToLaunch,
        confidenceScore: !!confidenceScore,
        confidenceLabel: !!confidenceLabel,
        confidenceFill: !!confidenceFill,
        topServices: !!topServices
      });
      
      if (metrics) {
        console.log('Populating from metrics object');
        if (predictedArr && metrics.predictedArr) {
          console.log('Before update - predictedArr:', predictedArr.textContent);
          predictedArr.textContent = formatCurrency(metrics.predictedArr);
          console.log('After update - predictedArr:', predictedArr.textContent, 'from value:', metrics.predictedArr);
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
          timeToLaunch.textContent = `${metrics.timeToLaunch} months`;
          console.log('Set timeToLaunch to:', metrics.timeToLaunch);
        } else if (timeToLaunch && metrics.predictedProjectDuration) {
          // Remove "months" if it's already in the string to avoid duplication
          const duration = metrics.predictedProjectDuration.replace(/\s*months?\s*$/i, '');
          timeToLaunch.textContent = `${duration} months`;
          console.log('Set timeToLaunch to:', duration + ' months (from:', metrics.predictedProjectDuration + ')');
        }
        
        if (confidenceScore && metrics.confidence) {
          confidenceScore.textContent = metrics.confidence;
          console.log('Set confidence to:', metrics.confidence);
        }
        
        if (confidenceLabel && metrics.confidence) {
          confidenceLabel.textContent = getConfidenceLabel(metrics.confidence);
          console.log('Set confidenceLabel to:', getConfidenceLabel(metrics.confidence));
        }
        
        if (confidenceFill && metrics.confidence) {
          const percentage = getConfidencePercentage(metrics.confidence);
          confidenceFill.style.width = `${percentage}%`;
          console.log('Set confidenceFill to:', percentage + '%');
        }
        
        if (topServices && metrics.topServices) {
          topServices.innerHTML = formatServicesList(metrics.topServices);
          console.log('Set topServices to:', metrics.topServices);
        }
      } else {
        console.log('No metrics object found, trying to populate from projections directly');
        // Try to populate directly from projections if metrics is not available
        if (results.projections) {
          const projections = results.projections;
          console.log('Direct projections object:', projections);
          
          if (predictedArr && projections.predictedArr) {
            predictedArr.textContent = formatCurrency(projections.predictedArr);
            console.log('Set predictedArr to:', projections.predictedArr);
          }
          
          if (predictedMrr && projections.predictedMrr) {
            predictedMrr.textContent = formatCurrency(projections.predictedMrr);
            console.log('Set predictedMrr to:', projections.predictedMrr);
          }
          
          if (launchDate && projections.launchDate) {
            launchDate.textContent = formatDate(projections.launchDate);
            console.log('Set launchDate to:', projections.launchDate);
          }
          
          if (timeToLaunch && projections.timeToLaunch) {
            timeToLaunch.textContent = `${projections.timeToLaunch} months`;
            console.log('Set timeToLaunch to:', projections.timeToLaunch);
          } else if (timeToLaunch && projections.predictedProjectDuration) {
            // Remove "months" if it's already in the string to avoid duplication
            const duration = projections.predictedProjectDuration.replace(/\s*months?\s*$/i, '');
            timeToLaunch.textContent = `${duration} months`;
            console.log('Set timeToLaunch to:', duration + ' months');
          }
          
          if (confidenceScore && projections.confidence) {
            confidenceScore.textContent = projections.confidence;
            console.log('Set confidence to:', projections.confidence);
          }
          
          if (confidenceLabel && projections.confidence) {
            confidenceLabel.textContent = getConfidenceLabel(projections.confidence);
            console.log('Set confidenceLabel to:', getConfidenceLabel(projections.confidence));
          }
          
          if (confidenceFill && projections.confidence) {
            const percentage = getConfidencePercentage(projections.confidence);
            confidenceFill.style.width = `${percentage}%`;
            console.log('Set confidenceFill to:', percentage + '%');
          }
          
          if (topServices && projections.topServices) {
            topServices.innerHTML = formatServicesList(projections.topServices);
            console.log('Set topServices to:', projections.topServices);
          }
        }
      }
      
      // Populate analysis sections from full response
      if (fullResponse) {
        const sections = extractSections(fullResponse);
        
        if (methodology && sections.methodology) {
          methodology.innerHTML = formatSectionContent(sections.methodology);
        }
        
        if (findings && sections.findings) {
          findings.innerHTML = formatSectionContent(sections.findings);
        }
        
        if (rationale && sections.rationale) {
          rationale.innerHTML = formatSectionContent(sections.rationale);
        }
        
        if (riskFactors && sections.riskFactors) {
          riskFactors.innerHTML = formatSectionContent(sections.riskFactors);
        }
        
        if (similarProjects && sections.similarProjects) {
          similarProjects.innerHTML = formatSectionContent(sections.similarProjects);
        }
        
        if (fullAnalysis) {
          fullAnalysis.innerHTML = formatSectionContent(fullResponse);
        }
        
        if (bedrockResponse) {
          bedrockResponse.innerHTML = formatSectionContent(fullResponse);
        }
        
        // Populate debug sections
        if (debugFullResponse) {
          debugFullResponse.value = fullResponse;
        }
      }
      
      // Direct section population as primary method
      console.log('Populating sections directly from response');
      
      if (methodology && results.methodology) {
        methodology.innerHTML = formatSectionContent(results.methodology);
      }
      
      if (findings && results.findings) {
        findings.innerHTML = formatSectionContent(results.findings);
      }
      
      if (rationale && results.rationale) {
        rationale.innerHTML = formatSectionContent(results.rationale);
      }
      
      if (riskFactors && results.riskFactors) {
        riskFactors.innerHTML = formatSectionContent(results.riskFactors);
      }
      
      if (similarProjects && results.similarProjects) {
        similarProjects.innerHTML = formatSectionContent(results.similarProjects);
      }
      
      if (fullAnalysis && (results.methodology || results.findings || results.rationale || results.riskFactors || results.similarProjects)) {
        const fullText = [
          results.methodology ? `===ANALYSIS METHODOLOGY===\n${results.methodology}` : '',
          results.findings ? `===DETAILED FINDINGS===\n${results.findings}` : '',
          results.rationale ? `===PREDICTION RATIONALE===\n${results.rationale}` : '',
          results.riskFactors ? `===RISK FACTORS===\n${results.riskFactors}` : '',
          results.similarProjects ? `===SIMILAR PROJECTS===\n${results.similarProjects}` : ''
        ].filter(Boolean).join('\n\n');
        fullAnalysis.innerHTML = formatSectionContent(fullText);
      }
      
      if (bedrockResponse && (results.methodology || results.findings || results.rationale || results.riskFactors || results.similarProjects)) {
        const fullText = [
          results.methodology ? `===ANALYSIS METHODOLOGY===\n${results.methodology}` : '',
          results.findings ? `===DETAILED FINDINGS===\n${results.findings}` : '',
          results.rationale ? `===PREDICTION RATIONALE===\n${results.rationale}` : '',
          results.riskFactors ? `===RISK FACTORS===\n${results.riskFactors}` : '',
          results.similarProjects ? `===SIMILAR PROJECTS===\n${results.similarProjects}` : ''
        ].filter(Boolean).join('\n\n');
        bedrockResponse.innerHTML = formatSectionContent(fullText);
      }
      
      // Show the detailed analysis section
      if (resultsSection) {
        resultsSection.style.display = 'block';
      }
      
      // Show debug section
      const debugSection = document.getElementById('debugSection');
      if (debugSection) {
        debugSection.style.display = 'block';
      }
      
      // Populate debug information
      populateDebugInfo(results);
      
      // Debug: Log final UI values
      console.log('Final UI values after population:', {
        predictedArr: predictedArr?.textContent,
        predictedMrr: predictedMrr?.textContent,
        launchDate: launchDate?.textContent,
        timeToLaunch: timeToLaunch?.textContent,
        confidenceScore: confidenceScore?.textContent,
        confidenceLabel: confidenceLabel?.textContent
      });
      
      // Update analysis status
      if (analysisStatus) {
        const statusText = analysisStatus.querySelector('.status-text');
        if (statusText) {
          statusText.textContent = 'Complete';
        }
        const statusDot = analysisStatus.querySelector('.status-dot');
        if (statusDot) {
          statusDot.className = 'status-dot complete';
        }
      }
      
    } catch (error) {
      console.error('Error populating UI:', error);
      showError('Error displaying results: ' + error.message);
    }
  }

  // Extract sections from full response
  function extractSections(text) {
    const sections = {};
    
    const sectionPatterns = {
      methodology: /===ANALYSIS METHODOLOGY===\s*\n([\s\S]*?)(?=\n===|$)/i,
      findings: /===DETAILED FINDINGS===\s*\n([\s\S]*?)(?=\n===|$)/i,
      rationale: /===PREDICTION RATIONALE===\s*\n([\s\S]*?)(?=\n===|$)/i,
      riskFactors: /===RISK FACTORS===\s*\n([\s\S]*?)(?=\n===|$)/i,
      similarProjects: /===SIMILAR PROJECTS===\s*\n([\s\S]*?)(?=\n===|$)/i
    };
    
    for (const [key, pattern] of Object.entries(sectionPatterns)) {
      const match = text.match(pattern);
      if (match) {
        sections[key] = match[1].trim();
      }
    }
    
    return sections;
  }

  // Format section content
  function formatSectionContent(content) {
    if (!content) return '<div class="empty-state">No content available</div>';
    
    // Convert markdown-like formatting to HTML
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    
    return `<p>${formatted}</p>`;
  }

  // Format services list
  function formatServicesList(services) {
    if (!services) return '<div class="empty-state">No services available</div>';
    
    if (typeof services === 'string') {
      // Check if it's pipe-separated (like "Combined|$55,000/month|$0 upfront")
      if (services.includes('|')) {
        const serviceArray = services.split('|').map(s => s.trim());
        return `
          <div class="services-list">
            ${serviceArray.map(service => `<div class="service-item">${service}</div>`).join('')}
          </div>
        `;
      }
      
      // If it's a comma-separated string
      const serviceArray = services.split(',').map(s => s.trim());
      return `
        <div class="services-list">
          ${serviceArray.map(service => `<div class="service-item">${service}</div>`).join('')}
        </div>
      `;
    } else if (Array.isArray(services)) {
      return `
        <div class="services-list">
          ${services.map(service => `<div class="service-item">${service}</div>`).join('')}
        </div>
      `;
    }
    
    return `<div class="service-item">${services}</div>`;
  }

  // Populate debug information
  function populateDebugInfo(results) {
    const debugSqlQuery = document.getElementById('debugSqlQuery');
    const debugQueryResults = document.getElementById('debugQueryResults');
    const debugBedrockPayload = document.getElementById('debugBedrockPayload');
    const debugFullResponse = document.getElementById('debugFullResponse');
    
    if (debugSqlQuery) {
      debugSqlQuery.value = results.debug?.sqlQuery || 'No SQL query found in response';
    }
    
    if (debugQueryResults) {
      debugQueryResults.value = results.debug?.queryResults || 'No query results found in response';
    }
    
    if (debugBedrockPayload) {
      debugBedrockPayload.value = results.debug?.bedrockPayload || 'No Bedrock payload found in response';
    }
    
    if (debugFullResponse) {
      debugFullResponse.value = results.debug?.fullResponse || 'No full response found in response';
    }
  }

  // Get confidence label
  function getConfidenceLabel(confidence) {
    // Handle string confidence levels
    if (typeof confidence === 'string') {
      const upperConfidence = confidence.toUpperCase();
      if (upperConfidence === 'HIGH') return 'High';
      if (upperConfidence === 'MEDIUM') return 'Medium';
      if (upperConfidence === 'LOW') return 'Low';
      if (upperConfidence === 'VERY LOW') return 'Very Low';
    }
    
    // Handle numeric confidence levels
    const confidenceNum = parseInt(confidence);
    if (confidenceNum >= 80) return 'High';
    if (confidenceNum >= 60) return 'Medium';
    if (confidenceNum >= 40) return 'Low';
    return 'Very Low';
  }

  // Get confidence percentage
  function getConfidencePercentage(confidence) {
    // Handle string confidence levels
    if (typeof confidence === 'string') {
      const upperConfidence = confidence.toUpperCase();
      if (upperConfidence === 'HIGH') return 85;
      if (upperConfidence === 'MEDIUM') return 65;
      if (upperConfidence === 'LOW') return 45;
      if (upperConfidence === 'VERY LOW') return 25;
    }
    
    // Handle numeric confidence levels
    const confidenceNum = parseInt(confidence);
    return Math.min(Math.max(confidenceNum, 0), 100);
  }

  // Show error message
  function showError(message) {
    console.error('Error:', message);
    
    // Create error notification
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.innerHTML = `
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <span class="error-message">${message}</span>
        <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentElement) {
        errorDiv.remove();
      }
    }, 5000);
  }

  // Show loading state
  function showLoading() {
    if (analyzeButton) {
      analyzeButton.disabled = true;
      analyzeButton.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Analyzing...</span>';
    }
    
    if (analysisStatus) {
      const statusText = analysisStatus.querySelector('.status-text');
      if (statusText) {
        statusText.textContent = 'Analyzing...';
      }
      const statusDot = analysisStatus.querySelector('.status-dot');
      if (statusDot) {
        statusDot.className = 'status-dot loading';
      }
    }
  }

  // Hide loading state
  function hideLoading() {
    if (analyzeButton) {
      analyzeButton.disabled = false;
      analyzeButton.innerHTML = '<span class="btn-icon">🔍</span><span class="btn-text">Analyze Opportunity</span>';
    }
    
    if (analysisStatus) {
      const statusText = analysisStatus.querySelector('.status-text');
      if (statusText) {
        statusText.textContent = 'Ready';
      }
      const statusDot = analysisStatus.querySelector('.status-dot');
      if (statusDot) {
        statusDot.className = 'status-dot';
      }
    }
  }

  // Main analysis function
  async function analyzeOpportunity() {
    try {
      const formData = getFormData();
      const validation = validateFormData(formData);
      
      if (!validation.isValid) {
        showError('Please fill in all required fields: ' + validation.errors.join(', '));
        return;
      }
      
      showLoading();
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const results = await response.json();
      console.log('Analysis results:', results);
      
      populateUI(results);
      
    } catch (error) {
      console.error('Analysis error:', error);
      showError('Analysis failed: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  // Clear form
  function clearForm() {
    if (opportunityForm) {
      opportunityForm.reset();
    }
    clearUIFields();
    updateCompletionStatus();
    
    // Hide analysis sections
    if (resultsSection) resultsSection.style.display = 'none';
    if (additionalSections) additionalSections.style.display = 'none';
    if (debugSection) debugSection.style.display = 'none';
  }

  // Load sample data
  function loadSampleData() {
    const sampleData = {
      customerName: 'Acme Corporation',
      region: 'United States',
      closeDate: '2024-12-31',
      opportunityName: 'Cloud Migration Project',
      description: 'Large-scale migration of on-premises infrastructure to AWS cloud. Includes database migration, application modernization, and security implementation. Expected to improve performance by 40% and reduce operational costs by 30%.'
    };
    
    // Populate form fields
    Object.entries(sampleData).forEach(([key, value]) => {
      const field = document.getElementById(key);
      if (field) {
        field.value = value;
      }
    });
    
    updateCompletionStatus();
    updateCharCounter();
  }

  // Toggle theme
  function toggleTheme() {
    console.log('🎨 Theme toggle function called');
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    console.log('Current theme:', isDark ? 'dark' : 'light');
    
    if (isDark) {
      document.body.removeAttribute('data-theme');
      console.log('Switched to light theme');
    } else {
      document.body.setAttribute('data-theme', 'dark');
      console.log('Switched to dark theme');
    }
    
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
      const icon = themeToggle.querySelector('.icon');
      const text = themeToggle.querySelector('.theme-text');
      if (!isDark) {
        icon.textContent = '☀️';
        text.textContent = 'Light';
      } else {
        icon.textContent = '🌙';
        text.textContent = 'Dark';
      }
    }
  }

  // Export data
  function exportData() {
    const formData = getFormData();
    const dataStr = JSON.stringify(formData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'opportunity-analysis.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  // Print report
  function printReport() {
    window.print();
  }

  // Toggle debug section
  function toggleDebugSection() {
    const debugSection = document.getElementById('debugSection');
    const debugToggle = document.querySelector('.debug-toggle');
    
    if (debugSection) {
      const isVisible = debugSection.style.display !== 'none';
      debugSection.style.display = isVisible ? 'none' : 'block';
      
      if (debugToggle) {
        debugToggle.textContent = isVisible ? 'Show Debug' : 'Hide Debug';
      }
    }
  }

  // Make functions globally available for debugging
  window.analyzeOpportunity = analyzeOpportunity;
  window.clearForm = clearForm;
  window.loadSampleData = loadSampleData;
  window.toggleTheme = toggleTheme;
  window.exportData = exportData;
  window.printReport = printReport;
  window.toggleDebugSection = toggleDebugSection;

  // Initialize the application
  initializeApp();
});