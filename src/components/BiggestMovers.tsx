import React from 'react';
import { Player } from '../lib/player';
import { getRank } from '../lib/ranks';

interface HistoryEntry {
  timestamp: number;
  players: Player[];
}

interface Props {
  players: Player[];
  history?: HistoryEntry[];
}

interface PlayerMove {
  player: Player;
  eloGain: number;
  rankChange: number;
  timeAgo: string;
}

export function BiggestMovers({ players, history }: Props) {
  const getBiggestMovers = (): PlayerMove[] => {
    if (!history || history.length < 2) return [];

    const now = Date.now();
    const twelveHoursAgo = now - (12 * 60 * 60 * 1000);

    // Find the most recent snapshot within 12 hours
    const recentSnapshots = history.filter(entry => entry.timestamp >= twelveHoursAgo);
    if (recentSnapshots.length === 0) return [];

    // Sort by timestamp to get the oldest snapshot in our 12-hour window
    const sortedSnapshots = recentSnapshots.sort((a, b) => a.timestamp - b.timestamp);
    const oldestInWindow = sortedSnapshots[0];
    const newest = history[0]; // Assuming history is sorted newest first

    // Create a map of old ratings
    const oldRatingsMap = new Map<string, { rating: number; rank: number }>();
    oldestInWindow.players.forEach(player => {
      if (player.rankedNetplayProfile.ratingOrdinal) {
        oldRatingsMap.set(player.connectCode.code, {
          rating: Math.floor(player.rankedNetplayProfile.ratingOrdinal),
          rank: player.rankedNetplayProfile.rank || 0
        });
      }
    });

    // Calculate moves for current players
    const moves: PlayerMove[] = [];
    newest.players.forEach(currentPlayer => {
      const oldData = oldRatingsMap.get(currentPlayer.connectCode.code);
      if (oldData && currentPlayer.rankedNetplayProfile.ratingOrdinal) {
        const currentRating = Math.floor(currentPlayer.rankedNetplayProfile.ratingOrdinal);
        const eloGain = currentRating - oldData.rating;
        const rankChange = oldData.rank - (currentPlayer.rankedNetplayProfile.rank || 0); // Positive = rank up

        if (eloGain > 0) { // Only show positive gains
          const hoursAgo = Math.floor((now - oldestInWindow.timestamp) / (1000 * 60 * 60));
          moves.push({
            player: currentPlayer,
            eloGain,
            rankChange,
            timeAgo: hoursAgo === 1 ? '1 hour ago' : `${hoursAgo} hours ago`
          });
        }
      }
    });

    // Sort by ELO gain (descending) and take top 5
    return moves.sort((a, b) => b.eloGain - a.eloGain).slice(0, 5);
  };

  const biggestMovers = getBiggestMovers();

  const formatRankChange = (change: number) => {
    if (change > 0) {
      return <span className="text-green-400 text-xs">↗️ +{change}</span>;
    } else if (change < 0) {
      return <span className="text-red-400 text-xs">↘️ {change}</span>;
    }
    return <span className="text-gray-400 text-xs">→ 0</span>;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700 w-72">
      <h3 className="text-white text-lg font-bold mb-3 text-center border-b border-gray-600 pb-2 flex items-center justify-center gap-2">
        🚀 Biggest Movers
      </h3>
      
      <div className="space-y-2">
        {biggestMovers.length > 0 ? (
          biggestMovers.map((mover, index) => {
            const rank = getRank(mover.player);
            return (
              <div 
                key={mover.player.connectCode.code} 
                className="bg-gray-700 rounded p-3 hover:bg-gray-600 hover:scale-[1.02] hover:shadow-md transition-all duration-300 ease-out cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 font-bold text-sm">#{index + 1}</span>
                    {rank.iconUrl && (
                      <img 
                        src={rank.iconUrl} 
                        alt={rank.name}
                        className="w-5 h-5 group-hover:scale-110 transition-transform duration-300 ease-out"
                      />
                    )}
                    <span className="text-white font-semibold text-sm group-hover:text-gray-100 transition-colors duration-300 truncate max-w-[120px]">
                      {mover.player.displayName}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-bold text-sm group-hover:scale-110 transition-transform duration-300 ease-out">
                      +{mover.eloGain}
                    </div>
                    {formatRankChange(mover.rankChange)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                    {mover.player.connectCode.code}
                  </span>
                  <span className="text-gray-500 group-hover:text-gray-400 transition-colors duration-300">
                    {mover.timeAgo}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-6">
            <div className="text-gray-400 text-sm mb-2">📊</div>
            <div className="text-gray-400 text-sm">
              No significant moves in the past 12 hours
            </div>
            <div className="text-gray-500 text-xs mt-1">
              Check back after more games are played!
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-xs text-gray-400 text-center pt-3 border-t border-gray-600 mt-3">
        Tracking ELO gains over the past 12 hours
      </div>
    </div>
  );
}