# Karar Nabzı — Faz 2a Production Closure

**Phase:** Karar Nabzı Faz 2a — Auto passive retention metadata split
**Status:** Closed with production verification
**Closure date:** 2026-06-22
**Main HEAD at closure:** `0d4d8a5b`
**Runtime default:** Karar Nabzı feature flag remains **off** in production
**Final verdict:** **KARAR NABZI FAZ 2A CLOSED / PRODUCTION VERIFIED**

---

## Summary

Faz 2a semantically separates **passive Auto results retention** from **explicit Karar Nabzı opt-in tracking**. Auto analysis still writes revisit snapshots to `istebul_saved_decisions` via `notifyDecisionSaved`, but passive events no longer increment the `saved_decision` habit score. Metadata-first split only — no dashboard/revisit/lifecycle copy changes, no Karar Nabzı store/UI changes, and no changes to `enrollSavedDecisionRevisit`.

Faz 1 (PR #434) delivered the opt-in tracking foundation. Faz 2a (PR #435) merged to `main` on 2026-06-22. Post-merge CI, Production Deploy, live smoke, and targeted unit regressions passed.

---

## Phase Context

### Faz 1 (foundation — closed)

| Field | Value |
|-------|-------|
| PR | [#434](https://github.com/istebul/istebul.com/pull/434) |
| Merge commit | `3e21d6629a044b37c7358fbf0385ec2869e25147` |
| Status | CLOSED |
| Deliverable | Auto V2 opt-in tracking foundation |
| Storage key | `istebul_karar_nabzi_v1` |
| Feature flag | Default **off**; opt-in via `/auto/?karar_nabzi=1` |

**Key Faz 1 files (unchanged by Faz 2a):**

- `js/features/karar-nabzi/karar-nabzi-flags.js`
- `js/features/karar-nabzi/karar-nabzi-store.js`
- `js/features/karar-nabzi/karar-nabzi-snapshot.js`
- `js/auto/auto-results-v2.js` (opt-in track CTA + `saveTrackedDecision`)

### Faz 2a (this closure)

| Field | Value |
|-------|-------|
| PR | [#435](https://github.com/istebul/istebul.com/pull/435) |
| Merged at | 2026-06-22T11:38:25Z |
| Merge commit | `0d4d8a5b1864d591abc9d0b3d36af31752485b3e` |
| Branch | `cursor/karar-nabzi-faz-2a-passive-metadata-a797` |
| Feature commit | `bc01dd4173dfd6e5dc4189c3247740c1419c44cd` |

---

## Scope

**In scope for Faz 2a:**

| Layer | Deliverable |
|-------|-------------|
| Auto passive payload | `notifyDecisionSaved` metadata: `passive: true`, `tracked: false`, `intent: 'auto_results_view'`, `source: 'auto_results_passive'` |
| Retention persist | `saveDecisionSnapshot` stores `passive`, `tracked`, `intent` when present |
| Analytics | Event name `retention_decision_saved` unchanged; passive records add `is_passive: true` |
| Habit split | `detail.passive === true` → skip `recordHabitAction('saved_decision')` |
| Tests | `retention-saved-decisions.test.mjs` (new), `retention-ltv.test.mjs` (extended) |

**Key implementation files (merged; unchanged by this closure doc):**

- `js/auto/auto-app.js`
- `js/features/growth/retention-saved-decisions.js`
- `js/features/growth/retention-ltv.js`
- `tests/unit/retention-saved-decisions.test.mjs`
- `tests/unit/retention-ltv.test.mjs`

**Explicitly unchanged:**

| Area | Status |
|------|--------|
| `notifyDecisionSaved` bridge | Retained |
| `enrollSavedDecisionRevisit` | Unchanged |
| Dashboard / revisit / lifecycle copy | Unchanged |
| Karar Nabzı store (`istebul_karar_nabzi_v1`) | Unchanged |
| Karar Nabzı UI / feature flag default | Unchanged |
| Supabase / functions / migrations | Not touched |
| GitHub workflows / package / wrangler | Not touched |

**Out of scope for Faz 2a:**

- Lifecycle email gate product decision
- Dashboard/revisit copy differentiation
- Finans bridge
- Nabız list/profile snippet
- Backend sync

---

## Merge Record

| PR | Title | Merge commit | Merged |
|----|-------|--------------|--------|
| [#435](https://github.com/istebul/istebul.com/pull/435) | Karar Nabzı Faz 2a: pasif Auto retention metadata ayrıştırması | `0d4d8a5b1864d591abc9d0b3d36af31752485b3e` | 2026-06-22T11:38:25Z |

**Changed files (5):**

- `js/auto/auto-app.js` (+4 / −1)
- `js/features/growth/retention-ltv.js` (+12 / −3)
- `js/features/growth/retention-saved-decisions.js` (+9 / −1)
- `tests/unit/retention-ltv.test.mjs` (+131 / −3)
- `tests/unit/retention-saved-decisions.test.mjs` (+160 / new)

---

## Runtime Behavior

### Passive Auto results retention (`notifyDecisionSaved`)

After a successful Auto analysis with results, `auto-app.js` dispatches:

```js
{
  id, categoryId, topVehicle, score, summary, revisitPath, userId,
  passive: true,
  tracked: false,
  intent: 'auto_results_view',
  source: 'auto_results_passive'
}
```

### Retention snapshot (`istebul_saved_decisions`)

| Scenario | Snapshot written | Metadata persisted | `saved_decision` habit |
|----------|------------------|--------------------|------------------------|
| Auto passive results view | Yes | `passive: true`, `tracked: false`, `intent`, `source` | **No** |
| Legacy event (no passive metadata) | Yes | Optional fields absent | **Yes** |
| Tracked explicit save (`tracked: true`, `passive: false`) | Yes | `tracked: true` | **Yes** |

### Analytics

| Field | Value |
|-------|-------|
| Event name | `retention_decision_saved` (unchanged) |
| Passive payload property | `is_passive: true` when `entry.passive === true` |

### Karar Nabzı opt-in (Faz 1 — separate path)

| Control | Behavior |
|---------|----------|
| Storage key | `istebul_karar_nabzi_v1` |
| Default | Flag **off** |
| Opt-in URL | `https://www.istebul.com/auto/?karar_nabzi=1` |
| Write path | `saveTrackedDecision` in `auto-results-v2.js` (unchanged by Faz 2a) |

Passive retention (`istebul_saved_decisions`) and opt-in tracking (`istebul_karar_nabzi_v1`) remain **separate stores**.

---

## Test Evidence

### Unit tests (main @ `0d4d8a5b`)

| File | Result | Coverage |
|------|--------|----------|
| `tests/unit/retention-saved-decisions.test.mjs` | **5/5 PASS** | Passive metadata persist, backward compat, analytics `is_passive`, corrupt JSON, 24-record limit |
| `tests/unit/retention-ltv.test.mjs` | **9/9 PASS** | Passive habit skip, legacy habit retained, tracked explicit habit retained, snapshot on passive events |
| `tests/unit/karar-nabzi-snapshot.test.mjs` | **9/9 PASS** | Faz 1 regression (unchanged store/UI contract) |

**Faz 2a regression total:** **23/23 PASS**

### Post-merge CI (`0d4d8a5b`)

| Run | ID | Jobs | Result |
|-----|-----|------|--------|
| CI | [27949889394](https://github.com/istebul/istebul.com/actions/runs/27949889394) | `quality`, `e2e-site-health`, `e2e-release` | **success** |
| Production Deploy | [27949889393](https://github.com/istebul/istebul.com/actions/runs/27949889393) | Test & Build, E2E release gate, Cloudflare Pages, Live smoke, Edge function smoke guard | **success** |

---

## Production Verification

### HTTP smoke

| Route | Status |
|-------|--------|
| `https://www.istebul.com/auto/` | HTTP **200** |
| `https://www.istebul.com/auto/?karar_nabzi=1` | HTTP **200** |

### Live bundle markers (post-deploy)

| Marker | Asset | Observed |
|--------|-------|----------|
| `auto_results_passive` | `auto-app.c1a7d31e40.js` | Present |
| `passive:!0`, `auto_results_view` | prod auto bundle | Present |
| `istebul_saved_decisions`, `passive===!0`, `is_passive` | prod retention chunk | Present |
| `istebul_karar_nabzi_v1` | prod auto bundle | Present (separate store) |

### `smoke:live` (optional SPA shell warnings only)

`failed=0`, `warned=6` — known non-blocking SPA shell marker warnings on secondary routes.

---

## Safety / Out of Scope

The following were **explicitly not changed** in Faz 2a:

| Area | Status |
|------|--------|
| `js/features/karar-nabzi/**` | Not changed |
| `js/features/account/dashboard-v2.js` | Not changed |
| `js/features/growth/retention-revisit.js` | Not changed |
| `js/features/lifecycle/lifecycle-client.js` (`enrollSavedDecisionRevisit`) | Not changed |
| `js/features/growth/retention-reactivation.js` | Not changed |
| `js/finans/**` | Not changed |
| `supabase/**`, `functions/**` | Not changed |
| `.github/workflows/**` | Not changed |
| `package.json`, `package-lock.json`, `wrangler.toml` | Not changed |
| AI / deterministic engine files | Not changed |

---

## Known Non-blockers

- **Passive retention still writes revisit snapshots** — by design; only the `saved_decision` habit increment is suppressed.
- **`enrollSavedDecisionRevisit` still fires** when `AUTO_LEAD_EMAIL` is set — unchanged from pre-Faz-2a behavior; lifecycle email gate is a Faz 2b product decision.
- **SPA shell marker warnings** on some secondary routes during `smoke:live` — pre-existing, non-blocking.

---

## Related Docs

| Doc | Relation |
|-----|----------|
| PR [#434](https://github.com/istebul/istebul.com/pull/434) | Faz 1 foundation (opt-in tracking) |
| PR [#435](https://github.com/istebul/istebul.com/pull/435) | Faz 2a merge record |
| `docs/KARAR_MAHKEMESI_2B_CLOSURE.md` | Unrelated parallel Auto feature closure format reference |

---

## Not Included / Faz 2b+ (conscious next work)

| Item | Notes |
|------|-------|
| **Lifecycle email gate** | Product decision: when passive retention should vs should not trigger `enrollSavedDecisionRevisit` / lifecycle enroll |
| **Dashboard / revisit copy split** | UX copy to distinguish passive snapshots vs explicit Karar Nabzı tracked decisions |
| **Finans bridge** | Extend Nabız tracking/metadata patterns to Finans vertical |
| **Nabız list / profile snippet** | User-facing surfaced list of tracked decisions beyond Auto V2 CTA |
| **Backend sync** | Server-side persistence / cross-device sync for Karar Nabzı (deferred) |

---

*Closure documentation: docs-only record; no runtime JS/CSS/HTML/functions changes.*
