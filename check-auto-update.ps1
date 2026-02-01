#!/usr/bin/env pwsh
# Check the status of the auto-update system

$TaskName = "MM-Slippi-Leaderboard-Auto-Update"
$LogFile = "cron/logs/auto-update.log"

Write-Host "🔍 MM Slippi Leaderboard Auto-Update Status" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Check if scheduled task exists
try {
    $Task = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
    $TaskInfo = Get-ScheduledTaskInfo -TaskName $TaskName
    
    Write-Host "✅ Scheduled Task Status: ACTIVE" -ForegroundColor Green
    Write-Host "   • State: $($Task.State)" -ForegroundColor Gray
    Write-Host "   • Last Run: $($TaskInfo.LastRunTime)" -ForegroundColor Gray
    Write-Host "   • Next Run: $($TaskInfo.NextRunTime)" -ForegroundColor Gray
    Write-Host "   • Last Result: $($TaskInfo.LastTaskResult)" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Scheduled Task Status: NOT FOUND" -ForegroundColor Red
    Write-Host "💡 Run .\setup-auto-update.ps1 to create the scheduled task" -ForegroundColor Yellow
}

Write-Host ""

# Check log file
if (Test-Path $LogFile) {
    Write-Host "📋 Recent Log Entries (Last 10):" -ForegroundColor Yellow
    Get-Content $LogFile -Tail 10 | ForEach-Object {
        if ($_ -match "\[ERROR\]") {
            Write-Host "   $_" -ForegroundColor Red
        } elseif ($_ -match "\[WARN\]") {
            Write-Host "   $_" -ForegroundColor Yellow
        } elseif ($_ -match "\[INFO\]") {
            Write-Host "   $_" -ForegroundColor Gray
        } else {
            Write-Host "   $_" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "📋 Log File: NOT FOUND" -ForegroundColor Yellow
    Write-Host "💡 Log will be created after first run: $LogFile" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🎛️ Management Commands:" -ForegroundColor Yellow
Write-Host "   • Start task now: Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Gray
Write-Host "   • Stop task: Stop-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Gray
Write-Host "   • Remove task: .\setup-auto-update.ps1 -Remove" -ForegroundColor Gray
Write-Host "   • Test single run: .\auto-update-daemon.ps1 -RunOnce" -ForegroundColor Gray
Write-Host "   • View full log: Get-Content $LogFile" -ForegroundColor Gray