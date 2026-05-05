import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

const COOK_BASE          = 'https://datacatalog.cookcountyil.gov/resource';
const PARCEL_UNIVERSE_ID = 'tx2p-k2g9'; // Assessor – Parcel Universe: address, PIN, class, nbhd
const PARCEL_SALES_ID    = 'wvhk-k5uv'; // Assessor – Parcel Sales

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PropertyClassInfo {
  broadType: string;
  label: string;
}

export interface ParcelSaleRow {
  pin: string;
  year: number | null;
  townshipCode: string;
  neighborhoodCode: string;
  propertyClass: string;
  saleDate: string | null;
  salePrice: number | null;
  deedType: string | null;
  mydecDeedType: string | null;
  sellerName: string | null;
  buyerName: string | null;
  isMultisale: boolean;
  numParcelsSale: number | null;
  saleType: string | null;
  isRecent: boolean;     // within the 3-year window
  isQualifying: boolean; // arm's-length AND within 3-year window
}

export interface PropertySalesResult {
  pin: string;
  resolvedAddress: string;
  propertyClass: string;
  propertyType: string;
  propertyBroadType: string;
  townshipCode: string;
  neighborhoodCode: string;
  neighborhoodScore: number;
  qualifyingSaleCount: number;
  neighborhoodQualifyingCount: number; // all qualifying sales in the assessor neighborhood (3 yr)
  neighborhoodMedianPrice: number | null;
  medianSalePrice: number | null;
  lastSaleDate: string | null;
  lastSalePrice: number | null;
  sales: ParcelSaleRow[];
}

// ─── Property class lookup ────────────────────────────────────────────────────

const CLASS_2_LABELS: Record<string, string> = {
  '200': 'Single-Family',
  '201': 'Townhouse',
  '202': 'Single-Family w/ Garage',
  '203': '2-Flat',
  '204': '3-Flat',
  '205': '4-Flat',
  '206': '5–6 Unit',
  '207': '7+ Unit',
  '208': 'Apartment Building',
  '210': 'Rooming House',
  '211': 'Mobile Home',
  '212': 'Nursing Home',
  '213': 'Senior Residential',
  '214': 'Condominium',
  '215': 'Condo Building',
  '216': 'Cooperative',
  '217': 'Row House / Townhome',
  '218': 'Mixed-Use (Residential)',
  '295': 'Residential Vacant Lot',
};

export function classifyProperty(classCode: string): PropertyClassInfo {
  const code = classCode?.trim() ?? '';
  const first = code.charAt(0);

  switch (first) {
    case '0':
      return { broadType: 'Exempt', label: 'Exempt' };
    case '1':
      return { broadType: 'Vacant Land', label: 'Vacant Land' };
    case '2': {
      const sub = CLASS_2_LABELS[code];
      return { broadType: 'Residential', label: sub ? `Residential – ${sub}` : 'Residential' };
    }
    case '3':
      return { broadType: 'Multi-unit Residential', label: 'Multi-unit Residential' };
    case '4':
      return { broadType: 'Non-profit / Institutional', label: 'Non-profit / Institutional' };
    case '5':
      return { broadType: 'Commercial', label: 'Commercial' };
    case '6':
      return { broadType: 'Industrial', label: 'Industrial / Manufacturing' };
    case '7':
    case '8':
    case '9':
      return { broadType: 'Special', label: 'Special / Incentive Class' };
    default:
      return { broadType: 'Unknown', label: 'Unknown' };
  }
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

// Kept for backward compatibility / tests — no longer used for scoring.
export function neighborhoodCodeScore(nbhd: string): number {
  if (!nbhd || nbhd.length < 3) return 0;
  const sub = parseInt(nbhd.slice(-3), 10);
  if (isNaN(sub)) return 0;
  return Math.round((sub / 999) * 5 * 10) / 10;
}

// Log scale on median sale price in the assessor neighborhood:
//   $50k → 0.0,  $200k → 2.5,  $500k → 4.2,  $800k+ → 5.0
// Volume (qualifyingCount) is only used as a confidence dampener: if < 5 sales,
// cap the score at qualifyingCount so thin data can't inflate the result.
function neighborhoodSalesScore(qualifyingCount: number, medianPrice: number | null): number {
  if (qualifyingCount === 0 || medianPrice == null) return 0;

  const logMin   = Math.log(50_000);
  const logMax   = Math.log(800_000);
  const logPrice = Math.log(Math.max(50_000, medianPrice));
  const raw      = ((logPrice - logMin) / (logMax - logMin)) * 5;
  const score    = Math.min(5, Math.round(raw * 10) / 10);

  return qualifyingCount < 5 ? Math.min(score, qualifyingCount) : score;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

// ─── Address normalization ────────────────────────────────────────────────────

// The Parcel Universe stores addresses as uppercase abbreviated strings
// (e.g. "219 W CHICAGO AVE"). Normalise user input to match.
const ABBREV_MAP: [RegExp, string][] = [
  [/\bAVENUE\b/gi,   'AVE'],
  [/\bSTREET\b/gi,   'ST'],
  [/\bBOULEVARD\b/gi,'BLVD'],
  [/\bDRIVE\b/gi,    'DR'],
  [/\bROAD\b/gi,     'RD'],
  [/\bCOURT\b/gi,    'CT'],
  [/\bPLACE\b/gi,    'PL'],
  [/\bLANE\b/gi,     'LN'],
  [/\bPARKWAY\b/gi,  'PKWY'],
  [/\bNORTH\b/gi,    'N'],
  [/\bSOUTH\b/gi,    'S'],
  [/\bEAST\b/gi,     'E'],
  [/\bWEST\b/gi,     'W'],
];

// Street-type abbreviations used in Cook County Parcel Universe addresses
const PARCEL_STREET_TYPES = new Set([
  'AVE', 'ST', 'BLVD', 'DR', 'RD', 'CT', 'PL', 'LN', 'PKWY',
  'WAY', 'TER', 'HWY', 'CIR', 'EXPY', 'LOOP', 'WALK', 'PATH',
]);

const DIRECTIONALS = new Set(['N', 'S', 'E', 'W']);

function normalizeAddressForSearch(raw: string): string {
  let addr = raw.split(',')[0].trim().toUpperCase();
  for (const [pattern, replacement] of ABBREV_MAP) {
    addr = addr.replace(pattern, replacement);
  }
  return addr.replace(/\s+/g, ' ').trim();
}

function escSoql(s: string): string {
  return s.replace(/'/g, "''");
}

// ─── Parcel Universe query helpers ───────────────────────────────────────────

async function cookCountyGet(resourceId: string, params: Record<string, string>): Promise<any> {
  const appToken = process.env.COOK_COUNTY_APP_TOKEN;

  const get = async (withToken: boolean) => {
    const p = { ...params };
    if (withToken && appToken) p['$$app_token'] = appToken;
    const { data } = await axios.get(`${COOK_BASE}/${resourceId}.json`, { params: p, timeout: 30000 });
    return data;
  };

  const logAndRethrow = (err: any, withToken: boolean) => {
    const status  = err?.response?.status;
    const body    = JSON.stringify(err?.response?.data ?? '(no body)');
    const url     = `${COOK_BASE}/${resourceId}.json`;
    const sentToken = withToken && !!appToken;
    console.error(
      `[PropertySales] HTTP ${status ?? 'ERR'} from ${url}` +
      ` | token=${sentToken} | params=${JSON.stringify(params)} | body=${body}`
    );
    throw err;
  };

  try {
    return await get(true);
  } catch (err: any) {
    if (err?.response?.status === 403 && appToken) {
      try {
        return await get(false);
      } catch (retryErr: any) {
        logAndRethrow(retryErr, false);
      }
    }
    logAndRethrow(err, true);
  }
}

async function queryParcelUniverse(where: string): Promise<any[]> {
  const data = await cookCountyGet(PARCEL_UNIVERSE_ID, {
    $where:  where,
    $select: 'pin,prop_address_full,class,nbhd_code,township_code',
    $order:  'year DESC',
    $limit:  '10',
  });
  return Array.isArray(data) ? data : [];
}

function deduplicateParcels(rows: any[]): any[] {
  const seen = new Set<string>();
  return rows.filter(r => {
    const p = r.pin?.toString().trim();
    if (!p || seen.has(p)) return false;
    seen.add(p);
    return true;
  });
}

// ─── Step 1: Address → PIN via Parcel Universe ────────────────────────────────

async function resolveAddressToPIN(address: string): Promise<{
  pin: string;
  propertyClass: string;
  neighborhoodCode: string;
  townshipCode: string;
  resolvedAddress: string;
}> {
  const normalized = normalizeAddressForSearch(address);

  // Parcel Universe stores addresses in uppercase already (e.g. "219 W CHICAGO AVE").
  // Do NOT wrap in upper() — it forces a full-table function scan and causes timeouts.
  // Strategy 1: exact normalized match
  let rows = await queryParcelUniverse(`prop_address_full LIKE '${escSoql(normalized)}%'`);

  // Strategy 2: drop trailing street-type abbreviation — catches alternate
  // encodings (AV vs AVE, missing suffix, etc.)
  if (rows.length === 0) {
    const parts = normalized.split(' ');
    if (PARCEL_STREET_TYPES.has(parts[parts.length - 1])) {
      const withoutType = parts.slice(0, -1).join(' ');
      rows = await queryParcelUniverse(`prop_address_full LIKE '${escSoql(withoutType)}%'`);
    }
  }

  if (rows.length === 0) {
    throw Object.assign(
      new Error('No parcel found for this address in Cook County.'),
      { status: 404 },
    );
  }

  const unique  = deduplicateParcels(rows);
  const parcel  = unique[0];
  return {
    pin:              parcel.pin.toString().trim(),
    propertyClass:    (parcel.class         ?? '').toString().trim(),
    neighborhoodCode: (parcel.nbhd_code     ?? '').toString().trim(),
    townshipCode:     (parcel.township_code ?? '').toString().trim(),
    resolvedAddress:  (parcel.prop_address_full ?? address).toString().trim(),
  };
}

// ─── Step 1b: Neighborhood fallback via block search ─────────────────────────
// When no parcel is found for the exact address, find any parcel on the same
// block to infer the assessor neighborhood code. That's enough to compute the
// neighborhood-level property market score.

async function findNeighborhoodByBlock(
  normalized: string,
): Promise<{ nbhdCode: string; townshipCode: string } | null> {
  const words = normalized.split(' ');
  if (words.length < 2) return null;

  const houseNum = parseInt(words[0], 10);
  if (isNaN(houseNum)) return null;

  // Determine where the street name begins (after house number + optional directional)
  let nameStart = 1;
  if (words.length > 2 && DIRECTIONALS.has(words[1])) nameStart = 2;

  // Strip trailing street type from the name words
  let nameWords = words.slice(nameStart);
  if (nameWords.length > 1 && PARCEL_STREET_TYPES.has(nameWords[nameWords.length - 1])) {
    nameWords = nameWords.slice(0, -1);
  }
  if (nameWords.length === 0) return null;

  const streetName  = nameWords.join(' ');
  const blockPrefix = Math.floor(houseNum / 100) * 100;
  const dirPart     = nameStart === 2 ? `${words[1]} ` : '';

  // Range query covers all parcels in the same city block (e.g. 600–699 W DIVERSEY).
  // Both bounds anchor at the start so Socrata can use the column index — avoids the
  // full-table scan caused by an unanchored leading-wildcard LIKE '% STREETNAME%'.
  const loStr = `${blockPrefix} ${dirPart}${streetName}`;
  const hiStr = `${blockPrefix + 100} ${dirPart}${streetName}`;

  try {
    const data = await cookCountyGet(PARCEL_UNIVERSE_ID, {
      $where:  `prop_address_full >= '${escSoql(loStr)}' AND prop_address_full < '${escSoql(hiStr)}'`,
      $select: 'prop_address_full,nbhd_code,township_code',
      $limit:  '10',
    });

    if (!Array.isArray(data) || data.length === 0) return null;

    // Pick the parcel whose house number is closest to the target
    const candidates = (data as any[])
      .map(r => ({ r, num: parseInt((r.prop_address_full ?? '').split(' ')[0], 10) }))
      .filter(({ num, r }) => !isNaN(num) && r.nbhd_code);

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => Math.abs(a.num - houseNum) - Math.abs(b.num - houseNum));
    const { r } = candidates[0];
    return { nbhdCode: r.nbhd_code, townshipCode: r.township_code ?? '' };
  } catch {
    return null;
  }
}

// ─── Step 2: PIN → Parcel Sales ───────────────────────────────────────────────

async function fetchParcelSales(pin: string, cutoffISO: string): Promise<ParcelSaleRow[]> {
  // Fetch all-time most recent sales (no date filter) so historical data is visible
  // when a parcel hasn't transacted in the past 3 years. isRecent / isQualifying
  // are computed in code against cutoffISO.
  const data = await cookCountyGet(PARCEL_SALES_ID, {
    $where:  `pin='${pin}'`,
    $select: 'pin,year,township_code,nbhd,class,sale_date,sale_price,deed_type,' +
             'mydec_deed_type,seller_name,buyer_name,is_multisale,num_parcels_sale,' +
             'sale_type,sale_filter_less_than_10k,sale_filter_deed_type',
    $order:  'sale_date DESC',
    $limit:  '10',
  });

  if (!Array.isArray(data)) return [];

  return data.map((r: any): ParcelSaleRow => {
    const filterPrice = r.sale_filter_less_than_10k === true || r.sale_filter_less_than_10k === 'true';
    const filterDeed  = r.sale_filter_deed_type === true || r.sale_filter_deed_type === 'true';
    const saleDate    = r.sale_date ?? null;
    const isRecent    = saleDate != null && saleDate >= cutoffISO;

    return {
      pin:              r.pin ?? pin,
      year:             r.year != null ? Number(r.year) : null,
      townshipCode:     r.township_code ?? '',
      neighborhoodCode: r.nbhd ?? '',
      propertyClass:    r.class ?? '',
      saleDate,
      salePrice:        r.sale_price != null ? Number(r.sale_price) : null,
      deedType:         r.deed_type ?? null,
      mydecDeedType:    r.mydec_deed_type ?? null,
      sellerName:       r.seller_name ?? null,
      buyerName:        r.buyer_name ?? null,
      isMultisale:      r.is_multisale === true || r.is_multisale === 'true',
      numParcelsSale:   r.num_parcels_sale != null ? Number(r.num_parcels_sale) : null,
      saleType:         r.sale_type ?? null,
      isRecent,
      isQualifying:     isRecent && !filterPrice && !filterDeed,
    };
  });
}

// ─── Step 3: Neighborhood-level sales (0.5-mile proxy via assessor nbhd code) ─

async function fetchNeighborhoodSales(
  nbhd: string,
  cutoffISO: string,
  classPrefix: string | null,
): Promise<{ qualifyingCount: number; medianPrice: number | null }> {
  if (!nbhd) return { qualifyingCount: 0, medianPrice: null };

  // Filter to same broad property class (no commercial contamination) and exclude
  // multi-parcel sales (whole-building and portfolio transactions that are orders of
  // magnitude larger than individual unit sales and would skew the median).
  const classClause = classPrefix ? ` AND class LIKE '${classPrefix}%'` : '';

  let data: any;
  try {
    data = await cookCountyGet(PARCEL_SALES_ID, {
      $where:  `nbhd='${nbhd}' AND sale_date >= '${cutoffISO}' AND is_multisale=false${classClause}`,
      $select: 'sale_price,sale_filter_less_than_10k,sale_filter_deed_type',
      $order:  'sale_date DESC',
      $limit:  '1000',
    });
  } catch (err: any) {
    // Cook County API intermittently returns 500 on neighborhood sales queries.
    // Return empty rather than failing the whole location score request.
    console.error('[PropertySales] Neighborhood sales query failed, using empty fallback:', err?.message ?? err);
    return { qualifyingCount: 0, medianPrice: null };
  }

  if (!Array.isArray(data)) return { qualifyingCount: 0, medianPrice: null };

  const qualifying = (data as any[]).filter(r => {
    const filterPrice = r.sale_filter_less_than_10k === true || r.sale_filter_less_than_10k === 'true';
    const filterDeed  = r.sale_filter_deed_type === true || r.sale_filter_deed_type === 'true';
    return !filterPrice && !filterDeed;
  });

  const prices = qualifying
    .map((r: any) => r.sale_price != null ? Number(r.sale_price) : null)
    .filter((p): p is number => p != null && p > 0);

  return { qualifyingCount: qualifying.length, medianPrice: median(prices) };
}

// ─── Shared business logic (also used by locationScore) ──────────────────────

export async function getPropertySalesData(address: string): Promise<PropertySalesResult> {
  let pin: string;
  let classCode: string;
  let nbhd: string;
  let township: string;
  let resolvedAddress: string;
  let isPartial = false;

  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  const cutoffISO = threeYearsAgo.toISOString().split('T')[0];

  try {
    const parcelData = await resolveAddressToPIN(address);
    pin             = parcelData.pin;
    classCode       = parcelData.propertyClass;
    nbhd            = parcelData.neighborhoodCode;
    township        = parcelData.townshipCode;
    resolvedAddress = parcelData.resolvedAddress;
  } catch (err: any) {
    if (err?.status !== 404) throw err;

    // No parcel found by address — infer nbhd_code from nearest parcel on the same block
    const normalized = normalizeAddressForSearch(address);
    const nbhdData   = await findNeighborhoodByBlock(normalized);
    if (!nbhdData) throw err; // no fallback available, surface the original error

    isPartial       = true;
    pin             = '';
    classCode       = '';
    nbhd            = nbhdData.nbhdCode;
    township        = nbhdData.townshipCode;
    resolvedAddress = address.split(',')[0].trim();
  }

  // Run PIN-specific sales (skipped for partial) and neighborhood-level sales in parallel.
  // classPrefix scopes the neighborhood query to the same broad type (e.g. '2' = residential)
  // so commercial or whole-building sales don't contaminate a residential median.
  const classPrefix = classCode ? classCode.trim().charAt(0) : null;
  const [sales, nbhdStats] = await Promise.all([
    isPartial ? Promise.resolve([]) : fetchParcelSales(pin, cutoffISO),
    fetchNeighborhoodSales(nbhd, cutoffISO, classPrefix),
  ]);

  const finalNbhd     = nbhd     || sales[0]?.neighborhoodCode || '';
  const finalTownship = township  || sales[0]?.townshipCode     || '';
  const finalClass    = classCode || sales[0]?.propertyClass    || '';

  const { broadType, label } = classifyProperty(finalClass);
  const nbhdScore = neighborhoodSalesScore(nbhdStats.qualifyingCount, nbhdStats.medianPrice);

  const qualifying = sales.filter(s => s.isQualifying);
  const prices     = qualifying.map(s => s.salePrice).filter((p): p is number => p != null);
  const last       = qualifying[0] ?? null;

  console.log(
    `[PropertySales] ${resolvedAddress}${isPartial ? ' (neighborhood-only)' : ''} | pin=${pin || 'N/A'} class=${finalClass || 'N/A'} nbhd=${finalNbhd}` +
    ` nbhdScore=${nbhdScore} nbhdQualifying=${nbhdStats.qualifyingCount} medianNbhd=${nbhdStats.medianPrice}` +
    `${!isPartial ? ` pinQualifying=${qualifying.length} totalRows=${sales.length}` : ''}`
  );

  return {
    pin,
    resolvedAddress,
    propertyClass:              finalClass,
    propertyType:               isPartial ? 'Neighborhood Average' : label,
    propertyBroadType:          isPartial ? '' : broadType,
    townshipCode:               finalTownship,
    neighborhoodCode:           finalNbhd,
    neighborhoodScore:          nbhdScore,
    qualifyingSaleCount:        qualifying.length,
    neighborhoodQualifyingCount: nbhdStats.qualifyingCount,
    neighborhoodMedianPrice:    nbhdStats.medianPrice,
    medianSalePrice:            median(prices),
    lastSaleDate:               last?.saleDate ?? null,
    lastSalePrice:              last?.salePrice ?? null,
    sales,
  };
}

// ─── Route ────────────────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  const { address } = req.body as { address?: string };
  if (!address?.trim()) {
    return res.status(400).json({ error: 'address is required' });
  }

  try {
    const result = await getPropertySalesData(address.trim());
    res.json(result);
  } catch (err: any) {
    const httpStatus = err?.response?.status;
    const socrataMsg = err?.response?.data?.message ?? err?.response?.data ?? '';
    console.error(
      `[PropertySales] Failed for "${address}" —`,
      httpStatus ? `HTTP ${httpStatus}: ${socrataMsg || err.message}` : (err?.message ?? err)
    );
    const status = typeof err?.status === 'number' ? err.status : (httpStatus ?? 500);
    res.status(status).json({ error: err.message || 'Failed to fetch property sales data' });
  }
});

export default router;
