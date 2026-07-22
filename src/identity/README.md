# Identity Foundation

**Epic:** EPIC-203  
**PR:** PR-203A — Identity Foundation Runtime

## Scope

Platform genelinde kullanılacak kimlik (Identity) temel katmanı. Platform Admin ve Business Admin tarafından ortak kullanılır. Bu katman yalnızca projeksiyon üretir.

## Architecture Freeze v1.0

- Core Runtime değiştirilmez
- Platform Admin değiştirilmez
- Business Admin değiştirilmez
- Yeni global state oluşturulmaz
- TypeScript strict devam eder
- Projection-first yaklaşımı korunur

## Pipeline

```
Validation → Identity Projection → Summary → IdentityResult
```

## Model

| Component | Description |
|-----------|-------------|
| Identity | Kimlik agregatı |
| User | Kullanıcı alanları |
| Tenant | Kiracı alanları |
| Role | Rol tanımı |
| Permission | İzin tanımı |
| Claims | Claim haritası |
| Session Reference | Oturum referansı (auth yok) |

## Deliverables

- `IdentityRuntime`
- `IdentityContext`
- `IdentityResult`
- `IdentityRegistry`
- `IdentityModule`

## Telemetry

- Execution duration (`durationMs`)
- Identity count
- Role count
- Permission count

## Out of scope (PR-203A)

- Login
- Logout
- Supabase Auth
- JWT doğrulama
- API
- Database

## Directory

```
src/identity/
  index.ts
  tsconfig.json
  README.md
  runtime/                 # PR-203A foundation
    IdentityContext.ts
    IdentityResult.ts
    IdentityModule.ts
    IdentityRegistry.ts
    IdentityRuntime.ts
    builtinModules.ts
    identityValidation.ts
    identitySummary.ts
    timing.ts
    index.ts
```
