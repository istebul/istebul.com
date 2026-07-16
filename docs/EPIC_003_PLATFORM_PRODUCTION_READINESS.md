# PR-574 — EPIC-003 Platform Production Stabilization

## Production Readiness Report

**Decision: READY WITH WARNINGS**

Platform Landing (`/`) product-entry navigation, history contract, stale AI-home disposal, and surface analytics are stabilized for production. No new product/feature/design surface was added.

---

### Verdict summary

| Area | Status |
|------|--------|
| Platform → AI card CTA (`/` → `/ai/`) | PASS |
| Garson / Business full-page + Back → Platform | PASS |
| SPA must not cache/show AI home on `/` | PASS |
| History push/replace/pop/refresh contract | PASS |
| Shared URL + CTA contract | PASS |
| Deep links `/ai`, `/ai#pricing`, `/ai/#landing-faq` | PASS |
| Analytics distinct page_view per surface | PASS |
| SEO canonical / no root AI hashes | PASS |
| Lint / type-check / build / unit / e2e | See gate run |

---

### Root cause (pre-fix)

1. `/ai/` was missing from `full-page-navigation.js`, so Platform product cards were intercepted by the SPA `navigate('/ai/')` path and collapsed to the Platform `home` surface under an `/ai/` URL.
2. `js/app.js` still listed legacy AI marketing section IDs, desynced from `router.js`.
3. Stale `/#pricing` / `/#landing-faq` deep links were not redirected to `/ai/`.
4. `/ai/`, `/garson/`, `/business/` did not boot consent-gated analytics.

---

### What changed (by file)

| File | Why | What fixed |
|------|-----|------------|
| `js/runtime/platform-url-contract.js` | Single runtime URL SoT for active phase | Product entries + legacy AI hash redirect map |
| `js/runtime/platform-cta.js` | Shared CTA helper | Normalize stale `/#…` → `/ai/#…` |
| `js/runtime/full-page-navigation.js` | SPA escape for all product entries | `/ai/`, `/garson/`, `/business/` leave SPA |
| `js/core/router.js` | History + route contract | Legacy hash redirect; preserve hash on full-page replace |
| `js/app.js` | Dispose old AI home state | Marketing IDs = Platform only; bfcache pageshow; `#pricing` redirect |
| `js/runtime/route-surface.js` | Surface ID hygiene | Platform marketing IDs; AI IDs separated |
| `js/ui/components/user-dashboard-panels.js` | Stale FAQ link | `/#landing-faq` → `/ai/#landing-faq` |
| `js/ai/ai-landing-boot.js` | Canonical AI hash URLs | `/ai#x` → `/ai/#x` |
| `js/platform/site-analytics.js` | Distinct surfaces | platform / ai / garson / business categories |
| `js/runtime/platform-surface-analytics-boot.js` | Analytics on standalone docs | Consent boot on product surfaces |
| `ai/index.html`, `garson/index.html`, `business/index.html` | Wire analytics boot | Distinct `page_view` paths |
| `index.html` | Uniform product nav escape | AI nav uses same full-page contract (no special `data-native-route`) |
| `src/platform/components/.../PlatformUrunKarti.ts` | CTA contract attrs | `data-platform-product-id` + `data-platform-product-entry` |
| `src/platform/constants/platform-url-map.ts` | Docs accuracy | Notes reflect live cutover |
| `src/platform/constants/platform-nav-footer-ia.ts` | IA fasad = live URLs | Footer/nav CURRENT = `/ai/` etc. |
| Unit + E2E specs | Production scenarios | Cards, Back/Forward/Refresh, deep links, redirects |

---

### Tests

- Unit: `full-page-navigation`, `platform-url-contract`, `router` (legacy hash + `/ai` escape)
- E2E: `marketing-shell` EPIC-003 history suite; `site-health` includes `/garson/`, `/business/`

---

### Warnings (non-blocking)

1. Root `index.html` still embeds the SPA app shell for premium routes (`/karar-asistani/`, `/planlar`, …). That is intentional; Platform marketing sections are isolated.
2. Historical `PLATFORM_PRODUCT_URLS.current` for `istebul-ai` remains `/` for cutover delta audits; runtime uses `target`.
3. Accessibility/contrast audits were not re-run end-to-end in this PR beyond existing suites — rely on CI `test:accessibility` if required by release checklist.

---

### Release recommendation

Ship after green CI on this branch. Platform Landing is production-ready for navigation, history, analytics separation, and SEO hash hygiene.
