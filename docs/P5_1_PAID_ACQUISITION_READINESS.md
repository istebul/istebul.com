# P5.1 — Paid acquisition readiness

Scalable paid growth across **Google Search**, **Meta**, **TikTok**, **YouTube**, and **retargeting**.

---

## 1. Attribution

| Signal | Storage | Notes |
|--------|---------|-------|
| `gclid`, `gbraid`, `wbraid` | `istebul_attribution` | Google Search / YouTube |
| `fbclid` | first-touch | Meta |
| `ttclid` | first-touch | TikTok |
| `msclkid` | first-touch | Microsoft / retargeting |
| `paid_platform` | URL param or inferred | `google_search`, `meta`, `tiktok`, `youtube`, `retargeting` |

**Code:** `js/features/growth/paid-acquisition.js` → `capturePaidAttribution()`

---

## 2. Landing page strategy

| Platform | Primary LP | Secondary |
|----------|------------|-----------|
| Google Search | `/auto/` | `/` (brand) |
| Meta | `/auto/` | `/` |
| TikTok | `/auto/` | — |
| YouTube | `/auto/` | `/karar-analizi` |
| Retargeting | `/planlar` | `/auto/` (checkout abandon) |

**Campaign URLs:** `buildPaidCampaignUrl('google_search' | 'meta' | …)`  
**Config:** `data/growth/paid-channels.json`

---

## 3. Event tracking

| Event | Purpose |
|-------|---------|
| `paid_click_capture` | Click ID landed |
| `paid_landing_view` | Paid session on LP |
| `paid_funnel_step` | Step + platform mapping |
| `paid_conversion_signal` | Ads manager alignment |
| Canonical funnel | `landing_visit` … `paid_conversion` (unchanged) |

**Funnel map:** `PAID_FUNNEL_MAP` in `paid-acquisition.js` (Google / Meta / TikTok labels).

---

## 4. Funnel mapping

```
paid click → paid_landing_view → hero_cta_click → auto_start
  → wizard_complete → results_view → lead_submit
  → pricing_view → checkout_start → paid_conversion
```

Server mirror: `POST /api/paid-conversion-ingest` on `lead_submit`, `checkout_start`, `checkout_complete`.

---

## 5. CAC measurement

1. Copy `data/growth/paid-spend.template.json` → `data/growth/paid-spend.json`  
2. Enter weekly spend per platform (TRY)  
3. Run: `npm run metrics:paid-cac`

**Outputs:** `dist/paid-cac-report.json` — leads, paid, CAC/lead, CAC/paid per platform.

**Admin:** Platform Analytics → Growth Command Center → **Paid platforms (P5.1)** table.

---

## 6. Conversion API readiness

| Platform | Endpoint | Env vars |
|----------|----------|----------|
| Meta | Graph API via `paid-conversion-ingest` | `META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN` |
| Google Ads | Payload built; upload when `GOOGLE_ADS_CONVERSION_ACTION_ID` set | `GOOGLE_ADS_CONVERSION_ACTION_ID` |
| TikTok | Events API (phase 2) | `TIKTOK_EVENTS_API_TOKEN` (future) |

**Security:** `PAID_CONVERSION_SECRET` → header `x-paid-conversion-secret` (optional; recommended production).

**Client bridge:** `sendServerPaidConversion()` in `paid-capi-bridge.js`

---

## 7. Remarketing audiences

Definitions: `data/growth/remarketing-audiences.json`

| Audience | Use |
|----------|-----|
| `auto_results_no_lead_7d` | Google, Meta, YouTube |
| `auto_start_no_complete_3d` | TikTok, Meta |
| `checkout_abandon_7d` | Google, Meta, retargeting |
| `pricing_view_no_checkout_7d` | Meta, retargeting |
| `lead_no_purchase_30d` | Google, retargeting |

Export: Supabase `analytics_events` or admin funnel — match `includeEvents` / `excludeEvents` in JSON.

---

## Launch checklist

- [ ] Create ad accounts (Google, Meta, TikTok, YouTube)
- [ ] Set env: `META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN`, `PAID_CONVERSION_SECRET`
- [ ] Deploy Pages function `paid-conversion-ingest`
- [ ] Test URL: `buildPaidCampaignUrl('google_search')` → live `/auto/`
- [ ] Verify admin Paid platforms table after 24h traffic
- [ ] Weekly `npm run metrics:paid-cac` + update `paid-spend.json`

**Related:** `docs/GROWTH_EXECUTION_PLAN.md`, `data/growth/paid-channels.json`
