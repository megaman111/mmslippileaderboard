import { Player } from './player'
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
import NoneIcon from '../../images/ranks/None.svg';
import PendingIcon from '../../images/ranks/Pending.svg';

interface Rank {
  isRank(player: Player): boolean
  name: string
  bgClass: string
  iconUrl?: string
}

// Slippi decides None/Pending from the number of rated sets (ratingUpdateCount).
// Older snapshots may lack it, so fall back to wins + losses.
const ratedSets = (player: Player) => {
  const profile = player.rankedNetplayProfile;
  return typeof profile.ratingUpdateCount === 'number'
    ? profile.ratingUpdateCount
    : profile.wins + profile.losses;
}

const MIN_RANK_SETS = 5;

class NoneRank implements Rank {
  public name = "None"
  public iconUrl = NoneIcon
  public bgClass = "bg-stone-500"

  isRank(player: Player) {
    return ratedSets(player) === 0;
  }
}


class PendingRank implements Rank {
  public name = "Pending"
  public iconUrl = PendingIcon
  public bgClass = "bg-stone-700"

  isRank(player: Player) {
    const totalSets = ratedSets(player)
    return 0 < totalSets && totalSets < MIN_RANK_SETS;
  }
}

class StandardRank implements Rank {
  // Rating must be >= lowerBound and < upperBound (same decimals slippi.gg uses)
  constructor(
    public name: string,
    public lowerBound: number,
    public upperBound: number,
    public bgClass: string,
    public iconUrl?: string,
  ) {}

  isRank(player: Player) {
    if(ratedSets(player) < MIN_RANK_SETS) {
      return false
    }
    const rating = player.rankedNetplayProfile.ratingOrdinal;
    return this.lowerBound <= rating && rating < this.upperBound;
  }
}

export const GM_MIN_RATING = 2191.75;

class GrandMaster extends StandardRank {
  constructor() {
    super('Grandmaster', GM_MIN_RATING, Infinity, "bg-slate-900", GrandMasterIcon)
  }

  // Mirrors slippi.gg: rating >= 2191.75 AND a daily global or regional placement.
  // Slippi only hands out a placement to players in the daily GM snapshot
  // (global top 300, or the top of a region), so a non-null placement == GM.
  isRank(player: Player) {
    if(!super.isRank(player)) {
      return false;
    }
    const profile = player.rankedNetplayProfile;
    return Boolean(profile.dailyGlobalPlacement) || Boolean(profile.dailyRegionalPlacement);
  }
}

const ORANGE_BG = 'bg-orange-900';
const SLATE_BG = 'bg-slate-800';
const YELLOW_BG = 'bg-yellow-900';
const SKY_BG = 'bg-sky-900';
const BLUE_BG = 'bg-blue-900';
const INDIGO_BG = 'bg-indigo-900';

// Thresholds copied from slippi.gg's rank function
export const RANKS = [
  new NoneRank(),
  new PendingRank(),
  new StandardRank('Bronze I', -Infinity, 765.43, ORANGE_BG, Bronze1Icon),
  new StandardRank('Bronze II', 765.43, 913.72, ORANGE_BG, Bronze2Icon),
  new StandardRank('Bronze III', 913.72, 1054.87, ORANGE_BG, Bronze3Icon),
  new StandardRank('Silver I', 1054.87, 1188.88, SLATE_BG, Silver1Icon),
  new StandardRank('Silver II', 1188.88, 1315.75, SLATE_BG, Silver2Icon),
  new StandardRank('Silver III', 1315.75, 1435.48, SLATE_BG, Silver3Icon),
  new StandardRank('Gold I', 1435.48, 1548.07, YELLOW_BG, Gold1Icon),
  new StandardRank('Gold II', 1548.07, 1653.52, YELLOW_BG, Gold2Icon),
  new StandardRank('Gold III', 1653.52, 1751.83, YELLOW_BG, Gold3Icon),
  new StandardRank('Platinum I', 1751.83, 1843, SKY_BG, Platinum1Icon),
  new StandardRank('Platinum II', 1843, 1927.03, SKY_BG, Platinum2Icon),
  new StandardRank('Platinum III', 1927.03, 2003.92, SKY_BG, Platinum3Icon),
  new StandardRank('Diamond I', 2003.92, 2073.67, BLUE_BG, Diamond1Icon),
  new StandardRank('Diamond II', 2073.67, 2136.28, BLUE_BG, Diamond2Icon),
  new StandardRank('Diamond III', 2136.28, GM_MIN_RATING, BLUE_BG, Diamond3Icon),
  new StandardRank('Master I', GM_MIN_RATING, 2275, INDIGO_BG, Master1Icon),
  new StandardRank('Master II', 2275, 2350, INDIGO_BG, Master2Icon),
  new StandardRank('Master III', 2350, Infinity, INDIGO_BG, Master3Icon),
  new GrandMaster()
]

export function getRank(player: Player) {
  for(let i = RANKS.length - 1; i >= 0; i--) {
    if(RANKS[i].isRank(player)) {
      return RANKS[i]
    }
  }
  return new NoneRank()
}
