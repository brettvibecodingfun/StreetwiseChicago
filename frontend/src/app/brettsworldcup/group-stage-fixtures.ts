export type MatchOutcome = 'home' | 'draw' | 'away';

export interface GroupFixture {
  id: number;
  date: string;  // 'YYYY-MM-DD'
  group: string;
  home: string;
  away: string;
}

export const GROUP_FIXTURES: GroupFixture[] = [
  // ── Matchday 1 ────────────────────────────────────────────────────────────
  { id:  1, date: '2026-06-11', group: 'A', home: 'Mexico',       away: 'South Africa' },
  { id:  2, date: '2026-06-11', group: 'A', home: 'South Korea',  away: 'Czechia' },
  { id:  3, date: '2026-06-12', group: 'B', home: 'Canada',       away: 'Bosnia & Herzegovina' },
  { id:  4, date: '2026-06-12', group: 'D', home: 'USA',          away: 'Paraguay' },
  { id:  5, date: '2026-06-13', group: 'B', home: 'Qatar',        away: 'Switzerland' },
  { id:  6, date: '2026-06-13', group: 'C', home: 'Brazil',       away: 'Morocco' },
  { id:  7, date: '2026-06-13', group: 'C', home: 'Haiti',        away: 'Scotland' },
  { id:  8, date: '2026-06-13', group: 'D', home: 'Australia',    away: 'Turkey' },
  { id:  9, date: '2026-06-14', group: 'E', home: 'Germany',      away: 'Curaçao' },
  { id: 10, date: '2026-06-14', group: 'F', home: 'Netherlands',  away: 'Japan' },
  { id: 11, date: '2026-06-14', group: 'E', home: 'Ivory Coast',  away: 'Ecuador' },
  { id: 12, date: '2026-06-14', group: 'F', home: 'Sweden',       away: 'Tunisia' },
  { id: 13, date: '2026-06-15', group: 'H', home: 'Spain',        away: 'Cape Verde' },
  { id: 14, date: '2026-06-15', group: 'G', home: 'Belgium',      away: 'Egypt' },
  { id: 15, date: '2026-06-15', group: 'H', home: 'Saudi Arabia', away: 'Uruguay' },
  { id: 16, date: '2026-06-15', group: 'G', home: 'Iran',         away: 'New Zealand' },
  { id: 17, date: '2026-06-16', group: 'I', home: 'France',       away: 'Senegal' },
  { id: 18, date: '2026-06-16', group: 'I', home: 'Iraq',         away: 'Norway' },
  { id: 19, date: '2026-06-16', group: 'J', home: 'Argentina',    away: 'Algeria' },
  { id: 20, date: '2026-06-16', group: 'J', home: 'Austria',      away: 'Jordan' },
  { id: 21, date: '2026-06-17', group: 'K', home: 'Portugal',     away: 'DR Congo' },
  { id: 22, date: '2026-06-17', group: 'L', home: 'England',      away: 'Croatia' },
  { id: 23, date: '2026-06-17', group: 'L', home: 'Ghana',        away: 'Panama' },
  { id: 24, date: '2026-06-17', group: 'K', home: 'Uzbekistan',   away: 'Colombia' },
  // ── Matchday 2 ────────────────────────────────────────────────────────────
  { id: 25, date: '2026-06-18', group: 'A', home: 'Czechia',      away: 'South Africa' },
  { id: 26, date: '2026-06-18', group: 'B', home: 'Switzerland',  away: 'Bosnia & Herzegovina' },
  { id: 27, date: '2026-06-18', group: 'B', home: 'Canada',       away: 'Qatar' },
  { id: 28, date: '2026-06-18', group: 'A', home: 'Mexico',       away: 'South Korea' },
  { id: 29, date: '2026-06-19', group: 'D', home: 'USA',          away: 'Australia' },
  { id: 30, date: '2026-06-19', group: 'C', home: 'Scotland',     away: 'Morocco' },
  { id: 31, date: '2026-06-19', group: 'C', home: 'Brazil',       away: 'Haiti' },
  { id: 32, date: '2026-06-19', group: 'D', home: 'Turkey',       away: 'Paraguay' },
  { id: 33, date: '2026-06-20', group: 'F', home: 'Netherlands',  away: 'Sweden' },
  { id: 34, date: '2026-06-20', group: 'E', home: 'Germany',      away: 'Ivory Coast' },
  { id: 35, date: '2026-06-20', group: 'E', home: 'Ecuador',      away: 'Curaçao' },
  { id: 36, date: '2026-06-20', group: 'F', home: 'Tunisia',      away: 'Japan' },
  { id: 37, date: '2026-06-21', group: 'H', home: 'Spain',        away: 'Saudi Arabia' },
  { id: 38, date: '2026-06-21', group: 'G', home: 'Belgium',      away: 'Iran' },
  { id: 39, date: '2026-06-21', group: 'H', home: 'Uruguay',      away: 'Cape Verde' },
  { id: 40, date: '2026-06-21', group: 'G', home: 'New Zealand',  away: 'Egypt' },
  { id: 41, date: '2026-06-22', group: 'J', home: 'Argentina',    away: 'Austria' },
  { id: 42, date: '2026-06-22', group: 'I', home: 'France',       away: 'Iraq' },
  { id: 43, date: '2026-06-22', group: 'I', home: 'Norway',       away: 'Senegal' },
  { id: 44, date: '2026-06-22', group: 'J', home: 'Jordan',       away: 'Algeria' },
  { id: 45, date: '2026-06-23', group: 'K', home: 'Portugal',     away: 'Uzbekistan' },
  { id: 46, date: '2026-06-23', group: 'L', home: 'England',      away: 'Ghana' },
  { id: 47, date: '2026-06-23', group: 'L', home: 'Panama',       away: 'Croatia' },
  { id: 48, date: '2026-06-23', group: 'K', home: 'Colombia',     away: 'DR Congo' },
  // ── Matchday 3 ────────────────────────────────────────────────────────────
  { id: 49, date: '2026-06-24', group: 'B', home: 'Switzerland',  away: 'Canada' },
  { id: 50, date: '2026-06-24', group: 'B', home: 'Bosnia & Herzegovina', away: 'Qatar' },
  { id: 51, date: '2026-06-24', group: 'C', home: 'Scotland',     away: 'Brazil' },
  { id: 52, date: '2026-06-24', group: 'C', home: 'Morocco',      away: 'Haiti' },
  { id: 53, date: '2026-06-24', group: 'A', home: 'Czechia',      away: 'Mexico' },
  { id: 54, date: '2026-06-24', group: 'A', home: 'South Africa', away: 'South Korea' },
  { id: 55, date: '2026-06-25', group: 'E', home: 'Ecuador',      away: 'Germany' },
  { id: 56, date: '2026-06-25', group: 'E', home: 'Curaçao',      away: 'Ivory Coast' },
  { id: 57, date: '2026-06-25', group: 'F', home: 'Japan',        away: 'Sweden' },
  { id: 58, date: '2026-06-25', group: 'F', home: 'Tunisia',      away: 'Netherlands' },
  { id: 59, date: '2026-06-25', group: 'D', home: 'Turkey',       away: 'USA' },
  { id: 60, date: '2026-06-25', group: 'D', home: 'Paraguay',     away: 'Australia' },
  { id: 61, date: '2026-06-26', group: 'I', home: 'Norway',       away: 'France' },
  { id: 62, date: '2026-06-26', group: 'I', home: 'Senegal',      away: 'Iraq' },
  { id: 63, date: '2026-06-26', group: 'H', home: 'Cape Verde',   away: 'Saudi Arabia' },
  { id: 64, date: '2026-06-26', group: 'H', home: 'Uruguay',      away: 'Spain' },
  { id: 65, date: '2026-06-26', group: 'G', home: 'Egypt',        away: 'Iran' },
  { id: 66, date: '2026-06-26', group: 'G', home: 'New Zealand',  away: 'Belgium' },
  { id: 67, date: '2026-06-27', group: 'L', home: 'Panama',       away: 'England' },
  { id: 68, date: '2026-06-27', group: 'L', home: 'Croatia',      away: 'Ghana' },
  { id: 69, date: '2026-06-27', group: 'K', home: 'Colombia',     away: 'Portugal' },
  { id: 70, date: '2026-06-27', group: 'K', home: 'DR Congo',     away: 'Uzbekistan' },
  { id: 71, date: '2026-06-27', group: 'J', home: 'Algeria',      away: 'Austria' },
  { id: 72, date: '2026-06-27', group: 'J', home: 'Jordan',       away: 'Argentina' },
];

// Pre-computed: fixtures grouped by date, dates sorted chronologically
export const FIXTURES_BY_DATE: Record<string, GroupFixture[]> = (() => {
  const map: Record<string, GroupFixture[]> = {};
  for (const f of GROUP_FIXTURES) {
    (map[f.date] ??= []).push(f);
  }
  return map;
})();

export const ALL_DATES: string[] = Object.keys(FIXTURES_BY_DATE).sort();
