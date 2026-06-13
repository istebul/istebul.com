# Auto Decision Intelligence Platform Upgrade

Production-safe incremental upgrade for `/auto/` — stack unchanged.

## Phase summary

| Phase | Scope | Key files |
|-------|--------|-----------|
| 1 | Ownership intelligence (TCO + depreciation) | `js/auto/cost-engine.js`, `js/auto/depreciation-engine.js`, `js/auto/auto-cost-engine.js` (re-export) |
| 2 | Trust & data transparency | `js/auto/ownership-transparency.js` |
| 3 | Recommendation intelligence + matrix | `js/auto/recommendation-intelligence.js`, `js/auto/auto-ai.js` |
| 4 | AI expert commentary lanes | `js/features/moat/ai-explanation-experience.js` |
| 5 | Premium UX CSS | `css/auto.css` |
| 6 | Provider bridge (no fake offers) | `js/auto/providers/*` |
| 7 | Lead qualification | Lead modal, `supabase/migrations/20260525_auto_lead_qualification.sql`, `auto-intake` |
| 8 | Analytics | `auto-app.js`, `auto-intake` ALLOWED_EVENTS |
| 9 | Hardening | escapeHtml on renders, existing null guards preserved |
| 10 | Validation | `npm test`, `npm run build` |
| 11 | **Vehicle Image Trust Layer (Faz 3F)** | `js/auto/vehicle-image-resolver.js`, `js/auto/vehicle-image.js`, `js/ui/comparison-ui.js` |

## Vehicle Image Trust Layer (Faz 3F)

Production-safe trust gating for Auto vehicle images — merged PRs #326–#330 (main `62b350f6`). Production verification **GO / PASS**.

### What changed

| Area | Behavior |
|------|----------|
| Auto result UI | Placeholder-first when `showRealImage:false`; “Görsel doğrulanamadı” copy; catalog SVG never shown as a real photo |
| Verified external error | Load failure → premium placeholder; **no** catalog fallback chain |
| Compare + `/karsilastir` | Auto items carry `imageTrust` metadata; legacy catalog SVG entries sanitized at render |
| Structured identity | `resolveVehicleImageTrust(vehicle).identity` and `.checks` metadata (incl. `strictExactMatchReady`) |

### Trust boundaries

- **Catalog SVG is never trustworthy** as a real vehicle image — illustrative assets only.
- **`showRealImage:true`** is designed for `verified_external` URLs that pass a strict year/trim identity gate — **not activated in Faz 3F**.
- Faz 3F **reduced false-image risk**; it did **not** expand real-image coverage.
- **`/secenekler` AI listings** (`listing.images[]`) and **dealer offer `image_url`** are separate models — outside Auto image trust.

### Key API

- `resolveVehicleImageTrust(vehicle)` — URL + trust classification (`sourceTrust`, `matchLevel`, `showRealImage`, `reason`)
- `.identity` — structured brand/model/year/trim from vehicle name or explicit fields
- `.checks` — gate flags including `strictExactMatchReady` (**metadata-only** in Faz 3F; does not change UI/classification)

### Production verification limits

Auto wizard result cards and populated compare state require wizard/data in production. Live visual smoke was supplemented by scoped unit tests (77/77) and production bundle audit.

### Next phase (Faz 3G / 3F-2)

**Prerequisite:** verified external URL **source contract** must be designed before enabling strict exact-match gate.

- Define which sources qualify as `verified_external`
- Require URL + brand/model/year/trim alignment before `showRealImage:true`
- Do **not** increase `showRealImage:true` without a new approved external image source

## Risks & mitigation

| Risk | Mitigation |
|------|------------|
| Breaking `estimateAnnualCost` imports | `auto-cost-engine.js` re-exports `buildOwnershipCosts` / `estimateAnnualCost` |
| CRM schema | Nullable columns only; notes fallback in intake |
| Fake partner offers | Adapters declare `hasLiveApi: false`; CTA opens lead modal only |
| AI hallucination | Facts/estimates/AI lanes separated; scores unchanged |

## Tests

- `tests/unit/auto-cost-engine.test.mjs`
- `tests/unit/auto-recommendation-intelligence.test.mjs`
- `tests/unit/decision-insight-panels.test.mjs` (existing)
- `tests/unit/ai-explanation-experience.test.mjs` (updated)
- `tests/unit/vehicle-image-resolver.test.mjs` (Faz 3F)
- `tests/unit/vehicle-image-trust.test.mjs` (Faz 3F)
- `tests/unit/vehicle-image.test.mjs` (Faz 3F)
- `tests/unit/vehicle-image-identity.test.mjs` (Faz 3F)

## Wizard additions

- `city_ratio` (şehir / dengeli / otoyol)
- `ownership_months` (12–48 ay)

## Analytics events

`auto_comparison_opened`, `auto_explanation_expanded`, `auto_financing_cta_clicked`, `auto_insurance_cta_clicked`, `auto_advisor_cta_clicked`, `auto_dealer_cta_clicked`
