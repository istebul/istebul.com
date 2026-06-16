# Fixed Issues — Production Audit (2026-05-25)

Issues identified during full production audit and **safely corrected** in this pass.

---

## 0. AFAD Açık Veri OD-2B — production closure (2026-06-16)

| Item | Detail |
|------|--------|
| Phase | AFAD deprem snapshot open-data foundation (OD-2B) |
| Merge | PR [#380](https://github.com/istebul/istebul.com/pull/380) → `62d04a0c` |
| Scope | Server-side `/api/afad-earthquake-snapshot` endpoint + sanitized public contract; **not** a UI/admin/konut-scoring integration |
| Prod state | `AFAD_EARTHQUAKE_ENABLED` kapalı → HTTP 200, `ok: false`, `data.status: "disabled"`, boş `earthquakes` / `regionalSignals` |
| EVDS isolation | `/api/evds-snapshot` regression PASS (`ok: true`, `source: "evds"`) |
| Verification | CI `27627169133`, Production Deploy `27627169096`, Pages `27627160942`; `npm run smoke:live` failed=0 |
| Closure doc | `docs/OPEN_DATA_OD-2B_CLOSURE.md` |

**Not a bug-fix release.** OD-2B closes the snapshot foundation with production verification. **OD-2C** (UI surfacing, admin controls, konut score wiring) is intentionally out of scope and tracked as a separate future phase.

---

## 1. Auto catalog SVG rendered as real vehicle photos (Faz 3F — 2026-06-13)

| Issue | Cause | Fix |
|-------|-------|-----|
| Catalog SVG assets (e.g. brand/model icons) appeared in Auto result UI and compare cards as if they were real vehicle photos | Resolver returned illustrative catalog URLs; UI bound `src` directly without trust gating | **Faz 3F Vehicle Image Trust Layer** (PRs #326–#330, main `62b350f6`): placeholder-first UI when `showRealImage:false`; “Görsel doğrulanamadı” copy; verified external load error → placeholder (no catalog chain); compare storage + `/karsilastir` Auto cards trust-aware; legacy catalog SVG compare entries sanitized at render |

**Trust boundaries (unchanged scope):**
- Catalog SVG is never treated as a trustworthy real vehicle image.
- `showRealImage:true` is reserved for verified external URLs that pass a strict identity gate (future phase).
- `/secenekler` AI listings (`listing.images[]`) and dealer offer `image_url` are separate models — not routed through Auto image trust.

**Production verification:** GO / PASS (CI `27477115336`, Production Deploy `27477115351`, Cloudflare pages `27477115064`; scoped unit 77/77; `smoke:live` failed=0).

**Manual visual smoke note:** Auto wizard result cards and populated compare state require wizard/data in production; live visual checks were supplemented by unit tests and production bundle audit.

**Key files:** `js/auto/vehicle-image-resolver.js`, `js/auto/vehicle-image.js`, `js/ui/comparison-ui.js`

---

## 2. Smoke test drift (CI / local quality)

| Issue | Cause | Fix |
|-------|-------|-----|
| Hero preview title mismatch | Product copy updated to "Lokasyon ve Kredi Dengeli 2+1 Daire"; test expected old string | Updated `scripts/smoke-test.cjs` assertion |
| Decision confidence threshold | Simulation mode caps confidence at **68** (`liveProvidersEnabled: false`) | Assert `>= 65` instead of `>= 70` |
| Admin market save read | Test read `localStorage` with wrong key / null parse | Assert on `app.marketData` after `handleAdminMarketSubmit` |
| `renderDecisionResults` missing | `installAssistantUI` not called before `new UIManager()` | Import and call `installAssistantUI(UIManager)` in smoke test |
| Decision history storage key typo | Test used `istebu_*` vs canonical `istebul_*` | Fixed keys; assert via `app.decisionHistory` + `readStoredArray` |

**Files:** `scripts/smoke-test.cjs`

---

## 3. Tooling additions (no behavior change)

| Addition | Purpose |
|----------|---------|
| `npm run type-check` | Alias to `check-syntax.cjs` (no TS project) |
| `npm run production:audit` | `scripts/production-health-audit.cjs` |
| `scripts/production-health-audit.cjs` | Consolidated build/lint/CF/Supabase/Stripe static audit |
| `dist/production-health-audit.json` | Machine-readable audit output |

**Files:** `package.json`, `scripts/production-health-audit.cjs`

---

## Not changed (intentional)

| Item | Reason |
|------|--------|
| `npm audit fix --force` | Risk of breaking esbuild/eslint tree |
| Bundle size reduction | Out of scope; separate perf sprint |
| Supabase live connection test | No secrets in agent environment |
| Direct `wrangler pages deploy` | Uses GitHub Actions + Cloudflare Git integration |
| React/TS migration | Architecture decision — SPA is JS |

---

## Pre-existing passes (verified, not modified)

- ESLint clean  
- 148 unit tests  
- Launch / resilience / compliance audits  
- P4–P7 feature audits  
- Admin panel stability audit  

---

*Commit on `main` includes smoke-test and audit tooling only.*
