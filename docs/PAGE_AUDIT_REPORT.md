# Sayfa bazlı hata taraması (GÖREV 2)

**Yöntem:** Statik kod incelemesi + mevcut audit script’leri (`npm test`). Canlı tarayıcı E2E bu turda çalıştırılmadı.

## 1. index.html

| Kontrol | Durum | Not |
|---------|--------|-----|
| Hero / section SSR | ✅ | `data-ib-route` bootstrap inline script |
| CTA / routing | ✅ | `js/app.bundle.js` + ROUTE_BOOTSTRAP |
| Nav hamburger | ✅ | `js/ui/ui.js` → `setupResponsiveNav()` (1180px breakpoint) |
| env | ✅ | `/env.js` (build ile üretilir) |

**Risk:** LOW — Prod’da `env.js` build gate gerekli.

## 2. auto/ (`auto/index.html`)

| Kontrol | Durum | Not |
|---------|--------|-----|
| Turnstile + intake | ✅ | `auto-app.js`, explicit Turnstile |
| Ayrı CSS runtime | ✅ | `/assets/auto-runtime/ib-car.css` |
| Nav toggle | ✅ | `.auto-nav-toggle` in `auto-app.js` |

**Risk:** LOW — Cloudflare Turnstile sitekey env’de olmalı.

## 3. Nav menü (global SPA)

| Kontrol | Durum | Not |
|---------|--------|-----|
| Aç/kapa | ✅ | `.nav-toggle` + `.nav-menu.show` |
| Mobil auth kopyası | ✅ | `#mobile-auth-actions` |
| z-index | ✅ | `layout-guard.css` |

**Risk:** LOW

## 4. admin-panel.html

| Kontrol | Durum | Not |
|---------|--------|-----|
| Login | ✅ | Supabase auth + `admin-panel.js` |
| CRUD | ✅ | `admin-action` edge + tablolar |
| Toast hata | ✅ | `#toast` + `toast()` |
| Partner ops / ops center | ✅ | Dynamic import modüller |

**Risk:** MED — Service role yalnızca edge/admin-action; RLS politikaları prod’da doğrulanmalı.

## 5. partner-olun.html / partner-basvuru.html

| Kontrol | Durum | Not |
|---------|--------|-----|
| Form submit | ✅ | `partner.js` / `partner-basvuru.js` + `submitPartnerApplication` |
| Hata gösterimi | ✅ | `showInlineFormBanner` + try/catch |
| env.js | ✅ | `/env.js` defer |

**Risk:** LOW

## 6. abonelik-iptal.html

| Kontrol | Önce | Sonra |
|---------|------|-------|
| CSS | ❌ `/css/main.css` yoktu | ✅ `style.css` + `enterprise-polish` |
| env | ❌ `/dist/env.js` | ✅ `/env.js` |
| Hata UX | ⚠️ yalnızca `#unsub-status` | ✅ + global toast |
| Akış | ✅ | `lifecycle-enroll` `action: unsubscribe` |

**Risk:** LOW (düzeltme sonrası)

## Özet

| Sayfa | Sonuç |
|-------|--------|
| index.html | PASS |
| auto/ | PASS |
| Nav | PASS |
| admin-panel.html | PASS (RLS doğrulama önerilir) |
| partner-olun / partner-basvuru | PASS |
| abonelik-iptal.html | FIXED |

## Önerilen manuel smoke (prod)

1. `index.html` → Hero CTA → `/auto/` veya planlar  
2. Mobil 390px → hamburger menü  
3. `partner-basvuru.html` → adım 1 submit  
4. `abonelik-iptal.html?email=test@example.com` → unsubscribe mesajı  
5. Admin login → Ops Command Center yükleme  
