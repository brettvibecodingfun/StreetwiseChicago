import { resolveBracket, getTeamState, computeParticipantRemaining, ParticipantPickRow } from './remainingPoints';
import { FDMatch } from '../config/footballData';
import { KNOCKOUT_MATCHES, KnockoutMatch, ROUNDS_ORDER, KnockoutRound } from '../config/knockoutBracket';

const FULL_CEILING = 5 + 10 + 20 + 40 + 80; // 155

function buildMatch(
  id: number,
  stage: string,
  homeName: string,
  awayName: string,
  winner: 'HOME_TEAM' | 'AWAY_TEAM'
): FDMatch {
  return {
    id,
    stage,
    status: 'FINISHED',
    homeTeam: { name: homeName },
    awayTeam: { name: awayName },
    score: { winner, fullTime: { home: winner === 'HOME_TEAM' ? 1 : 0, away: winner === 'AWAY_TEAM' ? 1 : 0 } },
  };
}

function emptyPicks(overrides: Partial<ParticipantPickRow> = {}): ParticipantPickRow {
  return {
    champion_pick: null,
    tier1_team: null, tier2_team_a: null, tier2_team_b: null,
    tier3_team_a: null, tier3_team_b: null,
    tier4_team_a: null, tier4_team_b: null, tier4_team_c: null,
    ...overrides,
  };
}

// Walks the real bracket in round order, always advancing `champ`, and otherwise
// advancing whichever team currently occupies slot1 — used to build a fully
// resolved bracket (required to ever reach CHAMPION, since it's a single-elim tree).
function buildFullBracket(champ: string): FDMatch[] {
  const picks: Record<string, string> = {};
  const matches: FDMatch[] = [];
  let syntheticId = 900000;

  function resolveSlot(m: KnockoutMatch, slotNum: 1 | 2): string {
    const from = slotNum === 1 ? m.slot1From : m.slot2From;
    if (from && picks[from]) return picks[from];
    return slotNum === 1 ? m.slot1.team : m.slot2.team;
  }

  for (const round of ROUNDS_ORDER) {
    for (const m of KNOCKOUT_MATCHES.filter(k => k.round === round)) {
      const home = resolveSlot(m, 1);
      const away = resolveSlot(m, 2);
      const winnerTeam = home === champ || away === champ ? champ : home;
      const winnerSide: 'HOME_TEAM' | 'AWAY_TEAM' = winnerTeam === home ? 'HOME_TEAM' : 'AWAY_TEAM';
      matches.push(buildMatch(m.footballDataId ?? syntheticId++, m.round, home, away, winnerSide));
      picks[m.id] = winnerTeam;
    }
  }

  return matches;
}

describe('resolveBracket', () => {
  it('treats every R32 team as ALIVE at the full ceiling when no matches have finished', () => {
    const resolution = resolveBracket([]);
    expect(resolution.teamStates['Germany']).toEqual({ status: 'ALIVE', pointsRemaining: FULL_CEILING });
    expect(resolution.teamStates['Paraguay']).toEqual({ status: 'ALIVE', pointsRemaining: FULL_CEILING });
  });

  it('marks the loser of a finished R32 match as ELIMINATED and the winner ALIVE at the next round ceiling', () => {
    const matches = [buildMatch(537415, 'LAST_32', 'Germany', 'Paraguay', 'HOME_TEAM')];
    const resolution = resolveBracket(matches);

    expect(resolution.teamStates['Germany']).toEqual({ status: 'ALIVE', pointsRemaining: 10 + 20 + 40 + 80 });
    expect(resolution.teamStates['Paraguay']).toEqual({ status: 'ELIMINATED', pointsRemaining: 0 });
  });

  it('resolves an R16 match via slot-pair matching once both feeding R32 matches are known', () => {
    const matches = [
      buildMatch(537415, 'LAST_32', 'Germany', 'Paraguay', 'HOME_TEAM'),
      buildMatch(537416, 'LAST_32', 'France', 'Sweden', 'HOME_TEAM'),
      buildMatch(700001, 'LAST_16', 'Germany', 'France', 'HOME_TEAM'),
    ];
    const resolution = resolveBracket(matches);

    expect(resolution.officialPicks['r16_1']).toBe('Germany');
    expect(resolution.teamStates['Germany']).toEqual({ status: 'ALIVE', pointsRemaining: 20 + 40 + 80 });
    expect(resolution.teamStates['France']).toEqual({ status: 'ELIMINATED', pointsRemaining: 0 });
  });

  it('resolves the eventual champion once the entire bracket is finished', () => {
    const matches = buildFullBracket('Germany');
    const resolution = resolveBracket(matches);

    expect(resolution.teamStates['Germany']).toEqual({ status: 'CHAMPION', pointsRemaining: 0 });
    expect(resolution.officialPicks['f_1']).toBe('Germany');
  });
});

describe('getTeamState', () => {
  it('returns ELIMINATED/0 for a pick that is not one of the 32 R32 teams, regardless of match data', () => {
    const resolution = resolveBracket([]);
    expect(getTeamState('Italy', resolution)).toEqual({ status: 'ELIMINATED', pointsRemaining: 0 });
  });

  it('returns ELIMINATED/0 for null/empty picks', () => {
    const resolution = resolveBracket([]);
    expect(getTeamState(null, resolution)).toEqual({ status: 'ELIMINATED', pointsRemaining: 0 });
    expect(getTeamState('  ', resolution)).toEqual({ status: 'ELIMINATED', pointsRemaining: 0 });
  });
});

describe('computeParticipantRemaining', () => {
  it('returns 0/0 for a participant with no picks at all', () => {
    const resolution = resolveBracket([]);
    expect(computeParticipantRemaining(emptyPicks(), resolution)).toEqual({ teamsRemaining: 0, pointsRemaining: 0 });
  });

  it('counts a duplicate team pick across two tier fields only once', () => {
    const resolution = resolveBracket([]);
    const dup = emptyPicks({ tier1_team: 'Germany', tier2_team_a: 'Germany' });
    const single = emptyPicks({ tier1_team: 'Germany' });

    expect(computeParticipantRemaining(dup, resolution)).toEqual(computeParticipantRemaining(single, resolution));
    expect(computeParticipantRemaining(single, resolution)).toEqual({ teamsRemaining: 1, pointsRemaining: FULL_CEILING });
  });

  it('sums pointsRemaining across multiple alive picks and excludes eliminated ones', () => {
    const matches = [buildMatch(537415, 'LAST_32', 'Germany', 'Paraguay', 'HOME_TEAM')];
    const resolution = resolveBracket(matches);
    const p = emptyPicks({ tier1_team: 'Germany', tier2_team_a: 'Paraguay' });

    expect(computeParticipantRemaining(p, resolution)).toEqual({
      teamsRemaining: 1,
      pointsRemaining: 10 + 20 + 40 + 80,
    });
  });

  it('adds the champion bonus only when the champion pick is still ALIVE', () => {
    const resolution = resolveBracket([]);
    const alive = computeParticipantRemaining(emptyPicks({ champion_pick: 'France' }), resolution);
    // France is tier 1 -> CHAMPION_BONUS[1] = 25; knockout points require tier picks
    expect(alive).toEqual({ teamsRemaining: 0, pointsRemaining: 25 });
  });

  it('includes champion bonus in bracket max when champion is also a tier pick', () => {
    const resolution = resolveBracket([]);
    const p = emptyPicks({ tier1_team: 'France', champion_pick: 'France' });
    expect(computeParticipantRemaining(p, resolution)).toEqual({
      teamsRemaining: 1,
      pointsRemaining: FULL_CEILING + 25,
    });
  });

  it('does not double-count teams that collide on the same bracket path', () => {
    const resolution = resolveBracket([]);
    const p = emptyPicks({ tier1_team: 'Germany', tier2_team_a: 'France' });
    // Germany and France each win their R32 (5+5), then only one advances through R16–Final (150).
    expect(computeParticipantRemaining(p, resolution)).toEqual({
      teamsRemaining: 2,
      pointsRemaining: 5 + 5 + 10 + 20 + 40 + 80,
    });
  });

  it('excludes non-knockout teams from teams remaining', () => {
    const resolution = resolveBracket([]);
    const p = emptyPicks({ tier1_team: 'Italy', tier2_team_a: 'Germany' });
    expect(computeParticipantRemaining(p, resolution)).toEqual({
      teamsRemaining: 1,
      pointsRemaining: FULL_CEILING,
    });
  });

  it('does not add the champion bonus once the champion pick is eliminated', () => {
    const matches = [buildMatch(537415, 'LAST_32', 'Germany', 'Paraguay', 'HOME_TEAM')];
    const resolution = resolveBracket(matches);
    const eliminated = computeParticipantRemaining(emptyPicks({ champion_pick: 'Paraguay' }), resolution);
    expect(eliminated.pointsRemaining).toBe(0);
  });

  it('does not add the champion bonus once the champion has already been decided (avoids double-counting)', () => {
    const matches = buildFullBracket('Germany');
    const resolution = resolveBracket(matches);
    const p = emptyPicks({ champion_pick: 'Germany' });

    expect(computeParticipantRemaining(p, resolution)).toEqual({ teamsRemaining: 0, pointsRemaining: 0 });
  });
});
