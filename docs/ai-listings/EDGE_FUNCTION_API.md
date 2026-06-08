# isteBul AI Listings Engine v1 — Edge Function API

## Overview

Sprint-4 adds an **internal-only** Supabase Edge Function at `supabase/functions/ai-listings/`. It exposes CRUD + analyze endpoints using **service_role** and is **inactive by default**.

**No browser or public anon access.** Not connected to production UI/routes.

## Deployment

```bash
supabase functions deploy ai-listings
```

## Activation (all required)

| Env var | Required value | Purpose |
|---------|----------------|---------|
| `AI_LISTINGS_SUPABASE_ENABLED` | `true` | Module gate (returns 503 if not true) |
| `AI_LISTINGS_EDGE_SECRET` | strong secret | Internal auth |
| `SUPABASE_URL` | project URL | Auto-injected by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key | Auto-injected; **never use anon key** |

If `AI_LISTINGS_EDGE_SECRET` is unset, all requests return **503**.

## Authentication

Every request must include:

```
x-ai-listings-secret: <AI_LISTINGS_EDGE_SECRET>
```

Missing or invalid secret → **401 UNAUTHORIZED**

## Base URL

```
https://<project-ref>.supabase.co/functions/v1/ai-listings
```

## Endpoints

### POST `/listings/import`

Bulk import valid rows from CSV or JSON (admin only). See [IMPORT_PIPELINE.md](./IMPORT_PIPELINE.md).

### POST `/listings`

Create a listing.

**Body:**
```json
{
  "category": "vehicle",
  "title": "2020 Toyota Corolla",
  "description": "Optional",
  "location": "İstanbul",
  "price": 950000,
  "currency": "TRY",
  "images": ["https://cdn.example/img.jpg"],
  "attributes": { "year": 2020 },
  "source_url": "https://example.com/listing/1"
}
```

**Validation:**
- `category` required
- `title` required
- `price` optional numeric ≥ 0
- `currency` defaults to `TRY`
- `images` must be array
- `attributes` must be object
- `source_url` must be `http`/`https` if present

**Event:** `listing_created`

---

### GET `/listings/:id`

Return listing + `latest_analysis` (or `null`).

---

### PATCH `/listings/:id`

Update allowed fields only:
`title`, `description`, `location`, `price`, `currency`, `images`, `attributes`, `status`, `source_url`

**Event:** `listing_updated`

---

### POST `/listings/:id/archive`

Set `status = 'archived'`, update `updated_at`.

**Event:** `listing_archived`

---

### POST `/listings/:id/analyze`

Runs placeholder pipeline:
- market context (stub)
- pricing context (stub)
- scoring
- recommendation
- AIAnalysis placeholder

Saves row to `ai_listing_analyses`, writes `listing_analyzed` event.

---

### GET `/listings`

Query filters: `category`, `status`, `source_type`, `owner_user_id`, `limit`, `offset`

Example:
```
GET /listings?category=vehicle&status=draft&limit=20&offset=0
```

---

### GET `/listings/:id/events`

List events for listing from `ai_listing_events`.

## Response envelope

**Success:**
```json
{
  "ok": true,
  "data": { }
}
```

**Error:**
```json
{
  "ok": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "category is required"
  }
}
```

## Error codes

| Code | HTTP | Meaning |
|------|------|---------|
| `INVALID_REQUEST` | 400 | Validation failed |
| `UNAUTHORIZED` | 401 | Missing/invalid `x-ai-listings-secret` |
| `MODULE_DISABLED` | 503 | Module flag off or secret not configured |
| `NOT_FOUND` | 404 | Listing/route not found |
| `DB_ERROR` | 500 | Database failure (sanitized) |
| `INTERNAL_ERROR` | 500 | Unexpected error |

## Example: create + analyze

```bash
curl -X POST "https://<ref>.supabase.co/functions/v1/ai-listings/listings" \
  -H "Content-Type: application/json" \
  -H "x-ai-listings-secret: $AI_LISTINGS_EDGE_SECRET" \
  -d '{"category":"vehicle","title":"Toyota Corolla","price":950000}'

curl -X POST "https://<ref>.supabase.co/functions/v1/ai-listings/listings/<id>/analyze" \
  -H "x-ai-listings-secret: $AI_LISTINGS_EDGE_SECRET"
```

## Events

| Event | Trigger |
|-------|---------|
| `listing_created` | POST `/listings` |
| `listing_updated` | PATCH `/listings/:id` |
| `listing_archived` | POST `/listings/:id/archive` |
| `listing_analyzed` | POST `/listings/:id/analyze` |

## Architecture

```
index.ts (Deno entry)
  └── _shared/ai-listings/handler.js
        ├── auth.js          (secret + module gate)
        ├── validation.js    (request validation)
        ├── router.js        (path parsing)
        ├── repositories.js  (service_role CRUD)
        └── analysis-pipeline.js (placeholder engine)
```

## Current posture: inactive by default

- Not registered in any production HTML/JS route
- No CORS allowance for browser origins
- No anon key usage
- Requires explicit env activation per environment

## Future public API plan

1. **Phase A — Admin proxy:** Admin panel calls Edge Function via server proxy with secret rotation
2. **Phase B — Authenticated users:** JWT + RLS owner policies; remove service_role from client path
3. **Phase C — Partner API:** API keys per partner, rate limits, scoped `source_type=partner`
4. **Phase D — Public read:** Published listings only (`status=active`), CDN-cached GET

## Internal test panel (Sprint-5)

Hidden page: `admin/ai-listings.html` — see [ADMIN_TEST_PANEL.md](./ADMIN_TEST_PANEL.md).

## Future admin integration

- Admin queue view over `GET /listings?status=draft`
- Event timeline via `GET /listings/:id/events`
- Manual re-analyze button → `POST /listings/:id/analyze`
- Archive moderation → `POST /listings/:id/archive`
