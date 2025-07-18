# Bedrock Knowledge Base Setup Guide

This guide covers the setup and configuration of AWS Bedrock Knowledge Base with OpenSearch Serverless for enhanced opportunity analysis using Retrieval Augmented Generation (RAG).

## Overview

The knowledge base implementation provides:
- **Vector Storage**: OpenSearch Serverless collection for efficient similarity search
- **Data Ingestion**: Automated pipeline for historical project data
- **RAG Integration**: Enhanced analysis using retrieved context
- **Chunking Strategy**: Optimized text segmentation for better embeddings
- **S3 Synchronization**: Automated data source management

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   S3 Bucket     │    │  Bedrock KB      │    │  OpenSearch     │
│ (Data Source)   │───▶│  (Orchestrator)  │───▶│  Serverless     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                       │
         │                        ▼                       │
         │              ┌──────────────────┐              │
         │              │  Embedding       │              │
         └──────────────│  Model           │◀─────────────┘
                        │  (Titan v2)      │
                        └──────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │  RAG Service     │
                        │  (Enhanced       │
                        │   Analysis)      │
                        └──────────────────┘
```

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured with credentials
3. **AWS CDK** installed and bootstrapped
4. **Node.js** 18+ and npm
5. **Environment variables** configured

### Required AWS Permissions

Your AWS credentials need the following permissions:
- `bedrock:*` (Bedrock full access)
- `aoss:*` (OpenSearch Serverless full access)
- `s3:*` (S3 full access for knowledge base bucket)
- `iam:*` (IAM for service roles)
- `cloudformation:*` (CDK deployment)

## Installation Steps

### 1. Install Dependencies

```bash
# Install new AWS SDK packages
npm install @aws-sdk/client-opensearchserverless @aws-sdk/client-s3
```

### 2. Configure Environment Variables

Update your `.env` file with knowledge base configuration:

```bash
# Knowledge Base Configuration
KNOWLEDGE_BASE_ID=your-knowledge-base-id
KNOWLEDGE_BASE_DATA_SOURCE_ID=your-data-source-id
KNOWLEDGE_BASE_BUCKET=aws-opportunity-kb-your-account-your-region

# Existing AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
CDK_DEFAULT_ACCOUNT=your-aws-account-id
```

### 3. Deploy Infrastructure

```bash
# Create the CDK stack definition
node scripts/deploy-knowledge-base.js deploy

# Deploy the actual infrastructure
cdk deploy BedrockKnowledgeBaseStack
```

### 4. Update Environment with Resource IDs

After deployment, update your `.env` file with the actual resource IDs from the CDK output:

```bash
KNOWLEDGE_BASE_ID=ABCD1234EFGH  # From CDK output
KNOWLEDGE_BASE_DATA_SOURCE_ID=WXYZ5678IJKL  # From CDK output
```

### 5. Test Data Ingestion

```bash
# Test with sample data
node scripts/deploy-knowledge-base.js test-ingestion
```

## Data Ingestion Pipeline

### Supported Data Formats

The ingestion pipeline supports historical project data with the following structure:

```javascript
{
  opportunity_name: "Enterprise Cloud Migration",
  customer_name: "TechCorp Inc",
  region: "us-east-1",
  industry: "Technology",
  customer_segment: "Enterprise",
  description: "Large-scale migration...",
  business_description: "Digital transformation...",
  close_date: "2023-06-15",
  total_arr: "500000",
  total_mrr: "41667",
  top_services: "EC2, S3, RDS, Lambda",
  migration_phase: "Phase 2",
  activity_focus: "Infrastructure Migration"
}
```

### Chunking Strategy

The knowledge base uses a fixed-size chunking strategy:
- **Chunk Size**: 512 tokens
- **Overlap**: 20% between chunks
- **Embedding Model**: Amazon Titan Embed Text v2

### Data Processing

Historical projects are processed into structured text format:

```text
Project: Enterprise Cloud Migration
Customer: TechCorp Inc
Industry: Technology
Customer Segment: Enterprise
Region: us-east-1
Activity Focus: Infrastructure Migration
Description: Large-scale migration of on-premises infrastructure...
Annual Recurring Revenue: 500000
AWS Services: EC2, S3, RDS, Lambda, CloudFormation
```

## RAG Service Usage

### Basic RAG Query

```javascript
const { BedrockRAGService } = require('./lib/bedrock-rag-service');

const ragService = new BedrockRAGService({
  region: 'us-east-1',
  knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID
});

// Retrieve relevant projects
const results = await ragService.retrieveRelevantProjects(
  "cloud migration enterprise technology"
);

// Generate enhanced analysis
const analysis = await ragService.generateEnhancedAnalysis({
  customerName: "NewCorp",
  region: "us-west-2",
  opportunityName: "Digital Transformation",
  description: "Modernize legacy systems using AWS cloud services"
});
```

### Integrated RetrieveAndGenerate

```javascript
// Use Bedrock's integrated RAG
const result = await ragService.retrieveAndGenerate(
  opportunity,
  "Analyze this opportunity and provide detailed recommendations"
);

console.log(result.generatedText);
console.log(result.citations); // Source references
```

### Enhanced Analysis Automation

```javascript
const { enhancedAnalysisWithRAG } = require('./automations/enhancedAnalysisWithRAG-v3');

const result = await enhancedAnalysisWithRAG({
  customerName: "TechCorp",
  region: "us-east-1",
  oppName: "Cloud Migration",
  oppDescription: "Migrate legacy systems to AWS",
  analysisType: "comprehensive",
  useIntegratedRAG: true
});
```

## Configuration Options

### Embedding Models

Supported embedding models:
- `amazon.titan-embed-text-v1` (default)
- `amazon.titan-embed-text-v2:0` (recommended)

### Analysis Models

Supported analysis models:
- `amazon.titan-text-premier-v1:0` (standard)
- `amazon.nova-premier-v1:0` (advanced)

### Search Configuration

```javascript
const ragService = new BedrockRAGService({
  region: 'us-east-1',
  knowledgeBaseId: 'your-kb-id',
  maxResults: 10,  // Number of results to retrieve
  modelId: 'amazon.titan-text-premier-v1:0'
});
```

## Monitoring and Maintenance

### Knowledge Base Statistics

```javascript
const stats = await ragService.getKnowledgeBaseStats();
console.log(stats);
```

### Data Synchronization

```javascript
const ingestion = new KnowledgeBaseIngestion();

// List current data files
const files = await ingestion.listDataFiles();

// Upload new data
await ingestion.uploadHistoricalProjects(newProjects, 'updated-projects.json');

// Trigger re-ingestion
const job = await ingestion.startIngestionJob();
await ingestion.waitForIngestionCompletion(job.jobId);
```

### Performance Optimization

1. **Chunking Strategy**: Adjust chunk size based on your data characteristics
2. **Embedding Model**: Use Titan v2 for better semantic understanding
3. **Search Type**: Use HYBRID search for best results
4. **Result Count**: Balance between context richness and processing time

## Troubleshooting

### Common Issues

#### 1. Knowledge Base Not Found
```
Error: Knowledge base not found
```
**Solution**: Verify `KNOWLEDGE_BASE_ID` in your environment variables.

#### 2. OpenSearch Collection Access Denied
```
Error: Access denied to OpenSearch collection
```
**Solution**: Check IAM roles and data access policies.

#### 3. Ingestion Job Failed
```
Error: Ingestion job failed with status FAILED
```
**Solution**: Check S3 bucket permissions and data format.

#### 4. Empty Retrieval Results
```
Warning: No relevant documents found
```
**Solution**: Verify data ingestion completed and try broader search terms.

### Debug Mode

Enable debug logging:

```bash
DEBUG=true node your-script.js
```

### Health Checks

```javascript
// Test knowledge base connectivity
const testQuery = await ragService.retrieveRelevantProjects("test query");
console.log(`Retrieved ${testQuery.projects.length} results`);

// Test data source
const files = await ingestion.listDataFiles();
console.log(`Found ${files.length} data files`);
```

## Best Practices

### Data Quality
- Ensure consistent data formats
- Include comprehensive project descriptions
- Maintain accurate metadata
- Regular data updates and cleanup

### Search Optimization
- Use specific, relevant search terms
- Combine multiple search strategies
- Monitor retrieval quality and adjust parameters

### Performance
- Batch data uploads when possible
- Use appropriate chunk sizes for your content
- Monitor embedding costs and usage
- Implement caching for frequent queries

### Security
- Use least-privilege IAM policies
- Enable encryption at rest and in transit
- Regular security audits and updates
- Monitor access patterns and usage

## Cost Optimization

### Embedding Costs
- Titan Embed Text v1: $0.0001 per 1K tokens
- Titan Embed Text v2: $0.00002 per 1K tokens

### Storage Costs
- OpenSearch Serverless: Pay per OCU (OpenSearch Compute Unit)
- S3 Storage: Standard rates for data source bucket

### Query Costs
- Bedrock model inference costs per request
- OpenSearch query costs per search operation

### Optimization Tips
1. Use efficient chunking to minimize embedding costs
2. Implement query caching for repeated searches
3. Monitor and optimize search result counts
4. Regular cleanup of unused data sources

## Support and Resources

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [OpenSearch Serverless Guide](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless.html)
- [Bedrock Knowledge Base API Reference](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_)
- [Project GitHub Repository](https://github.com/your-repo/aws-opportunity-analysis)

For additional support, please refer to the main project documentation or create an issue in the project repository.