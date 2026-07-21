# Platform Admin Foundation

**Epic:** EPIC-201  
**PR:** PR-201A — Platform Admin Foundation Runtime

## Scope

Platform Admin için temel runtime ve modül iskeleti. Bu katman yalnızca projeksiyon üretir.

## Architecture Freeze v1.0

- Foundation interface'leri değiştirilmez
- Tamamlanan engine'lere dokunulmaz
- Yeni global state oluşturulmaz
- Mevcut route'lar bozulmaz
- Business Admin ile ortak ekran oluşturulmaz

## Pipeline

```
Platform Validation → Module Registry → Platform Summary → PlatformAdminResult
```

## Modules (skeleton)

| ID | Name | Category |
|----|------|----------|
| `tenant` | Tenant | operations |
| `users` | Users | operations |
| `subscriptions` | Subscriptions | operations |
| `system` | System | configuration |
| `logs` | Logs | monitoring |
| `support` | Support | operations |
| `feature-flags` | Feature Flags | configuration |
| `ai-limits` | AI Limits | configuration |

## Out of scope (PR-201A)

- Tenant CRUD
- User CRUD
- Billing
- Auth
- Permissions
- Monitoring
- Database
- API

## Directory

```
src/platform-admin/
  index.ts
  runtime/
    PlatformAdminContext.ts
    PlatformAdminResult.ts
    PlatformAdminModule.ts
    PlatformAdminRegistryRuntime.ts
    PlatformAdminRuntime.ts
    builtinModules.ts
    platformValidation.ts
    platformSummary.ts
    timing.ts
    index.ts
```
