# AI Listings — Admin QA Workflow

Quality-control workflow for seed, import, and user-intake AI listings. Admins review, approve, **publish**, reject, archive, and re-analyze listings in `admin/ai-listings.html`.

Public catalog at `/secenekler/` consumes only **`published`** rows when `site_settings.ai_listings_public_enabled` is true. See [README.md](./README.md#public-publishing-gate-how-secenekler-works).

## Status definitions

| Status | Meaning |
|--------|---------|
| `draft` | New or edited listing not yet submitted for review |
| `pending_review` | Submitted and waiting for admin decision |
| `approved` | **Internally approved only** — not on public catalog |
| `published` | **Public catalog eligible** when site toggle is on |
| `rejected` | Returned to author with a required rejection reason |
| `archived` | Retired from active QA; no further workflow actions |

Valid statuses are enforced by `status-workflow.js` (`LISTING_STATUSES`).

> **approved alone is not public.** Operators must run **Publish** (`approved` → `published`) and ensure `ai_listings_public_enabled` is on for `/secenekler/` to show the row.

## Admin action flow

Actions are available in `admin/ai-listings.html` when signed in with an admin session (or legacy `istebul_ai_listings_secret` in localStorage for QA).

| Action | Route | From status | To status | Event type |
|--------|-------|-------------|-----------|------------|
| Submit for review | `POST /listings/:id/submit-review` | `draft`, `rejected` | `pending_review` | `listing_submitted_for_review` |
| Approve | `POST /listings/:id/approve` | `pending_review` | `approved` | `listing_approved` |
| Reject | `POST /listings/:id/reject` | `pending_review` | `rejected` | `listing_rejected` |
| Archive | `POST /listings/:id/archive` | any except `archived` | `archived` | `listing_archived` |
| Re-analyze | `POST /listings/:id/reanalyze` | any except `archived` | unchanged | `listing_reanalyzed` |
| **Publish** | `POST /listings/:id/publish` | `approved` | `published` | `listing_published` |
| **Unpublish** | `POST /listings/:id/unpublish` | `published` | `approved` | `listing_unpublished` |

Each action:

1. Validates the current status transition (`resolveStatusTransition` in `status-workflow.js`)
2. Updates `ai_listings.status` when the transition changes status
3. Appends an `ai_listing_events` row with `from_status`, `to_status`, and action-specific payload
4. Refreshes the admin list and detail panels

The **Analyze** action (`POST /listings/:id/analyze`) emits `listing_analyzed` without changing QA status.

## Public visibility rule (code)

`isListingPubliclyVisible(status, env)` in `status-workflow.js`:

- Returns `false` when `AI_LISTINGS_PUBLIC_PUBLISH_ENABLED` is not truthy in `env`
- Returns `true` only when `status === 'published'` and publish flag is on

The SPA additionally gates client fetch on `site_settings.ai_listings_public_enabled` (`js/runtime/ai-listings-integrations.js`).

Supabase RLS (`20260702_ai_listings_publish_learning_v1.sql`): anon/authenticated may `SELECT` `ai_listings` and related analyses **only** where parent listing `status = 'published'`.

## Rejection reason behavior

Reject requires a JSON body:

```json
{ "reason": "Explain why the listing was rejected" }
```

- `reason` is required (1–2000 characters)
- Stored in `ai_listing_events.payload.reason`
- Shown in the admin events list for `listing_rejected` events

## Quality checklist

The detail panel shows a deterministic checklist derived from listing data (no LLM):

| Check | Rule |
|-------|------|
| `has_title` | Non-empty `title` |
| `has_price` | Finite `price` > 0 |
| `has_location` | Non-empty `location` |
| `has_description` | Non-empty `description` |
| `has_attributes` | Non-empty `attributes` object |
| `has_analysis` | Latest analysis present |
| `has_images` | `images` array length > 0 |

Implementation: `supabase/functions/_shared/ai-listings/quality-checklist.js`

## Admin filters

Status filter chips in the list panel:

- All (no status query param)
- Draft
- Pending Review
- Approved
- **Published**
- Rejected
- Archived

Selecting a chip sets the `status` query parameter on `GET /listings`.

## Related docs

- [ADMIN_TEST_PANEL.md](./ADMIN_TEST_PANEL.md) — enabling the internal panel
- [EDGE_FUNCTION_API.md](./EDGE_FUNCTION_API.md) — full edge API reference
- [FUTURE_INTEGRATION_PLAN.md](./FUTURE_INTEGRATION_PLAN.md) — remaining integrations (trust UI, partner lead, extra categories)
