import React, { useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Player } from '../lib/player';
import { getRank } from '../lib/ranks';
import GrandMasterIcon from '../../images/ranks/GrandMaster.svg';
import { GmListModal } from './GmListModal';

dayjs.extend(relativeTime);

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

interface Props {
  players: Player[];
  gmData: GmThresholdData | null;
}

const CONFIDENCE_STYLE: Record<string, string> = {
  High: 'text-green-400',
  Medium: 'text-yellow-400',
  Low: 'text-orange-400',
  None: 'text-red-400',
};

/** threshold change vs. the history entry closest to `msAgo` (needs at least half that span of data) */
function changeSince(history: GmThresholdData['history'], current: number, msAgo: number): number | null {
  if (!history || history.length < 2) return null;
  const target = Date.now() - msAgo;
  const past = history.reduce((best, h) => (Math.abs(h.t - target) < Math.abs(best.t - target) ? h : best));
  if (Date.now() - past.t < msAgo / 2) return null;
  return Math.round((current - past.threshold) * 10) / 10;
}

const fmtDelta = (d: number) => (Math.abs(d) < 0.05 ? '±0.0' : `${d > 0 ? '+' : ''}${d.toFixed(1)}`);

export function GrandmasterThreshold({ players, gmData }: Props) {
  const [showList, setShowList] = useState(false);
  const threshold = gmData?.threshold ?? null;

  if (!gmData || threshold === null) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700 w-72 mt-4">
        <h3 className="text-white text-lg font-bold mb-3 text-center border-b border-gray-600 pb-2 flex items-center justify-center gap-2">
          <img src={GrandMasterIcon} alt="Grandmaster" className="w-6 h-6" />
          GM Cutoff
        </h3>
        <div className="text-gray-400 text-sm text-center">
          No GM data yet. It will appear after the next stats update.
        </div>
      </div>
    );
  }

  const day = changeSince(gmData.history, threshold, 24 * 60 * 60 * 1000);
  const week = changeSince(gmData.history, threshold, 7 * 24 * 60 * 60 * 1000);
  const globalKnown = gmData.gms.filter((g) => g.global !== null).length;
  const coveragePct = Math.min(100, Math.round((globalKnown / gmData.slots) * 100));

  // this leaderboard's players who are close to the line
  const nearLine = players
    .filter((p) => p.rankedNetplayProfile.wins + p.rankedNetplayProfile.losses >= 5)
    .map((p) => ({
      p,
      diff: p.rankedNetplayProfile.ratingOrdinal - threshold,
      isGM: getRank(p).name === 'Grandmaster',
    }))
    .filter(({ diff }) => Math.abs(diff) <= 40)
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 6);

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700 w-72 mt-4">
      <h3 className="text-white text-lg font-bold mb-3 text-center border-b border-gray-600 pb-2 flex items-center justify-center gap-2">
        <img src={GrandMasterIcon} alt="Grandmaster" className="w-6 h-6" />
        GM Cutoff
      </h3>

      <div className="space-y-3">
        {/* Main estimate */}
        <div className="bg-gradient-to-r from-yellow-900 to-yellow-800 rounded p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-yellow-200 font-semibold text-sm">Rating at global #{gmData.slots}</span>
            <span className="text-yellow-100 font-bold text-2xl">
              {threshold.toFixed(1)}
              {gmData.uncertainty !== null && (
                <span className="text-yellow-300 text-xs font-normal ml-1">±{gmData.uncertainty}</span>
              )}
            </span>
          </div>
          <div className="text-yellow-300 text-xs mt-1">{gmData.method}</div>
          <div className="text-xs mt-1 flex justify-between">
            <span className={CONFIDENCE_STYLE[gmData.confidence]}>Confidence: {gmData.confidence}</span>
            <span className="text-yellow-400">{dayjs(gmData.updatedAt).fromNow()}</span>
          </div>
        </div>

        {/* Evidence */}
        <div className="bg-gray-700 rounded p-3 text-xs space-y-1">
          {gmData.lowestGM && (
            <div className="flex justify-between gap-2">
              <span className="text-gray-400">Lowest GM found</span>
              <span className="text-white text-right">
                {gmData.lowestGM.rating.toFixed(1)}{' '}
                <span className="text-gray-400">(#{gmData.lowestGM.global} {gmData.lowestGM.code})</span>
              </span>
            </div>
          )}
          {gmData.highestNonGM && (
            <div className="flex justify-between gap-2">
              <span className="text-gray-400">Highest non-GM</span>
              <span className="text-white text-right">
                {gmData.highestNonGM.rating.toFixed(1)}{' '}
                <span className="text-gray-400">({gmData.highestNonGM.code})</span>
              </span>
            </div>
          )}
          {(day !== null || week !== null) && (
            <div className="flex justify-between gap-2">
              <span className="text-gray-400">Trend</span>
              <span className="text-white">
                {day !== null && <span className={day > 0 ? 'text-red-400' : 'text-green-400'}>{fmtDelta(day)} 24h</span>}
                {day !== null && week !== null && ' · '}
                {week !== null && <span className={week > 0 ? 'text-red-400' : 'text-green-400'}>{fmtDelta(week)} 7d</span>}
              </span>
            </div>
          )}
        </div>

        {/* Local players near the line */}
        {nearLine.length > 0 && (
          <div className="bg-gray-700 rounded p-3 text-xs">
            <div className="text-gray-300 font-semibold mb-1">Near the line</div>
            {nearLine.map(({ p, diff, isGM }) => (
              <div key={p.connectCode.code} className="flex justify-between items-center">
                <span className="text-gray-200 truncate mr-2">
                  {p.displayName}
                  {!isGM && diff >= 0 && (
                    <span className="ml-1 text-yellow-300" title="Above the cutoff — should get GM at Slippi's next daily update (1 AM PST)">
                      → GM
                    </span>
                  )}
                  {isGM && diff < 0 && (
                    <span className="ml-1 text-orange-400" title="Below the cutoff — could lose GM at the next daily update">
                      at risk
                    </span>
                  )}
                </span>
                <span className={diff >= 0 ? 'text-green-400' : 'text-red-400'}>{fmtDelta(diff)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Coverage + list */}
        <button
          onClick={() => setShowList(true)}
          className="w-full bg-gray-700 rounded p-3 text-left hover:bg-gray-600 transition-colors duration-200"
        >
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-300 font-semibold">GMs tracked</span>
            <span className="text-white">
              {globalKnown}/{gmData.slots} global
            </span>
          </div>
          <div className="h-1.5 bg-gray-600 rounded">
            <div className="h-1.5 bg-yellow-500 rounded" style={{ width: `${coveragePct}%` }} />
          </div>
          <div className="text-xs text-indigo-300 mt-2">View GM list →</div>
        </button>

        <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-600">
          GM = {gmData.minRating}+ rating and top {gmData.slots} worldwide (or top of a smaller region), set once a day
          by Slippi.
        </div>
      </div>

      {showList && <GmListModal gmData={gmData} onClose={() => setShowList(false)} />}
    </div>
  );
}
