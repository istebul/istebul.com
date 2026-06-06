# isteBul AI Listings Engine v1 — Database Schema

## Overview

Sprint-2 introduces three **independent** Supabase tables for the AI Listings Engine. They are isolated from existing production tables (`listings`, `listing_analyses`, etc.) and ship with **RLS locked to `service_role` only**.

**Migration:** `supabase/migrations/20260701_ai_listings_engine_v1.sql`

**Status:** Schema ready, **not activated in production flows**.

## Tables

### `ai_listings`

Primary listing store for the AI Listings Engine v1 pipeline.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `uuid` | `gen_random_uuid()` | Primary key |
| `category` | `text` | — | Listing category (`vehicle`, `housing`, etc.) |
| `title` | `text` | — | Listing headline |
| `description` | `text` | — | Full description (nullable) |
| `location` | `jsonb` | — | Structured location (`{ "label": "İstanbul" }`) |
| `price` | `numeric` | — | Numeric price |
| `currency` | `text` | `'TRY'` | ISO currency code |
| `images` | `jsonb` | `'[]'` | Array of image URLs |
| `attributes` | `jsonb` | `'{}'` | Category-specific key-value attributes |
| `status` | `text` | `'draft'` | Workflow status (`draft`, `active`, `archived` — future) |
| `source_type` | `text` | `'manual'` | Ingestion source (`manual`, `user`, `partner`, `url`) |
| `source_url` | `text` | — | Original URL when imported from external listing |
| `owner_user_id` | `uuid` | — | FK → `auth.users`, nullable |
| `created_at` | `timestamptz` | `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | `now()` | Auto-updated via trigger |

**Indexes:** `category`, `status`, `source_type`, `created_at DESC`

### `ai_listing_analyses`

Stores deterministic + AI analysis results per listing.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `uuid` | `gen_random_uuid()` | Primary key |
| `listing_id` | `uuid` | — | FK → `ai_listings(id)` ON DELETE CASCADE |
| `ai_score` | `numeric` | — | Overall quality score (0–100) |
| `risk_score` | `numeric` | — | Risk exposure (0–100) |
| `market_score` | `numeric` | — | Market fit (0–100) |
| `price_score` | `numeric` | — | Price competitiveness (0–100) |
| `confidence` | `numeric` | — | Model confidence (0–1) |
| `summary` | `text` | — | Executive summary |
| `pros` | `jsonb` | `'[]'` | Strengths array |
| `cons` | `jsonb` | `'[]'` | Weaknesses array |
| `tags` | `jsonb` | `'[]'` | Classification tags |
| `analysis_version` | `text` | `'v1'` | Engine / model version |
| `created_at` | `timestamptz` | `now()` | Analysis timestamp |

**Indexes:** `listing_id`

### `ai_listing_events`

Audit and analytics event log for listing lifecycle.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `uuid` | `gen_random_uuid()` | Primary key |
| `listing_id` | `uuid` | — | FK → `ai_listings(id)` ON DELETE CASCADE |
| `event_type` | `text` | — | Event name (`created`, `analyzed`, `published`, etc.) |
| `payload` | `jsonb` | `'{}'` | Event-specific data |
| `created_at` | `timestamptz` | `now()` | Event timestamp |

**Indexes:** `listing_id`, `event_type`

## Row-Level Security (Current)

| Role | Access |
|------|--------|
| `anon` | **Denied** (all operations) |
| `authenticated` | **Denied** (all operations) |
| `service_role` | **Full access** (bypasses RLS + explicit policy) |

Public read is intentionally disabled. Client-side Supabase (`anon` key) cannot read or write these tables.

## Repository Adapters

| Adapter | File | Default |
|---------|------|---------|
| In-memory (tests) | `repository/in-memory/` | **Active** in DI container |
| Supabase (stub) | `repository/supabase/` | **Inactive** (`AI_LISTINGS_SUPABASE_ENABLED=false`) |

Activate Supabase adapter only in server/Edge Function context with `service_role`:

```javascript
// Future Sprint-3 — not wired yet
setAiListingsSupabaseLocalOverride(true);
const repo = createSupabaseAiListingRepository({ client: serviceRoleClient });
```

## Future RLS Plan

### Phase A — User ownership (authenticated)

```sql
-- Users read/write own listings
CREATE POLICY "ai_listings owner select"
  ON public.ai_listings FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "ai_listings owner insert"
  ON public.ai_listings FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());
```

### Phase B — Admin moderation

```sql
-- Admins read all via is_admin()
CREATE POLICY "ai_listings admin select"
  ON public.ai_listings FOR SELECT TO authenticated
  USING (public.is_admin());
```

### Phase C — Public read (published only)

```sql
-- Anon can read active listings only
CREATE POLICY "ai_listings public read active"
  ON public.ai_listings FOR SELECT TO anon
  USING (status = 'active');
```

Analyses and events remain owner/admin scoped; no public read of raw analysis until product decision.

## Future Admin Integration Plan

1. **Admin panel section** — new tab in `admin-panel.html` (separate PR, not Sprint-2)
2. **Read via `service_role`** — Edge Function `admin-action` or dedicated `ai-listings-admin` function
3. **Display fields** — `status`, `source_type`, scores, `event_type` timeline
4. **Actions** — approve (`status → active`), archive, re-analyze, delete
5. **CRM linkage** — optional `owner_user_id` join to `profiles` for user context

## Future User Listing Submission Plan

1. **Authenticated intake** — user submits via new form (not existing `ilan` flow)
2. **Edge Function** — `ai-listings-intake` validates input, writes with `service_role`
3. **RLS Phase A** — enable owner policies; user sees own drafts in account area
4. **Analysis trigger** — on insert, enqueue analysis via `AIAnalysisService`
5. **Event log** — write `created`, `analyzed`, `published` events to `ai_listing_events`
6. **No modification** to existing `listings` table or `js/features/ilan/` until explicit bridge decision

## Relationship to Existing Tables

| Existing Table | New Table | Relationship |
|----------------|-----------|--------------|
| `listing_analyses` | `ai_listing_analyses` | **Independent** — parallel vertical, no FK |
| `listings` | `ai_listings` | **Independent** — future bridge via adapter |
| `listing_analysis_events` | `ai_listing_events` | **Independent** — separate event stream |

## Applying the Migration

```bash
supabase db push
# or apply 20260701_ai_listings_engine_v1.sql in Supabase SQL editor
```

No changes to existing tables or production routes are required.
