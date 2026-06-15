# isteBul AI Listings Engine v1 — Documentation Index

Internal listing analysis engine with Supabase edge API, admin QA panel, bulk import, and a **toggle-gated** public catalog at `/secenekler/`.

## Current status

| Area | Status |
|------|--------|
| Module (`src/ai-listings/`) | Feature-complete v1; edge env gate inactive until `AI_LISTINGS_SUPABASE_ENABLED=true` |
| Database migrations | `20260701`–`20260705` — `ai_listings`, analyses, events, owner read, public read RLS |
| Edge function (`ai-listings`) | Internal API secret-gated; optional public listings route when publish flag on |
| Admin panel (`admin/ai-listings.html`) | QA workflow, import, scoring workspace — CRM sidebar **AI İlan Yönetimi** |
| Public UI (`/secenekler/`, `/ilanlar/`) | **Integrated** — reads `status = published` rows when `site_settings.ai_listings_public_enabled` is true |
| `approved` status | Internal QA sign-off only — **does not** appear on public catalog |
| `published` status | Eligible for public read when site toggle (or env publish flag) is on |

## Public publishing gate (how `/secenekler/` works)

A listing is visible on the public decision-options surface only when **all** of the following are true:

1. `ai_listings.status = 'published'` (admin **Publish** action after `approved`)
2. `site_settings.ai_listings_public_enabled = true` (admin panel toggle) **or** edge env `AI_LISTINGS_PUBLIC_PUBLISH_ENABLED=true`
3. Supabase RLS policy `ai_listings public read published` allows anon/authenticated `SELECT` on published rows

Client entry points:

- `js/core/ai-listings-public-api.js` — `loadPublicAiListings()`, `getPublishedAiListings()`
- `js/core/decision-options-api.js` — `loadDecisionOptions()` normalizes rows for `/secenekler/` UI
- `js/runtime/ai-listings-integrations.js` — reads `ai_listings_public_enabled` from `site_settings`

When the toggle is off or no published rows exist, `/secenekler/` shows an empty state with links to Karar Asistanı and category wizards.

> **approved alone is not public.** Operators must explicitly publish and enable the site toggle.

### Supported public catalog categories (today)

| SPA filter id | AI engine `category` | Notes |
|---------------|----------------------|-------|
| `arac` | `vehicle` | Supported |
| `ev` / `konut` | `housing` | Supported |
| `tatil` | `vacation` | Supported |
| `finansman`, `sigorta`, `kasko` | — | **Not in `ai_listings` catalog yet** — use vertical wizards; empty-state CTAs only |

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Module design, DI, feature flags |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Tables, columns, RLS posture |
| [REPOSITORY_ADAPTERS.md](./REPOSITORY_ADAPTERS.md) | In-memory vs Supabase adapters |
| [EDGE_FUNCTION_API.md](./EDGE_FUNCTION_API.md) | Edge endpoints, auth, deployment |
| [ADMIN_TEST_PANEL.md](./ADMIN_TEST_PANEL.md) | Enabling internal admin panel |
| [ADMIN_QA_WORKFLOW.md](./ADMIN_QA_WORKFLOW.md) | Review, approve, reject, publish |
| [SEED_AND_SCORING.md](./SEED_AND_SCORING.md) | Seed data and deterministic scoring |
| [IMPORT_PIPELINE.md](./IMPORT_PIPELINE.md) | CSV/JSON bulk import (admin only) |
| [PR_177_SUMMARY.md](./PR_177_SUMMARY.md) | Merge summary, deployment, rollback |

Additional references: [DEPENDENCY_GRAPH.md](./DEPENDENCY_GRAPH.md), [FUTURE_INTEGRATION_PLAN.md](./FUTURE_INTEGRATION_PLAN.md)

## Activation checklist

Use this before enabling in a non-production or staging Supabase project:

1. **Apply migrations**
   ```bash
   supabase db push
   ```

2. **Deploy edge function**
   ```bash
   supabase functions deploy ai-listings
   ```

3. **Set edge secrets** (Supabase dashboard → Edge Functions → `ai-listings`)
   - `AI_LISTINGS_SUPABASE_ENABLED=true`
   - `AI_LISTINGS_EDGE_SECRET=<strong-random-secret>`
   - `SUPABASE_SERVICE_ROLE_KEY` — auto-injected; do not substitute anon key

4. **Enable admin panel** — CRM sidebar **AI İlan Yönetimi** (`/admin/ai-listings/`) or localStorage gate for QA:
   ```javascript
   localStorage.setItem('istebul_ai_listings_secret', '<same AI_LISTINGS_EDGE_SECRET>');
   ```

5. **Optional seed**
   ```bash
   SUPABASE_URL=... AI_LISTINGS_EDGE_SECRET=... npm run seed:ai-listings
   ```

6. **Enable public catalog (deliberate)**
   - Admin panel → site settings → **Public AI ilan kataloğu (/secenekler/)** (`ai_listings_public_enabled`)
   - Publish listings via admin QA workflow (`approved` → **Publish** → `published`)

7. **Smoke test**
   - `GET /listings` with `x-ai-listings-secret` → 200
   - Request without secret → 401
   - With toggle on: `/secenekler/` loads published rows (or empty state if none)

## Production safety checklist

Before enabling public catalog in production:

- [ ] Migrations `20260701`–`20260705` applied
- [ ] `admin/ai-listings.html` has `noindex,nofollow` robots meta
- [ ] `AI_LISTINGS_EDGE_SECRET` stored only in Supabase secrets (never in repo)
- [ ] RLS verified: anon can **only** `SELECT` rows with `status = 'published'`
- [ ] `ai_listings_public_enabled` intentionally set (default in migration seed may be `true` — confirm ops intent)
- [ ] QA workflow understood: draft → pending_review → approved → **publish** → published
- [ ] `npm run test:unit`, `npm run type-check`, `npm run build` pass

## Safety posture

- **Edge write API** — requires secret; not exposed to anonymous browsers
- **approved ≠ public** — only `published` + toggle exposes catalog rows
- **RLS** — published-only public read; owner read for authenticated intake; service_role for admin/edge writes
- **Isolated tables** — `ai_listings`, `ai_listing_analyses`, `ai_listing_events` separate from legacy `listings`
- **Listing-analysis vertical** — `/ilan-analizi/` remains independent

## Next sprint recommendations

1. Public trust badges (source type, QA/published label) on `/secenekler/` cards
2. Vehicle image trust pipeline on public cards (reuse Auto resolver)
3. Finansman / sigorta / kasko catalog model decision (or explicit “vertical only” UX)
4. Partner lead CTA from published option detail
5. Operational runbook (secret rotation, unpublish, toggle rollback)
