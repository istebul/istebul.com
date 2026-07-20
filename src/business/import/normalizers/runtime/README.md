# normalizers/runtime

**Dataset Normalizer Runtime** (PR-101H / EPIC-101).

Semantic Mapping çıktısını normalize edilmiş kayıt modeline dönüştürür.
**BusinessDataset üretmez.**

## Sınıflar

| Tip | Rol |
|-----|-----|
| `DatasetNormalizerRuntime` | Orchestrator |
| `NormalizationRegistryRuntime` | Kural kayıtları |
| `NormalizationContext` / `NormalizationResult` | Girdi / çıktı |
| `NormalizedRecord` / `NormalizedField` | Çıktı modeli |

## Normalizasyon

Alan adı, string/number/boolean/date, null, trim, koleksiyon.

## Bu PR’da yok

BusinessDataset, CSV/Excel, Schema Detection, Semantic Mapping runtime değişikliği, AI.
