# isteBul Design System v4

**Scope:** Visual-only (CSS + minimal HTML copy/class). No JS, auth, Supabase, or routing changes.

## Tokens

| Token | Value |
|-------|--------|
| `--color-bg` | `#FAFAF8` |
| `--color-surface` | `#FFFFFF` |
| `--color-text` | `#111827` |
| `--color-muted` | `#6B7280` |
| `--color-border` | `#E5E7EB` |
| `--color-accent` | `#2563EB` |
| `--radius-card` | `24px` |
| `--shadow-card` | `0 1px 3px rgba(0,0,0,.03)` |
| `--transition-fast` | `200ms ease-out` |

## Typography

- **Headings:** Satoshi 700  
- **Body:** Inter 400/500  
- **Metrics:** Geist Mono (tabular nums)

## Activation

Add `class="ib-ds-v4"` on `<html>`. Stylesheet: `css/istebul-design-system-v4.css` (also imported from `style.css`).

## Files

- `css/istebul-design-system-v4.css` — primary v4 layer  
- `css/design-tokens.css`, `css/style.css` — legacy alias sync  
- `css/premium-decision-dashboard.css` — light dashboard base  
