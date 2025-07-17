// Modern Partner Opportunity Intelligence JavaScript

class OpportunityAnalyzer {
    constructor() {
        this.isAnalyzing = false;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Form submission
        const analyzeBtn = document.querySelector('.btn-primary');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.analyzeOpportunity());
        }

        // Clear form
        const clearBtn = document.querySelector('.btn-secondary');
        if (clearBtn && clearBtn.textContent.includes('Clear')) {
            clearBtn.addEventListener('click', () => this.clearForm());
        }

        // Export and print functionality
        window.exportData = () => this.exportData();
        window.printReport = () => this.printReport();
        window.analyzeOpportunity = () => this.analyzeOpportunity();
        window.clearForm = () => this.clearForm();

        // Auto-save form data
        this.setupAutoSave();
    }

    setupAutoSave() {
        const formInputs = document.querySelectorAll('input, select, textarea');
        formInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.saveFormData();
            });
        });

        // Load saved data on page load
        this.loadFormData();
    }

    saveFormData() {
        const formData = {
            customerName: document.getElementById('customerName')?.value || '',
            region: document.getElementById('region')?.value || '',
            closeDate: document.getElementById('closeDate')?.value || '',
            opportunityName: document.getElementById('opportunityName')?.value || '',
            description: document.getElementById('description')?.value || ''
        };
        localStorage.setItem('opportunityFormData', JSON.stringify(formData));
    }

    loadFormData() {
        const savedData = localStorage.getItem('opportunityFormData');
        if (savedData) {
            const formData = JSON.parse(savedData);
            Object.keys(formData).forEach(key => {
                const element = document.getElementById(key);
                if (element && formData[key]) {
                    element.value = formData[key];
                }
            });
        }
    }

    validateForm() {
        const requiredFields = ['customerName', 'region', 'closeDate', 'opportunityName', 'description'];
        const errors = [];

        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field || !field.value.trim()) {
                errors.push(this.getFieldLabel(fieldId));
                this.highlightError(field);
            } else {
                this.clearError(field);
            }
        });

        // Validate close date is in the future
        const closeDate = document.getElementById('closeDate');
        if (closeDate && closeDate.value) {
            const selectedDate = new Date(closeDate.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (selectedDate < today) {
                errors.push('Close Date must be in the future');
                this.highlightError(closeDate);
            }
        }

        return errors;
    }

    getFieldLabel(fieldId) {
        const labels = {
            customerName: 'Customer Name',
            region: 'Region',
            closeDate: 'Close Date',
            opportunityName: 'Opportunity Name',
            description: 'Description'
        };
        return labels[fieldId] || fieldId;
    }

    highlightError(field) {
        if (field) {
            field.style.borderColor = 'var(--danger-color)';
            field.style.boxShadow = '0 0 0 3px rgba(231, 76, 60, 0.1)';
        }
    }

    clearError(field) {
        if (field) {
            field.style.borderColor = '';
            field.style.boxShadow = '';
        }
    }

    showValidationErrors(errors) {
        // Remove existing error message
        const existingError = document.querySelector('.validation-error');
        if (existingError) {
            existingError.remove();
        }

        if (errors.length > 0) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'validation-error';
            errorDiv.style.cssText = `
                background: #fee;
                border: 1px solid var(--danger-color);
                border-radius: var(--border-radius);
                padding: 1rem;
                margin: 1rem 0;
                color: var(--danger-color);
            `;
            errorDiv.innerHTML = `
                <strong>Please fix the following errors:</strong>
                <ul style="margin: 0.5rem 0 0 1.5rem;">
                    ${errors.map(error => `<li>${error}</li>`).join('')}
                </ul>
            `;

            const formActions = document.querySelector('.form-actions');
            formActions.parentNode.insertBefore(errorDiv, formActions);

            // Scroll to error
            errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    async analyzeOpportunity() {
        if (this.isAnalyzing) return;

        // Validate form
        const errors = this.validateForm();
        if (errors.length > 0) {
            this.showValidationErrors(errors);
            return;
        }

        this.isAnalyzing = true;
        this.showLoadingState();

        try {
            const formData = this.getFormData();
            const response = await this.callAnalysisAPI(formData);
            this.displayResults(response);
            this.showResultsSection();
        } catch (error) {
            console.error('Analysis failed:', error);
            this.showError('Analysis failed. Please try again.');
        } finally {
            this.isAnalyzing = false;
            this.hideLoadingState();
        }
    }

    getFormData() {
        return {
            customerName: document.getElementById('customerName').value,
            region: document.getElementById('region').value,
            closeDate: document.getElementById('closeDate').value,
            opportunityName: document.getElementById('opportunityName').value,
            description: document.getElementById('description').value
        };
    }

    async callAnalysisAPI(formData) {
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

        return await response.json();
    }

    showLoadingState() {
        const analyzeBtn = document.querySelector('.btn-primary');
        if (analyzeBtn) {
            analyzeBtn.innerHTML = '<span class="loading"></span> Analyzing...';
            analyzeBtn.disabled = true;
        }

        // Show results section with loading placeholders
        this.showResultsSection();
        this.showLoadingPlaceholders();
    }

    hideLoadingState() {
        const analyzeBtn = document.querySelector('.btn-primary');
        if (analyzeBtn) {
            analyzeBtn.innerHTML = '<span class="btn-icon">🔍</span> Analyze Opportunity';
            analyzeBtn.disabled = false;
        }
    }

    showLoadingPlaceholders() {
        const placeholders = document.querySelectorAll('.loading-placeholder');
        placeholders.forEach(placeholder => {
            placeholder.innerHTML = '<div class="loading"></div> Analyzing...';
        });
    }

    displayResults(data) {
        // Update metrics
        this.updateElement('predictedArr', data.metrics?.predictedArr || 'N/A');
        this.updateElement('predictedMrr', data.metrics?.predictedMrr || 'N/A');
        this.updateElement('launchDate', data.metrics?.launchDate || 'N/A');
        this.updateElement('projectDuration', data.metrics?.predictedProjectDuration || 'N/A');

        // Update confidence
        this.updateConfidence(data.metrics);

        // Update analysis sections
        this.updateElement('architecture', data.architecture || 'No architecture recommendations available.');
        this.updateElement('topServices', this.formatServices(data.metrics?.topServices || data.services));
        this.updateElement('similarProjects', data.similarProjects || 'No similar projects found.');
        this.updateElement('fundingOptions', data.fundingOptions || 'Funding analysis not available.');
        this.updateElement('followOnOpportunities', data.followOnOpportunities || 'Follow-on opportunities analysis not available.');
    }

    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            if (typeof content === 'string' && content.includes('**')) {
                // Convert markdown-style formatting
                element.innerHTML = content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n\n/g, '<br><br>')
                    .replace(/\n/g, '<br>');
            } else {
                element.innerHTML = content;
            }
        }
    }

    updateConfidence(metrics) {
        if (!metrics) return;

        const score = metrics.confidenceScore || 0;
        const label = metrics.confidence || 'UNKNOWN';
        
        this.updateElement('confidenceScore', `${score}%`);
        this.updateElement('confidenceLabel', label);

        // Update confidence bar
        const fill = document.getElementById('confidenceFill');
        if (fill) {
            fill.style.width = `${score}%`;
            
            // Color based on confidence level
            if (score >= 80) {
                fill.style.background = 'var(--success-color)';
            } else if (score >= 60) {
                fill.style.background = 'var(--warning-color)';
            } else {
                fill.style.background = 'var(--danger-color)';
            }
        }

        // Update confidence factors
        const factors = metrics.confidenceFactors || [];
        const factorsElement = document.getElementById('confidenceFactors');
        if (factorsElement && factors.length > 0) {
            factorsElement.innerHTML = `
                <ul>
                    ${factors.map(factor => `<li>${factor}</li>`).join('')}
                </ul>
            `;
        }
    }

    formatServices(services) {
        if (typeof services === 'string') {
            return services;
        }

        if (Array.isArray(services)) {
            return `
                <table class="services-table">
                    <thead>
                        <tr>
                            <th>Service</th>
                            <th>Estimated Cost</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${services.map(service => `
                            <tr>
                                <td><strong>${service.name}</strong></td>
                                <td>$${service.cost?.toLocaleString() || 'N/A'}/month</td>
                                <td>${service.description || ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        return 'No service recommendations available.';
    }

    showResultsSection() {
        const resultsSection = document.getElementById('analysisResults');
        if (resultsSection) {
            resultsSection.style.display = 'block';
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    showError(message) {
        // Remove existing error
        const existingError = document.querySelector('.analysis-error');
        if (existingError) {
            existingError.remove();
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'analysis-error';
        errorDiv.style.cssText = `
            background: #fee;
            border: 1px solid var(--danger-color);
            border-radius: var(--border-radius);
            padding: 1rem;
            margin: 1rem 0;
            color: var(--danger-color);
            text-align: center;
        `;
        errorDiv.innerHTML = `<strong>Error:</strong> ${message}`;

        const formActions = document.querySelector('.form-actions');
        formActions.parentNode.insertBefore(errorDiv, formActions.nextSibling);
    }

    clearForm() {
        const formInputs = document.querySelectorAll('input, select, textarea');
        formInputs.forEach(input => {
            input.value = '';
            this.clearError(input);
        });

        // Hide results section
        const resultsSection = document.getElementById('analysisResults');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }

        // Clear saved data
        localStorage.removeItem('opportunityFormData');

        // Remove error messages
        const errors = document.querySelectorAll('.validation-error, .analysis-error');
        errors.forEach(error => error.remove());
    }

    exportData() {
        const formData = this.getFormData();
        const resultsData = this.getResultsData();
        
        const exportData = {
            timestamp: new Date().toISOString(),
            opportunity: formData,
            analysis: resultsData
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `opportunity-analysis-${formData.customerName || 'export'}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    getResultsData() {
        return {
            predictedArr: document.getElementById('predictedArr')?.textContent || '',
            predictedMrr: document.getElementById('predictedMrr')?.textContent || '',
            launchDate: document.getElementById('launchDate')?.textContent || '',
            projectDuration: document.getElementById('projectDuration')?.textContent || '',
            confidenceScore: document.getElementById('confidenceScore')?.textContent || '',
            architecture: document.getElementById('architecture')?.textContent || '',
            topServices: document.getElementById('topServices')?.textContent || '',
            similarProjects: document.getElementById('similarProjects')?.textContent || '',
            fundingOptions: document.getElementById('fundingOptions')?.textContent || '',
            followOnOpportunities: document.getElementById('followOnOpportunities')?.textContent || ''
        };
    }

    printReport() {
        window.print();
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new OpportunityAnalyzer();
});

// Add some sample data for demo purposes
document.addEventListener('DOMContentLoaded', () => {
    const addSampleDataBtn = document.createElement('button');
    addSampleDataBtn.textContent = '📝 Load Sample Data';
    addSampleDataBtn.className = 'btn-secondary';
    addSampleDataBtn.style.marginLeft = '1rem';
    addSampleDataBtn.onclick = () => {
        document.getElementById('customerName').value = 'Acme Corporation';
        document.getElementById('region').value = 'us-east-1';
        document.getElementById('closeDate').value = '2025-09-15';
        document.getElementById('opportunityName').value = 'Digital Transformation Initiative';
        document.getElementById('description').value = 'Large-scale cloud migration and modernization project involving legacy application refactoring, data analytics platform implementation, and AI/ML capabilities integration. Expected to serve 100,000+ users with high availability requirements.';
    };
    
    const formActions = document.querySelector('.form-actions');
    if (formActions) {
        formActions.appendChild(addSampleDataBtn);
    }
});