How to update the leaderboard:
1. Make sure git is up to date (usually use git add. and then git commit -m ":)" )
2.Open fetchStats.ts and navigate to const getPlayerConnectCodes array and input it there. 
3.yarn ts-node cron/fetchStats.ts 
4.Run the deploy script:
   Option A (Recommended, Does both fetch stats and also updates the website): npm run update-and-deploy
   Option B: npm run deploy (requires GitHub token setup)


Alternative: Use Git Credential Manager:
git config --global credential.helper manager

might need to clear the cache of the leaderboard website after deploying.
Make sure you are in the directory C:\Users\jojog\Desktop\WebDev\Slippi Leaderboard\CoSlippiLeaderboard
git add .  
git commit -m ":)"

HISTORY TRACKING:
The leaderboard now tracks player rating history indefinitely across the entire season.
History snapshots are saved every time you run 'yarn fetch-stats' or 'npm run update-and-deploy'.

When a new Slippi ranked season starts, reset the historical data:
   npm run reset-season

This will create a backup and clear history to start fresh for the new season.

AUTOMATIC UPDATES (NEW!):
Set up automatic updates every 30 minutes while your computer is on:

1. Setup (run as Administrator):
   npm run setup-auto-update

2. Check status anytime:
   npm run check-auto-update

3. Test single run:
   npm run test-auto-update

4. Remove automation:
   npm run setup-auto-update -- -Remove

The system will:
- Automatically fetch stats and deploy every 30 minutes
- Log all activity to cron/logs/auto-update.log
- Handle errors gracefully and retry next cycle
- Only run when your computer is on (pauses during sleep)
- Use Windows Task Scheduler (built-in, reliable)

Once set up, your leaderboard stays updated automatically - no manual work needed!