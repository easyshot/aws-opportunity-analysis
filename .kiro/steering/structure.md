# AWS Bedrock Partner Management System - Project Structure

## Directory Organization

### Root Level
- `app.js`: Main application entry point for production backend server with full AWS integration (production ready)
- `app-debug.js`: Debug version with comprehensive mock data for development and testing
- `frontend-server.js`: Separate server for serving the frontend on port 3123 with API proxy
- `package.json`: Complete project dependencies and scripts for all functionality
- `cdk.json`: AWS CDK configuration for infrastructure deployment
- `.env`: Environment variables (not committed to version control)
- **Implementation Summaries**: Multiple task implementation summaries documenting completed work

### `/automations`
Backend automation scripts that orchestrate the complete analysis workflow with enhanced debugging:
- `invokeBedrockQueryPrompt-v3.js`: Generates SQL queries using Bedrock Agent (AWS SDK v3)
- `InvLamFilterAut-v3.js`: Executes SQL queries via Lambda with error handling (AWS SDK v3)
- `finalBedAnalysisPrompt-v3.js`: Standard Bedrock Titan model analysis with comprehensive debugging (AWS SDK v3)

- `enhancedFundingAnalysis-v3.js`: Multi-tier funding analysis with ROI calculations
- `enhancedFollowOnAnalysis-v3.js`: Strategic follow-on opportunity identification
- (Legacy scripts without `-v3` suffix retained for reference)

### `/config`
Configuration files for AWS services and infrastructure:
- `aws-config-v3.js`: Centralized AWS SDK v3 configuration with infrastructure integration
- `infrastructure-config.js`: Infrastructure configuration management
- `aws-config.js`: Legacy AWS SDK configuration (deprecated)

### `/lambda`
AWS Lambda functions for serverless processing:
- `catapult_get_dataset-v3.js`: Athena query execution with advanced error handling (AWS SDK v3)
- Specialized Lambda functions for different analysis types (deployed via CDK)
- Shared utilities layer for common functionality across all functions

### `/lib`
AWS CDK infrastructure stacks and services:
- `aws-opportunity-analysis-stack.js`: Main infrastructure stack
- `dynamodb-stack.js`: Database infrastructure with caching and session management
- `bedrock-knowledge-base-stack.js`: RAG-enhanced knowledge base with OpenSearch
- `monitoring-stack.js`: Comprehensive monitoring and observability
- `security-stack.js`: Enterprise security controls and compliance
- `disaster-recovery-stack.js`: Multi-region deployment and backup automation
- **30+ specialized stacks** for different infrastructure components

### `/public` - Modern Frontend Architecture
Multiple UI implementations with progressive enhancement and debugging capabilities:

#### Core Application Files
- `index.html`: **Main application** (Primary interface with enhanced debug features)
- `app-clean.js`: **Main JavaScript** (Primary functionality with comprehensive debug integration)
- `styles-compact-option-c.css`: **Main stylesheet** (Modern styling with debug panel support)
- `index-compact.html`: **Alternative interface** (Option C - Modern Dashboard)
- `app-compact-option-c.js`: **Alternative JavaScript** (Option C functionality)

#### Alternative UI Options
- **Option A - Clean Professional**:
  - `index-compact-option-a.html`: Clean, minimal design closest to legacy layout
  - `styles-compact-option-a.css`: Professional styling with simple grid layout
  - `app-compact-option-a.js`: Straightforward functionality with basic UX
  
- **Option B - Enhanced Interactive**:
  - `index-compact-option-b.html`: Modern with interactive elements and tabbed sections
  - `styles-compact-option-b.css`: Enhanced styling with animations and visual feedback
  - `app-compact-option-b.js`: Advanced interactivity with progress tracking
  
- **Option C - Modern Dashboard** (Active):
  - `index-compact-option-c.html`: Contemporary dashboard with rich visual elements
  - `styles-compact-option-c.css`: Modern styling with gradients and animations
  - `app-compact-option-c.js`: Full-featured with real-time updates, advanced UX, and debug panels

#### Legacy Files (Maintained for Reference)
- `index.html`: Original application interface
- `styles.css`: Original styling
- `app.js`: Original JavaScript functionality
- `index-modern.html`: Early modern design iteration
- `styles-modern.css`: Early modern styling
- `app-modern.js`: Early modern functionality

## Modern Frontend Features

### Option C (Active) - Modern Dashboard Layout
- **Real-time Completion Tracking**: Live progress bar with percentage completion
- **Interactive Form Elements**: Smart validation with visual feedback
- **Character Counter**: Dynamic description field validation with color coding
- **Auto-save Functionality**: Automatic form data persistence using localStorage
- **Animated Metrics**: Smooth transitions and scaling effects for result display
- **Confidence Gauge**: Animated circular gauge with color-coded confidence levels
- **Modern Service Cards**: Interactive service recommendations with icons and hover effects
- **Grid/List View Toggle**: Flexible analysis result viewing options
- **Live Timestamps**: Real-time timestamp updates in header
- **Sample Data Loading**: Quick-load functionality for testing and demonstrations
- **Enhanced Debug Information Panels**: Comprehensive debugging capabilities including:
  - **Query Results Statistics**: Row count, character count, and data size tracking
  - **Table View Toggle**: Switch between raw JSON and spreadsheet-like display
  - **Real-time Data Monitoring**: Live updates of query metrics and payload sizes
  - **Truncation Visibility**: Clear indication when data truncation occurs
  - **Interactive Debug Controls**: User-friendly interface for debugging data flow

### Enhanced Analysis Sections
- **Six Core Analysis Areas**: Methodology, Findings, Risk Factors, Similar Projects, Rationale, Full Analysis
- **Dedicated Funding Section**: Comprehensive funding options and investment strategies
- **Dedicated Follow-On Section**: Future growth opportunities and expansion potential
- **Interactive Content**: Rich formatting with visual elements, cards, and structured layouts
- **Debug Data Display**: Real-time visibility into data flow and processing steps

## Code Patterns

### Modern Frontend Architecture
Each UI option follows a consistent class-based pattern:
1. **Initialization**: Constructor sets up event listeners and loads saved data
2. **Form Management**: Real-time validation, auto-save, and completion tracking
3. **API Integration**: Async/await pattern for backend communication
4. **Result Display**: Dynamic content generation with rich formatting
5. **State Management**: localStorage integration for data persistence
6. **Debug Integration**: Real-time display of backend data flow and processing

### Backend Integration Pattern
- **Production Mode**: Using `app.js` for stable backend operation with full AWS integration
- **Converse API**: All Bedrock interactions use the modern Converse API for consistent communication
- **Error Handling**: Graceful degradation with user-friendly error messages
- **Loading States**: Visual feedback during analysis processing
- **Enhanced Logging**: Comprehensive debug output for troubleshooting data flow issues

### AWS Integration Pattern
- AWS services are accessed through the AWS SDK v3
- Credentials and configuration are centralized in `config/aws-config-v3.js`
- Environment variables are used for sensitive information
- Bedrock prompt management is handled via prompt IDs in environment variables
- Enhanced debugging provides visibility into data flow from frontend to Bedrock

### API Structure
- RESTful API endpoints in backend server
- Main endpoint: `/api/analyze` for opportunity analysis using Claude 3.5 Sonnet model
- Mock endpoint: `/api/analyze/mock` for development/testing
- Frontend proxy: Port 3123 proxies API requests to backend on port 8123
- Debug endpoints: Enhanced logging and payload inspection for troubleshooting

## Version Naming Convention
- **UI Options**: `option-a`, `option-b`, `option-c` for different design approaches
- **AWS SDK**: Files with `-v3` suffix use AWS SDK v3 and are the current standard
- **Legacy Support**: Files without version suffix are retained for reference
- **Production Mode**: `app.js` for production operation, `app-debug.js` for development and testing

## Data Flow

### Modern Frontend Flow
1. **User Input**: Interactive form with real-time validation and completion tracking
2. **Auto-save**: Automatic data persistence to localStorage
3. **Validation**: Client-side validation with visual feedback before submission
4. **API Call**: Async request to backend with loading state management
5. **Debug Display**: Real-time display of SQL queries, query results, and Bedrock payloads
6. **Result Display**: Dynamic content generation with rich formatting and animations
7. **Export Options**: Professional export and print capabilities

### Backend Processing Flow
1. Frontend collects user input with enhanced validation
2. Backend processes the request through a series of automations with enhanced debugging:
   - `invokeBedrockQueryPrompt-v3` → `InvLamFilterAut-v3` → `finalBedAnalysisPrompt-v3`
3. Debug information is captured and displayed in real-time
4. Results are returned to the frontend for enhanced display with rich formatting

## Development Guidelines

### UI Development
- **Option C** is the primary interface for new development
- Maintain backward compatibility with Options A and B
- Follow modern web standards with responsive design
- Implement progressive enhancement for accessibility
- Include debug panels for troubleshooting data flow issues

### Code Standards
- Use ES6+ features with class-based architecture
- Implement proper error handling and user feedback
- Follow consistent naming conventions across all options
- Maintain separation of concerns between HTML, CSS, and JavaScript
- Include comprehensive debugging and logging for troubleshooting

### Performance Considerations
- Optimize for fast loading with minimal dependencies
- Implement efficient DOM manipulation and event handling
- Use CSS animations for smooth user experience
- Minimize API calls with intelligent caching
- Ensure debug information doesn't impact performance

### Debugging and Troubleshooting
- **Professional Debug Suite**: Comprehensive debugging infrastructure featuring:
  - **SQL Query Generation Process**: Real-time monitoring of Bedrock SQL generation with model configuration and process status indicators
  - **Analysis Generation Process**: Advanced payload analysis with size monitoring, token estimation, and risk assessment
  - **User-Configurable Settings**: Settings management interface for SQL query limits, truncation limits, and debug preferences
  - **Real-time Logging Capture**: Backend console log capture and frontend display with comprehensive data flow tracing
  - **Interactive Debug Controls**: Professional UX with status indicators, risk assessment displays, and multi-format data viewing
  - **Row Count Management**: User-controlled SQL query limits with real-time application and verification
- **Backend Enhanced Logging**: Comprehensive debug output in automation scripts with professional logging capture
- **Data Flow Tracing**: End-to-end visibility from frontend input to Bedrock response with professional visualization
- **Error Identification**: Clear identification of where data flow breaks down with professional troubleshooting guidance
- **Operational Documentation**: Comprehensive guides for troubleshooting and maintenance

## Current Development Focus

### Production Ready & Professional Debug Suite with Timeout Resolution
- **Production Status**: Successfully migrated to stable production backend (`app.js`) with full AWS integration
- **Lambda Timeout Fix**: Resolved Lambda execution timeouts by extending timeout from 10s to 30s and improving error handling
- **Bedrock Integration**: Fixed Bedrock analysis issues by resolving invalid prompt version parameters
- **Simplified Architecture**: Removed Nova Premier complexity and standardized on Claude 3.5 Sonnet model
- **Settings System Integration**: Properly integrated with comprehensive settings management system for all data manipulation
- **Professional Debug Suite**: Comprehensive debugging infrastructure with professional UX design
- **Data Flow Optimization**: Resolved Bedrock input size errors with intelligent multi-level truncation system
- **Modern API Implementation**: All Bedrock interactions use modern Converse API for consistent communication
- **Performance Monitoring**: Added `/api/debug/performance` endpoint for real-time system health monitoring