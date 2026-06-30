# AI Listings Production Seed/Admin Runbook

**Tarih:** 2026-06-30  
**Durum:** Hazırlık runbook (veri mutasyonu yapmaz)  
**İlgili yüzey:** `/secenekler/` — public karar seçenekleri kataloğu  
**İlgili tablolar:** `ai_listings`, `ai_listing_analyses`, `site_settings`  
**İlgili admin:** `admin/ai-listings.html`, `admin-panel.html`  
**İlişkili CR:** `docs/ops/AI_LISTINGS_PRODUCTION_PUBLISH_CHANGE_REQUEST_2026-06-29.md`

---

## 1. Yönetici Özeti

- `/secenekler/` UI ve public gate **hazır** (PR #474 terminoloji, toggle, RLS, edge public route).
- **`ai_listings_public_enabled` açık** (read-only preflight).
- Production’da **`published` kayıt sayısı 0** — katalog boş.
- Publish adayları bu oturumda **okunamadı**; anon REST yalnızca `published` satırları gösterir, admin/service-role erişimi gerekir.
- **Ayrı staging Supabase yok**; kayıt hazırlığı production veri mutasyonu sayılır.
- Dolu katalog için önce **minimum 3 karar seçeneği** hazırlanmalı: **vehicle**, **housing**, **vacation**.
- Bu doküman **veri değiştirmez**; production’da admin kontrollü kayıt hazırlığı için operasyon runbook’udur.
- **Publish bu runbook ile yapılmaz** — ayrı onay gerekir (`PRODUCTION_AI_LISTINGS_PUBLISH_ONAY=EVET`).

---

## 2. Mevcut Durum

| Alan | Durum | Not |
|------|-------|-----|
| main son commit | `0239e473` | `docs(ops): add ai listings production publish change request (#475)` |
| PR #473 | **MERGED** | Platform full audit — POST_MERGE_PASS |
| PR #474 | **MERGED** | `/secenekler/` karar seçenekleri terminolojisi — POST_MERGE_PASS |
| PR #475 | **MERGED** | Production publish change request — POST_MERGE_PASS |
| `ai_listings_public_enabled` | **`true`** | site_settings (anon REST, 2026-06-29) |
| published count | **0** | Anon REST + edge public |
| edge `/listings/public` count | **0** | HTTP 200 |
| anon REST (görünür) | **0** | RLS published-only |
| staging Supabase | **Yok** | Cloudflare preview = aynı Supabase projesi |
| admin/service-role erişimi (agent) | **Yok** | draft/approved aday envanteri okunamadı |
| production publish onayı | **Yok** | `PRODUCTION_AI_LISTINGS_PUBLISH_ONAY=EVET` bekleniyor |
| migration seed (`manual_seed`) | **Görünmüyor** | `20260705` prod’da anon ile yok; vacation seed migration’da yok |

**Teknik referanslar:**

| Konu | Dosya |
|------|-------|
| Seed script | `scripts/seed-ai-listings.cjs`, `docs/ai-listings/SEED_AND_SCORING.md` |
| QA workflow | `docs/ai-listings/ADMIN_QA_WORKFLOW.md` |
| Admin panel | `admin/ai-listings.html`, `js/admin/ai-listings-admin.js` |
| Public API | `js/core/ai-listings-public-api.js`, `js/core/decision-options-api.js` |
| UI | `js/ui/listings-ui.js`, `js/ui/listing-trust-ui.js` |

---

## 3. Hedef Minimum Katalog

Public `/secenekler/` kataloğu için **minimum 3 karar seçeneği**:

| # | Kategori (engine) | SPA filtre | Açıklama |
|---|-------------------|------------|----------|
| 1 | `vehicle` | Araç (`arac`) | Araç karar seçeneği |
| 2 | `housing` | Konut (`ev`) | Konut karar seçeneği |
| 3 | `vacation` | Tatil (`tatil`) | Tatil karar seçeneği |

### Her kayıt için zorunlu alanlar

| Alan | Gereksinim |
|------|------------|
| `category` | `vehicle` \| `housing` \| `vacation` |
| Public başlık (`title`) | Boş değil, yanıltıcı değil |
| Açıklama (`description`) | Karar bağlamı; bağlayıcı teklif dili yok |
| Karar skoru | `ai_listing_analyses.ai_score` veya normalize edilebilir skor |
| Fiyat / karar sinyali | `price` > 0 veya anlamlı attributes |
| Trust / güven | `listing-trust-ui.js` ile render edilebilir metadata |
| Kaynak / metadata | `source_type`, güvenli `attributes`; sahte fallback yok |
| Karşılaştırma | `decision-options-api.js` normalize alanları (category, score, id) |
| Disclaimer | Bilgilendirme amaçlı; garanti / kesin fiyat taahhüdü yok |

---

## 4. Kayıt Hazırlama Kriterleri

| Alan | Zorunlu? | Kontrol yöntemi | Publish öncesi kabul | Risk |
|------|----------|-----------------|----------------------|------|
| `category` | Evet | Admin liste + engine id | vehicle/housing/vacation doğru | Filtrede görünmez |
| `title` | Evet | Kalite checklist `has_title` | Net, karar odaklı | Yanıltıcı başlık |
| `summary` / `description` | Evet | `has_description` | QA onayı | Bağlayıcı teklif dili |
| `ai_score` / decision score | Evet | Analiz paneli / `has_analysis` | 0–100 geçerli skor | Boş skor kartı |
| `price` / cost signal | Evet | `has_price` veya attributes | Karar sinyali anlamlı | Eksik fiyat bandı |
| `metadata` / `source` | Evet | `source_type`, attributes | `manual_seed` veya doğrulanmış intake | Güven rozeti eksik |
| Trust badge inputs | Evet | `listing-trust-ui` preview | Yayınlanmış seçenek + skor disclaimer | Overclaim |
| `images` / görsel güven | Önerilen | `has_images`; trust image policy | Placeholder veya doğrulanmış kaynak | Catalog SVG riski |
| Comparison payload | Evet | Normalize test (manuel) | Karşılaştır CTA çalışır | Compare boş |
| Partner/lead CTA uyumu | Evet | İçerik review | Karar platformu dili | Lead çelişkisi |
| Disclaimers | Evet | Metin review | “Bilgilendirme amaçlı” uyumu | Regülasyon algısı |

---

## 5. Admin Üzerinden Hazırlık Akışı

> Bu adımlar **plan**dır. Bu runbook oluşturulurken uygulanmamıştır.

1. **Admin AI Listings panelini aç** — `/admin/ai-listings/` (CRM oturumu veya yetkili QA erişimi).
2. **Mevcut kayıtları kategoriye göre tara** — status filtreleri: Draft, Pending Review, Approved, Published.
3. **Vehicle / housing / vacation adayı var mı kontrol et** — her kategori için en az 1 uygun kayıt.
4. **Eksik kategori varsa kayıt hazırla:**
   - Admin form / import (`docs/ai-listings/IMPORT_PIPELINE.md`), veya
   - İnsan onaylı seed (`docs/ai-listings/SEED_AND_SCORING.md`, `npm run seed:ai-listings` — credential’lar secret store’dan, dokümana yazılmaz).
5. **Her kayıt için QA checklist** — `ADMIN_QA_WORKFLOW.md` kalite maddeleri.
6. **Karar skoru ve trust alanlarını doğrula** — Analyze / reanalyze gerekirse.
7. **Status yükselt:** `draft` → `pending_review` → **`approved`** (henüz publish değil).
8. **Publish öncesi dur** — `docs/ops/AI_LISTINGS_PRODUCTION_PUBLISH_CHANGE_REQUEST_2026-06-29.md` onayı bekle.

### Önemli kurallar

- Bu runbook **publish yaptırmaz**.
- Publish için ayrı onay şarttır:

```text
PRODUCTION_AI_LISTINGS_PUBLISH_ONAY=EVET
```

- Toggle zaten `true` ise **değiştirme**.
- Toplu/bulk publish yapma; kayıt başına QA.

---

## 6. Örnek Kayıt Şablonları

> **Placeholder şablonlar** — operatörün dolduracağı taslaklar. Gerçek fiyat, gerçek ilan, kişisel veri veya yanıltıcı bilgi içermez.

### Vehicle şablonu

| Alan | Placeholder değer |
|------|-------------------|
| `category` | `vehicle` |
| `public_title` | `[MARKA MODEL YIL] — ör. karar bağlamı özeti` |
| `summary` | `[Kullanım profiline göre TCO/risk özeti. Bilgilendirme amaçlıdır.]` |
| `decision_score` | `[70-90 arası QA onaylı skor]` |
| `price_signal` | `[TRY tutar — örnek aralık, bağlayıcı teklif değil]` |
| `trust_notes` | `source_type`, `published` QA, karar skoru disclaimer |
| `comparison_notes` | `vehicleBrand`, `score`, `id` karşılaştırmaya uygun |
| `required_review_notes` | Ekspertiz/km iddiası abartılı mı? Bağlayıcı satış vaadi yok mu? |

### Housing şablonu

| Alan | Placeholder değer |
|------|-------------------|
| `category` | `housing` |
| `public_title` | `[İL/İLÇE TİP] — konut karar özeti` |
| `summary` | `[Lokasyon, ödeme yükü, risk sinyali. Bilgilendirme amaçlıdır.]` |
| `decision_score` | `[70-90 arası QA onaylı skor]` |
| `price_signal` | `[TRY tutar — örnek, bağlayıcı teklif değil]` |
| `trust_notes` | Konut attributes (sqm, rooms); güven şeridi |
| `comparison_notes` | `propertyType`, `province`, `district` filtre uyumu |
| `required_review_notes` | Tapu/kira getirisi iddiası abartılı mı? |

### Vacation şablonu

| Alan | Placeholder değer |
|------|-------------------|
| `category` | `vacation` |
| `public_title` | `[DESTİNASYON/TİP] — tatil karar özeti` |
| `summary` | `[Bütçe, sezon, risk. Bilgilendirme amaçlıdır.]` |
| `decision_score` | `[70-90 arası QA onaylı skor]` |
| `price_signal` | `[TRY tutar — örnek paket/kişi başı, bağlayıcı değil]` |
| `trust_notes` | `vacationType` attribute; güven rozeti |
| `comparison_notes` | Tatil filtre profili (`familyResort`, `luxury`, vb.) |
| `required_review_notes` | Migration seed’de vacation örneği yok — operatör sıfırdan oluşturur |

---

## 7. Publish Öncesi Gate

Publish’e geçmeden **tümü** tamamlanmalı:

| # | Kontrol |
|---|---------|
| 1 | En az **3 approved** aday |
| 2 | **vehicle + housing + vacation** — her birinde ≥ 1 aday |
| 3 | `ai_listings_public_enabled` read-only okundu |
| 4 | `published` count hâlâ 0 (publish öncesi) veya beklenen seviye |
| 5 | Admin QA tamamlandı (checklist 7/7 veya documented exception) |
| 6 | `docs/ops/AI_LISTINGS_PRODUCTION_PUBLISH_CHANGE_REQUEST_2026-06-29.md` incelendi |
| 7 | Açık onay alındı: **`PRODUCTION_AI_LISTINGS_PUBLISH_ONAY=EVET`** |

**Publish aksiyonu:** Admin `POST /listings/:id/publish` (`approved` → `published`) — kayıt başına, bulk değil.

---

## 8. Publish Sonrası Smoke

### Sayısal kriterler

| Kriter | Hedef |
|--------|-------|
| `published` count | ≥ 3 |
| vehicle published | ≥ 1 |
| housing published | ≥ 1 |
| vacation published | ≥ 1 |
| anon REST published count | Pozitif, DB ile uyumlu |
| edge `/listings/public` count | Pozitif, REST ile uyumlu |

### Canlı UI kriterleri

- `/secenekler/` — en az 3 `.listing-card`
- “Karar skoru X/100” görünür
- Trust badge / güven şeridi görünür
- “Karşılaştır” CTA görünür
- Araç / Konut / Tatil filtreleri daraltma çalışır

### Komut / test listesi

```bash
node scripts/smoke-live.cjs https://www.istebul.com

npx playwright test tests/e2e/secenekler-trust-catalog.spec.mjs \
  -c playwright.config.mjs --project=chromium --workers=1

npx playwright test tests/e2e/user-flow.spec.mjs \
  -c playwright.config.mjs --project=chromium --workers=1 -g "secenekler"
```

### Read-only REST (publish sonrası)

- `GET .../site_settings?key=eq.ai_listings_public_enabled`
- `GET .../ai_listings?status=eq.published`
- `GET .../functions/v1/ai-listings/listings/public`

Secret değerleri loglama veya dokümana yazma.

---

## 9. Rollback

| Adım | İşlem |
|------|-------|
| 1 | Publish edilen kayıtlar için admin **Unpublish** (`published` → `approved`) |
| 2 | Gerekirse archive / draft (iş kuralına göre) |
| 3 | Toggle bu süreçte değiştirildiyse eski değere döndür (beklenen: değişiklik yok) |
| 4 | anon REST + edge count doğrula |
| 5 | `/secenekler/` boş state + PR #474 CTA’ları görünür mü kontrol et |

**Kod rollback gerekmez** — bu runbook kod deploy içermez.

---

## 10. Riskler

| Risk | Olasılık | Etki | Azaltma |
|------|----------|------|---------|
| Eksik/yanıltıcı kayıt publish | Orta | Yüksek | QA checklist + tek tek onay |
| Tatil kategorisinde aday yok | Yüksek | Orta | Bu runbook ile vacation şablonu zorunlu |
| Karar skoru eksik | Orta | Orta | Analyze zorunlu; `has_analysis` |
| Trust badge render olmaz | Düşük | Orta | `secenekler-trust-catalog` E2E + manuel |
| Kategori filtresinde görünmez | Düşük | Orta | category id doğrulama |
| RLS / edge count uyuşmazlığı | Düşük | Yüksek | Publish sonrası REST + edge karşılaştır |
| Onaysız production mutasyon | Düşük | Kritik | `PRODUCTION_AI_LISTINGS_PUBLISH_ONAY=EVET` |
| Admin terminoloji drift | Orta | Düşük | “Publish = public”; “approved ≠ public” |

---

## 11. Sonraki Karar

| Seçenek | Açıklama |
|---------|----------|
| **1 (önerilen)** | Admin panelde aday kayıtlar hazırlanır (`approved`), sonra publish change request onayı alınır ve 3 kayıt publish + smoke yapılır. |
| **2** | Ayrı staging Supabase kurulumu yapılır; production veri mutasyonu ertelenir. |
| **3** | Production public katalog boş state ile kalır; veri girişi bilinçli olarak ertelenir. |

**İlişkili dokümanlar:**

- `docs/ops/AI_LISTINGS_PRODUCTION_PUBLISH_CHANGE_REQUEST_2026-06-29.md`
- `docs/ai-listings/ADMIN_QA_WORKFLOW.md`
- `docs/ai-listings/SEED_AND_SCORING.md`

---

Bu doküman yalnızca seed/admin hazırlık runbook kaydıdır; bu adımda kod, veri, toggle, publish veya deployment ayarı değiştirilmemiştir.
