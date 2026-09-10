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

const setCount = (player: Player) => {
  return player.rankedNetplayProfile.wins +
    player.rankedNetplayProfile.losses;
}

const MIN_RANK_SETS = 5;

class NoneRank implements Rank {
  public name = "None"
  public iconUrl = NoneIcon
  public bgClass = "bg-stone-500"

  isRank(player: Player) {
    return setCount(player) === 0;
  }
}


class PendingRank implements Rank {
  public name = "Pending"
  public iconUrl = PendingIcon
  public bgClass = "bg-stone-700"

  isRank(player: Player) {
    const totalSets = setCount(player)
    return 0 < totalSets && totalSets < MIN_RANK_SETS;
  }
}

class StandardRank implements Rank {
  constructor(
    public name: string,
    private lowerBound: number,
    private upperBound: number,
    public bgClass: string,
    public iconUrl?: string,
  ) {}

  isRank(player: Player) {
    if(setCount(player) < MIN_RANK_SETS) {
      return false
    }
    // Use floor to ensure rating always falls within a rank boundary
    const rating = Math.floor(player.rankedNetplayProfile.ratingOrdinal);
    return this.lowerBound <= rating && rating <= this.upperBound;
  }
}

class GrandMaster extends StandardRank {
  constructor() {
    super('Grandmaster', 2192, Infinity, "bg-slate-900", GrandMasterIcon)
  }

  isRank(player: Player) {
    const hasRating = super.isRank(player);
    if(!hasRating) {
      return false;
    }
    // Grandmaster requires being in top 300 (global or regional placement) AND over Master I rating (2192)
    return (player.rankedNetplayProfile.dailyGlobalPlacement !== null && player.rankedNetplayProfile.dailyGlobalPlacement <= 300)
      || (player.rankedNetplayProfile.dailyRegionalPlacement !== null && player.rankedNetplayProfile.dailyRegionalPlacement <= 300);
  }
}

const ORANGE_BG = 'bg-orange-900';
const SLATE_BG = 'bg-slate-800';
const YELLOW_BG = 'bg-yellow-900';
const SKY_BG = 'bg-sky-900';
const BLUE_BG = 'bg-blue-900';
const INDIGO_BG = 'bg-indigo-900';

export const RANKS = [
  new NoneRank(),
  new PendingRank(),
  new StandardRank('Bronze I', 0, 765, ORANGE_BG, Bronze1Icon),
  new StandardRank('Bronze II', 766, 913, ORANGE_BG, Bronze2Icon),
  new StandardRank('Bronze III', 914, 1054, ORANGE_BG, Bronze3Icon),
  new StandardRank('Silver I', 1055, 1188, SLATE_BG, Silver1Icon),
  new StandardRank('Silver II', 1189, 1315, SLATE_BG, Silver2Icon),
  new StandardRank('Silver III', 1316, 1435, SLATE_BG, Silver3Icon),
  new StandardRank('Gold I', 1436, 1548, YELLOW_BG, Gold1Icon),
  new StandardRank('Gold II', 1549, 1653, YELLOW_BG, Gold2Icon),
  new StandardRank('Gold III', 1654, 1751, YELLOW_BG, Gold3Icon),
  new StandardRank('Platinum I', 1752, 1842, SKY_BG, Platinum1Icon),
  new StandardRank('Platinum II', 1843, 1927, SKY_BG, Platinum2Icon),
  new StandardRank('Platinum III', 1928, 2003, SKY_BG, Platinum3Icon),
  new StandardRank('Diamond I', 2004, 2073, BLUE_BG, Diamond1Icon),
  new StandardRank('Diamond II', 2074, 2136, BLUE_BG, Diamond2Icon),
  new StandardRank('Diamond III', 2137, 2190, BLUE_BG, Diamond3Icon),
  new StandardRank('Master I', 2191, 2273, INDIGO_BG, Master1Icon),
  new StandardRank('Master II', 2274, 2349, INDIGO_BG, Master2Icon),
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
