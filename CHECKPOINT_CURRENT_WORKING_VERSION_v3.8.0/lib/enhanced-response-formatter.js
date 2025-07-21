/**
 * Enhanced Response Formatter
 * Purpose: Format analysis responses for comprehensive UI display
 */

/**
 * Enhanced response formatting function for comprehensive UI display
 */
function formatEnhancedAnalysisResponse(analysisResult, inputParams) {
  try {
    console.log('Formatting enhanced analysis response...');
    
    // Parse the raw analysis text to extract structured data
    const rawText = analysisResult.formattedSummaryText || '';
    
    // Extract and format projections
    const projections = formatProjections(analysisResult.metrics, rawText);
    
    // Extract and format analysis sections
    const analysis = formatAnalysisSections(rawText, analysisResult.sections);
    
    // Extract and format architecture recommendations
    const architecture = formatArchitecture(rawText);
    
    return {
      // Enhanced projections with detailed formatting
      projections,
      
      // Comprehensive analysis results
      analysis,
      
      // Architecture recommendations
      architecture,
      
      // Legacy compatibility fields
      metrics: analysisResult.metrics,
      sections: analysisResult.sections,
      formattedSummaryText: analysisResult.formattedSummaryText
    };
  } catch (error) {
    console.error('Error formatting enhanced response:', error);
    // Return basic structure on error
    return {
      projections: getDefaultProjections(),
      analysis: getDefaultAnalysis(),
      architecture: getDefaultArchitecture(),
      metrics: analysisResult.metrics || {},
      sections: analysisResult.sections || {},
      formattedSummaryText: analysisResult.formattedSummaryText || 'Error formatting response'
    };
  }
}

/**
 * Format projections with enhanced structure
 */
function formatProjections(metrics, rawText) {
  // Parse ARR value
  const arrValue = parseFinancialValue(metrics.predictedArr);
  const mrrValue = parseFinancialValue(metrics.predictedMrr);
  
  // Calculate MRR relationship to ARR
  const mrrRelationship = arrValue > 0 ? `${((mrrValue * 12 / arrValue) * 100).toFixed(1)}% of ARR` : 'N/A';
  
  // Parse launch date
  const launchDateInfo = parseLaunchDate(metrics.launchDate);
  
  // Parse project duration
  const durationInfo = parseProjectDuration(metrics.predictedProjectDuration);
  
  // Parse confidence information
  const confidenceInfo = parseConfidenceInfo(metrics.confidence, rawText);
  
  // Parse top services
  const topServices = parseTopServices(metrics.topServices);
  
  return {
    arr: {
      value: arrValue,
      formatted: formatCurrency(arrValue),
      confidence: confidenceInfo.score,
      range: calculateARRRange(arrValue, confidenceInfo.level)
    },
    mrr: {
      value: mrrValue,
      formatted: formatCurrency(mrrValue),
      relationship: mrrRelationship
    },
    launchDate: launchDateInfo,
    timeToLaunch: durationInfo,
    confidence: confidenceInfo,
    topServices: topServices
  };
}

/**
 * Format analysis sections with enhanced structure
 */
function formatAnalysisSections(rawText, sections) {
  return {
    methodology: extractMethodology(rawText),
    similarProjects: parseSimilarProjects(sections.similarProjectsRaw || ''),
    findings: extractFindings(rawText),
    rationale: extractRationale(rawText),
    riskFactors: extractRiskFactors(rawText)
  };
}

/**
 * Format architecture recommendations
 */
function formatArchitecture(rawText) {
  const architectureMatch = rawText.match(/===\s*ARCHITECTURE\s*RECOMMENDATIONS?\s*===\s*([\s\S]*?)(?===\s*|$)/i);
  const architectureText = architectureMatch ? architectureMatch[1].trim() : '';
  
  return {
    networkFoundation: extractArchitectureSection(architectureText, 'network|foundation|vpc|subnet'),
    computeLayer: extractArchitectureSection(architectureText, 'compute|ec2|lambda|ecs|fargate'),
    dataLayer: extractArchitectureSection(architectureText, 'data|database|rds|dynamodb|s3|storage'),
    securityComponents: extractArchitectureSection(architectureText, 'security|iam|kms|waf|shield'),
    integrationPoints: extractArchitectureSection(architectureText, 'integration|api|gateway|eventbridge'),
    scalingElements: extractArchitectureSection(architectureText, 'scaling|auto.*scaling|load.*balancer|cloudfront'),
    managementTools: extractArchitectureSection(architectureText, 'management|cloudwatch|cloudtrail|config'),
    completeArchitecture: architectureText || 'No architecture recommendations available'
  };
}

// Helper functions for parsing and formatting

function parseFinancialValue(value) {
  if (!value || value === 'Not available' || value === 'Error') return 0;
  const numericValue = value.toString().replace(/[$,]/g, '');
  return parseFloat(numericValue) || 0;
}

function formatCurrency(value) {
  if (value === 0) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

function parseLaunchDate(launchDateStr) {
  if (!launchDateStr || launchDateStr === 'Not available') {
    return {
      date: 'TBD',
      daysFromNow: 0,
      timeline: 'To be determined'
    };
  }
  
  try {
    const date = new Date(launchDateStr);
    const now = new Date();
    const daysFromNow = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
    
    return {
      date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      daysFromNow: Math.max(0, daysFromNow),
      timeline: daysFromNow > 0 ? `${daysFromNow} days from now` : 'Past due'
    };
  } catch (error) {
    return {
      date: launchDateStr,
      daysFromNow: 0,
      timeline: launchDateStr
    };
  }
}

function parseProjectDuration(durationStr) {
  if (!durationStr || durationStr === 'Not available') {
    return {
      months: 0,
      formatted: 'TBD',
      milestones: []
    };
  }
  
  const monthsMatch = durationStr.match(/(\d+)\s*months?/i);
  const months = monthsMatch ? parseInt(monthsMatch[1]) : 0;
  
  return {
    months: months,
    formatted: durationStr,
    milestones: generateMilestones(months)
  };
}

function parseConfidenceInfo(confidenceLevel, rawText) {
  const level = confidenceLevel || 'MEDIUM';
  const score = level === 'HIGH' ? 85 : level === 'LOW' ? 45 : 65;
  
  // Extract confidence factors from text
  const factorsMatch = rawText.match(/confidence.*factors?[:\-]\s*([\s\S]*?)(?=\n\s*\n|===|$)/i);
  const factors = factorsMatch ? 
    factorsMatch[1].split(/[,\n]/).map(f => f.trim()).filter(f => f.length > 0) : 
    [`Based on ${level.toLowerCase()} confidence analysis`];
  
  return {
    level: level,
    score: score,
    factors: factors
  };
}

function parseTopServices(servicesStr) {
  if (!servicesStr || servicesStr === 'No services data available') {
    return [];
  }
  
  const services = [];
  const serviceLines = servicesStr.split('\n').filter(line => line.trim());
  
  serviceLines.forEach(line => {
    const serviceMatch = line.match(/\*?\*?([^*\-$]+?)[\*\-\s]*\$?([\d,]+)/);
    if (serviceMatch) {
      const service = serviceMatch[1].trim();
      const cost = parseFloat(serviceMatch[2].replace(/,/g, '')) || 0;
      
      services.push({
        service: service,
        estimatedCost: cost,
        description: `Estimated monthly cost for ${service}`
      });
    }
  });
  
  return services;
}

function extractMethodology(rawText) {
  const methodologyMatch = rawText.match(/===\s*ANALYSIS\s*METHODOLOGY\s*===\s*([\s\S]*?)(?===\s*|$)/i);
  const methodologyText = methodologyMatch ? methodologyMatch[1].trim() : '';
  
  return {
    approach: methodologyText || 'Historical data analysis with machine learning predictions',
    dataSources: ['Historical AWS project database', 'Industry benchmarks', 'Regional market data'],
    techniques: ['Pattern matching', 'Statistical analysis', 'Predictive modeling']
  };
}

function parseSimilarProjects(similarProjectsText) {
  const projects = [];
  const projectSections = similarProjectsText.split(/---\s*Project\s*\d+\s*---/i);
  
  projectSections.forEach(section => {
    if (section.trim()) {
      const project = parseSingleProject(section);
      if (project.project) {
        projects.push(project);
      }
    }
  });
  
  return projects;
}

function parseSingleProject(projectText) {
  const projectMatch = projectText.match(/Project\s*Name:\s*([^\n]+)/i);
  const customerMatch = projectText.match(/Customer:\s*([^\n]+)/i);
  const industryMatch = projectText.match(/Industry:\s*([^\n]+)/i);
  const regionMatch = projectText.match(/Region:\s*([^\n]+)/i);
  const arrMatch = projectText.match(/ARR:\s*\$?([\d,]+)/i);
  
  return {
    project: projectMatch ? projectMatch[1].trim() : '',
    customer: customerMatch ? customerMatch[1].trim() : '',
    industry: industryMatch ? industryMatch[1].trim() : '',
    region: regionMatch ? regionMatch[1].trim() : '',
    arr: arrMatch ? parseFloat(arrMatch[1].replace(/,/g, '')) : 0,
    services: [],
    similarity: 0.8 // Default similarity score
  };
}

function extractFindings(rawText) {
  const findingsMatch = rawText.match(/===\s*DETAILED\s*FINDINGS\s*===\s*([\s\S]*?)(?===\s*|$)/i);
  const findingsText = findingsMatch ? findingsMatch[1].trim() : '';
  
  const findings = [];
  const findingLines = findingsText.split('\n').filter(line => line.trim());
  
  findingLines.forEach(line => {
    if (line.trim()) {
      findings.push({
        category: 'Analysis',
        insight: line.trim(),
        supporting_data: 'Historical project analysis',
        confidence: 0.75
      });
    }
  });
  
  return findings;
}

function extractRationale(rawText) {
  const rationaleMatch = rawText.match(/===\s*PREDICTION\s*RATIONALE\s*===\s*([\s\S]*?)(?===\s*|$)/i);
  const rationaleText = rationaleMatch ? rationaleMatch[1].trim() : '';
  
  return [{
    prediction: 'Revenue and timeline predictions',
    reasoning: rationaleText || 'Based on analysis of similar historical projects',
    historical_basis: 'Comparable projects in similar industries and regions'
  }];
}

function extractRiskFactors(rawText) {
  const riskMatch = rawText.match(/===\s*RISK\s*FACTORS?\s*===\s*([\s\S]*?)(?===\s*|$)/i);
  const riskText = riskMatch ? riskMatch[1].trim() : '';
  
  if (!riskText) {
    return [{
      risk: 'Standard project risks',
      severity: 'MEDIUM',
      mitigation: 'Follow AWS best practices and project management guidelines',
      impact: 'Potential delays or cost overruns'
    }];
  }
  
  const risks = [];
  const riskLines = riskText.split('\n').filter(line => line.trim());
  
  riskLines.forEach(line => {
    if (line.trim()) {
      risks.push({
        risk: line.trim(),
        severity: 'MEDIUM',
        mitigation: 'Monitor and address proactively',
        impact: 'Potential project impact'
      });
    }
  });
  
  return risks;
}

function extractArchitectureSection(architectureText, pattern) {
  const regex = new RegExp(`(${pattern})[^\\n]*:?\\s*([^\\n]+)`, 'gi');
  const matches = [];
  let match;
  
  while ((match = regex.exec(architectureText)) !== null) {
    matches.push(match[2].trim());
  }
  
  return matches.length > 0 ? matches : ['No specific recommendations'];
}

function calculateARRRange(arrValue, confidenceLevel) {
  const variance = confidenceLevel === 'HIGH' ? 0.1 : confidenceLevel === 'LOW' ? 0.3 : 0.2;
  return {
    min: Math.round(arrValue * (1 - variance)),
    max: Math.round(arrValue * (1 + variance))
  };
}

function generateMilestones(months) {
  if (months <= 0) return [];
  
  const milestones = [];
  const phases = ['Planning', 'Implementation', 'Testing', 'Deployment'];
  const phaseLength = Math.max(1, Math.floor(months / phases.length));
  
  phases.forEach((phase, index) => {
    milestones.push(`${phase} (Month ${index * phaseLength + 1})`);
  });
  
  return milestones;
}

function getDefaultProjections() {
  return {
    arr: { value: 0, formatted: '$0', confidence: 50, range: { min: 0, max: 0 } },
    mrr: { value: 0, formatted: '$0', relationship: 'N/A' },
    launchDate: { date: 'TBD', daysFromNow: 0, timeline: 'To be determined' },
    timeToLaunch: { months: 0, formatted: 'TBD', milestones: [] },
    confidence: { level: 'MEDIUM', score: 50, factors: ['Default analysis'] },
    topServices: []
  };
}

function getDefaultAnalysis() {
  return {
    methodology: { approach: 'Standard analysis', dataSources: [], techniques: [] },
    similarProjects: [],
    findings: [],
    rationale: [],
    riskFactors: []
  };
}

function getDefaultArchitecture() {
  return {
    networkFoundation: [],
    computeLayer: [],
    dataLayer: [],
    securityComponents: [],
    integrationPoints: [],
    scalingElements: [],
    managementTools: [],
    completeArchitecture: 'No architecture recommendations available'
  };
}

module.exports = {
  formatEnhancedAnalysisResponse
};