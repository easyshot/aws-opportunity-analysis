/**
 * Unit Tests for Response Parser Service
 * Purpose: Test the optimized response parser for Phase 1 optimization
 */

const ResponseParser = require("../lib/response-parser");

describe("ResponseParser", () => {
  let parser;

  beforeEach(() => {
    parser = new ResponseParser({
      enableDebug: false,
      strictMode: false,
      fallbackEnabled: true,
    });
  });

  afterEach(() => {
    parser.clearCache();
  });

  describe("parseResponse", () => {
    it("should extract all sections from well-formatted response", () => {
      const testResponse = `
===ANALYSIS_METHODOLOGY===
This is the methodology section content.

===SIMILAR_PROJECTS===
These are similar projects.

===DETAILED_FINDINGS===
These are the detailed findings.

===PREDICTION_RATIONALE===
This is the prediction rationale.

===RISK_FACTORS===
These are the risk factors.

===ARCHITECTURE_DESCRIPTION===
This is the architecture description.

===SUMMARY_METRICS===
PREDICTED_ARR: $1,500,000
MRR: $125,000
LAUNCH_DATE: 2025-07
PREDICTED_PROJECT_DURATION: 18 months
CONFIDENCE: HIGH
TOP_SERVICES:
Amazon EC2 - $5,000/month
Amazon RDS - $3,000/month

===VALIDATION_ERRORS===
No validation errors found.
`;

      const result = parser.parseResponse(testResponse);

      expect(result.sections.ANALYSIS_METHODOLOGY).toBe(
        "This is the methodology section content."
      );
      expect(result.sections.SIMILAR_PROJECTS).toBe(
        "These are similar projects."
      );
      expect(result.sections.DETAILED_FINDINGS).toBe(
        "These are the detailed findings."
      );
      expect(result.sections.PREDICTION_RATIONALE).toBe(
        "This is the prediction rationale."
      );
      expect(result.sections.RISK_FACTORS).toBe("These are the risk factors.");
      expect(result.sections.ARCHITECTURE_DESCRIPTION).toBe(
        "This is the architecture description."
      );
      expect(result.sections.SUMMARY_METRICS).toContain(
        "PREDICTED_ARR: $1,500,000"
      );
      expect(result.sections.VALIDATION_ERRORS).toBe(
        "No validation errors found."
      );

      expect(result.metrics.predictedArr).toBe("$1,500,000");
      expect(result.metrics.predictedMrr).toBe("$125,000");
      expect(result.metrics.launchDate).toBe("2025-07");
      expect(result.metrics.predictedProjectDuration).toBe("18 months");
      expect(result.metrics.confidence).toBe("HIGH");
      expect(result.metrics.topServices).toContain("Amazon EC2 - $5,000/month");

      expect(result.stats.successfulExtractions).toBe(8);
      expect(result.stats.failedExtractions).toBe(0);
      expect(result.stats.fallbackUsed).toBe(0);
    });

    it("should handle missing sections gracefully", () => {
      const testResponse = `
===ANALYSIS_METHODOLOGY===
This is the methodology section.

===SUMMARY_METRICS===
PREDICTED_ARR: $1,000,000
MRR: $83,333
CONFIDENCE: MEDIUM
`;

      const result = parser.parseResponse(testResponse);

      expect(result.sections.ANALYSIS_METHODOLOGY).toBe(
        "This is the methodology section."
      );
      expect(result.sections.SIMILAR_PROJECTS).toBe("");
      expect(result.sections.DETAILED_FINDINGS).toBe("");
      expect(result.sections.PREDICTION_RATIONALE).toBe("");
      expect(result.sections.RISK_FACTORS).toBe("");
      expect(result.sections.ARCHITECTURE_DESCRIPTION).toBe("");
      expect(result.sections.SUMMARY_METRICS).toContain(
        "PREDICTED_ARR: $1,000,000"
      );
      expect(result.sections.VALIDATION_ERRORS).toBe("");

      expect(result.stats.successfulExtractions).toBe(2);
      expect(result.stats.failedExtractions).toBe(6);
    });

    it("should handle inconsistent spacing in section headers", () => {
      const testResponse = `
=== ANALYSIS_METHODOLOGY ===
This is the methodology.

===SIMILAR_PROJECTS===
These are similar projects.

===  DETAILED_FINDINGS  ===
These are the findings.

===SUMMARY_METRICS===
PREDICTED_ARR: $2,000,000
MRR: $166,667
CONFIDENCE: HIGH
`;

      const result = parser.parseResponse(testResponse);

      expect(result.sections.ANALYSIS_METHODOLOGY).toBe(
        "This is the methodology."
      );
      expect(result.sections.SIMILAR_PROJECTS).toBe(
        "These are similar projects."
      );
      expect(result.sections.DETAILED_FINDINGS).toBe("These are the findings.");
      expect(result.sections.SUMMARY_METRICS).toContain(
        "PREDICTED_ARR: $2,000,000"
      );

      expect(result.stats.successfulExtractions).toBe(4);
    });

    it("should extract metrics correctly from SUMMARY_METRICS section", () => {
      const testResponse = `
===SUMMARY_METRICS===
PREDICTED_ARR: $3,500,000
MRR: $291,667
LAUNCH_DATE: 2025-08
PREDICTED_PROJECT_DURATION: 24 months
CONFIDENCE: HIGH
TOP_SERVICES:
Amazon EC2 - $8,000/month
Amazon RDS - $5,000/month
Amazon S3 - $1,000/month
OTHER_SERVICES: Combined|$15,000/month|$20,000 upfront
`;

      const result = parser.parseResponse(testResponse);

      expect(result.metrics.predictedArr).toBe("$3,500,000");
      expect(result.metrics.predictedMrr).toBe("$291,667");
      expect(result.metrics.launchDate).toBe("2025-08");
      expect(result.metrics.predictedProjectDuration).toBe("24 months");
      expect(result.metrics.confidence).toBe("HIGH");
      expect(result.metrics.topServices).toContain("Amazon EC2 - $8,000/month");
    });

    it("should fallback to full text for missing metrics", () => {
      const testResponse = `
===ANALYSIS_METHODOLOGY===
This is the methodology.

Some other content with PREDICTED_ARR: $1,200,000 and MRR: $100,000
LAUNCH_DATE: 2025-09
PREDICTED_PROJECT_DURATION: 12 months
CONFIDENCE: MEDIUM
`;

      const result = parser.parseResponse(testResponse);

      expect(result.metrics.predictedArr).toBe("$1,200,000");
      expect(result.metrics.predictedMrr).toBe("$100,000");
      expect(result.metrics.launchDate).toBe("2025-09");
      expect(result.metrics.predictedProjectDuration).toBe("12 months");
      expect(result.metrics.confidence).toBe("MEDIUM");
    });

    it("should cache parsed results for identical content", () => {
      const testResponse = `
===SUMMARY_METRICS===
PREDICTED_ARR: $1,000,000
MRR: $83,333
CONFIDENCE: HIGH
`;

      const result1 = parser.parseResponse(testResponse);
      const result2 = parser.parseResponse(testResponse);

      expect(result1.stats.cacheKey).toBe(result2.stats.cacheKey);
      expect(result1.metrics.predictedArr).toBe(result2.metrics.predictedArr);
    });

    it("should handle empty or invalid content", () => {
      expect(() => parser.parseResponse("")).toThrow(
        "Invalid content provided to ResponseParser"
      );
      expect(() => parser.parseResponse(null)).toThrow(
        "Invalid content provided to ResponseParser"
      );
      expect(() => parser.parseResponse(undefined)).toThrow(
        "Invalid content provided to ResponseParser"
      );
    });
  });

  describe("validateExtraction", () => {
    it("should validate successful extraction", () => {
      const testResponse = `
===SUMMARY_METRICS===
PREDICTED_ARR: $1,000,000
MRR: $83,333
CONFIDENCE: HIGH
`;

      const result = parser.parseResponse(testResponse);
      const validation = parser.validateExtraction(result);

      expect(validation.isValid).toBe(true);
      expect(validation.missingSections).toEqual([]);
      expect(validation.successRate).toBe("12%"); // 1 out of 8 sections
    });

    it("should identify missing required sections", () => {
      const testResponse = `
===ANALYSIS_METHODOLOGY===
This is the methodology.
`;

      const result = parser.parseResponse(testResponse);
      const validation = parser.validateExtraction(result);

      expect(validation.isValid).toBe(false);
      expect(validation.missingSections).toContain("SUMMARY_METRICS");
      expect(validation.successRate).toBe("12%"); // 1 out of 8 sections
    });
  });

  describe("cache management", () => {
    it("should clear cache", () => {
      const testResponse = `
===SUMMARY_METRICS===
PREDICTED_ARR: $1,000,000
`;

      parser.parseResponse(testResponse);
      expect(parser.getCacheStats().size).toBe(1);

      parser.clearCache();
      expect(parser.getCacheStats().size).toBe(0);
    });

    it("should provide cache statistics", () => {
      const stats = parser.getCacheStats();

      expect(stats).toHaveProperty("size");
      expect(stats).toHaveProperty("maxSize");
      expect(stats).toHaveProperty("hitRate");
      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(100);
    });
  });

  describe("performance", () => {
    it("should handle large responses efficiently", () => {
      const largeResponse = `
===ANALYSIS_METHODOLOGY===
${"A".repeat(10000)}

===SIMILAR_PROJECTS===
${"B".repeat(10000)}

===DETAILED_FINDINGS===
${"C".repeat(10000)}

===PREDICTION_RATIONALE===
${"D".repeat(10000)}

===RISK_FACTORS===
${"E".repeat(10000)}

===ARCHITECTURE_DESCRIPTION===
${"F".repeat(10000)}

===SUMMARY_METRICS===
PREDICTED_ARR: $5,000,000
MRR: $416,667
CONFIDENCE: HIGH

===VALIDATION_ERRORS===
${"G".repeat(10000)}
`;

      const startTime = Date.now();
      const result = parser.parseResponse(largeResponse);
      const endTime = Date.now();

      expect(result.stats.processingTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(result.stats.successfulExtractions).toBe(8);
      expect(result.metrics.predictedArr).toBe("$5,000,000");
    });
  });
});
