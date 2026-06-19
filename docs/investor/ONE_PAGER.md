# isteBul — Investor One-Pager (Final)

## One-line thesis

**isteBul, yüksek tutarlı satın alma kararları için şeffaf karar altyapısıdır**: otomotivde canlı, konut/finans/sigorta ve seyahate genişleyen hibrit SaaS + marketplace modeli.

## Problem

Kullanıcılar ₺500K–₺3M arası kararları ilan siteleri, banka hesaplayıcıları ve satıcı yönlendirmeleri arasında parçalı şekilde veriyor. Mevcut akışlarda tek bir yerde **uygunluk, toplam maliyet (TCO), finansman yükü ve risk** birlikte gösterilmiyor.

## Çözüm

- **Kural tabanlı, açıklanabilir skor motoru** (black-box tahmin değil)
- **LLM anlatım katmanı** sadece yorum üretir; deterministik hesapları değiştiremez
- **Lead → partner dispatch** ile gelir üretimi (bayi, finans, sigorta)
- **isteBul Pro** ile premium analiz ve sınırsız karşılaştırma

## İş modeli (hibrit SaaS + marketplace)

| Gelir kalemi | Mekanizma | Durum |
|--------------|-----------|-------|
| **Pro abonelik** | Stripe · ₺299/ay · ₺2,870/yıl | Canlı |
| **Partner lead geliri** | Auto intake → webhook dispatch → CRM | Canlı |
| **Premium raporlar** | Pro-gated export | Kısmi |
| **Affiliate / finans** | Attribution + CPL | Erken |

## Traction ve doğrulanabilir metrikler

- 1P analytics: auth, checkout, auto funnel, partner dispatch (`analytics_events`)
- CRM: `auto_leads` (estimated/actual revenue, stage progression)
- Admin panel: **Investor KPIs** + canlı JSON export (`npm run metrics:investor:pack`)

> Bu doküman statik sayı taşımaz. Her toplantı öncesi güncel snapshot paylaşılır.

## Defensibility

1. **Skorlama IP’si:** multi-factor match + confidence model (`decision-consultant.js`)
2. **Truth layer:** araç maliyet profilleri + finansman teklif altyapısı (Supabase)
3. **Operasyonel moat:** retry/circuit-breaker/audit log destekli partner dispatch
4. **Platform etkisi:** 8 kategoriye genişleyebilen ortak karar altyapısı

## Pazar ve genişleme

- **Bugün:** Türkiye otomotiv karar + lead üretimi
- **Sonraki faz:** Konut/tatil parity, kredi/sigorta standalone akışları
- **Uluslararası hazırlık:** tr/en/de/ar locale altyapısı

## Yatırım turu ask (toplantı sürümü)

- **Tur tipi:** Pre-seed / Seed
- **Hedef kullanım alanları:** ürünleşme, partner onboarding, GTM hızlandırma
- **Çıktı hedefi (18 ay):** Pro MRR büyümesi, partner realization rate artışı, en az 1 yeni dikeyin production parity’si

## Bağlantılı final dokümanlar

- Pitch deck iskeleti: `docs/investor/PITCH_DECK_OUTLINE.md`
- Data room index: `docs/investor/DATA_ROOM_INDEX.md`
- 100 yatırımcı hedef listesi: `docs/investor/INVESTOR_TARGET_LIST_100.csv`
- Outreach playbook: `docs/investor/OUTREACH_PLAYBOOK.md`
- Toplantı akışı + DD: `docs/investor/MEETING_FLOW_AND_DD.md`
- Takip disiplini: `docs/investor/FOLLOW_UP_DISCIPLINE.md`
- PDF paketi: `docs/investor/export/` · `npm run investor:export:pdf`
- Kurucu rehberi: `docs/investor/FOUNDER_FUNDRAISING_MASTER_GUIDE.md`

## İletişim

- Ürün: https://www.istebul.com
- Data room: `docs/investor/DATA_ROOM_INDEX.md`
