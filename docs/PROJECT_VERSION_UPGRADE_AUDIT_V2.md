# İsteBul Decision Intelligence v2.0 Audit Raporu

**Tarih:** 2026-06-24  
**Kapsam:** Repo envanteri + ürün/mimari değerlendirme (salt dokümantasyon)  
**Sürüm referansı:** `package.json` v2.2.20 · HEAD `58556aa2`  
**Altyapı hattı:** Cloudflare Pages + Supabase + GitHub Actions (Netlify değerlendirme dışı)

---

## 1. Yönetici Özeti

### Projenin bugünkü seviyesi

İsteBul, vanilla JavaScript (ES modules) tabanlı bir **çok dikey AI destekli karar verme platformu** (PWA) olarak üretimde çalışmaktadır. Ürün yüzeyi üç katmandan oluşur:

1. **SPA ana uygulama** (`index.html` → `js/app.js`): Karar Asistanı, AI Seçenekler, Karşılaştırma, Karar Geçmişi, planlar, blog.
2. **Dikey karar uygulamaları** (ayrı HTML girişleri): Auto, Konut, Tatil, Finans, Sigorta, Kasko — her biri deterministik skor motoru + V2 sonuç ekranı.
3. **Operasyon katmanı**: Admin panel (`admin-panel.html`), AI listings admin (`admin/ai-listings.html`), Supabase Edge Functions, Cloudflare Pages Functions.

Canonical karar yolculuğu korunmuştur: **ön değerlendirme (Karar Asistanı) → dikey derin analiz → sonuç (V2) → karşılaştırma / geçmiş / partner çıkışı**. Skor, risk ve maliyet hesapları deterministik motorlarda; AI yalnızca açıklama, niyet çıkarımı ve sentez katmanında çalışır.

### Ana güçlü taraflar

- **Auto referans dikeyi:** Tam sihirbaz, katalog, TCO/depreciation, Decision V3 overlay, Karar Nabzı/Mahkemesi beta altyapısı, en geniş test yüzeyi (`js/auto/*`, 293 unit test dosyasından önemli pay).
- **Deterministik + AI ayrımı:** Metodoloji, motor kodu ve testler skor immutability ilkesini koruyor (`scoresUnchanged`, forbidden-phrase guard, AI narration budget).
- **Üretim olgunluğu:** `main` push → GitHub Actions CI + Production Deploy → Cloudflare Pages + Supabase edge/migration; smoke ve audit script zinciri (`npm test`).
- **Veri katmanı başlangıcı:** EVDS canlı API, AFAD deprem riski (Konut), TÜİK referans snapshot; metodoloji ve veri kaynakları sayfaları SEO uyumlu.
- **Admin ve AI listings:** 55 sayfalık admin shell, Karar Merkezi workspace, publish-gated public katalog.

### Ana zayıf taraflar

- **Ürün dili / IA gerilimi:** `/secenekler` rotası ve “ilan” terminolojisi marketplace algısı riski taşıyor (`docs/ROUTING_ONERI_RAPORU.md`).
- **Dikey olgunluk dengesizliği:** Auto ve Konut ileri; Tatil statik senaryo ağırlıklı; Finans registry'de `resultsModule: null` drift; Kasko lead kaydı stub.
- **Karar Nabzı / Mahkemesi:** Üretimde flag-off; kullanıcıya görünür dashboard veya çok dikey genişleme yok.
- **Hayalini Anlat:** Yalnızca araç MVP; diğer dikeylerde niyet tanıma reddediliyor.
- **Teknik borç:** Monolitik `app.js`, edge API entegrasyon boşlukları (learning/personalization), npm audit uyarıları.

### En kritik 5 fırsat

1. **Ürün anlatısı standardizasyonu** — Tüm yüzeylerde “karar seçenekleri” dili; marketplace çağrışımını azaltma (düşük risk, yüksek marka etkisi).
2. **Kategori sonuç standardı (V2 parity)** — Tatil/Sigorta/Kasko'ya Decision V3 overlay ve veri katmanı hizalaması.
3. **Karar Nabzı v2** — Flag-on rollout + izleme dashboard; premium abonelik kancası.
4. **Veri güven katmanı** — AFAD'ı veri kaynakları sayfasına ekleme, hangi verinin hangi skoru etkilediğini kullanıcıya gösterme.
5. **Admin karar zekâsı metrikleri** — Mevcut unified funnel + AI listings analytics'i yatırımcı/ops görünümüne bağlama.

### En kritik 5 risk

1. **Canonical journey bozulması** — Tek PR'da routing veya skor motoru refactor'u.
2. **Marketplace'e kayma** — AI listings katalogunun ana ürün kimliğini gölgelemesi.
3. **Skorları AI'a devretme** — Kişiselleştirme veya LLM çıktısının deterministik skorları override etmesi.
4. **Üretim deploy zinciri kırılması** — `production-deploy.yml` sırasında edge/migration/smoke uyumsuzluğu.
5. **Mobil UX borcu** — Uzun sihirbazlar ve sonuç panellerinde overflow/flake (E2E notları: `loadDecisionHistory` race).

---

## 2. Mevcut Ürün Haritası

### Karar Asistanı

| Öğe | Detay |
|-----|-------|
| **Rota** | `/karar-asistani/` (canonical); alias `/karar-analizi` → 301 |
| **Bileşen** | SPA `page-karar-analizi` (`js/core/router.js`) |
| **UI** | `js/ui/premium-pages.js`, `js/ui/assistant-ui.js` |
| **Akış** | `js/features/assistant/assistant-flow.js` — 6 kategori rail (arac, ev, tatil, finansman, sigorta, kasko) |
| **Skor** | Deterministik `calculateAssistantScores` / `buildDecisionResult` |
| **AI** | Pro + kota ile `augmentDecisionWithAI`; skor değişmez |
| **Çıkış** | Dikey wizard (`/auto/`, `/konut/`, …), `/karsilastir/`, `/secenekler/`, `/gecmis/` (auth) |

### Hayalini Anlat

| Öğe | Detay |
|-----|-------|
| **Konum** | Karar Asistanı içi panel; ayrı rota yok |
| **UI** | `premium-pages.js` — “Hayalini anlat” başlığı; `css/premium-pages.css` |
| **Motor** | `assistant-intent-extractor.js` (AI JSON) + regex fallback |
| **Kapsam** | **Auto MVP** — non-auto niyet reddi (`shouldRejectNonAutoNarrative`) |
| **Davranış** | Wizard ön-doldurma; URL değişmez; ham metin persist edilmez |

### Kategoriler

| Dikey | Giriş | Ana modüller | Sonuç | Durum |
|-------|-------|--------------|-------|-------|
| **Auto** | `auto/index.html` | `js/auto/auto-app.js`, `auto-flow.js`, `decision-consultant` | V2 + V3 + Decision OS | Referans |
| **Konut** | `konut/index.html` | `js/real-estate/real-estate-app.js`, `konut-flow.js` | V2 + V3 + AFAD/EVDS/TÜİK | Güçlü |
| **Tatil** | `tatil/index.html` | `js/tatil/tatil-app.js`, `tatil-engine.js` | V2 + Decision OS | Orta |
| **Finans** | `finans/index.html` (`finansman/` redirect) | `js/finans/finans-app.js`, `vertical-decision-app.js` | V2 + V3 + EVDS | Orta |
| **Sigorta** | `sigorta/index.html` | `js/sigorta/sigorta-app.js`, `sigorta-engine.js` | V2 + Decision OS + PDF | İyi |
| **Kasko** | `kasko/index.html` | `js/kasko/kasko-app.js`, `kasko-engine.js` | V2 + Decision OS; lead stub | İyi-orta |

Kayıt: `js/platform/category-registry.js` — 6 dikey `status: 'live'`.

### AI Seçenekler / AI İlan

| Öğe | Detay |
|-----|-------|
| **Rota** | `/secenekler/` (canonical); alias `/ilanlar`, `/decision-options` → 301 |
| **Bileşen** | SPA `ilanlar` |
| **API** | `js/core/decision-options-api.js`, `ai-listings-public-api.js` |
| **UI** | `js/ui/listings-ui.js`, `listing-trust-ui.js` |
| **Veri** | Supabase `ai_listings` + `ai_listing_analyses`; `status = published` |
| **Gate** | `site_settings.ai_listings_public_enabled` veya env flag |
| **Kategoriler** | vehicle, housing, vacation — finans/sigorta/kasko boş-state CTA |

### Karşılaştırma

| Öğe | Detay |
|-----|-------|
| **Rota** | `/karsilastir/` → `#compare` |
| **UI** | `js/ui/comparison-ui.js`, `comparison-decision-summary.js` |
| **AI** | `comparison-ai-explanation.js` — deterministik önce, hydrate sonra |
| **Limit** | Free: 2 öğe; Pro: 4 öğe |
| **Persist** | `localStorage` (`COMPARISON_ITEMS`) — hesap senkronu yok |

### Karar Geçmişi

| Öğe | Detay |
|-----|-------|
| **Rota** | `/gecmis/` → `#history` |
| **Persist** | Auth + `localStorage` `istebul_decision_history:{userId}`, max 12 |
| **Modüller** | `decision-history-entry.js`, `decision-memory-insights.js`, `history-engine.js` |
| **Şema** | v1 canonical + legacy compat (`docs/FAZ_2D_DECISION_HISTORY_FOUNDATION.md`) |

### Karar Nabzı

| Öğe | Detay |
|-----|-------|
| **Kapsam** | Auto V2 sonuçları — opt-in izleme |
| **Modüller** | `js/features/karar-nabzi/*` |
| **Storage** | `istebul_karar_nabzi_v1`, max 24 |
| **Flag** | Default **off**; `?karar_nabzi=1` |
| **Durum** | Faz 1 + 2a closed; dashboard yok |

### Karar Mahkemesi

| Öğe | Detay |
|-----|-------|
| **Kapsam** | Auto V2 detail — “Pişmanlık Önleme Analizi” beta kart |
| **Modüller** | `js/features/karar-mahkemesi/*`, `auto-results-karar-mahkemesi-mount.js` |
| **Motor** | Deterministik Bekleme Skoru + aksiyon etiketi |
| **Flag** | Default **off**; `?karar_mahkemesi=1` |
| **Durum** | 2B closed (`docs/KARAR_MAHKEMESI_2B_CLOSURE.md`) |

### Admin Panel

| Öğe | Detay |
|-----|-------|
| **Giriş** | `admin-panel.html` → `js/admin-panel.js` |
| **Sayfalar** | 55 in-panel ID (`js/admin/admin-page-routing.js`) |
| **Gruplar** | Dashboard, dikey lead/partner, AI Karar Motoru, içerik, analitik, gelir, ops |
| **AI listings** | `admin/ai-listings.html` — Karar Merkezi, Veri Havuzu, Analitik, Toplayıcı, Öneriler |
| **Mutasyon** | `admin-action` edge function (`js/core/admin-client.js`) |

### Veri Kaynakları

| Kaynak | Entegrasyon | Snapshot |
|--------|-------------|----------|
| **EVDS (TCMB)** | `js/services/evds-service.js`, `functions/api/evds-snapshot.js` | Canlı fetch + cache |
| **AFAD** | `js/data/afad-earthquake-service.js`, `functions/api/afad-earthquake-snapshot.js` | Runtime cache |
| **TÜİK** | `data/snapshots/tuik-reference.json`, `functions/api/tuik-snapshot.js` | Statik referans; `scoreImpact: false` |

Sayfalar: `veri-kaynaklari/index.html`, `metodoloji/index.html`.

### Metodoloji / SEO sayfaları

- `metodoloji/index.html` + `data/seo/methodology-page.json`
- `data/seo/hubs.json`, `landing-pages.json`, `site.json` (sitemap)
- Kurumsal: `hakkimizda.html`, `partner-*.html`, `yardim.html`, çoklu dil (`/en/`, `/de/`, …)
- Rehber/blog: SPA `/blog` + SEO longform build (`scripts/lib/build-blog-pages.cjs`)

---

## 3. Teknik Mimari Analizi

### Cloudflare + Supabase + Vanilla JS yapısı

```
[Kullanıcı]
    │
    ▼
Cloudflare Pages (dist/)
    ├── Statik HTML (index, auto/, konut/, …)
    ├── esbuild bundles (app, auto, admin-panel)
    ├── Pages Functions (/functions/api/*)
    └── _redirects / _headers / _routes.json
    │
    ├── Supabase Auth (anon + RLS)
    ├── Supabase PostgreSQL (leads, ai_listings, analytics_events, …)
    └── Supabase Edge Functions (32 fn: intake, admin-action, ai-listings, …)
```

| Katman | Konum | Rol |
|--------|-------|-----|
| Core | `js/core/` | supabase, api, router, storage-keys, admin-client, analytics |
| Engines | `js/engines/`, `js/features/*/ *-engine.js` | Deterministik skor/risk/maliyet |
| AI açıklama | `js/features/ai/`, `ai-decision-commentary.js`, `*-ai-summary.js` | Narration; skor override yok |
| Decision overlay | `js/decision/decision-v3-mount.js`, `decision-os-mount.js` | V3 intelligence UI |
| Build | `scripts/production-build.cjs` | dist üretimi, SEO, env.js bake |
| Deploy | `wrangler.toml`, `production-deploy.yml` | Pages + edge + migration |

### Edge Functions

- **Intake:** `auto-intake`, `housing-intake`, `vacation-intake`, `finance-intake`, `sigorta-intake`, `kasko-intake`
- **AI listings:** `supabase/functions/_shared/ai-listings/handler.js` — scoring, risk, quality, compare, executive report
- **Ops:** `admin-action`, `analytics-ingest`, `lifecycle-cron`, `partner-retry`, `payments`
- **Smoke:** `scripts/smoke-edge-functions.cjs` (production-deploy sonrası)

### Veri snapshot yapısı

- `data/snapshots/tuik-reference.json` — tek dosya; build ile `dist/data/snapshots/` kopyalanır
- EVDS/AFAD — runtime API snapshot; `data/snapshots/` altında dosya yok
- `data/` altında ayrıca: ops, growth, investor, lifecycle, partner, seo JSON'ları

### Test / deploy yapısı

| Tür | Sayı / komut |
|-----|----------------|
| Unit | 293 dosya — `npm run test:unit` |
| Integration | 1 dosya — `npm run test:integration` |
| E2E | 8 spec (~135 test) — Playwright |
| Smoke | `test:smoke`, `smoke:live`, `smoke:edge` |
| Full gate | `npm test` — lint + build + 50+ audit script |

**CI workflows:** `ci.yml`, `production-deploy.yml`, `supabase-db-push.yml`, `edge-intake-deploy.yml`, ops/lifecycle/partner cron'ları, `lighthouse-weekly.yml`.

### Güçlü noktalar

- Modüler feature klasörleri ve category registry
- Kapsamlı audit script ekosistemi (P4–P24, compliance, SEO, admin stability)
- Deterministik motor + AI ayrımı testlerle kilitli
- Cloudflare Pages Functions ile server-side API key koruması (EVDS)

### Zayıf noktalar

- `js/app.js` monolit — bakım ve bundle boyutu riski
- AI listings shared modüllerinin bir kısmı edge handler'a tam bağlanmamış (`docs/DECISION_PLATFORM_2_FINAL_AUDIT_REPORT.md`)
- Karşılaştırma ve geçmiş localStorage — çok cihaz senkronu yok
- `server.cjs` dev stub'ında eski “Netlify functions” mesajı (üretim etkisi yok)

---

## 4. Kategori Bazlı Durum Analizi

### Auto

| Alan | Değerlendirme |
|------|---------------|
| **Mevcut durum** | Tam sihirbaz, katalog, TCO, depreciation, partner providers, V2 sonuç, V3 overlay, Decision OS, Karar Nabzı/Mahkemesi beta |
| **Kullanıcı değeri** | En yüksek — bütçe, kullanım, risk, maliyet ve öneri tek akışta |
| **Eksik taraflar** | Zorunlu tek seçim son turu; gerçek banka API finans çıkışı |
| **AI hissi** | Executive summary, commentary, Hayalini Anlat handoff — güçlü |
| **Veri kullanımı** | EVDS, ekonomik göstergeler, katalog piyasa sinyalleri |
| **UX kalitesi** | Premium V2; mobil overflow testleri mevcut |
| **v2 iyileştirmeleri** | Karar Nabzı/Mahkemesi flag-on rollout; son tur tek seçim funnel |
| **Puan** | **92/100** |

### Konut

| Alan | Değerlendirme |
|------|---------------|
| **Mevcut durum** | `real-estate-calculator`, V2 sonuç, V3 overlay, AFAD + EVDS + TÜİK katmanları |
| **Kullanıcı değeri** | Konum, DTI, deprem riski, sahiplik maliyeti — güçlü karar desteği |
| **Eksik taraflar** | Auto kadar katalog/ilan derinliği yok; registry `konut-wizard` vs calculator drift |
| **AI hissi** | Insight engine + executive summary; wizard profili narration-only |
| **Veri kullanımı** | **En zengin** — AFAD, EVDS, TÜİK üçlüsü entegre |
| **UX kalitesi** | Auto ile hizalı V2 tasarım dili |
| **v2 iyileştirmeleri** | AFAD'ı veri kaynakları sayfasına ekleme; Karar Nabzı genişlemesi |
| **Puan** | **85/100** |

### Tatil

| Alan | Değerlendirme |
|------|---------------|
| **Mevcut durum** | `tatil-engine.js` kural tabanlı skor, statik `FALLBACK_SCENARIOS`, V2 sonuç |
| **Kullanıcı değeri** | Bütçe-senaryo eşleştirme; hızlı karar özeti |
| **Eksik taraflar** | V3 overlay yok; canlı envanter/rezervasyon verisi sınırlı |
| **AI hissi** | `buildAiCommentary` + executive summary — orta |
| **Veri kullanımı** | Düşük — çoğunlukla config ve kullanıcı girdisi |
| **UX kalitesi** | V2 parity; senaryo kartları işlevsel |
| **v2 iyileştirmeleri** | Decision V3 overlay; `/secenekler` vacation katalog bağlantısı güçlendirme |
| **Puan** | **78/100** |

### Finans

| Alan | Değerlendirme |
|------|---------------|
| **Mevcut durum** | `finans-engine.js` DTI/cash-buffer, V2 sonuç, V3 overlay, EVDS referans |
| **Kullanıcı değeri** | Borç yükü, ödeme tahmini, finansman uygunluk sinyali |
| **Eksik taraflar** | Registry `resultsModule: null`; gerçek kredi API yok (simülasyon + lead) |
| **AI hissi** | `buildFinansCommentary` + V3 — iyi |
| **Veri kullanımı** | EVDS makro sinyaller |
| **UX kalitesi** | `vertical-decision-app` shell — tutarlı ama Auto kadar zengin değil |
| **v2 iyileştirmeleri** | Registry düzeltme; partner finans çıkışı netleştirme |
| **Puan** | **80/100** |

### Sigorta

| Alan | Değerlendirme |
|------|---------------|
| **Mevcut durum** | Çok ürün tipi (araç, konut, sağlık, seyahat), çok skorlu engine, V2 + PDF |
| **Kullanıcı değeri** | Koruma yeterliliği, maliyet verimliliği, karşılaştırma matrisi |
| **Eksik taraflar** | V3 overlay yok; sigorta `/secenekler` yok |
| **AI hissi** | `sigorta-ai-summary.js` — deterministik + opsiyonel proxy |
| **Veri kullanımı** | Kullanıcı profili + engine kuralları; harici prim API yok |
| **UX kalitesi** | Güçlü E2E (`decision_cards=1`); vacation-page CSS reuse |
| **v2 iyileştirmeleri** | Decision V3; ürün tipi bazlı karar kartı standardı |
| **Puan** | **82/100** |

### Kasko

| Alan | Değerlendirme |
|------|---------------|
| **Mevcut durum** | Sigorta ile paralel engine (coverage, repair risk, premium efficiency), V2 + PDF |
| **Kullanıcı değeri** | Kasko kapsam ve prim verimliliği kararı |
| **Eksik taraflar** | `saveLead` stub (`Promise.resolve({ ok: false })`); Sigorta CSS reuse |
| **AI hissi** | `kasko-ai-summary.js` — Sigorta ile aynı pattern |
| **Veri kullanımı** | Engine kuralları; canlı prim verisi yok |
| **UX kalitesi** | E2E tam wizard; lead funnel eksik |
| **v2 iyileştirmeleri** | Lead intake tamamlama; bağımsız CSS/marka |
| **Puan** | **80/100** |

---

## 5. Admin Panel v2 Önerileri

### Operasyon metrikleri

- Mevcut: `unified-funnel`, `platform-analytics`, `ops-command-center`, `dashboard-ceo/growth/support/revenue`
- **v2:** Dikey bazlı lead→partner→conversion funnel; SLA ve retry görünürlüğü (`partner-dispatch-logs`)

### Karar zekâsı metrikleri

- Mevcut: AI listings admin KPI, Karar Merkezi workspace, `ai-listings-admin-analytics-stats.js`
- **v2:** Skor dağılımı, AI narration kullanım oranı, karar tamamlama vs abandon oranı (analytics_events'ten)

### Veri sağlığı paneli

- **v2:** EVDS/AFAD/TÜİK son fetch durumu, cache age, fallback oranı; `data/snapshots/tuik-reference.json` lastReviewed uyarısı

### AI listings yönetimi

- Mevcut: publish gate, collector, repository, recommendations, decision workspace
- **v2:** Toplu QA workflow (`docs/ai-listings/ADMIN_QA_WORKFLOW.md` operasyonelleştirme), duplicate cluster review UI

### Partner / lead yönetimi

- Mevcut: `partner-endpoints`, `partner-applications`, dikey lead sayfaları
- **v2:** Lead kalite skoru (`lead-qual-fields`), partner SLA dashboard, vertical dispatch smoke entegrasyonu

### Yatırımcı ve raporlama görünümü

- Mevcut: `investor-metrics`, `metrics:investor:pack` scriptleri
- **v2:** Tek tık PDF pack + canlı KPI snapshot; category dominance ve unit economics embed

---

## 6. Karar Asistanı ve Hayalini Anlat v2 Önerileri

### Niyet tanıma

- Mevcut: Auto-only AI + regex fallback
- **v2:** Konut ve Tatil için kısıtlı intent şemaları; `assistant-intent-schema.js` genişletme; skor motoruna dokunmadan wizard pre-fill

### Kategori yönlendirme

- Mevcut: 6 rail + `assistant-category-bridge.js` handoff
- **v2:** Niyet güven skoru düşükse “hangi dikey?” netleştirme adımı; mevcut fork yapısını bozmadan

### Kişisel karar profili

- Mevcut: `js/ai-personalization/` (admin/decision workspace); skor değişmez
- **v2:** Auth kullanıcıda tercih profili özeti Karar Asistanı hub'ında (gösterim önceliği only)

### AI açıklama kalitesi

- Mevcut: Pro + hourly quota; deterministic rationale her zaman
- **v2:** Dikey-spesifik prompt şablonları; forbidden phrase genişletme; Türkçe ton tutarlılığı audit

### Dikey analiz handoff yapısı

- Mevcut: CTA → `/auto/` vb.; assistant answers session'da taşınır
- **v2:** Handoff URL'de güvenli state token; `assistant-vertical-bootstrap.js` ile testli parity tüm 6 dikey

---

## 7. AI Seçenekler / AI İlan v2 Önerileri

### Marketplace algısı riski

- Rota adı `secenekler` + eski `ilanlar` alias + listing kartları marketplace çağrışımı yaratıyor
- **v2:** Hero/SEO/microcopy → “Karar seçenekleri”; skor/risk/uygunluk ön planda (`secenekler-public-microcopy` testleri genişletme)
- **Yapılmamalı:** Route deprecate canonical journey onayı olmadan

### Karar seçenekleri konumlandırması

- Katalog = engine-skorlu **karar adayları**, ilan pazaryeri değil
- Boş state CTA'ları zaten dikey wizard'a yönlendiriyor — bu pattern korunmalı

### Kart yapısı

- Mevcut: AI uyum skoru, trust strip, compare/favorite/detail
- **v2:** Deterministik skor breakdown tooltip; metodoloji linki; “neden bu seçenek” kısa gerekçe (engine'den, LLM'den değil)

### Skor / risk / uygunluk görünümü

- `ai_listing_analyses` alanları: `ai_score`, `risk_score`, vb.
- **v2:** Üç metrik görsel hiyerarşi; güven skoru (veri tamlığı) ayrı badge

### Karşılaştırma entegrasyonu

- Mevcut: Karttan compare tray → `/karsilastir/`
- **v2:** “Bu seçenekle karar asistanı sonucunu karşılaştır” (auth + geçmiş bağlantısı)

---

## 8. Karar Nabzı v2 Önerileri

### Karar izleme sistemi

- Mevcut: Auto V2 opt-in snapshot (`karar-nabzi-snapshot.js`); store only
- **v2:** `/profil` veya `/gecmis` altında “İzlenen kararlar” listesi; flag default-on değerlendirmesi PO ile

### Fiyat / risk / veri değişimi takibi

- Snapshot: deterministik intel çıktıları frozen
- **v2:** Periyodik EVDS/katalog re-fetch ile delta özeti (backend job veya client revisit)

### Bildirim stratejisi

- Mevcut: Yok
- **v2:** E-posta/push opt-in; “skor değişmedi, bağlam değişti” mesajı; KVKK uyumlu

### Premium potansiyel

- Nabzı = Pro özellik adayı: izleme limiti (free 1, Pro 10), delta raporu PDF

### Kullanıcı değeri

- “Bekle mi alayım mı” kararında zaman içi bağlam — Auto ile doğal uyum; sonra Konut/Finans

---

## 9. Karar Mahkemesi v2 Önerileri

### Lehte / aleyhte analiz

- Mevcut: Deterministik gerekçe listesi + Bekleme Skoru
- **v2:** Yapılandırılmış “lehte 3 / aleyhte 3” blok; skor motorundan türetilmiş, LLM serbest metin değil

### Kör nokta tespiti

- **v2:** Eksik kullanıcı girdisi uyarısı (ör. ekspertiz yok, sigorta teklifi yok)

### Karar doğrulama

- **v2:** “Bu analiz şu varsayımlara dayanıyor” checklist; metodoloji linki

### Premium paket potansiyeli

- Mahkemesi = Pro deep-dive: extended senaryo, PDF export, Karar Nabzı bundle

---

## 10. Veri Kaynakları ve Metodoloji

### EVDS

- **Rol:** Makro faiz/enflasyon sinyalleri; finansman ve risk bağlamı
- **Etkilenen kararlar:** Auto, Konut, Finans sonuçları; ana sayfa ekonomik göstergeler
- **Güven:** Canlı API + last-good cache; API key server-side only

### AFAD

- **Rol:** Deprem olay filtresi + sismik bölge modeli
- **Etkilenen kararlar:** Konut wizard ve sonuç risk katmanı
- **Gap:** `veri-kaynaklari/index.html` ve `data-sources-page.json`'da **listelenmiyor** — şeffaflık borcu

### TÜİK

- **Rol:** Referans istatistik metadata; `scoreImpact: false`
- **Etkilenen kararlar:** Konut sonuç katmanı; AI narration bağlamı
- **Güven:** Manuel review tarihi (`lastReviewed: 2026-06-08`); upstream API yok

### Veri güveni

- Metodoloji sayfası deterministik-önce ilkesini açıklıyor
- **v2:** Her sonuç kartında “veri kaynağı rozeti” + etki matrisi (skor mu, anlatım mı)

### Kullanıcıya açıklanabilir metodoloji

- `data/seo/methodology-page.json` — kapsamlı Türkçe içerik
- **v2:** Dikey-spesifik metodoloji anchor'ları; FAQ genişletme

### Hangi verinin hangi kararı etkilediği

| Veri | Skor etkisi | Anlatım etkisi | Dikeyler |
|------|-------------|----------------|----------|
| EVDS | Risk bağlamı, finansman stresi | Evet | Auto, Konut, Finans |
| AFAD | Konut risk yoğunluğu | Evet | Konut |
| TÜİK | Hayır (`scoreImpact: false`) | Evet | Konut (+ referans) |
| Kullanıcı girdisi | Birincil | Evet | Tümü |
| AI listings analizi | Seçenek skoru | Evet | Secenekler katalog |

---

## 11. Genel Puanlama Raporu

| Alan | Puan | Gerekçe |
|------|------|---------|
| **Teknik mimari** | 84/100 | Cloudflare+Supabase olgun; monolit app.js ve edge entegrasyon boşlukları |
| **Ürün bütünlüğü** | 78/100 | Canonical journey sağlam; secenekler/ilan dili ve dikey olgunluk farkı |
| **Kategori kalitesi** | 83/100 | Auto/Konut güçlü; Tatil/Kasko geride; ortalama ~83 |
| **AI hissi** | 76/100 | Auto/Konut/Finans iyi; Hayalini Anlat dar; Nabzı/Mahkemesi gizli |
| **Admin panel** | 81/100 | 55 sayfa + AI listings workspace; karar zekâsı metrikleri dağınık |
| **Veri kaynakları** | 72/100 | EVDS/AFAD/TÜİK kodda var; AFAD şeffaflık ve canlı veri kapsamı sınırlı |
| **Mobil UX** | 74/100 | Audit'ler ve E2E var; overflow ve history race notları |
| **SEO / metodoloji** | 85/100 | Sitemap, hreflang, metodoloji/rehber; prerender hub fırsatı |
| **Ticari hazırlık** | 77/100 | Stripe Pro, partner lead; tam finans çıkışı ve retention motoru kısmi |
| **Yatırımcı hazırlığı** | 80/100 | Investor metrics scriptleri, P7 docs; canlı KPI otomasyonu genişletilebilir |
| **Test / deploy güvenliği** | 88/100 | 293 unit + E2E + smoke + production-deploy zinciri |
| **Teknik borç riski** | 65/100 | app.js boyutu, registry drift, npm audit, localStorage persist sınırları |

**Genel platform puanı (ağırlıklı ortalama):** ~**79/100** — üretimde güçlü karar platformu; v2 odak = ürün dili, dikey parity, Nabzı/Mahkemesi ürünleştirme, veri şeffaflığı.

---

## 12. Fazlı Yol Haritası

### Faz 1: Audit / dokümantasyon

| | |
|--|--|
| **Hedef** | Bu rapor; envanter ve puanlama baseline |
| **Değişecek dosyalar** | `docs/PROJECT_VERSION_UPGRADE_AUDIT_V2.md` |
| **Değişmeyecek** | Runtime, CSS, migration, edge, workflow, package |
| **Test planı** | Doküman review; git diff yalnızca docs |
| **Risk** | Düşük |
| **PR** | `docs: Decision Intelligence v2.0 audit raporu` |

### Faz 2: Ürün anlatısı ve sayfa dili

| | |
|--|--|
| **Hedef** | Marketplace çağrışımını azaltma; karar dili standardı |
| **Değişecek** | `js/ui/listings-ui.js`, `premium-pages.js`, `data/seo/hubs.json`, microcopy testleri |
| **Değişmeyecek** | Router paths (PO onayı olmadan), skor motorları |
| **Test** | `secenekler-public-*`, `premium-karar-hub-copy`, E2E user-flow |
| **Risk** | Düşük |
| **PR** | `copy: secenekler ve hub karar dili v2` |

### Faz 3: Kategori sonuç standardı

| | |
|--|--|
| **Hedef** | Tatil/Sigorta/Kasko V3 overlay; Kasko lead; registry düzeltme |
| **Değişecek** | `*-results-v2.js`, `decision-v3-mount.js`, `category-registry.js`, `kasko-app.js` |
| **Değişmeyecek** | Auto/Konut skor formülleri, canonical wizard adımları |
| **Test** | İlgili unit + `site-health.spec.mjs` |
| **Risk** | Orta |
| **PR** | Dikey başına ayrı PR (max 1 dikey/PR) |

### Faz 4: AI Seçenekler konumlandırması

| | |
|--|--|
| **Hedef** | Skor breakdown kartları; trust/metodoloji bağlantısı |
| **Değişecek** | `listings-ui.js`, `listing-trust-ui.js`, `decision-options-api.js` |
| **Değişmeyecek** | `ai_listings` şeması, publish gate mantığı |
| **Test** | `secenekler-trust-catalog.spec.mjs`, unit trust badges |
| **Risk** | Orta |
| **PR** | `feat(secenekler): karar seçeneği kart v2` |

### Faz 5: Karar Nabzı v2

| | |
|--|--|
| **Hedef** | İzlenen kararlar UI; delta özeti; Pro gate |
| **Değişecek** | `karar-nabzi-*`, `auto-results-v2.js`, profil/geçmiş UI |
| **Değişmeyecek** | Snapshot deterministik yapısı, Mahkemesi motoru |
| **Test** | `karar-nabzi-snapshot.test.mjs`, retention tests |
| **Risk** | Orta-yüksek (flag rollout) |
| **PR** | `feat(karar-nabzi): izleme listesi v2` |

### Faz 6: Admin Panel v2

| | |
|--|--|
| **Hedef** | Veri sağlığı + karar zekâsı metrik dashboard |
| **Değişecek** | `js/admin/internal-dashboards.js`, yeni embed JSON, admin shell nav |
| **Değişmeyecek** | `admin-action` contract, RLS |
| **Test** | `admin-dashboard-*`, `internal-dashboards.test.mjs` |
| **Risk** | Orta |
| **PR** | `feat(admin): karar zekası metrik paneli` |

### Faz 7: Veri / metodoloji güven katmanı

| | |
|--|--|
| **Hedef** | AFAD public docs; sonuç kartı veri rozeti; etki matrisi |
| **Değişecek** | `veri-kaynaklari/`, `results-*-layer.js`, `methodology-page.json` |
| **Değişmeyecek** | EVDS/AFAD skor formülleri, TÜİK `scoreImpact: false` |
| **Test** | `results-afad-*`, `tuik-*`, SEO audit |
| **Risk** | Düşük-orta |
| **PR** | `feat(data-trust): veri kaynağı şeffaflık v2` |

### Faz 8: Ticari / yatırımcı hazırlığı

| | |
|--|--|
| **Hedef** | Investor pack otomasyonu; Nabzı/Mahkemesi Pro bundle; KPI snapshot |
| **Değişecek** | `js/features/monetization/*`, `scripts/investor-*`, pricing copy |
| **Değişmeyecek** | Stripe webhook mantığı, ücretsiz skor limitleri (PO onayı olmadan) |
| **Test** | `pro-plan`, `paywall-v1`, `investor-readiness` |
| **Risk** | Orta |
| **PR** | `feat(commercial): pro karar paketi v2` |

---

## 13. Kesinlikle Yapılmaması Gerekenler

1. **Canonical journey bozma** — Karar Asistanı → dikey → sonuç → karşılaştırma/geçmiş sırasını tek PR'da değiştirmeme
2. **Marketplace'e dönüştürme** — AI listings'i ana ürün olarak konumlandırmama; skorlu karar seçenekleri olarak tutma
3. **Skor motorlarını AI'a devretme** — LLM çıktısı ile `ai_score`, `risk_score`, TCO veya DTI override etmeme
4. **Tek PR'da büyük refactor** — `app.js` split, CSS mega rewrite, cross-vertical Results V3 re-platforming
5. **Cloudflare/Supabase dışı infra varsayma** — Netlify, Vercel, alternatif DB ekleme
6. **Netlify ekleme** — Proje hattı Cloudflare Pages + Supabase + GitHub
7. **Çalışan üretim akışını bozma** — `production-deploy.yml`, `wrangler.toml`, migration'ları drive-by değiştirmeme
8. **Route deprecate without PO** — `/secenekler` kaldırma veya `/ilanlar` geri getirme onaysız
9. **Flag default-on** — Karar Nabzı/Mahkemesi production'da PO onayı olmadan açmama
10. **Gizli öncelik / partner skoru** — Lead eşleştirmede şeffaflık ilkesini bozmama

---

## 14. İlk 10 Uygulama Önerisi

Yüksek etki / düşük risk sırasıyla:

1. **AFAD'ı veri kaynakları sayfasına ekleme** — Şeffaflık; kod değişikliği minimal (HTML + JSON)
2. **Secenekler hero/microcopy karar dili** — Marketplace algısı riskini azaltma; testler mevcut
3. **`category-registry.js` finans `resultsModule` düzeltme** — Dokümantasyon/registry drift giderimi
4. **Kasko `saveLead` stub tamamlama** — Sigorta pattern kopyası; izole PR
5. **Sonuç kartlarına metodoloji linki** — Tüm V2 results modüllerinde tutarlı footer
6. **Hayalini Anlat konut MVP intent şeması** — Mevcut extractor genişletme; auto regressions korunur
7. **Karar Nabzı izleme listesi (read-only UI)** — Store zaten var; flag-off default korunur
8. **Admin veri sağlığı widget** — EVDS/TÜİK last fetch/review göstergesi
9. **Tatil Decision V3 overlay mount** — Finans pattern'i kopyala; motor değişmez
10. **Investor metrics snapshot haftalık CI artifact** — Mevcut scriptleri workflow'a bağlama (yeni workflow onayı ile)

---

## Ek: Repo Envanter Özeti

### Ana sayfa ve genel sayfalar

- `index.html` — marketing SPA + pricing + partner
- Kurumsal: `hakkimizda.html`, `iletisim.html`, `yardim.html`, `gizlilik.html`, `kvkk.html`, `cerez-politikasi.html`, `gdpr.html`
- Partner: `partner-olun.html`, `partner-basvuru.html`, `partner-planlar.html`, …
- `offline.html` (PWA), `abonelik-iptal.html`

### Test yapısı özeti

| Katman | Dosya | Komut |
|--------|-------|-------|
| Unit | 293 | `npm run test:unit` |
| Integration | 1 | `npm run test:integration` |
| E2E | 8 spec | `npm run test:e2e:ci` / `test:e2e:release` |
| Smoke | 3 script | `npm run test:smoke` |

### Build / deploy özeti

- **Build:** `npm run build` → `dist/`
- **Deploy:** `production-deploy.yml` — quality → edge intake → Cloudflare Pages → Supabase migration/edge → smoke-live
- **Manuel:** `supabase-db-push.yml`, `edge-intake-deploy.yml`

---

*Bu belge yalnızca analiz ve öneri içerir. Üretim davranışını değiştirmez. Skor motorlarına, routing canonical set'ine veya feature flag default'larına dokunulması ayrı PO onaylı PR'lar gerektirir.*
