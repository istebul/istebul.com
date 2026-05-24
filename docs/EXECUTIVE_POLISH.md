# Executive Polish

Premium global product layer — visual refinement, trust, messaging precision.

**Canonical brand system:** `docs/BRAND_SYSTEM.md` · tokens: `css/design-tokens.css` · copy: `js/core/brand-voice.js`

## Layers (CSS cascade)

1. `design-tokens.css` — brand colors, type, spacing (single source)
2. `style.css` — base
3. `enterprise-polish.css` — typography, cards, modals
4. `executive-polish.css` — announcement bar, glass nav, footer, forms, Auto harmonization

## JS

- `js/runtime/executive-polish.js` — sticky nav scroll state (`nav-scrolled`)
- Wired via `initEnterpriseUx()`

## Messaging principles

- **Kurumsal ton:** "karar zekâsı", "metodoloji", "tarafsız" — avoid MVP/startup phrasing
- **Güven:** KVKK, TLS, denetlenebilir metodoloji (trust rail)
- **CTA:** "Karar analizini başlat" — not "2 dk ücretsiz"

## Manual QA

- [ ] Homepage scroll → nav glass effect
- [ ] Trust cards show icons + hover
- [ ] Footer newsletter dark gradient
- [ ] Auto social proof dot indicator
- [ ] Mobile nav + sticky CTA readable
