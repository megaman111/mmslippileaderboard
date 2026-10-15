import { getPlayerDataThrottled } from './slippi'
import { updateGmTracker, ensureThresholdFile, resetGmHistory } from './gmTracker'
import { readHistory, addSnapshot, writeHistory, detectSeason } from './historyStore'
import * as syncFs from 'fs';
import * as path from 'path';

const fs = syncFs.promises;

// Players on the leaderboard live in cron/players.json — add or remove connect codes there.
const PLAYERS_FILE = path.join(__dirname, 'players.json');

const getPlayerConnectCodes = async (): Promise<string[]> => {
  const codes: string[] = JSON.parse(await fs.readFile(PLAYERS_FILE, 'utf-8'));
  return [...new Set(codes.map((c) => c.trim()).filter(Boolean))];
};

const getPlayers = async () => {
  const codes = await getPlayerConnectCodes()
  console.log(`Found ${codes.length} player codes`)
  const allData = codes.map(code => getPlayerDataThrottled(code))
  const results = await Promise.all(allData.map(p => p.catch(e => e)));
  const validResults = results.filter(result => !(result instanceof Error));
  const unsortedPlayers = validResults
    .filter((data: any) => data?.data?.getUser)
    .map((data: any) => {
      const user = data.data.getUser;
      return {
        displayName: user.displayName,
        connectCode: user.connectCode,
        rankedNetplayProfile: user.rankedNetplayProfile,
        continent: user.rankedNetplayProfile?.continent ?? null,
        subscriptionLevel: user.activeSubscription?.level ?? null,
      };
    });
  return unsortedPlayers.sort((p1, p2) =>
    p2.rankedNetplayProfile.ratingOrdinal - p1.rankedNetplayProfile.ratingOrdinal)
}

async function main() {
  console.log('Starting player fetch.');
  const players = await getPlayers();
  if(!players.length) {
    console.log('Error fetching player data. Terminating.')
    process.exitCode = 1;
    return
  }
  console.log(`Player fetch complete (${players.length} players).`);

  const dataDir = path.join(__dirname, 'data');
  await fs.mkdir(dataDir, { recursive: true });
  const newFile = path.join(dataDir, 'players-new.json')
  const oldFile = path.join(dataDir, 'players-old.json')
  const timestamp = path.join(dataDir, 'timestamp.json')
  const historyFile = path.join(dataDir, 'history.json')

  // rotate players-new -> players-old (used for the "since last update" arrows)
  if (syncFs.existsSync(newFile)) await fs.rename(newFile, oldFile);
  await fs.writeFile(newFile, JSON.stringify(players));
  await fs.writeFile(timestamp, JSON.stringify({updated: Date.now()}));

  // History: one compact snapshot per run, automatic reset when Slippi starts a new season
  const history = await readHistory(historyFile);
  const season = detectSeason(players);
  if (season && history.season && season !== history.season) {
    const backup = path.join(dataDir, `history-${history.season}.json`);
    await writeHistory(backup, history);
    console.log(`New Slippi season detected (${history.season} -> ${season}). Old history saved to ${backup}.`);
    history.snapshots = [];
    await resetGmHistory();
  }
  history.season = season ?? history.season;
  const added = addSnapshot(history, players);
  await writeHistory(historyFile, history);
  console.log(`History: ${history.snapshots.length} snapshots (${added ? 'added one' : 'no changes since last run'}).`);

  // Track the global top 300 (Grandmaster) and compute the GM cutoff.
  // Never let a GM-tracker problem block the normal leaderboard update.
  try {
    console.log('Updating GM tracker...');
    await updateGmTracker(players.map((p: any) => p.connectCode.code));
  } catch (e) {
    console.error('GM tracker failed (leaderboard update continues):', e);
    await ensureThresholdFile();
  }

  // Deploying is done by the caller (npm run update-and-deploy, the auto-update task, or GitHub Actions).
  console.log('Stats update complete.');
}

main();
