/**
 * GM Tracker
 *
 * Slippi's public leaderboard only shows the top 50 per region, but Grandmaster is
 * awarded to the top 300 players by a once-a-day snapshot. Every GM's profile
 * exposes `dailyGlobalPlacement` (their exact rank in that snapshot), so if we know
 * enough GMs we can pin the rating at placement #300 very precisely.
 *
 * How we find GMs (the "pool"):
 *   1. Slippi's own top-50 per region (slippi.firebaseio.com/ranked-leaderboards)
 *   2. Every regional leaderboard built from the same template as this site
 *      (forks of Grantismo/CoSlippiLeaderboard) – their player lists are public on GitHub
 *   3. The players this leaderboard tracks
 *   4. A bundled seed list (cron/gm-seed.json) so the first run is fast
 * Once a code is in the pool it stays there and is re-checked on a schedule, so the
 * pool keeps growing over the season.
 *
 * How the cutoff is computed:
 *   Take known GMs near the bottom of the ladder (placement >= 200), fit
 *   rating ~ placement with a Theil–Sen (median-of-slopes) line, which ignores
 *   players whose rating moved since the daily snapshot, and read the line at #300.
 */
import { RateLimiter } from 'limiter';
import * as syncFs from 'fs';
import * as path from 'path';

const fs = syncFs.promises;

export const GM_SLOTS = 300;
export const GM_MIN_RATING = 2191.75; // same constant slippi.gg uses for Master 1 / GM eligibility

const DATA_DIR = path.join(__dirname, 'data');
const POOL_FILE = path.join(DATA_DIR, 'gm-pool.json');
const OUT_FILE = path.join(DATA_DIR, 'gm-threshold.json');
const SEED_FILE = path.join(__dirname, 'gm-seed.json');
const TEMPLATE_REPO = 'Grantismo/CoSlippiLeaderboard';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const HOT_RATING = 2150;      // GMs and anyone close: refreshed every few hours
const WARM_RATING = 1900;     // could climb into GM within days: refreshed daily
const HOT_INTERVAL = 3 * HOUR;
const WARM_INTERVAL = DAY;
const COLD_INTERVAL = 7 * DAY;
const DISCOVERY_INTERVAL = DAY;
const MAX_REQUESTS_PER_RUN = 700;
const FIT_MIN_PLACEMENT = 200;

interface PoolEntry {
  code: string;
  name: string | null;
  rating: number | null;
  updates: number;
  global: number | null;
  regional: number | null;
  continent: string | null;
  checkedAt: number; // 0 = never
  missing?: boolean;
}

interface Pool {
  players: Record<string, PoolEntry>;
  lastDiscovery: number;
}

export interface GmListEntry {
  code: string;
  name: string | null;
  rating: number;
  global: number | null;
  regional: number | null;
  continent: string | null;
}

export interface GmThresholdData {
  updatedAt: number;
  slots: number;
  minRating: number;
  threshold: number | null;
  uncertainty: number | null;
  confidence: 'High' | 'Medium' | 'Low' | 'None';
  method: string;
  fitPoints: number;
  knownGMs: number;
  maxPlacementSeen: number | null;
  poolSize: number;
  lowestGM: GmListEntry | null;
  highestNonGM: GmListEntry | null;
  closestToCutoff: GmListEntry | null;
  gms: GmListEntry[];
  bubble: GmListEntry[];
  history: Array<{ t: number; threshold: number }>;
}

const limiter = new RateLimiter({ tokensPerInterval: 4, interval: 'second' });

const PROFILE_QUERY = `query GmTrackerQuery($cc: String, $uid: String) {
  getUser(fbUid: $uid, connectCode: $cc) {
    displayName
    connectCode { code }
    rankedNetplayProfile {
      ratingOrdinal
      ratingUpdateCount
      dailyGlobalPlacement
      dailyRegionalPlacement
      continent
    }
  }
}`;

const CODE_RE = /"?code"?\s*:\s*"([^"#\s\\]{1,12}#\d{1,4})"/g;

async function fetchJson(url: string, init?: any): Promise<any> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

async function queryProfile(code: string) {
  await limiter.removeTokens(1);
  const json = await fetchJson('https://internal.slippi.gg/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ operationName: 'GmTrackerQuery', query: PROFILE_QUERY, variables: { cc: code, uid: code } }),
  });
  return json?.data?.getUser ?? null;
}

// ---------- discovery ----------

async function discoverFromSlippiTop50(): Promise<string[]> {
  try {
    const lb = await fetchJson('https://slippi.firebaseio.com/ranked-leaderboards.json');
    const codes: string[] = [];
    Object.values(lb || {}).forEach((region: any) => {
      if (Array.isArray(region)) region.forEach((p: any) => p?.user?.connectCode?.code && codes.push(p.user.connectCode.code));
    });
    return codes;
  } catch (e) {
    console.log(`[gm] slippi top-50 fetch failed: ${(e as Error).message}`);
    return [];
  }
}

async function discoverFromSiblingLeaderboards(): Promise<string[]> {
  const repos: string[] = [];
  const queue = [TEMPLATE_REPO];
  const seen = new Set<string>();
  let apiCalls = 0;
  while (queue.length && apiCalls < 50) {
    const repo = queue.shift()!;
    if (seen.has(repo)) continue;
    seen.add(repo);
    repos.push(repo);
    apiCalls++;
    try {
      const forks = await fetchJson(`https://api.github.com/repos/${repo}/forks?per_page=100`, {
        headers: { 'User-Agent': 'slippi-leaderboard-gm-tracker' },
      });
      if (Array.isArray(forks)) forks.forEach((f: any) => f?.full_name && !seen.has(f.full_name) && queue.push(f.full_name));
    } catch (e) {
      console.log(`[gm] GitHub fork listing stopped: ${(e as Error).message}`);
      break;
    }
  }
  const codes = new Set<string>();
  await Promise.all(
    repos.map(async (repo) => {
      for (const file of ['gh-pages/main.js', 'artifacts/players-old.json', 'artifacts/players-new.json']) {
        const text = await fetchText(`https://raw.githubusercontent.com/${repo}/${file}`);
        if (!text) continue;
        const re = new RegExp(CODE_RE.source, 'g');
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) codes.add(m[1]);
      }
    }),
  );
  console.log(`[gm] sibling leaderboards: ${repos.length} repos, ${codes.size} codes`);
  return [...codes];
}

// ---------- pool ----------

async function loadPool(): Promise<Pool> {
  try {
    return JSON.parse(await fs.readFile(POOL_FILE, 'utf-8'));
  } catch {
    const pool: Pool = { players: {}, lastDiscovery: 0 };
    try {
      // seed rows: "CODE#1" or [code, rating, globalPlacement, regionalPlacement, ratingUpdateCount]
      const seed: Array<string | [string, number, number, number, number]> = JSON.parse(await fs.readFile(SEED_FILE, 'utf-8'));
      seed.forEach((row) => {
        const code = Array.isArray(row) ? row[0] : row;
        if (addCode(pool, code) && Array.isArray(row)) {
          const e = pool.players[code.trim().toUpperCase()];
          e.rating = row[1] ?? null; // hint only: checkedAt stays 0 so it gets refreshed first
          e.updates = row[4] ?? 0;
        }
      });
      console.log(`[gm] new pool seeded with ${seed.length} codes`);
    } catch {
      /* no seed */
    }
    return pool;
  }
}

function addCode(pool: Pool, code: string) {
  const c = code.trim().toUpperCase();
  if (!/^[^#\s]{1,12}#\d{1,4}$/.test(c) || pool.players[c]) return false;
  pool.players[c] = { code: c, name: null, rating: null, updates: 0, global: null, regional: null, continent: null, checkedAt: 0 };
  return true;
}

function dueList(pool: Pool, now: number): string[] {
  const scored: Array<[string, number]> = [];
  Object.values(pool.players).forEach((p) => {
    const age = now - p.checkedAt;
    let priority: number | null = null;
    if (p.checkedAt === 0) priority = (p.rating ?? 0) >= HOT_RATING ? 0 : (p.rating ?? 0) >= WARM_RATING ? 1 : 2.5;
    else if (p.missing) priority = age > 30 * DAY ? 4 : null;
    else if (p.global !== null || p.regional !== null || (p.rating ?? 0) >= HOT_RATING) priority = age > HOT_INTERVAL ? 0 : null;
    else if ((p.rating ?? 0) >= WARM_RATING) priority = age > WARM_INTERVAL ? 2 : null;
    else priority = age > COLD_INTERVAL ? 3 : null;
    if (priority !== null) scored.push([p.code, priority * 1e15 + p.checkedAt]);
  });
  return scored.sort((a, b) => a[1] - b[1]).map(([c]) => c).slice(0, MAX_REQUESTS_PER_RUN);
}

async function refresh(pool: Pool, codes: string[]) {
  let done = 0;
  let errors = 0;
  const workers = 4;
  const queue = [...codes];
  await Promise.all(
    Array.from({ length: workers }, async () => {
      while (queue.length) {
        const code = queue.shift()!;
        try {
          const user = await queryProfile(code);
          const entry = pool.players[code];
          entry.checkedAt = Date.now();
          if (!user) {
            entry.missing = true;
          } else {
            const prof = user.rankedNetplayProfile || {};
            entry.missing = false;
            entry.name = user.displayName ?? null;
            entry.rating = typeof prof.ratingOrdinal === 'number' ? prof.ratingOrdinal : null;
            entry.updates = prof.ratingUpdateCount ?? 0;
            entry.global = prof.dailyGlobalPlacement ?? null;
            entry.regional = prof.dailyRegionalPlacement ?? null;
            entry.continent = prof.continent ?? null;
          }
        } catch {
          errors++;
        }
        done++;
        if (done % 100 === 0) console.log(`[gm] refreshed ${done}/${codes.length}`);
      }
    }),
  );
  console.log(`[gm] refreshed ${done} profiles (${errors} errors)`);
}

// ---------- threshold math ----------

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Theil–Sen robust line fit; returns rating predicted at `atPlacement`. */
export function theilSen(points: Array<[number, number]>, atPlacement: number) {
  const slopes: number[] = [];
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++)
      if (points[j][0] !== points[i][0]) slopes.push((points[j][1] - points[i][1]) / (points[j][0] - points[i][0]));
  const slope = slopes.length ? median(slopes) : 0;
  const intercept = median(points.map(([p, r]) => r - slope * p));
  const residuals = points.map(([p, r]) => Math.abs(r - (intercept + slope * p)));
  return { estimate: intercept + slope * atPlacement, slope, mad: median(residuals) * 1.4826 };
}

const toListEntry = (p: PoolEntry): GmListEntry => ({
  code: p.code,
  name: p.name,
  rating: Math.round((p.rating ?? 0) * 10) / 10,
  global: p.global,
  regional: p.regional,
  continent: p.continent,
});

export function computeThreshold(pool: Pool, previous: GmThresholdData | null, now = Date.now()): GmThresholdData {
  const fresh = Object.values(pool.players).filter((p) => !p.missing && p.rating !== null && now - p.checkedAt < 36 * HOUR);
  const gms = fresh.filter((p) => p.global !== null && (p.rating ?? 0) >= GM_MIN_RATING).sort((a, b) => a.global! - b.global!);
  const regionalOnly = fresh.filter((p) => p.global === null && p.regional !== null && (p.rating ?? 0) >= GM_MIN_RATING);
  const nonGMs = fresh
    .filter((p) => p.global === null && p.regional === null && p.updates >= 5 && (p.rating ?? 0) >= GM_MIN_RATING)
    .sort((a, b) => b.rating! - a.rating!);

  let points = gms.filter((p) => p.global! >= FIT_MIN_PLACEMENT).map((p) => [p.global!, p.rating!] as [number, number]);
  if (points.length < 6) points = gms.slice(-40).map((p) => [p.global!, p.rating!] as [number, number]);

  let threshold: number | null = null;
  let uncertainty: number | null = null;
  let confidence: GmThresholdData['confidence'] = 'None';
  let method = 'Not enough GM data yet';
  const maxPlacementSeen = gms.length ? gms[gms.length - 1].global : null;

  if (points.length >= 3) {
    const fit = theilSen(points, GM_SLOTS);
    const gap = GM_SLOTS - (maxPlacementSeen ?? 0);
    // extrapolation error grows with distance from the deepest known placement
    uncertainty = Math.max(1, Math.round(fit.mad + Math.abs(fit.slope) * Math.max(0, gap) * 0.5));
    threshold = Math.max(GM_MIN_RATING, Math.round(fit.estimate * 10) / 10);
    confidence = points.length >= 20 && gap <= 10 ? 'High' : points.length >= 8 && gap <= 30 ? 'Medium' : 'Low';
    method = `Fit of ${points.length} known GMs' placements (deepest #${maxPlacementSeen})`;
  }

  const closest = gms.length
    ? gms.reduce((best, p) => (Math.abs(p.global! - GM_SLOTS) < Math.abs(best.global! - GM_SLOTS) ? p : best))
    : null;

  const history = [...(previous?.history ?? [])];
  if (threshold !== null) {
    const last = history[history.length - 1];
    if (!last || now - last.t > 2 * HOUR) history.push({ t: now, threshold });
    else last.threshold = threshold;
  }

  const bubbleFloor = (threshold ?? GM_MIN_RATING) - 75;
  return {
    updatedAt: now,
    slots: GM_SLOTS,
    minRating: GM_MIN_RATING,
    threshold,
    uncertainty,
    confidence,
    method,
    fitPoints: points.length,
    knownGMs: gms.length + regionalOnly.length,
    maxPlacementSeen,
    poolSize: Object.keys(pool.players).length,
    lowestGM: gms.length ? toListEntry(gms.reduce((a, b) => (a.rating! < b.rating! ? a : b))) : null,
    highestNonGM: nonGMs.length ? toListEntry(nonGMs[0]) : null,
    closestToCutoff: closest ? toListEntry(closest) : null,
    gms: [...gms, ...regionalOnly].map(toListEntry),
    bubble: nonGMs.filter((p) => p.rating! >= bubbleFloor).slice(0, 25).map(toListEntry),
    history: history.slice(-400),
  };
}

// ---------- entry point ----------

export async function readThresholdFile(): Promise<GmThresholdData | null> {
  try {
    return JSON.parse(await fs.readFile(OUT_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

export async function ensureThresholdFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  if (!(await readThresholdFile())) {
    const empty = computeThreshold({ players: {}, lastDiscovery: 0 }, null);
    await fs.writeFile(OUT_FILE, JSON.stringify(empty));
  }
}

/** Clears the cutoff trend (used when a new Slippi season starts). */
export async function resetGmHistory() {
  const current = await readThresholdFile();
  if (current) await fs.writeFile(OUT_FILE, JSON.stringify({ ...current, history: [] }));
}

/** Grow the GM pool, refresh what's due, recompute the cutoff and write gm-threshold.json. */
export async function updateGmTracker(trackedCodes: string[] = [], opts: { forceDiscovery?: boolean } = {}) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const now = Date.now();
  const pool = await loadPool();

  let added = 0;
  trackedCodes.forEach((c) => addCode(pool, c) && added++);
  (await discoverFromSlippiTop50()).forEach((c) => addCode(pool, c) && added++);
  if (opts.forceDiscovery || now - pool.lastDiscovery > DISCOVERY_INTERVAL) {
    (await discoverFromSiblingLeaderboards()).forEach((c) => addCode(pool, c) && added++);
    pool.lastDiscovery = now;
  }
  console.log(`[gm] pool: ${Object.keys(pool.players).length} codes (+${added} new)`);

  const due = dueList(pool, now);
  if (due.length) {
    console.log(`[gm] refreshing ${due.length} profiles (~${Math.ceil(due.length / 4)}s)`);
    await refresh(pool, due);
  }
  await fs.writeFile(POOL_FILE, JSON.stringify(pool));

  const result = computeThreshold(pool, await readThresholdFile());
  await fs.writeFile(OUT_FILE, JSON.stringify(result));
  console.log(
    `[gm] cutoff ≈ ${result.threshold ?? 'n/a'} ±${result.uncertainty ?? '-'} ` +
      `(${result.knownGMs}/${GM_SLOTS} GMs known, deepest #${result.maxPlacementSeen ?? '-'}, ${result.confidence})`,
  );
  return result;
}

if (require.main === module) {
  updateGmTracker([], { forceDiscovery: process.argv.includes('--discover') }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
