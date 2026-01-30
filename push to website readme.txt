How to update the leaderboard:
1.Open fetchStats.ts and navigate to const getPlayerConnectCodes array and input it there. 
2.yarn ts-node cron/fetchStats.ts 
3.Run the deploy script:
   Option A (Recommended): .\deploy.ps1
   Option B: npm run deploy (requires GitHub token setup)

Setup GitHub Token (one-time setup):
1. Create a Personal Access Token at: https://github.com/settings/tokens
2. Give it 'repo' scope (or 'public_repo' for public repos)
3. Set it as an environment variable:
   $env:GITHUB_TOKEN = 'your-token-here'
4. Or add it to your PowerShell profile for persistence

Alternative: Use Git Credential Manager:
git config --global credential.helper manager

might need to clear the cache of the leaderboard website after deploying.
Make sure you are in the directory C:\Users\jojog\Desktop\WebDev\Slippi Leaderboard\CoSlippiLeaderboard
git add .  
git commit -m ":)"