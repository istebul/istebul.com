# Business Admin Foundation

**Epic:** EPIC-202  
**PR:** PR-202A — Business Admin Foundation Runtime

## Scope

Business Admin için temel runtime ve modül iskeleti. Bu katman tek bir tenant'ın
(işletmenin) Business Runtime yönetim yüzeyi için yalnızca projeksiyon üretir.

## Architecture Freeze v1.0

- Foundation interface'leri değiştirilmez
- Core Runtime değiştirilmez
- Platform Admin değiştirilmez
- Business Runtime Engine'lerine dokunulmaz
- Yeni global state oluşturulmaz
- Platform Admin ile ortak ekran oluşturulmaz
- TypeScript strict devam eder

## Pipeline

```
Validation → Module Registry → Summary → BusinessAdminResult
```

## Modules (skeleton)

| ID | Name | Category |
|----|------|----------|
| `dashboard` | Dashboard | operations |
| `reports` | Reports | monitoring |
| `exports` | Exports | operations |
| `business-settings` | Business Settings | configuration |
| `users` | Users | operations |
| `activity` | Activity | monitoring |

## Telemetry

- Execution duration (`durationMs`)
- Registered module count
- Summary item count

## Out of scope (PR-202A)

- CRUD
- Database
- API
- Authentication
- Authorization

## Directory

```
src/business-admin/
  index.ts
  README.md
  tsconfig.json
  runtime/                 # PR-202A foundation (do not modify after ship)
    BusinessAdminContext.ts
    BusinessAdminResult.ts
    BusinessAdminModule.ts
    BusinessAdminRegistryRuntime.ts
    BusinessAdminRuntime.ts
    builtinModules.ts
    businessValidation.ts
    businessSummary.ts
    timing.ts
    index.ts
```
