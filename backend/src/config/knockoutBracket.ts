// Ported from frontend/src/app/brettsworldcup/knockout-bracket.ts — keep in sync manually
// whenever the real WC26 bracket/schedule is finalized or the frontend copy changes.

export type KnockoutRound = 'LAST_32' | 'LAST_16' | 'QUARTER_FINALS' | 'SEMI_FINALS' | 'FINAL';

export interface KnockoutSlot {
  team: string;
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

const TBD_SLOT: KnockoutSlot = { team: 'TBD' };

function tbd(): KnockoutSlot {
  return { ...TBD_SLOT };
}

function slot(team: string): KnockoutSlot {
  return { team };
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

export const ALL_R32_TEAMS: Set<string> = new Set(
  KNOCKOUT_MATCHES.filter(m => m.round === 'LAST_32').flatMap(m => [m.slot1.team, m.slot2.team])
);
