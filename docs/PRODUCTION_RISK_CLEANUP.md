# Production risk cleanup (2026-05-26)

## Risk 1 — Supabase lead columns

- Migrations: `20260525_auto_lead_qualification.sql`, `20260526_final_production_lead_fields.sql`
- Verify: `node scripts/verify-supabase-lead-schema.cjs`
- Apply: see `docs/SUPABASE_MIGRATION_APPLY.md` (`supabase db push`)
- Admin fallback: `js/admin/lead-qual-fields.js` parses qual from `notes` when columns null

## Risk 2 — Live / browser smoke

- Automated: `npm run smoke:live` (optional Cloudflare warn mode)
- Local dist: `npm run build` then `node scripts/e2e-static-server.cjs` + curl markers
- E2E: `npm run test:e2e` (Playwright; 6/13 passed in CI agent — navbar selector drift on some specs)

## Risk 3 — Partner funnel test UI

- Step 5 renamed to **Webhook doğrulama** (production copy)
- Removed `href="#"` skip link → `button#partner-funnel-continue-step6`
- Webhook HMAC step remains (required partner onboarding, not debug)
