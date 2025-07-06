const { BedrockAgentRuntimeClient, RetrieveCommand, RetrieveAndGenerateCommand } = require('@aws-sdk/client-bedrock-agent-runtime');
const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

/**
 * Bedrock RAG Service for Enhanced Analysis
 * Provides retrieval augmented generation capabilities using the knowledge base
 */
class BedrockRAGService {
  constructor(config = {}) {
    this.bedrockAgentRuntimeClient = new BedrockAgentRuntimeClient({ 
      region: config.region || process.env.AWS_REGION 
    });
    this.bedrockRuntimeClient = new BedrockRuntimeClient({ 
      region: config.region || process.env.AWS_REGION 
    });
    
    this.knowledgeBaseId = config.knowledgeBaseId || process.env.KNOWLEDGE_BASE_ID;
    this.defaultModelId = config.modelId || 'amazon.titan-text-premier-v1:0';
    this.maxResults = config.maxResults || 10;
  }

  /**
   * Retrieve relevant documents from the knowledge base
   * @param {string} query - Search query
   * @param {Object} options - Retrieval options
   * @returns {Array} Retrieved documents with relevance scores
   */
  async retrieveRelevantProjects(query, options = {}) {
    try {
      console.log(`Retrieving relevant projects for query: "${query}"`);
      
      const command = new RetrieveCommand({
        knowledgeBaseId: this.knowledgeBaseId,
        retrievalQuery: {
          text: query
        },
        retrievalConfiguration: {
          vectorSearchConfiguration: {
            numberOfResults: options.maxResults || this.maxResults,
            overrideSearchType: options.searchType || 'HYBRID' // SEMANTIC, HYBRID
          }
        }
      });

      const result = await this.bedrockAgentRuntimeClient.send(command);
      
      const retrievedProjects = result.retrievalResults.map(item => ({
        content: item.content.text,
        metadata: item.metadata,
        score: item.score,
        location: item.location
      }));

      console.log(`Retrieved ${retrievedProjects.length} relevant projects`);
      
      return {
        success: true,
        projects: retrievedProjects,
        totalResults: retrievedProjects.length
      };
    } catch (error) {
      console.error('Error retrieving relevant projects:', error);
      throw new Error(`Failed to retrieve relevant projects: ${error.message}`);
    }
  }

  /**
   * Generate enhanced analysis using RAG
   * @param {Object} opportunity - Opportunity details
   * @param {string} analysisType - Type of analysis to perform
   * @returns {Object} Enhanced analysis results
   */
  async generateEnhancedAnalysis(opportunity, analysisType = 'comprehensive') {
    try {
      console.log(`Generating enhanced analysis for opportunity: ${opportunity.opportunityName}`);
      
      // Create search query from opportunity details
      const searchQuery = this.createSearchQuery(opportunity);
      
      // Retrieve relevant historical projects
      const retrievalResult = await this.retrieveRelevantProjects(searchQuery);
      
      // Generate analysis using retrieved context
      const analysisResult = await this.generateAnalysisWithContext(
        opportunity, 
        retrievalResult.projects, 
        analysisType
      );
      
      return {
        success: true,
        analysis: analysisResult,
        retrievedProjects: retrievalResult.projects,
        searchQuery: searchQuery
      };
    } catch (error) {
      console.error('Error generating enhanced analysis:', error);
      throw new Error(`Failed to generate enhanced analysis: ${error.message}`);
    }
  }

  /**
   * Use Bedrock's RetrieveAndGenerate for integrated RAG
   * @param {Object} opportunity - Opportunity details
   * @param {string} prompt - Analysis prompt
   * @returns {Object} Generated analysis with citations
   */
  async retrieveAndGenerate(opportunity, prompt) {
    try {
      console.log('Using integrated RetrieveAndGenerate for analysis...');
      
      const searchQuery = this.createSearchQuery(opportunity);
      const fullPrompt = this.createAnalysisPrompt(opportunity, prompt);
      
      const command = new RetrieveAndGenerateCommand({
        input: {
          text: fullPrompt
        },
        retrieveAndGenerateConfiguration: {
          type: 'KNOWLEDGE_BASE',
          knowledgeBaseConfiguration: {
            knowledgeBaseId: this.knowledgeBaseId,
            modelArn: `arn:aws:bedrock:${process.env.AWS_REGION}::foundation-model/${this.defaultModelId}`,
            retrievalConfiguration: {
              vectorSearchConfiguration: {
                numberOfResults: this.maxResults
              }
            }
          }
        }
      });

      const result = await this.bedrockAgentRuntimeClient.send(command);
      
      return {
        success: true,
        generatedText: result.output.text,
        citations: result.citations || [],
        sessionId: result.sessionId
      };
    } catch (error) {
      console.error('Error in RetrieveAndGenerate:', error);
      throw new Error(`Failed to retrieve and generate: ${error.message}`);
    }
  }

  /**
   * Create search query from opportunity details
   * @param {Object} opportunity - Opportunity details
   * @returns {string} Formatted search query
   */
  createSearchQuery(opportunity) {
    const queryParts = [];
    
    if (opportunity.customerName) {
      queryParts.push(`customer ${opportunity.customerName}`);
    }
    
    if (opportunity.region) {
      queryParts.push(`region ${opportunity.region}`);
    }
    
    if (opportunity.description) {
      // Extract key terms from description
      const keyTerms = this.extractKeyTerms(opportunity.description);
      queryParts.push(...keyTerms);
    }
    
    // Add common AWS service terms if mentioned
    const awsServices = this.extractAWSServices(opportunity.description || '');
    if (awsServices.length > 0) {
      queryParts.push(...awsServices);
    }
    
    return queryParts.join(' ');
  }

  /**
   * Extract key terms from opportunity description
   * @param {string} description - Opportunity description
   * @returns {Array} Key terms
   */
  extractKeyTerms(description) {
    if (!description) return [];
    
    // Common business and technical terms to look for
    const keyTermPatterns = [
      /\b(migration|modernization|transformation|cloud|digital)\b/gi,
      /\b(analytics|data|machine learning|AI|artificial intelligence)\b/gi,
      /\b(security|compliance|governance|backup|disaster recovery)\b/gi,
      /\b(microservices|containers|serverless|kubernetes)\b/gi,
      /\b(database|storage|compute|networking)\b/gi
    ];
    
    const terms = [];
    keyTermPatterns.forEach(pattern => {
      const matches = description.match(pattern);
      if (matches) {
        terms.push(...matches.map(match => match.toLowerCase()));
      }
    });
    
    return [...new Set(terms)]; // Remove duplicates
  }

  /**
   * Extract AWS service names from text
   * @param {string} text - Text to analyze
   * @returns {Array} AWS service names
   */
  extractAWSServices(text) {
    const awsServicePatterns = [
      /\b(EC2|S3|RDS|Lambda|ECS|EKS|Fargate)\b/gi,
      /\b(CloudFormation|CloudWatch|CloudTrail|Config)\b/gi,
      /\b(IAM|Cognito|KMS|Secrets Manager)\b/gi,
      /\b(API Gateway|Application Load Balancer|CloudFront)\b/gi,
      /\b(DynamoDB|Aurora|Redshift|Athena|Glue)\b/gi,
      /\b(SageMaker|Bedrock|Comprehend|Rekognition)\b/gi
    ];
    
    const services = [];
    awsServicePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        services.push(...matches);
      }
    });
    
    return [...new Set(services)]; // Remove duplicates
  }

  /**
   * Generate analysis with retrieved context
   * @param {Object} opportunity - Opportunity details
   * @param {Array} retrievedProjects - Retrieved project data
   * @param {string} analysisType - Type of analysis
   * @returns {Object} Analysis results
   */
  async generateAnalysisWithContext(opportunity, retrievedProjects, analysisType) {
    try {
      const contextPrompt = this.buildContextPrompt(opportunity, retrievedProjects, analysisType);
      
      const command = new ConverseCommand({
        modelId: this.defaultModelId,
        messages: [
          {
            role: 'user',
            content: [{ text: contextPrompt }]
          }
        ],
        inferenceConfig: {
          maxTokens: 4000,
          temperature: 0.3
        }
      });

      const result = await this.bedrockRuntimeClient.send(command);
      const analysisText = result.output.message.content[0].text;
      
      return this.parseAnalysisResponse(analysisText, retrievedProjects);
    } catch (error) {
      console.error('Error generating analysis with context:', error);
      throw error;
    }
  }

  /**
   * Build context prompt with retrieved projects
   * @param {Object} opportunity - Opportunity details
   * @param {Array} retrievedProjects - Retrieved project data
   * @param {string} analysisType - Type of analysis
   * @returns {string} Complete prompt
   */
  buildContextPrompt(opportunity, retrievedProjects, analysisType) {
    const contextSection = retrievedProjects.map((project, index) => 
      `Historical Project ${index + 1} (Relevance Score: ${project.score?.toFixed(2) || 'N/A'}):\n${project.content}\n`
    ).join('\n');
    
    return `You are an AWS solutions architect analyzing a new business opportunity using historical project data.

OPPORTUNITY DETAILS:
Customer: ${opportunity.customerName}
Region: ${opportunity.region}
Close Date: ${opportunity.closeDate}
Opportunity Name: ${opportunity.opportunityName}
Description: ${opportunity.description}

RELEVANT HISTORICAL PROJECTS:
${contextSection}

ANALYSIS INSTRUCTIONS:
Based on the historical projects above, provide a comprehensive analysis including:

1. FINANCIAL PROJECTIONS:
   - Predicted Annual Recurring Revenue (ARR)
   - Predicted Monthly Recurring Revenue (MRR)
   - Confidence level (HIGH/MEDIUM/LOW) with reasoning

2. TIMELINE PREDICTIONS:
   - Expected launch date
   - Time to launch (in months)
   - Key milestones and dependencies

3. AWS SERVICES RECOMMENDATIONS:
   - Top 5-7 AWS services most likely to be used
   - Architecture recommendations based on similar projects

4. RISK ASSESSMENT:
   - Potential challenges based on historical patterns
   - Mitigation strategies
   - Success factors from similar projects

5. SIMILAR PROJECT ANALYSIS:
   - Which historical projects are most similar and why
   - Key learnings from those projects
   - Differences to consider

Format your response as structured JSON with clear sections for each analysis component.`;
  }

  /**
   * Create analysis prompt for RetrieveAndGenerate
   * @param {Object} opportunity - Opportunity details
   * @param {string} basePrompt - Base analysis prompt
   * @returns {string} Complete prompt
   */
  createAnalysisPrompt(opportunity, basePrompt) {
    return `${basePrompt}

Analyze this opportunity using relevant historical project data:
Customer: ${opportunity.customerName}
Region: ${opportunity.region}
Close Date: ${opportunity.closeDate}
Opportunity: ${opportunity.opportunityName}
Description: ${opportunity.description}

Provide detailed analysis with specific references to similar historical projects.`;
  }

  /**
   * Parse analysis response into structured format
   * @param {string} analysisText - Raw analysis text
   * @param {Array} retrievedProjects - Retrieved projects for reference
   * @returns {Object} Structured analysis results
   */
  parseAnalysisResponse(analysisText, retrievedProjects) {
    try {
      // Try to parse as JSON first
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...parsed,
          retrievedProjectsCount: retrievedProjects.length,
          enhancedWithRAG: true
        };
      }
    } catch (error) {
      console.warn('Could not parse analysis as JSON, using text format');
    }
    
    // Fallback to text parsing
    return {
      rawAnalysis: analysisText,
      retrievedProjectsCount: retrievedProjects.length,
      enhancedWithRAG: true,
      format: 'text'
    };
  }

  /**
   * Get knowledge base statistics
   * @returns {Object} Knowledge base statistics
   */
  async getKnowledgeBaseStats() {
    try {
      // This would typically involve querying the knowledge base metadata
      // For now, return basic information
      return {
        knowledgeBaseId: this.knowledgeBaseId,
        status: 'active',
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting knowledge base stats:', error);
      return {
        knowledgeBaseId: this.knowledgeBaseId,
        status: 'unknown',
        error: error.message
      };
    }
  }
}

module.exports = { BedrockRAGService };