import { Router, Request, Response } from 'express';
import axios from 'axios';
import { getPropertySalesData, PropertySalesResult } from './propertySales';

const router = Router();
const SODA_BASE = 'https://data.cityofchicago.org/resource';

const BLOCK_METERS              = 150;   // ~1 Chicago block
const RIDESHARE_METERS          = 600;   // rideshare dataset snaps to census tract centroids (~0.4mi); 600m captures adjacent tracts while scanning 44% fewer rows than 800m
const NEIGHBORHOOD_METERS       = 1600;  // ~1 mile — for business and foot traffic
const CLOSURE_METERS            = 800;   // ~0.5 miles — street closures are hyper-local
const CRIME_METERS              = 800;   // ~0.5 miles — crime incidents are block-level
const CTA_NEAR_METERS           = 800;   // ≤ this distance → full score (~0.5 miles)
const CTA_RADIUS_METERS         = 1600;  // outer search limit (~1 mile)
const PERMIT_METERS             = 800;   // ~0.5 miles — building permits are hyper-local
const PERMIT_THRESHOLD          = 2500;  // log-scale threshold: Loop ~2400 → 5.0, Lincoln Park ~560 → 4.0, quiet areas → ~2.5
const FAILED_INSPECTION_METERS  = 800;   // ~0.5 miles — food safety failures are hyper-local
const PARK_RADIUS_METERS        = 1600;  // ~1 mile — parks and lake proximity
const PARK_ACREAGE_CAP          = 50;    // sqrt-scale ceiling: ≥50 acres gets full size credit (typical large Chicago neighborhood park)

const PARKS_V3_URL = 'https://data.cityofchicago.org/api/v3/views/ejsh-fztr/query.json';

// Approximate points along Chicago's Lake Michigan shoreline (north → south).
// Points are placed at the actual water's edge for accurate proximity scoring.
const LAKE_MI_SHORE: Array<{ lat: number; lng: number }> = [
  { lat: 42.003, lng: -87.657 }, // Rogers Park / Loyola Beach
  { lat: 41.981, lng: -87.651 }, // Foster Beach
  { lat: 41.965, lng: -87.638 }, // Montrose Beach
  { lat: 41.948, lng: -87.635 }, // Waveland Beach
  { lat: 41.931, lng: -87.632 }, // Belmont Harbor
  { lat: 41.919, lng: -87.629 }, // North Ave Beach (was incorrectly at Diversey Harbor)
  { lat: 41.902, lng: -87.622 }, // Oak Street Beach
  { lat: 41.892, lng: -87.607 }, // Navy Pier
  { lat: 41.865, lng: -87.611 }, // Museum Campus
  { lat: 41.836, lng: -87.594 }, // 31st St Harbor
  { lat: 41.790, lng: -87.576 }, // 57th St / Promontory Point
  { lat: 41.751, lng: -87.551 }, // Rainbow Beach (75th)
  { lat: 41.730, lng: -87.549 }, // Calumet Park Beach (95th)
];

const CTA_STOPS_RESOURCE     = '8pix-ypme';
const CTA_RIDERSHIP_RESOURCE = 't2rn-p8d7'; // monthly ridership — use resource endpoint (v3 requires auth)
const CTA_MAX_MONTHLY        = 250000; // Clark/Lake peak threshold → scores 5.0

// License types that drive real foot traffic and consumer spending.
// Weighted separately so event/dining districts aren't penalized vs. generic commercial areas.
const HIGH_IMPACT_LICENSE_TERMS = [
  'FOOD ESTABLISHMENT',
  'TAVERN',
  'AMUSEMENT',
  'HOTEL',
  'CONSUMPTION ON PREMISES',
  'CATERER',
  'PACKAGE GOODS',
  'NIGHT CLUB',
  'PERFORMING ARTS',
];

const HIGH_IMPACT_WHERE = HIGH_IMPACT_LICENSE_TERMS
  .map(t => `upper(license_description) LIKE '%${t}%'`)
  .join(' OR ');

interface CategoryData {
  score: number;
  count: number;
  label: string;
  emoji: string;
  description: string;
}

interface CTAResult {
  score: number;
  nearestStation: string | null;
  avgMonthlyRides: number;
  stationCount: number;
  nearestDistanceMeters: number;
}

interface LocationScoreResult {
  address: string;
  lat: number;
  lng: number;
  totalScore: number;
  breakdown: {
    rideshare: CategoryData;
    business: CategoryData;
    footTraffic: CategoryData;
    streetClosures: CategoryData;
    crime: CategoryData;
    development: CategoryData;
    transit: CategoryData;
    foodSafety: CategoryData;
    propertySales: CategoryData | null;
    parks: CategoryData;
  };
}

async function geocode(address: string): Promise<{ lat: number; lng: number; displayName: string }> {
  const q = /chicago/i.test(address) ? address : `${address}, Chicago, IL`;
  const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { format: 'json', q, limit: 1 },
    headers: { 'User-Agent': 'ChicagoLocationIntelligence/1.0 (open-source)' },
    timeout: 15000,
  });
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Address not found. Please enter a valid Chicago address.');
  }
  const latN = parseFloat(data[0].lat);
  const lngN = parseFloat(data[0].lon);
  if (latN < 41.64 || latN > 42.02 || lngN < -87.94 || lngN > -87.52) {
    throw new Error('Address appears to be outside Chicago. Please enter a Chicago address.');
  }
  return { lat: latN, lng: lngN, displayName: data[0].display_name };
}

async function countNearby(resourceId: string, where: string, timeoutMs = 25000, maxRetries = 2): Promise<number> {
  const appToken = process.env.CHICAGO_DATA_APP_TOKEN;

  const query = async (includeToken: boolean): Promise<number> => {
    const params: Record<string, string> = { $select: 'count(*) AS cnt', $where: where };
    if (includeToken && appToken) params['$$app_token'] = appToken;
    const { data } = await axios.get(`${SODA_BASE}/${resourceId}.json`, { params, timeout: timeoutMs });
    if (Array.isArray(data) && data.length > 0) {
      return parseInt(data[0]?.cnt ?? data[0]?.['count(*)'] ?? '0', 10) || 0;
    }
    return 0;
  };

  const attempt = async (): Promise<number> => {
    try {
      return await query(true);
    } catch (err: any) {
      if (err?.response?.status === 403 && appToken) {
        // Token may be malformed or invalid — retry unauthenticated (public datasets don't require it)
        return await query(false);
      }
      throw err;
    }
  };

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await attempt();
    } catch (err: any) {
      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      console.error(`[LocationScore] countNearby ${resourceId} (attempt ${i + 1}):`, err?.message ?? err);
      return 0;
    }
  }
  return 0;
}

// Keywords indicating a street closure is event-driven (good for business foot traffic)
const GOOD_CLOSURE_KEYWORDS = [
  'special event', 'festival', 'filming', 'film', 'parade', 'block party',
  'concert', 'race', 'run', 'marathon', 'celebration', 'street fair',
  'market', 'carnival', 'exhibition', 'sports', 'game', 'music', 'rally',
  'demonstration', 'production', 'show', 'performance',
];

async function fetchStreetClosures(lat: number, lng: number, radiusM: number, yearStart: string): Promise<{ total: number; goodCount: number }> {
  const appToken = process.env.CHICAGO_DATA_APP_TOKEN;
  const where = [
    `within_circle(location, ${lat}, ${lng}, ${radiusM})`,
    `applicationexpiredate > '${yearStart}'`,
    `applicationexpiredate IS NOT NULL`,
  ].join(' AND ');

  const query = async (includeToken: boolean): Promise<{ total: number; goodCount: number }> => {
    const params: Record<string, string> = {
      $select: 'applicationdescription, worktypedescription, streetclosure, applicationname, comments',
      $where: where,
      $limit: '500',
    };
    if (includeToken && appToken){
      params['$$app_token'] = appToken;
    }
    const { data } = await axios.get(`${SODA_BASE}/jdis-5sry.json`, { params, timeout: 20000 });
    if (!Array.isArray(data)) return { total: 0, goodCount: 0 };
    const total = data.length;
    const goodCount = data.filter((r: any) => {
      const text = [
        r.applicationdescription, r.worktypedescription,
        r.streetclosure, r.applicationname, r.comments,
      ].filter(Boolean).join(' ').toLowerCase();
      return GOOD_CLOSURE_KEYWORDS.some(kw => text.includes(kw));
    }).length;
    return { total, goodCount };
  };

  try {
    return await query(true);
  } catch (err: any) {
    if (err?.response?.status === 403 && appToken) {
      try {
        return await query(false);
      } catch (retryErr: any) {
        console.error('[LocationScore] fetchStreetClosures (retry):', retryErr?.message ?? retryErr);
        return { total: 0, goodCount: 0 };
      }
    }
    console.error('[LocationScore] fetchStreetClosures:', err?.message ?? err);
    return { total: 0, goodCount: 0 };
  }
}

// Thin wrapper around axios.get that handles the Socrata app-token 403 pattern:
// try with token, fall back to unauthenticated on 403 (token may be malformed/expired).
async function socrataGet(url: string, params: Record<string, string>, timeoutMs = 20000): Promise<any> {
  const appToken = process.env.CHICAGO_DATA_APP_TOKEN;
  const get = async (withToken: boolean) => {
    const p = { ...params };
    if (withToken && appToken) p['$$app_token'] = appToken;
    const { data } = await axios.get(url, { params: p, timeout: timeoutMs });
    return data;
  };
  try {
    return await get(true);
  } catch (err: any) {
    if (err?.response?.status === 403 && appToken) return await get(false);
    throw err;
  }
}

function firstOfNextMonth(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10);
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Extract an approximate centroid from a GeoJSON Polygon or MultiPolygon
// by averaging the outer ring's vertices. Good enough for distance scoring.
function polygonCentroid(geom: any): { lat: number; lng: number } | null {
  if (!geom) return null;
  // geom may arrive as a parsed object or as a JSON string
  const g = typeof geom === 'string' ? (() => { try { return JSON.parse(geom); } catch { return null; } })() : geom;
  if (!g) return null;
  let ring: number[][];
  if (g.type === 'Polygon' && Array.isArray(g.coordinates?.[0])) {
    ring = g.coordinates[0];
  } else if (g.type === 'MultiPolygon' && Array.isArray(g.coordinates?.[0]?.[0])) {
    ring = g.coordinates[0][0];
  } else {
    return null;
  }
  if (ring.length === 0) return null;
  const avgLng = ring.reduce((s: number, c: number[]) => s + c[0], 0) / ring.length;
  const avgLat = ring.reduce((s: number, c: number[]) => s + c[1], 0) / ring.length;
  return { lat: avgLat, lng: avgLng };
}

function nearestLakeMiDistMeters(lat: number, lng: number): number {
  return Math.min(...LAKE_MI_SHORE.map(p => haversineMeters(lat, lng, p.lat, p.lng)));
}

interface ParkRecord { name: string; acres: number; distMeters: number }

function parseParksRows(rows: any[], lat: number, lng: number): ParkRecord[] {
  return rows
    .map((r: any) => {
      const name     = (r.park ?? r.PARK ?? '').toString().trim();
      const acres    = parseFloat(r.acres ?? r.ACRES ?? '0') || 0;
      const centroid = polygonCentroid(r.the_geom ?? r.he_geom);
      if (!centroid || acres <= 0) return null;
      const dist = haversineMeters(lat, lng, centroid.lat, centroid.lng);
      return dist <= PARK_RADIUS_METERS ? { name, acres, distMeters: dist } : null;
    })
    .filter((p): p is ParkRecord => p !== null);
}

// Overpass API (OpenStreetMap) fallback for parks — no authentication required.
// Used when Chicago's parks dataset (ejsh-fztr) is unavailable or returns auth errors.
// Acreage is estimated from each element's bounding box × 0.65 (shape-correction factor).
async function fetchNearbyParksOSM(lat: number, lng: number): Promise<ParkRecord[]> {
  const overpassQuery =
    `[out:json][timeout:20];` +
    `(way["leisure"="park"](around:${PARK_RADIUS_METERS},${lat},${lng});` +
    `relation["leisure"="park"](around:${PARK_RADIUS_METERS},${lat},${lng});` +
    `);out center tags bb;`;

  const { data } = await axios.post(
    'https://overpass-api.de/api/interpreter',
    `data=${encodeURIComponent(overpassQuery)}`,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 22000 },
  );

  if (!Array.isArray(data?.elements)) return [];

  const parks: ParkRecord[] = [];
  for (const el of data.elements) {
    const name      = (el.tags?.name ?? el.tags?.['name:en'] ?? 'Park').toString().trim();
    const centerLat = el.center?.lat ?? el.lat;
    const centerLng = el.center?.lon ?? el.lon;
    if (centerLat == null || centerLng == null) continue;
    const dist = haversineMeters(lat, lng, centerLat, centerLng);
    if (dist > PARK_RADIUS_METERS) continue;

    let acres = 1;
    if (el.bounds) {
      const heightM = haversineMeters(el.bounds.minlat, el.bounds.minlon, el.bounds.maxlat, el.bounds.minlon);
      const widthM  = haversineMeters(el.bounds.minlat, el.bounds.minlon, el.bounds.minlat, el.bounds.maxlon);
      acres = Math.max(0.5, (heightM * widthM * 0.65) / 4047);
    }
    parks.push({ name, acres, distMeters: dist });
  }
  return parks;
}

async function fetchNearbyParks(lat: number, lng: number): Promise<ParkRecord[]> {
  const appToken  = process.env.CHICAGO_DATA_APP_TOKEN;
  const soqlQuery = `SELECT park, acres, he_geom WHERE within_circle(he_geom, ${lat}, ${lng}, ${PARK_RADIUS_METERS}) AND acres > 0`;

  // Attempt helper: tries the given URL + params, optionally adding X-App-Token header.
  // X-App-Token header is the correct convention for both SODA v2.1 and v3 endpoints;
  // $$app_token query param is a v2.1-only alias that v3 endpoints do not accept.
  const attempt = async (url: string, params: Record<string, string>, withToken: boolean): Promise<any> => {
    const headers: Record<string, string> = {};
    if (withToken && appToken) headers['X-App-Token'] = appToken;
    const { data } = await axios.get(url, { params, headers, timeout: 20000 });
    return data;
  };

  // ── Strategy 1: v2.1 SODA, no token.
  // the_geom is the standard Socrata geometry column name on the v2.1 endpoint;
  // he_geom is the raw column name exposed by the v3 endpoint only.
  try {
    const data = await attempt(`${SODA_BASE}/ejsh-fztr.json`, {
      $select: 'park,acres,the_geom',
      $where:  `within_circle(the_geom, ${lat}, ${lng}, ${PARK_RADIUS_METERS}) AND acres > 0`,
      $limit:  '100',
    }, false);
    if (Array.isArray(data) && data.length > 0) return parseParksRows(data, lat, lng);
  } catch (e1: any) {
    const s1 = e1?.response?.status;
    const b1 = JSON.stringify(e1?.response?.data ?? '(no body)');
    console.error(`[LocationScore] Parks v2.1 no-token | HTTP ${s1 ?? 'ERR'} | body=${b1}`);
  }

  // ── Strategy 2: v2.1 SODA with X-App-Token header ──
  try {
    const data = await attempt(`${SODA_BASE}/ejsh-fztr.json`, {
      $select: 'park,acres,the_geom',
      $where:  `within_circle(the_geom, ${lat}, ${lng}, ${PARK_RADIUS_METERS}) AND acres > 0`,
      $limit:  '100',
    }, true);
    if (Array.isArray(data) && data.length > 0) return parseParksRows(data, lat, lng);
  } catch (e2: any) {
    const s2 = e2?.response?.status;
    const b2 = JSON.stringify(e2?.response?.data ?? '(no body)');
    console.error(`[LocationScore] Parks v2.1 with-token | HTTP ${s2 ?? 'ERR'} | token=${appToken ? appToken.slice(0, 6) + '…' : 'unset'} | body=${b2}`);
  }

  // ── Strategy 3: v3 endpoint with X-App-Token header ──
  try {
    const data = await attempt(PARKS_V3_URL, { $query: soqlQuery }, true);
    const rows: any[] = Array.isArray(data) ? data : (data?.rows ?? []);
    if (rows.length > 0) return parseParksRows(rows, lat, lng);
  } catch (e3: any) {
    const s3 = e3?.response?.status;
    const b3 = JSON.stringify(e3?.response?.data ?? '(no body)');
    console.error(`[LocationScore] Parks v3 with-token | HTTP ${s3 ?? 'ERR'} | token=${appToken ? appToken.slice(0, 6) + '…' : 'unset'} | query="${soqlQuery}" | body=${b3}`);
  }

  // ── Strategy 4: v3 endpoint without token ──
  try {
    const data = await attempt(PARKS_V3_URL, { $query: soqlQuery }, false);
    const rows: any[] = Array.isArray(data) ? data : (data?.rows ?? []);
    if (rows.length > 0) return parseParksRows(rows, lat, lng);
  } catch (e4: any) {
    const s4 = e4?.response?.status;
    const b4 = JSON.stringify(e4?.response?.data ?? '(no body)');
    console.error(`[LocationScore] Parks v3 no-token | HTTP ${s4 ?? 'ERR'} | body=${b4}`);
  }

  // ── Strategy 5: Overpass API (OpenStreetMap) — no authentication required ──
  // Activated when Chicago's parks dataset is inaccessible (auth errors, network issues).
  try {
    console.log('[LocationScore] Parks: Chicago dataset unavailable, using Overpass/OSM fallback');
    return await fetchNearbyParksOSM(lat, lng);
  } catch (e5: any) {
    const s5 = e5?.response?.status;
    console.error(`[LocationScore] Parks Overpass | HTTP ${s5 ?? 'ERR'} | ${e5?.message ?? e5}`);
    return [];
  }
}

// Two-step fetch: all L stops (302 rows, tiny — fetched without geo filter because 8pix-ypme uses
// Socrata's legacy Location type, not a Point, so within_circle() returns 0 results on it).
// Distances are computed via Haversine. Stations within CTA_NEAR_METERS get full score;
// stations from CTA_NEAR_METERS to CTA_RADIUS_METERS get a linear decay to 0.75×.
async function fetchCTAScore(lat: number, lng: number): Promise<CTAResult> {
  const defaultResult: CTAResult = { score: 0, nearestStation: null, avgMonthlyRides: 0, stationCount: 0, nearestDistanceMeters: 0 };

  try {
    // Step 1: Fetch all stops, filter by Haversine distance in code.
    // 8pix-ypme uses a legacy Location type so within_circle() returns nothing — must fetch all and filter.
    const stops = await socrataGet(`${SODA_BASE}/${CTA_STOPS_RESOURCE}.json`, {
      $select: 'map_id,station_descriptive_name,location',
      $limit: '400',
    }, 25000) as Array<{
      map_id?: string;
      station_descriptive_name?: string;
      location?: { latitude?: string; longitude?: string };
    }>;
    if (!Array.isArray(stops) || stops.length === 0) return defaultResult;

    // Deduplicate by station (map_id), keeping the closest stop per station
    const stationMap = new Map<string, { name: string; distanceMeters: number }>();
    for (const s of stops) {
      const id = s.map_id?.toString();
      if (!id) continue;
      const sLat = parseFloat(s.location?.latitude ?? '');
      const sLng = parseFloat(s.location?.longitude ?? '');
      if (isNaN(sLat) || isNaN(sLng)) continue;
      const dist = haversineMeters(lat, lng, sLat, sLng);
      if (dist > CTA_RADIUS_METERS) continue;
      if (!stationMap.has(id) || dist < stationMap.get(id)!.distanceMeters) {
        stationMap.set(id, { name: s.station_descriptive_name ?? '', distanceMeters: dist });
      }
    }
    if (stationMap.size === 0) return defaultResult;

    const stationIds = [...stationMap.keys()];

    // Step 2: Ridership — rolling 12-month average (skip current month; may be partial).
    // A single date-range filter avoids the nested OR that caused Socrata 500s.
    const now = new Date();
    const thirteenMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 13, 1);
    const thisMonthStart    = new Date(now.getFullYear(), now.getMonth(), 1);
    const cutoffDate        = thirteenMonthsAgo.toISOString().slice(0, 10);
    const thisMonthStr      = thisMonthStart.toISOString().slice(0, 10);

    const stationCondition = stationIds.length === 1
      ? `station_id = ${stationIds[0]}`
      : `station_id in(${stationIds.join(',')})`;

    const rows = await socrataGet(`${SODA_BASE}/${CTA_RIDERSHIP_RESOURCE}.json`, {
      $where: `(${stationCondition}) AND month_beginning >= '${cutoffDate}T00:00:00.000' AND month_beginning < '${thisMonthStr}T00:00:00.000'`,
      $select: 'station_id,stationame,monthtotal',
      $limit: String(stationIds.length * 14 + 10),
    }, 20000) as Array<{ station_id?: string; stationame?: string; monthtotal?: string }>;
    if (!Array.isArray(rows) || rows.length === 0) {
      return { ...defaultResult, stationCount: stationIds.length };
    }

    // Average all months per station, find the highest
    const byStation = new Map<string, { name: string; totals: number[] }>();
    for (const r of rows) {
      const id = r.station_id?.toString() ?? '';
      if (!id) continue;
      if (!byStation.has(id)) {
        // Prefer the descriptive name from the ridership dataset (e.g. "Clark/Lake")
        // but fall back to the name we got from the stops dataset
        const fallbackName = stationMap.get(id)?.name ?? '';
        byStation.set(id, { name: r.stationame || fallbackName, totals: [] });
      }
      const total = parseFloat(r.monthtotal ?? '0') || 0;
      if (total > 0) byStation.get(id)!.totals.push(total);
    }

    let maxAvg = 0;
    let topStation: string | null = null;
    let topDistanceMeters = 0;
    for (const [id, data] of byStation) {
      if (data.totals.length === 0) continue;
      const avg = data.totals.reduce((a, b) => a + b, 0) / data.totals.length;
      if (avg > maxAvg) {
        maxAvg = avg;
        topStation = data.name;
        topDistanceMeters = stationMap.get(id)?.distanceMeters ?? 0;
      }
    }

    // Distance multiplier: full score within 0.5 miles, linear decay to 0.75× at 1 mile
    const distMultiplier = topDistanceMeters <= CTA_NEAR_METERS
      ? 1.0
      : 1.0 - 0.25 * (topDistanceMeters - CTA_NEAR_METERS) / CTA_NEAR_METERS;

    return {
      score: parseFloat((score5(maxAvg, CTA_MAX_MONTHLY) * distMultiplier).toFixed(1)),
      nearestStation: topStation,
      avgMonthlyRides: Math.round(maxAvg),
      stationCount: stationIds.length,
      nearestDistanceMeters: Math.round(topDistanceMeters),
    };
  } catch (err: any) {
    console.error('[LocationScore] CTA fetch error:', err?.message ?? err);
    return defaultResult;
  }
}

// sqrt-scale: reaches 5 at threshold, half-score at threshold/4.
// Prevents max scores everywhere — only truly dense areas hit 5.
export function score5(count: number, threshold: number): number {
  if (count <= 0) return 0;
  return Math.round(Math.sqrt(Math.min(count, threshold) / threshold) * 5 * 10) / 10;
}

// log-scale: good for metrics where counts span multiple orders of magnitude (e.g. permits).
// Gives meaningful separation between 76 (~2.8), 562 (~4.0), and 2403 (~5.0) at threshold=2500.
export function scoreLog5(count: number, threshold: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.round(Math.log1p(count) / Math.log1p(threshold) * 5 * 10) / 10, 5);
}

// Crime rate score: linear decay on (crimes / local 311 calls) over the same 6-week window.
// Normalizes for foot traffic — busy areas are expected to have more raw incidents.
// rate = 0 → 5.0 (safest), rate ≥ 0.8 → 0.0 (most dangerous).
// Threshold 0.8 means "80 crimes per 100 local 311 calls" = max-danger benchmark.
export function crimeRateScore(crimes: number, ft6w: number): number {
  const CRIME_RATE_THRESHOLD = 0.8;
  const rate = crimes / Math.max(ft6w, 1);
  return Math.max(0, Math.round((1 - rate / CRIME_RATE_THRESHOLD) * 5 * 10) / 10);
}

// Food safety score: inverted sqrt scale on failed inspections within 0.5 miles over 3 years.
// Mirrors score5 but backwards: 0 failures → 5.0, threshold+ → 0.0.
// Threshold 1000 calibrated so Lincoln Park (~114 over 3yr) → ~3.3, Loop (~789) → ~0.6.
export function failedInspectionScore(count: number): number {
  const THRESHOLD = 1000;
  return Math.max(0, Math.round((5 - score5(count, THRESHOLD)) * 10) / 10);
}

// Outdoor & Green Space score (0–5): best of park access or lake access, with a small bonus for both.
//
// Park score: proximity-dominant (85% base weight) so a nearby park scores well regardless of size.
//   sizeFactor: sqrt-scale on acreage (cap 50 ac); proximityFactor: linear decay to PARK_RADIUS_METERS.
//
// Lake score: independent 0–5 scale based on distance to shore.
//   At water's edge: 5.0 · 0.2 mi (320 m): ≥4.5 · 1 mi (1600 m): ~2.2 · beyond 2000 m: 0
//   Formula: 5 * (1 − dist/LAKE_MAX_DIST)^0.5  (sqrt gives a concave decay that keeps high scores near shore)
//
// Final: max(parkScore, lakeScore) + 15% of the lower (slight reward for having both), capped at 5.
export function parkAccessScore(parks: ParkRecord[], lakeMiDistMeters: number): number {
  let bestContrib = 0;
  for (const p of parks) {
    if (p.distMeters >= PARK_RADIUS_METERS) continue;
    const sizeFactor      = Math.sqrt(Math.min(p.acres, PARK_ACREAGE_CAP) / PARK_ACREAGE_CAP);
    const proximityFactor = 1 - p.distMeters / PARK_RADIUS_METERS;
    const contrib         = proximityFactor * (0.85 + 0.15 * sizeFactor);
    if (contrib > bestContrib) bestContrib = contrib;
  }
  const parkScore = Math.round(bestContrib * 5.0 * 10) / 10;

  const LAKE_MAX_DIST = 2000;
  const lakeScore = lakeMiDistMeters < LAKE_MAX_DIST
    ? Math.round(5.0 * Math.sqrt(1 - lakeMiDistMeters / LAKE_MAX_DIST) * 10) / 10
    : 0;

  const best  = Math.max(parkScore, lakeScore);
  const worst = Math.min(parkScore, lakeScore);
  return Math.min(5.0, Math.round((best + 0.15 * worst) * 10) / 10);
}

router.post('/', async (req: Request, res: Response) => {
  const { address, lat: bodyLat, lng: bodyLng, displayName: bodyName } = req.body as {
    address?: string;
    lat?: number;
    lng?: number;
    displayName?: string;
  };

  try {
    let lat: number, lng: number, displayName: string;

    if (bodyLat != null && bodyLng != null) {
      lat = Number(bodyLat);
      lng = Number(bodyLng);
      displayName = bodyName?.trim() || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      if (lat < 41.64 || lat > 42.02 || lng < -87.94 || lng > -87.52) {
        return res.status(400).json({ error: 'Location appears to be outside Chicago.' });
      }
    } else if (address?.trim()) {
      const geo = await geocode(address.trim());
      lat = geo.lat;
      lng = geo.lng;
      displayName = geo.displayName;
    } else {
      return res.status(400).json({ error: 'Address or coordinates are required' });
    }

    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    // Rideshare: 10 AM–10 PM sample on a day ~2 months ago (fixed peak-hour window; 12h of rows vs full-day reduces timeouts in dense areas)
    const rsDay = new Date();
    rsDay.setMonth(rsDay.getMonth() - 2);
    const rsDayStr   = rsDay.toISOString().split('T')[0]; // YYYY-MM-DD
    const rsStartStr = `${rsDayStr}T10:00:00`;
    const rsEndStr   = `${rsDayStr}T22:00:00`;

    // Street closures: permits that haven't expired before Jan 1 of the current year
    const yearStart = `${new Date().getFullYear()}-01-01`;

    // Crime & 311 normalizer: rolling 6-week window
    const sixWeeksAgo = new Date();
    sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);
    const sixWeeksAgoStr = sixWeeksAgo.toISOString().split('T')[0];

    // Building permits: new construction & renovations in the past 5 years
    const fiveYearsAgo = new Date(Date.now() - 5 * 365.25 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    // Food safety: failed inspections in the past 3 years (wider window for meaningful count)
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const threeYearsAgoStr = threeYearsAgo.toISOString().split('T')[0];

    const circle = (col: string, r: number = BLOCK_METERS) =>
      `within_circle(${col}, ${lat}, ${lng}, ${r})`;

    const propertyPromise = address?.trim()
      ? getPropertySalesData(address.trim()).catch((err: any) => {
          console.error('[LocationScore] Cook County lookup failed:', err?.message ?? err);
          return null;
        })
      : Promise.resolve(null);

    const _timings: Record<string, number> = {};
    const t0 = Date.now();
    const timed = <T>(label: string, p: Promise<T>): Promise<T> =>
      p.then(r  => { _timings[label] = Date.now() - t0; return r; },
             (e: any) => { _timings[label] = Date.now() - t0; throw e; });

    const [rideshareCount, bizCount, highImpactBizCount, ftCount, closureData, crimeCount, ft6wCount, permitData, ctaResult, failedInspectionCount, propertySalesData, nearbyParks] = await Promise.all([
      timed('rideshare',       countNearby('6dvr-xwnh', `${circle('pickup_centroid_location', RIDESHARE_METERS)} AND trip_start_timestamp >= '${rsStartStr}' AND trip_start_timestamp < '${rsEndStr}'`, 35000)),
      timed('bizTotal',        countNearby('uupf-x98q', `${circle('location', NEIGHBORHOOD_METERS)} AND license_status = 'AAI'`)),
      timed('bizHighImpact',   countNearby('uupf-x98q', `${circle('location', NEIGHBORHOOD_METERS)} AND license_status = 'AAI' AND (${HIGH_IMPACT_WHERE})`)),
      timed('footTraffic',     countNearby('v6vf-nfxy', `${circle('location', NEIGHBORHOOD_METERS)} AND created_date >= '${cutoffStr}'`, 30000)),
      timed('streetClosures',  fetchStreetClosures(lat, lng, CLOSURE_METERS, yearStart)),
      timed('crime',           countNearby('ijzp-q8t2', `${circle('location', CRIME_METERS)} AND date >= '${sixWeeksAgoStr}'`, 30000)),
      timed('footTraffic6w',   countNearby('v6vf-nfxy',  `${circle('location', CRIME_METERS)} AND created_date >= '${sixWeeksAgoStr}'`, 30000)),
      timed('permits',         socrataGet(`${SODA_BASE}/ydr8-5enu.json`, {
        $select: 'count(*) as cnt',
        $where: `within_circle(location, ${lat}, ${lng}, ${PERMIT_METERS}) AND issue_date >= '${fiveYearsAgo}' AND (upper(permit_type) LIKE '%NEW CONSTRUCTION%' OR upper(permit_type) LIKE '%ADDITION%' OR upper(permit_type) LIKE '%RENOVATION%' OR upper(permit_type) LIKE '%ALTERATION%')`,
        $limit: '1',
      }, 25000).catch(() => [{ cnt: '0' }])),
      timed('cta',             fetchCTAScore(lat, lng)),
      timed('foodInspections', countNearby('4ijn-s7e5', `${circle('location', FAILED_INSPECTION_METERS)} AND results='Fail' AND inspection_date >= '${threeYearsAgoStr}'`, 25000)),
      timed('propertySales',   propertyPromise),
      timed('parks',           fetchNearbyParks(lat, lng)),
    ]);

    const permitCount  = parseInt((permitData as any[])[0]?.cnt ?? '0', 10) || 0;
    const lakeMiDist   = nearestLakeMiDistMeters(lat, lng);

    console.log(`[LocationScore] ${displayName.substring(0, 60)} | rideshare=${rideshareCount} biz=${bizCount} highImpactBiz=${highImpactBizCount} ft=${ftCount} closures=${closureData.total}(good=${closureData.goodCount}) crime=${crimeCount} ft6w=${ft6wCount} permits=${permitCount} cta=${ctaResult.avgMonthlyRides}(${ctaResult.nearestStation ?? 'none'}) failedInspections=${failedInspectionCount} parks=${nearbyParks.length}(lakeMi=${Math.round(lakeMiDist)}m)`);

    // Thresholds set so only the densest Chicago commercial corridors reach 5/5.
    // sqrt scale ensures meaningful spread: ~1.5 for quiet, ~3 for active, 5 for dense cores.
    // Rideshare uses 600m radius, 10 AM–10 PM sample — threshold scaled (3417*(600²/800²)≈1922) to match expected density at this radius vs the original 800m baseline.
    // Street closures: event-type closures are the real signal; construction adds almost nothing.
    // Threshold of 25 calibrated so Wrigley-area density (~10-12 good at 0.5mi) scores ~4.5-5.
    // Crime: linear decay on crimes/ft6w ratio. Normalizes for foot traffic so busy areas aren't unfairly penalized.
    // Business: 60% high-impact (food/tavern/entertainment/hotel, threshold 350) + 40% total (threshold 5000).
    // This ensures event/dining districts (United Center, Wrigleyville) aren't underscored vs. generic commercial corridors.
    // Permits: new construction + renovation permits in past 5yr, 0.5mi. threshold=200 (Loop ~426, Logan Square ~81).
    // Transit: highest monthly ridership of any L station within 0.5 miles, avg of 2-months-ago and same-month last year.
    const rideshareScore       = score5(rideshareCount, 1922);
    const bizScore             = parseFloat(
      (0.4 * score5(bizCount, 5000) + 0.6 * score5(highImpactBizCount, 350)).toFixed(1)
    );
    const ftScore              = score5(ftCount,        32000);
    const closureWeighted      = closureData.goodCount * 2 + (closureData.total - closureData.goodCount) * 0.1;
    const closureScore         = score5(closureWeighted, 25);
    const crimeScore           = crimeRateScore(crimeCount, ft6wCount);
    const permitScore          = scoreLog5(permitCount, PERMIT_THRESHOLD);
    const ctaScore             = ctaResult.score;
    const foodSafetyScore      = failedInspectionScore(failedInspectionCount);

    const propertySalesScore = propertySalesData ? (propertySalesData as PropertySalesResult).neighborhoodScore : 0;
    const parksScore         = parkAccessScore(nearbyParks, lakeMiDist);
    const totalScore = parseFloat((rideshareScore + bizScore + ftScore + closureScore + crimeScore + permitScore + ctaScore + foodSafetyScore + propertySalesScore + parksScore).toFixed(1));

    const result: LocationScoreResult = {
      address: displayName,
      lat,
      lng,
      totalScore,
      breakdown: {
        rideshare: {
          score: rideshareScore,
          count: rideshareCount,
          label: 'Rideshare Demand',
          emoji: '🚗',
          description: rideshareCount === 0
            ? 'No rideshare pickup data found nearby'
            : `${rideshareCount.toLocaleString()} pickups within 0.4 miles (10 AM–10 PM sample in ${rsDay.toLocaleString('default', { month: 'long', year: 'numeric' })})`,
        },
        business: {
          score: bizScore,
          count: bizCount,
          label: 'Business Activity',
          emoji: '🏪',
          description: bizCount === 0
            ? 'No active business licenses found in this area'
            : highImpactBizCount > 0
              ? `${bizCount.toLocaleString()} active businesses within 1 mile (${highImpactBizCount.toLocaleString()} dining, entertainment & hospitality)`
              : `${bizCount.toLocaleString()} active business${bizCount !== 1 ? 'es' : ''} within 1 mile`,
        },
        footTraffic: {
          score: ftScore,
          count: ftCount,
          label: 'Foot Traffic',
          emoji: '🚶',
          description: ftCount === 0
            ? 'No street activity data found in this area'
            : `${ftCount.toLocaleString()} 311 service requests within 1 mile in the past year`,
        },
        streetClosures: {
          score: closureScore,
          count: closureData.total,
          label: 'Street Closures',
          emoji: '🚧',
          description: closureData.total === 0
            ? 'No active street closure permits found within 1 mile'
            : closureData.goodCount > 0
              ? `${closureData.total} street closure permit${closureData.total !== 1 ? 's' : ''} within 0.5 miles (${closureData.goodCount} event-related)`
              : `${closureData.total} street closure permit${closureData.total !== 1 ? 's' : ''} within 0.5 miles (construction/utility work)`,
        },
        crime: {
          score: crimeScore,
          count: crimeCount,
          label: 'Crime Safety',
          emoji: '🔒',
          description: crimeCount === 0
            ? 'No reported incidents found within 0.5 miles in the last 6 weeks'
            : `${crimeCount.toLocaleString()} reported incident${crimeCount !== 1 ? 's' : ''} vs ${ft6wCount.toLocaleString()} local 311 calls within 0.5 miles (last 6 weeks)`,
        },
        development: {
          score: permitScore,
          count: permitCount,
          label: 'Development Activity',
          emoji: '🏗️',
          description: permitCount === 0
            ? 'No recent construction permits found within 0.5 miles'
            : `${permitCount.toLocaleString()} new-construction/renovation permit${permitCount !== 1 ? 's' : ''} within 0.5 mi (last 5 yrs)`,
        },
        transit: {
          score: ctaScore,
          count: ctaResult.avgMonthlyRides,
          label: 'Transit Access',
          emoji: '🚇',
          description: (() => {
            if (ctaResult.nearestStation == null) return 'No CTA L stations within 1 mile';
            const distMi = (ctaResult.nearestDistanceMeters / 1609).toFixed(2);
            const distNote = ctaResult.nearestDistanceMeters > CTA_NEAR_METERS ? ` — ${distMi} mi away` : '';
            const stationNote = ctaResult.stationCount > 1 ? ` (${ctaResult.stationCount} stations nearby)` : '';
            return `${ctaResult.nearestStation} — ${ctaResult.avgMonthlyRides.toLocaleString()} avg monthly riders${distNote}${stationNote}`;
          })(),
        },
        foodSafety: {
          score: foodSafetyScore,
          count: failedInspectionCount,
          label: 'Neighborhood Food Safety',
          emoji: '🍽️',
          description: failedInspectionCount === 0
            ? 'No failed food inspections found within 0.5 miles in the past 3 years'
            : `${failedInspectionCount} failed inspection${failedInspectionCount !== 1 ? 's' : ''} within 0.5 miles in the past 3 years`,
        },
        parks: (() => {
          const sorted = [...nearbyParks].sort((a, b) => {
            // rank by the same contribution formula used in scoring
            const contrib = (p: ParkRecord) =>
              Math.sqrt(Math.min(p.acres, PARK_ACREAGE_CAP) / PARK_ACREAGE_CAP) * (1 - p.distMeters / PARK_RADIUS_METERS);
            return contrib(b) - contrib(a);
          });
          const best = sorted[0] ?? null;
          const nearLake = lakeMiDist < 2000;

          let desc: string;
          if (!best) {
            desc = nearLake
              ? `No parks within 1 mile · Lake Michigan ${(lakeMiDist / 1609).toFixed(2)} mi away`
              : 'No parks found within 1 mile';
          } else {
            const distMi = (best.distMeters / 1609).toFixed(2);
            const countNote = nearbyParks.length > 1 ? ` · ${nearbyParks.length} parks nearby` : '';
            const lakeNote  = nearLake ? ` · Lake Michigan ${(lakeMiDist / 1609).toFixed(2)} mi away` : '';
            desc = `${best.name} (${Math.round(best.acres).toLocaleString()} acres) ${distMi} mi away${countNote}${lakeNote}`;
          }
          return {
            score: parksScore,
            count: nearbyParks.length,
            label: 'Outdoor & Green Space',
            emoji: '🌳',
            description: desc,
          };
        })(),
        propertySales: (() => {
          if (!propertySalesData) {
            return {
              score: 0,
              count: 0,
              label: 'Property Market',
              emoji: '🏠',
              description: 'Property market data unavailable for this area',
            };
          }
          const p = propertySalesData as PropertySalesResult;
          const parts: string[] = [p.propertyType];
          if (p.neighborhoodQualifyingCount > 0) {
            parts.push(`${p.neighborhoodQualifyingCount} sales in assessor nbhd (3 yr)`);
            if (p.neighborhoodMedianPrice != null) {
              parts.push(`median $${p.neighborhoodMedianPrice.toLocaleString()}`);
            }
          } else {
            parts.push('no qualifying sales in assessor neighborhood (past 3 yrs)');
          }
          const historicalSale = p.sales[0] ?? null;
          if (historicalSale?.saleDate) {
            const yr = historicalSale.saleDate.slice(0, 4);
            const price = historicalSale.salePrice != null ? ` at $${historicalSale.salePrice.toLocaleString()}` : '';
            parts.push(`parcel last sold ${yr}${price}`);
          }
          return {
            score: p.neighborhoodScore,
            count: p.neighborhoodQualifyingCount,
            label: 'Property Market',
            emoji: '🏠',
            description: parts.join(' · '),
          };
        })(),
      },
    };

    _timings._total = Date.now() - t0;
    res.json({ ...result, _timings });
  } catch (err: any) {
    console.error('[LocationScore] Error:', err?.message ?? err);
    res.status(500).json({ error: err.message || 'Failed to calculate location score' });
  }
});

export default router;
