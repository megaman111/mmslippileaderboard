import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { GmThresholdData, GmListEntry } from './GrandmasterThreshold';

interface Props {
  gmData: GmThresholdData;
  onClose: () => void;
}

const REGION: Record<string, string> = {
  NORTH_AMERICA: 'NA',
  EUROPE: 'EU',
  SOUTH_AMERICA: 'SA',
  OCEANIA: 'OCE',
  ASIA: 'ASIA',
};

const profileUrl = (code: string) => `https://slippi.gg/user/${code.replace('#', '-').toLowerCase()}`;

function Row({ e, label, highlight }: { e: GmListEntry; label: string; highlight?: boolean }) {
  return (
    <tr className={`border-b border-gray-700 ${highlight ? 'bg-yellow-900 bg-opacity-40' : ''}`}>
      <td className="py-1 pr-2 text-gray-400 tabular-nums">{label}</td>
      <td className="py-1 pr-2">
        <a href={profileUrl(e.code)} target="_blank" rel="noreferrer" className="text-white hover:underline">
          {e.name || e.code}
        </a>
        {e.name && <div className="text-gray-500 text-xs">{e.code}</div>}
      </td>
      <td className="py-1 pr-2 text-gray-300">{(e.continent && REGION[e.continent]) || e.continent || '—'}</td>
      <td className="py-1 text-right text-white tabular-nums">{e.rating.toFixed(1)}</td>
    </tr>
  );
}

export function GmListModal({ gmData, onClose }: Props) {
  const [region, setRegion] = useState<string>('ALL');
  const match = (e: GmListEntry) => region === 'ALL' || e.continent === region;

  const global = gmData.gms.filter((g) => g.global !== null).sort((a, b) => a.global! - b.global!);
  const regionalOnly = gmData.gms.filter((g) => g.global === null).sort((a, b) => b.rating - a.rating);
  const bubble = gmData.bubble;
  const regions = Array.from(new Set(gmData.gms.map((g) => g.continent).filter(Boolean))) as string[];

  // Portal to <body> so the modal isn't trapped inside the sticky sidebar's stacking context
  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(2px)', zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg border border-gray-700 shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-white text-lg font-bold">Grandmasters</h2>
            <div className="text-gray-400 text-xs">
              {global.length} of the global top {gmData.slots} found · cutoff ≈ {gmData.threshold?.toFixed(1)}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none px-2" aria-label="Close">
            ×
          </button>
        </div>

        <div className="px-4 pt-3 flex gap-2 flex-wrap">
          {['ALL', ...regions].map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={`text-xs px-3 py-1 rounded ${region === r ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              {r === 'ALL' ? 'All' : REGION[r] || r}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto p-4 text-sm">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-xs text-left border-b border-gray-600">
                <th className="pb-1">#</th>
                <th className="pb-1">Player</th>
                <th className="pb-1">Region</th>
                <th className="pb-1 text-right">Rating</th>
              </tr>
            </thead>
            <tbody>
              {global.filter(match).map((e) => (
                <Row key={e.code} e={e} label={`${e.global}`} highlight={e.global! > gmData.slots - 10} />
              ))}
            </tbody>
          </table>

          {regionalOnly.filter(match).length > 0 && (
            <>
              <div className="text-gray-300 font-semibold mt-5 mb-1">Regional GMs (outside the global top {gmData.slots})</div>
              <table className="w-full">
                <tbody>
                  {regionalOnly.filter(match).map((e) => (
                    <Row key={e.code} e={e} label={`R${e.regional}`} />
                  ))}
                </tbody>
              </table>
            </>
          )}

          {bubble.filter(match).length > 0 && (
            <>
              <div className="text-gray-300 font-semibold mt-5 mb-1">On the bubble (not GM yet)</div>
              <table className="w-full">
                <tbody>
                  {bubble.filter(match).map((e) => (
                    <Row key={e.code} e={e} label="–" />
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div className="text-gray-500 text-xs mt-4">
            Slippi only publishes the top 50 per region, so this list is assembled from Slippi's leaderboard, other
            regional leaderboards, and players tracked here. Missing placement numbers are GMs we haven't found yet.
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
