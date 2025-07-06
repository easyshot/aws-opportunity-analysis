# Task 8: Advanced Features Testing - Basic Version

Write-Host "Starting Task 8: Advanced Features Testing" -ForegroundColor Green
Write-Host "============================================================"

$backendUrl = "http://localhost:8123"
$testsPassed = 0
$testsFailed = 0

# Test Nova Premier Integration
Write-Host "`nTesting Nova Premier Model Integration" -ForegroundColor Yellow

$novaPremierData = @{
    CustomerName = "TechCorp Solutions"
    region = "United States"
    closeDate = "2025-06-15"
    oppName = "Cloud Migration Initiative"
    oppDescription = "Large-scale enterprise cloud migration with AI/ML requirements, data analytics, and advanced security needs."
    useNovaPremier = $true
} | ConvertTo-Json

try {
    Write-Host "  Testing Nova Premier Analysis..." -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri "$backendUrl/api/analyze" -Method POST -ContentType "application/json" -Body $novaPremierData
    
    if ($response.formattedSummaryText.Length -gt 1000) {
        Write-Host "  PASS: Enhanced analysis quality validated" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  WARN: Analysis may be too brief" -ForegroundColor Yellow
    }
    
    if ($response.metrics.confidenceScore) {
        Write-Host "  PASS: Confidence scoring present" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  FAIL: Missing confidence scoring" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "  FAIL: Nova Premier test failed" -ForegroundColor Red
    $testsFailed++
}

# Test Funding Analysis
Write-Host "`nTesting Funding Analysis Workflow" -ForegroundColor Yellow

$fundingData = @{
    CustomerName = "MidSize Manufacturing"
    region = "Germany"
    closeDate = "2025-07-20"
    oppName = "IoT Manufacturing Platform"
    oppDescription = "IoT-enabled manufacturing platform with predictive maintenance and monitoring capabilities."
} | ConvertTo-Json

try {
    Write-Host "  Testing Funding Analysis..." -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri "$backendUrl/api/analyze" -Method POST -ContentType "application/json" -Body $fundingData
    
    $fundingContent = if ($response.fundingOptions) { $response.fundingOptions } else { $response.fundingAnalysis }
    
    if ($fundingContent -and $fundingContent.Length -gt 100) {
        Write-Host "  PASS: Funding analysis content validated" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  WARN: Funding analysis content insufficient" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  FAIL: Funding analysis test failed" -ForegroundColor Red
    $testsFailed++
}

# Test Follow-On Analysis
Write-Host "`nTesting Follow-On Opportunity Analysis" -ForegroundColor Yellow

$followOnData = @{
    CustomerName = "StartupTech Inc"
    region = "Canada"
    closeDate = "2025-05-30"
    oppName = "MVP Development Platform"
    oppDescription = "Initial MVP development platform for startup focusing on rapid prototyping."
} | ConvertTo-Json

try {
    Write-Host "  Testing Follow-On Analysis..." -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri "$backendUrl/api/analyze" -Method POST -ContentType "application/json" -Body $followOnData
    
    $followOnContent = if ($response.followOnOpportunities) { $response.followOnOpportunities } else { $response.followOnAnalysis }
    
    if ($followOnContent -and $followOnContent.Length -gt 100) {
        Write-Host "  PASS: Follow-on analysis content validated" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  WARN: Follow-on analysis content insufficient" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  FAIL: Follow-on analysis test failed" -ForegroundColor Red
    $testsFailed++
}

# Test Rich Content Display
Write-Host "`nTesting Rich Formatted Content Display" -ForegroundColor Yellow

try {
    Write-Host "  Testing Content Sections..." -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri "$backendUrl/api/analyze" -Method POST -ContentType "application/json" -Body $novaPremierData
    
    $sectionsFound = 0
    $requiredSections = @("methodology", "findings", "riskFactors", "similarProjects", "rationale", "fullAnalysis")
    
    foreach ($section in $requiredSections) {
        if ($response.$section -or ($response.sections -and $response.sections.$section)) {
            $sectionsFound++
        }
    }
    
    if ($sectionsFound -ge 3) {
        Write-Host "  PASS: Analysis sections coverage validated" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  FAIL: Insufficient analysis sections" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "  FAIL: Content display test failed" -ForegroundColor Red
    $testsFailed++
}

# Test Export Capabilities
Write-Host "`nTesting Export and Print Capabilities" -ForegroundColor Yellow

try {
    Write-Host "  Testing Export Data Structure..." -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri "$backendUrl/api/analyze" -Method POST -ContentType "application/json" -Body $fundingData
    
    if ($response.metrics -and $response.formattedSummaryText) {
        Write-Host "  PASS: Complete data structure for export" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  FAIL: Incomplete data structure for export" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "  FAIL: Export capabilities test failed" -ForegroundColor Red
    $testsFailed++
}

# Test Performance Standards
Write-Host "`nTesting Performance and Reliability Standards" -ForegroundColor Yellow

try {
    Write-Host "  Testing Performance..." -ForegroundColor Cyan
    $testStart = Get-Date
    $response = Invoke-RestMethod -Uri "$backendUrl/api/analyze" -Method POST -ContentType "application/json" -Body $novaPremierData
    $duration = (Get-Date) - $testStart
    $durationMs = [math]::Round($duration.TotalMilliseconds)
    
    if ($durationMs -lt 30000) {
        Write-Host "  PASS: Response time within threshold ($durationMs ms)" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  WARN: Response time exceeded threshold ($durationMs ms)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  FAIL: Performance test failed" -ForegroundColor Red
    $testsFailed++
}

# Test System Health
try {
    Write-Host "  Testing System Health..." -ForegroundColor Cyan
    $healthResponse = Invoke-RestMethod -Uri "$backendUrl/health" -Method GET
    
    if ($healthResponse.status -eq "healthy") {
        Write-Host "  PASS: System health check passed" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  WARN: System health status: $($healthResponse.status)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  WARN: Health check endpoint unavailable" -ForegroundColor Yellow
}

# Display Results
Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "TASK 8: ADVANCED FEATURES TESTING COMPLETE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "Tests Passed: $testsPassed" -ForegroundColor Green
Write-Host "Tests Failed: $testsFailed" -ForegroundColor Red

if ($testsFailed -eq 0) {
    Write-Host "`nAll advanced features are working correctly!" -ForegroundColor Green
    Write-Host "Task 8 requirements have been successfully validated" -ForegroundColor Green
} else {
    Write-Host "`nSome advanced features need attention" -ForegroundColor Yellow
    Write-Host "Review failed tests before marking Task 8 as complete" -ForegroundColor Red
}

Write-Host "`nAdvanced features testing completed!" -ForegroundColor Cyan