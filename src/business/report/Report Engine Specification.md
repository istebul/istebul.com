# Report Engine Specification

## Engine amacı

**Report Engine**, Decision Engine çıktısı `DecisionResult` verisini standart **ReportModel** yapısına dönüştürür. Bu model; gelecekte PDF, Word, PowerPoint ve dashboard render katmanlarının tek girdisidir.

Bu PR yalnızca mimari ve sözleşmeleri kurar; **gerçek rapor üretimi yapılmaz**.

## Sorumlulukları

| Katman | Çıktı |
|--------|--------|
| Decision Engine | `DecisionResult` |
| **Report Engine** | `ReportModel` |
| Render (gelecek PR) | PDF / Word / PPT / JSON / dashboard |

Report Engine grafik çizmez, dosya yazmaz, AI çağırmaz.

## Pipeline

Altı aşama (`pipeline/ReportPipeline.ts`):

1. **Decision Validation** — `karar-dogrulama`
2. **Section Assembly** — `bolum-derleme`
3. **Evidence Collection** — `kanit-toplama`
4. **Report Composition** — `rapor-birlestirme`
5. **Report Review** — `rapor-inceleme`
6. **Report Assembly** — `rapor-derleme`

## Registry yapısı

| Yapı | İçerik (PR-007) |
|------|------------------|
| `ReportRegistry` | Boş profil listesi |
| `SectionRegistry` | Boş bölüm şablonları |
| `ReferenceRegistry` | Boş referans şablonları |
| `TemplateRegistryBridge` | Knowledge `OUTPUT_REGISTRY` + `REPORT_REGISTRY` salt okunur |

Knowledge katmanına yazılmaz.

## Business zinciri

Import → Dataset → Analysis → Decision → **Report** → Render

`ReportRequest.reportId` Knowledge Report DNA ile hizalanır.

## Genişletilebilirlik

- Yeni bölüm = `SectionRegistry` kaydı + `ISectionBuilder` handler (sonraki PR)
- Yeni çıktı formatı = Knowledge `OUTPUT_REGISTRY` (mevcut); render ayrı PR
- `ReportReview` — kural tabanlı kalite kapısı; insan onayı UI sonradan

## Architecture Review (özet)

**Güçlü yönler:** Render’dan ayrılmış kanonik `ReportModel`; Knowledge DNA ve çıktı formatlarına köprü; Decision alanlarının rapor bulgu/öneri modellerine eşlenmesi için tip hazırlığı.

**Riskler:** ReportModel `content` alanı geniş — sonraki PR’da daraltılmış blok tipleri; çift ReportDefinition export — business `index` yalnızca knowledge’dan DNA tipi export eder.

**Ölçüler:** 10 model, 6 port, 4 registry yapısı, 6 pipeline aşaması.
