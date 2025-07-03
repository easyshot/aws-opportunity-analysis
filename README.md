# Partner Opportunity Intelligence Application

This modern web application analyzes new business opportunities by finding similar historical AWS projects and providing comprehensive predictions about ARR, MRR, launch dates, time to launch, and recommended AWS services. The application features a sophisticated modern dashboard interface with real-time analytics, interactive visualizations, and comprehensive analysis capabilities.

## Features

### Modern Dashboard Interface
- **Real-time Analytics**: Live completion tracking with animated progress indicators
- **Interactive Form Validation**: Smart validation with visual feedback and error prevention
- **Auto-save Functionality**: Automatic form data persistence across browser sessions
- **Character Counter**: Smart description field with length validation and color coding
- **Sample Data Loading**: Quick-load functionality for testing and demonstrations
- **Export Capabilities**: Professional export and print functionality with formatted reports

### Enhanced Analysis Engine
- **Six Comprehensive Analysis Areas**:
  - **Methodology**: Detailed analysis approach and data sources
  - **Findings**: Key insights and market intelligence with visual indicators
  - **Risk Factors**: Comprehensive risk assessment with mitigation strategies
  - **Similar Projects**: Historical project comparisons with success metrics
  - **Rationale**: Analysis reasoning and justification with supporting data
  - **Full Analysis**: Complete executive summary and strategic recommendations
- **Dedicated Funding Analysis**: Separate section for funding options and investment strategies
- **Follow-On Opportunities**: Dedicated section for future growth potential and expansion opportunities
- **Top AWS Services**: Interactive service recommendations with cost estimates and descriptions

### Advanced User Experience
- **Modern Dashboard Layout**: Contemporary design with gradient backgrounds and smooth animations
- **Interactive Service Cards**: Visual service recommendations with icons, hover effects, and detailed information
- **Confidence Assessment**: Animated circular gauge with color-coded confidence levels (0-100%)
- **Grid/List View Toggle**: Flexible analysis result viewing options for different preferences
- **Live Timestamps**: Real-time timestamp display with automatic updates
- **Responsive Design**: Mobile-first approach optimized for all device sizes

### Technical Capabilities
- **Intelligent Orchestration**: AWS Bedrock Agents for intelligent workflow coordination and decision-making
- **Knowledge Base & RAG**: Bedrock Knowledge Base with OpenSearch Serverless for enhanced analysis using historical project data
- **Core Lambda Functions**: Serverless processing functions for all analysis workflows
- **Advanced Analysis Capabilities**: Opportunity analysis, funding analysis, and follow-on opportunity identification
- **Enhanced Prompt Management**: Dynamic prompt selection, A/B testing, and performance monitoring for optimal AI responses
- **RAG Enhancement**: Retrieval Augmented Generation with industry and regional context for improved accuracy
- **Action Group Architecture**: Modular Lambda functions organized as Bedrock Agent action groups
- **Multi-Environment Support**: Separate agent aliases for development, staging, and production
- **AWS-Native Serverless Infrastructure**: Built with AWS CDK for scalable, production-ready deployment
- **DynamoDB State Management**: High-performance caching, session management, and analysis history tracking
- **Real-time Data Processing**: DynamoDB Streams for real-time analytics and notifications
- **Shared Utilities Layer**: Common utilities and AWS clients shared across Lambda functions
- **Comprehensive Monitoring**: CloudWatch dashboards, alarms, and X-Ray distributed tracing
- **Secure Configuration Management**: AWS Systems Manager Parameter Store and Secrets Manager
- **Global Content Delivery**: CloudFront CDN with S3 static hosting
- **API Gateway Integration**: REST API with CORS, throttling, and caching
- **Infrastructure as Code**: Complete CDK stack for reproducible deployments

## Quick Start

### 1. Modern Interface Access

The application is ready to use with a modern dashboard interface:

**Primary Application**: `http://localhost:3123/index-compact.html` (Modern Dashboard - Option C)

**Alternative Interfaces**:
- Option A (Clean Professional): `http://localhost:3123/index-compact-option-a.html`
- Option B (Enhanced Interactive): `http://localhost:3123/index-compact-option-b.html`
- Legacy Interface: `http://localhost:3123/` (original interface)

### 2. Local Development Setup

```bash
# Install minimal dependencies (recommended for core functionality)
npm install

# Start both backend and frontend servers
npm run dev-all

# Or start separately:
npm run dev           # Backend only (port 8123)
npm run dev-frontend  # Frontend only (port 3123)
```

The application will be available at:
- **Frontend**: http://localhost:3123 (with API proxy to backend)
- **Backend API**: http://localhost:8123 (direct API access)

### 3. Using the Modern Interface

1. **Load Sample Data**: Click "Sample" button to populate form with test data
2. **Fill Form**: Enter opportunity details with real-time validation feedback
3. **Track Progress**: Watch completion percentage update as you fill required fields
4. **Analyze**: Click "Analyze Opportunity" to process the analysis
5. **View Results**: Explore comprehensive analysis with interactive visualizations
6. **Export**: Use export/print functionality for professional reports

### 4. Infrastructure Deployment (Optional)

Deploy the complete AWS serverless infrastructure:

```bash
# Install dependencies
npm install

# Deploy infrastructure using CDK
npm run cdk:deploy
```

This creates:
- API Gateway REST API with CORS, throttling, and caching
- Lambda functions with proper IAM roles and X-Ray tracing
- S3 bucket for static website hosting
- CloudFront distribution for global content delivery
- CloudWatch log groups, dashboards, and alarms
- Systems Manager Parameter Store for configuration
- Secrets Manager for sensitive credentials
- X-Ray tracing configuration

### 2. Lambda Functions Deployment

Deploy the core processing Lambda functions:

```bash
# Deploy all Lambda functions with shared utilities layer
npm run lambda:deploy

# Validate the deployment
npm run lambda:validate
```

### 3. Knowledge Base Setup (Enhanced Analysis)

Deploy the Bedrock Knowledge Base with OpenSearch Serverless for RAG-enhanced analysis:

```bash
# Deploy knowledge base infrastructure
npm run knowledge-base:deploy

# Deploy the actual CDK stack
cdk deploy BedrockKnowledgeBaseStack

# Test data ingestion with sample projects
npm run knowledge-base:test-ingestion

# Test knowledge base functionality
npm run knowledge-base:test
```

This creates:
- **OpenSearch Serverless Collection**: Vector storage for historical project embeddings
- **Bedrock Knowledge Base**: RAG-enabled knowledge base with Titan embedding model
- **S3 Data Source**: Automated ingestion pipeline for historical project data
- **Enhanced Analysis Automation**: RAG-powered analysis using retrieved context
- **Data Ingestion Pipeline**: Structured text processing and chunking for optimal embeddings

The Lambda functions include:
- **opportunity-analysis**: Main orchestrator function (15 min timeout, 1024 MB)
- **query-generation**: SQL query generation using Bedrock (5 min timeout, 512 MB)
- **data-retrieval**: Athena query execution and processing (10 min timeout, 1024 MB)
- **funding-analysis**: Funding options analysis (5 min timeout, 512 MB)
- **follow-on-analysis**: Next opportunity identification (10 min timeout, 1024 MB)
- **shared-utilities-layer**: Common utilities and AWS clients

## Lambda Functions Architecture

The application uses a serverless architecture with specialized Lambda functions for different processing tasks:

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│ opportunity-        │    │ query-generation     │    │ data-retrieval      │
│ analysis            │───▶│                      │───▶│                     │
│ (Orchestrator)      │    │ (SQL Generation)     │    │ (Athena Queries)    │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
           │                                                        │
           ▼                                                        ▼
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│ funding-analysis    │    │ follow-on-analysis   │    │ Analysis Results    │
│                     │    │                      │    │                     │
│ (Funding Options)   │    │ (Next Opportunities) │    │ (Structured Output) │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
```

### Core Functions

- **opportunity-analysis**: Main orchestrator (15 min, 1024 MB) - Coordinates the complete analysis workflow
- **query-generation**: SQL generation (5 min, 512 MB) - Creates intelligent queries using Bedrock
- **data-retrieval**: Data processing (10 min, 1024 MB) - Executes Athena queries and processes results
- **funding-analysis**: Financial analysis (5 min, 512 MB) - Analyzes funding options and ROI
- **follow-on-analysis**: Opportunity expansion (10 min, 1024 MB) - Identifies next opportunities

### Shared Utilities Layer

All functions use a common layer containing:
- AWS SDK clients with optimized configuration
- Data processing utilities (date conversion, validation)
- Error handling and retry logic
- Response formatting utilities

### 3. Bedrock Agent Deployment

Deploy the intelligent Bedrock Agent orchestration system:

```bash
# Deploy Bedrock Agents and action groups
npm run bedrock-agent:deploy

# Validate the deployment
npm run bedrock-agent:validate
```

This creates:
- Primary Bedrock Agent for opportunity analysis orchestration
- Action groups for query generation, data analysis, funding analysis, and follow-on opportunities
- Lambda functions for each action group with proper IAM permissions
- Agent aliases for different environments (development, staging, production)
- Integration with existing Bedrock prompts and models

### 4. DynamoDB State Management Deployment

Deploy DynamoDB tables for caching, session management, and analysis history:

```bash
# Deploy DynamoDB infrastructure
npm run dynamodb:deploy

# Or using CDK directly
npx cdk deploy OpportunityAnalysisDynamoDBStack

# Test DynamoDB functionality
npm run dynamodb:test

# Run specific tests
npm run dynamodb:test-health      # Health check only
npm run dynamodb:test-session     # Session management
npm run dynamodb:test-cache       # Analysis caching
npm run dynamodb:test-history     # History tracking
```

This creates:
- **Analysis Results Cache Table**: High-performance caching with 7-day TTL
- **User Sessions Table**: Session management with 24-hour TTL
- **Analysis History Table**: Comprehensive tracking with 90-day TTL
- **DynamoDB Streams**: Real-time data processing for analytics
- **Global Secondary Indexes**: Efficient querying by user, opportunity, and customer
- **Stream Processing Lambda**: Real-time event processing and notifications

### 5. Enhanced Prompt Management Deployment

Deploy the advanced prompt management system with A/B testing and analytics:

```bash
# Deploy enhanced prompt templates and monitoring
npm run prompt-management:deploy

# Test the prompt management system
npm run prompt-management:test

# Run performance benchmarks
npm run prompt-management:benchmark
```

This creates:
- **Enhanced Prompt Templates**: Optimized prompts for different analysis types
- **A/B Testing Framework**: Automatic prompt variant testing and optimization
- **Performance Monitoring**: CloudWatch metrics and dashboards for prompt performance
- **Dynamic Selection**: Intelligent prompt selection based on opportunity characteristics
- **RAG Enhancement**: Industry and regional context integration
- **Analytics Dashboard**: Comprehensive performance analytics and recommendations

The enhanced system includes:
- Query generation prompts (standard and optimized variants)
- Analysis prompts (Titan and Nova Premier models)
- Funding analysis prompts (standard and enhanced)
- Follow-on opportunity analysis prompts
- CloudWatch dashboard for monitoring
- Performance analytics API endpoints

### 5. Configuration Management

The application currently runs in debug mode with comprehensive mock data for immediate testing. For AWS integration, create a `.env` file:

Create a `.env` file in the root directory with the following variables:

```
# AWS Credentials
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Bedrock Agent Configuration (added after deployment)
BEDROCK_AGENT_ID=your-agent-id
BEDROCK_AGENT_ROLE_ARN=arn:aws:iam::account:role/BedrockAgentRole
BEDROCK_AGENT_DEV_ALIAS=dev-alias-id
BEDROCK_AGENT_STAGING_ALIAS=staging-alias-id
BEDROCK_AGENT_PROD_ALIAS=prod-alias-id

# Bedrock Prompt IDs
CATAPULT_QUERY_PROMPT_ID=Y6T66EI3GZ
CATAPULT_ANALYSIS_PROMPT_ID=FDUHITJIME
CATAPULT_ANALYSIS_PROMPT_NOVA_PREMIER_ID=P03B9TO1Q1

# Enhanced Prompt Management - A/B Testing Prompt IDs (added after prompt deployment)
CATAPULT_QUERY_PROMPT_ID_V2=your-optimized-query-prompt-id
CATAPULT_FUNDING_PROMPT_ID=your-funding-analysis-prompt-id
CATAPULT_FUNDING_PROMPT_ENHANCED_ID=your-enhanced-funding-prompt-id
CATAPULT_FOLLOWON_PROMPT_ID=your-followon-analysis-prompt-id

# Prompt Management Configuration
ENABLE_AB_TESTING=true
ENABLE_PROMPT_ANALYTICS=true
PROMPT_CACHE_TIMEOUT=300000
ANALYTICS_CACHE_TIMEOUT=300000

# Lambda Function
CATAPULT_GET_DATASET_LAMBDA=catapult_get_dataset

# Athena Configuration
ATHENA_DATABASE=default
ATHENA_OUTPUT_LOCATION=s3://aws-athena-query-results/
```

Replace the placeholder values with your actual AWS credentials and resource IDs.

### 3. Deploy Lambda Function

1. Package the Lambda function:

```bash
cd lambda
zip -r catapult_get_dataset.zip catapult_get_dataset.js
```

2. Deploy to AWS Lambda:
   - Go to AWS Lambda console
   - Create a new function named `catapult_get_dataset`
   - Upload the zip file
   - Set the handler to `catapult_get_dataset.handler`
   - Set the runtime to Node.js 14.x or later
   - Configure environment variables:
     - `ATHENA_DATABASE`: Your Athena database name
     - `ATHENA_OUTPUT_LOCATION`: S3 location for Athena query results

3. Configure IAM permissions:
   - Ensure the Lambda execution role has permissions for:
     - Athena: `athena:StartQueryExecution`, `athena:GetQueryExecution`, `athena:GetQueryResults`
     - S3: `s3:GetObject`, `s3:PutObject` (for the Athena output location)

### 4. Set Up Bedrock Prompts

1. In the AWS Bedrock console, create the following prompts:
   - "CatapultQueryPrompt" (ID: Y6T66EI3GZ)
   - "CatapultAnalysisPrompt" (ID: FDUHITJIME)
   - "CatapultAnalysisPrompt_NovaPremier" (ID: P03B9TO1Q1)

2. Configure each prompt with the appropriate model and template as described in the Project Handover document. Nova Premier prompt should use the Amazon Nova Premier model and robust date logic.

### 6. Run the Application

```bash
# Start both servers (recommended)
npm run dev-all

# Or start individually
npm start              # Backend only
npm run frontend       # Frontend only
```

The application will be available at:
- **Modern Dashboard**: http://localhost:3123/index-compact.html
- **Backend API**: http://localhost:8123

## Application Structure

### Frontend Architecture (Modern)
- **Primary Interface**: `public/index-compact.html` (Option C - Modern Dashboard)
- **Alternative Options**: 
  - `public/index-compact-option-a.html` (Clean Professional)
  - `public/index-compact-option-b.html` (Enhanced Interactive)
  - `public/index-compact-option-c.html` (Modern Dashboard - same as primary)
- **Styling**: Modern CSS with animations, gradients, and responsive design
- **JavaScript**: ES6+ class-based architecture with real-time features

### Backend Architecture
- `app-debug.js`: Main application entry point (currently active for stability)
- `app.js`: Original application entry point (currently corrupted)
- `frontend-server.js`: Frontend proxy server (port 3123)
- `public/`: Modern frontend files with multiple UI options
- `automations/`: Backend automation scripts (v3 versions are current standard)
  - `invokeBedrockQueryPrompt-v3.js`: Generates SQL queries using Bedrock
  - `InvLamFilterAut-v3.js`: Executes SQL queries via Lambda
  - `finalBedAnalysisPrompt-v3.js`: Analyzes data using standard Bedrock model
  - `finalBedAnalysisPromptNovaPremier-v3.js`: Analyzes data using Nova Premier model
- `lambda/`: AWS Lambda functions
  - `catapult_get_dataset-v3.js`: Executes SQL against Athena
- `config/`: Configuration files
  - `aws-config-v3.js`: Centralized AWS configuration (v3)

## Analysis Flows

The application now supports two orchestration modes:

### Traditional Automation Flow
- **Standard Flow**: Uses Titan Bedrock model and the original analysis prompt for predictions.
- **Nova Premier Flow**: Uses Amazon Nova Premier model and enhanced prompt for robust date handling and improved analysis.

### Bedrock Agent Orchestration (Recommended)
- **Intelligent Orchestration**: Uses Bedrock Agents to coordinate the entire analysis workflow
- **Action Group Architecture**: Modular approach with specialized Lambda functions
- **Enhanced Capabilities**: Includes funding analysis and follow-on opportunity identification
- **Multi-Environment Support**: Separate agent aliases for different environments

## API Endpoints

### Main Analysis
**POST** `/api/analyze`

Request body:
```json
{
  "customerName": "NextGen Automotive Solutions",
  "region": "Japan",
  "closeDate": "2025-12-20",
  "opportunityName": "Autonomous Vehicle Data Platform",
  "description": "Revolutionary autonomous vehicle data processing and analytics platform...",
  "useBedrockAgent": true,  // Enable intelligent orchestration
  "useNovaPremier": false   // Optional: use Nova Premier model
}
```

Response:
```json
{
  "metrics": {
    "predictedArr": "$580,000",
    "predictedMrr": "$48,333",
    "launchDate": "March 2026",
    "predictedProjectDuration": "8 months",
    "confidence": "HIGH",
    "confidenceScore": 96,
    "confidenceFactors": [
      "Strong historical data match",
      "Optimal market conditions",
      "Technical feasibility confirmed"
    ],
    "topServices": [
      {
        "name": "Amazon EC2",
        "cost": 8500,
        "description": "High-performance compute for real-time processing"
      },
      {
        "name": "Amazon SageMaker",
        "cost": 5200,
        "description": "Machine learning model training and inference"
      }
    ]
  },
  "methodology": "Analysis approach using 750+ autonomous vehicle projects...",
  "findings": "Key market insights and technical feasibility assessment...",
  "riskFactors": "Comprehensive risk assessment with mitigation strategies...",
  "similarProjects": "Historical project comparisons with success metrics...",
  "rationale": "Analysis reasoning and strategic justification...",
  "fullAnalysis": "Complete executive summary and recommendations...",
  "fundingOptions": "Comprehensive funding strategies and investment options...",
  "followOnOpportunities": "Future growth opportunities and expansion potential...",
  "orchestrationType": "modern-dashboard"
}
```

### Funding Analysis
**POST** `/api/analyze/funding`

Analyzes funding options and investment requirements for the opportunity.

### Follow-on Analysis
**POST** `/api/analyze/next-opportunity`

Identifies potential follow-on opportunities with the same customer based on historical patterns.

## Security Considerations

- Never commit your `.env` file to version control
- Use IAM roles with least privilege principles
- Consider using AWS Secrets Manager for production deployments
- Implement proper authentication for the application in production

## User Documentation

### Comprehensive User Guides
- **[User Guide](docs/USER_GUIDE.md)**: Complete guide to using the enhanced interface with all field descriptions and workflow instructions
- **[Enhanced Workflow Guide](docs/ENHANCED_WORKFLOW_GUIDE.md)**: Detailed workflow templates and best practices for comprehensive analysis
- **[Testing Guide](docs/TESTING_GUIDE.md)**: Testing procedures and validation methods

### Technical Documentation
- **[Bedrock Agent Guide](docs/BEDROCK_AGENT_GUIDE.md)**: Bedrock Agent setup and configuration
- **[Knowledge Base Setup](docs/KNOWLEDGE_BASE_SETUP.md)**: RAG-enhanced analysis configuration
- **[Monitoring Guide](docs/MONITORING_GUIDE.md)**: System monitoring and observability
- **[Security Guide](docs/SECURITY_GUIDE.md)**: Security implementation and best practices

## Enhanced Interface Features

The application now includes a comprehensive, always-visible interface with:

### Input Fields
- **Basic Details**: Customer Name, Opportunity Name, Description
- **Location & Timing**: AWS Region, Close Date
- **Business Context**: Industry, Customer Segment, Partner Name
- **Technical Details**: Activity Focus, Business Description, Migration Phase, Reference Links

### Projection Displays
- **Financial Metrics**: ARR, MRR with confidence ranges and formatting
- **Timeline Metrics**: Launch Date, Time to Launch with visual indicators
- **Quality Indicators**: Confidence Level with color coding, Top Services with cost estimates

### Analysis Results
- **Methodology**: Analysis approach, data sources, confidence factors
- **Similar Projects**: Interactive sortable table with detailed project information
- **Detailed Findings**: Structured insights with supporting data
- **Prediction Rationale**: Explanation of prediction logic and historical correlations
- **Risk Factors**: Comprehensive risk assessment with mitigation strategies
- **Architecture Recommendations**: Complete technical architecture guidance

### Advanced Features
- **Real-Time Validation**: Immediate feedback on data entry
- **Interactive Tables**: Sorting, filtering, and expandable project details
- **Export Capabilities**: PDF reports, Excel export, print-friendly formatting
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

## Troubleshooting
- Ensure all Bedrock prompt IDs in your `.env` match those in AWS Bedrock
- Lambda function must have correct permissions for Athena and S3
- For detailed troubleshooting, see the [User Guide](docs/USER_GUIDE.md#troubleshooting)
- For prompt or analysis errors, consult the Project Handover document for debugging guidance
## Infr
astructure Management

### Deploy Infrastructure
```bash
npm run cdk:deploy
# or use the deployment script
node scripts/deploy.js
```

### View Infrastructure Changes
```bash
npm run cdk:diff
```

### Destroy Infrastructure
```bash
npm run cdk:destroy
# or use the destruction script
node scripts/destroy.js
```

### Monitor Infrastructure
After deployment, access monitoring through:
- **CloudWatch Dashboard**: "AWS-Opportunity-Analysis-Monitoring"
- **X-Ray Service Map**: Distributed tracing visualization
- **CloudWatch Logs**: `/aws/apigateway/opportunity-analysis` and `/aws/lambda/opportunity-analysis`

## Development Workflow

### Local Development
```bash
# Start both backend and frontend
npm run dev-all

# Or start separately
npm run dev           # Backend only
npm run dev-frontend  # Frontend only
```

### Production Deployment
```bash
# Deploy infrastructure updates
npm run cdk:deploy

# Start production server
npm start
```

## Monitoring and Observability

The infrastructure includes comprehensive monitoring:

- **CloudWatch Dashboards**: Real-time API Gateway and Lambda metrics
- **CloudWatch Alarms**: Automated alerting for errors and high latency
- **X-Ray Tracing**: End-to-end request tracing across all AWS services
- **Structured Logging**: JSON-formatted logs with correlation IDs
- **Custom Metrics**: Business KPIs and performance tracking

## Security Features

- **IAM Roles**: Least privilege access for all AWS resources
- **Secrets Manager**: Secure credential storage and rotation
- **API Gateway**: Built-in request validation and throttling
- **CloudFront**: HTTPS-only content delivery with security headers
- **Parameter Store**: Encrypted configuration management

## Cost Optimization

- **Serverless Architecture**: Pay-per-use pricing model
- **CloudFront Caching**: Reduced API Gateway and Lambda costs
- **Intelligent S3 Tiering**: Automatic storage cost optimization
- **Lambda Right-sizing**: Optimized memory and timeout configurations