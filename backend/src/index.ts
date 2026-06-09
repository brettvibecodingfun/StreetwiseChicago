import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import restaurantsRouter from './routes/restaurants';
import analysisRouter from './routes/analysis';
import queryRouter from './routes/query';
import mapRouter from './routes/map';
import locationScoreRouter from './routes/locationScore';
import locationResolveRouter from './routes/locationResolve';
import propertySalesRouter from './routes/propertySales';
import worldcupRouter from './routes/worldcup';
import swaggerUi from 'swagger-ui-express';
import { worldcupSpec } from './worldcupSwagger';
import pool from './db';

const app = express();
const PORT = process.env.PORT ?? 3000;

async function initDb(): Promise<void> {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS participants (
      id             SERIAL PRIMARY KEY,
      name           VARCHAR(100) NOT NULL UNIQUE,
      points         INTEGER NOT NULL DEFAULT 0,
      champion_pick  VARCHAR(100),
      tier1_team     VARCHAR(100),
      tier2_team_a   VARCHAR(100),
      tier2_team_b   VARCHAR(100),
      tier3_team_a   VARCHAR(100),
      tier3_team_b   VARCHAR(100),
      tier4_team_a   VARCHAR(100),
      tier4_team_b   VARCHAR(100),
      tier4_team_c   VARCHAR(100),
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      updated_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('[db] participants table ready');
}

initDb().catch(err => console.error('[db] init failed:', err));

app.use(cors());
app.use(express.json());

app.get('/api/config', (_req, res) => {
  res.json({ googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '' });
});

app.get('/api/street-view-pano', async (req, res) => {
  const { lat, lng } = req.query;
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key || !lat || !lng) { res.json({ panoId: null }); return; }
  try {
    const r = await fetch(
      `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&source=outdoor&radius=100&key=${key}`
    );
    const data = await r.json() as { status: string; pano_id?: string };
    res.json({ panoId: data.status === 'OK' ? (data.pano_id ?? null) : null });
  } catch {
    res.json({ panoId: null });
  }
});

app.use('/api/restaurants', restaurantsRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/query', queryRouter);
app.use('/api/map', mapRouter);
app.use('/api/location-score', locationScoreRouter);
app.use('/api/location-resolve', locationResolveRouter);
app.use('/api/property-sales', propertySalesRouter);
app.use('/api/brettsworldcup', worldcupRouter);
app.use('/worldcup-docs', swaggerUi.serve, swaggerUi.setup(worldcupSpec));

const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist', 'frontend', 'browser');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

export { app };

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
