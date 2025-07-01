# AWS Opportunity Analysis - Project Structure

## Directory Organization

### Root Level
- `app.js`: Main application entry point for the backend server
- `app-debug.js`: Debug version of the main application
- `frontend-server.js`: Separate server for serving the frontend
- `package.json`: Project dependencies and scripts
- `.env`: Environment variables (not committed to version control)

### `/automations`
Contains backend automation scripts that orchestrate the analysis workflow:
- `invokeBedrockQueryPrompt-v3.js`: Generates SQL queries using Bedrock (AWS SDK v3)
- `InvLamFilterAut-v3.js`: Executes SQL queries via Lambda (AWS SDK v3)
- `finalBedAnalysisPrompt-v3.js`: Analyzes data using standard Bedrock model (AWS SDK v3)
- `finalBedAnalysisPromptNovaPremier-v3.js`: Analyzes data using Nova Premier model (AWS SDK v3)
- (Legacy scripts without `-v3` suffix are retained for reference)

### `/config`
Configuration files for AWS services:
- `aws-config-v3.js`: AWS SDK v3 configuration (current standard)
- `aws-config.js`: Legacy AWS SDK configuration

### `/lambda`
AWS Lambda functions:
- `catapult_get_dataset-v3.js`: Executes SQL against Athena (AWS SDK v3)
- `catapult_get_dataset.js`: Legacy version

### `/public`
Frontend files:
- `index.html`: Main HTML page
- `styles.css`: CSS styles
- `app.js`: Frontend JavaScript

## Code Patterns

### Automation Pattern
Each automation follows a consistent pattern:
1. **Input**: Receives parameters from the previous step
2. **Processing**: Performs its specific task (query generation, data retrieval, analysis)
3. **Output**: Returns structured results for the next step

### AWS Integration Pattern
- AWS services are accessed through the AWS SDK v3
- Credentials and configuration are centralized in `config/aws-config-v3.js`
- Environment variables are used for sensitive information
- Bedrock prompt management is handled via prompt IDs in environment variables

### API Structure
- RESTful API endpoints in `app.js`
- Main endpoint: `/api/analyze` for opportunity analysis (supports both standard and Nova Premier flows)
- Mock endpoint: `/api/analyze/mock` for development/testing

## Version Naming Convention
- Files with `-v3` suffix use AWS SDK v3 and are the current standard
- Files without version suffix are legacy and retained for reference

## Data Flow
1. Frontend collects user input
2. Backend processes the request through a series of automations:
   - `invokeBedrockQueryPrompt-v3` → `InvLamFilterAut-v3` → `finalBedAnalysisPrompt-v3` or `finalBedAnalysisPromptNovaPremier-v3`
3. Results are returned to the frontend for display