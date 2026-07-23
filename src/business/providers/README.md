# providers

Business Data Provider layer (EPIC-520 → EPIC-560).

| Path | Role |
|------|------|
| `BusinessDataProvider.ts` | Interface surface |
| `MockBusinessProvider.ts` | Default mock implementation (ready) |
| `ProviderFactory.ts` | Factory → ProviderResolver (`mock` default) |
| `adapters/` | Supabase / ERP / Garson AI foundation stubs |
| `core/` | `ProviderResolver`, capability catalog |
| `models/` | Capabilities + status models |
| `utils/` | Provider validation helpers |

Live adapters do **not** call APIs or databases. Unready kinds fall back to mock
unless `strict: true` is passed. No auth / tenant integration.
