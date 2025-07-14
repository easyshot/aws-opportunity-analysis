# AWS Bedrock Partner Management System - Technical Stack

## Technology Stack
- **Backend**: Node.js 18.x with Express (production-ready with full AWS integration using Converse API)
- **Frontend**: Modern HTML5, CSS3, JavaScript (ES6+) with class-based architecture and PWA capabilities
- **UI Framework**: Vanilla JavaScript with modern web standards (no external frameworks)
- **Infrastructure**: AWS CDK (TypeScript) for Infrastructure as Code
- **AWS Services** (Complete Integration):
  - **AWS Bedrock**: AI/ML capabilities with Claude 3.5 Sonnet model using Converse API, Agent orchestration
  - **AWS Lambda**: Serverless compute with specialized functions and shared utilities layer
  - **Amazon Athena**: SQL queries against historical data with performance optimization
  - **Amazon DynamoDB**: NoSQL database with Global Tables and Streams
  - **Amazon S3**: Object storage with intelligent tiering and cross-region replication
  - **Amazon CloudFront**: Global CDN with edge caching and security headers
  - **AWS API Gateway**: REST API with throttling, caching, and CORS
  - **Amazon EventBridge**: Event-driven architecture and workflow orchestration
  - **Amazon OpenSearch Serverless**: Vector database for RAG enhancement
  - **AWS Systems Manager**: Parameter Store for configuration management
  - **AWS Secrets Manager**: Secure credential storage and rotation
  - **Amazon CloudWatch**: Monitoring, logging, and alerting
  - **AWS X-Ray**: Distributed tracing and performance analysis

## Dependencies (Production Ready)
- **AWS SDK v3** (Complete Integration):
  - @aws-sdk/client-athena: SQL query execution
  - @aws-sdk/client-bedrock-agent: AI agent orchestration
  - @aws-sdk/client-bedrock-agent-runtime: Agent runtime execution
  - @aws-sdk/client-bedrock-runtime: AI model inference
  - @aws-sdk/client-lambda: Serverless function invocation
  - @aws-sdk/client-dynamodb: NoSQL database operations
  - @aws-sdk/client-s3: Object storage operations
  - @aws-sdk/client-cloudwatch: Monitoring and metrics
  - @aws-sdk/client-ssm: Configuration management
  - @aws-sdk/client-secrets-manager: Secure credential storage

- **Backend** (Production Grade):
  - express: Web server framework with security middleware
  - dotenv: Environment variable management
  - body-parser: Request body parsing and validation
  - http-proxy-middleware: API proxying for frontend development
  - cors: Cross-origin resource sharing configuration
  - helmet: Security headers and protection

- **Infrastructure** (AWS CDK):
  - aws-cdk-lib: Infrastructure as Code framework
  - constructs: CDK construct library
  - @aws-cdk/aws-lambda-nodejs: Node.js Lambda constructs

## Development Dependencies
- nodemon: Auto-restart during development
- concurrently: Run multiple npm scripts simultaneously
- jest: Testing framework for unit and integration tests
- eslint: Code quality and style enforcement
- prettier: Code formatting

## Modern Frontend Architecture

### UI Options Available
- **Option A**: Clean Professional Layout (minimal, closest to legacy)
- **Option B**: Enhanced Interactive Layout (modern with tabs and animations)
- **Option C**: Modern Dashboard Layout (active - full-featured with real-time updates and debug panels)

### Frontend Features (Option C - Active)
- **Real-time Form Validation**: Instant feedback with visual indicators
- **Auto-save Functionality**: localStorage integration for data persistence
- **Progress Tracking**: Live completion percentage with animated progress bar
- **Character Counter**: Smart description validation with color coding
- **Interactive Animations**: Smooth transitions and hover effects
- **Responsive Design**: Mobile-first approach with flexible layouts
- **Modern CSS**: CSS Grid, Flexbox, custom properties, and animations
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support
- **Enhanced Debug Information Panels**: Comprehensive debugging interface featuring:
  - **Query Results Statistics**: Row count, character count, and data size tracking
  - **Interactive Table View**: Spreadsheet-like display with toggle controls
  - **Real-time Data Monitoring**: Live updates of query metrics and payload sizes
  - **Truncation Visibility**: Clear indication of data truncation with size management
  - **Multi-format Display**: Toggle between raw JSON and formatted table views

### JavaScript Architecture
- **Class-based Structure**: ES6+ classes for organized code architecture
- **Event-driven Design**: Modern event handling with proper delegation
- **Async/Await Pattern**: Modern promise handling for API calls
- **State Management**: localStorage for client-side state persistence
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Loading States**: Visual feedback during processing with animated indicators
- **Debug Integration**: Real-time data flow tracing and payload inspection

## Build & Run Commands
```bash
# Install all dependencies
npm install

# Development (Local with Mock Data)
npm run dev-all                    # Start both backend and frontend servers (recommended)
npm run dev                        # Backend only (port 8123) - production backend
npm run dev-frontend               # Frontend only (port 3123)
npm run debug                      # Backend in debug mode with comprehensive mock data

# Production Deployment
npm run cdk:deploy                 # Deploy complete AWS infrastructure
npm run lambda:deploy              # Deploy Lambda functions only
npm run dynamodb:deploy           # Deploy database infrastructure
npm run bedrock-agent:deploy      # Deploy AI orchestration
npm run knowledge-base:deploy     # Deploy RAG enhancement

# Enterprise Multi-Environment Deployment
npm run deploy:infrastructure      # Deploy complete multi-environment infrastructure
npm run deploy:task-2             # Deploy Task 2 infrastructure components
npm run deploy:lambda             # Deploy Lambda functions across environments
npm run deploy:dynamodb           # Deploy DynamoDB infrastructure
npm run deploy:eventbridge        # Deploy EventBridge infrastructure

# Testing and Validation
npm run test:comprehensive         # Run complete test suite
npm run test:comprehensive:all     # Run all comprehensive tests
npm run test:comprehensive:quick   # Run quick comprehensive tests
npm run test:health               # Health check validation
npm run test:performance          # Performance testing
npm run test:scenarios            # Run test scenarios
npm run test:diagnostics          # Run diagnostic tests
npm run validate:all              # Complete system validation
npm run test:prerequisites        # Test deployment prerequisites
npm run test:error-handling       # Test error handling and monitoring
npm run test:framework            # Validate testing framework
npm run test:production           # Test production startup
npm run test:validation-tools     # Test validation tools

# Monitoring and Diagnostics
npm run validate:aws              # AWS connectivity validation
npm run validate:bedrock          # Bedrock service validation
npm run validate:infrastructure   # Infrastructure health check
npm run validate:lambda           # Validate Lambda functions
npm run validate:security         # Security validation
npm run validate:production       # Production readiness validation
npm run validate:task-6           # Validate Task 6 implementation
npm run validate:task-6-simple    # Simple Task 6 validation

# Multi-Environment Management
node scripts/deploy-multi-environment.js    # Deploy all environments
node scripts/provision-environment.js       # Provision new environment
node scripts/validate-infrastructure.js     # Validate infrastructure

# Debugging and Troubleshooting
npm run debug:data-flow           # Trace data flow from frontend to Bedrock
npm run debug:payload-inspection  # Inspect Bedrock payloads and responses
npm run debug:query-validation    # Validate SQL queries and results
```

## Environment Configuration
Required environment variables in `.env` file:
```
# AWS Credentials
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Bedrock Prompt IDs
CATAPULT_QUERY_PROMPT_ID=Y6T66EI3GZ
CATAPULT_ANALYSIS_PROMPT_ID=arn:aws:bedrock:us-east-1:701976266286:prompt/FDUHITJIME:4

# Lambda Function
CATAPULT_GET_DATASET_LAMBDA=catapult_get_dataset

# Athena Configuration
ATHENA_DATABASE=default
ATHENA_OUTPUT_LOCATION=s3://aws-athena-query-results/

# Debug Configuration
ENABLE_DEBUG_PANELS=true
ENABLE_ENHANCED_LOGGING=true
DEBUG_LOG_LEVEL=info
```

- Ensure all prompt IDs are correct and match those configured in AWS Bedrock.
- Lambda function must have permissions for Athena and S3 as described in the README.
- Debug configuration enables enhanced troubleshooting capabilities.

## Server Configuration
- **Backend server**: Runs on port 8123 by default (using app.js for production)
- **Frontend server**: Runs on port 3123 by default with proxy configuration
- **API Proxy**: Frontend automatically proxies `/api/*` requests to backend
- **Static Assets**: Frontend server serves static files from `/public` directory
- **Debug Mode**: Enhanced logging and payload inspection for troubleshooting

## Application URLs
- **Main Application**: `http://localhost:3123/` (Primary interface with enhanced debug features)
- **Alternative Options**:
  - Option A: `http://localhost:3123/index-compact-option-a.html` (Clean Professional)
  - Option B: `http://localhost:3123/index-compact-option-b.html` (Enhanced Interactive)
  - Option C: `http://localhost:3123/index-compact-option-c.html` (Modern Dashboard)
- **Compact Interface**: `http://localhost:3123/index-compact.html` (Alternative modern interface)

## Data Processing Specifications

### Input Field Specifications
- **Customer Region**: Geographic regions (United States, Canada, Germany, Japan, etc.) - NOT AWS regions
- **Time to Launch**: Measured in months to achieve 80% of projected AWS Annual Recurring Revenue
- **Description Validation**: Minimum 50 characters with real-time character counting
- **Form Completion**: Real-time progress tracking with percentage completion

### Analysis Output Specifications
- **Six Core Analysis Areas**: Methodology, Findings, Risk Factors, Similar Projects, Rationale, Full Analysis
- **Dedicated Sections**: Separate Funding Options and Follow-On Opportunities sections
- **Top AWS Services**: Interactive service cards with icons, costs, and descriptions
- **Confidence Assessment**: Animated gauge with color-coded confidence levels (0-100%)
- **Debug Information**: Real-time display of data flow and processing steps

## Performance Optimizations
- **Minimal Dependencies**: Streamlined package.json for faster installation and startup
- **Efficient DOM Manipulation**: Modern JavaScript with minimal DOM queries
- **CSS Animations**: Hardware-accelerated CSS transitions and transforms
- **Lazy Loading**: Progressive content loading for better perceived performance
- **Caching Strategy**: localStorage for form data and intelligent API caching
- **Debug Performance**: Optimized debug information display without impacting user experience

## Browser Compatibility
- **Modern Browsers**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Mobile Support**: iOS Safari 13+, Chrome Mobile 80+
- **Progressive Enhancement**: Graceful degradation for older browsers
- **Responsive Design**: Mobile-first approach with flexible breakpoints

## Development Workflow
- **Primary Interface**: Option C (Modern Dashboard) for all new development
- **Testing**: All three UI options maintained for comparison and testing
- **Debugging**: app-debug.js provides development backend with comprehensive mock data for testing
- **Hot Reload**: nodemon for automatic server restart during development
- **Data Flow Tracing**: Real-time visibility into SQL queries, query results, and Bedrock payloads

## Debugging and Troubleshooting

### Frontend Debug Features
- **Enhanced Debug Panels**: Comprehensive debugging interface with advanced capabilities:
  - **Query Results Analysis**: Row count, character count, and data size tracking
  - **Interactive Table View**: Spreadsheet-like display with sortable columns and pagination
  - **Real-time Statistics**: Live monitoring of data metrics and payload sizes
  - **Truncation Management**: Intelligent data truncation with visibility into size limits
  - **Multi-format Display**: Toggle between raw JSON and formatted table views
- **Data Flow Visualization**: End-to-end tracing from user input to analysis results
- **Error Identification**: Clear identification of where data flow breaks down
- **Payload Inspection**: Detailed view of what data is sent to and received from Bedrock

### Backend Debug Features
- **Enhanced Logging**: Comprehensive debug output in automation scripts
- **Payload Capture**: Complete capture of data sent to and received from AWS services
- **Error Tracing**: Detailed error tracking with context and stack traces
- **Performance Monitoring**: Real-time performance metrics and bottlenecks

### Operational Debugging
- **Health Checks**: Automated service health monitoring and diagnostics
- **Connectivity Validation**: AWS service connectivity testing and validation
- **Performance Analytics**: Real-time performance metrics and optimization insights
- **Cost Monitoring**: Resource utilization tracking and cost optimization
- **Business Intelligence**: Custom dashboards and reporting capabilities

## Enterprise Infrastructure & Multi-Environment Support
- **AWS Organizations**: Multi-account setup with organizational units for security and workload separation
- **Control Tower Governance**: Automated compliance monitoring, guardrails enforcement, and governance notifications
- **Multi-Environment Deployment**: Separate AWS accounts for development, staging, and production environments
- **CI/CD Pipeline Enhancement**: Multi-stage pipeline with cross-account deployment, security scanning, and automated testing
- **Infrastructure as Code**: Complete CDK implementation with 35+ specialized stacks for enterprise governance
- **Environment Provisioning**: Automated new environment creation with account setup and configuration

## Business Continuity & Disaster Recovery
- **Multi-Region Deployment**: Active-passive deployment with automated failover capabilities (us-east-1, us-west-2, eu-west-1)
- **Backup Automation**: AWS Backup service integration with encrypted vaults, automated schedules, and lifecycle management
- **Cross-Region Replication**: S3 and DynamoDB Global Tables for real-time data protection
- **Health Monitoring**: Route 53 health checks, CloudWatch monitoring, and automated incident response
- **Recovery Objectives**: RTO 15 minutes, RPO 1 hour, 99.9% availability target

## Current Development Focus
- **Production Ready**: Successfully migrated to stable production backend with full AWS integration
- **Lambda Timeout Resolution**: Fixed Lambda execution timeouts by extending timeout from 10s to 30s and improving error handling
- **Bedrock Integration**: Fixed Bedrock analysis issues and implemented proper Converse API usage
- **Simplified Architecture**: Removed Nova Premier complexity and standardized on Claude 3.5 Sonnet model
- **Settings System Integration**: Properly integrated with comprehensive settings management system for all data manipulation
- **Professional Debug Suite**: Comprehensive debugging infrastructure including:
  - **SQL Query Generation Process**: Real-time monitoring of Bedrock SQL generation with model configuration and process status indicators
  - **Analysis Generation Process**: Advanced payload analysis with size monitoring, token estimation, and risk assessment
  - **User-Configurable Settings**: Settings management interface for SQL query limits, truncation limits, and debug preferences
  - **Real-time Logging Capture**: Backend console log capture and frontend display with comprehensive data flow tracing
  - **Interactive Debug Controls**: Professional UX with status indicators, risk assessment displays, and multi-format data viewing
  - **Row Count Management**: User-controlled SQL query limits with real-time application and verification
- **Data Flow Optimization**: Resolved input size limitations with intelligent multi-level truncation system
- **Professional UX**: Enhanced debug panels with professional design and user-friendly controls
- **Performance Monitoring**: Added `/api/debug/performance` endpoint for real-time system health monitoring
- **Enterprise Infrastructure**: Complete multi-environment support with automated deployment orchestration
- **Operational Excellence**: Comprehensive monitoring, alerting, troubleshooting, and business continuity capabilities

## Recent Enhancements (2025-07)
- **User-Driven Truncation & Analysis Settings**: All truncation, SQL query limits, and analysis parameters are now fully user-configurable from the frontend settings UI. The backend always honors these settings, ensuring end-to-end control and transparency for users.
- **Centralized Model Settings**: All model inference parameters (max tokens, temperature, etc.) are now managed exclusively in Bedrock prompt management. The backend no longer sets or overrides these values, ensuring a single source of truth and easier model governance.
- **Backend Logic & Logging**: All backend logic and logs now reflect the actual user settings received with each request, not hardcoded or default values. This ensures accurate debugging, traceability, and user trust.
- **Robust Settings UI & Backend Wiring**: The settings UI is fully integrated with backend logic, providing a seamless, robust, and user-friendly experience for configuring all analysis parameters.
- **Enterprise Infrastructure**: Complete multi-environment support with AWS Organizations, Control Tower, and automated CI/CD pipeline implementation.
- **Business Continuity**: Multi-region disaster recovery with automated backup and failover capabilities.
- **Enhanced Documentation**: Comprehensive user guides, workflow templates, and operational procedures for enterprise deployment.
- **Security & Compliance**: Enterprise-grade security controls, compliance monitoring, and governance implementation.