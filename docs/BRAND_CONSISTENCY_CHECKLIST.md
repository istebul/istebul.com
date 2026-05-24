# Brand consistency checklist

Use before release, major copy change, or partner-facing material.

## Visual

- [ ] `design-tokens.css` loaded first in `style.css` cascade
- [ ] Primary actions use brand gradient / `--ib-color-primary-600`
- [ ] Body uses `ib-enterprise` (and `ib-auto` on Auto)
- [ ] Lucide icons — outline, consistent size
- [ ] Inter (or documented fallback) for marketing pages

## Copy

- [ ] Primary CTA: **Karar analizini başlat** (nav, hero, sticky)
- [ ] Site subtitle: **Karar zekâsı platformu**
- [ ] Trust rail — four canonical lines (see `docs/BRAND_SYSTEM.md` §5.1)
- [ ] No banned phrases: `2 dk ücretsiz`, `hemen al`, `son şans`, `garanti kazanç`
- [ ] Turkish **siz** form in product UI
- [ ] `isteBul` spelling (capital B)

## Product surfaces

- [ ] Homepage hero matches message hierarchy
- [ ] Auto paywall uses `proTrial` / `proContinueFree` voice
- [ ] Pricing: Stripe + trial wording accurate
- [ ] Legal links in footer

## Engineering

- [ ] `npm run test` passes (includes `brand-audit-check.cjs`)
- [ ] `data/brand/brand-system.json` synced if CTAs changed
- [ ] `js/core/brand-voice.js` updated if CTAs changed

## Reference

Full system: `docs/BRAND_SYSTEM.md`
