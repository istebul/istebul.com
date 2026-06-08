# AI Listings — Admin QA Workflow (Sprint-7)

Internal quality-control workflow for seed and manual AI listings. This document describes how admins review, approve, reject, and archive listings inside the internal test panel.

**Public UI remains disabled.** No homepage, category route, or anonymous exposure is added in Sprint-7.

## Status definitions

| Status | Meaning |
|--------|---------|
| `draft` | New or edited listing not yet submitted for review |
| `pending_review` | Submitted and waiting for admin decision |
| `approved` | **Internally approved only** — not published publicly |
| `rejected` | Returned to author with a required rejection reason |
| `archived` | Retired from active QA; no further workflow actions |

Only these five values are valid. Create/patch requests and workflow actions reject any other status.

> **approved means internally approved only; public publishing remains disabled.**

## Admin action flow

Actions are available in `admin/ai-listings.html` when the panel is enabled via localStorage **and** you are signed in with an admin session (or legacy `istebul_ai_listings_secret` in localStorage for QA).

| Action | Route | From status | To status | Event type |
|--------|-------|-------------|-----------|------------|
| Submit for review | `POST /listings/:id/submit-review` | `draft`, `rejected` | `pending_review` | `listing_submitted_for_review` |
| Approve | `POST /listings/:id/approve` | `pending_review` | `approved` | `listing_approved` |
| Reject | `POST /listings/:id/reject` | `pending_review` | `rejected` | `listing_rejected` |
| Archive | `POST /listings/:id/archive` | any except `archived` | `archived` | `listing_archived` |
| Re-analyze | `POST /listings/:id/reanalyze` | any except `archived` | unchanged | `listing_reanalyzed` |

Each action:

1. Validates the current status transition
2. Updates `ai_listings.status` when the transition changes status
3. Appends an `ai_listing_events` row with `from_status`, `to_status`, and action-specific payload
4. Refreshes the admin list and detail panels

The legacy **Analyze** action (`POST /listings/:id/analyze`) remains unchanged and emits `listing_analyzed`.

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
- Rejected
- Archived

Selecting a chip sets the `status` query parameter on `GET /listings`.

## Future public publishing gate

Sprint-7 deliberately does **not** connect approved listings to the public marketplace.

`isListingPubliclyVisible()` in `status-workflow.js` always returns `false`. A future sprint must introduce an explicit publish gate (for example `published` status, feature flag, or separate public index) before any listing appears on isteBul category pages or search.

Until that gate ships:

- Do not link AI listings from homepage or menus
- Do not expose listings to anonymous users
- Treat `approved` as internal QA sign-off only

## Related docs

- [ADMIN_TEST_PANEL.md](./ADMIN_TEST_PANEL.md) — enabling the internal panel
- [EDGE_FUNCTION_API.md](./EDGE_FUNCTION_API.md) — full edge API reference
- [FUTURE_INTEGRATION_PLAN.md](./FUTURE_INTEGRATION_PLAN.md) — planned public integration
