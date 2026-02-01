import React from 'react';
import { RANKS } from '../lib/ranks';

export function RankLegend() {
  // Define rating ranges manually since they're private in the classes
  const rankData = [
    { name: 'Grandmaster', range: '2192+ & Top 300', icon: RANKS.find(r => r.name === 'Grandmaster')?.iconUrl },
    { name: 'Master III', range: '2350+', icon: RANKS.find(r => r.name === 'Master III')?.iconUrl },
    { name: 'Master II', range: '2275 - 2349', icon: RANKS.find(r => r.name === 'Master II')?.iconUrl },
    { name: 'Master I', range: '2192 - 2274', icon: RANKS.find(r => r.name === 'Master I')?.iconUrl },
    { name: 'Diamond III', range: '2137 - 2191', icon: RANKS.find(r => r.name === 'Diamond III')?.iconUrl },
    { name: 'Diamond II', range: '2074 - 2136', icon: RANKS.find(r => r.name === 'Diamond II')?.iconUrl },
    { name: 'Diamond I', range: '2004 - 2073', icon: RANKS.find(r => r.name === 'Diamond I')?.iconUrl },
    { name: 'Platinum III', range: '1928 - 2003', icon: RANKS.find(r => r.name === 'Platinum III')?.iconUrl },
    { name: 'Platinum II', range: '1843 - 1927', icon: RANKS.find(r => r.name === 'Platinum II')?.iconUrl },
    { name: 'Platinum I', range: '1752 - 1842', icon: RANKS.find(r => r.name === 'Platinum I')?.iconUrl },
    { name: 'Gold III', range: '1654 - 1751', icon: RANKS.find(r => r.name === 'Gold III')?.iconUrl },
    { name: 'Gold II', range: '1549 - 1653', icon: RANKS.find(r => r.name === 'Gold II')?.iconUrl },
    { name: 'Gold I', range: '1436 - 1548', icon: RANKS.find(r => r.name === 'Gold I')?.iconUrl },
    { name: 'Silver III', range: '1316 - 1435', icon: RANKS.find(r => r.name === 'Silver III')?.iconUrl },
    { name: 'Silver II', range: '1189 - 1315', icon: RANKS.find(r => r.name === 'Silver II')?.iconUrl },
    { name: 'Silver I', range: '1055 - 1188', icon: RANKS.find(r => r.name === 'Silver I')?.iconUrl },
    { name: 'Bronze III', range: '914 - 1054', icon: RANKS.find(r => r.name === 'Bronze III')?.iconUrl },
    { name: 'Bronze II', range: '766 - 913', icon: RANKS.find(r => r.name === 'Bronze II')?.iconUrl },
    { name: 'Bronze I', range: '0 - 765', icon: RANKS.find(r => r.name === 'Bronze I')?.iconUrl },
  ];

  const specialRanks = [
    { name: 'Pending', range: '< 5 sets', icon: RANKS.find(r => r.name === 'Pending')?.iconUrl },
    { name: 'None', range: 'No games', icon: RANKS.find(r => r.name === 'None')?.iconUrl },
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700 w-72 max-h-[600px] overflow-y-auto">
      <h3 className="text-white text-lg font-bold mb-4 text-center border-b border-gray-600 pb-2">
        🏆 Ranks
      </h3>
      
      <div className="space-y-1.5">
        {/* Main competitive ranks */}
        {rankData.map((rank, index) => (
          <div key={rank.name} className="flex items-center gap-3 p-2 rounded bg-gray-700 bg-opacity-40 hover:bg-opacity-60 hover:scale-[1.02] hover:shadow-md transition-all duration-300 ease-out cursor-pointer group">
            {rank.icon && (
              <img 
                src={rank.icon} 
                alt={rank.name}
                className="w-7 h-7 flex-shrink-0 group-hover:scale-110 group-hover:drop-shadow-lg transition-all duration-300 ease-out"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-white font-medium text-sm group-hover:text-gray-100 transition-colors duration-300">
                {rank.name}
              </div>
              <div className="text-gray-300 text-xs group-hover:text-gray-200 transition-colors duration-300">
                {rank.range}
              </div>
            </div>
          </div>
        ))}
        
        {/* Separator */}
        <div className="border-t border-gray-600 my-2"></div>
        
        {/* Special ranks */}
        {specialRanks.map((rank) => (
          <div key={rank.name} className="flex items-center gap-3 p-2 rounded bg-gray-700 bg-opacity-25 hover:bg-opacity-40 hover:scale-[1.01] transition-all duration-300 ease-out cursor-pointer group">
            {rank.icon && (
              <img 
                src={rank.icon} 
                alt={rank.name}
                className="w-7 h-7 flex-shrink-0 opacity-75 group-hover:opacity-90 group-hover:scale-105 transition-all duration-300 ease-out"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-gray-400 font-medium text-sm group-hover:text-gray-300 transition-colors duration-300">
                {rank.name}
              </div>
              <div className="text-gray-500 text-xs group-hover:text-gray-400 transition-colors duration-300">
                {rank.range}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}