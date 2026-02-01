import React, { useState, useEffect } from 'react';
import { Table } from '../../Table';
import { Player } from '../../../lib/player';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

interface HistoryEntry {
  timestamp: number;
  players: Player[];
}

interface Props {
  history: HistoryEntry[];
  onClose: () => void;
}

const setCount = (player: Player) => {
  return player.rankedNetplayProfile.wins +
    player.rankedNetplayProfile.losses;
};

const sortAndPopulatePlayers = (players: Player[]) => {
  players = players.filter((p) => setCount(p))
    .concat(players.filter((p) => !setCount(p)));
  players.forEach((player: Player, i: number) => {
    if (setCount(player) > 0) {
      player.rankedNetplayProfile.rank = i + 1;
    }
  });
  return players;
};

export function HistoryView({ history, onClose }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (history.length > 0 && selectedIndex >= 0 && selectedIndex < history.length) {
      const sorted = sortAndPopulatePlayers([...history[selectedIndex].players]);
      setPlayers(sorted);
    } else {
      setPlayers([]);
    }
  }, [history, selectedIndex]);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center p-8">
        <div className="text-white text-xl mb-4">No history available</div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
        >
          Close
        </button>
      </div>
    );
  }

  const selectedEntry = history[selectedIndex];
  const selectedDate = dayjs(selectedEntry.timestamp);

  return (
    <div className="flex flex-col items-center h-screen p-8">
      <div className="w-full max-w-6xl mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl text-white">Leaderboard History</h2>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Close History
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-gray-300 text-sm mb-2">
              Select Date: {selectedDate.format('MMM DD, YYYY HH:mm')}
            </label>
            <input
              type="range"
              min="0"
              max={history.length - 1}
              value={selectedIndex}
              onChange={(e) => setSelectedIndex(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{dayjs(history[history.length - 1].timestamp).format('MMM DD')}</span>
              <span>{dayjs(history[0].timestamp).format('MMM DD')}</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
              disabled={selectedIndex === 0}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              onClick={() => setSelectedIndex(Math.min(history.length - 1, selectedIndex + 1))}
              disabled={selectedIndex === history.length - 1}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
        
        <div className="text-gray-300 text-sm mb-2">
          Showing data from {selectedDate.format('MMMM DD, YYYY [at] HH:mm')} ({selectedDate.fromNow()})
        </div>
      </div>
      
      <Table players={players} history={history} />
    </div>
  );
}

