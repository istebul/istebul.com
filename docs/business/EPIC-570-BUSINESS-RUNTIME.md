# EPIC-570 — Business Runtime Integration

**Epic:** EPIC-570  
**Scope:** Production runtime layer between Business UI and ProviderResolver  
**Status:** Implemented (additive — prior EPICs unchanged)

## Objective

Introduce `src/business/runtime/` so the Business Intelligence pipeline can execute against tenant-aware contexts with provider lifecycle, cache, timeout, telemetry, and runtime health — while mock remains the default and Dashboard/Advisor visuals stay identical.

## Architecture

```
Business UI
    ↓
BusinessRuntime
    ↓
ProviderResolver
    ↓
Providers
    ↓
Analytics
    ↓
Scoring
    ↓
Health
    ↓
KPI
    ↓
Events
    ↓
Metrics
    ↓
Insights
    ↓
Recommendations
    ↓
Advisor
```

Provider selection goes through **ProviderResolver only** (via injected `ProviderResolver` / `createProviderResolver()`).  
`BusinessRuntime` does not instantiate adapters directly.

## Deliverables

| Module | Path | Role |
|--------|------|------|
| `BusinessRuntimeContext` | `src/business/runtime/BusinessRuntimeContext.ts` | Tenant-aware execution input |
| `BusinessRuntime` | `src/business/runtime/BusinessRuntime.ts` | Orchestrator |
| `BusinessRuntimeFactory` | `src/business/runtime/BusinessRuntimeFactory.ts` | Factory (`createBusinessRuntime`, `getDefaultBusinessRuntime`) |
| `RuntimeHealth` | `src/business/runtime/RuntimeHealth.ts` | Runtime health projection (≠ EPIC-540 domain health) |
| `RuntimeCache` | `src/business/runtime/RuntimeCache.ts` | In-memory TTL cache abstraction |
| `BusinessRuntimeResult` | `src/business/runtime/BusinessRuntimeResult.ts` | Result + telemetry contracts |
| Barrel | `src/business/runtime/index.ts` | Public exports |

## Features

- **Runtime execution context** — `tenantId`, `locale`, optional `actorId` / `bag`
- **Tenant-aware execution** — cache keys and telemetry scoped by tenant
- **Provider lifecycle** — `idle → resolving → ready → executing → complete|failed`
- **Cache abstraction** — optional in-memory TTL (`cache.enabled`, default off)
- **Timeout support** — soft budget (`timeoutMs`); sync pipeline records `timedOut` when exceeded
- **Execution telemetry** — duration, provider resolve ms, pipeline ms, kinds, fallback, cache hit
- **Runtime health** — `healthy | degraded | unhealthy | idle`
- **ProviderResolver-only selection** — mock default until explicitly configured

## Defaults (unchanged behaviour)

| Setting | Default |
|---------|---------|
| Provider kind | `mock` |
| Strict provider | `false` (live kinds fall back to mock) |
| Cache | disabled |
| Timeout | `5000` ms (soft) |

Pages continue to call `runBusinessIntelligenceEngine()` directly. Runtime is an additive entry point for tenant-aware / ops-ready execution. Advisor payload shape matches the existing intelligence engine (UI-identical).

## Out of scope

- API / network wiring
- UI / CSS changes
- Auth / tenant identity providers
- Database schema changes
- Mock removal or auto-activation of live providers

## Quality gates

```bash
npm run lint
npm run type-check
npm run build
npm test
```

## Tests

`tests/unit/business-runtime-integration.test.mjs`

## Prior EPICs preserved

| Epic | Concern |
|------|---------|
| 500 | Business MVP foundation |
| 510 | AI Business Advisor |
| 520 | Provider data layer |
| 530 | Analytics engine |
| 540 | Health scoring |
| 550 | KPI + events |
| 560 | Provider adapters + ProviderResolver |
