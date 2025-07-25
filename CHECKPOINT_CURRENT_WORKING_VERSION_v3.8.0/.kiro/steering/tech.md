# AWS Bedrock Partner Management System - Technical Stack

## Technology Stack

- **Backend**: Node.js 18.x with Express (production-ready with full AWS integration using Converse API, SQL validation, enhanced debug rebuild, and Redis connection handling)
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
  - ioredis: Redis client with graceful degradation support

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

### Current Active Interface

- **Primary Interface**: Partner Opportunity Intelligence page at `http://localhost:3123/` (fully functional with enhanced debug rebuild, sound notifications, and analysis sections fix)
- **Main JavaScript**: `public/app-clean-fixed.js` with separated debug panels, sound notifications, SQL validation, data consistency fixes, and analysis sections population
- **Styling**: Modern CSS with animations, gradients, and responsive design

### UI Options Available

- **Option A**: Clean Professional Layout (minimal, closest to legacy)
- **Option B**: Enhanced Interactive Layout (modern with tabs and animations)
- **Option C**: Modern Dashboard Layout (active - full-featured with real-time updates, separated debug panels, sound notifications, and analysis sections fix)

### Frontend Features (Current Active)

- **Real-time Form Validation**: Instant feedback with visual indicators
- **Auto-save Functionality**: localStorage integration for data persistence
- **Progress Tracking**: Live completion percentage with animated progress bar
- **Character Counter**: Smart description validation with color coding
- **Interactive Animations**: Smooth transitions and hover effects
- **Responsive Design**: Mobile-first approach with flexible layouts
- **Modern CSS**: CSS Grid, Flexbox, custom properties, and animations
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support
- **Enhanced Debug Information Panels**: Comprehensive debugging interface featuring:
  - **Separated Debug Sections**: Clear distinction between SQL generation (blue-themed) and analysis generation (green-themed) debug areas
  - **Query Results Statistics**: Row count, character count, and data size tracking
  - **Interactive Table View**: Spreadsheet-like display with toggle controls
  - **Real-time Data Monitoring**: Live updates of query metrics and payload sizes
  - **Truncation Visibility**: Clear indication of data truncation with size management
  - **Multi-format Display**: Toggle between raw JSON and formatted table views
  - **SQL Validation Feedback**: Real-time display of SQL corrections and syntax fixes
  - **Model ID Accuracy**: Correct model identification for each process type
  - **Data Consistency**: Accurate MRR extraction and payload field mapping
- **Sound Notification System**: Visual completion notifications with user control and accessibility features
- **Professional UX Design**: Enhanced debug panels with professional design and user-friendly controls
- **Analysis Sections Population**: Proper population of analysis sections using backend data with fallback logic

### JavaScript Architecture

- **Class-based Structure**: ES6+ classes for organized code architecture
- **Event-driven Design**: Modern event handling with proper delegation
- **Async/Await Pattern**: Modern promise handling for API calls
- **State Management**: localStorage for client-side state persistence
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Loading States**: Visual feedback during processing with animated indicators
- **Debug Integration**: Real-time data flow tracing and payload inspection with separated sections
- **Sound System**: Visual notification system with user control and accessibility features
- **Analysis Sections**: Proper population of analysis sections using backend data with fallback logic

## Build & Run Commands

```bash
# Install all dependencies
npm install

# Development (Local with Real AWS Integration)
npm run dev-all                    # Start both backend and frontend servers (recommended)
npm run dev                        # Backend only (port 8123) - production backend with SQL validation, enhanced debug rebuild, and Redis connection handling
npm run dev-frontend               # Frontend only (port 3123) - Partner Opportunity Intelligence page with sound notifications and analysis sections fix
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

# Redis Configuration (Optional)
CACHE_ENABLED=true                    # Enable/disable caching (default: true)
REDIS_ENDPOINT=your-redis-endpoint    # Redis primary endpoint
REDIS_READER_ENDPOINT=your-reader     # Redis reader endpoint (optional)
REDIS_PORT=6379                       # Redis port (default: 6379)
REDIS_AUTH_TOKEN=your-auth-token      # Redis authentication token

# Cache Behavior
CACHE_DEBUG=false                     # Enable cache debugging
CACHE_WARMING_ENABLED=true           # Enable cache warming
CACHE_DEFAULT_TTL=3600               # Default cache TTL in seconds

# Debug Configuration
ENABLE_DEBUG_PANELS=true
ENABLE_ENHANCED_LOGGING=true
DEBUG_LOG_LEVEL=info
```

- Ensure all prompt IDs are correct and match those configured in AWS Bedrock.
- Lambda function must have permissions for Athena and S3 as described in the README.
- Debug configuration enables enhanced troubleshooting capabilities with separated debug sections.
- Redis configuration is optional - application will function without Redis with graceful degradation.

## Server Configuration

- **Backend server**: Runs on port 8123 by default (using app.js for production with SQL validation, enhanced debug rebuild, and Redis connection handling)
- **Frontend server**: Runs on port 3123 by default with proxy configuration
- **API Proxy**: Frontend automatically proxies `/api/*` requests to backend
- **Static Assets**: Frontend server serves static files from `/public` directory
- **Debug Mode**: Enhanced logging and payload inspection for troubleshooting with separated debug sections

## Application URLs

- **Main Application**: `http://localhost:3123/` (Partner Opportunity Intelligence page with enhanced debug rebuild, sound notifications, and analysis sections fix)
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
- **Debug Information**: Real-time display of data flow and processing steps with separated SQL and analysis sections
- **Sound Notifications**: Visual completion notifications with user control and accessibility features
- **Analysis Sections**: Proper population of analysis sections using backend data with fallback logic

## Performance Optimizations

- **Minimal Dependencies**: Streamlined package.json for faster installation and startup
- **Efficient DOM Manipulation**: Modern JavaScript with minimal DOM queries
- **CSS Animations**: Hardware-accelerated CSS transitions and transforms
- **Lazy Loading**: Progressive content loading for better perceived performance
- **Caching Strategy**: localStorage for form data and intelligent API caching
- **Debug Performance**: Optimized debug information display without impacting user experience
- **SQL Validation**: Automatic correction of AI-generated SQL syntax errors for improved reliability
- **Sound System**: Lightweight visual notification system optimized for performance
- **Redis Integration**: Graceful degradation when Redis is unavailable, application continues without caching

## Browser Compatibility

- **Modern Browsers**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Mobile Support**: iOS Safari 13+, Chrome Mobile 80+
- **Progressive Enhancement**: Graceful degradation for older browsers
- **Responsive Design**: Mobile-first approach with flexible breakpoints

## Development Workflow

- **Primary Interface**: Partner Opportunity Intelligence page at `http://localhost:3123/` for all development
- **Testing**: All three UI options maintained for comparison and testing
- **Debugging**: app-debug.js provides development backend with comprehensive mock data for testing
- **Hot Reload**: nodemon for automatic server restart during development
- **Data Flow Tracing**: Real-time visibility into SQL queries, query results, and Bedrock payloads with separated debug sections
- **SQL Validation**: Real-time detection and correction of SQL syntax errors
- **Sound Notifications**: Visual completion notifications with user control and accessibility features
- **Analysis Sections**: Proper population of analysis sections using backend data with fallback logic

## Debugging and Troubleshooting

### Frontend Debug Features

- **Enhanced Debug Panels**: Comprehensive debugging interface with advanced capabilities:
  - **Separated Debug Sections**: Clear distinction between SQL generation (blue-themed) and analysis generation (green-themed) debug areas
  - **Query Results Analysis**: Row count, character count, and data size tracking
  - **Interactive Table View**: Spreadsheet-like display with sortable columns and pagination
  - **Real-time Statistics**: Live monitoring of data metrics and payload sizes
  - **Truncation Management**: Intelligent data truncation with visibility into size limits
  - **Multi-format Display**: Toggle between raw JSON and formatted table views
  - **SQL Validation Feedback**: Real-time display of SQL corrections and syntax fixes
  - **Model ID Accuracy**: Correct model identification for each process type
  - **Data Consistency**: Accurate MRR extraction and payload field mapping
- **Data Flow Visualization**: End-to-end tracing from user input to analysis results
- **Error Identification**: Clear identification of where data flow breaks down
- **Payload Inspection**: Detailed view of what data is sent to and received from Bedrock
- **Sound Notification System**: Visual completion notifications with user control and accessibility features
- **Analysis Sections Population**: Proper population of analysis sections using backend data with fallback logic

### Backend Debug Features

- **Enhanced Logging**: Comprehensive debug output in automation scripts
- **Payload Capture**: Complete capture of data sent to and received from AWS services
- **Error Tracing**: Detailed error tracking with context and stack traces
- **Performance Monitoring**: Real-time performance metrics and bottlenecks
- **SQL Validation Logging**: Real-time logging of SQL syntax corrections and fixes
- **Separated Debug Sections**: Clear distinction between SQL generation and analysis generation processes
- **Redis Connection Monitoring**: Health monitoring and graceful degradation for Redis availability

### Operational Debugging

- **Health Checks**: Automated service health monitoring and diagnostics
- **Connectivity Validation**: AWS service connectivity testing and validation
- **SQL Validation Monitoring**: Real-time monitoring of SQL syntax correction effectiveness
- **Sound System Monitoring**: Visual notification system health and performance monitoring
- **Redis Health Monitoring**: Redis availability monitoring and graceful degradation
- **Analysis Sections Monitoring**: Monitoring of analysis section population and fallback logic
