# API Drift Observatory — Developer Document

## What I Built

API Drift Observatory is a full-stack tool that monitors REST API endpoints on a configurable schedule, detects when their response shape changes over time (schema drift), and alerts me when the live API response no longer matches a TypeScript interface I registered against it (contract violation).

The problem it solves: when a backend team changes an API response — adding, removing, or renaming fields — frontend clients break silently. This tool catches those changes proactively before they cause runtime bugs.

### Two types of detection

**Schema Drift** — compares the current response shape against the last saved snapshot. If a field was added, removed, or changed type, a DRIFT alert is raised.

**Contract Violation** — if I register a TypeScript interface for an endpoint, the poller compares every poll result against that interface. If the live API is missing a field my interface expects, or has a type mismatch, a CONTRACT_VIOLATION alert is raised. This is independent of drift — the API doesn't have to change for a contract violation to be detected.

---

## Architecture Overview

```
Frontend (React)  →  Backend (Express)  →  PostgreSQL (Supabase)
                          ↑
                    node-cron poller
                    (runs inside Express process,
                     polls endpoints on schedule)
```

The backend is a single Express server that does two jobs simultaneously:
1. Serves the REST API (auth, endpoints, alerts)
2. Runs a background cron scheduler that polls registered endpoints

---

## Repository Structure

```
api-drift-observatory/
├── backend/
│   ├── src/
│   │   ├── index.ts                  # Entry point — Express app + poller init
│   │   ├── lib/
│   │   │   └── prisma.ts             # Singleton Prisma client with pg adapter
│   │   ├── middleware/
│   │   │   └── auth.ts               # JWT verification middleware
│   │   ├── routes/
│   │   │   ├── auth.ts               # POST /auth/register, /auth/login, GET /auth/me
│   │   │   ├── endpoints.ts          # Full CRUD for /endpoints
│   │   │   └── alerts.ts             # GET /alerts, GET /alerts/:id, PUT /alerts/:id/seen
│   │   ├── services/
│   │   │   ├── differ.ts             # extractShape, diffShapes, diffContract
│   │   │   ├── poller.ts             # Cron scheduler — initPoller, startPollingForEndpoint
│   │   │   └── snapshotStore.ts      # saveSnapshot, getLatestSnapshot
│   │   └── utils/
│   │       └── tsInterfaceParser.ts  # Regex parser for TypeScript interface strings
│   ├── prisma/
│   │   ├── schema.prisma             # Database schema — 4 models
│   │   └── migrations/               # SQL migration history
│   ├── prisma.config.ts              # Prisma config pointing to schema
│   ├── tsconfig.json                 # TypeScript compiler config
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                   # Router setup with PrivateRoute wrapper
│   │   ├── api/
│   │   │   └── client.ts             # Axios instance with JWT interceptor
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx         # Endpoint list
│   │   │   ├── AddEndpoint.tsx       # Register new endpoint form
│   │   │   └── AlertHistory.tsx      # Alert timeline
│   │   └── components/
│   │       ├── EndpointCard.tsx      # Card with hover delete
│   │       └── SchemaDiffViewer.tsx  # Renders drift/contract diffs
│   ├── public/
│   │   └── index.html                # Has Tailwind CDN script tag
│   └── package.json
│
├── .gitignore
└── DEVLOG.md                         # This file
```

---

## Full Tech Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 22.x | Runtime |
| TypeScript | 6.x | Type safety, compiled to JS |
| Express | 5.x | HTTP server and routing |
| Prisma | 7.x | ORM — database access and migrations |
| @prisma/adapter-pg | 7.x | Required Prisma v7 adapter for PostgreSQL via node-postgres |
| pg (node-postgres) | 8.x | PostgreSQL driver — used by Prisma adapter |
| node-cron | 3.x | Cron scheduler for polling jobs |
| axios | 1.x | HTTP client for hitting registered endpoints |
| bcryptjs | 3.x | Password hashing |
| jsonwebtoken | 9.x | JWT creation and verification |
| cors | 2.x | Cross-Origin Resource Sharing middleware |
| dotenv | 17.x | Loads .env variables into process.env |
| ts-node | 10.x | Run TypeScript directly in dev (no compile step) |
| nodemon | 3.x | Auto-restart dev server on file changes |

**TypeScript compiler config (`tsconfig.json`):**
- Target: `ES2020`
- Module: `commonjs`
- Strict mode: on
- Source: `src/` → compiled to `dist/`

### Database

| Technology | Details |
|---|---|
| PostgreSQL | Hosted on Supabase |
| Supabase | Managed PostgreSQL with connection pooling via PgBouncer |
| Connection port | 6543 (pooler — used by the app) / 5432 (direct — used for migrations) |

**Why port 6543 for the app:** Supabase routes the app connection through PgBouncer (a connection pooler) on port 6543. This is important because Prisma keeps a connection pool open, and PgBouncer manages it efficiently. Port 5432 is the direct database connection used only when running `prisma migrate`.

**Database schema — 4 models:**

```prisma
User       — id, email, password, createdAt
Endpoint   — id, userId, name, url, method, headers (JSON), tsInterface,
             pollInterval, lastCheckedAt, createdAt
Snapshot   — id, endpointId, shape (JSON), takenAt
Alert      — id, endpointId, type (DRIFT | CONTRACT_VIOLATION), diff (JSON),
             seen, createdAt
```

The Prisma client is generated to `src/generated/prisma` (gitignored — regenerated on every deploy).

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 19.x | UI framework |
| TypeScript | 4.x | Type safety |
| Create React App (react-scripts) | 5.x | Build tooling and dev server |
| React Router DOM | 7.x | Client-side routing |
| Axios | 1.x | HTTP client for API calls |
| TailwindCSS | Via CDN | Utility CSS styling |

**Why TailwindCSS via CDN:** CRA (Create React App) uses its own PostCSS config internally and doesn't pick up a custom `postcss.config.js`. Tailwind v4 requires PostCSS integration that conflicts with CRA's internals. The simplest solution was loading Tailwind via the CDN script tag in `public/index.html`. This works perfectly for development and production — the CDN version gets served to users alongside the built app.

**Routing structure:**
- `/` → redirects to `/login`
- `/login` → Login page
- `/register` → Register page
- `/dashboard` → Endpoint list (protected)
- `/endpoints/new` → Add endpoint form (protected)
- `/alerts` → Alert history (protected)

Protected routes use a `PrivateRoute` wrapper that checks for a JWT in `localStorage`. If not present, redirects to `/login`.

---

## Core Logic Deep Dive

### Shape Extraction (`differ.ts`)

`extractShape()` recursively walks any JSON response and replaces every value with its type name, producing a flat dot-notation map:

```
Input:  { user: { name: "Anusha", age: 30 }, tags: ["a", "b"] }
Output: { "user.name": "string", "user.age": "number", "tags": "array<string>" }
```

Arrays of objects use the first element as a representative sample. Top-level arrays are unwrapped to their first element before extraction.

### Drift Detection (`diffShapes`)

Compares two flat shapes and returns:
- `added` — keys in new shape not in old
- `removed` — keys in old shape not in new
- `typeChanged` — keys in both but with different type values

### Contract Violation Detection (`diffContract`)

Compares a parsed TypeScript interface shape against the live API shape and returns:
- `missingFromApi` — fields declared in the interface but absent in the live response
- `unexpectedInApi` — fields in the live response not declared in the interface
- `typeMismatch` — fields present in both but with different types

### TypeScript Interface Parser (`tsInterfaceParser.ts`)

A regex-based parser that reads raw TypeScript interface strings (pasted by the user) and extracts field names and types into a shape map. Supports primitive types (`string`, `number`, `boolean`) and maps them to the same type strings that `extractShape` produces, so the two shapes are directly comparable.

### Polling Engine (`poller.ts`)

On server start, `initPoller()` loads all endpoints from the database and calls `startPollingForEndpoint()` for each one. This creates a `node-cron` scheduled task using the endpoint's `pollInterval` (in minutes), converted to a cron expression (`*/N * * * *`).

Each poll cycle:
1. Fetches the endpoint URL with registered headers
2. Extracts the response shape
3. Loads the last snapshot from DB
4. If snapshot exists → runs `diffShapes` → if drift → creates DRIFT alert
5. If `tsInterface` is set → runs `diffContract` → if violation → creates CONTRACT_VIOLATION alert
6. Saves new snapshot
7. Updates `lastCheckedAt` on the endpoint

Active cron tasks are stored in a `Map<endpointId, ScheduledTask>` so they can be cancelled if an endpoint is deleted.

### JWT Authentication

On register/login, the server signs a JWT with the user's ID and a secret (`JWT_SECRET` env variable). The token is returned to the client and stored in `localStorage`.

Every subsequent request attaches the token as `Authorization: Bearer <token>` via an Axios request interceptor in `client.ts`. The backend's `auth.ts` middleware verifies the token on every protected route and attaches `userId` to the request object.

**Hashing in this project — two different things:**

- **Passwords → bcrypt** (`bcryptjs`). bcrypt uses a derivative of the Blowfish cipher, not SHA-256. It's designed specifically for passwords — it's intentionally slow, automatically salts the input, and makes brute-force attacks expensive. SHA-256 is too fast for passwords; bcrypt is the right tool.

- **JWT signatures → HS256 = HMAC + SHA-256** (handled internally by `jsonwebtoken`). When the server signs a token, `jsonwebtoken` uses the `JWT_SECRET` and SHA-256 via HMAC to produce a signature. This is what prevents token tampering — not encryption. The header and payload are only base64-encoded (readable by anyone), but the signature can only be verified by someone who knows the secret. SHA-256 never appears directly in our code because `jsonwebtoken` abstracts it.

---

## API Endpoints

### Auth (`/auth`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /auth/register | No | Create account |
| POST | /auth/login | No | Get JWT token |
| GET | /auth/me | Yes | Get current user |

### Endpoints (`/endpoints`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /endpoints | Yes | List all endpoints for user |
| POST | /endpoints | Yes | Register new endpoint |
| DELETE | /endpoints/:id | Yes | Delete endpoint + stop polling |

### Alerts (`/alerts`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /alerts | Yes | List all alerts for user |
| PUT | /alerts/:id/seen | Yes | Mark alert as seen |

---

## Environment Variables

### Backend (`.env` / Render dashboard)
```
DATABASE_URL=postgresql://user:password@host:6543/postgres
JWT_SECRET=<long random string>
NODE_ENV=production
PORT=3000
```

### Frontend (`.env.local` / Vercel dashboard)
```
REACT_APP_API_URL=https://api-drift-observatory.onrender.com
```

`REACT_APP_` prefix is required by Create React App to expose env variables to the browser bundle. Vercel injects these at build time — they're baked into the compiled JS.

---

## Deployment

### Backend → Render

**Platform:** Render (free tier — 512MB RAM, 0.1 CPU)

**Settings:**
- Repository: `anunrs/api-drift-observatory`
- Root Directory: `backend`
- Build Command: `npm install --include=dev && npx prisma generate && npm run build`
- Start Command: `node dist/index.js`
- Instance Type: Free

**Why `--include=dev` in the build command:**
Render sets `NODE_ENV=production` which causes `npm install` to skip `devDependencies`. But TypeScript type packages (`@types/*`) live in `devDependencies` and are needed to compile TypeScript. `--include=dev` forces npm to install them regardless of NODE_ENV.

**Why `prisma generate` in the build command:**
The Prisma generated client (`src/generated/prisma/`) is gitignored. Render starts with a clean clone of the repo every deploy, so the generated client doesn't exist. It must be regenerated before `tsc` runs, otherwise the import `from '../generated/prisma/client'` fails.

**Deployment trigger:** Render auto-deploys on every push to the `main` branch (Continuous Deployment).

**Live URL:** https://api-drift-observatory.onrender.com

---

### Keep-alive → UptimeRobot

**Problem:** Render's free tier spins down the server after 15 minutes of no inbound HTTP traffic. Since the polling logic runs inside the Express process using `node-cron`, if the process is killed, polling stops.

**Solution:** UptimeRobot (free tier) sends an HTTP ping to the `/health` endpoint every 5 minutes. This keeps Render from sleeping, which keeps `node-cron` running uninterrupted.

**Monitor config:**
- Type: HTTP
- URL: `https://api-drift-observatory.onrender.com/health`
- Interval: 5 minutes

---

### Frontend → Vercel

**Platform:** Vercel (free Hobby tier)

**Settings:**
- Repository: `anunrs/api-drift-observatory`
- Root Directory: `frontend`
- Framework Preset: Create React App (auto-detected)
- Build Command: `react-scripts build` (auto-detected)
- Output Directory: `build` (auto-detected)

**Environment Variable set in Vercel dashboard:**
```
REACT_APP_API_URL = https://api-drift-observatory.onrender.com
```

This is how the frontend knows where the backend lives. In `client.ts`:
```ts
baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000'
```
Locally it falls back to `localhost:3000`. On Vercel, the env var is injected at build time.

**Deployment trigger:** Vercel auto-deploys on every push to `main`.

**Live URL:** https://api-drift-observatory.vercel.app

---

### Git / GitHub

- Repository: `https://github.com/anunrs/api-drift-observatory`
- Remote connection: HTTPS (not SSH — SSH keys not configured on this machine)
- Branch: `main`

**`.gitignore` excludes:**
- `node_modules/` (all levels)
- `.env` (all levels)
- `dist/` (compiled TypeScript output)
- `backend/src/generated/` (Prisma generated client)

---

## Local Development

### Prerequisites
- Node.js 18+
- A Supabase project with the database URL

### Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy   # or `migrate dev` for local dev with migration creation
npm run dev                 # starts nodemon + ts-node
```
Runs on `http://localhost:3000`

### Frontend
```bash
cd frontend
npm install
npm start
```
Runs on `http://localhost:3001`

The frontend proxies API calls to `http://localhost:3000` via the `REACT_APP_API_URL` fallback in `client.ts`.

---

## Known Gotchas & Decisions

**Prisma v7 breaking changes:**
Prisma v7 requires an explicit database adapter (`@prisma/adapter-pg`) rather than using the built-in driver. The generator name changed from `prisma-client-js` to `prisma-client`. The generated output path must be explicitly set (we used `../src/generated/prisma`).

**Supabase port split:**
- Port `5432` — direct connection, used for running migrations (`prisma migrate`)
- Port `6543` — PgBouncer pooler, used by the running app (`DATABASE_URL` in `.env`)
Using port 5432 for the app causes connection errors under Prisma's connection pooling.

**SSL on Supabase:**
Prisma's pg adapter requires `ssl: { rejectUnauthorized: false }` when connecting to Supabase, since Supabase uses a self-signed certificate in the connection chain.

**TailwindCSS via CDN:**
CRA doesn't support custom PostCSS configurations alongside its own build pipeline. Tailwind v4 needs PostCSS. The conflict was bypassed by loading Tailwind from the CDN in `public/index.html` instead of installing it as a PostCSS plugin.

**CORS:**
The Express CORS middleware is configured to allow two origins:
- `http://localhost:3001` — local development
- `https://api-drift-observatory.vercel.app` — production frontend
