/**
 * QA / Performance test runner — Chicago Streetwise Location Score API
 * Runs 5 requests per address (10 addresses = 50 total) and writes a markdown report.
 */

import { writeFileSync } from 'fs';

const API = 'http://localhost:3000';
const RUNS = 5;
const DELAY_MS = 1500; // pause between calls to avoid hammering Socrata

const addresses = [
  { label: "Ranalli's Lincoln Park", address: "1925 N Lincoln Ave, Chicago, IL 60614",    category: "Restaurant" },
  { label: "YooYee",                  address: "4925 N Broadway, Chicago, IL",              category: "Restaurant" },
  { label: "Lottie's",                address: "1925 W Cortland St, Chicago, IL 60622",    category: "Bar" },
  { label: "Old Crow",                address: "3506 N Clark St, Chicago, IL 60657",        category: "Bar" },
  { label: "Art Effect",              address: "934 W Armitage Ave, Chicago, IL 60614",     category: "Retail" },
  { label: "Nordstrom Rack",          address: "24 N State St, Chicago, IL 60602",          category: "Retail" },
  { label: "Epsilon",                 address: "35 W Wacker Drive, Chicago, IL",            category: "Office" },
  { label: "Convexitas",              address: "444 W Lake Street, Chicago, IL 60661",      category: "Office" },
  { label: "2970 N Lake Shore Dr",    address: "2970 N Lake Shore Drive, Chicago, IL",      category: "Housing" },
  { label: "4953 N Seeley Ave",       address: "4953 N Seeley Ave, Chicago, IL 60625",      category: "Housing" },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function callLocationScore(address, runNum) {
  const wallStart = Date.now();
  try {
    const res = await fetch(`${API}/api/location-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
      signal: AbortSignal.timeout(65000),
    });
    const wallMs = Date.now() - wallStart;
    const data = await res.json();
    return {
      run: runNum,
      ok: res.ok,
      httpStatus: res.status,
      wallMs,
      totalScore: data.totalScore ?? null,
      breakdown: data.breakdown ?? {},
      timings: data._timings ?? {},
      error: res.ok ? null : (data.error ?? `HTTP ${res.status}`),
    };
  } catch (err) {
    return {
      run: runNum,
      ok: false,
      httpStatus: 0,
      wallMs: Date.now() - wallStart,
      totalScore: null,
      breakdown: {},
      timings: {},
      error: err.message,
    };
  }
}

function avg(arr) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}
function minOf(arr) { return arr.length ? Math.min(...arr) : 0; }
function maxOf(arr) { return arr.length ? Math.max(...arr) : 0; }
function pct(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil(p / 100 * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ── Run all tests ──────────────────────────────────────────────────────────────

console.log(`\nChicago Streetwise QA — ${addresses.length} addresses × ${RUNS} runs = ${addresses.length * RUNS} total calls\n`);
console.log('─'.repeat(70));

const allResults = [];

for (const addr of addresses) {
  console.log(`\n▶  ${addr.label} (${addr.category})`);
  console.log(`   ${addr.address}`);
  const runs = [];
  for (let i = 1; i <= RUNS; i++) {
    process.stdout.write(`   Run ${i}/${RUNS} ... `);
    const r = await callLocationScore(addr.address, i);
    runs.push(r);
    const icon = r.ok ? '✓' : '✗';
    const scoreStr = r.totalScore != null ? `score=${r.totalScore}/50` : 'score=ERR';
    const timeStr = `${r.wallMs}ms`;
    console.log(`${icon}  ${timeStr.padStart(6)}  ${scoreStr}`);
    if (r.error) console.log(`         ⚠  ${r.error}`);
    if (i < RUNS) await sleep(DELAY_MS);
  }
  allResults.push({ ...addr, runs });
  if (addr !== addresses[addresses.length - 1]) await sleep(DELAY_MS);
}

console.log('\n\n' + '─'.repeat(70));
console.log('All calls complete. Writing report...');

// ── Build report ───────────────────────────────────────────────────────────────

const now = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'long', timeStyle: 'short' });

const SUBREQ_LABELS = {
  rideshare:       'Rideshare (Socrata)',
  bizTotal:        'Business Total (Socrata)',
  bizHighImpact:   'Business High-Impact (Socrata)',
  footTraffic:     'Foot Traffic 1yr (Socrata)',
  streetClosures:  'Street Closures (Socrata)',
  crime:           'Crime 6wk (Socrata)',
  footTraffic6w:   'Foot Traffic 6wk (Socrata)',
  permits:         'Building Permits (Socrata)',
  cta:             'CTA Score (Socrata)',
  foodInspections: 'Food Inspections (Socrata)',
  propertySales:   'Property Sales (Cook County)',
  parks:           'Parks (OpenStreetMap)',
  _total:          'TOTAL server time',
};

const SCORE_KEYS = [
  ['rideshare',      'Rideshare'],
  ['business',       'Business'],
  ['footTraffic',    'Foot Traffic'],
  ['streetClosures', 'Street Closures'],
  ['crimeSafety',    'Crime Safety'],
  ['development',    'Development'],
  ['transitAccess',  'Transit'],
  ['foodSafety',     'Food Safety'],
  ['outdoorSpace',   'Outdoor & Green'],
  ['propertyMarket', 'Property Market'],
];

const lines = [];
const p = (...args) => lines.push(args.join(''));

p(`# Chicago Streetwise — QA Performance Report`);
p(`\n_Generated: ${now}_`);
p(`\n---`);

// ── 1. Executive Summary ──────────────────────────────────────────────────────
p(`\n## 1. Executive Summary\n`);
p(`${RUNS} runs × ${addresses.length} addresses = **${RUNS * addresses.length} total API calls**\n`);

const allWalls = allResults.flatMap(r => r.runs.filter(x => x.ok).map(x => x.wallMs));
const failures = allResults.flatMap(r => r.runs.filter(x => !x.ok));

p(`| Metric | Value |`);
p(`|---|---|`);
p(`| Total calls | ${RUNS * addresses.length} |`);
p(`| Successful | ${RUNS * addresses.length - failures.length} |`);
p(`| Failed | ${failures.length} |`);
p(`| Avg response time | ${avg(allWalls)} ms |`);
p(`| Min response time | ${minOf(allWalls)} ms |`);
p(`| Max response time | ${maxOf(allWalls)} ms |`);
p(`| p50 response time | ${pct(allWalls, 50)} ms |`);
p(`| p90 response time | ${pct(allWalls, 90)} ms |`);
p(`| p95 response time | ${pct(allWalls, 95)} ms |`);

// ── 2. Score Summary ──────────────────────────────────────────────────────────
p(`\n---\n## 2. Score Summary (avg over ${RUNS} runs)\n`);
p(`| # | Location | Category | Avg Score /50 | Min | Max | Std Dev | Avg Time |`);
p(`|---|---|---|---|---|---|---|---|`);
for (const [i, r] of allResults.entries()) {
  const okRuns = r.runs.filter(x => x.ok && x.totalScore != null);
  const scores = okRuns.map(x => x.totalScore);
  const avgScore = scores.length ? (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1) : 'ERR';
  const minScore = scores.length ? Math.min(...scores).toFixed(1) : '—';
  const maxScore = scores.length ? Math.max(...scores).toFixed(1) : '—';
  const mean = scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : 0;
  const stdDev = scores.length > 1
    ? Math.sqrt(scores.reduce((a,b)=>a+(b-mean)**2,0)/(scores.length-1)).toFixed(2)
    : '0.00';
  const times = okRuns.map(x => x.wallMs);
  const avgTime = times.length ? avg(times) + ' ms' : '—';
  p(`| ${i+1} | **${r.label}** | ${r.category} | ${avgScore} | ${minScore} | ${maxScore} | ±${stdDev} | ${avgTime} |`);
}

// ── 3. Per-Address Detail ─────────────────────────────────────────────────────
p(`\n---\n## 3. Per-Address Detail\n`);

for (const r of allResults) {
  p(`\n### ${r.label} — ${r.category}`);
  p(`\n_${r.address}_\n`);

  // Run-by-run table
  p(`#### Run-by-run Results\n`);
  p(`| Run | Score /50 | Wall Time | Status |`);
  p(`|---|---|---|---|`);
  for (const run of r.runs) {
    const score = run.totalScore != null ? run.totalScore : '—';
    const status = run.ok ? '✅ OK' : `❌ ${run.error ?? 'failed'}`;
    p(`| ${run.run} | ${score} | ${run.wallMs} ms | ${status} |`);
  }

  // Category scores (from run 1 if available, or first ok run)
  const firstOk = r.runs.find(x => x.ok && Object.keys(x.breakdown).length > 0);
  if (firstOk) {
    p(`\n#### Category Scores (Run ${firstOk.run})\n`);
    p(`| Category | Score /5 | Description |`);
    p(`|---|---|---|`);
    for (const [key, label] of SCORE_KEYS) {
      const cat = firstOk.breakdown[key];
      if (!cat) continue;
      const desc = (cat.description ?? '').replace(/\|/g, '\\|').substring(0, 90);
      p(`| ${label} | **${cat.score ?? '—'}** | ${desc} |`);
    }
  }

  // Sub-request timing (avg across ok runs that have timings)
  const runsWithTimings = r.runs.filter(x => x.ok && Object.keys(x.timings).length > 0);
  if (runsWithTimings.length > 0) {
    const timingKeys = Object.keys(SUBREQ_LABELS);
    p(`\n#### Sub-request Timing (ms, all ${RUNS} runs)\n`);
    const header = `| Sub-request | ${r.runs.map((_,i)=>`Run ${i+1}`).join(' | ')} | Avg |`;
    const sep    = `|---|${r.runs.map(()=>'---').join('|')}|---|`;
    p(header);
    p(sep);
    for (const key of timingKeys) {
      const label = SUBREQ_LABELS[key];
      const vals  = r.runs.map(run => run.timings[key] != null ? run.timings[key] : null);
      const defined = vals.filter(v => v != null);
      const avgVal  = defined.length ? Math.round(defined.reduce((a,b)=>a+b,0)/defined.length) : null;
      const cells   = vals.map(v => v != null ? `${v}` : '—').join(' | ');
      const avgCell = avgVal != null ? `**${avgVal}**` : '—';
      p(`| ${label} | ${cells} | ${avgCell} |`);
    }
  }

  p('\n---');
}

// ── 4. Sub-request Timing Heatmap ─────────────────────────────────────────────
p(`\n## 4. Sub-request Timing — Cross-Address Summary (avg ms)\n`);
p(`_Values are the average across ${RUNS} runs. "—" = not available or timed out._\n`);

const timingKeys = Object.keys(SUBREQ_LABELS);
const hHeader = `| Sub-request | ${allResults.map(r => r.label.split(' ').slice(0,2).join(' ')).join(' | ')} |`;
const hSep    = `|---|${allResults.map(() => '---').join('|')}|`;
p(hHeader);
p(hSep);

for (const key of timingKeys) {
  const cells = allResults.map(r => {
    const vals = r.runs.map(run => run.timings[key]).filter(v => v != null);
    return vals.length ? `${Math.round(vals.reduce((a,b)=>a+b,0)/vals.length)}` : '—';
  }).join(' | ');
  p(`| ${SUBREQ_LABELS[key]} | ${cells} |`);
}

// ── 5. Failure Log ────────────────────────────────────────────────────────────
if (failures.length > 0) {
  p(`\n---\n## 5. Failure Log\n`);
  p(`| Location | Run | Error |`);
  p(`|---|---|---|`);
  for (const r of allResults) {
    for (const run of r.runs.filter(x => !x.ok)) {
      p(`| ${r.label} | ${run.run} | ${run.error ?? 'unknown'} |`);
    }
  }
} else {
  p(`\n---\n## 5. Failure Log\n`);
  p(`No failures. All ${RUNS * addresses.length} calls succeeded. ✅`);
}

// ── 6. Slowest Calls ─────────────────────────────────────────────────────────
p(`\n---\n## 6. Slowest Individual Calls\n`);
const allCallFlat = allResults.flatMap(r =>
  r.runs.filter(x => x.ok).map(x => ({ label: r.label, run: x.run, wallMs: x.wallMs, score: x.totalScore }))
).sort((a, b) => b.wallMs - a.wallMs).slice(0, 10);

p(`| Rank | Location | Run | Wall Time | Score |`);
p(`|---|---|---|---|---|`);
allCallFlat.forEach((c, i) => {
  p(`| ${i+1} | ${c.label} | ${c.run} | ${c.wallMs} ms | ${c.score} |`);
});

// ── Write file ────────────────────────────────────────────────────────────────
const reportPath = './qa-report.md';
writeFileSync(reportPath, lines.join('\n'));
writeFileSync('./qa-results.json', JSON.stringify(allResults, null, 2));

console.log(`\nReport written to: ${reportPath}`);
console.log(`Raw JSON written to: qa-results.json`);
console.log(`\n${'─'.repeat(70)}`);
console.log(`Summary:`);
console.log(`  Calls: ${RUNS * addresses.length} | Failures: ${failures.length} | Avg time: ${avg(allWalls)}ms | p90: ${pct(allWalls, 90)}ms`);
