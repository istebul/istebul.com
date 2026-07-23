# End-to-End Import Runtime (PR-101J)

Mevcut import runtime katmanlarını uçtan uca birleştirir.

## Akış

1. Adapter seçimi
2. Reader
3. Validation (reader çıktısı)
4. Schema Detection
5. Semantic Mapping
6. Dataset Normalizer
7. BusinessDataset Builder
8. Tamamlandı

## API

- `ImportRuntimeFacade` — `execute()` / `run()`
- `PipelineRunner` — aşama yürütücü
- `ImportExecutionContext` / `ImportExecutionResult`

PR-101A–101I dosyaları değiştirilmez; mevcut runtime'lar ve bag köprüleri tüketilir.
