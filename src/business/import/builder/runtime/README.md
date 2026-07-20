# BusinessDataset Builder Runtime (PR-101I)

`NormalizationResult` → foundation `BusinessDataset` dönüşümü.

- `BusinessDatasetBuilderRuntime` — orchestrator
- `BuilderContext`, `BuilderResult`, `DatasetAssembly`, `EntityAssembly`, `RecordAssembly`, `FieldAssembly`
- `NormalizationSummary`, `ValidationSummary` — aşama özetleri
- Pipeline bag: `PIPELINE_BAG_DATASET_BUILD_RESULT_KEY`

Bu katman CSV/Excel/Normalizer/AI içermez; mevcut runtime çıktılarını tüketir.
