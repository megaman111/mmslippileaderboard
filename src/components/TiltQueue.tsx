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

interface PlayerLoss {
  player: Player;
  eloLoss: number;
  rankChange: number;
  timeAgo: string;
}

export function TiltQueue({ players, history }: Props) {
  const getBiggestLoser = (): PlayerLoss | null => {
    if (!history || history.length < 2) return null;

    const now = Date.now();
    const sixHoursAgo = now - (6 * 60 * 60 * 1000);

    // Find the most recent snapshot within 6 hours
    const recentSnapshots = history.filter(entry => entry.timestamp >= sixHoursAgo);
    if (recentSnapshots.length === 0) return null;

    // Sort by timestamp to get the oldest snapshot in our 6-hour window
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

    // Calculate losses for current players
    const losses: PlayerLoss[] = [];
    newest.players.forEach(currentPlayer => {
      const oldData = oldRatingsMap.get(currentPlayer.connectCode.code);
      if (oldData && currentPlayer.rankedNetplayProfile.ratingOrdinal) {
        const currentRating = Math.floor(currentPlayer.rankedNetplayProfile.ratingOrdinal);
        const eloChange = currentRating - oldData.rating;
        const rankChange = oldData.rank - (currentPlayer.rankedNetplayProfile.rank || 0); // Positive = rank up, negative = rank down

        if (eloChange < 0) { // Only show negative changes (losses)
          const hoursAgo = Math.floor((now - oldestInWindow.timestamp) / (1000 * 60 * 60));
          losses.push({
            player: currentPlayer,
            eloLoss: Math.abs(eloChange), // Make it positive for display
            rankChange,
            timeAgo: hoursAgo === 1 ? '1 hour ago' : `${hoursAgo} hours ago`
          });
        }
      }
    });

    // Sort by ELO loss (descending) and take the biggest loser
    const sortedLosses = losses.sort((a, b) => b.eloLoss - a.eloLoss);
    return sortedLosses.length > 0 ? sortedLosses[0] : null;
  };

  const biggestLoser = getBiggestLoser();

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
        🥀 Tilt Queue of the Day
      </h3>
      
      <div className="space-y-2">
        {biggestLoser ? (
          <div className="bg-gradient-to-r from-red-900 to-red-800 rounded p-3 hover:from-red-800 hover:to-red-700 hover:scale-[1.02] hover:shadow-md transition-all duration-300 ease-out cursor-pointer group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {(() => {
                  const rank = getRank(biggestLoser.player);
                  return rank.iconUrl && (
                    <img 
                      src={rank.iconUrl} 
                      alt={rank.name}
                      className="w-6 h-6 group-hover:scale-110 transition-transform duration-300 ease-out"
                    />
                  );
                })()}
                <div className="flex flex-col">
                  <span className="text-white font-semibold text-sm group-hover:text-gray-100 transition-colors duration-300 truncate max-w-[140px]">
                    {biggestLoser.player.displayName}
                  </span>
                  <span className="text-gray-400 text-xs group-hover:text-gray-300 transition-colors duration-300">
                    {biggestLoser.player.connectCode.code}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-red-400 font-bold text-lg group-hover:scale-110 transition-transform duration-300 ease-out">
                  -{biggestLoser.eloLoss}
                </div>
                {formatRankChange(biggestLoser.rankChange)}
              </div>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-red-300 group-hover:text-red-200 transition-colors duration-300">
                Biggest ELO loss in past 6 hours
              </span>
              <span className="text-red-400 group-hover:text-red-300 transition-colors duration-300">
                {biggestLoser.timeAgo}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-gray-400 text-sm mb-2">🌸</div>
            <div className="text-gray-400 text-sm">
              No significant losses in the past 6 hours
            </div>
            <div className="text-gray-500 text-xs mt-1">
              Everyone's playing well today!
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-xs text-gray-400 text-center pt-3 border-t border-gray-600 mt-3">
        Tracking biggest ELO loss over the past 6 hours
      </div>
    </div>
  );
}