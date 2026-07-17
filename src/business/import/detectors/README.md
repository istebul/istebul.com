# Import Detectors

Schema / entity detection contracts and runtime for Import Engine.

## Foundation (PR-004)

- `IImportDetector` / `ImportDetectionResult` (ports)
- Dataset ports: `ISchemaDetector`, `IEntityDetector`

## Runtime (PR-101D)

`detectors/runtime/` — structural Schema Detection Runtime:

| Piece | Role |
|-------|------|
| `SchemaDetectionRuntime` | Detection orchestrator |
| `SchemaRegistryRuntime` | Schema / Column / Entity registries |
| `SchemaContext` / `SchemaResult` | Input / output + telemetry |
| `DetectedColumn` / `DetectedEntity` / `DetectedType` | Detection models |
| `SchemaCandidate` / `DetectionConfidence` | Candidates & confidence |

Does **not** implement CSV/Excel readers, BusinessDataset conversion, semantic mapping, or AI.
