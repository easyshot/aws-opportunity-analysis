# AWS Opportunity Analysis - User Guide

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Partner Opportunity Intelligence Page](#partner-opportunity-intelligence-page)
4. [Input Fields Reference](#input-fields-reference)
5. [Projection Fields Reference](#projection-fields-reference)
6. [Analysis Results Reference](#analysis-results-reference)
7. [Comprehensive Analysis Workflow](#comprehensive-analysis-workflow)
8. [Advanced Features](#advanced-features)
9. [SQL Validation & Debug Features](#sql-validation--debug-features)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)

## Overview

The AWS Opportunity Analysis application provides a comprehensive interface for analyzing business opportunities using historical AWS project data and AI-powered predictions. The **Partner Opportunity Intelligence page** displays all input fields, projections, and analysis results simultaneously, eliminating the need to navigate between different views.

### Key Features

- **Partner Opportunity Intelligence Page**: Fully functional HTML interface at `http://localhost:3123/`
- **Always-Visible Interface**: All fields remain visible throughout the analysis process
- **Real-Time Validation**: Immediate feedback on data entry and validation
- **SQL Validation**: Automatic detection and correction of AI-generated SQL syntax errors
- **Comprehensive Analysis**: Multiple analysis types including standard, funding, and follow-on analysis
- **Interactive Results**: Sortable tables, expandable sections, and detailed breakdowns
- **Export Capabilities**: Generate reports and export analysis results
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Enhanced Debug Suite**: Real-time data flow tracing and comprehensive troubleshooting tools

## Getting Started

### Accessing the Application

1. Open your web browser and navigate to `http://localhost:3123/`
2. The **Partner Opportunity Intelligence page** loads with all input fields, projection displays, and analysis result sections visible
3. Begin entering opportunity details in the input fields on the left panel
4. View real-time projections and analysis results in the right panel

### Interface Layout

The application uses a two-panel layout:

- **Left Panel**: Input fields, projections, and action buttons
- **Right Panel**: Analysis results, methodology, and detailed findings

## Partner Opportunity Intelligence Page

### Current Active Interface

The **Partner Opportunity Intelligence page** is the primary interface for the application, located at `http://localhost:3123/`. This fully functional HTML interface provides:

- **Production Backend Integration**: Stable production backend with full AWS integration and SQL validation
- **Enhanced Debug Features**: Real-time data flow tracing and comprehensive troubleshooting tools
- **SQL Validation Feedback**: Real-time display of SQL corrections and syntax fixes in debug panels
- **Standardized Error Handling**: Consistent error messages throughout the application

### Main Grid Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Header & Status                  │
├─────────────────────────┬───────────────────────────────────────┤
│     Left Panel          │           Right Panel                 │
│                         │                                       │
│  • Opportunity Details  │  • Key Metrics Display               │
│  • Projections Display  │  • Analysis Results                   │
│  • Action Buttons       │  • Architecture Recommendations      │
│  • Debug Panels         │  • SQL Validation Feedback           │
│                         │                                       │
└─────────────────────────┴───────────────────────────────────────┘
```

### Responsive Behavior

- **Desktop (>1200px)**: Two-column layout with full feature visibility
- **Tablet (768px-1200px)**: Stacked layout with optimized spacing
- **Mobile (<768px)**: Single-column layout with collapsible sections

## Input Fields Reference

### Basic Details Section

These fields capture fundamental opportunity information:

#### Customer Name **(Required)**

- **Purpose**: Identifies the customer organization
- **Format**: Text input (2-100 characters)
- **Validation**: Required, minimum 2 characters
- **Example**: "Acme Corporation"
- **Usage**: Used for matching similar historical projects

#### Customer Region **(Required)**

- **Purpose**: Geographic region where the customer is located
- **Format**: Dropdown selection
- **Options**: United States, Canada, Germany, United Kingdom, France, Japan, Australia, Brazil, India, Singapore
- **Validation**: Required selection
- **Example**: "United States"
- **Usage**: Influences analysis and regional patterns

#### Close Date **(Required)**

- **Purpose**: Expected opportunity close/start date
- **Format**: Date picker (YYYY-MM-DD)
- **Validation**: Required, must be future date
- **Example**: "2024-12-31"
- **Usage**: Affects timeline projections and launch date calculations

#### Opportunity Name **(Required)**

- **Purpose**: Descriptive name for the opportunity
- **Format**: Text input (3-150 characters)
- **Validation**: Required, minimum 3 characters
- **Example**: "Cloud Migration Initiative"
- **Usage**: Helps categorize and track the opportunity

#### Description **(Required)**

- **Purpose**: Detailed description of the opportunity scope
- **Format**: Large text area (50-2000 characters)
- **Validation**: Required, minimum 50 characters with real-time character counting
- **Example**: "Migrate legacy on-premises infrastructure to AWS cloud, including databases, applications, and storage systems"
- **Usage**: Primary input for AI analysis and similarity matching

## SQL Validation & Debug Features

### SQL Validation System

The application includes an advanced SQL validation system that automatically detects and corrects common syntax errors in AI-generated SQL queries:

#### Features

- **Nested Function Detection**: Automatically detects and fixes nested `lower()` function calls
- **Boolean Expression Correction**: Fixes boolean expressions incorrectly placed within function calls
- **CASE Statement Validation**: Validates and corrects CASE statement syntax issues
- **Real-time Logging**: Logs all SQL corrections for transparency and debugging
- **Fallback Safety**: Returns original query if validation fails to prevent system disruption

#### Debug Panels

The application provides comprehensive debugging capabilities:

- **Query Results Statistics**: Row count, character count, and data size tracking
- **Interactive Table View**: Spreadsheet-like display with toggle controls
- **Real-time Data Monitoring**: Live updates of query metrics and payload sizes
- **Truncation Management**: Intelligent data truncation with size visibility
- **Multi-format Display**: Toggle between raw JSON and formatted table views
- **SQL Validation Feedback**: Real-time display of SQL corrections and syntax fixes

### Settings Management

Users can configure analysis parameters through the settings interface:

- **SQL Query Limits**: Configure query result limits (50-500 records)
- **Truncation Settings**: Control data truncation behavior
- **Analysis Timeout**: Set analysis timeout parameters
- **Debug Preferences**: Configure debug panel visibility and logging levels

## Troubleshooting

### Common Issues

#### SQL Syntax Errors

- **Issue**: "FUNCTION_NOT_FOUND" errors in analysis
- **Solution**: The SQL validation system automatically detects and corrects these errors
- **Debug**: Check the SQL Validation Feedback panel for correction details

#### Analysis Failures

- **Issue**: 500 Internal Server Error during analysis
- **Solution**: The system now includes automatic SQL validation and correction
- **Debug**: Use the debug panels to trace data flow and identify issues

#### Performance Issues

- **Issue**: Slow analysis or timeout errors
- **Solution**: Adjust SQL query limits and truncation settings in the settings panel
- **Debug**: Monitor the performance metrics in the debug panels

### Debug Information

The application provides comprehensive debugging capabilities:

- **Real-time Data Flow**: Trace data from input to analysis results
- **SQL Query Display**: View generated SQL queries with syntax highlighting
- **Query Results Analysis**: Monitor row counts, character counts, and data sizes
- **Bedrock Payload Inspection**: View complete payloads sent to and received from Bedrock
- **Error Identification**: Clear identification of where data flow breaks down

### Getting Help

1. **Check Debug Panels**: Use the debug panels to identify issues
2. **Review Settings**: Verify analysis settings are appropriate for your data
3. **Check Logs**: Review backend logs for detailed error information
4. **Contact Support**: Use the troubleshooting documentation for additional guidance

## Best Practices

### Data Entry

- **Be Specific**: Provide detailed descriptions for better analysis accuracy
- **Use Real Data**: Enter actual customer and opportunity information
- **Validate Inputs**: Ensure all required fields are completed before analysis

### Analysis Settings

- **Start Conservative**: Begin with default settings and adjust as needed
- **Monitor Performance**: Use debug panels to optimize query limits and truncation
- **Review Results**: Always review analysis results for accuracy and completeness

### Debugging

- **Use Debug Panels**: Leverage the comprehensive debug features for troubleshooting
- **Monitor SQL Validation**: Check SQL validation feedback for any corrections made
- **Track Performance**: Monitor analysis performance and adjust settings accordingly

### Export and Reporting

- **Generate Reports**: Use the export functionality to create professional reports
- **Review Metrics**: Pay attention to confidence scores and prediction accuracy
- **Document Decisions**: Keep records of analysis results and decisions made
