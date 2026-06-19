# TÜBİTAK Readiness Audit — istebul.com

**Tarih:** 2026-06-17  
**Kapsam:** Mevcut codebase, dokümantasyon, CI/CD ve uyumluluk dosyaları (kod değişikliği yapılmamıştır)  
**Versiyon:** `package.json` → `2.2.20`  
**Uyarı:** Şirket türü, KOBİ statüsü, mali tablolar ve PRODİS kayıtları codebase dışıdır; aşağıda **kurucudan doğrulanacak** olarak işaretlenmiştir.

---

## 1. Kısa Sonuç

| Program | Ön kanaat | Gerekçe (tek cümle) |
|---------|-----------|---------------------|
| **1507** KOBİ Ar-Ge Başlangıç | **CONDITIONAL** | Teknik Ar-Ge anlatısı güçlü; ancak başvuru sahibinin sermaye şirketi + KOBİ statüsü doğrulanmalı ve 2026/1 çağrısı kapanmış — sonraki çağrıya hazırlık mantıklı. |
| **1501** Sanayi Ar-Ge | **CONDITIONAL** | 24–36 aylık, çok dikeyli Ar-Ge planı codebase ile desteklenebilir; kurumsal olgunluk ve bütçe kapasitesi 1507’ye göre daha yüksek beklenti taşır. |
| **1711** Yapay Zekâ Ekosistem | **CONDITIONAL** (konsorsiyumsuz **NO-GO**) | AI çözüm mantığı uyumlu; konsorsiyum (müşteri kuruluş + teknoloji sağlayıcı KOBİ + üniversite + YZE protokolü) zorunlu. |

- **En güçlü başvuru hattı:** **1507** — “Hibrit, açıklanabilir yapay zekâ destekli çok dikey karar destek platformu” (deterministik skor + sınırlı LLM anlatım + açık veri + outcome kalibrasyonu).
- **En zayıf halka:** **Kurumsal uygunluk** — `data/compliance/data-controller.json` içinde `legalForm: "Bireysel girişim / ticari faaliyet"` kayıtlı; TÜBİTAK 1501/1507/1711 başvuruları için **Türkiye’de yerleşik sermaye şirketi (LTD/AŞ)** şartı codebase’de doğrulanamıyor (**kurucudan doğrulanacak**).

---

## 2. Projenin Ar-Ge Olarak Anlatılabilecek Parçaları

### 2.1 AI destekli karar verme

| Alan | Detay |
|------|-------|
| **Özellik** | Kural tabanlı skorlama + sınırlı LLM anlatım katmanı; LLM deterministik sayıları override edemez. |
| **İlgili dosyalar** | `docs/AI_DECISION_ENGINE.md`, `js/engines/decision-consultant.js`, `js/auto/auto-ai.js`, `js/features/results/decision-intelligence-engine.js`, `functions/ai-proxy.js`, `js/features/ai/ai-insight-engine.js` |
| **TÜBİTAK’ta nasıl anlatılır** | “Yüksek tutarlı satın alma kararları için hibrit karar destek mimarisi: deterministik çok faktörlü skor motoru + halüsinasyon kontrollü Türkçe anlatım katmanı.” |
| **Ar-Ge yenilik değeri** | Finans/otomotiv/konut gibi yüksek riskli kararlarda black-box LLM yerine denetlenebilir skor + bounded generative explanation. |
| **Mevcut eksik** | Ana asistan skoru ile Auto skoru henüz birleştirilmemiş (`docs/AI_DECISION_ENGINE.md` — “Future P4”); `docs/PLATFORM_EXPANSION_ROADMAP.md` — skorlama ikiye bölünmüş. |

### 2.2 Deterministic scoring / risk / TCO motorları

| Alan | Detay |
|------|-------|
| **Özellik** | Çok faktörlü araç eşleşme skoru, güven meta-modeli (skordan bağımsız), TCO/depreciation, risk ve kalite motorları. |
| **İlgili dosyalar** | `js/engines/decision-consultant.js` (`SCORE_FACTORS`, `computeConfidenceMeta`), `js/engines/cost-engine.js`, `js/auto/auto-cost-engine.js`, `js/auto/depreciation-engine.js`, `supabase/functions/_shared/ai-listings/engine/{decision,risk,quality,market}-engine.js`, `js/features/evds/evds-market-engine.js` |
| **TÜBİTAK’ta nasıl anlatılır** | “Toplam sahip olma maliyeti (TCO), finansman yükü, segment uyumu ve risk sinyallerini birleştiren çok dikey deterministik karar motoru ailesi.” |
| **Ar-Ge yenilik değeri** | Skor tabanı (`SCORE_BASE=42`), faktör kırılımı ve güven bandının ayrı hesaplanması — denetlenebilir karar çıktısı. |
| **Mevcut eksik** | `js/data/market-data.js` — `liveProvidersEnabled: false`; partner canlı fiyat beslemesi planlı (`data/seo/data-sources-page.json` — `status: "planned"`). |

### 2.3 Açıklanabilir AI çıktıları

| Alan | Detay |
|------|-------|
| **Özellik** | Faktör etkisi, rank intelligence, confidence semantics, karar simülatörü, executive report. |
| **İlgili dosyalar** | `js/features/moat/scoring-explainability.js`, `supabase/functions/_shared/ai-listings/explainability/`, `js/ai-decision-explainability/`, `supabase/functions/_shared/ai-listings/decision-simulator/`, `tests/unit/scoring-explainability.test.mjs`, `tests/unit/ai-explanation-experience.test.mjs` |
| **TÜBİTAK’ta nasıl anlatılır** | “XAI katmanı: her önerinin faktör katkıları, güven düzeyi gerekçesi ve what-if senaryo analizi kullanıcıya şeffaf sunulur.” |
| **Ar-Ge yenilik değeri** | Regülasyon ve tüketici güveni açısından “AI skoru değiştirmez, açıklar” mimari ayrımı (`docs/site-owner/05-konusma-sablonlari.md`). |
| **Mevcut eksik** | AI Listings explainability stack üretimde kapalı (`src/ai-listings/core/config.js` — default `false`). |

### 2.4 Veri kaynakları / açık veri entegrasyonları

| Alan | Detay |
|------|-------|
| **Özellik** | TCMB EVDS canlı entegrasyon (skor etkisi üst sınır %12); TÜİK manuel referans; AFAD deprem katmanı (feature-flag kapalı). |
| **İlgili dosyalar** | `data/seo/data-sources-page.json`, `js/services/evds-service.js`, `functions/api/evds-snapshot.js`, `js/features/evds/evds-market-engine.js` (`EVDS_MAX_DECISION_IMPACT_RATIO = 0.12`), `js/data/afad-earthquake-service.js`, `docs/OPEN_DATA_OD-2B_CLOSURE.md`, `docs/OPEN_DATA_OD-2C_CLOSURE.md`, `veri-kaynaklari/index.html` |
| **TÜBİTAK’ta nasıl anlatılır** | “Kamuya açık makro verilerin (EVDS) karar motoruna sınırlı ve denetlenebilir etki ile entegrasyonu; konut risk katmanında AFAD verisi.” |
| **Ar-Ge yenilik değeri** | Makro verinin karar skoruna etkisinin üst sınır ile sınırlandırılması — açıklanabilir politika motoru. |
| **Mevcut eksik** | TÜİK `status: "reference"`, `accessMode: "Manuel referans"` (`data/seo/data-sources-page.json`); AFAD prod’da kapalı (`CHANGELOG.md` 2.2.22–2.2.23); TÜİK adapter TODO (`docs/ai-listings/FUTURE_INTEGRATION_PLAN.md`). |

### 2.5 Güvenlik, KVKK, RLS, edge functions

| Alan | Detay |
|------|-------|
| **Özellik** | RLS deny-by-default, server-side consent, PII scrubbing, CSP/HSTS, webhook HMAC, edge intake. |
| **İlgili dosyalar** | `supabase/migrations/20260527_launch_security_hardening.sql`, `supabase/migrations/20260702_user_decision_platform_v1.sql`, `supabase/functions/auto-intake/index.ts` (`privacy_consent`), `supabase/functions/_shared/outcome-capture.ts`, `docs/SECURITY_AUDIT.md`, `docs/COMPLIANCE_READINESS_AUDIT.md`, `_headers`, `kvkk.html` |
| **TÜBİTAK’ta nasıl anlatılır** | “Kişisel veri işleme ve karar çıktılarının güvenli dağıtımı için edge-first mimari, RLS ve açık rıza doğrulaması.” |
| **Ar-Ge yenilik değeri** | Outcome graph’ta PII blocklist ile anonim geri bildirim döngüsü (`docs/P3_MOAT_ARCHITECTURE.md`). |
| **Mevcut eksik** | KVKK aydınlatmada veri sorumlusu unvan/adres eksik (`docs/COMPLIANCE_READINESS_AUDIT.md` §3.2); GDPR 1/5; VERBİS **kurucudan doğrulanacak**. |

### 2.6 Test ve kalite altyapısı

| Alan | Detay |
|------|-------|
| **Özellik** | 270 unit test dosyası, 50+ audit script, Playwright E2E, compliance/security audit gates. |
| **İlgili dosyalar** | `package.json` (`test`, `test:router`, `test:e2e:release`), `tests/unit/decision-consultant.test.mjs`, `tests/unit/evds-market-engine.test.mjs`, `tests/unit/no-direct-ai-proxy.test.mjs`, `scripts/compliance-audit-check.cjs`, `scripts/final-enterprise-release-audit.cjs` |
| **TÜBİTAK’ta nasıl anlatılır** | “Karar motoru doğruluğu ve regresyon güvencesi için kapsamlı otomatik test ve audit pipeline.” |
| **Ar-Ge yenilik değeri** | Deterministik skorların CI’da korunması — tekrarlanabilir Ar-Ge çıktısı. |
| **Mevcut eksik** | Canlı EVDS/AFAD API entegrasyon testi yok (unit/mock); Lighthouse PR’da non-blocking (`.github/workflows/ci.yml`). |

### 2.7 Üretim / preview deployment disiplini

| Alan | Detay |
|------|-------|
| **Özellik** | `main` push → test + Cloudflare Pages + Supabase edge deploy; go-live verification gate. |
| **İlgili dosyalar** | `README.md`, `.github/workflows/production-deploy.yml`, `.github/workflows/ci.yml`, `docs/CANLIYA_ALMA_REHBERI.md`, `npm run verify:deploy`, `npm run go-live:verify` |
| **TÜBİTAK’ta nasıl anlatılır** | “Ar-Ge çıktılarının sürekli entegrasyon ve otomatik canlıya alma ile doğrulanması.” |
| **Ar-Ge yenilik değeri** | Pilot ve saha testlerine hızlı iterasyon altyapısı. |
| **Mevcut eksik** | DB migration push manuel `workflow_dispatch` (`.github/workflows/supabase-db-push.yml`); edge deploy secrets yoksa skip. |

---

## 3. TÜBİTAK Program Eşleştirmesi

### 3.1 1507 KOBİ Ar-Ge Başlangıç

| Kriter | Değerlendirme |
|--------|---------------|
| **KOBİ sermaye şirketi şartı** | **Codebase dışı / kurucudan doğrulanacak.** TÜBİTAK: yalnızca Türkiye’de yerleşik **sermaye şirketi** + **KOBİ** ([tubitak.gov.tr/1507](https://tubitak.gov.tr/tr/destekler/sanayi/ulusal-destek-programlari/1507-tubitak-kobi-ar-ge-baslangic-destek-programi)). Repoda `data/compliance/data-controller.json` → `"legalForm": "Bireysel girişim / ticari faaliyet"` — **1507 için uyumsuz görünüyor**; `docs/investor/loi-template.md` ise “isteBul Teknoloji A.Ş.” şablonu içeriyor (çelişki — kurucu netleştirmeli). |
| **Bütçe ve iş paketleri** | 1507: destek süresi **≤18 ay**, bütçe üst sınırı çağrı metnine bağlı (danışman kaynaklarında ~3,5M TL bandı). Mevcut codebase 12–18 aylık, 5 iş paketli pilot + motor geliştirme planına uygun (Bölüm 5). |
| **Ar-Ge yenilik unsuru** | **Güçlü.** Hibrit karar motoru, XAI, outcome kalibrasyonu, açık veri sınırlı etki modeli — dokümante ve testli. |
| **İlk başvuru için uygun anlatı** | “Türkiye’de yüksek tutarlı tüketici kararları (otomotiv öncelikli) için açıklanabilir yapay zekâ destekli karar destek platformunun Ar-Ge’si: deterministik skor motoru, TCO/risk entegrasyonu, TCMB EVDS beslemeli makro sinyal katmanı ve halüsinasyon kontrollü Türkçe anlatım.” |

**1507 özel not (takvim):** TÜBİTAK duyurusuna göre 2026/1 çağrısı **30 Mart 2026**’da kapanmıştır ([tubitak.gov.tr duyuru](https://tubitak.gov.tr/tr/duyuru/1501-sanayi-ar-ge-destek-programi-ve-1507-kobi-ar-ge-baslangic-destek-programi-2026-yili-1-cagrilari-basvuru-takvimi-guncellendi)). Bu audit tarihi (17 Haziran 2026) itibarıyla **1507/1501 için acil başvuru penceresi kapalı**; Temmuz–Ağustos 2026/2 çağrısına hazırlık önerilir.

### 3.2 1501 Sanayi Ar-Ge

| Kriter | Değerlendirme |
|--------|---------------|
| **1507’ye göre daha büyük kapsam mümkün mü?** | **Evet.** `docs/PLATFORM_EXPANSION_ROADMAP.md` — 8 dikey hedef; `supabase/functions/_shared/ai-listings/` — 40+ modüllük listings/decision stack; 64 migration, 35 edge function. |
| **24–36 aylık plana dönüşebilir mi?** | **Evet, koşullu.** Fazlar: (1) Auto+konut parity + unified scoring, (2) çok dikey CRM/intake, (3) canlı veri + TÜİK/ partner adapter, (4) outcome kalibrasyon + B2B API, (5) pilot ölçekleme. |
| **Yazılabilecek teknik iş paketleri** | WP1 veri mimarisi · WP2 unified decision OS · WP3 XAI + simülatör · WP4 güvenilirlik/test · WP5 çok dikey pilot · WP6 ticarileşme/API (Bölüm 5 genişletilmiş). |

**1501 riski:** Daha yüksek proje yönetimi ve “endüstriyel Ar-Ge içeriği” beklentisi; mevcut ürün olgunluğu Auto ağırlıklı (`docs/PLATFORM_EXPANSION_ROADMAP.md` — sigorta ~35%, eğitim ~0%).

### 3.3 1711 Yapay Zekâ Ekosistem

| Kriter | Değerlendirme |
|--------|---------------|
| **AI çözüm mantığına uyum** | **Yüksek.** Program “müşteri ihtiyacına yönelik yapay zekâ çözümü” arar; isteBul tam olarak karar destek AI platformu (`index.html` meta, `README.md`). |
| **Öncelikli alan eşleşmesi** | **Finans Teknolojileri** en yakın (finansman simülasyonu, EVDS, TCO, `finans/` dikeyi, `docs/investor/ONE_PAGER.md`). İklim/sürdürülebilirlik: yalnızca AFAD deprem katmanı ile sınırlı zayıf bağ. Akıllı eğitim: `docs/PLATFORM_EXPANSION_ROADMAP.md` — eğitim ~0%. |
| **Partner ihtiyacı** | **Zorunlu konsorsiyum:** Müşteri Kuruluş + ≥1 KOBİ teknoloji sağlayıcı + ≥1 üniversite araştırma lab/merkezi + TÜBİTAK YZE iş birliği protokolü ([tubitak.gov.tr/1711](https://tubitak.gov.tr/tr/destekler/sanayi/ulusal-destek-programlari/1711-yapay-zeka-ekosistem-cagrisi)). |
| **Konsorsiyumsuz başvuru** | **Mümkün değil.** “Konsorsiyum kurulmadan yapılan başvurular değerlendirmeye alınmamaktadır.” |

**1711 rol senaryoları (kurucudan doğrulanacak):**

1. **Teknoloji sağlayıcı KOBİ** — isteBul skor/XAI motorunu sunar; müşteri kuruluş olarak banka, sigorta veya büyük otomotiv perakendecisi gerekir.
2. **Müşteri kuruluş** — isteBul kendi ihtiyacı için AI çözümü talep eder; ayrı teknoloji sağlayıcı KOBİ + üniversite gerekir (mevcut codebase isteBul’ün kendi motorunu geliştirdiğini gösterir — bu rol daha az doğal).

**1711 takvim (2026):** Çağrı **15 Haziran – 18 Eylül 2026** ([tubitak.gov.tr duyuru](https://tubitak.gov.tr/tr/duyuru/1711-yapay-zeka-ekosistem-2026-yili-cagrisi-acildi)). Ön kayıt sonu **14 Eylül 2026**.

---

## 4. Başvuruya Dönüştürülebilecek Proje Başlığı Önerileri

| # | Teknik başlık | Sade ticari başlık | TÜBİTAK diliyle Ar-Ge başlığı |
|---|---------------|-------------------|--------------------------------|
| 1 | Hibrit Deterministik–Generative Karar Destek Motoru (HDGKDM) | Akıllı satın alma danışmanı | Yüksek tutarlı tüketici kararları için açıklanabilir yapay zekâ destekli çok faktörlü karar destek sisteminin geliştirilmesi |
| 2 | TCMB EVDS Sınırlı Etki Makro Sinyal Katmanı | Canlı ekonomi verisiyle daha doğru öneri | Kamu makro verilerinin deterministik karar skorlarına denetlenebilir entegrasyonu |
| 3 | Outcome-Informed Segment Kalibrasyon Döngüsü | Gerçek sonuçlarla öğrenen skor | Anonim sonuç geri bildirimi ile segment bazlı karar skoru kalibrasyon algoritmasının Ar-Ge’si |
| 4 | Çok Dikey TCO–Risk–Uygunluk Birleşik Skor Platformu | Araba, ev, tatil tek panelde | Otomotiv, konut ve turizm dikeylerinde toplam maliyet ve risk odaklı birleşik karar motoru |
| 5 | Halüsinasyon Kontrollü Türkçe Karar Anlatım Katmanı | AI açıklaması güvenilir | Büyük dil modellerinin kural tabanlı karar çıktılarını değiştirmeden açıklayan güvenli anlatım katmanının geliştirilmesi |

---

## 5. İş Paketi Taslağı

### WP1: Mevcut sistem analizi ve veri mimarisi

| Alan | İçerik |
|------|--------|
| **Amaç** | Çok dikey karar platformunun mevcut durum envanteri ve hedef veri mimarisi. |
| **Mevcut codebase kanıtı** | `docs/ARCHITECTURE.md`, `docs/PLATFORM_EXPANSION_ROADMAP.md`, `js/core/`, 64× `supabase/migrations/*.sql` |
| **Yapılacak Ar-Ge** | Category registry tasarımı; `auto_leads` dışı dikey intake şeması; veri sözlüğü; TÜİK/EVDS/partner adapter spesifikasyonu. |
| **Çıktı** | Veri mimarisi raporu + ER diyagramı + adapter RFC. |
| **Risk** | Mevcut `localStorage` market data (`docs/PLATFORM_EXPANSION_ROADMAP.md` §1) — merkezi modele geçiş gecikmesi. |
| **Başarı metriği** | 3 dikey için ortak intake şeması onayı; adapter arayüzleri dokümante. |

### WP2: Karar destek / skor motoru geliştirme

| Alan | İçerik |
|------|--------|
| **Amaç** | Auto ve asistan skorlarının tek kaynakta birleştirilmesi; çok dikey skor ailesi. |
| **Mevcut codebase kanıtı** | `js/engines/decision-consultant.js`, `js/auto/auto-ai.js`, `supabase/functions/_shared/scoring-intelligence.ts`, `docs/AI_DECISION_ENGINE.md` |
| **Yapılacak Ar-Ge** | `scoreVehicleMatch()` ile asistan skorunun unify edilmesi; konut/tatil için domain faktör setleri; segment kalibrasyon (`calibrateLeadScore`). |
| **Çıktı** | Unified decision consultant v2 + API sözleşmesi. |
| **Risk** | Skor regresyonu — mevcut Auto funnel CRO etkisi. |
| **Başarı metriği** | Regresyon test suite PASS; skor farkı ≤±2 puan mevcut Auto baseline’a karşı (`tests/unit/decision-consultant.test.mjs`). |

### WP3: Açıklanabilir AI katmanı

| Alan | İçerik |
|------|--------|
| **Amaç** | XAI, what-if simülatör ve Türkçe anlatımın üretim genellemesi. |
| **Mevcut codebase kanıtı** | `js/features/moat/scoring-explainability.js`, `supabase/functions/_shared/ai-listings/explainability/`, `functions/ai-proxy.js`, `tests/unit/ai-explanation-experience.test.mjs` |
| **Yapılacak Ar-Ge** | Explainability panelinin tüm dikeylere taşınması; `sanitizeAiNarrative` politika genişletmesi; karar raporu PDF/export. |
| **Çıktı** | XAI SDK + kullanıcı test raporu. |
| **Risk** | LLM maliyeti/latency (`AI_RATE_LIMIT_PER_MIN = 20` — `functions/ai-proxy.js`). |
| **Başarı metriği** | Kullanıcı anlaşılırlık skoru (SUS) ≥ hedef; halüsinasyon ihlali 0 (otomatik test). |

### WP4: Güvenilirlik, doğrulama, test ve kalite

| Alan | İçerik |
|------|--------|
| **Amaç** | Karar çıktılarının doğrulanabilirliği, güvenlik ve regülasyon uyumu. |
| **Mevcut codebase kanıtı** | `docs/SECURITY_AUDIT.md`, `docs/COMPLIANCE_READINESS_AUDIT.md`, `scripts/compliance-audit-check.cjs`, RLS migrations |
| **Yapılacak Ar-Ge** | KVKK tam aydınlatma; VERBİS/envanter; EVDS/AFAD canlı entegrasyon test harness; DPIA taslağı. |
| **Çıktı** | Kalite güvence planı + penetration test özeti. |
| **Risk** | Hukuki review gecikmesi (`docs/COMPLIANCE_READINESS_AUDIT.md` — avukat zorunlu). |
| **Başarı metriği** | CI gate’lerde 0 kritik güvenlik bulgusu; KVKK checklist ≥%90. |

### WP5: Pilot uygulama ve ticarileşme hazırlığı

| Alan | İçerik |
|------|--------|
| **Amaç** | Auto + 1 ek dikeyde saha pilotu; partner outcome verisi ile kalibrasyon. |
| **Mevcut codebase kanıtı** | `auto/index.html`, `supabase/functions/auto-intake/`, `supabase/functions/partner-callback/`, `docs/P3_MOAT_ARCHITECTURE.md`, `npm run metrics:moat` |
| **Yapılacak Ar-Ge** | `liveProvidersEnabled` pilot açılışı; ≥2 partner LOI; outcome graph hacim hedefi; Pro/B2B API MVP. |
| **Çıktı** | Pilot sonuç raporu + ticarileşme planı. |
| **Risk** | Partner veri paylaşımı gecikmesi (`docs/investor/INVESTOR_READINESS.md` — realized revenue unknown). |
| **Başarı metriği** | ≥N kalibre edilmiş segment (k-anonymity ≥3); pilot dönüşüm oranı baseline’a karşı ölçüm. |

---

## 6. Eksik Belgeler / Kurucudan İstenecek Bilgiler

| Belge / bilgi | Durum | Not |
|---------------|-------|-----|
| **Şirket türü (LTD/AŞ)** | Kurucudan doğrulanacak | `data/compliance/data-controller.json` → bireysel girişim; TÜBİTAK için sermaye şirketi gerekli |
| **KOBİ beyannamesi** | Kurucudan doğrulanacak | 1507 ve 1711 teknoloji sağlayıcı rolü için |
| **Kuruluş tarihi** | Kurucudan doğrulanacak | PRODİS ön kayıt |
| **SGK / personel durumu** | Kurucudan doğrulanacak | Bütçede personel gideri |
| **Mali tablolar (son 2–3 yıl)** | Kurucudan doğrulanacak | Mali yeterlilik |
| **E-imza (kuruluş yetkilisi)** | Kurucudan doğrulanacak | PRODİS zorunlu |
| **PRODİS ön kayıt** | Kurucudan doğrulanacak | [eteydeb.tubitak.gov.tr](https://eteydeb.tubitak.gov.tr) |
| **Proje bütçesi taslağı** | Kurucudan doğrulanacak | 1507: ≤18 ay; 1501: 24–36 ay |
| **Ekip CV’leri (Ar-Ge personeli)** | Kurucudan doğrulanacak | 1711: proje konusunda lisans+ personel zorunlu |
| **Üniversite / akademik danışman** | Kurucudan doğrulanacak | 1711 için zorunlu; 1507/1501 için artı puan |
| **Pilot müşteri / kullanıcı verisi** | Kısmen codebase’de | `auto_leads`, `analytics_events` — hacim ve LOI kurucudan |
| **VERBİS kaydı** | Kurucudan doğrulanacak | `docs/COMPLIANCE_READINESS_AUDIT.md` |
| **TÜBİTAK YZE protokolü** | Kurucudan doğrulanacak | Yalnızca 1711 |
| **Konsorsiyum iş birliği sözleşmesi** | Kurucudan doğrulanacak | Yalnızca 1711 |
| **Geçmiş TÜBİTAK projesi** | Kurucudan doğrulanacak | Varsa 1501 ek puan (+5–10) |

---

## 7. GO / NO-GO Kararı İçin Son Kontrol Listesi

### Bugün başvurulabilir mi?

| Program | Başvuru penceresi (2026) | Teknik hazırlık | Kurumsal hazırlık | Sonuç |
|---------|--------------------------|-----------------|-------------------|-------|
| **1507** | 2026/1 kapalı (30 Mar); 2026/2 beklenir (Tem–Ağu) | Orta–yüksek | **Eksik** (sermaye şirketi/KOBİ doğrulanmalı) | **Şimdilik NO-GO** — hazırlıkla 2026/2 |
| **1501** | 2026/1 kapalı | Orta–yüksek | **Eksik** | **Şimdilik NO-GO** — 1507 sonrası veya paralel hazırlık |
| **1711** | **Açık** (15 Haz – 18 Eyl 2026) | Yüksek (AI uyumu) | **Eksik** (konsorsiyum + YZE) | **NO-GO** konsorsiyumsuz; **CONDITIONAL** partner bulunursa |

### Hangi program için öncelik?

1. **Kısa vade:** Kurumsal yapı (LTD/AŞ) + KOBİ → **1507** (2026/2 çağrısı)
2. **Orta vade:** 1507 çıktıları + çok dikey plan → **1501**
3. **Paralel (partner varsa):** **1711** Finans Teknolojileri — banka/sigorta müşteri + üniversite

### Hangi bilgiler eksik?

- Sermaye şirketi tescili ve KOBİ statüsü
- PRODİS ön kayıt + e-imza
- Proje bütçesi ve personel planı
- 1711 için: müşteri kuruluş + üniversite + YZE protokolü
- Pilot partner LOI ve gerçek kullanıcı metrikleri

### İlk hazırlanması gereken 10 belge

1. Ticaret sicil gazetesi / şirket kuruluş belgesi (**kurucudan**)
2. KOBİ beyannamesi (**kurucudan**)
3. PRODİS kuruluş ön kayıt evrakları
4. Son yıl mali tablo özeti (**kurucudan**)
5. Ar-Ge personeli CV’leri (yazılım + veri bilimi)
6. AGY100/101 taslak proje öneri formu (Bölüm 4–5’ten türetilmiş)
7. İş paketi Gantt + bütçe tablosu
8. Teknik ek: mimari diyagram (`docs/ARCHITECTURE.md`, `docs/AI_DECISION_ENGINE.md` tabanlı)
9. KVKK tam aydınlatma metni taslağı (avukat review)
10. Pilot iş ortağı niyet mektubu (LOI) — `docs/investor/loi-template.md` şablonu

---

## Ek: Codebase Özet Metrikleri

| Metrik | Değer | Kaynak |
|--------|-------|--------|
| Unit test dosyası | 270 | `tests/**/*.test.mjs` |
| SQL migration | 64 | `supabase/migrations/` |
| Supabase edge function | 35 | `supabase/functions/*/index.ts` |
| CI audit script | 50+ | `package.json` → `npm run test` |
| Canlı dikey (karar asistanı) | 3 (arac, ev, tatil) | `docs/PLATFORM_EXPANSION_ROADMAP.md` |
| AI Listings engine | Kapalı (default) | `src/ai-listings/core/config.js` |
| Canlı veri sağlayıcı | Kapalı | `js/data/market-data.js` |

---

*Bu belge yatırım veya hukuki tavsiye değildir. TÜBİTAK çağrı metinleri ve PRODİS kuralları için resmi kaynaklar esas alınmalıdır.*
