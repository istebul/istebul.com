# Export Engine Specification

## Engine amacı

**Export Engine**, Document Engine (`DocumentModel`) ve Dashboard Engine (`DashboardModel`) çıktılarını hedef formatlara (PDF, Word, Excel, PowerPoint, HTML, CSV, JSON vb.) dönüştürmek için tasarlanmıştır.

Bu PR yalnızca mimariyi kurar; **gerçek dosya veya bayt üretimi yapılmaz**. `ExportArtifact` yalnızca meta + `contentRef` taşır.

## Document ilişkisi

- `ExportContext.documentModel` → yerleşim/stil uygulanmış doküman
- `ExportRequest.documentModelId` izlenebilirlik
- Document katmanına yazma yoktur
- PDF/Word gibi sayfa çıktıları tipik olarak DocumentModel’den türer

## Dashboard ilişkisi

- `ExportContext.dashboardModel` → widget/KPI paneli
- Dashboard export’ları (PNG/PDF/JSON snapshot) sonraki PR’larda aynı pipeline’ı kullanır
- Dashboard katmanına yazma yoktur

## Format sistemi

`ExportFormat` + `EXPORT_FORMAT_REGISTRY` / `FormatContract`:

- Kimlikler Knowledge `OutputFormatId` ile hizalı (`pdf`, `word`, `excel`, …)
- Knowledge `OUTPUT_REGISTRY` resmi sözlük; Export FormatRegistry içerik doldurulunca köprülenir
- `IFormatResolver` format listesini çözer

## Template sistemi

`ExportTemplate` + `EXPORT_TEMPLATE_REGISTRY`:

- Format + isteğe bağlı Report DNA bağları
- Report `TemplateRegistryBridge` (Knowledge DNA/çıktı) ile isim ayrımı: `EXPORT_*`
- `ITemplateResolver` şablon seçer; gerçek şablon dosyası yok

## Pipeline

1. **Export Validation** — `export-dogrulama`
2. **Format Resolution** — `format-cozumu`
3. **Template Resolution** — `sablon-cozumu`
4. **Export Composition** — `export-birlestirme`
5. **Artifact Assembly** — `artifact-derleme`
6. **Export Result** — `export-sonuc`

## Genişletilebilirlik prensipleri

1. Yeni format = Knowledge OUTPUT + Export FormatRegistry kaydı + `IArtifactBuilder` handler
2. Yeni şablon = `EXPORT_TEMPLATE_REGISTRY` kaydı
3. Dosya I/O / storage ayrı katman (auth dışı; sonraki PR)
4. Freeze: Document / Dashboard / Report’a dokunulmaz

## Architecture Review (özet)

**Güçlü yönler:** Document/Dashboard → ExportResult net; Knowledge format kimlikleri tek kaynak; artifact meta ile gerçek üretim ayrımı.

**Riskler:** Boş FormatRegistry — resolver Knowledge’a düşene kadar runtime boş; `contentRef` sözleşmesi depolama PR’sinde netleştirilmeli.

**Ölçüler:** 10 model, 6 port, 4 registry, 6 pipeline aşaması.
