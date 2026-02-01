import React, { useEffect, useState } from 'react';
import { Table } from '../../Table';
import { RankLegend } from '../../RankLegend';
import { GrandmasterThreshold } from '../../GrandmasterThreshold';
import { FreeRankedDay } from '../../FreeRankedDay';
import { Player } from '../../../lib/player'
import playersOld from '../../../../cron/data/players-old.json';
import playersNew from '../../../../cron/data/players-new.json';
import timestamp from '../../../../cron/data/timestamp.json';
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime' // import plugin
import * as settings from '../../../../settings'
import ColoradoFlag from '../../../../images/Flag_of_Colorado.svg';
import { HistoryView } from './HistoryView';
dayjs.extend(relativeTime)

// Import history - fetchStats.ts ensures this file exists (even if empty initially)
import historyJson from '../../../../cron/data/history.json';
// Type assertion since JSON imports can vary in structure
const historyData: Array<{timestamp: number, players: Player[]}> = (Array.isArray(historyJson) 
  ? historyJson 
  : (historyJson as any)?.default || []) as Array<{timestamp: number, players: Player[]}>;


const setCount = (player: Player) => {
  return player.rankedNetplayProfile.wins +
    player.rankedNetplayProfile.losses;
}

const sortAndPopulatePlayers = (players: Player[]) => {
  players = players.filter((p)=> setCount(p))
    .concat(players.filter((p)=> !setCount(p)));
  players.forEach((player: Player, i: number) => {
    if(setCount(player) > 0) {
      player.rankedNetplayProfile.rank = i + 1
    }
  })
  return players
}

export default function HomePage() {
  console.log(playersNew);
  console.log(playersOld);

  const [showHistory, setShowHistory] = useState(false);
  const [showMobileRanks, setShowMobileRanks] = useState(false);

  const rankedPlayersOld = sortAndPopulatePlayers(playersOld)
  const oldPlayersMap = new Map(
    rankedPlayersOld.map((p) => [p.connectCode.code, p]));
  
  const players = sortAndPopulatePlayers(playersNew);
  players.forEach((p) => {
    const oldData = oldPlayersMap.get(p.connectCode.code)
    if(oldData) {
      p.oldRankedNetplayProfile = oldData.rankedNetplayProfile
    }
  })

  // continuously update
  const updatedAt = dayjs(timestamp.updated);
  const [updateDesc, setUpdateDesc] = useState(updatedAt.fromNow())
  useEffect(() => {
    const interval = setInterval(
      () => setUpdateDesc(updatedAt.fromNow()), 1000*60);
    return () => {
      clearInterval(interval);
    };
  }, []);

  if (showHistory) {
    return <HistoryView history={historyData} onClose={() => setShowHistory(false)} />;
  }

  return (
    <div className="flex min-h-screen p-4 gap-6 justify-center">
      {/* Left sidebar with GM threshold */}
      <div className="hidden lg:block flex-shrink-0">
        <div className="sticky top-4">
          <GrandmasterThreshold players={players} history={historyData} />
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex flex-col items-center max-w-4xl">
        <img className="h-48 hover:scale-105 hover:drop-shadow-2xl transition-all duration-500 ease-out cursor-pointer" src={ColoradoFlag} alt="colorado flag" />
        <h1 className="text-3xl m-4 text-center text-white">
          {settings.title}
        </h1>
        <div className="p-1 text-gray-300"> Updated {updateDesc}</div>
        <div className="text-xs text-gray-400 mb-2">
          📈 Click on player names to view their rating history over time
        </div>
        {historyData.length > 0 && (
          <button
            onClick={() => setShowHistory(true)}
            className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 hover:scale-105 hover:shadow-lg transition-all duration-300 ease-out"
          >
            Show History
          </button>
        )}
        
        {/* Mobile components toggle */}
        <div className="lg:hidden mb-4">
          <button
            onClick={() => setShowMobileRanks(!showMobileRanks)}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 hover:scale-105 hover:shadow-lg transition-all duration-300 ease-out"
          >
            {showMobileRanks ? 'Hide' : 'Show'} Info Panels
          </button>
          {showMobileRanks && (
            <div className="mt-4 space-y-4">
              <GrandmasterThreshold players={players} history={historyData} />
              <RankLegend />
              <FreeRankedDay />
            </div>
          )}
        </div>
        
        <Table players={players} history={historyData} />
        <div className="p-4 text-gray-300 flex flex-col text-center">
          <div>Built by blorppppp, maintained by mmunder</div>
          <div>
            <a href="https://www.buymeacoffee.com/blorppppp" target="_blank" rel="noreferrer"
               className="text-gray-400 hover:text-indigo-700 mr-2 hover:underline">
              Buy blorpppp a coffee
            </a>☕
          </div>
        </div>
      </div>
      
      {/* Right sidebar with rank legend and free ranked day */}
      <div className="hidden lg:block flex-shrink-0">
        <div className="sticky top-4 space-y-4">
          <RankLegend />
          <FreeRankedDay />
        </div>
      </div>
    </div>
  );
}
