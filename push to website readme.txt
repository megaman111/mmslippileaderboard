How to update the leaderboard:
1. Make sure git is up to date (usually use git add. and then git commit -m ":)" )
2.To add or remove players, edit cron/players.json (one connect code per line, e.g. "MM#391",).
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

New seasons are detected automatically: when Slippi starts a new season, the old
history is saved to cron/data/history-season-N.json and a fresh one begins.
(npm run reset-season still works if you ever want to reset by hand.)

GM CUTOFF:
Every stats update also runs the GM tracker (cron/gmTracker.ts). It keeps a pool of
known/likely Grandmasters in cron/data/gm-pool.json and writes the cutoff to
cron/data/gm-threshold.json. To help it find more GMs, add codes to cron/gm-seed.json.
Every known North American GM is added to the leaderboard automatically, and the cutoff
is fitted from NA GMs only. To keep someone off the board, add their code to
cron/excluded-players.json.

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