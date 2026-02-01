param(
    [switch]$Remove = $false,
    [int]$IntervalMinutes = 30
)

$TaskName = "MM-Slippi-Leaderboard-Auto-Update"
$ProjectRoot = $PSScriptRoot
$ScriptPath = Join-Path $ProjectRoot "auto-update-daemon.ps1"

if ($Remove) {
    Write-Host "Removing scheduled task '$TaskName'..." -ForegroundColor Yellow
    try {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop
        Write-Host "Scheduled task removed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "Error removing task: $_" -ForegroundColor Red
    }
    exit
}

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "This script needs to run as Administrator to create scheduled tasks." -ForegroundColor Yellow
    Write-Host "Right-click PowerShell and select 'Run as Administrator', then run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "Setting up automatic updates for MM Slippi Leaderboard" -ForegroundColor Green
Write-Host "Project root: $ProjectRoot" -ForegroundColor Gray
Write-Host "Script path: $ScriptPath" -ForegroundColor Gray
Write-Host "Update interval: $IntervalMinutes minutes" -ForegroundColor Gray

# Verify the daemon script exists
if (-not (Test-Path $ScriptPath)) {
    Write-Host "Error: auto-update-daemon.ps1 not found at $ScriptPath" -ForegroundColor Red
    exit 1
}

try {
    # Remove existing task if it exists
    try {
        Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop | Out-Null
        Write-Host "Removing existing scheduled task..." -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    } catch {
        # Task doesn't exist, which is fine
    }

    # Create the scheduled task action (run hidden)
    $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$ScriptPath`" -RunOnce"

    # Create the trigger (every X minutes)
    $Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) -RepetitionDuration (New-TimeSpan -Days 3650)

    # Create task settings (run hidden in background)
    $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable -Hidden

    # Create the principal (run as current user, no interactive logon needed)
    $Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType S4U

    # Register the scheduled task
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Description "Automatically updates MM Slippi Leaderboard every $IntervalMinutes minutes"

    Write-Host "Scheduled task created successfully (runs hidden in background)!" -ForegroundColor Green
    Write-Host "Task Name: $TaskName" -ForegroundColor Gray
    Write-Host "Runs every: $IntervalMinutes minutes" -ForegroundColor Gray
    Write-Host "Your leaderboard will now update automatically every $IntervalMinutes minutes!" -ForegroundColor Green

} catch {
    Write-Host "Error creating scheduled task: $_" -ForegroundColor Red
    Write-Host "Make sure you're running as Administrator" -ForegroundColor Yellow
}