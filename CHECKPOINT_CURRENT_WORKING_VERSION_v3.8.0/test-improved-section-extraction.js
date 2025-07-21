// Test the improved section extraction logic
console.log("🧪 Testing Improved Section Extraction Logic...\n");

// Simulate different Bedrock response formats
const mockBedrockResponses = [
  {
    name: "Standard format with === headers",
    content: `===ANALYSIS_METHODOLOGY===
This analysis was conducted using AWS Bedrock's Claude 3.5 Sonnet model with a comprehensive dataset of 155 historical project records. The methodology involved pattern recognition, similarity analysis, and predictive modeling.

===DETAILED_FINDINGS===
The analysis reveals a strong market opportunity with high confidence (85%). Key findings include: 1) Strong alignment with successful historical projects, 2) Favorable market conditions in the target region.

===PREDICTION_RATIONALE===
The prediction is based on comprehensive analysis of historical data patterns, statistical modeling, and industry benchmarks. The model identified strong correlations between project characteristics and outcomes.

===RISK_FACTORS===
Risk assessment indicates a low to medium risk profile. Primary risks include market volatility and competitive pressures, but these are mitigated by strong historical success patterns.

===SIMILAR_PROJECTS===
Found 12 comparable projects in the historical dataset with similar characteristics and successful outcomes. These projects provide strong validation for the current opportunity.`,
  },
  {
    name: "Natural language format without headers",
    content: `Analysis Methodology: This analysis was conducted using AWS Bedrock's Claude 3.5 Sonnet model with a comprehensive dataset of 155 historical project records. The methodology involved pattern recognition, similarity analysis, and predictive modeling to assess market opportunity and risk factors.

Key Findings: The analysis reveals a strong market opportunity with high confidence (85%). Key findings include: 1) Strong alignment with successful historical projects, 2) Favorable market conditions in the target region, 3) Competitive advantages in the proposed solution.

Prediction Rationale: The prediction is based on comprehensive analysis of historical data patterns, statistical modeling, and industry benchmarks. The model identified strong correlations between project characteristics and outcomes.

Risk Assessment: Risk assessment indicates a low to medium risk profile. Primary risks include market volatility and competitive pressures, but these are mitigated by strong historical success patterns.

Similar Projects: Found 12 comparable projects in the historical dataset with similar characteristics and successful outcomes. These projects provide strong validation for the current opportunity.`,
  },
  {
    name: "Mixed format with some headers",
    content: `This analysis was conducted using AWS Bedrock's Claude 3.5 Sonnet model with a comprehensive dataset of 155 historical project records. The methodology involved pattern recognition, similarity analysis, and predictive modeling.

===DETAILED_FINDINGS===
The analysis reveals a strong market opportunity with high confidence (85%). Key findings include: 1) Strong alignment with successful historical projects, 2) Favorable market conditions in the target region.

The prediction is based on comprehensive analysis of historical data patterns, statistical modeling, and industry benchmarks. The model identified strong correlations between project characteristics and outcomes.

Risk assessment indicates a low to medium risk profile. Primary risks include market volatility and competitive pressures, but these are mitigated by strong historical success patterns.

Found 12 comparable projects in the historical dataset with similar characteristics and successful outcomes. These projects provide strong validation for the current opportunity.`,
  },
];

// Test the extraction function (simplified version of the actual logic)
function testExtractSection(sectionName, messageContentText) {
  // Try multiple regex patterns to handle different formats
  const patterns = [
    // Pattern 1: Standard format with newlines
    new RegExp(
      `===\\s*${sectionName}\\s*===\\s*\\n([\\s\\S]*?)(?=\\n===|$)`,
      "im"
    ),
    // Pattern 2: Standard format without requiring newlines
    new RegExp(`===\\s*${sectionName}\\s*===([\\s\\S]*?)(?====|$)`, "im"),
    // Pattern 3: Look for section headers without === markers
    new RegExp(
      `${sectionName.replace(
        /_/g,
        "\\s*"
      )}[\\s\\S]*?\\n([\\s\\S]*?)(?=\\n[A-Z_]+\\s*:|\\n===|$)`,
      "im"
    ),
  ];

  for (let i = 0; i < patterns.length; i++) {
    const regex = patterns[i];
    const match = messageContentText.match(regex);
    if (match && match[1]) {
      const extracted = match[1].trim();
      if (extracted.length > 0) {
        return {
          success: true,
          pattern: i + 1,
          content: extracted,
          length: extracted.length,
        };
      }
    }
  }

  // Intelligent content extraction based on section type
  let extractedContent = "";

  switch (sectionName) {
    case "ANALYSIS_METHODOLOGY":
      const methodologyPatterns = [
        /(?:methodology|approach|analysis method|how.*analyzed)[\s\S]*?[:.]\s*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/im,
        /(?:analysis was conducted|analysis involved|analysis used)[\s\S]*?[:.]\s*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/im,
      ];
      for (const pattern of methodologyPatterns) {
        const match = messageContentText.match(pattern);
        if (match && match[1] && match[1].trim().length > 20) {
          extractedContent = match[1].trim();
          break;
        }
      }
      break;

    case "DETAILED_FINDINGS":
      const findingsPatterns = [
        /(?:findings|results|analysis reveals|key findings)[\s\S]*?[:.]\s*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/im,
        /(?:market opportunity|strong.*opportunity|identified.*opportunity)[\s\S]*?[:.]\s*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/im,
      ];
      for (const pattern of findingsPatterns) {
        const match = messageContentText.match(pattern);
        if (match && match[1] && match[1].trim().length > 20) {
          extractedContent = match[1].trim();
          break;
        }
      }
      break;

    case "PREDICTION_RATIONALE":
      const rationalePatterns = [
        /(?:rationale|reasoning|why.*prediction|basis.*prediction)[\s\S]*?[:.]\s*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/im,
        /(?:based on.*data|historical.*patterns|similar.*projects)[\s\S]*?[:.]\s*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/im,
      ];
      for (const pattern of rationalePatterns) {
        const match = messageContentText.match(pattern);
        if (match && match[1] && match[1].trim().length > 20) {
          extractedContent = match[1].trim();
          break;
        }
      }
      break;

    case "RISK_FACTORS":
      const riskPatterns = [
        /(?:risk factors|risks|risk assessment|potential risks)[\s\S]*?[:.]\s*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/im,
        /(?:low risk|medium risk|high risk)[\s\S]*?[:.]\s*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/im,
      ];
      for (const pattern of riskPatterns) {
        const match = messageContentText.match(pattern);
        if (match && match[1] && match[1].trim().length > 20) {
          extractedContent = match[1].trim();
          break;
        }
      }
      break;

    case "SIMILAR_PROJECTS":
      const similarPatterns = [
        /(?:similar projects|comparable projects|historical matches)[\s\S]*?[:.]\s*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/im,
        /(?:found.*projects|identified.*projects|multiple.*projects)[\s\S]*?[:.]\s*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/im,
      ];
      for (const pattern of similarPatterns) {
        const match = messageContentText.match(pattern);
        if (match && match[1] && match[1].trim().length > 20) {
          extractedContent = match[1].trim();
          break;
        }
      }
      break;
  }

  if (extractedContent) {
    return {
      success: true,
      pattern: "intelligent",
      content: extractedContent,
      length: extractedContent.length,
    };
  }

  return { success: false, content: "", length: 0 };
}

// Test each response format
mockBedrockResponses.forEach((response, index) => {
  console.log(`📋 Testing Response Format ${index + 1}: ${response.name}`);
  console.log("─".repeat(60));

  const sections = [
    "ANALYSIS_METHODOLOGY",
    "DETAILED_FINDINGS",
    "PREDICTION_RATIONALE",
    "RISK_FACTORS",
    "SIMILAR_PROJECTS",
  ];

  sections.forEach((section) => {
    const result = testExtractSection(section, response.content);
    if (result.success) {
      console.log(`✅ ${section}: ${result.pattern} (${result.length} chars)`);
      console.log(`   Preview: ${result.content.substring(0, 100)}...`);
    } else {
      console.log(`❌ ${section}: Failed to extract`);
    }
  });

  console.log("\n");
});

console.log(
  "🎯 Test completed! The improved section extraction should now handle multiple response formats."
);
