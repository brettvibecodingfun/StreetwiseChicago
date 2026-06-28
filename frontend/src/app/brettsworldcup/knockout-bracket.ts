export type KnockoutRound = 'LAST_32' | 'LAST_16' | 'QUARTER_FINALS' | 'SEMI_FINALS' | 'FINAL';

export interface KnockoutSlot {
  team: string;
  tier: number;
}

export interface KnockoutMatch {
  id: string;
  footballDataId?: number;
  round: KnockoutRound;
  slot1: KnockoutSlot;
  slot2: KnockoutSlot;
  feedsInto: { matchId: string; slot: 1 | 2 } | null;
  slot1From: string | null;
  slot2From: string | null;
}

export const ROUNDS_ORDER: KnockoutRound[] = ['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'];

export const ROUND_LABELS: Record<KnockoutRound, string> = {
  LAST_32: 'R32',
  LAST_16: 'R16',
  QUARTER_FINALS: 'QF',
  SEMI_FINALS: 'SF',
  FINAL: 'Final',
};

export const ROUND_POINTS: Record<KnockoutRound, number> = {
  LAST_32: 5,
  LAST_16: 10,
  QUARTER_FINALS: 20,
  SEMI_FINALS: 40,
  FINAL: 80,
};

export const CHAMPION_BONUS: Record<number, number> = {
  1: 25,
  2: 50,
  3: 100,
  4: 200,
};

export const TEAM_TIERS: Record<string, number> = {
  France: 1,
  Spain: 1,
  Argentina: 1,
  England: 1,
  Portugal: 1,
  Brazil: 1,
  Netherlands: 2,
  Morocco: 2,
  Belgium: 2,
  Germany: 2,
  Croatia: 2,
  Colombia: 2,
  Senegal: 2,
  Mexico: 2,
  USA: 2,
  'United States': 2,
  Uruguay: 2,
  Japan: 3,
  Switzerland: 3,
  Iran: 3,
  Türkiye: 3,
  Turkey: 3,
  Ecuador: 3,
  Austria: 3,
  'South Korea': 3,
  'Korea Republic': 3,
  Australia: 3,
  Algeria: 3,
  Egypt: 3,
  Canada: 3,
  Norway: 3,
  Panama: 4,
  'Ivory Coast': 4,
  "Côte d'Ivoire": 4,
  Sweden: 4,
  Paraguay: 4,
  Czechia: 4,
  'Czech Republic': 4,
  Scotland: 4,
  Tunisia: 4,
  'DR Congo': 4,
  Congo: 4,
  Uzbekistan: 4,
  Qatar: 4,
  Iraq: 4,
  'South Africa': 4,
  'Saudi Arabia': 4,
  Jordan: 4,
  'Bosnia & Herz.': 4,
  Bosnia: 4,
  'Bosnia & Herzegovina': 4,
  'Cape Verde': 4,
  Ghana: 4,
  Curaçao: 4,
  Curacao: 4,
  Haiti: 4,
  'New Zealand': 4,
};

const TBD_SLOT: KnockoutSlot = { team: 'TBD', tier: 4 };

function tbd(): KnockoutSlot {
  return { ...TBD_SLOT };
}

function slot(team: string): KnockoutSlot {
  return {
    team,
    tier: getTeamTier(team),
  };
}

function match(
  id: string,
  round: KnockoutRound,
  feedsInto: { matchId: string; slot: 1 | 2 } | null,
  slot1From: string | null = null,
  slot2From: string | null = null,
  slot1: KnockoutSlot = tbd(),
  slot2: KnockoutSlot = tbd(),
  footballDataId?: number
): KnockoutMatch {
  return {
    id,
    footballDataId,
    round,
    slot1,
    slot2,
    feedsInto,
    slot1From,
    slot2From,
  };
}

function r32(
  id: string,
  footballDataId: number,
  feedsInto: { matchId: string; slot: 1 | 2 },
  slot1Team: string,
  slot2Team: string
): KnockoutMatch {
  return match(id, 'LAST_32', feedsInto, null, null, slot(slot1Team), slot(slot2Team), footballDataId);
}

export const KNOCKOUT_MATCHES: KnockoutMatch[] = [
  r32('r32_1', 537415, { matchId: 'r16_1', slot: 1 }, 'Germany', 'Paraguay'),
  r32('r32_2', 537416, { matchId: 'r16_1', slot: 2 }, 'France', 'Sweden'),
  r32('r32_3', 537417, { matchId: 'r16_2', slot: 1 }, 'South Africa', 'Canada'),
  r32('r32_4', 537418, { matchId: 'r16_2', slot: 2 }, 'Netherlands', 'Morocco'),
  r32('r32_5', 537419, { matchId: 'r16_3', slot: 1 }, 'Portugal', 'Croatia'),
  r32('r32_6', 537420, { matchId: 'r16_3', slot: 2 }, 'Spain', 'Austria'),
  r32('r32_7', 537421, { matchId: 'r16_4', slot: 1 }, 'USA', 'Bosnia & Herzegovina'),
  r32('r32_8', 537422, { matchId: 'r16_4', slot: 2 }, 'Belgium', 'Senegal'),
  r32('r32_9', 537423, { matchId: 'r16_5', slot: 1 }, 'Brazil', 'Japan'),
  r32('r32_10', 537424, { matchId: 'r16_5', slot: 2 }, 'Ivory Coast', 'Norway'),
  r32('r32_11', 537425, { matchId: 'r16_6', slot: 1 }, 'Mexico', 'Ecuador'),
  r32('r32_12', 537426, { matchId: 'r16_6', slot: 2 }, 'England', 'DR Congo'),
  r32('r32_13', 537427, { matchId: 'r16_7', slot: 1 }, 'Argentina', 'Cape Verde'),
  r32('r32_14', 537428, { matchId: 'r16_7', slot: 2 }, 'Australia', 'Egypt'),
  r32('r32_15', 537429, { matchId: 'r16_8', slot: 1 }, 'Switzerland', 'Algeria'),
  r32('r32_16', 537430, { matchId: 'r16_8', slot: 2 }, 'Colombia', 'Ghana'),
  match('r16_1', 'LAST_16', { matchId: 'qf_1', slot: 1 }, 'r32_1', 'r32_2'),
  match('r16_2', 'LAST_16', { matchId: 'qf_1', slot: 2 }, 'r32_3', 'r32_4'),
  match('r16_3', 'LAST_16', { matchId: 'qf_2', slot: 1 }, 'r32_5', 'r32_6'),
  match('r16_4', 'LAST_16', { matchId: 'qf_2', slot: 2 }, 'r32_7', 'r32_8'),
  match('r16_5', 'LAST_16', { matchId: 'qf_3', slot: 1 }, 'r32_9', 'r32_10'),
  match('r16_6', 'LAST_16', { matchId: 'qf_3', slot: 2 }, 'r32_11', 'r32_12'),
  match('r16_7', 'LAST_16', { matchId: 'qf_4', slot: 1 }, 'r32_13', 'r32_14'),
  match('r16_8', 'LAST_16', { matchId: 'qf_4', slot: 2 }, 'r32_15', 'r32_16'),
  match('qf_1', 'QUARTER_FINALS', { matchId: 'sf_1', slot: 1 }, 'r16_1', 'r16_2'),
  match('qf_2', 'QUARTER_FINALS', { matchId: 'sf_1', slot: 2 }, 'r16_3', 'r16_4'),
  match('qf_3', 'QUARTER_FINALS', { matchId: 'sf_2', slot: 1 }, 'r16_5', 'r16_6'),
  match('qf_4', 'QUARTER_FINALS', { matchId: 'sf_2', slot: 2 }, 'r16_7', 'r16_8'),
  match('sf_1', 'SEMI_FINALS', { matchId: 'f_1', slot: 1 }, 'qf_1', 'qf_2'),
  match('sf_2', 'SEMI_FINALS', { matchId: 'f_1', slot: 2 }, 'qf_3', 'qf_4'),
  match('f_1', 'FINAL', null, 'sf_1', 'sf_2'),
];

export const MATCH_BY_ID: Record<string, KnockoutMatch> = Object.fromEntries(
  KNOCKOUT_MATCHES.map(knockoutMatch => [knockoutMatch.id, knockoutMatch])
);

export function getTeamTier(team: string): number {
  const normalizedTeam = team.toLowerCase().trim();
  const tierEntry = Object.entries(TEAM_TIERS).find(([name]) => name.toLowerCase().trim() === normalizedTeam);
  return tierEntry?.[1] ?? 4;
}
