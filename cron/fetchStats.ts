import { getPlayerDataThrottled } from './slippi'
import { updateGmTracker, ensureThresholdFile, resetGmHistory } from './gmTracker'
import { readHistory, addSnapshot, writeHistory, detectSeason } from './historyStore'
import * as syncFs from 'fs';
import * as path from 'path';

const fs = syncFs.promises;

// Players on the leaderboard live in cron/players.json — add or remove connect codes there.
const PLAYERS_FILE = path.join(__dirname, 'players.json');
// Connect codes that should never appear on the leaderboard, even as Grandmasters.
const EXCLUDED_FILE = path.join(__dirname, 'excluded-players.json');

const getExcludedCodes = async (): Promise<Set<string>> => {
  try {
    const codes: string[] = JSON.parse(await fs.readFile(EXCLUDED_FILE, 'utf-8'));
    return new Set(codes.map((c) => c.trim().toUpperCase()));
  } catch {
    return new Set();
  }
};

const getPlayerConnectCodes = async (): Promise<string[]> => {
  const codes: string[] = JSON.parse(await fs.readFile(PLAYERS_FILE, 'utf-8'));
  return [...new Set(codes.map((c) => c.trim()).filter(Boolean))];
};

// Elo first; ties (everyone starts a season at 1100) broken by MMR
const byRating = (a: any, b: any) =>
  (b.rankedNetplayProfile.ratingOrdinal - a.rankedNetplayProfile.ratingOrdinal) || ((b.mmr ?? 0) - (a.mmr ?? 0));

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
        // hidden skill rating, separate from the ladder Elo since season 6
        mmr: user.rankedRating?.mmr ?? null,
      };
    });
  return unsortedPlayers.sort(byRating)
}

/** Drops GraphQL "__typename" noise to keep the data files (and the site bundle) small. */
const stripTypenames = (value: any): any => {
  if (Array.isArray(value)) return value.map(stripTypenames);
  if (value && typeof value === 'object') {
    const out: any = {};
    Object.keys(value).forEach((k) => {
      if (k !== '__typename') out[k] = stripTypenames(value[k]);
    });
    return out;
  }
  return value;
};

/** players-old.json only feeds the "change since last update" arrows, so keep just what that needs. */
const slimForOld = (p: any) => ({
  displayName: p.displayName,
  connectCode: { code: p.connectCode.code },
  rankedNetplayProfile: {
    ratingOrdinal: p.rankedNetplayProfile.ratingOrdinal,
    ratingUpdateCount: p.rankedNetplayProfile.ratingUpdateCount,
    wins: p.rankedNetplayProfile.wins,
    losses: p.rankedNetplayProfile.losses,
  },
});

async function main() {
  console.log('Starting player fetch.');
  const tracked = await getPlayers();
  if(!tracked.length) {
    console.log('Error fetching player data. Terminating.')
    process.exitCode = 1;
    return
  }
  console.log(`Player fetch complete (${tracked.length} players).`);

  const dataDir = path.join(__dirname, 'data');
  await fs.mkdir(dataDir, { recursive: true });
  const newFile = path.join(dataDir, 'players-new.json')
  const oldFile = path.join(dataDir, 'players-old.json')
  const timestamp = path.join(dataDir, 'timestamp.json')
  const historyFile = path.join(dataDir, 'history.json')

  // Track the global top 300 (Grandmaster), compute the GM cutoff, and get every known GM.
  // Never let a GM-tracker problem block the normal leaderboard update.
  let gmPlayers: any[] = [];
  try {
    console.log('Updating GM tracker...');
    gmPlayers = (await updateGmTracker(tracked)).gmPlayers;
  } catch (e) {
    console.error('GM tracker failed (leaderboard update continues):', e);
    await ensureThresholdFile();
  }

  // Leaderboard = players in cron/players.json + every Grandmaster we know about,
  // minus anyone in cron/excluded-players.json
  const excluded = await getExcludedCodes();
  const isExcluded = (p: any) => excluded.has(String(p.connectCode.code).toUpperCase());
  const byCode = new Map<string, any>();
  tracked.filter((p: any) => !isExcluded(p)).forEach((p: any) => byCode.set(p.connectCode.code, p));
  let addedGMs = 0;
  gmPlayers.forEach((p: any) => {
    if (!isExcluded(p) && !byCode.has(p.connectCode.code)) {
      byCode.set(p.connectCode.code, p);
      addedGMs++;
    }
  });
  const players = stripTypenames([...byCode.values()]).sort(byRating);
  console.log(`Leaderboard: ${tracked.length} tracked players + ${addedGMs} other Grandmasters = ${players.length}.`);

  // rotate players-new -> players-old (used for the "since last update" arrows)
  if (syncFs.existsSync(newFile)) {
    try {
      const previous = JSON.parse(await fs.readFile(newFile, 'utf-8'));
      await fs.writeFile(oldFile, JSON.stringify((Array.isArray(previous) ? previous : []).map(slimForOld)));
    } catch {
      await fs.rename(newFile, oldFile);
    }
  }
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

  // Deploying is done by the caller (npm run update-and-deploy, the auto-update task, or GitHub Actions).
  console.log('Stats update complete.');
}

main();
