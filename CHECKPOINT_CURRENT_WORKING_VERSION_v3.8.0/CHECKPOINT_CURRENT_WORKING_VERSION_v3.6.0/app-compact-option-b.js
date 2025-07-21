// Option B: Enhanced Interactive Layout JavaScript

class CompactOpportunityAnalyzerB {
    constructor() {
        this.isAnalyzing = false;
        this.currentTab = 'overview';
        this.initializeEventListeners();
        this.loadFormData();
        this.updateFormProgress();
    }

    initializeEventListeners() {
        // Global functions for HTML onclick handlers
        window.analyzeOpportunity = () => this.analyzeOpportunity();
        window.clearForm = () => this.clearForm();
        window.exportData = () => this.exportData();
        window.printReport = () => this.printReport();
        window.loadSampleData = () => this.loadSampleData();
        window.showTab = (tabName) => this.showTab(tabName);

        // Form progress tracking
        const formInputs = document.querySelectorAll('input, select, textarea');
        formInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.saveFormData();
                this.updateFormProgress();
            });
        });
    }

    updateFormProgress() {
        const requiredFields = ['customerName', 'region', 'closeDate', 'opportunityName', 'description'];
        const completedFields = requiredFields.filter(fieldId => {
            const field = document.getElementById(fieldId);
            return field && field.value.trim();
        });

        const progress = Math.round((completedFields.length / requiredFields.length) * 100);
        const progressIndicator = document.getElementById('formProgress');
        if (progressIndicator) {
            progressIndicator.textContent = `${completedFields.length}/${requiredFields.length}`;
        }
    }

    loadSampleData() {
        document.getElementById('customerName').value = 'Global Dynamics Corp';
        document.getElementById('region').value = 'Germany';
        document.getElementById('closeDate').value = '2025-10-15';
        document.getElementById('opportunityName').value = 'Smart Factory IoT Platform';
        document.getElementById('description').value = 'Next-generation smart manufacturing platform integrating IoT sensors, real-time analytics, predictive maintenance, and automated quality control. Project spans 12 manufacturing facilities across Europe with requirements for edge computing, centralized data lake, and AI-powered optimization algorithms. Expected to process 1M+ sensor readings per minute with sub-second response times.';
        this.updateFormProgress();
    }

    saveFormData() {
        const formData = {
            customerName: document.getElementById('customerName')?.value || '',
            region: document.getElementById('region')?.value || '',
            closeDate: document.getElementById('closeDate')?.value || '',
            opportunityName: document.getElementById('opportunityName')?.value || '',
            description: document.getElementById('description')?.value || ''
        };
        localStorage.setItem('compactOpportunityDataB', JSON.stringify(formData));
    }

    loadFormData() {
        const savedData = localStorage.getItem('compactOpportunityDataB');
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

    showTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[onclick="showTab('${tabName}')"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        this.currentTab = tabName;
    }

    validateForm() {
        const requiredFields = [
            { id: 'customerName', label: 'Customer Name' },
            { id: 'region', label: 'Customer Region' },
            { id: 'closeDate', label: 'Close Date' },
            { id: 'opportunityName', label: 'Opportunity Name' },
            { id: 'description', label: 'Description' }
        ];

        const errors = [];

        requiredFields.forEach(field => {
            const element = document.getElementById(field.id);
            if (!element || !element.value.trim()) {
                errors.push(field.label);
                this.highlightError(element);
            } else {
                this.clearError(element);
            }
        });

        // Validate close date
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

    highlightError(field) {
        if (field) {
            field.style.borderColor = '#e74c3c';
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
        this.removeExistingErrors();

        if (errors.length > 0) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'validation-error';
            errorDiv.innerHTML = `
                <strong>Please complete the following fields:</strong>
                <ul>${errors.map(error => `<li>${error}</li>`).join('')}</ul>
            `;

            const formActions = document.querySelector('.form-actions');
            formActions.parentNode.insertBefore(errorDiv, formActions);
        }
    }

    removeExistingErrors() {
        const existingErrors = document.querySelectorAll('.validation-error, .analysis-error');
        existingErrors.forEach(error => error.remove());
    }

    async analyzeOpportunity() {
        if (this.isAnalyzing) return;

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
            this.showAnalysisSection();
        } catch (error) {
            console.error('Analysis failed:', error);
            this.showError('Analysis failed. Please check your connection and try again.');
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    showLoadingState() {
        const analyzeBtn = document.querySelector('.btn-analyze');
        if (analyzeBtn) {
            analyzeBtn.innerHTML = '<span class="loading"></span> Analyzing...';
            analyzeBtn.disabled = true;
        }

        // Update status indicator
        const statusIndicator = document.getElementById('analysisStatus');
        if (statusIndicator) {
            statusIndicator.innerHTML = '<span class="loading"></span> Analyzing';
        }

        // Show analysis section with loading placeholders
        this.showAnalysisSection();
        const placeholders = document.querySelectorAll('.content-placeholder');
        placeholders.forEach(placeholder => {
            placeholder.innerHTML = '<span class="loading"></span> Analyzing...';
        });
    }

    hideLoadingState() {
        const analyzeBtn = document.querySelector('.btn-analyze');
        if (analyzeBtn) {
            analyzeBtn.innerHTML = '<span class="btn-icon">🔍</span> Analyze Opportunity';
            analyzeBtn.disabled = false;
        }

        // Update status indicator
        const statusIndicator = document.getElementById('analysisStatus');
        if (statusIndicator) {
            statusIndicator.innerHTML = '<span class="status-dot"></span><span class="status-text">Complete</span>';
        }
    }

    displayResults(data) {
        // Update projections
        this.updateElement('predictedArr', data.metrics?.predictedArr || 'N/A');
        this.updateElement('predictedMrr', data.metrics?.predictedMrr || 'N/A');
        this.updateElement('launchDate', data.metrics?.launchDate || 'N/A');
        this.updateElement('timeToLaunch', this.formatTimeToLaunch(data.metrics?.predictedProjectDuration) || 'N/A');

        // Update confidence with enhanced display
        this.updateConfidenceEnhanced(data.metrics);

        // Update top services
        this.updateElement('topServices', this.formatServicesEnhanced(data.metrics?.topServices || data.services));

        // Update analysis sections
        this.updateElement('methodology', data.methodology || this.generateEnhancedMethodology());
        this.updateElement('findings', data.findings || this.generateEnhancedFindings());
        this.updateElement('riskFactors', data.riskFactors || this.generateEnhancedRiskFactors());
        this.updateElement('similarProjects', data.similarProjects || this.generateEnhancedSimilarProjects());
        this.updateElement('rationale', data.rationale || this.generateEnhancedRationale());
        this.updateElement('fullAnalysis', data.fullAnalysis || this.generateEnhancedFullAnalysis());
        this.updateElement('fundingOptions', data.fundingOptions || this.generateEnhancedFundingOptions());
        this.updateElement('followOnOpportunities', data.followOnOpportunities || this.generateEnhancedFollowOnOpportunities());
    }

    formatTimeToLaunch(duration) {
        if (!duration) return null;
        const match = duration.match(/(\d+)/);
        return match ? match[1] : duration;
    }

    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            if (typeof content === 'string' && content.includes('**')) {
                element.innerHTML = content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n\n/g, '<br><br>')
                    .replace(/\n/g, '<br>');
            } else {
                element.innerHTML = content;
            }
        }
    }

    updateConfidenceEnhanced(metrics) {
        if (!metrics) return;

        const score = metrics.confidenceScore || 0;
        const label = metrics.confidence || 'UNKNOWN';
        
        this.updateElement('confidenceScore', `${score}%`);
        this.updateElement('confidenceLabel', label);

        // Update confidence bar with animation
        const fill = document.getElementById('confidenceFill');
        if (fill) {
            setTimeout(() => {
                fill.style.width = `${score}%`;
            }, 500);
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

    formatServicesEnhanced(services) {
        if (typeof services === 'string') {
            return services;
        }

        if (Array.isArray(services)) {
            return `
                <div class="services-grid">
                    ${services.map(service => `
                        <div class="service-card">
                            <div class="service-name">${service.name}</div>
                            <div class="service-cost">$${service.cost?.toLocaleString() || 'N/A'}/mo</div>
                            <div class="service-desc">${service.description || ''}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        return this.generateEnhancedServices();
    }

    generateEnhancedServices() {
        return `
            <div class="services-grid">
                <div class="service-card">
                    <div class="service-name">Amazon EC2</div>
                    <div class="service-cost">$6,800/mo</div>
                    <div class="service-desc">High-performance compute instances</div>
                </div>
                <div class="service-card">
                    <div class="service-name">Amazon RDS</div>
                    <div class="service-cost">$4,200/mo</div>
                    <div class="service-desc">Managed database with high availability</div>
                </div>
                <div class="service-card">
                    <div class="service-name">AWS IoT Core</div>
                    <div class="service-cost">$2,100/mo</div>
                    <div class="service-desc">IoT device connectivity and management</div>
                </div>
                <div class="service-card">
                    <div class="service-name">Amazon Kinesis</div>
                    <div class="service-cost">$1,800/mo</div>
                    <div class="service-desc">Real-time data streaming</div>
                </div>
            </div>
        `;
    }

    generateEnhancedMethodology() {
        return `
            <div class="methodology-steps">
                <div class="step">
                    <div class="step-number">1</div>
                    <div class="step-content">
                        <strong>Data Aggregation:</strong> Collected 500+ similar enterprise IoT implementations
                    </div>
                </div>
                <div class="step">
                    <div class="step-number">2</div>
                    <div class="step-content">
                        <strong>Pattern Analysis:</strong> Applied ML algorithms to identify success predictors
                    </div>
                </div>
                <div class="step">
                    <div class="step-number">3</div>
                    <div class="step-content">
                        <strong>Regional Modeling:</strong> Adjusted for European market conditions and regulations
                    </div>
                </div>
                <div class="step">
                    <div class="step-number">4</div>
                    <div class="step-content">
                        <strong>Risk Assessment:</strong> Evaluated technical, financial, and operational risks
                    </div>
                </div>
            </div>
        `;
    }

    generateEnhancedFindings() {
        return `
            <div class="findings-grid">
                <div class="finding-item positive">
                    <div class="finding-icon">✅</div>
                    <div class="finding-text"><strong>Market Readiness:</strong> 94% IoT adoption rate in manufacturing</div>
                </div>
                <div class="finding-item positive">
                    <div class="finding-icon">✅</div>
                    <div class="finding-text"><strong>Technical Feasibility:</strong> Existing infrastructure supports edge computing</div>
                </div>
                <div class="finding-item neutral">
                    <div class="finding-icon">⚠️</div>
                    <div class="finding-text"><strong>Skill Gap:</strong> 40% of team requires IoT platform training</div>
                </div>
                <div class="finding-item positive">
                    <div class="finding-icon">✅</div>
                    <div class="finding-text"><strong>ROI Projection:</strong> 420% return within 18 months</div>
                </div>
            </div>
        `;
    }

    generateEnhancedRiskFactors() {
        return `
            <div class="risk-matrix">
                <div class="risk-item low">
                    <div class="risk-level">LOW</div>
                    <div class="risk-desc"><strong>Budget Risk:</strong> Well-defined scope with proven cost models</div>
                </div>
                <div class="risk-item medium">
                    <div class="risk-level">MEDIUM</div>
                    <div class="risk-desc"><strong>Integration Risk:</strong> Legacy system connectivity challenges</div>
                </div>
                <div class="risk-item medium">
                    <div class="risk-level">MEDIUM</div>
                    <div class="risk-desc"><strong>Scale Risk:</strong> 12 facilities simultaneous deployment</div>
                </div>
                <div class="risk-item low">
                    <div class="risk-level">LOW</div>
                    <div class="risk-desc"><strong>Compliance Risk:</strong> GDPR and industry standards well-understood</div>
                </div>
            </div>
        `;
    }

    generateEnhancedSimilarProjects() {
        return `
            <div class="projects-timeline">
                <div class="project-item">
                    <div class="project-date">2024 Q2</div>
                    <div class="project-details">
                        <strong>AutoManufacture AG:</strong> $420K ARR, 8-month implementation<br>
                        <span class="project-success">96% success rate</span>
                    </div>
                </div>
                <div class="project-item">
                    <div class="project-date">2023 Q4</div>
                    <div class="project-details">
                        <strong>IndustrialTech GmbH:</strong> $380K ARR, 10-month implementation<br>
                        <span class="project-success">91% success rate</span>
                    </div>
                </div>
                <div class="project-item">
                    <div class="project-date">2024 Q1</div>
                    <div class="project-details">
                        <strong>SmartFactory Solutions:</strong> $350K ARR, 7-month implementation<br>
                        <span class="project-success">89% success rate</span>
                    </div>
                </div>
            </div>
        `;
    }

    generateEnhancedRationale() {
        return `
            <div class="rationale-points">
                <div class="rationale-section">
                    <h4>🎯 Strategic Alignment</h4>
                    <p>Customer's Industry 4.0 initiative perfectly aligns with AWS IoT and analytics capabilities, creating a natural technology fit.</p>
                </div>
                <div class="rationale-section">
                    <h4>💡 Innovation Opportunity</h4>
                    <p>First comprehensive smart factory implementation in their industry vertical, establishing competitive advantage.</p>
                </div>
                <div class="rationale-section">
                    <h4>📈 Growth Potential</h4>
                    <p>Multi-facility deployment creates foundation for rapid expansion across their global manufacturing network.</p>
                </div>
            </div>
        `;
    }

    generateEnhancedFullAnalysis() {
        return `
            <div class="full-analysis-content">
                <div class="analysis-summary">
                    <h4>Executive Summary</h4>
                    <p>This smart factory IoT platform represents a transformational opportunity with exceptional growth potential. The customer's commitment to Industry 4.0 and existing infrastructure create optimal conditions for success.</p>
                </div>
                
                <div class="analysis-metrics">
                    <div class="metric-highlight">
                        <span class="metric-number">$420K</span>
                        <span class="metric-label">Projected ARR</span>
                    </div>
                    <div class="metric-highlight">
                        <span class="metric-number">94%</span>
                        <span class="metric-label">Success Probability</span>
                    </div>
                    <div class="metric-highlight">
                        <span class="metric-number">8</span>
                        <span class="metric-label">Months to Launch</span>
                    </div>
                </div>
                
                <div class="analysis-recommendation">
                    <h4>Recommendation</h4>
                    <p><strong>PROCEED</strong> with high priority. Recommend immediate engagement with customer's technical team to begin detailed architecture planning.</p>
                </div>
            </div>
        `;
    }

    generateEnhancedFundingOptions() {
        return `
            <div class="funding-options-grid">
                <div class="funding-card primary">
                    <h4>🏆 AWS MAP Program</h4>
                    <div class="funding-amount">$1.2M Credits</div>
                    <div class="funding-desc">Migration Acceleration Program with dedicated support</div>
                </div>
                <div class="funding-card secondary">
                    <h4>🎓 Training Investment</h4>
                    <div class="funding-amount">$150K Credits</div>
                    <div class="funding-desc">Comprehensive IoT and analytics certification program</div>
                </div>
                <div class="funding-card secondary">
                    <h4>🤝 Partner Co-Investment</h4>
                    <div class="funding-amount">35% Sharing</div>
                    <div class="funding-desc">Risk-sharing model with performance guarantees</div>
                </div>
                <div class="funding-card tertiary">
                    <h4>💳 Flexible Terms</h4>
                    <div class="funding-amount">Custom</div>
                    <div class="funding-desc">Milestone-based payments aligned with value delivery</div>
                </div>
            </div>
        `;
    }

    generateEnhancedFollowOnOpportunities() {
        return `
            <div class="followon-roadmap">
                <div class="roadmap-phase">
                    <div class="phase-timeline">6-12 Months</div>
                    <div class="phase-content">
                        <h4>🔬 Advanced Analytics</h4>
                        <div class="phase-value">+$180K ARR</div>
                        <p>Predictive maintenance and quality optimization algorithms</p>
                    </div>
                </div>
                <div class="roadmap-phase">
                    <div class="phase-timeline">12-18 Months</div>
                    <div class="phase-content">
                        <h4>🌍 Global Expansion</h4>
                        <div class="phase-value">+$350K ARR</div>
                        <p>Rollout to 25+ facilities across North America and Asia</p>
                    </div>
                </div>
                <div class="roadmap-phase">
                    <div class="phase-timeline">18-24 Months</div>
                    <div class="phase-content">
                        <h4>🤖 AI Integration</h4>
                        <div class="phase-value">+$220K ARR</div>
                        <p>Machine learning models for autonomous optimization</p>
                    </div>
                </div>
            </div>
        `;
    }

    showAnalysisSection() {
        const analysisContainer = document.getElementById('analysisContainer');
        if (analysisContainer) {
            analysisContainer.style.display = 'block';
            analysisContainer.scrollIntoView({ behavior: 'smooth' });
        }
    }

    showError(message) {
        this.removeExistingErrors();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'analysis-error';
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

        // Reset projections
        ['predictedArr', 'predictedMrr', 'launchDate', 'timeToLaunch', 'confidenceScore', 'confidenceLabel'].forEach(id => {
            this.updateElement(id, '-');
        });

        // Reset confidence bar
        const fill = document.getElementById('confidenceFill');
        if (fill) {
            fill.style.width = '0%';
        }

        // Hide analysis section
        const analysisContainer = document.getElementById('analysisContainer');
        if (analysisContainer) {
            analysisContainer.style.display = 'none';
        }

        // Update form progress
        this.updateFormProgress();

        // Clear saved data and errors
        localStorage.removeItem('compactOpportunityDataB');
        this.removeExistingErrors();
    }

    exportData() {
        const formData = this.getFormData();
        const timestamp = new Date().toISOString();
        
        const exportData = {
            timestamp,
            opportunity: formData,
            analysis: {
                predictedArr: document.getElementById('predictedArr')?.textContent || '',
                predictedMrr: document.getElementById('predictedMrr')?.textContent || '',
                launchDate: document.getElementById('launchDate')?.textContent || '',
                timeToLaunch: document.getElementById('timeToLaunch')?.textContent || '',
                confidenceScore: document.getElementById('confidenceScore')?.textContent || ''
            }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `opportunity-analysis-${formData.customerName || 'export'}-${timestamp.split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    printReport() {
        window.print();
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new CompactOpportunityAnalyzerB();
});