// Frontend JavaScript for AWS Opportunity Analysis app
document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const opportunityForm = document.getElementById('opportunityForm');
  const oppDetQueryButtonV3 = document.getElementById('oppDetQueryButtonV3');
  const oppDetQueryButtonV4 = document.getElementById('oppDetQueryButtonV4');
  const resultsSection = document.getElementById('resultsSection');
  const loadingOverlay = document.getElementById('loadingOverlay');
  
  // Output elements
  const oppArrOut = document.getElementById('oppArrOut');
  const oppMrrOut = document.getElementById('oppMrrOut');
  const oppLaunchDateOut = document.getElementById('oppLaunchDateOut');
  const oppProjectDurationOut = document.getElementById('oppProjectDurationOut');
  const oppConfidenceOut = document.getElementById('oppConfidenceOut');
  const oppServicesOut = document.getElementById('oppServicesOut');
  const similarProjectsArea = document.getElementById('similarProjectsArea');
  const textSummary = document.getElementById('textSummary');
  
  // Clear UI fields
  function clearUIFields() {
    oppArrOut.textContent = '-';
    oppMrrOut.textContent = '-';
    oppLaunchDateOut.textContent = '-';
    oppProjectDurationOut.textContent = '-';
    oppConfidenceOut.textContent = '-';
    oppConfidenceOut.className = 'metric-value';
    oppServicesOut.textContent = '-';
    similarProjectsArea.textContent = '-';
    textSummary.textContent = '-';
  }
  
  // Populate UI with results
  function populateUI(results) {
    // Metrics
    oppArrOut.textContent = results.metrics.predictedArr || 'N/A';
    oppMrrOut.textContent = results.metrics.predictedMrr || 'N/A';
    oppLaunchDateOut.textContent = results.metrics.launchDate || 'N/A';
    oppProjectDurationOut.textContent = results.metrics.predictedProjectDuration || 'N/A';
    
    // Confidence with styling
    const confidence = results.metrics.confidence || 'UNKNOWN';
    oppConfidenceOut.textContent = confidence;
    oppConfidenceOut.className = `metric-value ${confidence}`;
    
    // Services (with HTML formatting)
    oppServicesOut.innerHTML = results.metrics.topServices || 'No services data';
    
    // Similar projects
    similarProjectsArea.textContent = results.sections.similarProjectsRaw || 'No similar projects found';
    
    // Full analysis
    textSummary.textContent = results.formattedSummaryText || 'No analysis available';
    
    // Show results section
    resultsSection.style.display = 'block';
  }
  
  // Process form data
  function getFormData() {
    return {
      CustomerName: document.getElementById('CustomerName').value,
      region: document.getElementById('region').value,
      closeDate: document.getElementById('closeDate').value,
      oppName: document.getElementById('oppName').value,
      oppDescription: document.getElementById('oppDescription').value
    };
  }
  
  // Validate form
  function validateForm() {
    const requiredFields = ['CustomerName', 'region', 'closeDate', 'oppName', 'oppDescription'];
    let isValid = true;
    
    requiredFields.forEach(field => {
      const element = document.getElementById(field);
      if (!element.value.trim()) {
        element.style.borderColor = 'red';
        isValid = false;
      } else {
        element.style.borderColor = '';
      }
    });
    
    return isValid;
  }
  
  // Handle analysis request (production version)
  async function handleAnalysisRequest(useNovaPremier = false) {
    if (!validateForm()) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Show loading overlay
    loadingOverlay.style.display = 'flex';
    
    // Clear previous results
    clearUIFields();
    
    try {
      const formData = getFormData();
      
      // Add flag for Nova Premier if needed
      if (useNovaPremier) {
        formData.useNovaPremier = true;
      }
      
      // Send request to backend
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const results = await response.json();
      populateUI(results);
      
    } catch (error) {
      console.error('Error during analysis:', error);
      alert(`Analysis failed: ${error.message}`);
    } finally {
      // Hide loading overlay
      loadingOverlay.style.display = 'none';
    }
  }
  
  // Event listeners
  oppDetQueryButtonV3.addEventListener('click', () => handleAnalysisRequest(false));
  oppDetQueryButtonV4.addEventListener('click', () => handleAnalysisRequest(true));
});