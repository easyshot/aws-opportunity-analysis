/**
 * Enhanced Automation: Optimized Bedrock Query Prompt (AWS SDK v3 version)
 * Purpose: Advanced SQL query generation with AWS best practices, performance optimization, and result quality enhancement
 */

const BedrockPromptManager = require("../lib/bedrock-prompt-manager");
const { bedrockRuntime } = require("../config/aws-config-v3");
const { ConverseCommand } = require("@aws-sdk/client-bedrock-runtime");
const { processAndFixQuery } = require("./fix-type-mismatch-query");

// Initialize prompt manager
const promptManager = new BedrockPromptManager();

/**
 * Main automation function with enhanced optimization
 */
exports.execute = async (params) => {
  const startTime = Date.now();
  let selectedPromptId = null;

  try {
    console.log(
      "🚀 Starting optimized Bedrock query prompt with params:",
      JSON.stringify(params)
    );

    // Step 1: Analyze opportunity characteristics for dynamic optimization
    const opportunityCharacteristics =
      analyzeOpportunityForOptimization(params);

    // Step 2: Get optimal prompt using advanced prompt management
    const { prompt, promptId, selectionReason } =
      await promptManager.getOptimalPrompt(
        "query-generation-optimized",
        opportunityCharacteristics
      );
    selectedPromptId = promptId;

    console.log(
      `📋 Selected optimized prompt ${promptId}. Reason: ${selectionReason}`
    );

    // Step 3: Prepare enhanced payload with optimization parameters
    const payload = prepareOptimizedPayload(
      params,
      prompt,
      opportunityCharacteristics
    );

    // Step 4: Invoke Bedrock with performance monitoring
    const converseResponse = await invokeBedrockWithOptimization(payload);

    // Step 5: Process results with enhanced validation
    const processedResults = processOptimizedResponse(converseResponse, params);

    // Step 6: Apply query optimizations for Athena performance
    const optimizedResults = applyAthenaOptimizations(
      processedResults,
      opportunityCharacteristics
    );

    // Step 7: Fix type mismatch issues
    const fixedResults = fixTypeMismatchIssues(optimizedResults);

    // Step 8: Record performance metrics
    const responseTime = Date.now() - startTime;
    await recordOptimizationMetrics(
      selectedPromptId,
      responseTime,
      fixedResults,
      opportunityCharacteristics
    );

    return {
      status: "success",
      processResults: fixedResults,
      promptMetadata: {
        promptId: selectedPromptId,
        selectionReason,
        responseTime,
        characteristics: opportunityCharacteristics,
        optimizations:
          "athena-performance,broader-matching,lower-threshold,type-mismatch-fix",
      },
    };
  } catch (error) {
    console.error("❌ Error in optimized Bedrock query prompt:", error);

    // Record error metrics
    if (selectedPromptId) {
      await recordErrorMetrics(selectedPromptId, error, Date.now() - startTime);
    }

    return {
      status: "error",
      message: `Error in optimized query generation: ${error.message}`,
      processResults: JSON.stringify({
        sql_query: "SELECT 'Error generating optimized query'",
      }),
    };
  }
};

/**
 * Analyze opportunity for optimization strategies
 */
function analyzeOpportunityForOptimization(params) {
  const characteristics = {
    region: params.region,
    customerName: params.CustomerName,
    opportunitySize: "medium",
    complexity: "medium",
    customerSegment: "commercial",
    dataVolume: "standard",
    optimizationLevel: "balanced",
  };

  // Analyze opportunity size and complexity
  const description = (params.oppDescription || "").toLowerCase();
  const opportunityName = (params.oppName || "").toLowerCase();

  // Size analysis
  if (
    description.includes("enterprise") ||
    description.includes("large scale") ||
    description.includes("global")
  ) {
    characteristics.opportunitySize = "enterprise";
    characteristics.customerSegment = "enterprise";
    characteristics.dataVolume = "high";
  } else if (
    description.includes("startup") ||
    description.includes("small business") ||
    description.includes("smb")
  ) {
    characteristics.opportunitySize = "smb";
    characteristics.customerSegment = "smb";
    characteristics.dataVolume = "low";
  }

  // Complexity analysis
  const complexityKeywords = [
    "migration",
    "modernization",
    "transformation",
    "legacy",
    "mainframe",
    "multi-cloud",
    "hybrid",
    "container",
    "kubernetes",
    "microservices",
    "ai",
    "machine learning",
    "analytics",
    "data lake",
    "real-time",
  ];

  const complexityScore = complexityKeywords.reduce((score, keyword) => {
    return score + (description.includes(keyword) ? 1 : 0);
  }, 0);

  if (complexityScore >= 5) {
    characteristics.complexity = "high";
    characteristics.optimizationLevel = "aggressive";
  } else if (complexityScore >= 3) {
    characteristics.complexity = "medium";
    characteristics.optimizationLevel = "balanced";
  } else {
    characteristics.complexity = "low";
    characteristics.optimizationLevel = "conservative";
  }

  // Regional optimization
  if (
    params.region &&
    (params.region.toLowerCase().includes("eu") ||
      params.region.toLowerCase().includes("europe"))
  ) {
    characteristics.regionType = "europe";
  } else if (
    params.region &&
    (params.region.toLowerCase().includes("ap") ||
      params.region.toLowerCase().includes("asia"))
  ) {
    characteristics.regionType = "apac";
  } else {
    characteristics.regionType = "americas";
  }

  console.log("🔍 Opportunity optimization characteristics:", characteristics);
  return characteristics;
}

/**
 * Prepare optimized payload with enhanced parameters
 */
function prepareOptimizedPayload(params, promptData, characteristics) {
  try {
    const modelId = promptData.variants[0].modelId;
    const userMessageTemplate =
      promptData.variants[0].templateConfiguration.chat.messages[0].content[0]
        .text;
    const systemInstructions =
      promptData.variants[0].templateConfiguration.chat.system[0].text;

    // Enhanced template variable replacement with optimization context
    const filledUserMessage = userMessageTemplate
      .replace("{{CustomerName}}", params.CustomerName || "Not specified")
      .replace("{{region}}", params.region || "Not specified")
      .replace("{{closeDate}}", params.closeDate || "Not specified")
      .replace("{{oppName}}", params.oppName || "Not specified")
      .replace("{{oppDescription}}", params.oppDescription || "Not specified")
      .replace("{{queryLimit}}", params.settings?.sqlQueryLimit || "200")
      .replace("{{industry}}", params.industry || "Not specified")
      .replace("{{customerSegment}}", params.customerSegment || "Not specified")
      .replace("{{partnerName}}", params.partnerName || "Not specified")
      .replace("{{activityFocus}}", params.activityFocus || "Not specified")
      .replace(
        "{{businessDescription}}",
        params.businessDescription || "Not specified"
      )
      .replace("{{migrationPhase}}", params.migrationPhase || "Not specified")
      .replace("{{optimizationLevel}}", characteristics.optimizationLevel)
      .replace("{{dataVolume}}", characteristics.dataVolume);

    // Enhanced system instructions with optimization guidance
    const enhancedSystemInstructions =
      systemInstructions +
      `

OPTIMIZATION GUIDANCE:
- Use relevance_score >= 15 for broader result coverage
- Include recency sorting: ORDER BY relevance_score DESC, close_date DESC
- Apply broader keyword matching patterns
- Optimize for Athena performance with CTE structure
- Ensure 150-200 results for comprehensive analysis`;

    return {
      modelId: modelId,
      system: [{ text: enhancedSystemInstructions }],
      messages: [
        {
          role: "user",
          content: [{ text: filledUserMessage }],
        },
      ],
      inferenceConfig: {
        maxTokens: 6144, // Increased for more complex queries
        temperature: 0.0,
      },
    };
  } catch (error) {
    console.error(
      "Critical error in prepareOptimizedPayload:",
      error.message,
      error.stack
    );
    throw new Error(
      "Failed to prepare optimized Bedrock payload: " + error.message
    );
  }
}

/**
 * Invoke Bedrock with optimization monitoring
 */
async function invokeBedrockWithOptimization(payload) {
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Bedrock optimization attempt ${attempt}/${maxRetries}`);

      const command = new ConverseCommand(payload);
      const response = await bedrockRuntime.send(command);

      if (attempt > 1) {
        console.log(`✅ Bedrock optimization succeeded on attempt ${attempt}`);
      }

      return response;
    } catch (error) {
      lastError = error;
      console.error(
        `❌ Bedrock optimization attempt ${attempt} failed:`,
        error.message
      );

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Retrying optimization in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `Failed to invoke Bedrock optimization after ${maxRetries} attempts: ${lastError.message}`
  );
}

/**
 * Process optimized response with enhanced validation
 */
function processOptimizedResponse(response, params) {
  console.log("🔍 Processing optimized SQL query response");

  if (
    !response ||
    !response.output ||
    !response.output.message ||
    !response.output.message.content ||
    !response.output.message.content[0] ||
    !response.output.message.content[0].text
  ) {
    console.error("Invalid Bedrock response structure for optimization");
    throw new Error(
      "Invalid or incomplete Bedrock response structure for optimized SQL query generation."
    );
  }

  const messageContentText = response.output.message.content[0].text;
  console.log(
    "📝 Extracted optimized message content:",
    messageContentText.substring(0, 500)
  );

  try {
    const parsedJson = JSON.parse(messageContentText);

    if (!parsedJson || typeof parsedJson.sql_query !== "string") {
      throw new Error("Response does not contain valid sql_query property");
    }

    // Validate optimized SQL query structure
    const sqlQuery = parsedJson.sql_query.trim();

    // Check for optimization indicators
    const hasOptimizedStructure =
      sqlQuery.includes("WITH") && sqlQuery.includes("relevance_score >= 15");
    const hasRecencySorting = sqlQuery.includes(
      "ORDER BY relevance_score DESC, close_date DESC"
    );
    const hasProperLimit =
      sqlQuery.includes("LIMIT {{queryLimit}}") ||
      sqlQuery.includes("LIMIT " + (params.settings?.sqlQueryLimit || "200"));

    console.log("🔍 Optimization validation:");
    console.log("  - Has optimized structure:", hasOptimizedStructure);
    console.log("  - Has recency sorting:", hasRecencySorting);
    console.log("  - Has proper limit:", hasProperLimit);

    if (!sqlQuery.toLowerCase().startsWith("select")) {
      console.warn("⚠️ Generated query does not start with SELECT:", sqlQuery);
    }

    // Security validation
    const dangerousPatterns = [
      ";--",
      "drop table",
      "delete from",
      "update set",
    ];
    const lowerQuery = sqlQuery.toLowerCase();
    for (const pattern of dangerousPatterns) {
      if (lowerQuery.includes(pattern)) {
        throw new Error(
          `Generated query contains potentially dangerous pattern: ${pattern}`
        );
      }
    }

    console.log(
      "✅ Optimized SQL query validation passed:",
      sqlQuery.substring(0, 200)
    );
    return JSON.stringify(parsedJson);
  } catch (error) {
    console.error(
      "❌ Error processing optimized SQL query response:",
      error.message
    );

    // Attempt fallback parsing
    const fallbackResult = attemptOptimizedFallbackParsing(messageContentText);
    if (fallbackResult) {
      return fallbackResult;
    }

    throw new Error(
      `Failed to extract valid optimized SQL query: ${error.message}`
    );
  }
}

/**
 * Apply Athena-specific optimizations
 */
function applyAthenaOptimizations(processedResults, characteristics) {
  try {
    let sqlQuery = "";

    if (typeof processedResults === "string") {
      try {
        const parsed = JSON.parse(processedResults);
        sqlQuery = parsed.sql_query || processedResults;
      } catch (e) {
        sqlQuery = processedResults;
      }
    } else if (processedResults.sql_query) {
      sqlQuery = processedResults.sql_query;
    } else {
      return processedResults;
    }

    console.log("🔧 Applying Athena optimizations...");

    // Optimization 1: Ensure proper CTE structure
    if (!sqlQuery.includes("WITH")) {
      console.log("🔧 Adding CTE structure for Athena optimization");
      sqlQuery = sqlQuery.replace(/SELECT/i, "WITH base_projects AS (\nSELECT");
      sqlQuery = sqlQuery.replace(
        /FROM parquet/i,
        "FROM parquet\n)\nSELECT * FROM base_projects"
      );
    }

    // Optimization 2: Ensure lower relevance threshold
    sqlQuery = sqlQuery.replace(
      /relevance_score >= \d+/gi,
      "relevance_score >= 15"
    );

    // Optimization 3: Add recency sorting if not present
    if (!sqlQuery.includes("close_date DESC")) {
      sqlQuery = sqlQuery.replace(
        /ORDER BY relevance_score DESC/i,
        "ORDER BY relevance_score DESC, close_date DESC"
      );
    }

    // Optimization 4: Optimize for performance based on characteristics
    if (characteristics.dataVolume === "high") {
      console.log("🔧 Applying high-volume optimizations");
      // Add date range filtering for high-volume scenarios
      if (!sqlQuery.includes("from_unixtime(close_date)")) {
        sqlQuery = sqlQuery.replace(
          /FROM parquet/i,
          "FROM parquet\nWHERE from_unixtime(close_date) > (date_parse('2024-12-31', '%Y-%m-%d') - interval '2' year)"
        );
      }
    }

    // Optimization 5: Ensure proper LIMIT clause
    if (!sqlQuery.includes("LIMIT")) {
      sqlQuery = sqlQuery.trim() + " LIMIT 200";
    }

    console.log("✅ Athena optimizations applied successfully");

    // Update the processed results
    if (typeof processedResults === "string") {
      try {
        const parsed = JSON.parse(processedResults);
        parsed.sql_query = sqlQuery;
        return JSON.stringify(parsed);
      } catch (e) {
        return JSON.stringify({ sql_query: sqlQuery });
      }
    } else if (processedResults.sql_query) {
      processedResults.sql_query = sqlQuery;
      return processedResults;
    } else {
      return JSON.stringify({ sql_query: sqlQuery });
    }
  } catch (error) {
    console.error("❌ Error applying Athena optimizations:", error);
    return processedResults;
  }
}

/**
 * Attempt optimized fallback parsing
 */
function attemptOptimizedFallbackParsing(messageContent) {
  try {
    // Look for optimized SQL query patterns
    const sqlMatch = messageContent.match(
      /WITH[\s\S]*?LIMIT[\s\S]*?(?=\n\n|\n$|$)/i
    );
    if (sqlMatch) {
      const sqlQuery = sqlMatch[0].trim();
      console.log(
        "🔄 Optimized fallback parsing extracted SQL:",
        sqlQuery.substring(0, 200)
      );
      return JSON.stringify({ sql_query: sqlQuery });
    }

    // Look for JSON-like patterns with optimization indicators
    const jsonMatch = messageContent.match(/\{[\s\S]*"sql_query"[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      if (parsed.sql_query) {
        console.log("🔄 Optimized JSON fallback parsing succeeded");
        return JSON.stringify(parsed);
      }
    }
  } catch (error) {
    console.error("❌ Optimized fallback parsing failed:", error.message);
  }

  return null;
}

/**
 * Fix type mismatch issues in the generated query
 */
function fixTypeMismatchIssues(processedResults) {
  try {
    let sqlQuery = "";

    if (typeof processedResults === "string") {
      try {
        const parsed = JSON.parse(processedResults);
        sqlQuery = parsed.sql_query || processedResults;
      } catch (e) {
        sqlQuery = processedResults;
      }
    } else if (processedResults.sql_query) {
      sqlQuery = processedResults.sql_query;
    } else {
      return processedResults;
    }

    console.log("🔧 Applying type mismatch fixes...");

    // Apply the type mismatch fix
    const fixedQuery = processAndFixQuery(sqlQuery);

    // Update the processed results with the fixed SQL
    if (typeof processedResults === "string") {
      try {
        const parsed = JSON.parse(processedResults);
        parsed.sql_query = fixedQuery;
        return JSON.stringify(parsed);
      } catch (e) {
        return JSON.stringify({ sql_query: fixedQuery });
      }
    } else if (processedResults.sql_query) {
      processedResults.sql_query = fixedQuery;
      return processedResults;
    } else {
      return JSON.stringify({ sql_query: fixedQuery });
    }
  } catch (error) {
    console.error("❌ Error fixing type mismatch issues:", error);
    return processedResults;
  }
}

/**
 * Record optimization metrics
 */
async function recordOptimizationMetrics(
  promptId,
  responseTime,
  results,
  characteristics
) {
  try {
    // Calculate optimization quality metrics
    const qualityScore = calculateOptimizationQuality(results, characteristics);

    console.log("📊 Optimization metrics recorded:");
    console.log("  - Response time:", responseTime, "ms");
    console.log("  - Quality score:", qualityScore);
    console.log("  - Optimization level:", characteristics.optimizationLevel);
    console.log("  - Data volume:", characteristics.dataVolume);

    // Store metrics for analysis
    if (!global.debugInfo) global.debugInfo = {};
    global.debugInfo.optimizationMetrics = {
      promptId,
      responseTime,
      qualityScore,
      characteristics,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Error recording optimization metrics:", error);
  }
}

/**
 * Calculate optimization quality score
 */
function calculateOptimizationQuality(results, characteristics) {
  try {
    let sqlQuery = "";

    if (typeof results === "string") {
      try {
        const parsed = JSON.parse(results);
        sqlQuery = parsed.sql_query || "";
      } catch (e) {
        sqlQuery = results;
      }
    } else if (results.sql_query) {
      sqlQuery = results.sql_query;
    }

    let score = 0;

    // Check for optimization indicators
    if (sqlQuery.includes("WITH")) score += 20;
    if (sqlQuery.includes("relevance_score >= 15")) score += 15;
    if (sqlQuery.includes("ORDER BY relevance_score DESC, close_date DESC"))
      score += 15;
    if (sqlQuery.includes("LIMIT")) score += 10;
    if (sqlQuery.includes("from_unixtime(close_date)")) score += 10;
    if (sqlQuery.length > 1000) score += 10; // Complex enough for good matching
    if (sqlQuery.includes("CASE WHEN")) score += 10; // Has scoring logic
    if (sqlQuery.includes("concat(")) score += 10; // Has text concatenation for matching

    // Bonus for characteristics alignment
    if (characteristics.optimizationLevel === "aggressive" && score > 70)
      score += 10;
    if (characteristics.dataVolume === "high" && sqlQuery.includes("interval"))
      score += 5;

    return Math.min(score, 100); // Cap at 100
  } catch (error) {
    console.error("❌ Error calculating optimization quality:", error);
    return 0;
  }
}

/**
 * Record error metrics for optimization
 */
async function recordErrorMetrics(promptId, error, responseTime) {
  try {
    console.error("📊 Optimization error metrics:");
    console.error("  - Prompt ID:", promptId);
    console.error("  - Response time:", responseTime, "ms");
    console.error("  - Error type:", error.name);
    console.error("  - Error message:", error.message);

    // Store error metrics for analysis
    if (!global.debugInfo) global.debugInfo = {};
    if (!global.debugInfo.optimizationErrors)
      global.debugInfo.optimizationErrors = [];

    global.debugInfo.optimizationErrors.push({
      promptId,
      responseTime,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error recording error metrics:", error);
  }
}

/**
 * Generate unique request ID for optimization tracking
 */
function generateOptimizationRequestId() {
  return `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
