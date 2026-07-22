# Identity

**Epic:** EPIC-203

```
Identity
├── Foundation          (PR-203A)
├── Authentication      (PR-203B)
└── Session             (PR-203C)
```

## Packages

| PR | Scope | Path |
|----|-------|------|
| PR-203A | Identity Foundation Runtime | `runtime/` |
| PR-203B | Authentication Runtime | `authentication/` |
| PR-203C | Session Management Runtime | `session/` |

## Architecture Freeze v1.0

- Core Runtime değiştirilmez
- Platform Admin değiştirilmez
- Business Admin değiştirilmez
- Identity Foundation (PR-203A) dosyaları değiştirilmez
- Authentication Runtime (PR-203B) dosyaları değiştirilmez
- Yeni global state oluşturulmaz
- TypeScript strict devam eder
- Projection-first yaklaşımı korunur

## PR-203A — Identity Foundation

### Pipeline

```
Validation → Identity Projection → Summary → IdentityResult
```

### Model

| Component | Description |
|-----------|-------------|
| Identity | Kimlik agregatı |
| User | Kullanıcı alanları |
| Tenant | Kiracı alanları |
| Role | Rol tanımı |
| Permission | İzin tanımı |
| Claims | Claim haritası |
| Session Reference | Oturum referansı (auth yok) |

### Deliverables

- `IdentityRuntime`
- `IdentityContext`
- `IdentityResult`
- `IdentityRegistry`
- `IdentityModule`

### Telemetry

- Execution duration (`durationMs`)
- Identity count
- Role count
- Permission count

### Out of scope (PR-203A)

- Login
- Logout
- Supabase Auth
- JWT doğrulama
- API
- Database

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

## PR-203C — Session Management Runtime

### Pipeline

```
Validation
  ↓
Identity Projection
  ↓
Authentication Projection
  ↓
Session Projection
  ↓
Summary
  ↓
SessionResult
```

### Model

| Component | Description |
|-----------|-------------|
| Session | Oturum agregatı |
| Session State | Yaşam durumu |
| Session Lifetime | Süre projeksiyonu |
| Expiration | Sona erme projeksiyonu |
| Renewal Reference | Yenileme referansı (refresh token yok) |
| Activity | Aktivite projeksiyonu |
| Device Reference | Cihaz referansı |
| Summary | Yürütme özeti |

### Deliverables

- `SessionRuntime`
- `SessionContext`
- `SessionResult`
- `SessionRegistry`
- `SessionModule`

### Telemetry

- Execution duration (`durationMs`)
- Session count
- Active session count
- Expired session count
- Summary item count

### Out of scope (PR-203C)

- JWT doğrulama
- Refresh Token
- Cookie
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
  authentication/               # PR-203B Authentication Runtime (do not modify)
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
  session/                      # PR-203C Session Management
    index.ts
    runtime/
      SessionContext.ts
      SessionResult.ts
      SessionModule.ts
      SessionRegistry.ts
      SessionRuntime.ts
      builtinModules.ts
      sessionValidation.ts
      sessionSummary.ts
      index.ts
```
