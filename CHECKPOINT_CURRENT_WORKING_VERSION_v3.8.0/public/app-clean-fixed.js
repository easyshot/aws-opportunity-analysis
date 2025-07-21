// Clean AWS Opportunity Analysis Frontend
document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const opportunityForm = document.getElementById("opportunityForm");
  const analyzeButton = document.getElementById("analyzeBtn");
  const resultsSection = document.getElementById("detailedAnalysis");
  const additionalSections = document.getElementById("additionalSections");
  const debugSection = document.getElementById("debugSection");
  const progressSection = document.getElementById("progressSection");

  // Output elements for projections
  const predictedArr = document.getElementById("predictedArr");
  const predictedMrr = document.getElementById("predictedMrr");
  const launchDate = document.getElementById("launchDate");
  const timeToLaunch = document.getElementById("timeToLaunch");
  const confidenceScore = document.getElementById("confidenceScore");
  const confidenceLabel = document.getElementById("confidenceLabel");
  const confidenceFill = document.getElementById("confidenceFill");
  const topServices = document.getElementById("topServices");
  const confidenceFactors = document.getElementById("confidenceFactors");

  // Output elements for analysis sections
  const methodology = document.getElementById("methodology");
  const findings = document.getElementById("findings");
  const rationale = document.getElementById("rationale");
  const riskFactors = document.getElementById("riskFactors");
  const similarProjects = document.getElementById("similarProjects");
  const fullAnalysis = document.getElementById("fullAnalysis");

  // Additional sections
  const fundingOptions = document.getElementById("fundingOptions");
  const followOnOpportunities = document.getElementById(
    "followOnOpportunities"
  );

  // Debug elements
  const debugSqlQuery = document.getElementById("debugSqlQuery");
  const debugQueryResults = document.getElementById("debugQueryResults");
  const debugFullResponse = document.getElementById("debugFullResponse");

  // Status elements
  const analysisStatus = document.getElementById("analysisStatus");
  const completionStatus = document.getElementById("completionStatus");
  const statusFill = document.getElementById("statusFill");
  const charCounter = document.getElementById("charCounter");

  // Initialize the application
  function initializeApp() {
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    setupEventListeners();
    updateCompletionStatus();
    initializeSoundToggle(); // Initialize sound toggle
  }

  // Update current time
  function updateCurrentTime() {
    const currentTimeElement = document.getElementById("currentTime");
    if (currentTimeElement) {
      const now = new Date();
      currentTimeElement.textContent = now.toLocaleString();
    }
  }

  // Setup event listeners
  function setupEventListeners() {
    // Character counter for description
    const descriptionField = document.getElementById("description");
    if (descriptionField) {
      descriptionField.addEventListener("input", updateCharCounter);
    }

    // Form validation
    if (opportunityForm) {
      opportunityForm.addEventListener("input", updateCompletionStatus);
    }

    // Analysis button
    if (analyzeButton) {
      analyzeButton.addEventListener("click", analyzeOpportunity);
    }

    // Clear button
    const clearBtn = document.getElementById("clearBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", clearForm);
    }

    // Sample button
    const sampleBtn = document.getElementById("sampleBtn");
    if (sampleBtn) {
      sampleBtn.addEventListener("click", loadSampleData);
    }

    // Theme toggle
    const themeToggle = document.querySelector(".theme-toggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", toggleTheme);
      console.log("✅ Theme toggle event listener attached");
    } else {
      console.log("❌ Theme toggle button not found");
    }

    // Export button
    const exportBtn = document.querySelector(".action-btn.export");
    if (exportBtn) {
      exportBtn.addEventListener("click", exportData);
    }

    // Print button
    const printBtn = document.querySelector(".action-btn.print");
    if (printBtn) {
      printBtn.addEventListener("click", printReport);
    }

    // Debug toggle
    const debugToggle = document.querySelector(".debug-toggle");
    if (debugToggle) {
      debugToggle.addEventListener("click", toggleDebugSection);
    }
  }

  // Update character counter
  function updateCharCounter() {
    const descriptionField = document.getElementById("description");
    const charCounter = document.getElementById("charCounter");
    if (descriptionField && charCounter) {
      const count = descriptionField.value.length;
      charCounter.textContent = `${count} characters`;
    }
  }

  // Update completion status
  function updateCompletionStatus() {
    if (!opportunityForm) return;

    const requiredFields = opportunityForm.querySelectorAll("[required]");
    const filledFields = Array.from(requiredFields).filter(
      (field) => field.value.trim() !== ""
    );
    const completionPercentage = Math.round(
      (filledFields.length / requiredFields.length) * 100
    );

    const statusText = document.querySelector("#completionStatus .status-text");
    if (statusText) {
      statusText.textContent = `${completionPercentage}% Complete`;
    }

    if (statusFill) {
      statusFill.style.width = `${completionPercentage}%`;
    }
  }

  // Clear UI fields
  function clearUIFields() {
    // Clear projections
    if (predictedArr) predictedArr.textContent = "-";
    if (predictedMrr) predictedMrr.textContent = "-";
    if (launchDate) launchDate.textContent = "-";
    if (timeToLaunch) timeToLaunch.textContent = "-";
    if (confidenceScore) confidenceScore.textContent = "-";
    if (confidenceLabel) confidenceLabel.textContent = "-";
    if (confidenceFill) confidenceFill.style.width = "0%";
    if (topServices) {
      topServices.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">☁️</div>
          <div class="empty-text">Service recommendations will appear after analysis</div>
        </div>
      `;
    }
    if (confidenceFactors) {
      confidenceFactors.innerHTML = `
        <div class="empty-state small">
          <div class="empty-text">Confidence factors will appear after analysis</div>
        </div>
      `;
    }

    // Clear analysis sections
    if (methodology)
      methodology.innerHTML =
        '<div class="loading-state">Analysis methodology will appear here...</div>';
    if (findings)
      findings.innerHTML =
        '<div class="loading-state">Key findings will appear here...</div>';
    if (rationale)
      rationale.innerHTML =
        '<div class="loading-state">Analysis rationale will appear here...</div>';
    if (riskFactors)
      riskFactors.innerHTML =
        '<div class="loading-state">Risk assessment will appear here...</div>';
    if (similarProjects)
      similarProjects.innerHTML =
        '<div class="loading-state">Historical matches will appear here...</div>';
    if (fullAnalysis)
      fullAnalysis.innerHTML =
        '<div class="loading-state">Complete analysis will appear here...</div>';

    // Clear additional sections
    if (fundingOptions)
      fundingOptions.innerHTML =
        '<div class="loading-state">Funding recommendations will appear here...</div>';
    if (followOnOpportunities)
      followOnOpportunities.innerHTML =
        '<div class="loading-state">Future opportunities will appear here...</div>';

    // Clear debug sections
    const debugSqlQuery = document.getElementById("debugSqlQuery");
    const debugQueryResults = document.getElementById("debugQueryResults");
    const debugBedrockPayload = document.getElementById("debugBedrockPayload");
    const debugFullResponse = document.getElementById("debugFullResponse");

    if (debugSqlQuery) debugSqlQuery.value = "";
    if (debugQueryResults) debugQueryResults.value = "";
    if (debugBedrockPayload) debugBedrockPayload.value = "";
    if (debugFullResponse) debugFullResponse.value = "";

    // Clear enhanced debug statistics
    const queryRowCount = document.getElementById("queryRowCount");
    const queryDataSize = document.getElementById("queryDataSize");
    const queryCharCount = document.getElementById("queryCharCount");
    const responseCharCount = document.getElementById("responseCharCount");
    const responseDataSize = document.getElementById("responseDataSize");

    // Clear payload debug statistics
    const payloadDataSize = document.getElementById("payloadDataSize");
    const payloadCharCount = document.getElementById("payloadCharCount");
    const payloadRowCount = document.getElementById("payloadRowCount");
    const payloadTokenEstimate = document.getElementById(
      "payloadTokenEstimate"
    );

    if (queryRowCount) queryRowCount.textContent = "-";
    if (queryDataSize) queryDataSize.textContent = "-";
    if (queryCharCount) queryCharCount.textContent = "-";
    if (responseCharCount) responseCharCount.textContent = "-";
    if (responseDataSize) responseDataSize.textContent = "-";

    if (payloadDataSize) payloadDataSize.textContent = "-";
    if (payloadCharCount) payloadCharCount.textContent = "-";
    if (payloadRowCount) payloadRowCount.textContent = "-";
    if (payloadTokenEstimate) payloadTokenEstimate.textContent = "-";

    // Clear table view
    clearQueryTable();
  }

  // Get form data
  function getFormData() {
    return {
      CustomerName:
        document.getElementById("customerName")?.value?.trim() || "",
      region: document.getElementById("region")?.value || "",
      closeDate: document.getElementById("closeDate")?.value || "",
      oppName: document.getElementById("opportunityName")?.value?.trim() || "",
      oppDescription:
        document.getElementById("description")?.value?.trim() || "",
    };
  }

  // Get analysis settings from settings manager
  function getAnalysisSettings() {
    // Default settings if settings manager is not available
    const defaultSettings = {
      sqlQueryLimit: 200,
      truncationLimit: 400000,
      enableTruncation: true,
      analysisTimeout: 180,
    };

    // Try to get settings from settings manager
    if (window.settingsManager) {
      const settings = window.settingsManager.getSettings();
      const analysisSettings = {
        sqlQueryLimit:
          settings.dataProcessing?.sqlQueryLimit ||
          defaultSettings.sqlQueryLimit,
        truncationLimit:
          settings.dataProcessing?.truncationLimit ||
          defaultSettings.truncationLimit,
        enableTruncation: settings.dataProcessing?.enableTruncation !== false,
        analysisTimeout:
          settings.performance?.analysisTimeout ||
          defaultSettings.analysisTimeout,
      };
      console.log(
        "🔧 Retrieved settings from settings manager:",
        analysisSettings
      );
      return analysisSettings;
    }

    // Fallback to localStorage if settings manager is not available
    try {
      const savedSettings = localStorage.getItem("appSettings");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        return {
          sqlQueryLimit:
            parsed.dataProcessing?.sqlQueryLimit ||
            defaultSettings.sqlQueryLimit,
          truncationLimit:
            parsed.dataProcessing?.truncationLimit ||
            defaultSettings.truncationLimit,
          enableTruncation: parsed.dataProcessing?.enableTruncation !== false,
          analysisTimeout:
            parsed.performance?.analysisTimeout ||
            defaultSettings.analysisTimeout,
        };
      }
    } catch (error) {
      console.warn("Failed to load settings from localStorage:", error);
    }

    return defaultSettings;
  }

  // Validate form data
  function validateFormData(formData) {
    const errors = [];

    if (!formData.CustomerName) errors.push("Customer Name is required");
    if (!formData.region) errors.push("Customer Region is required");
    if (!formData.closeDate) errors.push("Close Date is required");
    if (!formData.oppName) errors.push("Opportunity Name is required");
    if (!formData.oppDescription) errors.push("Description is required");

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Format currency
  function formatCurrency(amount) {
    if (!amount) return "-";
    // Remove commas before parsing
    const num = parseFloat(amount.toString().replace(/,/g, ""));
    if (isNaN(num)) return amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  }

  // Format date
  function formatDate(dateString) {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
    } catch (e) {
      return dateString;
    }
  }

  function extractSummaryMetrics(fullAnalysis) {
    // Support both ===SUMMARY_METRICS=== and ===SUMMARY METRICS===
    const summarySection =
      fullAnalysis &&
      fullAnalysis.match(/===SUMMARY[ _]METRICS===([\s\S]*?)(?:===|$)/i);
    if (!summarySection) return {};
    const section = summarySection[1];
    const metrics = {};
    metrics.predictedArr =
      (section.match(/PREDICTED_ARR:\s*\$?([\d,]+)/i) || [])[1] || "-";
    metrics.predictedMrr =
      (section.match(/MRR:\s*\$?([\d,]+)/i) || [])[1] || "-";
    metrics.launchDate =
      (section.match(/LAUNCH_DATE:\s*([^\n]+)/i) || [])[1] || "-";
    metrics.predictedProjectDuration =
      (section.match(/PREDICTED_PROJECT_DURATION:\s*([^\n]+)/i) || [])[1] ||
      "-";
    metrics.confidence =
      (section.match(/CONFIDENCE:\s*([^\n]+)/i) || [])[1] || "-";
    // Extract top services
    const services = [];
    const serviceRegex = /^([A-Za-z0-9]+)\|([^|]+)\|([^\n]+)$/gm;
    let match;
    while ((match = serviceRegex.exec(section)) !== null) {
      services.push({
        name: match[1],
        monthlyCost: match[2].trim(),
        upfrontCost: match[3].trim(),
      });
    }
    metrics.topServices = services;
    return metrics;
  }

  // Populate UI with results
  function populateUI(results) {
    try {
      console.log("Populating UI with results:", results);
      console.log("Response keys:", Object.keys(results));
      console.log("Sections available:", {
        methodology: !!results.methodology,
        findings: !!results.findings,
        rationale: !!results.rationale,
        riskFactors: !!results.riskFactors,
        similarProjects: !!results.similarProjects,
        sections: !!results.sections,
      });

      // Clear existing data
      clearUIFields();

      // Handle different response structures
      let metrics = null;
      let fullResponse = null;

      // Check if we have the new response structure
      if (results.metrics) {
        metrics = results.metrics;
      }

      if (results.fullResponse) {
        fullResponse = results.fullResponse;
      }

      // If we don't have the new structure, try to extract from the old structure
      if (!metrics && results.projections) {
        metrics = results.projections;
      }

      // If metrics is still null or empty, try to extract from fullAnalysis
      function isMetricsEmpty(metricsObj) {
        if (!metricsObj) return true;
        // Check if all expected keys are missing or empty
        const keys = [
          "predictedArr",
          "predictedMrr",
          "launchDate",
          "predictedProjectDuration",
          "confidence",
        ];
        return keys.every((k) => !metricsObj[k] || metricsObj[k] === "-");
      }
      if (
        (isMetricsEmpty(metrics) || Object.keys(metrics).length === 0) &&
        results.fullAnalysis
      ) {
        metrics = extractSummaryMetrics(results.fullAnalysis);
        console.log("Extracted metrics from fullAnalysis:", metrics);
      }

      // Populate projections from metrics
      console.log("Metrics object:", metrics);
      if (metrics) {
        console.log("Populating from metrics object");
        if (predictedArr && metrics.predictedArr) {
          predictedArr.textContent = formatCurrency(metrics.predictedArr);
          console.log(
            "After update - predictedArr:",
            predictedArr.textContent,
            "from value:",
            metrics.predictedArr
          );
        }
        if (predictedMrr && metrics.predictedMrr) {
          predictedMrr.textContent = formatCurrency(metrics.predictedMrr);
          console.log("Set predictedMrr to:", metrics.predictedMrr);
        }
        if (launchDate && metrics.launchDate) {
          launchDate.textContent = formatDate(metrics.launchDate);
          console.log("Set launchDate to:", metrics.launchDate);
        }
        if (timeToLaunch && metrics.timeToLaunch) {
          timeToLaunch.textContent = metrics.timeToLaunch;
          console.log("Set timeToLaunch to:", metrics.timeToLaunch);
        } else if (timeToLaunch && metrics.predictedProjectDuration) {
          const duration = metrics.predictedProjectDuration.replace(
            /\s*months?\s*$/i,
            ""
          );
          timeToLaunch.textContent = duration;
          console.log(
            "Set timeToLaunch to:",
            duration + " (from:",
            metrics.predictedProjectDuration + ")"
          );
        }
        if (
          confidenceScore &&
          (metrics.confidence || metrics.confidenceScore)
        ) {
          const scoreValue = metrics.confidenceScore || metrics.confidence;
          confidenceScore.textContent =
            typeof scoreValue === "number" ? scoreValue : metrics.confidence;
          console.log("Set confidence to:", scoreValue);
        }
        if (
          confidenceLabel &&
          (metrics.confidence || metrics.confidenceScore)
        ) {
          const confValue = metrics.confidence || metrics.confidenceScore;
          confidenceLabel.textContent = getConfidenceLabel(confValue);
          console.log("Set confidenceLabel to:", getConfidenceLabel(confValue));
        }
        if (confidenceFill && (metrics.confidence || metrics.confidenceScore)) {
          const confValue = metrics.confidence || metrics.confidenceScore;
          const percentage = getConfidencePercentage(confValue);
          confidenceFill.style.width = `${percentage}%`;
          console.log("Set confidenceFill to:", percentage + "%");
        }
        if (topServices && metrics.topServices) {
          topServices.innerHTML = formatServicesList(metrics.topServices);
          console.log("Set topServices to:", metrics.topServices);
        }
      } else {
        console.log(
          "No metrics object found. Projections will not be populated."
        );
      }

      // FIXED: Prioritize individual section fields from backend response
      // The backend is returning individual section fields, so use those directly
      if (methodology && results.methodology) {
        methodology.innerHTML = formatSectionContent(results.methodology);
        console.log("✅ Methodology populated from backend field");
      }

      if (findings && results.findings) {
        findings.innerHTML = formatSectionContent(results.findings);
        console.log("✅ Findings populated from backend field");
      }

      if (rationale && results.rationale) {
        rationale.innerHTML = formatSectionContent(results.rationale);
        console.log("✅ Rationale populated from backend field");
      }

      if (riskFactors && results.riskFactors) {
        riskFactors.innerHTML = formatSectionContent(results.riskFactors);
        console.log("✅ Risk factors populated from backend field");
      }

      if (similarProjects && results.similarProjects) {
        similarProjects.innerHTML = formatSectionContent(
          results.similarProjects
        );
        console.log("✅ Similar projects populated from backend field");
      }

      // Populate full analysis section
      if (fullAnalysis) {
        const fullAnalysisContent =
          results.fullAnalysis ||
          results.formattedSummaryText ||
          "Full analysis not available";
        fullAnalysis.innerHTML = formatSectionContent(fullAnalysisContent);
        console.log("✅ Full analysis section populated");
      }

      // Populate debug sections
      if (debugFullResponse) {
        const debugContent =
          results.fullAnalysis ||
          results.formattedSummaryText ||
          results.debug?.fullResponse ||
          "No debug content available";
        debugFullResponse.value = debugContent;
        console.log("✅ Debug full response populated");
      }

      // Fallback: If individual sections are not available, try to extract from fullAnalysis
      if (
        results.fullAnalysis &&
        (!results.methodology || results.methodology.includes("not available"))
      ) {
        console.log("Parsing sections from fullAnalysis field as fallback");
        const sections = extractSections(results.fullAnalysis);

        if (methodology && sections.methodology && !results.methodology) {
          methodology.innerHTML = formatSectionContent(sections.methodology);
          console.log("✅ Methodology extracted from fullAnalysis (fallback)");
        }

        if (findings && sections.findings && !results.findings) {
          findings.innerHTML = formatSectionContent(sections.findings);
          console.log("✅ Findings extracted from fullAnalysis (fallback)");
        }

        if (rationale && sections.rationale && !results.rationale) {
          rationale.innerHTML = formatSectionContent(sections.rationale);
          console.log("✅ Rationale extracted from fullAnalysis (fallback)");
        }

        if (riskFactors && sections.riskFactors && !results.riskFactors) {
          riskFactors.innerHTML = formatSectionContent(sections.riskFactors);
          console.log("✅ Risk factors extracted from fullAnalysis (fallback)");
        }

        if (
          similarProjects &&
          sections.similarProjects &&
          !results.similarProjects
        ) {
          similarProjects.innerHTML = formatSectionContent(
            sections.similarProjects
          );
          console.log(
            "✅ Similar projects extracted from fullAnalysis (fallback)"
          );
        }
      }

      // Populate additional sections
      if (fundingOptions) {
        const fundingContent =
          results.fundingOptions || "Funding options analysis not available";
        fundingOptions.innerHTML = formatSectionContent(fundingContent);
        console.log("✅ Funding options section populated");
      }

      if (followOnOpportunities) {
        const followOnContent =
          results.followOnOpportunities ||
          "Follow-on opportunities analysis not available";
        followOnOpportunities.innerHTML = formatSectionContent(followOnContent);
        console.log("✅ Follow-on opportunities section populated");
      }

      // Show the detailed analysis section
      if (resultsSection) {
        resultsSection.style.display = "block";
        console.log("✅ Detailed analysis section shown");
      }

      // Show additional sections
      if (additionalSections) {
        additionalSections.style.display = "block";
        console.log("✅ Additional sections shown");
      }

      // Show debug section
      const debugSection = document.getElementById("debugSection");
      if (debugSection) {
        debugSection.style.display = "block";
        console.log("✅ Debug section shown");
      }

      // Populate debug information
      populateDebugInfo(results);

      // Debug: Log final UI values
      console.log("Final UI values after population:", {
        predictedArr: predictedArr?.textContent,
        predictedMrr: predictedMrr?.textContent,
        launchDate: launchDate?.textContent,
        timeToLaunch: timeToLaunch?.textContent,
        confidenceScore: confidenceScore?.textContent,
        confidenceLabel: confidenceLabel?.textContent,
      });

      // Update analysis status
      if (analysisStatus) {
        const statusText = analysisStatus.querySelector(".status-text");
        if (statusText) {
          statusText.textContent = "Complete";
        }
        const statusDot = analysisStatus.querySelector(".status-dot");
        if (statusDot) {
          statusDot.className = "status-dot complete";
        }
      }
    } catch (error) {
      console.error("Error populating UI:", error);
      showError("Error displaying results: " + error.message);
    }
  }

  // Extract sections from full response
  function extractSections(text) {
    const sections = {};

    const sectionPatterns = {
      methodology: /===ANALYSIS[_\s]METHODOLOGY===\s*\n([\s\S]*?)(?=\n===|$)/i,
      findings: /===DETAILED[_\s]FINDINGS===\s*\n([\s\S]*?)(?=\n===|$)/i,
      rationale: /===PREDICTION[_\s]RATIONALE===\s*\n([\s\S]*?)(?=\n===|$)/i,
      riskFactors: /===RISK[_\s]FACTORS===\s*\n([\s\S]*?)(?=\n===|$)/i,
      similarProjects: /===SIMILAR[_\s]PROJECTS===\s*\n([\s\S]*?)(?=\n===|$)/i,
    };

    for (const [key, pattern] of Object.entries(sectionPatterns)) {
      const match = text.match(pattern);
      if (match) {
        sections[key] = match[1].trim();
      }
    }

    return sections;
  }

  // Format section content
  function formatSectionContent(content) {
    if (!content) return '<div class="empty-state">No content available</div>';

    // Handle methodology object structure
    if (typeof content === "object" && content.analysisApproach) {
      let html = '<div class="methodology-content">';
      html += `<h4>Analysis Approach</h4>`;
      html += `<p>${content.analysisApproach.summary}</p>`;
      if (
        content.analysisApproach.steps &&
        content.analysisApproach.steps.length > 0
      ) {
        html += "<h5>Analysis Steps:</h5><ol>";
        content.analysisApproach.steps.forEach((step) => {
          html += `<li>${step}</li>`;
        });
        html += "</ol>";
      }
      html += "</div>";
      return html;
    }

    // Ensure content is a string
    if (typeof content !== "string") {
      if (typeof content === "object") {
        content = JSON.stringify(content, null, 2);
      } else {
        content = String(content);
      }
    }

    // Convert markdown-like formatting to HTML
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>");

    return `<p>${formatted}</p>`;
  }

  // Format services list
  function formatServicesList(services) {
    if (!services || (Array.isArray(services) && services.length === 0)) {
      return '<div class="empty-state">No AWS services available</div>';
    }
    // If services is a string, parse it into array of objects
    let parsedServices = [];
    if (typeof services === "string") {
      // Split by newlines, filter out empty lines
      const lines = services
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      lines.forEach((line) => {
        // Ignore OTHER_SERVICES and Combined rows
        if (/OTHER_SERVICES|Combined/i.test(line)) return;
        const match = line.match(
          /^([^|]+)\|\$?([\d,]+)\/month\|\$?([\d,]+) upfront$/
        );
        if (match) {
          parsedServices.push({
            name: match[1].trim(),
            monthlyCost: `$${match[2].replace(/,/g, "")}`,
            upfrontCost: `$${match[3].replace(/,/g, "")}`,
          });
        }
      });
    } else if (Array.isArray(services)) {
      parsedServices = services.filter(
        (s) => s.name && !/OTHER_SERVICES|Combined/i.test(s.name)
      );
    }
    if (parsedServices.length === 0) {
      return '<div class="empty-state">No AWS services available</div>';
    }
    // Render as a clean table
    return `
      <table class="services-table">
        <thead>
          <tr><th>Service</th><th>Monthly Cost</th><th>Upfront Cost</th></tr>
        </thead>
        <tbody>
          ${parsedServices
            .map(
              (s) => `
            <tr>
              <td>${escapeHtml(s.name)}</td>
              <td>${escapeHtml(s.monthlyCost)}</td>
              <td>${escapeHtml(s.upfrontCost)}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  // Populate debug information with enhanced data points
  function populateDebugInfo(results) {
    console.log(
      "Enhanced Debug: Populating debug information with enhanced accuracy features..."
    );
    console.log("Debug info received:", results.debug);
    console.log("Full results object keys:", Object.keys(results));

    const debugSqlQuery = document.getElementById("debugSqlQuery");
    const debugQueryResults = document.getElementById("debugQueryResults");
    const debugBedrockPayload = document.getElementById("debugBedrockPayload");
    const debugFullResponse = document.getElementById("debugFullResponse");

    let queryResults = "";
    let bedrockPayload = "";

    if (debugSqlQuery) {
      const sqlQuery =
        results.debug?.sqlQuery || "No SQL query found in response";
      debugSqlQuery.value = sqlQuery;
      console.log("SQL Query length:", sqlQuery.length);
    }

    if (debugQueryResults) {
      queryResults =
        results.debug?.queryResults || "No query results found in response";
      debugQueryResults.value = queryResults;
      console.log("Query Results length:", queryResults.length);

      // Update enhanced debug info for query results
      updateQueryDebugInfo(queryResults, results.debug);
    }

    if (debugBedrockPayload) {
      // Use analysisBedrockPayload for the analysis generation payload, not the SQL generation payload
      bedrockPayload =
        results.debug?.analysisBedrockPayload ||
        results.debug?.bedrockPayload ||
        "No Bedrock payload found in response";
      debugBedrockPayload.value = bedrockPayload;
      console.log("Analysis Bedrock Payload length:", bedrockPayload.length);

      // Update enhanced debug info for payload
      updatePayloadDebugInfo(bedrockPayload, queryResults);
    }

    if (debugFullResponse) {
      const fullResponse =
        results.debug?.fullResponse || "No full response found in response";
      debugFullResponse.value = fullResponse;
      console.log("Full Response length:", fullResponse.length);

      // Update response debug info
      updateResponseDebugInfo(fullResponse);
    }

    // Update enhanced Bedrock debug sections
    if (typeof updateBedrockDebugInfoEnhanced === "function") {
      console.log("Enhanced Debug: Using enhanced debug functions");
      updateBedrockDebugInfoEnhanced(results.debug || {});
    } else {
      console.log("Enhanced Debug: Using fallback debug functions");
      updateBedrockDebugInfo(results.debug || {});
    }

    // Check for truncation information
    if (results.debug?.truncated) {
      showTruncationNotification(
        results.debug.truncationReason ||
          "Data was truncated due to size limits"
      );
    } else {
      hideTruncationNotification();
    }

    // Show fallback mode notification if applicable
    if (results.fallbackMode) {
      showFallbackNotification(
        results.debug?.fallbackReason ||
          "Using fallback analysis due to service limitations"
      );
    }
  }

  // Update Bedrock debug information sections
  function updateBedrockDebugInfo(debugInfo) {
    // Update SQL Generation Process
    updateSqlGenerationDebug(debugInfo);

    // Update Analysis Generation Process
    updateAnalysisGenerationDebug(debugInfo);
  }

  // Update element helper function
  function updateElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value || "-";
    }
  }

  // Update SQL Generation Debug Section
  function updateSqlGenerationDebug(debugInfo) {
    // Extract SQL generation info from debug data
    const sqlInfo = extractSqlGenerationInfo(debugInfo);

    // Update SQL generation stats
    updateElement("sqlModelId", sqlInfo.modelId);
    updateElement("sqlPromptId", sqlInfo.promptId);
    updateElement("sqlTemperature", sqlInfo.temperature);
    updateElement("sqlMaxTokens", sqlInfo.maxTokens);

    // Update process status
    updateProcessStatus("sqlTemplateStatus", sqlInfo.templateStatus);
    updateProcessStatus("sqlBedrockStatus", sqlInfo.bedrockStatus);
    updateProcessStatus("sqlRowLimitStatus", sqlInfo.rowLimitStatus);

    // Update SQL generation textarea
    const debugSqlGeneration = document.getElementById("debugSqlGeneration");
    if (debugSqlGeneration) {
      debugSqlGeneration.value = formatSqlGenerationLog(sqlInfo);
    }
  }

  // Update Analysis Generation Debug Section
  function updateAnalysisGenerationDebug(debugInfo) {
    // Extract analysis generation info from debug data
    const analysisInfo = extractAnalysisGenerationInfo(debugInfo);

    // Update analysis generation stats
    updateElement("analysisModelId", analysisInfo.modelId);
    updateElement("analysisPayloadSize", analysisInfo.payloadSize);
    updateElement("analysisTokenEstimate", analysisInfo.tokenEstimate);
    updateElement("analysisDuration", analysisInfo.duration);

    // Update risk assessment if available
    if (analysisInfo.riskAssessment) {
      updateRiskAssessment(analysisInfo.riskAssessment);
      document.getElementById("analysisRiskAssessment").style.display = "block";
    }

    // Update analysis generation textarea
    const debugAnalysisGeneration = document.getElementById(
      "debugAnalysisGeneration"
    );
    if (debugAnalysisGeneration) {
      debugAnalysisGeneration.value = formatAnalysisGenerationLog(analysisInfo);
    }
  }

  // Extract SQL generation information from debug data
  function extractSqlGenerationInfo(debugInfo) {
    const sqlQuery = debugInfo?.sqlQuery || "";
    const bedrockPayload = debugInfo?.bedrockPayload || "";

    // Try to parse Bedrock payload to extract model info
    let modelId = "Unknown";
    let temperature = "0.0";
    let maxTokens = "4096";

    try {
      if (
        bedrockPayload &&
        bedrockPayload !== "Bedrock payload not captured (permission denied)"
      ) {
        const payload = JSON.parse(bedrockPayload);
        modelId = payload.modelId || "Unknown";
        temperature = payload.inferenceConfig?.temperature?.toString() || "0.0";
        maxTokens = payload.inferenceConfig?.maxTokens?.toString() || "4096";
      }
    } catch (error) {
      console.warn(
        "Could not parse Bedrock payload for SQL generation info:",
        error
      );
    }

    return {
      modelId: modelId.includes("claude") ? "Claude 3.5 Sonnet" : modelId,
      promptId: "Y6T66EI3GZ", // From environment
      temperature: temperature,
      maxTokens: maxTokens,
      templateStatus: sqlQuery ? "completed" : "pending",
      bedrockStatus: sqlQuery ? "completed" : "pending",
      rowLimitStatus: sqlQuery.includes("LIMIT") ? "completed" : "pending",
      rawPayload: bedrockPayload,
      sqlQuery: sqlQuery,
    };
  }

  // Extract analysis generation information from debug data
  function extractAnalysisGenerationInfo(debugInfo) {
    const bedrockPayload =
      debugInfo?.analysisBedrockPayload || debugInfo?.bedrockPayload || "";
    const fullResponse = debugInfo?.fullResponse || "";

    let modelId = "Unknown";
    let payloadSize = "0 B";
    let tokenEstimate = "0";
    let duration = "0ms";
    let riskAssessment = null;

    try {
      if (
        bedrockPayload &&
        bedrockPayload !== "Bedrock payload not captured (permission denied)"
      ) {
        const payload = JSON.parse(bedrockPayload);
        modelId = payload.modelId || "Unknown";

        // Calculate payload size
        const sizeBytes = new Blob([bedrockPayload]).size;
        payloadSize = formatBytes(sizeBytes);

        // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
        tokenEstimate = Math.round(bedrockPayload.length / 4).toLocaleString();

        // Mock risk assessment based on size
        riskAssessment = {
          payloadSizeRisk:
            sizeBytes > 900000 ? "high" : sizeBytes > 500000 ? "medium" : "low",
          tokenCountRisk:
            bedrockPayload.length / 4 > 150000
              ? "high"
              : bedrockPayload.length / 4 > 100000
              ? "medium"
              : "low",
          durationRisk: "low", // We don't have actual duration data
        };
      }
    } catch (error) {
      console.warn(
        "Could not parse Bedrock payload for analysis generation info:",
        error
      );
    }

    return {
      modelId: modelId.includes("claude") ? "Claude 3.5 Sonnet" : modelId,
      payloadSize: payloadSize,
      tokenEstimate: tokenEstimate,
      duration: duration,
      riskAssessment: riskAssessment,
      rawPayload: bedrockPayload,
      fullResponse: fullResponse,
    };
  }

  // Update process status with appropriate styling
  function updateProcessStatus(elementId, status) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = status;
      element.className = `step-status ${status}`;
    }
  }

  // Update risk assessment display
  function updateRiskAssessment(riskAssessment) {
    updateRiskValue("payloadSizeRisk", riskAssessment.payloadSizeRisk);
    updateRiskValue("tokenCountRisk", riskAssessment.tokenCountRisk);
    updateRiskValue("durationRisk", riskAssessment.durationRisk);
  }

  // Update individual risk value with appropriate styling
  function updateRiskValue(elementId, riskLevel) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = riskLevel.toUpperCase();
      element.className = `risk-value ${riskLevel}`;
    }
  }

  // Format SQL generation log for display
  function formatSqlGenerationLog(sqlInfo) {
    return `🤖 SQL QUERY GENERATION PROCESS
${"=".repeat(50)}

📋 MODEL CONFIGURATION:
   Model ID: ${sqlInfo.modelId}
   Prompt ID: ${sqlInfo.promptId}
   Temperature: ${sqlInfo.temperature}
   Max Tokens: ${sqlInfo.maxTokens}
   Purpose: SQL Query Generation

📝 TEMPLATE PROCESSING:
   Status: ${sqlInfo.templateStatus.toUpperCase()}
   Variables: CustomerName, region, closeDate, oppName, oppDescription, queryLimit

🤖 BEDROCK INVOCATION:
   Status: ${sqlInfo.bedrockStatus.toUpperCase()}
   Response: ${
     sqlInfo.sqlQuery
       ? "SQL query generated successfully"
       : "No response received"
   }

⚙️ ROW LIMIT APPLICATION:
   Status: ${sqlInfo.rowLimitStatus.toUpperCase()}
   Applied: ${sqlInfo.sqlQuery.includes("LIMIT") ? "Yes" : "No"}

📊 GENERATED SQL QUERY:
${
  sqlInfo.sqlQuery
    ? sqlInfo.sqlQuery.substring(0, 500) +
      (sqlInfo.sqlQuery.length > 500 ? "..." : "")
    : "No SQL query generated"
}`;
  }

  // Format analysis generation log for display
  function formatAnalysisGenerationLog(analysisInfo) {
    return `🧠 ANALYSIS GENERATION PROCESS
${"=".repeat(50)}

📋 MODEL CONFIGURATION:
   Model ID: ${analysisInfo.modelId}
   Payload Size: ${analysisInfo.payloadSize}
   Token Estimate: ${analysisInfo.tokenEstimate}
   Duration: ${analysisInfo.duration}

📏 PAYLOAD ANALYSIS:
   Size Risk: ${
     analysisInfo.riskAssessment?.payloadSizeRisk?.toUpperCase() || "UNKNOWN"
   }
   Token Risk: ${
     analysisInfo.riskAssessment?.tokenCountRisk?.toUpperCase() || "UNKNOWN"
   }
   Duration Risk: ${
     analysisInfo.riskAssessment?.durationRisk?.toUpperCase() || "UNKNOWN"
   }

🧠 ANALYSIS RESPONSE:
${
  analysisInfo.fullResponse
    ? analysisInfo.fullResponse.substring(0, 500) +
      (analysisInfo.fullResponse.length > 500 ? "..." : "")
    : "No analysis response received"
}`;
  }

  // Get confidence label
  function getConfidenceLabel(confidence) {
    // Handle string confidence levels
    if (typeof confidence === "string") {
      const upperConfidence = confidence.toUpperCase();
      if (upperConfidence === "HIGH") return "High";
      if (upperConfidence === "MEDIUM") return "Medium";
      if (upperConfidence === "LOW") return "Low";
      if (upperConfidence === "VERY LOW") return "Very Low";
    }

    // Handle numeric confidence levels
    const confidenceNum = parseInt(confidence);
    if (confidenceNum >= 80) return "High";
    if (confidenceNum >= 60) return "Medium";
    if (confidenceNum >= 40) return "Low";
    return "Very Low";
  }

  // Get confidence percentage
  function getConfidencePercentage(confidence) {
    // Handle string confidence levels
    if (typeof confidence === "string") {
      const upperConfidence = confidence.toUpperCase();
      if (upperConfidence === "HIGH") return 85;
      if (upperConfidence === "MEDIUM") return 65;
      if (upperConfidence === "LOW") return 45;
      if (upperConfidence === "VERY LOW") return 25;
    }

    // Handle numeric confidence levels
    const confidenceNum = parseInt(confidence);
    return Math.min(Math.max(confidenceNum, 0), 100);
  }

  // Show error message
  function showError(message) {
    console.error("Error:", message);

    // Create error notification
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-notification";
    errorDiv.innerHTML = `
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <span class="error-message">${message}</span>
        <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    document.body.appendChild(errorDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentElement) {
        errorDiv.remove();
      }
    }, 5000);
  }

  // Show loading state
  function showLoading() {
    if (analyzeButton) {
      analyzeButton.disabled = true;
      analyzeButton.innerHTML =
        '<span class="btn-icon">⏳</span><span class="btn-text">Analyzing...</span>';
    }

    if (analysisStatus) {
      const statusText = analysisStatus.querySelector(".status-text");
      if (statusText) {
        statusText.textContent = "Analyzing...";
      }
      const statusDot = analysisStatus.querySelector(".status-dot");
      if (statusDot) {
        statusDot.className = "status-dot loading";
      }
    }
  }

  // Hide loading state
  function hideLoading() {
    if (analyzeButton) {
      analyzeButton.disabled = false;
      analyzeButton.innerHTML =
        '<span class="btn-icon">🔍</span><span class="btn-text">Analyze Opportunity</span>';
    }

    if (analysisStatus) {
      const statusText = analysisStatus.querySelector(".status-text");
      if (statusText) {
        statusText.textContent = "Ready";
      }
      const statusDot = analysisStatus.querySelector(".status-dot");
      if (statusDot) {
        statusDot.className = "status-dot";
      }
    }
  }

  // Progress tracking functions
  function showProgress() {
    console.log("showProgress called");
    const progressSection = document.getElementById("progressSection");
    console.log("progressSection element:", progressSection);
    if (progressSection) {
      progressSection.style.display = "block";
      console.log("Progress section display set to block");
      resetProgressSteps();
      updateProgressTime("Starting analysis...");
    } else {
      console.error("Progress section not found!");
    }
  }

  function hideProgress() {
    const progressSection = document.getElementById("progressSection");
    if (progressSection) {
      setTimeout(() => {
        progressSection.style.display = "none";
      }, 2000); // Keep visible for 2 seconds after completion
    }
  }

  function resetProgressSteps() {
    for (let i = 1; i <= 4; i++) {
      const step = document.getElementById(`step${i}`);
      if (step) {
        step.classList.remove("active", "completed");
        const spinner = step.querySelector(".step-spinner");
        const check = step.querySelector(".step-check");

        if (spinner) spinner.style.display = "none";
        if (check) check.style.display = "none";
      }
    }

    const progressFill = document.getElementById("progressFill");
    if (progressFill) {
      progressFill.style.width = "0%";
    }
  }

  function updateProgressStep(stepNumber, status = "active") {
    const step = document.getElementById(`step${stepNumber}`);
    if (!step) return;

    const spinner = step.querySelector(".step-spinner");
    const check = step.querySelector(".step-check");

    // Remove previous states
    step.classList.remove("active", "completed");

    if (status === "active") {
      step.classList.add("active", "animate-in");
      if (spinner) spinner.style.display = "block";
      if (check) check.style.display = "none";
    } else if (status === "completed") {
      step.classList.add("completed");
      if (spinner) spinner.style.display = "none";
      if (check) check.style.display = "block";
    }

    // Update progress bar
    const progressFill = document.getElementById("progressFill");
    if (progressFill) {
      const percentage = (stepNumber / 4) * 100;
      progressFill.style.width = `${percentage}%`;
    }
  }

  function updateProgressTime(message) {
    const progressTime = document.getElementById("progressTime");
    if (progressTime) {
      const now = new Date();
      const timeString = now.toLocaleTimeString();
      progressTime.textContent = `${timeString} - ${message}`;
    }
  }

  // Enhanced debug information functions
  function updateQueryDebugInfo(queryResults, debugInfo = {}) {
    try {
      let rowCount = 0;
      let dataSize = 0;
      let charCount = 0;

      if (
        queryResults &&
        queryResults !== "No query results found in response"
      ) {
        charCount = queryResults.length;
        dataSize = new Blob([queryResults]).size;

        // Use backend-calculated row count if available, otherwise parse
        if (debugInfo.queryRowCount && debugInfo.queryRowCount !== "-") {
          rowCount = parseInt(debugInfo.queryRowCount) || 0;
        } else {
          // Try to parse as JSON to count rows
          try {
            const parsed = JSON.parse(queryResults);
            if (Array.isArray(parsed)) {
              rowCount = parsed.length;
            } else if (parsed && typeof parsed === "object") {
              // If it's an object, check for common array properties
              if (parsed.results && Array.isArray(parsed.results)) {
                rowCount = parsed.results.length;
              } else if (parsed.data && Array.isArray(parsed.data)) {
                rowCount = parsed.data.length;
              } else {
                rowCount = 1; // Single object
              }
            }
          } catch (e) {
            // If not JSON, try to count lines
            rowCount = queryResults
              .split("\n")
              .filter((line) => line.trim()).length;
          }
        }
      }

      // Update UI elements
      const queryRowCount = document.getElementById("queryRowCount");
      const queryDataSize = document.getElementById("queryDataSize");
      const queryCharCount = document.getElementById("queryCharCount");

      if (queryRowCount) queryRowCount.textContent = rowCount.toLocaleString();
      if (queryDataSize) queryDataSize.textContent = formatBytes(dataSize);
      if (queryCharCount)
        queryCharCount.textContent = charCount.toLocaleString();

      // Generate table view if we have query results
      if (
        queryResults &&
        queryResults !== "No query results found in response"
      ) {
        try {
          const parsed = JSON.parse(queryResults);
          if (parsed && parsed.Rows && Array.isArray(parsed.Rows)) {
            generateQueryTable(parsed);
          } else {
            clearQueryTable();
          }
        } catch (e) {
          clearQueryTable();
        }
      } else {
        clearQueryTable();
      }
    } catch (error) {
      console.error("Error updating query debug info:", error);
    }
  }

  function updatePayloadDebugInfo(payload, queryResults) {
    try {
      let dataSize = 0;
      let charCount = 0;
      let rowCount = 0;
      let tokenEstimate = 0;

      if (payload) {
        charCount = payload.length;
        dataSize = new Blob([payload]).size;

        // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
        tokenEstimate = Math.ceil(charCount / 4);

        // Extract row count from query results if available
        if (queryResults) {
          try {
            const parsed = JSON.parse(queryResults);
            if (Array.isArray(parsed)) {
              rowCount = parsed.length;
            } else if (
              parsed &&
              parsed.results &&
              Array.isArray(parsed.results)
            ) {
              rowCount = parsed.results.length;
            }
          } catch (e) {
            // Fallback to line counting
            rowCount = queryResults
              .split("\n")
              .filter((line) => line.trim()).length;
          }
        }
      }

      // Update UI elements
      const payloadDataSize = document.getElementById("payloadDataSize");
      const payloadCharCount = document.getElementById("payloadCharCount");
      const payloadRowCount = document.getElementById("payloadRowCount");
      const payloadTokenEstimate = document.getElementById(
        "payloadTokenEstimate"
      );

      if (payloadDataSize) payloadDataSize.textContent = formatBytes(dataSize);
      if (payloadCharCount)
        payloadCharCount.textContent = charCount.toLocaleString();
      if (payloadRowCount)
        payloadRowCount.textContent = rowCount.toLocaleString();
      if (payloadTokenEstimate)
        payloadTokenEstimate.textContent = tokenEstimate.toLocaleString();
    } catch (error) {
      console.error("Error updating payload debug info:", error);
    }
  }

  function updateResponseDebugInfo(response) {
    try {
      let charCount = 0;
      let dataSize = 0;

      if (response) {
        charCount = response.length;
        dataSize = new Blob([response]).size;
      }

      // Update UI elements
      const responseCharCount = document.getElementById("responseCharCount");
      const responseDataSize = document.getElementById("responseDataSize");

      if (responseCharCount)
        responseCharCount.textContent = charCount.toLocaleString();
      if (responseDataSize)
        responseDataSize.textContent = formatBytes(dataSize);
    } catch (error) {
      console.error("Error updating response debug info:", error);
    }
  }

  function showTruncationNotification(reason) {
    const truncationStatus = document.getElementById("truncationStatus");
    const truncationReason = document.getElementById("truncationReason");

    if (truncationStatus && truncationReason) {
      truncationStatus.style.display = "block";
      truncationReason.textContent = reason;
    }
  }

  function hideTruncationNotification() {
    const truncationStatus = document.getElementById("truncationStatus");
    if (truncationStatus) {
      truncationStatus.style.display = "none";
    }
  }

  function showFallbackNotification(reason) {
    // Create or update fallback notification
    let fallbackNotification = document.getElementById("fallbackNotification");
    if (!fallbackNotification) {
      fallbackNotification = document.createElement("div");
      fallbackNotification.id = "fallbackNotification";
      fallbackNotification.className = "fallback-notification";
      fallbackNotification.innerHTML = `
        <div class="fallback-alert">
          <span class="alert-icon">ℹ️</span>
          <span class="alert-text">Fallback Mode Active</span>
          <span class="alert-reason" id="fallbackReason">-</span>
        </div>
      `;

      // Insert after progress section
      const progressSection = document.getElementById("progressSection");
      if (progressSection && progressSection.parentNode) {
        progressSection.parentNode.insertBefore(
          fallbackNotification,
          progressSection.nextSibling
        );
      }
    }

    const fallbackReason = document.getElementById("fallbackReason");
    if (fallbackReason) {
      fallbackReason.textContent = reason;
    }

    fallbackNotification.style.display = "block";
  }

  function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // Sound notification function
  function playCompletionSound() {
    // Check if sound is enabled
    if (!isSoundEnabled()) {
      console.log("🔇 Sound disabled, skipping completion sound");
      return;
    }

    try {
      // Use a very simple approach - just log the completion
      // This avoids any potential audio API issues that could break the application
      console.log(
        "🔊 Analysis completed successfully! (Sound notification enabled)"
      );

      // Optional: Add a visual notification instead of audio
      const notification = document.createElement("div");
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-weight: 600;
        animation: slideIn 0.3s ease-out;
      `;
      notification.innerHTML = "✅ Analysis Complete!";
      document.body.appendChild(notification);

      // Remove notification after 3 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 3000);
    } catch (error) {
      console.warn("🔇 Could not show completion notification:", error.message);
      // Don't let notification errors break the application
    }
  }

  // Sound toggle functionality
  function isSoundEnabled() {
    return localStorage.getItem("soundEnabled") !== "false";
  }

  function toggleSound() {
    const soundToggle = document.getElementById("soundToggle");
    const soundIcon = soundToggle?.querySelector(".icon");
    const soundText = soundToggle?.querySelector(".sound-text");

    const currentState = isSoundEnabled();
    const newState = !currentState;

    // Update localStorage
    localStorage.setItem("soundEnabled", newState.toString());

    // Update UI
    if (soundToggle) {
      if (newState) {
        soundToggle.classList.remove("sound-off");
        if (soundIcon) soundIcon.textContent = "🔊";
        if (soundText) soundText.textContent = "Sound On";
        console.log("🔊 Sound notifications enabled");
      } else {
        soundToggle.classList.add("sound-off");
        if (soundIcon) soundIcon.textContent = "🔇";
        if (soundText) soundText.textContent = "Sound Off";
        console.log("🔇 Sound notifications disabled");
      }
    }
  }

  // Initialize sound toggle state
  function initializeSoundToggle() {
    const soundToggle = document.getElementById("soundToggle");
    if (soundToggle) {
      // Set initial state based on localStorage
      if (!isSoundEnabled()) {
        soundToggle.classList.add("sound-off");
        const soundIcon = soundToggle.querySelector(".icon");
        const soundText = soundToggle.querySelector(".sound-text");
        if (soundIcon) soundIcon.textContent = "🔇";
        if (soundText) soundText.textContent = "Sound Off";
      }

      // Add click event listener
      soundToggle.addEventListener("click", toggleSound);
    }
  }

  // Main analysis function with progress tracking
  async function analyzeOpportunity() {
    try {
      const formData = getFormData();
      const validation = validateFormData(formData);

      if (!validation.isValid) {
        showError(
          "Please fill in all required fields: " + validation.errors.join(", ")
        );
        return;
      }

      // Show loading and progress
      showLoading();
      showProgress();
      updateProgressStep(1, "active");
      updateProgressTime("Generating SQL query...");

      // Simulate progress steps (in real implementation, these would be triggered by backend responses)
      setTimeout(() => {
        updateProgressStep(1, "completed");
        updateProgressStep(2, "active");
        updateProgressTime("Retrieving historical data...");
      }, 1000);

      setTimeout(() => {
        updateProgressStep(2, "completed");
        updateProgressStep(3, "active");
        updateProgressTime("Processing with AI...");
      }, 2000);

      // Get current settings from settings manager
      const settings = getAnalysisSettings();
      console.log("Using analysis settings:", settings);

      // Configure fetch with timeout to prevent NetworkError
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`⏰ Frontend fetch timeout after ${settings.analysisTimeout}s, aborting request`);
        controller.abort();
      }, settings.analysisTimeout * 1000);

      console.log(`🌐 Initiating fetch request with ${settings.analysisTimeout}s timeout`);
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-SQL-Query-Limit": settings.sqlQueryLimit.toString(),
          "X-Truncation-Limit": settings.truncationLimit.toString(),
          "X-Enable-Truncation": settings.enableTruncation.toString(),
          "X-Analysis-Timeout": settings.analysisTimeout.toString(),
        },
        body: JSON.stringify(formData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log(`✅ Fetch request completed successfully`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText.substring(0, 500)}`);
      }

      updateProgressStep(3, "completed");
      updateProgressStep(4, "active");
      updateProgressTime("Formatting results...");

      const results = await response.json();
      console.log("Analysis results:", results);

      populateUI(results);

      updateProgressStep(4, "completed");
      updateProgressTime("Analysis complete!");
      playCompletionSound(); // Play sound on completion
    } catch (error) {
      console.error("Analysis error:", error);
      
      // Handle specific error types
      let errorMessage = "Analysis failed: " + error.message;
      if (error.name === 'AbortError') {
        errorMessage = `Analysis timeout: Request exceeded ${settings.analysisTimeout} seconds. Try enabling truncation or reducing the SQL query limit in settings.`;
      } else if (error.message.includes('NetworkError')) {
        errorMessage = 'Network error: Unable to connect to the analysis server. Please check your connection and try again.';
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Connection error: Failed to communicate with the analysis server. Please try again.';
      }
      
      showError(errorMessage);

      // Reset progress on error
      const progressSection = document.getElementById("progressSection");
      if (progressSection) {
        progressSection.style.display = "none";
      }
    } finally {
      hideLoading();
      hideProgress();
    }
  }

  // Clear form
  function clearForm() {
    if (opportunityForm) {
      opportunityForm.reset();
    }
    clearUIFields();
    updateCompletionStatus();

    // Hide analysis sections
    if (resultsSection) resultsSection.style.display = "none";
    if (additionalSections) additionalSections.style.display = "none";
    if (debugSection) debugSection.style.display = "none";
    if (progressSection) progressSection.style.display = "none";

    // Reset debug info
    hideTruncationNotification();
  }

  // Load sample data
  function loadSampleData() {
    const sampleData = {
      customerName: "Acme Corporation",
      region: "United States",
      closeDate: "2024-12-31",
      opportunityName: "Cloud Migration Project",
      description:
        "Large-scale migration of on-premises infrastructure to AWS cloud. Includes database migration, application modernization, and security implementation. Expected to improve performance by 40% and reduce operational costs by 30%.",
    };

    // Populate form fields
    Object.entries(sampleData).forEach(([key, value]) => {
      const field = document.getElementById(key);
      if (field) {
        field.value = value;
      }
    });

    updateCompletionStatus();
    updateCharCounter();
  }

  // Toggle theme
  function toggleTheme() {
    console.log("🎨 Theme toggle function called");
    const isDark = document.body.getAttribute("data-theme") === "dark";
    console.log("Current theme:", isDark ? "dark" : "light");

    if (isDark) {
      document.body.removeAttribute("data-theme");
      console.log("Switched to light theme");
    } else {
      document.body.setAttribute("data-theme", "dark");
      console.log("Switched to dark theme");
    }

    const themeToggle = document.querySelector(".theme-toggle");
    if (themeToggle) {
      const icon = themeToggle.querySelector(".icon");
      const text = themeToggle.querySelector(".theme-text");
      if (!isDark) {
        icon.textContent = "☀️";
        text.textContent = "Light";
      } else {
        icon.textContent = "🌙";
        text.textContent = "Dark";
      }
    }
  }

  // Export data
  function exportData() {
    const formData = getFormData();
    const dataStr = JSON.stringify(formData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "opportunity-analysis.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  // Print report
  function printReport() {
    window.print();
  }

  // Toggle debug section
  function toggleDebugSection() {
    const debugSection = document.getElementById("debugSection");
    const debugToggle = document.querySelector(".debug-toggle");

    if (debugSection) {
      const isVisible = debugSection.style.display !== "none";
      debugSection.style.display = isVisible ? "none" : "block";

      if (debugToggle) {
        debugToggle.textContent = isVisible ? "Show Debug" : "Hide Debug";
      }
    }
  }

  // Enhanced debug functions
  function updateQueryDebugInfo(queryResults) {
    try {
      let rowCount = 0;
      let dataSize = 0;
      let parsedData = null;

      if (
        queryResults &&
        queryResults !== "No query results found in response"
      ) {
        dataSize = queryResults.length;

        // Try to parse the query results
        try {
          parsedData = JSON.parse(queryResults);
          if (parsedData && parsedData.Rows && Array.isArray(parsedData.Rows)) {
            rowCount = parsedData.Rows.length - 1; // Subtract 1 for header row
          }
        } catch (parseError) {
          console.log(
            "Could not parse query results for analysis:",
            parseError
          );
        }
      }

      // Update statistics
      const rowCountElement = document.getElementById("queryRowCount");
      const dataSizeElement = document.getElementById("queryDataSize");
      const charCountElement = document.getElementById("queryCharCount");

      if (rowCountElement) {
        rowCountElement.textContent =
          rowCount > 0 ? rowCount.toLocaleString() : "-";
      }

      if (dataSizeElement) {
        dataSizeElement.textContent =
          dataSize > 0 ? formatDataSize(dataSize) : "-";
      }

      if (charCountElement) {
        charCountElement.textContent =
          dataSize > 0 ? dataSize.toLocaleString() : "-";
      }

      // Generate table view if we have parsed data
      if (parsedData && parsedData.Rows && Array.isArray(parsedData.Rows)) {
        generateQueryTable(parsedData);
      } else {
        clearQueryTable();
      }
    } catch (error) {
      console.error("Error updating query debug info:", error);
    }
  }

  function formatDataSize(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  function generateQueryTable(data) {
    const tableContainer = document.getElementById("queryTableContainer");
    if (!tableContainer || !data.Rows || data.Rows.length === 0) {
      clearQueryTable();
      return;
    }

    const rows = data.Rows;
    const headerRow = rows[0];
    const dataRows = rows.slice(1);

    // Extract column headers
    const headers = [];
    if (headerRow && headerRow.Data) {
      headerRow.Data.forEach((cell) => {
        if (cell && cell.VarCharValue) {
          headers.push(cell.VarCharValue);
        }
      });
    }

    if (headers.length === 0) {
      clearQueryTable();
      return;
    }

    // Create table HTML
    let tableHTML = '<table class="query-table">';

    // Add header
    tableHTML += "<thead><tr>";
    headers.forEach((header) => {
      tableHTML += `<th>${escapeHtml(header)}</th>`;
    });
    tableHTML += "</tr></thead>";

    // Add data rows (limit to first 100 rows for performance)
    tableHTML += "<tbody>";
    const maxRows = Math.min(dataRows.length, 100);

    for (let i = 0; i < maxRows; i++) {
      const row = dataRows[i];
      tableHTML += "<tr>";

      if (row && row.Data) {
        for (let j = 0; j < headers.length; j++) {
          const cell = row.Data[j];
          let cellValue = "";

          if (cell && cell.VarCharValue !== undefined) {
            cellValue = cell.VarCharValue;
          }

          // Truncate long values for display
          if (cellValue && cellValue.length > 100) {
            cellValue = cellValue.substring(0, 100) + "...";
          }

          tableHTML += `<td>${escapeHtml(cellValue)}</td>`;
        }
      } else {
        // Empty row
        for (let j = 0; j < headers.length; j++) {
          tableHTML += "<td></td>";
        }
      }

      tableHTML += "</tr>";
    }

    if (dataRows.length > 100) {
      tableHTML += `<tr><td colspan="${
        headers.length
      }" style="text-align: center; font-style: italic; color: #666; padding: 16px;">... and ${(
        dataRows.length - 100
      ).toLocaleString()} more rows</td></tr>`;
    }

    tableHTML += "</tbody></table>";

    tableContainer.innerHTML = tableHTML;
  }

  function clearQueryTable() {
    const tableContainer = document.getElementById("queryTableContainer");
    if (tableContainer) {
      tableContainer.innerHTML =
        '<div class="table-placeholder">Table view will appear here after analysis...</div>';
    }
  }

  function escapeHtml(text) {
    if (typeof text !== "string") {
      return String(text || "");
    }
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function updateResponseDebugInfo(responseText) {
    try {
      const charCount = responseText ? responseText.length : 0;
      const dataSize = charCount;

      // Update response statistics
      const responseCharCountElement =
        document.getElementById("responseCharCount");
      const responseDataSizeElement =
        document.getElementById("responseDataSize");

      if (responseCharCountElement) {
        responseCharCountElement.textContent =
          charCount > 0 ? charCount.toLocaleString() : "-";
      }

      if (responseDataSizeElement) {
        responseDataSizeElement.textContent =
          dataSize > 0 ? formatDataSize(dataSize) : "-";
      }
    } catch (error) {
      console.error("Error updating response debug info:", error);
    }
  }

  function showQueryView(viewType) {
    // Update button states
    const rawBtn = document.getElementById("rawViewBtn");
    const tableBtn = document.getElementById("tableViewBtn");

    if (rawBtn && tableBtn) {
      rawBtn.classList.toggle("active", viewType === "raw");
      tableBtn.classList.toggle("active", viewType === "table");
    }

    // Update view visibility
    const rawView = document.getElementById("debugQueryRaw");
    const tableView = document.getElementById("debugQueryTable");

    if (rawView && tableView) {
      rawView.style.display = viewType === "raw" ? "block" : "none";
      tableView.style.display = viewType === "table" ? "block" : "none";
    }
  }

  // Make functions globally available for debugging
  window.analyzeOpportunity = analyzeOpportunity;
  window.clearForm = clearForm;
  window.loadSampleData = loadSampleData;
  window.toggleTheme = toggleTheme;
  window.exportData = exportData;
  window.printReport = printReport;
  window.toggleDebugSection = toggleDebugSection;
  window.showQueryView = showQueryView;

  // Initialize the application
  initializeApp();
});
