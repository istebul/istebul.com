# İSTEBUL Business

İSTEBUL Business ürününün foundation katmanı.

Bu dizin, iş yönetimi / analiz / karar modüllerinin genişlemeye uygun iskeletini tutar.
Gerçek iş mantığı, API çağrıları ve kimlik doğrulama bu aşamada yoktur.

## Dizinler

| Klasör | Amaç |
|--------|------|
| `pages/` | Sayfa düzeyinde yüzeyler (ör. BusinessHomePage) |
| `components/` | Yeniden kullanılabilir UI parçaları |
| `layouts/` | Business kabuk / layout tanımları |
| `services/` | Gelecek servis katmanı (henüz boş) |
| `hooks/` | Gelecek hook katmanı (henüz boş) |
| `types/` | Tip tanımları |
| `constants/` | Statik kayıtlar (modül listesi vb.) |
| `utils/` | Yardımcı fonksiyonlar |
| `assets/` | Business’e özel statik varlıklar |
| `routes/` | Business route kayıt dosyası |
| `knowledge/` | Report DNA, KPI, kategori, prompt ve çıktı bilgi mimarisi |
| `dataset/` | BusinessDataset resmi veri modeli ve kaynak/entity sözlükleri |
| `import/` | Import Engine portları, pipeline aşamaları ve adapter kayıtları |
| `analysis/` | Analysis Engine modelleri, portlar ve pipeline (dataset analizi) |
| `decision/` | Decision Engine — AnalysisResult → karar destek çıktısı |

## Genel route

Genel giriş yüzeyi: `/business/` (`business/index.html`).
