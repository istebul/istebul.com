# Architecture Milestone Review

**Date:** 2026-07-22  
**Scope:** Milestone review after Identity Foundation (EPIC-203), Authentication Integration (EPIC-301A–301E), and Tenant Integration (EPIC-302A–302E)  
**Method:** Read-only analysis — no code changes, no refactors, no runtime moves  
**Baseline:** `main` @ `6541863b` (`feat(tenant): implement tenant integration end-to-end`)

---

## Verdict

**READY WITH WARNINGS**

The layered runtime architecture is consistent, Architecture Freeze has been respected across recent EPICs, Dependency Injection is the default wiring model, and unit coverage for identity/auth/tenant stacks is strong. Continuation of product EPICs is justified.

Warnings are structural (not blockers): repeated PipelineRunner/helpers/telemetry clones across packages, a few cross-domain mutual import edges inside `src/identity`, mega-barrel export surfaces, and folder-level TypeScript packages without npm package boundaries.

---

## 1. Genel mimari durumu

### Surfaces under `src/`

| Package folder | Role | Approx. TS files | Integration E2E |
|----------------|------|------------------|-----------------|
| `src/identity/` | Identity, auth, session, authorization, tenant, business-context bridges | ~138 | Identity Access, Auth Integration, Tenant Integration |
| `src/business-admin/` | Business admin workspaces + facade | ~81 | Business Admin E2E |
| `src/platform-admin/` | Platform admin domains + facade | ~61 | Platform Admin E2E |
| `src/business/` | Business engines (import/analysis/decision/…) | ~721 | Per-domain pipeline runners |

These are **folder packages** with local `tsconfig.json` (strict), not separate npm workspaces. Root `package.json` type-checks them via `npx tsc -p src/<pkg>/tsconfig.json`.

### Identity domain map (current milestone focus)

```
src/identity/
├── runtime/                 # Identity foundation + shared timing
├── authentication/          # runtime · adapters · providers/supabase · bridge · integration
├── session/                 # Session Management Runtime
├── authorization/           # Authorization Runtime
├── tenant-isolation/        # runtime · adapters · providers/supabase · bridge · integration
├── bridge/                  # Identity Bridge (auth ↔ identity)
├── business-context/        # Business Context Bridge (tenant ↔ business port)
└── integration/             # Identity & Access E2E (PR-203F)
```

### Intended layering (observed)

1. **Runtime** — registries, modules, projection contexts/results  
2. **Adapters / Providers** — provider ports + Supabase implementations (DI client ports)  
3. **Bridges** — map provider results → runtime modules  
4. **Integration** — PipelineRunner + Facade orchestrating stages end-to-end  

Architecture Freeze pattern: new EPICs add additive layers and barrel re-exports; prior epic implementations stay untouched.

### Runtime dependency direction (desired vs observed)

| From | To | Status |
|------|----|--------|
| Authentication | Identity `runtime` | OK |
| Session | Authentication results + Identity `runtime` | OK (type coupling) |
| Tenant Isolation runtime | Auth / Session / Authorization results | OK (projection inputs) |
| Business Context Bridge | Tenant Session Bridge + `BusinessRuntimePort` | OK — **no** `business-admin` import |
| Tenant Integration | Business Context Bridge (sibling under identity) | OK structurally; creates mutual domain edge (see §3) |
| Identity package | `business-admin` / `platform-admin` / `business` engines | **None** (good boundary) |

---

## 2. Güçlü yönler

1. **Consistent E2E recipe** — Facade → PipelineRunner → ExecutionContext → ExecutionResult → aggregate Result, with Validation → … → Summary and “summary always runs / always valid result” semantics across Identity Access, Auth Integration, Tenant Integration, Business Admin, and Platform Admin.

2. **Architecture Freeze discipline** — EPICs 203 / 301 / 302 delivered as additive layers; prior runtimes unchanged except barrel exports. Matches documented PR architecture reviews under `docs/identity/` and `docs/business/`.

3. **Dependency Injection** — Bridges and runners take `*Dependencies` interfaces; providers accept client ports (`Supabase*ClientLike`); no singletons / no new global bags. Instance-scoped pipeline bags only.

4. **Port isolation for Business Admin** — `BusinessRuntimePort` keeps `business-context` free of `business-admin` imports while remaining structurally compatible with `BusinessAdminRuntime`.

5. **Provider boundary** — Supabase auth/tenant providers are DI-injected; no live queries, RLS, middleware, or API in 301/302 scope (as designed).

6. **Test density** — Identity/auth/tenant epic suites routinely ship 70–100+ unit tests per layer; E2E suites validate skip-on-validation, telemetry, and orchestration.

7. **Telemetry contract** — Total duration, stage durations, succeeded/skipped counts, summary count appear consistently on integration runners.

8. **Clear out-of-scope posture** — Repository / RLS / CRUD / Dashboard / Middleware deferred; reduces premature coupling to infrastructure.

---

## 3. Teknik borçlar

| Debt | Severity | Notes |
|------|----------|-------|
| Cloned integration helpers / runners across packages | Medium | ~11 nearly isomorphic PipelineRunner + helpers pairs; ~4.5k LOC in integration runners+helpers alone |
| Duplicated `timing.ts` / `*Timing.ts` | Low–Medium | Same timer helpers in identity, business-admin, platform-admin, and each business domain pipeline |
| Mega-barrel `src/identity/index.ts` (~650 LOC) | Medium | Deep re-export chain (3–4 levels); increases accidental coupling and cold import cost in tests |
| Mutual domain imports inside identity | Medium | See §3 cycles below — compile-time cycles, not runtime loops today |
| No npm package boundaries | Low | Folder + tsconfig only; cannot enforce import rules via package.json `exports` |
| Registry proliferation (91 `*Registry*` files under `src/`) | Medium | Pattern is intentional per domain, but shared RegistryRuntime base is missing |
| Business package size (~721 TS files) | Medium | Orthogonal to tenant milestone but raises overall maintainability load |
| Dual orchestration stacks | Low–Medium | Identity Access E2E (203F) vs Auth Integration (301E) vs Tenant Integration (302E) overlap conceptually; composition story not yet unified |

### Circular / mutual import edges (identity)

Resolved from relative imports:

| Pair | Nature |
|------|--------|
| `authentication` ↔ `session` | Session context types auth results; Auth Session Bridge imports session runtime |
| `authentication` ↔ `bridge` | Identity Bridge imports auth adapter/session bridge; Auth Integration imports Identity Bridge |
| `business-context` ↔ `tenant-isolation` | Business Context Bridge imports tenant session bridge; Tenant Integration imports business-context |

These are **architectural cycles between folders**, not infinite runtime recursion. They complicate tree-shaking, future package splits, and “which layer owns which type” decisions.

---

## 4. Tekrarlayan yapılar

### PipelineRunner / Facade / ExecutionContext / ExecutionResult

| Artifact | Count under `src/` | Locations |
|----------|-------------------|-----------|
| `*PipelineRunner.ts` | 11 | identity×3, business×6, business-admin×1, platform-admin×1 |
| `*Facade.ts` | 11 | same split |
| `*ExecutionContext.ts` | 11 | same split |
| `*ExecutionResult.ts` | 11 | same split |
| Integration `helpers.ts` | 11 | near-identical validation/stage/telemetry builders |

Stage vocabulary repeats: `validation` → domain stages → `summary`, skip-on-validation lists, frozen stage labels, bag result keys.

### Registry

- **Identity alone:** 11 registry modules (Identity, Auth, Session, Authorization, Tenant Isolation, provider registries, bridge registries).  
- **Repo-wide:** ~91 `*Registry*` files — mostly business domain registries plus admin/identity.

Common shape: `Registry` + `RegistryRuntime` + `create*Registry` + optional builtins seed flag.

### Telemetry

Shared *idea*, duplicated *code*:

- `src/identity/runtime/timing.ts`
- `src/business-admin/runtime/timing.ts`
- `src/platform-admin/runtime/timing.ts`
- Per-domain `*Timing.ts` under `src/business/*/pipeline/runtime/`

Integration telemetry fields (`totalDurationMs`, `stageDurationsMs`, `succeededStageCount`, `skippedStageCount`, `summaryCount`) are copy-pasted per epic.

### ExecutionContext / Result shape duplication

Each integration defines its own:

- Pipeline bag type  
- Validation issue / summary item interfaces  
- Aggregate Result + ExecutionResult  
- Stage execution record  

Types are isomorphic; only stage IDs and nested result fields differ.

---

## 5. Refactor önerileri

**Advisory only — not to execute in this review.** Prefer a dedicated tech-debt EPIC with Architecture Freeze exceptions approved by product owner.

1. **Extract shared integration primitives (identity-first)**  
   Candidate shared module (e.g. `src/identity/integration/shared/` or later `src/runtime-kit/`): stage timer, stage execution record builders, skip-on-validation helper, generic telemetry aggregator. Keep domain stage IDs and result payloads domain-owned.

2. **Break mutual imports with ports**  
   - Auth Integration should depend on an `IdentityBridgePort`, not concrete `IdentityBridge` folder.  
   - Tenant Integration should depend on a `BusinessContextBridgePort` living beside or above both packages.  
   - Session should consume auth result DTOs from a neutral `contracts/` folder if package splits are planned.

3. **Slim barrels**  
   Prefer domain entrypoints (`identity/authentication`, `identity/tenant-isolation`) for consumers; keep root `identity/index.ts` as a compatibility facade or deprecate deep re-exports gradually.

4. **Registry base**  
   Optional generic `createRegistryRuntime<TRegistration>()` to cut boilerplate — only if it does not force behavior changes across freezes.

5. **Unify E2E composition narrative**  
   Document how Identity Access (203F), Auth Integration (301E), and Tenant Integration (302E) relate (compose vs replace). Avoid a fourth parallel “super facade” without an explicit composition epic.

6. **Enforce boundaries**  
   Add lint rules (`eslint-plugin-import` / dependency-cruiser) forbidding `business-admin` ← identity reverse imports and limiting cross-domain cycles.

7. **Do not merge 302A–302D into one folder “cleanup”**  
   Freeze value outweighs cosmetic relocation until a boundary epic is scheduled.

---

## 6. Performans riskleri

| Risk | Likelihood | Impact | Mitigation direction |
|------|------------|--------|----------------------|
| Mega-barrel import in unit tests (`import('../../src/identity/index.ts')`) pulls large graph | High (dev/CI) | Slower test startup | Import domain barrels / specific modules in new tests |
| Deep orchestration stacks (adapter → provider → session bridge → business bridge → integration) | Medium | Extra allocation / mapping passes per request | Acceptable for projection-first; profile before optimizing |
| Cloned timing/`Date` usage per stage | Low | Noise only | Shared timer is enough |
| Business package size | Medium (product features) | Build/typecheck time | Already split by domain; keep incremental tsc projects |
| No evidence of hot-path N+1 DB access in these layers | — | — | Providers remain ports; risk appears when real Supabase queries land |

No production performance incident is implied by this review — risks are structural/CI-oriented.

---

## 7. Test kapsamı

### Organization

- Unit: `tests/unit/*.test.mjs` with `node:test` + TypeScript resolve helper (`tests/helpers/business-ts-resolve.mjs`).  
- Integration: `tests/integration/*.test.mjs` (network/Supabase-sensitive; may skip when unconfigured).  
- Epic suites live beside product tests in a flat `tests/unit/` folder (no `tests/unit/identity/` subtree yet).

### Identity / Auth / Tenant / related Admin epic coverage (approx. `it()` counts)

| Suite | ~Tests |
|-------|--------|
| Identity runtime / access E2E | 56 + 103 |
| Auth runtime / adapter / supabase / session bridge / identity bridge / auth E2E | 66 + 64 + 70 + 80 + 85 + 100 |
| Session / Authorization / Tenant Isolation runtimes | 79 + 79 + 83 |
| Tenant adapter / supabase tenant / session bridge / business context / tenant E2E | 75 + 86 + 92 + 95 + 103 |
| Business Admin + Platform Admin runtimes/facades | 33 + 15 + 27 + 13 |
| **Approx. total (listed epic-related)** | **~1.4k `it()` calls across ~23 files** |

### Gaps / observations

- Strong unit coverage of happy path, validation failure, telemetry, and DI wiring.  
- Limited true integration tests for Supabase provider + RLS (intentionally out of scope so far).  
- Flat test directory will become harder to navigate as EPICs continue.  
- Some older suites (`business-admin-runtime-facade`, `platform-admin-runtime-facade`) are thinner than 301/302 E2E bars (15 / 13 vs 100+).

---

## 8. Gelecek EPIC'lere etkisi

| Upcoming concern | Guidance from this milestone |
|------------------|------------------------------|
| Repository / Supabase queries / RLS | Introduce behind existing provider ports; do not rewrite Adapter/Bridge contracts |
| API / Middleware | Keep outside runtimes; call Facades from thin handlers |
| Business CRUD / Dashboard | Consume `BusinessRuntimePort` / Business Admin facade; do not import CRUD into identity |
| Further auth/tenant features | Prefer extending providers/bridges over new parallel PipelineRunner clones when possible |
| Cross-vertical composition | Decide composition of Identity Access + Auth Integration + Tenant Integration before adding another E2E facade |
| Shared kit extraction | Schedule as explicit tech-debt epic with Freeze waiver; do not sneak into feature EPICs |
| Package boundaries | If splitting npm packages, resolve mutual imports first (`authentication↔session`, `business-context↔tenant-isolation`) |

### What not to do next without an explicit epic

- Relocate 301/302 folders  
- Merge registries into one global registry  
- Introduce global singleton session/tenant state  
- Point identity barrels at `business-admin` concrete types  

---

## Appendix A — Import direction snapshot (`src/identity`)

```
runtime ← authentication, session, authorization, tenant-isolation, bridge, business-context, integration

authentication → runtime, session, bridge
session → runtime, authentication
authorization → runtime, authentication, session
tenant-isolation → runtime, authentication, session, authorization, business-context
bridge → runtime, authentication
business-context → runtime, tenant-isolation
integration → runtime, authentication, session, authorization, tenant-isolation
```

Mutual: `authentication↔session`, `authentication↔bridge`, `business-context↔tenant-isolation`.

## Appendix B — Pattern inventory (repo)

| Pattern | Count |
|---------|-------|
| PipelineRunner | 11 |
| Facade | 11 |
| ExecutionContext | 11 |
| ExecutionResult | 11 |
| Integration helpers | 11 |
| `*Dependencies` interfaces | 17 |
| Registry-related TS files | ~91 |
| Timing helper modules | 9 |

## Appendix C — Milestone lineage (recent `main`)

| Commit / PR | Epic |
|-------------|------|
| #648 Identity Access E2E | 203F |
| #649–#653 Auth Adapter → Auth E2E | 301A–301E |
| #654–#658 Tenant Adapter → Tenant E2E | 302A–302E |

---

## Decision

### READY WITH WARNINGS

**Ready** to continue feature EPICs on top of Adapter / Provider / Bridge / Integration layers.

**Warnings** to track (non-blocking):

1. Structural duplication of PipelineRunner / helpers / telemetry  
2. Mutual import edges inside `src/identity`  
3. Mega-barrel and flat test-layout scaling pressure  
4. Need for an explicit composition story across 203F / 301E / 302E before another E2E facade

No code was modified for this review.
