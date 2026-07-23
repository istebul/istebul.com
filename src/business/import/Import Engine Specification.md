# Import Engine Specification

## Engine amacı

**Import Engine**, İSTEBUL Business’a dışarıdan gelen veriyi (Excel, CSV, ERP, REST API, GarsonAI dönüşümü vb.) platformun **resmi veri dili** olan `BusinessDataset` modeline taşımak için tasarlanmıştır.

Architecture Freeze **v1.0** kapsamında bu PR:

- Port sözleşmelerini tanımlar
- Pipeline aşamalarını sabitler
- Adapter kayıt sistemini kurar
- **Hiçbir dosyayı okumaz veya parse etmez**

Onlarca kaynak tipi eklenebilmesi için kaynak özel kod yerine **adapter + port** kaydı tercih edilir.

## Pipeline

Sabit aşama sırası (`pipeline/ImportPipeline.ts`):

| Sıra | Aşama | Port / bileşen |
|------|--------|----------------|
| 1 | Adapter Seçimi | `IMPORT_ADAPTER_REGISTRY` |
| 2 | Okuma | `IImportReader` |
| 3 | Tespit | `IImportDetector` |
| 4 | Semantik Eşleme | `ISemanticMapper` |
| 5 | Normalizasyon | `IDataNormalizer` |
| 6 | Doğrulama | `IImportValidator` |
| 7 | Dataset Oluşturma | `BusinessDataset` bağlama |
| 8 | Tamamlandı | `ImportResult` |

`IImportPipeline.run()` arayüzü tanımlıdır; implementasyon sonraki PR’lardadır.

## Adapter yapısı

`adapters/AdapterRegistry.ts` — **13 kayıt**:

Excel, CSV, PDF, Word, JSON, XML, REST API, SQL, Google Sheets, GarsonAI, ERP, CRM, Manual.

Her kayıt:

- `id` — import adapter kimliği
- `datasetSourceType` — `BusinessSource.type` ile eşleme (`manual` → `manual-entry`)
- `readerRegistered: false` — henüz reader yok

Gerçek adapter sınıfları bu PR’da yazılmaz.

## Reader

`IImportReader`:

- `adapterType` ile kayıt eşleşmesi
- `canRead(context)` — uygunluk
- `read(context, payloadRef?)` — ham okuma (sonraki PR)

Excel/CSV/PDF parse **yasak** (bu PR).

## Detector

`IImportDetector`:

- Ham payload sonrası sütun anahtarları, satır tahmini, entity önerileri
- Dataset katmanındaki `ISchemaDetector` / `IEntityDetector` ile uyumlu çıktı şekli hedeflenir; import tek birleşik port sunar

## Semantic Mapping

`ISemanticMapper`:

- Kaynak sütunları → `BusinessEntityTypeId` + `BusinessColumn.id`
- `SemanticColumnMapping`, eşlenemeyen anahtarlar listesi

İnsan-onaylı eşleme UI’sı ayrı PR’dadır.

## Normalizer

`IDataNormalizer` sözleşmesi **dataset katmanında** tanımlıdır; import `ports/IDataNormalizer.ts` aynı tipi re-export eder (tek sözleşme, çift tanım yok).

Ham veri + bağlam → `BusinessDataset`.

## Validator

`IImportValidator`:

- `ImportContext` + `BusinessDataset` → `BusinessValidationResult`
- Bulgu tipleri dataset `ValidationResult` ailesini kullanır

## BusinessDataset bağlantısı

| Import | Dataset |
|--------|---------|
| `ImportResult.dataset` | `BusinessDataset` kökü |
| `ImportAdapterRegistration.datasetSourceType` | `BusinessSourceTypeId` |
| `ImportContext.targetReportId` | Knowledge `ReportDefinition.id` |
| `ISemanticMapper` | `BusinessEntity` / `BusinessColumn` |

Örnek dataset JSON: `dataset/examples/*.dataset.json`.

## Future Import Engine (sonraki PR’lar)

1. `IImportReader` — CSV, Excel (sırayla)
2. `DefaultImportPipeline` — `run()` orchestration
3. Adapter `readerRegistered: true` kayıtları
4. Import job store (auth dışı veri katmanı veya mevcut storage sözleşmesi)
5. UI / yükleme ekranı (Design System)

## Future AI Engine

AI, normalize edilmiş `BusinessDataset` ve Knowledge Report DNA üzerinden analiz eder; import engine AI çağırmaz.

## Future Dashboard

Dashboard, dataset entity satırlarından beslenir; import engine dashboard üretmez.

## Architecture Review

**Uyum**

- Architecture Freeze v1.0: tanım-only, freeze-friendly adapter listesi
- GarsonAI: yalnızca adapter kaydı; repo dışı kod yok
- Auth / Billing / Shared Core / AI Core: dokunulmadı
- `IDataNormalizer` tek kaynak (dataset); import re-export ile drift önlendi

**Riskler**

| Risk | Azaltma |
|------|---------|
| Pipeline aşama değişikliği | `IMPORT_ENGINE_SCHEMA_VERSION` + semver |
| Reader çoğalması | Adapter registry + `adapterType` zorunluluğu |
| Manuel / manual-entry isim farkı | Registry’de açık `datasetSourceType` eşlemesi |

**Ölçüler (PR-004)**

| Öğe | Sayı |
|-----|------|
| Port arayüzü | 6 |
| Adapter kaydı | 13 |
| Pipeline aşaması | 8 |
