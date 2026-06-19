# AGENTS.md

## Cursor Cloud agent instructions

### Project overview

isteBul is a Turkish **multi-vertical AI decision-support platform** (PWA). Users get guided decision flows and results across verticals such as **Auto, Konut (housing), Tatil (travel), Finansman (finance), Sigorta**, and related assistant surfaces.

**Architecture (high level):**

- **Frontend:** vanilla JavaScript (ES modules), scoped CSS bundles, static HTML entry points
- **Local dev:** Express server (`server.cjs`) serving the repo on `http://127.0.0.1:3000` (auto-increments port if busy)
- **Production hosting:** Cloudflare Pages (`dist/` build output, `wrangler.toml` present)
- **Backend/data:** Supabase (PostgreSQL, Auth, Storage) plus Cloudflare Pages Functions under `functions/`
- **AI/runtime:** server-side proxy via `functions/ai-proxy.js`; client uses feature modules under `js/`

Do **not** describe the product as vehicle-only. Prefer “multi-vertical decision platform”.

### Repository facts

- **`package-lock.json` is committed.** Use `npm ci` when you need a clean, reproducible install; use `npm install` only when intentionally updating dependencies.
- **Node:** `>=20` (see `package.json` `engines`).
- **Lockfile + scripts source of truth:** `package.json` and `package-lock.json` on `main`.

### Development commands

Use the scripts defined in `package.json`. Common tasks:

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Lint | `npm run lint` |
| Syntax / console checks | `npm run check` |
| Type/syntax check alias | `npm run type-check` |
| Unit tests | `npm run test:unit` |
| Integration tests | `npm run test:integration` |
| E2E (CI subset) | `npm run test:e2e:ci` |
| Smoke script | `npm run test:smoke` |
| Build | `npm run build` |
| Full CI-style gate | `npm test` |

`npm test` runs a long audit chain (lint, build, many repo audits). For focused work, prefer narrower commands (`lint`, `check`, `test:unit`, targeted test files).

### Tests and known-gotchas policy

- **Do not assume pass/fail counts from memory or old docs.** The unit suite is large and changes frequently. Run the relevant command before claiming green/red status.
- **Do not cite fixed failure totals** (for example “4 of 19 tests fail”). That becomes stale immediately.
- If `npm run test:unit` appears to hang, some suites may leave open handles. You may use `node --no-warnings --test --test-force-exit tests/unit/<file>.test.mjs` for a single file, but prefer fixing the underlying leak when you touch that area.
- **Integration tests** (`npm run test:integration`) may require Supabase or network access. Skip when not configured.
- **Supabase is not required for basic UI dev:** the dev server can render much of the frontend; auth/data/AI flows need configuration.

### Environment variables (names only)

- Copy `.env.example` → `.env.local` for local development.
- Typical local vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (and optional AI/proxy keys as documented in `.env.example`).
- **Never read, print, commit, or echo secret values** in code, logs, comments, or chat output. Refer to variable **names** only.
- **Do not modify production Supabase, Cloudflare dashboard settings, or remote secrets** unless a human explicitly assigns that ops task.

### Agent workflow rules

1. **Read before write:** inspect existing files, patterns, and tests in the target area before editing. Do not invent parallel architectures without checking what `main` already ships.
2. **Small, scoped changes:** prefer minimal diffs. One concern per PR when possible.
3. **No broad rewrites:** avoid mega `css/style.css` rewrites, cross-vertical Results V3 re-platforming, or large parallel engine layers unless a human product owner explicitly approves a redesign.
4. **Human review gate:** do not self-merge, mark ready, close, or deploy. Pause for human review on non-trivial changes.
5. **Stale/conflicting PRs:** if a branch is obsolete, conflicting, or superseded by newer `main` work, **do not merge or close without explicit product-owner approval**.
6. **Quarantine respect:** when instructed that certain PRs are no-touch, do not comment, close, merge, rebase, or edit them.

### Production safety (do not do without explicit human approval)

- **Do not run deploy commands** (`npm run deploy`, `npm run deploy:cf`, `wrangler pages deploy`, production GitHub Actions, etc.).
- **Do not change** `.github/workflows/*`, `wrangler.toml`, Supabase migrations, or Cloudflare bindings as drive-by edits.
- **Do not force-push**, rewrite shared history, or run destructive git operations on shared branches.
- **Do not toggle production feature flags** or prod env values from agent sessions.

### Running the dev server

```bash
npm run dev
```

Serves on `http://127.0.0.1:3000` by default (`server.cjs`).

### Where to look

| Area | Path hints |
|------|------------|
| Auto results V2 | `js/auto/auto-results-v2.js` |
| Konut / Finans / Tatil results | `js/features/konut/`, `js/features/finansman/`, `js/features/tatil/` |
| Decision Engine V3 overlay | `js/decision/decision-v3-mount.js`, `js/decision/ai-decision-engine-v3.js` |
| Cloudflare Functions | `functions/` |
| Unit tests | `tests/unit/*.test.mjs` |
| E2E | `tests/e2e/` |
| Docs / closure records | `docs/` |

When unsure whether `main` already contains a feature, search the repo and read recent `docs/*CLOSURE*.md` records before proposing duplicate work.
