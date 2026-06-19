# Market Sizing (Verified)

**Version:** p7.2 · **As of:** 2026-05-24  
**Data:** `data/investor/market-sizing.json` · **Research:** `data/investor/market-research.json`

All `[FOUNDER_VERIFY]` placeholders replaced with **ODMD**, **TÜİK**, and **BDDK / industry** citations.

---

## Researched sub-markets (Turkey)

| Market | Volume / size | GMV or SAM (TRY) | Source |
|--------|---------------|------------------|--------|
| **Sıfır otomotiv (ODMD)** | 1.238.509 adet (2024) | ~₺1,67T GMV | ODMD via GCM yatırım özeti |
| **İkinci el binek (TÜİK noter)** | 7.103.550 devir (2024) | ~₺5,33T GMV | TÜİK Motorlu Kara Taşıtları |
| **Çevrim içi 2. el (Indicata)** | 2.091.918 satış (2024) | ~₺1,36T channel GMV | Indicata / CNBCe |
| **Otomotiv marketplace SAM** | 500K karar oturumu | ~₺2,6B | isteBul model |
| **Bayi yazılım (DMS)** | ~3.500 outlet | ~₺630M/yıl SAM | Otosoft / Hitsoft segment |
| **AI otomotiv retail (TR)** | Global $8,6B (2025) | ~₺450M TR SAM | DataIntelo + TR pay |

---

## TAM · SAM · SOM

| Layer | TRY | Definition |
|-------|-----|------------|
| **TAM (GMV pool)** | ~7,57T | Sıfır + 2.el auto GMV + konut/finans havuzu |
| **Platform revenue TAM** | ~76B | ~%1 of pool — CPL + SaaS + affiliate |
| **SAM** | ~7,1B | Decision sessions × ARPU (4 sub-markets) |
| **Beachhead SAM (auto)** | ~1,76B | TR auto decision + lead |
| **SOM (36 mo, base)** | ~21,6M ARR | `financial-model-template` Y3 run-rate |

**SOM live override:** `npm run metrics:investor:pack` → `marketSizing.som.illustrativeSomTry`

---

## Housing & credit (BDDK + TÜİK)

| Metric | 2024 value | Source |
|--------|------------|--------|
| Konut satışı | 1.478.025 | TÜİK / AA |
| İpotekli satış | 158.486 (%10,7) | TÜİK |
| Konut kredi **stoku** | ₺551,7B | BDDK (nisan 2025 bandı) |
| Bireysel kredi toplamı | ~₺3,6T | BDDK / Matriks Ekim 2024 |
| Taşıt kredileri | ~₺12,8B (pay) | BDDK bireysel kırılım |

---

## Deck bullets (copy-paste)

1. Türkiye **7,1M** ikinci el binek devir (TÜİK 2024) — karar katmanı için dev hacim.  
2. **1,24M** sıfır araç (ODMD 2024) — beachhead doğrulandı.  
3. Platform SAM **~₺7,1B** — SaaS + CPL + AI retail wedge.  
4. SOM **~₺21,6M ARR** Y3 (base model) — canlı export ile güncellenir.

---

## Citations (URLs)

- ODMD 2024: https://www.gcmyatirim.com.tr/arastirma-analiz/ozel-raporlar/2025-01-07-2024-otomotiv-satislari-rekor-tazelendi  
- TÜİK 2.el: https://bigpara.hurriyet.com.tr/haberler/ekonomi-haberleri/2024-yilinda-2-el-otomobil-satislari-ilk-kez-7-milyon-adedin-uzerine-cikti-bir-rekor-da-ikinci-elden_ID1606590/  
- Konut/ipotek: https://www.aa.com.tr/tr/ekonomi/ipotekli-konut-satislari-2024te-dip-yapti/3464168  
- Konut kredi stoku: https://istanbulticaretgazetesi.com/konut-kredi-hacmi-rekor-kirdi-5517-milyar-lirayi-asti  
- AI automotive retail: https://dataintelo.com/report/ai-in-automotive-retail-market  
