# istebul.com Genel Tam Analiz ve Puanlama Raporu

**Tarih:** 29 Haziran 2026  
**Kapsam:** Read-only kod tabanı incelemesi  
**Sürüm:** isteBul v2.2.20 (HEAD: `17ee1f0`)  
**Altyapı:** Cloudflare Pages · Supabase · GitHub  
**Platform tanımı:** AI destekli çok kategorili karar verme platformu (ilan sitesi değil)

---

## 1. Yönetici Özeti

### Platformun mevcut genel seviyesi

isteBul, kod tabanında **olgun bir çok dikey AI karar destek platformu** olarak konumlanmış durumda. Altı canlı dikey (Auto, Konut, Tatil, Finansman, Sigorta, Kasko) için deterministik skor motorları, V2 sonuç ekranları, AI yalnızca-açıklama katmanı, karşılaştırma merkezi, karar geçmişi, partner/lead altyapısı ve kapsamlı admin/operasyon yüzeyleri mevcuttur. AI Listings Engine v1 mimari olarak tamamlanmış; public katalog (`/secenekler/`) bilinçli olarak feature-flag ve QA/publish kapıları arkasında tutulmaktadır.

Genel olgunluk değerlendirmesi: **üretim kalitesinde mimari**, **ürün değeri açısından katalog yoğunluğu ve terminoloji tutarlılığı en büyük boşluklar**.

### En güçlü 5 alan

1. **Deterministik skor / AI ayrımı** — Skorlar kural tabanlı motorlardan üretilir; AI yalnızca açıklama, gerekçe ve sentez katmanıdır. Kanıt: `js/engines/decision-consultant.js`, `js/features/sigorta/sigorta-engine.js`, `js/verticals/listing-analysis/listing-analysis-ai-summary.js`, `js/features/ai/ai-insight-engine.js`.

2. **Auto ve Konut dikey derinliği** — TCO, EVDS/AFAD/TÜİK referans katmanları, zengin wizard akışları ve geniş unit test kapsamı. Kanıt: `js/auto/auto-results-v2.js`, `js/real-estate/real-estate-calculator.js`, `tests/unit/auto-*.test.mjs`, `tests/unit/konut-*.test.mjs`.

3. **Karşılaştırma merkezi** — Deterministik özet (TCO, risk, uyum, denge) ve opsiyonel AI açıklama katmanı. Kanıt: `js/ui/comparison-decision-summary.js`, `js/ai-compare-intelligence/`.

4. **Operasyon altyapısı** — 55 admin sayfası, lifecycle CRM (8 akış), partner retry cron, dikey lead intake fonksiyonları, analytics ingest. Kanıt: `js/admin/admin-page-routing.js`, `docs/LIFECYCLE_CRM.md`, `.github/workflows/partner-retry.yml`.

5. **Dokümantasyon hacmi** — ~130 `docs/*.md`, `docs/ai-listings/` (11 dosya), `docs/investor/` (28 dosya), closure kayıtları ve audit raporları.

### En zayıf 5 alan

1. **Terminoloji tutarsızlığı** — Canonical route `/secenekler/` olmasına rağmen DOM id'leri (`#ilanlar`, `#listing-detail`), route alias'ları (`/ilanlar`, `/ilan/:id`, `/ilan-ekle`) ve admin'de "AI İlan Yönetimi" ifadeleri karar platformu kimliğini zayıflatmaktadır.

2. **Public katalog aktivasyonu** — `ai_listings` yalnızca araç/konut/tatil kategorilerini destekler; finansman/sigorta/kasko katalogda yoktur. Üçlü publish gate (status + site toggle + RLS) nedeniyle boş state riski yüksektir.

3. **CI test kapsamı** — 299 unit test mevcut; `npm test` yalnızca `test:router` alt kümesini (~90 dosya) çalıştırır. Auto, konut ve V3 karar testleri varsayılan CI gate dışında kalır.

4. **Legacy route/alias kirliliği** — `/ilanlar`, `/decision-options`, `/karar-analizi`, `/finansman`, `/araba` gibi alias'lar ve `page-karar-analizi` section id'si canonical yolculuğu bulanıklaştırır.

5. **Konsolide üst düzey rapor seti** — Parçalı audit ve closure dokümanları mevcut; `docs/reports/` altında birleşik matris raporları bu adıma kadar yoktu.

### En acil 5 açık iş

| # | İş | Gerekçe |
|---|-----|---------|
| 1 | `/secenekler/` UI copy ve DOM terminolojisini "karar seçenekleri" diline hizalama | Platform kimliği riski |
| 2 | AI listings public katalog için staging'de publish + toggle smoke doğrulaması | Ürün değeri doğrudan etkilenir |
| 3 | `test:router` içine kritik vertical testlerini ekleme | Regresyon riski |
| 4 | Karar yolculuğu strip'ini tüm yüzeylerde tutarlı mount etme | Canonical journey kopuklukları |
| 5 | `category-registry.js` finansman `resultsModule` tutarsızlığını giderme | Tek kaynak gerçeği (SSOT) güvenilirliği |

### Genel sonuç

**Üretim kalitesinde mimari, ürün değeri açısından katalog yoğunluğu ve terminoloji tutarlılığı en büyük boşluklar.** Teknik altyapı ve karar motoru olgunluğu yüksek; kullanıcıya görünen değer katmanında secenekler kataloğu yoğunluğu ve platform dili tutarlılığı öncelikli iyileştirme alanlarıdır.

---

## 2. Genel Puanlama Tablosu

### Platform kimliği — 78/100

| Alan | Değerlendirme |
|------|---------------|
| **Gerekçe** | Homepage ve metodoloji bölümleri "AI destekli karar verme platformu" mesajını güçlü biçimde verir; iç kod ve DOM katmanında legacy `ilan` terminolojisi devam eder. |
| **Kanıt** | `index.html` (L655–697), `js/ui/listings-ui.js`, `data/route-document-meta.json` |
| **Eksik** | Route/DOM legacy isimleri, admin "AI İlan Yönetimi" etiketi |
| **Sonraki adım** | Secenekler yüzey copy ve görünür metinlerin "karar seçenekleri" diline hizalanması |

### Canonical kullanıcı yolculuğu — 72/100

| Alan | Değerlendirme |
|------|---------------|
| **Gerekçe** | Karar Asistanı → dikey wizard → sonuç → karşılaştırma → geçmiş şeridi tanımlı; çoklu alias ve `/karar-merkezi` → `/profil/` yönlendirmesi karışıklık yaratır. |
| **Kanıt** | `js/ui/decision-journey-strip.js`, `js/core/router.js`, `_redirects` |
| **Eksik** | Journey strip tüm yüzeylerde zorunlu değil; legacy alias'lar router'da aktif |
| **Sonraki adım** | Journey strip zorunlu mount; alias deprecate planı |

### Kategori bazlı tam analiz — 85/100

| Alan | Değerlendirme |
|------|---------------|
| **Gerekçe** | Altı dikey `live` durumda; Auto ve Konut en derin wizard, skor ve sonuç katmanlarına sahip. |
| **Kanıt** | `js/platform/category-registry.js`, `js/auto/auto-app.js`, `js/real-estate/real-estate-app.js`, `js/tatil/tatil-app.js`, `js/finans/finans-app.js`, `js/sigorta/sigorta-app.js`, `js/kasko/kasko-app.js` |
| **Eksik** | Tatil senaryo kartları canlı envanter değil; finansman registry tutarsızlığı |
| **Sonraki adım** | Tatil ve finansman sonuç derinliği artırımı; registry SSOT audit |

### Skor/risk/maliyet mantığı — 88/100

| Alan | Değerlendirme |
|------|---------------|
| **Gerekçe** | Kural tabanlı motorlar, Decision Intelligence V3 overlay, TCO engine ve weighted scoring formülleri testlerle kilitlenmiş. |
| **Kanıt** | `js/engines/decision-consultant.js`, `js/real-estate/real-estate-calculator.js`, `js/auto/cost-engine.js`, `js/features/sigorta/sigorta-engine.js`, `tests/unit/sigorta-engine.test.mjs` |
| **Eksik** | `src/ai-listings/` stub adapter'lar; edge/client drift riski |
| **Sonraki adım** | Stub'ları edge shared modüllerle senkron tutma |

### AI açıklama ve karar destek katmanı — 82/100

| Alan | Değerlendirme |
|------|---------------|
| **Gerekçe** | Proxy fallback, bounded prompt, executive summary ve skor snapshot sözleşmesi iyi tanımlı. |
| **Kanıt** | `js/features/ai/ai-insight-engine.js`, `functions/ai-proxy.js`, `docs/AI_PROVIDER.md` |
| **Eksik** | Provider abstraction client tarafında sınırlı; OpenAI production aktivasyonu NO-GO |
| **Sonraki adım** | AI provider abstraction planı ve compliance TIA |

### AI destekli seçenek/ilan karar katmanı — 70/100

| Alan | Değerlendirme |
|------|---------------|
| **Gerekçe** | Mimari tamamlanmış; public yüzey bilinçli olarak gated. Katalog yoğunluğu ve kategori kapsamı sınırlı. |
| **Kanıt** | `js/core/decision-options-api.js`, `docs/ai-listings/README.md`, `js/core/ai-listings-public-api.js` |
| **Eksik** | Yalnızca vehicle/housing/vacation; finansman/sigorta/kasko yok; boş state riski |
| **Sonraki adım** | Staging publish + toggle smoke; kategori genişleme roadmap |

### Karşılaştırma merkezi — 80/100

| Alan | Değerlendirme |
|------|---------------|
| **Gerekçe** | Dört eksenli deterministik özet (TCO, risk, uyum, denge), AI explanation ve CTA geri dönüş akışları mevcut. |
| **Kanıt** | `js/ui/comparison-decision-summary.js`, `js/ui/comparison-ui.js`, `js/ai-compare-intelligence/`, `tests/unit/ai-compare-intelligence.test.mjs` |
| **Eksik** | Karşılaştırmaya giden veri çoğunlukla manuel veya seceneklerden; boş state sürtünmesi |
| **Sonraki adım** | Secenekler → karsilastir tek tık akışı güçlendirme |

### Admin/operasyon merkezi — 86/100

| Alan | Değerlendirme |
|------|---------------|
| **Gerekçe** | 55 admin sayfası, AI listings admin workspace, lifecycle CRM, partner retry, analytics dashboard. |
| **Kanıt** | `js/admin/admin-page-routing.js`, `admin/ai-listings.html`, `docs/ADMIN_NAV_CONTRACT.md` |
| **Eksik** | `admin-panel.js` monolith (~4.800 satır); uzun vadeli maintainability baskısı |
| **Sonraki adım** | Modüler split (uzun vadeli, bilinçli planlama ile) |

### Lead/partner gelir altyapısı — 83/100

| Alan | Değerlendirme |
|------|---------------|
| **Gerekçe** | Per-vertical intake, dispatch, retry cron, CRM pipeline ve skorlu lead altyapısı kurulu. |
| **Kanıt** | `supabase/functions/partner-dispatch`, `supabase/functions/vertical-intake`, `docs/P6_2_PARTNER_CRM_PIPELINE.md`, `js/features/partner/` |
| **Eksik** | Canlı MRR kanıtı pilot aşamada; outcome → revenue attribution tam değil |
| **Sonraki adım** | Outcome capture → revenue attribution döngüsü |

### Test ve production güvenliği — 74/100

| Alan | Değerlendirme |
|------|---------------|
| **Gerekçe** | 299 unit test, 8 E2E spec, 74 audit script ve zengin smoke test mevcut; CI gate alt küme çalıştırır. |
| **Kanıt** | `package.json` (`test`, `test:router`, `test:unit`), `scripts/smoke-test.cjs`, `tests/e2e/site-health.spec.mjs` |
| **Eksik** | CI unit alt kümesi; integration ve smoke CI dışı; ~190 unit test varsayılan gate'te yok |
| **Sonraki adım** | CI gate genişletme; kritik vertical testlerinin `test:router`'a eklenmesi |

### Yatırımcı/kurumsal raporlama hazırlığı — 75/100

| Alan | Değerlendirme |
|------|---------------|
| **Gerekçe** | `docs/investor/` kapsamlı; audit ve closure dokümanları dağınık ama zengin. |
| **Kanıt** | `docs/investor/DATA_ROOM_INDEX.md`, `docs/investor/FUNDRAISING_READINESS.md`, `docs/PROJECT_HEALTH_REPORT.md` |
| **Eksik** | Birleşik `docs/reports/` seti eksikti (bu rapor ilk adım) |
| **Sonraki adım** | Bölüm 7'deki rapor setinin tamamlanması |

---

## 3. Açık Kalan İşler

### P0 — Ürün değerini doğrudan artıran işler

#### `/secenekler/` UI copy ve DOM terminolojisini "karar seçenekleri" diline hizalama

| Alan | Değer |
|------|-------|
| **Açıklama** | Kullanıcıya görünen metinlerin "karar seçenekleri" diline çevrilmesi; ilan sitesi algısı riskinin azaltılması. |
| **Etkilenen dosya/route** | `index.html` §`#ilanlar`, `js/ui/listings-ui.js`, `js/ui/listing-trust-ui.js` |
| **Risk** | Düşük |
| **Değer etkisi** | Yüksek — platform kimliği |
| **Uygulama zorluğu** | Düşük |
| **Öncelik gerekçesi** | Canonical route doğru; görünür dil yanlış algıyı doğrudan besliyor |

#### AI listings public katalog için staging publish + toggle smoke doğrulaması

| Alan | Değer |
|------|-------|
| **Açıklama** | Staging ortamında publish edilmiş örnek katalog ve site toggle ile `/secenekler/` smoke doğrulaması. |
| **Etkilenen dosya/route** | `js/core/ai-listings-public-api.js`, `admin/ai-listings.html`, `/secenekler/` |
| **Risk** | Düşük (staging) |
| **Değer etkisi** | Çok yüksek — boş secenekler = boş vaat |
| **Uygulama zorluğu** | Orta |
| **Öncelik gerekçesi** | Mimari hazır; aktivasyon ürün değerini doğrudan açar |

#### `test:router` içine kritik vertical testlerini ekleme

| Alan | Değer |
|------|-------|
| **Açıklama** | Auto, konut, V3 karar ve secenekler testlerinin CI gate'e dahil edilmesi. |
| **Etkilenen dosya/route** | `package.json` `test:router` script |
| **Risk** | Orta (regresyon kaçırma) |
| **Değer etkisi** | Yüksek — skor doğruluğu güvencesi |
| **Uygulama zorluğu** | Düşük |
| **Öncelik gerekçesi** | ~190 unit test CI dışında; deterministik skor regresyonu kritik |

#### Karar yolculuğu strip'ini tüm yüzeylerde tutarlı mount etme

| Alan | Değer |
|------|-------|
| **Açıklama** | `decision-journey-strip.js` şeridinin secenekler, karsilastir, dikey sonuç ekranlarında tutarlı görünmesi. |
| **Etkilenen dosya/route** | `js/ui/decision-journey-strip.js`, tüketici mount noktaları |
| **Risk** | Düşük |
| **Değer etkisi** | Orta-yüksek — journey tutarlılığı |
| **Uygulama zorluğu** | Düşük |
| **Öncelik gerekçesi** | Canonical yolculuk tanımlı ama her yüzeyde uygulanmıyor |

#### `category-registry.js` finansman `resultsModule` tutarsızlığını giderme

| Alan | Değer |
|------|-------|
| **Açıklama** | Registry'de `resultsModule: null` iken kod `finansman-results-v2.js` kullanıyor; SSOT düzeltilmeli. |
| **Etkilenen dosya/route** | `js/platform/category-registry.js` |
| **Risk** | Düşük |
| **Değer etkisi** | Orta — metadata güvenilirliği |
| **Uygulama zorluğu** | Çok düşük |
| **Öncelik gerekçesi** | Tek satırlık düzeltme; downstream tüketiciler için güven |

---

### P1 — Güven, kalite ve dönüşüm artıran işler

#### `test:smoke` + `test:integration` CI gate'e ekleme

| Alan | Değer |
|------|-------|
| **Açıklama** | Smoke ve integration testlerinin varsayılan `npm test` zincirine dahil edilmesi. |
| **Etkilenen dosya/route** | `package.json` |
| **Risk** | Düşük |
| **Değer etkisi** | Orta-yüksek |
| **Uygulama zorluğu** | Düşük |
| **Öncelik gerekçesi** | Production güven zincirini güçlendirir |

#### Legacy route/alias deprecate planı

| Alan | Değer |
|------|-------|
| **Açıklama** | `/ilanlar`, `/decision-options`, `/karar-analizi` client-side uyarıları ve kademeli kaldırma planı. |
| **Etkilenen dosya/route** | `js/core/router.js`, `_redirects` (planlama aşamasında) |
| **Risk** | Düşük |
| **Değer etkisi** | Orta |
| **Uygulama zorluğu** | Düşük |
| **Öncelik gerekçesi** | Canonical yolculuk netliği |

#### Partner lead → sonuç ekranı CTA tutarlılığı

| Alan | Değer |
|------|-------|
| **Açıklama** | Dikey sonuç ekranlarında partner CTA metin ve akışlarının standardizasyonu. |
| **Etkilenen dosya/route** | `js/features/*/ *-results-v2.js`, `js/features/partner/` |
| **Risk** | Düşük |
| **Değer etkisi** | Orta-yüksek — dönüşüm hunisi |
| **Uygulama zorluğu** | Orta |
| **Öncelik gerekçesi** | Lead kalitesi ve partner güveni |

#### AI listings finansman/sigorta/kasko kategori genişlemesi

| Alan | Değer |
|------|-------|
| **Açıklama** | `ai_listings` kataloğunun finansman, sigorta ve kasko kategorilerini desteklemesi. |
| **Etkilenen dosya/route** | `src/ai-listings/`, `js/core/decision-options-api.js`, Supabase migrations (ileriki adım) |
| **Risk** | Orta |
| **Değer etkisi** | Yüksek |
| **Uygulama zorluğu** | Yüksek |
| **Öncelik gerekçesi** | Registry'de `secenekler: false` — bilinçli boşluk |

---

### P2 — Teknik borç / raporlama / dokümantasyon

#### `docs/reports/` konsolide rapor seti

| Alan | Değer |
|------|-------|
| **Açıklama** | Dağınık audit'lerin birleşik rapor setine dönüştürülmesi. |
| **Etkilenen dosya/route** | `docs/reports/*.md` |
| **Risk** | Yok |
| **Değer etkisi** | Orta (kurumsal hizalama) |
| **Uygulama zorluğu** | Orta |
| **Öncelik gerekçesi** | Ekip ve yatırımcı iletişimi |

#### `src/ai-listings/` stub TODO'ları

| Alan | Değer |
|------|-------|
| **Açıklama** | Stub adapter'ların edge shared modüllerle senkronize edilmesi. |
| **Etkilenen dosya/route** | `src/ai-listings/services/pricing-service.js`, `stub-market-data-adapter.js` |
| **Risk** | Düşük |
| **Değer etkisi** | Orta |
| **Uygulama zorluğu** | Orta |
| **Öncelik gerekçesi** | Edge/client drift riski |

#### `admin-panel.js` uzun vadeli modülerleştirme

| Alan | Değer |
|------|-------|
| **Açıklama** | ~4.800 satırlık monolith'in modüler parçalara ayrılması. |
| **Etkilenen dosya/route** | `js/admin-panel.js` |
| **Risk** | Orta |
| **Değer etkisi** | Orta |
| **Uygulama zorluğu** | Yüksek |
| **Öncelik gerekçesi** | Nav contract'ta bilinçli erteleme |

#### `js/app.js` uzun vadeli split

| Alan | Değer |
|------|-------|
| **Açıklama** | SPA orchestration monolith'inin modülerleştirilmesi. |
| **Etkilenen dosya/route** | `js/app.js`, `docs/MODULAR_STRUCTURE.md` |
| **Risk** | Orta |
| **Değer etkisi** | Orta |
| **Uygulama zorluğu** | Yüksek |
| **Öncelik gerekçesi** | secenekler/karsilastir orchestration merkezi |

#### Homepage `category-ownership` section görünürlüğü

| Alan | Değer |
|------|-------|
| **Açıklama** | Güçlü positioning metni `hidden` + `data-landing-excluded` ile gizli; görünür yapılmalı. |
| **Etkilenen dosya/route** | `index.html` §`#category-ownership` |
| **Risk** | Düşük |
| **Değer etkisi** | Orta |
| **Uygulama zorluğu** | Çok düşük |
| **Öncelik gerekçesi** | Mevcut copy güçlü; görünürlük eksik |

**Dokunulmayacak alanlar (risk notu):** `js/core/router.js` core tablo, Supabase migrations, Edge Functions — yüksek regresyon riski; yalnızca bilinçli, küçük PR'larla ve tam test setiyle müdahale edilmeli.

---

## 4. En Öncelikli Değer Katacak 10 Öneri

### 1. `/secenekler/` yüzey copy refactor — "karar seçenekleri" dili

| Boyut | Değerlendirme |
|-------|---------------|
| **Neden önemli?** | Platform kimliğinin kullanıcıya görünen yüzeyde tutarlı olması. |
| **Kullanıcıya etkisi** | Güven ve anlaşılırlık artar. |
| **Gelir modeline etkisi** | Lead kalitesi yükselir. |
| **Platform kimliğine etkisi** | Çok yüksek — ilan sitesi algısı riski azalır. |
| **Min. kapsam** | `listings-ui.js`, `index.html` metinleri |
| **Test** | `secenekler-public-*.test.mjs`, E2E trust spec |

### 2. Staging'de publish edilmiş örnek katalog

| Boyut | Değerlendirme |
|-------|---------------|
| **Neden önemli?** | Boş secenekler = boş ürün vaadi. |
| **Kullanıcıya etkisi** | Keşif ve karşılaştırma deneyimi açılır. |
| **Gelir modeline etkisi** | Partner demo ve lead akışı başlar. |
| **Platform kimliğine etkisi** | Yüksek — karar seçenekleri merkezi somutlaşır. |
| **Min. kapsam** | Admin QA workflow + seed script |
| **Test** | `decision-options-api.test.mjs`, E2E secenekler |

### 3. CI gate'e auto/konut/V3 testleri

| Boyut | Değerlendirme |
|-------|---------------|
| **Neden önemli?** | Deterministik skor regresyonunu önler. |
| **Kullanıcıya etkisi** | Sonuç doğruluğu korunur. |
| **Gelir modeline etkisi** | Churn riski azalır. |
| **Platform kimliğine etkisi** | Orta — güvenilirlik temeli. |
| **Min. kapsam** | `package.json` `test:router` genişletme |
| **Test** | İlgili unit dosyaları |

### 4. Karar journey strip zorunlu mount

| Boyut | Değerlendirme |
|-------|---------------|
| **Neden önemli?** | Journey kopuklukları kullanıcıyı kaybettirir. |
| **Kullanıcıya etkisi** | Akış tutarlılığı artar. |
| **Gelir modeline etkisi** | Dönüşüm hunisi güçlenir. |
| **Platform kimliğine etkisi** | Yüksek — canonical yolculuk görünür olur. |
| **Min. kapsam** | `decision-journey-strip.js` tüketicileri |
| **Test** | `router.test.mjs` |

### 5. İlan analizi → secenekler köprü CTA

| Boyut | Değerlendirme |
|-------|---------------|
| **Neden önemli?** | Tekil URL analizi değerini platform akışına bağlar. |
| **Kullanıcıya etkisi** | Analiz sonrası karşılaştırma yolu açılır. |
| **Gelir modeline etkisi** | Lead ve Pro upsell fırsatı. |
| **Platform kimliğine etkisi** | Yüksek — analiz → seçenek → karar döngüsü. |
| **Min. kapsam** | `listing-analysis-app.js` sonuç CTA |
| **Test** | listing-analysis unit testleri |

### 6. Karşılaştırma boş state iyileştirme

| Boyut | Değerlendirme |
|-------|---------------|
| **Neden önemli?** | İlk kullanım sürtünmesini azaltır. |
| **Kullanıcıya etkisi** | Keşif kolaylığı artar. |
| **Gelir modeline etkisi** | Pro upsell (PDF export) fırsatı. |
| **Platform kimliğine etkisi** | Orta |
| **Min. kapsam** | `comparison-ui.js` boş state |
| **Test** | `comparison-decision-cta.test.mjs` |

### 7. Partner CTA metin standardizasyonu

| Boyut | Değerlendirme |
|-------|---------------|
| **Neden önemli?** | Dikeyler arası tutarsızlık güveni zayıflatır. |
| **Kullanıcıya etkisi** | Net sonraki adım. |
| **Gelir modeline etkisi** | Lead dispatch verimliliği artar. |
| **Platform kimliğine etkisi** | Orta |
| **Min. kapsam** | `*-results-v2.js` CTA blokları |
| **Test** | `lead-funnel-p0.test.mjs` |

### 8. Homepage category-ownership görünür yapma

| Boyut | Değerlendirme |
|-------|---------------|
| **Neden önemli?** | Güçlü positioning metni gizli durumda. |
| **Kullanıcıya etkisi** | İlk izlenim güçlenir. |
| **Gelir modeline etkisi** | Marka değeri. |
| **Platform kimliğine etkisi** | Yüksek |
| **Min. kapsam** | `index.html` hidden kaldırma |
| **Test** | `smoke-test.cjs` |

### 9. `category-registry` SSOT audit

| Boyut | Değerlendirme |
|-------|---------------|
| **Neden önemli?** | Yanlış metadata downstream hatalara yol açar. |
| **Kullanıcıya etkisi** | Dolaylı ama kritik. |
| **Gelir modeline etkisi** | Operasyonel verimlilik. |
| **Platform kimliğine etkisi** | Orta |
| **Min. kapsam** | Registry + tüketiciler |
| **Test** | `home-category-config.test.mjs` |

### 10. `OPEN_WORK_RISK_PRIORITY_MATRIX.md` raporu

| Boyut | Değerlendirme |
|-------|---------------|
| **Neden önemli?** | Ekip hizalaması ve öncelik şeffaflığı. |
| **Kullanıcıya etkisi** | Dolaylı. |
| **Gelir modeline etkisi** | Yatırımcı ve partner güveni. |
| **Platform kimliğine etkisi** | Orta |
| **Min. kapsam** | `docs/reports/` dokümantasyon |
| **Test** | — |

---

## 5. AI Destekli Seçenek/Karar Platformu Yapılanması

### istebul.com neden ilan sitesi olmamalı?

Kod tabanı üç katmanda bu ayrımı savunur:

1. **Ürün mantığı:** Skor, TCO, risk ve uygunluk deterministik motorlardan gelir; envanter araması ikincil bir yüzeydir.
2. **Kullanıcı mesajı:** Homepage ve metodoloji açıkça karar altyapısı konumlandırması yapar (`index.html` L655–697).
3. **Veri mimarisi:** `decision-options-api.js` legacy `listings` tablosunu değil `ai_listings`'i tek kaynak olarak kullanır; publish gate QA odaklıdır.

İlan sitesi algısı yaratan unsurlar (teknik borç): DOM `#ilanlar`, `/ilan/:id`, `/ilan-ekle`, admin "AI İlan Yönetimi", `listing-*` CSS sınıfları. Bunlar ürün mantığını değiştirmez; algı riski taşır.

### `/secenekler/` neden "karar seçenekleri merkezi" olarak konumlanmalı?

**`/secenekler/` canlı ilan pazarı değil; QA'dan geçmiş, skorlanmış ve karşılaştırılabilir karar seçenekleri kataloğudur.**

Mevcut yapı bu konumlandırmayı destekler:

| Özellik | Kanıt |
|---------|-------|
| Canonical route | `/secenekler/` → `ilanlar` component (`js/core/router.js`) |
| Sıralama | Karar skoruna göre; "AI yalnızca gerekçe üretir" (`index.html` listing-result-context) |
| Veri kaynağı | `ai_listings` tablosu, `status = published` + site toggle |
| Boş state | Karar Asistanı + dikey wizard CTA'ları |
| Journey | `decision-journey-strip.js` secenekler adımı |

Eksik: finansman/sigorta/kasko kategorileri registry'de `secenekler: false`; katalog yalnızca vehicle/housing/vacation.

### AI listings nasıl skor, güven, açıklama ve karşılaştırma ile bağlanmalı?

```
Admin QA → ai_listings (published) → decision-options-api → /secenekler/ UI
                                                              ↓
                                                    listing-trust-ui (güven badge)
                                                              ↓
                                                    /karsilastir/ → ai-compare-intelligence
                                                              ↓
                                                    comparison-ai-explanation (AI narration)
```

| Katman | Modül | Rol |
|--------|-------|-----|
| Skor | `normalizeAiListingToOption()` → `latest_analysis.ai_score` | Deterministik analiz pipeline |
| Güven | `listing-trust-ui.js`, `ai-listing-quality/` | Trust/quality sinyalleri |
| Açıklama | `ai-decision-explainability/`, executive report modülleri | AI yalnızca gerekçe |
| Karşılaştırma | `ai-compare-intelligence/` | TCO, risk, fit, denge eksenleri |

### Kullanıcıya gösterilmesi gereken karar gerekçeleri

Kod sözleşmesine göre minimum set:

1. Karar skoru (0–100) + güven bandı
2. Fiyat uygunluğu / piyasa konumu
3. Risk seviyesi (kategoriye özel: deprem, borç yükü, prim verimliliği vb.)
4. TCO veya toplam maliyet tahmini
5. Güçlü yönler / dikkat alanları (deterministik)
6. AI executive summary (skor snapshot'ı değiştirmeden)
7. "Bağlayıcı teklif değildir" + manuel doğrulama adımları

Örnek sözleşme: `listing-analysis-ai-summary.js` — `scoresSnapshot` + `source: 'deterministic'`.

### Partner/lead akışına nasıl bağlanmalı?

| Aşama | Bileşen |
|-------|---------|
| Dikey sonuç → lead | `*-intake` edge functions → lead tabloları |
| Partner dispatch | `partner-dispatch`, retry cron (15 dk) |
| Lifecycle | `finance_follow_up`, `abandoned_lead` akışları |
| Skorlu lead | `lead-ai-intelligence.js`, `lead-qual-fields.js` |
| Secenekler → lead | Seçenek detay → decision coach / purchase decision → partner endpoint (`vertical-partner-routing.js`) |

### Admin'de izlenmesi gereken kalite metrikleri

| Metrik | Kaynak |
|--------|--------|
| Publish oranı (approved → published) | `ai-listings-admin-kpi.js` |
| Ortalama AI skor dağılımı | `ai-listings-analytics-admin.js` |
| Veri tamlığı / entity confidence | data-pool panel |
| Duplicate cluster oranı | `duplicate-cluster-engine.js` |
| Public toggle durumu | `site_settings.ai_listings_public_enabled` |
| Lead qualification skoru | admin lead panelleri |
| Partner dispatch başarı/retry | `partner-dispatch-logs` |
| Lifecycle conversion | `lifecycle-metrics-snapshot.cjs` |

---

## 6. Tam Analiz ve Puanlama Kalite Matrisi

### Auto

| Alan | Değerlendirme | Kanıt |
|------|---------------|-------|
| Soru seti | **Çok iyi** — 8 adımlı wizard | `auto-app.js`, `auto-flow.js` |
| Skor mantığı | **Çok iyi** — katalog ranking, confidence meta | `decision-consultant.js`, `recommendation-intelligence.js` |
| Risk/maliyet/uygunluk | **Çok iyi** — 12 ay TCO, amortisman, EVDS | `auto/cost-engine.js`, `depreciation-engine.js` |
| Sonuç ekranı | **Çok iyi** — V2 hero, alternatifler | `auto-results-v2.js` |
| AI açıklama kalitesi | **Çok iyi** — commentary schema, insight panels | `ai-decision-commentary.js` |
| Partner/lead CTA | **İyi** | `auto-intake`, admin auto-leads |
| Eksik geliştirme | Seceneklerde canlı envanter pilot; EVDS tam canlı bağlantı ops bağımlı | — |

### Konut

| Alan | Değerlendirme | Kanıt |
|------|---------------|-------|
| Soru seti | **Çok iyi** — amaç bazlı akışlar | `konut-flow.js` |
| Skor mantığı | **Çok iyi** — DTI, mortgage, lokasyon fit | `real-estate-calculator.js` |
| Risk/maliyet/uygunluk | **Çok iyi** — AFAD, EVDS, TÜİK | `results-afad-risk-layer.js` vb. |
| Sonuç ekranı | **Çok iyi** — V2, risk grid, PDF | `konut-results-v2.js` |
| AI açıklama kalitesi | **İyi** — wizard profile AI-only | `konut-wizard-profile.js` |
| Partner/lead CTA | **İyi** | `housing-intake`, housing-leads admin |
| Eksik geliştirme | AFAD feature flag default off; canlı upstream API ops bağımlı | `afad-earthquake-service.js` |

### Tatil

| Alan | Değerlendirme | Kanıt |
|------|---------------|-------|
| Soru seti | **İyi** — 7 adım, goal-specific filters | `tatil-config.js`, `tatil-flow.js` |
| Skor mantığı | **İyi** — scenario badges | `tatil-engine.js` |
| Risk/maliyet/uygunluk | **Orta-iyi** — cost breakdown, bütçe oranı | `tatil-engine.js`, decision-intelligence V3 |
| Sonuç ekranı | **İyi** — V2 panel | `tatil-results-v2.js` |
| AI açıklama kalitesi | **Orta** — standart insight path | `ai-insight-engine.js` |
| Partner/lead CTA | **Orta** | vacation-intake, vacation-leads |
| Eksik geliştirme | Senaryo kartları canlı rezervasyon değil; test kapsamı sınırlı | 2 unit test dosyası |

### Finansman

| Alan | Değerlendirme | Kanıt |
|------|---------------|-------|
| Soru seti | **İyi** — 6 adım, purpose flow | `finans-config.js`, `finans-flow.js` |
| Skor mantığı | **İyi** — debt score, DTI | `finans-engine.js` |
| Risk/maliyet/uygunluk | **İyi** — cash pressure, sensitivity | `finansman-results-v2.js` |
| Sonuç ekranı | **İyi** — V2, EVDS referans | `finansman-results-v2.js` |
| AI açıklama kalitesi | **Orta** — executive summary V3 | `ai-insight-engine.js` |
| Partner/lead CTA | **İyi** | finance-intake, finance-leads |
| Eksik geliştirme | Registry `resultsModule: null`; secenekler yüzeyi yok | `category-registry.js` |

### Sigorta

| Alan | Değerlendirme | Kanıt |
|------|---------------|-------|
| Soru seti | **İyi** — 4 ürün tipi | `sigorta-config.js` |
| Skor mantığı | **Çok iyi** — 3 eksenli weighted, LLM override yasak | `sigorta-engine.js` |
| Risk/maliyet/uygunluk | **İyi** — koruma, kapsam, maliyet verimliliği | `computeProtectionScore` vb. |
| Sonuç ekranı | **İyi** — V2, coverage matrix, PDF | `sigorta-results-v2.js` |
| AI açıklama kalitesi | **İyi** — deterministic contract | `sigorta-ai-summary.js` |
| Partner/lead CTA | **İyi** | sigorta-intake, sigorta-leads |
| Eksik geliştirme | Secenekler kataloğunda yok | — |

### Kasko

| Alan | Değerlendirme | Kanıt |
|------|---------------|-------|
| Soru seti | **İyi** — 5 adım | `kasko-config.js` |
| Skor mantığı | **Çok iyi** — coverage, repair risk, premium efficiency | `kasko-engine.js` |
| Risk/maliyet/uygunluk | **İyi** — kasko-spesifik eksenler | engine + results sync |
| Sonuç ekranı | **İyi** — V2 | `kasko-results-v2.js` |
| AI açıklama kalitesi | **İyi** — sigorta pattern mirror | `kasko-ai-summary.js` |
| Partner/lead CTA | **İyi** | kasko-intake, kasko-leads |
| Eksik geliştirme | Sigorta ile overlap algısı; ayrı dikey konumlandırma copy'si güçlendirilmeli | — |

---

## 7. Üst Düzey Rapor Seti Önerisi

Aşağıdaki raporlar önerilir; bu adımda oluşturulmamıştır.

### `docs/reports/FULL_ANALYSIS_SCORING_QUALITY_MATRIX.md`

| Alan | Değer |
|------|-------|
| **Amaç** | Dikey bazlı puanlama ve skor kalitesinin tek kaynak gerçeği (SSOT) |
| **İçerik** | Bölüm 6 matrisi, test kanıtları, motor formül özeti |
| **Beslendiği kaynaklar** | `*-engine.js`, `*-results-v2.js`, `tests/unit/*-engine.test.mjs`, `category-registry.js` |
| **Öncelik** | P0 |

### `docs/reports/AI_DECISION_OPTIONS_ARCHITECTURE.md`

| Alan | Değer |
|------|-------|
| **Amaç** | Secenekler + AI listings mimarisi ve terminoloji rehberi |
| **İçerik** | Publish gate, data flow, kategori haritası, "karar seçenekleri" konumlandırması |
| **Beslendiği kaynaklar** | `docs/ai-listings/*`, `decision-options-api.js`, `ai-listings-public-api.js` |
| **Öncelik** | P1 |

### `docs/reports/OPEN_WORK_RISK_PRIORITY_MATRIX.md`

| Alan | Değer |
|------|-------|
| **Amaç** | P0/P1/P2 backlog ve risk × değer matrisi |
| **İçerik** | Bu rapor Bölüm 3 genişletilmiş; closure docs ve audit bulguları |
| **Beslendiği kaynaklar** | `docs/investor/RISK_REGISTER.md`, closure kayıtları, audit raporları |
| **Öncelik** | P1 |

### `docs/reports/AI_PROVIDER_ABSTRACTION_PLAN.md`

| Alan | Değer |
|------|-------|
| **Amaç** | AI provider stratejisi ve aktivasyon checklist |
| **İçerik** | Groq default, OpenAI activation, compliance TIA, subprocessor listesi |
| **Beslendiği kaynaklar** | `docs/AI_PROVIDER.md`, `functions/ai-proxy.js`, `COMPLIANCE_READINESS_AUDIT.md` |
| **Öncelik** | P2 |

### `docs/reports/LEAD_PARTNER_REVENUE_OPERATING_MODEL.md`

| Alan | Değer |
|------|-------|
| **Amaç** | Gelir operasyonu ve lead-partner döngüsü |
| **İçerik** | Lead → dispatch → outcome → MRR; partner CRM pipeline |
| **Beslendiği kaynaklar** | `PARTNER_DELIVERY_AUDIT.md`, `P6_2_PARTNER_CRM_PIPELINE.md`, lifecycle docs, Stripe evidence |
| **Öncelik** | P1 |

### `docs/reports/INVESTOR_TECHNICAL_PLATFORM_BRIEF.md`

| Alan | Değer |
|------|-------|
| **Amaç** | Kurumsal ve yatırımcı teknik özet |
| **İçerik** | Mimari, moat, metrikler, riskler, veri odası indeksi |
| **Beslendiği kaynaklar** | `docs/investor/*`, platform scorecard audits, bu rapor |
| **Öncelik** | P2 |

### Mevcut rapor envanteri (referans)

| Rapor tipi | Mevcut karşılık |
|------------|-----------------|
| Platform genel durum | `PROJECT_HEALTH_REPORT.md`, `SITE_ANALYSIS_REPORT.md`, `VIZYON_DURUM_RAPORU.md` |
| Tam analiz puanlama | Kısmen — bu rapor ilk konsolide adım |
| AI karar/seçenek mimarisi | `docs/ai-listings/*`, `AI_DECISION_ENGINE.md` |
| Açık işler risk | `docs/investor/RISK_REGISTER.md` |
| Yatırımcı brief | `docs/investor/DATA_ROOM_INDEX.md` |
| Gelir/lead-partner | `PARTNER_DELIVERY_AUDIT.md` |
| Veri kaynakları | `veri-kaynaklari/index.html` |
| AI provider | `docs/AI_PROVIDER.md` |

---

## 8. Sonraki Minimal PR Önerisi

### Başlık

**Secenekler yüzeyinde karar platformu terminolojisi ve journey tutarlılığı**

### Kapsam

- `index.html` — `#ilanlar` section başlık ve lead metinleri ("Karar seçenekleri" dili)
- `js/ui/listings-ui.js` — boş state ve başlık copy
- `js/ui/listing-trust-ui.js` — badge metinleri (gerekirse)
- `js/ui/decision-journey-strip.js` — tüketici mount noktaları (yalnızca copy/mount; route değişikliği yok)

### Kesin kapsam dışı

- `js/core/router.js`
- Supabase migrations
- Edge Functions
- `_redirects`
- `wrangler.toml`
- `admin-panel.js`
- `package.json`
- Workflow dosyaları

### Test önerisi

```bash
npm run lint
npm run check
node --no-warnings --test tests/unit/decision-options-route-alias.test.mjs
node --no-warnings --test tests/unit/secenekler-public-trust-badges.test.mjs
npm run test:smoke
npx playwright test tests/e2e/secenekler-trust-catalog.spec.mjs -c playwright.config.mjs --project=chromium --workers=1
```

### Production smoke

- `/secenekler/` yükleniyor; boş state CTA'ları çalışıyor
- `/karsilastir/` boş state → secenekler/karar-asistani linkleri
- Homepage hero CTA → `/auto/` ve `/karar-asistani/`
- Mevcut `_redirects` 301'leri bozulmamış (`/ilanlar` → `/secenekler/`)

---

## Ek: Ana Kullanıcı Yolculuğu Özeti

| Route | Tip | Giriş | Ana modüller |
|-------|-----|-------|--------------|
| `/` | SPA | `index.html` | `app.js`, marketing sections |
| `/karar-asistani/` | SPA | `#page-karar-analizi` | premium-karar-analizi-root |
| `/auto/` … `/kasko/` | Standalone vertical | `*/index.html` | Dikey `*-app.js` + `*-results-v2.js` |
| `/secenekler/` | SPA | `#ilanlar` | `listings-ui.js`, `decision-options-api.js` |
| `/karsilastir/` | SPA | `#compare` | `comparison-ui.js`, `ai-compare-intelligence/` |
| `/gecmis/` | SPA | `#history` | `decision-memory-insights.js` |
| `/ilan-analizi/` | Standalone | `ilan-analizi/index.html` | Tekil URL/listing analizi |

**Canonical journey:** Karar Asistanı → Dikey tam analiz → (opsiyonel) Secenekler → Karşılaştır → Geçmiş

---

**Rapor türü:** Read-only kod tabanı analizi → kalıcı dokümantasyon  
**Oluşturulma:** 2026-06-29  
**Altyapı:** Cloudflare Pages + Supabase + GitHub  
**Skor ilkesi:** Deterministik motor; AI yalnızca açıklama, gerekçe, sentez ve karar destek katmanı
