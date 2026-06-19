# P11 — Acquisition / Exit Optionality (isteBul)

**Lens:** CEO · CFO · Investment Banker · VC Partner · Corporate Development Advisor  
**Config:** `data/ops/acquisition-exit-optionality.json`  
**Data room:** `docs/investor/EXIT_OPTIONALITY_REPORT.md` · `docs/investor/DATA_ROOM_INDEX.md`

---

## Executive summary

isteBul is **investable with gaps**, **strategically interesting before scale**, and **not yet exit-ready** on absolute size. The asset is **decision infrastructure** (scores + partner closure), not listings or chat.

| Dimension | Today (~%) | 90-day target |
|-----------|------------|---------------|
| Exit readiness | 48 | 70 |
| Investability | 55 | 75 |
| Acquirability (strategic) | 42 | 60 |

**Recommended path:** **Bootstrap partner economics for 90 days → optional seed** for vertical/international optionality. Parallel **strategic teasers** (NDA) with marketplace + bank — not a sale process yet.

**Default recommendation:** Do **not** run a broad auction. Build **proof** (MRR slope + LOIs + outcome graph), then choose **seed** or **JV-heavy bootstrap**.

---

## 1. Valuation logic · Şirket değerleme mantığı

Company **valuation** in one line: **Blended ARR (Pro MRR + tanımlı partner geliri) × stage-appropriate multiple + stratejik prim (Decision IP + outcome graph).**

| Bileşen | Ağırlık | Kaynak | Çarpan |
|---------|---------|--------|--------|
| Pro MRR | ~35% | Stripe | 8–15× ARR |
| Partner revenue | ~45% | CRM `actual_revenue` + CPL sözleşmesi | 5–12× |
| Stratejik prim | ~20% | Skor motoru, dispatch OS, dikey opsiyon | +15–40% |

**CFO kuralı:** `estimated_revenue` yatırımcıya veya alıcıya **gösterilmez** — sadece sözleşmeli CPL ve kapanan `actual_revenue`.

---

## 2. Revenue multiple potansiyeli

| Senaryo | ARR bandı (örnek) | Multiple | İmplied değer (TRY) |
|---------|-------------------|----------|---------------------|
| Seed SaaS | ₺2–6M | 6–12× | ₺12M–72M |
| Büyüme SaaS | ₺6–15M | 10–15× | ₺60M–225M |
| Stratejik | ₺4–10M + sinerji | 12–20× | ₺48M–200M+ |

Prim gerekçesi: **outcome capture ≥70%**, **≥10 endpoint**, **≥2 dikey canlı**.

---

## 3. Bootstrap vs VC

### Bootstrap

- **Ne zaman:** Partner CPL burn’u karşılar; CAC payback ≤6 ay; paid zorunlu değil.  
- **Artı:** Seyreltme yok; stratejik opsiyon korunur.  
- **Eksi:** Dikey genişleme yavaş; rakip paid burn riski.

### Seed (önerilen zamanlama: 90 gün sonra)

- **Ne zaman:** Yeşil ışıklar (LOI, dispatch, LTV:CAC, taze investor pack).  
- **Tipik:** ₺3–8M round · %15–25 dilüsyon · ₺12–32M pre-money (ARR girişine bağlı).  
- **Kullanım:** Partner BD, ev/tatil, sınırlı paid, data room + hukuk.

**IB görüşü:** Önce **kanıt** (outcome graph), sonra **fiyat** — erken round değerlemeyi düşürür ve hikâyeyi “erken” kilitler.

---

## 4. Yatırım için doğru zaman

### Yeşil ışık (şimdi–90 gün içinde toplanmalı)

- 2+ imzalı partner LOI (CPL bandı)  
- Dispatch success ≥85% (8 hafta)  
- MRR eğimi veya partner geliri ≥%40 toplam  
- LTV:CAC ≥3 (`metrics:unit-economics`)  
- `npm run metrics:investor:pack` <7 gün

### Kırmızı ışık (raise ertele)

- Sözleşmesiz `estimated_revenue`  
- `actual_revenue` boş CRM  
- Tek partner >%60 gelir  
- “Canlı veri” iddiası (`liveProvidersEnabled` false)

**Pencere:** Rakip AI listing katmanı yaygınlaşmadan **kategori hikâyesini** kilitle — Q2 readiness sonrası seed konuşması ideal.

---

## 5. Yatırımcıya gösterilecek metrikler

| Tier | Metrikler |
|------|-----------|
| **Must** | MRR (TRY), partner pipeline, qualified leads MoM, dispatch %, LTV:CAC |
| **Strong** | Wizard completion, partner win rate, Pro churn, CAC payback, gross margin |
| **DD** | Outcome capture %, active endpoints, analytics cap, D30 retention |
| **Story** | Verticals live, cross-sell, organic share, decisions/MAU |

Export: `npm run metrics:investor:pack` · Admin **Executive KPIs**

---

## 6–7. Acquisition target potansiyeli & buyer listesi

**Potansiyel:** Orta-yükselen — teknoloji + partner graph kanıtlanırsa **yüksek stratejik ilgi**, mutlak ARR hâlâ küçük.

| Buyer tipi | Örnek | Fit | Senaryo |
|------------|-------|-----|---------|
| Marketplace | Sahibinden, Arabam, Hepsiemlak | 88 | Decision engine; listing korunur |
| Banka | Garanti, İş, QNB, Yapı Kredi | 82 | Mortgage/auto origination kalitesi |
| Sigorta | Anadolu, Allianz, Aksigorta | 75 | Kasko/DASK attach |
| Otomotiv | Borusan, Otokoç, Doğuş digital | 80 | Bayi ağı skorlu lead |
| Fintech | Hangikredi, brokerlar | 78 | Asset-context vs oran tablosu |
| OTA | Enuygun, Jolly | 70 | Tatil bütçe kararı |

---

## 8. Buyer senaryoları (özet)

- **Banka:** NPAs düşürme — fit skoru + ödeme yükü; JV veya minority + ticari anlaşma.  
- **Sigorta:** Satın alma anında attach; revenue-share M&A.  
- **Marketplace:** AI disintermediation korkusu; tam satın alma veya acqui-hire + earnout.  
- **Otomotiv:** Dijital bayi danışmanı; stratejik yatırım + dağıtım MOU.  
- **Fintech:** Karşılaştırma + decision birleşimi.

---

## 9. Exit readiness eksikleri (öncelik)

1. Stripe MRR kanıt klasörü (yüksek)  
2. 2+ imzalı LOI (yüksek)  
3. Outcome graph ≥70% (yüksek)  
4. Cap table + IP assignment (orta)  
5. GDPR/EN hukuk (orta)  
6. Partner konsantrasyonu raporu (orta)  
7. Warehouse BI / cohort export (düşük)

---

## 10. Data room hazırlığı

Mevcut: `docs/investor/DATA_ROOM_INDEX.md` (P7). P11 ekleri:

- `docs/investor/EXIT_OPTIONALITY_REPORT.md`  
- `data/ops/acquisition-exit-optionality.json`  
- `dist/acquisition-exit-snapshot.json` (haftalık)

**Klasör 06 — Exit:** stratejik buyer map, 3 senaryo modeli, LOI PDF, dispatch örnekleri.

Haftalık: `metrics:investor:pack` + `metrics:exit:optionality`

---

## 11. Yatırımcı pitch narrative

**Tek cümle:** Yüksek düşünme maliyetli satın almalarda **karar altyapısı** — marketplace veya banka değil.

**Slayt sırası:** Problem → Deterministik çözüm → Traction (MRR + lead + SLA) → Moat (outcome + OS) → Pazar (TR auto → ev → finans) → Ask → Stratejik opsiyonellik (JV)

**Söyleme:** İlan sayısı, generic ChatGPT, sözleşmesiz gelir.

---

## 12. Partner traction kanıtı

| Kanıt | Nereden |
|-------|---------|
| Aktif endpoint + health | `partner_endpoints` · `metrics:partner:ops` |
| Dispatch p95 / success | `dist/partner-ops-snapshot.json` |
| Skorlu lead + kapanış | Admin CRM · `actual_revenue` |
| LOI PDF | Founder |
| Webhook HMAC | `docs/partner-webhook-integration.md` |
| Vaka çalışması | 14 günde lead→won |

---

## 13. Revenue model — değer artırma

1. **Sözleşmeli CPL** (P0) — CRM’de estimated kaldır  
2. **Outcome pricing** — `actual_revenue` eşiği üstü bonus  
3. **Pro+ dikey paket** — ev/auto bundle  
4. **Enterprise API** — banka white-label pilot  
5. **Exclusivity premium** — 6–12 ay bölge  
6. **Data licensing** (uzun) — anonim benchmark

---

## Üç senaryo (finansal çerçeve)

### A) Bootstrap

- Olasılık ~35% · 24 ay  
- Dış sermaye minimal · ARR hedef Y2 ~₺8M  
- Değerleme olayı yok; güçlü olunca stratejik diyalog ₺8–15M ARR’da

### B) Seed

- Olasılık ~50% · 18 ay  
- Raise ₺3–8M · Pre-money ₺12–32M (ARR girişine bağlı)  
- Çıkış opsiyonu: Series A veya stratejik 24–36 ay step-up

### C) strategic acquisition

- Olasılık ~15% · 12+ ay (erken değil)  
- ARR ≥₺4M + graph kanıtı · ₺25–90M band (10–18× ARR + prim)  
- Yapı: nakit + earnout · founder 24 ay · acqui-hire

---

## 90 günlük execution roadmap

| Hafta | Odak | Deliverable |
|-------|------|-------------|
| 1–2 | Metrik | Haftalık investor pack; Stripe klasörü; CRM actual_revenue disiplini |
| 3–4 | Partner | 2 LOI imza hedefi; case study; 10 endpoint planı |
| 5–8 | Ürün | Registry MVP; ev `decision_leads`; outcome ≥70% |
| 9–10 | Data room | 06_exit klasörü; deck PDF; cap table counsel |
| 11–12 | Opsiyonellik | 3 stratejik teaser (NDA); seed vs bootstrap memo; model güncelle |

---

## Hemen toplanacak metrikler

`mrr_try` · `partner_revenue_try` · `qualified_leads` · `dispatch_success_pct` · `ltv_cac_ratio` · `outcome_capture_pct` · `active_partner_endpoints` · `wizard_completion_pct` · `pro_churn` · `top_partner_concentration_pct`

---

## Kapatılacak ürün / iş eksikleri

| Öncelik | Eksik |
|---------|--------|
| P0 | Sözleşmeli CPL + outcome graph |
| P1 | Tek dikey gelir · IP/cap table |
| P2 | Cohort export · EN legal |

---

## Gerçekçi değerleme senaryoları (illüstratif TRY)

| Durum | ARR | Multiple | Enterprise value |
|-------|-----|----------|------------------|
| Bugün (erken) | ₺1–3M | 8–10× | ₺8–30M |
| 90 gün sonra (seed giriş) | ₺2–6M | 8–12× | ₺16–72M |
| Y2 bootstrap güçlü | ₺8M | 10× | ~₺80M |
| Stratejik (graph + 2 dikey) | ₺4–10M | 12–18× | ₺48–180M |

*Founder: `financial-model.json` ve canlı pack ile güncelle.*

---

## Komutlar

```bash
npm run metrics:exit:optionality
# → docs/exit-optionality-report.md + dist/exit-optionality-snapshot.json
npm run metrics:investor:pack
node scripts/p11-exit-optionality-audit.cjs
```

Admin: **Exit / M&A (P11)**
