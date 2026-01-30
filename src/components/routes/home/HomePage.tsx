import React, { useEffect, useState } from 'react';
import { Table } from '../../Table';
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
const historyData: Array<{timestamp: number, players: Player[]}> = Array.isArray(historyJson) 
  ? historyJson 
  : (historyJson.default || []);


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
    <div className="flex flex-col items-center h-screen p-8">
      <img className="h-48" src={ColoradoFlag} alt="colorado flag" />
      <h1 className="text-3xl m-4 text-center text-white">
        {settings.title}
      </h1>
      <div className="p-1 text-gray-300"> Updated {updateDesc}</div>
      {historyData.length > 0 && (
        <button
          onClick={() => setShowHistory(true)}
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Show History
        </button>
      )}
      <Table players={players} />
      <div className="p-4 text-gray-300 flex flex-col">
        <div>Built by blorppppp, maintained by mmunder</div>
        <div>
          <a href="https://www.buymeacoffee.com/blorppppp" target="_blank" rel="noreferrer"
             className="text-gray-400 hover:text-indigo-700 mr-2 hover:underline">
            Buy blorpppp a coffee
          </a>☕
        </div>
      </div>
    </div>
  );
}
