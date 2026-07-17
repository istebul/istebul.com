# detectors/runtime

**Schema Detection Runtime** (PR-101D / EPIC-101).

Yalnızca şema tespiti: kolon adı, ilkel tip, nullable, koleksiyon, örnek değerler,
unique/empty oranı, entity/field adayı, kural tabanlı confidence (0.00–1.00).

## Sınıflar

| Tip | Rol |
|-----|-----|
| `SchemaDetectionRuntime` | Orchestrator |
| `SchemaRegistryRuntime` | Schema/Column/Entity registry facade |
| `SchemaContext` / `SchemaResult` | Girdi / çıktı |
| `DetectedColumn` / `DetectedEntity` / `DetectedType` | Tespit modelleri |
| `SchemaCandidate` | Şema adayı |
| `DetectionConfidence` | 0.00–1.00 |

## Bu PR’da yok

CSV Reader, Excel Reader, BusinessDataset dönüşümü, Semantic Mapping, AI.
