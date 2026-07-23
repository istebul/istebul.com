# BusinessDataset Specification

## BusinessDataset nedir?

**BusinessDataset**, İSTEBUL Business platformunun **resmi veri dilidir**. Raporlar, analizler, dashboard’lar ve (gelecekte) AI motorları ham kaynakları doğrudan okumak yerine bu ortak model üzerinden çalışır.

Kök tip: `models/BusinessDataset.ts` → `BusinessDataset`

Temel parçalar:

| Model | Rol |
|--------|-----|
| `BusinessMetadata` | Başlık, dil, etiketler, izlenebilirlik |
| `BusinessDatasetVersion` | Şema ve içerik sürümü |
| `BusinessSource` | Verinin nereden geldiği |
| `BusinessEntity` | Varlık tablosu (ürün, stok, personel…) |
| `BusinessColumn` / `BusinessRow` | Şema ve satırlar |
| `BusinessRelation` | Entity’ler arası ilişki |
| `BusinessAttachment` | Orijinal dosya / ek |
| `BusinessValidationResult` | Doğrulama özeti |

## Neden oluşturuldu?

On yıllık büyüme için tek bir **kanonik veri sözleşmesi** gerekir. Bugün Excel, yarın ERP, sonra REST API veya GarsonAI kaynaklı veri — hepsi aynı `BusinessDataset` şekline dönüşmelidir.

Bu sayede:

- Yeni kaynak eklemek = yeni normalizer, yeni UI değil
- Report DNA (`knowledge/`) ile dataset `relatedReportIds` üzerinden bağlanır
- AI ve dashboard aynı entity / KPI okuma katmanını paylaşır

## Entity sistemi

24 resmi entity tipi `entities/EntityTypeRegistry.ts` içinde tanımlıdır:

Ürün, Kategori, Stok, Depo, Raf, Sayım, Sipariş, Müşteri, Tedarikçi, Personel, Departman, Vardiya, Gelir, Gider, Fatura, Tahsilat, Ödeme, Bütçe, Araç, Sevkiyat, Görev, Risk, KPI, Doküman.

Her `BusinessEntity`:

- `entityType` — sözlük kimliği
- `columns` + `rows` — tablo veya `layout: 'belge'` ile özet kayıt
- `sourceEntityRef` — kaynak sistem referansı

## Relation sistemi

`BusinessRelation` entity’ler arasında anlamlı bağ kurar:

- `kind`: `bire-bir`, `bire-cok`, `cok-cok`, `referans`, `hiyerarsi`
- `fromEntityId` / `toEntityId`
- İsteğe bağlı `fromColumnId` / `toColumnId` (foreign key benzeri)

Örnek: Personel → Departman (`personnel.dataset.json`).

## Metadata

`BusinessMetadata` dataset’i insan ve sistem için tanımlar:

- `title`, `description`, `locale` (varsayılan `tr`)
- `createdAt`, `updatedAt`
- `tags`, `relatedReportIds` (Knowledge Architecture rapor kimlikleri)
- `organizationLabel` — yalnızca veri alanı; auth değiştirilmez

## Version

`BusinessDatasetVersion`:

- `schemaVersion` — şema sözleşmesi (şu an `1.0.0`, `schemas/DatasetSchemaConstants.ts`)
- `revision` — içerik revizyonu
- `effectiveAt` — anlık görüntü zamanı
- `previousRevision`, `changeSummary` — denetim izi

## Validation

Bulgu tipleri `validators/ValidationResult.ts`:

- **Severity**: `info` | `warning` | `error` (Bilgi / Uyarı / Hata)
- `ValidationInfo`, `ValidationWarning`, `ValidationError`
- Dataset özeti: `BusinessValidationResult` (`isValid`, `counts`, `results`)

Motor: `IValidationEngine` — bu PR’da implementasyon yoktur.

## Future Import Engine

`normalizers/NormalizerInterfaces.ts`:

| Port | Görev |
|------|--------|
| `IDataNormalizer` | Ham girdi → `BusinessDataset` |
| `ISchemaDetector` | Sütun / şema sezgisi |
| `IEntityDetector` | Entity tipi önerisi |
| `IValidationEngine` | Dataset doğrulama |

Desteklenecek kaynak tipleri (13): Excel, CSV, PDF, Word, JSON, XML, REST API, SQL, Google Sheets, GarsonAI, ERP, CRM, Manual Entry.

**GarsonAI**: kaynak tipi olarak tanımlıdır; dönüşüm Business tarafında yapılır, GarsonAI koduna dokunulmaz.

## Future AI Engine

Knowledge katmanındaki `BusinessKnowledgeAIPort` analiz isteği üretir. Gelecekte AI motoru:

1. `BusinessDataset` okur
2. Report DNA’daki `requiredDataTypes` ile entity eşlemesi yapar
3. Prompt anahtarına göre özet / bulgu döner

Bu PR’da AI çağrısı yoktur.

## Future Dashboard

Dashboard widget önerileri Knowledge `ReportDefinition` içinde kalır; render katmanı `BusinessDataset` entity ve KPI satırlarından beslenir. Bu PR’da dashboard UI yoktur.

## Örnek dosyalar

| Dosya | Senaryo |
|--------|---------|
| `examples/inventory.dataset.json` | Envanter / stok / sayım |
| `examples/budget.dataset.json` | Bütçe / gider |
| `examples/personnel.dataset.json` | Personel / departman / vardiya |

## Architecture Review (özet)

**Güçlü yönler**

- Kaynak bağımsız kanonik model
- Entity + relation ile çok tablolu ERP benzeri veriyi taşıyabilir
- Knowledge Architecture ile gevşek bağ (`relatedReportIds`)
- Port arayüzleri import / validation’ı sonraya bırakır; tip sözleşmesi şimdi sabitlenir

**Riskler ve azaltma**

| Risk | Azaltma |
|------|---------|
| Şema drift | `schemaVersion` + semver disiplini |
| Geniş `unknown` hücreler | Sonraki PR’da column `dataType` ile runtime cast |
| Büyük dataset bellek | Gelecekte sayfalama / snapshot parçalama extension alanı |
| GarsonAI veri şekli | Ayrı normalizer; GarsonAI reposuna dokunulmaz |

**Sonraki adımlar (öneri)**

1. `IDataNormalizer` implementasyonları (CSV, Excel önce)
2. `IValidationEngine` — zorunlu sütun, tip uyumu
3. Dataset loader + Knowledge `KnowledgeAnalysisDataRef` köprüsü
4. JSON Schema veya zod-benzeri statik doğrulama (dependency eklemeden mümkünse manuel)
5. Dashboard veri adaptörü (UI PR’sı ayrı)

## Sayılar (PR-003)

| Öğe | Sayı |
|-----|------|
| Çekirdek model | 10 |
| Entity tipi | 24 |
| Kaynak tipi | 13 |
| Port arayüzü | 4 |
| Örnek dataset | 3 |
