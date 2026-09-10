# Reset Season History
# Run this script at the start of a new Slippi ranked season to clear historical data

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Slippi Leaderboard Season Reset" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$historyFile = "cron/data/history.json"

# Check if history file exists
if (Test-Path $historyFile) {
    Write-Host "Current history file found." -ForegroundColor Yellow
    
    # Get file size for info
    $fileSize = (Get-Item $historyFile).Length
    $fileSizeKB = [math]::Round($fileSize / 1KB, 2)
    Write-Host "Current history size: $fileSizeKB KB" -ForegroundColor Gray
    
    # Confirm reset
    Write-Host ""
    Write-Host "WARNING: This will delete all historical rating data!" -ForegroundColor Red
    Write-Host "This should only be done at the start of a new ranked season." -ForegroundColor Yellow
    Write-Host ""
    $confirmation = Read-Host "Are you sure you want to reset the season history? (yes/no)"
    
    if ($confirmation -eq "yes") {
        # Backup the old history
        $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
        $backupFile = "cron/data/history_backup_$timestamp.json"
        Copy-Item $historyFile $backupFile
        Write-Host "Backup created: $backupFile" -ForegroundColor Green
        
        # Reset history to empty array
        Set-Content $historyFile "[]"
        Write-Host "History has been reset!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next time you run 'yarn fetch-stats', it will start fresh." -ForegroundColor Cyan
    } else {
        Write-Host "Reset cancelled." -ForegroundColor Yellow
    }
} else {
    Write-Host "No history file found. Nothing to reset." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
