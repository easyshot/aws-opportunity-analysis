# Task 8: Advanced Features Testing - Simple PowerShell Version

Write-Host "🚀 Starting Task 8: Advanced Features Testing" -ForegroundColor Green
Write-Host "============================================================"

$backendUrl = "http://localhost:8123"
$startTime = Get-Date
$testsPassed = 0
$testsFailed = 0
$testsWarning = 0

# Test 8.1: Nova Premier Model Integration
Write-Host "`n📊 Testing Nova Premier Model Integration (Requirement 8.1)" -ForegroundColor Yellow
Write-Host "--------------------------------------------------"

$novaPremierData = @{
    CustomerName = "TechCorp Solutions"
    region = "United States"
    closeDate = "2025-06-15"
    oppName = "Cloud Migration Initiative"
    oppDescription = "Large-scale enterprise cloud migration with AI/ML requirements, data analytics, and advanced security needs. Customer seeks to modernize legacy infrastructure and implement intelligent automation."
    useNovaPremier = $true
} | ConvertTo-Json

try {
    Write-Host "  🔍 Testing Nova Premier Basic Analysis" -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri "$backendUrl/api/analyze" -Method POST -ContentType "application/json" -Body $novaPremierData
    
    if ($response.formattedSummaryText.Length -gt 1000) {
        Write-Host "    ✅ Enhanced analysis quality validated" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "    ⚠️  Analysis may be too brief for Nova Premier" -ForegroundColor Yellow
        $testsWarning++
    }
    
    if ($response.metrics.confidenceScore) {
        Write-Host "    ✅ Confidence scoring present: $($response.metrics.confidenceScore)%" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "    ❌ Missing confidence scoring" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "    ❌ Nova Premier test failed: $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}

# Test 8.2: Funding Analysis Workflow
Write-Host "`n💰 Testing Funding Analysis Workflow (Requirement 8.2)" -ForegroundColor Yellow
Write-Host "--------------------------------------------------"

$fundingData = @{
    CustomerName = "MidSize Manufacturing"
    region = "Germany"
    closeDate = "2025-07-20"
    oppName = "IoT Manufacturing Platform"
    oppDescription = "IoT-enabled manufacturing platform with predictive maintenance, supply chain optimization, and real-time monitoring capabilities."
    industry = "manufacturing"
    customerSegment = "commercial"
} | ConvertTo-Json

try {
    Write-Host "  🔍 Testing Standard Funding Analysis" -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri "$backendUrl/api/analyze" -Method POST -ContentType "application/json" -Body $fundingData
    
    $fundingContent = if ($response.fundingOptions) { $response.fundingOptions } else { $response.fundingAnalysis }
    
    if ($fundingContent -and $fundingContent.Length -gt 200) {
        Write-Host "    ✅ Funding analysis content validated" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "    ⚠️  Funding analysis content may be insufficient" -ForegroundColor Yellow
        $testsWarning++
    }
    
    $fundingKeywords = @("funding", "investment", "financing", "capital", "budget")
    $hasKeywords = $false
    foreach ($keyword in $fundingKeywords) {
        if ($fundingContent -and $fundingContent.ToLower().Contains($keyword)) {
            $hasKeywords = $true
            break
        }
    }
    
    if ($hasKeywords) {
        Write-Host "    ✅ Funding terminology present" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "    ❌ Missing relevant funding terminology" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "    ❌ Funding analysis test failed: $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}

# Test 8.3: Follow-On Opportunity Analysis
Write-Host "`n🚀 Testing Follow-On Opportunity Analysis (Requirement 8.3)" -ForegroundColor Yellow
Write-Host "--------------------------------------------------"

$followOnData = @{
    CustomerName = "StartupTech Inc"
    region = "Canada"
    closeDate = "2025-05-30"
    oppName = "MVP Development Platform"
    oppDescription = "Initial MVP development platform for startup focusing on rapid prototyping and market validation."
    customerSegment = "startup"
} | ConvertTo-Json

try {
    Write-Host "  🔍 Testing Basic Follow-On Opportunities" -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri "$backendUrl/api/analyze" -Method POST -ContentType "application/json" -Body $followOnData
    
    $followOnContent = if ($response.followOnOpportunities) { $response.followOnOpportunities } else { $response.followOnAnalysis }
    
    if ($followOnContent -and $followOnContent.Length -gt 200) {
        Write-Host "    ✅ Follow-on analysis content validated" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "    ⚠️  Follow-on analysis content may be insufficient" -ForegroundColor Yellow
        $testsWarning++
    }
    
    $growthKeywords = @("growth", "expansion", "opportunity", "next", "future", "additional")
    $hasGrowthKeywords = $false
    foreach ($keyword in $growthKeywords) {
        if ($followOnContent -and $followOnContent.ToLower().Contains($keyword)) {
            $hasGrowthKeywords = $true
            break
        }
    }
    
    if ($hasGrowthKeywords) {
        Write-Host "    ✅ Growth terminology present" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "    ❌ Missing relevant growth terminology" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "    ❌ Follow-on analysis test failed: $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}

# Test 8.4: Rich Formatted Content Display
Write-Host "`n🎨 Testing Rich Formatted Content Display (Requirement 8.4)" -ForegroundColor Yellow
Write-Host "--------------------------------------------------"

try {
    Write-Host "  🔍 Testing Content Display" -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri "$backendUrl/api/analyze" -Method POST -ContentType "application/json" -Body $novaPremierData
    
    $requiredSections = @("methodology", "findings", "riskFactors", "similarProjects", "rationale", "fullAnalysis")
    $sectionsFound = 0
    
    foreach ($section in $requiredSections) {
        $sectionContent = $null
        if ($response.$section) {
            $sectionContent = $response.$section
        } elseif ($response.sections -and $response.sections.$section) {
            $sectionContent = $response.sections.$section
        }
        
        if ($sectionContent -and $sectionContent.Length -gt 50) {
            $sectionsFound++
        }
    }
    
    if ($sectionsFound -ge 4) {
        Write-Host "    ✅ Analysis sections coverage validated ($sectionsFound/6 sections)" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "    ❌ Insufficient analysis sections ($sectionsFound/6 sections)" -ForegroundColor Red
        $testsFailed++
    }
    
    $content = $response.formattedSummaryText
    if ($content -and ($content.Contains("**") -or $content.Contains("###") -or $content.Contains("==="))) {
        Write-Host "    ✅ Rich formatting markers present" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "    ⚠️  Limited formatting in content" -ForegroundColor Yellow
        $testsWarning++
    }
} catch {
    Write-Host "    ❌ Rich content display test failed: $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}

# Test 8.5: Export and Print Capabilities
Write-Host "`n📊 Testing Export and Print Capabilities (Requirement 8.5)" -ForegroundColor Yellow
Write-Host "--------------------------------------------------"

try {
    Write-Host "  🔍 Testing Export Data Structure" -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri "$backendUrl/api/analyze" -Method POST -ContentType "application/json" -Body $fundingData
    
    if ($response.metrics -and $response.formattedSummaryText) {
        Write-Host "    ✅ Complete data structure for export" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "    ❌ Incomplete data structure for export" -ForegroundColor Red
        $testsFailed++
    }
    
    if ($response.timestamp -or $response.sessionId -or $response.opportunityId) {
        Write-Host "    ✅ Export metadata available" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "    ⚠️  Missing metadata for export tracking" -ForegroundColor Yellow
        $testsWarning++
    }
} catch {
    Write-Host "    ❌ Export capabilities test failed: $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}

# Test 8.6: Performance and Reliability Standards
Write-Host "`n⚡ Testing Performance and Reliability Standards (Requirement 8.6)" -ForegroundColor Yellow
Write-Host "--------------------------------------------------"

try {
    Write-Host "  🔍 Testing Performance Standards" -ForegroundColor Cyan
    $testStart = Get-Date
    $response = Invoke-RestMethod -Uri "$backendUrl/api/analyze" -Method POST -ContentType "application/json" -Body $novaPremierData
    $duration = (Get-Date) - $testStart
    $durationMs = [math]::Round($duration.TotalMilliseconds)
    
    if ($durationMs -lt 30000) {
        Write-Host "    ✅ Response time within threshold: ${durationMs}ms" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "    ⚠️  Response time exceeded threshold: ${durationMs}ms" -ForegroundColor Yellow
        $testsWarning++
    }
} catch {
    Write-Host "    ❌ Performance test failed: $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}

# Test system health
try {
    Write-Host "  🔍 Testing System Health" -ForegroundColor Cyan
    $healthResponse = Invoke-RestMethod -Uri "$backendUrl/health" -Method GET
    
    if ($healthResponse.status -eq "healthy") {
        Write-Host "    ✅ System health check passed" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "    ⚠️  System health status: $($healthResponse.status)" -ForegroundColor Yellow
        $testsWarning++
    }
} catch {
    Write-Host "    ⚠️  Health check endpoint unavailable" -ForegroundColor Yellow
    $testsWarning++
}

# Display final results
$totalDuration = (Get-Date) - $startTime
$totalTests = $testsPassed + $testsFailed + $testsWarning
$successRate = if ($totalTests -gt 0) { [math]::Round(($testsPassed / $totalTests) * 100) } else { 0 }

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "🏁 TASK 8: ADVANCED FEATURES TESTING COMPLETE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "⏱️  Total Duration: $([math]::Round($totalDuration.TotalSeconds))s" -ForegroundColor White
Write-Host "✅ Tests Passed: $testsPassed" -ForegroundColor Green
Write-Host "❌ Tests Failed: $testsFailed" -ForegroundColor Red
Write-Host "⚠️  Warnings: $testsWarning" -ForegroundColor Yellow
Write-Host "📊 Success Rate: $successRate%" -ForegroundColor White

if ($testsFailed -eq 0) {
    Write-Host "`n🎉 All advanced features are working correctly!" -ForegroundColor Green
    Write-Host "✅ Task 8 requirements have been successfully validated" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some advanced features need attention" -ForegroundColor Yellow
    Write-Host "❌ Review failed tests before marking Task 8 as complete" -ForegroundColor Red
}

Write-Host "`n📋 Advanced features testing completed!" -ForegroundColor Cyan