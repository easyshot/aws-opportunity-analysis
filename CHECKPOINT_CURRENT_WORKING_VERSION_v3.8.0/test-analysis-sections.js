const axios = require("axios");

async function testAnalysisSections() {
  console.log("🧪 Testing Analysis Sections Fix...\n");

  try {
    // Test data
    const testData = {
      CustomerName: "Test Customer",
      region: "us-east-1",
      closeDate: "2024-12-31",
      oppName: "Test Opportunity",
      oppDescription:
        "This is a test opportunity for validating the analysis sections fix.",
    };

    console.log("📤 Sending test analysis request...");
    console.log("Request data:", JSON.stringify(testData, null, 2));

    const response = await axios.post(
      "http://localhost:8123/api/analyze",
      testData,
      {
        headers: {
          "Content-Type": "application/json",
          "x-sql-query-limit": "50",
          "x-truncation-limit": "100000",
          "x-enable-truncation": "true",
        },
        timeout: 60000, // 60 second timeout
      }
    );

    console.log("\n✅ Analysis request successful!");
    console.log("Response status:", response.status);

    const result = response.data;

    // Check if the response has the expected structure
    console.log("\n📊 Response Structure Analysis:");
    console.log("- Has methodology:", !!result.methodology);
    console.log("- Has findings:", !!result.findings);
    console.log("- Has riskFactors:", !!result.riskFactors);
    console.log("- Has similarProjects:", !!result.similarProjects);
    console.log("- Has rationale:", !!result.rationale);
    console.log("- Has fullAnalysis:", !!result.fullAnalysis);

    // Display the actual content of each section
    console.log("\n🔬 Methodology:");
    console.log(result.methodology || "Not available");

    console.log("\n📊 Findings:");
    console.log(result.findings || "Not available");

    console.log("\n⚠️ Risk Factors:");
    console.log(result.riskFactors || "Not available");

    console.log("\n📈 Similar Projects:");
    console.log(result.similarProjects || "Not available");

    console.log("\n💡 Rationale:");
    console.log(result.rationale || "Not available");

    console.log("\n📋 Full Analysis (first 200 chars):");
    console.log(
      (result.fullAnalysis || "Not available").substring(0, 200) + "..."
    );

    // Test the frontend population logic
    console.log("\n🧪 Testing Frontend Population Logic:");

    // Simulate the frontend logic
    const sections = {
      methodology: result.methodology || "Methodology not available",
      findings: result.findings || "Findings not available",
      riskFactors: result.riskFactors || "Risk factors not available",
      similarProjects:
        result.similarProjects || "Similar projects not available",
      rationale: result.rationale || "Rationale not available",
    };

    console.log("Frontend would populate:");
    Object.entries(sections).forEach(([key, value]) => {
      console.log(
        `- ${key}: ${value.substring(0, 100)}${value.length > 100 ? "..." : ""}`
      );
    });

    console.log("\n✅ Test completed successfully!");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);

    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

// Run the test
testAnalysisSections();
