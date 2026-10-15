import { Player } from './player';

export interface HistoryEntry {
  timestamp: number;
  players: Player[];
}

// [rating, wins, losses, dailyGlobalPlacement, dailyRegionalPlacement, ratingUpdateCount]
type CompactStats = [number, number, number, number | null, number | null, number];

declare const __webpack_public_path__: string;

/**
 * Turns the compact history file (see cron/historyStore.ts) back into full snapshots,
 * re-using names/characters from the current player list. Newest snapshot first.
 */
export function expandHistory(raw: any, current: Player[]): HistoryEntry[] {
  if (Array.isArray(raw)) return raw as HistoryEntry[]; // legacy format
  if (!raw || !Array.isArray(raw.snapshots)) return [];
  const byCode = new Map(current.map((p) => [p.connectCode.code, p]));
  return raw.snapshots
    .map((snap: { t: number; p: Record<string, CompactStats> }) => ({
      timestamp: snap.t,
      players: Object.keys(snap.p)
        .filter((code) => byCode.has(code))
        .map((code) => {
          const base = byCode.get(code)!;
          const s = snap.p[code];
          const player: Player = {
            displayName: base.displayName,
            connectCode: base.connectCode,
            continent: base.continent,
            subscriptionLevel: base.subscriptionLevel,
            rankedNetplayProfile: {
              ...base.rankedNetplayProfile,
              rank: undefined,
              ratingOrdinal: s[0],
              wins: s[1],
              losses: s[2],
              dailyGlobalPlacement: s[3],
              dailyRegionalPlacement: s[4],
              ratingUpdateCount: s[5],
            },
          };
          return player;
        })
        .sort((a: Player, b: Player) => b.rankedNetplayProfile.ratingOrdinal - a.rankedNetplayProfile.ratingOrdinal),
    }))
    .sort((a: HistoryEntry, b: HistoryEntry) => b.timestamp - a.timestamp);
}

/** history.json is published next to main.js instead of being bundled into it. */
export async function loadHistory(current: Player[], version: number): Promise<HistoryEntry[]> {
  const base = typeof __webpack_public_path__ === 'string' ? __webpack_public_path__ : '/';
  const res = await fetch(`${base}history.json?v=${version}`);
  if (!res.ok) throw new Error(`history.json: ${res.status}`);
  return expandHistory(await res.json(), current);
}
