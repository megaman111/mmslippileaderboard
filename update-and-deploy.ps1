#!/usr/bin/env pwsh
# Script to fetch stats and deploy the updated leaderboard

Write-Host "🚀 Starting MM Slippi Leaderboard Update & Deploy Process" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found. Make sure you're in the project root directory." -ForegroundColor Red
    exit 1
}

# Step 1: Fetch latest stats
Write-Host ""
Write-Host "📊 Step 1: Fetching latest player stats..." -ForegroundColor Yellow
Write-Host "Running: yarn ts-node cron/fetchStats.ts" -ForegroundColor Gray

try {
    yarn ts-node cron/fetchStats.ts
    if ($LASTEXITCODE -ne 0) {
        throw "Fetch stats failed with exit code $LASTEXITCODE"
    }
    Write-Host "✅ Stats fetched successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error fetching stats: $_" -ForegroundColor Red
    Write-Host "Aborting deployment..." -ForegroundColor Red
    exit 1
}

# Step 2: Deploy to GitHub Pages
Write-Host ""
Write-Host "🌐 Step 2: Deploying to GitHub Pages..." -ForegroundColor Yellow
Write-Host "Running: npm run deploy" -ForegroundColor Gray

try {
    npm run deploy
    if ($LASTEXITCODE -ne 0) {
        throw "Deploy failed with exit code $LASTEXITCODE"
    }
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error during deployment: $_" -ForegroundColor Red
    exit 1
}

# Success message
Write-Host ""
Write-Host "🎉 Update & Deploy Complete!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host "✅ Player stats have been updated" -ForegroundColor Green
Write-Host "✅ Website has been deployed to GitHub Pages" -ForegroundColor Green
Write-Host "🌐 Your leaderboard should be live shortly!" -ForegroundColor Green
Write-Host ""