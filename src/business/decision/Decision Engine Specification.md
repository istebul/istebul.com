# Decision Engine Specification

## Engine amacı

**Decision Engine**, Analysis Engine’in ürettiği `AnalysisResult` verisini yapılandırılmış **karar destek çıktısına** (`DecisionResult`) dönüştürür: riskler, fırsatlar, öneriler, öncelikler ve aksiyonlar.

Bu PR yalnızca mimari ve sözleşmeleri kurar; **hiçbir karar üretilmez**.

## Sorumlulukları

| Katman | Girdi | Çıktı |
|--------|--------|--------|
| Import Engine | Ham kaynak | `BusinessDataset` |
| Analysis Engine | `BusinessDataset` | `AnalysisResult` |
| **Decision Engine** | `AnalysisResult` | `DecisionResult` |
| Report Engine (gelecek) | `DecisionResult` + DNA | PDF / Word / dashboard vb. |

Decision Engine **otomatik işlem yürütmez**; öneri ve öncelik sunar. LLM bu katmanda yoktur.

## Pipeline

Altı sabit aşama (`pipeline/DecisionPipeline.ts`):

1. **AnalysisResult Validation** — `analiz-sonuc-dogrulama`
2. **Risk Evaluation** — `risk-degerlendirme`
3. **Opportunity Evaluation** — `firsat-degerlendirme`
4. **Recommendation Building** — `oneri-olusturma`
5. **Priority Calculation** — `oncelik-hesaplama`
6. **Decision Assembly** — `karar-derleme`

`IDecisionPipeline.run()` tanımlıdır; implementasyon sonraki PR’lardadır.

## Registry yapısı

| Registry | Amaç | PR-006 içerik |
|----------|------|----------------|
| `DecisionRegistry` | Karar profilleri | Boş |
| `RecommendationRegistry` | Öneri şablonları | Boş |
| `RiskRegistry` | Risk şablonları | Boş |
| `StrategyRegistry` | Strateji tanımları | Boş |

`DecisionStrategyContract` — handler sözleşmesi; implementasyon yok.

## Analysis Engine ilişkisi

- `DecisionContext.analysisResult` → tam `AnalysisResult`
- `DecisionRequest.analysisRequestId` → analiz izlenebilirliği
- KPI, bulgu ve özet alanları risk / fırsat / öneri portlarına girdi olur (sonraki PR)
- Analysis katmanına **yazma veya değişiklik yoktur**

## Report Engine ilişkisi

Knowledge **Report DNA** (`reportId`) karar profili ve strateji seçimine rehberlik eder.

Gelecek **Report Engine** (henüz ayrı PR):

- `DecisionResult` + Report DNA → çıktı formatları (PDF, Word, dashboard)
- Decision Engine rapor üretmez; yalnızca karar destek modeli sağlar

Platform `src/ai-decision` (tüketici karar koçluğu) ile **İSTEBUL Business Decision Engine** farklı ürün katmanlarıdır; bu PR Business tarafında kalır.

## Genişletilebilirlik prensipleri

1. **Registry ile büyüme** — yeni risk / öneri / strateji kaydı
2. **Port ayrımı** — risk, fırsat, öneri, öncelik ayrı test edilebilir birimler
3. **Freeze** — alt foundation katmanlarına dokunmadan `analysis` import ile okuma
4. **AI sonradan** — özet üretimi şimdilik kural tabanlı; LLM ayrı onaylı PR
5. **Türkçe yüzey** — teknik kimlikler ASCII, kullanıcı metinleri Türkçe

## Architecture Review (özet)

**Güçlü yönler:** Import → Dataset → Analysis → Decision zinciri net; Report Engine için temiz girdi (`DecisionResult`); strateji registry çoklu iş kuralı setlerine izin verir.

**Riskler:** AnalysisResult şema değişimi → `DECISION_ENGINE_SCHEMA_VERSION`; öneri/risk şablon drift → registry `code` zorunluluğu.

**Ölçüler (PR-006):** 10 model, 6 port, 4 registry, 6 pipeline aşaması.
