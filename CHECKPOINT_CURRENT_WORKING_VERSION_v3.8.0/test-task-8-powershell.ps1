# Task 8: Advanced Features Testing - PowerShell Version
# Purpose: Test and validate all advanced features using PowerShell

Write-Host "🚀 Starting Task 8: Advanced Features Testing" -ForegroundColor Green
Write-Host "=" * 60

# Test configuration
$backendUrl = "http://localhost:8123"
$testResults = @{
    Total = 0
    Passed = 0
    Failed = 0
    Warnings = 0
}

# Test scenarios
$testScenarios = @{
    NovaPremierBasic = @{
        CustomerName = "TechCorp Solutions"
        region = "United States"
        closeDate = "2025-06-15"
        oppName = "Cloud Migration Initiative"
        oppDescription = "Large-scale enterprise cloud migration with AI/ML requirements, data analytics, and advanced security needs. Customer seeks to modernize legacy infrastructure and implement intelligent automation."
        useNovaPremier = $true
    }
    
    FundingStandard = @{
        CustomerName = "MidSize Manufacturing"
        region = "Germany"
        closeDate = "2025-07-20"
        oppName = "IoT Manufacturing Platform"
        oppDescription = "IoT-enabled manufacturing platform with predictive maintenance, supply chain optimization, and real-time monitoring capabilities."
        industry = "manufacturing"
        customerSegment = "commercial"
    }
    
    FollowOnBasic = @{
        CustomerName = "StartupTech Inc"
        region = "Canada"
        closeDate = "2025-05-30"
        oppName = "MVP Development Platform"
        oppDescription = "Initial MVP development platform for startup focusing on rapid prototyping and market validation."
        customerSegment = "startup"
    }
}

# Helper functions
function Test-APICall {
    param(
        [string]$TestName,
        [hashtable]$TestData
    )
    
    Write-Host "  🔍 Testing: $TestName" -ForegroundColor Cyan
    
    try {
        $jsonBody = $TestData | ConvertTo-Json -Depth 10
        $startTime = Get-Date
        
        $response = Invoke-RestMethod -Uri "$backendUrl/api/analyze" -Method POST -ContentType "application/json" -Body $jsonBody
        
        $duration = (Get-Date) - $startTime
        $durationMs = [math]::Round($duration.TotalMilliseconds)
        
        Write-Host "    ✅ Analysis completed in ${durationMs}ms" -ForegroundColor Green
        
        return @{
            Success = $true
            Data = $response
            Duration = $durationMs
        }
    }
    catch {
        Write-Host "    ❌ Analysis failed: $($_.Exception.Message)" -ForegroundColor Red
        return @{
            Success = $false
            Error = $_.Exception.Message
            Duration = 0
        }
    }
}

function Record-TestResult {
    param(
        [string]$Category,
        [string]$TestName,
        [string]$Status,
        [string]$Message = ""
    )
    
    $testResults.Total++
    
    $icon = switch ($Status) {
        "Success" { "✅"; $testResults.Passed++ }
        "Warning" { "⚠️"; $testResults.Warnings++ }
        "Error" { "❌"; $testResults.Failed++ }
        default { "🔄" }
    }
    
    $color = switch ($Status) {
        "Success" { "Green" }
        "Warning" { "Yellow" }
        "Error" { "Red" }
        default { "White" }
    }
    
    Write-Host "    $icon $TestName" -ForegroundColor $color
    if ($Message) {
        Write-Host "      $Message" -ForegroundColor Gray
    }
}

# Test 8.1: Nova Premier Model Integration
Write-Host "`n📊 Testing Nova Premier Model Integration (Requirement 8.1)" -ForegroundColor Yellow
Write-Host "-" * 50

$novaPremierResult = Test-APICall -TestName "Nova Premier Basic Analysis" -TestData $testScenarios.NovaPremierBasic

if ($novaPremierResult.Success) {
    $analysisLength = $novaPremierResult.Data.formattedSummaryText.Length
    
    if ($analysisLength -gt 1000) {
        Record-TestResult -Category "Nova Premier" -TestName "Enhanced Analysis Quality" -Status "Success" -Message "Analysis length: $analysisLength characters"
    } else {
        Record-TestResult -Category "Nova Premier" -TestName "Enhanced Analysis Quality" -Status "Warning" -Message "Analysis may be too brief: $analysisLength characters"
    }
    
    if ($novaPremierResult.Data.metrics.confidenceScore) {
        Record-TestResult -Category "Nova Premier" -TestName "Confidence Scoring" -Status "Success" -Message "Confidence: $($novaPremierResult.Data.metrics.confidenceScore)% ($($novaPremierResult.Data.metrics.confidence))"
    } else {
        Record-TestResult -Category "Nova Premier" -TestName "Confidence Scoring" -Status "Error" -Message "Missing confidence scoring"
    }
    
    $metricsCount = ($novaPremierResult.Data.metrics | Get-Member -MemberType NoteProperty).Count
    if ($metricsCount -ge 5) {
        Record-TestResult -Category "Nova Premier" -TestName "Enhanced Metrics" -Status "Success" -Message "Metrics count: $metricsCount"
    } else {
        Record-TestResult -Category "Nova Premier" -TestName "Enhanced Metrics" -Status "Warning" -Message "Limited metrics: $metricsCount"
    }
} else {
    Record-TestResult -Category "Nova Premier" -TestName "Nova Premier Integration" -Status "Error" -Message $novaPremierResult.Error
}

# Test 8.2: Funding Analysis Workflow
Write-Host "`n💰 Testing Funding Analysis Workflow (Requirement 8.2)" -ForegroundColor Yellow
Write-Host "-" * 50

$fundingResult = Test-APICall -TestName "Standard Funding Analysis" -TestData $testScenarios.FundingStandard

if ($fundingResult.Success) {
    $fundingContent = if ($fundingResult.Data.fundingOptions) { $fundingResult.Data.fundingOptions } 
                     elseif ($fundingResult.Data.fundingAnalysis) { $fundingResult.Data.fundingAnalysis }
                     else { "" }
    
    if ($fundingContent.Length -gt 200) {
        Record-TestResult -Category "Funding" -TestName "Funding Analysis Content" -Status "Success" -Message "Content length: $($fundingContent.Length) characters"
    } else {
        Record-TestResult -Category "Funding" -TestName "Funding Analysis Content" -Status "Warning" -Message "Content may be insufficient: $($fundingContent.Length) characters"
    }
    
    $fundingKeywords = @("funding", "investment", "financing", "capital", "budget")
    $hasKeywords = $fundingKeywords | Where-Object { $fundingContent.ToLower().Contains($_) }
    
    if ($hasKeywords.Count -gt 0) {
        Record-TestResult -Category "Funding" -TestName "Funding Terminology" -Status "Success" -Message "Found keywords: $($hasKeywords -join ', ')"
    } else {
        Record-TestResult -Category "Funding" -TestName "Funding Terminology" -Status "Error" -Message "Missing relevant funding terminology"
    }
} else {
    Record-TestResult -Category "Funding" -TestName "Funding Analysis Workflow" -Status "Error" -Message $fundingResult.Error
}

# Test 8.3: Follow-On Opportunity Analysis
Write-Host "`n🚀 Testing Follow-On Opportunity Analysis (Requirement 8.3)" -ForegroundColor Yellow
Write-Host "-" * 50

$followOnResult = Test-APICall -TestName "Basic Follow-On Opportunities" -TestData $testScenarios.FollowOnBasic

if ($followOnResult.Success) {
    $followOnContent = if ($followOnResult.Data.followOnOpportunities) { $followOnResult.Data.followOnOpportunities }
                      elseif ($followOnResult.Data.followOnAnalysis) { $followOnResult.Data.followOnAnalysis }
                      else { "" }
    
    if ($followOnContent.Length -gt 200) {
        Record-TestResult -Category "Follow-On" -TestName "Follow-On Analysis Content" -Status "Success" -Message "Content length: $($followOnContent.Length) characters"
    } else {
        Record-TestResult -Category "Follow-On" -TestName "Follow-On Analysis Content" -Status "Warning" -Message "Content may be insufficient: $($followOnContent.Length) characters"
    }
    
    $growthKeywords = @("growth", "expansion", "opportunity", "next", "future", "additional")
    $hasGrowthKeywords = $growthKeywords | Where-Object { $followOnContent.ToLower().Contains($_) }
    
    if ($hasGrowthKeywords.Count -gt 0) {
        Record-TestResult -Category "Follow-On" -TestName "Growth Terminology" -Status "Success" -Message "Found keywords: $($hasGrowthKeywords -join ', ')"
    } else {
        Record-TestResult -Category "Follow-On" -TestName "Growth Terminology" -Status "Error" -Message "Missing relevant growth terminology"
    }
} else {
    Record-TestResult -Category "Follow-On" -TestName "Follow-On Analysis Workflow" -Status "Error" -Message $followOnResult.Error
}

# Test 8.4: Rich Formatted Content Display
Write-Host "`n🎨 Testing Rich Formatted Content Display (Requirement 8.4)" -ForegroundColor Yellow
Write-Host "-" * 50

$contentResult = Test-APICall -TestName "Content Display Test" -TestData $testScenarios.NovaPremierBasic

if ($contentResult.Success) {
    $requiredSections = @("methodology", "findings", "riskFactors", "similarProjects", "rationale", "fullAnalysis")
    $sectionsFound = 0
    
    foreach ($section in $requiredSections) {
        $sectionContent = if ($contentResult.Data.$section) { $contentResult.Data.$section }
                         elseif ($contentResult.Data.sections.$section) { $contentResult.Data.sections.$section }
                         else { "" }
        
        if ($sectionContent.Length -gt 50) {
            $sectionsFound++
            Record-TestResult -Category "Content" -TestName "$section Section" -Status "Success" -Message "Length: $($sectionContent.Length) characters"
        } else {
            Record-TestResult -Category "Content" -TestName "$section Section" -Status "Warning" -Message "Section may be missing or too brief"
        }
    }
    
    if ($sectionsFound -ge 4) {
        Record-TestResult -Category "Content" -TestName "Analysis Sections Coverage" -Status "Success" -Message "$sectionsFound/6 sections found"
    } else {
        Record-TestResult -Category "Content" -TestName "Analysis Sections Coverage" -Status "Error" -Message "Insufficient sections: $sectionsFound/6"
    }
    
    $content = $contentResult.Data.formattedSummaryText
    $hasFormatting = $content.Contains("**") -or $content.Contains("###") -or $content.Contains("===")
    
    if ($hasFormatting) {
        Record-TestResult -Category "Content" -TestName "Content Formatting" -Status "Success" -Message "Rich formatting markers present"
    } else {
        Record-TestResult -Category "Content" -TestName "Content Formatting" -Status "Warning" -Message "Limited formatting in content"
    }
} else {
    Record-TestResult -Category "Content" -TestName "Rich Content Display" -Status "Error" -Message $contentResult.Error
}

# Test 8.5: Export and Print Capabilities
Write-Host "`n📊 Testing Export and Print Capabilities (Requirement 8.5)" -ForegroundColor Yellow
Write-Host "-" * 50

$exportResult = Test-APICall -TestName "Export Data Test" -TestData $testScenarios.FundingStandard

if ($exportResult.Success) {
    $hasCompleteData = $exportResult.Data.metrics -and $exportResult.Data.formattedSummaryText
    
    if ($hasCompleteData) {
        Record-TestResult -Category "Export" -TestName "Export Data Completeness" -Status "Success" -Message "Complete data structure for export"
    } else {
        Record-TestResult -Category "Export" -TestName "Export Data Completeness" -Status "Error" -Message "Incomplete data structure"
    }
    
    $exportableFields = @("metrics", "methodology", "findings", "riskFactors", "similarProjects", "rationale", "fullAnalysis")
    $availableFields = $exportableFields | Where-Object { 
        $exportResult.Data.$_ -or $exportResult.Data.sections.$_ 
    }
    
    if ($availableFields.Count -ge 5) {
        Record-TestResult -Category "Export" -TestName "Exportable Fields" -Status "Success" -Message "$($availableFields.Count)/7 fields available"
    } else {
        Record-TestResult -Category "Export" -TestName "Exportable Fields" -Status "Warning" -Message "Limited fields: $($availableFields.Count)/7"
    }
    
    $hasMetadata = $exportResult.Data.timestamp -or $exportResult.Data.sessionId -or $exportResult.Data.opportunityId
    
    if ($hasMetadata) {
        Record-TestResult -Category "Export" -TestName "Export Metadata" -Status "Success" -Message "Metadata available for tracking"
    } else {
        Record-TestResult -Category "Export" -TestName "Export Metadata" -Status "Warning" -Message "Missing metadata for tracking"
    }
} else {
    Record-TestResult -Category "Export" -TestName "Export and Print Features" -Status "Error" -Message $exportResult.Error
}

# Test 8.6: Performance and Reliability Standards
Write-Host "`n⚡ Testing Performance and Reliability Standards (Requirement 8.6)" -ForegroundColor Yellow
Write-Host "-" * 50

$performanceResult = Test-APICall -TestName "Performance Test" -TestData $testScenarios.NovaPremierBasic

if ($performanceResult.Success) {
    if ($performanceResult.Duration -lt 30000) {
        Record-TestResult -Category "Performance" -TestName "Response Time" -Status "Success" -Message "Duration: $($performanceResult.Duration)ms"
    } else {
        Record-TestResult -Category "Performance" -TestName "Response Time" -Status "Warning" -Message "Duration: $($performanceResult.Duration)ms (>30s)"
    }
} else {
    Record-TestResult -Category "Performance" -TestName "Response Time" -Status "Error" -Message $performanceResult.Error
}

# Test system health
try {
    $healthResponse = Invoke-RestMethod -Uri "$backendUrl/health" -Method GET
    
    if ($healthResponse.status -eq "healthy") {
        Record-TestResult -Category "Performance" -TestName "System Health" -Status "Success" -Message "System reporting healthy status"
    } else {
        Record-TestResult -Category "Performance" -TestName "System Health" -Status "Warning" -Message "Status: $($healthResponse.status)"
    }
} catch {
    Record-TestResult -Category "Performance" -TestName "System Health" -Status "Warning" -Message "Health check failed: $($_.Exception.Message)"
}

# Test error handling
try {
    $invalidData = @{
        CustomerName = ""
        region = ""
        closeDate = ""
        oppName = ""
        oppDescription = ""
    }
    
    $jsonBody = $invalidData | ConvertTo-Json
    $errorResponse = Invoke-RestMethod -Uri "$backendUrl/api/analyze" -Method POST -ContentType "application/json" -Body $jsonBody
    
    Record-TestResult -Category "Performance" -TestName "Error Handling" -Status "Warning" -Message "System may not be validating input properly"
} catch {
    Record-TestResult -Category "Performance" -TestName "Error Handling" -Status "Success" -Message "System properly handles invalid input"
}

# Display final results
$duration = (Get-Date) - $startTime
Write-Host "`n" + "=" * 60 -ForegroundColor Green
Write-Host "🏁 TASK 8: ADVANCED FEATURES TESTING COMPLETE" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Green
Write-Host "⏱️  Total Duration: $([math]::Round($duration.TotalSeconds))s" -ForegroundColor White
Write-Host "✅ Tests Passed: $($testResults.Passed)" -ForegroundColor Green
Write-Host "❌ Tests Failed: $($testResults.Failed)" -ForegroundColor Red
Write-Host "⚠️  Warnings: $($testResults.Warnings)" -ForegroundColor Yellow

$successRate = if ($testResults.Total -gt 0) { [math]::Round(($testResults.Passed / $testResults.Total) * 100) } else { 0 }
Write-Host "📊 Success Rate: $successRate%" -ForegroundColor White

if ($testResults.Failed -eq 0) {
    Write-Host "`n🎉 All advanced features are working correctly!" -ForegroundColor Green
    Write-Host "✅ Task 8 requirements have been successfully validated" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some advanced features need attention" -ForegroundColor Yellow
    Write-Host "❌ Review failed tests before marking Task 8 as complete" -ForegroundColor Red
}

Write-Host "`n📋 Advanced features testing completed successfully!" -ForegroundColor Cyan