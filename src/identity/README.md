# Identity

**Epic:** EPIC-203

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
  authentication/               # PR-203B (do not modify)
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
