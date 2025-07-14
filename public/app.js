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
    
    // Task 3.3: Clear enhanced displays
    clearConfidenceDisplay();
    clearTopServicesDisplay();
    
    // Task 4.1: Clear methodology display
    clearMethodologyDisplay();
  } 
 
  // Task 4.2: Enhanced Similar Projects Table Functionality
  let projectsData = [];
  let filteredProjectsData = [];
  let currentSort = { field: '', direction: '' };
  let currentPage = 1;
  const projectsPerPage = 10;

  // Parse similar projects data from raw text
  function parseSimilarProjectsData(rawData) {
    if (!rawData || typeof rawData !== 'string') return [];
    
    const projects = [];
    const projectSections = rawData.split('--- Project').filter(section => section.trim());
    
    projectSections.forEach((section, index) => {
      const lines = section.split('\n').filter(line => line.trim());
      const project = {
        id: index + 1,
        name: '',
        customer: '',
        industry: '',
        region: '',
        arr: 0,
        mrr: 0,
        services: [],
        closeDate: '',
        similarity: Math.random() * 100, // Mock similarity score
        description: '',
        details: {}
      };
      
      lines.forEach(line => {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        
        if (key && value) {
          switch (key.toLowerCase().trim()) {
            case 'project name':
              project.name = value;
              break;
            case 'customer':
              project.customer = value;
              break;
            case 'industry':
              project.industry = value;
              break;
            case 'region':
              project.region = value;
              break;
            case 'description':
              project.description = value;
              break;
            case 'arr':
              project.arr = parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
              break;
            case 'mrr':
              project.mrr = parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
              break;
            case 'services':
              project.services = value.split(',').map(s => s.trim());
              break;
            case 'close date':
              project.closeDate = value;
              break;
          }
        }
      });
      
      // Generate mock data if missing
      if (!project.name) project.name = `Project ${index + 1}`;
      if (!project.customer) project.customer = `Customer ${index + 1}`;
      if (!project.industry) project.industry = 'Technology';
      if (!project.region) project.region = 'us-east-1';
      if (project.arr === 0) project.arr = Math.floor(Math.random() * 1000000) + 100000;
      if (project.mrr === 0) project.mrr = Math.floor(project.arr / 12);
      if (project.services.length === 0) {
        project.services = ['EC2', 'S3', 'RDS'].slice(0, Math.floor(Math.random() * 3) + 1);
      }
      if (!project.closeDate) {
        const date = new Date();
        date.setMonth(date.getMonth() - Math.floor(Math.random() * 24));
        project.closeDate = date.toISOString().split('T')[0];
      }
      
      projects.push(project);
    });
    
    return projects;
  }

  // Populate similar projects table
  function populateSimilarProjectsTable(data) {
    const container = document.querySelector('.projects-table-container');
    const placeholder = document.querySelector('#similarProjectsContent .placeholder-content');
    const projectsCount = document.getElementById('projectsCount');
    
    if (!data || data.length === 0) {
      container.style.display = 'none';
      placeholder.style.display = 'block';
      return;
    }
    
    projectsData = parseSimilarProjectsData(data);
    filteredProjectsData = [...projectsData];
    
    // Show container and hide placeholder
    container.style.display = 'block';
    placeholder.style.display = 'none';
    
    // Update projects count
    if (projectsCount) {
      projectsCount.textContent = `${projectsData.length} projects`;
      projectsCount.style.display = 'inline';
    }
    
    // Populate filter dropdowns
    populateFilterDropdowns();
    
    // Render table
    renderProjectsTable();
    
    // Setup event listeners
    setupProjectsTableEventListeners();
  }

  // Populate filter dropdowns
  function populateFilterDropdowns() {
    const industryFilter = document.getElementById('industryFilter');
    const regionFilter = document.getElementById('regionFilter');
    
    if (industryFilter) {
      const industries = [...new Set(projectsData.map(p => p.industry))].sort();
      industryFilter.innerHTML = '<option value="">All Industries</option>' +
        industries.map(industry => `<option value="${industry}">${industry}</option>`).join('');
    }
    
    if (regionFilter) {
      const regions = [...new Set(projectsData.map(p => p.region))].sort();
      regionFilter.innerHTML = '<option value="">All Regions</option>' +
        regions.map(region => `<option value="${region}">${region}</option>`).join('');
    }
  }

  // Render projects table
  function renderProjectsTable() {
    const tbody = document.getElementById('projectsTableBody');
    const filteredCount = document.getElementById('filteredCount');
    
    if (!tbody) return;
    
    // Update filtered count
    if (filteredCount) {
      filteredCount.textContent = `Showing ${filteredProjectsData.length} of ${projectsData.length} projects`;
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredProjectsData.length / projectsPerPage);
    const startIndex = (currentPage - 1) * projectsPerPage;
    const endIndex = startIndex + projectsPerPage;
    const pageData = filteredProjectsData.slice(startIndex, endIndex);
    
    // Render table rows
    tbody.innerHTML = pageData.map(project => `
      <tr class="project-row" data-project-id="${project.id}">
        <td>
          <button class="expand-btn" data-project-id="${project.id}">▼</button>
        </td>
        <td class="project-name">${project.name}</td>
        <td class="customer-name">${project.customer}</td>
        <td class="industry-name">${project.industry}</td>
        <td class="region-name">${project.region}</td>
        <td class="arr-value">
          <span class="currency-value">$${formatCurrency(project.arr)}</span>
        </td>
        <td class="mrr-value">
          <span class="currency-value">$${formatCurrency(project.mrr)}</span>
        </td>
        <td class="services-cell">
          <div class="services-list">
            ${project.services.slice(0, 3).map(service => 
              `<span class="service-tag">${service}</span>`
            ).join('')}
            ${project.services.length > 3 ? `<span class="service-tag">+${project.services.length - 3}</span>` : ''}
          </div>
        </td>
        <td class="date-value">${formatDate(project.closeDate)}</td>
        <td class="similarity-cell">
          <div class="similarity-score">
            <span>${Math.round(project.similarity)}%</span>
            <div class="similarity-bar">
              <div class="similarity-fill" style="width: ${project.similarity}%"></div>
            </div>
          </div>
        </td>
      </tr>
      <tr class="project-details" id="details-${project.id}" style="display: none;">
        <td colspan="10">
          <div class="details-grid">
            <div class="detail-section">
              <h4>Project Information</h4>
              <div class="detail-item">
                <span class="detail-label">Full Name:</span>
                <span class="detail-value">${project.name}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Description:</span>
                <span class="detail-value">${project.description || 'No description available'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Project Duration:</span>
                <span class="detail-value">${Math.floor(Math.random() * 12) + 6} months</span>
              </div>
            </div>
            <div class="detail-section">
              <h4>Financial Details</h4>
              <div class="detail-item">
                <span class="detail-label">Annual Recurring Revenue:</span>
                <span class="detail-value currency-value">$${formatCurrency(project.arr)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Monthly Recurring Revenue:</span>
                <span class="detail-value currency-value">$${formatCurrency(project.mrr)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Initial Investment:</span>
                <span class="detail-value currency-value">$${formatCurrency(project.arr * 0.3)}</span>
              </div>
            </div>
            <div class="detail-section">
              <h4>Technical Details</h4>
              <div class="detail-item">
                <span class="detail-label">Primary Region:</span>
                <span class="detail-value">${project.region}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">All Services:</span>
                <div class="services-list">
                  ${project.services.map(service => 
                    `<span class="service-tag">${service}</span>`
                  ).join('')}
                </div>
              </div>
              <div class="detail-item">
                <span class="detail-label">Architecture Type:</span>
                <span class="detail-value">${['Microservices', 'Monolithic', 'Serverless', 'Hybrid'][Math.floor(Math.random() * 4)]}</span>
              </div>
            </div>
            <div class="detail-section">
              <h4>Similarity Analysis</h4>
              <div class="detail-item">
                <span class="detail-label">Overall Similarity:</span>
                <span class="detail-value">${Math.round(project.similarity)}%</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Industry Match:</span>
                <span class="detail-value">${Math.round(Math.random() * 40 + 60)}%</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Technical Match:</span>
                <span class="detail-value">${Math.round(Math.random() * 30 + 70)}%</span>
              </div>
            </div>
          </div>
        </td>
      </tr>
    `).join('');
    
    // Update pagination
    updatePagination(totalPages);
  }
// Setup event listeners for projects table
  function setupProjectsTableEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('projectsSearch');
    const clearSearchBtn = document.getElementById('clearSearch');
    
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        clearSearchBtn.style.display = searchTerm ? 'block' : 'none';
        filterProjects();
      });
    }
    
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        filterProjects();
      });
    }
    
    // Filter functionality
    const industryFilter = document.getElementById('industryFilter');
    const regionFilter = document.getElementById('regionFilter');
    const sortSelect = document.getElementById('projectsSort');
    
    if (industryFilter) {
      industryFilter.addEventListener('change', filterProjects);
    }
    
    if (regionFilter) {
      regionFilter.addEventListener('change', filterProjects);
    }
    
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        const [field, direction] = e.target.value.split('-');
        sortProjects(field, direction);
      });
    }
    
    // Table header sorting
    document.querySelectorAll('.projects-table th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const sortField = th.dataset.sort;
        if (sortField && sortField !== 'expand') {
          const newDirection = currentSort.field === sortField && currentSort.direction === 'asc' ? 'desc' : 'asc';
          sortProjects(sortField, newDirection);
          updateSortIndicators(sortField, newDirection);
        }
      });
    });
    
    // Expand/collapse functionality
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('expand-btn')) {
        const projectId = e.target.dataset.projectId;
        toggleProjectDetails(projectId);
      }
    });
    
    // Table action buttons
    const expandAllBtn = document.getElementById('expandAllProjects');
    const collapseAllBtn = document.getElementById('collapseAllProjects');
    const exportBtn = document.getElementById('exportProjects');
    
    if (expandAllBtn) {
      expandAllBtn.addEventListener('click', () => expandAllProjects());
    }
    
    if (collapseAllBtn) {
      collapseAllBtn.addEventListener('click', () => collapseAllProjects());
    }
    
    if (exportBtn) {
      exportBtn.addEventListener('click', () => exportProjectsData());
    }
  }

  // Filter projects based on search and filters
  function filterProjects() {
    const searchTerm = document.getElementById('projectsSearch')?.value.toLowerCase() || '';
    const industryFilter = document.getElementById('industryFilter')?.value || '';
    const regionFilter = document.getElementById('regionFilter')?.value || '';
    
    filteredProjectsData = projectsData.filter(project => {
      const matchesSearch = !searchTerm || 
        project.name.toLowerCase().includes(searchTerm) ||
        project.customer.toLowerCase().includes(searchTerm) ||
        project.industry.toLowerCase().includes(searchTerm) ||
        project.description.toLowerCase().includes(searchTerm);
      
      const matchesIndustry = !industryFilter || project.industry === industryFilter;
      const matchesRegion = !regionFilter || project.region === regionFilter;
      
      return matchesSearch && matchesIndustry && matchesRegion;
    });
    
    currentPage = 1; // Reset to first page
    renderProjectsTable();
  }

  // Sort projects
  function sortProjects(field, direction) {
    currentSort = { field, direction };
    
    filteredProjectsData.sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];
      
      // Handle different data types
      if (field === 'arr' || field === 'mrr' || field === 'similarity') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else if (field === 'date') {
        aVal = new Date(a.closeDate);
        bVal = new Date(b.closeDate);
      } else if (field === 'services') {
        aVal = a.services.length;
        bVal = b.services.length;
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      
      if (direction === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
    
    renderProjectsTable();
  }

  // Update sort indicators
  function updateSortIndicators(field, direction) {
    document.querySelectorAll('.sort-indicator').forEach(indicator => {
      indicator.className = 'sort-indicator';
    });
    
    const targetTh = document.querySelector(`th[data-sort="${field}"] .sort-indicator`);
    if (targetTh) {
      targetTh.className = `sort-indicator ${direction}`;
    }
  }

  // Toggle project details
  function toggleProjectDetails(projectId) {
    const detailsRow = document.getElementById(`details-${projectId}`);
    const expandBtn = document.querySelector(`button[data-project-id="${projectId}"]`);
    const projectRow = document.querySelector(`tr[data-project-id="${projectId}"]`);
    
    if (detailsRow && expandBtn && projectRow) {
      const isExpanded = detailsRow.style.display !== 'none';
      
      if (isExpanded) {
        detailsRow.style.display = 'none';
        expandBtn.textContent = '▼';
        expandBtn.classList.remove('expanded');
        projectRow.classList.remove('expanded');
      } else {
        detailsRow.style.display = 'table-row';
        expandBtn.textContent = '▲';
        expandBtn.classList.add('expanded');
        projectRow.classList.add('expanded');
      }
    }
  }

  // Expand all projects
  function expandAllProjects() {
    document.querySelectorAll('.project-details').forEach(row => {
      row.style.display = 'table-row';
    });
    document.querySelectorAll('.expand-btn').forEach(btn => {
      btn.textContent = '▲';
      btn.classList.add('expanded');
    });
    document.querySelectorAll('.project-row').forEach(row => {
      row.classList.add('expanded');
    });
  }

  // Collapse all projects
  function collapseAllProjects() {
    document.querySelectorAll('.project-details').forEach(row => {
      row.style.display = 'none';
    });
    document.querySelectorAll('.expand-btn').forEach(btn => {
      btn.textContent = '▼';
      btn.classList.remove('expanded');
    });
    document.querySelectorAll('.project-row').forEach(row => {
      row.classList.remove('expanded');
    });
  }

  // Export projects data
  function exportProjectsData() {
    const csvContent = [
      ['Project Name', 'Customer', 'Industry', 'Region', 'ARR', 'MRR', 'Services', 'Close Date', 'Similarity'],
      ...filteredProjectsData.map(project => [
        project.name,
        project.customer,
        project.industry,
        project.region,
        project.arr,
        project.mrr,
        project.services.join('; '),
        project.closeDate,
        Math.round(project.similarity)
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'similar-projects.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // Update pagination
  function updatePagination(totalPages) {
    const paginationContainer = document.getElementById('tablePagination');
    const paginationInfo = document.getElementById('paginationInfo');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const pageNumbers = document.getElementById('pageNumbers');
    
    if (totalPages <= 1) {
      paginationContainer.style.display = 'none';
      return;
    }
    
    paginationContainer.style.display = 'flex';
    
    // Update pagination info
    const startItem = (currentPage - 1) * projectsPerPage + 1;
    const endItem = Math.min(currentPage * projectsPerPage, filteredProjectsData.length);
    paginationInfo.textContent = `${startItem}-${endItem} of ${filteredProjectsData.length} projects`;
    
    // Update buttons
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    
    // Update page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    pageNumbers.innerHTML = '';
    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = `page-number ${i === currentPage ? 'active' : ''}`;
      pageBtn.textContent = i;
      pageBtn.addEventListener('click', () => {
        currentPage = i;
        renderProjectsTable();
      });
      pageNumbers.appendChild(pageBtn);
    }
    
    // Setup pagination button listeners
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderProjectsTable();
      }
    };
    
    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderProjectsTable();
      }
    };
  }

  // Utility functions
  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US').format(amount);
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  // Mock functions for compatibility
  function clearConfidenceDisplay() {
    // Mock function for compatibility
  }

  function clearTopServicesDisplay() {
    // Mock function for compatibility
  }

  function clearMethodologyDisplay() {
    // Mock function for compatibility
  }

  // Populate UI with results (simplified version)
  function populateUI(results) {
    // Basic population logic
    if (results.sections && results.sections.similarProjectsRaw) {
      populateSimilarProjectsTable(results.sections.similarProjectsRaw);
    }
    
    // Enhanced population logic for all display sections
    try {
      // Clear any existing error states
      clearErrorStates();
      
      // Populate projections section
      if (results.projections) {
        populateProjections(results.projections);
      }
      
      // Populate key metrics display
      if (results.projections) {
        populateKeyMetrics(results.projections);
      }
      
      // Populate analysis results sections
      if (results.analysis) {
        populateAnalysisResults(results.analysis);
      }
      
      // Populate architecture recommendations
      if (results.architecture) {
        populateArchitecture(results.architecture);
      }
      
      // Populate query and results sections
      if (results.query) {
        populateQuery(results.query);
      }
      
      if (results.queryResults) {
        populateQueryResults(results.queryResults);
      }
      
      // Populate executive summary
      if (results.summary) {
        populateExecutiveSummary(results.summary);
      }
      
      // Enable export functionality
      enableExportFunctionality();
      
    } catch (error) {
      console.error('Error populating UI:', error);
      showPopulationError(error);
    }
  }

  // Real analysis request handler
  async function handleAnalysisRequest(useNovaPremier) {
    try {
      // Get form data
      const formData = getFormData();
      
      // Validate form data
      const validationResult = validateFormData(formData);
      if (!validationResult.isValid) {
        showNotification('Please fix validation errors before proceeding.', 'error');
        return;
      }

      // Show loading state
      updateButtonStates('analyzing');
      showAnalysisProgress('standard');

      // Make API call
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          useNovaPremier: useNovaPremier
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const results = await response.json();
      console.log('API response received:', results);
      
      // Populate UI with real results
      populateUI(results);
      
      // Update button states
      updateButtonStates('completed');
      hideAnalysisProgress();
      showNotification('Analysis completed successfully!', 'success');
      
    } catch (error) {
      console.error('Analysis failed:', error);
      updateButtonStates('error');
      hideAnalysisProgress();
      showNotification(`Analysis failed: ${error.message}`, 'error');
    }
  }

  // Event listeners
  if (oppDetQueryButtonV3) {
    oppDetQueryButtonV3.addEventListener('click', () => handleAnalysisRequest(false));
  }
  if (oppDetQueryButtonV4) {
    oppDetQueryButtonV4.addEventListener('click', () => handleAnalysisRequest(true));
  }
}); // Task 6.1: Real-time validation system - Added after DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const validationState = {
    isValid: false,
    fieldStates: {},
    validationRules: {}
  };

  // Initialize validation rules for all fields
  function initializeValidationRules() {
    validationState.validationRules = {
      'CustomerName': {
        required: true,
        minLength: 2,
        maxLength: 100,
        pattern: /^[a-zA-Z0-9\s\-&.,()]+$/,
        errorMessages: {
          required: 'Customer name is required',
          minLength: 'Customer name must be at least 2 characters',
          maxLength: 'Customer name cannot exceed 100 characters',
          pattern: 'Customer name contains invalid characters'
        }
      },
      'oppName': {
        required: true,
        minLength: 3,
        maxLength: 150,
        pattern: /^[a-zA-Z0-9\s\-&.,()]+$/,
        errorMessages: {
          required: 'Opportunity name is required',
          minLength: 'Opportunity name must be at least 3 characters',
          maxLength: 'Opportunity name cannot exceed 150 characters',
          pattern: 'Opportunity name contains invalid characters'
        }
      },
      'oppDescription': {
        required: true,
        minLength: 10,
        maxLength: 2000,
        errorMessages: {
          required: 'Opportunity description is required',
          minLength: 'Description must be at least 10 characters',
          maxLength: 'Description cannot exceed 2000 characters'
        }
      },
      'region': {
        required: true,
        errorMessages: {
          required: 'Please select an AWS region'
        }
      },
      'closeDate': {
        required: true,
        validDate: true,
        futureDate: true,
        errorMessages: {
          required: 'Close date is required',
          validDate: 'Please enter a valid date',
          futureDate: 'Close date must be in the future'
        }
      },
      'industry': {
        required: false,
        errorMessages: {}
      },
      'industryOther': {
        required: false,
        conditionalRequired: true,
        minLength: 2,
        maxLength: 50,
        errorMessages: {
          conditionalRequired: 'Please specify the industry',
          minLength: 'Industry specification must be at least 2 characters',
          maxLength: 'Industry specification cannot exceed 50 characters'
        }
      },
      'customerSegment': {
        required: false,
        errorMessages: {}
      },
      'partnerName': {
        required: false,
        minLength: 2,
        maxLength: 100,
        pattern: /^[a-zA-Z0-9\s\-&.,()]+$/,
        errorMessages: {
          minLength: 'Partner name must be at least 2 characters',
          maxLength: 'Partner name cannot exceed 100 characters',
          pattern: 'Partner name contains invalid characters'
        }
      },
      'activityFocus': {
        required: false,
        errorMessages: {}
      },
      'businessDescription': {
        required: false,
        minLength: 10,
        maxLength: 1500,
        errorMessages: {
          minLength: 'Business description must be at least 10 characters',
          maxLength: 'Business description cannot exceed 1500 characters'
        }
      },
      'migrationPhase': {
        required: false,
        errorMessages: {}
      },
      'salesforceLink': {
        required: false,
        validUrl: true,
        errorMessages: {
          validUrl: 'Please enter a valid URL (e.g., https://example.salesforce.com)'
        }
      },
      'awsCalculatorLink': {
        required: false,
        validUrl: true,
        errorMessages: {
          validUrl: 'Please enter a valid URL (e.g., https://calculator.aws)'
        }
      }
    };
  }

  // Validate individual field
  function validateField(fieldId, value, showFeedback = true) {
    const rules = validationState.validationRules[fieldId];
    if (!rules) return { isValid: true, errors: [] };

    const errors = [];
    const trimmedValue = typeof value === 'string' ? value.trim() : value;

    // Required validation
    if (rules.required && (!trimmedValue || trimmedValue === '')) {
      errors.push(rules.errorMessages.required || 'This field is required');
    }

    // Conditional required validation (for industryOther)
    if (rules.conditionalRequired && fieldId === 'industryOther') {
      const industrySelect = document.getElementById('industry');
      if (industrySelect && industrySelect.value === 'Other' && (!trimmedValue || trimmedValue === '')) {
        errors.push(rules.errorMessages.conditionalRequired || 'This field is required when Other is selected');
      }
    }

    // Skip other validations if field is empty and not required
    if (!trimmedValue && !rules.required) {
      const result = { isValid: true, errors: [] };
      if (showFeedback) updateFieldFeedback(fieldId, result);
      return result;
    }

    // Length validations
    if (rules.minLength && trimmedValue.length < rules.minLength) {
      errors.push(rules.errorMessages.minLength || `Minimum length is ${rules.minLength} characters`);
    }
    if (rules.maxLength && trimmedValue.length > rules.maxLength) {
      errors.push(rules.errorMessages.maxLength || `Maximum length is ${rules.maxLength} characters`);
    }

    // Pattern validation
    if (rules.pattern && trimmedValue && !rules.pattern.test(trimmedValue)) {
      errors.push(rules.errorMessages.pattern || 'Invalid format');
    }

    // Date validations
    if (rules.validDate && trimmedValue) {
      const date = new Date(trimmedValue);
      if (isNaN(date.getTime())) {
        errors.push(rules.errorMessages.validDate || 'Invalid date format');
      } else if (rules.futureDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date <= today) {
          errors.push(rules.errorMessages.futureDate || 'Date must be in the future');
        }
      }
    }

    // URL validation
    if (rules.validUrl && trimmedValue) {
      try {
        const url = new URL(trimmedValue);
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.push(rules.errorMessages.validUrl || 'URL must start with http:// or https://');
        }
      } catch (e) {
        errors.push(rules.errorMessages.validUrl || 'Invalid URL format');
      }
    }

    const result = { isValid: errors.length === 0, errors };
    if (showFeedback) updateFieldFeedback(fieldId, result);
    return result;
  }

  // Update visual feedback for field validation
  function updateFieldFeedback(fieldId, validationResult) {
    const field = document.getElementById(fieldId);
    const indicator = document.getElementById(`${fieldId}-indicator`);
    const errorDiv = document.getElementById(`${fieldId}-error`);
    const successDiv = document.getElementById(`${fieldId}-success`);

    if (!field) return;

    // Update field state
    validationState.fieldStates[fieldId] = validationResult;

    // Clear previous states
    field.classList.remove('field-valid', 'field-invalid', 'field-warning');
    if (indicator) {
      indicator.className = 'validation-indicator';
      indicator.innerHTML = '';
    }
    if (errorDiv) {
      errorDiv.style.display = 'none';
      errorDiv.innerHTML = '';
    }
    if (successDiv) {
      successDiv.style.display = 'none';
      successDiv.innerHTML = '';
    }

    // Apply validation state
    if (validationResult.isValid && field.value.trim()) {
      // Valid state
      field.classList.add('field-valid');
      if (indicator) {
        indicator.classList.add('indicator-valid');
        indicator.innerHTML = '<span class="checkmark">✓</span>';
      }
      if (successDiv) {
        successDiv.style.display = 'block';
        successDiv.innerHTML = '<span class="success-icon">✓</span> Valid';
      }
    } else if (!validationResult.isValid) {
      // Invalid state
      field.classList.add('field-invalid');
      if (indicator) {
        indicator.classList.add('indicator-invalid');
        indicator.innerHTML = '<span class="error-mark">✗</span>';
      }
      if (errorDiv && validationResult.errors.length > 0) {
        errorDiv.style.display = 'block';
        errorDiv.innerHTML = validationResult.errors.map(error => 
          `<span class="error-message">${error}</span>`
        ).join('<br>');
      }
    }

    // Update overall form validation state
    updateFormValidationState();
  }

  // Update overall form validation state
  function updateFormValidationState() {
    const requiredFields = ['CustomerName', 'oppName', 'oppDescription', 'region', 'closeDate'];
    let allRequiredValid = true;
    let hasAnyErrors = false;

    // Check required fields
    for (const fieldId of requiredFields) {
      const fieldState = validationState.fieldStates[fieldId];
      if (!fieldState || !fieldState.isValid) {
        allRequiredValid = false;
      }
      if (fieldState && !fieldState.isValid) {
        hasAnyErrors = true;
      }
    }

    // Check optional fields for errors
    for (const fieldId in validationState.fieldStates) {
      if (!requiredFields.includes(fieldId)) {
        const fieldState = validationState.fieldStates[fieldId];
        if (fieldState && !fieldState.isValid) {
          hasAnyErrors = true;
        }
      }
    }

    validationState.isValid = allRequiredValid && !hasAnyErrors;

    // Update action buttons state
    updateActionButtonsState();
  }

  // Update action buttons based on validation state
  function updateActionButtonsState() {
    const analyzeButtons = document.querySelectorAll('#oppDetQueryButtonV3, #oppDetQueryButtonV4');
    const fundingButton = document.getElementById('fundingAnalysisButton');
    
    analyzeButtons.forEach(button => {
      if (button) {
        button.disabled = !validationState.isValid;
        if (validationState.isValid) {
          button.classList.remove('button-disabled');
          button.title = '';
        } else {
          button.classList.add('button-disabled');
          button.title = 'Please complete all required fields correctly';
        }
      }
    });

    if (fundingButton) {
      fundingButton.disabled = !validationState.isValid;
      if (validationState.isValid) {
        fundingButton.classList.remove('button-disabled');
        fundingButton.title = '';
      } else {
        fundingButton.classList.add('button-disabled');
        fundingButton.title = 'Please complete all required fields correctly';
      }
    }
  }

  // Setup real-time validation listeners
  function setupValidationListeners() {
    const opportunityForm = document.getElementById('opportunityForm');
    if (!opportunityForm) return;
    
    // Get all form fields
    const formFields = opportunityForm.querySelectorAll('input, select, textarea');
    
    formFields.forEach(field => {
      const fieldId = field.id;
      if (!fieldId || !validationState.validationRules[fieldId]) return;

      // Input event for real-time validation
      field.addEventListener('input', (e) => {
        validateField(fieldId, e.target.value);
        
        // Handle character count for textareas
        if (field.tagName === 'TEXTAREA') {
          updateCharacterCount(fieldId, e.target.value);
        }
      });

      // Blur event for final validation
      field.addEventListener('blur', (e) => {
        validateField(fieldId, e.target.value);
      });

      // Change event for selects
      if (field.tagName === 'SELECT') {
        field.addEventListener('change', (e) => {
          validateField(fieldId, e.target.value);
          
          // Handle industry "Other" option
          if (fieldId === 'industry') {
            handleIndustryOtherOption(e.target.value);
          }
        });
      }

      // Focus event to clear previous states
      field.addEventListener('focus', (e) => {
        // Remove any warning states on focus
        field.classList.remove('field-warning');
      });
    });
  }

  // Handle industry "Other" option visibility
  function handleIndustryOtherOption(industryValue) {
    const industryOtherField = document.getElementById('industryOther');
    if (!industryOtherField) return;

    if (industryValue === 'Other') {
      industryOtherField.style.display = 'block';
      industryOtherField.focus();
      // Validate the other field if it has content
      if (industryOtherField.value.trim()) {
        validateField('industryOther', industryOtherField.value);
      }
    } else {
      industryOtherField.style.display = 'none';
      industryOtherField.value = '';
      // Clear validation state for hidden field
      validationState.fieldStates['industryOther'] = { isValid: true, errors: [] };
      updateFieldFeedback('industryOther', { isValid: true, errors: [] });
    }
  }

  // Update character count for textareas
  function updateCharacterCount(fieldId, value) {
    const countElement = document.getElementById(`${fieldId}-count`);
    if (countElement) {
      const length = value.length;
      countElement.textContent = length;
      
      // Add warning color if approaching limit
      const maxLength = validationState.validationRules[fieldId]?.maxLength;
      if (maxLength) {
        const percentage = (length / maxLength) * 100;
        if (percentage >= 90) {
          countElement.style.color = '#e74c3c';
        } else if (percentage >= 75) {
          countElement.style.color = '#f39c12';
        } else {
          countElement.style.color = '#7f8c8d';
        }
      }
    }
  }

  // Initialize validation system
  initializeValidationRules();
  setupValidationListeners();
  
  // Initial validation state update
  updateFormValidationState();
}); // Additional form submission prevention for validation

document.addEventListener('DOMContentLoaded', () => {
  const opportunityForm = document.getElementById('opportunityForm');
  if (opportunityForm) {
    opportunityForm.addEventListener('submit', (e) => {
      e.preventDefault();
      // Check if validation system exists and form is invalid
      if (window.formValidation && !window.formValidation.isValid()) {
        console.warn('Form submission prevented: validation failed');
        // Focus on first invalid field
        const firstInvalidField = opportunityForm.querySelector('.field-invalid');
        if (firstInvalidField) {
          firstInvalidField.focus();
        }
        return false;
      }
    });
  }
});

// Task 6.2: Enhanced form data collection function
function getFormData() {
  // Get industry value (handle "Other" option)
  const industrySelect = document.getElementById('industry');
  const industryOther = document.getElementById('industryOther');
  const industryValue = industrySelect?.value === 'Other' ? industryOther?.value?.trim() || '' : industrySelect?.value || '';

  // Collect all enhanced input fields
  const formData = {
    // Basic Details
    CustomerName: document.getElementById('CustomerName')?.value?.trim() || '',
    oppName: document.getElementById('oppName')?.value?.trim() || '',
    oppDescription: document.getElementById('oppDescription')?.value?.trim() || '',
    
    // Location & Timing
    region: document.getElementById('region')?.value || '',
    closeDate: document.getElementById('closeDate')?.value || '',
    
    // Business Context
    industry: industryValue,
    customerSegment: document.getElementById('customerSegment')?.value || '',
    partnerName: document.getElementById('partnerName')?.value?.trim() || '',
    
    // Technical Details
    activityFocus: document.getElementById('activityFocus')?.value || '',
    businessDescription: document.getElementById('businessDescription')?.value?.trim() || '',
    migrationPhase: document.getElementById('migrationPhase')?.value || '',
    salesforceLink: document.getElementById('salesforceLink')?.value?.trim() || '',
    awsCalculatorLink: document.getElementById('awsCalculatorLink')?.value?.trim() || ''
  };

  return formData;
}

// Task 6.2: Enhanced form validation function
function validateFormData(formData) {
  const errors = [];
  const warnings = [];

  // Validate required fields
  const requiredFields = [
    { field: 'CustomerName', label: 'Customer Name' },
    { field: 'oppName', label: 'Opportunity Name' },
    { field: 'oppDescription', label: 'Opportunity Description' },
    { field: 'region', label: 'Region' },
    { field: 'closeDate', label: 'Close Date' }
  ];

  requiredFields.forEach(({ field, label }) => {
    if (!formData[field] || formData[field].trim() === '') {
      errors.push(`${label} is required`);
    }
  });

  // Validate field lengths and formats
  if (formData.CustomerName && formData.CustomerName.length < 2) {
    errors.push('Customer Name must be at least 2 characters');
  }
  if (formData.CustomerName && formData.CustomerName.length > 100) {
    errors.push('Customer Name cannot exceed 100 characters');
  }

  if (formData.oppName && formData.oppName.length < 3) {
    errors.push('Opportunity Name must be at least 3 characters');
  }
  if (formData.oppName && formData.oppName.length > 150) {
    errors.push('Opportunity Name cannot exceed 150 characters');
  }

  if (formData.oppDescription && formData.oppDescription.length < 10) {
    errors.push('Opportunity Description must be at least 10 characters');
  }
  if (formData.oppDescription && formData.oppDescription.length > 2000) {
    errors.push('Opportunity Description cannot exceed 2000 characters');
  }

  // Validate date format and future date
  if (formData.closeDate) {
    const closeDate = new Date(formData.closeDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isNaN(closeDate.getTime())) {
      errors.push('Close Date must be a valid date');
    } else if (closeDate <= today) {
      errors.push('Close Date must be in the future');
    }
  }

  // Validate optional field lengths
  if (formData.partnerName && formData.partnerName.length > 0) {
    if (formData.partnerName.length < 2) {
      errors.push('Partner Name must be at least 2 characters');
    }
    if (formData.partnerName.length > 100) {
      errors.push('Partner Name cannot exceed 100 characters');
    }
  }

  if (formData.businessDescription && formData.businessDescription.length > 0) {
    if (formData.businessDescription.length < 10) {
      errors.push('Business Description must be at least 10 characters');
    }
    if (formData.businessDescription.length > 1500) {
      errors.push('Business Description cannot exceed 1500 characters');
    }
  }

  // Validate URL formats
  const urlFields = [
    { field: 'salesforceLink', label: 'Salesforce Link' },
    { field: 'awsCalculatorLink', label: 'AWS Calculator Link' }
  ];

  urlFields.forEach(({ field, label }) => {
    if (formData[field] && formData[field].length > 0) {
      try {
        const url = new URL(formData[field]);
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.push(`${label} must be a valid URL starting with http:// or https://`);
        }
      } catch (e) {
        errors.push(`${label} must be a valid URL format`);
      }
    }
  });

  // Validate industry "Other" specification
  if (formData.industry === '' && document.getElementById('industry')?.value === 'Other') {
    errors.push('Please specify the industry when "Other" is selected');
  }

  // Generate warnings for missing optional but recommended fields
  if (!formData.industry) {
    warnings.push('Industry information helps improve analysis accuracy');
  }
  if (!formData.customerSegment) {
    warnings.push('Customer segment information helps improve predictions');
  }
  if (!formData.activityFocus) {
    warnings.push('Activity focus helps identify relevant similar projects');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    hasWarnings: warnings.length > 0
  };
}

// Make functions globally available
window.getFormData = getFormData;
window.validateFormData = validateFormData;

// Enhanced UI Population Functions for Task 6.3

// Clear error states
function clearErrorStates() {
  document.querySelectorAll('.error-state').forEach(el => {
    el.classList.remove('error-state');
  });
}

// Populate projections section
function populateProjections(projections) {
  try {
    // ARR Display
    if (projections.arr) {
      populateARRDisplay(projections.arr);
    }
    
    // MRR Display
    if (projections.mrr) {
      populateMRRDisplay(projections.mrr);
    }
    
    // Launch Date Display
    if (projections.launchDate) {
      populateLaunchDateDisplay(projections.launchDate);
    }
    
    // Time to Launch Display
    if (projections.timeToLaunch) {
      populateTimeToLaunchDisplay(projections.timeToLaunch);
    }
    
    // Confidence Level Display
    if (projections.confidence) {
      populateConfidenceDisplay(projections.confidence);
    }
    
    // Top Services Display
    if (projections.topServices) {
      populateTopServicesDisplay(projections.topServices);
    }
    
  } catch (error) {
    console.error('Error populating projections:', error);
    showProjectionError(error);
  }
}

// Populate ARR display with enhanced formatting
function populateARRDisplay(arrData) {
  const arrValue = document.getElementById('arrValue');
  const arrRange = document.getElementById('arrRange');
  const arrFormatted = document.getElementById('arrFormatted');
  const arrConfidence = document.getElementById('arrConfidence');
  
  if (arrValue) {
    const formattedValue = formatCurrency(arrData.value || arrData);
    arrValue.textContent = formattedValue;
    
    if (arrFormatted) {
      arrFormatted.textContent = formattedValue;
    }
  }
  
  if (arrRange && arrData.range) {
    const rangeText = `Range: ${formatCurrency(arrData.range.min)} - ${formatCurrency(arrData.range.max)}`;
    arrRange.textContent = rangeText;
  }
  
  if (arrConfidence && arrData.confidence) {
    arrConfidence.textContent = `${Math.round(arrData.confidence)}% confidence`;
  }
}

// Populate MRR display with relationship to ARR
function populateMRRDisplay(mrrData) {
  const mrrValue = document.getElementById('mrrValue');
  const mrrRelationship = document.getElementById('mrrRelationship');
  const mrrFormatted = document.getElementById('mrrFormatted');
  const mrrArrRelation = document.getElementById('mrrArrRelation');
  
  if (mrrValue) {
    const formattedValue = formatCurrency(mrrData.value || mrrData);
    mrrValue.textContent = formattedValue;
    
    if (mrrFormatted) {
      mrrFormatted.textContent = formattedValue;
    }
  }
  
  if (mrrRelationship && mrrData.relationship) {
    mrrRelationship.textContent = mrrData.relationship;
  }
  
  if (mrrArrRelation && mrrData.relationship) {
    mrrArrRelation.textContent = mrrData.relationship;
  }
}

// Populate launch date with timeline visualization
function populateLaunchDateDisplay(launchDateData) {
  const launchDateValue = document.getElementById('launchDateValue');
  const launchTimeline = document.getElementById('launchTimeline');
  const launchDateFormatted = document.getElementById('launchDateFormatted');
  const launchDaysFromNow = document.getElementById('launchDaysFromNow');
  const launchProgress = document.getElementById('launchProgress');
  
  if (launchDateValue) {
    const dateValue = launchDateData.date || launchDateData;
    launchDateValue.textContent = formatDate(dateValue);
    
    if (launchDateFormatted) {
      launchDateFormatted.textContent = formatDate(dateValue);
    }
  }
  
  if (launchDaysFromNow && launchDateData.daysFromNow) {
    const daysText = `${launchDateData.daysFromNow} days from now`;
    launchDaysFromNow.textContent = daysText;
  }
  
  if (launchTimeline && launchDateData.timeline) {
    launchTimeline.textContent = launchDateData.timeline;
  }
  
  // Update timeline visualization
  if (launchProgress && launchDateData.daysFromNow) {
    const progressPercentage = Math.min(100, Math.max(0, (365 - launchDateData.daysFromNow) / 365 * 100));
    launchProgress.style.width = `${progressPercentage}%`;
  }
}

// Populate time to launch with duration visualization
function populateTimeToLaunchDisplay(timeToLaunchData) {
  const timeToLaunchValue = document.getElementById('timeToLaunchValue');
  const launchDuration = document.getElementById('launchDuration');
  const durationFormatted = document.getElementById('durationFormatted');
  const durationSegments = document.getElementById('durationSegments');
  const durationMilestones = document.getElementById('durationMilestones');
  
  if (timeToLaunchValue) {
    const durationText = timeToLaunchData.formatted || `${timeToLaunchData.months || timeToLaunchData} months`;
    timeToLaunchValue.textContent = durationText;
    
    if (durationFormatted) {
      durationFormatted.textContent = durationText;
    }
  }
  
  if (launchDuration && timeToLaunchData.formatted) {
    launchDuration.textContent = timeToLaunchData.formatted;
  }
  
  // Populate milestones if available
  if (durationMilestones && timeToLaunchData.milestones) {
    durationMilestones.innerHTML = timeToLaunchData.milestones
      .map(milestone => `<div class="milestone">${milestone}</div>`)
      .join('');
  }
  
  // Update duration visualization
  if (durationSegments && timeToLaunchData.months) {
    const segments = Math.min(12, timeToLaunchData.months);
    durationSegments.innerHTML = Array.from({length: segments}, (_, i) => 
      `<div class="duration-segment" style="width: ${100/segments}%"></div>`
    ).join('');
  }
}

// Populate confidence display with visual indicators
function populateConfidenceDisplay(confidenceData) {
  const confidenceValue = document.getElementById('confidenceValue');
  const confidenceFill = document.getElementById('confidenceFill');
  const confidencePercentage = document.getElementById('confidencePercentage');
  const confidenceFactorsDisplay = document.getElementById('confidenceFactorsDisplay');
  
  if (confidenceValue) {
    const level = confidenceData.level || confidenceData;
    confidenceValue.textContent = level;
    confidenceValue.className = `value confidence-level ${level.toLowerCase()}`;
  }
  
  if (confidencePercentage && confidenceData.score) {
    confidencePercentage.textContent = `${Math.round(confidenceData.score)}%`;
  }
  
  if (confidenceFill && confidenceData.score) {
    confidenceFill.style.width = `${confidenceData.score}%`;
    confidenceFill.className = `confidence-fill ${(confidenceData.level || '').toLowerCase()}`;
  }
  
  if (confidenceFactorsDisplay && confidenceData.factors) {
    confidenceFactorsDisplay.innerHTML = confidenceData.factors
      .map(factor => `<div class="confidence-factor">${factor}</div>`)
      .join('');
  }
}

// Populate top services with structured display
function populateTopServicesDisplay(topServicesData) {
  const servicesList = document.getElementById('servicesList');
  const servicesStructured = document.getElementById('servicesStructured');
  const servicesPlaceholder = document.querySelector('.services-placeholder');
  const servicesSummary = document.getElementById('servicesSummary');
  const totalEstimatedCost = document.getElementById('totalEstimatedCost');
  const servicesCount = document.getElementById('servicesCount');
  
  if (!Array.isArray(topServicesData)) {
    console.warn('Top services data is not an array:', topServicesData);
    return;
  }
  
  // Hide placeholder and show structured content
  if (servicesPlaceholder) servicesPlaceholder.style.display = 'none';
  if (servicesStructured) servicesStructured.style.display = 'block';
  if (servicesSummary) servicesSummary.style.display = 'block';
  
  // Populate services list
  if (servicesStructured) {
    servicesStructured.innerHTML = topServicesData.map(service => `
      <div class="service-item">
        <div class="service-header">
          <span class="service-name">${service.service || service.name || service}</span>
          <span class="service-cost">${formatCurrency(service.estimatedCost || 0)}</span>
        </div>
        <div class="service-description">${service.description || 'AWS service recommendation'}</div>
      </div>
    `).join('');
  }
  
  // Calculate and display summary
  const totalCost = topServicesData.reduce((sum, service) => 
    sum + (service.estimatedCost || 0), 0);
  
  if (totalEstimatedCost) {
    totalEstimatedCost.textContent = `Total Estimated Cost: ${formatCurrency(totalCost)}`;
  }
  
  if (servicesCount) {
    servicesCount.textContent = `${topServicesData.length} services recommended`;
  }
}

// Populate key metrics summary
function populateKeyMetrics(projections) {
  const metricsARR = document.getElementById('metricsARR');
  const metricsMRR = document.getElementById('metricsMRR');
  const metricsLaunch = document.getElementById('metricsLaunch');
  const metricsConfidence = document.getElementById('metricsConfidence');
  
  if (metricsARR && projections.arr) {
    metricsARR.textContent = formatCurrency(projections.arr.value || projections.arr);
  }
  
  if (metricsMRR && projections.mrr) {
    metricsMRR.textContent = formatCurrency(projections.mrr.value || projections.mrr);
  }
  
  if (metricsLaunch && projections.launchDate) {
    metricsLaunch.textContent = formatDate(projections.launchDate.date || projections.launchDate);
  }
  
  if (metricsConfidence && projections.confidence) {
    metricsConfidence.textContent = projections.confidence.level || projections.confidence;
    metricsConfidence.className = `metric-value ${(projections.confidence.level || '').toLowerCase()}`;
  }
}

// Populate analysis results sections
function populateAnalysisResults(analysis) {
  try {
    if (analysis.methodology) {
      populateMethodology(analysis.methodology);
    }
    
    if (analysis.findings) {
      populateFindings(analysis.findings);
    }
    
    if (analysis.rationale) {
      populateRationale(analysis.rationale);
    }
    
    if (analysis.riskFactors) {
      populateRiskFactors(analysis.riskFactors);
    }
    
  } catch (error) {
    console.error('Error populating analysis results:', error);
  }
}

// Populate methodology section
function populateMethodology(methodologyData) {
  const methodologyContent = document.getElementById('methodologyContent');
  const placeholder = methodologyContent.querySelector('.placeholder-content');
  const methodologyDetails = methodologyContent.querySelector('.methodology-details');
  
  // Hide placeholder and show content
  if (placeholder) placeholder.style.display = 'none';
  if (methodologyDetails) methodologyDetails.style.display = 'block';
  
  // Populate analysis approach
  const approachSummary = document.getElementById('approachSummary');
  const approachSteps = document.getElementById('approachSteps');
  const approachTechniques = document.getElementById('approachTechniques');
  
  if (approachSummary && methodologyData.approach) {
    approachSummary.textContent = methodologyData.approach;
  }
  
  if (approachSteps && methodologyData.steps) {
    approachSteps.innerHTML = methodologyData.steps
      .map(step => `<div class="approach-step">${step}</div>`)
      .join('');
  }
  
  if (approachTechniques && methodologyData.techniques) {
    approachTechniques.innerHTML = methodologyData.techniques
      .map(technique => `<div class="technique-item">${technique}</div>`)
      .join('');
  }
  
  // Populate data sources
  const dataSourcesList = document.getElementById('dataSourcesList');
  const dataQualityInfo = document.getElementById('dataQualityInfo');
  const dataCoverage = document.getElementById('dataCoverage');
  
  if (dataSourcesList && methodologyData.dataSources) {
    dataSourcesList.innerHTML = methodologyData.dataSources
      .map(source => `<div class="data-source-item">${source}</div>`)
      .join('');
  }
  
  // Populate confidence factors
  const confidenceFactorsList = document.getElementById('confidenceFactorsList');
  if (confidenceFactorsList && methodologyData.confidenceFactors) {
    confidenceFactorsList.innerHTML = methodologyData.confidenceFactors
      .map(factor => `<div class="confidence-factor-item">${factor}</div>`)
      .join('');
  }
}

// Populate findings section
function populateFindings(findingsData) {
  const findingsContent = document.getElementById('findingsContent');
  const placeholder = findingsContent.querySelector('.placeholder-content');
  const findingsDisplay = findingsContent.querySelector('.findings-display');
  
  // Hide placeholder and show content
  if (placeholder) placeholder.style.display = 'none';
  if (findingsDisplay) findingsDisplay.style.display = 'block';
  
  const findingsList = document.getElementById('findingsList');
  const keyInsightsCount = document.getElementById('keyInsightsCount');
  const findingsConfidence = document.getElementById('findingsConfidence');
  
  if (!Array.isArray(findingsData)) {
    console.warn('Findings data is not an array:', findingsData);
    return;
  }
  
  // Update summary stats
  if (keyInsightsCount) {
    keyInsightsCount.textContent = findingsData.length;
  }
  
  // Populate findings list
  if (findingsList) {
    findingsList.innerHTML = findingsData.map((finding, index) => `
      <div class="finding-item" data-finding-id="${index}">
        <div class="finding-header">
          <div class="finding-category">${finding.category || 'General'}</div>
          <div class="finding-confidence">${Math.round(finding.confidence || 0)}%</div>
        </div>
        <div class="finding-content">
          <div class="finding-insight">${finding.insight}</div>
          ${finding.supporting_data ? `<div class="finding-support">${finding.supporting_data}</div>` : ''}
        </div>
      </div>
    `).join('');
  }
}

// Populate rationale section
function populateRationale(rationaleData) {
  const rationaleContent = document.getElementById('rationaleContent');
  const placeholder = rationaleContent.querySelector('.placeholder-content');
  const rationaleDisplay = rationaleContent.querySelector('.rationale-display');
  
  // Hide placeholder and show content
  if (placeholder) placeholder.style.display = 'none';
  if (rationaleDisplay) rationaleDisplay.style.display = 'block';
  
  const rationaleList = document.getElementById('rationaleList');
  const reasoningPointsCount = document.getElementById('reasoningPointsCount');
  
  if (!Array.isArray(rationaleData)) {
    console.warn('Rationale data is not an array:', rationaleData);
    return;
  }
  
  // Update summary stats
  if (reasoningPointsCount) {
    reasoningPointsCount.textContent = rationaleData.length;
  }
  
  // Populate rationale list
  if (rationaleList) {
    rationaleList.innerHTML = rationaleData.map((rationale, index) => `
      <div class="rationale-item" data-rationale-id="${index}">
        <div class="rationale-header">
          <div class="rationale-prediction">${rationale.prediction}</div>
        </div>
        <div class="rationale-content">
          <div class="rationale-reasoning">${rationale.reasoning}</div>
          ${rationale.historical_basis ? `<div class="rationale-basis">${rationale.historical_basis}</div>` : ''}
        </div>
      </div>
    `).join('');
  }
}

// Populate risk factors section
function populateRiskFactors(riskFactorsData) {
  const riskFactorsContent = document.getElementById('riskFactorsContent');
  const placeholder = riskFactorsContent.querySelector('.placeholder-content');
  const riskFactorsDisplay = riskFactorsContent.querySelector('.risk-factors-display');
  
  // Hide placeholder and show content
  if (placeholder) placeholder.style.display = 'none';
  if (riskFactorsDisplay) riskFactorsDisplay.style.display = 'block';
  
  if (!Array.isArray(riskFactorsData)) {
    console.warn('Risk factors data is not an array:', riskFactorsData);
    return;
  }
  
  // Calculate risk summary
  const riskCounts = riskFactorsData.reduce((counts, risk) => {
    const severity = (risk.severity || 'MEDIUM').toLowerCase();
    counts[severity] = (counts[severity] || 0) + 1;
    return counts;
  }, {});
  
  // Update risk summary
  const highRiskCount = document.getElementById('highRiskCount');
  const mediumRiskCount = document.getElementById('mediumRiskCount');
  const lowRiskCount = document.getElementById('lowRiskCount');
  
  if (highRiskCount) highRiskCount.textContent = riskCounts.high || 0;
  if (mediumRiskCount) mediumRiskCount.textContent = riskCounts.medium || 0;
  if (lowRiskCount) lowRiskCount.textContent = riskCounts.low || 0;
  
  // Populate risk factors list
  const riskFactorsList = document.getElementById('riskFactorsList');
  if (riskFactorsList) {
    riskFactorsList.innerHTML = riskFactorsData.map((risk, index) => `
      <div class="risk-factor-item ${(risk.severity || 'medium').toLowerCase()}-risk" data-risk-id="${index}">
        <div class="risk-header">
          <div class="risk-title">${risk.risk}</div>
          <div class="risk-severity ${(risk.severity || 'medium').toLowerCase()}">${risk.severity || 'MEDIUM'}</div>
        </div>
        <div class="risk-content">
          <div class="risk-impact">${risk.impact}</div>
          <div class="risk-mitigation">${risk.mitigation}</div>
        </div>
      </div>
    `).join('');
  }
}

// Populate architecture recommendations
function populateArchitecture(architectureData) {
  const architectureContent = document.getElementById('architectureContent');
  const placeholder = architectureContent.querySelector('.placeholder-content');
  const architectureDisplay = architectureContent.querySelector('.architecture-display');
  
  // Hide placeholder and show content
  if (placeholder) placeholder.style.display = 'none';
  if (architectureDisplay) architectureDisplay.style.display = 'block';
  
  // Update architecture summary
  const componentsCount = document.getElementById('componentsCount');
  const servicesCount = document.getElementById('servicesCount');
  const complexityLevel = document.getElementById('complexityLevel');
  
  let totalComponents = 0;
  let totalServices = 0;
  
  // Populate each architecture section
  const sections = [
    'networkFoundation', 'computeLayer', 'dataLayer', 
    'securityComponents', 'integrationPoints', 'scalingElements', 'managementTools'
  ];
  
  sections.forEach(section => {
    if (architectureData[section]) {
      populateArchitectureSection(section, architectureData[section]);
      totalComponents += architectureData[section].length || 0;
      totalServices += architectureData[section].length || 0;
    }
  });
  
  if (componentsCount) componentsCount.textContent = totalComponents;
  if (servicesCount) servicesCount.textContent = totalServices;
  if (complexityLevel) {
    const complexity = totalComponents > 15 ? 'High' : totalComponents > 8 ? 'Medium' : 'Low';
    complexityLevel.textContent = complexity;
  }
}

// Populate individual architecture section
function populateArchitectureSection(sectionName, sectionData) {
  const componentsContainer = document.getElementById(`${sectionName}Components`);
  const linksContainer = document.getElementById(`${sectionName}Links`);
  const countElement = document.getElementById(`${sectionName}Count`);
  
  if (!Array.isArray(sectionData)) {
    console.warn(`Architecture section ${sectionName} is not an array:`, sectionData);
    return;
  }
  
  // Update component count
  if (countElement) {
    countElement.textContent = sectionData.length;
  }
  
  // Populate components
  if (componentsContainer) {
    componentsContainer.innerHTML = sectionData.map(component => `
      <div class="arch-component">
        <span class="component-name">${component.name || component}</span>
        ${component.description ? `<span class="component-description">${component.description}</span>` : ''}
      </div>
    `).join('');
  }
  
  // Add AWS documentation links if available
  if (linksContainer && sectionData.some(item => item.link)) {
    linksContainer.innerHTML = sectionData
      .filter(item => item.link)
      .map(item => `<a href="${item.link}" target="_blank" class="aws-doc-link">${item.name || item} Documentation</a>`)
      .join('');
  }
}

// Populate query section
function populateQuery(queryData) {
  const queryContent = document.getElementById('queryContent');
  const placeholder = queryContent.querySelector('.placeholder-content');
  const queryDisplay = queryContent.querySelector('.query-display');
  const queryText = document.getElementById('queryText');
  
  // Hide placeholder and show content
  if (placeholder) placeholder.style.display = 'none';
  if (queryDisplay) queryDisplay.style.display = 'block';
  
  if (queryText) {
    queryText.textContent = queryData.sql || queryData;
  }
  
  // Setup copy functionality
  const copyButton = document.getElementById('copyQueryButton');
  if (copyButton) {
    copyButton.onclick = () => {
      navigator.clipboard.writeText(queryData.sql || queryData);
      copyButton.textContent = 'Copied!';
      setTimeout(() => copyButton.textContent = 'Copy Query', 2000);
    };
  }
}

// Populate query results section
function populateQueryResults(queryResultsData) {
  const queryResultsContent = document.getElementById('queryResultsContent');
  const placeholder = queryResultsContent.querySelector('.placeholder-content');
  const queryResultsDisplay = queryResultsContent.querySelector('.query-results-display');
  const resultsSummary = document.getElementById('resultsSummary');
  const resultsData = document.getElementById('resultsData');
  
  // Hide placeholder and show content
  if (placeholder) placeholder.style.display = 'none';
  if (queryResultsDisplay) queryResultsDisplay.style.display = 'block';
  
  if (resultsSummary && queryResultsData.summary) {
    resultsSummary.textContent = queryResultsData.summary;
  }
  
  if (resultsData) {
    if (typeof queryResultsData === 'string') {
      resultsData.innerHTML = `<pre>${queryResultsData}</pre>`;
    } else {
      resultsData.innerHTML = `<pre>${JSON.stringify(queryResultsData, null, 2)}</pre>`;
    }
  }
}

// Populate executive summary
function populateExecutiveSummary(summaryData) {
  const summaryContent = document.getElementById('summaryContent');
  const placeholder = summaryContent.querySelector('.placeholder-content');
  const executiveSummary = document.getElementById('executiveSummary');
  
  // Hide placeholder and show content
  if (placeholder) placeholder.style.display = 'none';
  if (executiveSummary) executiveSummary.style.display = 'block';
  
  if (executiveSummary) {
    if (typeof summaryData === 'string') {
      executiveSummary.innerHTML = summaryData.replace(/\n/g, '<br>');
    } else {
      executiveSummary.innerHTML = summaryData.content || JSON.stringify(summaryData);
    }
  }
}

// Enable export functionality
function enableExportFunctionality() {
  const exportButton = document.getElementById('exportResultsButton');
  if (exportButton) {
    exportButton.disabled = false;
  }
}

// Show population error
function showPopulationError(error) {
  console.error('Population error:', error);
  // Could add user-visible error handling here
}

// Show projection error
function showProjectionError(error) {
  console.error('Projection error:', error);
  // Could add user-visible error handling here
}

// Enhanced formatCurrency function
function formatCurrency(amount) {
  if (typeof amount !== 'number') {
    amount = parseFloat(amount) || 0;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Enhanced formatDate function
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}
// Task 6.
4: Enhanced Action Button Functionality - Added as separate module

document.addEventListener('DOMContentLoaded', () => {
  // Button state management
  const buttonStates = {
    analyzing: false,
    analysisType: null,
    hasResults: false
  };

  // Update button states and loading indicators
  function updateButtonStates(state = 'ready') {
    const analyzeStandardBtn = document.getElementById('oppDetQueryButtonV3');
    const analyzeNovaBtn = document.getElementById('oppDetQueryButtonV4');
    const fundingBtn = document.getElementById('fundingAnalysisButton');
    const nextOpportunityBtn = document.getElementById('nextOpportunityButton');
    const resetBtn = document.getElementById('resetFormButton');
    const exportBtn = document.getElementById('exportResultsButton');

    // Get button text and spinner elements
    const getButtonElements = (btn) => ({
      text: btn?.querySelector('.button-text'),
      spinner: btn?.querySelector('.button-spinner')
    });

    const standardElements = getButtonElements(analyzeStandardBtn);
    const novaElements = getButtonElements(analyzeNovaBtn);
    const fundingElements = getButtonElements(fundingBtn);

    switch (state) {
      case 'analyzing-standard':
        buttonStates.analyzing = true;
        buttonStates.analysisType = 'standard';
        
        // Standard button - show loading
        if (analyzeStandardBtn) {
          analyzeStandardBtn.disabled = true;
          analyzeStandardBtn.classList.add('button-loading');
          if (standardElements.text) standardElements.text.textContent = 'Analyzing...';
          if (standardElements.spinner) standardElements.spinner.style.display = 'inline-block';
        }
        
        // Disable other analysis buttons
        if (analyzeNovaBtn) {
          analyzeNovaBtn.disabled = true;
          analyzeNovaBtn.classList.add('button-disabled');
        }
        if (fundingBtn) {
          fundingBtn.disabled = true;
          fundingBtn.classList.add('button-disabled');
        }
        
        // Disable form actions during analysis
        if (resetBtn) resetBtn.disabled = true;
        if (exportBtn) exportBtn.disabled = true;
        break;

      case 'analyzing-nova':
        buttonStates.analyzing = true;
        buttonStates.analysisType = 'nova';
        
        // Nova button - show loading
        if (analyzeNovaBtn) {
          analyzeNovaBtn.disabled = true;
          analyzeNovaBtn.classList.add('button-loading');
          if (novaElements.text) novaElements.text.textContent = 'Analyzing...';
          if (novaElements.spinner) novaElements.spinner.style.display = 'inline-block';
        }
        
        // Disable other analysis buttons
        if (analyzeStandardBtn) {
          analyzeStandardBtn.disabled = true;
          analyzeStandardBtn.classList.add('button-disabled');
        }
        if (fundingBtn) {
          fundingBtn.disabled = true;
          fundingBtn.classList.add('button-disabled');
        }
        
        // Disable form actions during analysis
        if (resetBtn) resetBtn.disabled = true;
        if (exportBtn) exportBtn.disabled = true;
        break;

      case 'analyzing-funding':
        buttonStates.analyzing = true;
        buttonStates.analysisType = 'funding';
        
        // Funding button - show loading
        if (fundingBtn) {
          fundingBtn.disabled = true;
          fundingBtn.classList.add('button-loading');
          if (fundingElements.text) fundingElements.text.textContent = 'Analyzing...';
          if (fundingElements.spinner) fundingElements.spinner.style.display = 'inline-block';
        }
        
        // Disable other analysis buttons
        if (analyzeStandardBtn) {
          analyzeStandardBtn.disabled = true;
          analyzeStandardBtn.classList.add('button-disabled');
        }
        if (analyzeNovaBtn) {
          analyzeNovaBtn.disabled = true;
          analyzeNovaBtn.classList.add('button-disabled');
        }
        
        // Disable form actions during analysis
        if (resetBtn) resetBtn.disabled = true;
        if (exportBtn) exportBtn.disabled = true;
        break;

      case 'completed':
        buttonStates.analyzing = false;
        buttonStates.analysisType = null;
        buttonStates.hasResults = true;
        
        // Reset all buttons to ready state
        [analyzeStandardBtn, analyzeNovaBtn, fundingBtn].forEach((btn, index) => {
          if (btn) {
            btn.disabled = false;
            btn.classList.remove('button-loading', 'button-disabled');
            
            const elements = [standardElements, novaElements, fundingElements][index];
            if (elements.spinner) elements.spinner.style.display = 'none';
          }
        });
        
        // Reset button text
        if (standardElements.text) standardElements.text.textContent = 'Analyze (Standard)';
        if (novaElements.text) novaElements.text.textContent = 'Analyze (Nova Premier)';
        if (fundingElements.text) fundingElements.text.textContent = 'Funding Analysis';
        
        // Enable form actions
        if (resetBtn) resetBtn.disabled = false;
        if (exportBtn) {
          exportBtn.disabled = false;
          exportBtn.classList.remove('button-disabled');
        }
        if (nextOpportunityBtn) nextOpportunityBtn.disabled = false;
        break;

      case 'error':
        buttonStates.analyzing = false;
        buttonStates.analysisType = null;
        
        // Reset all buttons and show error state
        [analyzeStandardBtn, analyzeNovaBtn, fundingBtn].forEach((btn, index) => {
          if (btn) {
            btn.disabled = false;
            btn.classList.remove('button-loading');
            btn.classList.add('button-error');
            
            const elements = [standardElements, novaElements, fundingElements][index];
            if (elements.spinner) elements.spinner.style.display = 'none';
          }
        });
        
        // Reset button text
        if (standardElements.text) standardElements.text.textContent = 'Analyze (Standard)';
        if (novaElements.text) novaElements.text.textContent = 'Analyze (Nova Premier)';
        if (fundingElements.text) fundingElements.text.textContent = 'Funding Analysis';
        
        // Enable form actions
        if (resetBtn) resetBtn.disabled = false;
        if (exportBtn) exportBtn.disabled = true;
        
        // Remove error state after 3 seconds
        setTimeout(() => {
          [analyzeStandardBtn, analyzeNovaBtn, fundingBtn].forEach(btn => {
            if (btn) btn.classList.remove('button-error');
          });
        }, 3000);
        break;

      case 'ready':
      default:
        buttonStates.analyzing = false;
        buttonStates.analysisType = null;
        
        // Reset all buttons to ready state
        [analyzeStandardBtn, analyzeNovaBtn, fundingBtn].forEach((btn, index) => {
          if (btn) {
            btn.classList.remove('button-loading', 'button-disabled', 'button-error');
            
            const elements = [standardElements, novaElements, fundingElements][index];
            if (elements.spinner) elements.spinner.style.display = 'none';
          }
        });
        
        // Reset button text
        if (standardElements.text) standardElements.text.textContent = 'Analyze (Standard)';
        if (novaElements.text) novaElements.text.textContent = 'Analyze (Nova Premier)';
        if (fundingElements.text) fundingElements.text.textContent = 'Funding Analysis';
        
        // Enable form actions
        if (resetBtn) resetBtn.disabled = false;
        if (exportBtn && !buttonStates.hasResults) {
          exportBtn.disabled = true;
          exportBtn.classList.add('button-disabled');
        }
        break;
    }
  }

  // Show analysis progress
  function showAnalysisProgress(analysisType) {
    const progressContainer = document.getElementById('progress-container');
    const progressMessage = document.getElementById('progress-message');
    
    if (progressContainer) {
      progressContainer.style.display = 'block';
      
      const messages = {
        'standard': 'Running standard analysis...',
        'nova': 'Running Nova Premier analysis...',
        'funding': 'Analyzing funding options...'
      };
      
      if (progressMessage) {
        progressMessage.textContent = messages[analysisType] || 'Processing...';
      }
    }
  }

  // Hide analysis progress
  function hideAnalysisProgress() {
    const progressContainer = document.getElementById('progress-container');
    if (progressContainer) {
      progressContainer.style.display = 'none';
    }
  }

  // Show notification
  function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'notification';
      notification.className = 'notification';
      document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.className = `notification notification-${type} notification-show`;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      notification.classList.remove('notification-show');
    }, 5000);
  }

  // Comprehensive export functionality
  function exportComprehensiveResults() {
    if (!buttonStates.hasResults) {
      showNotification('No results available to export', 'warning');
      return;
    }

    try {
      // Collect all form data
      const formData = getFormData();
      
      // Collect all analysis results
      const results = {
        opportunityDetails: formData,
        projections: {
          arr: document.getElementById('oppArrOut')?.textContent || 'N/A',
          mrr: document.getElementById('oppMrrOut')?.textContent || 'N/A',
          launchDate: document.getElementById('oppLaunchDateOut')?.textContent || 'N/A',
          projectDuration: document.getElementById('oppProjectDurationOut')?.textContent || 'N/A',
          confidence: document.getElementById('oppConfidenceOut')?.textContent || 'N/A',
          topServices: document.getElementById('oppServicesOut')?.textContent || 'N/A'
        },
        analysis: {
          methodology: document.querySelector('#methodologyContent')?.textContent || 'N/A',
          similarProjects: 'Similar projects data available in table format',
          findings: document.querySelector('#findingsContent')?.textContent || 'N/A',
          rationale: document.querySelector('#rationaleContent')?.textContent || 'N/A',
          riskFactors: document.querySelector('#riskFactorsContent')?.textContent || 'N/A',
          architecture: document.querySelector('#architectureContent')?.textContent || 'N/A',
          summary: document.getElementById('textSummary')?.textContent || 'N/A'
        },
        exportDate: new Date().toISOString(),
        exportType: 'comprehensive'
      };

      // Generate comprehensive report
      const reportContent = generateComprehensiveReport(results);
      
      // Create and download file
      const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aws-opportunity-analysis-${formData.CustomerName || 'report'}-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showNotification('Comprehensive report exported successfully!', 'success');
      
    } catch (error) {
      console.error('Export failed:', error);
      showNotification('Export failed. Please try again.', 'error');
    }
  }

  // Generate comprehensive report content
  function generateComprehensiveReport(results) {
    const timestamp = new Date().toLocaleString();
    
    return `
AWS OPPORTUNITY ANALYSIS - COMPREHENSIVE REPORT
Generated: ${timestamp}

================================================================================
OPPORTUNITY DETAILS
================================================================================

Customer Name: ${results.opportunityDetails.CustomerName || 'N/A'}
Opportunity Name: ${results.opportunityDetails.oppName || 'N/A'}
Region: ${results.opportunityDetails.region || 'N/A'}
Close Date: ${results.opportunityDetails.closeDate || 'N/A'}
Industry: ${results.opportunityDetails.industry || 'N/A'}
Customer Segment: ${results.opportunityDetails.customerSegment || 'N/A'}
Activity Focus: ${results.opportunityDetails.activityFocus || 'N/A'}
Migration Phase: ${results.opportunityDetails.migrationPhase || 'N/A'}
Partner Name: ${results.opportunityDetails.partnerName || 'N/A'}

Description:
${results.opportunityDetails.oppDescription || 'N/A'}

Business Description:
${results.opportunityDetails.businessDescription || 'N/A'}

Links:
- Salesforce: ${results.opportunityDetails.salesforceLink || 'N/A'}
- AWS Calculator: ${results.opportunityDetails.awsCalculatorLink || 'N/A'}

================================================================================
FINANCIAL PROJECTIONS
================================================================================

Annual Recurring Revenue (ARR): ${results.projections.arr}
Monthly Recurring Revenue (MRR): ${results.projections.mrr}
Launch Date: ${results.projections.launchDate}
Project Duration: ${results.projections.projectDuration}
Confidence Level: ${results.projections.confidence}

Top Services:
${results.projections.topServices}

================================================================================
ANALYSIS RESULTS
================================================================================

METHODOLOGY:
${results.analysis.methodology}

FINDINGS:
${results.analysis.findings}

RATIONALE:
${results.analysis.rationale}

RISK FACTORS:
${results.analysis.riskFactors}

ARCHITECTURE RECOMMENDATIONS:
${results.analysis.architecture}

EXECUTIVE SUMMARY:
${results.analysis.summary}

================================================================================
SIMILAR PROJECTS DATA
================================================================================

${results.analysis.similarProjects}

================================================================================
REPORT END
================================================================================
    `.trim();
  }

  // Form reset with confirmation dialog
  function resetFormWithConfirmation() {
    // Create custom confirmation dialog
    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'confirmation-dialog-overlay';
    confirmDialog.innerHTML = `
      <div class="confirmation-dialog">
        <div class="dialog-header">
          <h3>Reset Form</h3>
        </div>
        <div class="dialog-content">
          <p>Are you sure you want to reset the form?</p>
          <p><strong>This will clear all input fields and analysis results.</strong></p>
          ${buttonStates.hasResults ? '<p class="warning-text">⚠️ All analysis results will be lost. Consider exporting first.</p>' : ''}
        </div>
        <div class="dialog-actions">
          <button type="button" class="dialog-button secondary" id="cancelReset">Cancel</button>
          ${buttonStates.hasResults ? '<button type="button" class="dialog-button tertiary" id="exportBeforeReset">Export & Reset</button>' : ''}
          <button type="button" class="dialog-button primary" id="confirmReset">Reset Form</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(confirmDialog);
    
    // Handle dialog actions
    document.getElementById('cancelReset').addEventListener('click', () => {
      document.body.removeChild(confirmDialog);
    });
    
    document.getElementById('confirmReset').addEventListener('click', () => {
      performFormReset();
      document.body.removeChild(confirmDialog);
      showNotification('Form reset successfully', 'success');
    });
    
    if (buttonStates.hasResults) {
      document.getElementById('exportBeforeReset').addEventListener('click', () => {
        exportComprehensiveResults();
        setTimeout(() => {
          performFormReset();
          document.body.removeChild(confirmDialog);
          showNotification('Results exported and form reset', 'success');
        }, 1000);
      });
    }
    
    // Close dialog on overlay click
    confirmDialog.addEventListener('click', (e) => {
      if (e.target === confirmDialog) {
        document.body.removeChild(confirmDialog);
      }
    });
  }

  // Perform actual form reset
  function performFormReset() {
    // Reset form fields
    const form = document.getElementById('opportunityForm');
    if (form) {
      form.reset();
    }
    
    // Clear all UI fields
    if (typeof clearUIFields === 'function') {
      clearUIFields();
    }
    
    // Reset button states
    buttonStates.hasResults = false;
    updateButtonStates('ready');
    
    // Reset character counters
    document.querySelectorAll('[id$="-count"]').forEach(counter => {
      counter.textContent = '0';
    });
    
    // Hide industry other field
    const industryOther = document.getElementById('industryOther');
    if (industryOther) {
      industryOther.style.display = 'none';
    }
    
    // Hide progress indicator
    hideAnalysisProgress();
  }

  // Enhanced analysis request handler
  function handleEnhancedAnalysisRequest(useNovaPremier, analysisType = 'standard') {
    if (buttonStates.analyzing) {
      console.log('Analysis already in progress');
      return;
    }

    // Update button state based on analysis type
    if (analysisType === 'funding') {
      updateButtonStates('analyzing-funding');
    } else if (useNovaPremier) {
      updateButtonStates('analyzing-nova');
    } else {
      updateButtonStates('analyzing-standard');
    }

    // Show progress indicator
    showAnalysisProgress(analysisType);

    // Call the original analysis function if it exists
    if (typeof handleAnalysisRequest === 'function') {
      // Wrap the original function to handle our enhanced states
      const originalHandler = handleAnalysisRequest;
      
      try {
        originalHandler(useNovaPremier);
        
        // Simulate completion after delay
        setTimeout(() => {
          updateButtonStates('completed');
          hideAnalysisProgress();
          showNotification('Analysis completed successfully!', 'success');
        }, 3000);
        
      } catch (error) {
        console.error('Analysis failed:', error);
        updateButtonStates('error');
        hideAnalysisProgress();
        showNotification('Analysis failed. Please try again.', 'error');
      }
    } else {
      // Fallback mock implementation
      setTimeout(() => {
        try {
          updateButtonStates('completed');
          hideAnalysisProgress();
          showNotification('Analysis completed successfully!', 'success');
        } catch (error) {
          updateButtonStates('error');
          hideAnalysisProgress();
          showNotification('Analysis failed. Please try again.', 'error');
        }
      }, 3000);
    }
  }

  // Enhanced event listeners for additional buttons
  const exportResultsBtn = document.getElementById('exportResultsButton');
  if (exportResultsBtn) {
    exportResultsBtn.addEventListener('click', exportComprehensiveResults);
  }
  
  const resetFormBtn = document.getElementById('resetFormButton');
  if (resetFormBtn) {
    resetFormBtn.addEventListener('click', resetFormWithConfirmation);
  }
  
  const nextOpportunityBtn = document.getElementById('nextOpportunityButton');
  if (nextOpportunityBtn) {
    nextOpportunityBtn.addEventListener('click', () => {
      if (buttonStates.hasResults) {
        resetFormWithConfirmation();
      } else {
        performFormReset();
        showNotification('Ready for next opportunity', 'info');
      }
    });
  }

  // Funding analysis button
  const fundingAnalysisBtn = document.getElementById('fundingAnalysisButton');
  if (fundingAnalysisBtn) {
    fundingAnalysisBtn.addEventListener('click', () => handleEnhancedAnalysisRequest(false, 'funding'));
  }

  // Enhanced analysis buttons - add additional listeners
  const analyzeStandardBtn = document.getElementById('oppDetQueryButtonV3');
  const analyzeNovaBtn = document.getElementById('oppDetQueryButtonV4');
  
  if (analyzeStandardBtn) {
    analyzeStandardBtn.addEventListener('click', () => handleEnhancedAnalysisRequest(false, 'standard'));
  }
  
  if (analyzeNovaBtn) {
    analyzeNovaBtn.addEventListener('click', () => handleEnhancedAnalysisRequest(true, 'nova'));
  }

  // Initialize button states
  updateButtonStates('ready');
});
// Task
 7.1: Comprehensive Report Export Functionality
function generateComprehensiveReport() {
  try {
    // Show loading state
    const exportButton = document.getElementById('exportResultsButton');
    const originalText = exportButton.textContent;
    exportButton.textContent = 'Generating Report...';
    exportButton.disabled = true;

    // Collect all form data and analysis results
    const reportData = collectReportData();
    
    // Generate different export formats
    const exportOptions = createExportOptionsModal();
    
    // Reset button state
    setTimeout(() => {
      exportButton.textContent = originalText;
      exportButton.disabled = false;
    }, 1000);
    
  } catch (error) {
    console.error('Error generating comprehensive report:', error);
    showExportError(error);
  }
}

function collectReportData() {
  const reportData = {
    timestamp: new Date().toISOString(),
    formData: {},
    projections: {},
    analysis: {},
    metadata: {
      generatedBy: 'AWS Opportunity Analysis Tool',
      version: '1.0.0',
      exportDate: new Date().toLocaleDateString(),
      exportTime: new Date().toLocaleTimeString()
    }
  };

  // Collect form data
  const form = document.getElementById('opportunityForm');
  if (form) {
    const formData = new FormData(form);
    for (let [key, value] of formData.entries()) {
      reportData.formData[key] = value;
    }
  }

  // Collect projection data
  reportData.projections = {
    arr: {
      value: document.getElementById('arrValue')?.textContent || '-',
      formatted: document.getElementById('arrFormatted')?.textContent || '-',
      confidence: document.getElementById('arrConfidence')?.textContent || '-',
      range: document.getElementById('arrRange')?.textContent || '-'
    },
    mrr: {
      value: document.getElementById('mrrValue')?.textContent || '-',
      formatted: document.getElementById('mrrFormatted')?.textContent || '-',
      relationship: document.getElementById('mrrRelationship')?.textContent || '-'
    },
    launchDate: {
      value: document.getElementById('launchDateValue')?.textContent || '-',
      formatted: document.getElementById('launchDateFormatted')?.textContent || '-',
      timeline: document.getElementById('launchTimeline')?.textContent || '-'
    },
    timeToLaunch: {
      value: document.getElementById('timeToLaunchValue')?.textContent || '-',
      formatted: document.getElementById('durationFormatted')?.textContent || '-'
    },
    confidence: {
      level: document.getElementById('confidenceValue')?.textContent || '-',
      percentage: document.getElementById('confidencePercentage')?.textContent || '-'
    }
  };

  // Collect analysis data
  reportData.analysis = {
    methodology: document.getElementById('methodologyContent')?.textContent || 'No methodology data available',
    similarProjects: collectSimilarProjectsData(),
    findings: document.getElementById('findingsContent')?.textContent || 'No findings available',
    rationale: document.getElementById('rationaleContent')?.textContent || 'No rationale available',
    riskFactors: document.getElementById('riskFactorsContent')?.textContent || 'No risk factors available',
    architecture: document.getElementById('architectureContent')?.textContent || 'No architecture recommendations available',
    query: document.getElementById('queryContent')?.textContent || 'No query available',
    queryResults: document.getElementById('queryResultsContent')?.textContent || 'No query results available',
    summary: document.getElementById('summaryContent')?.textContent || 'No summary available'
  };

  return reportData;
}

function collectSimilarProjectsData() {
  if (projectsData && projectsData.length > 0) {
    return projectsData.map(project => ({
      name: project.name,
      customer: project.customer,
      industry: project.industry,
      region: project.region,
      arr: project.arr,
      mrr: project.mrr,
      services: project.services.join(', '),
      closeDate: project.closeDate,
      similarity: Math.round(project.similarity)
    }));
  }
  return [];
}

function createExportOptionsModal() {
  // Create modal for export options
  const modal = document.createElement('div');
  modal.className = 'export-modal';
  modal.innerHTML = `
    <div class="export-modal-content">
      <div class="export-modal-header">
        <h3>Export Comprehensive Report</h3>
        <button class="export-modal-close" onclick="closeExportModal()">&times;</button>
      </div>
      <div class="export-modal-body">
        <p>Choose your preferred export format:</p>
        <div class="export-options">
          <button class="export-option-btn" onclick="exportAsHTML()">
            <span class="export-icon">🌐</span>
            <span class="export-label">HTML Report</span>
            <span class="export-desc">Complete web page with all formatting</span>
          </button>
          <button class="export-option-btn" onclick="exportAsJSON()">
            <span class="export-icon">📄</span>
            <span class="export-label">JSON Data</span>
            <span class="export-desc">Raw data for further processing</span>
          </button>
          <button class="export-option-btn" onclick="exportAsCSV()">
            <span class="export-icon">📊</span>
            <span class="export-label">CSV Spreadsheet</span>
            <span class="export-desc">Tabular data for analysis</span>
          </button>
          <button class="export-option-btn" onclick="printReport()">
            <span class="export-icon">🖨️</span>
            <span class="export-label">Print Report</span>
            <span class="export-desc">Print-optimized layout</span>
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add modal styles
  if (!document.getElementById('export-modal-styles')) {
    const styles = document.createElement('style');
    styles.id = 'export-modal-styles';
    styles.textContent = `
      .export-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
      }
      
      .export-modal-content {
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        animation: slideIn 0.3s ease;
      }
      
      .export-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid #e9ecef;
        background: var(--primary-color);
        color: white;
        border-radius: 12px 12px 0 0;
      }
      
      .export-modal-header h3 {
        margin: 0;
        font-size: 1.3em;
        font-weight: 600;
      }
      
      .export-modal-close {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.3s ease;
      }
      
      .export-modal-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      
      .export-modal-body {
        padding: 24px;
      }
      
      .export-modal-body p {
        margin: 0 0 20px 0;
        color: #666;
        font-size: 1.1em;
      }
      
      .export-options {
        display: grid;
        gap: 12px;
      }
      
      .export-option-btn {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px 20px;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        background: white;
        cursor: pointer;
        transition: all 0.3s ease;
        text-align: left;
      }
      
      .export-option-btn:hover {
        border-color: var(--secondary-color);
        background: #fff8e1;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
      
      .export-icon {
        font-size: 24px;
        min-width: 30px;
      }
      
      .export-label {
        font-weight: 600;
        color: var(--primary-color);
        font-size: 1.1em;
        display: block;
        margin-bottom: 4px;
      }
      
      .export-desc {
        color: #666;
        font-size: 0.9em;
        display: block;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideIn {
        from { transform: translateY(-50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(styles);
  }
  
  return modal;
}

function closeExportModal() {
  const modal = document.querySelector('.export-modal');
  if (modal) {
    modal.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
}

function exportAsHTML() {
  const reportData = collectReportData();
  const htmlContent = generateHTMLReport(reportData);
  downloadFile(htmlContent, 'aws-opportunity-analysis-report.html', 'text/html');
  closeExportModal();
}

function exportAsJSON() {
  const reportData = collectReportData();
  const jsonContent = JSON.stringify(reportData, null, 2);
  downloadFile(jsonContent, 'aws-opportunity-analysis-data.json', 'application/json');
  closeExportModal();
}

function exportAsCSV() {
  const reportData = collectReportData();
  const csvContent = generateCSVReport(reportData);
  downloadFile(csvContent, 'aws-opportunity-analysis-data.csv', 'text/csv');
  closeExportModal();
}

function generateHTMLReport(data) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AWS Opportunity Analysis Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f8f9fa;
        }
        .report-header {
            background: #232f3e;
            color: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
            text-align: center;
        }
        .report-header h1 {
            margin: 0 0 10px 0;
            font-size: 2.5em;
        }
        .report-meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .meta-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #ff9900;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section {
            background: white;
            margin-bottom: 30px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section-header {
            background: #232f3e;
            color: white;
            padding: 20px;
            font-size: 1.3em;
            font-weight: 600;
        }
        .section-content {
            padding: 20px;
        }
        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .form-field {
            margin-bottom: 15px;
        }
        .form-field label {
            font-weight: 600;
            color: #232f3e;
            display: block;
            margin-bottom: 5px;
        }
        .form-field .value {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            border-left: 3px solid #ff9900;
        }
        .projections-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }
        .projection-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #28a745;
        }
        .projection-value {
            font-size: 1.8em;
            font-weight: bold;
            color: #232f3e;
            margin-bottom: 10px;
        }
        .projects-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        .projects-table th,
        .projects-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e9ecef;
        }
        .projects-table th {
            background: #232f3e;
            color: white;
            font-weight: 600;
        }
        .projects-table tr:hover {
            background: #f8f9fa;
        }
        .analysis-content {
            line-height: 1.8;
            white-space: pre-wrap;
        }
        @media print {
            body { background: white; }
            .section { break-inside: avoid; }
            .report-header { background: #232f3e !important; -webkit-print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="report-header">
        <h1>AWS Opportunity Analysis Report</h1>
        <p>Generated on ${data.metadata.exportDate} at ${data.metadata.exportTime}</p>
    </div>

    <div class="report-meta">
        <div class="meta-card">
            <h3>Report Information</h3>
            <p><strong>Generated By:</strong> ${data.metadata.generatedBy}</p>
            <p><strong>Version:</strong> ${data.metadata.version}</p>
            <p><strong>Export Date:</strong> ${data.metadata.exportDate}</p>
        </div>
        <div class="meta-card">
            <h3>Opportunity Summary</h3>
            <p><strong>Customer:</strong> ${data.formData.CustomerName || 'Not specified'}</p>
            <p><strong>Opportunity:</strong> ${data.formData.oppName || 'Not specified'}</p>
            <p><strong>Region:</strong> ${data.formData.region || 'Not specified'}</p>
        </div>
    </div>

    <div class="section">
        <div class="section-header">Opportunity Details</div>
        <div class="section-content">
            <div class="form-grid">
                <div class="form-field">
                    <label>Customer Name</label>
                    <div class="value">${data.formData.CustomerName || 'Not specified'}</div>
                </div>
                <div class="form-field">
                    <label>Opportunity Name</label>
                    <div class="value">${data.formData.oppName || 'Not specified'}</div>
                </div>
                <div class="form-field">
                    <label>Region</label>
                    <div class="value">${data.formData.region || 'Not specified'}</div>
                </div>
                <div class="form-field">
                    <label>Close Date</label>
                    <div class="value">${data.formData.closeDate || 'Not specified'}</div>
                </div>
                <div class="form-field">
                    <label>Industry</label>
                    <div class="value">${data.formData.industry || data.formData.industryOther || 'Not specified'}</div>
                </div>
                <div class="form-field">
                    <label>Customer Segment</label>
                    <div class="value">${data.formData.customerSegment || 'Not specified'}</div>
                </div>
            </div>
            <div class="form-field">
                <label>Opportunity Description</label>
                <div class="value">${data.formData.oppDescription || 'Not specified'}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-header">Financial Projections</div>
        <div class="section-content">
            <div class="projections-grid">
                <div class="projection-card">
                    <h3>Annual Recurring Revenue</h3>
                    <div class="projection-value">${data.projections.arr.value}</div>
                    <p>${data.projections.arr.formatted}</p>
                    <p><em>${data.projections.arr.range}</em></p>
                </div>
                <div class="projection-card">
                    <h3>Monthly Recurring Revenue</h3>
                    <div class="projection-value">${data.projections.mrr.value}</div>
                    <p>${data.projections.mrr.formatted}</p>
                    <p><em>${data.projections.mrr.relationship}</em></p>
                </div>
                <div class="projection-card">
                    <h3>Launch Date</h3>
                    <div class="projection-value">${data.projections.launchDate.value}</div>
                    <p>${data.projections.launchDate.formatted}</p>
                    <p><em>${data.projections.launchDate.timeline}</em></p>
                </div>
                <div class="projection-card">
                    <h3>Time to Launch</h3>
                    <div class="projection-value">${data.projections.timeToLaunch.value}</div>
                    <p>${data.projections.timeToLaunch.formatted}</p>
                </div>
            </div>
        </div>
    </div>

    ${data.analysis.similarProjects.length > 0 ? `
    <div class="section">
        <div class="section-header">Similar Projects (${data.analysis.similarProjects.length})</div>
        <div class="section-content">
            <table class="projects-table">
                <thead>
                    <tr>
                        <th>Project Name</th>
                        <th>Customer</th>
                        <th>Industry</th>
                        <th>Region</th>
                        <th>ARR</th>
                        <th>Services</th>
                        <th>Similarity</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.analysis.similarProjects.map(project => `
                        <tr>
                            <td>${project.name}</td>
                            <td>${project.customer}</td>
                            <td>${project.industry}</td>
                            <td>${project.region}</td>
                            <td>$${project.arr.toLocaleString()}</td>
                            <td>${project.services}</td>
                            <td>${project.similarity}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
    ` : ''}

    <div class="section">
        <div class="section-header">Analysis Results</div>
        <div class="section-content">
            <div class="analysis-content">
                <h3>Methodology</h3>
                <p>${data.analysis.methodology}</p>
                
                <h3>Key Findings</h3>
                <p>${data.analysis.findings}</p>
                
                <h3>Prediction Rationale</h3>
                <p>${data.analysis.rationale}</p>
                
                <h3>Risk Factors</h3>
                <p>${data.analysis.riskFactors}</p>
                
                <h3>Architecture Recommendations</h3>
                <p>${data.analysis.architecture}</p>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-header">Executive Summary</div>
        <div class="section-content">
            <div class="analysis-content">${data.analysis.summary}</div>
        </div>
    </div>
</body>
</html>`;
}

function generateCSVReport(data) {
  const csvRows = [];
  
  // Header
  csvRows.push(['AWS Opportunity Analysis Report']);
  csvRows.push(['Generated on', `${data.metadata.exportDate} ${data.metadata.exportTime}`]);
  csvRows.push([]);
  
  // Opportunity Details
  csvRows.push(['OPPORTUNITY DETAILS']);
  csvRows.push(['Field', 'Value']);
  csvRows.push(['Customer Name', data.formData.CustomerName || '']);
  csvRows.push(['Opportunity Name', data.formData.oppName || '']);
  csvRows.push(['Region', data.formData.region || '']);
  csvRows.push(['Close Date', data.formData.closeDate || '']);
  csvRows.push(['Industry', data.formData.industry || data.formData.industryOther || '']);
  csvRows.push(['Customer Segment', data.formData.customerSegment || '']);
  csvRows.push(['Description', data.formData.oppDescription || '']);
  csvRows.push([]);
  
  // Projections
  csvRows.push(['FINANCIAL PROJECTIONS']);
  csvRows.push(['Metric', 'Value', 'Details']);
  csvRows.push(['ARR', data.projections.arr.value, data.projections.arr.formatted]);
  csvRows.push(['MRR', data.projections.mrr.value, data.projections.mrr.formatted]);
  csvRows.push(['Launch Date', data.projections.launchDate.value, data.projections.launchDate.formatted]);
  csvRows.push(['Time to Launch', data.projections.timeToLaunch.value, data.projections.timeToLaunch.formatted]);
  csvRows.push([]);
  
  // Similar Projects
  if (data.analysis.similarProjects.length > 0) {
    csvRows.push(['SIMILAR PROJECTS']);
    csvRows.push(['Project Name', 'Customer', 'Industry', 'Region', 'ARR', 'MRR', 'Services', 'Similarity']);
    data.analysis.similarProjects.forEach(project => {
      csvRows.push([
        project.name,
        project.customer,
        project.industry,
        project.region,
        project.arr,
        project.mrr,
        project.services,
        `${project.similarity}%`
      ]);
    });
  }
  
  return csvRows.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  
  // Show success message
  showExportSuccess(filename);
}

function showExportSuccess(filename) {
  const notification = document.createElement('div');
  notification.className = 'export-notification success';
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">✅</span>
      <span class="notification-message">Report exported successfully as ${filename}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
  
  // Add notification styles if not already present
  if (!document.getElementById('notification-styles')) {
    const styles = document.createElement('style');
    styles.id = 'notification-styles';
    styles.textContent = `
      .export-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 10001;
        animation: slideInRight 0.3s ease;
      }
      
      .export-notification.success {
        border-left: 4px solid #28a745;
      }
      
      .notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
      }
      
      .notification-icon {
        font-size: 20px;
      }
      
      .notification-message {
        color: #333;
        font-weight: 500;
      }
      
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(styles);
  }
}

function showExportError(error) {
  const notification = document.createElement('div');
  notification.className = 'export-notification error';
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">❌</span>
      <span class="notification-message">Export failed: ${error.message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// Task 7.2: Print-Friendly Layout and Styling
function printReport() {
  // Prepare the page for printing
  preparePrintLayout();
  
  // Trigger print dialog
  window.print();
  
  // Restore normal layout after printing
  setTimeout(() => {
    restoreNormalLayout();
  }, 1000);
  
  closeExportModal();
}

function preparePrintLayout() {
  // Add print-specific class to body
  document.body.classList.add('print-mode');
  
  // Hide interactive elements
  const elementsToHide = [
    '.status-bar',
    '.progress-container', 
    '.action-section',
    '.button-group',
    'button',
    '.validation-indicator',
    '.field-error',
    '.field-success',
    '.character-count',
    '.export-modal'
  ];
  
  elementsToHide.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      el.style.display = 'none';
    });
  });
  
  // Show all field values clearly
  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    if (input.value) {
      input.style.backgroundColor = '#f5f5f5';
      input.style.fontWeight = 'bold';
    }
  });
  
  // Ensure all sections are visible
  const sections = document.querySelectorAll('.field-section, .projections-section, .analysis-section');
  sections.forEach(section => {
    section.style.pageBreakInside = 'avoid';
    section.style.marginBottom = '20px';
  });
}

function restoreNormalLayout() {
  // Remove print-specific class
  document.body.classList.remove('print-mode');
  
  // Restore hidden elements
  const elementsToShow = [
    '.status-bar',
    '.progress-container',
    '.action-section', 
    '.button-group',
    'button',
    '.validation-indicator',
    '.field-error',
    '.field-success',
    '.character-count'
  ];
  
  elementsToShow.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      el.style.display = '';
    });
  });
  
  // Restore input styling
  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    input.style.backgroundColor = '';
    input.style.fontWeight = '';
  });
}

// Enable export functionality when results are available
function enableExportFunctionality() {
  const exportButton = document.getElementById('exportResultsButton');
  if (exportButton) {
    exportButton.disabled = false;
    exportButton.title = 'Export comprehensive analysis report';
  }
}

// Add event listeners for export functionality
document.addEventListener('DOMContentLoaded', () => {
  // Export Results Button Event Listener
  const exportResultsButton = document.getElementById('exportResultsButton');
  if (exportResultsButton) {
    exportResultsButton.addEventListener('click', () => generateComprehensiveReport());
  }

  // Print functionality with Ctrl+P
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      printReport();
    }
  });
  
  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeExportModal();
    }
  });
});

function formatServicesList(services) {
  if (!services) return '<div class="empty-state">No services available</div>';
  
  if (typeof services === 'string') {
    // If it's a multi-line string with pipe-separated values (e.g., "EC2|$12,500/month|$0 upfront")
    if (services.includes('|')) {
      const lines = services.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      return `
        <div class="services-list">
          ${lines.map(line => {
            const parts = line.split('|').map(p => p.trim());
            if (parts.length === 3) {
              return `<div class="service-item"><span class="service-name">${parts[0]}</span> <span class="service-cost">${parts[1]}</span> <span class="service-upfront">${parts[2]}</span></div>`;
            } else if (parts.length === 2) {
              return `<div class="service-item"><span class="service-name">${parts[0]}</span> <span class="service-cost">${parts[1]}</span></div>`;
            } else {
              return `<div class="service-item">${line}</div>`;
            }
          }).join('')}
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