import React from 'react';
import { Player } from '../lib/player';
import { getRank } from '../lib/ranks';
import GrandMasterIcon from '../../images/ranks/GrandMaster.svg';

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

  // Advanced GM threshold estimation with multiple methodologies
  const estimateGlobalThreshold = (): { estimate: number; confidence: string; method: string } => {
    const localThreshold = getLocalGMThreshold();
    const historicalThresholds = getHistoricalThresholds();
    
    // CRITICAL: Global threshold can never exceed the lowest GM we can see
    const maxPossibleThreshold = localThreshold || 9999;
    
    // Method 1: Advanced statistical analysis of local GMs
    if (localThreshold !== null && grandmasters.length >= 2) {
      const gmRatings = grandmasters.map(gm => Math.floor(gm.rankedNetplayProfile.ratingOrdinal));
      gmRatings.sort((a, b) => a - b);
      
      const min = gmRatings[0];
      const max = gmRatings[gmRatings.length - 1];
      const range = max - min;
      const count = grandmasters.length;
      
      // Calculate percentiles for better analysis
      const q1 = gmRatings[Math.floor(count * 0.25)];
      const median = gmRatings[Math.floor(count * 0.5)];
      const q3 = gmRatings[Math.floor(count * 0.75)];
      
      // Determine cluster tightness and sample quality
      let confidence: string;
      let estimateOffset: number; // How much below the minimum to estimate
      let method: string;
      
      if (count >= 8 && range <= 80) {
        // Large, very tight cluster - we're likely seeing near the true threshold
        confidence = 'Very High';
        estimateOffset = 5; // Very small offset since we're confident
        method = `Dense GM cluster (${count} GMs, ${range}pt range)`;
      } else if (count >= 5 && range <= 120) {
        // Good cluster size with reasonable spread
        confidence = 'High';
        estimateOffset = 10;
        method = `Strong GM cluster (${count} GMs, ${range}pt range)`;
      } else if (count >= 3 && range <= 180) {
        // Decent sample with moderate spread
        confidence = 'Medium-High';
        estimateOffset = 20;
        method = `Moderate GM cluster (${count} GMs, ${range}pt range)`;
      } else if (count >= 2 && range <= 250) {
        // Small sample but reasonable spread
        confidence = 'Medium';
        estimateOffset = 35;
        method = `Small GM sample (${count} GMs, ${range}pt range)`;
      } else {
        // Very limited or spread out data
        confidence = 'Low';
        estimateOffset = 50;
        method = `Limited GM data (${count} GMs, ${range}pt range)`;
      }
      
      // Estimate is always below the lowest GM we can see
      const estimate = Math.max(min - estimateOffset, 2192);
      
      return { estimate, confidence, method };
    }
    
    // Method 2: Enhanced historical analysis with trend weighting
    if (historicalThresholds.length >= 3) {
      const recent = historicalThresholds.slice(-3);
      const allTime = historicalThresholds;
      
      // Calculate weighted average (more recent = higher weight)
      let weightedSum = 0;
      let totalWeight = 0;
      
      recent.forEach((threshold, i) => {
        const weight = 3 - i; // Most recent gets weight 3, oldest gets weight 1
        weightedSum += threshold * weight;
        totalWeight += weight;
      });
      
      const weightedAvg = weightedSum / totalWeight;
      const recentMin = Math.min(...recent);
      const recentMax = Math.max(...recent);
      const stability = recentMax - recentMin;
      
      let confidence: string;
      let estimateOffset: number;
      let method: string;
      
      if (stability <= 30 && recent.length >= 3) {
        confidence = 'High';
        estimateOffset = 10;
        method = `Very stable trend (${allTime.length} snapshots, ${stability}pt variance)`;
      } else if (stability <= 60 && recent.length >= 3) {
        confidence = 'Medium-High';
        estimateOffset = 20;
        method = `Stable trend (${allTime.length} snapshots, ${stability}pt variance)`;
      } else if (stability <= 100) {
        confidence = 'Medium';
        estimateOffset = 30;
        method = `Moderate trend (${allTime.length} snapshots, ${stability}pt variance)`;
      } else {
        confidence = 'Low';
        estimateOffset = 45;
        method = `Volatile trend (${allTime.length} snapshots, ${stability}pt variance)`;
      }
      
      // Use the more conservative of weighted average or recent minimum, but never exceed local threshold
      const baseEstimate = Math.min(weightedAvg, recentMin);
      const estimate = Math.min(
        Math.max(Math.floor(baseEstimate - estimateOffset), 2192),
        maxPossibleThreshold
      );
      
      return { estimate, confidence, method };
    }
    
    // Method 3: Single data point analysis
    if (localThreshold !== null) {
      const count = grandmasters.length;
      let estimateOffset: number;
      let confidence: string;
      
      if (count === 1) {
        estimateOffset = 75; // Conservative with single GM
        confidence = 'Very Low';
      } else {
        estimateOffset = 60; // Slightly less conservative with 2 GMs
        confidence = 'Low';
      }
      
      return {
        estimate: Math.max(localThreshold - estimateOffset, 2192),
        confidence,
        method: `Single point estimate (${count} GM${count > 1 ? 's' : ''})`
      };
    }
    
    // Method 4: Historical fallback
    if (historicalThresholds.length > 0) {
      const avgHistorical = historicalThresholds.reduce((a, b) => a + b, 0) / historicalThresholds.length;
      const minHistorical = Math.min(...historicalThresholds);
      
      // Use the lower of average or minimum for safety, but respect local threshold
      const baseEstimate = Math.min(avgHistorical, minHistorical);
      const estimate = Math.min(
        Math.max(Math.floor(baseEstimate - 40), 2192),
        maxPossibleThreshold
      );
      
      return {
        estimate,
        confidence: 'Low',
        method: `Historical fallback (${historicalThresholds.length} snapshots)`
      };
    }
    
    // Method 5: Theoretical estimate based on rank system knowledge
    const theoreticalEstimate = Math.min(2240, maxPossibleThreshold);
    return {
      estimate: theoreticalEstimate,
      confidence: 'Very Low',
      method: 'Theoretical estimate (no data available)'
    };
  };

  const localThreshold = getLocalGMThreshold();
  const historicalThresholds = getHistoricalThresholds();
  const globalEstimate = estimateGlobalThreshold();
  
  // Validation: Ensure estimate is logical
  const isEstimateRealistic = !localThreshold || globalEstimate.estimate <= localThreshold;
  
  // Enhanced trend analysis with multiple timeframes
  const getTrend = (): { direction: 'up' | 'down' | 'stable'; change: number; strength: string } | null => {
    if (historicalThresholds.length < 3) return null;
    
    // Analyze different timeframes for more robust trend detection
    const all = historicalThresholds;
    const recent3 = all.slice(-3);
    const recent5 = all.slice(-5);
    const older3 = all.slice(-6, -3);
    
    if (recent3.length < 2) return null;
    
    // Calculate short-term trend (last 3 snapshots)
    const shortTermAvg = recent3.reduce((a, b) => a + b, 0) / recent3.length;
    const shortTermFirst = recent3[0];
    const shortTermLast = recent3[recent3.length - 1];
    const shortTermChange = shortTermLast - shortTermFirst;
    
    // Calculate medium-term trend if we have enough data
    let mediumTermChange = 0;
    if (recent5.length >= 4) {
      const mediumTermFirst = recent5[0];
      const mediumTermLast = recent5[recent5.length - 1];
      mediumTermChange = mediumTermLast - mediumTermFirst;
    }
    
    // Calculate long-term comparison if we have older data
    let longTermChange = 0;
    if (older3.length > 0 && recent3.length > 0) {
      const olderAvg = older3.reduce((a, b) => a + b, 0) / older3.length;
      longTermChange = shortTermAvg - olderAvg;
    }
    
    // Determine overall trend with weighted consideration
    const changes = [shortTermChange, mediumTermChange, longTermChange].filter(c => c !== 0);
    const avgChange = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
    
    // Determine trend strength based on consistency and magnitude
    let strength: string;
    const absChange = Math.abs(avgChange);
    
    if (absChange >= 50) {
      strength = 'Strong';
    } else if (absChange >= 25) {
      strength = 'Moderate';
    } else if (absChange >= 10) {
      strength = 'Weak';
    } else {
      strength = 'Minimal';
    }
    
    // Determine direction
    let direction: 'up' | 'down' | 'stable';
    if (Math.abs(avgChange) < 8) {
      direction = 'stable';
    } else {
      direction = avgChange > 0 ? 'up' : 'down';
    }
    
    return {
      direction,
      change: Math.floor(Math.abs(avgChange)),
      strength
    };
  };

  const trend = getTrend();

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700 w-72 mt-4">
      <h3 className="text-white text-lg font-bold mb-3 text-center border-b border-gray-600 pb-2 flex items-center justify-center gap-2">
        <img src={GrandMasterIcon} alt="Grandmaster" className="w-6 h-6" />
        GM Threshold
      </h3>
      
      <div className="space-y-3">
        {/* Global Estimate */}
        <div className={`bg-gradient-to-r ${isEstimateRealistic ? 'from-yellow-900 to-yellow-800' : 'from-red-900 to-red-800'} rounded p-3 hover:${isEstimateRealistic ? 'from-yellow-800 hover:to-yellow-700' : 'from-red-800 hover:to-red-700'} hover:scale-[1.02] hover:shadow-lg transition-all duration-300 ease-out cursor-pointer group`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`${isEstimateRealistic ? 'text-yellow-200' : 'text-red-200'} font-semibold text-sm group-hover:${isEstimateRealistic ? 'text-yellow-100' : 'text-red-100'} transition-colors duration-300`}>
              Global Estimate {!isEstimateRealistic && '⚠️'}
            </span>
            <span className={`${isEstimateRealistic ? 'text-yellow-100' : 'text-red-100'} font-bold text-lg group-hover:scale-110 transition-transform duration-300 ease-out`}>{globalEstimate.estimate}</span>
          </div>
          <div className={`${isEstimateRealistic ? 'text-yellow-300' : 'text-red-300'} text-xs group-hover:${isEstimateRealistic ? 'text-yellow-200' : 'text-red-200'} transition-colors duration-300`}>
            {globalEstimate.method}
          </div>
          <div className={`${isEstimateRealistic ? 'text-yellow-400' : 'text-red-400'} text-xs mt-1 group-hover:${isEstimateRealistic ? 'text-yellow-300' : 'text-red-300'} transition-colors duration-300`}>
            Confidence: {globalEstimate.confidence}
          </div>
          {!isEstimateRealistic && (
            <div className="text-red-300 text-xs mt-1 group-hover:text-red-200 transition-colors duration-300">
              Warning: Estimate exceeds known GM threshold
            </div>
          )}
        </div>

        {/* Local Threshold */}
        {localThreshold && (
          <div className="bg-gray-700 rounded p-3 hover:bg-gray-600 hover:scale-[1.02] hover:shadow-md transition-all duration-300 ease-out cursor-pointer group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-300 font-semibold text-sm group-hover:text-gray-200 transition-colors duration-300">Local Minimum</span>
              <span className="text-white font-bold text-lg group-hover:scale-110 transition-transform duration-300 ease-out">{localThreshold}</span>
            </div>
            <div className="text-gray-400 text-xs group-hover:text-gray-300 transition-colors duration-300">
              Lowest GM on this leaderboard ({grandmasters.length} total)
            </div>
          </div>
        )}

        {/* Data Quality Indicator */}
        <div className="bg-gray-700 rounded p-3 hover:bg-gray-600 hover:scale-[1.02] hover:shadow-md transition-all duration-300 ease-out cursor-pointer group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-300 font-semibold text-sm group-hover:text-gray-200 transition-colors duration-300">Data Quality</span>
            <div className="flex items-center gap-1">
              {globalEstimate.confidence === 'Very High' && <span className="text-green-400 group-hover:scale-110 transition-transform duration-300 ease-out">🟢 Excellent</span>}
              {globalEstimate.confidence === 'High' && <span className="text-green-400 group-hover:scale-110 transition-transform duration-300 ease-out">🟢 High</span>}
              {globalEstimate.confidence === 'Medium-High' && <span className="text-yellow-400 group-hover:scale-110 transition-transform duration-300 ease-out">🟡 Good</span>}
              {globalEstimate.confidence === 'Medium' && <span className="text-yellow-400 group-hover:scale-110 transition-transform duration-300 ease-out">🟡 Fair</span>}
              {globalEstimate.confidence === 'Low' && <span className="text-orange-400 group-hover:scale-110 transition-transform duration-300 ease-out">🟠 Limited</span>}
              {globalEstimate.confidence === 'Very Low' && <span className="text-red-400 group-hover:scale-110 transition-transform duration-300 ease-out">🔴 Poor</span>}
            </div>
          </div>
          <div className="text-gray-400 text-xs group-hover:text-gray-300 transition-colors duration-300">
            {grandmasters.length > 0 && `${grandmasters.length} local GM${grandmasters.length > 1 ? 's' : ''}`}
            {grandmasters.length > 0 && historicalThresholds.length > 0 && ' • '}
            {historicalThresholds.length > 0 && `${historicalThresholds.length} historical snapshots`}
            {grandmasters.length === 0 && historicalThresholds.length === 0 && 'No local data available'}
          </div>
        </div>

        {/* Enhanced Trend Display */}
        {trend && (
          <div className="bg-gray-700 rounded p-3 hover:bg-gray-600 hover:scale-[1.02] hover:shadow-md transition-all duration-300 ease-out cursor-pointer group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-300 font-semibold text-sm group-hover:text-gray-200 transition-colors duration-300">
                {trend.strength} Trend
              </span>
              <div className="flex items-center gap-1">
                {trend.direction === 'up' && <span className="text-red-400 group-hover:scale-110 transition-transform duration-300 ease-out">📈 +{trend.change}</span>}
                {trend.direction === 'down' && <span className="text-green-400 group-hover:scale-110 transition-transform duration-300 ease-out">📉 -{trend.change}</span>}
                {trend.direction === 'stable' && <span className="text-blue-400 group-hover:scale-110 transition-transform duration-300 ease-out">📊 Stable</span>}
              </div>
            </div>
            <div className="text-gray-400 text-xs group-hover:text-gray-300 transition-colors duration-300">
              {trend.direction === 'up' && `Threshold rising (${trend.strength.toLowerCase()} increase)`}
              {trend.direction === 'down' && `Threshold falling (${trend.strength.toLowerCase()} decrease)`}
              {trend.direction === 'stable' && 'Threshold holding steady'}
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