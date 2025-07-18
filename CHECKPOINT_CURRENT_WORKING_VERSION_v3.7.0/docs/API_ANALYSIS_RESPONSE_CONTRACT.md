# Opportunity Analysis API Response Contract

## Overview
This document defines the expected structure and requirements for the Opportunity Analysis API response. It is designed to ensure consistency, maintainability, and a seamless frontend integration.

---

## Response Structure

### Success Response
```json
{
  "version": "1.0",
  "metrics": {
    "predictedArr": "string",
    "predictedMrr": "string",
    "launchDate": "string",
    "timeToLaunch": "string",
    "confidence": "string",
    "topServices": "string"
  },
  "sections": {
    "analysisMethodology": "string",
    "similarProjects": [
      {
        "projectName": "string",
        "customer": "string",
        "region": "string",
        "totalARR": "string",
        "topServices": "string"
      }
      // ...more projects
    ],
    "detailedFindings": "string",
    "predictionRationale": "string",
    "riskFactors": "string",
    "architecture": "string",
    "summaryMetrics": "string",
    "validationErrors": "string"
  },
  "query": {
    "generatedSql": "string",
    "executionResults": {}
  },
  "debug": {}
}
```

### Error Response
```json
{
  "version": "1.0",
  "error": {
    "code": "string",
    "message": "string",
    "details": "string"
  }
}
```

---

## Field Requirements
- **All fields must be present.** Use empty strings or arrays if no data is available.
- **similarProjects** must be an array of objects, not a string.
- **Use camelCase** for all keys.
- **version**: Always include a version string for future-proofing.
- **Error Handling**: On error, return the structured error object as shown above.

---

## Example Success Response
```json
{
  "version": "1.0",
  "metrics": {
    "predictedArr": "$2,122,992",
    "predictedMrr": "$156,916",
    "launchDate": "September 2025",
    "timeToLaunch": "8 months",
    "confidence": "HIGH",
    "topServices": "ec2Enhancement|$82,000/month|$25,000 upfront, ..."
  },
  "sections": {
    "analysisMethodology": "...",
    "similarProjects": [
      {
        "projectName": "Treasury Portfolio Cloud Migration",
        "customer": "Truist Financial Corp",
        "region": "United States",
        "totalARR": "$1,957,824",
        "topServices": "amazonAuroraMySQLCompatible|$1,378.52/month|$0 upfront, ..."
      }
    ],
    "detailedFindings": "...",
    "predictionRationale": "...",
    "riskFactors": "...",
    "architecture": "...",
    "summaryMetrics": "...",
    "validationErrors": ""
  },
  "query": {
    "generatedSql": "...",
    "executionResults": {}
  },
  "debug": {}
}
```

## Example Error Response
```json
{
  "version": "1.0",
  "error": {
    "code": "ANALYSIS_FAILED",
    "message": "Unable to process analysis due to missing data.",
    "details": "No historical projects found for the given criteria."
  }
}
```

---

## Versioning
- Always include a `version` field in the response.
- Increment the version for any breaking changes to the contract.

---

## Notes
- All fields should be present in every response for consistency.
- If a section is not available, return an empty string or array, not `null` or omit the field.
- This contract enables robust, maintainable, and user-friendly frontend integration. 