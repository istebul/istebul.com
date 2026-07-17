# Import Validators

Structural validation contracts and runtime for Import Engine.

## Foundation (PR-004)

- `IImportValidator`
- `ValidationIssue` / `ValidationResult` (port contracts)
- Severity levels: `info` | `warning` | `error`

## Runtime (PR-101C)

`validators/runtime/` — structural ValidationRuntime:

| Piece | Role |
|-------|------|
| `ValidationRuntime` | Orchestrates registry rules |
| `ValidationRegistryRuntime` | Rule register / resolve |
| `ValidationContext` | Input snapshot for rules |
| `ValidationResultRuntime` | Issues + telemetry |
| `ValidationIssue` / `ValidationSeverity` | Runtime issue model (`INFO`…`CRITICAL`) |

Built-in checks: ImportRequest, ImportContext, reader output, BusinessDataset, metadata, required fields, nulls, primitives, collections.

Does **not** implement schema detection, CSV/Excel, AI, business rules, or decision logic.
