# AFAD Açık Veri — OD-2C Production Closure

**Phase:** AFAD deprem aktivite bilgilendirme katmanı (OD-2C)  
**Status:** Closed with production + staging verification (2026-06-16)  
**Runtime default:** Feature-flag disabled in production (`AFAD_EARTHQUAKE_ENABLED` kapalı)

---

## 1. Scope

OD-2C delivers a **score-neutral, informational AFAD earthquake activity layer** for the konut (housing) results screen. It builds on the OD-2B snapshot API foundation without changing decision scores, confidence scores, or earthquake risk scoring.

**OD-2C-1 — Isolated risk layer module**

- `js/features/results/results-afad-risk-layer.js`
- Exports: `buildAfadRiskLayer`, `renderAfadRiskLayerHtml`, `mountAfadRiskLayer`, `fetchAndBuildAfadRiskLayer`, `buildAfadAiActivitySentence` (module-only; not wired to AI narration in this phase)
- Unit tests: `tests/unit/results-afad-risk-layer.test.mjs`

**OD-2C-2 — Konut results mount**

- `js/features/konut/konut-results-v2.js` — `resolveKonutAfadLocation`, `hydrateKonutAfadRiskLayer`, mount after EVDS economic indicators + EVDS risk layer
- `css/konut-results-v2.css` — scoped `.konut-v2-root .ib-afad-risk-layer*` styles with mobile overflow safeguards
- Unit tests: `tests/unit/konut-wizard-afad.test.mjs`

**In scope for OD-2C closure:** UI module, konut mount wiring, scoped CSS, unit tests, production deploy verification, and this closure record.

**Out of scope for OD-2C:** AI narration, admin panel toggle, SEO data-sources page, prod flag enablement, konut score engine changes, and OD-2C-3 work.

---

## 2. Merge Records

### PR #382 — OD-2C-1 (isolated module)

| Field | Value |
|-------|-------|
| PR | [#382](https://github.com/istebul/istebul.com/pull/382) |
| Merge commit | `a2181340` |
| Merge message | `feat(results): add isolated AFAD risk layer module (OD-2C-1) (#382)` |
| Files | `js/features/results/results-afad-risk-layer.js`, `tests/unit/results-afad-risk-layer.test.mjs` |

### PR #383 — OD-2C-2 (konut mount)

| Field | Value |
|-------|-------|
| PR | [#383](https://github.com/istebul/istebul.com/pull/383) |
| Merge commit | `7b119764acf56dfa7d5aecfcee6f74310e927d59` |
| Merge message | `feat(konut): mount AFAD risk layer on results screen (OD-2C-2) (#383)` |
| Files | `js/features/konut/konut-results-v2.js`, `css/konut-results-v2.css`, `tests/unit/konut-wizard-afad.test.mjs` |

**Closure documentation commit:** docs-only; references merge `7b119764` as the production HEAD at OD-2C closure.

---

## 3. Production Verification

Post-merge verification on `main` at `7b119764`:

| Check | Run / result |
|-------|----------------|
| CI | `27651527605` — **success** (`quality`, `e2e-site-health`, `e2e-release`) |
| Production Deploy | `27651527590` — **success** (Test & Build, Cloudflare Pages, Live smoke post-deploy) |
| Cloudflare Pages build/deploy | `27651527031` — **success** (`build`, `deploy`, `report-build-status`) |
| Live smoke | `npm run smoke:live` — **PASS** (`failed=0`, `warned=6` known optional SPA shell warnings) |
| Regression tests | **60/60 PASS** (konut AFAD, AFAD risk layer, EVDS risk layer, AFAD API, konut EVDS, konut results v2) |

---

## 4. Disabled / Silent Production Behavior

With `AFAD_EARTHQUAKE_ENABLED` off (production default):

### API (`GET /api/afad-earthquake-snapshot`)

| Assertion | Observed (prod) |
|-----------|-----------------|
| HTTP status | `200` |
| `ok` | `false` |
| `data.status` | `"disabled"` |
| `data.source` | `"disabled"` |
| `data.earthquakes` | `[]` |
| `data.regionalSignals` | `[]` |
| `eventID` in response | absent |
| Coordinates (`latitude` / `longitude`) | absent |
| Secrets / env key names in body | absent |
| `meta.featureEnabled` | `false` |

### Konut UI

- `fetchAndBuildAfadRiskLayer` receives disabled snapshot → `hasData: false`
- `mountAfadRiskLayer` is a no-op when `!layer?.hasData`
- **No `data-afad-risk-layer` card** is added to the DOM in production
- Missing `province` / `district` in konut state → fetch skipped, no card

This is intentional: OD-2C ships the mount path safely while prod remains silent until a separate ops decision enables the flag.

---

## 5. Score-Neutral Guarantees

OD-2C does **not** modify:

| System | Status |
|--------|--------|
| `decisionScore` | unchanged |
| `confidenceScore` | unchanged |
| `metrics.earthquakeRiskScore` | unchanged |
| `calculateRiskLevel` | not touched |
| `real-estate-calculator.js` | not touched |
| `decision-intelligence-engine.js` | not touched (pre-existing imports only) |
| `functions/api/afad-earthquake-snapshot.js` | not touched in OD-2C |

AFAD layer is informational only. Mount runs **after** `buildKonutResultsV2Payload` and scoring paths complete.

---

## 6. Files Changed Across OD-2C

| Phase | Files |
|-------|-------|
| OD-2C-1 (#382) | `js/features/results/results-afad-risk-layer.js`, `tests/unit/results-afad-risk-layer.test.mjs` |
| OD-2C-2 (#383) | `js/features/konut/konut-results-v2.js`, `css/konut-results-v2.css`, `tests/unit/konut-wizard-afad.test.mjs` |

**Total runtime surface:** 5 files (+ this closure doc). No changes to API handler, data model, admin, workflow, migration, or SEO data in OD-2C.

---

## 7. Not Included

The following were **explicitly excluded** from OD-2C and remain separate future work:

| Item | Status |
|------|--------|
| AI narration (`earthquakeActivityAssessment` in `ai-insight-engine.js`) | **Not shipped** — OD-2C-3 |
| `buildAfadAiActivitySentence` wired to konut AI insight blocks | **Not shipped** |
| Production `AFAD_EARTHQUAKE_ENABLED=true` | **Not enabled** — separate ops decision |
| `data/seo/data-sources-page.json` AFAD entry | **Not changed** |
| Admin panel AFAD toggle | **Not shipped** |
| Konut score engine / `earthquakeRiskScore` wiring from AFAD | **Not shipped** |
| Auto / finance / tatil results AFAD mount | **Not shipped** (konut only) |

---

## 8. Staging Verification Plan

**Purpose:** Validate the full connected UI path before any production flag enablement.  
**Environment:** Cloudflare Pages **Preview** or dedicated **Staging** — **not** Production.  
**Prerequisite:** Set `AFAD_EARTHQUAKE_ENABLED=true` on the target preview/staging environment only.

### 8.1 Pre-checks

| # | Step | Pass criteria |
|---|------|---------------|
| 1 | Confirm prod flag state | Production `AFAD_EARTHQUAKE_ENABLED` remains unset or `false` |
| 2 | Enable flag on staging/preview only | Cloudflare Pages → Preview/Staging env → `AFAD_EARTHQUAKE_ENABLED=true` |
| 3 | Redeploy or trigger preview build | Preview URL serves new env |
| 4 | Hit staging API | `GET /api/afad-earthquake-snapshot?province=İstanbul&district=Silivri` → HTTP 200, `ok: true`, `data.status: "connected"` (or documented `degraded`/`fallback` with safe fields) |

### 8.2 Konut results UI — mount order

| # | Step | Pass criteria |
|---|------|---------------|
| 5 | Open `/konut/` on staging/preview | Page loads without console errors |
| 6 | Complete konut wizard with known `city` + `district` (e.g. İstanbul / Silivri) | Results V2 screen renders |
| 7 | Inspect hero aside mount order | Economic indicators → EVDS risk layer (`data-evds-risk-layer`) → AFAD card (`data-afad-risk-layer`) |
| 8 | AFAD card visible | Title, activity summary, attribution, “Resmi uyarı değildir” disclaimer present |

### 8.3 Copy / sanitization safety

| # | Step | Pass criteria |
|---|------|---------------|
| 9 | View page source / DevTools for AFAD card HTML | No `eventID`, `latitude`, `longitude`, `coordinates` |
| 10 | Search card text | No `earthquakeRiskScore`, no `/100` score copy from AFAD layer |
| 11 | Search card text | No directive phrases (`satın al`, `bekle`, `vazgeç`, etc.) |
| 12 | API response vs DOM | Internal fields from raw upstream not leaked into rendered card |

### 8.4 Score invariance (staging)

| # | Step | Pass criteria |
|---|------|---------------|
| 13 | Note `decisionScore` and `confidenceScore` on results screen | Record values before/after AFAD card appears |
| 14 | Compare with AFAD flag off on same inputs (local or mock) | Scores identical; AFAD mount does not mutate payload |
| 15 | Confirm `earthquakeRiskScore` in metrics unchanged | Wizard input risk score not overwritten by AFAD layer |

### 8.5 Disabled / error paths (staging or local)

| # | Step | Pass criteria |
|---|------|---------------|
| 16 | Set flag `false` on preview | API returns `disabled`; konut results show **no** AFAD card |
| 17 | Konut state without city/district | No AFAD fetch; no card |
| 18 | Simulate API fetch error (network block) | No card; page does not break |

### 8.6 Post-validation

| # | Step | Pass criteria |
|---|------|---------------|
| 19 | Document results | Record preview URL, date, tester, pass/fail per step |
| 20 | **Do not enable prod flag** unless product + ops sign-off | Production stays `AFAD_EARTHQUAKE_ENABLED` off after staging pass |

### 8.7 Automated regression (run on any machine)

```bash
node --no-warnings --test tests/unit/konut-wizard-afad.test.mjs
node --no-warnings --test tests/unit/results-afad-risk-layer.test.mjs
node --no-warnings --test tests/unit/results-evds-risk-layer.test.mjs
node --no-warnings --test tests/unit/afad-earthquake-snapshot-api.test.mjs
node --no-warnings --test tests/unit/konut-wizard-evds.test.mjs
node --no-warnings --test tests/unit/konut-results-v2.test.mjs
```

Expected: **60/60 PASS**.

### 8.8 Staging verification record

**Result:** **PASS** (2026-06-16)  
**Environment:** Cloudflare Pages **Preview** only — Production env unchanged.

| Field | Recorded value |
|-------|----------------|
| Preview URL | `https://2eadd6b4.istebul-com.pages.dev` |
| Preview env | `AFAD_EARTHQUAKE_ENABLED=true` (**Preview only**) |
| Production env | `AFAD_EARTHQUAKE_ENABLED` **off** (unchanged) |

#### Preview endpoint (`GET /api/afad-earthquake-snapshot?province=İstanbul&district=Silivri`)

| Assertion | Observed |
|-----------|----------|
| HTTP status | `200` |
| `ok` | `true` |
| `data.status` | `"connected"` |
| `data.source` | `"afad"` |
| `meta.featureEnabled` | `true` |
| `regionalSignals` (scoped) | `1` |
| `eventID` in response | absent |
| Coordinates (`latitude` / `longitude`) | absent |
| Internal score fields (`earthquakeRiskScore`, `activityScore`, `seismicBaseRisk`) | absent |
| Secrets / env key values in body | absent |

#### Konut results UI (manual — İstanbul / Silivri)

| Assertion | Result |
|-----------|--------|
| EVDS economic indicators visible | **PASS** |
| EVDS risk layer (`data-evds-risk-layer`) visible | **PASS** |
| AFAD card mounts after EVDS layer | **PASS** |
| `data-afad-risk-layer` present in DOM | **PASS** |
| “Deprem Aktivite Görünümü” title | **PASS** |
| “AFAD Deprem Dairesi” attribution | **PASS** |
| “Resmi uyarı değildir” disclaimer | **PASS** |

#### HTML / copy sanitization (manual DevTools)

| Assertion | Result |
|-----------|--------|
| No `eventID` in rendered card | **PASS** |
| No coordinates in rendered card | **PASS** |
| No internal score fields in rendered card | **PASS** |
| No `/100` score copy from AFAD layer | **PASS** |
| No secrets / env values in rendered card | **PASS** |
| No directive phrases (`satın al`, `bekle`, `vazgeç`, etc.) | **PASS** |

#### Score invariance (manual — same wizard inputs)

| Score | Result |
|-------|--------|
| `decisionScore` | unchanged — **PASS** |
| `confidenceScore` | unchanged — **PASS** |
| `metrics.earthquakeRiskScore` | unchanged — **PASS** |

#### Disabled path (Preview flag toggle)

| Assertion | Result |
|-----------|--------|
| Preview `AFAD_EARTHQUAKE_ENABLED=false` → AFAD card removed | **PASS** |
| `data-afad-risk-layer` absent when disabled | **PASS** |
| Konut results page does not break | **PASS** |
| EVDS layers continue to work | **PASS** |

#### Production safety (post-staging — unchanged)

| Assertion | Observed |
|-----------|----------|
| Production `AFAD_EARTHQUAKE_ENABLED` | **off** |
| Prod endpoint | HTTP `200`, `ok: false`, `data.status: "disabled"`, `meta.featureEnabled: false` |
| Prod konut UI | silent (no AFAD card) |

**Ops note:** Staging verification **PASS** does **not** authorize production flag enablement. Enabling `AFAD_EARTHQUAKE_ENABLED` on Cloudflare Pages **Production** remains a **separate product + ops decision** (see §9).

---

## 9. Next Phase Boundaries

| Phase | Scope | Status |
|-------|-------|--------|
| **OD-2C-3** | AI narration — `earthquakeActivityAssessment` / `buildAfadAiActivitySentence` wiring in `ai-insight-engine.js` | **Separate phase** — not started |
| **SEO** | `data/seo/data-sources-page.json` AFAD attribution entry | **Separate phase** |
| **Admin** | AFAD toggle in admin panel | **Separate phase** |
| **Prod enable** | `AFAD_EARTHQUAKE_ENABLED=true` on Cloudflare Pages Production | **Separate ops decision** — requires staging plan §8 sign-off |

OD-2C intentionally stops at a verified, flag-gated konut mount so downstream phases can ship incrementally.

---

## Operational Notes

1. **Default:** Leave `AFAD_EARTHQUAKE_ENABLED` unset or `false` in Cloudflare Pages **Production**.
2. **Staging first:** Complete §8 staging verification before any prod flag discussion.
3. **Rollback:** Set `AFAD_EARTHQUAKE_ENABLED=false` — API returns disabled payload; konut UI becomes silent immediately (no redeploy required for API; cached assets may need refresh).
4. **Monitoring:** Prod logs should show `afad_earthquake_snapshot_disabled` (expected). Staging with flag on should show `afad_earthquake_snapshot_served`.
5. **Related docs:** `docs/OPEN_DATA_OD-2B_CLOSURE.md` (API foundation), `.github/SECRETS.example.md` (ops env note).

---

*Closure documentation: docs-only; no runtime JS/CSS/HTML/functions/workflow/package/SEO changes.*
