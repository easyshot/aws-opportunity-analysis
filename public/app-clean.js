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
  }  // Setu
p event listeners for projects table
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
  }

  // Mock analysis request handler
  function handleAnalysisRequest(useNovaPremier) {
    // Mock data for testing
    const mockResults = {
      sections: {
        similarProjectsRaw: `--- Project 1 ---
Project Name: Cloud Migration Initiative
Customer: TechCorp Solutions
Industry: Technology
Region: us-east-1
ARR: 850000
MRR: 70833
Services: EC2, S3, RDS, Lambda
Close Date: 2023-08-15
Description: Complete infrastructure migration to AWS with modernization

--- Project 2 ---
Project Name: Digital Transformation
Customer: Healthcare Plus
Industry: Healthcare
Region: us-west-2
ARR: 1200000
MRR: 100000
Services: EC2, S3, RDS, CloudFront, Route53
Close Date: 2023-11-22
Description: Legacy system modernization and cloud adoption

--- Project 3 ---
Project Name: Analytics Platform
Customer: Financial Services Inc
Industry: Financial Services
Region: eu-west-1
ARR: 650000
MRR: 54167
Services: Redshift, S3, Lambda, API Gateway
Close Date: 2024-01-10
Description: Data analytics platform implementation`
      }
    };
    
    // Simulate API call delay
    setTimeout(() => {
      populateUI(mockResults);
    }, 1000);
  }

  // Event listeners
  if (oppDetQueryButtonV3) {
    oppDetQueryButtonV3.addEventListener('click', () => handleAnalysisRequest(false));
  }
  if (oppDetQueryButtonV4) {
    oppDetQueryButtonV4.addEventListener('click', () => handleAnalysisRequest(true));
  }
});