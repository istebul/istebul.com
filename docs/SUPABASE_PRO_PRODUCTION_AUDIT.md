# Supabase Pro Production Audit

**Date:** 2026-05-28  
**Scope:** isteBul production stack — Supabase Pro, Cloudflare Pages, edge functions  
**Verdict:** Acceptable for production after applying migration `20260616_supabase_pro_production_hardening.sql`

---

## FIXED

| Area | Issue | Resolution |
|------|-------|------------|
| **Missing migration file** | CI referenced `20260527_launch_security_hardening.sql` but file was absent | Restored idempotent migration (admin CRM read, funnel revoke, last-admin trigger) |
| **site_settings RLS** | Table had no migration-level RLS; anon could read/write all keys if RLS disabled in prod | `20260616_*` — bootstrap table, allowlist public SELECT, deny client writes, admin SELECT |
| **vertical_leads UPDATE** | Policy `USING(true)` allowed any anon/authenticated user to update any lead row | Replaced with deny-client-update (writes stay on `vertical-intake` service role) |
| **listings admin read** | Admin panel direct SELECT missed draft/non-active rows from other users | Added `Admins read all listings` policy |
| **profiles INSERT escalation** | Self-insert could theoretically set elevated role if policy missing | INSERT policy enforces `role=user`, `is_banned=false` |
| **CMS over-fetch** | `cms.js` used `site_settings?select=*` exposing all columns to anon | Scoped to public CMS keys only |
| **admin-action settings** | `home_category_*` keys missing from allowlist | Added 6 homepage visibility keys |
| **CI audit gap** | No automated Supabase Pro hardening check | Added `scripts/supabase-pro-production-audit.cjs` to `npm test` |

---

## WARNING

| Area | Risk | Mitigation |
|------|------|------------|
| **Bundle budget** | Main SPA JS/CSS ~1.45 MB exceeds 980 KB CI budget (pre-existing) | Track in `dist/bundle-report.json`; split `app.bundle` in future sprint |
| **vertical_events INSERT** | Anon can insert events with `WITH CHECK (true)` | Acceptable — reads denied; intake validated at edge; monitor abuse via `auto_rate_limits` |
| **site_settings allowlist drift** | New public setting keys require migration update | Add key to migration allowlist + `admin-action` allowlist together |
| **profiles legacy policies** | Original `supabase-setup.sql` policies may coexist with migration overrides | Run `supabase db push`; verify no duplicate permissive write policies in dashboard |
| **CSP `unsafe-inline` styles** | Inline styles allowed in `_headers` | Acceptable for launch; migrate to hashed CSS / nonces later |
| **npm audit advisories** | Dev tooling dependencies report moderate/high CVEs | Quarterly review; no `--force` auto-fix in CI |
| **Edge function silent catches** | Some `catch {}` blocks in partner-dispatch / auto-intake | Non-blocking ops logging exists; expand structured error logs incrementally |

---

## OPTIONAL IMPROVEMENT

| Area | Suggestion |
|------|------------|
| **Rate limiting** | Add Supabase Pro connection pooling + edge rate limits for `analytics-ingest` burst traffic |
| **Monitoring** | Wire Cloudflare Logpush + Supabase log drains to central dashboard |
| **Input validation** | Extend Zod-style validation shared module across all intake edge functions |
| **Performance** | Code-split `app.bundle` (~378 KB); lazy-load admin-only modules |
| **Mobile** | Run Lighthouse CI on `/auto/`, `/finans/` after bundle split |
| **Duplicate API calls** | Homepage fetches `site_settings` in CMS + category grid — consider single bootstrap call |
| **Pen-test** | Pre-Series A: checkout, admin-action, partner webhook SSRF |
| **Secret rotation** | Annual rotation schedule for `SUPABASE_SERVICE_ROLE_KEY`, Stripe, partner secrets |

---

## Supabase Security Audit (target tables)

| Table | RLS | Anon read | Anon write | Admin read | Notes |
|-------|-----|-----------|------------|------------|-------|
| **profiles** | ON | Own profile only (via auth) | INSERT own (role=user) | Admin SELECT | Role/ban escalation blocked via RLS + trigger |
| **auto_leads** | ON | Denied | Denied | Admin SELECT | Writes via `auto-intake` service role |
| **auto_events** | ON | Denied | Denied | Admin SELECT | Event ingest via edge only |
| **site_settings** | ON | Allowlisted keys | Denied | Admin SELECT all | Client writes via `admin-action` only |
| **listings** | ON | Active listings | Own listings CRUD | Admin SELECT all | Public marketplace pattern preserved |

**Admin escalation:** Panel cannot grant `role=admin` (`admin-action` + UI guard + `enforce_minimum_admin_count` trigger).

---

## Environment Security

| Check | Status |
|-------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` in browser bundle | **PASS** — blocked by build audit |
| `dist/env.js` public whitelist | **PASS** — `SUPABASE_URL`, `SUPABASE_ANON_KEY` only |
| Cloudflare Pages secrets | **PASS** — service role in Workers/Pages env, not in static assets |
| Edge functions | **PASS** — service role via Deno env only |

---

## Deploy Safety

```bash
npm run lint
npm run type-check
npm run check
npm run build
node scripts/supabase-pro-production-audit.cjs
node scripts/p4-8-production-hardening-audit.cjs
```

**Required after merge:**

```bash
supabase db push   # or apply 20260616_supabase_pro_production_hardening.sql in SQL editor
supabase functions deploy admin-action
```

---

## Performance snapshot

| Metric | Value | Status |
|--------|-------|--------|
| Main SPA bundle | ~1.45 MB | WARNING — over budget |
| Largest chunk | `app.bundle` ~378 KB | OPTIONAL — code split |
| Vertical runtimes | Excluded from SPA budget | OK |
| Hashed assets | CSS/JS immutable cache | OK |

---

*Generated by Supabase Pro production hardening pass. Re-run audit after each security migration.*
