# validators/runtime

**Validation Runtime** (PR-101C / EPIC-101).

Yapısal doğrulama: ImportRequest, ImportContext, Reader Output, BusinessDataset, Metadata.

## Sınıflar

| Tip | Rol |
|-----|-----|
| `ValidationRuntime` | Kural çalıştırıcı |
| `ValidationRegistryRuntime` | Kural kayıtları |
| `ValidationContext` | Girdi torbası |
| `ValidationResultRuntime` | Sonuç + telemetri |
| `ValidationIssue` / `ValidationSeverity` | INFO…CRITICAL |

## Pipeline

`attachValidationToPipelineContext` / `attachValidationToPipelineResult` — PR-101A tipini değiştirmeden `bag` yazar.

## Bu PR’da yok

Schema detection, CSV/Excel, AI, business rules, decision.
