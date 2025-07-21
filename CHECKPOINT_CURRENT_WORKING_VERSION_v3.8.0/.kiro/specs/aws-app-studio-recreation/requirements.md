# Requirements Document

## Introduction

This feature involves recreating an AWS App Studio application as a standalone Node.js web application. The application provides comprehensive opportunity analysis functionality that helps users analyze new business opportunities by finding similar historical AWS projects and providing predictions about revenue, timelines, and recommended services. The application includes advanced features like funding analysis and follow-on opportunity identification. The recreation will maintain the same core functionality while being built using Node.js, Express, and vanilla JavaScript frontend technologies.

## Requirements

### Requirement 1

**User Story:** As a business analyst, I want to see a clear two-panel interface layout, so that I can easily input opportunity details and view analysis results side by side.

#### Acceptance Criteria

1. WHEN the user accesses the application THEN the system SHALL display a two-panel layout with "Opportunity Details" on the left and "Opportunity Analysis" on the right
2. WHEN the user views the interface THEN the system SHALL show "Opportunity Details" and "Opportunity Projections" sections in the left panel
3. WHEN the user views the interface THEN the system SHALL show "Opportunity Analysis" section in the right panel with multiple subsections for different analysis components
4. WHEN the user interacts with either panel THEN the system SHALL maintain responsive layout across different screen sizes
5. WHEN analysis is running THEN the system SHALL provide visual feedback in the analysis panel

### Requirement 2

**User Story:** As a business analyst, I want to input opportunity details through a structured form, so that I can provide all necessary information for comprehensive analysis.

#### Acceptance Criteria

1. WHEN the user views the Opportunity Details section THEN the system SHALL display form fields for Customer Name, Region, Close Date, Opportunity Name, and Description
2. WHEN the user enters data in the Description field THEN the system SHALL provide a large text area for detailed opportunity information
3. WHEN the user selects a region THEN the system SHALL provide a dropdown with available AWS regions
4. WHEN the user enters a close date THEN the system SHALL accept standard date formats and provide date picker functionality
5. WHEN the user completes required fields THEN the system SHALL enable the "Analyze" button and other action buttons
6. WHEN the user clicks the "Analyze" button THEN the system SHALL clear all previous analysis results before starting new analysis
7. WHEN the user clicks the "Reset" button THEN the system SHALL clear all form fields and analysis results

### Requirement 3

**User Story:** As a business analyst, I want to view opportunity projections in a dedicated section, so that I can see predicted metrics and timelines.

#### Acceptance Criteria

1. WHEN the user views the left panel THEN the system SHALL display an "Opportunity Projections" section below the opportunity details form
2. WHEN analysis is complete THEN the system SHALL populate the projections section with predicted ARR, MRR, launch date, and time to launch values
3. WHEN displaying projections THEN the system SHALL show fields for ARR (Annual Recurring Revenue), MRR (Monthly Recurring Revenue), launch date, and time to launch
4. WHEN projections are not yet available THEN the system SHALL display empty fields
5. WHEN projections are updated THEN the system SHALL refresh the display without requiring page reload

### Requirement 4

**User Story:** As a business analyst, I want the system to execute a comprehensive analysis workflow, so that I can get detailed predictions based on historical data.

#### Acceptance Criteria

1. WHEN the user clicks "Analyze" THEN the system SHALL execute a multi-step automation workflow including query generation, data retrieval, and analysis
2. WHEN the workflow starts THEN the system SHALL first clear all previous results from all analysis output fields
3. WHEN clearing results THEN the system SHALL reset ARR, MRR, launch date, time to launch, top services, confidence, methodology, similar projects, findings, rationale, risk factors, and summary fields
4. WHEN clearing is complete THEN the system SHALL invoke the Bedrock query generation automation with opportunity parameters
5. WHEN query generation completes THEN the system SHALL execute the Lambda function to retrieve historical data
6. WHEN data retrieval completes THEN the system SHALL invoke the final analysis automation (standard or Nova Premier model)
7. WHEN analysis completes THEN the system SHALL populate all result fields with the analysis output

### Requirement 5

**User Story:** As a business analyst, I want the system to generate intelligent SQL queries using AWS Bedrock, so that relevant historical projects can be identified automatically.

#### Acceptance Criteria

1. WHEN the system invokes query generation THEN the system SHALL use AWS Bedrock Agent GetPrompt to retrieve the configured prompt
2. WHEN preparing the payload THEN the system SHALL extract model ID and prompt templates from the fetched prompt data
3. WHEN filling the prompt template THEN the system SHALL replace placeholders with CustomerName, region, closeDate, oppName, and oppDescription values
4. WHEN invoking Bedrock THEN the system SHALL use the Bedrock Runtime Converse API with the prepared payload
5. WHEN processing results THEN the system SHALL extract the SQL query from the JSON response and validate its structure
6. WHEN the SQL generation fails THEN the system SHALL return an error message and allow the user to retry

### Requirement 6

**User Story:** As a business analyst, I want the system to execute queries against historical project data via Lambda, so that I can retrieve relevant comparable projects.

#### Acceptance Criteria

1. WHEN a SQL query is generated THEN the system SHALL execute it against the Athena database via the catapult_get_dataset Lambda function
2. WHEN preparing the Lambda payload THEN the system SHALL format the SQL query as a JSON object with sql_query property
3. WHEN the Lambda execution completes THEN the system SHALL process the ResultSet from Athena response
4. WHEN processing results THEN the system SHALL extract headers from the first row and transform subsequent rows into structured objects
5. WHEN the query execution fails THEN the system SHALL return a meaningful error message with status and empty data array
6. WHEN no matching projects are found THEN the system SHALL return success status with empty data array

### Requirement 7

**User Story:** As a business analyst, I want the system to perform comprehensive analysis using AWS Bedrock, so that I can get detailed predictions and recommendations.

#### Acceptance Criteria

1. WHEN historical data is retrieved THEN the system SHALL analyze it using AWS Bedrock (standard or Nova Premier model based on configuration)
2. WHEN preparing analysis THEN the system SHALL fetch the analysis prompt from Bedrock Agent and extract system and user prompt templates
3. WHEN processing historical data THEN the system SHALL handle various date formats (nanoseconds, seconds, milliseconds) and convert close_date to historical_opportunity_won_date
4. WHEN invoking analysis THEN the system SHALL use Bedrock Runtime Converse API with structured opportunity details and historical project data
5. WHEN processing analysis results THEN the system SHALL extract and validate predictions for ARR, MRR, launch dates, project duration, and AWS services recommendations
6. WHEN analysis includes validation THEN the system SHALL perform cost validation, timeline validation, and confidence assessment
7. WHEN analysis is complete THEN the system SHALL provide structured sections including methodology, similar projects, findings, rationale, risk factors, and architecture

### Requirement 8

**User Story:** As a business analyst, I want to view comprehensive analysis results in organized sections, so that I can understand all aspects of the opportunity analysis.

#### Acceptance Criteria

1. WHEN analysis is complete THEN the system SHALL display results in multiple organized sections in the right panel
2. WHEN displaying results THEN the system SHALL show sections for Methodology, Query, Query Results, Similar Projects, Findings, Rationale, Risk Factors, and Summary
3. WHEN showing methodology THEN the system SHALL display the analysis approach and techniques used
4. WHEN showing similar projects THEN the system SHALL display parsed historical projects with detailed information including customer, region, dates, financials, and services
5. WHEN showing findings THEN the system SHALL display detailed analysis findings and insights
6. WHEN showing rationale THEN the system SHALL display the reasoning behind predictions and recommendations
7. WHEN showing risk factors THEN the system SHALL display identified risks and mitigation strategies
8. WHEN showing summary THEN the system SHALL display formatted summary with all key metrics and recommendations

### Requirement 9

**User Story:** As a business analyst, I want to access funding analysis functionality, so that I can understand financing options for the opportunity.

#### Acceptance Criteria

1. WHEN the user clicks the "Funding Options" button THEN the system SHALL invoke the funding analysis automation
2. WHEN invoking funding analysis THEN the system SHALL pass customerName, region, oppName, oppDescription, prompt, projectedArr, and topServices as parameters
3. WHEN processing funding analysis THEN the system SHALL use Bedrock Runtime Converse API to analyze funding options
4. WHEN funding analysis completes THEN the system SHALL display the funding analysis results in the designated output field
5. WHEN funding analysis fails THEN the system SHALL display appropriate error messages

### Requirement 10

**User Story:** As a business analyst, I want to identify follow-on opportunities, so that I can understand potential future business with the customer.

#### Acceptance Criteria

1. WHEN the user clicks "Your Next Opportunity" button THEN the system SHALL execute a multi-step follow-on opportunity analysis workflow
2. WHEN starting follow-on analysis THEN the system SHALL first generate a SQL query for follow-on opportunities using Bedrock
3. WHEN generating follow-on query THEN the system SHALL use Nova Pro model with specific query construction instructions
4. WHEN the follow-on query is generated THEN the system SHALL execute it via Lambda to retrieve relevant historical data
5. WHEN follow-on data is retrieved THEN the system SHALL analyze it using Bedrock to identify potential follow-on opportunities
6. WHEN follow-on analysis completes THEN the system SHALL display structured results including insights, recommendations, next steps, services, timeline, and summary metrics
7. WHEN any step in the follow-on workflow fails THEN the system SHALL provide appropriate error handling and user feedback

### Requirement 11

**User Story:** As a developer, I want the application to have robust error handling and logging, so that issues can be diagnosed and resolved quickly.

#### Acceptance Criteria

1. WHEN any AWS service call fails THEN the system SHALL log detailed error information including stack traces
2. WHEN an error occurs THEN the system SHALL display user-friendly error messages while logging technical details
3. WHEN the application starts THEN the system SHALL validate all required environment variables and AWS configurations
4. WHEN AWS credentials are invalid THEN the system SHALL provide clear authentication error messages
5. WHEN network issues occur THEN the system SHALL implement appropriate retry logic
6. WHEN processing complex data transformations THEN the system SHALL include comprehensive error handling for date parsing, JSON processing, and data validation

### Requirement 12

**User Story:** As a developer, I want the application to support both development and production environments, so that testing and deployment can be managed effectively.

#### Acceptance Criteria

1. WHEN running in development mode THEN the system SHALL provide detailed debug logging for all automation steps
2. WHEN running in development mode THEN the system SHALL support auto-restart on file changes
3. WHEN running in production mode THEN the system SHALL optimize logging for performance while maintaining error visibility
4. WHEN environment variables are missing THEN the system SHALL provide clear configuration guidance
5. WHEN running the frontend separately THEN the system SHALL proxy API requests to the backend server
6. WHEN using different Bedrock models THEN the system SHALL support configuration switching between standard and Nova Premier models