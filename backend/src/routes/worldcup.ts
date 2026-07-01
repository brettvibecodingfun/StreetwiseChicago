import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db';
import { FDMatch } from '../config/footballData';
import { runETL } from '../scripts/etl';
import { computeParticipantRemaining, resolveBracket } from '../services/remainingPoints';

const router = Router();

// Free API key: https://www.football-data.org/
let matchesCache: { data: unknown; fetchedAt: number } | null = null;
const MATCHES_CACHE_TTL = 60_000;

function requireAdminKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.WORLDCUP_ADMIN_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

function dbRequired(res: Response): boolean {
  if (!pool) {
    res.status(503).json({ error: 'Database not configured' });
    return true;
  }
  return false;
}

async function fetchLiveMatches(): Promise<FDMatch[]> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) return [];

  const now = Date.now();
  if (!matchesCache || now - matchesCache.fetchedAt >= MATCHES_CACHE_TTL) {
    try {
      const r = await fetch(
        'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
        { headers: { 'X-Auth-Token': apiKey } }
      );
      if (r.ok) {
        matchesCache = { data: await r.json(), fetchedAt: now };
      }
    } catch (err) {
      console.error('[worldcup] fetchLiveMatches:', err);
    }
  }

  const cached = matchesCache?.data as { matches?: FDMatch[] } | undefined;
  return cached?.matches ?? [];
}

function enrichParticipant<T extends Record<string, unknown>>(
  row: T,
  resolution: ReturnType<typeof resolveBracket>
): T & { teams_remaining: number; points_remaining: number } {
  const remaining = computeParticipantRemaining(
    {
      champion_pick: (row['champion_pick'] as string | null) ?? null,
      tier1_team: (row['tier1_team'] as string | null) ?? null,
      tier2_team_a: (row['tier2_team_a'] as string | null) ?? null,
      tier2_team_b: (row['tier2_team_b'] as string | null) ?? null,
      tier3_team_a: (row['tier3_team_a'] as string | null) ?? null,
      tier3_team_b: (row['tier3_team_b'] as string | null) ?? null,
      tier4_team_a: (row['tier4_team_a'] as string | null) ?? null,
      tier4_team_b: (row['tier4_team_b'] as string | null) ?? null,
      tier4_team_c: (row['tier4_team_c'] as string | null) ?? null,
    },
    resolution
  );

  return {
    ...row,
    teams_remaining: remaining.teamsRemaining,
    points_remaining: remaining.pointsRemaining,
  };
}

// GET /api/brettsworldcup/participants
router.get('/participants', async (_req, res) => {
  if (dbRequired(res)) return;
  try {
    const [result, liveMatches] = await Promise.all([
      pool!.query('SELECT * FROM participants ORDER BY points DESC, name ASC'),
      fetchLiveMatches(),
    ]);
    const resolution = resolveBracket(liveMatches);
    res.json(result.rows.map(row => enrichParticipant(row, resolution)));
  } catch (err) {
    console.error('[worldcup] GET /participants:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/brettsworldcup/participants/:id
router.get('/participants/:id', async (req, res) => {
  if (dbRequired(res)) return;
  try {
    const [result, liveMatches] = await Promise.all([
      pool!.query('SELECT * FROM participants WHERE id = $1', [req.params['id']]),
      fetchLiveMatches(),
    ]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const resolution = resolveBracket(liveMatches);
    res.json(enrichParticipant(result.rows[0], resolution));
  } catch (err) {
    console.error('[worldcup] GET /participants/:id:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/brettsworldcup/participants (admin)
router.post('/participants', requireAdminKey, async (req, res) => {
  if (dbRequired(res)) return;
  const {
    name, points = 0,
    champion_pick, tier1_team,
    tier2_team_a, tier2_team_b,
    tier3_team_a, tier3_team_b,
    tier4_team_a, tier4_team_b, tier4_team_c,
  } = req.body as Record<string, string | number>;

  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  try {
    const result = await pool!.query(
      `INSERT INTO participants
         (name, points, champion_pick, tier1_team, tier2_team_a, tier2_team_b, tier3_team_a, tier3_team_b, tier4_team_a, tier4_team_b, tier4_team_c)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [name, points, champion_pick, tier1_team, tier2_team_a, tier2_team_b, tier3_team_a, tier3_team_b, tier4_team_a, tier4_team_b, tier4_team_c]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
      res.status(409).json({ error: 'Name already exists' });
      return;
    }
    console.error('[worldcup] POST /participants:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/brettsworldcup/participants/:id (admin)
router.patch('/participants/:id', requireAdminKey, async (req, res) => {
  if (dbRequired(res)) return;

  const allowed = [
    'name', 'points', 'champion_pick',
    'tier1_team', 'tier2_team_a', 'tier2_team_b',
    'tier3_team_a', 'tier3_team_b',
    'tier4_team_a', 'tier4_team_b', 'tier4_team_c',
  ];

  const fields = Object.keys(req.body).filter(k => allowed.includes(k));
  if (fields.length === 0) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }

  const setClauses = fields.map((f, i) => `${f} = $${i + 1}`);
  setClauses.push(`updated_at = NOW()`);
  const values = fields.map(f => (req.body as Record<string, unknown>)[f]);
  values.push(req.params['id']);

  try {
    const result = await pool!.query(
      `UPDATE participants SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[worldcup] PATCH /participants/:id:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/brettsworldcup/participants/:id (admin)
router.delete('/participants/:id', requireAdminKey, async (req, res) => {
  if (dbRequired(res)) return;
  try {
    const result = await pool!.query(
      'DELETE FROM participants WHERE id = $1 RETURNING id, name',
      [req.params['id']]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ deleted: result.rows[0] });
  } catch (err) {
    console.error('[worldcup] DELETE /participants/:id:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/brettsworldcup/matches
router.get('/matches', async (_req, res) => {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    res.json({ matches: [] });
    return;
  }

  const now = Date.now();
  if (matchesCache && now - matchesCache.fetchedAt < MATCHES_CACHE_TTL) {
    res.json(matchesCache.data);
    return;
  }

  try {
    const r = await fetch(
      'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
      { headers: { 'X-Auth-Token': apiKey } }
    );
    if (!r.ok) {
      res.json({ matches: [] });
      return;
    }
    const data = await r.json();
    matchesCache = { data, fetchedAt: now };
    res.json(data);
  } catch (err) {
    console.error('[worldcup] GET /matches:', err);
    res.json({ matches: [] });
  }
});

// GET /api/brettsworldcup/etl/status
router.get('/etl/status', async (_req, res) => {
  if (dbRequired(res)) return;
  try {
    const result = await pool!.query(
      `SELECT id, run_at, matches_checked, matches_scored, participants_updated, status, error_message
       FROM etl_log ORDER BY run_at DESC LIMIT 10`
    );
    const runs = result.rows;
    res.json({ last_run: runs[0] ?? null, recent_runs: runs });
  } catch (err) {
    console.error('[worldcup] GET /etl/status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/brettsworldcup/etl/trigger (admin)
router.post('/etl/trigger', requireAdminKey, async (_req, res) => {
  try {
    const summary = await runETL();
    res.json({ message: 'ETL completed', ...summary });
  } catch (err) {
    console.error('[worldcup] POST /etl/trigger:', err);
    res.status(500).json({ error: String((err as Error).message ?? err) });
  }
});

export default router;
