// Map football-data.org API team names → pool pick names where they differ
export const NAME_MAP: Record<string, string> = {
  'United States': 'USA',
  'Korea Republic': 'South Korea',
  'Türkiye': 'Turkey',
  'Bosnia-Herzegovina': 'Bosnia & Herzegovina',
  "Côte d'Ivoire": 'Ivory Coast',
  'Congo DR': 'DR Congo',
  'Cape Verde Islands': 'Cape Verde',
};

export function normalizeTeamName(name: string): string {
  return NAME_MAP[name] ?? name;
}

export interface FDMatch {
  id: number;
  stage: string;
  status: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  score: {
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
    fullTime: { home: number | null; away: number | null };
  };
}
