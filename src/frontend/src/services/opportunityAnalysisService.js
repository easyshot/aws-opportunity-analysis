import { fetchAuthSession } from 'aws-amplify/auth';
import { post } from 'aws-amplify/api';

// Service for handling opportunity analysis API calls
class OpportunityAnalysisService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_ENDPOINT || 'http://localhost:8123';
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2
    };
  }

  // Generic API call with retry logic
  async apiCall(endpoint, options = {}) {
    const { maxRetries, retryDelay, backoffMultiplier } = this.retryConfig;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Get auth session for authenticated requests
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();

        const response = await fetch(`${this.baseURL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
          },
          body: JSON.stringify(options.body || {}),
          ...options
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;

      } catch (error) {
        lastError = error;
        
        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (error.message.includes('HTTP 4') && !error.message.includes('HTTP 429')) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retrying with exponential backoff
        const delay = retryDelay * Math.pow(backoffMultiplier, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.warn(`API call attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error.message);
      }
    }

    throw lastError;
  }

  // Analyze opportunity
  async analyzeOpportunity(formData, analysisType = 'standard', userSettings = {}) {
    try {
      const payload = {
        ...formData,
        analysisType,
        useNovaPremier: analysisType === 'nova-premier',
        timestamp: new Date().toISOString()
      };

      // Prepare headers for user-configurable settings
      const headers = {
        ...(userSettings.enableTruncation !== undefined && { 'x-enable-truncation': String(userSettings.enableTruncation) }),
        ...(userSettings.truncationLimit && { 'x-truncation-limit': String(userSettings.truncationLimit) }),
        ...(userSettings.sqlQueryLimit && { 'x-sql-query-limit': String(userSettings.sqlQueryLimit) }),
        ...(userSettings.analysisTimeout && { 'x-analysis-timeout': String(userSettings.analysisTimeout) })
      };

      const response = await this.apiCall('/api/analyze', {
        body: payload,
        headers
      });

      return this.processAnalysisResponse(response);
    } catch (error) {
      console.error('Analysis failed:', error);
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  // Analyze funding options
  async analyzeFunding(formData, analysisResults) {
    try {
      const payload = {
        ...formData,
        analysisResults,
        timestamp: new Date().toISOString()
      };

      const response = await this.apiCall('/api/analyze/funding', {
        body: payload
      });

      return response;
    } catch (error) {
      console.error('Funding analysis failed:', error);
      throw new Error(`Funding analysis failed: ${error.message}`);
    }
  }

  // Analyze follow-on opportunities
  async analyzeFollowOnOpportunity(formData, analysisResults) {
    try {
      const payload = {
        ...formData,
        analysisResults,
        timestamp: new Date().toISOString()
      };

      const response = await this.apiCall('/api/analyze/next-opportunity', {
        body: payload
      });

      return response;
    } catch (error) {
      console.error('Follow-on analysis failed:', error);
      throw new Error(`Follow-on analysis failed: ${error.message}`);
    }
  }

  // Process and validate analysis response
  processAnalysisResponse(response) {
    if (!response) {
      throw new Error('Empty response from analysis service');
    }

    // Validate required fields
    const requiredFields = ['metrics', 'sections'];
    for (const field of requiredFields) {
      if (!response[field]) {
        console.warn(`Missing required field: ${field}`);
      }
    }

    // Ensure metrics have default values
    const metrics = {
      predictedArr: 'N/A',
      predictedMrr: 'N/A',
      launchDate: 'N/A',
      timeToLaunch: 'N/A',
      confidence: 'UNKNOWN',
      topServices: 'No services data',
      ...response.metrics
    };

    // Ensure sections have default values
    let sections = {
      analysisMethodology: 'No methodology available',
      similarProjects: [],
      detailedFindings: 'No findings available',
      predictionRationale: 'No rationale available',
      riskFactors: 'No risk factors identified',
      ...response.sections
    };

    // If sections are missing or incomplete but fullAnalysis is present, parse it
    const hasMinimalSections = !response.sections || Object.keys(response.sections).length < 3;
    if (response.fullAnalysis && hasMinimalSections) {
      const parsedSections = this.parseFullAnalysisSections(response.fullAnalysis);
      sections = { ...sections, ...parsedSections };
    }

    // Process similar projects if they're in string format
    if (typeof sections.similarProjects === 'string') {
      try {
        sections.similarProjectsRaw = sections.similarProjects;
        sections.similarProjects = this.parseSimilarProjects(sections.similarProjects);
      } catch (error) {
        console.warn('Failed to parse similar projects:', error);
        sections.similarProjectsRaw = sections.similarProjects;
        sections.similarProjects = [];
      }
    }

    return {
      ...response,
      metrics,
      sections,
      processedAt: new Date().toISOString()
    };
  }

  // Parse similar projects from text format
  parseSimilarProjects(projectsText) {
    if (!projectsText || typeof projectsText !== 'string') {
      return [];
    }

    try {
      // Try to parse as JSON first
      if (projectsText.trim().startsWith('[') || projectsText.trim().startsWith('{')) {
        return JSON.parse(projectsText);
      }

      // Parse text format
      const projects = [];
      const projectBlocks = projectsText.split(/\n\s*\n/).filter(block => block.trim());

      for (const block of projectBlocks) {
        const project = {};
        const lines = block.split('\n').filter(line => line.trim());

        for (const line of lines) {
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim().toLowerCase().replace(/\s+/g, '_');
            const value = line.substring(colonIndex + 1).trim();
            project[key] = value;
          }
        }

        if (Object.keys(project).length > 0) {
          projects.push(project);
        }
      }

      return projects;
    } catch (error) {
      console.warn('Failed to parse similar projects text:', error);
      return [];
    }
  }

  // Parse sections from fullAnalysis string
  parseFullAnalysisSections(fullAnalysis) {
    if (!fullAnalysis || typeof fullAnalysis !== 'string') return {};

    const sectionMap = {
      'ANALYSIS_METHODOLOGY': 'analysisMethodology',
      'SIMILAR_PROJECTS': 'similarProjects',
      'DETAILED_FINDINGS': 'detailedFindings',
      'PREDICTION_RATIONALE': 'predictionRationale',
      'RISK_FACTORS': 'riskFactors',
      'ARCHITECTURE_DESCRIPTION': 'architecture',
      'SUMMARY_METRICS': 'summaryMetrics',
      'VALIDATION_ERRORS': 'validationErrors'
    };

    const regex = /===([A-Z_]+)===/g;
    let match, result = {};
    const indices = [];

    // Find all section headers
    while ((match = regex.exec(fullAnalysis)) !== null) {
      indices.push({ name: match[1], index: match.index });
    }
    indices.push({ name: null, index: fullAnalysis.length });

    // Extract content for each section
    for (let i = 0; i < indices.length - 1; i++) {
      const { name, index } = indices[i];
      const nextIndex = indices[i + 1].index;
      const key = sectionMap[name] || name;
      if (key) {
        result[key] = fullAnalysis.slice(index + (`===${name}===`).length, nextIndex).trim();
      }
    }

    // Parse similarProjects if present
    if (result.similarProjects) {
      result.similarProjectsRaw = result.similarProjects;
      result.similarProjects = this.parseSimilarProjects(result.similarProjects);
    }

    return result;
  }

  // Get analysis history
  async getAnalysisHistory(userId, limit = 10, nextToken = null) {
    try {
      const payload = {
        userId,
        limit,
        ...(nextToken && { nextToken })
      };

      const response = await this.apiCall('/api/analysis/history', {
        body: payload
      });

      return response;
    } catch (error) {
      console.error('Failed to get analysis history:', error);
      throw new Error(`Failed to get analysis history: ${error.message}`);
    }
  }

  // Export analysis results
  async exportAnalysisResults(analysisId, format = 'json') {
    try {
      const response = await this.apiCall(`/api/analysis/${analysisId}/export`, {
        body: { format }
      });

      return response;
    } catch (error) {
      console.error('Failed to export analysis results:', error);
      throw new Error(`Failed to export analysis results: ${error.message}`);
    }
  }

  // Validate opportunity data
  validateOpportunityData(formData) {
    const errors = [];
    const requiredFields = ['CustomerName', 'region', 'closeDate', 'oppName', 'oppDescription'];

    for (const field of requiredFields) {
      if (!formData[field] || formData[field].trim() === '') {
        errors.push(`${field} is required`);
      }
    }

    // Validate date format
    if (formData.closeDate) {
      const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$|^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formData.closeDate)) {
        errors.push('Close date must be in MM/DD/YYYY or YYYY-MM-DD format');
      }
    }

    // Validate description length
    if (formData.oppDescription && formData.oppDescription.length < 10) {
      errors.push('Opportunity description must be at least 10 characters long');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get service health status
  async getHealthStatus() {
    try {
      const response = await fetch(`${this.baseURL}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create and export singleton instance
export const opportunityAnalysisService = new OpportunityAnalysisService();