# Analysis Engine Specification

## Engine amacı

**Analysis Engine**, normalize edilmiş `BusinessDataset` verisini iş kuralları ve KPI tanımları çerçevesinde değerlendirerek yapılandırılmış **analiz sonucu** (`AnalysisResult`) üretmek için tasarlanmıştır.

Import Engine veriyi getirir; Analysis Engine veriyi **anlamlandırır** (KPI, kural, bulgu, özet). Bu PR yalnızca mimariyi kurar; analiz çalıştırılmaz.

## Sorumlulukları

| Sorumluluk | Bu PR | Sonraki PR |
|------------|-------|------------|
| Dataset doğrulama adımı | Aşama tanımı | Dataset/IValidationEngine entegrasyonu |
| KPI hesaplama | Port + sözleşme | `IKPIEngine` implementasyonu |
| Kural değerlendirme | Port + boş registry | `IRuleEngine` + kural içeriği |
| Bulgu / özet üretimi | Port | `IFindingBuilder`, `ISummaryBuilder` |
| AI / LLM | Yok | Knowledge `BusinessKnowledgeAIPort` (ayrı katman) |
| Dashboard / export | Yok | Ayrı UI / rapor motoru PR’ları |

## Pipeline

Sabit altı aşama (`pipeline/AnalysisPipeline.ts`):

1. **Dataset Validation** — `dataset-dogrulama`
2. **KPI Calculation** — `kpi-hesaplama`
3. **Rule Evaluation** — `kural-degerlendirme`
4. **Finding Generation** — `bulgu-uretimi`
5. **Summary Generation** — `ozet-uretimi`
6. **Result Assembly** — `sonuc-derleme`

`IAnalysisPipeline.run()` tanımlıdır; implementasyon yoktur.

## Registry yapısı

| Registry | Dosya | İçerik (PR-005) |
|----------|--------|------------------|
| AnalysisRegistry | `AnalysisRegistry.ts` | Boş dizi |
| RuleRegistry | `RuleRegistry.ts` | Boş dizi |
| FindingRegistry | `FindingRegistry.ts` | Boş dizi |
| KPIRegistryBridge | `KPIRegistryBridge.ts` | Knowledge KPI salt okunur köprü |

Yeni analiz profili / kural / bulgu şablonu eklemek = ilgili registry’ye kayıt (kod motoru değiştirmeden).

## BusinessDataset ilişkisi

- Girdi: `AnalysisContext.dataset` → `BusinessDataset`
- İstek: `AnalysisRequest.datasetId` dataset kimliği ile hizalanır
- İstatistikler: `AnalysisStatistics` entity / satır / ilişki sayıları
- Import Engine çıktısı (`ImportResult.dataset`) doğrudan analiz girdisi adayıdır

Knowledge **Report DNA** (`reportId`) hangi KPI ve kural alt kümesinin seçileceğine rehberlik eder (sonraki PR).

## Decision Engine ilişkisi

Platformdaki **AI Decision Engine** (`src/ai-decision`) tüketici karar koçluğu ve çok dikey karar akışları içindir; Business Analysis Engine **işletme verisi analizi** katmanıdır.

İlişki modeli (gelecek):

- Business Analysis → yapılandırılmış `AnalysisResult` (KPI, bulgu, özet)
- Decision / Knowledge AI → doğal dil içgörü ve rapor yorumu
- Ortak veri: `BusinessDataset`; ortak meta: Report DNA `reportId`

Bu PR’da `src/ai-decision` veya Shared Core’a import / değişiklik yoktur.

## Genişletilebilirlik prensipleri

1. **Tanım kayıt odaklı büyüme** — kural ve bulgu registry’lerine ekleme
2. **Port ayrımı** — KPI, kural, özet ayrı motorlar; pipeline koordine eder
3. **Freeze uyumu** — alt katmanlara (dataset, import, knowledge) yazmadan köprü
4. **Türkçe kullanıcı yüzeyi** — teknik kimlikler ASCII, görünen metinler Türkçe
5. **AI sonradan** — `ISummaryBuilder` şimdilik kural tabanlı; LLM ayrı onaylı PR

## Architecture Review (özet)

**Güçlü yönler:** Import → Dataset → Analysis zinciri net; KPI tanımları Knowledge’da tek kaynak; boş registry’ler erken içerik eklemeden sözleşmeyi sabitler.

**Riskler:** `KPIRegistryBridge` ile Analysis KPI handler kayıtlarının drift’i → handler `kpiId` Knowledge ile zorunlu eşleşme; pipeline aşama değişikliği → `ANALYSIS_ENGINE_SCHEMA_VERSION`.

**Ölçüler (PR-005):** 9 model, 6 port, 4 registry yapısı, 6 pipeline aşaması.
