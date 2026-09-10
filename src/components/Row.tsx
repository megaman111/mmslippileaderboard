import React, { useState } from 'react';
import { Player } from '../lib/player'
import { getRank } from '../lib/ranks'
import { Characters } from './Characters'
import { PlayerHistoryModal } from './PlayerHistoryModal'
import { getContinentDisplay } from '../lib/continents'

interface HistoryEntry {
  timestamp: number;
  players: Player[];
}

interface Props {
  player: Player;
  history?: HistoryEntry[];
  playerRank?: number; // 1 for first, 2 for second, 3 for third, etc.
}

export function Row({ player, history, playerRank }: Props) {
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const codeToId = (code: string) => {
    const parts = code.split('#')
    return `${parts[0].toLowerCase()}-${parts[1]}`
  }

  const codeToUrlSlug = (code: string) => {
    return `https://slippi.gg/user/${codeToId(code)}` 
  }

  const changeIndicator = (change: number, indicators: string[]) => {
    return <span className={`px-1 md:text-sm text-xs ${change > 0 ? 'text-green-500': 'text-red-500'}`}>
     {change > 0? indicators[0]: indicators[1]}{Math.abs(change)}
   </span>
  }

  const changeArrow = (change: number) => {
    return changeIndicator(change, ['▲ ', '▼ '])

  }

  const changePlusMinus = (change: number) => {
    return changeIndicator(change, ['+', '-'])
  }

  const getRankChange = (player: Player) => {
    if (!player.oldRankedNetplayProfile || !player.oldRankedNetplayProfile.rank) {
      return null;
    }
    return player.oldRankedNetplayProfile.rank - player.rankedNetplayProfile.rank;
  }

  const getRatingChange = (player: Player) => {
    if (!player.oldRankedNetplayProfile || !player.oldRankedNetplayProfile.ratingOrdinal) {
      return null;
    }
    return Math.floor(player.rankedNetplayProfile.ratingOrdinal - player.oldRankedNetplayProfile.ratingOrdinal);
  }

  const playerRankData = getRank(player);
  const isActive = playerRankData.name !== 'None';
  const totalSets = player.rankedNetplayProfile.wins + player.rankedNetplayProfile.losses;
  const totalGames = (player.rankedNetplayProfile.characters || []).reduce((acc, val)=> acc + val.gameCount, 0);
  const rankChange = getRankChange(player);
  const ratingChange = getRatingChange(player);
  const isGrandmaster = playerRankData.name === 'Grandmaster';
  const globalRank = player.rankedNetplayProfile.dailyGlobalPlacement;
  const regionalRank = player.rankedNetplayProfile.dailyRegionalPlacement;
  
  // Special styling for MM#391 and podium positions
  const isMyCode = player.connectCode.code === 'MM#391';
  const isFirstPlace = playerRank === 1;
  const isSecondPlace = playerRank === 2;
  const isThirdPlace = playerRank === 3;
  
  const getSpecialGlow = () => {
    if (isMyCode) return 'shadow-[0_0_20px_rgba(59,130,246,0.8)] border-2 border-blue-400';
    if (isFirstPlace) return 'shadow-[0_0_20px_rgba(255,215,0,0.8)] border-2 border-yellow-400';
    if (isSecondPlace) return 'shadow-[0_0_20px_rgba(192,192,192,0.8)] border-2 border-gray-300';
    if (isThirdPlace) return 'shadow-[0_0_20px_rgba(205,127,50,0.8)] border-2 border-orange-600';
    return '';
  };
  
  const getNameGlow = () => {
    if (isMyCode) return 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] font-bold';
    if (isFirstPlace) return 'text-yellow-400 drop-shadow-[0_0_8px_rgba(255,215,0,0.8)] font-bold';
    if (isSecondPlace) return 'text-gray-300 drop-shadow-[0_0_8px_rgba(192,192,192,0.8)] font-bold';
    if (isThirdPlace) return 'text-orange-400 drop-shadow-[0_0_8px_rgba(205,127,50,0.8)] font-bold';
    return 'text-gray-300';
  };
  
  const getCodeGlow = () => {
    if (isMyCode) return 'text-blue-300 font-semibold';
    if (isFirstPlace) return 'text-yellow-300 font-semibold';
    if (isSecondPlace) return 'text-gray-200 font-semibold';
    if (isThirdPlace) return 'text-orange-300 font-semibold';
    return 'text-gray-300';
  };
  
  const specialGlow = getSpecialGlow();
  const nameGlow = getNameGlow();
  const codeGlow = getCodeGlow();
  const continentInfo = getContinentDisplay(player.continent ?? player.rankedNetplayProfile.continent);
  const hasSubscription = player.subscriptionLevel && player.subscriptionLevel !== 'NONE';

  return (
    <>
      <tr className={`${playerRankData.bgClass} border-separate border-spacing-2 border-b-2 border-gray-600 ${!showHistoryModal ? 'hover:bg-opacity-80 hover:brightness-110 hover:scale-[1.02] transition-all duration-300 ease-out hover:shadow-lg' : ''} cursor-pointer ${specialGlow} group`} >
        <td className="md:text-2xl text-gray-300 md:px-6 md:py-4 md:p-1 whitespace-nowrap">
          <div className="group-hover:scale-110 transition-transform duration-300 ease-out">{isActive && `#${player.rankedNetplayProfile.rank}`}</div>
          {Boolean(rankChange) && <div className="group-hover:translate-x-1 transition-transform duration-300 ease-out">{changeArrow(rankChange)}</div>} </td>
        <td className="text-gray-100 md:px-6 md:py-4 p-1 whitespace-nowrap text-center overflow-hidden md:max-w-full max-w-[7rem] text-elipses">
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => history && history.length > 0 && setShowHistoryModal(true)}
              className={`md:text-xl text-sm max-w-xs ${nameGlow} hover:brightness-125 hover:underline hover:scale-105 transition-all duration-300 ease-out ${
                history && history.length > 0 ? 'cursor-pointer' : 'cursor-default'
              }`}
              disabled={!history || history.length === 0}
            >
              {player.displayName}
            </button>
            {history && history.length > 0 && (
              <span className="text-blue-400 text-xs ml-1 group-hover:animate-pulse transition-all duration-300" title="Click name to view rating history">
                📈
              </span>
            )}
            {(!history || history.length === 0) && (
              <span className="text-gray-500 text-xs ml-1 group-hover:opacity-75 transition-opacity duration-300" title="Rating history will be available after data collection">
                📊
              </span>
            )}
          </div>
          <div className={`text-xs ${codeGlow}`}>
            {player.connectCode.code}
            {continentInfo && (
              <span className="ml-1 text-gray-400" title={continentInfo.label}>
                {continentInfo.flag} {continentInfo.label}
              </span>
            )}
            {hasSubscription && (
              <span className="ml-1 text-yellow-500" title={`Slippi Supporter (${player.subscriptionLevel})`}>
                ⭐
              </span>
            )}
          </div>
          <a 
            href={codeToUrlSlug(player.connectCode.code)} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 hover:underline hover:scale-105 transition-all duration-300 ease-out inline-block"
          >
            View on Slippi.gg
          </a>
        </td>
        <td className="md:text-xl text-sm text-gray-900 md:px-6 md:py-4 p-1 whitespace-nowrap text-center">

          {playerRankData.iconUrl && <div className="flex items-center justify-center">
            <img className="md:h-10 md:w-10 h-6 w-6 drop-shadow group-hover:scale-110 group-hover:drop-shadow-lg transition-all duration-300 ease-out" src={playerRankData.iconUrl} />
          </div>}
          <div className="md:text-lg text-xs max-w-xs text-gray-300 uppercase">
            {playerRankData.name}
          </div>
          <div className="text-gray-300 md:text-sm text-xs">
            {isActive && Math.floor(player.rankedNetplayProfile.ratingOrdinal)}
            {isActive && Boolean(ratingChange) && changePlusMinus(ratingChange)}
            {isGrandmaster && globalRank && (
              <div className="text-yellow-400 text-xs">
                Global #{globalRank}
              </div>
            )}
            {isGrandmaster && !globalRank && regionalRank && (
              <div className="text-purple-400 text-xs">
                Regional #{regionalRank}
              </div>
            )}
          </div>
        </td>
        <td className="md:text-sm text-xs text-gray-300 md:px-6 md:py-4 py-1  md:max-w-[18rem] max-w-[3rem]">
          <Characters player={player} totalGames={totalGames} />
        </td>
        <td className="md:text-xl text-gray-300 text-sm md:px-6 md:py-4 md:p-1 whitespace-nowrap">
          {Boolean(totalGames) && <><span className="text-green-500">{player.rankedNetplayProfile.wins ?? 0}</span><span className="md:p-1">/</span>
          <span className="text-red-500">{player.rankedNetplayProfile.losses ?? 0}</span>
        </>}
        </td>
      </tr>
      
      {/* Player History Modal */}
      {showHistoryModal && history && (
        <PlayerHistoryModal
          player={player}
          history={history}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </>
  );
}
