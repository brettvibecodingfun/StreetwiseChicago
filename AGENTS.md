# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Development Commands

**Run both backend and frontend together (from repo root):**
```bash
npm start
```

**Backend only** (Express on port 3000):
```bash
npm --prefix backend run dev
```

**Frontend only** (Angular on port 4200):
```bash
npm --prefix frontend run start
```

**Build backend:**
```bash
npm --prefix backend run build
```

**Run backend tests (Jest):**
```bash
npm --prefix backend test
```

**Run a single backend test file:**
```bash
cd backend && npx jest src/routes/locationScore.test.ts
```

**Run frontend tests (Karma/Jasmine):**
```bash
npm --prefix frontend run test
```

## Environment Setup

Copy `backend/.env.example` to `backend/.env` and fill in:
- `ANTHROPIC_API_KEY` — required for the Chat and Analysis features
- `CHICAGO_DATA_APP_TOKEN` — optional but recommended; increases Socrata API rate limits
- `PORT` — defaults to 3000

## Architecture

This is a monorepo with a TypeScript Express backend and an Angular 18 frontend.

### Backend (`backend/src/`)

Entry point: `index.ts` registers six Express routers:

| Route | File | Purpose |
|---|---|---|
| `GET /api/restaurants/failed` | `routes/restaurants.ts` | Raw failed inspections from Socrata |
| `GET /api/analysis/violations-summary` | `routes/analysis.ts` | Codex AI summary of recent violation themes |
| `POST /api/query` | `routes/query.ts` | Two-step AI: NL→structured query, fetch Socrata, stream SSE response |
| `GET /api/map/inspections` | `routes/map.ts` | Map-ready inspection records with lat/lng, supports many filters |
| `GET /api/location-resolve` | `routes/locationResolve.ts` | Geocodes an address via Nominatim + Chicago business license search |
| `POST /api/location-score` | `routes/locationScore.ts` | Scores a lat/lng on 5 city-data dimensions (0–25 total) |

**Chicago Socrata dataset IDs used:**
- `4ijn-s7e5` — Food Inspections
- `uupf-x98q` — Business Licenses
- `v6vf-nfxy` — 311 Service Requests (foot traffic proxy)
- `jdis-5sry` — Street Closure Permits
- `ijzp-q8t2` — Crimes
- `6dvr-xwnh` — Rideshare Trips

**`/api/query` SSE flow:** Codex parses the user's question into a structured `InspectionQuery` using tool use (`build_inspection_query`), the backend fetches matching records from Socrata, then streams a formatted Codex response as SSE events (`meta` → `chunk`... → `done`).

**Location Score** (`locationScore.ts`): Five categories each scored 0–5 via exported `score5()` (sqrt-scale) and `crimeRateScore()` (linear decay on crimes/311-calls ratio). These pure functions are unit-tested in `locationScore.test.ts`.

### Frontend (`frontend/src/app/`)

Angular 18 standalone components — no NgModules. The root `AppComponent` manages a three-tab layout:

- **Chat tab** (`chat/`) — Sends questions to `/api/query` and streams the SSE response into a chat bubble using the native Fetch API + `ReadableStream`. If the message contains "summary", it calls `/api/analysis/violations-summary` instead. `NgZone.run()` is required to trigger Angular change detection from the SSE reader callbacks.
- **Map tab** (`map/`) — Leaflet map of inspection locations. `zip-neighborhoods.ts` contains a static zip-to-neighborhood name mapping.
- **Location Score tab** (`location/`) — Two-step flow: resolve address to candidates via `/api/location-resolve`, then POST selected candidate to `/api/location-score`. Displays a circular gauge (SVG) and per-category bar chart.

The backend API URL is configured in `frontend/src/environments/environment.ts` (defaults to `http://localhost:3000`).
