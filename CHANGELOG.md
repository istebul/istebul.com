# Changelog

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
