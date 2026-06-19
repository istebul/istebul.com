# Supabase — lead qualification migration

## Columns

`auto_leads`: `purchase_timeline`, `financing_intent`, `trade_in`, `urgency`, `contact_preference`

Migrations (idempotent):

1. `20260525_auto_lead_qualification.sql`
2. `20260526_final_production_lead_fields.sql`

## Apply (production)

```bash
supabase link --project-ref <PROJECT_REF>
supabase db push
supabase functions deploy auto-intake
```

Verify:

```bash
node scripts/verify-supabase-lead-schema.cjs
```

In SQL editor:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'auto_leads'
  AND column_name IN (
    'purchase_timeline','financing_intent','trade_in','urgency','contact_preference'
  );
```

Expect 5 rows.

## Live data settings (20260620)

```bash
supabase link --project-ref hjfrcdstbyonmgatgwcc --yes
supabase db push --yes --include-all
```

Verify:

```sql
SELECT key, value FROM public.site_settings
WHERE key IN ('live_providers_enabled', 'live_finance_feed_url');
```

Full ops steps: **`docs/OPS_SUPABASE_IYZICO_RUNBOOK.md`**.

## Backward compatibility

- Old leads without columns: admin drawer parses qual lines from `notes` via `js/admin/lead-qual-fields.js`.
- `auto-intake` still writes qual into `notes` when columns exist.
