# Identity

**Epic:** EPIC-203

## Packages

| PR | Scope | Path |
|----|-------|------|
| PR-203A | Identity Foundation Runtime | `runtime/` |
| PR-203B | Authentication Runtime | `authentication/` |

## Architecture Freeze v1.0

- Core Runtime değiştirilmez
- Platform Admin değiştirilmez
- Business Admin değiştirilmez
- Identity Foundation (PR-203A) dosyaları değiştirilmez
- Yeni global state oluşturulmaz
- TypeScript strict devam eder
- Projection-first yaklaşımı korunur

## PR-203B — Authentication Runtime

### Pipeline

```
Validation
  ↓
Identity Projection
  ↓
Authentication Projection
  ↓
Summary
  ↓
AuthenticationResult
```

### Model

| Component | Description |
|-----------|-------------|
| Authentication State | Durum agregatı |
| Principal | Doğrulanmış aktör projeksiyonu |
| Credential Reference | Kimlik bilgisi referansı |
| Authentication Method | Yöntem (provider yok) |
| Authentication Status | Durum |
| Authentication Summary | Yürütme özeti |

### Deliverables

- `AuthenticationRuntime`
- `AuthenticationContext`
- `AuthenticationResult`
- `AuthenticationRegistry`
- `AuthenticationModule`

### Telemetry

- Execution duration (`durationMs`)
- Authenticated principal count
- Authentication state count
- Summary item count

### Out of scope (PR-203B)

- Login UI
- Logout UI
- JWT doğrulama
- Supabase Auth
- OAuth
- OIDC
- API
- Database

## Directory

```
src/identity/
  index.ts
  tsconfig.json
  README.md
  runtime/                      # PR-203A foundation (do not modify)
  authentication/               # PR-203B Authentication Runtime
    index.ts
    runtime/
      AuthenticationContext.ts
      AuthenticationResult.ts
      AuthenticationModule.ts
      AuthenticationRegistry.ts
      AuthenticationRuntime.ts
      builtinModules.ts
      authenticationValidation.ts
      authenticationSummary.ts
      index.ts
```
