# P4 — Premium venture product layer

isteBul’u yatırım yapılabilir, güven veren dijital ürün hissi için eklenen katman (P3 moat üzerine).

## Kapsam

| Alan | Uygulama |
|------|----------|
| Premium brand polish | `css/p4-premium-product.css` — venture renkleri, kart gölgeleri, tipografi |
| Enterprise UX | Auth modal, boş durumlar, partner header cam efekti |
| Conversion micro-UX | CTA gradient, `ib-cta-trust-line`, sticky CTA güven metni, `aria-busy` |
| Mobile premium | Sticky CTA safe-area, 48px dokunma hedefleri |
| Performance | `content-visibility`, `contain` on hero/preview, skeleton shimmer |
| Consistency | `scripts/p4-consistency-audit.cjs` |
| Scale readiness | `scripts/p4-scale-readiness-check.cjs`, moat-health, hashed dist |

## CSS cascade

1. `style.css` → `@import p4-premium-product.css` (SPA + partner HTML)
2. Auto standalone → `production-build.cjs` bundles `auto.css` + P4 into `assets/auto-runtime/ib-car.css`

## JS

| Modül | Rol |
|-------|-----|
| `js/runtime/p4-product-polish.js` | `ib-page-ready`, CTA trust lines, reveal IO, form busy |
| `js/runtime/enterprise-ux.js` | SPA: P4 + executive polish |
| `js/runtime/corporate-ux.js` | Partner / moat sayfaları |
| `js/auto/auto-app.js` | Auto runtime P4 init |

## Mesaj ilkeleri

- Birincil CTA: **Ücretsiz maliyet analizi** (`/auto/`)
- Güven: KVKK, kural tabanlı skor, AI yalnızca gerekçe — bağlayıcı teklif iddiası yok
- Karar asistanı önizlemesi: premium route’ta **Karar önizlemesi** (tam TCO için Auto)

## CI

```bash
node scripts/p4-consistency-audit.cjs
node scripts/p4-scale-readiness-check.cjs
```

`npm test` bu kontrolleri de çalıştırır.

## Manuel QA

- [ ] Ana sayfa hero + sticky CTA altında güven satırı
- [ ] `/auto/` wizard yüklenirken premium loading kartı
- [ ] Partner / karar-moat kartları scroll’da reveal (reduced-motion kapalı)
- [ ] Giriş formu gönderiminde submit `aria-busy`
- [ ] Karar moat sayfası moat-health strip (auth ile)
