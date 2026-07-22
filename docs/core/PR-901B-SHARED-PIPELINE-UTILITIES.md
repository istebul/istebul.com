# PR-901B — Shared Pipeline Utilities

**Epic:** EPIC-302.5  
**PR:** PR-901B — Shared Pipeline Utilities  
**Date:** 2026-07-22  
**Risk:** LOW

## Amaç

Production öncesi son mimari konsolidasyon: tekrar eden pipeline yardımcı fonksiyonlarını (`timing`, `stage`, `telemetry`, `summary`, `validation` primitives) `src/core/pipeline/` altında tekilleştirmek.

- Business logic / pipeline flow / PipelineRunner davranışı değişmez  
- Public helper export **isimleri** korunur  
- Domain dosyaları ince wrapper / re-export olur

## Tekilleştirilen yardımcılar

| Core module | Functions |
|-------------|-----------|
| `pipeline/timing` | `nowMs`, `startStageTimer`, `endStageTimer`, `StageTimer` |
| `pipeline/helpers` | `createSkippedStageExecution`, `createStageExecution` |
| `pipeline/telemetry` | `collectStageTelemetryMaps`, `buildAdminStyleExecutionTelemetry`, `buildIntegrationStyleExecutionTelemetry`, `buildCountedAdminExecutionTelemetry` |
| `pipeline/summary` | `buildPipelineExecutionSummary`, `buildStageCountSummaryItems`, `buildIntegrationStageSummaryItems` |
| `pipeline/validation` | `pushInvalidLocaleIssue`, `pushEmptyOptionalStringIssue`, `pushProviderContextRequiredIssue`, `pushEmptyProviderContextIdIssue`, … |

## Etkilenen modüller

| Module | Change |
|--------|--------|
| `identity/runtime/timing.ts` | Re-export from core |
| `business-admin/runtime/timing.ts` | Re-export from core |
| `platform-admin/runtime/timing.ts` | Re-export from core |
| Identity Access `helpers.ts` | Thin wrappers + validation primitives |
| Auth Integration `helpers.ts` | Thin wrappers + validation primitives |
| Tenant Integration `helpers.ts` | Thin wrappers + validation primitives |
| Business Admin `helpers.ts` | Thin wrappers |
| Platform Admin `helpers.ts` | Thin wrappers |

**Not touched:** PipelineRunner / Facade / engines / adapters / bridges (beyond timing import path via domain `timing.ts` re-export).

## Risk Analizi

| Risk | Level | Mitigation |
|------|-------|------------|
| Success-mode drift (admin vs auth) | Avoided | Explicit `PipelineSuccessMode` |
| Freeze style drift (spread vs direct) | Avoided | Family A/B builders preserve historical freeze style |
| Public API rename | Avoided | Domain wrappers keep names |
| Circular deps | None | Core leaf; domains import core |
| Runner behavior change | None | Runners still call same helper exports |

**Overall: LOW**

## Test Sonuçları

| Gate | Result |
|------|--------|
| `tsc -p src/core` | Pass |
| `tsc -p src/identity` | Pass |
| `tsc -p src/business-admin` | Pass |
| `tsc -p src/platform-admin` | Pass |
| ESLint (core pipeline + wired helpers/timing) | Pass |
| `npm run build` | Pass |
| Focused suites (shared pipeline + contracts + E2E facades) | 370 pass / 0 fail |

## Backward Compatibility

- Same export names from domain helpers and `runtime/timing`
- Same observable return shapes for stage/telemetry/summary builders
- Consumers importing domain barrels do not need import path changes

## Self Review

| Check | Result |
|-------|--------|
| Duplicate helper sayısı azaldı mı? | Yes — timing×3 + stage/telemetry/summary helpers across 5 packages → core |
| Circular dependency oluştu mu? | No — core is a leaf |
| Runtime davranışı değişti mi? | No |
| Public API korundu mu? | Yes |
| Build başarılı mı? | Yes |
| Testler başarılı mı? | Yes (370 focused) |
