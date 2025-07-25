# Project Structure & Development Guidelines

## Directory Overview

- **/ (root)**: Main entry point, configuration, and documentation
- **/public**: Frontend assets (HTML, CSS, JS, images, UI options)
- **/src/frontend**: Modern React-based frontend (if present)
  - **/src/frontend/src/providers/AppSyncProvider.dev.js**: Development-only mock AppSyncProvider for robust local development and debugging
  - **/src/frontend/src/providers/index.js**: Environment-aware export for AppSyncProvider (uses dev mock in development, real provider in production)
- **/lambda**: AWS Lambda functions (opportunity analysis, funding, follow-on, shared utilities)
- **/automations**: Backend automation scripts (Bedrock query, Lambda execution, analysis orchestration)
- **/scripts**: Deployment, validation, and multi-environment orchestration scripts (e.g., deploy-multi-environment.js, provision-environment.js)
- **/config**: AWS, infrastructure, and environment configuration files
- **/lib**: CDK stacks and AWS infrastructure as code (TypeScript, aws-cdk-lib v2), including enterprise, disaster recovery, and backup automation stacks
- **/tests**: Unit, integration, and UI tests
- **/docs**: Expanded documentation, user guides, workflow templates, and operational runbooks
- **/logs**: Application and debug logs

## Key Files

- **app.js**: Main backend (Express) entry point (production ready)
- **app-debug.js**: Debug backend for development/testing
- **frontend-server.js**: Frontend proxy server
- **package.json**: Dependency management
- **cdk.json**: CDK configuration
- **README.md**: Project overview
- **product.md**: Product specification
- **structure.md**: This file
- **.kiro/steering/tech.md**: Technical stack and AWS integration

## Development Guidelines

- **Code Standards**: Use ES6+ for JS, TypeScript for CDK/Lambda, strict mode enabled
- **Security**: Follow AWS best practices (IAM least privilege, encryption, secrets management)
- **Performance**: Optimize for serverless scale, minimize cold starts, use efficient queries
- **Testing**: Use Jest for JS/TS, comprehensive unit/integration tests for Lambda and automations
- **Error Handling**: Standardized error messages ('ERROR: Data not received'), structured JSON errors, CloudWatch logging, and debug panels
- **Configuration**: Store sensitive data in environment variables, not code
- **Documentation**: Keep README, product.md, and structure.md up to date
- **AppSyncProvider Pattern**: The frontend uses an environment-aware AppSyncProvider pattern (`/src/frontend/src/providers/index.js`) to ensure robust local development and debugging. The dev mock is used in development, and the real provider in production.

## Navigating the Workspace

- **Frontend**: `/public` (main UI), `/src/frontend` (React UI, if present)
- **Backend**: `app.js`, `/automations`, `/lambda`
- **Infrastructure**: `/lib` (CDK, including multi-environment, DR, and backup stacks), `/config`, `/scripts` (multi-environment deployment)
- **Docs & Guides**: `/docs` (expanded), README.md, product.md, structure.md, .kiro/steering/tech.md
- **Tests**: `/tests`

## References

- For product details, see `product.md`
- For technical stack, see `.kiro/steering/tech.md`

## Debug Architecture (2025 Update)

- Debug extraction logic for analysis steps (sections 4 and 5) now uses only analysis-specific fields (analysisBedrockPayload, analysisPromptMeta, etc.).
- Query and analysis debug fields are strictly separated in both backend and frontend code.
- Only Claude 3.5 Sonnet is used for all Bedrock inference; Nova Premier references have been removed.
- Bedrock prompt management is the single source of truth for all model parameters and prompt metadata, which is now surfaced in the UI debug panels.
- Environment-aware AppSyncProvider pattern ensures robust local development and debugging without real-time/AppSync errors.
