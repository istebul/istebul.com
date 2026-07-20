# mappers/runtime

**Semantic Mapping Runtime** (PR-101G / EPIC-101).

Schema Detection kolon adaylarını Business Field’lara eşler.
Veri dönüştürme / BusinessDataset / AI yoktur.

## Sınıflar

| Tip | Rol |
|-----|-----|
| `SemanticMappingRuntime` | Orchestrator |
| `SemanticRegistryRuntime` | Kural kayıtları |
| `SemanticContext` / `SemanticResult` | Girdi / çıktı |
| `SemanticCandidate` / `SemanticRule` | Aday + kural |

## Yetenekler

Kolon adı, alias, case-insensitive, Türkçe karakter, confidence, çoklu aday / alternatifler.

## Bu PR’da yok

BusinessDataset, Normalizer, CSV/Excel okuma, AI.
