# Footer Guide Pages — Fix Report

**Date:** 2026-05-29  
**Commit message:** `Fix footer guide pages and improve SEO content`

## Summary

Footer **Şirket** column links now resolve to full, indexable static pages with Design System v4, unique meta, JSON-LD, FAQ, and category CTAs. Corporate pages (Hakkımızda, İletişim) are generated at build time from JSON content; rehber guides are built from `landing-pages.json` + expansions.

## Footer link → URL mapping

| Footer label | URL |
|--------------|-----|
| Hakkımızda | `/hakkimizda.html` |
| İletişim | `/iletisim.html` |
| SUV mi Sedan mı | `/rehber/suv-mi-sedan-mi/` |
| Elektrikli araç rehberi | `/rehber/elektrikli-arac-alirken/` |
| Finansman rehberi | `/rehber/arac-finansman-secenekleri/` |
| TCO rehberi | `/rehber/arac-toplam-sahiplik-maliyeti/` |
| İkinci el rehberi | `/rehber/ikinci-el-arac-alirken/` |

## Files changed

| File | Change |
|------|--------|
| `index.html` | Footer Şirket column: all 7 links |
| `_redirects` | 301 non-trailing-slash rehber URLs; `/rehber/` → `index.html` |
| `scripts/lib/seo.cjs` | Corporate rich pages, rehber hub, guide CTAs, contact cards |
| `scripts/lib/seo-guide-expansions.cjs` | Fixed template interpolation (`${h1}` literal bug) |
| `scripts/production-build.cjs` | Hash CSS refs on corporate SEO HTML; removed duplicate static copy |
| `data/seo/about-page.json` | **New** — Hakkımızda content |
| `data/seo/contact-page.json` | **New** — İletişim content |
| `data/seo/landing-pages.json` | Richer meta/sections for target guides |
| `data/seo/site.json` | Sitemap: `/rehber/` hub |
| `css/seo-landing.css` | Contact grid + hub list styles |
| `hakkimizda.html`, `iletisim.html` | Build output (v4, FAQ, JSON-LD) |
| `metodoloji/index.html` | Rebuilt from build |

## New / generated pages

- `hakkimizda.html` — AI karar platformu, KVKK, metodoloji, CTA
- `iletisim.html` — info@istebul.com, partner/kurumsal/KVKK kartları
- `dist/rehber/index.html` — Rehber hub (liste)
- `dist/rehber/{slug}/index.html` — 13 guides including all footer targets

## Sitemap

- `hakkimizda.html`, `iletisim.html` — in `site.json` `staticUrls`
- All `/rehber/{slug}/` — from `landing-pages.json` at build
- `/rehber/` hub — added to `staticUrls`
- `robots.txt` — no block on these paths

## SEO / technical

- Canonical: `https://www.istebul.com/...`
- `index, follow` on public pages
- BreadcrumbList + Article + FAQPage JSON-LD
- Single H1 per page
- No “yakında” / thin placeholders
- v4 tokens via `html.ib-ds-v4` + hashed `istebul-design-system-v4.*.css`

## Tests

| Check | Result |
|-------|--------|
| `npm run build` | PASS |
| `build:check` | PASS |
| `dist-asset-integrity-audit` | PASS |
| `audit-site-links.cjs` | PASS |
| `audit-seo.cjs` | PASS |
| `seo-indexability-report.cjs` | PASS (report updated) |
| `npm test` (full) | **FAIL** — bundle budget (~1.08 MB SPA, pre-existing) |

## Risks

1. **Bundle budget** — unrelated to footer work; SPA still exceeds analyze threshold.
2. **Deploy** — Rehber pages exist under `dist/rehber/` after build; ensure Cloudflare deploy uses latest `dist/`.
3. **Trailing slash** — Non-slash URLs 301 to slash; verify CDN cache after deploy.

## Post-deploy checks

- Click all footer Şirket links (mobile + desktop)
- GSC: URL inspection for each guide + corporate pages
- Confirm 200 (not SPA shell) for `/rehber/suv-mi-sedan-mi/`
