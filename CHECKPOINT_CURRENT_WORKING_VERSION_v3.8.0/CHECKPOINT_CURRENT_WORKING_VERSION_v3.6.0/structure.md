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

- **app.js**: Main backend (Express) entry point (production ready with SQL validation)
- **app-debug.js**: Debug backend for development/testing
- **frontend-server.js**: Frontend proxy server serving Partner Opportunity Intelligence page
- **package.json**: Dependency management
- **cdk.json**: CDK configuration
- **README.md**: Project overview
- **product.md**: Product specification
- **structure.md**: This file
- **.kiro/steering/tech.md**: Technical stack and AWS integration

## Current Active Components

- **Primary Interface**: `public/index.html` - Partner Opportunity Intelligence page (fully functional)
- **Main JavaScript**: `public/app-clean-fixed.js` - Enhanced with debug panels and SQL validation
- **Backend**: `app.js` - Production backend with SQL validation and error handling
- **SQL Validation**: `automations/enhancedBedrockQueryPrompt-v3.js` - Automatic SQL syntax correction
- **Analysis Engine**: `automations/finalBedAnalysisPrompt-v3.js` - Enhanced analysis with RAG
- **Lambda Integration**: `automations/InvLamFilterAut-v3.js` - Lambda execution with error handling

## Development Guidelines

- **Code Standards**: Use ES6+ for JS, TypeScript for CDK/Lambda, strict mode enabled
- **Security**: Follow AWS best practices (IAM least privilege, encryption, secrets management)
- **Performance**: Optimize for serverless scale, minimize cold starts, use efficient queries
- **Testing**: Use Jest for JS/TS, comprehensive unit/integration tests for Lambda and automations
- **Error Handling**: Standardized error messages ('ERROR: Data not received'), structured JSON errors, CloudWatch logging, and debug panels
- **Configuration**: Store sensitive data in environment variables, not code
- **Documentation**: Keep README, product.md, and structure.md up to date
- **SQL Validation**: All AI-generated SQL queries are automatically validated and corrected for syntax errors

## Navigating the Workspace

- **Frontend**: `/public` (main UI - Partner Opportunity Intelligence page), `/src/frontend` (React UI, if present)
- **Backend**: `app.js`, `/automations` (v3 versions with SQL validation), `/lambda`
- **Infrastructure**: `/lib` (CDK, including multi-environment, DR, and backup stacks), `/config`, `/scripts` (multi-environment deployment)
- **Docs & Guides**: `/docs` (expanded), README.md, product.md, structure.md, .kiro/steering/tech.md
- **Tests**: `/tests`

## Current Application State

- **Production Backend**: `app.js` with full AWS integration and SQL validation
- **Working Frontend**: Partner Opportunity Intelligence page at `http://localhost:3123/`
- **SQL Validation**: Automatic detection and correction of AI-generated SQL syntax errors
- **Error Handling**: Standardized error messages throughout the application
- **Debug Suite**: Comprehensive debugging capabilities with real-time data flow tracing

## References

- For product details, see `product.md`
- For technical stack, see `.kiro/steering/tech.md`

## Debug Architecture (2025 Update)

- Debug extraction logic for analysis steps (sections 4 and 5) now uses only analysis-specific fields (analysisBedrockPayload, analysisPromptMeta, etc.).
- Query and analysis debug fields are strictly separated in both backend and frontend code.
- Only Claude 3.5 Sonnet is used for all Bedrock inference; Nova Premier references have been removed.
- Bedrock prompt management is the single source of truth for all model parameters and prompt metadata, which is now surfaced in the UI debug panels.
- SQL validation system automatically detects and corrects common syntax errors in AI-generated queries.

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
