# AWS Opportunity Analysis Application

## Product Overview
This application analyzes new business opportunities by finding similar historical AWS projects and providing predictions about Annual Recurring Revenue (ARR), Monthly Recurring Revenue (MRR), launch dates, and recommended AWS services. It supports both standard and Amazon Nova Premier Bedrock models for analysis.

## Core Functionality
- Generates SQL queries using AWS Bedrock (Titan or Nova Premier) to find similar historical projects
- Executes queries against Athena via Lambda to retrieve historical data
- Analyzes results using Bedrock models (standard or Nova Premier)
- Provides predictions and recommendations based on historical data analysis
- Handles robust date logic for historical project data (nanoseconds, seconds, milliseconds)

## Key Features
- Opportunity analysis based on customer name, region, close date, and description
- Prediction of ARR, MRR, launch dates, and project duration for new opportunities
- Recommendation of top AWS services for the opportunity
- Comparison with similar historical projects
- Detailed analysis summary with confidence ratings
- Support for both production and Nova Premier (test) analysis flows

## User Workflow
1. User enters opportunity details (customer, region, close date, name, description)
2. System generates SQL query using Bedrock to find similar historical projects
3. System executes query against Athena database via Lambda
4. System analyzes results using the selected Bedrock model (standard or Nova Premier)
5. System presents predictions, recommendations, and analysis to the user, including ARR, MRR, launch date, project duration, top services, and confidence