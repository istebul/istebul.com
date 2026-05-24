# Resilience Runbook — isteBul Ops

**When to use:** Production incident, vendor outage, webhook backlog, or data recovery.  
**Audit context:** `docs/PRODUCTION_RESILIENCE_AUDIT.md`

---

## Quick reference

| Vendor status | URL |
|---------------|-----|
| Supabase | https://status.supabase.com |
| Cloudflare | https://www.cloudflarestatus.com |
| Stripe | https://status.stripe.com |
| GitHub Actions | https://www.githubstatus.com |

**Admin:** https://www.istebul.com/admin-panel.html → Observability · Auto Leads · Partner dispatch logs

**Scale Phase A:** `docs/SCALE_PHASE_A_RUNBOOK.md` · SLO check: `npm run metrics:slo` · Weekly data retention: Actions → Data Retention

---

## 1. Partner webhook failures

### Symptoms

- `partner_status = dispatch_failed` or `dispatch_dead`
- Observability: `webhook_partner_dispatch_failed` spike
- Partner dispatch logs: HTTP 4xx/5xx or timeout

### Steps

1. **Admin → Observability** — confirm error pattern (one endpoint vs all).
2. **Admin → Partner Kanalları** — check `health_status`, `circuit_open_until`.
3. **Fix partner URL/secret** if misconfiguration.
4. **Retry single lead:** Auto Leads → action **Retry dispatch** (or manual dispatch).
5. **Bulk retry:** Ensure GitHub Actions **Partner Retry** workflow ran (every 15m). Manual trigger:
   - GitHub → Actions → Partner Retry → Run workflow
6. **Direct curl** (if GH down):

```bash
curl -fsS -X POST "$PARTNER_RETRY_URL" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "x-retry-secret: $PARTNER_RETRY_SECRET"
```

7. If **dispatch_dead** (5 retries): call partner manually; update CRM status; consider new endpoint.

### Failover (automatic)

Route chain is defined in `FAILOVER_ROUTES` (`partner-dispatch.ts`). If primary route has no healthy endpoints, system tries fallback routes (e.g. `dealer_partner` → `general_sales`).

---

## 2. Supabase outage / degradation

### Symptoms

- Auth login fails globally
- `auto-intake` 500; client shows Supabase errors
- Admin panel cannot load tables

### Steps

1. Confirm on https://status.supabase.com
2. Post internal + user comms (social / banner) if > 15 min
3. **Do not** disable RLS or expose service role
4. When restored: verify edge functions (Supabase Dashboard → Edge Functions logs)
5. Redeploy edge if needed:

```bash
supabase link --project-ref <ref>
supabase functions deploy auto-intake --project-ref <ref>
supabase functions deploy partner-retry --project-ref <ref>
# … full list in .github/workflows/production-deploy.yml
```

6. Run smoke: test lead with test phone `905551112233` (marked test_spam)

### Client degraded mode

If only anon key missing: site uses local fallback (no auth). Full Supabase down = no new leads in DB.

---

## 3. Stripe outage

### Symptoms

- Checkout returns 502; `payment_checkout_failed` in ops
- Webhook processing errors in Pages Functions logs

### Steps

1. https://status.stripe.com
2. **Stop paid campaigns** pointing to checkout if prolonged
3. **Leads and free Auto** continue — do not block core funnel
4. Existing Pro users: subscription state in DB may lag until webhooks catch up
5. After recovery: Stripe Dashboard → Webhooks → resend failed events if needed
6. Reconcile: compare Stripe active subs vs `subscriptions` table

### Manual Pro grant (process — counsel approval)

Use admin DB access only with audit log entry. Prefer Stripe Dashboard customer record when API is back.

---

## 4. Cloudflare outage

### Symptoms

- `istebul.com` unreachable globally
- Pages Functions 5xx

### Steps

1. status.cloudflare.com
2. No hot failover configured — wait for CF or communicate ETA
3. After recovery: verify last deploy in CF Dashboard → Pages → Deployments
4. Re-run failed GitHub **Production Deploy** if needed

---

## 5. Data recovery

### Point-in-time (Supabase Pro PITR)

1. Supabase Dashboard → Database → Backups → Restore to new project or PITR
2. Validate row counts on `auto_leads`, `subscriptions`
3. Update production connection strings only after sign-off

### Logical restore

1. Restore dump to **staging** first
2. Run `npm run metrics:investor` and `npm run metrics:ops` against staging
3. Document delta vs production

### Accidental data change

1. `admin_audit_logs` — who changed what
2. PITR to time before change OR manual SQL fix on staging then apply

---

## 6. Deploy rollback

### Frontend (Cloudflare Pages)

1. Cloudflare Dashboard → Pages → istebul-com → Deployments
2. **Rollback** to previous successful deployment

### Edge functions

```bash
git checkout <previous-sha>
supabase functions deploy <function-name> --project-ref <ref>
```

### Database

- Prefer **forward fix migration**, not rollback destructive migrations
- Emergency: restore from PITR

---

## 7. Weekly resilience checklist (15 min)

- [ ] Supabase backup/PITR enabled (Dashboard screenshot quarterly)
- [ ] Partner Retry workflow succeeded (Actions tab)
- [ ] Lifecycle cron succeeded (if configured)
- [ ] `npm run metrics:ops` — zero unreviewed `critical` events
- [ ] `dispatch_dead` leads = 0 or assigned
- [ ] Stripe webhook delivery 100% (Dashboard → Webhooks)
- [ ] Vendor status pages not showing active incidents

---

## 8. Contacts (fill in)

| Role | Name | Contact |
|------|------|---------|
| On-call eng | | |
| Ops / CRM | | |
| Supabase support | | Pro ticket |
| Stripe support | | Dashboard |
