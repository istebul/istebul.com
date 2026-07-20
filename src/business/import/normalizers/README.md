# Import Normalizers

Dataset normalization contracts and runtime for Import Engine.

## Foundation

- `IDataNormalizer` (dataset port) — **BusinessDataset** üretir; bu PR dokunmaz.

## Runtime (PR-101H)

`normalizers/runtime/` — Semantic Mapping sonrası normalize kayıt modeli:

| Piece | Role |
|-------|------|
| `DatasetNormalizerRuntime` | Normalization orchestrator |
| `NormalizationRegistryRuntime` | Rule registry |
| `NormalizationContext` / `NormalizationResult` | Input / output + telemetry |
| `NormalizedRecord` / `NormalizedField` | Builder-ready normalized model |

Does **not** produce BusinessDataset, read CSV/Excel, or call AI.
