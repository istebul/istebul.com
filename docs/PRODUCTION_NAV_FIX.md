# Production nav blank body — root cause & fix

## Symptom

Top navigation renders; **Metodoloji** (`#how-it-works`), **Planlar** (`#pricing`), and sometimes landing content after **Karar analizi** (`/auto/`) appear blank while URL/hash changes.

## Root cause

Two systems fought over section visibility:

1. **`Router.showSection()`** — On SPA routes (`/ilanlar`, `/karsilastir`, …) sets `display: none` on every `section[id]`. Returning to the marketing page via **hash-only** links (`#pricing`, `#how-it-works`) did not reset pathname or re-run home layout when `currentRoute` was already `/`.

2. **`applyProductionRouteVisibility()`** (`js/app.js`) — Ran on every click (deferred). With pathname still on an app route (e.g. `/karsilastir`) and hash `#pricing`, it kept **only** the compare section visible and left marketing blocks hidden. The `.hidden` class (`display: none !important`) overrode inline `display: block` from the router.

## Fix

| Area | Change |
|------|--------|
| `js/core/router.js` | `goToMarketingHash()`, `showHomeSections()`, hash/`/#` click handling, path aliases `/metodoloji`, `/planlar`, `/karar-analizi`, `hashchange` listener |
| `js/app.js` | Marketing hash + alias early exit in visibility guard; removed duplicate hash handler; removed per-click visibility race |
| `index.html` | Close `</main>` for valid DOM |

## Deploy verification checklist

- [ ] `npm test` passes locally and in CI
- [ ] Merge PR to `main`; production workflow deploys `dist/`
- [ ] Hard-refresh (or purge CDN) and confirm `build-manifest.json` hash changed
- [ ] `/` → **Metodoloji** → **Planlar** → scroll + visible pricing cards
- [ ] `/karsilastir` → **Planlar** → full landing + pricing visible
- [ ] `/planlar` and `/metodoloji` → correct section + scroll
- [ ] `/auto/` (Karar analizi) loads funnel (separate HTML; not SPA hash)
- [ ] No console errors on hash navigation

## Test gate (no push without tests)

```bash
node scripts/setup-git-hooks.cjs   # installs pre-push → npm test
npm test
```
