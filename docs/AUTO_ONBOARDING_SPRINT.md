# Auto onboarding sprint — plan

Hedef: `/auto/` akışında ilk ziyaretten sonuç yorumuna kadar premium, dönüşüm odaklı deneyim.

## Mevcut (tamamlandı / kodda)

- 4 adımlı wizard + ilerleme çubuğu + milestone etiketleri
- Sonuç ekranında güven bandı + boş durum
- Pro upsell strip + karşılaştırma / shortlist
- **Sonuç yorumlama rehberi** (`auto-results-guide`)
- Hero CTA: TCO odaklı metin
- E2E: `tests/e2e/auto-onboarding.spec.mjs`
- **Soft auth gate** — anon sonuç sonrası kayıt CTA (`auto-soft-auth-gate`, session dismiss)
- **Wizard ETA** — adım bazlı kalan süre etiketi (`WIZARD_ETA_BY_STEP`)

## Sonraki iterasyon (backlog)

1. ~~Giriş yapmadan analiz → sonuç sonrası tek modal ile kayıt (soft gate)~~ ✅
2. ~~Wizard’da “tahmini kalan süre” gerçek zamanlı (adım bazlı)~~ ✅ (statik adım etiketleri)
3. Sonuç kartında mini TCO sparkline (görsel)
4. Playwright: tam form submit + mock API
5. Mobil: wizard seçenekleri tek sütun, 44px dokunma alanı denetimi

## Ölçüm

- `auto_wizard_step`, `auto_wizard_complete`, `auto_start` event’leri (mevcut)
- Funnel: hero CTA → wizard complete → results view → checkout click
