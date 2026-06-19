# Premium Visual Restore — Design System v4 Refine

**Commit:** `Restore premium visual quality and refine Design System v4`

## Rolled back / neutralized (broken v4 cleanup)

| Change | Reason |
|--------|--------|
| Flat `#FAFAF8` homepage hero | Removed; restored navy gradient hero |
| White hero dashboard preview | Removed; restored dark glass product panel |
| Blanket `.ib-category-showcase { background: white }` without text fixes | Replaced with scoped white premium cards + full typography |
| Global `html.ib-ds-v4 p { color: muted }` | Removed (caused washed copy) |
| `tatil.css` / `finans-hero.css` v4 light override blocks | Removed (washed heroes) |
| `.housing-hero .glass-card` forced white | Removed; konut dark metrics restored |

## Preserved from old premium design

- Dark navy hero gradient and trust tone
- Glass dashboard preview on homepage
- Konut dark housing shell and metric cards
- Category card structure (icon, metrics, CTA) from `ai-decision-platform-home.css`
- Admin light readability tokens

## Premium refinements applied

- **Hero:** Refined gradient (no heavy glow), strong H1 scale, typed dashboard labels
- **Categories:** White cards on `#FAFAF8` with `#111827` / `#6B7280` text, blue CTA
- **Finans/Tatil heroes:** Dark band + readable hero dashboards; holo decor hidden on finans
- **Finans/Tatil results:** Light KPI blocks and AI panels (fixed gray-on-gray in `premium-decision-dashboard.css`)
- **Nav:** Dark translucent bar on homepage; light bar on vertical pages
- **Konut:** Explicit glass-card / hero-metric contrast under v4

## Files touched

- `css/istebul-design-system-v4.css` — full refine (zone-based, no `!important`)
- `css/premium-decision-dashboard.css` — finans/tatil block contrast
- `css/tatil.css`, `css/finans-hero.css` — removed conflicting v4 blocks
- `css/ai-decision-platform-home.css` — dashboard cascade fallback ungated
- `index.html` — `ib-hero-premium-dark` on hero
- `admin-panel.html` + vertical HTML — cache `?v=2`

## Tests

| Check | Result |
|-------|--------|
| `npm run build` | Run in CI |
| `npm run lint` | Run in CI |
| `npm test` | May fail on bundle budget (pre-existing) |

## Remaining risk

- Category cards still depend on JS mount (`#home-category-grid`); CSS assumes live markup classes.
- Multiple legacy CSS imports remain in `style.css`; future prune should be incremental.
- Navbar dark style applies globally on pages using main `index` nav pattern — verify corporate/SEO pages if reported.
