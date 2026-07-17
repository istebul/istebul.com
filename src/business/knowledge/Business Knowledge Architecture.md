# Business Knowledge Architecture

## Bu katmanın amacı

İSTEBUL Business’ın rapor, analiz, dashboard ve (gelecek) AI altyapısının ortak **bilgi mimarisi**ni tanımlamak.

Bu katman sayesinde yeni bir rapor veya modül eklemek için büyük motor kodu yazmak yerine:

1. Tip / kayıt dosyasına tanım eklenir
2. KPI, prompt anahtarı ve çıktı formatları bağlanır
3. UI ve AI katmanları aynı DNA’yı okur

Knowledge Architecture **tanım katmanıdır**. Bu PR’da çalışan rapor üretim sistemi, AI çağrısı veya yeni UI yüzeyi yoktur.

## Report DNA nedir?

**Report DNA**, bir raporun kimlik kartıdır. Tek bir `ReportDefinition` kaydı şunları taşır:

| Alan | Anlam |
|------|--------|
| `id` | Kararlı teknik kimlik |
| `name` | Türkçe ad |
| `description` | Açıklama |
| `category` | Kategori |
| `sector` | Sektör bağlamı |
| `icon` | İkon anahtarı |
| `requiredDataTypes` | Gerekli veri tipleri |
| `supportedFileTypes` | Desteklenen dosya türleri |
| `kpiIds` | KPI listesi |
| `aiPromptKey` | AI prompt anahtarı |
| `dashboardWidgets` | Dashboard widget önerileri |
| `outputs` | Çıktı formatları |
| `tags` | Etiketler |
| `version` | Sürüm |
| `status` | `taslak` / `aktif` (Taslak / Aktif) |

Dosya: `reports/ReportDefinition.ts`  
Kayıt: `reports/ReportRegistry.ts`

## KPI nedir?

**KPI**, rapor ve dashboard’ların ölçtüğü göstergedir.

`KPIDefinition` alanları:

- `id`, `name`, `description`
- `calculationType` (oran, toplam, ortalama, fark, büyüme, skor, adet)
- `unit`, `category`, `colorHint`, `priority`

Dosya: `kpis/KPIDefinition.ts`  
Kayıt: `kpis/KPIRegistry.ts`

## Prompt Registry nedir?

**Prompt Registry**, AI analizlerinde kullanılacak **anahtar isimlerini** tutar.

Örnek anahtarlar:

- `inventory-analysis`
- `budget-analysis`
- `cashflow-analysis`
- `personnel-analysis`
- `executive-summary`
- `risk-analysis`

Bu PR’da prompt metni yazılmaz. Yalnızca anahtar + kısa meta tutulur.

Dosya: `prompts/PromptRegistry.ts`

## Yeni rapor nasıl eklenir?

1. Gerekli KPI’lar `KPIRegistry` içinde yoksa ekleyin.
2. Prompt anahtarı yoksa `PromptDefinition` tipine ve `PromptRegistry`’ye ekleyin.
3. `reports/ReportRegistry.ts` içine yeni `ReportDefinition` kaydı yazın.
4. `status: 'taslak'` ile başlayıp olgunlaşınca `'aktif'` yapın.
5. Tip kontrolü: `npx tsc -p src/business/tsconfig.json --noEmit`

Motor veya UI değişikliği bu adımda zorunlu değildir.

## Yeni sektör nasıl eklenir?

Sektörler kategori sisteminde `kind: 'sektorel'` kayıtlarıdır (ör. Restoran, Kafe, Otel, E-Ticaret, Tarım, İnşaat, Enerji).

1. `categories/CategoryDefinition.ts` içinde `BusinessCategoryId` birliğine yeni kimlik ekleyin.
2. `categories/CategoryRegistry.ts` listesine Türkçe ad ve açıklama ile kayıt ekleyin.
3. İlgili raporların `sector` alanını yeni kimliğe bağlayın.

## Yeni KPI nasıl eklenir?

1. `kpis/KPIRegistry.ts` içine `KPIDefinition` ekleyin.
2. Raporlarda `kpiIds` dizisine yeni kimliği ekleyin.
3. İsterseniz dashboard widget önerilerinde `kpiIds` ile bağlayın.

## Gelecekte AI bunu nasıl kullanacak?

`schemas/KnowledgeAIInterfaces.ts` içinde hazırlanan port:

- `KnowledgeAnalysisRequest` — rapor id + prompt anahtarı + veri referansları
- `KnowledgeAnalysisResult` — özet, bulgular, öneriler
- `BusinessKnowledgeAIPort` — `analyze()` sözleşmesi

Akış (gelecek PR’lar):

1. Kullanıcı bir rapor seçer → `ReportRegistry` DNA’sı okunur
2. Gerekli veriler toplanır → `KnowledgeAnalysisRequest` oluşur
3. AI katmanı `aiPromptKey` ile prompt şablonunu çözer
4. Sonuç KPI / dashboard / PDF-Word-PPT çıktılarına bağlanır

Bu PR’da AI çağrısı **yapılmaz**. Auth, Billing ve AI Core’a dokunulmaz.

## Registry özeti (başlangıç)

| Registry | İçerik |
|----------|--------|
| Kategoriler | 21 |
| Raporlar | 11 |
| KPI’lar | 16 |
| Prompt anahtarları | 11 |
| Çıktı formatları | 7 |

## Bilinçli sınırlar

- GarsonAI’ye müdahale yok
- Auth / Billing / AI Core’a dokunulmaz
- Yeni dependency yok
- Design System dışında UI yok
- Çalışan rapor üretim motoru yok (sonraki PR’lar)
