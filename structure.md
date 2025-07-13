# Project Structure & Development Guidelines

## Directory Overview
- **/ (root)**: Main entry point, configuration, and documentation
- **/public**: Frontend assets (HTML, CSS, JS, images, UI options)
- **/src/frontend**: Modern React-based frontend (if present)
- **/lambda**: AWS Lambda functions (opportunity analysis, funding, follow-on, shared utilities)
- **/automations**: Backend automation scripts (Bedrock query, Lambda execution, analysis orchestration)
- **/config**: AWS, infrastructure, and environment configuration files
- **/lib**: CDK stacks and AWS infrastructure as code (TypeScript, aws-cdk-lib v2)
- **/tests**: Unit, integration, and UI tests
- **/docs**: Guides, runbooks, and user documentation
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
- **Error Handling**: Structured JSON errors, CloudWatch logging, and debug panels
- **Configuration**: Store sensitive data in environment variables, not code
- **Documentation**: Keep README, product.md, and structure.md up to date

## Navigating the Workspace
- **Frontend**: `/public` (main UI), `/src/frontend` (React UI, if present)
- **Backend**: `app.js`, `/automations`, `/lambda`
- **Infrastructure**: `/lib` (CDK), `/config`
- **Docs & Guides**: `/docs`, README.md, product.md, structure.md, .kiro/steering/tech.md
- **Tests**: `/tests`

## References
- For product details, see `product.md`
- For technical stack, see `.kiro/steering/tech.md` 