import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Player } from '../lib/player';
import dayjs from 'dayjs';

// Import rank icons
import GrandMasterIcon from '../../images/ranks/GrandMaster.svg';
import Master1Icon from '../../images/ranks/MasterI.svg';
import Master2Icon from '../../images/ranks/MasterII.svg';
import Master3Icon from '../../images/ranks/MasterIII.svg';
import Diamond1Icon from '../../images/ranks/DiamondI.svg';
import Diamond2Icon from '../../images/ranks/DiamondII.svg';
import Diamond3Icon from '../../images/ranks/DiamondIII.svg';
import Platinum3Icon from '../../images/ranks/PlatinumIII.svg';
import Platinum2Icon from '../../images/ranks/PlatinumII.svg';
import Platinum1Icon from '../../images/ranks/PlatinumI.svg';
import Gold3Icon from '../../images/ranks/GoldIII.svg';
import Gold2Icon from '../../images/ranks/GoldII.svg';
import Gold1Icon from '../../images/ranks/GoldI.svg';
import Silver3Icon from '../../images/ranks/SilverIII.svg';
import Silver2Icon from '../../images/ranks/SilverII.svg';
import Silver1Icon from '../../images/ranks/SilverI.svg';
import Bronze3Icon from '../../images/ranks/BronzeIII.svg';
import Bronze2Icon from '../../images/ranks/BronzeII.svg';
import Bronze1Icon from '../../images/ranks/BronzeI.svg';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface HistoryEntry {
  timestamp: number;
  players: Player[];
}

interface PlayerHistoryData {
  date: string;
  rating: number;
  rank: number;
  timestamp: number;
}

interface Props {
  player: Player;
  history: HistoryEntry[];
  onClose: () => void;
}

export function PlayerHistoryModal({ player, history, onClose }: Props) {
  // Define rank thresholds with their icons for Y-axis (using correct ratings)
  const rankThresholds = [
    { rating: 0, name: 'Bronze I', icon: Bronze1Icon },
    { rating: 766, name: 'Bronze II', icon: Bronze2Icon },
    { rating: 914, name: 'Bronze III', icon: Bronze3Icon },
    { rating: 1055, name: 'Silver I', icon: Silver1Icon },
    { rating: 1189, name: 'Silver II', icon: Silver2Icon },
    { rating: 1316, name: 'Silver III', icon: Silver3Icon },
    { rating: 1436, name: 'Gold I', icon: Gold1Icon },
    { rating: 1549, name: 'Gold II', icon: Gold2Icon },
    { rating: 1654, name: 'Gold III', icon: Gold3Icon },
    { rating: 1752, name: 'Platinum I', icon: Platinum1Icon },
    { rating: 1843, name: 'Platinum II', icon: Platinum2Icon },
    { rating: 1928, name: 'Platinum III', icon: Platinum3Icon },
    { rating: 2004, name: 'Diamond I', icon: Diamond1Icon },
    { rating: 2074, name: 'Diamond II', icon: Diamond2Icon },
    { rating: 2137, name: 'Diamond III', icon: Diamond3Icon },
    { rating: 2192, name: 'Master I', icon: Master1Icon },
    { rating: 2275, name: 'Master II', icon: Master2Icon },
    { rating: 2350, name: 'Master III', icon: Master3Icon },
    { rating: 2500, name: 'Grandmaster', icon: GrandMasterIcon }, // Grandmaster threshold (top 300 + over Master I)
  ];

  // Create images for rank icons
  const rankImages = React.useMemo(() => {
    const images: { [key: number]: HTMLImageElement } = {};
    rankThresholds.forEach(threshold => {
      const img = new Image();
      img.src = threshold.icon;
      img.width = 20;
      img.height = 20;
      images[threshold.rating] = img;
    });
    return images;
  }, []);

  // Custom plugin to draw rank icons on Y-axis
  const rankIconPlugin = {
    id: 'rankIcons',
    afterDraw: (chart: any) => {
      const ctx = chart.ctx;
      const yAxis = chart.scales.y;
      const chartArea = chart.chartArea;
      
      rankThresholds.forEach(threshold => {
        const yPosition = yAxis.getPixelForValue(threshold.rating);
        
        // Only draw if the position is within the chart area
        if (yPosition >= chartArea.top && yPosition <= chartArea.bottom) {
          const img = rankImages[threshold.rating];
          if (img && img.complete) {
            // Draw icon to the left of the Y-axis
            ctx.drawImage(img, chartArea.left - 30, yPosition - 10, 20, 20);
          }
        }
      });
    }
  };
  // Extract player's rating history from the history snapshots
  const getPlayerHistory = (): PlayerHistoryData[] => {
    const playerHistory: PlayerHistoryData[] = [];
    
    // Sort history by timestamp (oldest first for chronological order)
    const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);
    
    sortedHistory.forEach((entry) => {
      const playerInSnapshot = entry.players.find(
        p => p.connectCode.code === player.connectCode.code
      );
      
      if (playerInSnapshot && playerInSnapshot.rankedNetplayProfile.ratingOrdinal) {
        // For grandmasters, use global placement if available, otherwise use regional rank
        let displayRank = playerInSnapshot.rankedNetplayProfile.rank || 0;
        if (playerInSnapshot.rankedNetplayProfile.dailyGlobalPlacement !== null) {
          displayRank = playerInSnapshot.rankedNetplayProfile.dailyGlobalPlacement;
        } else if (playerInSnapshot.rankedNetplayProfile.dailyRegionalPlacement !== null) {
          displayRank = playerInSnapshot.rankedNetplayProfile.dailyRegionalPlacement;
        }
        
        playerHistory.push({
          date: dayjs(entry.timestamp).format('MMM DD'),
          rating: Math.floor(playerInSnapshot.rankedNetplayProfile.ratingOrdinal),
          rank: displayRank,
          timestamp: entry.timestamp
        });
      }
    });
    
    return playerHistory;
  };

  const playerHistory = getPlayerHistory();
  
  // Get min and max ratings to determine which rank thresholds to show
  const ratings = playerHistory.map(entry => entry.rating);
  const minRating = Math.min(...ratings);
  const maxRating = Math.max(...ratings);
  
  // Filter rank thresholds to only show relevant ones
  const relevantThresholds = rankThresholds.filter(
    threshold => threshold.rating >= minRating - 200 && threshold.rating <= maxRating + 200
  );

  // Chart.js configuration
  const chartData = {
    labels: playerHistory.map(entry => entry.date),
    datasets: [
      {
        label: 'Rating',
        data: playerHistory.map(entry => entry.rating),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: 'rgb(59, 130, 246)',
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.1,
        yAxisID: 'y',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    layout: {
      padding: {
        left: 40, // Extra padding for rank icons
      },
    },
    plugins: {
      legend: {
        display: true,
        labels: {
          color: 'rgba(156, 163, 175, 1)',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(31, 41, 55, 0.9)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(75, 85, 99, 1)',
        borderWidth: 1,
        callbacks: {
          title: (context: any) => {
            const dataIndex = context[0].dataIndex;
            const entry = playerHistory[dataIndex];
            return dayjs(entry.timestamp).format('MMM DD, YYYY HH:mm');
          },
          label: (context: any) => {
            const dataIndex = context.dataIndex;
            const entry = playerHistory[dataIndex];
            
            if (context.dataset.label === 'Rating') {
              // Find the rank for this rating
              const rank = relevantThresholds.find(t => entry.rating >= t.rating);
              const rankName = rank ? rank.name : 'Unranked';
              return [`Rating: ${entry.rating}`, `Rank: ${rankName}`];
            }
            return '';
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        ticks: {
          color: 'rgba(156, 163, 175, 1)',
          font: {
            size: 12,
          },
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        ticks: {
          color: 'rgba(59, 130, 246, 1)',
          font: {
            size: 12,
          },
          // Show occasional ratings instead of rank names
          callback: function(value: any) {
            const numValue = Number(value);
            // Show ticks at meaningful rating intervals
            if (numValue % 200 === 0 || 
                numValue === 766 || numValue === 914 || numValue === 1055 || 
                numValue === 1189 || numValue === 1316 || numValue === 1436 || 
                numValue === 1549 || numValue === 1654 || numValue === 1752 || 
                numValue === 1843 || numValue === 1928 || numValue === 2004 || 
                numValue === 2074 || numValue === 2137 || numValue === 2192 || 
                numValue === 2275 || numValue === 2350) {
              return Math.floor(numValue);
            }
            return '';
          },
        },
        title: {
          display: true,
          text: 'Rating',
          color: 'rgba(59, 130, 246, 1)',
        },
      },
    },
  };

  const currentRating = Math.floor(player.rankedNetplayProfile.ratingOrdinal);
  const currentRank = player.rankedNetplayProfile.rank;
  const isGrandmaster = player.rankedNetplayProfile.dailyGlobalPlacement !== null || 
                       player.rankedNetplayProfile.dailyRegionalPlacement !== null;
  const globalRank = player.rankedNetplayProfile.dailyGlobalPlacement;
  const regionalRank = player.rankedNetplayProfile.dailyRegionalPlacement;
  
  // Calculate rating change from first to last entry
  const ratingChange = playerHistory.length >= 2 
    ? playerHistory[playerHistory.length - 1].rating - playerHistory[0].rating 
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6 border-b border-gray-700 pb-4">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">
                {player.displayName}
              </h2>
              <p className="text-gray-400 text-sm mb-2">{player.connectCode.code}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-blue-400 bg-blue-900 bg-opacity-30 px-2 py-1 rounded">
                  Current Rating: {currentRating}
                </span>
                {currentRank && (
                  <span className="text-green-400 bg-green-900 bg-opacity-30 px-2 py-1 rounded">
                    Current Rank: #{currentRank}
                  </span>
                )}
                {isGrandmaster && globalRank && (
                  <span className="text-yellow-400 bg-yellow-900 bg-opacity-30 px-2 py-1 rounded">
                    Global Rank: #{globalRank}
                  </span>
                )}
                {isGrandmaster && !globalRank && regionalRank && (
                  <span className="text-purple-400 bg-purple-900 bg-opacity-30 px-2 py-1 rounded">
                    Regional Rank: #{regionalRank}
                  </span>
                )}
                {ratingChange !== 0 && (
                  <span className={`${ratingChange > 0 ? 'text-green-500 bg-green-900' : 'text-red-500 bg-red-900'} bg-opacity-30 px-2 py-1 rounded`}>
                    {ratingChange > 0 ? '+' : ''}{ratingChange} over period
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-3xl font-bold hover:bg-gray-800 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
            >
              ×
            </button>
          </div>

          {/* Chart */}
          {playerHistory.length > 0 ? (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Rating History
                {isGrandmaster && (
                  <span className="text-yellow-400 text-sm ml-2">(Global Rankings)</span>
                )}
              </h3>
              <div className="flex gap-6">
                {/* Chart */}
                <div className="flex-1 h-80">
                  <Line 
                    data={chartData} 
                    options={chartOptions} 
                    plugins={[rankIconPlugin]}
                  />
                </div>
                
                {/* Rank Reference */}
                <div className="w-48 bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h4 className="text-white text-sm font-semibold mb-3">Rank Thresholds</h4>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {relevantThresholds.slice().reverse().map((threshold, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        <img 
                          src={threshold.icon} 
                          alt={threshold.name}
                          className="w-4 h-4"
                        />
                        <span className="text-gray-300 flex-1">{threshold.name}</span>
                        <span className="text-gray-400">{Math.floor(threshold.rating)}+</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No rating history available for this player</p>
              <p className="text-gray-500 text-sm mt-2">
                History data is collected over time as the leaderboard updates
              </p>
            </div>
          )}

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-center">
              <p className="text-gray-400 text-sm uppercase tracking-wide">Wins</p>
              <p className="text-green-400 text-2xl font-bold">{player.rankedNetplayProfile.wins}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm uppercase tracking-wide">Losses</p>
              <p className="text-red-400 text-2xl font-bold">{player.rankedNetplayProfile.losses}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm uppercase tracking-wide">Win Rate</p>
              <p className="text-blue-400 text-2xl font-bold">
                {player.rankedNetplayProfile.wins + player.rankedNetplayProfile.losses > 0
                  ? Math.round((player.rankedNetplayProfile.wins / (player.rankedNetplayProfile.wins + player.rankedNetplayProfile.losses)) * 100)
                  : 0}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm uppercase tracking-wide">Total Sets</p>
              <p className="text-white text-2xl font-bold">
                {player.rankedNetplayProfile.wins + player.rankedNetplayProfile.losses}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}