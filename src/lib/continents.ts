// Continent codes from Slippi API → display labels + flag emoji
const CONTINENT_MAP: Record<string, { label: string; flag: string }> = {
  'NORTH_AMERICA': { label: 'NA', flag: '🌎' },
  'SOUTH_AMERICA': { label: 'SA', flag: '🌎' },
  'EUROPE': { label: 'EU', flag: '🌍' },
  'ASIA': { label: 'Asia', flag: '🌏' },
  'OCEANIA': { label: 'OCE', flag: '🌏' },
  'AFRICA': { label: 'AF', flag: '🌍' },
};

export function getContinentDisplay(continent: string | null | undefined): { label: string; flag: string } | null {
  if (!continent) return null;
  return CONTINENT_MAP[continent] ?? { label: continent, flag: '🌐' };
}
