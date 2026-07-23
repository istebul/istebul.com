# İSTEBUL Business

İSTEBUL Business ürününün foundation + MVP uygulama iskeleti.

Bu dizin, iş yönetimi / analiz / karar modüllerinin genişlemeye uygun iskeletini tutar.
Gerçek iş mantığı, API çağrıları ve kimlik doğrulama bu aşamada yoktur.

## Dizinler

| Klasör | Amaç |
|--------|------|
| `app/` | Uygulama mount (`mountBusinessApp`) |
| `pages/` | Dashboard, Analizler, Raporlar, Danışman, Bildirimler, Ayarlar |
| `components/` | Sidebar, Topbar, EmptyState, KPI, özet, aktivite, AI, hızlı işlem |
| `layouts/` | Business kabuk (sidebar + topbar + içerik) |
| `data/` | Dashboard mock verisi |
| `providers/` | BusinessDataProvider + Mock + adapters + ProviderResolver (EPIC-520/560) |
| `services/` | Metrics / Insight / Recommendation engines (EPIC-520) |
| `intelligence/` | Analytics + Scoring + Health + KPI + Events + Advisor pipeline (EPIC-510–550) |
| `runtime/` | BusinessRuntime — UI ↔ ProviderResolver execution layer (EPIC-570) |
| `hooks/` | Gelecek hook katmanı (henüz boş) |
| `types/` | Tip tanımları |
| `constants/` | Nav + legacy modül kayıtları |
| `utils/` | Yardımcı fonksiyonlar |
| `assets/` | Business’e özel statik varlıklar |
| `routes/` | Business route kayıt dosyası |
| `knowledge/` | Report DNA, KPI, kategori, prompt ve çıktı bilgi mimarisi |
| `dataset/` | BusinessDataset resmi veri modeli ve kaynak/entity sözlükleri |
| `import/` | Import Engine portları, pipeline aşamaları ve adapter kayıtları |
| `analysis/` | Analysis Engine modelleri, portlar ve pipeline (dataset analizi) |
| `decision/` | Decision Engine — AnalysisResult → karar destek çıktısı |
| `report/` | Report Engine — DecisionResult → ReportModel |
| `document/` | Document Engine — ReportModel → DocumentModel (yerleşim/stil) |
| `dashboard/` | Dashboard Engine — Analysis/Decision/Report → DashboardModel |
| `export/` | Export Engine — Document/Dashboard → ExportResult (artifact sözleşmesi) |

## Genel route

| Path | Sayfa |
|------|-------|
| `/business/` | Dashboard |
| `/business/analizler/` | Analizler |
| `/business/raporlar/` | Raporlar |
| `/business/danisman/` | Yapay Zekâ Danışmanı |
| `/business/bildirimler/` | Bildirimler |
| `/business/ayarlar/` | Ayarlar |

Canlı giriş: `business/*/index.html` + `js/business/business-app.js` (src/business TS bundle).
