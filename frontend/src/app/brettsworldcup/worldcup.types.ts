export interface Participant {
  id: number;
  name: string;
  points: number;
  champion_pick: string;
  tier1_team: string;
  tier2_team_a: string;
  tier2_team_b: string;
  tier3_team_a: string;
  tier3_team_b: string;
  tier4_team: string;
  updated_at: string;
}

export interface WorldCupMatch {
  id: number;
  utcDate: string;
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'CANCELLED' | 'POSTPONED';
  homeTeam: { name: string; crest?: string };
  awayTeam: { name: string; crest?: string };
  score: {
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
  stage: string;
  group?: string;
}

export type PoolTier = 'tier1' | 'tier2' | 'tier3' | 'tier4';
