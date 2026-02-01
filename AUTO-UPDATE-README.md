# 🤖 Auto-Update System for MM Slippi Leaderboard

This system automatically updates your leaderboard every 30 minutes while your computer is on.

## 🚀 Quick Setup

### 1. Setup Automatic Updates
Run this command **as Administrator** (right-click PowerShell → "Run as Administrator"):
```powershell
npm run setup-auto-update
```

### 2. Check Status
```powershell
npm run check-auto-update
```

### 3. Test Single Run
```powershell
npm run test-auto-update
```

## 📋 What It Does

- **Fetches latest player stats** from Slippi API every 30 minutes
- **Builds and deploys** the updated website to GitHub Pages
- **Logs all activity** to `cron/logs/auto-update.log`
- **Runs only when your computer is on** (pauses when sleeping/off)
- **Handles errors gracefully** and retries on the next cycle

## 🎛️ Management Commands

### PowerShell Commands
```powershell
# View scheduled task details
Get-ScheduledTask -TaskName "MM-Slippi-Leaderboard-Auto-Update"

# Start the task immediately
Start-ScheduledTask -TaskName "MM-Slippi-Leaderboard-Auto-Update"

# Stop the task
Stop-ScheduledTask -TaskName "MM-Slippi-Leaderboard-Auto-Update"

# View recent logs
Get-Content cron/logs/auto-update.log -Tail 20

# Remove the scheduled task
.\setup-auto-update.ps1 -Remove
```

### NPM Scripts
```bash
# Setup automation (run as Administrator)
npm run setup-auto-update

# Check status and recent logs
npm run check-auto-update

# Test a single update cycle
npm run test-auto-update
```

## 📁 Files Created

- `auto-update-daemon.ps1` - Main automation script
- `setup-auto-update.ps1` - Setup/removal script for Windows Task Scheduler
- `check-auto-update.ps1` - Status checking script
- `cron/logs/auto-update.log` - Activity log file

## ⚙️ Configuration

### Change Update Interval
To change from 30 minutes to a different interval:
```powershell
.\setup-auto-update.ps1 -IntervalMinutes 15  # Every 15 minutes
.\setup-auto-update.ps1 -IntervalMinutes 60  # Every hour
```

### Manual Override
You can still run manual updates anytime:
```bash
npm run update-and-deploy
```

## 🔍 Troubleshooting

### Task Not Running?
1. Check if task exists: `npm run check-auto-update`
2. Verify you ran setup as Administrator
3. Check Windows Task Scheduler (taskschd.msc)

### Deployment Failing?
1. Check logs: `Get-Content cron/logs/auto-update.log`
2. Test manual run: `npm run test-auto-update`
3. Verify GitHub credentials and permissions

### Computer Sleep/Hibernate
- Task will resume when computer wakes up
- Missed updates will run on next scheduled time
- No updates occur when computer is off (by design)

## 🛑 Stopping Auto-Updates

To completely remove the automation:
```powershell
.\setup-auto-update.ps1 -Remove
```

Or use npm:
```bash
npm run setup-auto-update -- -Remove
```

## 📊 Monitoring

The system logs all activity to `cron/logs/auto-update.log`. Each entry includes:
- Timestamp
- Log level (INFO, WARN, ERROR)
- Detailed status messages
- Error details if something fails

Check recent activity:
```powershell
npm run check-auto-update
```

## 🎯 Benefits

- ✅ **Always up-to-date** - Your leaderboard stays current automatically
- ✅ **Set and forget** - No manual intervention needed
- ✅ **Error handling** - Continues working even if individual updates fail
- ✅ **Logging** - Full visibility into what's happening
- ✅ **Flexible** - Easy to start, stop, or modify
- ✅ **Windows native** - Uses built-in Task Scheduler (no third-party tools)