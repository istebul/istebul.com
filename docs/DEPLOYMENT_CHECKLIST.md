# Deployment Checklist — Cloudflare Pages

**Target:** https://www.istebul.com · **Project:** `istebul-com` · **Branch:** `main`

---

## Pre-deploy (local / CI)

- [ ] `git pull origin main`
- [ ] `npm ci`
- [ ] `npm run lint`
- [ ] `npm run type-check`
- [ ] `npm run build`
- [ ] `npm run build:check`
- [ ] `npm test`
- [ ] `npm run production:audit`
- [ ] Optional: `SUPABASE_URL=... SUPABASE_ANON_KEY=test timeout 90 npm run test:smoke`

---

## GitHub secrets (required for full pipeline)

| Secret | Used by |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Wrangler Pages deploy |
| `CLOUDFLARE_ACCOUNT_ID` | Wrangler Pages deploy |
| `SUPABASE_URL` | Build `env.js` + runtime |
| `SUPABASE_ANON_KEY` | Build `env.js` + runtime |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI (migrations + edge) |
| `SUPABASE_DB_PASSWORD` | `supabase db push` |
| `SENTRY_DSN` | Optional monitoring |
| `LOGROCKET_APP_ID` | Optional monitoring |

Template: `.env.example` · Guide: `.github/SECRETS.example.md` (if present)

---

## Cloudflare Pages settings

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | **20** |
| Functions directory | `/functions` (repo root) |
| Production branch | `main` |

**Files:** `wrangler.toml`, `_redirects`, `_headers`

---

## Supabase deploy (CI job)

- [ ] Migrations: `supabase db push`
- [ ] Edge functions (see `production-deploy.yml` list)
- [ ] Auth redirect URLs include `https://www.istebul.com/**`
- [ ] RLS policies reviewed for new tables

---

## Stripe (Cloudflare env / dashboard)

- [ ] `STRIPE_SECRET_KEY` (live/test per environment)
- [ ] `STRIPE_WEBHOOK_SECRET` for `https://www.istebul.com/api/stripe-webhook` (or Pages function path)
- [ ] Webhook events: `checkout.*`, `customer.subscription.*`, `invoice.*`
- [ ] Success/cancel URLs match site routes
- [ ] Test card checkout in staging before live promotion

---

## Deploy execution

**Automatic (preferred):**

```bash
git push origin main
```

Monitor: GitHub Actions → **Production Deploy**

**Manual:**

```bash
npm run build
# env: SUPABASE_URL, SUPABASE_ANON_KEY for env.js injection
npm run deploy:cf
```

---

## Post-deploy verification

- [ ] https://www.istebul.com/ loads (browser)
- [ ] https://www.istebul.com/auto/ wizard loads
- [ ] `/planlar` or premium routes
- [ ] `dist/env.js` has only public keys (no service role)
- [ ] Admin panel (auth required)
- [ ] Stripe test subscription (test mode)
- [ ] Webhook delivery log in Stripe dashboard
- [ ] Supabase logs: no spike in 5xx

---

## Rollback

| Method | Action |
|--------|--------|
| Cloudflare Pages | Rollback to previous deployment in dashboard |
| Git | `git revert <commit>` + push `main` |
| Supabase | Forward-only migrations — use repair migration, not down |

**Keep previous deployment ID** noted in deploy summary for 15 minutes after release.

---

## Deployment readiness sign-off

| Role | Check | Date |
|------|-------|------|
| Engineering | `npm test` + `production:audit` green | |
| Ops | Secrets + webhook endpoints | |
| Product | Smoke /auto funnel | |

**Status after 2026-05-25 audit:** ✅ **Approved for deploy via `main` push** (CI pipeline).

---

*Rehber: `docs/CANLIYA_ALMA_REHBERI.md` · Audit: `docs/PROJECT_HEALTH_REPORT.md`*
