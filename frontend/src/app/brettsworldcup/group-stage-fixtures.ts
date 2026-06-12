export type MatchOutcome = 'home' | 'draw' | 'away';

export interface GroupFixture {
  id: number;
  date: string;      // 'YYYY-MM-DD' US local date (for calendar grouping)
  kickoffUtc: string; // ISO UTC timestamp — used for lock calculation
  group: string;
  home: string;
  away: string;
}

// Lock threshold: 2 hours after kickoff
const LOCK_OFFSET_MS = 2 * 60 * 60 * 1000;

export function isFixtureLocked(fixture: GroupFixture): boolean {
  return Date.now() > new Date(fixture.kickoffUtc).getTime() + LOCK_OFFSET_MS;
}

export const GROUP_FIXTURES: GroupFixture[] = [
  // ── Matchday 1 ────────────────────────────────────────────────────────────
  { id:  1, date: '2026-06-11', kickoffUtc: '2026-06-11T19:00:00Z', group: 'A', home: 'Mexico',              away: 'South Africa' },
  { id:  2, date: '2026-06-11', kickoffUtc: '2026-06-12T02:00:00Z', group: 'A', home: 'South Korea',         away: 'Czechia' },
  { id:  3, date: '2026-06-12', kickoffUtc: '2026-06-12T19:00:00Z', group: 'B', home: 'Canada',              away: 'Bosnia & Herzegovina' },
  { id:  4, date: '2026-06-12', kickoffUtc: '2026-06-13T01:00:00Z', group: 'D', home: 'USA',                 away: 'Paraguay' },
  { id:  5, date: '2026-06-13', kickoffUtc: '2026-06-13T19:00:00Z', group: 'B', home: 'Qatar',               away: 'Switzerland' },
  { id:  6, date: '2026-06-13', kickoffUtc: '2026-06-13T22:00:00Z', group: 'C', home: 'Brazil',              away: 'Morocco' },
  { id:  7, date: '2026-06-13', kickoffUtc: '2026-06-14T01:00:00Z', group: 'C', home: 'Haiti',               away: 'Scotland' },
  { id:  8, date: '2026-06-13', kickoffUtc: '2026-06-14T04:00:00Z', group: 'D', home: 'Australia',           away: 'Turkey' },
  { id:  9, date: '2026-06-14', kickoffUtc: '2026-06-14T17:00:00Z', group: 'E', home: 'Germany',             away: 'Curaçao' },
  { id: 10, date: '2026-06-14', kickoffUtc: '2026-06-14T20:00:00Z', group: 'F', home: 'Netherlands',         away: 'Japan' },
  { id: 11, date: '2026-06-14', kickoffUtc: '2026-06-14T23:00:00Z', group: 'E', home: 'Ivory Coast',         away: 'Ecuador' },
  { id: 12, date: '2026-06-14', kickoffUtc: '2026-06-15T02:00:00Z', group: 'F', home: 'Sweden',              away: 'Tunisia' },
  { id: 13, date: '2026-06-15', kickoffUtc: '2026-06-15T16:00:00Z', group: 'H', home: 'Spain',               away: 'Cape Verde' },
  { id: 14, date: '2026-06-15', kickoffUtc: '2026-06-15T19:00:00Z', group: 'G', home: 'Belgium',             away: 'Egypt' },
  { id: 15, date: '2026-06-15', kickoffUtc: '2026-06-15T22:00:00Z', group: 'H', home: 'Saudi Arabia',        away: 'Uruguay' },
  { id: 16, date: '2026-06-15', kickoffUtc: '2026-06-16T01:00:00Z', group: 'G', home: 'Iran',                away: 'New Zealand' },
  { id: 17, date: '2026-06-16', kickoffUtc: '2026-06-16T19:00:00Z', group: 'I', home: 'France',              away: 'Senegal' },
  { id: 18, date: '2026-06-16', kickoffUtc: '2026-06-16T22:00:00Z', group: 'I', home: 'Iraq',                away: 'Norway' },
  { id: 19, date: '2026-06-16', kickoffUtc: '2026-06-17T01:00:00Z', group: 'J', home: 'Argentina',           away: 'Algeria' },
  { id: 20, date: '2026-06-16', kickoffUtc: '2026-06-17T04:00:00Z', group: 'J', home: 'Austria',             away: 'Jordan' },
  { id: 21, date: '2026-06-17', kickoffUtc: '2026-06-17T17:00:00Z', group: 'K', home: 'Portugal',            away: 'DR Congo' },
  { id: 22, date: '2026-06-17', kickoffUtc: '2026-06-17T20:00:00Z', group: 'L', home: 'England',             away: 'Croatia' },
  { id: 23, date: '2026-06-17', kickoffUtc: '2026-06-17T23:00:00Z', group: 'L', home: 'Ghana',               away: 'Panama' },
  { id: 24, date: '2026-06-17', kickoffUtc: '2026-06-18T02:00:00Z', group: 'K', home: 'Uzbekistan',          away: 'Colombia' },
  // ── Matchday 2 ────────────────────────────────────────────────────────────
  { id: 25, date: '2026-06-18', kickoffUtc: '2026-06-18T16:00:00Z', group: 'A', home: 'Czechia',             away: 'South Africa' },
  { id: 26, date: '2026-06-18', kickoffUtc: '2026-06-18T19:00:00Z', group: 'B', home: 'Switzerland',         away: 'Bosnia & Herzegovina' },
  { id: 27, date: '2026-06-18', kickoffUtc: '2026-06-18T22:00:00Z', group: 'B', home: 'Canada',              away: 'Qatar' },
  { id: 28, date: '2026-06-18', kickoffUtc: '2026-06-19T01:00:00Z', group: 'A', home: 'Mexico',              away: 'South Korea' },
  { id: 29, date: '2026-06-19', kickoffUtc: '2026-06-19T19:00:00Z', group: 'D', home: 'USA',                 away: 'Australia' },
  { id: 30, date: '2026-06-19', kickoffUtc: '2026-06-19T22:00:00Z', group: 'C', home: 'Scotland',            away: 'Morocco' },
  { id: 31, date: '2026-06-19', kickoffUtc: '2026-06-20T00:30:00Z', group: 'C', home: 'Brazil',              away: 'Haiti' },
  { id: 32, date: '2026-06-19', kickoffUtc: '2026-06-20T03:00:00Z', group: 'D', home: 'Turkey',              away: 'Paraguay' },
  { id: 33, date: '2026-06-20', kickoffUtc: '2026-06-20T17:00:00Z', group: 'F', home: 'Netherlands',         away: 'Sweden' },
  { id: 34, date: '2026-06-20', kickoffUtc: '2026-06-20T20:00:00Z', group: 'E', home: 'Germany',             away: 'Ivory Coast' },
  { id: 35, date: '2026-06-20', kickoffUtc: '2026-06-21T00:00:00Z', group: 'E', home: 'Ecuador',             away: 'Curaçao' },
  { id: 36, date: '2026-06-20', kickoffUtc: '2026-06-21T04:00:00Z', group: 'F', home: 'Tunisia',             away: 'Japan' },
  { id: 37, date: '2026-06-21', kickoffUtc: '2026-06-21T16:00:00Z', group: 'H', home: 'Spain',               away: 'Saudi Arabia' },
  { id: 38, date: '2026-06-21', kickoffUtc: '2026-06-21T19:00:00Z', group: 'G', home: 'Belgium',             away: 'Iran' },
  { id: 39, date: '2026-06-21', kickoffUtc: '2026-06-21T22:00:00Z', group: 'H', home: 'Uruguay',             away: 'Cape Verde' },
  { id: 40, date: '2026-06-21', kickoffUtc: '2026-06-22T01:00:00Z', group: 'G', home: 'New Zealand',         away: 'Egypt' },
  { id: 41, date: '2026-06-22', kickoffUtc: '2026-06-22T17:00:00Z', group: 'J', home: 'Argentina',           away: 'Austria' },
  { id: 42, date: '2026-06-22', kickoffUtc: '2026-06-22T21:00:00Z', group: 'I', home: 'France',              away: 'Iraq' },
  { id: 43, date: '2026-06-22', kickoffUtc: '2026-06-23T00:00:00Z', group: 'I', home: 'Norway',              away: 'Senegal' },
  { id: 44, date: '2026-06-22', kickoffUtc: '2026-06-23T03:00:00Z', group: 'J', home: 'Jordan',              away: 'Algeria' },
  { id: 45, date: '2026-06-23', kickoffUtc: '2026-06-23T17:00:00Z', group: 'K', home: 'Portugal',            away: 'Uzbekistan' },
  { id: 46, date: '2026-06-23', kickoffUtc: '2026-06-23T20:00:00Z', group: 'L', home: 'England',             away: 'Ghana' },
  { id: 47, date: '2026-06-23', kickoffUtc: '2026-06-23T23:00:00Z', group: 'L', home: 'Panama',              away: 'Croatia' },
  { id: 48, date: '2026-06-23', kickoffUtc: '2026-06-24T02:00:00Z', group: 'K', home: 'Colombia',            away: 'DR Congo' },
  // ── Matchday 3 ────────────────────────────────────────────────────────────
  { id: 49, date: '2026-06-24', kickoffUtc: '2026-06-24T19:00:00Z', group: 'B', home: 'Switzerland',         away: 'Canada' },
  { id: 50, date: '2026-06-24', kickoffUtc: '2026-06-24T19:00:00Z', group: 'B', home: 'Bosnia & Herzegovina', away: 'Qatar' },
  { id: 51, date: '2026-06-24', kickoffUtc: '2026-06-24T22:00:00Z', group: 'C', home: 'Scotland',            away: 'Brazil' },
  { id: 52, date: '2026-06-24', kickoffUtc: '2026-06-24T22:00:00Z', group: 'C', home: 'Morocco',             away: 'Haiti' },
  { id: 53, date: '2026-06-24', kickoffUtc: '2026-06-25T01:00:00Z', group: 'A', home: 'Czechia',             away: 'Mexico' },
  { id: 54, date: '2026-06-24', kickoffUtc: '2026-06-25T01:00:00Z', group: 'A', home: 'South Africa',        away: 'South Korea' },
  { id: 55, date: '2026-06-25', kickoffUtc: '2026-06-25T20:00:00Z', group: 'E', home: 'Ecuador',             away: 'Germany' },
  { id: 56, date: '2026-06-25', kickoffUtc: '2026-06-25T20:00:00Z', group: 'E', home: 'Curaçao',             away: 'Ivory Coast' },
  { id: 57, date: '2026-06-25', kickoffUtc: '2026-06-25T23:00:00Z', group: 'F', home: 'Japan',               away: 'Sweden' },
  { id: 58, date: '2026-06-25', kickoffUtc: '2026-06-25T23:00:00Z', group: 'F', home: 'Tunisia',             away: 'Netherlands' },
  { id: 59, date: '2026-06-25', kickoffUtc: '2026-06-26T02:00:00Z', group: 'D', home: 'Turkey',              away: 'USA' },
  { id: 60, date: '2026-06-25', kickoffUtc: '2026-06-26T02:00:00Z', group: 'D', home: 'Paraguay',            away: 'Australia' },
  { id: 61, date: '2026-06-26', kickoffUtc: '2026-06-26T19:00:00Z', group: 'I', home: 'Norway',              away: 'France' },
  { id: 62, date: '2026-06-26', kickoffUtc: '2026-06-26T19:00:00Z', group: 'I', home: 'Senegal',             away: 'Iraq' },
  { id: 63, date: '2026-06-26', kickoffUtc: '2026-06-27T00:00:00Z', group: 'H', home: 'Cape Verde',          away: 'Saudi Arabia' },
  { id: 64, date: '2026-06-26', kickoffUtc: '2026-06-27T00:00:00Z', group: 'H', home: 'Uruguay',             away: 'Spain' },
  { id: 65, date: '2026-06-26', kickoffUtc: '2026-06-27T03:00:00Z', group: 'G', home: 'Egypt',               away: 'Iran' },
  { id: 66, date: '2026-06-26', kickoffUtc: '2026-06-27T03:00:00Z', group: 'G', home: 'New Zealand',         away: 'Belgium' },
  { id: 67, date: '2026-06-27', kickoffUtc: '2026-06-27T21:00:00Z', group: 'L', home: 'Panama',              away: 'England' },
  { id: 68, date: '2026-06-27', kickoffUtc: '2026-06-27T21:00:00Z', group: 'L', home: 'Croatia',             away: 'Ghana' },
  { id: 69, date: '2026-06-27', kickoffUtc: '2026-06-27T23:30:00Z', group: 'K', home: 'Colombia',            away: 'Portugal' },
  { id: 70, date: '2026-06-27', kickoffUtc: '2026-06-27T23:30:00Z', group: 'K', home: 'DR Congo',            away: 'Uzbekistan' },
  { id: 71, date: '2026-06-27', kickoffUtc: '2026-06-28T02:00:00Z', group: 'J', home: 'Algeria',             away: 'Austria' },
  { id: 72, date: '2026-06-27', kickoffUtc: '2026-06-28T02:00:00Z', group: 'J', home: 'Jordan',              away: 'Argentina' },
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
