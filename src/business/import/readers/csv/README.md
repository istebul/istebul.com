# readers/csv

**CSV Reader Runtime** (PR-101E / EPIC-101).

`IImportReader` uygulaması: UTF-8 CSV → ham satır/kolon (`CsvReaderResult`).

## Yetenekler

- UTF-8 (+ BOM)
- `,` / `;` ayırıcı (auto)
- Başlık satırı
- Boş satır atlama
- Quoted value (`"..."` / `""`)
- Telemetri: dosya boyutu, satır/sütun, süre

## Entegrasyon

- `registerCsvImportReader(registry)` → ReaderRegistryRuntime
- `attachCsvResultToPipelineContext` → bag + `rawPayload` tabular
- `csvResultToTabular` → Schema Detection / Validation girdisi

## Bu PR’da yok

Excel, JSON, BusinessDataset, Semantic Mapping, AI.
