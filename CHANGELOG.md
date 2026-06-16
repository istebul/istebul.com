# Changelog

## [2.2.22] — 2026-06-16

### Added
- **Açık Veri — AFAD Deprem Snapshot OD-2B closure** (PR [#380](https://github.com/istebul/istebul.com/pull/380), merge `62d04a0c`)
  - Production verification record for `/api/afad-earthquake-snapshot` foundation (feature-flag disabled in prod)
  - Closure documentation: `docs/OPEN_DATA_OD-2B_CLOSURE.md`
  - EVDS regression confirmed intact (`/api/evds-snapshot`); `npm run smoke:live` PASS (failed=0)

### Documentation
- OD-2B recorded as **docs-only production closure** — no new runtime behavior in this release
- AFAD remains feature-flag disabled (`AFAD_EARTHQUAKE_ENABLED`); OD-2C is a separate future phase (UI/admin/konut scoring not in scope)

## [2.2.21] — 2026-06-13

### Added
- **Faz 3F — Auto Vehicle Image Trust Layer** (PRs [#326](https://github.com/istebul/istebul.com/pull/326)–[#330](https://github.com/istebul/istebul.com/pull/330), main `62b350f6`)
  - `resolveVehicleImageTrust()` foundation with `identity` / `checks` metadata and `strictExactMatchReady` (metadata-only; does not change UI classification yet)
  - Placeholder-first Auto result UI: `showRealImage:false` for catalog SVG; “Görsel doğrulanamadı” copy
  - Verified external image load error → premium placeholder (no catalog fallback chain)
  - Compare storage and `/karsilastir` Auto cards trust-aware; legacy catalog SVG compare entries sanitized at render
- Production verification **GO / PASS** (CI `27477115336`, Production Deploy `27477115351`, Cloudflare pages `27477115064`)

### Changed
- Auto result cards no longer render catalog SVG assets as if they were real vehicle photos
- Faz 3F reduced false-positive real-image risk; it did **not** expand `showRealImage:true` coverage

### Fixed
- Auto catalog SVG images could appear as real vehicle photos in result UI and compare cards

## [2.2.20] — 2026-06-08

### Added
- Pre-launch legal compliance pack: `/gdpr.html` (English GDPR summary)
- Live data guardrail: `live_providers_enabled` blocked without `live_finance_feed_url` (admin + edge)
- Partner trust: mandatory DPA reference for lead sharing
- TCMB EVDS usage terms on `/veri-kaynaklari/`

### Changed
- TÜİK data source status: **Aktif** → **Manuel referans** (matches actual integration state)
- Expanded `/kullanim-sartlari.html`: liability, subscription/refund, jurisdiction, IP, simulation disclosure
- KVKK page: GDPR EN link, KVKK authority link, legal note
- Methodology copy: TÜİK manual reference vs TCMB EVDS live API clarified

## [2.2.19] — 2026-06-01

### Fixed
- Homepage: social + newsletter styles in `homepage.bundle` (≤3 stylesheets; E2E deploy gate)

## [2.2.18] — 2026-06-01

### Fixed
- Production build: copy `static-cookie-consent.js`, bundle kasko vertical app, rewrite hashed CSS after social footer inject (CI `dist-asset-integrity-audit`)
- Bundle budget: exclude sigorta/kasko vertical runtime from main SPA budget (same as finans)

## [2.2.17] — 2026-06-01

### Added
- 30-day live data rollout checklist (`docs/LIVE_DATA_30DAY_CHECKLIST.md`)
- Client bootstrap for `live_providers_enabled` from public `site_settings` (`js/runtime/live-data-integrations.js`)
- Supabase migration for live data settings + public allowlist
- Admin panel: Canlı veri toggle and finance feed URL field
- `audit:live-data` and go-live gate for live-data readiness

### Changed
- `app.js` merges production live-data flags on init (default remains simulation until admin enables)

## [2.2.16] — 2026-06-01

### Added
- Unified legal footer module (`scripts/lib/legal-footer.cjs`) and sync tool for corporate pages
- Static cookie consent banner on corporate HTML (`static-cookie-consent.js`)
- Platform scorecard script (`scripts/platform-scorecard.cjs`)
- Rehber/sitemap audit (`scripts/audit-rehber-sitemap.cjs`)
- GDPR English summary on `/kvkk.html` and `docs/compliance/gdpr-notice-en.md`
- Account dashboard: KVKK links and account deletion request (mailto)
- Admin warning when all social media fields are empty
- iyzico IYZWSv2 request signing and async webhook verification hook

### Changed
- Footer link audit validates `#kvkk-bilgilendirme` on `kvkk.html`
- CI: production build + footer/rehber audits; optional Lighthouse
- `go-live:verify` runs footer, rehber, compliance, and scorecard checks
- Pricing trust note i18n links to visitor notice + KVKK bilgilendirme (all locales)
- Konut footer: legal links + social init

## [2.2.15] — 2026-06-01

### Added
- Homepage footer: Ziyaretçi Aydınlatma Metni + KVKK hakkında bilgilendirme
- `kvkk.html` anchor sections; vertical mini-footers updated

## [2.2.14] — 2026-06-01

### Changed
- Site contact email `info@istebul.com` across pages and Supabase migration

## [2.2.13] — 2026-06-01

### Fixed
- Homepage footer social buttons high contrast + “Bizi takip edin”

## [2.2.12] — 2026-06-01

### Added
- Site-wide social links from `site_settings` on marketing pages
