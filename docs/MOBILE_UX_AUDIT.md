# Mobile UX Audit — isteBul

**Hedef:** Premium, mobile-first deneyim (tap targets, spacing, scroll, layout stability, forms, speed, readability, CTA, auth, CRM).

**Branch:** `cursor/mobile-first-perfection-0bbd`

## Özet

| Alan | Durum | Uygulama |
|------|--------|----------|
| Tap targets (≥44px) | ✅ | `css/mobile-perfection.css` — btn, nav, modal close, wizard |
| Safe areas (notch/home) | ✅ | `viewport-fit=cover`, `env(safe-area-inset-*)` |
| iOS form zoom | ✅ | `font-size: 16px` inputs on ≤768px |
| Auth mobile UX | ✅ | Bottom sheet `#auth-modal`, `body.modal-open`, `auth-modal` class |
| Sticky CTA + cookie stack | ✅ | Cookie above sticky bar, `padding-bottom` on body |
| Layout stability (hero preview) | ✅ | `transform: none` on decision preview mobile |
| Auto nav (was hidden) | ✅ | Drawer + `auto-nav-toggle` + `is-nav-open` |
| Lead/paywall modals | ✅ | Bottom sheet ≤640px |
| SEO landing CTAs | ✅ | Full-width buttons, horizontal nav scroll |
| Admin CRM | ✅ | Sidebar drawer, topbar, table scroll, full-width lead drawer |
| Homepage `ib-ready` | ✅ (main) | `enterprise-ux.js` — body class for visible sections |

## Ana site (`index.html` + `css/style.css`)

- **Import:** `mobile-perfection.css` en sonda yüklenir.
- **Auth:** `js/features/auth/auth.js` — `auth-modal` + `modal-open` on open/close.
- **Scroll:** `scroll-margin-top` on sections for sticky header.
- **Readability:** Hero `clamp()` typography, 1rem body on mobile.

## Auto (`auto/index.html`)

- Viewport `viewport-fit=cover`.
- Nav: `js/auto/auto-app.js` toggles `is-nav-open`; CSS drawer overrides `nav { display: none }` at ≤850px.
- Trust rail: horizontal scroll on small screens.

## Admin CRM (`admin-panel.html`)

- **≤900px:** Off-canvas sidebar, overlay, sticky topbar with hamburger.
- **Tables:** Horizontal scroll on `#auto-leads-list` and list containers (min-width table preserved for CRM density).
- **Lead drawer:** Full viewport width on phone, safe-area padding.
- **Forms:** 16px inputs, 44px min touch height.

## Test checklist (manuel)

1. iPhone/Android — ana sayfa hero + sticky CTA görünür, scroll smooth.
2. Auth: Üye ol → bottom sheet, klavye açıkken scroll, kapatınca scroll unlock.
3. Auto: Menü aç/kapa, link tıkla, drawer kapanır.
4. Admin: Giriş → menü → Auto Leads → satır scroll → lead detay drawer tam ekran.
5. Rehber sayfası: CTA tam genişlik, nav yatay kaydırma.

## Bilinen sınırlar

- Auto leads tablosu mobilde kart görünümüne dönüştürülmedi (yatay scroll tercih edildi — CRM yoğun veri).
- `css/style.css` içinde birden fazla nav breakpoint (768 / 1180) — JS 1180 ile uyumlu; tam konsolidasyon sonraki iterasyon.

## Deploy

`main` merge sonrası GitHub Actions → Cloudflare Pages `istebul-com`. Telefonda hard refresh veya cache temizliği önerilir.
