# P4.6 — Brand consistency

Unified voice: **premium · güvenilir · akıllı · net · profesyonel** — karar altyapısı, not marketplace or startup casual.

## Voice rules

| Avoid | Prefer |
|-------|--------|
| İlan pazarı tonu (“ilan yayınla”, “Piyasa”) | Seçenek / karar veri seti |
| Startup hype (“partner OS”, “abonelik kutusu”) | Metodoloji, operasyon, Pro plan |
| Generic kurumsal boşluk | Somut TCO, skor, metodoloji |
| Sohbet botu / ilan sitesi karşılaştırması (dağınık) | Tek `BRAND_VOICE.positioningLine` |

## Source of truth

- `js/core/brand-voice.js` — CTAs, kickers, trust, headings
- `js/core/conversion-copy.js` — imports trust + aligns auth/checkout
- `js/runtime/brand-consistency.js` — runtime CTA/kicker normalization

## Primary CTA (product-wide)

**TCO analizini başlat** — uzun form: *Ücretsiz TCO analizi başlat* (title/aria).

## Audit

```bash
node scripts/p4-brand-consistency-audit.cjs
```
