# Import Mappers

Semantic mapping contracts and runtime for Import Engine.

## Foundation (PR-004)

- `ISemanticMapper` / `SemanticColumnMapping` / `SemanticMappingResult`

## Runtime (PR-101G)

`mappers/runtime/` — kolon → Business Field eşlemesi (dönüştürme yok):

| Piece | Role |
|-------|------|
| `SemanticMappingRuntime` | Mapping orchestrator |
| `SemanticRegistryRuntime` | Rule registry |
| `SemanticContext` / `SemanticResult` | Input / output + telemetry |
| `SemanticCandidate` / `SemanticRule` | Candidates & rules |

Does **not** create BusinessDataset, run normalizer, or call AI.
