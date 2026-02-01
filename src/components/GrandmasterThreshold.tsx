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

export function GrandmasterThreshold({ players, history }: Props) {
  // Find all grandmasters in current data
  const grandmasters = players.filter(player => {
    const rank = getRank(player);
    return rank.name === 'Grandmaster';
  });

  // Get the lowest GM rating from current leaderboard
  const getLocalGMThreshold = (): number | null => {
    if (grandmasters.length === 0) return null;
    
    const ratings = grandmasters.map(gm => Math.floor(gm.rankedNetplayProfile.ratingOrdinal));
    return Math.min(...ratings);
  };

  // Analyze historical GM thresholds
  const getHistoricalThresholds = (): number[] => {
    if (!history || history.length === 0) return [];
    
    const thresholds: number[] = [];
    
    history.forEach(snapshot => {
      const snapshotGMs = snapshot.players.filter(player => {
        const rank = getRank(player);
        return rank.name === 'Grandmaster';
      });
      
      if (snapshotGMs.length > 0) {
        const ratings = snapshotGMs.map(gm => Math.floor(gm.rankedNetplayProfile.ratingOrdinal));
        const minRating = Math.min(...ratings);
        thresholds.push(minRating);
      }
    });
    
    return thresholds;
  };

  // Estimate global threshold based on available data
  const estimateGlobalThreshold = (): { estimate: number; confidence: string; method: string } => {
    const localThreshold = getLocalGMThreshold();
    const historicalThresholds = getHistoricalThresholds();
    
    // Method 1: Use local data if we have GMs
    if (localThreshold !== null) {
      const totalGMs = grandmasters.length;
      
      if (totalGMs >= 10) {
        // If we have a good sample of GMs, use local threshold with small buffer
        return {
          estimate: localThreshold - 25, // Assume global threshold is ~25 points lower
          confidence: 'High',
          method: `Based on ${totalGMs} local GMs`
        };
      } else if (totalGMs >= 3) {
        // Smaller sample, larger buffer
        return {
          estimate: localThreshold - 50,
          confidence: 'Medium',
          method: `Based on ${totalGMs} local GMs`
        };
      } else {
        // Very small sample
        return {
          estimate: localThreshold - 75,
          confidence: 'Low',
          method: `Based on ${totalGMs} local GM${totalGMs > 1 ? 's' : ''}`
        };
      }
    }
    
    // Method 2: Use historical average if available
    if (historicalThresholds.length > 0) {
      const avgThreshold = Math.floor(historicalThresholds.reduce((a, b) => a + b, 0) / historicalThresholds.length);
      return {
        estimate: avgThreshold - 30,
        confidence: 'Medium',
        method: `Historical average (${historicalThresholds.length} snapshots)`
      };
    }
    
    // Method 3: Fallback to theoretical minimum
    return {
      estimate: 2192,
      confidence: 'Low',
      method: 'Theoretical minimum (Master I threshold)'
    };
  };

  const localThreshold = getLocalGMThreshold();
  const historicalThresholds = getHistoricalThresholds();
  const globalEstimate = estimateGlobalThreshold();
  
  // Calculate trend if we have historical data
  const getTrend = (): { direction: 'up' | 'down' | 'stable'; change: number } | null => {
    if (historicalThresholds.length < 2) return null;
    
    const recent = historicalThresholds.slice(-3); // Last 3 snapshots
    const older = historicalThresholds.slice(-6, -3); // Previous 3 snapshots
    
    if (recent.length === 0 || older.length === 0) return null;
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    const change = Math.floor(recentAvg - olderAvg);
    
    if (Math.abs(change) < 10) return { direction: 'stable', change };
    return { direction: change > 0 ? 'up' : 'down', change: Math.abs(change) };
  };

  const trend = getTrend();

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700 w-72 mt-4">
      <h3 className="text-white text-lg font-bold mb-3 text-center border-b border-gray-600 pb-2">
        ⚡ GM Threshold
      </h3>
      
      <div className="space-y-3">
        {/* Global Estimate */}
        <div className="bg-gradient-to-r from-yellow-900 to-yellow-800 rounded p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-yellow-200 font-semibold text-sm">Global Estimate</span>
            <span className="text-yellow-100 font-bold text-lg">{globalEstimate.estimate}</span>
          </div>
          <div className="text-yellow-300 text-xs">
            {globalEstimate.method}
          </div>
          <div className="text-yellow-400 text-xs mt-1">
            Confidence: {globalEstimate.confidence}
          </div>
        </div>

        {/* Local Threshold */}
        {localThreshold && (
          <div className="bg-gray-700 rounded p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-300 font-semibold text-sm">Local Minimum</span>
              <span className="text-white font-bold text-lg">{localThreshold}</span>
            </div>
            <div className="text-gray-400 text-xs">
              Lowest GM on this leaderboard ({grandmasters.length} total)
            </div>
          </div>
        )}

        {/* Trend */}
        {trend && (
          <div className="bg-gray-700 rounded p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-300 font-semibold text-sm">Recent Trend</span>
              <div className="flex items-center gap-1">
                {trend.direction === 'up' && <span className="text-red-400">↗️ +{trend.change}</span>}
                {trend.direction === 'down' && <span className="text-green-400">↘️ -{trend.change}</span>}
                {trend.direction === 'stable' && <span className="text-blue-400">→ Stable</span>}
              </div>
            </div>
            <div className="text-gray-400 text-xs">
              {trend.direction === 'up' && 'Threshold increasing (harder to reach GM)'}
              {trend.direction === 'down' && 'Threshold decreasing (easier to reach GM)'}
              {trend.direction === 'stable' && 'Threshold relatively stable'}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-600">
          GM requires Top 300 global/regional + 2192+ rating
        </div>
      </div>
    </div>
  );
}