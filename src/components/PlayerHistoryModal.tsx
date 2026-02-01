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
              return `Rating: ${entry.rating}`;
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
          // Show regular intervals and let the plugin handle rank indicators
          callback: function(value: any) {
            const numValue = Number(value);
            // Show every 200 points for basic reference
            if (numValue % 200 === 0) {
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
              <div className="h-80">
                <Line 
                  data={chartData} 
                  options={chartOptions}
                />
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