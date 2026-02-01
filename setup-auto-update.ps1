#!/usr/bin/env pwsh
# Setup script for Windows Task Scheduler automation
# Creates a scheduled task to run the leaderboard update every 30 minutes

param(
    [switch]$Remove = $false,
    [int]$IntervalMinutes = 30
)

$TaskName = "MM-Slippi-Leaderboard-Auto-Update"
$ProjectRoot = $PSScriptRoot
$ScriptPath = Join-Path $ProjectRoot "auto-update-daemon.ps1"

if ($Remove) {
    # Remove the scheduled task
    Write-Host "🗑️ Removing scheduled task '$TaskName'..." -ForegroundColor Yellow
    try {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop
        Write-Host "✅ Scheduled task removed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error removing task: $_" -ForegroundColor Red
        Write-Host "💡 The task might not exist or you may need to run as Administrator" -ForegroundColor Yellow
    }
    exit
}

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "⚠️ This script needs to run as Administrator to create scheduled tasks." -ForegroundColor Yellow
    Write-Host "💡 Right-click PowerShell and select 'Run as Administrator', then run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "🚀 Setting up automatic updates for MM Slippi Leaderboard" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host "📁 Project root: $ProjectRoot" -ForegroundColor Gray
Write-Host "📄 Script path: $ScriptPath" -ForegroundColor Gray
Write-Host "⏰ Update interval: $IntervalMinutes minutes" -ForegroundColor Gray
Write-Host ""

# Verify the daemon script exists
if (-not (Test-Path $ScriptPath)) {
    Write-Host "❌ Error: auto-update-daemon.ps1 not found at $ScriptPath" -ForegroundColor Red
    exit 1
}

try {
    # Remove existing task if it exists
    try {
        Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop | Out-Null
        Write-Host "🔄 Removing existing scheduled task..." -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    } catch {
        # Task doesn't exist, which is fine
    }

    # Create the scheduled task action
    $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"$ScriptPath`" -RunOnce"

    # Create the trigger (every 30 minutes)
    $Trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) -RepetitionDuration (New-TimeSpan -Days 365) -At (Get-Date).AddMinutes(1)

    # Create task settings
    $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable

    # Create the principal (run as current user)
    $Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive

    # Register the scheduled task
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Description "Automatically updates MM Slippi Leaderboard every $IntervalMinutes minutes"

    Write-Host "✅ Scheduled task created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Task Details:" -ForegroundColor Yellow
    Write-Host "   • Task Name: $TaskName" -ForegroundColor Gray
    Write-Host "   • Runs every: $IntervalMinutes minutes" -ForegroundColor Gray
    Write-Host "   • First run: $(Get-Date -Date (Get-Date).AddMinutes(1) -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
    Write-Host "   • Logs: cron/logs/auto-update.log" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🎛️ Management Commands:" -ForegroundColor Yellow
    Write-Host "   • View task: Get-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Gray
    Write-Host "   • Start now: Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Gray
    Write-Host "   • Remove task: .\setup-auto-update.ps1 -Remove" -ForegroundColor Gray
    Write-Host "   • View logs: Get-Content cron/logs/auto-update.log -Tail 20" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🚀 Your leaderboard will now update automatically every $IntervalMinutes minutes!" -ForegroundColor Green

} catch {
    Write-Host "❌ Error creating scheduled task: $_" -ForegroundColor Red
    Write-Host "💡 Make sure you're running as Administrator" -ForegroundColor Yellow
}