---
title: isteBul — Investor Pitch Deck
company: isteBul · www.istebul.com
stage: Seed
format: PDF-ready (export via Marp, Google Slides, or Pitch)
version: p7.2
---

<!-- PDF EXPORT: Each "---" is one slide. Use 16:9, brand colors #0F172A / #2563EB, font Inter or DM Sans -->

# isteBul
### Karar altyapısı — yüksek tutarlı alımlar için şeffaf AI

**Seed · Türkiye · Otomotiv beachhead**  
www.istebul.com · [Founder adı · e-posta]

---

## Problem

- Türkiye'de **₺500K–₺3M** tutarındaki araç ve konut kararları parçalı araçlarla alınıyor: ilan siteleri envanter satar, bankalar tek ürün önerir.
- Tüketici **TCO, finansman yükü ve risk**i tek ekranda göremiyor; satıcı önyargılı tekliflerle kalıyor.
- Generic AI **fiyat uyduruyor** — CRM, partner kapanışı ve denetlenebilir skor yok.

> *"Aracın bana uyup uymadığını ve gerçek maliyetini bilmek istiyorum — sadece bayinin aylık taksitini değil."*

---

## Çözüm

| Katman | Ne sunuyoruz |
|--------|----------------|
| **Karar** | Çok faktörlü skor, güven seviyesi, TCO profilleri |
| **Açıklama** | LLM yalnızca deterministik sayıları anlatır — skoru değiştiremez |
| **Kapanış** | Nitelikli lead → HMAC webhook → partner CRM → `actual_revenue` geri besleme |

**Canlı demo:** istebul.com/auto — girdiler değiştikçe skor güncellenir.

---

## Pazar fırsatı

- **Sıfır araç:** ODMD 2024 → **1.238.509** adet (rekor).
- **İkinci el:** TÜİK 2024 noter devir → **7.103.550** binek otomobil.
- **Konut:** TÜİK 2024 → **1.478.025** satış; ipotekli pay **%10,7** (dip).
- **Trend:** Elektrikli pay sıfır pazarda **%17+** (2025 ODMD); AI güven krizi → açıklanabilir karar talebi.

Kaynaklar: ODMD, TÜİK Motorlu Kara Taşıtları, AA/BDDK.

---

## TAM · SAM · SOM

| Katman | Tutar (TRY) | Mantık |
|--------|-------------|--------|
| **TAM** | ~7,6T | Auto GMV (sıfır+2.el) + konut/finans kredi havuzu |
| **Platform TAM** | ~76B | ~%1 monetize edilebilir platform geliri havuzu |
| **SAM** | ~7,1B | Karar oturumu × blended ARPU (4 alt pazar) |
| **Beachhead SAM** | ~1,76B | TR otomotiv karar + lead |
| **SOM (36 ay)** | ~47,5M ARR | Base finansal model Y3 — **canlı export ile güncellenir** |

Detay: `MARKET_SIZING.md` · `market-research.json`

---

## İş modeli

**Hibrit SaaS + marketplace**

| Gelir | Mekanizma | Durum |
|-------|-----------|--------|
| **isteBul Pro** | ₺299/ay · ₺2.870/yıl · Stripe | Canlı |
| **Partner CPL** | Sıcak lead · ₺5K–12K band | Canlı |
| **Premium rapor** | Pro-gated export | Kısmi |
| **Finans / sigorta** | Nötr çoklu teklif | Erken |

**Formül:** Blended ARR ≈ Pro ARR + partner `actual_revenue` (CRM).

---

## Rakip analizi

| Tip | Güçlü yan | isteBul farkı |
|-----|-----------|----------------|
| İlan / marketplace | Envanter | Karar + TCO + nötr partner |
| Banka / finans | Tek ürün | Çoklu teklif karşılaştırma |
| OEM | Marka önyargısı | Nötr sıralama |
| ChatGPT | Genel sohbet | Deterministik sayı + CRM |

**Moat:** Decision IP · partner flywheel · platform opsiyonelliği (8 dikey).

---

## Traction & büyüme

<!-- LIVE METRICS: npm run metrics:investor:pack → slide 7 values -->

| Metrik | Değer | Kaynak |
|--------|-------|--------|
| Pro MRR (TRY) | **[LIVE: subscription.mrrTry]** | Stripe + investor-kpis |
| Aktif Pro abone | **[LIVE: activeSubscriptions]** | Admin export |
| CRM lead | **[LIVE: pipeline.leadCount]** | auto_leads |
| Partner actual (TRY) | **[LIVE: pipeline.pipelineActualTry]** | CRM |
| Blended ARR sinyali | **[LIVE: blendedArrTry]** | Pack export |

**Büyüme motoru:** SEO/organic → auto wizard → lead → dispatch → outcome → daha iyi skor.

---

## Go-to-market

| Motion | Kanal | KPI |
|--------|-------|-----|
| PLG + SEO | rehber, auto hub | Organic lead / 1K session |
| Paid test | Google, Meta | CAC vs LTV |
| Partner AE | Outbound, partner-olun | Application → won gün |
| Lifecycle | E-posta, CRM | Stale lead reactivation |

**ICP:** Yüksek tutarlı alıcı (TR şehir); partner — bayi grubu, finans, sigorta.

---

## Finansal projeksiyonlar (Base · 3 yıl)

| | Y1 | Y2 | Y3 |
|---|-----|-----|-----|
| Pro abone (dönem sonu) | 400 | 1.200 | 2.800 |
| Aylık lead | 120 | 350 | 800 |
| Blended ARR (TRY) | ~2,8M | ~8,9M | ~21,6M |

Senaryolar: Base / Bull / Bear · Detay: `financial-model-template/`

*Illustrative — term sheet öncesi signed LOI + live export ile güncellenir.*

---

## Birim ekonomi

| Metrik | Hedef |
|--------|-------|
| Pro ARPU (aylık) | ₺299 |
| Hedef LTV (ay) | 14 |
| Hedef CAC (Pro) | ₺1.200 |
| Partner brüt marj | %70 |
| Aylık burn (base) | ₺450.000 |

CAC/LTV detay: `UNIT_ECONOMICS.md` · 36 ay CSV model.

---

## Takım

| Rol | İsim | Arka plan |
|-----|------|-----------|
| CEO / Kurucu | **[Ad Soyad]** | [Önceki şirket / domain] |
| CTO / Kurucu | **[Ad Soyad]** | [Teknik liderlik] |
| **[Ops / Growth]** | **[Ad]** | [İsteğe bağlı] |

**İşe alım (seed sonrası):** Head of Partnerships · Senior data engineer · Growth lead

---

## Yatırım talebi

| | |
|---|---|
| **Round** | Seed · **₺[15–25]M** (founder doldurur) |
| **Dilution** | ~%[15–20] |
| **Runway** | 18 ay |
| **Kullanım** | %45 ürün/veri · %30 GTM · %10 hukuk · %15 ops |

**18 ay milestone:** 2+ imzalı partner LOI · Pro MRR büyümesi · Live data feed · Konut vertical parity.

---

## Fon kullanım planı

```
Mühendislik & veri     ████████████████████  45%
GTM & ortaklıklar      ████████████          30%
Hukuk & uyum           ████                  10%
Ops & tampon           ██████                15%
```

- **Ürün:** Live catalog, konut, analytics warehouse  
- **GTM:** Bayi/finans LOI, paid test, AE  
- **Hukuk:** KVKK, DPA, abonelik şartları  

---

## Ekler & data room

- `DATA_ROOM_INDEX.md` · `FUNDRAISING_READINESS.md`  
- `cap-table.csv` · `loi-template.md` · `STRIPE_MRR_EVIDENCE.md`  
- `npm run metrics:investor:pack`

**Teşekkürler — soru & demo için hazırız.**
