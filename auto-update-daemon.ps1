#!/usr/bin/env pwsh
# Auto-Update Daemon for MM Slippi Leaderboard
# Runs every 30 minutes to fetch stats and deploy updates

param(
    [switch]$RunOnce = $false,
    [int]$IntervalMinutes = 30
)

# Configuration
$LogFile = "cron/logs/auto-update.log"
$ProjectRoot = $PSScriptRoot

# Ensure we're in the project directory
Set-Location $ProjectRoot

# Function to write timestamped logs
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] [$Level] $Message"
    Write-Host $LogEntry
    Add-Content -Path $LogFile -Value $LogEntry
}

# Function to run the update and deploy process
function Invoke-UpdateAndDeploy {
    Write-Log "🚀 Starting automated update cycle" "INFO"
    
    try {
        # Check if we're in the right directory
        if (-not (Test-Path "package.json")) {
            throw "package.json not found. Not in project root directory."
        }

        # Step 1: Fetch latest stats
        Write-Log "📊 Fetching latest player stats..." "INFO"
        $fetchResult = & yarn ts-node cron/fetchStats.ts 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Fetch stats failed: $fetchResult"
        }
        Write-Log "✅ Stats fetched successfully" "INFO"

        # Step 2: Deploy to GitHub Pages
        Write-Log "🌐 Deploying to GitHub Pages..." "INFO"
        $deployResult = & npm run deploy 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Deploy failed: $deployResult"
        }
        Write-Log "✅ Deployment successful" "INFO"
        
        Write-Log "🎉 Update cycle completed successfully" "INFO"
        return $true
        
    } catch {
        Write-Log "❌ Error during update cycle: $_" "ERROR"
        return $false
    }
}

# Create logs directory if it doesn't exist
if (-not (Test-Path "cron/logs")) {
    New-Item -ItemType Directory -Path "cron/logs" -Force | Out-Null
}

# Initialize log file
Write-Log "🤖 Auto-Update Daemon Started" "INFO"
Write-Log "📅 Update interval: $IntervalMinutes minutes" "INFO"
Write-Log "📁 Project root: $ProjectRoot" "INFO"

if ($RunOnce) {
    # Run once and exit
    Write-Log "🔄 Running single update cycle..." "INFO"
    $success = Invoke-UpdateAndDeploy
    if ($success) {
        Write-Log "✅ Single update completed successfully" "INFO"
        exit 0
    } else {
        Write-Log "❌ Single update failed" "ERROR"
        exit 1
    }
} else {
    # Continuous mode
    Write-Log "🔄 Starting continuous update mode..." "INFO"
    Write-Log "⏰ Next update in $IntervalMinutes minutes" "INFO"
    
    while ($true) {
        try {
            # Wait for the specified interval
            Start-Sleep -Seconds ($IntervalMinutes * 60)
            
            # Run update and deploy
            $success = Invoke-UpdateAndDeploy
            
            if ($success) {
                Write-Log "⏰ Next update in $IntervalMinutes minutes" "INFO"
            } else {
                Write-Log "⚠️ Update failed, will retry in $IntervalMinutes minutes" "WARN"
            }
            
        } catch {
            Write-Log "💥 Unexpected error in daemon loop: $_" "ERROR"
            Write-Log "🔄 Continuing daemon operation..." "INFO"
        }
    }
}