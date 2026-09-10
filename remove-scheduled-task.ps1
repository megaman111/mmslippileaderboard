# Remove the auto-update scheduled task
# Run this script as Administrator

Write-Host "Removing MM Slippi Leaderboard Auto-Update scheduled task..." -ForegroundColor Yellow

try {
    # Check if task exists
    $task = Get-ScheduledTask -TaskName "MM-Slippi-Leaderboard-Auto-Update" -ErrorAction SilentlyContinue
    
    if ($task) {
        # Stop the task if it's running
        Stop-ScheduledTask -TaskName "MM-Slippi-Leaderboard-Auto-Update" -ErrorAction SilentlyContinue
        Write-Host "Task stopped." -ForegroundColor Green
        
        # Remove the task
        Unregister-ScheduledTask -TaskName "MM-Slippi-Leaderboard-Auto-Update" -Confirm:$false
        Write-Host "Scheduled task 'MM-Slippi-Leaderboard-Auto-Update' has been removed successfully!" -ForegroundColor Green
    } else {
        Write-Host "Task 'MM-Slippi-Leaderboard-Auto-Update' not found." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error removing scheduled task: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure you're running PowerShell as Administrator." -ForegroundColor Yellow
}

Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")