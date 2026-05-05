import express from 'express';
import request from 'supertest';
import axios from 'axios';
import { score5, crimeRateScore, scoreLog5 } from './locationScore';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

function buildTestApp() {
  const locationScoreRouter = require('./locationScore').default;
  const app = express();
  app.use(express.json());
  app.use('/', locationScoreRouter);
  return app;
}

// ─── Unit: score5 ────────────────────────────────────────────────────────────

describe('score5', () => {
  it('returns 0 for zero count', () => {
    expect(score5(0, 100)).toBe(0);
  });

  it('returns 5 at threshold', () => {
    expect(score5(20500, 20500)).toBe(5);
  });

  it('returns 2.5 at threshold/4 (sqrt-scale half-score)', () => {
    expect(score5(25, 100)).toBe(2.5);
  });

  it('caps at 5 when count exceeds threshold', () => {
    expect(score5(50000, 20500)).toBe(5);
  });
});

// ─── Unit: crimeRateScore ─────────────────────────────────────────────────────

describe('crimeRateScore', () => {
  it('returns 5.0 for zero crime (safest)', () => {
    expect(crimeRateScore(0, 200)).toBe(5);
  });

  it('returns 5.0 when ft6w is zero and crime is zero', () => {
    expect(crimeRateScore(0, 0)).toBe(5);
  });

  it('returns 0 when crime equals or exceeds 80% of ft6w (threshold rate=0.8)', () => {
    // 80 crimes / 100 ft6w = rate 0.8 = threshold → score 0
    expect(crimeRateScore(80, 100)).toBe(0);
  });

  it('returns ~2.5 at half the threshold rate', () => {
    // rate = 0.4 (half of 0.8 threshold): score = 5*(1-0.4/0.8) = 5*0.5 = 2.5
    expect(crimeRateScore(40, 100)).toBe(2.5);
  });

  it('returns ~4.0 for a safe residential area (low crime relative to activity)', () => {
    // rate = 0.16 → score = 5*(1-0.16/0.8) = 5*0.8 = 4.0
    expect(crimeRateScore(16, 100)).toBe(4);
  });

  it('clamps to 0 when crime far exceeds threshold rate', () => {
    expect(crimeRateScore(500, 100)).toBe(0);
  });
});

// ─── Unit: scoreLog5 ─────────────────────────────────────────────────────────

describe('scoreLog5', () => {
  it('returns 0 for zero count', () => {
    expect(scoreLog5(0, 2500)).toBe(0);
  });

  it('returns 5 at threshold (Loop-level density)', () => {
    // 2403 permits at threshold=2500 → effectively 5
    expect(scoreLog5(2403, 2500)).toBe(5);
  });

  it('returns 4.0 for Lincoln-Park-level density (562 permits)', () => {
    expect(scoreLog5(562, 2500)).toBe(4);
  });

  it('returns ~2.8 for moderate activity (76 permits)', () => {
    expect(scoreLog5(76, 2500)).toBe(2.8);
  });

  it('caps at 5 when count exceeds threshold', () => {
    expect(scoreLog5(5000, 2500)).toBe(5);
  });
});

// ─── Integration: POST / ─────────────────────────────────────────────────────

describe('POST / (crime integration)', () => {
  let app: express.Express;

  beforeAll(() => {
    app = buildTestApp();
  });

  afterEach(() => {
    jest.resetAllMocks(); // resetAllMocks clears queued mockResolvedValueOnce values; clearAllMocks does not
  });

  // Mock order matches Promise.all + fetchCTAScore internal sequence:
  // rideshare, biz, highImpactBiz, ft(1yr), closures, crime(6wk), ft6w, permits,
  // then fetchCTAScore step-1 (L stops), fetchCTAScore step-2 (ridership)
  function mockAllCalls(opts: {
    rideshare?: string; biz?: string; highImpactBiz?: string; ft?: string;
    closures?: any[]; crime?: string; ft6w?: string; permits?: string;
    ctaStops?: any[];
    ctaRidership?: Array<{ station_id: string; stationame: string; monthtotal: string }>;
  } = {}) {
    // Location matches test lat/lng exactly so Haversine distance = 0 (within CTA_NEAR_METERS)
    const defaultCtaStops = [{
      map_id: '40380',
      station_descriptive_name: 'Clark/Lake (Green, Pink, Orange, Brown & Purple lines)',
      location: { latitude: '41.8827', longitude: '-87.6233' },
    }];
    const defaultCtaRidership = [
      { station_id: '40380', stationame: 'Clark/Lake', monthtotal: '120000' },
      { station_id: '40380', stationame: 'Clark/Lake', monthtotal: '115000' },
    ];
    mockedAxios.get
      .mockResolvedValueOnce({ data: [{ cnt: opts.rideshare ?? '100' }] })
      .mockResolvedValueOnce({ data: [{ cnt: opts.biz ?? '200' }] })
      .mockResolvedValueOnce({ data: [{ cnt: opts.highImpactBiz ?? '50' }] })
      .mockResolvedValueOnce({ data: [{ cnt: opts.ft ?? '500' }] })
      .mockResolvedValueOnce({ data: opts.closures ?? [] })
      .mockResolvedValueOnce({ data: [{ cnt: opts.crime ?? '10' }] })
      .mockResolvedValueOnce({ data: [{ cnt: opts.ft6w ?? '100' }] })
      .mockResolvedValueOnce({ data: [{ cnt: opts.permits ?? '50' }] })          // building permits
      .mockResolvedValueOnce({ data: opts.ctaStops ?? defaultCtaStops })         // fetchCTAScore step 1
      .mockResolvedValueOnce({ data: opts.ctaRidership ?? defaultCtaRidership }); // fetchCTAScore step 2
  }

  it('returns breakdown.crime and breakdown.transit with scores in 0–5 range and totalScore in 0–30 range', async () => {
    mockAllCalls();

    const res = await request(app)
      .post('/')
      .send({ lat: 41.8827, lng: -87.6233, displayName: 'Test Location' });

    expect(res.status).toBe(200);
    expect(res.body.breakdown).toHaveProperty('crime');
    expect(res.body.breakdown.crime.score).toBeGreaterThanOrEqual(0);
    expect(res.body.breakdown.crime.score).toBeLessThanOrEqual(5);
    expect(res.body.breakdown).toHaveProperty('transit');
    expect(res.body.breakdown.transit.score).toBeGreaterThanOrEqual(0);
    expect(res.body.breakdown.transit.score).toBeLessThanOrEqual(5);
    expect(res.body.totalScore).toBeGreaterThanOrEqual(0);
    expect(res.body.totalScore).toBeLessThanOrEqual(30);
  });

  it('crime query targets ijzp-q8t2 with a 6-week rolling date filter', async () => {
    mockAllCalls();

    await request(app).post('/').send({ lat: 41.8827, lng: -87.6233 });

    const calls = mockedAxios.get.mock.calls;
    const crimeCall = calls.find(([url]) => typeof url === 'string' && url.includes('ijzp-q8t2'));

    expect(crimeCall).toBeDefined();
    expect(crimeCall![0]).toContain('ijzp-q8t2');

    const whereParam = crimeCall![1]?.params?.$where as string;
    // Should NOT use year = 2026 filter anymore
    expect(whereParam).not.toContain('year = 2026');
    // Should use a date >= filter for the rolling window
    expect(whereParam).toMatch(/date >= '/);
  });

  it('makes a second 311 query at 0.5-mile radius for the 6-week normalizer', async () => {
    mockAllCalls();

    await request(app).post('/').send({ lat: 41.8827, lng: -87.6233 });

    const calls = mockedAxios.get.mock.calls;
    // Both 311 calls hit v6vf-nfxy; the 6w one uses CRIME_METERS (800) radius
    const ft6wCalls = calls.filter(([url, cfg]) =>
      typeof url === 'string' && url.includes('v6vf-nfxy') &&
      (cfg?.params?.$where as string)?.includes('within_circle') &&
      (cfg?.params?.$where as string)?.includes(', 800)')
    );
    expect(ft6wCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('returns crime score of 5 when no incidents found', async () => {
    mockAllCalls({ crime: '0', ft6w: '150' });

    const res = await request(app)
      .post('/')
      .send({ lat: 41.8827, lng: -87.6233 });

    expect(res.status).toBe(200);
    expect(res.body.breakdown.crime.score).toBe(5);
    expect(res.body.breakdown.crime.description).toContain('No reported incidents');
  });

  it('crime score is lower when crime/ft6w ratio is high vs low', async () => {
    // Safe area: 10 crimes / 200 ft6w = rate 0.05 → high score
    mockAllCalls({ crime: '10', ft6w: '200' });
    const safeRes = await request(app).post('/').send({ lat: 41.8827, lng: -87.6233 });

    jest.clearAllMocks();

    // Dangerous area: 150 crimes / 200 ft6w = rate 0.75 → low score
    mockAllCalls({ crime: '150', ft6w: '200' });
    const dangerRes = await request(app).post('/').send({ lat: 41.8827, lng: -87.6233 });

    expect(safeRes.body.breakdown.crime.score).toBeGreaterThan(dangerRes.body.breakdown.crime.score);
  });

  it('transit score is 0 and description says no stations when no L stops found nearby', async () => {
    mockAllCalls({ ctaStops: [] });

    const res = await request(app).post('/').send({ lat: 41.8827, lng: -87.6233 });

    expect(res.status).toBe(200);
    expect(res.body.breakdown.transit.score).toBe(0);
    expect(res.body.breakdown.transit.description).toContain('No CTA L stations');
  });

  it('transit score is higher for a high-ridership station than a low-ridership one', async () => {
    const nearLocation = { latitude: '41.8827', longitude: '-87.6233' }; // 0m from test point
    mockAllCalls({
      ctaStops: [{ map_id: '40380', station_descriptive_name: 'Clark/Lake', location: nearLocation }],
      ctaRidership: [
        { station_id: '40380', stationame: 'Clark/Lake', monthtotal: '245000' },
        { station_id: '40380', stationame: 'Clark/Lake', monthtotal: '240000' },
      ],
    });
    const highRes = await request(app).post('/').send({ lat: 41.8827, lng: -87.6233 });

    mockAllCalls({
      ctaStops: [{ map_id: '41020', station_descriptive_name: 'Kostner', location: nearLocation }],
      ctaRidership: [
        { station_id: '41020', stationame: 'Kostner', monthtotal: '6500' },
        { station_id: '41020', stationame: 'Kostner', monthtotal: '6200' },
      ],
    });
    const lowRes = await request(app).post('/').send({ lat: 41.8827, lng: -87.6233 });

    expect(highRes.body.breakdown.transit.score).toBeGreaterThan(lowRes.body.breakdown.transit.score);
  });

  it('transit score is reduced for a station between 0.5 and 1 mile away', async () => {
    // ~1200m away: lat offset of ~0.011 degrees ≈ 1220m
    const nearLocation  = { latitude: '41.8827', longitude: '-87.6233' }; // 0m
    const farLocation   = { latitude: '41.8937', longitude: '-87.6233' }; // ~1220m

    mockAllCalls({
      ctaStops: [{ map_id: '40380', station_descriptive_name: 'Clark/Lake', location: nearLocation }],
      ctaRidership: [{ station_id: '40380', stationame: 'Clark/Lake', monthtotal: '200000' }],
    });
    const nearRes = await request(app).post('/').send({ lat: 41.8827, lng: -87.6233 });

    mockAllCalls({
      ctaStops: [{ map_id: '40380', station_descriptive_name: 'Clark/Lake', location: farLocation }],
      ctaRidership: [{ station_id: '40380', stationame: 'Clark/Lake', monthtotal: '200000' }],
    });
    const farRes = await request(app).post('/').send({ lat: 41.8827, lng: -87.6233 });

    expect(nearRes.body.breakdown.transit.score).toBeGreaterThan(farRes.body.breakdown.transit.score);
    expect(farRes.body.breakdown.transit.description).toMatch(/mi away/);
  });

  it('development score is 0 and description says no permits when none found', async () => {
    mockAllCalls({ permits: '0' });

    const res = await request(app).post('/').send({ lat: 41.8827, lng: -87.6233 });

    expect(res.status).toBe(200);
    expect(res.body.breakdown.development.score).toBe(0);
    expect(res.body.breakdown.development.description).toContain('No recent construction permits');
  });

  it('development score is higher for an area with more permits', async () => {
    mockAllCalls({ permits: '200' }); // at threshold → score 5
    const activeRes = await request(app).post('/').send({ lat: 41.8827, lng: -87.6233 });

    jest.clearAllMocks();

    mockAllCalls({ permits: '5' }); // sparse → low score
    const quietRes = await request(app).post('/').send({ lat: 41.8827, lng: -87.6233 });

    expect(activeRes.body.breakdown.development.score).toBeGreaterThan(quietRes.body.breakdown.development.score);
  });
});
