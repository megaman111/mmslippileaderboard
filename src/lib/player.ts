export interface CharacterStats {
  character: string;
  gameCount: number;
}

interface RankedNetplayProfile {
  rank?: number; // populated separately
  ratingOrdinal: number;
  ratingUpdateCount: number;
  wins: number;
  losses: number;
  dailyGlobalPlacement: number | null;
  dailyRegionalPlacement: number | null;
  continent: string | null;
  characters: CharacterStats[];
}

export interface Player {
  displayName: string;
  connectCode: {
    code: string;
  };
  rankedNetplayProfile: RankedNetplayProfile;
  oldRankedNetplayProfile?: RankedNetplayProfile; // populated separately
  continent?: string | null;
  subscriptionLevel?: string | null;
}
