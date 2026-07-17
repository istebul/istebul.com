# Document Engine Specification

## Engine amacı

**Document Engine**, Report Engine’in ürettiği `ReportModel` verisini yerleşim, stil ve tema ile zenginleştirilmiş kanonik **DocumentModel** yapısına dönüştürür.

Bu model, gelecekteki **Export Engine** (PDF, Word, PowerPoint, HTML, Markdown) için tek giriştir. Bu PR yalnızca mimariyi kurar; **gerçek doküman veya dosya üretilmez**.

## Report ilişkisi

| Katman | Çıktı |
|--------|--------|
| Report Engine | `ReportModel` (içerik: özet, bölüm, bulgu, öneri) |
| **Document Engine** | `DocumentModel` (içerik + layout + style + header/footer) |

- `DocumentContext.reportModel` → tam `ReportModel`
- `DocumentRequest.reportModelId` / `reportDnaId` izlenebilirlik sağlar
- Report katmanına yazma yoktur

## Export ilişkisi

Export (gelecek PR):

- Girdi: `DocumentModel`
- Çıktı: dosya baytları / blob referansları (`OutputFormatId`)
- Document Engine dosya yazmaz; yalnızca yapılandırılmış model üretir

## Layout sistemi

`DocumentLayout` + `LayoutRegistry` / `LayoutContract`:

- Sayfa boyutu (`a4`, `letter`, `widescreen`)
- Yön (`dikey` / `yatay`)
- Kenar boşlukları (mm)
- Sütun sayısı

`ILayoutBuilder` yerleşimi seçer; içerik doldurma sonraki PR’dadır.

## Style sistemi

`DocumentStyle` + `DocumentTheme` + `StyleRegistry` / `ThemeRegistry`:

- Tipografi ve renk **Design System jetonları** (ham CSS yok)
- Tema = varsayılan layout + style paketi
- `IStyleResolver` tema/stil çözümler

## Pipeline

1. **Report Validation** — `rapor-dogrulama`
2. **Layout Assembly** — `yerlesim-derleme`
3. **Section Formatting** — `bolum-formatlama`
4. **Style Resolution** — `stil-cozumu`
5. **Document Composition** — `dokuman-birlestirme`
6. **Document Assembly** — `dokuman-derleme`

## Genişletilebilirlik prensipleri

1. Yeni yerleşim / stil / tema = registry kaydı
2. Design System dışı UI/CSS yok
3. Export formatları Knowledge `OUTPUT_REGISTRY` üzerinden hedefenir
4. Freeze: Report ve alt katmanlara dokunulmaz

## Architecture Review (özet)

**Güçlü yönler:** İçerik (Report) ile sunum (Document) ayrımı; Export için temiz girdi; jeton tabanlı stil Design System ile uyumlu.

**Riskler:** `DocumentSection.blocks` geniş tip — sonraki PR’da daraltılmış blok birliği; boş registry’ler içerik eklenene kadar runtime seçim yok.

**Ölçüler:** 10 model, 6 port, 4 registry, 6 pipeline aşaması.
