# isteBul AI Listings Engine v1 — Admin Test Panel

## Overview

Sprint-5 adds an **internal-only** test panel for exercising the `ai-listings` Edge Function. It is **hidden by default** and has **no public navigation link**.

| File | Purpose |
|------|---------|
| `admin/ai-listings.html` | Standalone page (not in admin-panel nav) |
| `js/admin/ai-listings-admin.js` | UI wiring |
| `js/admin/ai-listings-admin-core.js` | Testable utilities |
| `css/admin-ai-listings.css` | Scoped styles (`.ai-listings-admin` only) |

URL (after deploy): `https://www.istebul.com/admin/ai-listings.html`

`robots.txt` already disallows `/admin/`.

## Enable locally

### 1. Enable the panel UI

```javascript
localStorage.setItem('istebul_ai_listings_admin', 'on');
location.reload();
```

Without this flag, the page shows a hard **Disabled** gate.

### 2. Set the Edge Function secret

```javascript
localStorage.setItem('istebul_ai_listings_secret', '<AI_LISTINGS_EDGE_SECRET>');
location.reload();
```

The secret is **never hardcoded** in source. It must match the Supabase function env `AI_LISTINGS_EDGE_SECRET`.

### 3. Ensure backend is active

Supabase Edge Function env:

```
AI_LISTINGS_SUPABASE_ENABLED=true
AI_LISTINGS_EDGE_SECRET=<same secret as localStorage>
```

If the module is off, API returns **503** and the panel shows: **"AI Listings module is disabled."**

### 4. Ensure `env.js` has Supabase URL

The panel reads `window.__env.SUPABASE_URL` to call:

```
{SUPABASE_URL}/functions/v1/ai-listings
```

## localStorage keys

| Key | Value | Purpose |
|-----|-------|---------|
| `istebul_ai_listings_admin` | `"on"` | Enables panel UI |
| `istebul_ai_listings_secret` | secret string | Sent as `x-ai-listings-secret` header |

## Test workflows

### Create listing

1. Fill category, title, optional price/currency/source_url
2. Attributes JSON textarea (optional) — must be valid object JSON
3. Submit → `POST /listings`

### List + filter

Use filters: category, status, source_type, limit → `GET /listings`

### Detail / analyze / archive

1. Click a listing in the list
2. View fields, latest analysis, event timeline
3. **Analyze** → `POST /listings/:id/analyze`
4. **Archive** → `POST /listings/:id/archive`
5. **Refresh** reloads detail + events

## Safety notes

- **No public nav** — page is not linked from homepage, categories, or `admin-panel.html`
- **noindex** meta tag on the page
- **Scoped CSS** — all rules under `.ai-listings-admin`
- **Text sanitization** — `escapeHtml` on all rendered dynamic text
- **Client-side validation** — JSON attributes + http/https URL before submit
- **Secret in localStorage** — dev/QA only; rotate secret and clear after testing
- **Not for production users** — internal QA tool until admin proxy exists (Sprint-6+)

## Why no public nav yet

1. Edge API requires shared secret (not suitable for browsers in production)
2. Module remains inactive by default (`AI_LISTINGS_SUPABASE_ENABLED=false`)
3. RLS blocks anon/authenticated DB access
4. Product UI integration is a separate sprint with auth proxy and RLS Phase A

## Disable panel

```javascript
localStorage.removeItem('istebul_ai_listings_admin');
localStorage.removeItem('istebul_ai_listings_secret');
location.reload();
```
