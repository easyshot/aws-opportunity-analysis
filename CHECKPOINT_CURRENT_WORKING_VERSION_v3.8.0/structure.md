# Project Structure & Development Guidelines

## Directory Overview

- **/ (root)**: Main entry point, configuration, and documentation
- **/public**: Frontend assets (HTML, CSS, JS, images, UI options) - **Active: Partner Opportunity Intelligence page**
- **/src/frontend**: Modern React-based frontend (if present)
- **/lambda**: AWS Lambda functions (opportunity analysis, funding, follow-on, shared utilities)
- **/automations**: Backend automation scripts (v3 versions are current standard with SQL validation)
- **/scripts**: Deployment, validation, and multi-environment orchestration scripts (e.g., deploy-multi-environment.js, provision-environment.js)
- **/config**: AWS, infrastructure, and environment configuration files
- **/lib**: CDK stacks and AWS infrastructure as code (TypeScript, aws-cdk-lib v2), including enterprise, disaster recovery, and backup automation stacks
- **/tests**: Unit, integration, and UI tests
- **/docs**: Expanded documentation, user guides, workflow templates, and operational runbooks
- **/logs**: Application and debug logs

## Key Files

- **app.js**: Main backend (Express) entry point (production ready with SQL validation, enhanced debug rebuild, and Redis connection handling)
- **app-debug.js**: Debug backend for development/testing
- **frontend-server.js**: Frontend proxy server serving Partner Opportunity Intelligence page
- **package.json**: Dependency management
- **cdk.json**: CDK configuration
- **README.md**: Project overview
- **product.md**: Product specification
- **structure.md**: This file
- **.kiro/steering/tech.md**: Technical stack and AWS integration

## Current Active Components

- **Primary Interface**: `public/index.html` - Partner Opportunity Intelligence page (fully functional with enhanced debug rebuild, sound notifications, and analysis sections fix)
- **Main JavaScript**: `public/app-clean-fixed.js` - Enhanced with separated debug panels, sound notifications, SQL validation, data consistency fixes, and analysis sections population
- **Backend**: `app.js` - Production backend with SQL validation, enhanced debug rebuild, Redis connection handling, and error handling
- **SQL Validation**: `automations/enhancedBedrockQueryPrompt-v3.js` - Automatic SQL syntax correction
- **Analysis Engine**: `automations/finalBedAnalysisPrompt-v3.js` - Enhanced analysis with RAG
- **Lambda Integration**: `automations/InvLamFilterAut-v3.js` - Lambda execution with error handling
- **Caching Service**: `lib/caching-service.js` - Redis integration with graceful degradation

## Development Guidelines

- **Code Standards**: Use ES6+ for JS, TypeScript for CDK/Lambda, strict mode enabled
- **Security**: Follow AWS best practices (IAM least privilege, encryption, secrets management)
- **Performance**: Optimize for serverless scale, minimize cold starts, use efficient queries
- **Testing**: Use Jest for JS/TS, comprehensive unit/integration tests for Lambda and automations
- **Error Handling**: Standardized error messages ('ERROR: Data not received'), structured JSON errors, CloudWatch logging, and debug panels
- **Configuration**: Store sensitive data in environment variables, not code
- **Documentation**: Keep README, product.md, and structure.md up to date
- **SQL Validation**: All AI-generated SQL queries are automatically validated and corrected for syntax errors
- **Debug Architecture**: Maintain separated debug sections for SQL generation and analysis generation processes
- **Sound Notifications**: Implement visual notifications with user control and accessibility features
- **Redis Integration**: Implement graceful degradation when Redis is unavailable
- **Analysis Sections**: Ensure proper population of analysis sections using backend data with fallback logic

## Navigating the Workspace

- **Frontend**: `/public` (main UI - Partner Opportunity Intelligence page with enhanced debug rebuild, sound notifications, and analysis sections fix), `/src/frontend` (React UI, if present)
- **Backend**: `app.js`, `/automations` (v3 versions with SQL validation and enhanced debug rebuild), `/lambda`
- **Infrastructure**: `/lib` (CDK, including multi-environment, DR, and backup stacks), `/config`, `/scripts` (multi-environment deployment)
- **Docs & Guides**: `/docs` (expanded), README.md, product.md, structure.md, .kiro/steering/tech.md
- **Tests**: `/tests`

## Current Application State

- **Production Backend**: `app.js` with full AWS integration, SQL validation, enhanced debug rebuild, and Redis connection handling
- **Working Frontend**: Partner Opportunity Intelligence page at `http://localhost:3123/` with separated debug sections, sound notifications, and analysis sections fix
- **SQL Validation**: Automatic detection and correction of AI-generated SQL syntax errors
- **Error Handling**: Standardized error messages throughout the application
- **Debug Suite**: Comprehensive debugging capabilities with separated SQL and analysis generation sections
- **Sound Notifications**: Visual completion notifications with user control and accessibility features
- **Data Consistency**: Accurate MRR extraction and payload field mapping between server and frontend
- **Analysis Sections**: Proper population of analysis sections using backend data with fallback logic
- **Redis Integration**: Graceful handling of Redis availability with automatic fallback to non-cached operations

## References

- For product details, see `product.md`
- For technical stack, see `.kiro/steering/tech.md`

## Debug Architecture (2025 Update)

- **Separated Debug Sections**: Clear distinction between SQL generation (blue-themed) and analysis generation (green-themed) debug areas
- **Model ID Accuracy**: Correct model identification for each process type (Nova Pro for SQL, Claude 3.5 Sonnet for analysis)
- **Data Consistency**: Accurate MRR extraction and payload field mapping between server and frontend
- **Debug Transparency**: Only analysis prompt/model is shown for analysis steps, with full metadata
- **Nova Premier Removal**: Only Claude 3.5 Sonnet is used for all analysis and query steps
- **SQL Validation Integration**: Real-time display of SQL corrections and syntax fixes in debug panels
- **Sound Notification System**: Visual completion notifications with user control and accessibility features

## SQL Validation System

- **Location**: `automations/enhancedBedrockQueryPrompt-v3.js`
- **Features**:
  - Nested function detection and correction
  - Boolean expression validation
  - CASE statement syntax checking
  - Real-time logging of corrections
  - Fallback safety mechanisms
- **Integration**: Seamlessly integrated into the query generation workflow
- **Transparency**: All corrections are logged for debugging and audit purposes

## Sound Notification System

- **Location**: `public/app-clean-fixed.js`
- **Features**:
  - Visual completion notifications with slide-in animation
  - User-configurable sound toggle with 🔊/🔇 icon
  - Auto-dismiss after 3 seconds
  - Error isolation to prevent system disruption
  - localStorage integration for user preferences
- **Accessibility**: Optimized for accessibility and performance
- **Integration**: Seamlessly integrated into the analysis workflow

## Analysis Sections Fix System

- **Location**: `public/app-clean-fixed.js` and `lib/caching-service.js`
- **Features**:
  - Redis connection graceful degradation
  - Frontend analysis section population using backend data
  - Fallback logic for section extraction
  - Error recovery without Redis caching
  - Health monitoring for Redis availability
- **Integration**: Seamlessly integrated into the analysis workflow
- **Reliability**: Application continues to function without Redis

## Enhanced Debug Rebuild Features

- **Separated Debug Sections**: Blue-themed SQL generation section and green-themed analysis generation section
- **Model ID Accuracy**: Correct model identification for each process type
- **Data Consistency**: Accurate MRR extraction and payload field mapping
- **Professional UX Design**: Enhanced debug panels with professional design and user-friendly controls
- **Real-time Data Monitoring**: Live updates of query metrics and payload sizes
- **Multi-format Display**: Toggle between raw JSON and formatted table views
