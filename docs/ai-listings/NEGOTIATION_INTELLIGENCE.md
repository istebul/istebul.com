# AI Listings Negotiation Intelligence

**Faz:** N-0 (docs-only)  
**Durum:** Tasarım / audit — implementation yok  
**İlgili PR:** [#206](https://github.com/istebul/istebul.com/pull/206) (merge edilmeyecek)  
**Son güncelleme:** 2026-06-30

---

## 1. Amaç

Negotiation Intelligence modülü, AI Listings karar platformunda **“ne kadar teklif edilmeli?”** sorusuna deterministik karar desteği verir.

- Listing marketplace değil; **karar platformu** mantığına hizmet eder.
- Operatör ve son kullanıcıya veri destekli pazarlık bandı, risk seviyesi ve kontrol listesi sunar.
- **Publish / approve / seed akışına yazmaz**; tamamen read-only karar destek yüzeyidir.
- `ai_listings.status` değiştirmez; QA workflow ve publish guard hattına müdahale etmez.

Bu doküman, PR #206’daki “negotiation intelligence v1” yaklaşımının main üzerinden küçük fazlarla yeniden uygulanması için ürün ve teknik sözleşmeyi tanımlar.

---

## 2. Mevcut Durum

### 2.1 Main branch gerçeği

| Alan | Durum |
|------|-------|
| Dedicated negotiation modülü | **Yok** — `supabase/functions/_shared/ai-listings/negotiation/` main’de bulunmuyor |
| Client `js/ai-negotiation-intelligence/` | **Yok** |
| Admin negotiation drawer | Var — `negotiation` drawer tipi `ai-listings-admin-drawer-state.js` içinde tanımlı |
| Mevcut pazarlık sinyali | `purchase-decision/negotiation-scenario-engine.js` |

### 2.2 Mevcut negotiation-scenario-engine ne yapar?

`supabase/functions/_shared/ai-listings/purchase-decision/negotiation-scenario-engine.js` (Sprint-24):

- Sabit indirim oranları (`3%`, `5%`, `10%`) için senaryo üretir.
- Her senaryoda **ayarlanmış fiyat**, **tahmini karar skoru** ve **karar seviyesi değişimi** hesaplar.
- Soru: *“İndirim olursa karar skoru nasıl değişir?”*

`purchase-decision-engine.js` bu motoru `negotiationScenario` alanı olarak purchase decision çıktısına ekler. Admin panelde `negotiation` drawer tipi purchase decision yüzeyiyle aynı host’u (`ai-pd-panel-host`) paylaşır.

### 2.3 Eksik olan ne?

Yeni Negotiation Intelligence modülü şu soruya cevap vermelidir:

> **“Hedef teklif bandı ne olmalı?”**

Yani:

- `targetOffer`, `minOffer`, `maxOffer` aralığı
- `negotiationRisk` (low / medium / high)
- Pazarlık öncesi kontrol listesi ve uyarılar
- Kanıt sinyalleri (`evidenceSignals[]`)

Mevcut `negotiation-scenario-engine` bu contract’ı karşılamaz; purchase decision içinde türetilmiş bir **senaryo simülasyonu**dur, bağımsız teklif bandı motoru değildir.

### 2.4 İlgili mevcut yüzeyler (korunacak)

Admin drawer modeli additive olmalı; aşağıdaki yüzeyler silinmemeli veya bozulmamalı:

| Drawer tipi | Başlık (TR) | Host |
|-------------|-------------|------|
| `quality` | Kalite ve Güven | `ai-exp-panel-host` |
| `negotiation` | Pazarlık Analizi | `ai-pd-panel-host` |
| `purchase` | Al Kararı Analizi | `ai-pd-panel-host` |
| `explain` | Karar Açıklaması | `ai-exp-panel-host` |
| `report` | Yönetici Karar Raporu | `ai-edr-panel-host` |
| `compare` | Karşılaştırma Analizi | `ai-cmp-panel-host` |
| `scenario` | Senaryo Simülasyonu | `ai-ss-panel-host` |

Kaynak: `js/admin/ai-listings-admin-drawer-state.js`

---

## 3. PR #206 Neden Merge Edilmeyecek?

PR [#206 — feat(ai-listings): add negotiation intelligence v1](https://github.com/istebul/istebul.com/pull/206) audit sonucu:

| Metrik | Değer |
|--------|-------|
| State | `OPEN` |
| mergeable | `CONFLICTING` |
| mergeStateStatus | `DIRTY` |
| additions / deletions | +1658 / −338 |

### 3.1 Teknik riskler

1. **Admin JS geniş ve regresif diff** — `js/admin/ai-listings-admin.js` içinde −320 satır silme; mevcut purchase / explain / report / compare / scenario yüzeylerini etkileme riski.
2. **Publish guard çakışması** — main’deki [#477](https://github.com/istebul/istebul.com/pull/477) (seed `--publish` env gate) ve [#478](https://github.com/istebul/istebul.com/pull/478) (admin publish confirm + 7/7 checklist gate) ile branch uyumsuz.
3. **Tek PR’da çok fazla concern** — shared negotiation engine, client re-export, admin CSS, admin JS refactor ve unit testler aynı diff’te.
4. **Eski branch’ten kod kopyalama riski** — conflict’li branch merge/rebase edilmeden kod taşınmamalı.

### 3.2 Karar

- PR #206 **merge edilmeyecek**, **rebase edilmeyecek**, **kapatılmayacak** (referans olarak açık kalır).
- Özellik main’den **küçük, tek-concern fazlarla** yeniden uygulanacak.
- Bu doküman (Faz N-0) implementation öncesi onay kapısıdır.

---

## 4. Ürün Değeri

### 4.1 Operatör (admin QA)

- İlan bazında **teklif aralığı** (`minOffer`–`maxOffer`, `targetOffer`)
- **Risk seviyesi** (`negotiationRisk`)
- Yayın öncesi **pazarlık kontrol listesi** (`checklist[]`)
- Eksik veri veya belirsizlik için **uyarılar** (`warnings[]`)

### 4.2 Son kullanıcı (karar yüzeyi)

- Veri destekli pazarlık önerisi; “şu banda teklif ver” rehberi
- Karar güveni için şeffaf kanıt sinyalleri (`evidenceSignals[]`)

### 4.3 Karar motoru ilkesi

- Fiyat, piyasa referansı, sahiplik/satıcı sinyali, kalite/kondisyon, konum ve güven skorlarını birleştiren **deterministik yapı**.
- AI açıklama katmanı ileride eklenebilir; **karar motoru deterministik kalmalı**.
- LLM çıktısı canonical skorları override etmemeli (mevcut scoring kuralıyla uyumlu).

---

## 5. Contract Taslağı

### 5.1 Input

```json
{
  "category": "vehicle | housing | vacation",
  "listingPrice": 950000,
  "marketReference": {
    "medianPrice": 980000,
    "priceDeltaPct": -3.1,
    "liquiditySignal": "medium"
  },
  "ownershipSignal": {
    "sellerType": "owner | dealer | unknown",
    "ownershipConfidence": 0.72
  },
  "qualitySignal": {
    "listingQualityScore": 78,
    "verificationLevel": "partial | full | none"
  },
  "location": "İstanbul",
  "confidence": 0.82,
  "availableAttributes": {
    "year": 2022,
    "mileage": 45000
  }
}
```

| Alan | Zorunlu | Açıklama |
|------|---------|----------|
| `category` | Evet | `vehicle`, `housing`, `vacation` |
| `listingPrice` | Evet | İlan fiyatı (TRY) |
| `marketReference` | Hayır | Piyasa medyanı / delta; eksikse conservative fallback |
| `ownershipSignal` | Hayır | Satıcı tipi ve güven |
| `qualitySignal` | Hayır | Kalite ve doğrulama sinyali |
| `location` | Hayır | Konum metni veya tier |
| `confidence` | Hayır | Girdi güven skoru (0–1) |
| `availableAttributes` | Hayır | Kategori öznitelikleri |

### 5.2 Output

```json
{
  "targetOffer": 910000,
  "minOffer": 885000,
  "maxOffer": 935000,
  "discountPercent": 4.2,
  "negotiationRisk": "medium",
  "confidence": 0.76,
  "summary": "Piyasa referansına göre makul teklif bandı %3–6 indirim aralığında.",
  "checklist": [
    { "id": "verify_seller", "label": "Satıcı kimliğini doğrula", "status": "pending" }
  ],
  "warnings": [
    "Piyasa referans verisi eksik; teklif bandı geniş tutuldu."
  ],
  "evidenceSignals": [
    { "signal": "price_vs_market", "impact": "negative", "weight": 0.35 }
  ]
}
```

| Alan | Tip | Açıklama |
|------|-----|----------|
| `targetOffer` | number | Önerilen hedef teklif |
| `minOffer` | number | Alt sınır |
| `maxOffer` | number | Üst sınır |
| `discountPercent` | number | İlan fiyatına göre hedef indirim yüzdesi |
| `negotiationRisk` | `low \| medium \| high` | Pazarlık riski |
| `confidence` | number | Çıktı güven skoru (0–1) |
| `summary` | string | Türkçe özet (deterministik şablon + sinyal) |
| `checklist` | array | Operatör / kullanıcı kontrol maddeleri |
| `warnings` | array | Eksik veri veya yüksek belirsizlik uyarıları |
| `evidenceSignals` | array | Skora katkı veren kanıt sinyalleri |

### 5.3 Mevcut purchase-decision ile ilişki

- `negotiationScenario` (indirim senaryoları) purchase decision çıktısında kalır.
- Yeni modül bağımsız `runNegotiationIntelligenceEngine(input)` contract’ı sunar.
- İleride purchase decision, negotiation intelligence çıktısını **read-only referans** olarak tüketebilir; tersine yazma yok.

---

## 6. Publish Guard Sınırı

Negotiation Intelligence modülü aşağıdaki sınırların **dışına çıkmaz**:

| Kural | Açıklama |
|-------|----------|
| Publish çalıştırmaz | `POST /listings/:id/publish` çağrısı yok |
| Approve çalıştırmaz | `POST /listings/:id/approve` çağrısı yok |
| Seed mutation yok | `scripts/seed-ai-listings.cjs` veya `--publish` / `--direct` tetiklenmez |
| Status değiştirmez | `ai_listings.status` güncellenmez |
| Checklist otomatik tamamlamaz | 7/7 quality checklist’e “tamamlandı” yazmaz |

### 6.1 Korunacak publish guard hattı (main)

**Admin publish confirm + checklist gate** ([#478](https://github.com/istebul/istebul.com/pull/478)):

- `resolvePublishAttempt()` — `js/admin/ai-listings-admin-core.js`
- 7 kalite maddesi tamamlanmadan publish engellenir (`isPublishChecklistComplete`)
- Tam checklist sonrası operatör onayı (`PUBLISH_CONFIRM_PROMPT`) zorunlu
- Test: `tests/unit/ai-listings-admin-publish-guard.test.mjs`

**Seed `--publish` env gate** ([#477](https://github.com/istebul/istebul.com/pull/477)):

- Production onayı olmadan seed script publish moduna geçemez

Negotiation Intelligence fazları bu guard’lara **dokunmaz**; her faz sonrası publish guard testleri yeşil kalmalı.

---

## 7. Mimari İlke

Uygulama sırası (her adım ayrı PR):

```
1. Pure helper / scoring contract   (shared negotiation/*)
2. Unit test                        (contract, range, risk, sanitization)
3. Client read-only re-export       (js/ai-negotiation-intelligence/*)
4. Admin drawer read-only panel     (additive host / yönlendirme)
5. Opsiyonel edge integration       (feature flag arkasında snapshot)
```

### 7.1 Zorunlu kurallar

- **Additive admin model** — mevcut purchase / explain / report / compare / scenario yüzeyleri silinmez.
- **Handler/publish route değişikliği opsiyonel** — varsa feature flag arkasında.
- **Deterministik önce** — skor ve teklif bandı LLM’den bağımsız.
- **Küçük PR** — tek concern; geniş admin refactor yok.
- **Eski PR #206 branch’inden kod kopyalama yok** — main pattern’lerinden yeniden yazım.

### 7.2 Dosya yerleşimi (hedef)

| Katman | Hedef yol |
|--------|-----------|
| Shared engine | `supabase/functions/_shared/ai-listings/negotiation/*` |
| Client thin layer | `js/ai-negotiation-intelligence/*` |
| Admin drawer | `js/admin/ai-listings-admin-drawer-state.js` + additive panel host |
| Test | `tests/unit/ai-negotiation-intelligence.test.mjs` |

---

## 8. Faz Planı

### Faz N-0 — Docs-only (bu PR)

- Bu doküman: contract, risk, faz planı, PR #206 kararı
- Kod, admin UI, edge, seed, publish, migration yok

### Faz N-1 — Pure Helper / Scoring Contract

- `supabase/functions/_shared/ai-listings/negotiation/*` yeni modül
- Alt motorlar: `offer-range-engine`, `negotiation-risk-engine`, `negotiation-checklist`, `negotiation-summary`, `negotiation-engine` (orchestrator)
- **Handler, publish route, seed script yok**
- Sadece deterministik hesaplama ve `index.js` export

### Faz N-2 — Unit Test

- Engine contract doğrulama
- Offer range, risk seviyesi, checklist üretimi
- Forbidden phrase sanitization (özet metinlerde)
- **Admin publish guard testleri yeşil kalmalı** (`ai-listings-admin-publish-guard.test.mjs`)

### Faz N-3 — Client Read-only Surface

- `js/ai-negotiation-intelligence/*` thin re-export (shared engine’den)
- `negotiation-card-builder.js` — kart HTML/veri builder
- **No network mutation** — sadece local compute veya mevcut read API’den gelen snapshot

### Faz N-4 — Admin Drawer Read-only Panel

- `ai-listings-admin-drawer-state.js` içinde negotiation için **dedicated host** (purchase host’undan ayrıştırma değerlendirilir)
- `openAiListingsDrawer` additive yönlendirme
- Mevcut purchase / explain / report / compare / scenario korunur
- **Publish confirm / checklist koduna dokunulmaz**

### Faz N-5 — Opsiyonel Edge Integration

- Feature flag arkasında analysis snapshot’a negotiation intelligence ekleme
- Publish workflow’a yazmaz
- Admin’de sadece read-only gösterim

---

## 9. Riskler

| Risk | Etki | Azaltma |
|------|------|---------|
| Admin JS geniş patch | Yüksek | Faz N-4’te minimal additive diff; publish guard testleri |
| Publish guard regression | Yüksek | Her fazda `ai-listings-admin-publish-guard.test.mjs` çalıştır |
| Eski PR’dan kod kopyalama | Orta | Main pattern’lerinden yeniden yazım; #206 sadece referans |
| Piyasa referans verisi eksik | Orta | Conservative band + `warnings[]`; düşük `confidence` |
| AI açıklama / deterministik skor bulanıklığı | Orta | LLM sadece narration; skor override yasak |
| Drawer host çakışması (`negotiation` ↔ `purchase`) | Orta | Dedicated host; additive routing |

---

## 10. Kabul Kriterleri

Her implementation fazı için:

- [ ] Küçük PR — tek concern
- [ ] Publish / approve / seed mutation yok
- [ ] `npm run test:unit` ilgili suite’ler geçer
- [ ] `tests/unit/ai-listings-admin-publish-guard.test.mjs` geçer
- [ ] Türkçe UI / copy
- [ ] Mevcut decision surfaces (purchase, explain, report, compare, scenario) korunur
- [ ] Ürün sahibi onayı (Faz N-1 öncesi bu doküman)

---

## 11. Karar

| Madde | Karar |
|-------|-------|
| PR #206 merge | **Hayır** — CONFLICTING / DIRTY; regresif admin diff |
| PR #206 rebase / close | **Hayır** — referans olarak açık kalır |
| Özellik değeri | **Var** — `REPLAN_FROM_MAIN_RECOMMENDED` |
| İlk implementation | Ürün sahibi bu dokümandaki **contract** ve **faz planını** onaylamalı |
| Sonraki tek adım | **Faz N-1** — `supabase/functions/_shared/ai-listings/negotiation/*` pure helper |

---

## İlgili dokümanlar

- [ADMIN_QA_WORKFLOW.md](./ADMIN_QA_WORKFLOW.md) — QA status ve publish akışı
- [EDGE_FUNCTION_API.md](./EDGE_FUNCTION_API.md) — edge endpoint referansı
- [SEED_AND_SCORING.md](./SEED_AND_SCORING.md) — seed ve deterministik scoring
- [README.md](./README.md) — public publishing gate
