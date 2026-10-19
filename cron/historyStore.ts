/**
 * Compact rating history.
 *
 * Snapshots are stored newest-first. Each snapshot holds only the players whose
 * stats changed since the previous (older) snapshot; the oldest one is complete.
 * The site replays them oldest -> newest to rebuild each moment, and re-attaches
 * names and characters from the current player list.
 */
import * as syncFs from 'fs';

const fs = syncFs.promises;

// [rating, wins, losses, dailyGlobalPlacement, dailyRegionalPlacement, ratingUpdateCount]
export type CompactStats = [number, number, number, number | null, number | null, number];
type State = Record<string, CompactStats>;

export interface CompactSnapshot {
  t: number;
  p: State; // changes since the previous snapshot
}

export interface HistoryFile {
  version: 3;
  season: string | null;
  snapshots: CompactSnapshot[]; // newest first
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
// [max age, bucket size]: full resolution for 3 days, then every 6h up to 30 days, then daily
const TIERS: Array<[number, number]> = [
  [3 * DAY, 0],
  [30 * DAY, 6 * HOUR],
  [Infinity, DAY],
];

export function compactPlayer(p: any): CompactStats {
  const r = p.rankedNetplayProfile || {};
  return [
    Math.round((r.ratingOrdinal ?? 0) * 100) / 100,
    r.wins ?? 0,
    r.losses ?? 0,
    r.dailyGlobalPlacement ?? null,
    r.dailyRegionalPlacement ?? null,
    r.ratingUpdateCount ?? (r.wins ?? 0) + (r.losses ?? 0),
  ];
}

function stateFromPlayers(players: any[]): State {
  const s: State = {};
  players.forEach((pl) => {
    if (pl?.connectCode?.code) s[pl.connectCode.code] = compactPlayer(pl);
  });
  return s;
}

/** "RANKED_SINGLES-<uid>-season-5" -> "season-5" (most common value among players) */
export function detectSeason(players: any[]): string | null {
  const counts: Record<string, number> = {};
  players.forEach((pl) => {
    const m = /(season-[\w-]+)$/.exec(pl?.rankedNetplayProfile?.id ?? '');
    if (m) counts[m[1]] = (counts[m[1]] || 0) + 1;
  });
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : null;
}

const same = (a: CompactStats | undefined, b: CompactStats | undefined) => JSON.stringify(a) === JSON.stringify(b);

/** full states, oldest first */
function decode(history: HistoryFile): Array<{ t: number; state: State }> {
  const out: Array<{ t: number; state: State }> = [];
  let state: State = {};
  [...history.snapshots].sort((a, b) => a.t - b.t).forEach((snap) => {
    state = { ...state, ...snap.p };
    out.push({ t: snap.t, state });
  });
  return out;
}

/** full states (oldest first) -> delta snapshots (newest first) */
function encode(full: Array<{ t: number; state: State }>): CompactSnapshot[] {
  const snaps: CompactSnapshot[] = [];
  let prev: State = {};
  full.forEach(({ t, state }) => {
    const p: State = {};
    Object.keys(state).forEach((code) => {
      if (!same(state[code], prev[code])) p[code] = state[code];
    });
    snaps.push({ t, p });
    prev = state;
  });
  return snaps.reverse();
}

/** Reads history.json: current delta format, v2 full snapshots, or the original array of full player lists. */
export async function readHistory(file: string): Promise<HistoryFile> {
  let raw: any = null;
  try {
    raw = JSON.parse(await fs.readFile(file, 'utf-8'));
  } catch {
    /* missing or empty */
  }
  if (raw && raw.version === 3 && Array.isArray(raw.snapshots)) return raw as HistoryFile;

  let full: Array<{ t: number; state: State }> = [];
  let season: string | null = null;
  if (raw && raw.version === 2 && Array.isArray(raw.snapshots)) {
    full = raw.snapshots.map((s: any) => ({ t: s.t, state: s.p })).sort((a: any, b: any) => a.t - b.t);
    season = raw.season ?? null;
  } else if (Array.isArray(raw)) {
    const legacy = [...raw].sort((a, b) => a.timestamp - b.timestamp);
    full = legacy.map((e) => ({ t: e.timestamp, state: stateFromPlayers(e.players || []) }));
    const latest = legacy[legacy.length - 1];
    season = latest ? detectSeason(latest.players || []) : null;
  }
  return { version: 3, season, snapshots: encode(full) };
}

/** Adds a snapshot (skipped if nothing changed) and thins out old snapshots. */
export function addSnapshot(history: HistoryFile, players: any[], now = Date.now()): boolean {
  const full = decode(history);
  const last = full[full.length - 1]?.state ?? {};
  const current = { ...last, ...stateFromPlayers(players) };
  const changed = Object.keys(current).some((code) => !same(current[code], last[code]));
  if (changed || !full.length) full.push({ t: now, state: current });

  // thin: walk newest -> oldest, keep the newest snapshot in each bucket of its tier
  const kept: Array<{ t: number; state: State }> = [];
  const used = new Set<string>();
  [...full].reverse().forEach((s) => {
    const age = now - s.t;
    const tier = TIERS.findIndex(([maxAge]) => age <= maxAge);
    const bucketSize = TIERS[tier][1];
    if (!bucketSize) return kept.push(s);
    const key = `${tier}:${Math.floor(s.t / bucketSize)}`;
    if (!used.has(key)) {
      used.add(key);
      kept.push(s);
    }
  });
  history.snapshots = encode(kept.reverse());
  return changed;
}

export async function writeHistory(file: string, history: HistoryFile) {
  await fs.writeFile(file, JSON.stringify(history));
}
