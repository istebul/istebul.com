# İsteBul Decision Intelligence v2.0 Audit Raporu

> **Belge türü:** Faz 1 — Audit / Dokümantasyon  
> **Kapsam:** Mevcut ürün ve teknik durum analizi; üretim davranışı değiştirmez.

---

## 1. Yönetici Özeti

| Alan | Değer |
|------|-------|
| **Tarih** | 2026-06-24 |
| **Sürüm referansı** | `package.json` v2.2.20 |
| **HEAD referansı** | `58556aa2` |
| **Altyapı hattı** | Cloudflare Pages + Supabase + GitHub Actions |
| **Netlify** | Değerlendirme dışı — mevcut üretim hattı Cloudflare üzerindedir |

### Projenin bugünkü seviyesi

isteBul, altı dikeyde (Auto, Konut, Tatil, Finans, Sigorta, Kasko) çalışan, **AI destekli çok dikeyli karar verme platformu** olarak üretimde canlıdır. Platform; deterministik skor/risk/maliyet motorları ile AI açıklama/sentez katmanını net biçimde ayırmıştır. Karar Asistanı, dikey wizard'lar, sonuç ekranları (Results V2), karşılaştırma, AI Seçenekler kataloğu, admin operasyon paneli ve veri kaynakları şeffaflık sayfaları mevcuttur. Karar Nabzı, Karar Mahkemesi ve AFAD deprem katmanı gibi ileri özellikler kodda hazır ancak feature flag ile varsayılan kapalıdır.

Platform **ilan pazaryeri değildir**; kullanıcıya skor, risk, TCO ve gerekçe sunan bir karar zekâsı ürünüdür. AI İlan / AI Seçenekler yüzeyi, karar seçeneklerini kataloglamak için kullanılır; klasik marketplace dinamiğinden bilinçli olarak ayrıştırılmıştır.

### Ana güçlü taraflar

1. **Mimari ayrım:** Skor motorları (`decision-consultant`, `*-engine.js`) LLM'den izole; AI yalnızca anlatım/sentez üretir (`ai-insight-engine.js`, `functions/ai-proxy.js`).
2. **Çok dikey kapsam:** Altı kategori `live` durumda; her birinin wizard, skor motoru ve Results V2 modülü vardır.
3. **Üretim hattı olgunluğu:** Cloudflare Pages (`wrangler.toml`), GitHub Actions CI + production deploy, Supabase Edge Functions ve migration altyapısı kurulu.
4. **Veri şeffaflığı:** TÜİK ve EVDS referans katmanları, metodoloji sayfası ve veri kaynakları merkezi mevcut; skor-nötr (`scoreImpact: false`) prensibi dokümante edilmiş.
5. **Admin derinliği:** Operasyon, lead CRM, partner yönetimi, AI İlan Karar Merkezi, analitik ve yatırımcı KPI yüzeyleri tek panelde toplanmış.

### Ana zayıf taraflar

1. **Ürün anlatısı tutarsızlığı:** `/secenekler` ve AI İlan terminolojisi marketplace algısı riski taşır; bazı locale bundle'larda Kasko "Yakında" iken registry `live`.
2. **Registry–runtime uyumsuzluğu:** `category-registry.js` içinde Finans `resultsModule: null` iken `finansman-results-v2.js` production'da aktif.
3. **Kısmi özellik kapsamı:** Karar Nabzı ve Karar Mahkemesi yalnızca Auto; Hayalini Anlat yalnızca araç; Decision V3 overlay Tatil/Sigorta/Kasko'da yok.
4. **Lead intake eksikleri:** Kasko `saveLead` stub (`{ ok: false }`); DB ve admin hazır, frontend intake tamamlanmamış.
5. **Veri katmanı dağınıklığı:** AFAD altyapısı kodda mevcut ancak veri kaynakları sayfasında listelenmiyor; TÜİK UI katmanı yalnızca Konut sonuçlarında mount ediliyor.

### En kritik 5 fırsat

1. **Karar dili standardizasyonu** — Tüm yüzeylerde "seçenek / öneri / skor" dili ile marketplace algısını kırma.
2. **Veri güven katmanı** — AFAD'ı veri kaynakları sayfasına ekleyerek şeffaflığı tamamlama; sonuç kartlarına metodoloji linki.
3. **Kategori sonuç standardı** — Results V2 + Decision OS/V3 mount kapsamını tüm dikeylere genişletme.
4. **Karar Nabzı v2** — Auto'dan başlayıp read-only izleme listesi ile premium değer önerisi oluşturma.
5. **Admin veri sağlığı** — EVDS/AFAD/TÜİK snapshot tazeliği ve lead intake durumunu tek widget'ta gösterme.

### En kritik 5 risk

1. **Marketplace'e kayma** — AI Seçenekler/İlan terminolojisi ve kart yapısı kullanıcıyı ilan sitesi algısına çekebilir.
2. **Skor motorlarını AI'a devretme** — LLM halüsinasyonu karar güvenilirliğini yok eder; mevcut ayrım korunmalı.
3. **Tek PR'da büyük refactor** — Çok dikeyli yapıda regresyon riski yüksek; fazlı küçük PR'lar şart.
4. **Feature flag default-on** — Karar Nabzı, Karar Mahkemesi, AFAD kapalıyken test edilmiş; izinsiz açma üretim stabilitesini bozar.
5. **Registry boşlukları** — `category-registry.js` tüm tüketicileri yansıtmadığında yeni özellikler yanlış dikey eşlemesi yapabilir.

---

## 2. Mevcut Ürün Haritası

### Karar Asistanı

- **Rota:** `/karar-asistani/` → SPA bileşeni `page-karar-analizi`
- **Motor:** `js/features/assistant/assistant-flow.js` — 6 kategori için çatal bazlı soru setleri
- **Skor:** `buildDecisionResult` → `calculateAssistantScores` (`js/app.js`)
- **UI:** `js/ui/assistant-ui.js`, `js/ui/premium-pages.js`
- **Durum:** Platform genelinde ana giriş noktası; kategori yönlendirme ve skor üretimi çalışıyor
- **Eksik:** Kişisel karar profili derinliği sınırlı; AI açıklama kalitesi dikey bazlı değişken

### Hayalini Anlat

- **Konum:** `js/ui/premium-pages.js` — `#assistant-intent-form`
- **Akış:** `assistant-intent-extractor.js`, `assistant-intent-schema.js`, `assistant-vertical-bootstrap.js`
- **Durum:** **Yalnızca araç** için aktif; metin açıkça bunu belirtir
- **Eksik:** Konut, tatil, finans vb. için intent şeması ve handoff yok

### Kategoriler

Altı dikey `category-registry.js` üzerinden `live` durumda:

| Dikey | Rota | Skor motoru | Results V2 | Seçenekler | Karşılaştırma |
|-------|------|-------------|------------|------------|---------------|
| Auto | `/auto/` | `decision-consultant` | ✅ | ✅ | ✅ |
| Konut | `/konut/` | `konut-wizard` | ✅ | ✅ | ✅ |
| Tatil | `/tatil/` | `tatil-engine` | ✅ | ✅ | ✅ |
| Finans | `/finans/` | `finans-engine` | ✅* | ❌ | ✅ |
| Sigorta | `/sigorta/` | `sigorta-engine` | ✅ | ❌ | ✅ |
| Kasko | `/kasko/` | `kasko-engine` | ✅ | ❌ | ✅ |

\*Registry'de `resultsModule: null` — runtime'da `finansman-results-v2.js` aktif.

### AI Seçenekler / AI İlan

- **Rotalar:** `/secenekler/`, `/ilanlar/`, `/decision-options/` → SPA `ilanlar`
- **Veri:** `js/core/decision-options-api.js` → Supabase `ai_listings` (Edge `ai-listings/listings/public`)
- **Admin:** `/admin/ai-listings.html` — Karar Merkezi
- **Durum:** Auto, Konut, Tatil için `surfaces.secenekler: true`; Finans/Sigorta/Kasko kapalı
- **Risk:** "İlan" terminolojisi marketplace algısı; trust badge ve microcopy ile kısmen telafi edilmiş

### Karşılaştırma

- **Rota:** `/karsilastir/` → SPA `compare`
- **Motor:** `js/ai-compare-intelligence/` (deterministik)
- **Kaynaklar:** İlan kartları, asistan önerileri, karar geçmişi
- **Durum:** Tüm dikeylerde registry `compare: true`; Pro export paywall mevcut

### Karar Geçmişi

- **Depolama:** Auth kullanıcı → `localStorage` (`decisionHistory`)
- **UI:** `js/ui/decision-history-*.js`, `js/decision-history/history-timeline-builder.js`
- **Rota:** `/gecmis/` → SPA `history`
- **Karar Merkezi:** `js/user-decision-center/user-decision-panel.js`
- **Durum:** Temel timeline çalışıyor; cross-vertical birleşik görünüm geliştirilebilir

### Karar Nabzı

- **Kapsam:** **Yalnızca Auto** (`js/auto/auto-results-v2.js`)
- **Depolama:** `localStorage` — `istebul_karar_nabzi_v1` (max 24 kayıt)
- **Feature flag:** Varsayılan **kapalı**; opt-in `?karar_nabzi=1`
- **Durum:** Faz 2a production verified; flag hâlâ off
- **Eksik:** Diğer dikeyler, bildirim stratejisi, premium paket

### Karar Mahkemesi

- **Kapsam:** **Yalnızca Auto** (`auto-results-karar-mahkemesi-mount.js`)
- **Motor:** Deterministik "Bekleme Skoru" (`karar-mahkemesi-engine.js`)
- **Feature flag:** Varsayılan **kapalı**; opt-in `?karar_mahkemesi=1`
- **Durum:** Faz 2B closed; skor motorlarını değiştirmez
- **Eksik:** Diğer dikeyler, premium paket entegrasyonu

### Admin Panel

- **Giriş:** `admin-panel.html` + `js/admin-panel.js` (Supabase auth)
- **Kapsam:** Operasyon özeti, lead CRM, dikey yönetimi (Tatil/Konut/Finans/Sigorta/Kasko), partner kanalları, içerik (blog, SSS, duyurular), analitik (CEO özeti, yatırımcı KPI, gelir), AI İlan Karar Merkezi, ödemeler (Stripe)
- **Durum:** Geniş operasyon yüzeyi; karar zekâsı ve veri sağlığı metrikleri dağınık

### Veri Kaynakları

- **Sayfa:** `veri-kaynaklari/index.html`
- **İçerik:** TÜİK (manuel referans), TCMB EVDS (aktif), iş ortağı beslemeleri (planlanan)
- **Eksik:** AFAD deprem verisi kodda mevcut (`functions/api/afad-earthquake-snapshot.js`) ancak sayfada listelenmiyor

### Metodoloji / SEO sayfaları

- **Metodoloji:** `metodoloji/index.html` + `data/seo/methodology-page.json`
- **SEO hub:** `scripts/lib/seo.cjs` — `/rehber/`, `/secenekler/`, `/karsilastir/` statik HTML
- **İlke:** "AI skor üretmez; yalnızca açıklar" — FAQ'da açık
- **Durum:** İyi temel; sonuç kartlarından metodoloji linki henüz standart değil

---

## 3. Teknik Mimari Analizi

### Cloudflare + Supabase + Vanilla JS yapısı

| Katman | Teknoloji | Konum |
|--------|-----------|-------|
| Hosting | Cloudflare Pages | `dist/`, `wrangler.toml` |
| Frontend | Vanilla JS (ES modules) | `js/`, scoped CSS bundles |
| Backend/Auth | Supabase | PostgreSQL, Auth, Storage |
| Edge (CF) | Pages Functions | `functions/` |
| Edge (Supabase) | Edge Functions | `supabase/functions/` |
| Build | Node scripts | `scripts/production-build.cjs` |
| Dev | Express | `server.cjs` (port 3000) |

Mimari sade ve deploy edilebilir. Framework bağımlılığı yok; dikey modüller (`js/auto/`, `js/konut/`, vb.) bağımsız geliştirilebilir.

### Edge Functions

**Cloudflare Pages Functions (`functions/`):**

| Dosya | Amaç |
|-------|------|
| `ai-proxy.js` | LLM proxy, rate limit, prompt cache |
| `api/evds-snapshot.js` | TCMB EVDS public snapshot |
| `api/tuik-snapshot.js` | TÜİK statik referans metadata |
| `api/afad-earthquake-snapshot.js` | AFAD deprem snapshot |
| `api/analytics-ingest.js` | Analytics ingest |
| `api/stripe-webhook.js` | Stripe webhook |
| `api/create-checkout.js` | Checkout |
| `api/public-stats.js` | Public istatistikler |

**Supabase Edge Functions:** `ai-listings`, `ai-listings-intake`, dikey intake'ler (`auto-intake`, `kasko-intake`, vb.)

### Veri snapshot yapısı

- **Commit edilmiş:** `data/snapshots/tuik-reference.json`
- **Runtime cache:** EVDS `lastGoodSnapshot` (`js/services/evds-service.js`); AFAD `lastGoodNationalSnapshot`
- **Prensip:** Snapshot'lar skor-nötr referans; upstream fail'de fallback

### Test / deploy yapısı

| Komut | Amaç |
|-------|------|
| `npm run dev` | Lokal geliştirme |
| `npm run lint` | ESLint |
| `npm run test:unit` | Unit testler (`tests/unit/`) |
| `npm run test:e2e:ci` | Playwright E2E |
| `npm test` | Tam CI gate (lint, build, audit zinciri) |
| `npm run build` | Production build → `dist/` |
| `npm run deploy:cf` | Cloudflare Pages deploy |

**CI:** `.github/workflows/ci.yml` (test + build + Lighthouse), `production-deploy.yml` (main push deploy). Toplam 12 workflow.

### Güçlü noktalar

- Deterministik skor + AI anlatım ayrımı kod ve dokümantasyonda tutarlı
- Cloudflare + Supabase hattı production'da kanıtlanmış
- Kapsamlı unit test suite (~100+ dosya)
- Feature flag disiplini (Karar Nabzı, Karar Mahkemesi, AFAD default off)
- Scoped CSS bundle'lar — mega CSS rewrite riski düşük

### Zayıf noktalar

- `category-registry.js` henüz tüm tüketicileri yansıtmıyor (Finans `resultsModule: null`)
- Bazı unit suite'lerde open handle riski (`--test-force-exit` gerekebilir)
- Integration testler Supabase/network gerektirir
- i18n tutarsızlıkları (Kasko locale vs registry)

### Teknik borçlar

1. Registry–runtime senkronizasyonu
2. Kasko lead intake stub
3. Hayalini Anlat tek dikey (Auto)
4. Decision V3 overlay kapsamı (3/6 dikey)
5. TÜİK UI katmanı yalnızca Konut'ta
6. Eski `listings` tablosu referansları temizlenmiş; `ai_listings` canonical — dokümantasyon güncel

---

## 4. Kategori Bazlı Durum Analizi

### Auto

| Alan | Değerlendirme |
|------|---------------|
| **Mevcut durum** | En olgun dikey; wizard, Results V2, Seçenekler, Karşılaştırma, Karar Nabzı, Karar Mahkemesi, Decision V3 |
| **Kullanıcı değeri** | Yüksek — TCO, segment skoru, güven bandı, EVDS göstergeleri |
| **Eksik taraflar** | Karar Nabzı/Mahkemesi flag kapalı; Hayalini Anlat handoff iyileştirilebilir |
| **AI hissi** | İyi — insight engine + opsiyonel executive summary |
| **Veri kullanımı** | EVDS, TÜİK (segment), maliyet motoru |
| **UX kalitesi** | Premium V7 design system; sonuç kartları zengin |
| **v2 iyileştirmeleri** | Karar Nabzı default-on (PO onayı ile), metodoloji linki, Karar Mahkemesi genişletme |
| **Puan** | **82/100** |

### Konut

| Alan | Değerlendirme |
|------|---------------|
| **Mevcut durum** | Live; wizard, Results V2, AFAD risk katmanı (flag off), TÜİK referans katmanı, Decision V3 |
| **Kullanıcı değeri** | Yüksek — konut skoru, ödeme yükü, lokasyon analizi |
| **Eksik taraflar** | AFAD flag kapalı; Hayalini Anlat intent şeması yok |
| **AI hissi** | İyi — executive summary, AFAD aktivite cümlesi |
| **Veri kullanımı** | EVDS, TÜİK, AFAD (kod hazır), sismik zonlar |
| **UX kalitesi** | İyi; AFAD katmanı görünürlüğü flag'e bağlı |
| **v2 iyileştirmeleri** | Hayalini Anlat konut MVP intent, AFAD veri kaynakları sayfası, metodoloji linki |
| **Puan** | **78/100** |

### Tatil

| Alan | Değerlendirme |
|------|---------------|
| **Mevcut durum** | Live; wizard, Results V2, Seçenekler, Decision OS (V3 yok) |
| **Kullanıcı değeri** | Orta-yüksek — bütçe bandı, destinasyon skoru |
| **Eksik taraflar** | Decision V3 overlay mount yok; what-if simülatörü eksik |
| **AI hissi** | Orta — insight var, V3 what-if yok |
| **Veri kullanımı** | EVDS, TÜİK turizm istatistikleri |
| **UX kalitesi** | İyi; Decision OS timeline mevcut |
| **v2 iyileştirmeleri** | Decision V3 overlay mount, metodoloji linki |
| **Puan** | **72/100** |

### Finans

| Alan | Değerlendirme |
|------|---------------|
| **Mevcut durum** | Live; wizard, `finansman-results-v2.js` aktif; registry `resultsModule: null`; Seçenekler kapalı |
| **Kullanıcı değeri** | Orta-yüksek — kredi simülasyonu, EVDS referans kartı |
| **Eksik taraflar** | Registry uyumsuzluğu; Seçenekler yüzeyi yok |
| **AI hissi** | Orta — EVDS risk katmanı, insight engine |
| **Veri kullanımı** | EVDS (faiz, kur, TÜFE), TÜİK enflasyon |
| **UX kalitesi** | İyi; EVDS kartı güçlü |
| **v2 iyileştirmeleri** | `category-registry.js` `resultsModule` düzeltme, metodoloji linki |
| **Puan** | **70/100** |

### Sigorta

| Alan | Değerlendirme |
|------|---------------|
| **Mevcut durum** | Live; wizard, Results V2, Karşılaştırma; Seçenekler kapalı; Decision OS |
| **Kullanıcı değeri** | Orta — risk bandı, prim tahmini |
| **Eksik taraflar** | Seçenekler yüzeyi; Decision V3 yok |
| **AI hissi** | Orta |
| **Veri kullanımı** | TÜİK kaza istatistikleri, kural tabanlı prim bandı |
| **UX kalitesi** | Yeterli |
| **v2 iyileştirmeleri** | Sonuç standardizasyonu, metodoloji linki |
| **Puan** | **68/100** |

### Kasko

| Alan | Değerlendirme |
|------|---------------|
| **Mevcut durum** | Live registry; wizard, Results V2; `saveLead` stub; locale "Yakında" tutarsızlığı |
| **Kullanıcı değeri** | Düşük-orta — skor var, lead kaydı çalışmıyor |
| **Eksik taraflar** | Lead intake stub; i18n tutarsızlığı; Seçenekler kapalı |
| **AI hissi** | Düşük-orta |
| **Veri kullanımı** | Kural tabanlı prim bandı; partner veri beslemesi planlanan |
| **UX kalitesi** | Temel |
| **v2 iyileştirmeleri** | `saveLead` tamamlama, locale düzeltme, metodoloji linki |
| **Puan** | **58/100** |

---

## 5. Admin Panel v2 Önerileri

### Operasyon metrikleri

**Mevcut:** Operasyon Özeti dashboard, lead CRM, partner teslimat logları.  
**Öneri:** Günlük karar tamamlama sayısı, dikey bazlı funnel, hata oranı widget'ı.

### Karar zekâsı metrikleri

**Mevcut:** CEO Özeti, Platform analitik, Auto analitik.  
**Öneri:** Dikey bazlı ortalama skor, güven bandı dağılımı, Karar Nabzı/Mahkemesi kullanım (flag açıldığında) metrikleri.

### Veri sağlığı paneli

**Mevcut:** Yok — EVDS/AFAD/TÜİK tazeliği dağınık.  
**Öneri:** Tek widget: snapshot yaşı, upstream durumu, son başarılı fetch, fallback kullanım oranı.

### AI listings yönetimi

**Mevcut:** `/admin/ai-listings.html` — Karar Merkezi, Veri Havuzu, Analitik, AI Builder, CSV/JSON import.  
**Öneri:** Skor/risk/uygunluk görünürlüğü; marketplace dilinden uzak "karar seçeneği" etiketleme.

### Partner / lead yönetimi

**Mevcut:** Partner kanalları, başvurular, CRM pipeline, dikey lead listeleri.  
**Öneri:** Kasko lead intake tamamlandığında admin'de görünürlük; lead→karar dönüşüm oranı.

### Yatırımcı ve raporlama görünümü

**Mevcut:** Yatırımcı KPI, Gelir Özeti, `npm run metrics:investor:pack`.  
**Öneri:** Haftalık CI artifact olarak investor metrics JSON; data room export otomasyonu.

---

## 6. Karar Asistanı ve Hayalini Anlat v2 Önerileri

### Niyet tanıma

**Mevcut:** `assistant-intent-extractor.js` — yalnızca araç intent şeması.  
**Öneri:** Konut MVP intent şeması (`assistant-intent-schema.js` genişletme); kademeli diğer dikeyler.

### Kategori yönlendirme

**Mevcut:** 6 kategori çatalı `assistant-flow.js` içinde çalışıyor.  
**Öneri:** Intent çıktısından otomatik kategori önerisi ve wizard ön doldurma (Auto'da kısmen var).

### Kişisel karar profili

**Mevcut:** Karar Merkezi'nde Tercih Profili sekmesi; sınırlı.  
**Öneri:** Bütçe bandı, risk toleransı, hane profili kalıcı profil; sonraki kararlarda otomatik uygulama.

### AI açıklama kalitesi

**Mevcut:** `ai-insight-engine.js` — kural tabanlı skorlara dayalı Türkçe insight.  
**Öneri:** Dikey bazlı prompt şablonları; yasaklı ifade listesi genişletme; skor override koruması sıkılaştırma.

### Dikey analiz handoff yapısı

**Mevcut:** `assistant-vertical-bootstrap.js` — Auto için intent→wizard köprüsü.  
**Öneri:** Tüm dikeyler için standart handoff kontratı; registry tabanlı yönlendirme.

---

## 7. AI Seçenekler / AI İlan v2 Önerileri

### Marketplace algısı riski

**Mevcut:** Rota alias'ları `/ilanlar/`; "listing" terminolojisi kodda.  
**Öneri:** Hero ve microcopy'de "karar seçenekleri", "önerilen alternatifler" dili; `/secenekler` canonical.

### Karar seçenekleri konumlandırması

**Mevcut:** AI Seçenekler, skor/risk/uygunluk badge'leri ile trust UI.  
**Öneri:** Kart üstünde "Bu bir ilan değil; karar motoru önerisidir" microcopy; metodoloji linki.

### Kart yapısı

**Mevcut:** `js/ui/listings-ui.js` — `.listing-card[data-listing-id]`.  
**Öneri:** Skor, risk, TCO özeti kartta görünür; karşılaştırmaya ekle CTA standart.

### Skor / risk / uygunluk görünümü

**Mevcut:** `listing-trust-ui.js` — public trust badge'ler.  
**Öneri:** Deterministik skor kaynağı etiketi; AI üretimi olmadığı vurgusu.

### Karşılaştırma entegrasyonu

**Mevcut:** `data-action="compare"` ile karşılaştırma sepetine ekleme.  
**Öneri:** Seçenekler sayfasından doğrudan karşılaştırma akışı; dikey filtre.

---

## 8. Karar Nabzı v2 Önerileri

### Karar izleme sistemi

**Mevcut:** Auto-only; `localStorage` max 24 kayıt; flag off.  
**Öneri:** Read-only izleme listesi (Faz 5); cross-session persist (auth kullanıcı).

### Fiyat / risk / veri değişimi takibi

**Mevcut:** Kayıt anı snapshot; yeniden değerlendirme yok.  
**Öneri:** EVDS/veri değişiminde "skorunuz güncellenebilir" bildirimi; diff görünümü.

### Bildirim stratejisi

**Mevcut:** Yok.  
**Öneri:** E-posta/push opt-in; haftalık özet; premium tier.

### Premium potansiyel

**Mevcut:** Kod hazır, flag off.  
**Öneri:** Pro paket içinde Karar Nabzı; sınırsız kayıt, bildirim, export.

### Kullanıcı değeri

**Mevcut:** Düşük (flag off, Auto-only).  
**Öneri:** "Kararınızı izleyin" değer önerisi; Konut/Finans'a genişletme.

---

## 9. Karar Mahkemesi v2 Önerileri

### Lehte / aleyhte analiz

**Mevcut:** Deterministik "Bekleme Skoru" + aksiyon etiketi; Auto-only; flag off.  
**Öneri:** Yapılandırılmış lehte/aleyhte madde listesi; kör nokta vurgusu.

### Kör nokta tespiti

**Mevcut:** Sınırlı — bekleme skoru odaklı.  
**Öneri:** Kullanıcı profiline göre göz ardı edilen risk faktörleri.

### Karar doğrulama

**Mevcut:** Skor motorunu değiştirmez; overlay katmanı.  
**Öneri:** "Bu kararı onaylıyor musunuz?" akışı; karar geçmişine bağlama.

### Premium paket potansiyeli

**Mevcut:** Kod hazır, flag off.  
**Öneri:** Pro/Enterprise tier; detaylı mahkeme raporu PDF.

---

## 10. Veri Kaynakları ve Metodoloji

### EVDS (TCMB)

- **Servis:** `js/services/evds-service.js` — USD/EUR, politika faizi, TÜFE, konut kredisi
- **API:** `GET /api/evds-snapshot` — saatlik cache, fallback
- **UI:** Ana sayfa, Auto/Konut/Tatil/Finans/Sigorta sonuçları, finans risk katmanı
- **Karar etkisi:** Finansman simülasyonu, nakit akışı stres testi; skor-nötr referans

### AFAD

- **Servis:** `js/data/afad-earthquake-service.js`
- **API:** `GET /api/afad-earthquake-snapshot.js` — sanitize edilmiş snapshot
- **UI:** Konut Results V2 — `results-afad-risk-layer.js` (flag off)
- **Karar etkisi:** Yok — bilgilendirme katmanı; `scoreImpact: false`
- **Eksik:** Veri kaynakları sayfasında listelenmiyor

### TÜİK

- **Snapshot:** `data/snapshots/tuik-reference.json` — statik, manuel güncelleme
- **API:** `GET /api/tuik-snapshot` — metadata only, upstream fetch yok
- **UI:** Yalnızca Konut sonuçlarında `results-tuik-reference-layer.js`
- **Karar etkisi:** Skor-nötr; TCO ve bütçe bandı kalibrasyonu

### Veri güveni

- Kamu verisi referans ve kalibrasyon içindir; ham tablolar yeniden yayınlanmaz
- Snapshot yaşı ve fallback durumu kullanıcıya açık değil (admin widget önerisi)
- Partner veri beslemeleri planlanan aşamada

### Kullanıcıya açıklanabilir metodoloji

- `metodoloji/index.html` — skor, güven, TCO metodolojisi
- `veri-kaynaklari/index.html` — kaynak kartları, dikey ilişkileri
- Eksik: Sonuç kartlarından doğrudan metodoloji linki standart değil

### Hangi verinin hangi kararı etkilediği

| Veri | Etkilediği karar | Skor etkisi |
|------|------------------|-------------|
| EVDS kuru/faiz | Finansman vadesi, TCO | Referans (stres testi) |
| TÜİK enflasyon | Bütçe bandı, TCO projeksiyonu | Skor-nötr |
| TÜİK kaza ist. | Sigorta risk bandı | Açıklama |
| AFAD deprem | Konut risk bilgisi | Skor-nötr (bilgilendirme) |
| Kural motoru | Tüm skor/güven/risk | Deterministik |

---

## 11. Genel Puanlama Raporu

| Alan | Puan | Gerekçe |
|------|------|---------|
| **Teknik mimari** | 80/100 | Cloudflare+Supabase+Vanilla JS sağlam; registry boşlukları ve stub'lar puan kırar |
| **Ürün bütünlüğü** | 72/100 | 6 dikey live; kısmi özellik kapsamı (Nabzı, Mahkemesi, Hayalini Anlat) |
| **Kategori kalitesi** | 74/100 | Auto/Konut güçlü; Kasko/Sigorta geliştirilmeli |
| **AI hissi** | 70/100 | Insight engine iyi; dikey bazlı tutarsızlık; V3 kapsamı sınırlı |
| **Admin panel** | 78/100 | Geniş operasyon; veri sağlığı ve karar zekâsı metrikleri eksik |
| **Veri kaynakları** | 68/100 | TÜİK/EVDS iyi; AFAD sayfada yok; snapshot tazeliği görünmez |
| **Mobil UX** | 75/100 | PWA, responsive design system; bazı sonuç kartları yoğun |
| **SEO / metodoloji** | 76/100 | Statik SEO hub'lar, JSON-LD; sonuç→metodoloji linki eksik |
| **Ticari hazırlık** | 65/100 | Stripe, Pro paywall var; Karar Nabzı/Mahkemesi premium hazır değil |
| **Yatırımcı hazırlığı** | 70/100 | Investor metrics script'leri var; CI artifact otomasyonu eksik |
| **Test / deploy güvenliği** | 82/100 | Kapsamlı CI; E2E subset; integration testler env bağımlı |
| **Teknik borç riski** | 62/100 | Registry uyumsuzluk, stub'lar, flag disiplini, i18n tutarsızlık |

### Ağırlıklı genel platform puanı

| Ağırlık | Alan | Puan | Ağırlıklı |
|---------|------|------|-----------|
| 15% | Teknik mimari | 80 | 12.0 |
| 15% | Ürün bütünlüğü | 72 | 10.8 |
| 12% | Kategori kalitesi | 74 | 8.9 |
| 10% | AI hissi | 70 | 7.0 |
| 8% | Admin panel | 78 | 6.2 |
| 8% | Veri kaynakları | 68 | 5.4 |
| 7% | Mobil UX | 75 | 5.3 |
| 7% | SEO / metodoloji | 76 | 5.3 |
| 8% | Ticari hazırlık | 65 | 5.2 |
| 5% | Yatırımcı hazırlığı | 70 | 3.5 |
| 10% | Test / deploy | 82 | 8.2 |
| 5% | Teknik borç (ters) | 38* | 1.9 |

\*Teknik borç riski 62 → ters skor 38 (100−62) kullanıldı.

**Ağırlıklı genel platform puanı: 73.7 / 100** (yuvarlanmış: **74/100**)

---

## 12. Fazlı Yol Haritası

### Faz 1: Audit / Dokümantasyon

| Alan | Değer |
|------|-------|
| **Hedef** | Mevcut durum analizi; üretim davranışı değişmez |
| **Değişecek dosyalar** | `docs/PROJECT_VERSION_UPGRADE_AUDIT_V2.md` |
| **Değişmeyecek dosyalar** | Tüm runtime, CSS, Supabase, Edge, workflow, package |
| **Test planı** | Git diff doğrulama; başlık kontrolü |
| **Risk seviyesi** | Sıfır |
| **PR önerisi** | `docs: add Decision Intelligence v2.0 audit report` |

### Faz 2: Ürün anlatısı ve sayfa dili

| Alan | Değer |
|------|-------|
| **Hedef** | Marketplace algısını kıran karar dili; `/secenekler` hero/microcopy |
| **Değişecek dosyalar** | `js/ui/listings-ui.js`, `data/seo/*`, locale bundle'lar, `secenekler/` statik HTML |
| **Değişmeyecek dosyalar** | Skor motorları, router canonical set, feature flag default'ları |
| **Test planı** | `secenekler-public-microcopy.test.mjs`, E2E trust catalog |
| **Risk seviyesi** | Düşük |
| **PR önerisi** | `copy(secenekler): decision-language hero and microcopy` |

### Faz 3: Kategori sonuç standardı

| Alan | Değer |
|------|-------|
| **Hedef** | Tüm dikeylerde metodoloji linki; Results V2 tutarlılığı |
| **Değişecek dosyalar** | `js/features/*/results-v2.js`, `js/features/results/results-hero-layout.js` |
| **Değişmeyecek dosyalar** | Skor motorları, `category-registry.js` (bu fazda) |
| **Test planı** | İlgili unit testler; smoke |
| **Risk seviyesi** | Düşük-orta |
| **PR önerisi** | `feat(results): standard methodology link on result cards` |

### Faz 4: AI Seçenekler konumlandırması

| Alan | Değer |
|------|-------|
| **Hedef** | Karar seçenekleri konumlandırması; trust badge güçlendirme |
| **Değişecek dosyalar** | `js/ui/listing-trust-ui.js`, `js/ui/listings-ui.js`, SEO içerik |
| **Değişmeyecek dosyalar** | `ai_listings` şeması, skor motorları |
| **Test planı** | `secenekler-public-trust-badges.test.mjs` |
| **Risk seviyesi** | Düşük |
| **PR önerisi** | `feat(secenekler): strengthen decision-option positioning` |

### Faz 5: Karar Nabzı v2

| Alan | Değer |
|------|-------|
| **Hedef** | Read-only izleme listesi; Auto'dan başlayarak genişletme |
| **Değişecek dosyalar** | `js/features/karar-nabzi/*`, `js/auto/auto-results-v2.js` |
| **Değişmeyecek dosyalar** | Feature flag default (PO onayı olmadan on yapılmaz) |
| **Test planı** | `karar-nabzi-*.test.mjs` |
| **Risk seviyesi** | Orta |
| **PR önerisi** | `feat(karar-nabzi): read-only watchlist v2` |

### Faz 6: Admin Panel v2

| Alan | Değer |
|------|-------|
| **Hedef** | Veri sağlığı widget; karar zekâsı metrikleri |
| **Değişecek dosyalar** | `js/admin-panel.js`, `js/admin/*`, `admin-panel.html` |
| **Değişmeyecek dosyalar** | Supabase şeması (bu fazda) |
| **Test planı** | Admin route guard testleri; manuel smoke |
| **Risk seviyesi** | Düşük-orta |
| **PR önerisi** | `feat(admin): data health and decision intelligence widgets` |

### Faz 7: Veri / metodoloji güven katmanı

| Alan | Değer |
|------|-------|
| **Hedef** | AFAD veri kaynakları sayfası; snapshot tazeliği görünürlüğü |
| **Değişecek dosyalar** | `veri-kaynaklari/index.html`, `data/seo/data-sources-page.json`, `functions/api/*-snapshot.js` |
| **Değişmeyecek dosyalar** | AFAD feature flag default |
| **Test planı** | `afad-earthquake-*.test.mjs`, footer link audit |
| **Risk seviyesi** | Düşük |
| **PR önerisi** | `feat(data-sources): add AFAD earthquake reference card` |

### Faz 8: Ticari / yatırımcı hazırlığı

| Alan | Değer |
|------|-------|
| **Hedef** | Investor metrics haftalık CI artifact; premium paket tanımı |
| **Değişecek dosyalar** | `scripts/investor-readiness-pack.cjs`, `.github/workflows/ci.yml` (artifact upload) |
| **Değişmeyecek dosyalar** | Stripe webhook, fiyatlandırma (PO onayı gerekir) |
| **Test planı** | `npm run metrics:investor:pack` |
| **Risk seviyesi** | Düşük |
| **PR önerisi** | `ci(investor): weekly metrics artifact in CI` |

---

## 13. Kesinlikle Yapılmaması Gerekenler

1. **Canonical journey bozma** — Mevcut router set'i (`/karar-asistani/`, `/auto/`, `/secenekler/`, vb.) kullanıcı bookmark'larını ve SEO'yu korur; rota deprecate edilmez.

2. **Marketplace'e dönüştürme** — AI Seçenekler/İlan yüzeyi karar seçenekleri kataloğudur; fiyat karşılaştırma sitesi veya ilan panosu haline getirilmez.

3. **Skor motorlarını AI'a devretme** — LLM skor, fiyat veya TCO üretemez; deterministik motorlar tek kaynak kalır.

4. **Tek PR'da büyük refactor** — Çok dikeyli yapıda regresyon riski yüksek; her faz küçük, odaklı PR.

5. **Cloudflare/Supabase dışı infra varsayma** — Üretim hattı Cloudflare Pages + Supabase; alternatif platform eklenmez.

6. **Netlify ekleme** — Değerlendirme dışı; mevcut deploy hattına Netlify eklenmez.

7. **Çalışan üretim akışını bozma** — CI/CD, build script'leri ve deploy workflow'ları drive-by değiştirilmez.

8. **Route deprecate etme** — `/ilanlar/` alias'ı dahil mevcut URL'ler korunur.

9. **Feature flag default-on yapma** — Karar Nabzı, Karar Mahkemesi, AFAD flag'leri PO onayı olmadan açılmaz.

10. **Gizli partner/lead önceliği ekleme** — Skor sıralamasına sözleşmeli olmayan partner bias'ı eklenmez.

---

## 14. İlk 10 Uygulama Önerisi

Yüksek etki / düşük risk sırasıyla:

| # | Öneri | Etki | Risk | Faz |
|---|-------|------|------|-----|
| 1 | **AFAD'ı veri kaynakları sayfasına ekleme** | Şeffaflık tamamlanır; Konut güveni artar | Düşük | 7 |
| 2 | **`/secenekler` hero/microcopy karar dili** | Marketplace algısı kırılır | Düşük | 2 |
| 3 | **`category-registry.js` finans `resultsModule` düzeltme** | Registry–runtime uyumu | Düşük | 3 |
| 4 | **Kasko `saveLead` stub tamamlama** | Lead intake çalışır; admin görünürlük | Orta | 3 |
| 5 | **Sonuç kartlarına metodoloji linki** | Kullanıcı güveni; SEO | Düşük | 3 |
| 6 | **Hayalini Anlat konut MVP intent şeması** | Çok dikey niyet tanıma başlangıcı | Orta | 2 |
| 7 | **Karar Nabzı read-only izleme listesi** | Premium değer önerisi temeli | Orta | 5 |
| 8 | **Admin veri sağlığı widget** | Operasyon görünürlüğü | Düşük | 6 |
| 9 | **Tatil Decision V3 overlay mount** | What-if simülatörü; AI hissi | Orta | 3 |
| 10 | **Investor metrics haftalık CI artifact** | Yatırımcı hazırlığı otomasyonu | Düşük | 8 |

---

## Belge Notu

Bu belge yalnızca analiz ve öneri içerir. Üretim davranışını değiştirmez. Skor motorlarına, routing canonical set'ine veya feature flag default'larına dokunulması ayrı PO onaylı PR'lar gerektirir.
