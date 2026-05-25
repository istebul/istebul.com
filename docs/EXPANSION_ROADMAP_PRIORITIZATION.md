# Expansion Roadmap Prioritization (P25)

**Question:** Which new category first — and why?

**Categories:** ev · mortgage · tatil · sigorta · finans · eğitim · elektronik  
**Beachhead:** Otomotiv (live) — expansion attaches after registry foundation.

Config: `data/ops/expansion-roadmap-prioritization.json`  
Execution detail: `data/platform/expansion-roadmap.json` (P8) · `docs/EXPANSION_STRATEGY_ROADMAP.md`

---

## Answer: hangi kategori önce?

### 1. **Ev / Konut** (wave 1 — first)

| Criterion | Score | Note |
|-----------|-------|------|
| Monetization | 88 | Emlak + mortgage CPL adjacency |
| Data availability | 58 | TCO sim live; catalog gap |
| User pain | 92 | Highest regret / GMV decision |
| Repeat usage | 38 | One-time — offset by cross-sell |
| AI differentiation | 86 | Aidat + kredi + DASK in one engine |
| Partner economics | 82 | Broker/ofis routes exist |
| **Composite** | **79%** | Leader for *launch order* |

**Neden önce?**

1. **Ürün olgunluğu ~%70** — wizard ve `estimateHomeOwnershipCost` zaten kodda; en hızlı production parity.  
2. **En yüksek kullanıcı acısı** — tek kararda finansman + sigorta + tapu riski birleşir.  
3. **Mortgage ve finans’ı aynı trafikte açar** — ayrı soğuk SEO’dan önce ev kararı içinde kredi yükü.  
4. **Partner ekonomisi** — emlak ofisi + mortgage broker CPL Türkiye’de olgun; dispatch OS hazır.

**Mortgage:** Ayrı #1 değil — **ev kararının gömülü adımı** (wave 1b). Skor yüksek (%76) ama `attachTo: ev`.

---

### 2. **Tatil** (wave 2 — second vertical)

- Composite **73%**, maturity **%75** (en yüksek kod hazırlığı ev sonrası).  
- **Repeat usage** (62) ev’den iyi — sezonluk tekrar, Pro alışkanlığı.  
- OTA CPL; envanter inşa etmeden “bütçe + destinasyon fit”.

---

### 3. **Finans** (wave 2 — hub, not cold-start)

- Composite **77%** (monetization 90, partner 88) — skor yüksek ama **keşif cross-sell**.  
- Ev/tatil kararı üretildikten sonra “asset-context” ödeme yükü.  
- Rate-table siteleriyle fark: araç/konut fiyatı → vade → teklif.

---

### 4. **Sigorta** (wave 3)

- Attach vertical — kasko, DASK, seyahat kalemleri var; **prim motoru eksik** (data 42).  
- Yıllık renew → repeat 68.

---

### 5. **Eğitim** (wave 4)

- Pain 86 ama **data 22**, maturity **0%** — önce kurum katalog + LOI.  
- Registry + bir canlı dikey kanıtı sonrası.

---

### 6. **Elektronik** (defer)

- Composite **46%** — düşük pain, düşük AI moat, düşük CPL.  
- Moat stratejisi: düşük öncelik; odak dağıtma.

---

## Önceliklendirme kriterleri (ağırlık)

| Kriter | Ağırlık |
|--------|---------|
| Monetization | 20% |
| User pain | 20% |
| AI differentiation | 20% |
| Data availability | 15% |
| Partner economics | 15% |
| Repeat usage | 10% |

> **Not:** Finans tek başına composite’te yüksek çıkar; **sıra** matrisi “önce tam dikey + cross-sell hub” kuralıyla ev → tatil → finans hub olarak sabitlenir.

---

## Recommended sequence

0. **Faz 0** — `category-registry` + `decision_leads` (tüm 7 kategori için blokaj)  
1. **Wave 1** — Ev + mortgage step  
2. **Wave 2** — Tatil + Finans hub  
3. **Wave 3** — Sigorta attach  
4. **Wave 4** — Eğitim  
5. **Defer** — Elektronik  

---

## Commands

```bash
npm run metrics:expansion:prioritization
node scripts/p25-expansion-roadmap-prioritization-audit.cjs
```
