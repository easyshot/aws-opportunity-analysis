const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { BedrockAgentClient, StartIngestionJobCommand, GetIngestionJobCommand } = require('@aws-sdk/client-bedrock-agent');
const fs = require('fs').promises;
const path = require('path');

/**
 * Knowledge Base Data Ingestion Pipeline
 * Handles uploading historical project data to S3 and triggering ingestion
 */
class KnowledgeBaseIngestion {
  constructor(config = {}) {
    this.s3Client = new S3Client({ region: config.region || process.env.AWS_REGION });
    this.bedrockAgentClient = new BedrockAgentClient({ region: config.region || process.env.AWS_REGION });
    
    this.bucketName = config.bucketName || process.env.KNOWLEDGE_BASE_BUCKET;
    this.knowledgeBaseId = config.knowledgeBaseId || process.env.KNOWLEDGE_BASE_ID;
    this.dataSourceId = config.dataSourceId || process.env.KNOWLEDGE_BASE_DATA_SOURCE_ID;
    this.dataPrefix = 'historical-projects/';
  }

  /**
   * Upload historical project data to S3 for knowledge base ingestion
   * @param {Array} projects - Array of historical project objects
   * @param {string} fileName - Name for the uploaded file
   */
  async uploadHistoricalProjects(projects, fileName = 'historical-projects.json') {
    try {
      console.log(`Uploading ${projects.length} historical projects to S3...`);
      
      // Convert projects to structured text format for better embedding
      const structuredData = this.formatProjectsForEmbedding(projects);
      
      const uploadParams = {
        Bucket: this.bucketName,
        Key: `${this.dataPrefix}${fileName}`,
        Body: JSON.stringify(structuredData, null, 2),
        ContentType: 'application/json',
        Metadata: {
          'data-type': 'historical-projects',
          'project-count': projects.length.toString(),
          'upload-timestamp': new Date().toISOString()
        }
      };

      const result = await this.s3Client.send(new PutObjectCommand(uploadParams));
      console.log(`Successfully uploaded historical projects to s3://${this.bucketName}/${this.dataPrefix}${fileName}`);
      
      return {
        success: true,
        location: `s3://${this.bucketName}/${this.dataPrefix}${fileName}`,
        etag: result.ETag,
        projectCount: projects.length
      };
    } catch (error) {
      console.error('Error uploading historical projects:', error);
      throw new Error(`Failed to upload historical projects: ${error.message}`);
    }
  }

  /**
   * Format projects into structured text for better embedding and retrieval
   * @param {Array} projects - Raw project data
   * @returns {Array} Formatted project documents
   */
  formatProjectsForEmbedding(projects) {
    return projects.map((project, index) => {
      // Create a comprehensive text representation
      const textContent = this.createProjectTextContent(project);
      
      return {
        id: `project-${index + 1}`,
        text: textContent,
        metadata: {
          opportunity_name: project.opportunity_name || '',
          customer_name: project.customer_name || '',
          region: project.region || '',
          industry: project.industry || '',
          customer_segment: project.customer_segment || '',
          total_arr: project.total_arr || project.stated_historical_arr || '',
          total_mrr: project.total_mrr || '',
          top_services: project.top_services || '',
          close_date: this.formatDate(project.close_date),
          migration_phase: project.migration_phase || '',
          activity_focus: project.activity_focus || ''
        }
      };
    });
  }

  /**
   * Create comprehensive text content for a project
   * @param {Object} project - Project data
   * @returns {string} Formatted text content
   */
  createProjectTextContent(project) {
    const sections = [];
    
    // Project Overview
    sections.push(`Project: ${project.opportunity_name || 'Unknown'}`);
    sections.push(`Customer: ${project.customer_name || 'Unknown'}`);
    
    if (project.partner_name) {
      sections.push(`Partner: ${project.partner_name}`);
    }
    
    // Business Context
    if (project.industry) {
      sections.push(`Industry: ${project.industry}`);
    }
    
    if (project.customer_segment) {
      sections.push(`Customer Segment: ${project.customer_segment}`);
    }
    
    // Geographic Information
    sections.push(`Region: ${project.region || 'Unknown'}`);
    if (project.sub_region) {
      sections.push(`Sub-region: ${project.sub_region}`);
    }
    if (project.country) {
      sections.push(`Country: ${project.country}`);
    }
    
    // Project Details
    if (project.activity_focus) {
      sections.push(`Activity Focus: ${project.activity_focus}`);
    }
    
    if (project.migration_phase) {
      sections.push(`Migration Phase: ${project.migration_phase}`);
    }
    
    // Descriptions
    if (project.description) {
      sections.push(`Description: ${project.description}`);
    }
    
    if (project.business_description) {
      sections.push(`Business Description: ${project.business_description}`);
    }
    
    // Financial Information
    if (project.total_arr || project.stated_historical_arr) {
      const arr = project.total_arr || project.stated_historical_arr;
      sections.push(`Annual Recurring Revenue: ${arr}`);
    }
    
    if (project.total_mrr) {
      sections.push(`Monthly Recurring Revenue: ${project.total_mrr}`);
    }
    
    // Timeline Information
    if (project.close_date) {
      sections.push(`Close Date: ${this.formatDate(project.close_date)}`);
    }
    
    if (project.planned_delivery_start_date) {
      sections.push(`Planned Start Date: ${this.formatDate(project.planned_delivery_start_date)}`);
    }
    
    if (project.planned_delivery_end_date) {
      sections.push(`Planned End Date: ${this.formatDate(project.planned_delivery_end_date)}`);
    }
    
    // AWS Services
    if (project.top_services) {
      sections.push(`AWS Services: ${project.top_services}`);
    }
    
    // Links
    if (project.salesforce_link) {
      sections.push(`Salesforce Link: ${project.salesforce_link}`);
    }
    
    if (project.aws_calculator_link) {
      sections.push(`AWS Calculator Link: ${project.aws_calculator_link}`);
    }
    
    return sections.join('\n');
  }

  /**
   * Format date from various formats to readable string
   * @param {string|number} date - Date in various formats
   * @returns {string} Formatted date string
   */
  formatDate(date) {
    if (!date) return '';
    
    try {
      let dateObj;
      
      if (typeof date === 'string') {
        dateObj = new Date(date);
      } else if (typeof date === 'number') {
        // Handle nanoseconds, milliseconds, or seconds
        if (date > 1e12) {
          // Nanoseconds
          dateObj = new Date(date / 1e6);
        } else if (date > 1e10) {
          // Milliseconds
          dateObj = new Date(date);
        } else {
          // Seconds
          dateObj = new Date(date * 1000);
        }
      } else {
        return date.toString();
      }
      
      return dateObj.toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch (error) {
      console.warn(`Failed to format date: ${date}`, error);
      return date.toString();
    }
  }

  /**
   * Start ingestion job for the knowledge base
   * @returns {Object} Ingestion job details
   */
  async startIngestionJob() {
    try {
      console.log('Starting knowledge base ingestion job...');
      
      const command = new StartIngestionJobCommand({
        knowledgeBaseId: this.knowledgeBaseId,
        dataSourceId: this.dataSourceId,
        description: `Ingestion job started at ${new Date().toISOString()}`
      });

      const result = await this.bedrockAgentClient.send(command);
      
      console.log(`Ingestion job started with ID: ${result.ingestionJob.ingestionJobId}`);
      
      return {
        success: true,
        jobId: result.ingestionJob.ingestionJobId,
        status: result.ingestionJob.status,
        startedAt: result.ingestionJob.startedAt
      };
    } catch (error) {
      console.error('Error starting ingestion job:', error);
      throw new Error(`Failed to start ingestion job: ${error.message}`);
    }
  }

  /**
   * Check the status of an ingestion job
   * @param {string} jobId - Ingestion job ID
   * @returns {Object} Job status details
   */
  async getIngestionJobStatus(jobId) {
    try {
      const command = new GetIngestionJobCommand({
        knowledgeBaseId: this.knowledgeBaseId,
        dataSourceId: this.dataSourceId,
        ingestionJobId: jobId
      });

      const result = await this.bedrockAgentClient.send(command);
      
      return {
        jobId: result.ingestionJob.ingestionJobId,
        status: result.ingestionJob.status,
        startedAt: result.ingestionJob.startedAt,
        updatedAt: result.ingestionJob.updatedAt,
        statistics: result.ingestionJob.statistics,
        failureReasons: result.ingestionJob.failureReasons
      };
    } catch (error) {
      console.error('Error getting ingestion job status:', error);
      throw new Error(`Failed to get ingestion job status: ${error.message}`);
    }
  }

  /**
   * Wait for ingestion job to complete
   * @param {string} jobId - Ingestion job ID
   * @param {number} maxWaitTime - Maximum wait time in milliseconds
   * @returns {Object} Final job status
   */
  async waitForIngestionCompletion(jobId, maxWaitTime = 600000) { // 10 minutes default
    const startTime = Date.now();
    const pollInterval = 10000; // 10 seconds
    
    console.log(`Waiting for ingestion job ${jobId} to complete...`);
    
    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getIngestionJobStatus(jobId);
      
      console.log(`Ingestion job status: ${status.status}`);
      
      if (status.status === 'COMPLETE') {
        console.log('Ingestion job completed successfully');
        return status;
      } else if (status.status === 'FAILED') {
        throw new Error(`Ingestion job failed: ${JSON.stringify(status.failureReasons)}`);
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error(`Ingestion job timed out after ${maxWaitTime / 1000} seconds`);
  }

  /**
   * List existing data files in the knowledge base S3 bucket
   * @returns {Array} List of data files
   */
  async listDataFiles() {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: this.dataPrefix
      });

      const result = await this.s3Client.send(command);
      
      return (result.Contents || []).map(obj => ({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
        etag: obj.ETag
      }));
    } catch (error) {
      console.error('Error listing data files:', error);
      throw new Error(`Failed to list data files: ${error.message}`);
    }
  }

  /**
   * Complete data ingestion pipeline
   * @param {Array} projects - Historical project data
   * @param {string} fileName - File name for upload
   * @returns {Object} Complete ingestion results
   */
  async ingestHistoricalProjects(projects, fileName = 'historical-projects.json') {
    try {
      console.log('Starting complete data ingestion pipeline...');
      
      // Step 1: Upload data to S3
      const uploadResult = await this.uploadHistoricalProjects(projects, fileName);
      
      // Step 2: Start ingestion job
      const jobResult = await this.startIngestionJob();
      
      // Step 3: Wait for completion
      const finalStatus = await this.waitForIngestionCompletion(jobResult.jobId);
      
      return {
        success: true,
        upload: uploadResult,
        ingestion: {
          jobId: jobResult.jobId,
          finalStatus: finalStatus.status,
          statistics: finalStatus.statistics
        }
      };
    } catch (error) {
      console.error('Error in complete ingestion pipeline:', error);
      throw error;
    }
  }
}

module.exports = { KnowledgeBaseIngestion };