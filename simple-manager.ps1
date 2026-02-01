#!/usr/bin/env pwsh
# Simple Leaderboard Manager

$FetchStatsFile = "cron/fetchStats.ts"

function Get-CurrentPlayers {
    try {
        $content = Get-Content $FetchStatsFile -Raw
        $match = [regex]::Match($content, 'return\s*\[([\s\S]*?)\];')
        if ($match.Success) {
            $arrayContent = $match.Groups[1].Value
            $players = [regex]::Matches($arrayContent, '"([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
            return $players
        }
    } catch {
        Write-Host "Error reading fetchStats.ts: $_" -ForegroundColor Red
    }
    return @()
}

function Show-CurrentPlayers {
    $players = Get-CurrentPlayers
    Write-Host ""
    Write-Host "Current Players ($($players.Count)):" -ForegroundColor Green
    Write-Host "========================" -ForegroundColor Green
    
    if ($players.Count -eq 0) {
        Write-Host "No players found." -ForegroundColor Yellow
    } else {
        for ($i = 0; $i -lt $players.Count; $i++) {
            Write-Host "$($i + 1). $($players[$i])" -ForegroundColor Cyan
        }
    }
    Write-Host ""
}

function Add-Player {
    $players = Get-CurrentPlayers
    Write-Host ""
    Write-Host "Add New Player" -ForegroundColor Green
    Write-Host "===============" -ForegroundColor Green
    
    $newPlayer = Read-Host "Enter connect code (e.g., MM#391)"
    $newPlayer = $newPlayer.Trim().ToUpper()
    
    if (-not $newPlayer) {
        Write-Host "No player code entered." -ForegroundColor Red
        return
    }
    
    if (-not $newPlayer.Contains('#')) {
        Write-Host "Connect code must include # (e.g., MM#391)" -ForegroundColor Red
        return
    }
    
    if ($players -contains $newPlayer) {
        Write-Host "Player $newPlayer already exists." -ForegroundColor Red
        return
    }
    
    $players += $newPlayer
    Save-Players $players
    Write-Host "Added $newPlayer to the list!" -ForegroundColor Green
}

function Remove-Player {
    $players = Get-CurrentPlayers
    
    if ($players.Count -eq 0) {
        Write-Host "No players to remove." -ForegroundColor Red
        return
    }
    
    Write-Host ""
    Write-Host "Remove Player" -ForegroundColor Green
    Write-Host "=============" -ForegroundColor Green
    
    Show-CurrentPlayers
    
    $choice = Read-Host "Enter player number to remove (1-$($players.Count))"
    
    try {
        $index = [int]$choice - 1
        if ($index -ge 0 -and $index -lt $players.Count) {
            $removedPlayer = $players[$index]
            $players = $players | Where-Object { $_ -ne $removedPlayer }
            Save-Players $players
            Write-Host "Removed $removedPlayer from the list!" -ForegroundColor Green
        } else {
            Write-Host "Invalid selection." -ForegroundColor Red
        }
    } catch {
        Write-Host "Invalid input. Please enter a number." -ForegroundColor Red
    }
}

function Save-Players {
    param([string[]]$PlayerList)
    
    try {
        $content = Get-Content $FetchStatsFile -Raw
        $newArrayString = ($PlayerList | ForEach-Object { "`"$_`"" }) -join ",`n    "
        $newContent = $content -replace 'return\s*\[([\s\S]*?)\];', "return [`n    $newArrayString`n  ];"
        
        Set-Content $FetchStatsFile -Value $newContent -Encoding UTF8
        Write-Host "Player list saved to fetchStats.ts" -ForegroundColor Green
    } catch {
        Write-Host "Error saving players: $_" -ForegroundColor Red
    }
}

function Update-Leaderboard {
    Write-Host ""
    Write-Host "Updating & Deploying Leaderboard..." -ForegroundColor Green
    Write-Host "====================================" -ForegroundColor Green
    
    try {
        Write-Host "Fetching latest player stats..." -ForegroundColor Yellow
        & npm run update-and-deploy
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Leaderboard updated and deployed successfully!" -ForegroundColor Green
        } else {
            Write-Host "Update completed with warnings. Check output above." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Error updating leaderboard: $_" -ForegroundColor Red
    }
}

# Main execution
Clear-Host
Write-Host "MM Slippi Leaderboard Manager" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green

do {
    Write-Host ""
    Write-Host "What would you like to do?" -ForegroundColor Yellow
    Write-Host "1. View current players" -ForegroundColor White
    Write-Host "2. Add a player" -ForegroundColor White
    Write-Host "3. Remove a player" -ForegroundColor White
    Write-Host "4. Update & deploy leaderboard" -ForegroundColor White
    Write-Host "5. Exit" -ForegroundColor White
    Write-Host ""
    
    $choice = Read-Host "Enter your choice (1-5)"
    
    switch ($choice) {
        "1" { 
            Show-CurrentPlayers
            Read-Host "Press Enter to continue"
        }
        "2" { 
            Add-Player
            Read-Host "Press Enter to continue"
        }
        "3" { 
            Remove-Player
            Read-Host "Press Enter to continue"
        }
        "4" { 
            Update-Leaderboard
            Read-Host "Press Enter to continue"
        }
        "5" { 
            Write-Host "Goodbye!" -ForegroundColor Green
            break
        }
        default { 
            Write-Host "Invalid choice. Please enter 1-5." -ForegroundColor Red
            Start-Sleep 2
        }
    }
} while ($choice -ne "5")