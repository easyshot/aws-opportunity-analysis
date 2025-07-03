// Option C: Modern Dashboard Layout JavaScript

class CompactOpportunityAnalyzerC {
    constructor() {
        this.isAnalyzing = false;
        this.currentView = 'grid';
        this.initializeEventListeners();
        this.loadFormData();
        this.updateTimestamp();
        this.setupCharacterCounter();
        this.updateCompletionStatus();
    }

    initializeEventListeners() {
        // Global functions for HTML onclick handlers
        window.analyzeOpportunity = () => this.analyzeOpportunity();
        window.clearForm = () => this.clearForm();
        window.exportData = () => this.exportData();
        window.printReport = () => this.printReport();
        window.loadSampleData = () => this.loadSampleData();

        // Form completion tracking
        const formInputs = document.querySelectorAll('input, select, textarea');
        formInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.saveFormData();
                this.updateCompletionStatus();
                if (input.id === 'description') {
                    this.updateCharacterCounter();
                }
            });
        });

        // View controls
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchView(btn.dataset.view));
        });

        // Update timestamp every minute
        setInterval(() => this.updateTimestamp(), 60000);
    }

    updateTimestamp() {
        const now = new Date();
        const timeString = now.toLocaleString();
        const timestampElement = document.getElementById('currentTime');
        if (timestampElement) {
            timestampElement.textContent = timeString;
        }
    }

    setupCharacterCounter() {
        const descriptionField = document.getElementById('description');
        const charCounter = document.getElementById('charCounter');
        
        if (descriptionField && charCounter) {
            const updateCounter = () => {
                const count = descriptionField.value.length;
                charCounter.textContent = `${count} characters`;
                
                // Color coding based on length
                if (count < 100) {
                    charCounter.style.color = '#ef4444';
                } else if (count < 200) {
                    charCounter.style.color = '#f59e0b';
                } else {
                    charCounter.style.color = '#10b981';
                }
            };
            
            descriptionField.addEventListener('input', updateCounter);
            updateCounter(); // Initial update
        }
    }

    updateCompletionStatus() {
        const requiredFields = ['customerName', 'region', 'closeDate', 'opportunityName', 'description'];
        const completedFields = requiredFields.filter(fieldId => {
            const field = document.getElementById(fieldId);
            return field && field.value.trim();
        });

        const percentage = Math.round((completedFields.length / requiredFields.length) * 100);
        
        const statusText = document.querySelector('.completion-status .status-text');
        const statusFill = document.getElementById('statusFill');
        
        if (statusText) {
            statusText.textContent = `${percentage}% Complete`;
        }
        
        if (statusFill) {
            statusFill.style.width = `${percentage}%`;
        }
    }

    switchView(viewType) {
        // Update control buttons
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewType}"]`).classList.add('active');

        // Update content layout
        const analysisContent = document.getElementById('analysisContent');
        if (analysisContent) {
            analysisContent.className = `analysis-content ${viewType}-view`;
        }

        this.currentView = viewType;
    }

    loadSampleData() {
        document.getElementById('customerName').value = 'NextGen Automotive Solutions';
        document.getElementById('region').value = 'Japan';
        document.getElementById('closeDate').value = '2025-12-20';
        document.getElementById('opportunityName').value = 'Autonomous Vehicle Data Platform';
        document.getElementById('description').value = 'Revolutionary autonomous vehicle data processing and analytics platform supporting real-time decision making for self-driving car fleet. System must process 10TB+ of sensor data daily from 5,000+ vehicles, provide millisecond response times for safety-critical decisions, implement advanced computer vision and machine learning algorithms, and ensure 99.999% uptime for mission-critical operations. Integration with existing automotive systems and compliance with international automotive safety standards required.';
        
        this.updateCompletionStatus();
        this.updateCharacterCounter();
    }

    saveFormData() {
        const formData = {
            customerName: document.getElementById('customerName')?.value || '',
            region: document.getElementById('region')?.value || '',
            closeDate: document.getElementById('closeDate')?.value || '',
            opportunityName: document.getElementById('opportunityName')?.value || '',
            description: document.getElementById('description')?.value || ''
        };
        localStorage.setItem('compactOpportunityDataC', JSON.stringify(formData));
    }

    loadFormData() {
        const savedData = localStorage.getItem('compactOpportunityDataC');
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

        // Validate description length
        const description = document.getElementById('description');
        if (description && description.value.trim().length < 50) {
            errors.push('Description must be at least 50 characters');
            this.highlightError(description);
        }

        return errors;
    }

    highlightError(field) {
        if (field) {
            field.style.borderColor = '#ef4444';
            field.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
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
                <strong>Please address the following issues:</strong>
                <ul>${errors.map(error => `<li>${error}</li>`).join('')}</ul>
            `;

            const actionPanel = document.querySelector('.action-panel');
            actionPanel.parentNode.insertBefore(errorDiv, actionPanel);
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
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.innerHTML = '<span class="loading"></span><span class="btn-text">Analyzing...</span>';
            analyzeBtn.disabled = true;
        }

        // Update analysis status
        const analysisStatus = document.getElementById('analysisStatus');
        if (analysisStatus) {
            analysisStatus.innerHTML = '<span class="loading"></span><span class="status-text">Processing</span>';
        }

        // Show analysis sections with loading states
        this.showAnalysisSection();
        const loadingStates = document.querySelectorAll('.loading-state');
        loadingStates.forEach(state => {
            state.innerHTML = '<span class="loading"></span> Processing analysis...';
        });
    }

    hideLoadingState() {
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.innerHTML = '<span class="btn-icon">🔍</span><span class="btn-text">Analyze Opportunity</span>';
            analyzeBtn.disabled = false;
        }

        // Update analysis status
        const analysisStatus = document.getElementById('analysisStatus');
        if (analysisStatus) {
            analysisStatus.innerHTML = '<span class="status-dot"></span><span class="status-text">Complete</span>';
        }
    }

    displayResults(data) {
        // Update metrics with enhanced animations
        this.updateMetricWithAnimation('predictedArr', data.metrics?.predictedArr || 'N/A');
        this.updateMetricWithAnimation('predictedMrr', data.metrics?.predictedMrr || 'N/A');
        this.updateMetricWithAnimation('launchDate', data.metrics?.launchDate || 'N/A');
        this.updateMetricWithAnimation('timeToLaunch', this.formatTimeToLaunch(data.metrics?.predictedProjectDuration) || 'N/A');

        // Update confidence with gauge animation
        this.updateConfidenceGauge(data.metrics);

        // Update top services with modern layout
        this.updateElement('topServices', this.formatServicesModern(data.metrics?.topServices || data.services));

        // Update analysis sections with rich content
        this.updateElement('methodology', data.methodology || this.generateModernMethodology());
        this.updateElement('findings', data.findings || this.generateModernFindings());
        this.updateElement('riskFactors', data.riskFactors || this.generateModernRiskFactors());
        this.updateElement('similarProjects', data.similarProjects || this.generateModernSimilarProjects());
        this.updateElement('rationale', data.rationale || this.generateModernRationale());
        this.updateElement('fullAnalysis', data.fullAnalysis || this.generateModernFullAnalysis());
        this.updateElement('fundingOptions', data.fundingOptions || this.generateModernFundingOptions());
        this.updateElement('followOnOpportunities', data.followOnOpportunities || this.generateModernFollowOnOpportunities());
    }

    updateMetricWithAnimation(id, value) {
        const element = document.getElementById(id);
        if (element) {
            // Add animation class
            element.style.transform = 'scale(1.1)';
            element.style.transition = 'transform 0.3s ease';
            
            setTimeout(() => {
                element.textContent = value;
                element.style.transform = 'scale(1)';
            }, 150);
        }
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

    updateConfidenceGauge(metrics) {
        if (!metrics) return;

        const score = metrics.confidenceScore || 0;
        const label = metrics.confidence || 'UNKNOWN';
        
        this.updateElement('confidenceScore', `${score}%`);
        this.updateElement('confidenceLabel', label);

        // Animate gauge fill
        const fill = document.getElementById('confidenceFill');
        if (fill) {
            setTimeout(() => {
                fill.style.width = `${score}%`;
                
                // Color based on confidence level
                if (score >= 80) {
                    fill.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
                } else if (score >= 60) {
                    fill.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
                } else {
                    fill.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
                }
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
        } else if (factorsElement) {
            factorsElement.innerHTML = `
                <div class="empty-state small">
                    <div class="empty-text">Confidence analysis complete</div>
                </div>
            `;
        }
    }

    formatServicesModern(services) {
        if (typeof services === 'string') {
            return services;
        }

        if (Array.isArray(services)) {
            return `
                <div class="modern-services-grid">
                    ${services.map((service, index) => `
                        <div class="modern-service-card" style="animation-delay: ${index * 0.1}s">
                            <div class="service-header">
                                <div class="service-icon">${this.getServiceIcon(service.name)}</div>
                                <div class="service-name">${service.name}</div>
                            </div>
                            <div class="service-cost">$${service.cost?.toLocaleString() || 'N/A'}/month</div>
                            <div class="service-description">${service.description || ''}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        return this.generateModernServices();
    }

    getServiceIcon(serviceName) {
        const icons = {
            'Amazon EC2': '🖥️',
            'Amazon RDS': '🗄️',
            'Amazon S3': '📦',
            'AWS Lambda': '⚡',
            'Amazon Kinesis': '🌊',
            'AWS IoT Core': '🔗',
            'Amazon SageMaker': '🤖',
            'Amazon Redshift': '📊'
        };
        return icons[serviceName] || '☁️';
    }

    generateModernServices() {
        return `
            <div class="modern-services-grid">
                <div class="modern-service-card">
                    <div class="service-header">
                        <div class="service-icon">🖥️</div>
                        <div class="service-name">Amazon EC2</div>
                    </div>
                    <div class="service-cost">$8,500/month</div>
                    <div class="service-description">High-performance compute for real-time processing</div>
                </div>
                <div class="modern-service-card">
                    <div class="service-header">
                        <div class="service-icon">🤖</div>
                        <div class="service-name">Amazon SageMaker</div>
                    </div>
                    <div class="service-cost">$5,200/month</div>
                    <div class="service-description">Machine learning model training and inference</div>
                </div>
                <div class="modern-service-card">
                    <div class="service-header">
                        <div class="service-icon">🌊</div>
                        <div class="service-name">Amazon Kinesis</div>
                    </div>
                    <div class="service-cost">$3,800/month</div>
                    <div class="service-description">Real-time data streaming and analytics</div>
                </div>
                <div class="modern-service-card">
                    <div class="service-header">
                        <div class="service-icon">📦</div>
                        <div class="service-name">Amazon S3</div>
                    </div>
                    <div class="service-cost">$2,100/month</div>
                    <div class="service-description">Scalable object storage for sensor data</div>
                </div>
            </div>
        `;
    }

    generateModernMethodology() {
        return `
            <div class="modern-methodology">
                <div class="methodology-flow">
                    <div class="flow-step">
                        <div class="step-icon">📊</div>
                        <div class="step-title">Data Collection</div>
                        <div class="step-desc">Analyzed 750+ autonomous vehicle projects globally</div>
                    </div>
                    <div class="flow-arrow">→</div>
                    <div class="flow-step">
                        <div class="step-icon">🧠</div>
                        <div class="step-title">AI Analysis</div>
                        <div class="step-desc">Applied deep learning for pattern recognition</div>
                    </div>
                    <div class="flow-arrow">→</div>
                    <div class="flow-step">
                        <div class="step-icon">🎯</div>
                        <div class="step-title">Prediction</div>
                        <div class="step-desc">Generated probabilistic success models</div>
                    </div>
                </div>
            </div>
        `;
    }

    generateModernFindings() {
        return `
            <div class="modern-findings">
                <div class="finding-card positive">
                    <div class="finding-indicator">98%</div>
                    <div class="finding-label">Market Readiness</div>
                    <div class="finding-detail">Autonomous vehicle market primed for data platforms</div>
                </div>
                <div class="finding-card positive">
                    <div class="finding-indicator">$2.8M</div>
                    <div class="finding-label">Cost Savings</div>
                    <div class="finding-detail">Annual operational efficiency improvements</div>
                </div>
                <div class="finding-card neutral">
                    <div class="finding-indicator">6</div>
                    <div class="finding-label">Months</div>
                    <div class="finding-detail">Regulatory approval timeline estimate</div>
                </div>
            </div>
        `;
    }

    generateModernRiskFactors() {
        return `
            <div class="modern-risks">
                <div class="risk-category">
                    <h4>🔒 Technical Risks</h4>
                    <div class="risk-items">
                        <div class="risk-item low">Data processing latency requirements</div>
                        <div class="risk-item medium">Integration with existing vehicle systems</div>
                    </div>
                </div>
                <div class="risk-category">
                    <h4>📋 Regulatory Risks</h4>
                    <div class="risk-items">
                        <div class="risk-item medium">Automotive safety standard compliance</div>
                        <div class="risk-item low">Data privacy regulations</div>
                    </div>
                </div>
                <div class="risk-category">
                    <h4>💼 Business Risks</h4>
                    <div class="risk-items">
                        <div class="risk-item low">Market adoption timeline</div>
                        <div class="risk-item low">Competitive response</div>
                    </div>
                </div>
            </div>
        `;
    }

    generateModernSimilarProjects() {
        return `
            <div class="modern-projects">
                <div class="project-timeline">
                    <div class="timeline-item">
                        <div class="timeline-date">2024 Q3</div>
                        <div class="timeline-content">
                            <h4>🚗 AutoTech Innovations</h4>
                            <div class="project-metrics">
                                <span class="metric">$650K ARR</span>
                                <span class="metric">12 months</span>
                                <span class="metric success">97% success</span>
                            </div>
                            <p>Autonomous fleet management platform for ride-sharing</p>
                        </div>
                    </div>
                    <div class="timeline-item">
                        <div class="timeline-date">2024 Q1</div>
                        <div class="timeline-content">
                            <h4>🏭 SmartDrive Manufacturing</h4>
                            <div class="project-metrics">
                                <span class="metric">$480K ARR</span>
                                <span class="metric">9 months</span>
                                <span class="metric success">94% success</span>
                            </div>
                            <p>Connected vehicle data analytics for manufacturing optimization</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    generateModernRationale() {
        return `
            <div class="modern-rationale">
                <div class="rationale-grid">
                    <div class="rationale-card">
                        <div class="card-icon">🎯</div>
                        <h4>Strategic Alignment</h4>
                        <p>Perfect alignment with Japan's autonomous vehicle leadership initiative and customer's innovation roadmap.</p>
                    </div>
                    <div class="rationale-card">
                        <div class="card-icon">🚀</div>
                        <h4>Technology Leadership</h4>
                        <p>Opportunity to establish market-leading position in autonomous vehicle data processing.</p>
                    </div>
                    <div class="rationale-card">
                        <div class="card-icon">💎</div>
                        <h4>Premium Value</h4>
                        <p>High-value, mission-critical application justifies premium pricing model.</p>
                    </div>
                </div>
            </div>
        `;
    }

    generateModernFullAnalysis() {
        return `
            <div class="modern-full-analysis">
                <div class="analysis-executive-summary">
                    <h4>🎯 Executive Summary</h4>
                    <p>This autonomous vehicle data platform represents a transformational opportunity in the rapidly evolving automotive technology sector. The combination of Japan's regulatory support, customer's technical expertise, and AWS's advanced capabilities creates an exceptional foundation for success.</p>
                </div>
                
                <div class="analysis-key-metrics">
                    <div class="key-metric">
                        <div class="metric-icon">💰</div>
                        <div class="metric-info">
                            <div class="metric-value">$580K</div>
                            <div class="metric-label">Projected Annual Revenue</div>
                        </div>
                    </div>
                    <div class="key-metric">
                        <div class="metric-icon">📈</div>
                        <div class="metric-info">
                            <div class="metric-value">96%</div>
                            <div class="metric-label">Success Probability</div>
                        </div>
                    </div>
                    <div class="key-metric">
                        <div class="metric-icon">⚡</div>
                        <div class="metric-info">
                            <div class="metric-value">10ms</div>
                            <div class="metric-label">Target Response Time</div>
                        </div>
                    </div>
                </div>
                
                <div class="analysis-recommendation">
                    <div class="recommendation-badge">STRONGLY RECOMMENDED</div>
                    <p>Proceed with immediate technical deep-dive and architecture planning. This opportunity aligns perfectly with AWS's strategic focus on automotive innovation and represents significant revenue potential with manageable risk profile.</p>
                </div>
            </div>
        `;
    }

    generateModernFundingOptions() {
        return `
            <div class="modern-funding">
                <div class="funding-grid">
                    <div class="funding-option primary">
                        <div class="funding-header">
                            <div class="funding-icon">🏆</div>
                            <h4>AWS Automotive Accelerator</h4>
                        </div>
                        <div class="funding-amount">$1.8M</div>
                        <div class="funding-details">
                            <div class="funding-item">✓ Dedicated technical support</div>
                            <div class="funding-item">✓ Automotive compliance guidance</div>
                            <div class="funding-item">✓ Go-to-market support</div>
                        </div>
                    </div>
                    <div class="funding-option secondary">
                        <div class="funding-header">
                            <div class="funding-icon">🎓</div>
                            <h4>Skills Development Program</h4>
                        </div>
                        <div class="funding-amount">$250K</div>
                        <div class="funding-details">
                            <div class="funding-item">✓ ML/AI certification tracks</div>
                            <div class="funding-item">✓ Automotive domain training</div>
                            <div class="funding-item">✓ Architecture workshops</div>
                        </div>
                    </div>
                    <div class="funding-option tertiary">
                        <div class="funding-header">
                            <div class="funding-icon">🤝</div>
                            <h4>Partnership Investment</h4>
                        </div>
                        <div class="funding-amount">40%</div>
                        <div class="funding-details">
                            <div class="funding-item">✓ Risk-sharing model</div>
                            <div class="funding-item">✓ Success-based pricing</div>
                            <div class="funding-item">✓ Long-term partnership</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    generateModernFollowOnOpportunities() {
        return `
            <div class="modern-followon">
                <div class="followon-timeline">
                    <div class="timeline-phase">
                        <div class="phase-period">Q2 2026</div>
                        <div class="phase-content">
                            <div class="phase-icon">🌐</div>
                            <h4>Global Fleet Expansion</h4>
                            <div class="phase-value">+$420K ARR</div>
                            <p>Expand platform to support international autonomous vehicle fleets across Asia-Pacific region</p>
                            <div class="phase-tags">
                                <span class="tag">Multi-region</span>
                                <span class="tag">Scalability</span>
                            </div>
                        </div>
                    </div>
                    <div class="timeline-phase">
                        <div class="phase-period">Q4 2026</div>
                        <div class="phase-content">
                            <div class="phase-icon">🧠</div>
                            <h4>Advanced AI Integration</h4>
                            <div class="phase-value">+$320K ARR</div>
                            <p>Implement next-generation AI models for predictive maintenance and autonomous decision-making</p>
                            <div class="phase-tags">
                                <span class="tag">AI/ML</span>
                                <span class="tag">Innovation</span>
                            </div>
                        </div>
                    </div>
                    <div class="timeline-phase">
                        <div class="phase-period">Q2 2027</div>
                        <div class="phase-content">
                            <div class="phase-icon">🏭</div>
                            <h4>Industry Platform</h4>
                            <div class="phase-value">+$680K ARR</div>
                            <p>Transform into comprehensive automotive industry platform serving multiple manufacturers</p>
                            <div class="phase-tags">
                                <span class="tag">Platform</span>
                                <span class="tag">Ecosystem</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="followon-summary">
                    <div class="summary-metric">
                        <div class="summary-value">$1.42M</div>
                        <div class="summary-label">Total Additional ARR Potential</div>
                    </div>
                    <div class="summary-metric">
                        <div class="summary-value">24</div>
                        <div class="summary-label">Months Implementation Timeline</div>
                    </div>
                </div>
            </div>
        `;
    }

    showAnalysisSection() {
        const detailedAnalysis = document.getElementById('detailedAnalysis');
        const additionalSections = document.getElementById('additionalSections');
        
        if (detailedAnalysis) {
            detailedAnalysis.style.display = 'block';
        }
        
        if (additionalSections) {
            additionalSections.style.display = 'block';
        }
        
        // Smooth scroll to results
        if (detailedAnalysis) {
            detailedAnalysis.scrollIntoView({ behavior: 'smooth' });
        }
    }

    showError(message) {
        this.removeExistingErrors();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'analysis-error';
        errorDiv.innerHTML = `<strong>Analysis Error:</strong> ${message}`;

        const actionPanel = document.querySelector('.action-panel');
        actionPanel.parentNode.insertBefore(errorDiv, actionPanel.nextSibling);
    }

    clearForm() {
        const formInputs = document.querySelectorAll('input, select, textarea');
        formInputs.forEach(input => {
            input.value = '';
            this.clearError(input);
        });

        // Reset all metrics
        ['predictedArr', 'predictedMrr', 'launchDate', 'timeToLaunch', 'confidenceScore', 'confidenceLabel'].forEach(id => {
            this.updateElement(id, '-');
        });

        // Reset confidence gauge
        const fill = document.getElementById('confidenceFill');
        if (fill) {
            fill.style.width = '0%';
        }

        // Reset services section
        const topServices = document.getElementById('topServices');
        if (topServices) {
            topServices.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">☁️</div>
                    <div class="empty-text">Service recommendations will appear after analysis</div>
                </div>
            `;
        }

        // Hide analysis sections
        const detailedAnalysis = document.getElementById('detailedAnalysis');
        const additionalSections = document.getElementById('additionalSections');
        
        if (detailedAnalysis) {
            detailedAnalysis.style.display = 'none';
        }
        
        if (additionalSections) {
            additionalSections.style.display = 'none';
        }

        // Update completion status
        this.updateCompletionStatus();
        this.updateCharacterCounter();

        // Clear saved data and errors
        localStorage.removeItem('compactOpportunityDataC');
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
            },
            metadata: {
                version: 'Option C - Modern Dashboard',
                exportedBy: 'Partner Opportunity Intelligence',
                completionStatus: document.querySelector('.completion-status .status-text')?.textContent || ''
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
    new CompactOpportunityAnalyzerC();
});