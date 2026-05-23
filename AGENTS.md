# AGENTS.md

## Cursor Cloud specific instructions

### Project Overview

isteBul is a Turkish AI-powered vehicle decision-making platform (PWA). The frontend is vanilla JS (ES modules) served by an Express dev server. The backend is Supabase (PostgreSQL, Auth, Storage, Edge Functions).

### Development Commands

Standard commands are in `package.json`:

| Task | Command |
|------|---------|
| Dev server | `npm run dev` (port 3000) |
| Lint | `npm run lint` |
| Unit tests | `npm run test:unit` |
| Build | `npm run build` |
| Syntax + console checks | `npm run check` |
| Full test suite (lint + check + build) | `npm test` |

### Known Issues / Gotchas

- **Unit tests hang without `--test-force-exit`**: Some test files (especially `api.test.mjs`) leave open handles that prevent Node from exiting. Use `node --no-warnings --test --test-force-exit tests/unit/*.test.mjs` instead of the raw `npm run test:unit` script if you need a reliable exit.
- **Pre-existing test failures**: 4 of 19 unit tests fail on main due to: missing `scripts/production-build.js` (file is `.cjs`), updated Sentry/Supabase client behavior diverging from test mocks, and incomplete DOM mocks in `router.test.mjs`. These are not regressions.
- **Smoke test (`npm run test:smoke`) fails on main**: It expects a "Decision assistant route link" in `index.html` that was removed. Pre-existing.
- **No lockfile**: The repo uses `npm` but has no committed `package-lock.json`. `npm install` generates one locally.
- **Supabase not required for basic dev**: The dev server serves the frontend without Supabase. The app gracefully degrades (shows UI, AI features disabled). Supabase is needed for auth/data flows.
- **Environment variables**: Copy `.env.example` to `.env.local` for local config. The dev server reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` from the environment and injects them via `/env.js`.

### Running the Dev Server

```bash
npm run dev
```

Serves on `http://127.0.0.1:3000`. The server auto-increments port if 3000 is busy.

### Integration Tests

Integration tests (`npm run test:integration`) require a running Supabase instance (or network access to a remote one). Skip them if Supabase isn't configured.
