# UI Premium Final V7 — Report

**Date:** 2026-05-29  
**Commit:** Apply Premium Final V7 density and footer redesign

## Summary

V7 tightens marketing layout to **1160px** max width, reorders homepage sections via CSS flex `order`, compacts **Gerçek analiz örnekleri** into a **2×2 dashboard grid**, refines product cards density, and rebuilds the **footer** with brand column + 4 link columns.

## New file

- `css/istebul-premium-final-v7.css` — imported from Design System v4; linked as `?v=7`

## Changed files

| File | Change |
|------|--------|
| `css/istebul-design-system-v4.css` | `@import` v7 |
| `index.html` | `ib-premium-v7`, sample cards markup, footer V7 structure |
| `scripts/lib/seo.cjs` | v7 class + CSS on static SEO pages |
| `scripts/production-build.cjs` | Copy v7 CSS to dist |
| `auto/`, `konut/`, `tatil/`, `finans/`, `metodoloji/`, `admin-panel.html` | v7 hooks |

## Sections fixed

1. **Container** — max-width 1160px; section padding 40/56/72px responsive  
2. **Home order** — Hero → Kategori kartları → Analiz örnekleri → Nasıl çalışır → Rehber → Güven → …  
3. **Analiz örnekleri** — 2×2 grid, compact dashboard cards, fixed CTA at bottom  
4. **Ürün kartları** — 3 col (1024–1279px), 4 col (1280px+); ~400px height  
5. **Footer** — brand + 4 columns, slate links, newsletter contrast  
6. **Header** — slightly tighter nav height  

## Responsive

| Breakpoint | Checks |
|------------|--------|
| 390px | 1-col cards/samples; footer stacks |
| 768px | 2-col samples/product |
| 1024px | 3-col product / 2-col samples |
| 1440px | content capped at 1160px (no stretch) |

## Tests

| Command | Result |
|---------|--------|
| `npm run build` | PASS |
| `dist-asset-integrity-audit` | PASS |
| `final-production-launch-audit` | PASS |
| `npm test` (full) | May fail on bundle budget (pre-existing) |

## Risks

- Section reorder uses CSS `order` on `#main-content`; rare browsers without flex on main are unaffected (modern only).  
- Footer HTML structure changed — custom footer CSS outside v7 may need review.  
- `karar-rehberi` remains in flow after “Nasıl çalışır” (intentional).  

## Deploy cache

Purge: `istebul-premium-final-v7.css?v=7`, `istebul-design-system-v4.css?v=7`, `style.css?v=63`
