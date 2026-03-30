# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Start dev server (Next.js 16 + Turbopack)
npm run build        # Production build (standalone output for Docker)
npm run start        # Start production server
npm run typecheck    # TypeScript check (tsc --noEmit)
npm run lint         # ESLint
npm run test         # Vitest (run all tests)
npx vitest run src/lib/__tests__/server-cache.test.ts  # Run single test file
```

## Architecture

**Stack:** Next.js 16.1.1 (App Router, Turbopack), React 19, TypeScript 5.9, Tailwind CSS 4, PostgreSQL via `pg`.

### Data Flow

1. **Server components** (pages in `src/app/(dashboard)/dashboard/*/page.tsx`) fetch initial data via library functions
2. **Library modules** (`src/lib/fenograma.ts`, `mortality.ts`, `comparacion.ts`, `poscosecha-balanzas.ts`, `campo.ts`) query PostgreSQL and are cached via `src/lib/server-cache.ts` (in-memory, TTL-based, max 200 entries)
3. **Client explorers** (`src/components/dashboard/*-explorer.tsx`) receive initial data as props, then use **SWR** to revalidate via API routes
4. **API routes** (`src/app/api/`) are thin wrappers: normalize filters → call library → return JSON. Errors go through `src/lib/api-error.ts`

### Key Modules

| Module | Purpose |
|--------|---------|
| `src/lib/db.ts` | PostgreSQL pool singleton, `query<T>()` wrapper with slow-query logging |
| `src/lib/server-cache.ts` | `cachedAsync(key, ttlMs, loader)` with in-flight dedup |
| `src/lib/auth.ts` | HMAC-SHA256 cookie sessions, credential validation |
| `src/proxy.ts` | Middleware — protects `/dashboard/*`, redirects unauthenticated to `/login` |
| `src/lib/fetch-json.ts` | Client-side `fetchJson<T>()` used by SWR fetchers |
| `src/hooks/use-block-profile-modal.ts` | Complex drill-down state: block → cycle → valve/bed → curves |
| `src/lib/programaciones.ts` | Query SPMC (mortality) + ILUMINACION from `mdl.prod_ref_vegetativo_subset_scd2` + cycle/area details; ilum only returns first & last dates per cycle |

### Dashboard Views

- **Campo** (`/dashboard/campo`) — SVG spatial map of blocks by area, pure client-side state
- **Programaciones** (`/dashboard/programaciones`) — Monthly calendar with activity schedules (SPMC, Iluminación, Riego); shows plant mortality events, lighting cycles, and irrigation. Interactive iluminación mode selects cycle and shows detail panel with start/end dates & duration.
- **Fenograma** (`/dashboard/fenograma`) — Weekly pivot table + harvest curves + block drill-down modals
- **Mortandades** (`/dashboard/mortality`) — Mortality metrics with cycle/valve/bed curve drill-downs
- **Comparacion** (`/dashboard/comparacion`) — Side-by-side cycle comparison with radar charts
- **Balanzas** (`/dashboard/poscosecha/balanzas`) — Post-harvest scales with BPMN process viewer

### Auth

Cookie-based (`wh-session`), HMAC-SHA256 signed, 24h expiry. Credentials: username + password only (no email). Middleware in `src/proxy.ts` guards `/dashboard/*` routes.

## Important Constraints

- **DB pool config**: Do NOT add `connectionTimeoutMillis` or `statement_timeout` to `src/lib/db.ts` — these caused the app to stop loading in production.
- **CSP headers**: `script-src` MUST include `'unsafe-inline' 'unsafe-eval'` and `connect-src` MUST include `ws:` for Next.js to function. Defined in `next.config.ts`.
- **Output**: `standalone` mode for Docker deployment on `10.0.2.70:3000`.
- **Path alias**: `@/*` maps to `./src/*` (tsconfig.json).
- **Node.js PATH on Windows**: Use `cmd.exe` with PATH set in `.claude/launch.json` — npm/node are at `C:\Users\erick.rivera\nodejs\node`.

## Environment Variables

Two DB config modes (see `.env.example`):
- **Option A**: `DATABASE_URL` (connection string, takes priority)
- **Option B**: Split config (`DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`)

Optional tuning: `DATABASE_POOL_MAX` (default 10), `DATABASE_IDLE_TIMEOUT_MS` (default 30000), `SLOW_QUERY_THRESHOLD_MS` (default 500).
