import { FDMatch, normalizeTeamName } from '../config/footballData';
import { KNOCKOUT_MATCHES, KnockoutMatch, MATCH_BY_ID, ROUNDS_ORDER, KnockoutRound } from '../config/knockoutBracket';
import { KNOCKOUT_POINTS, CHAMPION_BONUS, getTier } from '../config/scoringRules';

export type TeamStatus = 'ELIMINATED' | 'ALIVE' | 'CHAMPION';

export interface TeamBracketState {
  status: TeamStatus;
  pointsRemaining: number;
}

export interface BracketResolution {
  officialPicks: Record<string, string>;
  teamStates: Record<string, TeamBracketState>;
}

export interface ParticipantPickRow {
  champion_pick: string | null;
  tier1_team: string | null;
  tier2_team_a: string | null;
  tier2_team_b: string | null;
  tier3_team_a: string | null;
  tier3_team_b: string | null;
  tier4_team_a: string | null;
  tier4_team_b: string | null;
  tier4_team_c: string | null;
}

export interface ParticipantRemaining {
  teamsRemaining: number;
  pointsRemaining: number;
}

const TIER_PICK_FIELDS: (keyof ParticipantPickRow)[] = [
  'tier1_team', 'tier2_team_a', 'tier2_team_b',
  'tier3_team_a', 'tier3_team_b',
  'tier4_team_a', 'tier4_team_b', 'tier4_team_c',
];

const R32_MATCHES = KNOCKOUT_MATCHES.filter(m => m.round === 'LAST_32');
const FINAL_MATCH_ID = 'f_1';

function resolveSlotTeam(match: KnockoutMatch, slotNum: 1 | 2, picks: Record<string, string>): string {
  const upstreamMatchId = slotNum === 1 ? match.slot1From : match.slot2From;
  if (upstreamMatchId && picks[upstreamMatchId]) {
    return picks[upstreamMatchId];
  }
  return slotNum === 1 ? match.slot1.team : match.slot2.team;
}

function findBracketMatch(liveMatch: FDMatch, home: string, away: string, officialPicks: Record<string, string>): KnockoutMatch | null {
  const byId = KNOCKOUT_MATCHES.find(m => m.footballDataId === liveMatch.id);
  if (byId) return byId;

  return KNOCKOUT_MATCHES.find(m => {
    if (m.round !== liveMatch.stage) return false;
    const slot1 = resolveSlotTeam(m, 1, officialPicks);
    const slot2 = resolveSlotTeam(m, 2, officialPicks);
    return (slot1 === home && slot2 === away) || (slot1 === away && slot2 === home);
  }) ?? null;
}

function remainingPointsFromRound(round: KnockoutRound): number {
  const startIdx = ROUNDS_ORDER.indexOf(round);
  return ROUNDS_ORDER.slice(startIdx).reduce((sum, r) => sum + KNOCKOUT_POINTS[r], 0);
}

export function resolveBracket(liveMatches: FDMatch[]): BracketResolution {
  const finishedKnockoutMatches = liveMatches
    .filter(m => m.status === 'FINISHED' && ROUNDS_ORDER.includes(m.stage as KnockoutRound))
    .sort((a, b) => ROUNDS_ORDER.indexOf(a.stage as KnockoutRound) - ROUNDS_ORDER.indexOf(b.stage as KnockoutRound));

  const officialPicks: Record<string, string> = {};

  for (const liveMatch of finishedKnockoutMatches) {
    const home = normalizeTeamName(liveMatch.homeTeam.name);
    const away = normalizeTeamName(liveMatch.awayTeam.name);

    const bracketMatch = findBracketMatch(liveMatch, home, away, officialPicks);
    if (!bracketMatch) {
      console.warn(`[remainingPoints] Could not map finished match ${liveMatch.id} (${home} v ${away}, stage ${liveMatch.stage}) to a bracket match`);
      continue;
    }

    let winner: string | null = null;
    if (liveMatch.score.winner === 'HOME_TEAM') winner = home;
    else if (liveMatch.score.winner === 'AWAY_TEAM') winner = away;

    if (!winner) {
      console.warn(`[remainingPoints] Finished knockout match ${liveMatch.id} has no winner (${liveMatch.score.winner})`);
      continue;
    }

    officialPicks[bracketMatch.id] = winner;
  }

  const teamStates: Record<string, TeamBracketState> = {};

  for (const r32Match of R32_MATCHES) {
    for (const team of [r32Match.slot1.team, r32Match.slot2.team]) {
      let current: KnockoutMatch = r32Match;
      let status: TeamStatus = 'ALIVE';
      let currentRound: KnockoutRound = current.round;

      while (true) {
        const winner = officialPicks[current.id];
        if (winner === undefined) {
          status = 'ALIVE';
          currentRound = current.round;
          break;
        }
        if (winner !== team) {
          status = 'ELIMINATED';
          break;
        }
        if (!current.feedsInto) {
          status = 'CHAMPION';
          break;
        }
        current = MATCH_BY_ID[current.feedsInto.matchId];
      }

      teamStates[team] = {
        status,
        pointsRemaining: status === 'ALIVE' ? remainingPointsFromRound(currentRound) : 0,
      };
    }
  }

  return { officialPicks, teamStates };
}

export function getTeamState(teamPick: string | null | undefined, resolution: BracketResolution): TeamBracketState {
  const trimmed = teamPick?.trim();
  if (!trimmed || !(trimmed in resolution.teamStates)) {
    return { status: 'ELIMINATED', pointsRemaining: 0 };
  }
  return resolution.teamStates[trimmed];
}

interface BracketSolveResult {
  points: number;
  hypo: Record<string, string>;
}

/**
 * Post-order walk of the bracket tree: resolve feeder subtrees first, then pick
 * the winner at this match that maximizes total future knockout points for the
 * participant's alive tier picks (plus champion bonus at the final).
 */
function maxRemainingFromMatch(
  matchId: string,
  hypo: Record<string, string>,
  officialPicks: Record<string, string>,
  alivePicks: Set<string>,
  championPick: string | null,
  resolution: BracketResolution,
  visited: Set<string>
): BracketSolveResult {
  const match = MATCH_BY_ID[matchId];
  if (!match || visited.has(matchId)) {
    return { points: 0, hypo };
  }

  visited.add(matchId);
  let h = { ...hypo };
  let points = 0;

  for (const feederId of [match.slot1From, match.slot2From].filter(Boolean) as string[]) {
    const sub = maxRemainingFromMatch(feederId, h, officialPicks, alivePicks, championPick, resolution, visited);
    points += sub.points;
    h = sub.hypo;
  }

  if (officialPicks[match.id]) {
    h[match.id] = officialPicks[match.id];
    return { points, hypo: h };
  }

  const combined = { ...h, ...officialPicks };
  const slot1 = resolveSlotTeam(match, 1, combined);
  const slot2 = resolveSlotTeam(match, 2, combined);

  const scoreWinner = (winner: string): BracketSolveResult => {
    if (!winner || winner === 'TBD') {
      return { points, hypo: h };
    }

    let matchPts = alivePicks.has(winner) ? KNOCKOUT_POINTS[match.round] : 0;

    if (match.round === 'FINAL' && championPick && winner === championPick) {
      const champState = getTeamState(championPick, resolution);
      if (champState.status !== 'ELIMINATED') {
        matchPts += CHAMPION_BONUS[getTier(championPick)] ?? 0;
      }
    }

    const nh = { ...h, [match.id]: winner };
    return { points: points + matchPts, hypo: nh };
  };

  const outcome1 = scoreWinner(slot1);
  const outcome2 = scoreWinner(slot2);

  return outcome1.points >= outcome2.points ? outcome1 : outcome2;
}

function maxBracketAwarePoints(
  resolution: BracketResolution,
  alivePicks: Set<string>,
  championPick: string | null
): number {
  const { officialPicks } = resolution;
  const result = maxRemainingFromMatch(
    FINAL_MATCH_ID,
    {},
    officialPicks,
    alivePicks,
    championPick,
    resolution,
    new Set()
  );
  return result.points;
}

export function computeParticipantRemaining(p: ParticipantPickRow, resolution: BracketResolution): ParticipantRemaining {
  const uniquePicks = new Set(
    TIER_PICK_FIELDS.map(field => (p[field] ?? '').trim()).filter(Boolean)
  );

  const alivePicks = new Set<string>();
  for (const pick of uniquePicks) {
    const state = getTeamState(pick, resolution);
    if (state.status !== 'ELIMINATED') {
      alivePicks.add(pick);
    }
  }

  const teamsRemaining = alivePicks.size;
  const championPick = p.champion_pick?.trim() || null;

  let pointsRemaining = maxBracketAwarePoints(resolution, alivePicks, championPick);

  // Champion bonus when champion pick is alive but not covered via a tier pick path
  // (e.g. champion-only entry with no tier teams remaining).
  if (championPick && !alivePicks.has(championPick)) {
    const champState = getTeamState(championPick, resolution);
    if (champState.status === 'ALIVE') {
      pointsRemaining += CHAMPION_BONUS[getTier(championPick)] ?? 0;
    }
  }

  return { teamsRemaining, pointsRemaining };
}
