import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();
const SODA_BASE = 'https://data.cityofchicago.org/resource';

export interface Candidate {
  lat: number;
  lng: number;
  name: string;
  address: string;
}

function inChicago(lat: number, lng: number): boolean {
  return lat >= 41.64 && lat <= 42.02 && lng >= -87.94 && lng <= -87.52;
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

// Returns true if two candidates are within ~80m of each other (same place)
function isDuplicate(a: Candidate, b: Candidate): boolean {
  return Math.abs(a.lat - b.lat) < 0.0007 && Math.abs(a.lng - b.lng) < 0.001;
}

function dedup(candidates: Candidate[]): Candidate[] {
  return candidates.filter((c, i) =>
    !candidates.slice(0, i).some(prev => isDuplicate(prev, c))
  );
}

function shortAddressFromNominatim(r: any): string {
  const a = r.address ?? {};
  const parts = [
    a.house_number && a.road ? `${a.house_number} ${titleCase(a.road)}` : null,
    a.neighbourhood || a.suburb || a.quarter || a.city_district
      ? titleCase(a.neighbourhood ?? a.suburb ?? a.quarter ?? a.city_district ?? '')
      : null,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : r.display_name.split(',').slice(0, 2).join(',').trim();
}

async function nominatimSearch(q: string): Promise<Candidate[]> {
  const query = /chicago/i.test(q) ? q : `${q}, Chicago, IL`;
  const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { format: 'json', q: query, limit: 5, addressdetails: 1 },
    headers: { 'User-Agent': 'ChicagoLocationIntelligence/1.0 (open-source)' },
    timeout: 15000,
  });
  if (!Array.isArray(data)) return [];
  return data
    .filter(r => inChicago(parseFloat(r.lat), parseFloat(r.lon)))
    .map(r => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      name: (r.name?.trim() || r.display_name.split(',')[0].trim()),
      address: shortAddressFromNominatim(r),
    }));
}

// Chicago neighborhood names and street-type words to strip before name matching
const NEIGHBORHOOD_WORDS = new Set([
  'andersonville','armour square','auburn gresham','austin','avalon park','avondale',
  'belmont cragin','beverly','bridgeport','brighton park','bronzeville','bucktown',
  'burnside','calumet heights','chatham','chicago lawn','chinatown','clearing',
  'douglas','dunning','east garfield park','east side','edgewater','edison park',
  'englewood','far north side','far southeast side','far southwest side','forest glen',
  'fuller park','fulton market','gage park','garfield ridge','gold coast','grand boulevard',
  'grand crossing','greater grand crossing','hegewisch','hermosa','humboldt park',
  'hyde park','irving park','jefferson park','kenwood','lincoln park','lincoln square',
  'little italy','little village','logan square','loop','lower west side','mckinley park',
  'montclare','morgan park','mount greenwood','near north','near north side','near south side',
  'near west side','new city','noble square','north center','north lawndale','north park',
  'norwood park','oakland','old town','portage park','pullman','ravenswood','river north',
  'riverdale','rogers park','roseland','roscoe village','south chicago','south deering',
  'south loop','south lawndale','south shore','streeterville','ukrainian village','uptown',
  'washington heights','washington park','west elsdon','west englewood','west garfield park',
  'west lawn','west loop','west pullman','west ridge','west rogers park','west town',
  'wicker park','woodlawn','wrigleyville','lakeview','lake view','boystown','pilsen',
  'back of the yards',
]);

const STREET_WORDS = new Set([
  'street','st','avenue','ave','boulevard','blvd','road','rd','drive','dr',
  'way','place','pl','court','ct','lane','ln','parkway','pkwy','highway','hwy',
  'north','south','east','west',
]);

function extractBizTerms(q: string): string[] {
  return q
    .toLowerCase()
    // Remove punctuation except spaces, keep letters/numbers
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2)
    .filter(w => !NEIGHBORHOOD_WORDS.has(w))
    .filter(w => !STREET_WORDS.has(w))
    .filter(w => !/^\d+$/.test(w))            // drop standalone numbers
    .filter(w => !['chicago','il','illinois','the','and','of','at','in','near'].includes(w));
}

async function bizNameSearch(q: string): Promise<Candidate[]> {
  const words = extractBizTerms(q);
  if (words.length === 0) return [];

  // Build an explicit LIKE per significant word on the DBA name field.
  // This handles hyphens and punctuation differences (e.g. SUSHI-SAN matches %SUSHI% + %SAN%).
  const likeConditions = words
    .map(w => `upper(doing_business_as_name) like '%${w.toUpperCase()}%'`)
    .join(' AND ');

  try {
    const appToken = process.env.CHICAGO_DATA_APP_TOKEN;
    const params: Record<string, string> = {
      $where: `license_status='AAI' AND latitude IS NOT NULL AND (${likeConditions})`,
      $select: 'doing_business_as_name,address,latitude,longitude',
      $limit: '10',
    };
    if (appToken) params['$$app_token'] = appToken;

    const { data } = await axios.get(`${SODA_BASE}/uupf-x98q.json`, {
      params,
      timeout: 20000,
    });
    if (!Array.isArray(data)) return [];
    return data
      .filter(r => r.latitude && r.longitude)
      .map(r => ({
        lat: parseFloat(r.latitude),
        lng: parseFloat(r.longitude),
        name: titleCase(r.doing_business_as_name ?? ''),
        address: titleCase(r.address ?? ''),
      }))
      .filter(c => inChicago(c.lat, c.lng) && c.name);
  } catch {
    return [];
  }
}

router.get('/', async (req: Request, res: Response) => {
  const q = (req.query.q as string)?.trim();
  if (!q) return res.status(400).json({ error: 'Query is required' });

  try {
    const [nomResults, bizResults] = await Promise.all([
      nominatimSearch(q),
      bizNameSearch(q),
    ]);

    // Nominatim results first (generally more precise), then biz-license fills gaps
    const merged = dedup([...nomResults, ...bizResults]);

    if (merged.length === 0) {
      return res.status(404).json({
        error: 'No Chicago locations found. Try a full address or add a neighborhood name.',
      });
    }

    res.json({ candidates: merged });
  } catch (err: any) {
    console.error('[LocationResolve] Error:', err?.message ?? err);
    res.status(500).json({ error: 'Failed to resolve location' });
  }
});

export default router;
