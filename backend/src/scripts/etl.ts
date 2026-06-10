import 'dotenv/config';
import pool from '../db';
import { runMigrations } from '../migrations';
import { GROUP_WIN, GROUP_DRAW, GROUP_LOSS, KNOCKOUT_POINTS, CHAMPION_BONUS, getTier } from '../config/scoringRules';

// Map football-data.org API team names → pool pick names where they differ
const NAME_MAP: Record<string, string> = {
  'United States': 'USA',
  'Korea Republic': 'South Korea',
  'Türkiye': 'Turkey',
  'Bosnia and Herzegovina': 'Bosnia & Herz.',
  "Côte d'Ivoire": 'Ivory Coast',
  'DR Congo': 'DR Congo',
};

function normalize(name: string): string {
  return NAME_MAP[name] ?? name;
}

interface FDMatch {
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

interface DbParticipant {
  id: number;
  champion_pick: string | null;
  tier1_team: string | null;
  tier2_team_a: string | null;
  tier2_team_b: string | null;
  tier3_team_a: string | null;
  tier3_team_b: string | null;
  tier4_team_a: string | null;
  tier4_team_b: string | null;
  tier4_team_c: string | null;
  points_breakdown: Record<string, number>;
}

export interface EtlSummary {
  matchesChecked: number;
  matchesScored: number;
  participantsUpdated: number;
}

const TIER_PICK_FIELDS: (keyof DbParticipant)[] = [
  'tier1_team', 'tier2_team_a', 'tier2_team_b',
  'tier3_team_a', 'tier3_team_b',
  'tier4_team_a', 'tier4_team_b', 'tier4_team_c',
];

export async function runETL(): Promise<EtlSummary> {
  await runMigrations();

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) throw new Error('FOOTBALL_DATA_API_KEY not set');
  if (!pool) throw new Error('DATABASE_URL not set');

  const r = await fetch(
    'https://api.football-data.org/v4/competitions/WC/matches?status=FINISHED&season=2026',
    { headers: { 'X-Auth-Token': apiKey } }
  );
  if (!r.ok) throw new Error(`football-data.org responded ${r.status}: ${await r.text()}`);

  const data = await r.json() as { matches: FDMatch[] };
  const finishedMatches = (data.matches ?? []).filter(
    m => m.status === 'FINISHED' && m.stage !== 'THIRD_PLACE'
  );

  const matchesChecked = finishedMatches.length;

  if (matchesChecked === 0) {
    await insertEtlLog(0, 0, 0, 'success', null);
    console.log('[etl] No finished matches to process');
    return { matchesChecked: 0, matchesScored: 0, participantsUpdated: 0 };
  }

  const { rows: participants } = await pool.query<DbParticipant>(
    `SELECT id, champion_pick, tier1_team, tier2_team_a, tier2_team_b,
            tier3_team_a, tier3_team_b, tier4_team_a, tier4_team_b, tier4_team_c,
            points_breakdown
     FROM participants`
  );

  // Map: participantId → { pointsDelta, newEntries }
  const deltas = new Map<number, { pointsDelta: number; newEntries: Record<string, number> }>();

  let matchesScored = 0;

  for (const match of finishedMatches) {
    const homeNorm = normalize(match.homeTeam.name);
    const awayNorm = normalize(match.awayTeam.name);
    const isGroup = match.stage === 'GROUP_STAGE';

    let homePoints: number;
    let awayPoints: number;

    if (isGroup) {
      const { home: h, away: a } = match.score.fullTime;
      if (h === null || a === null) continue;
      if (h > a)      { homePoints = GROUP_WIN;  awayPoints = GROUP_LOSS; }
      else if (h < a) { homePoints = GROUP_LOSS; awayPoints = GROUP_WIN; }
      else            { homePoints = GROUP_DRAW; awayPoints = GROUP_DRAW; }
    } else {
      const stagePoints = KNOCKOUT_POINTS[match.stage] ?? 0;
      if (match.score.winner === 'HOME_TEAM')      { homePoints = stagePoints; awayPoints = 0; }
      else if (match.score.winner === 'AWAY_TEAM') { homePoints = 0; awayPoints = stagePoints; }
      else continue; // winner not determined yet
    }

    matchesScored++;

    for (const p of participants) {
      let delta = deltas.get(p.id) ?? { pointsDelta: 0, newEntries: {} };
      const breakdown = p.points_breakdown ?? {};

      for (const field of TIER_PICK_FIELDS) {
        const teamPick = p[field] as string | null;
        if (!teamPick?.trim()) continue;

        const pick = teamPick.trim();
        const isHome = pick === homeNorm;
        const isAway = pick === awayNorm;
        if (!isHome && !isAway) continue;

        const key = `${pick}_match_${match.id}`;
        // Idempotency: skip if already credited (in DB or earlier in this run)
        if (key in breakdown || key in delta.newEntries) continue;

        const pts = isHome ? homePoints : awayPoints;
        delta.pointsDelta += pts;
        delta.newEntries[key] = pts;
      }

      deltas.set(p.id, delta);
    }
  }

  // Champion bonus — only when FINAL is done
  const finalMatch = finishedMatches.find(m => m.stage === 'FINAL');
  if (finalMatch) {
    let winnerNorm: string | null = null;
    if (finalMatch.score.winner === 'HOME_TEAM') winnerNorm = normalize(finalMatch.homeTeam.name);
    else if (finalMatch.score.winner === 'AWAY_TEAM') winnerNorm = normalize(finalMatch.awayTeam.name);

    if (winnerNorm) {
      for (const p of participants) {
        if (!p.champion_pick?.trim()) continue;
        if (p.champion_pick.trim() !== winnerNorm) continue;

        const breakdown = p.points_breakdown ?? {};
        if ('champion_bonus' in breakdown) continue;

        let delta = deltas.get(p.id) ?? { pointsDelta: 0, newEntries: {} };
        if ('champion_bonus' in delta.newEntries) continue;

        const bonus = CHAMPION_BONUS[getTier(winnerNorm)] ?? 0;
        delta.pointsDelta += bonus;
        delta.newEntries['champion_bonus'] = bonus;
        deltas.set(p.id, delta);
      }
    }
  }

  let participantsUpdated = 0;

  for (const [participantId, { pointsDelta, newEntries }] of deltas) {
    if (Object.keys(newEntries).length === 0) continue;

    await pool.query(
      `UPDATE participants
       SET points              = points + $1,
           points_breakdown    = points_breakdown || $2::jsonb,
           updated_at          = NOW(),
           last_etl_updated_at = NOW()
       WHERE id = $3`,
      [pointsDelta, JSON.stringify(newEntries), participantId]
    );
    participantsUpdated++;
  }

  await insertEtlLog(matchesChecked, matchesScored, participantsUpdated, 'success', null);
  console.log(`[etl] Done: checked=${matchesChecked} scored=${matchesScored} updated=${participantsUpdated}`);

  return { matchesChecked, matchesScored, participantsUpdated };
}

async function insertEtlLog(
  matchesChecked: number,
  matchesScored: number,
  participantsUpdated: number,
  status: string,
  errorMessage: string | null
): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO etl_log (matches_checked, matches_scored, participants_updated, status, error_message)
     VALUES ($1, $2, $3, $4, $5)`,
    [matchesChecked, matchesScored, participantsUpdated, status, errorMessage]
  );
  await pool.query(`
    DELETE FROM etl_log WHERE id NOT IN (
      SELECT id FROM etl_log ORDER BY run_at DESC LIMIT 200
    )
  `);
}

// Allow running directly: npx ts-node src/scripts/etl.ts
if (require.main === module) {
  runETL()
    .then(summary => {
      console.log('[etl] Complete:', summary);
      return pool?.end();
    })
    .then(() => process.exit(0))
    .catch(async err => {
      console.error('[etl] Failed:', err);
      if (pool) {
        await insertEtlLog(0, 0, 0, 'error', String(err.message ?? err)).catch(() => {});
        await pool.end().catch(() => {});
      }
      process.exit(1);
    });
}
