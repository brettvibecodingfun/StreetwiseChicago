export const GROUP_WIN  = 3;
export const GROUP_DRAW = 1;
export const GROUP_LOSS = 0;

export const KNOCKOUT_POINTS: Record<string, number> = {
  LAST_32:        5,
  LAST_16:        10,
  QUARTER_FINALS: 20,
  SEMI_FINALS:    40,
  FINAL:          80,
};

// Tier 1 picks earn +25 bonus if champion, tier 2 = +50, tier 3 = +100, tier 4 = +200
export const CHAMPION_BONUS: Record<number, number> = {
  1: 25,
  2: 50,
  3: 100,
  4: 200,
};

// Tier 1–3 teams keyed by their football-data.org API name (after normalization)
const TEAM_TIERS: Record<string, number> = {
  // Tier 1
  'France': 1, 'Spain': 1, 'Argentina': 1, 'England': 1, 'Portugal': 1, 'Brazil': 1,
  // Tier 2
  'Netherlands': 2, 'Morocco': 2, 'Belgium': 2, 'Germany': 2, 'Croatia': 2,
  'Colombia': 2, 'Senegal': 2, 'Mexico': 2, 'USA': 2, 'United States': 2, 'Uruguay': 2,
  // Tier 3
  'Japan': 3, 'Switzerland': 3, 'Iran': 3, 'Turkey': 3, 'Türkiye': 3,
  'Ecuador': 3, 'Austria': 3, 'South Korea': 3, 'Korea Republic': 3,
  'Australia': 3, 'Algeria': 3, 'Egypt': 3, 'Canada': 3, 'Norway': 3,
};

export function getTier(teamName: string): number {
  return TEAM_TIERS[teamName] ?? 4;
}
