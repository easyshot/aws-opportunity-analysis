/**
 * Optimized Response Parser Service
 * Purpose: Standardized section extraction with improved parsing efficiency
 *
 * This service addresses the section parsing failures identified in Phase 1 optimization
 * by implementing a more robust and efficient parsing strategy.
 */

const crypto = require("crypto");

class ResponseParser {
  constructor(options = {}) {
    this.options = {
      enableDebug: options.enableDebug !== false,
      strictMode: options.strictMode !== false,
      fallbackEnabled: options.fallbackEnabled !== false,
      ...options,
    };

    // Pre-compiled regex patterns for better performance
    this.sectionPatterns = this.compileSectionPatterns();

    // Cache for parsed sections to avoid re-parsing
    this.parseCache = new Map();
    this.cacheSize = options.cacheSize || 100;
  }

  /**
   * Compile optimized regex patterns for section extraction
   */
  compileSectionPatterns() {
    return {
      // Primary pattern: Standard format with consistent spacing
      primary: new RegExp(
        "===\\s*([A-Z_]+)\\s*===\\s*\\n([\\s\\S]*?)(?=\\n===|$)",
        "im"
      ),

      // Secondary pattern: More flexible spacing
      secondary: new RegExp(
        "===\\s*([A-Z_]+)\\s*===([\\s\\S]*?)(?====|$)",
        "im"
      ),

      // Strict pattern: Exact match without extra spaces
      strict: new RegExp(
        `===([A-Z_]+)===\\s*\\n([\\s\\S]*?)(?=\\n===|$)`,
        "im"
      ),

      // Fallback pattern: Look for section headers anywhere
      fallback: new RegExp(
        `(${this.getSectionNames().join(
          "|"
        )})[\\s\\S]*?\\n([\\s\\S]*?)(?=\\n===|$)`,
        "im"
      ),
    };
  }

  /**
   * Get all expected section names
   */
  getSectionNames() {
    return [
      "ANALYSIS_METHODOLOGY",
      "SIMILAR_PROJECTS",
      "DETAILED_FINDINGS",
      "PREDICTION_RATIONALE",
      "RISK_FACTORS",
      "ARCHITECTURE_DESCRIPTION",
      "SUMMARY_METRICS",
      "VALIDATION_ERRORS",
    ];
  }

  /**
   * Generate cache key for response content
   */
  generateCacheKey(content) {
    return crypto.createHash("md5").update(content).digest("hex");
  }

  /**
   * Parse response content and extract all sections efficiently
   */
  parseResponse(content) {
    if (!content || typeof content !== "string") {
      throw new Error("Invalid content provided to ResponseParser");
    }

    const cacheKey = this.generateCacheKey(content);

    // Check cache first
    if (this.parseCache.has(cacheKey)) {
      if (this.options.enableDebug) {
        console.log("ResponseParser: Cache hit for content");
      }
      return this.parseCache.get(cacheKey);
    }

    if (this.options.enableDebug) {
      console.log("ResponseParser: Starting optimized section extraction");
      console.log(
        `ResponseParser: Content length: ${content.length} characters`
      );
    }

    const startTime = Date.now();
    const sections = {};
    const extractionStats = {
      totalSections: 0,
      successfulExtractions: 0,
      fallbackUsed: 0,
      failedExtractions: 0,
    };

    // Extract all sections in one pass using primary pattern
    const primaryMatches = this.extractAllSectionsPrimary(content);

    // Process each expected section
    for (const sectionName of this.getSectionNames()) {
      const normalizedName = this.normalizeSectionName(sectionName);

      // Try primary extraction first
      let sectionContent = primaryMatches[normalizedName];

      if (!sectionContent && this.options.fallbackEnabled) {
        // Try secondary patterns
        sectionContent = this.extractSectionWithFallback(content, sectionName);
        if (sectionContent) {
          extractionStats.fallbackUsed++;
        }
      }

      if (sectionContent) {
        sections[sectionName] = sectionContent.trim();
        extractionStats.successfulExtractions++;
      } else {
        sections[sectionName] = "";
        extractionStats.failedExtractions++;
      }

      extractionStats.totalSections++;
    }

    // Extract metrics from SUMMARY_METRICS section
    const metrics = this.extractMetrics(sections.SUMMARY_METRICS || content);

    const result = {
      sections,
      metrics,
      stats: {
        ...extractionStats,
        processingTime: Date.now() - startTime,
        cacheKey,
      },
    };

    // Cache the result
    this.cacheResult(cacheKey, result);

    if (this.options.enableDebug) {
      console.log("ResponseParser: Extraction completed:", {
        processingTime: result.stats.processingTime,
        successRate: `${Math.round(
          (extractionStats.successfulExtractions /
            extractionStats.totalSections) *
            100
        )}%`,
        fallbackUsage: extractionStats.fallbackUsed,
      });
    }

    return result;
  }

  /**
   * Extract all sections using primary pattern in one pass
   */
  extractAllSectionsPrimary(content) {
    const sections = {};

    // Use exec in a loop instead of matchAll for non-global regex
    const regex = this.sectionPatterns.primary;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const sectionName = match[1].toUpperCase();
      const sectionContent = match[2];
      sections[sectionName] = sectionContent;

      // Prevent infinite loop if regex doesn't advance
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }

    return sections;
  }

  /**
   * Extract single section with fallback patterns
   */
  extractSectionWithFallback(content, sectionName) {
    const patterns = [
      this.sectionPatterns.secondary,
      this.sectionPatterns.strict,
    ];

    for (const pattern of patterns) {
      const regex = new RegExp(
        pattern.source.replace("([A-Z_]+)", sectionName),
        pattern.flags
      );

      const match = content.match(regex);
      if (match && match[2]) {
        return match[2];
      }
    }

    return null;
  }

  /**
   * Normalize section name for consistent matching
   */
  normalizeSectionName(name) {
    return name.toUpperCase().replace(/[^A-Z_]/g, "");
  }

  /**
   * Extract metrics from SUMMARY_METRICS section or full content
   */
  extractMetrics(content) {
    const metrics = {};

    // ARR extraction
    const arrMatch = content.match(/PREDICTED_ARR:\s*\$?([\d,]+)/i);
    metrics.predictedArr = arrMatch ? `$${arrMatch[1]}` : null;

    // MRR extraction
    const mrrMatch = content.match(/MRR:\s*\$?([\d,]+)/i);
    metrics.predictedMrr = mrrMatch ? `$${mrrMatch[1]}` : null;

    // Launch date extraction
    const launchDateMatch = content.match(/LAUNCH_DATE:\s*([^\n]+)/i);
    metrics.launchDate = launchDateMatch ? launchDateMatch[1].trim() : null;

    // Duration extraction
    const durationMatch = content.match(
      /PREDICTED_PROJECT_DURATION:\s*([^\n]+)/i
    );
    metrics.predictedProjectDuration = durationMatch
      ? durationMatch[1].trim()
      : null;

    // Confidence extraction
    const confidenceMatch = content.match(/CONFIDENCE:\s*(HIGH|MEDIUM|LOW)/i);
    metrics.confidence = confidenceMatch
      ? confidenceMatch[1].toUpperCase()
      : null;

    // Services extraction
    const servicesMatch = content.match(
      /TOP_SERVICES:\s*([\s\S]*?)(?=OTHER_SERVICES|CONFIDENCE|===|$)/i
    );
    metrics.topServices = servicesMatch ? servicesMatch[1].trim() : null;

    return metrics;
  }

  /**
   * Cache parsing result
   */
  cacheResult(key, result) {
    // Implement LRU cache eviction
    if (this.parseCache.size >= this.cacheSize) {
      const firstKey = this.parseCache.keys().next().value;
      this.parseCache.delete(firstKey);
    }

    this.parseCache.set(key, result);
  }

  /**
   * Clear parse cache
   */
  clearCache() {
    this.parseCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.parseCache.size,
      maxSize: this.cacheSize,
      hitRate: 0, // Would need to track hits/misses for accurate rate
    };
  }

  /**
   * Validate section extraction results
   */
  validateExtraction(result) {
    const requiredSections = ["SUMMARY_METRICS"];
    const missingSections = requiredSections.filter(
      (section) =>
        !result.sections[section] || result.sections[section].length === 0
    );

    return {
      isValid: missingSections.length === 0,
      missingSections,
      successRate: `${Math.round(
        (result.stats.successfulExtractions / result.stats.totalSections) * 100
      )}%`,
    };
  }
}

module.exports = ResponseParser;
