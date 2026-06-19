# P4.4 — Conversion micro-UX polish

Outcome-oriented copy, loading reassurance, and trust micro-lines across auth, checkout, Auto wizard, and nav CTAs.

## Modules

| File | Role |
|------|------|
| `js/core/conversion-copy.js` | Single source for Turkish conversion strings |
| `js/runtime/conversion-micro-ux.js` | Nav relabeling, pricing trust line, auth success toasts |
| `css/conversion-micro-ux.css` | Trust line + toast + checkout intent banner |

## Wired in

- `js/runtime/enterprise-ux.js` → `initConversionMicroUx()`
- `js/features/auth/auth.js` → modal titles, CTAs, loading/success copy
- `js/app.js` → checkout loading and session errors
- `js/runtime/p4-product-polish.js` → hero/sticky trust lines from copy module
- `js/features/monetization/plans.js` → checkout CTA labels
- `index.html` → static nav fallback labels

## Audit

```bash
node scripts/p4-conversion-ux-audit.cjs
```

Included in `npm test`.

## Principles

- CTAs describe **what happens next** (save analysis, secure checkout), not generic “sign up”.
- Loading states name **Stripe**, **trial**, and **no card storage** where relevant.
- Errors stay actionable; checkout intent preserved in copy when applicable.
