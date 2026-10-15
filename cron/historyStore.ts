/**
 * Compact rating history.
 *
 * Each snapshot stores only what changes between runs (rating, wins, losses,
 * placements, rated sets) per connect code. The site re-attaches names and
 * characters from the current player list, so a snapshot is ~3 KB instead of ~55 KB.
 */
import * as syncFs from 'fs';

const fs = syncFs.promises;

// [rating, wins, losses, dailyGlobalPlacement, dailyRegionalPlacement, ratingUpdateCount]
export type CompactStats = [number, number, number, number | null, number | null, number];

export interface CompactSnapshot {
  t: number;
  p: Record<string, CompactStats>;
}

export interface HistoryFile {
  version: 2;
  season: string | null;
  snapshots: CompactSnapshot[]; // newest first
}

const HOUR = 60 * 60 * 1000;
const KEEP_ALL_FOR = 3 * 24 * HOUR; // full resolution for the last 3 days (movers / tilt queue)
const OLD_BUCKET = 3 * HOUR;        // older than that: one snapshot per 3 hours

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

export function snapshotFromPlayers(players: any[], t: number): CompactSnapshot {
  const p: Record<string, CompactStats> = {};
  players.forEach((pl) => {
    if (pl?.connectCode?.code) p[pl.connectCode.code] = compactPlayer(pl);
  });
  return { t, p };
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

const sameStats = (a: CompactSnapshot, b: CompactSnapshot) => JSON.stringify(a.p) === JSON.stringify(b.p);

/** Reads history.json in either the new compact format or the old full-snapshot array. */
export async function readHistory(file: string): Promise<HistoryFile> {
  let raw: any = null;
  try {
    raw = JSON.parse(await fs.readFile(file, 'utf-8'));
  } catch {
    /* missing or empty */
  }
  if (raw && raw.version === 2 && Array.isArray(raw.snapshots)) return raw as HistoryFile;

  const history: HistoryFile = { version: 2, season: null, snapshots: [] };
  if (Array.isArray(raw)) {
    // legacy: [{ timestamp, players: Player[] }]
    const legacy = [...raw].sort((a, b) => a.timestamp - b.timestamp);
    legacy.forEach((entry) => {
      const snap = snapshotFromPlayers(entry.players || [], entry.timestamp);
      const newest = history.snapshots[0];
      if (!newest || !sameStats(newest, snap)) history.snapshots.unshift(snap);
    });
    const latest = legacy[legacy.length - 1];
    history.season = latest ? detectSeason(latest.players || []) : null;
  }
  return history;
}

/** Adds a snapshot (skipped if nothing changed) and thins out old snapshots. */
export function addSnapshot(history: HistoryFile, players: any[], now = Date.now()): boolean {
  const snap = snapshotFromPlayers(players, now);
  const newest = history.snapshots[0];
  const added = !newest || !sameStats(newest, snap);
  if (added) history.snapshots.unshift(snap);

  const kept: CompactSnapshot[] = [];
  const usedBuckets = new Set<number>();
  history.snapshots
    .sort((a, b) => b.t - a.t)
    .forEach((s) => {
      if (now - s.t <= KEEP_ALL_FOR) return kept.push(s);
      const bucket = Math.floor(s.t / OLD_BUCKET);
      if (!usedBuckets.has(bucket)) {
        usedBuckets.add(bucket);
        kept.push(s);
      }
    });
  history.snapshots = kept;
  return added;
}

export async function writeHistory(file: string, history: HistoryFile) {
  await fs.writeFile(file, JSON.stringify(history));
}
