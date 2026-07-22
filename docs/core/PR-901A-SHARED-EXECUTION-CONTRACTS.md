# PR-901A — Shared Execution Contracts

**Epic:** EPIC-302.5  
**PR:** PR-901A — Shared Execution Contracts  
**Date:** 2026-07-22  
**Risk:** LOW

## Amaç

Production Release öncesi düşük riskli mimari konsolidasyon: tekrar eden execution contract / interface / type tanımlarını `src/core/execution/` altında ortaklaştırmak.

- Business logic değişmez  
- Runtime / pipeline davranışı değişmez  
- Public API type **isimleri** korunur (%100 backward compatible)

## Mimari yaklaşım

1. Yeni type-only paket: `src/core/execution/`
2. Domain E2E katmanları shared tipleri `type` alias veya `extends` ile kullanır
3. PipelineRunner, Facade, helpers, registries, engine’ler **dokunulmaz**
4. Business-engine Türkçe stage outcome’ları (`basarili` / …) bilinçli olarak **hariç** tutulur

```
src/core/execution/
  ExecutionContext.ts
  ExecutionResult.ts
  ExecutionSummary.ts
  ExecutionStage.ts
  ExecutionTiming.ts
  ExecutionMetadata.ts
  ExecutionError.ts
  index.ts
```

## Taşınan ortak tipler

| Core type | Rol |
|-----------|-----|
| `ExecutionLocale` / `ExecutionLocaleInput` | Locale unions |
| `PipelineBag` | `Record<string, unknown>` bag |
| `ExecutionContextBase` | `locale?`, `actorId?`, `initialBag?` |
| `ExecutionResultBase<…>` | `stageExecutions` + `telemetry` + `bag` |
| `ExecutionSummaryItem` | `{ key, label, value }` |
| `PipelineExecutionSummaryBase` | Stage count summary |
| `StageOutcome` | `'succeeded' \| 'failed' \| 'skipped'` |
| `StageExecutionBase<TStage>` | Stage execution record |
| `ExecutionTiming` / `ExecutionWindow` | Timing fields |
| `StageTelemetryMaps` / `StageCountTelemetry` | Telemetry fragments |
| `ResultTelemetryBase` | Result-inner timing + `summaryItemCount` |
| `ValidationIssueBase` / `ExecutionIssueSeverity` | Validation issues |
| `ExecutionMetadata` / `ExecutionBagMetadata` | Metadata placeholders |

## Etkilenen modüller

Type-only alias / extends (public names unchanged):

| Module | Files |
|--------|-------|
| Identity Access E2E | `IdentityAccessExecutionContext/Result`, `stages` |
| Auth Integration E2E | `AuthenticationIntegrationExecutionContext/Result`, `stages` |
| Tenant Integration E2E | `TenantIntegrationExecutionContext/Result`, `stages` |
| Business Admin E2E | `BusinessAdminExecutionContext/Result`, `stages` |
| Platform Admin E2E | `PlatformAdminExecutionContext/Result`, `stages` |

Tooling (include new package):

- `src/identity|business-admin|platform-admin/tsconfig.json` — `../core/**/*.ts`, `rootDir: ".."`
- `package.json` — `type-check` + `lint` include `src/core`

## Backward Compatibility

| Guarantee | How |
|-----------|-----|
| Same export names from domain barrels | `export type Foo = CoreFoo` / `interface Foo extends CoreBar` |
| Same structural shapes | Field-for-field equivalent |
| Same runtime JS | Type-only erase; no runner/helper edits |
| Consumer imports unchanged | Still import from `identity` / `business-admin` / `platform-admin` |

## Risk Analizi

| Risk | Level | Mitigation |
|------|-------|------------|
| Public API rename | Avoided | Domain aliases keep names |
| Over-unifying Auth vs Admin telemetry | Avoided | Compose Family A/B from fragments |
| Merging business Turkish outcomes | Avoided | Out of scope |
| Circular dependency via core | None | Core has no domain imports |
| Behavior change | None | Types only |

**Overall: LOW**

## Test Sonuçları

| Gate | Result |
|------|--------|
| `tsc -p src/core` | Pass |
| `tsc -p src/identity` | Pass |
| `tsc -p src/business-admin` | Pass |
| `tsc -p src/platform-admin` | Pass |
| ESLint (`src/core` + touched integration files) | Pass |
| `npm run build` | Pass |
| Regression `shared-execution-contracts.test.mjs` | 20 pass |
| Focused E2E suites (identity-access, auth, tenant, business-admin facade, platform-admin facade + regression) | 354 pass / 0 fail |

## Self Review

| Check | Result |
|-------|--------|
| Duplicate type tanımları azaldı mı? | Yes — 5× identical shapes → 1 core + aliases |
| Circular dependency oluştu mu? | No — core is a leaf |
| Public API korundu mu? | Yes — same type names |
| Runtime davranışı değişti mi? | No |
| Build başarılı mı? | Yes |
| Testler başarılı mı? | Yes (354 focused unit tests) |
