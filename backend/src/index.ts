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

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

app.use('/api/restaurants', restaurantsRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/query', queryRouter);
app.use('/api/map', mapRouter);
app.use('/api/location-score', locationScoreRouter);
app.use('/api/location-resolve', locationResolveRouter);
app.use('/api/property-sales', propertySalesRouter);

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
