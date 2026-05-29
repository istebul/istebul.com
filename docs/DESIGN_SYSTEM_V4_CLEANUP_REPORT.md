# Design System v4 — Legacy CSS Cleanup Report

**Date:** 2026-05-29  
**Commit message:** `Refactor legacy CSS layers for Design System v4`

## Summary

v4 is now the primary visual layer when `html.ib-ds-v4` is present. Legacy dark gradients, premium-dark heroes, and override wars are gated behind `html:not(.ib-ds-v4)` so v4 styles apply through normal cascade without `!important`.

## `!important` reduction

| File | Before | After |
|------|--------|-------|
| `css/istebul-design-system-v4.css` | 68 | **0** |

Legacy files still use `!important` only inside `html:not(.ib-ds-v4)` blocks (e.g. `ib-premium-design-system.css`, `homepage-visual-premium-redesign.css`).

## Removed / gated legacy rules

- **`ib-hero-premium-dark`** — dark gradient hero on homepage (`ai-decision-platform-home.css`, `homepage-visual-premium-redesign.css`) gated with `html:not(.ib-ds-v4)`.
- **`ib-how-premium-dark` / `ib-trust-premium-dark`** — dark section bands gated; v4 uses flat `#FAFAF8` + white cards.
- **`ib-home-categories-premium`** — dark category band gated; v4 light section styles in v4 CSS.
- **`body.ib-enterprise #home` dashboard** — dark glass dashboard gated; v4 light dashboard tokens in v4 CSS + `hero-v4.css` light defaults.
- **Glow / neon / `ib-hero-premium-dark::before`** — hidden on v4 pages.
- **Gradient primary buttons** — solid `#2563EB` on v4 (`ib-premium-design-system.css`, admin inline).

## Updated files

| File | Change |
|------|--------|
| `css/istebul-design-system-v4.css` | Rewritten without `!important`; light enterprise dashboard + admin tokens |
| `css/hero-v4.css` | Light Premium defaults; dark legacy behind `html:not(.ib-ds-v4)` |
| `css/ai-decision-platform-home.css` | Dark blocks gated |
| `css/homepage-visual-premium-redesign.css` | Dark hero gated |
| `css/final-enterprise-release.css` | Premium-dark text rules gated |
| `css/ib-premium-design-system.css` | Gradient btn/cards gated; v4 solid accent |
| `css/tatil.css` | v4 light vacation hero + dashboard block |
| `css/finans-hero.css` | v4 light finans hero; holo hidden |
| `admin-panel.html` | Inline `:root` + admin UI mapped to v4 tokens; `--card` fixed |

## Tatil / Finans hero

- **Tatil:** Page background `#FAFAF8`, hero overlay softened to light wash, hero image ~35% opacity, dashboard/cards white with v4 border/shadow.
- **Finans:** Dark page gradient removed under v4, light overlay, solid primary button, glass dashboard → white card, decorative holo column hidden.

## Admin panel (CSS only)

- Inline `:root` uses v4 palette (`#FAFAF8`, `#FFFFFF`, `#111827`, `#2563EB`, `#E5E7EB`).
- Primary button, nav active state, table hover, avatars — no gradients.
- Sticky actions column uses `--card` (was undefined).
- `html.ib-ds-v4` admin rules align sidebar/tables/modals with global tokens.

## Global tokens preserved

Background `#FAFAF8`, Surface `#FFFFFF`, Text `#111827`, Muted `#6B7280`, Accent `#2563EB`, Border `#E5E7EB`, Radius `24px`, Shadow `0 1px 3px rgba(0,0,0,.03)`, Transition `200ms ease-out`.

## Test results

| Check | Result |
|-------|--------|
| `npm run build` | PASS |
| `npm run lint` | (run in CI) |
| `npm run type-check` | (run in CI) |
| `npm test` full suite | **FAIL** — `analyze:bundle` budget (~1.07 MB SPA; pre-existing, not introduced by this CSS-only change) |
| `dist-asset-integrity-audit` | PASS (via build:check) |
| `audit:launch` | PASS |

## Remaining risks

1. **Bundle budget** — SPA JS/CSS still over analyze threshold; unrelated to CSS cleanup.
2. **Pages without `ib-ds-v4`** — If any HTML omits `class="ib-ds-v4"`, legacy dark styles may still apply (intentional fallback).
3. **Deep legacy imports** — `style.css` still imports many polish layers; further pruning is optional and should be done incrementally.
4. **Tatil/finans non-v4** — Dark source rules remain for backward compatibility behind `:not(.ib-ds-v4)`.

## Not changed (per scope)

JavaScript, Supabase, auth, admin behavior, decision engines, PDF generation, routing, event tracking.
