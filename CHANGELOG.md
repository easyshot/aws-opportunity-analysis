# AWS Opportunity Analysis Application - Changelog

## [0.3.5.0] - 2025-05-27
### Added
- Nova Premier analysis flow using Amazon Nova Premier Bedrock model
- Enhanced date logic for historical project data (nanoseconds, seconds, milliseconds)
- UI button for Nova Premier test flow
- Robust error handling and logging in automations

### Changed
- Updated prompt templates for ARR/MRR and project duration predictions
- Improved Lambda/Athena integration for SQL execution
- Refined frontend to support new metrics and confidence display

## [0.3.4.0] - 2025-05-26
### Added
- Conditional date logic for historical close dates
- TypeScript type safety in processAnalysisResults scripts

## [0.3.3.0] - 2025-05-20
### Added
- Modular automation scripts for Bedrock query and analysis
- Initial support for Bedrock prompt management via environment variables

## [0.3.0.0] - 2025-05-10
### Added
- Initial production release with standard Bedrock analysis flow
- Lambda function for Athena SQL execution
- Frontend and backend integration 