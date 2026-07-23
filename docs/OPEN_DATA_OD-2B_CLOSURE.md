# AFAD Açık Veri — OD-2B Production Closure

**Phase:** AFAD deprem snapshot open-data foundation (OD-2B)  
**Status:** Closed with production verification (2026-06-16)  
**Runtime default:** Feature-flag disabled in production

---

## Scope

OD-2B delivers a **server-side, sanitized public snapshot endpoint** for AFAD earthquake activity data:

- `GET /api/afad-earthquake-snapshot` (Cloudflare Pages Function)
- National/regional event normalization, cache, stale fallback, and public-field sanitization
- Feature flag gating via `AFAD_EARTHQUAKE_ENABLED` (alias: `AFAD_EARTHQUAKE_FEATURE_ENABLED`)

**In scope for OD-2B:** API foundation, unit tests, production deploy, and verification record.

**Out of scope for OD-2B:** UI surfacing, admin panel controls, konut decision scoring, SEO data-source page wiring, cron jobs, Supabase migrations, and OD-2C work.

---

## Merge Record

| Field | Value |
|-------|-------|
| PR | [#380](https://github.com/istebul/istebul.com/pull/380) |
| Merge commit | `62d04a0c1d54c8f484e31a2ed7df38c3f9957e4e` |
| Merge message | `feat(api): add AFAD earthquake snapshot endpoint (OD-2B) (#380)` |
| Base at closure docs | `49c61597` (`fix(secenekler): bind non-vehicle listing image runtime placeholder fallback (#379)`) |

---

## Production Verification

| Check | Run / result |
|-------|----------------|
| CI | `27627169133` — **success** |
| Production Deploy | `27627169096` — **success** |
| Cloudflare Pages build/deploy | `27627160942` — **success** |
| Live smoke | `npm run smoke:live` — **PASS** (`failed=0`, `warned=6` known optional SPA shell warnings) |

### Prod AFAD endpoint (`GET /api/afad-earthquake-snapshot`)

With `AFAD_EARTHQUAKE_ENABLED` off (production default):

| Assertion | Observed |
|-----------|----------|
| HTTP status | `200` |
| `ok` | `false` |
| `data.status` | `"disabled"` |
| `data.source` | `"disabled"` |
| `data.earthquakes` | `[]` |
| `data.regionalSignals` | `[]` |
| `eventID` in response | absent |
| Coordinates (`latitude` / `longitude`) | absent |
| Internal score fields | absent |
| Secrets / env key names in body | absent |

### EVDS regression (`GET /api/evds-snapshot`)

| Assertion | Observed |
|-----------|----------|
| HTTP status | `200` |
| `ok` | `true` |
| `source` | `"evds"` |
| JSON contract | intact (no AFAD-side regression) |

---

## Endpoint Contract

Public response envelope (shared API pattern):

```json
{
  "ok": false,
  "data": {
    "status": "disabled",
    "source": "disabled",
    "fetchedAt": null,
    "dataDate": null,
    "earthquakes": [],
    "regionalSignals": [],
    "attribution": { "...": "..." }
  },
  "meta": {
    "featureEnabled": false,
    "fallbackReason": "AFAD_EARTHQUAKE_ENABLED (veya AFAD_EARTHQUAKE_FEATURE_ENABLED) kapalı"
  }
}
```

When enabled and upstream is healthy, `ok` becomes `true`, `data.status` is `"connected"`, and `data.source` is `"afad"`. Query params `province` and `district` optionally scope regional signals.

**Key implementation files (merged in #380, unchanged by this closure doc):**

- `functions/api/afad-earthquake-snapshot.js`
- `js/data/afad-earthquake-service.js`
- `js/data/afad-earthquake-model.js`
- `js/data/afad-earthquake-cache.js`

---

## Security / Sanitization

- Upstream AFAD fetch is **server-side only**; no browser-direct AFAD calls.
- `sanitizePublicEarthquakeEvent()` strips internal identifiers (`eventID`) and coordinates before any public payload.
- `sanitizeRegionalSignal()` exposes activity summaries only — no internal scoring fields.
- `responseContainsSecrets()` blocks responses that leak env key names or auth-like tokens.
- Disabled mode performs **no upstream fetch** — safe default for production.

---

## EVDS Isolation

AFAD OD-2B does not modify the EVDS snapshot path. Production verification confirmed:

- `/api/evds-snapshot` continues to serve TCMB EVDS data independently.
- No shared cache namespace collision between AFAD and EVDS snapshot handlers.
- `TCMB_EVDS_API_KEY` remains the EVDS credential; AFAD has no separate API key requirement.

---

## Not Included

The following were **explicitly excluded** from OD-2B and remain future work:

| Item | Status |
|------|--------|
| Homepage / konut UI surfacing of earthquake data | Not shipped |
| Admin panel toggle for AFAD | Not shipped |
| Konut decision score integration | Not shipped |
| `data/seo/data-sources-page.json` AFAD entry | Not shipped |
| Scheduled cron refresh jobs | Not shipped |
| Supabase persistence for earthquake events | Not shipped |
| OD-2C planning / implementation | Separate phase |

---

## OD-2C Boundary

**OD-2C** is the next open-data phase and is **not part of this closure**. Expected OD-2C themes (subject to separate spec):

- Product-facing surfacing (UI cards, copy, attribution UX)
- Admin/ops controls and staging validation workflow
- Optional konut context integration (with explicit trust boundaries)
- SEO / data-sources hub alignment

OD-2B intentionally stops at a verified, flag-gated API foundation so OD-2C can ship incrementally without retroactive contract changes.

---

## Operational Notes

1. **Default:** Leave `AFAD_EARTHQUAKE_ENABLED` unset or `false` in Cloudflare Pages Production until OD-2C product sign-off.
2. **Staging validation:** Enable `AFAD_EARTHQUAKE_ENABLED=true` on a preview/staging environment first; verify `ok: true`, sanitized fields, and cache behavior before production enablement.
3. **No GitHub secret required** for AFAD — control is via Cloudflare Pages environment variable only.
4. **Monitoring:** Check Cloudflare Functions logs for `afad_earthquake_snapshot_disabled` (expected in prod) vs `afad_earthquake_snapshot_served` (when enabled).
5. **Rollback:** Set `AFAD_EARTHQUAKE_ENABLED=false` — endpoint immediately returns safe disabled payload without redeploy.

---

*Closure documentation commit: docs-only; no runtime JS/CSS/HTML/functions changes.*
