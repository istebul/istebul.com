# isteBul — Architecture Overview

## Runtime surfaces

| Surface | Entry | Bundle |
|---------|-------|--------|
| Main marketplace | `index.html` → `js/app.js` | esbuild `app` |
| Auto funnel | `auto/index.html` → `js/auto/auto-app.js` | esbuild `auto` |
| Admin CRM | `admin-panel.html` → `js/admin-panel.js` | esbuild `admin-panel` |
| Corporate static | `*.html` + `js/corporate/` | per-page |

## Core layer (`js/core/`)

Shared infrastructure — import from here instead of duplicating:

- `supabase.js` — client factory
- `api.js` — authenticated API helpers
- `state.js` — lightweight app state
- `router.js` — hash/path routing (main app)
- `security.js` / `dom-safe.js` — HTML escaping, safe URLs
- `storage-keys.js` — canonical `localStorage` / `sessionStorage` keys + legacy migration
- `admin-client.js` — `admin-action` edge function (mutations + `list` reads)
- `analytics.js` — `analytics_events` ingest pipeline
- `app-bridge.js` — cross-bundle access without tight `window.app` coupling

## Auth flow

1. **Main app:** `AuthManager` → `API.signIn` → `supabase.auth.signInWithPassword`
2. **Admin:** direct `signInWithPassword` on admin bundle client
3. Session bootstrap: `App.checkAuth()` on init; `completeSessionBootstrap()` for history/listings/checkout resume (no duplicate `userLoggedIn` on cold load)

## Data access patterns

| Data | Client pattern |
|------|----------------|
| Public listings, CMS | Anon Supabase + RLS |
| User profile (self) | Authenticated client |
| Admin writes | `admin-action` service role |
| Admin sensitive reads (`auto_leads`, `auto_events`) | `admin-action` `list` |

## Feature folders

- `js/features/auth/` — login/register modals
- `js/features/monetization/` — Stripe / Pro gating
- `js/ui/` — presentation (`UIManager` + domain UI installers)
- `js/engines/` — pure calculation (cost, scoring)
- `js/auto/` — Auto product (standalone bundle)

## Build & deploy

`npm run build` → `scripts/production-build.cjs` → `dist/` → Cloudflare Pages (`istebul-com`).

## Technical debt (tracked)

See `docs/MAINTAINABILITY_AUDIT.md` for prioritized backlog (e.g. split `app.js`, merge cost engines, UI composition refactor).
