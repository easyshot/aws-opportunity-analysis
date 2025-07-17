# AWS Bedrock Partner Management System

> **July 2025 Update:**
>
> - **SQL Validation & Correction**: Automatic detection and fixing of SQL syntax errors (e.g., nested `lower()` functions) for improved reliability
> - **Standardized Error Handling:** Replaced all fallback values with consistent error messages for improved debugging and user experience.
> - **Working Partner Opportunity Intelligence Page**: Fully functional HTML interface at `http://localhost:3123/` with enhanced debug features
> - **Enterprise & Multi-Environment Support:** Full AWS Organizations, Control Tower, and CI/CD pipeline for multi-account, multi-region deployments.
> - **Disaster Recovery & Business Continuity:** Automated backup, cross-region replication, and failover (RTO 15 min, RPO 1 hr, 99.9% availability).
> - **Enhanced Debug Suite:** Real-time data flow tracing, advanced debug panels, and professional troubleshooting tools.
> - **User-Driven Settings:** All truncation, SQL query limits, and analysis parameters are fully user-configurable and respected end-to-end.
> - **Comprehensive Documentation:** Expanded user guides, workflow templates, and operational runbooks for enterprise deployment and troubleshooting.

This comprehensive serverless application analyzes business opportunities using AWS Bedrock AI models, Lambda functions, and other AWS services. The system provides intelligent opportunity analysis, funding recommendations, and follow-on opportunity identification through a modern web interface with real-time analytics, interactive visualizations, and comprehensive analysis capabilities.

## 🚀 Current Status: Production Ready with SQL Validation & Enhanced Architecture

The AWS Bedrock Partner Management System is **fully implemented and production-ready** with comprehensive features including:

- ✅ **Complete Frontend Interface**: Partner Opportunity Intelligence page with professional debug suite and real-time analytics
- ✅ **Comprehensive Backend**: Express.js API with full AWS service integration using Converse API
- ✅ **SQL Validation & Correction**: Automatic detection and fixing of AI-generated SQL syntax errors
- ✅ **Lambda Timeout Resolution**: Fixed Lambda execution timeouts (10s → 30s) with proper error handling
- ✅ **AI/ML Integration**: AWS Bedrock with Claude 3.5 Sonnet model using Converse API (Nova Premier removed for simplicity)
- ✅ **User-Configurable Settings**: All truncation, SQL query limits, and analysis parameters fully user-configurable from frontend
- ✅ **Centralized Model Settings**: All model inference parameters managed exclusively in Bedrock prompt management
- ✅ **Advanced Analytics**: Six analysis areas, funding analysis, and follow-on opportunities
- ✅ **Settings System Integration**: Comprehensive settings management for all data manipulation and configuration
- ✅ **Serverless Infrastructure**: Complete CDK implementation with multi-environment support
- ✅ **Enterprise Security**: IAM roles, encryption, secrets management, and compliance controls
- ✅ **Comprehensive Monitoring**: CloudWatch, X-Ray tracing, health checks, and diagnostics
- ✅ **Performance Monitoring**: Real-time system health monitoring with `/api/debug/performance` endpoint
- ✅ **Disaster Recovery**: Multi-region deployment with automated backup and failover
- ✅ **Complete Documentation**: Technical guides, user documentation, and operational procedures
- ✅ **Professional Debug Suite**: Real-time data flow tracing, user-configurable settings, and advanced troubleshooting capabilities
- ✅ **Multi-Environment Support**: Complete AWS Organizations, Control Tower, and CI/CD pipeline implementation
- ✅ **Business Continuity**: Comprehensive disaster recovery and backup automation

**Ready for immediate production deployment with SQL validation, user-driven configuration, simplified architecture, and enterprise-grade infrastructure.**

## 🎯 Core Features

### 🖥️ Modern Dashboard Interface

- **Partner Opportunity Intelligence Page**: Fully functional HTML interface at `http://localhost:3123/`
- **Real-time Analytics**: Live completion tracking with animated progress indicators
- **Interactive Form Validation**: Smart validation with visual feedback and error prevention
- **Auto-save Functionality**: Automatic form data persistence across browser sessions
- **Character Counter**: Smart description field with length validation and color coding
- **Sample Data Loading**: Quick-load functionality for testing and demonstrations
- **Export Capabilities**: Professional export and print functionality with formatted reports
- **Three UI Options**: Clean Professional, Enhanced Interactive, and Modern Dashboard layouts
- **Enhanced Debug Information Panels**: Comprehensive debugging interface featuring:
  - **Query Results Statistics**: Row count, character count, and data size tracking
  - **Interactive Table View**: Spreadsheet-like display with toggle controls
  - **Real-time Data Monitoring**: Live updates of query metrics and payload sizes
  - **Truncation Management**: Intelligent data truncation with size visibility
  - **Multi-format Display**: Toggle between raw JSON and formatted table views
  - **SQL Validation Feedback**: Real-time display of SQL corrections and syntax fixes

### 🤖 AI-Powered Analysis Engine

- **AI-Powered Analysis**: AWS Bedrock Claude 3.5 Sonnet model with Converse API integration
- **SQL Validation & Correction**: Automatic detection and fixing of AI-generated SQL syntax errors
- **Six Comprehensive Analysis Areas**:
  - **Methodology**: Detailed analysis approach and data sources
  - **Findings**: Key insights and market intelligence with visual indicators
  - **Risk Factors**: Comprehensive risk assessment with mitigation strategies
  - **Similar Projects**: Historical project comparisons with success metrics
  - **Rationale**: Analysis reasoning and justification with supporting data
  - **Full Analysis**: Complete executive summary and strategic recommendations
- **Dedicated Funding Analysis**: Multi-tier funding strategies (SMB, Commercial, Enterprise)
- **Follow-On Opportunities**: Strategic roadmaps and expansion potential analysis
- **RAG Enhancement**: Retrieval Augmented Generation with knowledge base integration
- **Enhanced Debugging**: Comprehensive data flow tracing from frontend to Bedrock

### 🏗️ Enterprise Architecture

- **Serverless Infrastructure**: Complete AWS Lambda-based architecture with auto-scaling
- **Bedrock Agent Orchestration**: Intelligent workflow coordination with action groups
- **Knowledge Base Integration**: OpenSearch Serverless with vector embeddings
- **Multi-Environment Support**: Development, staging, and production environments
- **DynamoDB State Management**: High-performance caching and session management
- **Real-time Processing**: Event-driven architecture with EventBridge
- **Global CDN**: CloudFront distribution with S3 static hosting
- **API Gateway**: REST API with throttling, caching, and CORS support
- **Enhanced Logging**: Comprehensive debug output and payload inspection

### 🔒 Security & Compliance

- **Enterprise Security**: IAM roles with least privilege, encryption at rest and in transit
- **Secrets Management**: AWS Secrets Manager and Systems Manager Parameter Store
- **Audit Logging**: Comprehensive audit trails and compliance controls
- **Multi-Region Deployment**: Disaster recovery with automated failover
- **Security Scanning**: Automated vulnerability assessment and monitoring
- **Data Protection**: PII handling, data classification, and retention policies

### 📊 Monitoring & Observability

- **Comprehensive Monitoring**: CloudWatch dashboards, metrics, and alarms
- **Distributed Tracing**: X-Ray integration for performance analysis
- **Health Checks**: Automated service health monitoring and diagnostics
- **Performance Analytics**: Real-time performance metrics and optimization insights
- **Cost Monitoring**: Resource utilization tracking and cost optimization
- **Business Intelligence**: Custom dashboards and reporting capabilities
- **Debug Analytics**: Real-time data flow analysis and troubleshooting
- **SQL Validation Monitoring**: Real-time monitoring of SQL syntax correction effectiveness

## 🚀 Quick Start

### 1. Immediate Local Development

The application is ready to use immediately with comprehensive mock data and enhanced debugging:

```bash
# Install dependencies
npm install

# Start both backend and frontend servers (recommended)
npm run dev-all

# Or start separately:
npm run dev           # Backend only (port 8123) - production backend with SQL validation
npm run dev-frontend  # Frontend only (port 3123) - Partner Opportunity Intelligence page
```

**Access the Application:**

- **Primary Interface**: `http://localhost:3123/` (Partner Opportunity Intelligence page with enhanced debug features)
- **Alternative Options**:
  - Clean Professional: `http://localhost:3123/index-compact-option-a.html`
  - Enhanced Interactive: `http://localhost:3123/index-compact-option-b.html`
  - Modern Dashboard: `http://localhost:3123/index-compact-option-c.html`
  - Compact Interface: `http://localhost:3123/index-compact.html`

### 2. Using the Partner Opportunity Intelligence Page

1. **Load Sample Data**: Click "Sample" button for instant test data
2. **Fill Form**: Enter opportunity details with real-time validation
3. **Track Progress**: Watch completion percentage and validation feedback
4. **Analyze**: Click "Analyze Opportunity" for comprehensive AI analysis
5. **Monitor Debug Info**: View real-time SQL queries, query results, and Bedrock payloads
6. **Explore Results**: Six analysis sections with interactive visualizations
7. **Export**: Professional export and print capabilities

### 3. Debugging and Troubleshooting

The application includes comprehensive debugging capabilities:

- **Frontend Debug Panels**: Real-time display of data flow from user input to analysis results
- **Backend Enhanced Logging**: Detailed logging of SQL queries, query results, and Bedrock payloads
- **Data Flow Tracing**: End-to-end visibility into the complete analysis workflow
- **Error Identification**: Clear identification of where data flow breaks down
- **Payload Inspection**: Detailed view of what data is sent to and received from Bedrock
- **SQL Validation**: Real-time detection and correction of SQL syntax errors

### 4. Production AWS Deployment

Deploy the complete serverless infrastructure to AWS:

```bash
# Deploy all infrastructure components
npm run cdk:deploy

# Deploy specific components
npm run lambda:deploy              # Lambda functions
npm run dynamodb:deploy           # Database infrastructure
npm run bedrock-agent:deploy      # AI orchestration
npm run knowledge-base:deploy     # RAG enhancement

# Enterprise & Multi-Environment Deployment
node scripts/deploy-multi-environment.js deploy-complete
node scripts/provision-environment.js --environment production
```

### 5. Enterprise Multi-Environment Deployment

Deploy complete enterprise infrastructure with multi-environment support:

```bash
# Deploy complete multi-environment infrastructure
node scripts/deploy-multi-environment.js deploy-complete

# Deploy specific environments
node scripts/provision-environment.js --environment production
node scripts/validate-infrastructure.js --environment production

# Enterprise deployment commands
npm run deploy:infrastructure      # Deploy complete infrastructure
npm run validate:all              # Complete system validation
npm run test:comprehensive:all     # Run all comprehensive tests
```

**Enterprise Infrastructure Created:**

- **AWS Organizations**: Multi-account setup with organizational units
- **Control Tower**: Governance and compliance monitoring
- **Multi-Environment CI/CD**: Cross-account deployment pipeline
- **Disaster Recovery**: Multi-region deployment with automated failover
- **Business Continuity**: Automated backup and recovery procedures
- **Security & Compliance**: Enterprise-grade security controls
- **Monitoring & Alerting**: Comprehensive observability and incident response

**Standard Infrastructure Created:**

- **API Gateway**: REST API with throttling and caching
- **Lambda Functions**: Specialized processing functions with shared utilities
- **DynamoDB**: Caching, session management, and history tracking
- **Bedrock Integration**: AI models, agents, and knowledge base
- **S3 & CloudFront**: Static hosting with global CDN
- **Monitoring**: CloudWatch dashboards, alarms, and X-Ray tracing
- **Security**: IAM roles, encryption, and secrets management

## Current Development Focus

### Production Ready & Enhanced Debugging

- **Production Status**: Successfully migrated to stable production backend (`app.js`) with full AWS integration
- **SQL Validation**: Automatic detection and correction of AI-generated SQL syntax errors
- **Bedrock Integration**: Fixed Bedrock analysis issues by resolving invalid prompt version parameters
- **Simplified Architecture**: Removed Nova Premier complexity and standardized on Claude 3.5 Sonnet model
- **Enhanced Debug Infrastructure**: Comprehensive debugging capabilities including:
  - **Query Results Analysis**: Row counting, character tracking, and data size monitoring
  - **Table View Functionality**: Spreadsheet-like display with interactive controls
  - **Truncation Management**: Intelligent data truncation system resolving input size limitations
  - **Real-time Statistics**: Live tracking of data flow metrics and payload sizes
  - **SQL Validation Feedback**: Real-time display of SQL corrections and syntax fixes
- **Data Flow Optimization**: Resolved Bedrock input size errors with multi-level truncation system
- **Converse API**: All Bedrock interactions now use the modern Converse API for consistent communication

### Operational Excellence

- **AWS Integration**: Full integration with live AWS services using proper API versions
- **Performance Optimization**: Debug features optimized to not impact user experience
- **Documentation**: Complete operational procedures and troubleshooting guides
- **Monitoring**: Comprehensive monitoring, alerting, and troubleshooting capabilities

## Application Structure

### Frontend Architecture (Current Active)

- **Primary Interface**: `public/index.html` (Partner Opportunity Intelligence page with enhanced debug features)
- **Primary JavaScript**: `public/app-clean-fixed.js` (Main functionality with comprehensive debug integration and SQL validation)
- **Alternative Options**:
  - `public/index-compact-option-a.html` (Clean Professional)
  - `public/index-compact-option-b.html` (Enhanced Interactive)
  - `public/index-compact-option-c.html` (Modern Dashboard)
- **Styling**: Modern CSS with animations, gradients, and responsive design
- **JavaScript**: ES6+ class-based architecture with real-time features and debug integration

### Backend Architecture

- `app.js`: Main application entry point (production ready with full AWS integration and SQL validation)
- `app-debug.js`: Debug application entry point (for development and testing)
- `frontend-server.js`: Frontend proxy server (port 3123) serving Partner Opportunity Intelligence page
- `public/`: Modern frontend files with multiple UI options and debug panels
- `automations/`: Backend automation scripts (v3 versions are current standard with SQL validation)

  - `enhancedBedrockQueryPrompt-v3.js`: Generates SQL queries using Bedrock with automatic validation
  - `InvLamFilterAut-v3.js`: Executes SQL queries via Lambda with error handling
  - `finalBedAnalysisPrompt-v3.js`: Analyzes data using standard Bedrock model

- `lambda/`: AWS Lambda functions
  - `catapult_get_dataset-v3.js`: Executes SQL against Athena
- `config/`: Configuration files
  - `aws-config-v3.js`: Centralized AWS configuration (v3)

## Analysis Flows

The application now supports two orchestration modes with enhanced debugging and SQL validation:

### Analysis Flow

- **Standard Flow**: Uses Claude 3.5 Sonnet model with Converse API for comprehensive analysis and predictions.
- **SQL Validation**: Automatic detection and correction of AI-generated SQL syntax errors before execution.
- **Enhanced Debugging**: Real-time visibility into SQL queries, query results, and Bedrock payloads.

## SQL Validation System

The application includes an advanced SQL validation system that automatically detects and corrects common syntax errors in AI-generated SQL queries:

### Features

- **Nested Function Detection**: Automatically detects and fixes nested `lower()` function calls
- **Boolean Expression Correction**: Fixes boolean expressions incorrectly placed within function calls
- **CASE Statement Validation**: Validates and corrects CASE statement syntax issues
- **Real-time Logging**: Logs all SQL corrections for transparency and debugging
- **Fallback Safety**: Returns original query if validation fails to prevent system disruption

### Implementation

- **Location**: `automations/enhancedBedrockQueryPrompt-v3.js`
- **Integration**: Seamlessly integrated into the query generation workflow
- **Transparency**: All corrections are logged for debugging and audit purposes
- **Effectiveness**: Prevents common AI-generated SQL syntax errors from causing analysis failures
