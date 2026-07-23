# Dashboard Engine Specification

## Engine amacı

**Dashboard Engine**, Analysis Engine, Decision Engine ve Report Engine çıktılarından standart **DashboardModel** üretir: widget’lar, KPI kartları, filtreler, yerleşim ve tema.

Bu PR yalnızca mimariyi kurar; **gerçek dashboard render edilmez**. React veya grafik kütüphanesi yoktur.

## Decision ilişkisi

- `DashboardContext.decisionResult` → risk, fırsat, öneri ve skorlar widget/KPI kaynakları olabilir
- `DashboardRequest.decisionRequestId` izlenebilirlik sağlar
- Decision katmanına yazma yoktur

## Report ilişkisi

- `DashboardContext.reportModel` → yönetici özeti, bulgular, bölümler dashboard metin/widget girdileri olabilir
- Knowledge Report DNA (`reportDnaId`) widget önerileriyle hizalanır (`ReportDefinition.dashboardWidgets` — Knowledge)
- Report / Document katmanlarına yazma yoktur

## Widget sistemi

`DashboardWidget` + `WidgetRegistry` / `WidgetContract`:

- Tür anahtarları: `kpi-card`, `line-chart`, `bar-chart`, `table`, … (yalnızca tip)
- Grid yerleşimi (`placement`)
- `IWidgetBuilder` — derleme portu; Chart.js/ECharts/Recharts **yok**

## Layout sistemi

`DashboardLayout` + `DASHBOARD_LAYOUT_REGISTRY`:

- Grid sütun sayısı, yoğunluk, boşluk jetonları
- Document Engine layout’undan ayrı (`DASHBOARD_*` öneki)

## Pipeline

1. **Dashboard Validation** — `dashboard-dogrulama`
2. **Widget Assembly** — `widget-derleme`
3. **Layout Resolution** — `yerlesim-cozumu`
4. **Filter Resolution** — `filtre-cozumu`
5. **Dashboard Composition** — `dashboard-birlestirme`
6. **Dashboard Assembly** — `dashboard-derleme`

## Genişletilebilirlik prensipleri

1. Yeni widget = registry kaydı + `IWidgetBuilder` handler (sonraki PR)
2. Design System jetonları; Design System dışı UI yok
3. Render katmanı ayrı PR (React/PWA yüzeyi)
4. Freeze: Analysis / Decision / Report / Document’a dokunulmaz

## Architecture Review (özet)

**Güçlü yönler:** Çok kaynaklı (Analysis+Decision+Report) tek model; Document layout/theme ile isim ayrımı; grafik kütüphanesiz tip sözleşmesi.

**Riskler:** `payload` geniş tipi — sonraki PR’da widget-kind bazlı daraltma; boş registry’ler runtime seçim yok.

**Ölçüler:** 10 model, 6 port, 4 registry, 6 pipeline aşaması.
