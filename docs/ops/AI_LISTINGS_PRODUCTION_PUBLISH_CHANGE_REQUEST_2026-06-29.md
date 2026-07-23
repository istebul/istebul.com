# AI Listings Production Publish Change Request

**Tarih:** 2026-06-29  
**Durum:** Onay bekliyor  
**İlgili yüzey:** `/secenekler/` (public karar seçenekleri kataloğu)  
**İlgili tablolar:** `ai_listings`, `ai_listing_analyses`, `site_settings`  
**İlgili admin:** `admin/ai-listings.html`, `admin-panel.html` (site settings toggle)

---

## 1. Yönetici Özeti

- `/secenekler/` yüzeyi PR #474 ile **karar seçenekleri** diline hizalandı (kicker, başlık, boş durum, journey strip).
- Public katalog **teknik zinciri hazır**: `site_settings.ai_listings_public_enabled`, RLS published-only SELECT, edge `/listings/public`, client `loadPublicAiListings()` → `loadDecisionOptions()` → `listings-ui.js`.
- Production ortamında **`status = 'published'` kayıt sayısı 0** olduğu için katalog şu an boş görünüyor.
- **Ayrı staging Supabase ortamı yok.** Cloudflare Pages preview (`*.istebul-com.pages.dev`) ile production (`www.istebul.com`) aynı Supabase projesine bağlı.
- Bu nedenle önerilen publish işlemi **production veri mutasyonu** sayılır.
- **Bu doküman publish işlemi yapmaz**; yalnızca onaylanabilir change request tanımlar.

---

## 2. Mevcut Durum

| Alan | Durum | Not |
|------|-------|-----|
| main son commit | `8e2a53a7` | `copy(secenekler): align decision options terminology (#474)` |
| PR #473 | **MERGED** | `docs/reports/PLATFORM_FULL_AUDIT_2026-06-29.md` — POST_MERGE_PASS |
| PR #474 | **MERGED** | `/secenekler/` terminoloji hizalaması — POST_MERGE_PASS |
| `ai_listings_public_enabled` | **`true`** | Read-only preflight (2026-06-29) |
| `published` kayıt sayısı | **0** | Anon REST + edge public route |
| Edge `/listings/public` | **HTTP 200, count 0** | Zincir çalışıyor, veri yok |
| `/secenekler/` public UI | **HTTP 200, boş state beklenir** | PR #474 copy hizalı; kart yok |
| Staging Supabase ayrımı | **Yok** | Preview ve prod aynı Supabase host |
| Risk seviyesi | **Orta** | Veri mutasyonu; kod değişikliği yok |

**Teknik referanslar (kod):**

| Katman | Dosya |
|--------|-------|
| Toggle okuma | `js/runtime/ai-listings-integrations.js` |
| Public fetch | `js/core/ai-listings-public-api.js` |
| Normalizasyon | `js/core/decision-options-api.js` |
| UI render | `js/ui/listings-ui.js` |
| Admin QA | `js/admin/ai-listings-admin.js`, `js/admin/ai-listings-admin-core.js` |
| RLS | `supabase/migrations/20260702_ai_listings_publish_learning_v1.sql` |
| Site toggle seed | `supabase/migrations/20260703_ai_listings_site_settings.sql` |
| QA workflow | `docs/ai-listings/ADMIN_QA_WORKFLOW.md` |

---

## 3. Change Request Kapsamı

Production’da yapılması önerilen **minimum işlem**:

1. Admin QA workflow üzerinden **en az 3 kayıt publish** edilecek:
   - **1 × `vehicle`** (SPA filtre: Araç / `arac`)
   - **1 × `housing`** (SPA filtre: Konut / `ev`)
   - **1 × `vacation`** (SPA filtre: Tatil / `tatil`)
2. Kayıtlar `admin/ai-listings.html` panelinden seçilecek; toplu/bulk publish yapılmayacak.
3. Her kayıt için sıra: gerekirse `pending_review` → `approved` → **`published`** (`POST /listings/:id/publish`).
4. **`ai_listings_public_enabled` zaten `true` ise değiştirilmeyecek.**
5. Toggle kapalı çıkarsa **ayrı onay olmadan ON yapılmayacak.**
6. Publish sonrası canlı `/secenekler/` **dolu katalog smoke** yapılacak.

**Beklenen kullanıcı sonucu:** `/secenekler/` en az 3 kart, karar skoru, trust şeridi ve karşılaştır CTA ile dolu katalog gösterecek.

---

## 4. Kapsam Dışı

Aşağıdakiler bu change request kapsamında **değildir**:

- Kod değişikliği (JS/CSS/HTML)
- Router veya route alias değişikliği
- Supabase migration çalıştırma veya şema değişikliği
- Edge Function deploy
- Cloudflare Pages deploy
- `package.json`, `package-lock.json`, workflow, `_redirects`, `wrangler.toml` değişikliği
- Netlify ile ilgili herhangi bir işlem
- Finansman / sigorta / kasko katalog genişlemesi
- AI provider değişikliği
- Skor / TCO / risk / ranking mantığı değişikliği
- Otomatik bulk publish veya migration seed tetikleme
- SEO `<title>` / meta güncellemesi (ayrı iş)

---

## 5. Onay Gereksinimi

Production publish işlemi için aşağıdaki açık onay şarttır:

```text
PRODUCTION_AI_LISTINGS_PUBLISH_ONAY=EVET
```

**Bu ifade olmadan:**

- publish yapılmaz
- toggle değiştirilmez
- veri mutasyonu (INSERT/UPDATE/DELETE) yapılmaz

**Onay veren:** Product owner veya atanmış ops yetkilisi (insan).  
**Onay kanıtı:** Ticket/PR yorumu veya ops runbook kaydında yukarıdaki ifade.

---

## 6. Publish Öncesi Read-Only Kontrol Listesi

Yalnızca **SELECT** (REST/SQL) ve **GET** (HTTP) kullanılacak. Secret değerleri loglanmayacak.

| Kontrol | Yöntem | Beklenen / not |
|---------|--------|----------------|
| `site_settings.ai_listings_public_enabled` | REST `GET .../site_settings?key=eq.ai_listings_public_enabled` | `true` (mevcut preflight) |
| `ai_listings` toplam kayıt | Admin panel veya service-role SELECT | Aday varlığı doğrulanmalı |
| Status bazlı dağılım | `SELECT status, count(*) ... GROUP BY status` | `approved` / `pending_review` adayları |
| Category bazlı dağılım | `SELECT category, status, count(*) ...` | vehicle/housing/vacation adayı |
| `approved` aday sayısı | Admin filtre veya SQL | ≥ 3 (tercihen her kategoriden 1) |
| `pending_review` aday sayısı | Admin filtre veya SQL | Varsa önce approve gerekir |
| `published` count | Anon REST `status=eq.published` | Publish öncesi 0; sonrası ≥ 3 |
| vehicle/housing/vacation adayı | Admin listesi | Her kategoriden en az 1 uygun kayıt |
| Anon REST published count | `GET .../ai_listings?status=eq.published` | Publish sonrası ≥ 3 |
| Edge `/listings/public` count | `GET .../functions/v1/ai-listings/listings/public` | Publish sonrası ≥ 3 |
| `/secenekler/` HTTP | `curl -I` veya smoke script | HTTP 200 |

**Örnek read-only SQL (service role veya admin SQL editor):**

```sql
SELECT status, category, count(*)
FROM public.ai_listings
GROUP BY status, category
ORDER BY category, status;

SELECT key, value
FROM public.site_settings
WHERE key = 'ai_listings_public_enabled';
```

---

## 7. Publish Aday Seçim Kriterleri

Her publish adayı aşağıdaki kriterleri karşılamalıdır:

| Kriter | Açıklama |
|--------|----------|
| QA durumu | `approved` veya publish edilebilir geçiş (`approved` → `published`) |
| Kategori | `vehicle`, `housing` veya `vacation` |
| Karar skoru | `ai_listing_analyses` veya attributes içinde geçerli `ai_score` |
| Başlık / açıklama | Boş değil; kalite checklist `has_title`, `has_description` geçer |
| Fiyat / sinyal | `has_price` veya karar sinyali anlamlı |
| Trust render | `listing-trust-ui.js` ile güven şeridi üretilebilir |
| Görsel | Varsa güven policy’ye uygun (katalog SVG / doğrulanmamış dış görsel riski) |
| Kaynak / metadata | `source_url` veya güvenli metadata; sahte fallback yok |
| Taahhüt | “Garanti sonuç”, yanıltıcı finansal vaat yok |
| CTA uyumu | Partner/lead akışıyla çelişmeyen public yüzey |

**Red bayrakları (publish etme):**

- `pending_review` veya `draft` (önce QA tamamlanmalı)
- Eksik analiz / null skor
- Kalite checklist kritik maddeleri fail
- Operatör emin değilse

---

## 8. Production Publish İşlem Planı

> Bu adımlar **plan**dır; bu doküman oluşturulurken uygulanmamıştır.

1. `PRODUCTION_AI_LISTINGS_PUBLISH_ONAY=EVET` onayını doğrula.
2. Admin panelde **AI İlan Yönetimi** (`/admin/ai-listings/`) aç.
3. Read-only ön kontrol listesini (Bölüm 6) tamamla; aday kayıt olduğunu doğrula.
4. **1 vehicle, 1 housing, 1 vacation** kayıt seç (ID’leri ops kaydına yaz).
5. Her kayıt için QA checklist ve karar skorunu gözden geçir.
6. `approved` değilse: `submit-review` → `approve` akışını tamamla.
7. Her kayıt için **`Publish`** (`approved` → `published`) uygula — tek tek, bulk değil.
8. `site_settings.ai_listings_public_enabled` değerini kontrol et; **`true` ise dokunma**.
9. Publish sonrası read-only count al (anon REST + edge).
10. Canlı `/secenekler/` smoke yap (Bölüm 9).
11. Sorun varsa Bölüm 10 rollback planına geç.

---

## 9. Smoke Başarı Kriterleri

Publish sonrası **tümü** sağlanmalıdır:

| Kriter | Hedef |
|--------|-------|
| `published` count | ≥ 3 |
| vehicle published | ≥ 1 |
| housing published | ≥ 1 |
| vacation published | ≥ 1 |
| Anon REST published count | Pozitif, DB ile uyumlu |
| Edge `/listings/public` count | Pozitif, REST ile uyumlu |
| `/secenekler/` canlı kart | ≥ 3 `.listing-card` (JS render sonrası) |
| Karar skoru | “Karar skoru X/100” görünür |
| Trust badge | Güven şeridi / rozet görünür |
| Karşılaştır CTA | “Karşılaştır” butonu görünür |
| Kategori filtreleri | Araç / Konut / Tatil daraltma çalışır |
| `smoke-live` | `node scripts/smoke-live.cjs https://www.istebul.com` → `failed=0` |
| Playwright | `secenekler-trust-catalog` + `user-flow -g secenekler` geçer |

**Manuel canlı kontrol (önerilen):**

1. `https://www.istebul.com/secenekler/` — hard refresh
2. En az 3 kart, skor, trust, karşılaştır
3. Filtre: Araç → yalnızca araç; Konut → konut; Tatil → tatil

---

## 10. Rollback Planı

Kod değişikliği olmadığı için rollback **yalnızca veri/ops** düzeyindedir.

| Adım | İşlem |
|------|-------|
| 1 | Publish edilen 3 kayıt için admin **`Unpublish`** (`published` → `approved`) |
| 2 | Gerekirse `archive` veya `draft` (iş kuralına göre) |
| 3 | Toggle bu CR sırasında değiştirildiyse **eski değere** döndür (beklenen: değişiklik yok) |
| 4 | Anon REST + edge count → 0 veya beklenen değer |
| 5 | `/secenekler/` boş state + PR #474 CTA’ları görünür mü doğrula |
| 6 | Ops kaydına rollback zamanı ve etkilenen kayıt ID’leri yaz |

**Kod rollback gerekmez** — bu CR kod deploy içermez.

---

## 11. Risk Matrisi

| Risk | Olasılık | Etki | Azaltma |
|------|----------|------|---------|
| Yanlış kayıt publish | Orta | Yüksek | Tek tek QA + checklist; bulk yok |
| Eksik karar skoru | Orta | Orta | Publish öncesi analiz doğrulama |
| Trust badge eksikliği | Düşük | Orta | `secenekler-trust-catalog` E2E + manuel kontrol |
| Kategori filtresinde görünmeme | Düşük | Orta | category=vehicle/housing/vacation doğrula |
| RLS / edge count uyuşmazlığı | Düşük | Yüksek | Publish sonrası REST + edge karşılaştır |
| Boş / yanıltıcı katalog | Orta (şu an aktif) | Yüksek | Bu CR’nin amacı — min. 3 publish |
| Admin terminoloji drift | Orta | Düşük | “Publish” = public; “approved” ≠ public hatırlatması |
| Onaysız production mutasyon | Düşük | Kritik | `PRODUCTION_AI_LISTINGS_PUBLISH_ONAY=EVET` şartı |

---

## 12. Çalıştırılacak Komut / Test Listesi

**Publish öncesi ve sonrası** (kod değiştirmeden):

```bash
node scripts/smoke-live.cjs https://www.istebul.com

npx playwright test tests/e2e/secenekler-trust-catalog.spec.mjs \
  -c playwright.config.mjs --project=chromium --workers=1

npx playwright test tests/e2e/user-flow.spec.mjs \
  -c playwright.config.mjs --project=chromium --workers=1 -g "secenekler"
```

**Read-only REST kontrolleri (anon key ile; secret loglama yok):**

- `GET /rest/v1/site_settings?select=key,value&key=eq.ai_listings_public_enabled`
- `GET /rest/v1/ai_listings?select=id,category,status&status=eq.published`
- `GET /functions/v1/ai-listings/listings/public`

**Admin / service role gerektiren kontroller** (publish öncesi aday tespiti):

- Status/category GROUP BY sorguları (Bölüm 6 SQL)
- Admin panel status filtreleri: Draft, Pending Review, Approved, Published

---

## 13. Karar

**Bu change request onaylanmadan production publish yapılmamalıdır.**

| Senaryo | Sonraki adım |
|---------|----------------|
| **Onaylanırsa** | “Production AI listings 3 kayıt publish + live smoke” ops adımı (insan yürütür; `PRODUCTION_AI_LISTINGS_PUBLISH_ONAY=EVET` ile) |
| **Onaylanmazsa** | Ayrı staging Supabase projesi kurulumu ve Cloudflare Preview env ayrımı planlanmalıdır |

**İlgili dokümanlar:**

- `docs/reports/PLATFORM_FULL_AUDIT_2026-06-29.md`
- `docs/ai-listings/README.md`
- `docs/ai-listings/ADMIN_QA_WORKFLOW.md`

---

Bu doküman yalnızca change request kaydıdır; bu adımda kod, veri, toggle veya deployment ayarı değiştirilmemiştir.
