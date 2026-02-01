@echo off
echo.
echo 🚀 Starting MM Slippi Leaderboard Update ^& Deploy Process
echo =================================================
echo.

REM Check if we're in the right directory
if not exist package.json (
    echo ❌ Error: package.json not found. Make sure you're in the project root directory.
    pause
    exit /b 1
)

REM Step 1: Fetch latest stats
echo 📊 Step 1: Fetching latest player stats...
echo Running: yarn ts-node cron/fetchStats.ts
echo.

yarn ts-node cron/fetchStats.ts
if %errorlevel% neq 0 (
    echo ❌ Error fetching stats. Aborting deployment...
    pause
    exit /b 1
)

echo ✅ Stats fetched successfully!
echo.

REM Step 2: Deploy to GitHub Pages
echo 🌐 Step 2: Deploying to GitHub Pages...
echo Running: npm run deploy
echo.

npm run deploy
if %errorlevel% neq 0 (
    echo ❌ Error during deployment.
    pause
    exit /b 1
)

echo.
echo 🎉 Update ^& Deploy Complete!
echo =================================================
echo ✅ Player stats have been updated
echo ✅ Website has been deployed to GitHub Pages
echo 🌐 Your leaderboard should be live shortly!
echo.
pause