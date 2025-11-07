# PowerShell script to run Reports tests with priority execution
# Usage: .\run-reports.ps1 [test-path] [additional-args]

param(
    [string]$TestPath = "e2e/Reports",
    [string]$AdditionalArgs = "--reporter=dot"
)

# Define priority tests that must run first
$PriorityTests = @(
    "e2e/Reports/Dispatch_Reports/Reports_Dispatch_flow_Aura_consolidated.spec.js",
    "e2e/Reports/Dispatch_Reports/Reports_Dispatch_flow_Vodacom.spec.js"
)

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Yellow
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host ""
}

function Test-ReportsExecution {
    param([string]$Path)
    return $Path -match "Reports" -or $Path -match "e2e/Reports"
}

# Check if this is a Reports execution
if (-not (Test-ReportsExecution $TestPath)) {
    Write-Host "Not a Reports execution, running normally..." -ForegroundColor Green
    & npx playwright test $TestPath $AdditionalArgs.Split(' ')
    exit $LASTEXITCODE
}

Write-Header "🔥 REPORTS EXECUTION DETECTED - PRIORITY TESTS WILL RUN FIRST"

# Step 1: Run priority tests first
Write-Header "⭐ RUNNING PRIORITY TESTS (FOUNDATION)"

$priorityFailed = $false
for ($i = 0; $i -lt $PriorityTests.Length; $i++) {
    $testFile = $PriorityTests[$i]
    $testName = Split-Path $testFile -Leaf
    
    Write-Host ""
    Write-Host "🎯 PRIORITY TEST $($i + 1)/$($PriorityTests.Length): $testName" -ForegroundColor Magenta
    Write-Host "-" * 50 -ForegroundColor Gray
    
    $command = "npx"
    $arguments = @("playwright", "test", $testFile) + $AdditionalArgs.Split(' ')
    
    Write-Host "Executing: npx playwright test $testFile $AdditionalArgs" -ForegroundColor Gray
    Write-Host ""
    
    try {
        & $command $arguments
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Priority test $($i + 1) completed successfully" -ForegroundColor Green
        } else {
            Write-Host "❌ Priority test $($i + 1) failed with exit code $LASTEXITCODE" -ForegroundColor Red
            $priorityFailed = $true
            Write-Host "⚠️  Continuing with remaining priority tests..." -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "❌ Priority test $($i + 1) failed: $($_.Exception.Message)" -ForegroundColor Red
        $priorityFailed = $true
        Write-Host "⚠️  Continuing with remaining priority tests..." -ForegroundColor Yellow
    }
}

Write-Header "🎯 PRIORITY TESTS COMPLETED"

if ($priorityFailed) {
    Write-Host "⚠️  Some priority tests failed, but continuing with remaining tests..." -ForegroundColor Yellow
}

# Step 2: Run remaining Reports tests (excluding priority tests)
Write-Header "📂 RUNNING REMAINING REPORTS TESTS"

# Create ignore patterns for priority tests
$ignoreArgs = @()
foreach ($test in $PriorityTests) {
    $ignoreArgs += "--ignore=$test"
}

$command = "npx"
$arguments = @("playwright", "test", $TestPath) + $ignoreArgs + $AdditionalArgs.Split(' ')

Write-Host "Executing: npx playwright test $TestPath $($ignoreArgs -join ' ') $AdditionalArgs" -ForegroundColor Gray
Write-Host ""

try {
    & $command $arguments
    $remainingExitCode = $LASTEXITCODE
    
    if ($remainingExitCode -eq 0) {
        Write-Host "✅ Remaining Reports tests completed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Remaining Reports tests failed with exit code $remainingExitCode" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Remaining Reports tests failed: $($_.Exception.Message)" -ForegroundColor Red
    $remainingExitCode = 1
}

# Final summary
Write-Header "🎉 REPORTS EXECUTION SUMMARY"

if ($priorityFailed -and $remainingExitCode -ne 0) {
    Write-Host "❌ BOTH priority tests and remaining tests had failures" -ForegroundColor Red
    exit 1
} elseif ($priorityFailed) {
    Write-Host "⚠️  Priority tests had failures, but remaining tests passed" -ForegroundColor Yellow
    exit 1
} elseif ($remainingExitCode -ne 0) {
    Write-Host "⚠️  Priority tests passed, but remaining tests had failures" -ForegroundColor Yellow
    exit $remainingExitCode
} else {
    Write-Host "✅ ALL TESTS COMPLETED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "🔄 Priority tests ran first, followed by remaining Reports tests" -ForegroundColor Cyan
    exit 0
}